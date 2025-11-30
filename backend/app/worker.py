# backend/app/worker.py
import os
import uuid
import logging
from contextlib import contextmanager

from celery import Celery

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("repoinsight.worker")

# --- Celery Setup (env defaults to Redis for dev, fallback to database on Windows) ---
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# For Windows without Redis, use SQLAlchemy database broker
if os.name == 'nt' and 'redis' in CELERY_BROKER_URL:
    try:
        import redis
        redis.Redis.from_url(CELERY_BROKER_URL).ping()
    except Exception:
        logger.warning("Redis not available, using database broker for development")
        CELERY_BROKER_URL = "sqla+sqlite:///celery_broker.db"
        CELERY_RESULT_BACKEND = "db+sqlite:///celery_results.db"

celery_app = Celery(
    "repoinsight.tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    # include is optional; celery -A backend.app.worker will discover tasks too
    include=["backend.app.worker"],
)

# --- Database Setup (use sqlmodel for compatibility) ---
from sqlmodel import create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./repoinsight.db")

if DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread False when used across threads/processes
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)


@contextmanager
def get_db():
    """Yields a sqlmodel.Session connected to engine."""
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()


# --- The Celery task (lazy imports inside the task) ---
@celery_app.task()
def analyze_repository_task(job_id: str, model_id: str = "llama-3.2-1b", model_path: str = None, local_path: str = None):
    """
    Analyze a repository and update Job status/result in the DB.
    Validates model configuration before processing.
    Lazy-imports models to avoid circular import issues at module import time.
    
    Args:
        job_id: UUID string of the job
        model_id: Model identifier (default: llama-3.2-1b)
        model_path: Path to local GGUF model file (required)
        local_path: Optional path to already-extracted local repository
    """
    # Lazy import to avoid circular dependencies at worker startup
    from backend.app.models import Job, JobStatus  # SQLModel models

    job_uuid = uuid.UUID(job_id)
    logger.info("[%s] Task started with model_id=%s", job_id, model_id)

    def update_status(status: JobStatus, progress: int, result: dict | None = None):
        try:
            with get_db() as db:
                job = db.get(Job, job_uuid)
                if not job:
                    logger.error("[%s] Job not found in database.", job_id)
                    return
                job.status = status
                job.progress = progress
                if result is not None:
                    job.result = result
                # update timestamp if you have such a column (use SQLModel defaults)
                db.add(job)
                db.commit()
                logger.info("[%s] Updated status=%s progress=%s", job_id, status.value, progress)
        except Exception as e:
            logger.exception("[%s] Failed to update job status: %s", job_id, e)

    try:
        # Validate model configuration - all models now require a path
        resolved_path = model_path or os.getenv("LOCAL_MODEL_PATH")
        
        if not resolved_path:
            error_msg = "No model path provided. Please select a model and provide its path."
            logger.error("[%s] %s", job_id, error_msg)
            update_status(JobStatus.FAILED, 0, result={"error": error_msg})
            return {"job_id": job_id, "status": "failed", "error": error_msg}
        
        # If path is relative or just a filename, check common locations
        if not os.path.isabs(resolved_path):
            # Try multiple possible locations
            possible_paths = [
                resolved_path,  # As-is (relative to worker dir)
                os.path.join(os.getcwd(), resolved_path),  # Relative to current dir
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), resolved_path),  # Relative to project root
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", resolved_path),  # In models folder
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", "models", resolved_path),  # In backend/models
            ]
            
            found = False
            for path in possible_paths:
                if os.path.exists(path) and os.path.isfile(path):
                    resolved_path = path
                    found = True
                    logger.info("[%s] Found model at: %s", job_id, resolved_path)
                    break
            
            if not found:
                error_msg = f"Model file not found: {model_path}. Searched in: {', '.join(possible_paths[:3])}"
                logger.error("[%s] %s", job_id, error_msg)
                update_status(JobStatus.FAILED, 0, result={"error": error_msg})
                return {"job_id": job_id, "status": "failed", "error": error_msg}
        elif not os.path.exists(resolved_path):
            error_msg = f"Model file not found: {resolved_path}"
            logger.error("[%s] %s", job_id, error_msg)
            update_status(JobStatus.FAILED, 0, result={"error": error_msg})
            return {"job_id": job_id, "status": "failed", "error": error_msg}
        
        if not os.path.isfile(resolved_path):
            error_msg = f"Model path is not a file: {resolved_path}"
            logger.error("[%s] %s", job_id, error_msg)
            update_status(JobStatus.FAILED, 0, result={"error": error_msg})
            return {"job_id": job_id, "status": "failed", "error": error_msg}
        
        size_bytes = os.path.getsize(resolved_path)
        if size_bytes < 1024 * 1024:
            error_msg = f"Model file too small: {size_bytes} bytes"
            logger.error("[%s] %s", job_id, error_msg)
            update_status(JobStatus.FAILED, 0, result={"error": error_msg})
            return {"job_id": job_id, "status": "failed", "error": error_msg}
        
        logger.info("[%s] Model validated: %s (%s bytes)", job_id, resolved_path, size_bytes)
        
        # Initialize LLM
        from backend.app.services.llm_service import get_llm_instance
        logger.info("[%s] Initializing LLM...", job_id)
        llm = get_llm_instance(resolved_path)
        
        if not llm:
            error_msg = "Failed to initialize LLM model"
            logger.error("[%s] %s", job_id, error_msg)
            update_status(JobStatus.FAILED, 0, result={"error": error_msg})
            return {"job_id": job_id, "status": "failed", "error": error_msg}
        
        logger.info("[%s] LLM initialized successfully", job_id)
        
        # Step 1: Get repository info and analyze all files
        update_status(JobStatus.PARSING, 20)
        logger.info("[%s] Cloning and analyzing repository...", job_id)
        
        # Get job details for repo URL
        with get_db() as db:
            job = db.get(Job, job_uuid)
            repo_url = job.repo_url if job else "unknown"
        
        # Check if it's a local upload or needs cloning
        if local_path and os.path.exists(local_path):
            logger.info("[%s] Analyzing local upload: %s", job_id, local_path)
            temp_dir = local_path
            repo_name = repo_url.split(":")[-1].replace(".zip", "").replace(".tar.gz", "")
            cleanup_temp = False  # Don't delete uploaded files immediately
        else:
            # Clone and analyze the actual repository
            import tempfile
            import subprocess
            
            repo_name = repo_url.split("/")[-1].replace(".git", "")
            temp_dir = tempfile.mkdtemp(prefix=f"repo_{job_id}_")
            cleanup_temp = True
            
            try:
                # Clone the repository
                logger.info("[%s] Cloning repository: %s", job_id, repo_url)
                subprocess.run(
                    ["git", "clone", "--depth", "1", repo_url, temp_dir],
                    check=True,
                    capture_output=True,
                    timeout=300  # 5 minute timeout
                )
            except subprocess.TimeoutExpired:
                logger.error("[%s] Repository clone timed out", job_id)
                raise Exception("Repository clone timed out after 5 minutes")
            except subprocess.CalledProcessError as e:
                logger.error("[%s] Git clone failed: %s", job_id, e.stderr.decode() if e.stderr else str(e))
                raise Exception(f"Failed to clone repository: {e.stderr.decode() if e.stderr else str(e)}")
        
        # Analyze all files in the repository - OPTIMIZED
        all_files = []
        file_contents = {}
        nodes = [{"id": repo_name, "label": repo_name, "type": "repository"}]
        edges = []
        directories_added = set()
        
        # Important extensions for code analysis (prioritized)
        CODE_EXTENSIONS = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.swift', '.kt'}
        CONFIG_EXTENSIONS = {'.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.env', '.config'}
        DOC_EXTENSIONS = {'.md', '.txt', '.rst'}
        
        # Skip these directories for faster processing
        SKIP_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', 'env', '.venv', 'dist', 'build', 'target', '.idea', '.vscode', 'coverage'}
        
        # Limit file reading to avoid memory issues
        MAX_FILE_SIZE = 50 * 1024  # 50KB max per file
        MAX_FILES_TO_READ = 100  # Read content of max 100 files
        files_read_count = 0
        
        logger.info("[%s] Starting fast file analysis...", job_id)
        
        for root, dirs, files in os.walk(temp_dir):
            # Skip excluded directories (modify dirs in-place to prevent os.walk from descending)
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            rel_root = os.path.relpath(root, temp_dir)
            if rel_root == '.':
                rel_root = ''
            
            # Add directory nodes
            if rel_root and rel_root not in directories_added:
                dir_id = rel_root.replace('\\', '/')
                nodes.append({"id": dir_id, "label": os.path.basename(dir_id) or dir_id, "type": "directory"})
                
                # Add edge from parent
                parent = os.path.dirname(dir_id).replace('\\', '/') or repo_name
                edges.append({"from": parent, "to": dir_id, "label": "contains"})
                directories_added.add(rel_root)
            
            # Process files
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, temp_dir).replace('\\', '/')
                all_files.append(rel_path)
                
                # Determine file type
                file_ext = os.path.splitext(file)[1].lower()
                file_type = "file"
                should_read = False
                
                if file_ext in CODE_EXTENSIONS:
                    file_type = "code"
                    should_read = files_read_count < MAX_FILES_TO_READ
                    if file_ext == '.py':
                        file_type = "python"
                    elif file_ext in {'.js', '.jsx'}:
                        file_type = "javascript"
                    elif file_ext in {'.ts', '.tsx'}:
                        file_type = "typescript"
                    elif file_ext == '.java':
                        file_type = "java"
                    elif file_ext == '.go':
                        file_type = "go"
                    elif file_ext == '.rs':
                        file_type = "rust"
                elif file_ext in CONFIG_EXTENSIONS:
                    file_type = "config"
                    should_read = files_read_count < MAX_FILES_TO_READ and file in ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml']
                elif file_ext in DOC_EXTENSIONS:
                    file_type = "document"
                    should_read = file.lower() == 'readme.md'
                
                # Read important file contents (prioritize code files)
                if should_read:
                    try:
                        file_size = os.path.getsize(file_path)
                        if file_size <= MAX_FILE_SIZE:
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                if content.strip():
                                    file_contents[rel_path] = content
                                    files_read_count += 1
                    except Exception as e:
                        logger.debug("[%s] Could not read file %s: %s", job_id, rel_path, e)
                
                # Add file node with metadata
                file_node = {
                    "id": rel_path,
                    "label": file,
                    "type": file_type,
                    "language": file_ext[1:] if file_ext else None,
                    "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0
                }
                nodes.append(file_node)
                
                # Add edge from parent directory
                parent_dir = os.path.dirname(rel_path).replace('\\', '/') or repo_name
                edges.append({"from": parent_dir, "to": rel_path, "label": "contains"})
        
        logger.info("[%s] Analyzed %d files (%d with content) in repository", job_id, len(all_files), len(file_contents))
        
        # Detect languages from file extensions
        detected_languages = set()
        for file in all_files:
            ext = os.path.splitext(file)[1].lower()
            if ext == '.py':
                detected_languages.add("Python")
            elif ext in {'.js', '.jsx'}:
                detected_languages.add("JavaScript")
            elif ext in {'.ts', '.tsx'}:
                detected_languages.add("TypeScript")
            elif ext == '.java':
                detected_languages.add("Java")
            elif ext == '.go':
                detected_languages.add("Go")
            elif ext == '.rs':
                detected_languages.add("Rust")
            elif ext in {'.c', '.cpp', '.h'}:
                detected_languages.add("C/C++")
            elif ext == '.cs':
                detected_languages.add("C#")
            elif ext == '.php':
                detected_languages.add("PHP")
            elif ext == '.rb':
                detected_languages.add("Ruby")
            elif ext == '.swift':
                detected_languages.add("Swift")
            elif ext == '.kt':
                detected_languages.add("Kotlin")
        
        repo_structure = {
            "name": repo_name,
            "files": all_files,
            "file_contents": file_contents,
            "languages": list(detected_languages)
        }
        
        # Step 2: Generate fast repository overview using LLM
        update_status(JobStatus.BUILDING_GRAPH, 50)
        logger.info("[%s] Generating quick analysis with LLM...", job_id)
        
        try:
            # Prepare CONCISE context for faster LLM processing
            context = f"Repository: {repo_name}\n"
            context += f"Files: {len(all_files)} | Languages: {', '.join(repo_structure['languages']) or 'Unknown'}\n\n"
            
            # Show file structure (limited to 30 most important files)
            important_files = [f for f in all_files if any(f.endswith(ext) for ext in ['.py', '.js', '.ts', '.java', '.go', '.rs', 'README.md', 'package.json', 'requirements.txt'])]
            context += "Key files:\n" + "\n".join(f"- {f}" for f in important_files[:30])
            
            # Include only the most critical file contents (max 3 files, 300 chars each)
            if file_contents:
                context += "\n\nSample code:\n"
                for file_path, content in list(file_contents.items())[:3]:
                    context += f"\n{file_path}:\n{content[:300]}...\n"
            
            # Use faster LLM call with reduced context
            repo_overview = llm.explain_repository(repo_structure, context=context)
            logger.info("[%s] Generated overview in LLM", job_id)
        except Exception as e:
            logger.warning("[%s] LLM generation failed (using fallback): %s", job_id, e)
            # Create a simple fallback overview
            repo_overview = f"Repository '{repo_name}' contains {len(all_files)} files across {len(detected_languages)} languages: {', '.join(detected_languages)}. Analysis includes file structure, dependencies, and code organization."

        # Step 2.5: Generate node descriptions using LLM for key files
        update_status(JobStatus.BUILDING_GRAPH, 65)
        logger.info("[%s] Generating file descriptions...", job_id)
        
        try:
            # Select up to 10 most important files to describe
            files_to_describe = []
            for node in nodes:
                if node.get("type") in ["python", "javascript", "typescript", "java", "go", "rust", "code"]:
                    file_path = node["id"]
                    if file_path in file_contents:
                        files_to_describe.append((node, file_contents[file_path]))
                    if len(files_to_describe) >= 10:
                        break
            
            # Generate descriptions in batch
            for node, content in files_to_describe:
                try:
                    # Create a concise prompt for file description
                    prompt = f"""Analyze this code file and provide a 1-2 sentence description of its purpose and key functionality.

File: {node['label']}
Type: {node.get('language', 'unknown')}

Code snippet (first 500 chars):
{content[:500]}

Provide ONLY a brief, developer-friendly description (max 2 sentences). Focus on what the file does and its role in the codebase."""

                    description = llm.generate(prompt=prompt, max_tokens=100, temperature=0.3)
                    node["description"] = description.strip()
                    logger.debug("[%s] Generated description for %s", job_id, node["label"])
                except Exception as e:
                    logger.debug("[%s] Failed to generate description for %s: %s", job_id, node["label"], e)
                    # Fallback description based on file type
                    if node.get("language") == "py":
                        node["description"] = "Python module containing business logic and functions"
                    elif node.get("language") in ["js", "jsx", "ts", "tsx"]:
                        node["description"] = "JavaScript/TypeScript component or utility module"
                    else:
                        node["description"] = f"{node.get('language', 'Code')} file"
            
            logger.info("[%s] Generated descriptions for %d files", job_id, len(files_to_describe))
        except Exception as e:
            logger.warning("[%s] File description generation failed: %s", job_id, e)

        # Step 3: Final LLM analysis
        update_status(JobStatus.EXPLAINING, 80)
        logger.info("[%s] Finalizing analysis with model=%s...", job_id, model_id)

        # Generate vulnerability analysis
        vulnerability_analysis = ""
        try:
            logger.info("[%s] Generating vulnerability analysis...", job_id)
            vuln_context = f"Repository: {repo_name}\n"
            vuln_context += f"Languages: {', '.join(detected_languages)}\n"
            vuln_context += f"Files analyzed: {len(all_files)}\n\n"
            vuln_context += "Key files:\n" + "\n".join(f"- {f}" for f in important_files[:20])
            if file_contents:
                vuln_context += "\n\nCode samples:\n"
                for file_path, content in list(file_contents.items())[:5]:
                    vuln_context += f"\n{file_path}:\n{content[:400]}...\n"
            
            vulnerability_analysis = llm.analyze_vulnerability(vuln_context)
            logger.info("[%s] Generated vulnerability analysis", job_id)
        except Exception as e:
            logger.warning("[%s] Vulnerability analysis failed: %s", job_id, e)
            vulnerability_analysis = "Vulnerability analysis unavailable for this repository."

        # Produce result with real LLM output and actual file structure
        graph_json = {
            "model_checked": True,
            "model_id": model_id,
            "model_path": resolved_path,
            "overview": repo_overview,
            "vulnerability_analysis": vulnerability_analysis,
            "repository": repo_name,
            "files_analyzed": len(all_files),
            "nodes": nodes,
            "edges": edges,
        }

        # Save result and mark completed
        update_status(JobStatus.COMPLETED, 100, result=graph_json)
        logger.info("[%s] Analysis completed with %d nodes and %d edges.", job_id, len(nodes), len(edges))
        
        # Clean up temporary directory if it was created for git clone
        if cleanup_temp:
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception as e:
                logger.warning("[%s] Could not clean up temp dir: %s", job_id, e)
        
        return {"job_id": job_id, "status": "completed"}

    except Exception as e:
        logger.exception("[%s] Error during analysis: %s", job_id, e)
        update_status(JobStatus.FAILED, 0, result={"error": str(e)})
        # Re-raise so Celery marks task as failed if desired
        raise
