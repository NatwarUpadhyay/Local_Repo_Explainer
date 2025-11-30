# backend/app/api/jobs.py
"""
API endpoints for managing analysis jobs.
"""
import importlib
import tempfile
import zipfile
import tarfile
import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter()


@router.post("/", response_model=models.JobRead, status_code=201)
def create_job(
    *,
    db: Session = Depends(get_db),
    job_in: models.JobCreate,
):
    """
    Create a new analysis job for a repository.
    """
    db_job = models.Job(
        repo_url=job_in.repo_url,
        source_type=job_in.source_type,
        model_id=job_in.model_id or "llama-3.2-1b",
        model_path=job_in.model_path,
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Enqueue the background task (lazy import to avoid import-time errors).
    # If Celery/broker is not available (e.g. Redis not installed), fall back
    # to running the task synchronously so analysis still works.
    worker_module = importlib.import_module("backend.app.worker")
    try:
        # Try to enqueue asynchronously
        worker_module.analyze_repository_task.delay(
            str(db_job.id),
            db_job.model_id,
            db_job.model_path,
        )
    except Exception:
        # Fallback: run the task synchronously in-process. Use .run() when
        # available, otherwise call the wrapped function directly.
        try:
            task = worker_module.analyze_repository_task
            # Celery Task exposes .run to call the underlying function synchronously
            if hasattr(task, "run"):
                task.run(str(db_job.id), db_job.model_id, db_job.model_path)
            elif hasattr(task, "__wrapped__"):
                task.__wrapped__(str(db_job.id), db_job.model_id, db_job.model_path)
            else:
                # As a last resort, call the attribute directly
                task(str(db_job.id), db_job.model_id, db_job.model_path)
        except Exception as e:
            # If fallback also errors, raise an HTTP error so the client sees failure
            raise HTTPException(
                status_code=500, detail=f"Failed to start analysis task: {e}"
            )

    return db_job


@router.get("/{job_id}", response_model=models.JobRead)
def get_job(*, db: Session = Depends(get_db), job_id: UUID):
    """
    Retrieve the status of a specific job.
    """
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/graph")
def get_job_graph(*, db: Session = Depends(get_db), job_id: UUID):
    """
    Retrieve the resulting graph from a completed job.
    """
    job = db.get(models.Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != models.JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not complete. Current status: {job.status}",
        )

    # TODO: Return the actual graph data from job.result
    return {"message": "Graph data placeholder", "nodes": [], "edges": []}


@router.post("/upload", response_model=models.JobRead, status_code=201)
async def upload_and_analyze(
    *,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    model_id: str = Form("llama-3.2-1b"),
    model_path: str = Form(None),
):
    """
    Upload a repository archive (.zip or .tar.gz) and create an analysis job.
    """
    # Validate file type
    if not (
        file.filename.endswith(".zip")
        or file.filename.endswith(".tar.gz")
        or file.filename.endswith(".tgz")
    ):
        raise HTTPException(
            status_code=400, detail="Only .zip and .tar.gz files are supported"
        )

    # Create temporary directory to extract the archive
    temp_dir = tempfile.mkdtemp(prefix="upload_")

    try:
        # Save uploaded file
        temp_file = os.path.join(temp_dir, file.filename)
        with open(temp_file, "wb") as f:
            content = await file.read()
            f.write(content)

        # Extract the archive
        extract_dir = os.path.join(temp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        if file.filename.endswith(".zip"):
            with zipfile.ZipFile(temp_file, "r") as zip_ref:
                zip_ref.extractall(extract_dir)
        else:  # tar.gz or tgz
            with tarfile.open(temp_file, "r:gz") as tar_ref:
                tar_ref.extractall(extract_dir)

        # Create job with local path instead of URL
        db_job = models.Job(
            repo_url=f"local:{file.filename}",  # Mark as local upload
            source_type="upload",
            model_id=model_id or "llama-3.2-1b",
            model_path=model_path,
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)

        # Enqueue analysis task with local path
        worker_module = importlib.import_module("backend.app.worker")
        try:
            worker_module.analyze_repository_task.delay(
                str(db_job.id),
                db_job.model_id,
                db_job.model_path,
                local_path=extract_dir,
            )
        except Exception:
            try:
                task = worker_module.analyze_repository_task
                if hasattr(task, "run"):
                    task.run(
                        str(db_job.id),
                        db_job.model_id,
                        db_job.model_path,
                        local_path=extract_dir,
                    )
                elif hasattr(task, "__wrapped__"):
                    task.__wrapped__(
                        str(db_job.id),
                        db_job.model_id,
                        db_job.model_path,
                        local_path=extract_dir,
                    )
                else:
                    task(
                        str(db_job.id),
                        db_job.model_id,
                        db_job.model_path,
                        local_path=extract_dir,
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Failed to start analysis: {e}"
                )

        return db_job

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process upload: {str(e)}"
        )
