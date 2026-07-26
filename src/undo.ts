import EditorState, { type Snapshot } from "./EditorState.js";

export class UndoManager {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  save(state: EditorState): void {
    if (this.undoStack.length >= 100) {
      this.undoStack.shift();
    }
    this.undoStack.push(state.snapshot);
    this.redoStack = [];
  }

  get peak() {
    return this.undoStack.at(-1);
  }
  undo(state: EditorState) {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return;
    this.redoStack.push(state.snapshot);
    state.restore(snapshot);
  }

  redo(state: EditorState) {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return;
    this.undoStack.push(state.snapshot);
    state.restore(snapshot);
  }
}
