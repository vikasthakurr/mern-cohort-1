import { describe, it, expect } from "./forge.js";
import { add, sum, evens, scaleBy, makeCounter, divide } from "./subject.js";

describe("arithmatic operations", () => {
  it("can add two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });
  it("can sum an array", () => {
    expect(sum([1, 2, 3])).toBe(6);
  });

  //failed test cases....
  it("fail it on purpose:2+2 is not 5", () => {
    expect(add(2, 2)).toBe(6);
  });
});

describe("array operations", () => {
  it("can filter even numbers", () => {
    expect(evens([1, 2, 3, 4])).toEqual([2, 4]);
  });

  it("can scale an array by a factor", () => {
    expect(scaleBy([1, 2, 3], 2)).toEqual([2, 4, 6]);
  });
});

it("can make a counter", () => {
  const counter = makeCounter();
  expect(counter()).toBe(1);
  expect(counter()).toBe(2);
  expect(counter()).toBe(3);
});

describe("more test case on matcher", () => {
  it("evens filters an array", () => {
    expect(evens([1, 2, 3, 4])).toEqual([2, 4]);
  });

  it("toBe vs toEqual", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    //expect(a).toBe(b) // fail
    expect(a).toEqual(b); //pass
  });
  it("divide", () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(10, 3)).toBeCloseTo(3.33, 1);
  });
});
