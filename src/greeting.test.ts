import { describe, expect, it } from "vitest";
import { getPeriod } from "./greeting";

const at = (h: number) => new Date(2026, 0, 1, h, 0);

describe("getPeriod", () => {
  it("maps hours to periods", () => {
    expect(getPeriod(at(5))).toBe("morning");
    expect(getPeriod(at(11))).toBe("morning");
    expect(getPeriod(at(12))).toBe("afternoon");
    expect(getPeriod(at(16))).toBe("afternoon");
    expect(getPeriod(at(17))).toBe("evening");
    expect(getPeriod(at(20))).toBe("evening");
    expect(getPeriod(at(21))).toBe("night");
    expect(getPeriod(at(2))).toBe("night");
  });
});
