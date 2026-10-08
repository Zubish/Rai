import "./env.mjs";
import { createOllamaProvider } from "./ollama-provider.mjs";
import { capabilitiesForQuestion, compactAnalyticsContext, createRxLedgerClient } from "./rxledger-client.mjs";

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
      const greeting = isGreeting(message);
      const verifiedData = greeting || context.mode === "demo" || !rxLedger.isConfigured ? null : await getRxLedgerContext(rxLedger, context, message);
      const result = greeting
        ? { text: "Hello, I'm Rai. I can help you review pharmacy sales, stock, patient demand, reports, and operational priorities. What would you like to look into?", provider: { id: "deterministic", model: null, grounded: true } }
        : await replyWithProvider({ provider, message, context, history: existing.slice(-8), dataContext: verifiedData });

      const timestamp = now().toISOString();
      const userMessage = { id: crypto.randomUUID(), role: "user", text: message.trim(), createdAt: timestamp };
      const raiMessage = { id: crypto.randomUUID(), role: "rai", text: result.text, createdAt: timestamp };
      if (conversations.size >= 200 && !previous) conversations.delete(conversations.keys().next().value);
      conversations.set(conversationKey, { owner, messages: [...existing, userMessage, raiMessage].slice(-20) });

      return {
        conversationId: conversationKey,
        message: raiMessage,
        provider: result.provider,
        grounding: { status: verifiedData ? "verified_data" : "no_operational_data", sources: verifiedData ? ["rxledger"] : [] },
        warnings: greeting ? [] : verifiedData ? verifiedData.warnings || [] : ["No verified RxLedger analytics data was available for this answer."]
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

async function getRxLedgerContext(rxLedger, context, message) {
  const capabilities = capabilitiesForQuestion(message);
  if (context.capabilities && capabilities.some(item => !context.capabilities.includes(item))) throw apiError('forbidden', 'Your approved RxLedger access does not cover this analysis. Reconnect with the required permission.', 403);
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const snapshot = await rxLedger.analyticsSnapshot({
    context,
    capabilities,
    startDate,
    endDate
  });
  return compactAnalyticsContext(snapshot);
}

async function replyWithProvider({ provider, message, context, history, dataContext }) {
  const { tenantId, branchId, role } = context;
  const modelResult = await provider.chat({ message: message.trim(), context: { tenantId, branchId, role }, history, dataContext });
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
