import { createRaiService, apiError } from "../../server/rai-api.mjs";

const service = createRaiService();

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: { code: "method_not_allowed", message: "Use POST for Rai chat." } });
  try {
    const { message, conversationId, dataContext } = request.body || {};
    const context = request.headers["x-rai-tenant-id"] && request.headers["x-rai-branch-id"] && request.headers["x-rai-role"]
      ? { tenantId: request.headers["x-rai-tenant-id"], branchId: request.headers["x-rai-branch-id"], role: request.headers["x-rai-role"] }
      : null;
    if (!context) throw apiError("unauthorized", "Sign in through RxLedger to use Rai.", 401);
    return response.status(200).json({ data: await service.chat({ message, conversationId, context, dataContext }) });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return response.status(status).json({ error: { code: error.code || "internal_error", message: status >= 500 ? "Rai could not complete that request right now." : error.message } });
  }
}
