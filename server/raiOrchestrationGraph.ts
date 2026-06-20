import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { classifyRaiConversation } from "../src/lib/raiConversation.js";
import type { RaiAnalyticsDataSource } from "../src/lib/analyticsEngine.js";
import type { RaiChatRequest, RaiChatResponse } from "./raiChatService.js";

type ConversationClassification = ReturnType<typeof classifyRaiConversation>;

const RaiGraphState = Annotation.Root({
  request: Annotation<RaiChatRequest>(),
  message: Annotation<string>(),
  classification: Annotation<ConversationClassification>(),
  dataSource: Annotation<RaiAnalyticsDataSource | undefined>(),
  warning: Annotation<string | undefined>(),
  response: Annotation<RaiChatResponse | undefined>(),
  trace: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  })
});

export type RaiOrchestrationDependencies = {
  loadData: (request: RaiChatRequest) => Promise<{
    dataSource?: RaiAnalyticsDataSource;
    warning?: string;
  }>;
  runConversation: (classification: ConversationClassification) => RaiChatResponse;
  runAnalytics: (
    message: string,
    dataSource?: RaiAnalyticsDataSource,
    warning?: string
  ) => Promise<RaiChatResponse>;
};

export function createRaiOrchestrationGraph(dependencies: RaiOrchestrationDependencies) {
  return new StateGraph(RaiGraphState)
    .addNode("classify", (state) => {
      const message = state.request.message.trim();
      const classification = classifyRaiConversation(message);
      return {
        message,
        classification,
        trace: [`classify:${classification.kind}`]
      };
    })
    .addNode("conversation", (state) => ({
      response: dependencies.runConversation(state.classification),
      trace: ["respond:conversation"]
    }))
    .addNode("load_data", async (state) => ({
      ...(await dependencies.loadData(state.request)),
      trace: ["load:approved-data"]
    }))
    .addNode("analytics", async (state) => ({
      response: await dependencies.runAnalytics(state.message, state.dataSource, state.warning),
      trace: ["respond:analytics"]
    }))
    .addEdge(START, "classify")
    .addConditionalEdges(
      "classify",
      (state) => state.classification.kind === "analytics" ? "analytics" : "conversation",
      { analytics: "load_data", conversation: "conversation" }
    )
    .addEdge("load_data", "analytics")
    .addEdge("conversation", END)
    .addEdge("analytics", END)
    .compile();
}
