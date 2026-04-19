"""Tests for projects API endpoints."""


class TestProjectEndpoints:
    """Tests for project CRUD operations."""

    def test_list_projects_empty(self, client, session):
        """List projects when none exist."""
        response = client.get("/api/projects")

        assert response.status_code == 200
        data = response.get_json()
        assert data["projects"] == []
        assert data["total"] == 0

    def test_list_projects_with_data(self, client, session, sample_project):
        """List projects when data exists."""
        response = client.get("/api/projects")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["projects"]) == 1
        assert data["total"] == 1
        assert data["projects"][0]["name"] == "Test Project"

    def test_list_projects_filter_by_client(
        self, client, session, sample_client, sample_project
    ):
        """List projects filtered by client_id."""
        response = client.get(f"/api/projects?client_id={sample_client.id}")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["projects"]) == 1
        assert data["projects"][0]["client_id"] == str(sample_client.id)

    def test_list_projects_filter_by_active(self, client, session, sample_project):
        """List projects filtered by active status."""
        response = client.get("/api/projects?active=true")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["projects"]) == 1

        response = client.get("/api/projects?active=false")
        data = response.get_json()
        assert len(data["projects"]) == 0

    def test_create_project(self, client, session, sample_client):
        """Create a new project."""
        payload = {
            "name": "New Project",
            "description": "A new project",
            "client_id": str(sample_client.id),
        }
        response = client.post("/api/projects", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "New Project"
        assert data["client_id"] == str(sample_client.id)
        assert data["is_active"] is True

    def test_create_project_invalid_client(self, client, session):
        """Create project with non-existent client fails."""
        import uuid

        payload = {
            "name": "New Project",
            "client_id": str(uuid.uuid4()),
        }
        response = client.post("/api/projects", json=payload)

        assert response.status_code == 404

    def test_get_project(self, client, session, sample_project):
        """Get a specific project by ID."""
        response = client.get(f"/api/projects/{sample_project.id}")

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Test Project"
        assert "client_name" in data

    def test_get_project_not_found(self, client, session):
        """Get a non-existent project returns 404."""
        import uuid

        fake_id = uuid.uuid4()
        response = client.get(f"/api/projects/{fake_id}")

        assert response.status_code == 404

    def test_update_project(self, client, session, sample_project):
        """Update a project."""
        payload = {"name": "Updated Project Name", "is_active": False}
        response = client.put(f"/api/projects/{sample_project.id}", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Updated Project Name"
        assert data["is_active"] is False

    def test_delete_project(self, client, session, sample_project):
        """Delete a project."""
        response = client.delete(f"/api/projects/{sample_project.id}")

        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/projects/{sample_project.id}")
        assert response.status_code == 404
