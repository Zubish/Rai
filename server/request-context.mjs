// Production identities must come from a verified SSO session, never request headers.
export function resolveRequestContext(request, { local = false } = {}) {
  if (!local || process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("RxLedger sign-in integration is not enabled yet."), { code: "unauthorized", status: 401 });
  }
  const host = request.headers?.host;
  const origin = request.headers?.origin;
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || "") ||
      (origin && ![`http://${host}`, `https://${host}`].includes(origin))) {
    throw Object.assign(new Error("Local Rai requests must be same-origin."), { code: "forbidden", status: 403 });
  }
  return { tenantId: "demo", branchId: "local-demo", role: "viewer", userId: "demo-user", mode: "demo" };
}

export function validateChatBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["message", "conversationId"].includes(key))) {
    throw Object.assign(new Error("Only message and conversationId are accepted."), { code: "validation_error", status: 422 });
  }
  return body;
}
