import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf-8");

describe("print stylesheet", () => {
  it("forces A4 portrait printing and hides non-print chrome", () => {
    expect(css).toContain("@page {");
    expect(css).toContain("size: A4 portrait;");
    expect(css).toContain(".screen-only,");
    expect(css).toContain("[data-slot=\"sidebar-gap\"]");
    expect(css).toContain("[data-slot=\"sidebar-container\"]");
    expect(css).toContain("display: none !important;");
  });

  it("restores the print container after hiding dashboard chrome", () => {
    expect(css).toContain(".print-only {");
    expect(css).toContain("display: block !important;");
    expect(css).toContain("[data-slot=\"sidebar-wrapper\"],");
    expect(css).toContain("[data-slot=\"sidebar-inset\"]");
    expect(css).toContain("width: 100% !important;");
  });
});
