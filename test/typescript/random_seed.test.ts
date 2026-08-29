import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateSeed, MAX_SEED, seededRandom, validateSeed } from '../../src/random_seed';

describe('random seeds', () => {
  it('generates unsigned 32-bit integer seeds', () => {
    for (let sample = 0; sample < 100; sample += 1) {
      const seed = generateSeed();
      assert.equal(Number.isInteger(seed), true);
      assert.ok(seed >= 0);
      assert.ok(seed <= MAX_SEED);
    }
  });

  it('validates unsigned 32-bit integer seeds', () => {
    assert.equal(validateSeed(0), 0);
    assert.equal(validateSeed(MAX_SEED), MAX_SEED);

    for (const invalid of [-1, 1.5, MAX_SEED + 1, Number.NaN]) {
      assert.throws(() => validateSeed(invalid), {
        message: '--seed must be an integer between 0 and 4294967295'
      });
    }
  });

  it('returns the same random sequence for the same seed', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);

    assert.deepEqual(
      Array.from({ length: 4 }, () => first()),
      Array.from({ length: 4 }, () => second())
    );
  });
});
