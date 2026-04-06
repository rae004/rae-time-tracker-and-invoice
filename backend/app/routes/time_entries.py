"""API routes for Time Entry management."""

from datetime import datetime
from uuid import UUID

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from app.extensions import db
from app.models import CategoryTag, Project, TimeEntry
from app.schemas import (
    ActiveTimerResponse,
    TimeEntryCreate,
    TimeEntryListResponse,
    TimeEntryResponse,
    TimeEntryUpdate,
    TimeEntryWithProjectResponse,
    WeeklyEntriesResponse,
)
from app.services import time_entry_service

time_entries_bp = Blueprint("time_entries", __name__)


def entry_to_response(entry: TimeEntry) -> TimeEntryResponse:
    """Convert TimeEntry model to response schema."""
    return TimeEntryResponse(
        id=entry.id,
        project_id=entry.project_id,
        name=entry.name,
        start_time=entry.start_time,
        end_time=entry.end_time,
        duration_seconds=entry.duration_seconds,
        is_running=entry.is_running,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        tags=[
            {
                "id": t.id,
                "name": t.name,
                "color": t.color,
                "created_at": t.created_at,
            }
            for t in entry.tags
        ],
    )


def entry_to_response_with_project(entry: TimeEntry) -> dict:
    """Convert TimeEntry model to response with project info."""
    response = entry_to_response(entry).model_dump(mode="json")
    response["project_name"] = entry.project.name if entry.project else None
    response["client_name"] = (
        entry.project.client.name if entry.project and entry.project.client else None
    )
    return response


@time_entries_bp.route("/time-entries", methods=["GET"])
def list_time_entries():
    """List time entries with optional filters."""
    session = db.get_session()
    try:
        query = session.query(TimeEntry)

        # Filter by project_id
        project_id = request.args.get("project_id")
        if project_id:
            try:
                query = query.filter(TimeEntry.project_id == UUID(project_id))
            except ValueError:
                return jsonify({"error": "Invalid project_id format"}), 400

        # Filter by date range
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                query = query.filter(TimeEntry.start_time >= start_dt)
            except ValueError:
                return jsonify({"error": "Invalid start_date format"}), 400
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                query = query.filter(TimeEntry.start_time <= end_dt)
            except ValueError:
                return jsonify({"error": "Invalid end_date format"}), 400

        # Filter by running status
        running = request.args.get("running")
        if running is not None:
            if running.lower() == "true":
                query = query.filter(TimeEntry.end_time.is_(None))
            else:
                query = query.filter(TimeEntry.end_time.isnot(None))

        entries = query.order_by(TimeEntry.start_time.desc()).all()
        response = TimeEntryListResponse(
            entries=[entry_to_response(e) for e in entries],
            total=len(entries),
        )
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@time_entries_bp.route("/time-entries", methods=["POST"])
def create_time_entry():
    """Create a new time entry (starts a timer if no end_time provided)."""
    try:
        data = TimeEntryCreate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        # Verify project exists
        project = session.query(Project).filter(Project.id == data.project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        if data.end_time is None:
            # Starting a timer
            entry = time_entry_service.start_timer(
                session,
                project_id=data.project_id,
                name=data.name,
                tag_ids=data.tag_ids,
                start_time=data.start_time,
            )
        else:
            # Creating a completed entry
            entry = TimeEntry(
                project_id=data.project_id,
                name=data.name,
                start_time=data.start_time or datetime.utcnow(),
                end_time=data.end_time,
            )
            # Calculate duration
            entry.duration_seconds = int(
                (entry.end_time - entry.start_time).total_seconds()
            )
            # Add tags
            if data.tag_ids:
                tags = (
                    session.query(CategoryTag)
                    .filter(CategoryTag.id.in_(data.tag_ids))
                    .all()
                )
                entry.tags = tags
            session.add(entry)

        session.commit()
        session.refresh(entry)
        response = entry_to_response(entry)
        return jsonify(response.model_dump(mode="json")), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@time_entries_bp.route("/time-entries/active", methods=["GET"])
def get_active_timer():
    """Get the currently running time entry."""
    session = db.get_session()
    try:
        entry = time_entry_service.get_active_timer(session)
        if entry:
            response = ActiveTimerResponse(active_entry=entry_to_response(entry))
        else:
            response = ActiveTimerResponse(active_entry=None)
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@time_entries_bp.route("/time-entries/weekly", methods=["GET"])
def get_weekly_entries():
    """Get time entries grouped by day for a specific week."""
    session = db.get_session()
    try:
        # Get week_start from query param or use current week
        week_start_param = request.args.get("week_start")
        if week_start_param:
            try:
                reference_date = datetime.fromisoformat(week_start_param)
            except ValueError:
                return jsonify({"error": "Invalid week_start format"}), 400
        else:
            reference_date = datetime.utcnow()

        week_start, week_end = time_entry_service.get_week_boundaries(reference_date)

        # Optional project filter
        project_id = request.args.get("project_id")
        project_uuid = UUID(project_id) if project_id else None

        entries = time_entry_service.get_entries_for_week(
            session, week_start, week_end, project_uuid
        )

        # Group by day
        grouped = time_entry_service.get_entries_grouped_by_day(entries)

        # Convert to response format
        entries_by_day = {
            date_str: [entry_to_response_with_project(e) for e in day_entries]
            for date_str, day_entries in grouped.items()
        }

        daily_totals = time_entry_service.calculate_daily_totals(grouped)
        weekly_total = time_entry_service.calculate_weekly_total(daily_totals)

        response = WeeklyEntriesResponse(
            week_start=week_start,
            week_end=week_end,
            entries_by_day=entries_by_day,
            daily_totals=daily_totals,
            weekly_total=weekly_total,
        )
        return jsonify(response.model_dump(mode="json"))
    finally:
        session.close()


@time_entries_bp.route("/time-entries/<uuid:entry_id>", methods=["GET"])
def get_time_entry(entry_id: UUID):
    """Get a specific time entry by ID."""
    session = db.get_session()
    try:
        entry = session.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return jsonify({"error": "Time entry not found"}), 404
        return jsonify(entry_to_response_with_project(entry))
    finally:
        session.close()


@time_entries_bp.route("/time-entries/<uuid:entry_id>", methods=["PUT"])
def update_time_entry(entry_id: UUID):
    """Update a time entry."""
    try:
        data = TimeEntryUpdate.model_validate(request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        entry = session.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return jsonify({"error": "Time entry not found"}), 404

        # Update fields
        if data.name is not None:
            entry.name = data.name
        if data.project_id is not None:
            project = (
                session.query(Project).filter(Project.id == data.project_id).first()
            )
            if not project:
                return jsonify({"error": "Project not found"}), 404
            entry.project_id = data.project_id
        if data.start_time is not None:
            entry.start_time = data.start_time
        if data.end_time is not None:
            entry.end_time = data.end_time
            # Recalculate duration
            entry.duration_seconds = int(
                (entry.end_time - entry.start_time).total_seconds()
            )
        if data.tag_ids is not None:
            tags = (
                session.query(CategoryTag)
                .filter(CategoryTag.id.in_(data.tag_ids))
                .all()
            )
            entry.tags = tags

        session.commit()
        session.refresh(entry)
        return jsonify(entry_to_response_with_project(entry))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@time_entries_bp.route("/time-entries/<uuid:entry_id>", methods=["DELETE"])
def delete_time_entry(entry_id: UUID):
    """Delete a time entry."""
    session = db.get_session()
    try:
        entry = session.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return jsonify({"error": "Time entry not found"}), 404

        session.delete(entry)
        session.commit()
        return "", 204
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@time_entries_bp.route("/time-entries/<uuid:entry_id>/stop", methods=["POST"])
def stop_time_entry(entry_id: UUID):
    """Stop a running timer."""
    session = db.get_session()
    try:
        entry = session.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return jsonify({"error": "Time entry not found"}), 404

        if entry.end_time is not None:
            return jsonify({"error": "Timer is not running"}), 400

        time_entry_service.stop_timer(session, entry)
        session.commit()
        session.refresh(entry)
        return jsonify(entry_to_response_with_project(entry))
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
