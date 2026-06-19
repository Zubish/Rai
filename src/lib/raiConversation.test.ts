import { describe, expect, it } from "vitest";
import { classifyRaiConversation, createRaiConversationReport } from "./raiConversation";

describe("Rai conversation intelligence", () => {
  it.each([
    ["hi", "greeting"],
    ["Hello Rai", "greeting"],
    ["thanks", "gratitude"],
    ["who are you?", "identity"],
    ["what can you do?", "capability_help"],
    ["can you help me?", "capability_help"]
  ])("classifies '%s' as %s without forcing analytics", (message, expectedKind) => {
    expect(classifyRaiConversation(message).kind).toBe(expectedKind);
  });

  it("leaves real RxLedger analytics questions for the tool router", () => {
    expect(classifyRaiConversation("From Lagos branch how many Aprovel was sold yesterday?").kind).toBe(
      "analytics"
    );
    expect(classifyRaiConversation("Which products are likely to stock out next week?").kind).toBe("analytics");
  });

  it("creates a branded greeting report without analytics cards", () => {
    const report = createRaiConversationReport(classifyRaiConversation("hi"));

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("no_tool_needed");
    expect(report.directAnswer).toContain("Hi");
    expect(report.directAnswer).toContain("Rai");
    expect(report.directAnswer).not.toContain("continuity");
    expect(report.metricCards).toEqual([]);
    expect(report.table.rows).toEqual([]);
  });
});
