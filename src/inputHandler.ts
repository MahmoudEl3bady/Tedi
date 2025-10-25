import type EditorState from "./EditorState.js";
import type { Renderer } from "./renderer.js";
import type { UndoManager } from "./undo.js";
import { debounce, getSearchQuery } from "./utilities/utils.js";
import { SearchManager } from "./SearchManager.js";
export class InputHandler {
  private isCapturingFilename = false;
  isSearchMode = false;
  searchManager = new SearchManager();
  constructor(
    private editor: EditorState,
    private undoManager: UndoManager,
    private renderer: Renderer,
    private debouncedSave = debounce(
      () => this.undoManager.save(this.editor),
      500
    )
  ) {}

  handlePasting() {
    this.editor.insertText();
    this.undoManager.save(this.editor);
  }
  handle(char: string) {
    if (this.isCapturingFilename) {
      return;
    }

    const keyBindings: Record<string, () => void | Promise<void>> = {
      "\r": () => this.toggleEnterButton(),
      "\t": () => this.editor.addTabSpace(),
      "\x7F": () => this.editor.deleteChar(),
      "\x1A": () => this.undoManager.undo(this.editor),
      "\x19": () => this.undoManager.redo(this.editor),
      "\x13": () => this.handleSave(), // Ctrl+S
      "\x06": () => this.handleSearch(), // Ctrl-F
      "\x10": () => this.handlePasting(), //Ctrl-P
      "\x1B[A": () => this.editor.moveCursor("up"),
      "\x1B[B": () => {
        this.editor.moveCursor("down");
      },
      "\x1B[C": () => this.editor.moveCursor("right"),
      "\x1B[D": () => this.editor.moveCursor("left"),
    };

    if (keyBindings[char]) {
      keyBindings[char]!();
    } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) < 127) {
      this.editor.insertChar(char);
      this.debouncedSave();
    }

    if (!this.isCapturingFilename) {
      this.renderer.render(this.editor);
    }
  }

  toggleEnterButton() {
    if (this.isSearchMode) {
      this.findNext();
    } else {
      this.editor.insertNewLine();
    }
  }

  private async handleSave() {
    this.isCapturingFilename = true;
    this.renderer.render(this.editor);

    try {
      await this.editor.saveSnapshot(this.editor.getCurrentDir());
    } finally {
      this.isCapturingFilename = false;
      this.renderer.render(this.editor);
    }
  }
  private async handleSearch() {
    const query = await getSearchQuery();
    if (query) {
      this.searchManager.search(this.editor.getLines(), query);
      const firstMatch = this.searchManager.getMatches()[0];
      if (firstMatch) {
        this.editor.cursorY = firstMatch.line;
        this.editor.cursorX = firstMatch.col;
      }
    }
    this.isSearchMode = true;
    this.renderer.render(this.editor);
  }
  findNext() {
    const match = this.searchManager.nextMatch();
    this.editor.cursorY = match!.line;
    this.editor.cursorX = match!.col;
    this.renderer.render(this.editor);
  }
}
