"""API routes for CategoryTag management."""

from uuid import UUID

from flask import Blueprint, jsonify, request
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import CategoryTag
from app.schemas import (
    CategoryTagCreate,
    CategoryTagListResponse,
    CategoryTagResponse,
    CategoryTagUpdate,
)

category_tags_bp = Blueprint("category_tags", __name__)


@category_tags_bp.route("/category-tags", methods=["GET"])
def list_category_tags():
    """List all category tags."""
    session = db.get_session()
    try:
        tags = session.query(CategoryTag).order_by(CategoryTag.name).all()
        response = CategoryTagListResponse(
            tags=[CategoryTagResponse.model_validate(t) for t in tags],
            total=len(tags),
        )
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@category_tags_bp.route("/category-tags", methods=["POST"])
def create_category_tag():
    """Create a new category tag."""
    try:
        data = CategoryTagCreate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        tag = CategoryTag(
            name=data.name,
            color=data.color,
        )
        session.add(tag)
        session.commit()
        session.refresh(tag)
        response = CategoryTagResponse.model_validate(tag)
        return jsonify(response.model_dump(mode="json")), 201
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "A tag with this name already exists"}), 409
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@category_tags_bp.route("/category-tags/<uuid:tag_id>", methods=["GET"])
def get_category_tag(tag_id: UUID):
    """Get a specific category tag by ID."""
    session = db.get_session()
    try:
        tag = session.query(CategoryTag).filter(CategoryTag.id == tag_id).first()
        if not tag:
            return jsonify({"error": "Category tag not found"}), 404
        response = CategoryTagResponse.model_validate(tag)
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@category_tags_bp.route("/category-tags/<uuid:tag_id>", methods=["PUT"])
def update_category_tag(tag_id: UUID):
    """Update a category tag."""
    try:
        data = CategoryTagUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        tag = session.query(CategoryTag).filter(CategoryTag.id == tag_id).first()
        if not tag:
            return jsonify({"error": "Category tag not found"}), 404

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tag, field, value)

        session.commit()
        session.refresh(tag)
        response = CategoryTagResponse.model_validate(tag)
        return jsonify(response.model_dump(mode="json"))
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "A tag with this name already exists"}), 409
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@category_tags_bp.route("/category-tags/<uuid:tag_id>", methods=["DELETE"])
def delete_category_tag(tag_id: UUID):
    """Delete a category tag."""
    session = db.get_session()
    try:
        tag = session.query(CategoryTag).filter(CategoryTag.id == tag_id).first()
        if not tag:
            return jsonify({"error": "Category tag not found"}), 404

        session.delete(tag)
        session.commit()
        return "", 204
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
