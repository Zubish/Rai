export type DemandSeriesPoint = { date: string; value: number };

export type DemandForecastRequest = {
  series: DemandSeriesPoint[];
  horizonDays: number;
};

export type DemandForecastResponse = {
  model: "linear_trend" | "moving_average";
  horizonDays: number;
  forecast: DemandSeriesPoint[];
  totalForecast: number;
  backtest: { mae: number; observations: number };
  warnings: string[];
};

export type AnalyticsServiceConfig = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export function getAnalyticsServiceConfig(): AnalyticsServiceConfig | null {
  const baseUrl = process.env.RAI_ANALYTICS_SERVICE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl,
    apiKey: process.env.RAI_ANALYTICS_SERVICE_API_KEY?.trim() || undefined,
    timeoutMs: Number(process.env.RAI_ANALYTICS_SERVICE_TIMEOUT_MS || 2500)
  };
}

export async function requestDemandForecast(
  request: DemandForecastRequest,
  config: AnalyticsServiceConfig
): Promise<DemandForecastResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(100, config.timeoutMs));

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(
      new URL("/v1/forecasts/demand", ensureTrailingSlash(config.baseUrl)).toString(),
      {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`Rai analytics service returned ${response.status}.`);
    }

    const payload = await response.json();
    if (!isDemandForecastResponse(payload)) {
      throw new Error("Rai analytics service returned an invalid response.");
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function isDemandForecastResponse(value: unknown): value is DemandForecastResponse {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<DemandForecastResponse>;
  return (
    (payload.model === "linear_trend" || payload.model === "moving_average") &&
    typeof payload.horizonDays === "number" &&
    Array.isArray(payload.forecast) &&
    payload.forecast.every((point) =>
      Boolean(point) && typeof point.date === "string" && typeof point.value === "number"
    ) &&
    typeof payload.totalForecast === "number" &&
    Boolean(payload.backtest) &&
    typeof payload.backtest?.mae === "number" &&
    typeof payload.backtest?.observations === "number" &&
    Array.isArray(payload.warnings)
  );
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
