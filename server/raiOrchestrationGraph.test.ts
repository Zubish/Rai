// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createRaiOrchestrationGraph } from "./raiOrchestrationGraph";
import type { RaiChatResponse } from "./raiChatService";

const response = (mode: RaiChatResponse["orchestrationMode"]): RaiChatResponse => ({
  assistantText: "Done",
  report: {
    status: "success",
    id: "test",
    intentLabel: "Test",
    title: "Test",
    directAnswer: "Done",
    summary: "Done",
    toolName: "no_tool_needed",
    metricCards: [],
    chartData: [],
    table: { columns: [], rows: [] },
    assumptions: [],
    warnings: [],
    suggestedActions: []
  },
  orchestrationMode: mode,
  toolCalls: []
});

describe("Rai orchestration graph", () => {
  it("routes greetings directly to conversation without loading pharmacy data", async () => {
    const loadData = vi.fn();
    const runAnalytics = vi.fn();
    const graph = createRaiOrchestrationGraph({
      loadData,
      runAnalytics,
      runConversation: vi.fn(() => response("conversation"))
    });

    const result = await graph.invoke({ request: { message: "hi" } });

    expect(result.response?.orchestrationMode).toBe("conversation");
    expect(loadData).not.toHaveBeenCalled();
    expect(runAnalytics).not.toHaveBeenCalled();
    expect(result.trace).toEqual(["classify:greeting", "respond:conversation"]);
  });

  it("loads the approved data source before running analytics", async () => {
    const dataSource = { medications: [], dispensedMedicationRecords: [], sourceLabel: "test" };
    const loadData = vi.fn(async () => ({ dataSource, warning: "Limited data" }));
    const runAnalytics = vi.fn(async (_message, received) => {
      expect(received).toBe(dataSource);
      return response("deterministic_fallback");
    });
    const graph = createRaiOrchestrationGraph({
      loadData,
      runAnalytics,
      runConversation: vi.fn()
    });

    const result = await graph.invoke({ request: { message: "Forecast demand for 30 days" } });

    expect(loadData).toHaveBeenCalledOnce();
    expect(runAnalytics).toHaveBeenCalledOnce();
    expect(result.warning).toBe("Limited data");
    expect(result.trace).toEqual([
      "classify:analytics",
      "load:approved-data",
      "respond:analytics"
    ]);
  });
});
