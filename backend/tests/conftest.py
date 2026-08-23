"""Test fixtures for Rae Time Tracker backend."""

import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from app import create_app
from app.config import TestingConfig
from app.extensions import Base, db
from app.models import CategoryTag, Client, Project, TimeEntry, UserProfile


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


@pytest.fixture
def completed_entry(session, sample_project):
    """A completed 1-hour time entry on 2026-04-15."""
    start = datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC)
    entry = TimeEntry(
        project_id=sample_project.id,
        name="Test work",
        start_time=start,
        end_time=start + timedelta(hours=1),
        duration_ms=3_600_000,
    )
    session.add(entry)
    session.commit()
    return entry


# --- Postgres-backed fixtures -------------------------------------------------
#
# The suite above runs on in-memory SQLite: fast, and it needs no database at
# all. The cost is that it never exercises the engine we actually deploy on,
# which is how a bare JSONB column -- valid on Postgres, uncompilable on SQLite
# -- could have reached production unnoticed.
#
# These fixtures cover that gap for the few tests that need it. They skip when
# no test database is reachable, so the default `pytest` run is unchanged.

POSTGRES_TEST_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/rae_time_tracker_test",
)


def _require_test_database(url: str) -> None:
    """Refuse to touch anything that is not an obvious throwaway database.

    These tests run `alembic downgrade`, which drops columns. Pointing that at
    a development database would destroy real invoices, so the name has to say
    plainly that it is disposable.
    """
    name = make_url(url).database or ""
    if not name.endswith("_test"):
        pytest.fail(
            f"Refusing to run destructive schema tests against database {name!r}: "
            "TEST_DATABASE_URL must name a database ending in '_test'."
        )


@pytest.fixture(scope="session")
def postgres_url():
    """The test database URL, or skip if it is not reachable."""
    _require_test_database(POSTGRES_TEST_URL)

    engine = create_engine(POSTGRES_TEST_URL, connect_args={"connect_timeout": 3})
    try:
        with engine.connect():
            pass
    except OperationalError as exc:
        pytest.skip(f"No Postgres test database at {POSTGRES_TEST_URL}: {exc}")
    finally:
        engine.dispose()

    return POSTGRES_TEST_URL


@pytest.fixture
def postgres_engine(postgres_url):
    """An engine on an empty test database, torn down after the test."""
    engine = create_engine(postgres_url)
    _drop_everything(engine)
    try:
        yield engine
    finally:
        _drop_everything(engine)
        engine.dispose()


@pytest.fixture
def postgres_session(postgres_engine):
    """A session against the real dialect, schema built from the models."""
    Base.metadata.create_all(postgres_engine)
    maker = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    session = maker()

    original = db.get_session
    db.get_session = lambda: session
    try:
        yield session
    finally:
        db.get_session = original
        session.close()


def _drop_everything(engine) -> None:
    """Reset the test database, including Alembic's own bookkeeping table."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))


@pytest.fixture
def postgres_client(postgres_session):
    """A client living in the Postgres test database.

    sample_client belongs to the SQLite session, so a Postgres test using it
    would fail the invoices.client_id foreign key.
    """
    client = Client(
        name="Test Company",
        address_line1="123 Test St",
        city="Test City",
        state="TS",
        zip_code="12345",
        hourly_rate=Decimal("150.00"),
        service_description="Software development services",
    )
    postgres_session.add(client)
    postgres_session.commit()
    return client
