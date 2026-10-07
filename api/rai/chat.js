import { createRaiService } from "../../server/rai-api.mjs";
import { resolveRequestContext, validateChatBody } from "../../server/request-context.mjs";

const service = createRaiService();

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: { code: "method_not_allowed", message: "Use POST for Rai chat." } });
  try {
    response.setHeader("Cache-Control", "no-store");
    const context = resolveRequestContext(request);
    const { message, conversationId } = validateChatBody(request.body);
    return response.status(200).json({ data: await service.chat({ message, conversationId, context }) });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return response.status(status).json({ error: { code: error.code || "internal_error", message: status >= 500 ? "Rai could not complete that request right now." : error.message } });
  }
}
