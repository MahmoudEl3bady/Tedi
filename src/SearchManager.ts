import { clean, stripAnsi } from "./utilities/utils.js";

export class SearchManager {
  private query: string = "";
  private matches: Array<{ line: number; col: number }> = [];
  private currentMatchIndex: number = -1;

  search(lines: string[], query: string) {
    this.clear();

    const q = (query ?? "").trim();
    if (!q) return;

    this.query = q;
    const lowerQ = q.toLowerCase();

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const raw = stripAnsi(lines[lineNum]!);
      const lowerLine = raw.toLowerCase();

      let col = lowerLine.indexOf(lowerQ);
      while (col !== -1) {
        this.matches.push({ line: lineNum, col });
        col = lowerLine.indexOf(lowerQ, col + lowerQ.length);
      }
    }

    this.currentMatchIndex = this.matches.length > 0 ? 0 : -1;
  }

  nextMatch(): { line: number; col: number } | null {
    if (this.matches.length === 0) return null;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    return this.matches[this.currentMatchIndex]!;
  }

  prevMatch(): { line: number; col: number } | null {
    if (this.matches.length === 0) return null;
    this.currentMatchIndex =
      (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    return this.matches[this.currentMatchIndex]!;
  }

  getMatches(): Array<{ line: number; col: number }> {
    return this.matches;
  }

  getMatchesForLine(lineIndex: number): Array<{ line: number; col: number }> {
    return this.matches.filter((m) => m.line === lineIndex);
  }

  getCurrentMatch(): { line: number; col: number } | null {
    if (
      this.currentMatchIndex >= 0 &&
      this.currentMatchIndex < this.matches.length
    ) {
      return this.matches[this.currentMatchIndex]!;
    }
    return null;
  }

  getCurrentMatchIndex(): number {
    return this.currentMatchIndex;
  }

  hasMatches(): boolean {
    return this.matches.length > 0;
  }

  getQuery(): string {
    return this.query;
  }

  getMatchCount(): number {
    return this.matches.length;
  }

  clear() {
    this.query = "";
    this.matches = [];
    this.currentMatchIndex = -1;
  }
}
