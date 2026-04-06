"""API routes for Client management."""

from uuid import UUID

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.extensions import db
from app.models import Client
from app.schemas import ClientCreate, ClientListResponse, ClientResponse, ClientUpdate

clients_bp = Blueprint("clients", __name__)


@clients_bp.route("/clients", methods=["GET"])
def list_clients():
    """List all clients."""
    session = db.get_session()
    try:
        clients = session.query(Client).order_by(Client.name).all()
        response = ClientListResponse(
            clients=[ClientResponse.model_validate(c) for c in clients],
            total=len(clients),
        )
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@clients_bp.route("/clients", methods=["POST"])
def create_client():
    """Create a new client."""
    try:
        data = ClientCreate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        client = Client(
            name=data.name,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            zip_code=data.zip_code,
            phone=data.phone,
            hourly_rate=data.hourly_rate,
            service_description=data.service_description,
        )
        session.add(client)
        session.commit()
        session.refresh(client)
        response = ClientResponse.model_validate(client)
        return jsonify(response.model_dump(mode="json")), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@clients_bp.route("/clients/<uuid:client_id>", methods=["GET"])
def get_client(client_id: UUID):
    """Get a specific client by ID."""
    session = db.get_session()
    try:
        client = session.query(Client).filter(Client.id == client_id).first()
        if not client:
            return jsonify({"error": "Client not found"}), 404
        response = ClientResponse.model_validate(client)
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@clients_bp.route("/clients/<uuid:client_id>", methods=["PUT"])
def update_client(client_id: UUID):
    """Update a client."""
    try:
        data = ClientUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        client = session.query(Client).filter(Client.id == client_id).first()
        if not client:
            return jsonify({"error": "Client not found"}), 404

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(client, field, value)

        session.commit()
        session.refresh(client)
        response = ClientResponse.model_validate(client)
        return jsonify(response.model_dump(mode="json"))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@clients_bp.route("/clients/<uuid:client_id>", methods=["DELETE"])
def delete_client(client_id: UUID):
    """Delete a client."""
    session = db.get_session()
    try:
        client = session.query(Client).filter(Client.id == client_id).first()
        if not client:
            return jsonify({"error": "Client not found"}), 404

        session.delete(client)
        session.commit()
        return "", 204
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
