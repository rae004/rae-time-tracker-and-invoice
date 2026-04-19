"""Tests for health check endpoint."""


class TestHealthEndpoint:
    """Tests for health check."""

    def test_health_check_returns_status(self, client, session):
        """Health check endpoint returns expected structure."""
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.get_json()
        assert "status" in data
        assert "database" in data
