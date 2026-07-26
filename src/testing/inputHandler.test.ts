import { describe, it, expect, vi, beforeEach } from "vitest";
import { InputHandler } from "../inputHandler.js";
import EditorState from "../EditorState.js";
import { UndoManager } from "../undo.js";
import { Renderer } from "../renderer.js";

// getSearchQuery talks to real stdin/stdout; InputHandler only needs its
// resolved value, so mock the module boundary instead of driving stdin.
vi.mock("../utilities/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utilities/utils.js")>();
  return {
    ...actual,
    getSearchQuery: vi.fn(),
    debounce: (fn: any) => fn, // make debounced calls synchronous/immediate in tests
  };
});

import { getSearchQuery } from "../utilities/utils.js";

describe("InputHandler", () => {
  let editor: EditorState;
  let undoManager: UndoManager;
  let renderer: Renderer;
  let handler: InputHandler;
  let renderSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    editor = new EditorState(["hello world", "second line"]);
    undoManager = new UndoManager();
    renderer = new Renderer();
    renderSpy = vi.spyOn(renderer, "render").mockImplementation(() => {});
    handler = new InputHandler(editor, undoManager, renderer);
    vi.clearAllMocks();
    renderSpy = vi.spyOn(renderer, "render").mockImplementation(() => {});
  });

  describe("printable character input", () => {
    it("inserts a plain character into the editor", () => {
      handler.handle("X");
      expect(editor.getLines()[0]).toBe("Xhello world");
    });

    it("triggers a render after handling input", () => {
      handler.handle("X");
      expect(renderSpy).toHaveBeenCalledWith(editor);
    });

    it("ignores control bytes below the printable range (not bound to a key)", () => {
      const before = editor.getLines()[0];
      handler.handle("\x01"); // not a bound key, not printable
      expect(editor.getLines()[0]).toBe(before);
    });
  });

  describe("key bindings", () => {
    it("Enter inserts a new line when not in search mode", () => {
      handler.handle("\r");
      expect(editor.getLines().length).toBe(3);
    });

    it("Tab inserts 4 spaces", () => {
      handler.handle("\t");
      expect(editor.getLines()[0]).toBe("    hello world");
    });

    it("Backspace (0x7F) deletes the character before the cursor", () => {
      handler.handle("X"); // "Xhello world", cursor after X
      handler.handle("\x7F");
      expect(editor.getLines()[0]).toBe("hello world");
    });

    it("arrow keys move the cursor", () => {
      handler.handle("\x1B[C"); // right
      expect(editor.getCursor()).toEqual({ x: 1, y: 0 });
      handler.handle("\x1B[D"); // left
      expect(editor.getCursor()).toEqual({ x: 0, y: 0 });
      handler.handle("\x1B[B"); // down
      expect(editor.getCursor().y).toBe(1);
      handler.handle("\x1B[A"); // up
      expect(editor.getCursor().y).toBe(0);
    });

    it("Ctrl+Z (0x1A) undoes the last saved snapshot", () => {
      undoManager.save(editor); // snapshot of original state
      editor.insertChar("X");

      handler.handle("\x1A");

      expect(editor.getLines()[0]).toBe("hello world");
    });

    it("Ctrl+Y (0x19) redoes an undone change", () => {
      undoManager.save(editor);
      editor.insertChar("X");
      handler.handle("\x1A"); // undo -> back to "hello world"

      handler.handle("\x19"); // redo

      expect(editor.getLines()[0]).toBe("Xhello world");
    });
  });

  describe("handlePasting (Ctrl+P)", () => {
    it("inserts clipboard text and saves an undo snapshot", async () => {
      const clipboard = (await import("clipboardy")).default;
      vi.spyOn(clipboard, "readSync").mockReturnValue("PASTED");
      const saveSpy = vi.spyOn(undoManager, "save");

      handler.handle("\x10");

      expect(editor.getLines()[0]).toBe("PASTED");
      expect(saveSpy).toHaveBeenCalledWith(editor);
    });
  });

  describe("search flow (Ctrl+F)", () => {
    it("moves the cursor to the first match and enters search mode", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("world");

      handler.handle("\x06");
      // handleSearch is async; flush microtasks
      await new Promise((r) => setTimeout(r, 0));

      expect(editor.getCursor()).toEqual({ x: 6, y: 0 }); // "world" starts at col 6
      expect(handler.isSearchMode).toBe(true);
    });

    it("does nothing (no crash, no mode change) when the query has no matches", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("notfound");
      const originalCursor = editor.getCursor();

      handler.handle("\x06");
      await new Promise((r) => setTimeout(r, 0));

      expect(editor.getCursor()).toEqual(originalCursor);
      expect(handler.isSearchMode).toBe(false);
    });

    it("does nothing when the query is empty/cancelled", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("");

      handler.handle("\x06");
      await new Promise((r) => setTimeout(r, 0));

      expect(handler.isSearchMode).toBe(false);
    });

    it("Enter while in search mode jumps to the next match instead of inserting a newline", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("l"); // matches several spots
      handler.handle("\x06");
      await new Promise((r) => setTimeout(r, 0));

      const lineCountBefore = editor.getLines().length;
      handler.handle("\r");

      expect(editor.getLines().length).toBe(lineCountBefore); // no new line inserted
    });

    it("typing a printable character while in search mode exits search mode first", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("world");
      handler.handle("\x06");
      await new Promise((r) => setTimeout(r, 0));
      expect(handler.isSearchMode).toBe(true);

      handler.handle("Z");

      expect(handler.isSearchMode).toBe(false);
    });

    it("Escape exits search mode and clears the search manager", async () => {
      vi.mocked(getSearchQuery).mockResolvedValue("world");
      handler.handle("\x06");
      await new Promise((r) => setTimeout(r, 0));

      handler.handle("\x1B");

      expect(handler.isSearchMode).toBe(false);
      expect(handler.searchManager.hasMatches()).toBe(false);
    });
  });

  describe("findNextMatch", () => {
    it("cycles the cursor through subsequent matches", () => {
      handler.searchManager.search(editor.getLines(), "l");
      const first = handler.searchManager.getCurrentMatch()!;

      handler.findNextMatch();

      const cursor = editor.getCursor();
      expect(cursor).not.toEqual({ x: first.col, y: first.line });
    });
  });

  describe("handleSave (Ctrl+S)", () => {
    it("calls saveSnapshot with the editor's current directory", async () => {
      const saveSpy = vi
        .spyOn(editor, "saveSnapshot")
        .mockResolvedValue(undefined);

      handler.handle("\x13");
      await new Promise((r) => setTimeout(r, 0));

      expect(saveSpy).toHaveBeenCalledWith(editor.getCurrentDir());
    });

    it("input is ignored while a filename is being captured", async () => {
      // Make saveSnapshot hang so isCapturingFilename stays true long enough to test
      let resolveSave: () => void;
      vi.spyOn(editor, "saveSnapshot").mockImplementation(
        () => new Promise((resolve) => (resolveSave = resolve as any))
      );

      handler.handle("\x13"); // starts the (pending) save
      const before = editor.getLines()[0];
      handler.handle("X"); // should be ignored while capturing filename
      expect(editor.getLines()[0]).toBe(before);

      resolveSave!();
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
