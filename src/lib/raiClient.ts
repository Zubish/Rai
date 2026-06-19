import { runRaiAnalytics } from "./analyticsEngine";
import { parseRaiQuestion } from "./intentParser";
import { classifyRaiConversation, createRaiConversationReport } from "./raiConversation";
import type { RaiReport } from "./types";

export type RaiClientResponse = {
  sessionId?: string;
  assistantText: string;
  report: RaiReport;
  orchestrationMode: "openai_tools" | "gemini_tools" | "deterministic_fallback" | "conversation" | "client_fallback";
  model?: string;
};

export type RaiLibraryItemInput = {
  name: string;
  type: "image" | "file" | "report" | "spreadsheet" | "insight";
  source: "upload" | "rai";
  metadata?: Record<string, unknown>;
};

export async function askRaiBackend(
  message: string,
  options: { sessionId?: string } = {}
): Promise<RaiClientResponse> {
  try {
    const response = await fetch("/api/rai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, sessionId: options.sessionId })
    });

    if (!response.ok) {
      throw new Error(`Rai API returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      ok: boolean;
      data?: RaiClientResponse;
      error?: string;
    };

    if (!payload.ok || !payload.data) {
      throw new Error(payload.error || "Rai API returned an invalid response.");
    }

    return payload.data;
  } catch {
    const conversation = classifyRaiConversation(message);
    const report =
      conversation.kind === "analytics"
        ? await runRaiAnalytics(parseRaiQuestion(message))
        : createRaiConversationReport(conversation);

    return {
      assistantText: report.directAnswer,
      report: {
        ...report,
        warnings: [...report.warnings, "Rai API was unavailable, so the local deterministic fallback answered."]
      },
      orchestrationMode: conversation.kind === "analytics" ? "client_fallback" : "conversation"
    };
  }
}

export async function saveRaiLibraryItem(item: RaiLibraryItemInput): Promise<boolean> {
  try {
    const response = await fetch("/api/rai/library", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(item)
    });

    return response.ok;
  } catch {
    return false;
  }
}
