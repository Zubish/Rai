// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  getGeminiModel,
  getOpenAiModel,
  getRaiAiProvider,
  isGeminiConfigured,
  isOpenAiConfigured
} from "./env";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;
const originalDisableOpenAi = process.env.RAI_DISABLE_OPENAI;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalProvider = process.env.RAI_AI_PROVIDER;

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
  restoreEnv("OPENAI_MODEL", originalModel);
  restoreEnv("RAI_DISABLE_OPENAI", originalDisableOpenAi);
  restoreEnv("GEMINI_API_KEY", originalGeminiKey);
  restoreEnv("GEMINI_MODEL", originalGeminiModel);
  restoreEnv("RAI_AI_PROVIDER", originalProvider);
});

describe("Rai environment", () => {
  it("detects whether OpenAI is configured without exposing the key", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.RAI_DISABLE_OPENAI = "";

    expect(isOpenAiConfigured()).toBe(true);
  });

  it("can disable OpenAI orchestration for tests and local fallback checks", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.RAI_DISABLE_OPENAI = "true";

    expect(isOpenAiConfigured()).toBe(false);
  });

  it("uses an overridable model default", () => {
    delete process.env.OPENAI_MODEL;
    expect(getOpenAiModel()).toBe("gpt-5.4-mini");

    process.env.OPENAI_MODEL = "custom-model";
    expect(getOpenAiModel()).toBe("custom-model");
  });

  it("detects Gemini configuration and provider selection", () => {
    process.env.RAI_AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    expect(isGeminiConfigured()).toBe(true);
    expect(getRaiAiProvider()).toBe("gemini");
  });

  it("uses an overridable Gemini model default", () => {
    delete process.env.GEMINI_MODEL;
    expect(getGeminiModel()).toBe("gemini-2.5-flash");

    process.env.GEMINI_MODEL = "custom-gemini";
    expect(getGeminiModel()).toBe("custom-gemini");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
