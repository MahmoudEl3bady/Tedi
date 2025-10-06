import type EditorState from "./EditorState.js";
import type { Renderer } from "./renderer.js";
import type { UndoManager } from "./undo.js";
import { debounce } from "./utilities/utils.js";

export class InputHandler {
  constructor(
    private editor: EditorState,
    private undoManager: UndoManager,
    private renderer: Renderer,
    private debouncedSave = debounce(
      () => this.undoManager.save(this.editor),
      500
    )
  ) {}

  handle(char: string) {
    const keyBindings: Record<string, () => void> = {
      "\r": () => this.editor.insertNewLine(),
      "\t": () => this.editor.addTabSpace(),
      "\x7F": () => this.editor.deleteChar(),
      "\x1A": () => this.undoManager.undo(this.editor), // Ctrl+Z
      "\x19": () => this.undoManager.redo(this.editor), // Ctrl+Y
      "\x13": () => this.editor.saveSnapshot(this.editor.getCurrentDir()),
      "\x1B[A": () => this.editor.moveCursor("up"),
      "\x1B[B": () => this.editor.moveCursor("down"),
      "\x1B[C": () => this.editor.moveCursor("right"),
      "\x1B[D": () => this.editor.moveCursor("left"),
    };

    if (keyBindings[char]) {
      keyBindings[char]!();
    } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) < 127) {
      this.editor.insertChar(char);
      this.debouncedSave();
    }

    this.renderer.render(this.editor);
  }
}
