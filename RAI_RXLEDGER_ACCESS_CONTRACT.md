# Rai and RxLedger Access Contract v1

RxLedger remains the source of truth. Rai receives approved, read-only snapshots through `POST /api/rai/analytics-snapshot`; it never connects to Neon or receives a database connection string.

## Identity and Scope

Every request must carry a server-verified tenant, active RxLedger user, explicit branch IDs, date range, and requested capability. RxLedger resolves the user's current role from its own workspace and rejects unauthorized capabilities or branches, including expired assignments. Only the primary admin has automatic access to all active branches. Managed branches remain scoped assignments.

The browser must not create these claims. Production Rai chat is currently fail-closed (401) until the SSO launch handoff is implemented. Local development uses a fixed demo identity that cannot call RxLedger, even when service credentials are present. Caller-supplied dataContext, role, user and tenant headers cannot establish trusted data or identity.

The snapshot endpoint currently requires both the service credential and a valid user session validated against RxLedger's session store, with the actor ID matching the session user. This is a server-to-server scaffold only; do not copy the RxLedger browser session into Rai's browser or expose it to models. Before live rollout, replace this bridge with a dedicated, short-lived delegated session with audience Rai and revocation checks.

## Approved Capabilities

| Capability | Rai may receive | Roles |
| --- | --- | --- |
| `inventory_analytics` | Product/medicine stock, usage, reorder inputs, expiry risk, slow-moving inputs | Admin, pharmacist, inventory |
| `sales_analytics` | Aggregated sales/transaction inputs by permitted branch and date | Admin, pharmacist |
| `financial_analytics` | Cost, selling price, stock value, gross-profit inputs | Admin only |
| `continuity_analytics` | Aggregated dispense-line and pending-demand counts only | Admin, pharmacist |

## Never Shared with Rai or Models

- RxLedger Neon/Postgres credentials, browser cookies, passwords, API secrets, audit logs, or raw write endpoints in model context or browser responses. Server credentials remain exclusively on servers.
- Patient names, phone numbers, addresses, clinical notes, or direct identifiers.
- Unscoped company-wide data for a branch-limited user.
- Any write capability: sales, stock, pricing, dispensing, patient, or financial changes.

## Data Minimisation

Return only fields belonging to the requested capabilities, even for admins. Financial fields are omitted for requests without financial capability; zero must never mean restricted or missing. Patient-level rows and patient hashes remain inside RxLedger. Current continuity counts represent dispense lines, not unique patients or prescriptions.

Rai checks the response tenant, branch, date range, source and capability set against its request before accepting it. Conversations are scoped by user, tenant, branch and role. The current memory store is temporary development storage; persistent per-user storage belongs in Rai's existing Neon database, not RxLedger's database.

## Metrics and Limits

- Require exact branch IDs; never interpret missing branches, `all`, or `main` as blanket authorization. Resolve natural-language branch names against an authorized branch directory first.
- Require valid calendar dates, start not after end, and a maximum 366-day inclusive range. Current timezone is Africa/Lagos.
- Stock quantities must include the unit and distinguish expired, available and reserved stock. Current stock is a present snapshot, not historical stock at the requested end date.
- Revenue needs actual transaction amounts, discounts and returns. Current catalog selling prices cannot reconstruct historical revenue. Realised gross profit requires historical cost of goods.
- Patient counts require a stable internal patient identity and explicit handling of anonymous visits. A hash of customer name/phone is insufficient evidence of unique patients.
- Reorder quantities require recorded lead time and safety stock; do not silently substitute a fixed seven days. Forecasts must identify method, window, assumptions and uncertainty.
- Current client reduction supports inventory risk only. Sales/profit reports, arbitrary date parsing, branch discovery and export endpoints remain pending. Do not advertise these as completed just because the role matrix reserves their capabilities.
- Add cursor pagination, bounded response size, privacy-safe audit events and retention policy before production volume. Proposed Rai snapshot-cache lifetime: five minutes; model processing should use aggregates only.

## Sign-in and Connection Flow (Next Implementation)

1. User selects Connect RxLedger in Rai, or opens Rai from their RxLedger workspace.
2. RxLedger uses its own signed-in session and displays the requested read permissions and branch scope. User passwords never pass through Rai.
3. Exchange a single-use authorization code server-to-server, with state, PKCE, allowlisted redirect URI and short expiry. Do not put session tokens in URLs.
4. Rai establishes a Secure, HttpOnly session. RxLedger rechecks current membership, role and branch assignments on each data request.
5. Disconnect, suspension, logout or permission expiry revokes delegated access. No automatic cloud-model fallback may transmit data without an explicit provider policy.

## Verification and Release Status

Local policy and client tests exercise capability and branch restrictions, expired assignments, spoofed headers, injected metric context and conversation isolation. No live connection, SSO deployment, production environment changes or provider data transfer has been performed for this slice.

## Failure Rules

RxLedger returns `401` for missing service/user authentication, `403` for role or branch violations, `400` for malformed filters and `404` for an unknown workspace. Rai rejects mismatched snapshots. The language-model explanation still needs factuality evaluation; prompt instructions alone do not guarantee numerical correctness.
