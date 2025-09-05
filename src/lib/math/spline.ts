// src/lib/math/spline.ts
import { Skia } from '@shopify/react-native-skia';
export const createClosedCatmullRomPath = (
  points: { x: number; y: number }[],
  tension: number,
  Sk: typeof Skia
) => {
  const p = Sk.Path.Make();
  const n = points.length;
  if (n < 2) return p;
  const get = (i: number) => points[(i + n) % n];
  const alpha = tension ?? 0.5;
  const steps = 16;
  let p0 = get(-1), p1 = get(0), p2 = get(1), p3 = get(2);
  p.moveTo(p1.x, p1.y);
  for (let i = 0; i < n; i++) {
    p0 = get(i - 1); p1 = get(i); p2 = get(i + 1); p3 = get(i + 2);
    for (let t = 0; t <= steps; t++) {
      const u = t / steps, u2 = u*u, u3 = u2*u;
      const a0 = -alpha*u3 + 2*alpha*u2 - alpha*u;
      const a1 = (2 - alpha)*u3 + (alpha - 3)*u2 + 1;
      const a2 = (alpha - 2)*u3 + (3 - 2*alpha)*u2 + alpha*u;
      const a3 = alpha*u3 - alpha*u2;
      const x = a0*p0.x + a1*p1.x + a2*p2.x + a3*p3.x;
      const y = a0*p0.y + a1*p1.y + a2*p2.y + a3*p3.y;
      if (i === 0 && t === 0) continue;
      p.lineTo(x, y);
    }
  }
  p.close();
  return p;
};