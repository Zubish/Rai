import { config } from "dotenv";

let loaded = false;

export function loadRaiEnvironment() {
  if (loaded) {
    return;
  }

  config({ path: ".env.local", override: false, quiet: true });
  config({ path: ".env", override: false, quiet: true });
  loaded = true;
}

export function isOpenAiConfigured(): boolean {
  loadRaiEnvironment();
  return process.env.RAI_DISABLE_OPENAI !== "true" && Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAiModel(): string {
  loadRaiEnvironment();
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}
