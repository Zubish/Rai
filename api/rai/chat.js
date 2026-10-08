import { createRaiService } from "../../server/rai-api.mjs";
import { validateChatBody } from "../../server/request-context.mjs";
import { resolveConnectedContext } from '../../server/connection-http.mjs';
import { publicFailure } from '../../server/public-failure.mjs';

const service = createRaiService();

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: { code: "method_not_allowed", message: "Use POST for Rai chat." } });
  try {
    response.setHeader("Cache-Control", "no-store");
    const context = await resolveConnectedContext(request);
    const { message, conversationId } = validateChatBody(request.body);
    return response.status(200).json({ data: await service.chat({ message, conversationId, context }) });
  } catch (error) {
    const failure = publicFailure(error);
    return response.status(failure.status).json({ error: failure.error });
  }
}
