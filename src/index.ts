import { stdin } from "node:process";
import EditorState from "./EditorState.js";
import { UndoManager } from "./undo.js";
import { Renderer } from "./renderer.js";
import { InputHandler } from "./inputHandler.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "node:fs";
import { argv } from "node:process";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openedFile = argv[2];
const filePath = `${__dirname}/${openedFile}`;
const fileLines: string[] = [];

const r1 = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity,
});

r1.on("line", (line) => {
  fileLines.push(line);
});

const editor = new EditorState(fileLines);
const undoManager = new UndoManager();
const renderer = new Renderer();
const inputHandler = new InputHandler(editor, undoManager, renderer);

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

renderer.render(editor);

stdin.on("data", (data) => {
  const char = data.toString();
  if (char === "\x03") process.exit(0); // Ctrl+C
  inputHandler.handle(char);
});
