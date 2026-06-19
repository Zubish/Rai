import { config } from "dotenv";

let loaded = false;

export type RaiAiProvider = "openai" | "gemini" | "deterministic";

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

export function isGeminiConfigured(): boolean {
  loadRaiEnvironment();
  return process.env.RAI_DISABLE_GEMINI !== "true" && Boolean(process.env.GEMINI_API_KEY);
}

export function getRaiAiProvider(): RaiAiProvider {
  loadRaiEnvironment();
  const provider = process.env.RAI_AI_PROVIDER?.trim().toLowerCase();
  if (provider === "openai" || provider === "gemini" || provider === "deterministic") {
    return provider;
  }

  if (isGeminiConfigured() && !isOpenAiConfigured()) {
    return "gemini";
  }

  return "openai";
}

export function getOpenAiModel(): string {
  loadRaiEnvironment();
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}

export function getGeminiModel(): string {
  loadRaiEnvironment();
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}
