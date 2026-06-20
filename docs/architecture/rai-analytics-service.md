# Rai Analytics Service

Rai keeps conversational orchestration in the existing TypeScript API. Advanced numerical work runs in an isolated FastAPI service using Pandas and NumPy.

## Local setup

```powershell
cd analytics-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[test]"
cd ..
npm run analytics:dev
```

Start Rai in a second terminal with the analytics URL available to the API process:

```powershell
$env:RAI_ANALYTICS_SERVICE_URL="http://127.0.0.1:8790"
npm run dev
```

Use the same random secret in `RAI_ANALYTICS_SERVICE_API_KEY` for both processes when testing service authentication.

## Boundary

- The service accepts aggregate dated quantities only.
- It has no RxLedger or Neon credentials.
- It validates input size, dates, ranges, and response structure.
- Rai falls back to its deterministic TypeScript baseline when the service is absent or has insufficient history.
- Forecast output includes method, warnings, observation count, and backtest mean absolute error.

The first model is a transparent linear-trend baseline. Prophet or another seasonal model should only be added after the evaluation set contains enough branch-level history to prove it improves forecast error.
