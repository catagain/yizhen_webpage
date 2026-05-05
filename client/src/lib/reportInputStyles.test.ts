import { describe, expect, it } from "vitest";

import { REPORT_INPUT_CLASS_NAME, REPORT_SELECT_CLASS_NAME } from "./reportInputStyles";

describe("report input styles", () => {
  it("keeps editable report inputs highlighted in yellow", () => {
    expect(REPORT_INPUT_CLASS_NAME).toContain("bg-yellow-200");
    expect(REPORT_INPUT_CLASS_NAME).toContain("border-amber-500");
    expect(REPORT_INPUT_CLASS_NAME).toContain("text-black");
  });

  it("keeps editable report selects highlighted in yellow", () => {
    expect(REPORT_SELECT_CLASS_NAME).toContain("bg-yellow-200");
    expect(REPORT_SELECT_CLASS_NAME).toContain("border-amber-500");
    expect(REPORT_SELECT_CLASS_NAME).toContain("text-black");
  });
});
