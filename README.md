# Tedi

A terminal text editor I built to understand how editors work under the hood. It's built from scratch using Node.js and TypeScript and handles the basics of terminal-based editors.

![tedi-demo](https://github.com/user-attachments/assets/cc9d853f-6e24-4ec0-a0db-b7de9cd5a4c8)

## What It Does

**Text editing basics**

- Smooth scrolling through files of any size
- Undo/redo with Ctrl+Z and Ctrl+Y
- Line numbers that adjust to file size

**Search**

- Press Ctrl+F to search
- All matches show in cyan, current match in yellow
- Press Enter to jump between results
- ESC to clear and go back to editing

**Syntax highlighting**

- Keywords colored by type (control flow, declarations, values)
- Comments in gray
- Works with JavaScript, TypeScript, Python, C/C++

**Status bar**

- Shows filename and whether you have unsaved changes
- Current line and column
- Total line count

## How It's Built

The project follows a simple MVC-like structure:

- **EditorState** - Manages the document and cursor
- **Renderer** - Handles drawing to the terminal
- **InputHandler** - Processes keyboard input
- **SearchManager** - Finds and tracks search matches
- **UndoManager** - Maintains edit history

I built it this way because it makes the code easier to test and modify. Each piece does one thing, so adding features doesn't break existing ones.

## Why I Built This

I wanted to understand:

- How terminal applications work at a low level
- Text editor architecture and state management
- Real-time rendering and performance optimization
- How to build a challenging project from scratch without AI help and force my self to think in problems that i don't have any idea how to solve it.

## Keyboard Shortcuts

| Key    | Action                                 |
| ------ | -------------------------------------- |
| Ctrl+S | Save                                   |
| Ctrl+F | Search                                 |
| Enter  | Next match (in search mode) / new line |
| ESC    | Exit search                            |
| Ctrl+Z | Undo                                   |
| Ctrl+Y | Redo                                   |
| Ctrl+P | Paste                                  |
| Ctrl+C | Quit                                   |
| Tab    | Insert spaces                          |

## Installation

```bash
git clone https://github.com/MahmoudEl3bady/tedi.git
cd tedi
pnpm install
pnpm dev <filename>
```

## Usage

Open a file:

```bash
pnpm dev test.js
```

Start with a new file:

```bash
pnpm dev
```

## Technical Details

For implementation details, see [ARCHITECTURE.md](docs/Architecture.md). It covers:

- The design patterns used
- How viewport scrolling works
- Search highlighting implementation
- Syntax highlighting system
- Undo/redo with snapshots

---
