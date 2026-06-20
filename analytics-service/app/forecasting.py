import numpy as np
import pandas as pd

from .models import (
    BacktestResult,
    DemandForecastRequest,
    DemandForecastResponse,
    ForecastPoint,
)


def forecast_demand(request: DemandForecastRequest) -> DemandForecastResponse:
    frame = pd.DataFrame(
        [{"date": point.date, "value": point.value} for point in request.series]
    ).sort_values("date")
    values = frame["value"].to_numpy(dtype=float)
    positions = np.arange(len(values), dtype=float)

    slope, intercept = np.polyfit(positions, values, 1)
    future_positions = np.arange(
        len(values), len(values) + request.horizonDays, dtype=float
    )
    predicted = np.maximum(0, slope * future_positions + intercept)
    future_dates = pd.date_range(
        start=pd.Timestamp(frame["date"].iloc[-1]) + pd.Timedelta(days=1),
        periods=request.horizonDays,
        freq="D",
    )

    fitted = np.maximum(0, slope * positions + intercept)
    mae = float(np.mean(np.abs(values - fitted)))
    warnings: list[str] = []
    if len(values) < 14:
        warnings.append("Fewer than 14 observations were available; treat this forecast as directional.")

    forecast = [
        ForecastPoint(date=timestamp.date(), value=round(float(value), 2))
        for timestamp, value in zip(future_dates, predicted, strict=True)
    ]
    return DemandForecastResponse(
        model="linear_trend",
        horizonDays=request.horizonDays,
        forecast=forecast,
        totalForecast=round(sum(point.value for point in forecast), 2),
        backtest=BacktestResult(mae=round(mae, 2), observations=len(values)),
        warnings=warnings,
    )
