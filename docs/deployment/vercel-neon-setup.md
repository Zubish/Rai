# Rai Vercel and Neon Setup

## Production Project

- GitHub repository: `Zubish/Rai`
- Vercel project: `rai`
- Vercel project id: `prj_6CLDg2MLKQL8274C9ZZYVFif1zBU`
- Vercel team id: `team_lLwXKlVi0D5SiGjgEEfJzeb5`
- Production domain: `https://rai-mu.vercel.app`

## Neon Project

- Neon project id: `wandering-frost-68820655`
- Database: `neondb`
- Main branch id: `br-withered-field-a6jic5oj`

The schema has been created for:

- `rai_chat_sessions`
- `rai_chat_messages`
- `rai_library_items`
- `rai_audit_events`

## Required Vercel Environment Variables

Add these in Vercel Project Settings > Environment Variables for Production, Preview, and Development:

- `POSTGRES_URL`: Neon pooled connection string.
- `RAI_AI_PROVIDER`: AI provider for Rai orchestration. Use `openai`, `gemini`, or `deterministic`.
- `OPENAI_API_KEY`: OpenAI API key for Rai tool orchestration.
- `OPENAI_MODEL`: Optional; defaults to `gpt-5.4-mini`.
- `GEMINI_API_KEY`: Google Gemini API key for Rai tool orchestration.
- `GEMINI_MODEL`: Optional; defaults to `gemini-2.5-flash`.
- `RXLEDGER_API_BASE_URL`: Base URL for the approved RxLedger API.
- `RXLEDGER_API_KEY`: Read-only API token issued by RxLedger for Rai.
- `RXLEDGER_ANALYTICS_SNAPSHOT_PATH`: Optional; defaults to `/api/rai/analytics-snapshot`.
- `RXLEDGER_TENANT_ID`: Tenant/workspace id Rai should request from RxLedger.
- `RXLEDGER_BRANCH_IDS`: Comma-separated branch ids, for example `main,branch-2`.

`DATABASE_URL` may also be set as a fallback alias for `POSTGRES_URL`.

To use Gemini as Rai's reasoning layer, set `RAI_AI_PROVIDER=gemini` and add `GEMINI_API_KEY`.
Keep Gemini and OpenAI keys server-side only in Vercel; never commit them or expose them to the browser.
Rai still uses deterministic tools and RxLedger snapshots as the source of truth, so the AI provider only selects tools and writes the final explanation.

## Verification

After environment variables are added and the project is redeployed:

```bash
curl https://rai-mu.vercel.app/api/rai/health
```

Expected:

```json
{
  "ok": true,
  "service": "rai-api",
  "aiProvider": "gemini",
  "openaiConfigured": true,
  "geminiConfigured": true,
  "databaseConfigured": true,
  "rxledgerConfigured": true
}
```

Then send a chat request and confirm a row appears in `rai_chat_sessions` and two rows appear in `rai_chat_messages`.
