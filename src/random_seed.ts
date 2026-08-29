import { randomInt } from 'node:crypto';

export const MAX_SEED = 0xffffffff;

export function validateSeed(seed: number): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new Error(`--seed must be an integer between 0 and ${MAX_SEED}`);
  }

  return seed;
}

export function generateSeed(): number {
  return randomInt(MAX_SEED + 1);
}

export function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / (MAX_SEED + 1);
  };
}
