import { createServer } from "node:http";
import { handleApiRequest } from "./http-api.mjs";

const port = Number(process.env.RAI_API_PORT || 8787);
const server = createServer(handleApiRequest);

server.listen(port, "127.0.0.1", () => {
  console.log(`Rai API listening on http://127.0.0.1:${port}`);
});
