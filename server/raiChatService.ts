import OpenAI from "openai";
import { runRaiAnalytics, type RaiAnalyticsDataSource } from "../src/lib/analyticsEngine.js";
import { classifyRaiConversation, createRaiConversationReport } from "../src/lib/raiConversation.js";
import { parseRaiQuestion } from "../src/lib/intentParser.js";
import type { RaiReport } from "../src/lib/types.js";
import {
  getOpenAiModel,
  getRaiAiProvider,
  isGeminiConfigured,
  isOpenAiConfigured,
  loadRaiEnvironment
} from "./env.js";
import { runGeminiToolOrchestration } from "./raiGeminiOrchestration.js";
import { executeRaiTool, raiOpenAiTools, type RaiToolCallArgs } from "./raiToolRegistry.js";
import { getRxLedgerAnalyticsDataSource } from "./rxledgerApiConnector.js";

export type RaiChatRequest = {
  message: string;
  sessionId?: string;
  tenantId?: string;
  branchIds?: string[];
};

export type RaiChatResponse = {
  sessionId?: string;
  assistantText: string;
  report: RaiReport;
  orchestrationMode: "openai_tools" | "gemini_tools" | "deterministic_fallback" | "conversation";
  model?: string;
  toolCalls: Array<{ name: string; arguments: RaiToolCallArgs }>;
};

export async function runRaiChat(request: RaiChatRequest): Promise<RaiChatResponse> {
  loadRaiEnvironment();
  const message = request.message.trim();
  if (!message) {
    return deterministicResponse("Ask Rai a business, inventory, forecasting, or profit question.");
  }

  const conversation = classifyRaiConversation(message);
  if (conversation.kind !== "analytics") {
    return conversationResponse(conversation);
  }

  const { dataSource, warning } = await getLiveDataSource(request);
  const provider = getRaiAiProvider();

  if (provider === "deterministic") {
    return deterministicResponse(message, dataSource, warning);
  }

  try {
    const response =
      provider === "gemini"
        ? await runGeminiResponse(message, dataSource)
        : await runOpenAiResponse(message, dataSource);
    return warning ? appendWarning(response, warning) : response;
  } catch (error) {
    const fallback = await deterministicResponse(message, dataSource, warning);
    return {
      ...fallback,
      report: {
        ...fallback.report,
        warnings: [
          ...fallback.report.warnings,
          `${provider === "gemini" ? "Gemini" : "OpenAI"} orchestration was unavailable, so Rai used deterministic local analytics.`
        ]
      }
    };
  }
}

function conversationResponse(conversation: ReturnType<typeof classifyRaiConversation>): RaiChatResponse {
  const report = createRaiConversationReport(conversation);

  return {
    assistantText: report.directAnswer,
    report,
    orchestrationMode: "conversation",
    toolCalls: []
  };
}

async function runGeminiResponse(
  message: string,
  dataSource?: RaiAnalyticsDataSource
): Promise<RaiChatResponse> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini is not configured.");
  }

  return runGeminiToolOrchestration(message, dataSource);
}

async function runOpenAiResponse(
  message: string,
  dataSource?: RaiAnalyticsDataSource
): Promise<RaiChatResponse> {
  if (!isOpenAiConfigured()) {
    throw new Error("OpenAI is not configured.");
  }

  return runOpenAiToolOrchestration(message, dataSource);
}

async function runOpenAiToolOrchestration(
  message: string,
  dataSource?: RaiAnalyticsDataSource
): Promise<RaiChatResponse> {
  const client = new OpenAI();
  const model = getOpenAiModel();
  const firstResponse = await client.responses.create({
    model,
    instructions: [
      "You are Rai, a pharmacy business intelligence orchestrator.",
      "You must answer business and pharmacy analytics questions by calling exactly one approved tool.",
      "Prefer the most specific approved tool. Use answer_rxledger_question only when no specialized tool can answer safely.",
      "Never invent business metrics. Tool outputs are the source of truth.",
      "Do not mutate pharmacy, stock, price, patient, or RxLedger data.",
      "When the question is unsupported or unsafe, choose the closest read-only analytics tool only if it can answer safely."
    ].join(" "),
    input: message,
    tools: raiOpenAiTools
  } as never);

  const toolCalls = extractFunctionCalls(firstResponse);
  if (toolCalls.length === 0) {
    return deterministicResponse(message);
  }

  const executedTools = await Promise.all(
    toolCalls.map(async (toolCall) => ({
      ...toolCall,
      report: await executeRaiTool(toolCall.name, {
        ...toolCall.arguments,
        question: toolCall.arguments.question || message
      }, dataSource)
    }))
  );
  const sourceReport = executedTools[0].report;
  const secondInput = [
    { role: "user", content: message },
    ...toolCalls.map((toolCall) => toolCall.raw),
    ...executedTools.map((toolCall) => ({
      type: "function_call_output",
      call_id: toolCall.callId,
      output: JSON.stringify(toolCall.report)
    }))
  ];

  const finalResponse = await client.responses.create({
    model,
    instructions: [
      "Write a concise Rai answer for the user.",
      "Use only the tool output. Preserve the key numbers exactly.",
      "If the tool output says required RxLedger data is missing, explain the missing data instead of pretending to answer numerically.",
      "Mention the practical recommendation and the most important assumption.",
      "Do not add facts that are not present in the tool result."
    ].join(" "),
    input: secondInput
  } as never);

  return {
    assistantText: finalResponse.output_text || sourceReport.directAnswer,
    report: {
      ...sourceReport,
      agentTrace: [
        "OpenAI Responses API selected an approved Rai tool.",
        ...(sourceReport.agentTrace ?? [])
      ]
    },
    orchestrationMode: "openai_tools",
    model,
    toolCalls: executedTools.map((toolCall) => ({
      name: toolCall.name,
      arguments: toolCall.arguments
    }))
  };
}

async function deterministicResponse(
  message: string,
  dataSource?: RaiAnalyticsDataSource,
  warning?: string
): Promise<RaiChatResponse> {
  const report = await runRaiAnalytics(parseRaiQuestion(message), dataSource);

  return {
    assistantText: report.directAnswer,
    report: warning ? { ...report, warnings: [...report.warnings, warning] } : report,
    orchestrationMode: "deterministic_fallback",
    toolCalls: []
  };
}

async function getLiveDataSource(request: RaiChatRequest): Promise<{
  dataSource?: RaiAnalyticsDataSource;
  warning?: string;
}> {
  try {
    const dataSource = await getRxLedgerAnalyticsDataSource(request);
    return { dataSource };
  } catch {
    return {
      warning: "Live RxLedger API data was unavailable, so Rai used the approved local analytics fixture."
    };
  }
}

function appendWarning(response: RaiChatResponse, warning: string): RaiChatResponse {
  return {
    ...response,
    report: {
      ...response.report,
      warnings: [...response.report.warnings, warning]
    }
  };
}

function extractFunctionCalls(response: unknown): Array<{
  name: string;
  arguments: RaiToolCallArgs;
  callId: string;
  raw: unknown;
}> {
  const output = Array.isArray((response as { output?: unknown }).output)
    ? ((response as { output: unknown[] }).output)
    : [];

  return output
    .filter((item) => (item as { type?: string }).type === "function_call")
    .map((item) => {
      const functionCall = item as {
        call_id?: string;
        name?: string;
        arguments?: string;
      };

      return {
        name: functionCall.name ?? "unknown",
        arguments: parseArguments(functionCall.arguments),
        callId: functionCall.call_id ?? "",
        raw: item
      };
    })
    .filter((item) => item.callId && item.name !== "unknown");
}

function parseArguments(serializedArguments: string | undefined): RaiToolCallArgs {
  if (!serializedArguments) {
    return {};
  }

  try {
    const parsed = JSON.parse(serializedArguments) as RaiToolCallArgs;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== null && value !== undefined)
    ) as RaiToolCallArgs;
  } catch {
    return {};
  }
}
