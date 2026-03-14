// 1) Add mode to your modes list
export type AIMode = 'smart' | 'fast' | 'good' | 'cheap' | 'lucky';

// 2) String -> 32-bit hash (xmur3)
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// 3) Seeded PRNG (mulberry32)
function mulberry32(a: number) {
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 4) Map string -> seed number and luckScore (0-100)
function seedAndLuckFromString(input: string) {
  const hasher = xmur3(input || '');
  const seed32 = hasher();                     // 32-bit seed
  // derive a luck score 0..100 from the seed (deterministic)
  const luckScore = seed32 % 101;
  return { seed32, luckScore };
}

// 5) Choose lucky default seed based on luckScore
export function chooseLuckyDefault(luckScore: number): number {
  // Tune thresholds as desired:
  // very lucky -> 777, medium -> 420, else 69
  if (luckScore >= 90) return 777;
  if (luckScore >= 60) return 420;
  return 69;
}

// 6) Top-level helper to prepare RNG for Lucky mode
export function prepareLuckyRNG(options?: { seedString?: string, explicitSeed?: number }) {
  const seedString = options?.seedString ?? '';
  const explicitSeed = options?.explicitSeed;

  if (explicitSeed != null && explicitSeed !== undefined) {
    // direct override if provided
    return { seed: explicitSeed, luckScore: explicitSeed % 101, rng: mulberry32(explicitSeed) };
  }

  const { seed32, luckScore } = seedAndLuckFromString(seedString);
  // default mapping: if seedString empty maybe pick based on luckScore of empty string
  const defaultLucky = chooseLuckyDefault(luckScore);
  // final seed: combine seed32 and defaultLucky to add "luck bias"
  const finalSeed = (seed32 ^ defaultLucky) >>> 0;
  return { seed: finalSeed, luckScore, rng: mulberry32(finalSeed) };
}
