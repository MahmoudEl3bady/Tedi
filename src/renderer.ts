import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";

export class Renderer {
  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();
    const viewport = state.getViewport();
    const rows = stdout.rows || 24;
    const maxLines = rows - 1;

    const lineNumWidth = String(lines.length).length;

    // Save cursor position (in case we're rendering during filename prompt)
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

    // Draw text with line numbers
    visibleLines.forEach((line, i) => {
      const actualLineNum = viewport.start + i + 1;
      const lineNumStr = String(actualLineNum).padStart(lineNumWidth, " ");
      const lineNum = styleText(["yellow"], `${lineNumStr} `);
      stdout.write(lineNum + line);
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
}
