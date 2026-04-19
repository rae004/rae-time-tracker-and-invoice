from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db
from app.routes import register_blueprints


def create_app(config_class: type[Config] = Config) -> Flask:
    """Application factory for creating Flask app instances."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app)
    db.init_app(app)

    # Register blueprints
    register_blueprints(app)

    return app
