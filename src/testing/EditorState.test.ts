import { describe, it, expect, beforeEach } from "vitest";
import EditorState from "../EditorState.js";

describe("EditorState", () => {
  let editor: EditorState;

  beforeEach(() => {
    editor = new EditorState(["hello world", "second line"]);
  });

  describe("insertChar", () => {
    it("inserts character at cursor position", () => {
      editor.insertChar("X");
      expect(editor.getLines()[0]).toBe("Xhello world");
      expect(editor.getCursor()).toEqual({ x: 1, y: 0 });
    });

    it("inserts in middle of line", () => {
      for (let i = 0; i < 5; i++) editor.moveCursor("right");

      editor.insertChar("X");
      expect(editor.getLines()[0]).toBe("helloX world");
      expect(editor.getCursor()).toEqual({ x: 6, y: 0 });
    });

    it("marks file as modified", () => {
      expect(editor.isModified()).toBe(false);
      editor.insertChar("X");
      expect(editor.isModified()).toBe(true);
    });
  });

  describe("deleteChar", () => {
    it("deletes character before cursor", () => {
      editor.moveCursor("right");
      editor.deleteChar();

      expect(editor.getLines()[0]).toBe("ello world");
      expect(editor.getCursor()).toEqual({ x: 0, y: 0 });
    });

    it("joins lines when deleting at start of line", () => {
      editor.moveCursor("down");
      editor.deleteChar();

      expect(editor.getLines()).toEqual(["hello worldsecond line"]);
      expect(editor.getCursor()).toEqual({ x: 11, y: 0 });
    });

    it("does nothing at start of first line", () => {
      editor.deleteChar();

      expect(editor.getLines()).toEqual(["hello world", "second line"]);
      expect(editor.getCursor()).toEqual({ x: 0, y: 0 });
    });
  });

  describe("insertNewLine", () => {
    it("splits line at cursor", () => {
      for (let i = 0; i < 5; i++) editor.moveCursor("right");

      editor.insertNewLine();

      expect(editor.getLines()).toEqual(["hello", " world", "second line"]);
      expect(editor.getCursor()).toEqual({ x: 0, y: 1 });
    });

    it("creates empty line at end", () => {
      editor.moveCursor("right");
      for (let i = 0; i < 11; i++) editor.moveCursor("right");

      editor.insertNewLine();

      expect(editor.getLines()[0]).toBe("hello world");
      expect(editor.getLines()[1]).toBe("");
    });
  });

  describe("moveCursor", () => {
    it("moves right within line", () => {
      editor.moveCursor("right");
      expect(editor.getCursor()).toEqual({ x: 1, y: 0 });
    });

    it("wraps to next line at end", () => {
      for (let i = 0; i < 11; i++) editor.moveCursor("right");
      editor.moveCursor("right");

      expect(editor.getCursor()).toEqual({ x: 0, y: 1 });
    });

    it("moves to end of previous line when moving left at start", () => {
      editor.moveCursor("down");
      editor.moveCursor("left");

      expect(editor.getCursor()).toEqual({ x: 11, y: 0 });
    });

    it("adjusts column when moving to shorter line", () => {
      for (let i = 0; i < 11; i++) editor.moveCursor("right");

      editor.moveCursor("down");

      expect(editor.getCursor()).toEqual({ x: 11, y: 1 });
    });
  });

  describe("snapshot and restore", () => {
    it("creates snapshot of current state", () => {
      editor.insertChar("X");
      const snapshot = editor.snapshot;

      expect(snapshot.lines).toEqual(["Xhello world", "second line"]);
      expect(snapshot.cursorX).toBe(1);
      expect(snapshot.cursorY).toBe(0);
    });

    it("restores previous state", () => {
      const snapshot = editor.snapshot;

      editor.insertChar("X");
      editor.insertChar("Y");

      editor.restore(snapshot);

      expect(editor.getLines()).toEqual(["hello world", "second line"]);
      expect(editor.getCursor()).toEqual({ x: 0, y: 0 });
    });

    it("creates deep copy (not reference)", () => {
      const snapshot = editor.snapshot;

      editor.insertChar("X");

      expect(snapshot.lines).toEqual(["hello world", "second line"]);
    });
  });
});
