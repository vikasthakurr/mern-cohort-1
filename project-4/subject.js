// subject.js
// The functions under test. specs.js describes how each one should behave.

export function add(a, b) {
  return a + b;
}

export function sum(numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

export function evens(numbers) {
  return numbers.filter((n) => n % 2 === 0);
}

// Scale every element of an array by a factor: scaleBy([1,2,3], 2) -> [2,4,6]
export function scaleBy(numbers, factor) {
  return numbers.map((n) => n * factor);
}

// A counter that increments on every call: makeCounter() -> fn, fn() -> 1, 2, 3...
export function makeCounter(start = 0) {
  let count = start;
  return function next() {
    count = count + 1;
    return count;
  };
}

export function divide(a, b) {
  if (b === 0) {
    throw new Error("can not divide by zero");
  }
  return a / b;
}
