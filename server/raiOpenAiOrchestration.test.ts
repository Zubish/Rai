// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { responsesCreate } = vi.hoisted(() => ({
  responsesCreate: vi.fn()
}));
const originalApiKey = process.env.OPENAI_API_KEY;
const originalDisable = process.env.RAI_DISABLE_OPENAI;

vi.mock("openai", () => ({
  default: function MockOpenAI() {
    return {
      responses: {
        create: responsesCreate
      }
    };
  }
}));

beforeEach(() => {
  vi.resetModules();
  responsesCreate.mockReset();
  process.env.OPENAI_API_KEY = "test-key";
  process.env.RAI_DISABLE_OPENAI = "";
});

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
  restoreEnv("RAI_DISABLE_OPENAI", originalDisable);
});

describe("Rai OpenAI orchestration", () => {
  it("uses a selected OpenAI tool while keeping Rai analytics as source of truth", async () => {
    responsesCreate
      .mockResolvedValueOnce({
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "build_restock_budget_plan",
            arguments: JSON.stringify({
              question: "I have ₦500,000 budget, what should I buy?",
              budgetNaira: 500000
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        output_text: "Prioritize Amlodipine and protect stock availability."
      });

    const { runRaiChat } = await import("./raiChatService");
    const response = await runRaiChat({
      message: "I have ₦500,000 budget, what should I buy?"
    });

    expect(response.orchestrationMode).toBe("openai_tools");
    expect(response.assistantText).toBe("Prioritize Amlodipine and protect stock availability.");
    expect(response.report.toolName).toBe("build_restock_budget_plan");
    expect(response.toolCalls[0].name).toBe("build_restock_budget_plan");
  });

  it("falls back if OpenAI returns no tool call", async () => {
    responsesCreate.mockResolvedValueOnce({ output: [] });

    const { runRaiChat } = await import("./raiChatService");
    const response = await runRaiChat({
      message: "Where is cash tied down in stock?"
    });

    expect(response.orchestrationMode).toBe("deterministic_fallback");
    expect(response.report.toolName).toBe("find_cash_tied_in_inventory");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
