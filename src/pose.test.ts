import { describe, expect, it } from "vitest";
import { poseMatches } from "./pose";

const base = { yaw: 0.5, pitch: 0.5 };

describe("poseMatches", () => {
  it("accepts center near baseline", () => {
    expect(poseMatches("center", { yaw: 0.51, pitch: 0.49 }, base)).toBe(true);
    expect(poseMatches("center", { yaw: 0.65, pitch: 0.5 }, base)).toBe(false);
  });
  it("detects turns and tilts", () => {
    expect(poseMatches("left", { yaw: 0.58, pitch: 0.5 }, base)).toBe(true);
    expect(poseMatches("right", { yaw: 0.42, pitch: 0.5 }, base)).toBe(true);
    expect(poseMatches("up", { yaw: 0.5, pitch: 0.4 }, base)).toBe(true);
    expect(poseMatches("down", { yaw: 0.5, pitch: 0.55 }, base)).toBe(true);
    expect(poseMatches("left", { yaw: 0.5, pitch: 0.5 }, base)).toBe(false);
  });
});
