// renderer.ts
import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";

export class Renderer {
  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();

    // clear screen
    stdout.write("\x1Bc");
    stdout.write("\x1b[H");

    // draw text with line numbers
    lines.forEach((line, i) => {
      const lineNum = styleText(["yellow"], `${i + 1} `);
      stdout.write(lineNum + line + "\n");
    });

    // place cursor
    const targetLine = cursor.y + 1;
    const targetCol = cursor.x + `${cursor.y + 1} `.length + 1;
    stdout.write(`\x1b[${targetLine};${targetCol}H`);
  }
}
