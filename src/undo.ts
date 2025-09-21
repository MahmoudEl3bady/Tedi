import EditorState from "./EditorState.js";

export class UndoManager {
  private undoStack: any[] = [];
  private redoStack: any[] = [];

  save(state: EditorState): void {
    this.undoStack.push(state.snapshot);
    this.redoStack = [];
  }

  get peak() {
    return this.undoStack.at(-1);
  }
  // TODO: Undo only work with input text. and not working with e.g pasted text.z
  undo(state: EditorState) {
    if (this.undoStack.length === 0) return;
    const snapshot = this.undoStack.pop();
    this.redoStack.push(state.snapshot);
    state.restore(snapshot);
  }

  redo(state: EditorState) {
    if (this.redoStack.length === 0) return;
    const snapshot = this.redoStack.pop();
    this.undoStack.push(state.snapshot);
    state.restore(snapshot);
  }
}
