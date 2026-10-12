export const MATCH_THRESHOLD = 0.5;

export function distance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** Smallest distance between a face descriptor and any enrolled sample. */
export function bestDistance(face: ArrayLike<number>, samples: ArrayLike<number>[]): number {
  return samples.reduce((min, s) => Math.min(min, distance(face, s)), Infinity);
}

export interface Person {
  name: string;
  samples: number[][];
}

/** Closest enrolled person within the threshold, or null if nobody matches. */
export function identify(face: ArrayLike<number>, people: Person[]): Person | null {
  let best: Person | null = null;
  let bestDist = MATCH_THRESHOLD;
  for (const p of people) {
    const d = bestDistance(face, p.samples);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

export function isMatch(face: ArrayLike<number>, samples: ArrayLike<number>[]): boolean {
  return samples.length > 0 && bestDistance(face, samples) < MATCH_THRESHOLD;
}
