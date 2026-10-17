// runner.js
// Browser runner: runs the specs and renders a report into the page.
import { runAll } from "./forge.js";
import "./specs.js";

const report = runAll();
const { passed, failed, total } = report.total;

// --- Summary counters ---------------------------------------------------
document.getElementById("stat-total").textContent = total;
document.getElementById("stat-passed").textContent = passed;
document.getElementById("stat-failed").textContent = failed;

const rate = total === 0 ? 0 : Math.round((passed / total) * 100);
document.getElementById("stat-rate").textContent = rate + "%";

// Progress bar reflects the pass rate.
const bar = document.getElementById("progress-bar");
bar.style.width = rate + "%";
bar.classList.add(failed === 0 ? "all-pass" : "has-fail");

// Overall banner.
const banner = document.getElementById("banner");
if (total === 0) {
  banner.textContent = "No tests found";
  banner.className = "banner neutral";
} else if (failed === 0) {
  banner.textContent = `All ${total} tests passed `;
  banner.className = "banner pass";
} else {
  banner.textContent = `${failed} of ${total} tests failed`;
  banner.className = "banner fail";
}

// --- Suite + test list --------------------------------------------------
const results = document.getElementById("results");

for (const suite of report.suites) {
  const suitePassed = suite.tests.filter((t) => t.passed).length;
  const suiteTotal = suite.tests.length;

  const suiteEl = document.createElement("section");
  suiteEl.className = "suite";

  const header = document.createElement("header");
  header.className = "suite-header";
  header.innerHTML = `
    <span class="suite-name">${escapeHtml(suite.name)}</span>
    <span class="suite-count ${suitePassed === suiteTotal ? "ok" : "bad"}">
      ${suitePassed}/${suiteTotal}
    </span>
  `;
  suiteEl.appendChild(header);

  const list = document.createElement("ul");
  list.className = "test-list";

  for (const test of suite.tests) {
    const li = document.createElement("li");
    li.className = "test " + (test.passed ? "passed" : "failed");

    const icon = test.passed ? "✔" : "✖";
    li.innerHTML = `
      <span class="test-icon">${icon}</span>
      <span class="test-name">${escapeHtml(test.name)}</span>
    `;

    if (!test.passed && test.error) {
      const err = document.createElement("pre");
      err.className = "test-error";
      err.textContent = test.error;
      li.appendChild(err);
    }

    list.appendChild(li);
  }

  suiteEl.appendChild(list);
  results.appendChild(suiteEl);
}

// Escape user-provided strings before injecting into innerHTML.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
