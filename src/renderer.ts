import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";
import type { SearchManager } from "./SearchManager.js";

export class Renderer {
  private searchManager: SearchManager | null = null;

  setSearchManager(manager: SearchManager | null) {
    this.searchManager = manager;
  }

  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();
    const viewport = state.getViewport();
    const rows = stdout.rows || 24;
    const maxLines = rows - 1;
    const lineNumWidth = String(lines.length).length;

    // Save cursor position
    stdout.write("\x1b[s");

    // Clear the screen area
    stdout.write("\x1b[H");
    for (let i = 0; i < maxLines; i++) {
      stdout.write("\x1b[2K");
      if (i < maxLines - 1) stdout.write("\n");
    }

    stdout.write("\x1b[H");

    let visibleLines = lines.slice(viewport.start, viewport.end);
    const displayedLines = this.searchManager?.hasMatches()
      ? visibleLines
      : this.highlightKeywords(visibleLines);
    displayedLines.forEach((line, i) => {
      const actualLineNum = viewport.start + i + 1;
      const lineNumStr = String(actualLineNum).padStart(lineNumWidth, " ");
      const lineNum = styleText(["yellow"], `${lineNumStr} `);

      const highlightedLine = this.highlightSearchMatches(
        line,
        viewport.start + i
      );

      stdout.write(lineNum + highlightedLine);
      if (i < visibleLines.length - 1) stdout.write("\n");
    });

    this.renderStatusBar(
      state.getFilename(),
      state.getCursor(),
      state.getLines().length,
      state.isModified()
    );

    const displayLine = cursor.y - viewport.start + 1;
    const displayCol = cursor.x + lineNumWidth + 2;

    if (displayLine > 0 && displayLine <= maxLines) {
      stdout.write(`\x1b[${displayLine};${displayCol}H`);
    }
  }

  private highlightSearchMatches(line: string, lineIndex: number): string {
    if (!this.searchManager || !this.searchManager.hasMatches()) {
      return line;
    }

    const matches = this.searchManager.getMatchesForLine(lineIndex);
    const currentMatch = this.searchManager.getCurrentMatch();
    const query = this.searchManager.getQuery();

    if (matches.length === 0) {
      return line;
    }

    let result = "";
    let lastIndex = 0;

    matches.forEach((match) => {
      result += line.slice(lastIndex, match.col);

      const isCurrentMatch =
        currentMatch &&
        currentMatch.line === lineIndex &&
        currentMatch.col === match.col;

      const matchText = line.slice(match.col, match.col + query.length);

      if (isCurrentMatch) {
        result += styleText(["bgYellow", "black", "bold"], matchText);
      } else {
        result += styleText(["bgCyan", "black"], matchText);
      }

      lastIndex = match.col + query.length;
    });

    result += line.slice(lastIndex);

    return result;
  }
  private highlightKeywords(lines: string[]) {
    const controlKeywords = new Set([
      "if",
      "else",
      "elif",
      "switch",
      "case",
      "default",
      "for",
      "while",
      "do",
      "break",
      "continue",
      "return",
      "try",
      "catch",
      "except",
      "finally",
      "throw",
      "raise",
      "in",
      "of",
      "match",
    ]);

    const declarationKeywords = new Set([
      "function",
      "def",
      "const",
      "let",
      "var",
      "class",
      "struct",
      "enum",
      "typedef",
      "interface",
      "import",
      "from",
      "include",
      "define",
      "export",
      "public",
      "private",
      "protected",
      "static",
      "new",
      "this",
      "async",
      "await",
      "lambda",
      "yield",
    ]);

    const valueKeywords = new Set([
      "true",
      "false",
      "True",
      "False",
      "null",
      "Null",
      "None",
      "nil",
      "undefined",
      "NaN",
      "int",
      "float",
      "double",
      "char",
      "number",
      "bool",
      "boolean",
      "string",
      "object",
      "array",
    ]);
    const builtinAndDirectives = new Set([
      "#include",
      "#define",
      "#if",
      "#ifdef",
      "#ifndef",
      "#endif",
      "#pragma",
      "import",
      "export",
      "module",
      "package",
      "namespace",
      "using",
      "require",
      "print",
      "printf",
      "println",
      "input",
      "len",
      "range",
      "map",
      "filter",
      "reduce",
      "sort",
      "sum",
      "min",
      "max",
      "abs",
      "round",
      "type",
      "open",
      "close",
      "read",
      "write",
      "int",
      "float",
      "str",
      "bool",
      "list",
      "dict",
      "set",
      "tuple",
      "array",
      "object",
      "Promise",
      "async",
      "await",
      "eval",
      "exec",
      "typeof",
      "instanceof",
      "print",
      "console",
      "Math",
      "Date",
      "JSON",
      "parseInt",
      "parseFloat",
      "String",
      "Number",
      "Boolean",
      "Error",
      "Exception",
      "assert",
      "del",
      "pass",
      "yield",
      "super",
      "self",
      "this",
      "new",
      "extends",
      "implements",
      "interface",
      "public",
      "private",
      "protected",
      "static",
      "final",
      "abstract",
      "override",
      "synchronized",
      "defer",
      "go",
      "panic",
      "recover",
      "clone",
      "copy",
      "sizeof",
      "main",
      "exit",
      "breakpoint",
    ]);

    const newLines = lines.map((line) => {
      if (line.includes("//") || line.includes("#")) {
        const commentStarter = line.indexOf("//");
        const lineBig = line.slice(0, commentStarter);
        let lineEnd = line.slice(commentStarter);
        lineEnd = styleText(["gray"], lineEnd);

        line = lineBig.concat(lineEnd);
        return line;
      } else
        return line
          .split(/\b/) // split by word boundaries
          .map((word) => {
            if (controlKeywords.has(word)) {
              return styleText(["magenta"], word);
            } else if (declarationKeywords.has(word)) {
              return styleText(["cyan"], word);
            } else if (valueKeywords.has(word)) {
              return styleText(["yellow"], word);
            } else if (builtinAndDirectives.has(word)) {
              return styleText(["green"], word);
            } else {
              return word;
            }
          })
          .join("");
    });

    return newLines;
  }

  private renderStatusBar(
    fileName: string,
    cursor: { x: number; y: number },
    totalLines: number,
    modified: boolean
  ) {
    const rows = stdout.rows || 24;
    const cols = stdout.columns || 80;
    const statusLine = rows - 1;

    const modifiedIndicator = modified
      ? styleText(["red", "bold"], " ●")
      : styleText(["green"], " ●");
    const fileSection = styleText(["cyan", "bold"], ` ${fileName}`);
    const posSection = styleText(
      ["yellow"],
      ` ${cursor.y + 1}:${cursor.x + 1}`
    );
    const linesSection = styleText(["magenta"], ` ${totalLines} lines`);

    const plainStatus = ` ${fileName} ${cursor.y + 1}:${
      cursor.x + 1
    } ${totalLines} lines `;
    const padding = " ".repeat(Math.max(0, cols - plainStatus.length - 2));

    const leftSide = `${modifiedIndicator}${fileSection}`;
    const rightSide = `${posSection} │${linesSection} `;

    stdout.write(`\x1b[${statusLine};1H`);

    stdout.write("\x1b[2K");

    stdout.write("\x1b[48;5;236m");
    stdout.write(leftSide);
    stdout.write(padding);
    stdout.write(rightSide);
    stdout.write("\x1b[0m");
  }
}
