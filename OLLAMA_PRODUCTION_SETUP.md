# Production Ollama Readiness

## Current Status

Local Ollama is installed. No private hosted inference server has been provisioned.
Vercel cannot reach this computer's loopback address. Database readiness does not
mean AI inference or the signed-in RxLedger connection is ready.

## Deployment Boundary

Rai browser -> authenticated Rai API -> private HTTPS inference gateway -> Ollama.

The gateway must validate Rai's server-only bearer credential, limit requests and
body size, terminate trusted TLS, and forward only the required Ollama routes.
Do not publish Ollama's raw port 11434. Do not proxy arbitrary destinations or
allow model-management operations such as pull, create or delete from Rai.
Restrict inbound access, protect administration separately, and exclude prompts,
patient information and bearer credentials from gateway logs. Disable cloud
features on the Ollama host. Operating a server can incur infrastructure costs;
local model weights do not make hosted compute free.

## Server Configuration

- `OLLAMA_BASE_URL`: approved HTTPS origin, without credentials, query or fragment.
- `OLLAMA_API_KEY`: gateway bearer credential, stored only on Rai's server.
- `OLLAMA_MODEL`: an explicitly installed model suitable for the available hardware.

The adapter authenticates both `/api/tags` and `/api/chat`, refuses redirects,
sanitizes upstream errors, and rejects loopback inference in production. Never
use `VITE_` prefixes for credentials. No automatic cloud-model fallback is used.

## Verification Before Live Data

1. Benchmark the exact model using synthetic pharmacy questions. Validate branch
   scope, greetings, clarification, unsupported clinical requests, missing data,
   numerical accuracy and honest uncertainty. Keep calculations deterministic.
2. Verify TLS, rejected invalid credentials, denied redirects, model availability,
   timeout behavior and failure without leaking secrets.
3. Exercise RxLedger consent in an isolated signed-in browser: approve, deny,
   wrong state, replay, expiry, branch scope changes, logout and disconnect.
4. Verify one read-only analytics request against known results. Do not approve
   the desktop's current 0.5B test model for real pharmacy data based on a successful
   HTTP response; it previously failed a synthetic calculation.
5. Enable live access only after these checks pass. Retain a tested disable path.

The current rendered-UI and server tests are not a completed signed-in browser
flow against production. Private hosting and final browser verification remain
outstanding. A local pilot is an alternative if infrastructure cost is prohibitive.
