import { stdin } from "node:process";
import EditorState from "./EditorState.js";
import { UndoManager } from "./undo.js";
import { Renderer } from "./renderer.js";
import { InputHandler } from "./inputHandler.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { opendir } from "node:fs/promises";
import fs from "node:fs";
import { argv } from "node:process";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openedFile = argv[2];
const filePath = `${__dirname}/${openedFile}`;
let fileLines: string[] = [];

const isFileExists = async (dirname: string) => {
  const dir = await opendir(dirname);
  for await (const dirent of dir) {
    if (dirent.name === openedFile) {
      return true;
    }
  }
  return false;
};

if (openedFile && (await isFileExists(__dirname))) {
  const r1 = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  r1.on("line", (line) => {
    fileLines.push(line);
  });
} else {
  fileLines = [""];
}

const editor = new EditorState(fileLines, filePath);
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
