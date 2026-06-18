import { runRaiAnalytics } from "./analyticsEngine";
import { parseRaiQuestion } from "./intentParser";
import type { RaiReport } from "./types";

export type RaiClientResponse = {
  sessionId?: string;
  assistantText: string;
  report: RaiReport;
  orchestrationMode: "openai_tools" | "deterministic_fallback" | "client_fallback";
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
    const report = await runRaiAnalytics(parseRaiQuestion(message));
    return {
      assistantText: report.directAnswer,
      report: {
        ...report,
        warnings: [...report.warnings, "Rai API was unavailable, so the local deterministic fallback answered."]
      },
      orchestrationMode: "client_fallback"
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
