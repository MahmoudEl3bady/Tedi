import type EditorState from "./EditorState.js";
import type { Renderer } from "./renderer.js";
import type { UndoManager } from "./undo.js";

export class InputHandler {
  constructor(
    private editor: EditorState,
    private undoManager: UndoManager,
    private renderer: Renderer
  ) {}

  handle(char: string) {
    const keyBindings: Record<string, () => void> = {
      "\r": () => this.editor.insertNewLine(),
      "\x7F": () => this.editor.deleteChar(),
      "\x1A": () => this.undoManager.undo(this.editor), // Ctrl+Z
      "\x19": () => this.undoManager.redo(this.editor), // Ctrl+Y
      "\x1B[A": () => this.editor.moveCursor("up"),
      "\x1B[B": () => this.editor.moveCursor("down"),
      "\x1B[C": () => this.editor.moveCursor("right"),
      "\x1B[D": () => this.editor.moveCursor("left"),
    };

    if (keyBindings[char]) {
      keyBindings[char]!();
    } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) < 127) {
      this.editor.insertChar(char);
      // TODO: save a snapshot every 1 second
      this.undoManager.save(this.editor);
    }

    this.renderer.render(this.editor);
  }
}
