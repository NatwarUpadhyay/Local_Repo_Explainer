# backend/tests/conftest.py
"""
Pytest configuration file for backend tests.
This file is automatically loaded by pytest before running tests.
"""
import sys
import os
from unittest.mock import MagicMock

# Set environment variable to use in-memory database for tests
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Mock the worker module to prevent it from creating its own database connection
# This must be done before any backend modules are imported
mock_worker = MagicMock()
mock_worker.analyze_repository_task = MagicMock()
mock_worker.celery_app = MagicMock()
sys.modules['backend.app.worker'] = mock_worker
