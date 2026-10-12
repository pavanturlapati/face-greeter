export interface Point {
  x: number;
  y: number;
}

export interface Pose {
  /** ~0.5 when facing the camera. Increases as the user turns to THEIR left. */
  yaw: number;
  /** Nose position between eyes and chin. Decreases looking up, increases looking down. */
  pitch: number;
}

/** Estimate head pose from the 68-point face landmarks. */
export function estimatePose(p: Point[]): Pose {
  const nose = p[30];
  const jawLeft = p[0];
  const jawRight = p[16];
  const chin = p[8];
  const eyeY = (p[36].y + p[39].y + p[42].y + p[45].y) / 4;
  return {
    yaw: (nose.x - jawLeft.x) / (jawRight.x - jawLeft.x),
    pitch: (nose.y - eyeY) / (chin.y - eyeY),
  };
}

export type Step = "center" | "left" | "right" | "up" | "down";

export const STEPS: { step: Step; prompt: string; speech: string }[] = [
  { step: "center", prompt: "Look straight at the camera", speech: "Look straight at the camera" },
  { step: "left", prompt: "Slowly turn your head to the left", speech: "Turn your head left" },
  { step: "right", prompt: "Slowly turn your head to the right", speech: "Turn your head right" },
  { step: "up", prompt: "Tilt your head up a little", speech: "Tilt your head up" },
  { step: "down", prompt: "Tilt your head down just slightly", speech: "Tilt your head down slightly" },
];

export const YAW_DELTA = 0.05;
export const PITCH_UP_DELTA = 0.05;
export const PITCH_DOWN_DELTA = 0.02;
const CENTER_TOLERANCE_YAW = 0.04;
const CENTER_TOLERANCE_PITCH = 0.04;

/** Does the current pose satisfy the step, relative to the user's own centered pose? */
export function poseMatches(step: Step, pose: Pose, base: Pose): boolean {
  const dy = pose.yaw - base.yaw;
  const dp = pose.pitch - base.pitch;
  switch (step) {
    case "center":
      return Math.abs(dy) < CENTER_TOLERANCE_YAW && Math.abs(dp) < CENTER_TOLERANCE_PITCH;
    case "left":
      return dy > YAW_DELTA;
    case "right":
      return dy < -YAW_DELTA;
    case "up":
      return dp < -PITCH_UP_DELTA;
    case "down":
      return dp > PITCH_DOWN_DELTA;
  }
}
