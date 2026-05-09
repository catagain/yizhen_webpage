import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./MonthlyReportPage.tsx", import.meta.url), "utf-8");

describe("MonthlyReportPage print source", () => {
  it("keeps the editor hero card out of print output", () => {
    expect(pageSource).toContain('screen-only rounded-none border-foreground bg-card shadow-panel print:hidden print:shadow-none');
    expect(pageSource).toContain('Monthly Report Editor');
  });
});
