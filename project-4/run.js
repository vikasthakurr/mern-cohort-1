// run.js
// Console runner. Run with: node run.js
import { runAll } from "./forge.js";
import "./specs.js";

// ANSI color helpers for terminal output.
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const report = runAll();

for (const suite of report.suites) {
  console.log("\n" + bold(suite.name));
  for (const test of suite.tests) {
    if (test.passed) {
      console.log("  " + green("✔") + " " + test.name);
    } else {
      console.log("  " + red("✖") + " " + test.name);
      console.log("    " + dim(test.error));
    }
  }
}

const { passed, failed, total } = report.total;

console.log("\n" + bold("Summary"));
console.log(
  `  ${green(passed + " passed")}, ${failed ? red(failed + " failed") : failed + " failed"}, ${total} total`,
);

// Exit non-zero if anything failed (useful in CI).
if (typeof process !== "undefined" && failed > 0) {
  process.exitCode = 1;
}
