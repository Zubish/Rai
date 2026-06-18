// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("Rai API rate limit", () => {
  it("allows normal traffic and rejects overflow in the same window", () => {
    const request = {
      socket: {
        remoteAddress: `test-${Date.now()}`
      }
    };

    for (let index = 0; index < 120; index += 1) {
      expect(checkRateLimit(request as never)).toEqual({ ok: true });
    }

    const rejected = checkRateLimit(request as never);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
