# Tedi Architecture Documentation

## Overview

Tedi is a terminal-based text editor built on clean architectural principles. It follows an MVC-like pattern:

- **Model**: `EditorState` - Document state and operations
- **View**: `Renderer` - Terminal display logic
- **Controller**: `InputHandler` - Input processing

**Architecture Diagram:**

```
┌─────────────────────────────────────────────┐
│              User Input (stdin)             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           InputHandler                      │
│  • Key binding map                          │
│  • Search mode management                   │
│  • Debounced undo saves                     │
└────┬─────────────────────┬──────────────────┘
     │                     │
     ▼                     ▼
┌─────────────┐    ┌──────────────────┐
│ EditorState │    │  SearchManager   │
│  • Lines[]  │    │  • Matches[]     │
│  • Cursor   │    │  • Current index │
│  • Viewport │    └──────────────────┘
└────┬────────┘
     │
     ▼
┌─────────────┐
│ UndoManager │
│  • History  │
└─────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│             Renderer                        │
│  • Viewport rendering                       │
│  • Syntax highlighting                      │
│  • Search match highlighting                │
│  • Status bar                               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│         Terminal (stdout)                   │
└─────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Viewport System

The viewport is a "window" into the document that shows only visible lines:

```
Full Document (1000 lines):
Line 1
Line 2
...
Line 45  ← viewport.start
Line 46  ├─ Visible on screen (23 lines)
Line 47  │
...      │
Line 67  ← viewport.end
Line 68
...
Line 1000
```

**Key Properties:**

```typescript
private viewportStart: number = 0;  // First visible line
```

**Auto-scrolling Logic:**

```typescript
if (cursorY < viewportStart) {
  // Cursor above viewport → scroll up
  viewportStart = cursorY;
} else if (cursorY >= viewportEnd) {
  // Cursor below viewport → scroll down
  viewportStart = cursorY - maxVisibleLines + 1;
}
```

### 2. ANSI Escape Sequences

Tedi uses ANSI codes to control the terminal:

| Code        | Effect                    |
| ----------- | ------------------------- |
| `\x1b[H`    | Move cursor to home (1,1) |
| `\x1b[2J`   | Clear entire screen       |
| `\x1b[2K`   | Clear current line        |
| `\x1b[y;xH` | Move to row y, col x      |
| `\x1b[33m`  | Yellow text               |
| `\x1b[43m`  | Yellow background         |
| `\x1b[0m`   | Reset all formatting      |
| `\x1b[7m`   | Inverse video             |

**Example:**

```typescript
stdout.write("\x1b[1;1H"); // Top-left corner
stdout.write("\x1b[33m"); // Yellow text
stdout.write("Hello"); // Print text
stdout.write("\x1b[0m"); // Reset color
```

### 3. State Snapshots for Undo

Each undo operation stores a complete copy of the state:

```typescript
get snapshot() {
  return {
    lines: [...this.lines],           // Deep copy
    cursorX: this.cursorX,
    cursorY: this.cursorY,
    viewportStart: this.viewportStart,
  };
}
```

---

## Component Architecture

### EditorState

**Responsibilities:**

- Store document lines
- Track cursor position
- Manage viewport
- Handle text modifications
- Track modification status

**Key Methods:**

```typescript
// Editing
insertChar(char: string)           // Insert character at cursor
deleteChar()                       // Delete character before cursor
insertNewLine()                    // Split line at cursor
insertText()                       // Paste from clipboard

// Navigation
moveCursor(direction)              // Move cursor with auto-scroll

// Viewport
private scrollViewport()           // Adjust viewport when cursor moves
getViewport()                      // Get viewport info for renderer

// Persistence
saveSnapshot(dir: string)          // Save to disk
isModified()                       // Check if unsaved changes
```

**State Properties:**

```typescript
private lines: string[] = [""]
private cursorX: number = 0
private cursorY: number = 0
private viewportStart: number = 0
private modified: boolean = false
private fileName: string = ""
```

### Renderer

**Responsibilities:**

- Render visible lines only
- Apply syntax highlighting
- Apply search highlighting
- Draw status bar
- Position cursor

**Rendering Pipeline:**

```typescript
render(state: EditorState) {
  // 1. Calculate viewport
  const viewport = state.getViewport();

  // 2. Get visible lines
  const visibleLines = lines.slice(viewport.start, viewport.end);

  // 3. Apply syntax highlighting (if not searching)
  const highlighted = this.highlightKeywords(visibleLines);

  // 4. Apply search highlighting (if active)
  highlighted.forEach((line, i) => {
    const withSearch = this.highlightSearchMatches(line, i);
    stdout.write(lineNumber + withSearch);
  });

  // 5. Render status bar
  this.renderStatusBar(...);

  // 6. Position cursor
  stdout.write(`\x1b[${displayLine};${displayCol}H`);
}
```

**Syntax Highlighting:**

**Implementation:**

```typescript
private highlightKeywords(lines: string[]) {
  return lines.map(line => {
    // Handle comments first
    if (line.includes("//") || line.includes("#")) {
      const commentIndex = line.indexOf("//");
      const before = line.slice(0, commentIndex);
      const comment = styleText(["gray"], line.slice(commentIndex));
      return highlightWords(before) + comment;
    }

    // Highlight keywords
    return line.split(/\b/)
      .map(word => {
        if (controlKeywords.has(word)) return styleText(["magenta"], word);
        if (declarationKeywords.has(word)) return styleText(["cyan"], word);
        if (valueKeywords.has(word)) return styleText(["yellow"], word);
        return word;
      })
      .join("");
  });
}
```

**Status Bar:**

Features:

- Color-coded modification indicator (● green/red)
- File name in cyan
- Position in yellow (line:column)
- Line count in magenta
- Dark gray background

```typescript
private renderStatusBar(fileName, cursor, totalLines, modified) {
  const indicator = modified
    ? styleText(["red", "bold"], " ●")
    : styleText(["green"], " ●");

  const leftSide = indicator + styleText(["cyan", "bold"], ` ${fileName}`);
  const rightSide = styleText(["yellow"], ` ${cursor.y}:${cursor.x}`)
                  + styleText(["magenta"], ` ${totalLines} lines`);

  // Render with dark background
  stdout.write("\x1b[48;5;236m" + leftSide + padding + rightSide + "\x1b[0m");
}
```

### SearchManager

**Responsibilities:**

- Find all matches in document
- Track current match index
- Navigate between matches

**Data Structure:**

```typescript
private query: string = "";
private matches: Array<{line: number, col: number}> = [];
private currentMatchIndex: number = -1;
```

**Search Algorithm:**

```typescript
search(lines: string[], query: string) {
  this.clear();
  const lowerQuery = query.toLowerCase();

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = stripAnsi(lines[lineNum]);  // Remove color codes
    const lowerLine = line.toLowerCase();

    let col = lowerLine.indexOf(lowerQuery);
    while (col !== -1) {
      this.matches.push({ line: lineNum, col });
      col = lowerLine.indexOf(lowerQuery, col + query.length);
    }
  }

  this.currentMatchIndex = this.matches.length > 0 ? 0 : -1;
}
```

**Why stripAnsi?** Because syntax highlighting adds ANSI codes to the text. Without stripping them, searching for "const" wouldn't find `\x1b[36mconst\x1b[0m`.

### InputHandler

**Responsibilities:**

- Map keystrokes to actions
- Manage search mode
- Debounce undo saves
- Handle special modes (save prompt, search prompt)

**Key Binding System:**

```typescript
const keyBindings: Record<string, () => void> = {
  "\r": () => this.toggleEnterButton(), // Enter
  "\t": () => this.editor.addTabSpace(), // Tab
  "\x7F": () => this.editor.deleteChar(), // Backspace
  "\x1A": () => this.undoManager.undo(), // Ctrl+Z
  "\x19": () => this.undoManager.redo(), // Ctrl+Y
  "\x13": () => this.handleSave(), // Ctrl+S
  "\x06": () => this.handleSearch(), // Ctrl+F
  "\x10": () => this.handlePasting(), // Ctrl+P
  "\x1B": () => this.exitSearchMode(), // ESC
  "\x1B[A": () => this.editor.moveCursor("up"),
};
```

**Search Mode:**

```typescript
private async handleSearch() {
  const query = await getSearchQuery();  // Prompt user

  if (query) {
    this.searchManager.search(lines, query);
    const firstMatch = this.searchManager.getMatches()[0];

    if (firstMatch) {
      this.editor.cursorY = firstMatch.line;
      this.editor.cursorX = firstMatch.col;
      this.isSearchMode = true;
    }
  }

  this.renderer.render(this.editor);
}
```

**Debounced Undo:**

```typescript
private debouncedSave = debounce(
  () => this.undoManager.save(this.editor),
  500  // Wait 500ms after last keystroke
);

// On each character typed:
this.editor.insertChar(char);
this.debouncedSave();  // Reset timer
```

This groups rapid typing into single undo operations.

### UndoManager

**Responsibilities:**

- Maintain undo history
- Maintain redo history
- Limit stack size

**Implementation:**

```typescript
save(state: EditorState) {
  if (this.undoStack.length > 100) {
    this.undoStack.shift();  // Prevent memory leak
  }
  this.undoStack.push(state.snapshot);
  this.redoStack = [];  // Clear redo on new edit
}

undo(state: EditorState) {
  if (this.undoStack.length === 0) return;

  const snapshot = this.undoStack.pop();
  this.redoStack.push(state.snapshot);
  state.restore(snapshot);
}
```

---

## Data Flow

### Complete Flow Example: Typing 'a'

```
1. User presses 'a' key
   ↓
2. Terminal sends keystroke to stdin
   ↓
3. index.ts captures: stdin.on("data", ...)
   ↓
4. InputHandler.handle('a') called
   ↓
5. Check keyBindings['a'] → not found
   ↓
6. Check if printable char → yes (ASCII 97)
   ↓
7. editor.insertChar('a')
   • lines[cursorY] = before + 'a' + after
   • cursorX++
   • modified = true
   ↓
8. debouncedSave() called
   • Start 500ms timer
   • If no more keys, save undo snapshot
   ↓
9. renderer.render(editor) called
   ↓
10. Renderer gets state:
    • lines = ["...a..."]
    • cursor = {x: 4, y: 0}
    • viewport = {start: 0, end: 23}
    ↓
11. Render visible lines with highlighting
    ↓
12. Render status bar (shows modified = true)
    ↓
13. Position cursor at display position
    ↓
14. User sees 'a' appear with cursor after it
```

---

## Key Features Implementation

### Feature 1: Viewport Scrolling

**Problem:** Terminal has limited height (typically 24 lines)

**Solution:** Track which lines are visible and scroll viewport when cursor moves

**Implementation:**

```typescript
// In EditorState
private scrollViewport() {
  const maxLines = process.stdout.rows - 2;  // Reserve status bar
  const viewportEnd = this.viewportStart + maxLines;

  if (this.cursorY < this.viewportStart) {
    // Scrolled above visible area
    this.viewportStart = this.cursorY;
  } else if (this.cursorY >= viewportEnd) {
    // Scrolled below visible area
    this.viewportStart = this.cursorY - maxLines + 1;
  }

  // Clamp to valid range
  this.viewportStart = Math.max(0, this.viewportStart);
  const maxStart = Math.max(0, this.lines.length - maxLines);
  this.viewportStart = Math.min(this.viewportStart, maxStart);
}
```

**Called After:**

- Cursor movement
- Line insertion/deletion
- Paste operations

### Feature 2: Search with Highlighting

**Flow:**

```
1. User presses Ctrl+F
   ↓
2. Prompt appears at bottom: "Search: _"
   ↓
3. User types query and presses Enter
   ↓
4. SearchManager.search() finds all matches
   ↓
5. Cursor jumps to first match
   ↓
6. Renderer highlights all matches:
   • Current match: yellow background
   • Other matches: cyan background
   ↓
7. User presses Enter to cycle through matches
   ↓
8. User presses ESC to exit search mode
```

**Highlighting Logic:**

```typescript
private highlightSearchMatches(line: string, lineIndex: number): string {
  const matches = this.searchManager.getMatchesForLine(lineIndex);
  const currentMatch = this.searchManager.getCurrentMatch();
  const query = this.searchManager.getQuery();

  let result = "";
  let lastIndex = 0;

  matches.forEach(match => {
    // Add text before match
    result += line.slice(lastIndex, match.col);

    // Highlight the match
    const matchText = line.slice(match.col, match.col + query.length);
    const isCurrentMatch = currentMatch?.line === lineIndex
                        && currentMatch?.col === match.col;

    if (isCurrentMatch) {
      result += styleText(["bgYellow", "black", "bold"], matchText);
    } else {
      result += styleText(["bgCyan", "black"], matchText);
    }

    lastIndex = match.col + query.length;
  });

  // Add remaining text
  result += line.slice(lastIndex);
  return result;
}
```

### Feature 3: Clipboard Paste

**Implementation:**

```typescript
// In EditorState
insertText() {
  const text = clipboard.readSync();  // Uses clipboardy package
  const pastedLines = text.split("\n");

  // Insert pasted lines at cursor position
  const before = this.lines.slice(0, this.cursorY);
  const after = this.lines.slice(this.cursorY + 1);

  this.lines = [...before, ...pastedLines, ...after];
  this.cursorY += pastedLines.length;
  this.scrollViewport();
}
```

**Triggered by:** Ctrl+P (not Ctrl+V, which terminal intercepts)

### Feature 4: File Persistence

**Save Flow:**

```typescript
async saveSnapshot(currentDir: string) {
  // 1. Get filename (from args or prompt)
  if (!this.fileName) {
    this.fileName = await getFilename();
  }

  // 2. Write to disk
  const filePath = path.join(currentDir, this.fileName);
  writeFileLineByLine(filePath, this.lines);

  // 3. Update state
  this.modified = false;
  this.savedLines = [...this.lines];

  // 4. Show success message
  stdout.write("\x1b[32m✓ Saved\x1b[0m");
}
```

**Load Flow:**

```typescript
// In index.ts
async function loadFile(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  rl.on("line", (line) => lines.push(line));
  rl.on("close", () => resolve(lines.length > 0 ? lines : [""]));
}
```

---

## Design Patterns

### 1. MVC (Model-View-Controller)

```
Model (EditorState):
  - Document data
  - Business logic

View (Renderer):
  - Display logic
  - No state modification

Controller (InputHandler):
  - User input
  - Coordinate model & view
```

### 2. Memento (Undo/Redo)

```typescript
// Memento = snapshot
const snapshot = state.snapshot;

// Originator = EditorState
state.insertChar("x");

// Caretaker = UndoManager
undoManager.save(state);

// Restore
state.restore(snapshot);
```

### 3. Command (Key Bindings)

```typescript
const commands = {
  "\x13": () => this.save(), // Each key maps to a command
  "\x06": () => this.search(),
};
```

### 4. Observer (Implicit)

```typescript
// State changes trigger re-render
this.editor.insertChar("a"); // Change state
this.renderer.render(editor); // Observe & update
```

---

## Performance Optimizations

### 1. Viewport Rendering

**Without optimization:**

```typescript
lines.forEach((line) => render(line)); // Render 10,000 lines
```

**With optimization:**

```typescript
const visible = lines.slice(viewport.start, viewport.end);
visible.forEach((line) => render(line)); // Render 23 lines
```

**Impact:** 400x reduction in rendering work for large files

### 2. Debounced Undo

**Without debounce:**

```
Type "hello" → 5 undo snapshots
Undo → "hell"
Undo → "hel"
Undo → "he"
Undo → "h"
Undo → ""
```

**With debounce (500ms):**

```
Type "hello" → wait 500ms → 1 undo snapshot
Undo → ""
```

**Impact:** 80% reduction in memory usage for undo

### 3. ANSI Code Stripping

**Problem:** Search needs to find text, but text has color codes

**Solution:**

```typescript
const stripAnsi = (s: string) => s.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");

// Search on clean text
const cleanLine = stripAnsi(highlightedLine);
const match = cleanLine.indexOf(query);
```

### 4. Undo Stack Limit

```typescript
if (this.undoStack.length > 100) {
  this.undoStack.shift(); // Remove oldest
}
```

Prevents unbounded memory growth on long editing sessions.

---

---

### Key Takeaways

- **Viewport** enables handling large files
- **ANSI codes** provide direct terminal control
- **Snapshots** enable undo/redo
- **Debouncing** optimizes undo and performance
- **Separation** makes code maintainable

This architecture provides a solid foundation for a feature-rich terminal editor while remaining simple enough to understand and extend.
