import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "../server/env.mjs";

const processes = [];
const ollamaUrl = new URL(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434");

async function ollamaReady() {
  try {
    const response = await fetch(new URL("/api/version", ollamaUrl), { signal: AbortSignal.timeout(1000) });
    return response.ok && typeof (await response.json()).version === "string";
  } catch { return false; }
}

if (process.platform === "win32" && ollamaUrl.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(ollamaUrl.hostname) && !await ollamaReady()) {
  const binary = ["Ollama", "OllamaCPU"]
    .map(folder => join(process.env.LOCALAPPDATA || "", "Programs", folder, "ollama.exe"))
    .find(existsSync);
  if (binary) {
    const runtime = spawn(binary, ["serve"], {
      windowsHide: true, stdio: "inherit",
      env: { ...process.env, OLLAMA_HOST: ollamaUrl.host, OLLAMA_NO_CLOUD: "1", OLLAMA_MAX_LOADED_MODELS: "1", OLLAMA_NUM_PARALLEL: "1", OLLAMA_CONTEXT_LENGTH: process.env.OLLAMA_CONTEXT_LENGTH || "2048", OLLAMA_KEEP_ALIVE: process.env.OLLAMA_KEEP_ALIVE || "0" }
    });
    processes.push(runtime);
    runtime.on("error", () => console.error("Could not start the installed Ollama runtime."));
    let ready = false;
    for (let attempt = 0; attempt < 16; attempt++) {
      if (await ollamaReady()) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) {
      runtime.kill();
      throw new Error("Ollama did not become ready. Check the runtime logs before starting Rai.");
    }
  } else {
    console.warn("Ollama is not installed. Install it and pull the configured model to enable local chat.");
  }
}

processes.push(
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit", env: process.env }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)], { stdio: "inherit", env: process.env })
);

function shutdown() {
  for (const process of processes) process.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
processes.forEach(process => process.on("exit", code => {
  if (code && code !== 0) process.exitCode = code;
}));
