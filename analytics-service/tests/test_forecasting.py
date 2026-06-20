from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_reports_service_ready():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "rai-analytics"}


def test_demand_forecast_returns_bounded_deterministic_result():
    response = client.post(
        "/v1/forecasts/demand",
        json={
            "series": [
                {"date": "2026-06-01", "value": 10},
                {"date": "2026-06-02", "value": 12},
                {"date": "2026-06-03", "value": 14},
                {"date": "2026-06-04", "value": 16},
                {"date": "2026-06-05", "value": 18},
                {"date": "2026-06-06", "value": 20},
                {"date": "2026-06-07", "value": 22},
                {"date": "2026-06-08", "value": 24},
            ],
            "horizonDays": 3,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "linear_trend"
    assert body["horizonDays"] == 3
    assert [point["value"] for point in body["forecast"]] == [26.0, 28.0, 30.0]
    assert body["totalForecast"] == 84.0
    assert body["backtest"]["observations"] >= 2


def test_demand_forecast_rejects_negative_values():
    response = client.post(
        "/v1/forecasts/demand",
        json={
            "series": [{"date": "2026-06-01", "value": -1}],
            "horizonDays": 3,
        },
    )

    assert response.status_code == 422
