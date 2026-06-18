import OpenAI from "openai";
import { runRaiAnalytics } from "../src/lib/analyticsEngine";
import { parseRaiQuestion } from "../src/lib/intentParser";
import type { RaiReport } from "../src/lib/types";
import { getOpenAiModel, isOpenAiConfigured, loadRaiEnvironment } from "./env";
import { executeRaiTool, raiOpenAiTools, type RaiToolCallArgs } from "./raiToolRegistry";

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
  orchestrationMode: "openai_tools" | "deterministic_fallback";
  model?: string;
  toolCalls: Array<{ name: string; arguments: RaiToolCallArgs }>;
};

export async function runRaiChat(request: RaiChatRequest): Promise<RaiChatResponse> {
  loadRaiEnvironment();
  const message = request.message.trim();
  if (!message) {
    return deterministicResponse("Ask Rai a business, inventory, forecasting, or profit question.");
  }

  if (!isOpenAiConfigured()) {
    return deterministicResponse(message);
  }

  try {
    return await runOpenAiToolOrchestration(message);
  } catch (error) {
    const fallback = await deterministicResponse(message);
    return {
      ...fallback,
      report: {
        ...fallback.report,
        warnings: [
          ...fallback.report.warnings,
          "OpenAI orchestration was unavailable, so Rai used deterministic local analytics."
        ]
      }
    };
  }
}

async function runOpenAiToolOrchestration(message: string): Promise<RaiChatResponse> {
  const client = new OpenAI();
  const model = getOpenAiModel();
  const firstResponse = await client.responses.create({
    model,
    instructions: [
      "You are Rai, a pharmacy business intelligence orchestrator.",
      "You must answer business and pharmacy analytics questions by calling exactly one approved tool.",
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
      })
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

async function deterministicResponse(message: string): Promise<RaiChatResponse> {
  const report = await runRaiAnalytics(parseRaiQuestion(message));

  return {
    assistantText: report.directAnswer,
    report,
    orchestrationMode: "deterministic_fallback",
    toolCalls: []
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
