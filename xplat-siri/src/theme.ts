import type { SiriState } from "./state";
export type RGBA = [number, number, number, number];
export const PALETTES: Record<SiriState, { bg: RGBA; inner: RGBA; outer: RGBA; accent: RGBA; }> = {
  idle:       { bg:[0,0,0,0], inner:[0.40,0.69,0.98,0.9], outer:[0.38,0.18,0.96,0.7], accent:[0.20,0.90,0.65,0.9] },
  listening:  { bg:[0,0,0,0], inner:[0.25,0.78,0.95,0.95], outer:[0.20,0.35,0.95,0.8], accent:[0.10,1.00,0.80,1.0] },
  thinking:   { bg:[0,0,0,0], inner:[0.55,0.30,0.95,0.85], outer:[0.25,0.15,0.65,0.7], accent:[0.90,0.50,1.00,0.9] },
  speaking:   { bg:[0,0,0,0], inner:[0.98,0.55,0.85,0.95], outer:[0.95,0.25,0.55,0.8], accent:[1.00,0.80,0.30,1.0] },
};
export interface VisualParams { baseScale: number; wobble: number; glow: number; ringIntensity: number; }
export function paramsFor(state: SiriState, mic: number, tts: number): VisualParams {
  switch(state){
    case "idle":      return { baseScale: 1.00, wobble: 0.02, glow: 0.25, ringIntensity: 0.05 };
    case "listening": return { baseScale: 1.05 + mic*0.15, wobble: 0.06 + mic*0.12, glow: 0.35 + mic*0.35, ringIntensity: 0.20 + mic*0.50 };
    case "thinking":  return { baseScale: 1.03, wobble: 0.04, glow: 0.60, ringIntensity: 0.10 };
    case "speaking":  return { baseScale: 1.05 + tts*0.20, wobble: 0.05 + tts*0.10, glow: 0.40 + tts*0.45, ringIntensity: 0.25 + tts*0.60 };
  }
}

