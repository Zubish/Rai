import type { RaiReport } from "./types.js";

export type RaiConversationKind =
  | "analytics"
  | "greeting"
  | "gratitude"
  | "identity"
  | "capability_help"
  | "small_talk";

export type RaiConversationClassification = {
  kind: RaiConversationKind;
  confidence: "high" | "medium";
  normalizedMessage: string;
};

export function classifyRaiConversation(message: string): RaiConversationClassification {
  const normalizedMessage = message.trim();
  const lower = normalizedMessage.toLowerCase();
  const compact = lower.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

  if (/^(hi|hello|hey|hi rai|hello rai|hey rai|good morning|good afternoon|good evening)$/.test(compact)) {
    return { kind: "greeting", confidence: "high", normalizedMessage };
  }

  if (/^(thanks|thank you|thank you rai|okay thanks|ok thanks)$/.test(compact)) {
    return { kind: "gratitude", confidence: "high", normalizedMessage };
  }

  if (
    compact === "who are you" ||
    compact === "what are you" ||
    compact === "what is rai" ||
    compact === "who is rai" ||
    compact.includes("tell me about rai")
  ) {
    return { kind: "identity", confidence: "high", normalizedMessage };
  }

  if (
    compact === "help" ||
    compact === "can you help me" ||
    compact === "what can you do" ||
    compact === "what can rai do" ||
    compact.includes("how can you help")
  ) {
    return { kind: "capability_help", confidence: "high", normalizedMessage };
  }

  if (/^(how are you|how far|whats up|what is up)$/.test(compact)) {
    return { kind: "small_talk", confidence: "medium", normalizedMessage };
  }

  return { kind: "analytics", confidence: "high", normalizedMessage };
}

export function createRaiConversationReport(classification: RaiConversationClassification): RaiReport {
  const directAnswer = answerForConversation(classification.kind);

  return {
    status: "success",
    id: `conversation-${classification.kind}`,
    intentLabel: "Conversation",
    title: "Rai",
    directAnswer,
    summary:
      "Rai answered conversationally because the message did not require RxLedger analytics or a report.",
    toolName: "no_tool_needed",
    metricCards: [],
    chartData: [],
    table: { columns: [], rows: [] },
    assumptions: [
      "No RxLedger data was queried.",
      "No pharmacy numbers were calculated.",
      "Use an analytics question when you want Rai to inspect RxLedger data."
    ],
    warnings: [],
    suggestedActions: [
      "Ask about sales, stock, patients, branches, reports, forecasts, profit, approvals, or refill follow-up."
    ],
    confidence: classification.confidence,
    agentTrace: [
      "Conversation Intelligence Agent classified the message before analytics routing.",
      "Rai skipped tool calling because no RxLedger data was needed."
    ]
  };
}

function answerForConversation(kind: RaiConversationKind): string {
  switch (kind) {
    case "greeting":
      return "Hi, I’m Rai. Ask me about your pharmacy sales, stock, patients, branches, reports, forecasts, profit, approvals, or refill follow-up.";
    case "gratitude":
      return "You’re welcome. I’m here whenever you want to inspect RxLedger data or turn pharmacy activity into a clear report.";
    case "identity":
      return "I’m Rai, the pharmacy intelligence assistant for RxLedger. I help you ask natural-language questions about pharmacy operations and turn approved RxLedger data into insights, reports, forecasts, and recommended actions.";
    case "capability_help":
      return "I can help analyze RxLedger data across sales, inventory, stockout risk, expiry risk, patient medication patterns, profit, budgets, branches, approvals, and reports. Ask a question like “Which products should I reorder this week?” or “How many Aprovel tablets sold in Lagos yesterday?”";
    case "small_talk":
      return "I’m ready. Send me a pharmacy question and I’ll help turn the RxLedger data into something useful.";
    case "analytics":
      return "";
  }
}
