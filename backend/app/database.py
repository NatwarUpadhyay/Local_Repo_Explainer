"""
Database connection and session management.
"""

import os
from sqlmodel import create_engine, SQLModel, Session

# Default to a local SQLite database
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./repoinsight.db")

# The connect_args are needed only for SQLite to allow multiple threads to access the same connection.
# This is necessary because the FastAPI app and the Celery worker might run in different threads.
engine = create_engine(
    DATABASE_URL, echo=True, connect_args={"check_same_thread": False}
)


def create_db_and_tables():
    """
    Creates the database and all tables defined by SQLModel metadata.
    This should be called once on application startup.
    """
    SQLModel.metadata.create_all(engine)


def get_db():
    """
    FastAPI dependency to get a database session.
    Yields a session for a single request.
    """
    with Session(engine) as session:
        yield session
