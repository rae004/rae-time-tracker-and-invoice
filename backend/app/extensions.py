from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""

    pass


class Database:
    """Database wrapper for Flask integration."""

    def __init__(self) -> None:
        self.engine = None
        self.session_factory = None
        self._app = None

    def init_app(self, app) -> None:
        """Initialize database with Flask app."""
        self._app = app
        database_url = app.config.get("SQLALCHEMY_DATABASE_URI")
        engine_options = app.config.get("SQLALCHEMY_ENGINE_OPTIONS", {})

        self.engine = create_engine(database_url, **engine_options)
        self.session_factory = sessionmaker(bind=self.engine)

        app.teardown_appcontext(self._teardown)

    def _teardown(self, exception) -> None:
        """Clean up session on app context teardown."""
        pass

    def get_session(self):
        """Get a new database session."""
        if self.session_factory is None:
            raise RuntimeError("Database not initialized. Call init_app first.")
        return self.session_factory()


db = Database()
