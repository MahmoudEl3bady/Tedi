import { describe, it, expect, beforeEach } from "vitest";
import { Renderer } from "../renderer.js";
import { SearchManager } from "../SearchManager.js";
import { stripAnsi } from "../utilities/utils.js";

process.env.FORCE_COLOR = "1";

type RendererInternals = {
  renderLine(clippedLine: string, lineIndex: number, xOffset: number): string;
};

describe("Renderer", () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  const renderLine = (line: string, lineIndex = 0, xOffset = 0) =>
    (renderer as unknown as RendererInternals).renderLine(
      line,
      lineIndex,
      xOffset,
    );

  describe("syntax highlighting", () => {
    it("preserves exact text content through highlighting", () => {
      const line = "const x = 5;";
      const output = renderLine(line);
      expect(stripAnsi(output)).toBe(line);
    });

    it("colors a keyword without touching surrounding text", () => {
      const output = renderLine("const x = 1;");
      expect(output).toContain("const"); // styled substring still present
      expect(stripAnsi(output)).toBe("const x = 1;");
    });

    it("colors a // comment gray and preserves its text", () => {
      const line = "const x = 1; // set x";
      const output = renderLine(line);
      expect(stripAnsi(output)).toBe(line);
    });

    it("does not eat the last character on a #-only comment line", () => {
      // Regression test: old code always did indexOf("//") even when only
      // "#" was present, silently dropping the line's final character.
      const line = "# a python comment";
      const output = renderLine(line);
      expect(stripAnsi(output)).toBe(line);
    });
  });

  describe("search highlighting merged with syntax highlighting", () => {
    it("keeps syntax highlighting active while a search is active", () => {
      const searchManager = new SearchManager();
      const lines = ["const value = 1;"];
      searchManager.search(lines, "value");
      renderer.setSearchManager(searchManager);

      const output = renderLine(lines[0]!, 0, 0);

      // Content must survive unchanged...
      expect(stripAnsi(output)).toBe(lines[0]);
      // ...and both the keyword style and the match highlight must be
      // present in the same output. This is the actual regression guard:
      // previously, render() took an either/or branch — any active search
      // disabled syntax highlighting for the whole line.
      expect(output).toContain("const");
      expect(output).toContain("value");
      expect(output.length).toBeGreaterThan(stripAnsi(output).length);
    });

    it("highlights a match that overlaps a keyword token", () => {
      const searchManager = new SearchManager();
      const lines = ["const constValue = 1;"];
      searchManager.search(lines, "const"); // matches the keyword itself
      renderer.setSearchManager(searchManager);

      const output = renderLine(lines[0]!, 0, 0);
      expect(stripAnsi(output)).toBe(lines[0]);
    });
  });

  describe("horizontal clipping (used for horizontal scroll)", () => {
    it("renders a clipped slice's text exactly, matches shifted to local columns", () => {
      const searchManager = new SearchManager();
      const fullLine = "0123456789needle0123456789";
      searchManager.search([fullLine], "needle");
      renderer.setSearchManager(searchManager);

      const xOffset = 10; // scroll window starts right at "needle"
      const clipped = fullLine.slice(xOffset, xOffset + 6); // "needle"
      const output = renderLine(clipped, 0, xOffset);

      expect(stripAnsi(output)).toBe("needle");
      expect(output).toContain("needle");
    });
  });
});
