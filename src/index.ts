#!/usr/bin/env node

import { cwd, stdin } from "node:process";
import EditorState from "./EditorState.js";
import { UndoManager } from "./undo.js";
import { Renderer } from "./renderer.js";
import { InputHandler } from "./inputHandler.js";
import fs from "node:fs";
import { argv } from "node:process";

const renderer = new Renderer();

const __dirname = cwd();
const openedFile = argv[2];
const filePath = `${__dirname}/${openedFile}`;

const readFileLines = (path: string): string[] => {
  if (!fs.existsSync(path)) return [""];
  const content = fs.readFileSync(path, "utf8");
  // split on \r\n or \n; keep at least one empty line for an empty file
  const lines = content.split(/\r\n|\n/);
  if (content.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.length > 0 ? lines : [""];
};

const fileLines: string[] = openedFile ? readFileLines(filePath) : [""];

// Editor is fully constructed before anything touches it — no event-loop
// timing to reason about, unlike the previous stream-based read.
const editor = new EditorState(fileLines, __dirname);
const undoManager = new UndoManager();
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
