import { createHash, randomBytes } from "node:crypto";

// Persist state and verifier only in the server-side login transaction, not model context.
export function createPkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url"), state: randomBytes(32).toString("base64url") };
}

export function createRxLedgerConnection({
  baseUrl = process.env.RXLEDGER_BASE_URL,
  apiKey = process.env.RXLEDGER_RAI_API_KEY || process.env.RXLEDGER_API_KEY,
  fetchImpl = fetch
} = {}) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !apiKey) throw new Error("A configured HTTPS RxLedger origin and server credential are required.");
  async function call(body) {
    let response, payload;
    try {
      response = await fetchImpl(`${url.origin}/api/rai/connection`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      payload = await response.json();
    } catch { throw failure(502); }
    if (!response.ok) throw failure([401, 403, 503].includes(response.status) ? response.status : 502);
    if (!payload?.data || typeof payload.data !== "object") throw failure(502);
    return payload.data;
  }
  return {
    async exchange({ code, verifier, redirectUri }) {
      const data = await call({ action: "exchange", code, code_verifier: verifier, redirect_uri: redirectUri });
      if (typeof data.accessToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(data.accessToken) || data.tokenType !== "Bearer" || !Number.isInteger(data.expiresIn) || data.expiresIn < 1 || data.expiresIn > 900) throw failure(502);
      return { accessToken: data.accessToken, expiresIn: data.expiresIn };
    },
    async inspect(accessToken) {
      const data = await call({ action: "inspect", access_token: accessToken });
      const list = value => Array.isArray(value) && value.length > 0 && value.length <= 20 && value.every(item => typeof item === "string" && item.length > 0 && item.length <= 128);
      if (typeof data.tenantId !== "string" || !data.tenantId || typeof data.userId !== "string" || !data.userId ||
          !["admin", "pharmacist", "inventory"].includes(data.role) || !list(data.branchIds) || !list(data.capabilities) ||
          data.capabilities.some(item => !["inventory_analytics", "sales_analytics", "financial_analytics", "continuity_analytics"].includes(item))) throw failure(502);
      return { tenantId: data.tenantId, userId: data.userId, role: data.role, branchIds: data.branchIds, capabilities: data.capabilities };
    },
    async revoke(accessToken) {
      const data = await call({ action: "revoke", access_token: accessToken });
      if (data.revoked !== true) throw failure(502);
      return { revoked: true };
    }
  };
}

function failure(status) {
  return Object.assign(new Error("RxLedger connection could not be verified. Reconnect or try again later."), { code: "rxledger_connection_failed", status });
}
