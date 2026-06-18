// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { getOpenAiModel, isOpenAiConfigured } from "./env";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;
const originalDisableOpenAi = process.env.RAI_DISABLE_OPENAI;

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
  restoreEnv("OPENAI_MODEL", originalModel);
  restoreEnv("RAI_DISABLE_OPENAI", originalDisableOpenAi);
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
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
