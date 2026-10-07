import { createRaiService } from "../../server/rai-api.mjs";

const service = createRaiService();

export default async function handler(_request, response) {
  return response.status(200).json({ data: await service.health() });
}
