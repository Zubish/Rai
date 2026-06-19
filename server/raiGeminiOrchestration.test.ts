// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;
const originalProvider = process.env.RAI_AI_PROVIDER;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalOpenAiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.RAI_AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_MODEL = "gemini-2.5-flash";
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("RAI_AI_PROVIDER", originalProvider);
  restoreEnv("GEMINI_API_KEY", originalGeminiKey);
  restoreEnv("GEMINI_MODEL", originalGeminiModel);
  restoreEnv("OPENAI_API_KEY", originalOpenAiKey);
  vi.restoreAllMocks();
});

describe("Rai Gemini orchestration", () => {
  it("uses Gemini function calling while keeping Rai analytics as source of truth", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "get_medication_sales_quantity",
                      args: {
                        question: "from lagos branch how many aprovel was sold yesterday",
                        medicationQuery: "Aprovel"
                      }
                    }
                  }
                ]
              }
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: "Rai found 0 tablets sold for the Lagos branch scope." }]
              }
            }
          ]
        })
      } as Response);

    const { runRaiChat } = await import("./raiChatService");
    const response = await runRaiChat({
      message: "from lagos branch how many aprovel was sold yesterday"
    });

    expect(response.orchestrationMode).toBe("gemini_tools");
    expect(response.assistantText).toBe("Rai found 0 tablets sold for the Lagos branch scope.");
    expect(response.report.toolName).toBe("get_medication_sales_quantity");
    expect(response.report.assumptions).toContain("Branch scope: lagos.");
    expect(response.toolCalls[0]).toMatchObject({
      name: "get_medication_sales_quantity"
    });
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
