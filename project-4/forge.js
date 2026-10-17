// forge.js
// A tiny test framework: describe / it / expect + a runner.

const suites = [];

// Tests declared with a top-level `it` (outside any describe) land here.
const rootSuite = { name: "(root)", tests: [] };
let currentSuite = rootSuite;

export function describe(name, fn) {
  const suite = { name, tests: [] };
  suites.push(suite);

  const previous = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = previous;
  }
}

export function it(name, fn) {
  currentSuite.tests.push({ name, fn });
}

// Deep structural equality for arrays/objects/primitives.
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => deepEqual(a[key], b[key]));
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${show(actual)} to be ${show(expected)}`);
      }
    },

    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`Expected ${show(actual)} to equal ${show(expected)}`);
      }
    },

    toBeCloseTo(expected, digits = 2) {
      const tolerance = Math.pow(10, -digits) / 2;
      if (Math.abs(actual - expected) > tolerance) {
        throw new Error(
          `Expected ${show(actual)} to be close to ${show(expected)} (±${tolerance})`,
        );
      }
    },

    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${show(actual)} to be truthy`);
      }
    },

    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${show(actual)} to be falsy`);
      }
    },

    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(
          `Expected ${show(actual)} to be greater than ${show(expected)}`,
        );
      }
    },

    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(
          `Expected ${show(actual)} to be less than ${show(expected)}`,
        );
      }
    },

    toContain(expected) {
      if (
        !actual ||
        typeof actual.includes !== "function" ||
        !actual.includes(expected)
      ) {
        throw new Error(
          `Expected ${show(actual)} to contain ${show(expected)}`,
        );
      }
    },

    toThrow(expected) {
      let threw = false;
      let message = "";
      try {
        actual();
      } catch (err) {
        threw = true;
        message = err.message;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it did not`);
      }
      if (expected !== undefined && message !== expected) {
        throw new Error(`Expected error "${message}" to be "${expected}"`);
      }
    },
  };
}

// Run every test and build a structured report.
export function runAll() {
  const allSuites = rootSuite.tests.length
    ? [...suites, rootSuite]
    : [...suites];

  let passed = 0;
  let failed = 0;

  const suiteReports = allSuites.map((suite) => {
    const tests = suite.tests.map((test) => {
      const result = runOneTest(test);
      if (result.passed) passed++;
      else failed++;
      return result;
    });
    return { name: suite.name, tests };
  });

  return {
    suites: suiteReports,
    total: { passed, failed, total: passed + failed },
  };
}

function runOneTest(test) {
  try {
    test.fn();
    return { name: test.name, passed: true, error: null };
  } catch (e) {
    return { name: test.name, passed: false, error: e.message };
  }
}

// Human-readable rendering of a value for error messages.
function show(value) {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "function")
    return value.name ? `[Function ${value.name}]` : "[Function]";
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
