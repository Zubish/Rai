import { describe, expect, it } from "vitest";
import { parseRaiQuestionScope } from "./raiScope";

describe("parseRaiQuestionScope", () => {
  it("extracts Lagos branch and yesterday in Africa/Lagos time", () => {
    const scope = parseRaiQuestionScope(
      "From Lagos branch how many Aprovel was sold yesterday?",
      new Date("2026-06-19T05:00:00.000Z")
    );

    expect(scope.branchIds).toEqual(["lagos"]);
    expect(scope.dateRange).toMatchObject({
      startDate: "2026-06-18",
      endDate: "2026-06-18"
    });
  });
});
