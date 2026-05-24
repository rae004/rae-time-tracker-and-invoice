"""API routes for full-data export, import, and reset."""

import logging
from datetime import UTC, datetime

from flask import Blueprint, Response, jsonify, request
from pydantic import ValidationError

from app.extensions import db
from app.schemas.data_management import (
    DataImport,
    ImportResult,
    ResetResult,
)
from app.services.data_management_service import (
    apply_import,
    build_export,
    reset_all,
)

RESET_CONFIRM_HEADER = "X-Confirm-Reset"
RESET_CONFIRM_VALUE = "DELETE-ALL-DATA"

logger = logging.getLogger(__name__)
data_management_bp = Blueprint("data_management", __name__)


@data_management_bp.route("/data/export", methods=["GET"])
def export_data():
    """Export all data as a downloadable JSON file."""
    session = db.get_session()
    try:
        export = build_export(session)
    finally:
        session.close()

    body = export.model_dump_json(indent=2)
    filename = f"rae-time-tracker-export-{datetime.now(UTC).strftime('%Y-%m-%d')}.json"
    return Response(
        body,
        status=200,
        mimetype="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@data_management_bp.route("/data/import", methods=["POST"])
def import_data():
    """Import a previously exported JSON payload (append-only, skip duplicates)."""
    try:
        payload = DataImport.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        counts = apply_import(session, payload)
        return jsonify(ImportResult(counts=counts).model_dump(mode="json")), 200
    except Exception:
        session.rollback()
        logger.exception("Failed to import data")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        session.close()


@data_management_bp.route("/data/reset", methods=["DELETE"])
def reset_data():
    """Delete every record. Requires X-Confirm-Reset: DELETE-ALL-DATA header."""
    if request.headers.get(RESET_CONFIRM_HEADER) != RESET_CONFIRM_VALUE:
        return jsonify(
            {
                "error": (
                    f"Missing or invalid {RESET_CONFIRM_HEADER} header. "
                    f"Send '{RESET_CONFIRM_VALUE}' to confirm."
                )
            }
        ), 400

    session = db.get_session()
    try:
        deleted = reset_all(session)
        return jsonify(ResetResult(deleted=deleted).model_dump(mode="json")), 200
    except Exception:
        session.rollback()
        logger.exception("Failed to reset data")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        session.close()
