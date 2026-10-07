# Local Ollama Setup

Rai uses Ollama only through its server-side provider adapter. The browser never receives an Ollama URL, model credential, or RxLedger credential.

## 1. Install and start Ollama

Install Ollama from its official website, then open PowerShell and run:

```powershell
ollama pull llama3.2
ollama serve
```

`ollama serve` is unnecessary when the desktop application is already running its local API.

## 2. Configure Rai

Create `.env.local` from `.env.example` and select the installed model:

```text
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

Start Rai with:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

## 3. Confirm the connection

Open `http://127.0.0.1:4173/api/rai/health`.

A working local model returns `reachable: true` and `modelAvailable: true`. If either value is `false`, Rai will still handle greetings but will refuse to fabricate an analytics answer.

## Production Note

Ollama is a local-development and private-hosting provider. A Vercel deployment cannot reach `127.0.0.1` on this computer. Production must use a privately hosted Ollama service on the same network/VPC, or a separate approved cloud provider adapter.
