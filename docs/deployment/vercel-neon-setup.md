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
- `OPENAI_API_KEY`: OpenAI API key for Rai tool orchestration.
- `OPENAI_MODEL`: Optional; defaults to `gpt-5.4-mini`.
- `RXLEDGER_API_BASE_URL`: Base URL for the approved RxLedger API.
- `RXLEDGER_API_KEY`: Read-only API token issued by RxLedger for Rai.
- `RXLEDGER_ANALYTICS_SNAPSHOT_PATH`: Optional; defaults to `/api/rai/analytics-snapshot`.
- `RXLEDGER_TENANT_ID`: Tenant/workspace id Rai should request from RxLedger.
- `RXLEDGER_BRANCH_IDS`: Comma-separated branch ids, for example `main,branch-2`.

`DATABASE_URL` may also be set as a fallback alias for `POSTGRES_URL`.

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
  "openaiConfigured": true,
  "databaseConfigured": true,
  "rxledgerConfigured": true
}
```

Then send a chat request and confirm a row appears in `rai_chat_sessions` and two rows appear in `rai_chat_messages`.
