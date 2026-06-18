import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRaiApiRequest } from "../../server/raiHttp.js";

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await handleRaiApiRequest(request, response);
}
