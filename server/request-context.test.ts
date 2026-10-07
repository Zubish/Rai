import { describe, expect, it } from "vitest";
import { resolveRequestContext, validateChatBody } from "./request-context.mjs";

describe("HTTP trust boundary", () => {
  it("does not accept caller identity headers as authentication", () => {
    expect(() => resolveRequestContext({ headers: { "x-rai-user-id": "admin", "x-rai-role": "admin" } })).toThrow(/sign-in/);
  });
  it("rejects fabricated verified metrics", () => {
    expect(() => validateChatBody({ message: "Sales?", dataContext: { revenue: 100000 } })).toThrow(/Only/);
  });
  it("keeps local identity isolated regardless of supplied headers", () => {
    expect(resolveRequestContext({ headers: { host: "127.0.0.1:8787", "x-rai-user-id": "admin" } }, { local: true })).toMatchObject({ mode: "demo", userId: "demo-user" });
  });
  it("rejects cross-origin local requests", () => {
    expect(() => resolveRequestContext({ headers: { host: "localhost:8787", origin: "https://untrusted.example" } }, { local: true })).toThrow(/same-origin/);
  });
});
