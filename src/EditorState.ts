import { writeFileLineByLine } from "./utilities/utils.js";

export default class EditorState {
  private lines: string[] = [""];
  private cursorX: number;
  private cursorY: number;
  private filePath: string = "";

  constructor(lines: string[], filePath?: string) {
    this.lines = lines;
    this.cursorX = 0;
    this.cursorY = 0;
    if (filePath) {
      this.filePath = filePath;
    }
  }

  get snapshot() {
    return {
      lines: [...this.lines],
      cursorX: this.cursorX,
      cursorY: this.cursorY,
    };
  }
  getFilePath() {
    return this.filePath;
  }
  restore(snapshot: { lines: string[]; cursorX: number; cursorY: number }) {
    const { lines, cursorX, cursorY } = snapshot;
    this.lines = [...lines];
    this.cursorX = cursorX;
    this.cursorY = cursorY;
  }

  insertChar(char: string) {
    const line = this.lines[this.cursorY];
    this.lines[this.cursorY] =
      line?.slice(0, this.cursorX) + char + line?.slice(this.cursorX);
    this.cursorX++;
  }
  deleteChar() {
    if (this.cursorX > 0) {
      const line = this.lines[this.cursorY] as string;
      this.lines[this.cursorY] =
        line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
      this.cursorX--;
    } else if (this.cursorY > 0) {
      const currentLine = this.lines[this.cursorY];
      const prevLine = this.lines[this.cursorY - 1] as string;
      this.cursorX = prevLine.length;
      this.lines[this.cursorY - 1] = prevLine + currentLine;
      this.lines.splice(this.cursorY, 1);
      this.cursorY--;
    }
  }
  insertNewLine() {
    const currentLine = this.lines[this.cursorY];
    const beforeCursor = currentLine?.slice(0, this.cursorX);
    const afterCursor = currentLine?.slice(this.cursorX);
    this.lines[this.cursorY] = beforeCursor!;
    this.lines.splice(this.cursorY + 1, 0, afterCursor!);
    this.cursorY++;
    this.cursorX = 0;
  }
  moveCursor(direction: "up" | "down" | "left" | "right") {
    switch (direction) {
      case "up":
        if (this.cursorY > 0) {
          this.cursorY--;
          this.cursorX = Math.min(
            this.cursorX,
            this.lines[this.cursorY]!.length
          );
        }
        break;
      case "down":
        if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = Math.min(
            this.cursorX,
            this.lines[this.cursorY]!.length
          );
        }
        break;
      case "left":
        if (this.cursorX > 0) {
          this.cursorX--;
        } else if (this.cursorY > 0) {
          this.cursorY--;
          this.cursorX = this.lines[this.cursorY]!.length;
        }
        break;
      case "right":
        if (this.cursorX < this.lines[this.cursorY]!.length) {
          this.cursorX++;
        } else if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = 0;
        }
        break;
    }
  }

  saveSnapshot(filePath: string) {
    // TODO: use terminal-kit for alerts and toast messages.
    writeFileLineByLine(filePath, this.lines);
  }

  getLines() {
    return this.lines;
  }
  getCursor() {
    return { x: this.cursorX, y: this.cursorY };
  }
}
