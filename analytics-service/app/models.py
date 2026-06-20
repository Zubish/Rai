from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DemandPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    value: float = Field(ge=0, le=1_000_000_000)


class DemandForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    series: list[DemandPoint] = Field(min_length=2, max_length=730)
    horizonDays: int = Field(ge=1, le=365)

    @field_validator("series")
    @classmethod
    def dates_must_be_unique(cls, points: list[DemandPoint]) -> list[DemandPoint]:
        dates = [point.date for point in points]
        if len(dates) != len(set(dates)):
            raise ValueError("series dates must be unique")
        return points


class ForecastPoint(BaseModel):
    date: date
    value: float


class BacktestResult(BaseModel):
    mae: float
    observations: int


class DemandForecastResponse(BaseModel):
    model: str
    horizonDays: int
    forecast: list[ForecastPoint]
    totalForecast: float
    backtest: BacktestResult
    warnings: list[str]
