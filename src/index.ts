import { stdin } from "node:process";
import EditorState from "./EditorState.js";
import { UndoManager } from "./undo.js";
import { Renderer } from "./renderer.js";
import { InputHandler } from "./inputHandler.js";

const editor = new EditorState();
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
