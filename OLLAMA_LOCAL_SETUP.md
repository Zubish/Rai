# Local Ollama Setup

## Runtime

- Installed: official Ollama 0.40.1 standalone Windows CLI, CPU libraries and included licences.
- Location: `%LOCALAPPDATA%\Programs\OllamaCPU\ollama.exe`.
- Integrity: selected archive members passed ZIP CRC checks; `ollama.exe` has a valid Authenticode signature from Ollama Inc. The full GPU-containing archive was not downloaded, so no full-archive SHA verification is claimed.
- Verified: `GET http://127.0.0.1:11434/api/version` returned version `0.40.1`.
- Local configuration: cloud features disabled, bound to loopback, one model and one parallel request, 2048-token context and immediate model unload after responses.
- Hardware: approximately 3.8 GB system RAM; performance must be measured on this desktop.

## Rai

The ignored `.env.local` selects `qwen2.5:0.5b` and `http://127.0.0.1:11434`. The model downloaded successfully and Ollama verified its SHA-256 digest. Both health flags are true. A non-greeting request successfully travelled through Rai's API to Ollama and appeared in the browser chat; one API request took approximately 34 seconds. No browser errors were observed.

This is connection verification, not a production accuracy endorsement. A synthetic test asking how long 30 units last at 5 units/day failed: the model answered with 25 units rather than six days. Keep operational arithmetic in deterministic analytics tools, and evaluate a stronger model on suitable hardware before production use. The Windows launcher's already-running-runtime path was exercised; automatic cold-start remains unverified.

Run `npm run dev` from the Rai workspace. On Windows, the launcher checks the local runtime and starts it if installed and unavailable. It starts only a local HTTP runtime, disables cloud features, and stops only processes it created when development shuts down. It does not download models or install software. A separately running Ollama instance remains under its original owner.

Ollama was added to the user's PATH; a newly opened terminal can use `ollama`. Existing terminals can use the full executable path above.

Rai UI: `http://127.0.0.1:5173/`. Health: `http://127.0.0.1:5173/api/rai/health`. For a ready local model, both `provider.reachable` and `provider.modelAvailable` should be true.

## Remaining Boundaries

Local development uses an isolated demo identity and has no live RxLedger access. A greeting uses a deterministic response and does not verify model inference. Non-greeting inference was verified; the synthetic analytical case failed the accuracy check described above.

The deployed Vercel application needs its own approved inference connection; it cannot reach this desktop's localhost. Real RxLedger sign-in, consent and delegated sessions remain separate integration work.
