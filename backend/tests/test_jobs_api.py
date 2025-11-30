# backend/tests/test_jobs_api.py
"""
Tests for the /api/v1/jobs endpoints.

To run these tests:
1. Make sure you have pytest and pytest-mock installed:
   pip install pytest pytest-mock
2. From the root of the project, run:
   pytest backend/tests/test_jobs_api.py
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

# Adjust the import path based on how you run pytest.
# If running from the project root, you might need to adjust PYTHONPATH
# or use a different import strategy.
from backend.app.main import app
from backend.app.database import get_db
from backend.app.models import Job, JobStatus

# --- Test Database Setup ---
# Use an in-memory SQLite database for testing to ensure tests are isolated and fast.
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# --- Dependency Override ---
# This function will override the `get_db` dependency used in the main application.
# Instead of connecting to the production database, requests will use this in-memory DB.
def override_get_db():
    """
    Provides a session to the in-memory SQLite database for the duration of a test.
    """
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()

# Apply the dependency override to the FastAPI app instance.
app.dependency_overrides[get_db] = override_get_db


# --- Pytest Fixture for Test Client and DB Management ---
@pytest.fixture(name="client")
def client_fixture():
    """
    Pytest fixture to set up and tear down the test environment.
    - Creates all database tables before a test runs.
    - Yields a TestClient instance to interact with the app.
    - Drops all database tables after a test completes to ensure isolation.
    """
    # Create tables in the in-memory database before tests run
    SQLModel.metadata.create_all(engine)
    # Yield the test client
    with TestClient(app) as c:
        yield c
    # Drop tables after tests are done to ensure a clean state for the next test
    SQLModel.metadata.drop_all(engine)


# --- Test Cases ---

def test_create_job_and_get_status(client: TestClient, mocker):
    """
    Tests the full flow of creating a job and then fetching its status.
    """
    # The worker module is already mocked in conftest.py, 
    # but we still need to mock the delay method for this test
    mock_delay = mocker.MagicMock()
    mocker.patch("backend.app.worker.analyze_repository_task.delay", mock_delay)

    # 1. POST to create a new job
    repo_url = "https://github.com/owner/repo"
    response = client.post(
        "/api/v1/jobs/",
        json={"repo_url": repo_url, "source_type": "git"},
    )

    # Assertions for the POST request
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["repo_url"] == repo_url
    assert data["status"] == JobStatus.QUEUED.value
    job_id = data["id"]

    # 2. GET the job status using the ID from the previous step
    response = client.get(f"/api/v1/jobs/{job_id}")

    # Assertions for the GET request
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == job_id
    assert data["status"] == JobStatus.QUEUED.value


def test_get_graph_for_incomplete_job(client: TestClient, mocker):
    """
    Tests that attempting to get a graph for a job that is not 'COMPLETED'
    results in a 400 Bad Request error.
    """
    # Mock the Celery task
    mock_delay = mocker.MagicMock()
    mocker.patch("backend.app.worker.analyze_repository_task.delay", mock_delay)

    # 1. Create a job (which will have a 'QUEUED' status by default)
    response = client.post(
        "/api/v1/jobs/",
        json={"repo_url": "https://github.com/test/repo", "source_type": "git"},
    )
    assert response.status_code == 201
    job_id = response.json()["id"]

    # 2. Attempt to get the graph for the newly created job
    response = client.get(f"/api/v1/jobs/{job_id}/graph")

    # Assert that the request is rejected as expected
    assert response.status_code == 400
    assert "Job is not complete" in response.json()["detail"]

def test_get_nonexistent_job(client: TestClient):
    """
    Tests that attempting to fetch a job with a non-existent UUID
    results in a 404 Not Found error.
    """
    non_existent_job_id = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    response = client.get(f"/api/v1/jobs/{non_existent_job_id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Job not found"
