import { describe, it, expect } from "vitest";
import EditorState from "../EditorState.js";
import { Renderer } from "../renderer.js";
import { SearchManager } from "../SearchManager.js";

describe("manual smoke check (horizontal scroll + merged highlight, end to end)", () => {
  it("handles a long line, cursor walk, and render without throwing", () => {
    const longLine =
      'const value = "a very long value that should trigger horizontal scrolling once the cursor walks far enough to the right of the visible terminal width";';
    const lines = [longLine, "# a python style comment", "if (x) { return true; } // trailing"];

    const editor = new EditorState(lines, "/tmp");
    const renderer = new Renderer();

    editor.setCursor(0, 0);
    for (let i = 0; i < 140; i++) editor.moveCursor("right");

    // cursorX should be clamped to the line's actual length, not run off
    expect(editor.getCursor().x).toBeLessThanOrEqual(longLine.length);

    let captured = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    // @ts-ignore - intercept for the test only
    process.stdout.write = (chunk: any) => {
      captured += chunk.toString();
      return true;
    };
    expect(() => renderer.render(editor)).not.toThrow();
    process.stdout.write = originalWrite;

    expect(captured.length).toBeGreaterThan(0);

    // now with search active at the same time
    const search = new SearchManager();
    search.search(lines, "const");
    renderer.setSearchManager(search);

    captured = "";
    // @ts-ignore
    process.stdout.write = (chunk: any) => {
      captured += chunk.toString();
      return true;
    };
    expect(() => renderer.render(editor)).not.toThrow();
    process.stdout.write = originalWrite;

    expect(captured.length).toBeGreaterThan(0);
  });
});
