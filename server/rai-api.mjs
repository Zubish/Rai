import "./env.mjs";
import { createOllamaProvider } from "./ollama-provider.mjs";

const MAX_MESSAGE_LENGTH = 4000;

export function createRaiService({ provider = createOllamaProvider(), now = () => new Date() } = {}) {
  const conversations = new Map();

  return {
    async chat({ message, conversationId, context, dataContext = null }) {
      validateMessage(message);
      validateContext(context);
      const conversationKey = conversationId || crypto.randomUUID();
      const existing = conversations.get(conversationKey) || [];
      const greeting = isGreeting(message);
      const result = greeting
        ? { text: "Hello, I'm Rai. I can help you review pharmacy sales, stock, patient demand, reports, and operational priorities. What would you like to look into?", provider: { id: "deterministic", model: null, grounded: true } }
        : await replyWithProvider({ provider, message, context, history: existing.slice(-8), dataContext });

      const timestamp = now().toISOString();
      const userMessage = { id: crypto.randomUUID(), role: "user", text: message.trim(), createdAt: timestamp };
      const raiMessage = { id: crypto.randomUUID(), role: "rai", text: result.text, createdAt: timestamp };
      conversations.set(conversationKey, [...existing, userMessage, raiMessage]);

      return {
        conversationId: conversationKey,
        message: raiMessage,
        provider: result.provider,
        grounding: { status: dataContext ? "verified_data" : "no_operational_data", sources: dataContext ? ["rxledger"] : [] },
        warnings: dataContext ? [] : ["No verified RxLedger analytics data was available for this answer."]
      };
    },
    health: async () => {
      const modelHealth = await provider.health();
      return {
        service: "rai-api",
        provider: { id: provider.id, ...modelHealth },
        capabilities: { chat: true, conversations: "in_memory_development_only", rxledger: false }
      };
    }
  };
}

async function replyWithProvider({ provider, message, context, history, dataContext }) {
  const modelResult = await provider.chat({ message: message.trim(), context, history, dataContext });
  return { text: modelResult.text, provider: { id: provider.id || "ollama", model: modelResult.model, grounded: Boolean(dataContext) } };
}

function validateMessage(message) {
  if (typeof message !== "string" || !message.trim()) throw apiError("validation_error", "A non-empty message is required.", 422);
  if (message.length > MAX_MESSAGE_LENGTH) throw apiError("validation_error", `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`, 422);
}

function validateContext(context) {
  if (!context || !context.tenantId || !context.branchId || !context.role) {
    throw apiError("unauthorized", "A valid Rai user context is required.", 401);
  }
}

function isGreeting(message) {
  return /^(hi|hello|hey|good (morning|afternoon|evening))(\s+(rai|there))?[!. ]*$/i.test(message.trim());
}

export function apiError(code, message, status) {
  return Object.assign(new Error(message), { code, status });
}
