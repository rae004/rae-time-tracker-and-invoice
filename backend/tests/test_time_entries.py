"""Tests for time entries API endpoints."""

from datetime import datetime, timedelta

import pytest

from app.models import TimeEntry


class TestTimeEntryEndpoints:
    """Tests for time entry CRUD operations."""

    def test_list_time_entries_empty(self, client, session):
        """List time entries when none exist."""
        response = client.get("/api/time-entries")

        assert response.status_code == 200
        data = response.get_json()
        assert data["entries"] == []
        assert data["total"] == 0

    def test_create_time_entry_starts_timer(self, client, session, sample_project):
        """Create a time entry without end_time starts a timer."""
        payload = {
            "name": "Working on feature",
            "project_id": str(sample_project.id),
        }
        response = client.post("/api/time-entries", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Working on feature"
        assert data["project_id"] == str(sample_project.id)
        assert data["end_time"] is None
        assert data["is_running"] is True

    def test_create_completed_time_entry(self, client, session, sample_project):
        """Create a time entry with end_time (completed entry)."""
        start = datetime.utcnow() - timedelta(hours=2)
        end = datetime.utcnow() - timedelta(hours=1)
        payload = {
            "name": "Completed task",
            "project_id": str(sample_project.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
        }
        response = client.post("/api/time-entries", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Completed task"
        assert data["end_time"] is not None
        assert data["is_running"] is False
        assert data["duration_seconds"] == 3600  # 1 hour

    def test_create_time_entry_with_tags(
        self, client, session, sample_project, sample_category_tag
    ):
        """Create a time entry with tags."""
        payload = {
            "name": "Tagged task",
            "project_id": str(sample_project.id),
            "tag_ids": [str(sample_category_tag.id)],
        }
        response = client.post("/api/time-entries", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "Development"

    def test_get_active_timer_none(self, client, session):
        """Get active timer when none running."""
        response = client.get("/api/time-entries/active")

        assert response.status_code == 200
        data = response.get_json()
        assert data["active_entry"] is None

    def test_get_active_timer_running(self, client, session, sample_project):
        """Get active timer when one is running."""
        # Start a timer
        payload = {
            "name": "Running task",
            "project_id": str(sample_project.id),
        }
        client.post("/api/time-entries", json=payload)

        response = client.get("/api/time-entries/active")

        assert response.status_code == 200
        data = response.get_json()
        assert data["active_entry"] is not None
        assert data["active_entry"]["name"] == "Running task"
        assert data["active_entry"]["is_running"] is True

    def test_stop_timer(self, client, session, sample_project):
        """Stop a running timer."""
        # Start a timer
        payload = {
            "name": "Task to stop",
            "project_id": str(sample_project.id),
        }
        create_response = client.post("/api/time-entries", json=payload)
        entry_id = create_response.get_json()["id"]

        # Stop the timer
        response = client.post(f"/api/time-entries/{entry_id}/stop")

        assert response.status_code == 200, f"Response: {response.get_json()}"
        data = response.get_json()
        assert data["end_time"] is not None
        assert data["is_running"] is False
        assert data["duration_seconds"] is not None

    def test_stop_timer_already_stopped(self, client, session, sample_project):
        """Stop a timer that's already stopped returns error."""
        # Create completed entry
        start = datetime.utcnow() - timedelta(hours=1)
        end = datetime.utcnow()
        payload = {
            "name": "Already stopped",
            "project_id": str(sample_project.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
        }
        create_response = client.post("/api/time-entries", json=payload)
        entry_id = create_response.get_json()["id"]

        response = client.post(f"/api/time-entries/{entry_id}/stop")

        assert response.status_code == 400

    def test_starting_new_timer_stops_existing(self, client, session, sample_project):
        """Starting a new timer stops any existing running timer."""
        # Start first timer
        payload1 = {
            "name": "First task",
            "project_id": str(sample_project.id),
        }
        response1 = client.post("/api/time-entries", json=payload1)
        first_id = response1.get_json()["id"]

        # Start second timer
        payload2 = {
            "name": "Second task",
            "project_id": str(sample_project.id),
        }
        client.post("/api/time-entries", json=payload2)

        # Check first timer is stopped
        response = client.get(f"/api/time-entries/{first_id}")
        data = response.get_json()
        assert data["is_running"] is False
        assert data["end_time"] is not None

    def test_update_time_entry(self, client, session, sample_project):
        """Update a time entry."""
        # Create entry
        payload = {
            "name": "Original name",
            "project_id": str(sample_project.id),
        }
        create_response = client.post("/api/time-entries", json=payload)
        entry_id = create_response.get_json()["id"]

        # Update entry
        update_payload = {"name": "Updated name"}
        response = client.put(f"/api/time-entries/{entry_id}", json=update_payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Updated name"

    def test_delete_time_entry(self, client, session, sample_project):
        """Delete a time entry."""
        # Create entry
        payload = {
            "name": "To delete",
            "project_id": str(sample_project.id),
        }
        create_response = client.post("/api/time-entries", json=payload)
        entry_id = create_response.get_json()["id"]

        # Delete entry
        response = client.delete(f"/api/time-entries/{entry_id}")
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/time-entries/{entry_id}")
        assert response.status_code == 404

    def test_get_weekly_entries(self, client, session, sample_project):
        """Get weekly entries."""
        # Create a completed entry for today
        start = datetime.utcnow() - timedelta(hours=2)
        end = datetime.utcnow() - timedelta(hours=1)
        payload = {
            "name": "Weekly task",
            "project_id": str(sample_project.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
        }
        client.post("/api/time-entries", json=payload)

        response = client.get("/api/time-entries/weekly")

        assert response.status_code == 200
        data = response.get_json()
        assert "week_start" in data
        assert "week_end" in data
        assert "entries_by_day" in data
        assert "daily_totals" in data
        assert "weekly_total" in data
        assert data["weekly_total"] >= 1.0  # At least 1 hour

    def test_filter_by_project(self, client, session, sample_project):
        """Filter time entries by project."""
        # Create entry
        payload = {
            "name": "Project task",
            "project_id": str(sample_project.id),
        }
        client.post("/api/time-entries", json=payload)

        response = client.get(
            f"/api/time-entries?project_id={sample_project.id}"
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["total"] == 1

    def test_filter_by_running_status(self, client, session, sample_project):
        """Filter time entries by running status."""
        # Create running entry
        payload = {
            "name": "Running task",
            "project_id": str(sample_project.id),
        }
        client.post("/api/time-entries", json=payload)

        # Filter running
        response = client.get("/api/time-entries?running=true")
        data = response.get_json()
        assert data["total"] == 1

        # Filter not running
        response = client.get("/api/time-entries?running=false")
        data = response.get_json()
        assert data["total"] == 0
