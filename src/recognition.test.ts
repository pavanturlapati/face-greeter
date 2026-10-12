import { describe, expect, it } from "vitest";
import { distance, identify, isMatch } from "./recognition";

describe("recognition", () => {
  it("computes euclidean distance", () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
  });
  it("identifies the closest person or nobody", () => {
    const people = [
      { name: "A", samples: [[0, 0]] },
      { name: "B", samples: [[1, 1]] },
    ];
    expect(identify([0.9, 0.9], people)?.name).toBe("B");
    expect(identify([0.1, 0], people)?.name).toBe("A");
    expect(identify([5, 5], people)).toBeNull();
  });
  it("matches close descriptors only", () => {
    expect(isMatch([0, 0], [[0.1, 0.1]])).toBe(true);
    expect(isMatch([0, 0], [[1, 1]])).toBe(false);
    expect(isMatch([0, 0], [])).toBe(false);
  });
});
