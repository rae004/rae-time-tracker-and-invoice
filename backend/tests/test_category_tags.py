"""Tests for category tags API endpoints."""


class TestCategoryTagEndpoints:
    """Tests for category tag CRUD operations."""

    def test_list_category_tags_empty(self, client, session):
        """List category tags when none exist."""
        response = client.get("/api/category-tags")

        assert response.status_code == 200
        data = response.get_json()
        assert data["tags"] == []
        assert data["total"] == 0

    def test_list_category_tags_with_data(self, client, session, sample_category_tag):
        """List category tags when data exists."""
        response = client.get("/api/category-tags")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["tags"]) == 1
        assert data["total"] == 1
        assert data["tags"][0]["name"] == "Development"

    def test_create_category_tag(self, client, session):
        """Create a new category tag."""
        payload = {
            "name": "Testing",
            "color": "#10B981",
        }
        response = client.post("/api/category-tags", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Testing"
        assert data["color"] == "#10B981"
        assert "id" in data

    def test_create_category_tag_default_color(self, client, session):
        """Create a category tag with default color."""
        payload = {"name": "Design"}
        response = client.post("/api/category-tags", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Design"
        assert data["color"] == "#6B7280"  # Default color

    def test_create_category_tag_invalid_color(self, client, session):
        """Create category tag with invalid color fails."""
        payload = {
            "name": "Invalid",
            "color": "not-a-hex",
        }
        response = client.post("/api/category-tags", json=payload)

        assert response.status_code == 400

    def test_create_category_tag_duplicate_name(
        self, client, session, sample_category_tag
    ):
        """Create category tag with duplicate name fails."""
        payload = {
            "name": "Development",  # Already exists
            "color": "#FF0000",
        }
        response = client.post("/api/category-tags", json=payload)

        assert response.status_code == 409

    def test_get_category_tag(self, client, session, sample_category_tag):
        """Get a specific category tag by ID."""
        response = client.get(f"/api/category-tags/{sample_category_tag.id}")

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Development"
        assert data["id"] == str(sample_category_tag.id)

    def test_get_category_tag_not_found(self, client, session):
        """Get a non-existent category tag returns 404."""
        import uuid

        fake_id = uuid.uuid4()
        response = client.get(f"/api/category-tags/{fake_id}")

        assert response.status_code == 404

    def test_update_category_tag(self, client, session, sample_category_tag):
        """Update a category tag."""
        payload = {"name": "Backend Development", "color": "#EF4444"}
        response = client.put(
            f"/api/category-tags/{sample_category_tag.id}", json=payload
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Backend Development"
        assert data["color"] == "#EF4444"

    def test_delete_category_tag(self, client, session, sample_category_tag):
        """Delete a category tag."""
        response = client.delete(f"/api/category-tags/{sample_category_tag.id}")

        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/category-tags/{sample_category_tag.id}")
        assert response.status_code == 404
