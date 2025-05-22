import fs from "fs";
import url from "url";
import path from "path";

import { TAFIC } from "../../src/index.js";

//

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//


const OUTPUT_FILE = path.join(__dirname, "output.log");

let outputBuffer = "";

const log = (...args: any[]) => {
    outputBuffer += args.map(arg => typeof arg === "string" ? arg : JSON.stringify(arg, undefined, 2)).join(" ") + "\n";
};

const flushLog = () => {
    fs.writeFileSync(OUTPUT_FILE, outputBuffer, "utf8");
};

//

const cases: string[] = [
    "", // set cases here
];

const allNonAsciiOccurs: string[] = [];

for (let i = 0; i < cases.length; i++) {
    const original = cases[i];
    let nonAsciiCaught: string[] = [];

    const result = TAFIC.Normalize(original, {
        onLeftovers: (nonAscii) => nonAsciiCaught.push(...nonAscii),
        removeLeftovers: false,
    });

    log(`Case ${i}:`);
    log("Before:", original);
    log("After :", result);

    if (nonAsciiCaught.length) {
        log("Non-ASCII leftovers:", nonAsciiCaught);
        allNonAsciiOccurs.push(...nonAsciiCaught);
    }

    log("");
}

log("");

log("Total non ascii occurences:");
log(JSON.stringify(Array.from(new Set(allNonAsciiOccurs)), undefined, 2));

flushLog();
console.log("Log written to", OUTPUT_FILE);