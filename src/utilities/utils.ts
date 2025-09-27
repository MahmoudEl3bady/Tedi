import fs from "node:fs";

export function debounce(fn: any, time: number) {
  let timer: any;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, arguments);
    }, time);
  };
}

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
