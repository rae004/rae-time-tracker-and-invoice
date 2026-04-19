"""API routes for UserProfile management."""

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.extensions import db
from app.models import UserProfile
from app.schemas import UserProfileCreate, UserProfileResponse, UserProfileUpdate

user_profile_bp = Blueprint("user_profile", __name__)


def get_or_create_profile(session):
    """Get the existing profile or create a placeholder one."""
    profile = session.query(UserProfile).first()
    if not profile:
        # Create a placeholder profile
        profile = UserProfile(
            name="Your Name",
            address_line1="123 Main St",
            city="Your City",
            state="ST",
            zip_code="00000",
            email="you@example.com",
            phone="555-555-5555",
            payment_instructions="Please make checks payable to Your Name.",
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile


@user_profile_bp.route("/user-profile", methods=["GET"])
def get_user_profile():
    """Get the user profile (creates a placeholder if none exists)."""
    session = db.get_session()
    try:
        profile = get_or_create_profile(session)
        response = UserProfileResponse.model_validate(profile)
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@user_profile_bp.route("/user-profile", methods=["PUT"])
def update_user_profile():
    """Update the user profile."""
    try:
        data = UserProfileUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        profile = get_or_create_profile(session)

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

        session.commit()
        session.refresh(profile)
        response = UserProfileResponse.model_validate(profile)
        return jsonify(response.model_dump(mode="json"))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@user_profile_bp.route("/user-profile", methods=["POST"])
def create_user_profile():
    """Create or reset the user profile."""
    try:
        data = UserProfileCreate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        # Delete existing profile if any
        existing = session.query(UserProfile).first()
        if existing:
            session.delete(existing)
            session.flush()

        profile = UserProfile(
            name=data.name,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            zip_code=data.zip_code,
            email=data.email,
            phone=data.phone,
            payment_instructions=data.payment_instructions,
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)
        response = UserProfileResponse.model_validate(profile)
        return jsonify(response.model_dump(mode="json")), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
