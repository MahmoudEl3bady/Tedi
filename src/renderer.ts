import { stdout } from "node:process";
import { styleText } from "node:util";
import EditorState from "./EditorState.js";
import type { SearchManager } from "./SearchManager.js";

type StyleName =
  | "black"
  | "blackBright"
  | "blue"
  | "blueBright"
  | "cyan"
  | "cyanBright"
  | "gray"
  | "green"
  | "greenBright"
  | "grey"
  | "magenta"
  | "magentaBright"
  | "red"
  | "redBright"
  | "white"
  | "whiteBright"
  | "yellow"
  | "yellowBright"
  | "bgBlack"
  | "bgBlackBright"
  | "bgBlue"
  | "bgBlueBright"
  | "bgCyan"
  | "bgCyanBright"
  | "bgGray"
  | "bgGreen"
  | "bgGreenBright"
  | "bgGrey"
  | "bgMagenta"
  | "bgMagentaBright"
  | "bgRed"
  | "bgRedBright"
  | "bgWhite"
  | "bgWhiteBright"
  | "bgYellow"
  | "bgYellowBright"
  | "blink"
  | "bold"
  | "dim"
  | "doubleunderline"
  | "framed"
  | "hidden"
  | "inverse"
  | "italic"
  | "none"
  | "overlined"
  | "reset"
  | "strikethrough"
  | "underline";

export class Renderer {
  private searchManager: SearchManager | null = null;

  private viewportStartX: number = 0;

  setSearchManager(manager: SearchManager | null) {
    this.searchManager = manager;
  }

  render(state: EditorState) {
    const lines = state.getLines();
    const cursor = state.getCursor();
    const viewport = state.getViewport();
    const rows = stdout.rows || 24;
    const cols = stdout.columns || 80;
    const maxLines = rows - 1;
    const lineNumWidth = String(lines.length).length;
    const gutterWidth = lineNumWidth + 1; // line number + one space
    const availableCols = Math.max(10, cols - gutterWidth);

    this.updateHorizontalScroll(cursor.x, availableCols);

    // Save cursor position
    stdout.write("\x1b[s");

    // Clear the screen area
    stdout.write("\x1b[H");
    for (let i = 0; i < maxLines; i++) {
      stdout.write("\x1b[2K");
      if (i < maxLines - 1) stdout.write("\n");
    }

    stdout.write("\x1b[H");

    const visibleLines = lines.slice(viewport.start, viewport.end);
    visibleLines.forEach((line, i) => {
      const lineIndex = viewport.start + i;
      const actualLineNum = lineIndex + 1;
      const lineNumStr = String(actualLineNum).padStart(lineNumWidth, " ");
      const lineNum = styleText(["yellow"], `${lineNumStr} `);

      const clippedLine = line.slice(
        this.viewportStartX,
        this.viewportStartX + availableCols,
      );
      const renderedLine = this.renderLine(
        clippedLine,
        lineIndex,
        this.viewportStartX,
      );

      stdout.write(lineNum + renderedLine);
      if (i < visibleLines.length - 1) stdout.write("\n");
    });

    this.renderStatusBar(
      state.getFilename(),
      state.getCursor(),
      state.getLines().length,
      state.isModified(),
    );

    const displayLine = cursor.y - viewport.start + 1;
    const displayCol = cursor.x - this.viewportStartX + lineNumWidth + 2;

    if (
      displayLine > 0 &&
      displayLine <= maxLines &&
      displayCol > lineNumWidth + 1
    ) {
      stdout.write(`\x1b[${displayLine};${displayCol}H`);
    }
  }

  /** Keeps the cursor's column within the visible horizontal window,
   *  the same way EditorState.scrollViewport() keeps cursorY visible. */
  private updateHorizontalScroll(cursorX: number, availableCols: number) {
    if (cursorX < this.viewportStartX) {
      this.viewportStartX = cursorX;
    } else if (cursorX >= this.viewportStartX + availableCols) {
      this.viewportStartX = cursorX - availableCols + 1;
    }
    this.viewportStartX = Math.max(0, this.viewportStartX);
  }

  /** Renders one (already horizontally-clipped) line with syntax
   *  highlighting and search-match highlighting merged into a single pass,
   *  instead of the two being mutually exclusive. */
  private renderLine(
    clippedLine: string,
    lineIndex: number,
    xOffset: number,
  ): string {
    const tokens = this.tokenizeLine(clippedLine);
    const hasSearch = !!this.searchManager?.hasMatches();

    if (!hasSearch) {
      return tokens
        .map((t) => (t.style.length ? styleText(t.style, t.text) : t.text))
        .join("");
    }

    const query = this.searchManager!.getQuery();
    const currentMatch = this.searchManager!.getCurrentMatch();
    const ranges = this.searchManager!.getMatchesForLine(lineIndex).map(
      (m) => ({
        start: m.col - xOffset,
        end: m.col - xOffset + query.length,
        isCurrent: !!(
          currentMatch &&
          currentMatch.line === lineIndex &&
          currentMatch.col === m.col
        ),
      }),
    );

    let result = "";
    let offset = 0;
    for (const token of tokens) {
      const tokenStart = offset;
      const tokenEnd = offset + token.text.length;
      offset = tokenEnd;

      const overlaps = ranges
        .filter((r) => r.start < tokenEnd && r.end > tokenStart)
        .sort((a, b) => a.start - b.start);

      if (overlaps.length === 0) {
        result += token.style.length
          ? styleText(token.style, token.text)
          : token.text;
        continue;
      }

      let cursor = tokenStart;
      for (const r of overlaps) {
        const segStart = Math.max(r.start, tokenStart);
        const segEnd = Math.min(r.end, tokenEnd);
        if (cursor < segStart) {
          const plain = token.text.slice(
            cursor - tokenStart,
            segStart - tokenStart,
          );
          result += token.style.length ? styleText(token.style, plain) : plain;
        }
        const matchText = token.text.slice(
          segStart - tokenStart,
          segEnd - tokenStart,
        );
        const bgStyle: StyleName[] = r.isCurrent
          ? ["bgYellow", "black", "bold"]
          : ["bgCyan", "black"];
        result += styleText(bgStyle, matchText);
        cursor = segEnd;
      }
      if (cursor < tokenEnd) {
        const rest = token.text.slice(cursor - tokenStart);
        result += token.style.length ? styleText(token.style, rest) : rest;
      }
    }
    return result;
  }

  /** Splits one raw (unstyled) line into ordered tokens with a style array
   *  each, preserving exact substring order/length so column math for
   *  search-match overlay stays correct. Replaces the old approach of
   *  independently producing two fully-styled ANSI strings (syntax vs.
   *  search) that couldn't be composed. */
  private tokenizeLine(
    line: string,
  ): Array<{ text: string; style: StyleName[] }> {
    const commentIndex = this.findCommentStart(line);
    if (commentIndex === -1) {
      return this.tokenizeCode(line);
    }
    const code = line.slice(0, commentIndex);
    const comment = line.slice(commentIndex);
    return [...this.tokenizeCode(code), { text: comment, style: ["gray"] }];
  }

  /** Finds the earliest of "//" or "#" that actually appears in the line.
   *  Old code always used indexOf("//") even when only "#" was present,
   *  which produced a -1 slice and silently ate the line's last character. */
  private findCommentStart(line: string): number {
    const candidates = [line.indexOf("//"), line.indexOf("#")].filter(
      (i) => i !== -1,
    );
    return candidates.length ? Math.min(...candidates) : -1;
  }

  private tokenizeCode(
    code: string,
  ): Array<{ text: string; style: StyleName[] }> {
    return code.split(/\b/).map((word) => {
      if (Renderer.controlKeywords.has(word))
        return { text: word, style: ["magenta"] };
      if (Renderer.declarationKeywords.has(word))
        return { text: word, style: ["cyan"] };
      if (Renderer.valueKeywords.has(word))
        return { text: word, style: ["yellow"] };
      if (Renderer.builtinAndDirectives.has(word))
        return { text: word, style: ["green"] };
      return { text: word, style: [] };
    });
  }

  private static readonly controlKeywords = new Set([
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

  private static readonly declarationKeywords = new Set([
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

  private static readonly valueKeywords = new Set([
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

  private static readonly builtinAndDirectives = new Set([
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
    "str",
    "list",
    "dict",
    "set",
    "tuple",
    "Promise",
    "eval",
    "exec",
    "typeof",
    "instanceof",
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
    "super",
    "self",
    "extends",
    "implements",
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

  private renderStatusBar(
    fileName: string,
    cursor: { x: number; y: number },
    totalLines: number,
    modified: boolean,
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
      ` ${cursor.y + 1}:${cursor.x + 1}`,
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
