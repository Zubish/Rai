import { createServer } from "node:http";
import { handleRaiApiRequest } from "./raiHttp";

const port = Number(process.env.RAI_API_PORT || 8787);

const server = createServer(async (request, response) => {
  const handled = await handleRaiApiRequest(request, response);
  if (!handled) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ ok: false, error: "Not found" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Rai API listening on http://127.0.0.1:${port}`);
});
