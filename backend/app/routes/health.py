from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health_check():
    """Health check endpoint."""
    health_status = {"status": "healthy", "database": "unknown"}

    try:
        session = db.get_session()
        session.execute(text("SELECT 1"))
        session.close()
        health_status["database"] = "connected"
    except Exception:
        health_status["database"] = "disconnected"
        health_status["status"] = "degraded"

    return jsonify(health_status)
