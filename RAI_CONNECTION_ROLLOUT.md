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

## Implemented, Not Activated

Connect/Disconnect, signed-in RxLedger consent, callback/state validation, encrypted database-backed Rai sessions and scoped branch selection are implemented. Production remains disabled pending real database and browser verification. Local demo mode excludes live RxLedger data. A successful configuration check is not proof of a live connection.

Rai requires its own `DATABASE_URL` or `POSTGRES_URL`, `RAI_APP_ORIGIN=https://rai-mu.vercel.app`, a server-only base64 32-byte `RAI_SESSION_ENCRYPTION_KEY`, `RXLEDGER_BASE_URL=https://rxledger.vercel.app`, and the matching server-to-server credential. Apply `migrations/rai-connection-sessions.sql` to Rai's database only after isolated testing. Set `RAI_CONNECTION_ENABLED=true` only after verification.

The implemented callback is `https://rai-mu.vercel.app/api/rai/callback`. Configure RxLedger's `RAI_REDIRECT_URI` to this exact address. No refresh tokens are issued; reconnect after the 15-minute access expires.

## Rollout Gates

Steps 1-4 below are implemented in source. Complete signed-in browser verification, audit-event coverage and production activation remain outstanding. Rai session tests cover encrypted storage, state/browser binding, replay, denial, expiry, branch restrictions, live permission changes, tenant mismatch, revocation and upstream failure. PostgreSQL testing on an isolated branch verifies persistence, concurrent single-use consumption and distributed rate limiting. These tests do not replace signed-in browser testing.

1. Build Connect/Disconnect in Rai and a consent page within signed-in RxLedger. Show the exact workspace, branches and read-only capabilities; support denial without issuing a code. Never auto-approve from URL parameters.
2. Store the random state and PKCE verifier in a short-lived, single-use server-side Rai login transaction bound to the initiating browser. Use an allowlisted callback. Compare state before exchange and prevent callback replay/login CSRF.
3. Exchange the code server-to-server, validate inspected identity and store the grant encrypted in Rai-owned session storage. Put only a random opaque session ID in a Secure/HttpOnly cookie. Enforce same-origin/CSRF controls, session expiry and revocation; never place tokens in localStorage or URLs.
4. Resolve every chat's context from that session and current grant inspection. Support only consented branch selection. Revoke the grant and remove the Rai session on disconnect. An outage must fail closed, never fall back to a demo identity for a previously signed-in user.
5. Apply and test the additive `migrations/rai-delegation.sql` in an isolated RxLedger database first. Check concurrent exchanges, rollback, persistence across instances and expired-record cleanup. Use Rai's own database for its browser sessions, not RxLedger's connection string.
6. Add distributed rate limits and privacy-safe audit events, then browser tests for approve/deny, wrong state, replay, wrong tenant/branch, role changes, logout, expiry, disconnect and upstream outage.
7. Enable a controlled preview only after these gates pass. Keep production disabled until the complete flow is verified.

## RxLedger Configuration

- `RAI_DELEGATION_ENABLED=false` by default. Do not turn on yet.
- `RAI_REDIRECT_URI`: `https://rai-mu.vercel.app/api/rai/callback`, without query or fragment.
- `RXLEDGER_APP_ORIGIN`: exact HTTPS origin serving RxLedger's consent page.
- `RXLEDGER_RAI_API_KEY`: existing private server-to-server credential, kept only on servers.

On 2026-10-08, both additive migrations passed on isolated Neon branches and were applied to the user-designated production branches. Production database URLs, a coordinated private service key and Rai's session encryption key were configured in Vercel. Origin and callback configuration is also present. Neither enable flag has been turned on. Publishing source is not enabling the integration.

| App | Neon project | Production branch | Isolated verification branch |
| --- | --- | --- | --- |
| Rai | wandering-frost-68820655 | br-withered-field-a6jic5oj | br-curly-king-a6tnh3y6 |
| RxLedger | crimson-hill-05547844 | br-summer-rice-appce56c | br-mute-lake-api6re1x |

Verification branches contain synthetic test records and remain separate from production. Secret files are ignored by Git. No pharmacy operational records were modified.

## Ollama Track

Ollama 0.40.1 is installed on this desktop as a standalone CPU runtime at `%LOCALAPPDATA%\Programs\OllamaCPU`. Files came from the official Windows archive; ZIP integrity checks passed and the CLI's Authenticode signature was valid for Ollama Inc. The service has been verified on `127.0.0.1:11434` with cloud features disabled.

This desktop has approximately 3.8 GB RAM. Local Rai configuration selects `qwen2.5:0.5b`; download digest verification and non-greeting API/browser inference succeeded. The model failed a basic synthetic stock-duration calculation and is not approved for production analytics. `npm run dev` includes automatic local Windows runtime startup, but its cold-start path remains unverified. Development runs one model/request at a time and releases model memory after each response. See `OLLAMA_LOCAL_SETUP.md` for configuration and verification status.

Benchmark using synthetic questions before allowing operational data. No automatic cloud-model fallback. A Vercel function cannot use this desktop's localhost as its inference server.
