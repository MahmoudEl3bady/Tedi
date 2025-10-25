import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";
import type { SearchManager } from "./SearchManager.js";

export class Renderer {
  private searchManager: SearchManager | null = null;

  setSearchManager(manager: SearchManager | null) {
    this.searchManager = manager;
  }

  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();
    const viewport = state.getViewport();
    const rows = stdout.rows || 24;
    const maxLines = rows - 1;

    const lineNumWidth = String(lines.length).length;

    // Save cursor position
    stdout.write("\x1b[s");

    // Clear the screen area
    stdout.write("\x1b[H");
    for (let i = 0; i < maxLines; i++) {
      stdout.write("\x1b[2K");
      if (i < maxLines - 1) stdout.write("\n");
    }

    stdout.write("\x1b[H");

    // Get visible lines from viewport
    const visibleLines = lines.slice(viewport.start, viewport.end);

    // Draw text with line numbers and highlighting
    visibleLines.forEach((line, i) => {
      const actualLineNum = viewport.start + i + 1;
      const lineNumStr = String(actualLineNum).padStart(lineNumWidth, " ");
      const lineNum = styleText(["yellow"], `${lineNumStr} `);

      // Highlight search matches if in search mode
      const highlightedLine = this.highlightSearchMatches(
        line,
        viewport.start + i
      );

      stdout.write(lineNum + highlightedLine);
      if (i < visibleLines.length - 1) stdout.write("\n");
    });

    // Calculate cursor position relative to viewport
    const displayLine = cursor.y - viewport.start + 1;
    const displayCol = cursor.x + lineNumWidth + 2;

    // Ensure cursor is within valid range
    if (displayLine > 0 && displayLine <= maxLines) {
      stdout.write(`\x1b[${displayLine};${displayCol}H`);
    }
  }

  private highlightSearchMatches(line: string, lineIndex: number): string {
    if (!this.searchManager || !this.searchManager.hasMatches()) {
      return line;
    }

    const matches = this.searchManager.getMatchesForLine(lineIndex);
    const currentMatch = this.searchManager.getCurrentMatch();
    const query = this.searchManager.getQuery();

    if (matches.length === 0) {
      return line;
    }

    let result = "";
    let lastIndex = 0;

    matches.forEach((match) => {
      result += line.slice(lastIndex, match.col);

      const isCurrentMatch =
        currentMatch &&
        currentMatch.line === lineIndex &&
        currentMatch.col === match.col;

      const matchText = line.slice(match.col, match.col + query.length);

      if (isCurrentMatch) {
        result += styleText(["bgYellow", "black", "bold"], matchText);
      } else {
        result += styleText(["bgCyan", "black"], matchText);
      }

      lastIndex = match.col + query.length;
    });

    result += line.slice(lastIndex);

    return result;
  }
}
