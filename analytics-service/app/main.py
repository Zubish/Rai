import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .forecasting import forecast_demand
from .models import DemandForecastRequest, DemandForecastResponse


app = FastAPI(title="Rai Analytics Service", version="0.1.0", docs_url="/docs")


def verify_service_token(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("RAI_ANALYTICS_SERVICE_API_KEY", "").strip()
    if not expected:
        return
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "service": "rai-analytics"}


@app.post(
    "/v1/forecasts/demand",
    response_model=DemandForecastResponse,
    dependencies=[Depends(verify_service_token)],
)
def demand_forecast(request: DemandForecastRequest) -> DemandForecastResponse:
    return forecast_demand(request)
