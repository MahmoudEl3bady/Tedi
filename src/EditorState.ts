import { getFilename, writeFileLineByLine } from "./utilities/utils.js";
import { argv } from "node:process";
import clipboard from "clipboardy";
import path from "node:path";

export default class EditorState {
  private lines: string[] = [""];
  private cursorX: number;
  private cursorY: number;
  private currentDir: string = "";
  private fileName: string = "";
  private viewportStart: number = 0;

  constructor(lines: string[], currentDir?: string) {
    this.lines = lines;
    this.cursorX = 0;
    this.cursorY = 0;
    if (currentDir) {
      this.currentDir = currentDir;
    }
  }

  get snapshot() {
    return {
      lines: [...this.lines],
      cursorX: this.cursorX,
      cursorY: this.cursorY,
      viewportStart: this.viewportStart,
    };
  }

  restore(snapshot: {
    lines: string[];
    cursorX: number;
    cursorY: number;
    viewportStart?: number;
  }) {
    const { lines, cursorX, cursorY, viewportStart } = snapshot;
    this.lines = [...lines];
    this.cursorX = cursorX;
    this.cursorY = cursorY;
    if (viewportStart !== undefined) {
      this.viewportStart = viewportStart;
    }
  }

  private getMaxVisibleLines(): number {
    const rows = process.stdout.rows || 24;
    return rows - 1;
  }

  private getViewportEnd(): number {
    return Math.min(
      this.viewportStart + this.getMaxVisibleLines(),
      this.lines.length
    );
  }

  private scrollViewport() {
    const maxVisibleLines = this.getMaxVisibleLines();
    const viewportEnd = this.getViewportEnd();

    if (this.cursorY < this.viewportStart) {
      this.viewportStart = this.cursorY;
    } else if (this.cursorY >= viewportEnd) {
      this.viewportStart = this.cursorY - maxVisibleLines + 1;
    }

    this.viewportStart = Math.max(0, this.viewportStart);

    const maxStart = Math.max(0, this.lines.length - maxVisibleLines);
    this.viewportStart = Math.min(this.viewportStart, maxStart);
  }

  insertChar(char: string) {
    const line = this.lines[this.cursorY];
    this.lines[this.cursorY] =
      line?.slice(0, this.cursorX) + char + line?.slice(this.cursorX);
    this.cursorX++;
  }

  insertText() {
    const text = clipboard.readSync();
    const copiedTextLines = text.split("\n");
    const width = process.stdout.columns;
    const currentLineContent = this.lines[this.cursorY]?.slice(
      0,
      this.cursorX + 1
    );
    //TODO :split line if it bigger than window width.
    const beforeCurr = this.lines.slice(0, this.cursorY);
    const afterCurr = this.lines.slice(this.cursorY + 1);
    this.lines = [...beforeCurr, ...copiedTextLines, ...afterCurr];
    this.cursorY += copiedTextLines.length;
    this.scrollViewport();
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
      this.scrollViewport();
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
    this.scrollViewport();
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
          this.scrollViewport();
        }
        break;
      case "down":
        if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = Math.min(
            this.cursorX,
            this.lines[this.cursorY]!.length
          );
          this.scrollViewport();
        }
        break;
      case "left":
        if (this.cursorX > 0) {
          this.cursorX--;
        } else if (this.cursorY > 0) {
          this.cursorY--;
          this.cursorX = this.lines[this.cursorY]!.length;
          this.scrollViewport();
        }
        break;
      case "right":
        if (this.cursorX < this.lines[this.cursorY]!.length) {
          this.cursorX++;
        } else if (this.cursorY < this.lines.length - 1) {
          this.cursorY++;
          this.cursorX = 0;
          this.scrollViewport();
        }
        break;
    }
  }

  async saveSnapshot(currentDir: string) {
    let filePath: string;

    if (argv[2]) {
      this.fileName = argv[2];
    }

    if (!this.fileName) {
      this.fileName = await getFilename();
    }
    filePath = path.join(currentDir, this.fileName);

    try {
      writeFileLineByLine(filePath, this.lines);

      const rows = process.stdout.rows || 24;
      process.stdout.write(`\x1b[${rows};1H\x1b[2K`);
      process.stdout.write(
        `\x1b[32m✓ Saved to ${path.basename(filePath)}\x1b[0m`
      );

      setTimeout(() => {
        process.stdout.write(`\x1b[${rows};1H\x1b[2K`);
      }, 2000);
    } catch (error) {
      const rows = process.stdout.rows || 24;
      process.stdout.write(`\x1b[${rows};1H\x1b[2K`);
      process.stdout.write(
        `\x1b[31m✗ Error saving file: ${(error as Error).message}\x1b[0m`
      );
    }
  }

  getCurrentDir() {
    return this.currentDir;
  }

  getLines() {
    return this.lines;
  }

  getCursor() {
    return { x: this.cursorX, y: this.cursorY };
  }

  getViewport() {
    return {
      start: this.viewportStart,
      end: this.getViewportEnd(),
      maxVisibleLines: this.getMaxVisibleLines(),
    };
  }

  addTabSpace() {
    const line = this.lines[this.cursorY] || "";
    this.lines[this.cursorY] =
      line.slice(0, this.cursorX) + "    " + line.slice(this.cursorX);
    this.cursorX += 4;
  }
}
