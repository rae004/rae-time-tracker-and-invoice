"""API routes for Project management."""

from uuid import UUID

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.extensions import db
from app.models import Client, Project
from app.schemas import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithClientResponse,
)

projects_bp = Blueprint("projects", __name__)


@projects_bp.route("/projects", methods=["GET"])
def list_projects():
    """List all projects, optionally filtered by client_id or active status."""
    session = db.get_session()
    try:
        query = session.query(Project)

        # Filter by client_id if provided
        client_id = request.args.get("client_id")
        if client_id:
            try:
                client_uuid = UUID(client_id)
                query = query.filter(Project.client_id == client_uuid)
            except ValueError:
                return jsonify({"error": "Invalid client_id format"}), 400

        # Filter by active status if provided
        active = request.args.get("active")
        if active is not None:
            is_active = active.lower() == "true"
            query = query.filter(Project.is_active == is_active)

        projects = query.order_by(Project.name).all()
        response = ProjectListResponse(
            projects=[ProjectResponse.model_validate(p) for p in projects],
            total=len(projects),
        )
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@projects_bp.route("/projects", methods=["POST"])
def create_project():
    """Create a new project."""
    try:
        data = ProjectCreate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        # Verify client exists
        client = session.query(Client).filter(Client.id == data.client_id).first()
        if not client:
            return jsonify({"error": "Client not found"}), 404

        project = Project(
            client_id=data.client_id,
            name=data.name,
            description=data.description,
            is_active=data.is_active,
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        response = ProjectResponse.model_validate(project)
        return jsonify(response.model_dump(mode="json")), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@projects_bp.route("/projects/<uuid:project_id>", methods=["GET"])
def get_project(project_id: UUID):
    """Get a specific project by ID."""
    session = db.get_session()
    try:
        project = session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Include client name in response
        response_data = ProjectWithClientResponse.model_validate(project).model_dump(
            mode="json"
        )
        response_data["client_name"] = project.client.name if project.client else None
        return jsonify(response_data)
    finally:
        session.close()


@projects_bp.route("/projects/<uuid:project_id>", methods=["PUT"])
def update_project(project_id: UUID):
    """Update a project."""
    try:
        data = ProjectUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        project = session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # If changing client, verify new client exists
        if data.client_id is not None:
            client = session.query(Client).filter(Client.id == data.client_id).first()
            if not client:
                return jsonify({"error": "Client not found"}), 404

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        session.commit()
        session.refresh(project)
        response = ProjectResponse.model_validate(project)
        return jsonify(response.model_dump(mode="json"))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@projects_bp.route("/projects/<uuid:project_id>", methods=["DELETE"])
def delete_project(project_id: UUID):
    """Delete a project."""
    session = db.get_session()
    try:
        project = session.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        session.delete(project)
        session.commit()
        return "", 204
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
