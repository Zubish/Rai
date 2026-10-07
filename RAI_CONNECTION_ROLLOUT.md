# Rai Connection Rollout

## Completed Backend Slice

RxLedger exposes a disabled-by-default `POST /api/rai/connection` handler. Its actions are:

| Action | Authentication | Result |
| --- | --- | --- |
| authorize | RxLedger browser session cookie, exact configured Origin, explicit consent | Single-use code valid for 120 seconds |
| exchange | Rai service credential plus code, S256 verifier and exact callback | Opaque grant valid for 900 seconds |
| inspect | Rai service credential plus delegated grant | Current authorized user/tenant/role/branches/capabilities |
| revoke | Rai service credential plus delegated grant | Idempotent removal of that grant |

The authorization handler derives user identity from the cookie, not a caller-supplied actor ID. Authorization requests specify exact branch IDs and capabilities; these must pass current RxLedger policy. The grant audience is Rai. PostgreSQL stores hashes of codes/grants, not their bearer values. An atomic DELETE consumes the authorization code, including a failed verifier attempt. No refresh token is issued.

Snapshot requests use the existing service bearer credential plus `x-rai-delegated-token`. Consent scope and current RxLedger policy both apply. Parent logout, deletion or 30-minute idle expiry invalidates the grant; Rai analysis does not extend the parent session. Rai keeps delegated credentials outside its model adapter.

## Not Yet Available to Users

The Connect button, consent page, callback/state validation and Rai browser session are not wired. Production `/api/rai/chat` continues to reject requests until that work is complete. Local demo mode continues to exclude live RxLedger data. A successful configuration check is not proof of a live connection.

## Next Implementation

1. Build Connect/Disconnect in Rai and a consent page within signed-in RxLedger. Show the exact workspace, branches and read-only capabilities; support denial without issuing a code. Never auto-approve from URL parameters.
2. Store the random state and PKCE verifier in a short-lived, single-use server-side Rai login transaction bound to the initiating browser. Use an allowlisted callback. Compare state before exchange and prevent callback replay/login CSRF.
3. Exchange the code server-to-server, validate inspected identity and store the grant encrypted in Rai-owned session storage. Put only a random opaque session ID in a Secure/HttpOnly cookie. Enforce same-origin/CSRF controls, session expiry and revocation; never place tokens in localStorage or URLs.
4. Resolve every chat's context from that session and current grant inspection. Support only consented branch selection. Revoke the grant and remove the Rai session on disconnect. An outage must fail closed, never fall back to a demo identity for a previously signed-in user.
5. Apply and test the additive `migrations/rai-delegation.sql` in an isolated RxLedger database first. Check concurrent exchanges, rollback, persistence across instances and expired-record cleanup. Use Rai's own database for its browser sessions, not RxLedger's connection string.
6. Add distributed rate limits and privacy-safe audit events, then browser tests for approve/deny, wrong state, replay, wrong tenant/branch, role changes, logout, expiry, disconnect and upstream outage.
7. Enable a controlled preview only after these gates pass. Keep production disabled until the complete flow is verified.

## RxLedger Configuration

- `RAI_DELEGATION_ENABLED=false` by default. Do not turn on yet.
- `RAI_REDIRECT_URI`: one exact HTTPS Rai callback URL, without query or fragment. This route still needs implementation; do not configure a guessed URL as a working connection.
- `RXLEDGER_APP_ORIGIN`: exact HTTPS origin serving RxLedger's consent page.
- `RXLEDGER_RAI_API_KEY`: existing private server-to-server credential, kept only on servers.

No production secrets, flags or database schema were changed during this implementation. Publishing source is not enabling the integration. Unit tests use an in-memory test store; real PostgreSQL migration/integration testing is still required.

## Ollama Track

Ollama installation remains incomplete. The last machine check found approximately 3.8 GB RAM, no Ollama executable and no response on port 11434. Install from the official distribution, then benchmark a hardware-appropriate model on synthetic questions before allowing operational data. No automatic cloud-model fallback. A Vercel function cannot use this desktop's localhost as its inference server.
