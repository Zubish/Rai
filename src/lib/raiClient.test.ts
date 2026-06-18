import { afterEach, describe, expect, it, vi } from "vitest";
import { askRaiBackend } from "./raiClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Rai client", () => {
  it("returns structured backend responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          assistantText: "Backend answer",
          orchestrationMode: "deterministic_fallback",
          report: {
            status: "success",
            id: "test",
            intentLabel: "Test",
            title: "Test",
            directAnswer: "Backend answer",
            summary: "Summary",
            toolName: "test_tool",
            metricCards: [],
            chartData: [],
            table: { columns: [], rows: [] },
            assumptions: [],
            warnings: [],
            suggestedActions: []
          },
          toolCalls: []
        }
      })
    } as Response);

    const response = await askRaiBackend("hello");

    expect(response.assistantText).toBe("Backend answer");
    expect(response.orchestrationMode).toBe("deterministic_fallback");
  });

  it("falls back locally when the backend is unavailable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const response = await askRaiBackend("Where is cash tied down in stock?");

    expect(response.orchestrationMode).toBe("client_fallback");
    expect(response.report.toolName).toBe("find_cash_tied_in_inventory");
    expect(response.report.warnings).toContain(
      "Rai API was unavailable, so the local deterministic fallback answered."
    );
  });
});
