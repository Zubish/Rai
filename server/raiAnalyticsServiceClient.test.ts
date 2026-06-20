// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDemandForecast } from "./raiAnalyticsServiceClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Rai analytics service client", () => {
  it("sends only an aggregate time series with service authentication", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "linear_trend",
        horizonDays: 2,
        forecast: [
          { date: "2026-06-03", value: 12 },
          { date: "2026-06-04", value: 13 }
        ],
        totalForecast: 25,
        backtest: { mae: 1.2, observations: 8 },
        warnings: []
      })
    } as Response);

    const result = await requestDemandForecast(
      {
        series: [
          { date: "2026-06-01", value: 10 },
          { date: "2026-06-02", value: 11 }
        ],
        horizonDays: 2
      },
      {
        baseUrl: "http://127.0.0.1:8790",
        apiKey: "local-secret",
        timeoutMs: 500
      }
    );

    expect(result.totalForecast).toBe(25);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8790/v1/forecasts/demand",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer local-secret" })
      })
    );
    const body = JSON.parse(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body));
    expect(body).toEqual({
      series: [
        { date: "2026-06-01", value: 10 },
        { date: "2026-06-02", value: 11 }
      ],
      horizonDays: 2
    });
  });

  it("rejects malformed service output", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ totalForecast: "invented" })
    } as Response);

    await expect(
      requestDemandForecast(
        { series: [{ date: "2026-06-01", value: 10 }], horizonDays: 2 },
        { baseUrl: "http://127.0.0.1:8790", timeoutMs: 500 }
      )
    ).rejects.toThrow("invalid response");
  });
});
