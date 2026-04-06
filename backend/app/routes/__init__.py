from flask import Flask

from app.routes.category_tags import category_tags_bp
from app.routes.clients import clients_bp
from app.routes.health import health_bp
from app.routes.projects import projects_bp
from app.routes.time_entries import time_entries_bp
from app.routes.user_profile import user_profile_bp


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with the Flask app."""
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(clients_bp, url_prefix="/api")
    app.register_blueprint(projects_bp, url_prefix="/api")
    app.register_blueprint(category_tags_bp, url_prefix="/api")
    app.register_blueprint(user_profile_bp, url_prefix="/api")
    app.register_blueprint(time_entries_bp, url_prefix="/api")
