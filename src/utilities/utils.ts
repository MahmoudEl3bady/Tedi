import fs from "node:fs";

export function debounce(fn: any, time: number) {
  let timer: any;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(() => {
      //@ts-ignore
      fn.apply(this, arguments);
    }, time);
  };
}
// Move back, space, move back
export function writeFileLineByLine(filePath: string, lines: string[]) {
  const writableStream = fs.createWriteStream(filePath);

  writableStream.on("error", (error) => {
    console.log(
      `An error occured while writing to the file. Error: ${error.message}`
    );
  });
  lines.map((line) => {
    writableStream.write(`${line}\n`);
  });

  writableStream.on("close", () => {
    writableStream.end();
    writableStream.on("finish", () => {
      console.log(`All your lines have been written to ${filePath}`);
    });
  });
}

export async function getFilename(): Promise<string> {
  return new Promise((resolve) => {
    const rows = process.stdout.rows || 24;

    // Save current cursor position
    process.stdout.write("\x1b[s");

    // Move to bottom and clear line
    process.stdout.write(`\x1b[${rows};1H`);
    process.stdout.write("\x1b[2K");

    // Display prompt with reverse colors
    process.stdout.write("\x1b[7m");
    process.stdout.write("Save as: ");

    process.stdout.write("\x1b[0m");

    let filename = "";

    // Store original data listener
    const originalListeners = process.stdin.listeners("data");

    // Remove all existing listeners temporarily
    process.stdin.removeAllListeners("data");

    // Add our filename input listener
    const handleInput = (key: Buffer) => {
      const char = key.toString();

      // Enter - submit
      if (char === "\r" || char === "\n") {
        cleanup();
        resolve(filename.trim());
        return;
      }

      // Backspace
      if (char === "\x7f" || char === "\x08") {
        if (filename.length > 0) {
          filename = filename.slice(0, -1);
          process.stdout.write("\x08 \x08");
        }
        return;
      }

      // Escape or Ctrl+C - cancel
      if (char === "\x1b" || char === "\x03") {
        cleanup();
        resolve("");
        return;
      }

      if (char >= " " && char <= "~") {
        filename += char;
        process.stdout.write(char);
      }
    };

    process.stdin.on("data", handleInput);

    function cleanup() {
      process.stdin.removeListener("data", handleInput);

      originalListeners.forEach((listener) => {
        process.stdin.on("data", listener as any);
      });

      // Clear bottom line
      process.stdout.write(`\x1b[${rows};1H`);
      process.stdout.write("\x1b[2K");

      // Restore cursor position
      process.stdout.write("\x1b[u");
    }
  });
}
