// src/lib/math/noise.ts
export const makePerlin = (seed: number) => {
  let s = Math.max(1, Math.floor(seed * 1e6));
  const lcg = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
  return (x: number, y: number, z: number) => {
    const n = Math.sin(x * 1.7 + y * 2.3 + z * 2.9 + lcg() * Math.PI * 2) * 0.5 + 0.5;
    return n; // 0..1
  };
};