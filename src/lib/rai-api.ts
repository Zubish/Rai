export type RaiChatReply = {
  conversationId: string;
  message: { id: string; role: "rai"; text: string; createdAt: string };
  provider: { id: string; model: string | null; grounded: boolean };
  grounding: { status: "verified_data" | "no_operational_data"; sources: string[] };
  warnings: string[];
};

type RaiApiError = { error?: { message?: string } };

export async function sendRaiMessage(message: string, conversationId?: string): Promise<RaiChatReply> {
  let response: Response;
  try {
    response = await fetch("/api/rai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, conversationId })
    });
  } catch {
    throw new Error("Rai's local API is unavailable. Start the Rai API and try again.");
  }

  const payload = (await response.json().catch(() => ({}))) as RaiApiError & { data?: RaiChatReply };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || "Rai could not complete that request right now.");
  }
  return payload.data;
}
