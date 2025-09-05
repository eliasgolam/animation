// src/lib/animation/easing.ts
export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const expSlew = (current: number, target: number, tauUp: number, tauDown: number, dt: number) => {
  const tau = target > current ? tauUp : tauDown;
  const k = 1 - Math.exp(-dt / Math.max(1e-6, tau));
  return current + k * (target - current);
};