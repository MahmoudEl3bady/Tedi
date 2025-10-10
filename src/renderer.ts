import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";

export class Renderer {
  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();
    const rows = stdout.rows || 24;

    // Save cursor position (in case we're rendering during filename prompt)
    stdout.write("\x1b[s");

    // Instead, clear manually to preserve bottom line
    stdout.write("\x1b[H");

    const maxLines = rows - 1;
    for (let i = 0; i < maxLines; i++) {
      stdout.write("\x1b[2K");
      if (i < maxLines - 1) stdout.write("\n");
    }

    // Go back to top
    stdout.write("\x1b[H");

    // Draw text with line numbers (only up to maxLines)
    const visibleLines = lines.slice(0, maxLines);
    visibleLines.forEach((line, i) => {
      const lineNum = styleText(["yellow"], `${i + 1} `);
      stdout.write(lineNum + line);
      if (i < visibleLines.length - 1) stdout.write("\n");
    });

    // Place cursor
    const targetLine = cursor.y + 1;
    const targetCol = cursor.x + `${cursor.y + 1} `.length + 1;
    stdout.write(`\x1b[${targetLine};${targetCol}H`);
  }
}
