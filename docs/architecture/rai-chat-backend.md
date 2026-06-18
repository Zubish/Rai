# Rai Chat Backend

Rai now exposes a local chat API at `/api/rai/chat`.

## Endpoint

`POST /api/rai/chat`

Request:

```json
{
  "message": "I have ₦500,000 budget, what should I buy to maximize profit and avoid stockout?"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "assistantText": "With a ₦500,000 budget...",
    "report": {},
    "orchestrationMode": "deterministic_fallback",
    "toolCalls": []
  }
}
```

`GET /api/rai/health` reports whether the backend can see an OpenAI API key.

## Security Boundary

The frontend never imports the OpenAI SDK and never sees `OPENAI_API_KEY`.

The secure path is:

1. React UI sends the message to `/api/rai/chat`.
2. Server decides whether OpenAI tool orchestration is available.
3. If `OPENAI_API_KEY` exists, OpenAI selects an approved Rai tool.
4. Server executes the deterministic Rai tool locally.
5. Server sends the tool output back for concise language generation.
6. UI renders the returned structured `RaiReport`.

If `OPENAI_API_KEY` is missing or orchestration fails, Rai falls back to deterministic local analytics. This keeps beta development testable without pretending the model is configured.

## Environment

Optional local variables:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

The backend reads these from the shell environment, `.env.local`, or `.env`. Real env files are ignored by git. Use `.env.example` as the template for required variable names.

PowerShell one-session setup:

```powershell
$env:OPENAI_API_KEY="your_key_here"
$env:OPENAI_MODEL="gpt-5.4-mini"
npm run dev
```

Local file setup:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
```

The current local endpoint works without these variables, but `orchestrationMode` will be `deterministic_fallback`.

## Approved Tool Source

The OpenAI model may choose a tool, but it does not calculate business metrics itself. The source of truth remains:

- `src/lib/analyticsEngine.ts`
- `server/raiToolRegistry.ts`

Unknown tools are rejected.

## Commands

Use the normal Rai dev server:

```bash
npm run dev
```

The Vite server mounts `/api/rai/chat`.

Use standalone backend mode only when testing the API separately:

```bash
npm run server:dev
```
