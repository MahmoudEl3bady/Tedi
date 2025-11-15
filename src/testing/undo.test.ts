import { describe, it, expect, beforeEach } from "vitest";
import EditorState from "../EditorState.js";
import { UndoManager } from "../undo.js";

describe("UndoManager", () => {
  let editor: EditorState;
  let undoManager: UndoManager;

  beforeEach(() => {
    editor = new EditorState(["hello"]);
    undoManager = new UndoManager();
  });

  describe("undo", () => {
    it("restores previous state", () => {
      undoManager.save(editor);
      editor.insertChar("X");

      undoManager.undo(editor);

      expect(editor.getLines()).toEqual(["hello"]);
    });

    it("works with multiple undos", () => {
      undoManager.save(editor);
      editor.insertChar("X");

      undoManager.save(editor);
      editor.insertChar("Y");

      undoManager.undo(editor);
      expect(editor.getLines()).toEqual(["Xhello"]);

      undoManager.undo(editor);
      expect(editor.getLines()).toEqual(["hello"]);
    });

    it("does nothing when undo stack is empty", () => {
      undoManager.undo(editor);
      expect(editor.getLines()).toEqual(["hello"]);
    });
  });

  describe("redo", () => {
    it("restores undone state", () => {
      undoManager.save(editor);
      editor.insertChar("X");
      undoManager.undo(editor);

      undoManager.redo(editor);

      expect(editor.getLines()).toEqual(["Xhello"]);
    });
  });

  describe("stack limit", () => {
    it("limits undo stack to 100 items", () => {
      for (let i = 0; i < 101; i++) {
        undoManager.save(editor);
        editor.insertChar("X");
      }

      let undoCount = 0;
      for (let i = 0; i < 101; i++) {
        const before = editor.getLines()[0];
        undoManager.undo(editor);
        const after = editor.getLines()[0];
        if (before !== after) undoCount++;
      }

      expect(undoCount).toBe(100);
    });
  });
});
