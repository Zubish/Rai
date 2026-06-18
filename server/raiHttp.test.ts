// @vitest-environment node
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleRaiApiRequest } from "./raiHttp";

let server: ReturnType<typeof createServer>;
let baseUrl: string;
const originalApiKey = process.env.OPENAI_API_KEY;

beforeEach(async () => {
  process.env.OPENAI_API_KEY = "";
  server = createServer(async (request, response) => {
    const handled = await handleRaiApiRequest(request, response);
    if (!handled) {
      response.statusCode = 404;
      response.end("not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("Rai HTTP API", () => {
  it("reports health without exposing secrets", async () => {
    const response = await fetch(`${baseUrl}/api/rai/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(payload).toMatchObject({
      ok: true,
      service: "rai-api",
      openaiConfigured: false
    });
    expect(JSON.stringify(payload)).not.toContain("OPENAI_API_KEY");
  });

  it("answers chat requests with a structured Rai report", async () => {
    const response = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "I have ₦500,000 budget, what should I buy to maximize profit and avoid stockout?"
      })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.orchestrationMode).toBe("deterministic_fallback");
    expect(payload.data.report.toolName).toBe("build_restock_budget_plan");
    expect(payload.data.report.directAnswer).toContain("Amlodipine");
  });

  it("rejects invalid methods and malformed requests", async () => {
    const methodResponse = await fetch(`${baseUrl}/api/rai/chat`);
    expect(methodResponse.status).toBe(405);

    const contentTypeResponse = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      body: "{}"
    });
    expect(contentTypeResponse.status).toBe(415);

    const bodyResponse = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 123 })
    });
    expect(bodyResponse.status).toBe(400);

    const malformedResponse = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    expect(malformedResponse.status).toBe(500);
    expect(await malformedResponse.json()).toMatchObject({
      ok: false,
      error: "Rai API could not complete the request."
    });

    const emptyResponse = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " })
    });
    expect(emptyResponse.status).toBe(400);

    const longResponse = await fetch(`${baseUrl}/api/rai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(2_001) })
    });
    expect(longResponse.status).toBe(400);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
