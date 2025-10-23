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

function getCursorPosition(): Promise<{ row: number; col: number }> {
  return new Promise((resolve) => {
    let response = "";

    const onData = (data: Buffer) => {
      response += data.toString();
      const match = response.match(/\x1b\[(\d+);(\d+)R/);
      if (match) {
        process.stdin.removeListener("data", onData);
        resolve({ row: parseInt(match[1]!), col: parseInt(match[2]!) });
      }
    };

    process.stdin.on("data", onData);
    process.stdout.write("\x1b[6n");

    setTimeout(() => {
      process.stdin.removeListener("data", onData);
      resolve({ row: 1, col: 1 });
    }, 100);
  });
}

export async function getFilename(): Promise<string> {
  const rows = process.stdout.rows || 24;

  // Temporarily capture cursor position response
  const originalListeners = process.stdin.listeners("data");
  process.stdin.removeAllListeners("data");

  const savedPosition = await getCursorPosition();

  // Restore listeners
  originalListeners.forEach((listener) => {
    process.stdin.on("data", listener as any);
  });

  return new Promise((resolve) => {
    // Move to bottom and clear line
    process.stdout.write(`\x1b[${rows};1H`);
    process.stdout.write("\x1b[2K");

    // Display prompt with reverse colors
    process.stdout.write("\x1b[7mSave as: \x1b[0m");

    let filename = "";

    // Remove all existing listeners temporarily
    process.stdin.removeAllListeners("data");

    const handleInput = (key: Buffer) => {
      const char = key.toString();

      if (char === "\r" || char === "\n") {
        cleanup();
        resolve(filename.trim());
        return;
      }

      if (char === "\x7f" || char === "\x08") {
        if (filename.length > 0) {
          filename = filename.slice(0, -1);
          process.stdout.write("\x08 \x08");
        }
        return;
      }

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
      process.stdout.write(`\x1b[${rows};1H\x1b[2K`);

      // Restore to saved position
      process.stdout.write(`\x1b[${savedPosition.row};${savedPosition.col}H`);
    }
  });
}

export async function getSearchQuery(): Promise<string> {
  const rows = process.stdout.rows || 24;

  // Temporarily capture cursor position response
  const originalListeners = process.stdin.listeners("data");
  process.stdin.removeAllListeners("data");

  const savedPosition = await getCursorPosition();

  // Restore listeners
  originalListeners.forEach((listener) => {
    process.stdin.on("data", listener as any);
  });

  return new Promise((resolve) => {
    // Move to bottom and clear line
    process.stdout.write(`\x1b[${rows};1H`);
    process.stdout.write("\x1b[2K");

    // Display prompt with reverse colors
    process.stdout.write("\x1b[7mSearch: \x1b[0m");

    let query = "";

    // Remove all existing listeners temporarily
    process.stdin.removeAllListeners("data");

    const handleInput = (key: Buffer) => {
      const char = key.toString();

      if (char === "\r" || char === "\n") {
        cleanup();
        resolve(query.trim());
        return;
      }

      if (char === "\x7f" || char === "\x08") {
        if (query.length > 0) {
          query = query.slice(0, -1);
          process.stdout.write("\x08 \x08");
        }
        return;
      }

      if (char === "\x1b" || char === "\x03") {
        cleanup();
        resolve("");
        return;
      }

      if (char >= " " && char <= "~") {
        query += char;
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
      process.stdout.write(`\x1b[${rows};1H\x1b[2K`);

      // Restore to saved position
      process.stdout.write(`\x1b[${savedPosition.row};${savedPosition.col}H`);
    }
  });
}
