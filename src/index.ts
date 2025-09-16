import { stdin, stdout } from "node:process";
import { styleText } from "node:util";

let lines: string[] = [""];
let cursorX = 0,
  cursorY = 0;

let lineNo = 1;

let undoStack: (typeof lines)[] = [];
let redoStack: typeof undoStack = [];
// TODO: read files from disk to the editor.

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");
stdin.on("keypress", (char, key) => {
  if (key && key.ctrl && key.name === "c") {
    killEditor();
  }
  if (key.name === "enter") {
    killEditor();
  }
});

//Util functions

function killEditor() {
  stdin.setRawMode(false);
  stdin.pause();
  stdout.write("\x1Bc");
  process.exit(0);
}

function colorText(color: string, text: string) {
  return styleText([color as any], text);
}

function insertNewLine() {
  const currentLine = lines[cursorY];
  const beforeCursor = currentLine?.slice(0, cursorX);
  const afterCursor = currentLine?.slice(cursorX);
  lines[cursorY] = beforeCursor!;
  lines.splice(cursorY + 1, 0, afterCursor!);
  cursorY++;
  cursorX = 0;
  return stdout.write(`\n${colorText("yellow", `${lineNo++}`)} `);
}

function insertChar(char: string) {
  const line = lines[cursorY];
  lines[cursorY] = line?.slice(0, cursorX) + char + line?.slice(cursorX + 1);
  cursorX++;
  undoStack.push([...lines]);
  stdout.write(char);
}

function deleteChar() {
  if (cursorX > 0) {
    const line = lines[cursorY] as string;
    lines[cursorY] = line.slice(0, cursorX - 1) + line.slice(cursorX);
    cursorX--;
  } else if (cursorY > 0) {
    const currentLine = lines[cursorY];
    const prevLine = lines[cursorY - 1] as string;
    cursorX = prevLine.length;
    lines[cursorY - 1] = prevLine + currentLine;
    lines.splice(cursorY, 1);
    cursorY--;
  }
}

function moveCursor(direction: string) {
  switch (direction) {
    case "up":
      if (cursorY > 0) {
        cursorY--;
        cursorX = Math.min(cursorX, lines[cursorY]!.length);
      }
      break;
    case "down":
      if (cursorY < lines.length - 1) {
        cursorY++;
        cursorX = Math.min(cursorX, lines[cursorY]!.length);
      }
      break;
    case "left":
      if (cursorX > 0) {
        cursorX--;
      } else if (cursorY > 0) {
        cursorY--;
        cursorX = lines[cursorY]!.length;
      }
      break;
    case "right":
      if (cursorX < lines[cursorY]!.length) {
        cursorX++;
      } else if (cursorY < lines.length - 1) {
        cursorY++;
        cursorX = 0;
      }
      break;
  }
}

function renderScreen(lines: string[]) {
  stdout.write("\x1Bc"); // clear screen
  stdout.write("\x1b[H"); // move cursor to home

  for (let i = 0; i < lines.length; i++) {
    const lineNum = styleText(["yellow"], `${i + 1} `);
    stdout.write(lineNum);
    stdout.write(lines[i]!);
    if (i < lines.length - 1) stdout.write("\n");
  }

  // Position cursor
  const targetLine = cursorY + 1;
  const targetCol = cursorX + `${cursorY + 1} `.length + 1;
  stdout.write(`\x1b[${targetLine};${targetCol}H`);
}

function undo() {
  const prevSnapshot = undoStack.pop() as string[];
  redoStack.push(prevSnapshot);
  renderScreen(prevSnapshot!);
  cursorX--;
}

function redo() {
  const prevSnapshot = undoStack.pop() as string[];
  renderScreen(prevSnapshot!);
  cursorX++;
}

renderScreen(lines);

stdin.on("data", (data) => {
  const char = data.toString();

  if (char === "\x03") {
    // Ctrl+C
    killEditor();
  } else if (char === "\r" || char === "\n") {
    // Enter
    insertNewLine();
    renderScreen(lines);
  } else if (char === "\x7F") {
    // Backspace
    deleteChar();
    renderScreen(lines);
  } else if (char === "\x1b[A") {
    // Up arrow
    moveCursor("up");
    renderScreen(lines);
  } else if (char === "\x1b[B") {
    // Down arrow
    moveCursor("down");
    renderScreen(lines);
  } else if (char === "\x1b[C") {
    // Right arrow
    moveCursor("right");
    renderScreen(lines);
  } else if (char === "\x1b[D") {
    // Left arrow
    moveCursor("left");
    renderScreen(lines);
  } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) < 127) {
    // Printable chars
    insertChar(char);
    renderScreen(lines);
  } else if (char === "\x1A") {
    undo();
  } else if (char === "\0x5A") {
    redo();
  }
});
