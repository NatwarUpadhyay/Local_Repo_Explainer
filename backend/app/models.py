"""
Core data models for the RepoInsight application.
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, JSON, Column


class JobStatus(str, enum.Enum):
    """
    Enum for the status of a repository analysis job.
    """

    QUEUED = "QUEUED"
    PARSING = "PARSING"
    BUILDING_GRAPH = "BUILDING_GRAPH"
    EXPLAINING = "EXPLAINING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Job(SQLModel, table=True):
    """
    Represents a repository analysis job.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    status: JobStatus = Field(default=JobStatus.QUEUED, index=True)
    source_type: str = Field(default="git")
    repo_url: str
    progress: int = Field(default=0)
    result: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    model_id: Optional[str] = Field(default="llama-3.2-1b")
    model_path: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class JobCreate(SQLModel):
    """
    Pydantic model for creating a new job.
    """

    repo_url: str
    source_type: str = "git"
    model_id: Optional[str] = "llama-3.2-1b"
    model_path: Optional[str] = None


class JobRead(SQLModel):
    """
    Pydantic model for reading a job's details.
    """

    id: uuid.UUID
    status: JobStatus
    repo_url: str
    progress: int
    result: Optional[dict] = None
    model_id: Optional[str] = "llama-3.2-1b"
    model_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
