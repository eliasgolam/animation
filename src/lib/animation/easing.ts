/**
 * Easing functions for smooth animations
 */

export type EasingFunction = (t: number) => number;

/**
 * Linear easing (no easing)
 */
export const linear: EasingFunction = (t: number): number => t;

/**
 * Ease in (slow start)
 */
export const easeIn: EasingFunction = (t: number): number => t * t;

/**
 * Ease out (slow end)
 */
export const easeOut: EasingFunction = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Ease in out (slow start and end)
 */
export const easeInOut: EasingFunction = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

/**
 * Elastic easing
 */
export const elastic: EasingFunction = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/**
 * Bounce easing
 */
export const bounce: EasingFunction = (t: number): number => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
};

/**
 * Sine easing in
 */
export const sineIn: EasingFunction = (t: number): number => {
  return 1 - Math.cos((t * Math.PI) / 2);
};

/**
 * Sine easing out
 */
export const sineOut: EasingFunction = (t: number): number => {
  return Math.sin((t * Math.PI) / 2);
};

/**
 * Sine easing in out
 */
export const sineInOut: EasingFunction = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/**
 * Quad easing in
 */
export const quadIn: EasingFunction = (t: number): number => t * t;

/**
 * Quad easing out
 */
export const quadOut: EasingFunction = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Quad easing in out
 */
export const quadInOut: EasingFunction = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

/**
 * Cubic easing in
 */
export const cubicIn: EasingFunction = (t: number): number => t * t * t;

/**
 * Cubic easing out
 */
export const cubicOut: EasingFunction = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Cubic easing in out
 */
export const cubicInOut: EasingFunction = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Exponential easing in
 */
export const expoIn: EasingFunction = (t: number): number => {
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
};

/**
 * Exponential easing out
 */
export const expoOut: EasingFunction = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Exponential easing in out
 */
export const expoInOut: EasingFunction = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return Math.pow(2, 20 * t - 10) / 2;
  } else {
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};

/**
 * Apply easing to a value
 */
export const applyEasing = (
  value: number,
  easing: EasingFunction,
  min: number = 0,
  max: number = 1
): number => {
  const eased = easing(value);
  return min + eased * (max - min);
};

/**
 * Create a custom easing function with configurable parameters
 */
export const createCustomEasing = (
  type: 'in' | 'out' | 'inOut',
  power: number = 2
): EasingFunction => {
  switch (type) {
    case 'in':
      return (t: number) => Math.pow(t, power);
    case 'out':
      return (t: number) => 1 - Math.pow(1 - t, power);
    case 'inOut':
      return (t: number) => {
        return t < 0.5
          ? Math.pow(2 * t, power) / 2
          : 1 - Math.pow(-2 * t + 2, power) / 2;
      };
    default:
      return linear;
  }
};

/**
 * Clamps a value between min and max
 * @param v - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 */
export const clamp = (v: number, min: number, max: number): number => {
  return Math.min(Math.max(v, min), max);
};

/**
 * Smoothstep function for smooth interpolation
 * @param e0 - Edge 0 (start)
 * @param e1 - Edge 1 (end)
 * @param x - Input value
 * @returns Smoothly interpolated value between 0 and 1
 */
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
};

/**
 * Exponential slew rate limiter for smooth transitions
 * @param current - Current value
 * @param target - Target value
 * @param attack - Attack rate (positive values)
 * @param release - Release rate (positive values)
 * @param dtSec - Delta time in seconds
 * @returns New value with exponential slew applied
 */
export const expSlew = (current: number, target: number, attack: number, release: number, dtSec: number): number => {
  const diff = target - current;
  const rate = diff >= 0 ? attack : release;
  return current + diff * (1.0 - Math.exp(-rate * dtSec));
};
