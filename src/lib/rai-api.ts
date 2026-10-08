export type RaiChatReply = {
  conversationId: string;
  message: { id: string; role: "rai"; text: string; createdAt: string };
  provider: { id: string; model: string | null; grounded: boolean };
  grounding: { status: "verified_data" | "no_operational_data"; sources: string[] };
  warnings: string[];
  audit?: { kind: string; branchId: string | null; dateRange: { startDate: string; endDate: string; timezone: string } | null; assumptions: string[]; generatedAt: string };
};

type RaiApiError = { error?: { message?: string; reason?: string; nextStep?: string } };

export function formatRaiFailure(error?: RaiApiError['error']) {
  return [error?.message || 'The task could not be completed.', `Reason: ${error?.reason || 'The service did not return a usable response; the exact cause is not confirmed.'}`, `Next: ${error?.nextStep || 'Retry once. If this continues, ask your administrator to check the service.'}`].join('\n');
}

export async function sendRaiMessage(message: string, conversationId?: string): Promise<RaiChatReply> {
  let response: Response;
  try {
    response = await fetch("/api/rai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, conversationId })
    });
  } catch {
    throw new Error(formatRaiFailure({ message: 'Rai could not receive your request.', reason: 'The browser could not reach the Rai API.', nextStep: 'Check your connection. For local development, make sure the Rai API is running, then retry.' }));
  }

  const payload = (await response.json().catch(() => ({}))) as RaiApiError & { data?: RaiChatReply };
  if (!response.ok || !payload.data) {
    throw new Error(formatRaiFailure(payload.error));
  }
  return payload.data;
}
