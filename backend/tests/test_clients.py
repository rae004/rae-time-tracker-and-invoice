"""Tests for clients API endpoints."""


class TestClientEndpoints:
    """Tests for client CRUD operations."""

    def test_list_clients_empty(self, client, session):
        """List clients when none exist."""
        response = client.get("/api/clients")

        assert response.status_code == 200
        data = response.get_json()
        assert data["clients"] == []
        assert data["total"] == 0

    def test_list_clients_with_data(self, client, session, sample_client):
        """List clients when data exists."""
        response = client.get("/api/clients")

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["clients"]) == 1
        assert data["total"] == 1
        assert data["clients"][0]["name"] == "Test Company"

    def test_create_client(self, client, session):
        """Create a new client."""
        payload = {
            "name": "New Client",
            "address_line1": "789 New St",
            "city": "New City",
            "state": "NC",
            "zip_code": "67890",
            "hourly_rate": "125.00",
        }
        response = client.post("/api/clients", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "New Client"
        assert data["city"] == "New City"
        assert "id" in data

    def test_create_client_missing_required_field(self, client, session):
        """Create client with missing required field fails."""
        payload = {
            "name": "New Client",
            # Missing address_line1, city, state, zip_code
        }
        response = client.post("/api/clients", json=payload)

        assert response.status_code == 400

    def test_get_client(self, client, session, sample_client):
        """Get a specific client by ID."""
        response = client.get(f"/api/clients/{sample_client.id}")

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Test Company"
        assert data["id"] == str(sample_client.id)

    def test_get_client_not_found(self, client, session):
        """Get a non-existent client returns 404."""
        import uuid

        fake_id = uuid.uuid4()
        response = client.get(f"/api/clients/{fake_id}")

        assert response.status_code == 404

    def test_update_client(self, client, session, sample_client):
        """Update a client."""
        payload = {"name": "Updated Company Name"}
        response = client.put(f"/api/clients/{sample_client.id}", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Updated Company Name"

    def test_update_client_not_found(self, client, session):
        """Update a non-existent client returns 404."""
        import uuid

        fake_id = uuid.uuid4()
        payload = {"name": "Updated Name"}
        response = client.put(f"/api/clients/{fake_id}", json=payload)

        assert response.status_code == 404

    def test_delete_client(self, client, session, sample_client):
        """Delete a client."""
        response = client.delete(f"/api/clients/{sample_client.id}")

        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/clients/{sample_client.id}")
        assert response.status_code == 404

    def test_delete_client_not_found(self, client, session):
        """Delete a non-existent client returns 404."""
        import uuid

        fake_id = uuid.uuid4()
        response = client.delete(f"/api/clients/{fake_id}")

        assert response.status_code == 404
