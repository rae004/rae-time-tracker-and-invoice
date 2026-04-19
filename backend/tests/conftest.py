"""Test fixtures for Rae Time Tracker backend."""

from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import create_app
from app.config import TestingConfig
from app.extensions import Base, db
from app.models import CategoryTag, Client, Project, UserProfile


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app(TestingConfig)
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def session(app):
    """Create database session for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()

    # Patch the db to use our test session
    original_get_session = db.get_session
    db.get_session = lambda: session

    yield session

    db.get_session = original_get_session
    session.close()
    engine.dispose()


@pytest.fixture
def sample_client(session):
    """Create a sample client."""
    client = Client(
        name="Test Company",
        address_line1="123 Test St",
        city="Test City",
        state="TS",
        zip_code="12345",
        hourly_rate=Decimal("150.00"),
        service_description="Software development services",
    )
    session.add(client)
    session.commit()
    return client


@pytest.fixture
def sample_project(session, sample_client):
    """Create a sample project."""
    project = Project(
        client_id=sample_client.id,
        name="Test Project",
        description="A test project",
        is_active=True,
    )
    session.add(project)
    session.commit()
    return project


@pytest.fixture
def sample_category_tag(session):
    """Create a sample category tag."""
    tag = CategoryTag(
        name="Development",
        color="#3B82F6",
    )
    session.add(tag)
    session.commit()
    return tag


@pytest.fixture
def sample_user_profile(session):
    """Create a sample user profile."""
    profile = UserProfile(
        name="John Doe",
        address_line1="456 Main St",
        city="Sample City",
        state="SC",
        zip_code="54321",
        email="john@example.com",
        phone="555-123-4567",
        payment_instructions="Make checks payable to John Doe",
    )
    session.add(profile)
    session.commit()
    return profile
