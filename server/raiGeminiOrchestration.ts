import type { RaiAnalyticsDataSource } from "../src/lib/analyticsEngine.js";
import { getGeminiModel } from "./env.js";
import type { RaiChatResponse } from "./raiChatService.js";
import { executeRaiTool, type RaiToolCallArgs } from "./raiToolRegistry.js";

type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: {
          name?: string;
          args?: Record<string, unknown>;
        };
      }>;
    };
  }>;
};

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";

const raiGeminiTools: GeminiFunctionDeclaration[] = [
  tool("get_unique_patients_on_medication", "Count unique patients on a named medication."),
  tool("get_medication_sales_quantity", "Calculate how many units of a named medication were sold or dispensed."),
  tool("get_medication_category_usage", "Summarize medication category usage, revenue, and gross profit."),
  tool("get_sales_profit_summary", "Rank medicines by sales, gross profit, and margin."),
  tool("get_reorder_forecast", "Calculate reorder quantity from demand, stock, owed quantity, and safety buffer."),
  tool("get_stockout_risk", "Rank medicines by likely stockout risk."),
  tool("get_expiry_risk", "Identify medicines with expiry exposure."),
  tool("get_slow_moving_stock", "Identify products tying down cash through weak movement."),
  tool("build_restock_budget_plan", "Allocate a fixed restock budget to protect availability and profit."),
  tool("forecast_category_demand", "Forecast medicine category demand over a planning window."),
  tool("find_profit_maximization_levers", "Find practical profit improvement actions."),
  tool("find_cash_tied_in_inventory", "Find cash tied down in inventory."),
  tool("summarize_business_health", "Summarize owner-level pharmacy business health."),
  tool(
    "answer_rxledger_question",
    "Route a broad RxLedger question when no specialized approved tool can answer safely; returns missing data/API requirements instead of guessing."
  )
];

export async function runGeminiToolOrchestration(
  message: string,
  dataSource?: RaiAnalyticsDataSource
): Promise<RaiChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = getGeminiModel();
  const toolSelection = await callGemini(apiKey, model, {
    systemInstruction: {
      parts: [
        {
          text: [
            "You are Rai, a pharmacy business intelligence orchestrator.",
            "Choose exactly one approved function for the user's pharmacy analytics question.",
            "Prefer the most specific function. Use answer_rxledger_question only when no specialized function can answer safely.",
            "Never invent pharmacy metrics. The function result is the source of truth.",
            "Do not mutate stock, price, patient, dispensing, or RxLedger data."
          ].join(" ")
        }
      ]
    },
    contents: [{ role: "user", parts: [{ text: message }] }],
    tools: [{ functionDeclarations: raiGeminiTools }]
  });

  const functionCall = extractFunctionCall(toolSelection);
  if (!functionCall) {
    throw new Error("Gemini did not select a Rai tool.");
  }

  const report = await executeRaiTool(
    functionCall.name,
    {
      ...functionCall.arguments,
      question: functionCall.arguments.question || message
    },
    dataSource
  );
  const finalResponse = await callGemini(apiKey, model, {
    systemInstruction: {
      parts: [
        {
          text: [
            "Write a concise Rai answer for the user.",
            "Use only the provided tool output and preserve all numbers exactly.",
            "If the tool output says required RxLedger data is missing, explain the missing data instead of pretending to answer numerically.",
            "Mention the practical recommendation and the most important assumption.",
            "Do not add facts that are not present in the tool result."
          ].join(" ")
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              userQuestion: message,
              toolOutput: report
            })
          }
        ]
      }
    ]
  });

  return {
    assistantText: extractText(finalResponse) || report.directAnswer,
    report: {
      ...report,
      agentTrace: ["Gemini selected an approved Rai tool.", ...(report.agentTrace ?? [])]
    },
    orchestrationMode: "gemini_tools",
    model,
    toolCalls: [
      {
        name: functionCall.name,
        arguments: functionCall.arguments
      }
    ]
  };
}

async function callGemini(apiKey: string, model: string, body: unknown): Promise<GeminiResponse> {
  const response = await fetch(`${geminiEndpoint}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}`);
  }

  return (await response.json()) as GeminiResponse;
}

function extractFunctionCall(response: GeminiResponse): { name: string; arguments: RaiToolCallArgs } | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const call = parts.find((part) => part.functionCall)?.functionCall;
  if (!call?.name) {
    return null;
  }

  return {
    name: call.name,
    arguments: sanitizeArgs(call.args)
  };
}

function extractText(response: GeminiResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n").trim() ?? "";
}

function sanitizeArgs(args: Record<string, unknown> | undefined): RaiToolCallArgs {
  if (!args) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(args).filter(([, value]) =>
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    )
  ) as RaiToolCallArgs;
}

function tool(name: string, description: string): GeminiFunctionDeclaration {
  return {
    name,
    description,
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The user's original pharmacy business question."
        },
        medicationQuery: {
          type: "string",
          description: "Medication name and strength if the question is about a specific medicine."
        },
        category: {
          type: "string",
          description: "Medication or business category, such as antihypertensive."
        },
        budgetNaira: {
          type: "number",
          description: "Available restock budget in Nigerian naira."
        },
        forecastMonths: {
          type: "number",
          description: "Forecast horizon in months where relevant."
        },
        horizonDays: {
          type: "number",
          description: "Forecast horizon in days where relevant."
        }
      }
    }
  };
}
