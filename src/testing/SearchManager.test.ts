import { describe, it, expect, beforeEach } from "vitest";
import { SearchManager } from "../SearchManager.js";

describe("SearchManager", () => {
  let manager: SearchManager;

  beforeEach(() => {
    manager = new SearchManager();
  });

  describe("search", () => {
    it("finds all matches in document", () => {
      const lines = ["test line", "another test", "test test"];
      manager.search(lines, "test");

      expect(manager.getMatches()).toHaveLength(4);
      expect(manager.getMatches()).toEqual([
        { line: 0, col: 0 },
        { line: 1, col: 8 },
        { line: 2, col: 0 },
        { line: 2, col: 5 },
      ]);
    });

    it("is case insensitive", () => {
      const lines = ["Test LINE test"];
      manager.search(lines, "test");

      expect(manager.getMatches()).toHaveLength(2);
    });

    it("handles no matches", () => {
      const lines = ["hello world"];
      manager.search(lines, "notfound");

      expect(manager.getMatches()).toHaveLength(0);
      expect(manager.hasMatches()).toBe(false);
    });

    it("handles empty query", () => {
      const lines = ["test"];
      manager.search(lines, "");

      expect(manager.getMatches()).toHaveLength(0);
    });

    it("strips ANSI codes before searching", () => {
      const lines = ["\x1b[36mconst\x1b[0m test"];
      manager.search(lines, "const");

      expect(manager.getMatches()).toHaveLength(1);
      expect(manager.getMatches()[0]).toEqual({ line: 0, col: 0 });
    });
  });

  describe("nextMatch", () => {
    it("cycles through matches", () => {
      const lines = ["test", "test", "test"];
      manager.search(lines, "test");

      expect(manager.getCurrentMatch()).toEqual({ line: 0, col: 0 });

      manager.nextMatch();
      expect(manager.getCurrentMatch()).toEqual({ line: 1, col: 0 });

      manager.nextMatch();
      expect(manager.getCurrentMatch()).toEqual({ line: 2, col: 0 });
    });

    it("wraps around to first match", () => {
      const lines = ["test", "test"];
      manager.search(lines, "test");

      manager.nextMatch();
      manager.nextMatch();

      expect(manager.getCurrentMatch()).toEqual({ line: 0, col: 0 });
    });

    it("returns null when no matches", () => {
      const lines = ["hello"];
      manager.search(lines, "notfound");

      expect(manager.nextMatch()).toBeNull();
    });
  });

  describe("getMatchesForLine", () => {
    it("returns only matches for specific line", () => {
      const lines = ["test test", "hello", "test"];
      manager.search(lines, "test");

      const line0Matches = manager.getMatchesForLine(0);
      expect(line0Matches).toHaveLength(2);

      const line1Matches = manager.getMatchesForLine(1);
      expect(line1Matches).toHaveLength(0);

      const line2Matches = manager.getMatchesForLine(2);
      expect(line2Matches).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("clears all matches and query", () => {
      const lines = ["test"];
      manager.search(lines, "test");

      manager.clear();

      expect(manager.getMatches()).toHaveLength(0);
      expect(manager.getQuery()).toBe("");
      expect(manager.hasMatches()).toBe(false);
    });
  });
});
