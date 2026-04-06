"""Tests for user profile API endpoints."""


class TestUserProfileEndpoints:
    """Tests for user profile operations."""

    def test_get_user_profile_creates_placeholder(self, client, session):
        """Get user profile creates a placeholder if none exists."""
        response = client.get("/api/user-profile")

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Your Name"
        assert data["email"] == "you@example.com"
        assert "id" in data
        assert data["next_invoice_number"] == 1

    def test_get_user_profile_returns_existing(
        self, client, session, sample_user_profile
    ):
        """Get user profile returns existing profile."""
        response = client.get("/api/user-profile")

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "John Doe"
        assert data["email"] == "john@example.com"

    def test_update_user_profile(self, client, session, sample_user_profile):
        """Update user profile."""
        payload = {
            "name": "Jane Doe",
            "email": "jane@example.com",
        }
        response = client.put("/api/user-profile", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["name"] == "Jane Doe"
        assert data["email"] == "jane@example.com"
        # Unchanged fields should remain
        assert data["phone"] == "555-123-4567"

    def test_update_user_profile_partial(self, client, session, sample_user_profile):
        """Update only some fields of user profile."""
        payload = {"payment_instructions": "ACH preferred"}
        response = client.put("/api/user-profile", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["payment_instructions"] == "ACH preferred"
        assert data["name"] == "John Doe"  # Unchanged

    def test_create_user_profile(self, client, session):
        """Create or reset user profile."""
        payload = {
            "name": "Test User",
            "address_line1": "100 Test Ave",
            "city": "Test Town",
            "state": "TT",
            "zip_code": "11111",
            "email": "test@example.com",
            "phone": "555-000-0000",
            "payment_instructions": "PayPal: test@example.com",
        }
        response = client.post("/api/user-profile", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Test User"
        assert data["email"] == "test@example.com"
        assert data["next_invoice_number"] == 1

    def test_create_user_profile_replaces_existing(
        self, client, session, sample_user_profile
    ):
        """Create user profile replaces existing one."""
        payload = {
            "name": "New User",
            "address_line1": "200 New St",
            "city": "New Town",
            "state": "NT",
            "zip_code": "22222",
            "email": "new@example.com",
            "phone": "555-999-9999",
            "payment_instructions": "Venmo: @newuser",
        }
        response = client.post("/api/user-profile", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "New User"
        assert data["email"] == "new@example.com"

        # Verify old profile was replaced
        response = client.get("/api/user-profile")
        data = response.get_json()
        assert data["name"] == "New User"
