import "./env.mjs";
import { createOllamaProvider } from "./ollama-provider.mjs";
import { compactAnalyticsContext, createRxLedgerClient } from "./rxledger-client.mjs";
import { planChat } from './chat-plan.mjs';
import { connectionReply, connectionState } from './connection-state.mjs';

const MAX_MESSAGE_LENGTH = 4000;

export function createRaiService({ provider = createOllamaProvider(), rxLedger = createRxLedgerClient(), now = () => new Date() } = {}) {
  const conversations = new Map();

  return {
    async chat({ message, conversationId, context }) {
      validateMessage(message);
      validateContext(context);
      const conversationKey = conversationId || crypto.randomUUID();
      if (typeof conversationKey !== "string" || conversationKey.length > 100) throw apiError("validation_error", "Invalid conversation id.", 422);
      const owner = JSON.stringify([context.tenantId, context.userId, context.branchId, context.role]);
      const previous = conversations.get(conversationKey);
      if (previous && previous.owner !== owner) throw apiError("forbidden", "Conversation is unavailable in this scope.", 403);
      const existing = previous?.messages || [];
      const state = connectionState(context);
      const statusReply = connectionReply(message, context);
      const plan = statusReply ? { kind: 'connection', capabilities: [] } : planChat(message, { now: now(), previous: previous?.plan, branchId: state.branchId });
      const greeting = isGreeting(message);
      const verifiedData = plan.kind !== 'analytics' || context.mode === "demo" || !rxLedger.isConfigured ? null : await getRxLedgerContext(rxLedger, context, plan);
      const conversationalReply = /^(thanks|thank you|thank you rai)[!. ]*$/i.test(message.trim()) ? "You're welcome. What would you like to look into next?" : /\b(what can you do|how can you help|what is rai)\b/i.test(message) ? 'I help with pharmacy stock, expiry risk, demand and business analysis. I use only the branches and data you approve in RxLedger. Some reports need additional verified data, and I cannot change records or provide clinical dosing advice.' : null;
      const unavailableMetric = verifiedData && /\b(revenue|sold|sales report|realised profit|realized profit|unique patients)\b/i.test(message)
        ? 'The current RxLedger snapshot does not expose exact units sold, historical revenue, realised profit or unique-patient counts. I cannot substitute average usage, current prices or dispense-line counts for those figures. An approved aggregate report for the selected branch and period is needed.' : null;
      const missingData = plan.kind === 'analytics' && !verifiedData
        ? `I cannot run this analysis for ${plan.dateRange.startDate} to ${plan.dateRange.endDate} because ${!state.connected ? 'you are not connected to RxLedger and no live pharmacy data is available' : 'the server has not provided verified RxLedger data'}. No analysis or report was completed. Next: ${context.mode === 'demo' ? "live access must first be enabled and your RxLedger workspace approved; use RxLedger's own reports in the meantime" : 'check your RxLedger connection and approved analytics permissions, then retry'}.` : null;
      const result = greeting
        ? { text: "Hello, I'm Rai. I can help you review pharmacy sales, stock, patient demand, reports, and operational priorities. What would you like to look into?", provider: { id: "deterministic", model: null, grounded: true } }
        : statusReply || plan.reply || conversationalReply || unavailableMetric || missingData
          ? { text: statusReply || plan.reply || conversationalReply || unavailableMetric || missingData, provider: { id: 'deterministic', model: null, grounded: Boolean(verifiedData) } }
        : await replyWithProvider({ provider, message, context, history: existing.slice(-8), dataContext: verifiedData });

      const timestamp = now().toISOString();
      const userMessage = { id: crypto.randomUUID(), role: "user", text: message.trim(), createdAt: timestamp };
      const raiMessage = { id: crypto.randomUUID(), role: "rai", text: result.text, createdAt: timestamp };
      if (conversations.size >= 200 && !previous) conversations.delete(conversations.keys().next().value);
      conversations.set(conversationKey, { owner, plan: plan.kind === 'analytics' || plan.pendingQuestion ? plan : previous?.plan, messages: [...existing, userMessage, raiMessage].slice(-20) });

      return {
        conversationId: conversationKey,
        message: raiMessage,
        provider: result.provider,
        grounding: { status: verifiedData ? "verified_data" : "no_operational_data", sources: verifiedData ? ["rxledger"] : [] },
        audit: { kind: plan.kind, branchId: state.branchId, dateRange: plan.dateRange || null, assumptions: plan.assumptions || [], generatedAt: timestamp },
        warnings: plan.kind !== 'analytics' ? [] : verifiedData ? [...(verifiedData.warnings || []), ...(plan.assumptions || [])] : ["No verified RxLedger analytics data was available for this answer."]
      };
    },
    health: async () => {
      const modelHealth = await provider.health();
      return {
        service: "rai-api",
        provider: { id: provider.id, ...modelHealth },
        capabilities: { chat: true, conversations: "in_memory_development_only", rxledger: rxLedger.isConfigured }
      };
    }
  };
}

async function getRxLedgerContext(rxLedger, context, plan) {
  const capabilities = plan.capabilities;
  if (context.capabilities && capabilities.some(item => !context.capabilities.includes(item))) throw apiError('forbidden', 'Your approved RxLedger access does not cover this analysis. Reconnect with the required permission.', 403);
  const { startDate, endDate } = plan.dateRange;
  const snapshot = await rxLedger.analyticsSnapshot({
    context,
    capabilities,
    startDate,
    endDate
  });
  return compactAnalyticsContext(snapshot);
}

async function replyWithProvider({ provider, message, context, history, dataContext }) {
  const state = connectionState(context);
  const modelResult = await provider.chat({ message: message.trim(), context: { tenantId: state.tenantId, branchId: state.branchId, role: state.connected ? context.role : null, connection: state }, history, dataContext });
  return { text: modelResult.text, provider: { id: provider.id || "ollama", model: modelResult.model, grounded: Boolean(dataContext) } };
}

function validateMessage(message) {
  if (typeof message !== "string" || !message.trim()) throw apiError("validation_error", "A non-empty message is required.", 422);
  if (message.length > MAX_MESSAGE_LENGTH) throw apiError("validation_error", `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`, 422);
}

function validateContext(context) {
  if (!context || !context.tenantId || !context.branchId || !context.role || !context.userId) {
    throw apiError("unauthorized", "A valid Rai user context is required.", 401);
  }
}

function isGreeting(message) {
  return /^(hi|hello|hey|good (morning|afternoon|evening))(\s+(rai|there))?[!. ]*$/i.test(message.trim());
}

export function apiError(code, message, status) {
  return Object.assign(new Error(message), { code, status });
}
