import React, { useState, useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { Canvas, Path, Skia, RadialGradient, vec, Group, Circle, SweepGradient } from '@shopify/react-native-skia';
import { ANIMATION_CONFIG, BLOB_CONFIGS, SIRI_COLORS, defaultBackground } from '../constants/theme';
import type { SkPath } from '@shopify/react-native-skia';
import { makePerlin } from '../lib/math/noise';
import { createClosedCatmullRomPath } from '../lib/math/spline';
import { clamp, smoothstep, expSlew } from '../lib/animation/easing';
// SiriRing components not needed anymore - using direct SweepGradient implementation

// === Siri Gradient Constants (exakt für Hintergrundkreis) ===
// Farbpalette: Cyan → Teal → Azure → Indigo → Magenta → Crimson (Siri-typisch)

// Static Ring-Farben (no dynamic functions to avoid gradient issues)

export const SIRI_RING_COLORS: string[] = [
  'rgba(0, 214, 255, 0.60)',
  'rgba(0, 200, 238, 0.60)',
  'rgba(60, 160, 255, 0.55)',
  'rgba(46, 40, 120, 0.50)',
  'rgba(126, 32, 168, 0.50)',
  'rgba(196, 32, 120, 0.50)',
  'rgba(210, 32, 80, 0.45)',
  'rgba(0, 0, 0, 0.00)'
];

export const SIRI_RING_POS: number[] = [0.80, 0.90, 0.945, 0.97, 0.985, 0.993, 0.998, 1.0];

// Zentraler Bloom (breit, aber dezent; vermeidet Clip im Zentrum)
export const SIRI_BLOOM_COLORS: string[] = [
  'rgba(235, 245, 255, 0.075)',
  'rgba(170, 215, 255, 0.045)',
  'rgba(160, 90, 210, 0.037)',
  'rgba(0, 0, 0, 0.00)'
];

export const SIRI_BLOOM_POS: number[] = [0.00, 0.46, 0.82, 1.00];

// Basisfüllung – deutlich heller innen, dunkler nur am Rand
export const SIRI_BASE_COLORS: string[] = [
  'rgba(18,22,42,0.00)',   // Mitte nahezu transparent
  'rgba(26,30,50,0.18)',
  'rgba(24,28,44,0.32)',
  'rgba(22,26,40,0.44)'    // äußerer Rand am dunkelsten
];

export const SIRI_BASE_POS: number[] = [0.00, 0.62, 0.82, 1.00];

// Static Gate-Farben (no dynamic functions to avoid gradient issues)

export const SIRI_GATE_COLORS: string[] = [
  'rgba(0,0,0,0.18)',
  'rgba(0,0,0,0.12)',
  'rgba(0,0,0,0.00)'
];

export const SIRI_GATE_POS: number[] = [0.00, 0.66, 1.00];

// Tuning-Settings (für Feineinstellung via Props/State falls gewünscht)
export const SIRI_FALLOFF_SETTINGS = {
  gateRadiusK: 0.70,
  bloomOpacity: 0.08,      // war 0.08
  ringRadiusK: 0.92,       // Hintergrund-Ring Radius-Faktor
  spotsOpacity: 0.30,      // Wandering Spots
  edgeOpacity: 0.22,       // Orbiting Edge Highlight
  
  // Feintuning-Optionen
  gateAlphaBoost: 0.24,
  ringAlphaBoost: 0.02     // SIRI_RING_COLORS Alpha-Boost für mehr Farbe im Hintergrund
};

export interface SiriSkiaProps {
  amplitude: number;
  isRunning?: boolean;
  isDarkMode?: boolean;
}

// Debug-System für Layer-Toggles - Baseline-Modus
const DEBUG_LAYERS = {
  backdrop: false,      // DEAKTIVIERT für Baseline
  base: true,           // Basis-Kreis aktiv
  gate: false,          // Gate deaktiviert
  coreFlash: false,     // DEAKTIVIERT für Baseline
  caustics: false,      // DEAKTIVIERT für Baseline
  sweepGradient: false, // Sweep deaktiviert (lokaler Sweep für Blob)
  neonRing: false,      // DEAKTIVIERT für Baseline
  cyanHalo: false,      // DEAKTIVIERT für Baseline
  bloom: false,         // Bloom deaktiviert
  spots: false,         // DEAKTIVIERT für Baseline
  petals: false,        // DEAKTIVIERT für Baseline
  edgeHighlight: false, // DEAKTIVIERT für Baseline
  grain: false          // DEAKTIVIERT für Baseline
};

interface BlobPosition {
  blobId: number;
  x: number;
  y: number;
  z: number;
  depthScale: number;
  depthOpacity: number;
  color: {r: number, g: number, b: number, h: number, s: number, l: number};
  isVisible: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface BlobConfig {
  colorKey: string;
  size: number;
  phases: number[];
  frequencies: number[];
  amplitudes: number[];
  speeds: number[];
  rotationSpeed: number;
  breathingFreq: number;
  breathingAmp: number;
  seed: number;
}

interface BlobData {
  index: number;
  blobId: number;
  position: BlobPosition;
  blob: BlobConfig;
  path: SkPath;
  finalRadius: number;
  adjustedX: number;
  adjustedY: number;
  depthOpacity: number;
}

// Screen dimensions
const { width, height } = Dimensions.get('window');
const centerX = width / 2;
const centerY = height * 0.5;

// Edge ripple low-pass filter parameter
const EDGE_EMA_ALPHA = 0.04; // Further reduced for even smoother main circle

// Global gain fine-tuning for core spots
const CORE_SPOT_GAIN = 1.35; // +35% mehr Helligkeit für Spots

// Wandering spots constants for simplified motion
const SPOT_SX = 1.02;
const SPOT_SY = 0.98;
const SPOT_PHASE_NOISE_FREQ = 0.05; // Hz (very slow)

// Stable blob IDs for consistent state management
const blobIds = BLOB_CONFIGS.map((_, i) => i);

// Helper function to get blob color
const getBlobColor = (colorKey: string): string => {
  return SIRI_COLORS[colorKey as keyof typeof SIRI_COLORS] || SIRI_COLORS.siriBlue;
};

// Subtle dithering function for alpha values
const dither = (seed: number, t: number) => {
  const k = Math.sin(seed * 12.9898 + Math.floor(t * 10) * 78.233) * 43758.5453;
  return (k - Math.floor(k)) * 0.02 - 0.01; // ±1%
};

// Gradient position jitter for organic variation
const jitter = (seed: number, base: number, t: number, amt = 0.002) => {
  const k = Math.sin(seed * 91.7 + t * 37.1);
  return Math.max(0, Math.min(1, base + k * amt));
};

// 3D Rotation Matrix functions
const createRotationMatrix = (theta: number, phi: number): number[][] => {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  return [
    [cosTheta * cosPhi, -sinTheta, cosTheta * sinPhi],
    [sinTheta * cosPhi, cosTheta, sinTheta * sinPhi],
    [-sinPhi, 0, cosPhi]
  ];
};

const rotate3DPoint = (point: Point3D, matrix: number[][]): Point3D => {
  return {
    x: point.x * matrix[0][0] + point.y * matrix[0][1] + point.z * matrix[0][2],
    y: point.x * matrix[1][0] + point.y * matrix[1][1] + point.z * matrix[1][2],
    z: point.x * matrix[2][0] + point.y * matrix[2][1] + point.z * matrix[2][2]
  };
};

// Ultra-simple rotation without complex precession
const precessAngles = (base: {theta:number; phi:number}, t:number, seed:number) => {
  const slow = t * 0.03; // Very slow precession
  return {
    theta: base.theta + 0.05 * Math.sin(slow * 0.15 + seed * 2.0), // Minimal precession
    phi: base.phi + 0.04 * Math.cos(slow * 0.12 + seed * 1.8) // Minimal precession
  };
};

// Tangente/Normale Schätzung per Winkel
const computeNormal2D = (angle: number): {nx: number; ny: number} => {
  // Kreisbasisnormalen (nach außen)
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  return { nx, ny };
};

// Fresnel-ähnliche Highlight-Intensität basierend auf Lichtvektor
// lightDir sollte normalisiert sein
const highlightIntensity = (nx: number, ny: number, lightDir: {x:number;y:number}, gloss: number) => {
  const dp = Math.max(0, nx * lightDir.x + ny * lightDir.y);
  // Gloss steuert Schärfe des Highlights - schärfer für realistischere Reflexionen
  const i = Math.pow(dp, gloss);
  // Zusätzliche Fresnel-Komponente für glasigen Look
  const fresnel = Math.pow(1 - dp, 2);
  return i * (0.7 + 0.3 * fresnel);
};

// Einfache Occlusion aufgrund von Z (hinten weniger Licht/Opacity)
const occlusionFromZ = (z: number, sphereRadius: number) => {
  // z in [-sphereRadius, +sphereRadius]
  const depth = (z + sphereRadius) / (2 * sphereRadius); // 0..1
  // Vorne ~1.0, hinten ~0.15 - stärkere Occlusion für bessere Tiefe
  const occlusion = 0.15 + 0.85 * Math.pow(depth, 1.2);
  return occlusion;
};

const nearestNeighborDist = (i:number, positions: BlobPosition[]) => {
  let best = Infinity;
  const p = positions[i];
  for (let j=0;j<positions.length;j++){
    if (j===i) continue;
    const q = positions[j];
    const dx = q.x - p.x, dy = q.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
};

/**
 * Creates a Siri blob path with organic deformations
 */
const createSiriBlobPath = (
  centerX: number,
  centerY: number,
  baseRadius: number,
  time: number,
  amplitudeFactor: number,
  config: BlobConfig,
  perlinFn: (x: number, y: number, z: number) => number,
  isMain: boolean = false,
  totalDefEmaMapRef?: React.MutableRefObject<{ [key: string]: number }>,
  rotLocal: number = 0,
  shapeRefs?: React.MutableRefObject<{ [key: number]: { sx: number; sy: number; sh: number } }>
): import('@shopify/react-native-skia').SkPath => {
  const points: { x: number; y: number; }[] = [];
  const numPoints = 96;
  let totalDefEma = 0;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
  
    if (isMain) {
      const phaseOffset1 = config.seed * Math.PI * 2;
      const phaseOffset2 = (config.seed + 0.3) * Math.PI * 2;
      const phaseOffset3 = (config.seed + 0.7) * Math.PI * 2;
    
      const GLOBAL_PHASE = 2 * Math.PI * 0.03 * time;
    
      const wave1 = Math.sin(angle * 1.2 + phaseOffset1 + time * 0.4 + GLOBAL_PHASE) * (baseRadius * 0.0052);
      const wave2 = Math.sin(angle * 1.8 + phaseOffset2 + time * 0.55 + GLOBAL_PHASE) * (baseRadius * 0.0023);
      const wave3 = Math.sin(angle * 2.3 + phaseOffset3 + time * 0.75 + GLOBAL_PHASE) * (baseRadius * 0.0015);
    
      const totalDeformation = wave1 + wave2 + wave3;
    
      let finalRadius: number;
      if (totalDefEmaMapRef) {
        const emaKey = 'main';
        const prev = totalDefEmaMapRef.current[emaKey] ?? totalDeformation;
        const newTotalDefEma = prev + EDGE_EMA_ALPHA * (totalDeformation - prev);
        totalDefEmaMapRef.current[emaKey] = newTotalDefEma;
        finalRadius = baseRadius + newTotalDefEma;
      } else {
        totalDefEma = totalDefEma + (totalDeformation - totalDefEma) * EDGE_EMA_ALPHA;
        finalRadius = baseRadius + totalDefEma;
      }
    
      const x = centerX + Math.cos(angle) * finalRadius;
      const y = centerY + Math.sin(angle) * finalRadius;
      points.push({ x, y });
    } else {
      const breathe = 1 + ((Math.sin(time * config.breathingFreq) + 1) * 0.5) * (config.breathingAmp * 0.35);
      const shapedRadius = baseRadius * (breathe + amplitudeFactor * 0.01);
    
      return makeBlobPath2D(centerX, centerY, shapedRadius, time, config.seed, rotLocal, shapeRefs, config.seed);
    }
  }

  const path = createClosedCatmullRomPath(points, 0.2, Skia as any);
  return path;
};

/**
 * Helper function for 2D blob path generation
 */
// Glatter, lappenfreier Blob: nur niederfrequente Noise, sanfte Konturen
function makeBlobPath2D(
  cx: number, cy: number, baseR: number, t: number,
  seed = 0, rotLocal = 0,
  shapeRefs?: React.MutableRefObject<{ [key: number]: { sx: number; sy: number; sh: number } }>,
  blobId?: number
) {
  const n = 128;

  // Sichtbare Siri-Deformation - organischer
  const amp1 = 0.035 * baseR;   // 3.5% Radius (sichtbarer)
  const amp2 = 0.008 * baseR;   // 0.8% Radius (sichtbarer)
  const f1 = 0.65;              // niedrige „Atmungs"-Welle
  const f2 = 1.25;              // 2. Harm. sichtbar
  const speed = 0.012;          // langsam aber sichtbar

  const phase = 2 * Math.PI * speed * t + seed * 0.9;

  const pts: {x:number;y:number}[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI;
    const rDelta =
      amp1 * Math.sin(f1 * ang + phase) +
      amp2 * Math.sin(f2 * ang - phase * 0.4);

    const r = baseR + rDelta;
    pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }

  // quasi-konstante Ellipse/Shear (praktisch aus)
  const rawSx = 1.0002, rawSy = 0.9998, rawSh = 0.0;
  let sx = rawSx, sy = rawSy, sh = rawSh;
  if (shapeRefs && blobId !== undefined) {
    const prev = shapeRefs.current[blobId] || { sx: rawSx, sy: rawSy, sh: rawSh };
    const dt = 0.016, tau = 2.0;
    sx = expSlewSimple(prev.sx, rawSx, tau, dt);
    sy = expSlewSimple(prev.sy, rawSy, tau, dt);
    sh = expSlewSimple(prev.sh, rawSh, tau, dt);
    shapeRefs.current[blobId] = { sx, sy, sh };
  }

  const warped = pts.map(p => applyAnisoShear(cx, cy, p, sx, sy, sh, rotLocal));
  return createClosedCatmullRomPath(warped, 0.28, Skia as any); // noch stärker glätten
}

// Anisotrope Skalierung + Shear im lokalen Blob-Frame
const applyAnisoShear = (cx:number, cy:number, p:{x:number;y:number}, sx:number, sy:number, sh:number, rot:number) => {
  // translate to local
  const x = p.x - cx, y = p.y - cy;
  // rotation
  const ca = Math.cos(rot), sa = Math.sin(rot);
  let xr =  ca * x + sa * y;
  let yr = -sa * x + ca * y;
  // shear (x += sh * y)
  xr = xr + sh * yr;
  // scale
  xr *= sx;
  yr *= sy;
  // rotate back
  const xo =  ca * xr - sa * yr;
  const yo =  sa * xr + ca * yr;
  return { x: cx + xo, y: cy + yo };
};

// Radiales Feld (soft fill) im lokalen Blob-Frame
// Hier: F(d) = clamp(1 - (d/R)^2, 0, 1)
function radialField(px:number, py:number, cx:number, cy:number, R:number) {
  const dx = px - cx, dy = py - cy;
  const q = (dx*dx + dy*dy) / (R*R);
  return Math.max(0, 1 - q);
}

// Screen-space Approximation der Normale über Feldgradient (finite difference)
function fieldNormal(px:number, py:number, cx:number, cy:number, R:number, eps:number=1.0) {
  const fL = radialField(px - eps, py, cx, cy, R);
  const fR = radialField(px + eps, py, cx, cy, R);
  const fT = radialField(px, py - eps, cx, cy, R);
  const fB = radialField(px, py + eps, cx, cy, R);
  let nx = (fR - fL);
  let ny = (fB - fT);
  const len = Math.hypot(nx, ny) || 1;
  nx /= len; ny /= len;
  return { nx, ny };
}

// Schmale Bandmaske am Rand (Rim) – positioniert relativ zum Radius
// returns mask 0..1, peak bei r ≈ bandCenter (in [0..1] relativ zum R)
function rimBand(px:number, py:number, cx:number, cy:number, R:number, bandCenter:number, bandWidth:number) {
  const d = Math.hypot(px - cx, py - cy) / (R + 1e-6); // normierte Distanz
  const a = Math.abs(d - bandCenter) / (bandWidth + 1e-6);
  // weiche Gauß-/Exp-Falloff
  return Math.exp(-a*a*2.5);
}

// Versatz für Rim-Zentrum entlang der Lichtseite (tangential zum Blob)
function rimOffsetFor(blobX:number, blobY:number, R:number, light:{x:number;y:number}, gain:number=0.10) {
  // Tangentenrichtung: rotiere den Lichtvektor um +90°
  const tx = -light.y, ty = light.x;
  // leicht nach außen versetzen (R * gain) und etwas entlang T schieben (R * 0.16)
  const dx = (-light.x) * R * gain + tx * R * 0.16;
  const dy = (-light.y) * R * gain + ty * R * 0.16;
  return { dx, dy };
}

// RGB to HSL conversion
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

// HSL to RGB conversion
const hslToRgb = (h: number, s: number, l: number) => {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

// Update blob colors dynamically for harmonious animation
const updateBlobColorSmooth = (prevHSL: {h: number, s: number, l: number}, targetHSL: {h: number, s: number, l: number}, dt: number) => {
  const HUE_RATE_DEG_PER_S = 6;
  const SAT_RATE_PER_S = 0.18;
  const LIG_RATE_PER_S = 0.12;

  const hueDiff = targetHSL.h - prevHSL.h;
  const satDiff = targetHSL.s - prevHSL.s;
  const lightDiff = targetHSL.l - prevHSL.l;

  const limitedHueDiff = Math.max(-HUE_RATE_DEG_PER_S * dt, Math.min(HUE_RATE_DEG_PER_S * dt, hueDiff));
  const limitedSatDiff = Math.max(-SAT_RATE_PER_S * dt, Math.min(SAT_RATE_PER_S * dt, satDiff));
  const limitedLightDiff = Math.max(-LIG_RATE_PER_S * dt, Math.min(LIG_RATE_PER_S * dt, lightDiff));

  const newH = (prevHSL.h + limitedHueDiff + 360) % 360;
  const newS = Math.max(0, Math.min(100, prevHSL.s + limitedSatDiff));
  const newL = Math.max(0, Math.min(100, prevHSL.l + limitedLightDiff));

  return { h: newH, s: newS, l: newL };
};

// Helper function for dt-robust exponential smoothing
const expSlewSimple = (current: number, target: number, tau: number, dt: number) => {
  const a = 1 - Math.exp(-dt / tau);
  return current + a * (target - current);
};

// Helper functions for core effects
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (x: number) => {
  const k = clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
};
const toHexA = (a: number) =>
  Math.max(0, Math.min(255, (a * 255) | 0))
    .toString(16)
    .padStart(2, '0');

const BASELINE_22 = true;
const BASELINE_24 = true; // Edge Color Whisper aktivieren/deaktivieren

// Specular Sparkle tuning
const SPEC = {
  minOp: 0.02,        // Grundglanz, fast unsichtbar
  maxOp: 0.22,        // Peak‑Highlight (dezent: 0.18–0.22)
  sizeR: 0.075,       // Radius des Hotspot-Kerns relativ R (dezent: 0.075)
  falloff: 0.72,      // 0.7–0.9: kleiner = härter (mehr "nass": 0.7)
  bloomMul: 1.20,     // Zusatz-Bloom für "nasse" Glasoptik (dezent: 1.2, mehr "nass": 1.5)
  decay: 7.0,         // s^-1 (Exponentieller Abfall) (gegen Flackern: 7–8)
  attack: 14.0,       // s^-1 (Schnelles Einschwingen) (gegen Flackern: 12–14)
  tilt: 16 * Math.PI/180, // leichter Licht-Tilt
  hueShift: 0.025,    // 0–0.07: wärmt die Specular etwas (gegen zu "weiß": 0.02–0.03)
};

// Refraction/Edge effects tuning
const REFR = {
  width: 0.034,       // Randbreite relativ R (Range: 0.020–0.040) - Abstand der zwei chromatischen Säume zur Kreis‑Edge
  shift: 0.008,       // spektrale Verschiebung (Range: 0.004–0.010) - Spektrale Radial‑Verschiebung pro Rim
  op: 0.10,           // Grundopacity (Range: 0.08–0.14) - Master‑Helligkeit beider Rims
  opAmp: 0.24,        // Amplituden‑Zuschlag (Range: 0.10–0.28) - Reaktivität auf Amplitude
  breathShift: 0.40,  // Breath‑Modulation (Range: 0.20–0.50) - Radial‑Verschiebung mit Breath‑Phase
  speed: 0.48,        // azimutale Drift (Range: 0.18–0.55) - SweepGradient start/end Geschwindigkeit
  hueCool: '#8FC3FF', // kühles Blau (Vorschläge: '#8FC3FF' kühler, '#A6CEFF' neutraler)
  hueWarm: '#FFC893', // warmes Amber (Vorschläge: '#FFC893' rötlicher, '#FFE1B8' neutraler)
};

// Caustic/Edge refinement tuning
const CAU = {
  arcDeg: 56, // Increased from 28
  coolOp: 0.26, // Reduced from 0.28
  warmOp: 0.25, // Reduced from 0.26
  coolHue: '#8FC3FF',
  warmHue: '#FFC893',
  radialTightCool: [0.74, 0.90, 0.988],
  radialTightWarm: [0.60, 0.84, 0.988],
  sweepTightC: [0.10, 0.18, 0.28],
  sweepTightW: [0.62, 0.70, 0.80],
  bloom: 0.16, // Increased from 0.14
};

const CAU_SPEED = 0.62; // arc sweep speed (rad/s)

// Rim Clamp (Sicherheitsdeckel gegen Übersättigung)
const RIM_CLAMP = { 
  opMax: 0.30, 
  arcCoolMax: 0.28, 
  arcWarmMax: 0.24 
};

// Core effects tuning
const CORE = {
  rInner: 0.055, // innerster Kern (relativ R)
  rOuter: 0.36, // bis hierhin Caustic-Falloff
  cool: '#9BC2FF', // kühler Tint
  warm: '#FFE0C2', // warmer Tint
  opMax: 0.20, // 0.18–0.22; stays under clamps
  pulseAmt: 0.08, // 0–0.1
  grain: 0.12, // mikroskopische Variation
};

// Ripple effects tuning
const RIP = {
  kCount: 3, // Anzahl überlagerter Ripples
  freq: [1.0, 1.35, 1.9], // relative Frequenzen
  amp: 0.065, // Gesamtauslenkung (0.05–0.07)
  falloff: 1.8, // radialer Abfall
  op: 0.20, // Gesamtopacity (0.14–0.22)
  swirl: 0.45, // leichter Winkel‑Drift
  speed: 0.6, // Rotationsgeschwindigkeit
  hueCool: '#94B7E9',
  hueWarm: '#FFDDBF',
};

// Speckle effects tuning
const SPECK = {
  count: 22, // 20–26
  rMin: 0.38, // relativ R
  rMax: 0.86,
  size: [0.006, 0.018],
  opMin: 0.04,
  opMax: 0.16, // +0.02 from base for clarity
  drift: 0.45, // radiales Wandern
  swirl: 0.9, // Winkel‑Drift
  speed: 0.8, // Basisgeschwindigkeit
};

// Bloom effects tuning
const BLOOM = {
  edgeOp: 0.20, // 0.18–0.24
  edgeR: 1.20, // softer outer rolloff
  vignette: 0.12, // 0.10–0.14
  tilt: 0.06, // leichtes Downlight
};

// Motion effects tuning
const MOT = {
  arcEase: 0.55, // 0.4–0.7 non-linear orbit
};

// Twinkle effects tuning
const TWK = {
  rate: 0.12, // events per second per speck
  boost: 1.8, // Verstärkung
  decay: 7.0, // Abklingen
};

// Sparkle effects tuning
const SPARC = {
  count: 4, // 2–4 Funken
  baseR: 0.96, // Nähe zur Edge (relativ R)
  sizeR: 0.060, // Kernradius (relativ R)
  opMin: 0.04,
  opMax: 0.22,
  attack: 18.0, // Einschwingen
  release: 8.0, // Abklingen
  hue: '#FFFFFF', // Screen-weiß
};

// Static arrays for performance (no need for useMemo since they're constant)
const RIP_SWEEP_POS = Array.from({ length: 361 }, (_, i) => i / 360);

export default function SiriSkia({
  amplitude,
  isRunning = true,
  isDarkMode = true
}: SiriSkiaProps) {
  // Get screen dimensions
  const { width, height } = Dimensions.get('window');
  const centerX = React.useMemo(() => width / 2, [width]);
  const centerY = React.useMemo(() => height / 2, [height]);
  
  
  // Debug toggles for evaluation
  const DEBUG = { showZLayers: false, freezeForces: false, showNormals: false };
  // Animation state using refs for performance
  const tRef = React.useRef(0);
  const rotRef = React.useRef(0);
  const ampRef = React.useRef(0);
  const [tick, setTick] = useState(0);
  const animationRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number>((globalThis.performance?.now?.() ?? Date.now()) / 1000);
  const dtEmaRef = React.useRef(1/60);
  const mainRadiusRef = React.useRef(70);
  const totalDefEmaMapRef = React.useRef<{ [key: string]: number }>({});
  const blobColorsRef = React.useRef<Record<number, {r: number, g: number, b: number, h: number, s: number, l: number}>>({});
  const colorEMARef = React.useRef<Record<number, {r: number, g: number, b: number}>>({});
  const perspRef = React.useRef<Record<number, number>>({});
  const xEmaRef = React.useRef<Record<number, number>>({});
  const yEmaRef = React.useRef<Record<number, number>>({});
  const zEmaRef = React.useRef<Record<number, number>>({});
  const perlinMapRef = React.useRef<Record<number, (x: number, y: number, z: number) => number>>({});

  // Schritt 2.3: Breathing-Phase (6–8s), geteilt für Glow & Specular
  const breathPhaseRef = React.useRef(0);
  const breathEnvRef = React.useRef(0); // 0..1 eased amplitude
  
  // Speichert schnelle Peak-Envelope
  const specEnvRef = React.useRef(0);
  const sparkEnvRef = React.useRef(0);
  
  // Crossfade-Envelope
  const coreEnvRef = React.useRef(0); // warm<->cool crossfade 0..1
  const corePulseRef = React.useRef(0); // sanftes Atmen
  
  // REFR phase for azimuthal movement
  const phaseRef = React.useRef(0);
  const rimShiftRef = React.useRef(0);
  const rimOpRef = React.useRef(0);
  const ripplePhaseRef = React.useRef(0);
  const speckSeedRef = React.useRef(1.234);
  const twinkleBufRef = React.useRef<number[]>([]);

  // Create perlin noise function for organic movement
  const perlinFn = React.useMemo(() => makePerlin(42), []);
  const mainNoise = React.useMemo(() => makePerlin(0.1), []);

  // Rotation helper function
  const rot = (x: number, y: number, a: number, cx: number, cy: number) => {
    const dx = x - cx, dy = y - cy;
    const ca = Math.cos(a), sa = Math.sin(a);
    return vec(cx + dx*ca - dy*sa, cy + dx*sa + dy*ca);
  };

  // Initialize rotation offset for Cyan at top-left
  useEffect(() => { 
    rotRef.current = -Math.PI * 0.25; 
    // Initialize twinkle buffer
    twinkleBufRef.current = new Array(SPECK.count).fill(0);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (ts?: number) => {
      // High-resolution timestamp from rAF
      const nowSec = (ts ?? (globalThis.performance?.now?.() ?? Date.now())) / 1000;
      const lastSec = lastTimeRef.current;
      const rawDt = Math.max(0, Math.min(0.1, nowSec - lastSec)); // cap at 100ms
      lastTimeRef.current = nowSec;
      // One unified dt for the whole frame
      dtEmaRef.current = dtEmaRef.current + (rawDt - dtEmaRef.current) * 0.3;
      const dtUsed = dtEmaRef.current;
      tRef.current += dtUsed;

      // 2.3: Breathing (7.2s Zyklus) – weiches Ease-In-Out
      const breathSpeed = (2 * Math.PI) / 7.2;
      breathPhaseRef.current = (breathPhaseRef.current + dtUsed * breathSpeed) % (2 * Math.PI);
      const rawBreath = 0.5 - 0.5 * Math.cos(breathPhaseRef.current); // 0..1, ease-in-out
      // leichte zusätzliche Glättung
      breathEnvRef.current = expSlewSimple(breathEnvRef.current, rawBreath, 0.36, dtUsed);

      // Speichert schnelle Peak-Envelope
      const amp = Math.min(1, amplitude / 100); // 0..1
      const specDt = Math.max(1e-3, dtUsed);
      
      // Attack/Release
      const target = Math.min(1, amp * 1.15); // leicht "overdrive"
      const env = specEnvRef.current;
      const kUp = 1 - Math.exp(-SPEC.attack * specDt);
      const kDn = 1 - Math.exp(-SPEC.decay * specDt);
      specEnvRef.current = target > env ? env + (target - env) * kUp
                                        : env + (target - env) * kDn;
      
      // Sparkle envelope
      {
        const target = clamp(ampRef.current, 0, 1);
        const kUp = 1 - Math.exp(-SPARC.attack * dtUsed);
        const kDn = 1 - Math.exp(-SPARC.release * dtUsed);
        const e = sparkEnvRef.current;
        sparkEnvRef.current = target > e ? e + (target - e) * kUp : e + (target - e) * kDn;
      }
      
      // Crossfade envelope
      {
        // Crossfade folgt Amplitude gemütlich
        const target = clamp(ampRef.current, 0, 1);
        const k = 1 - Math.exp(-3.5 * dtUsed);
        coreEnvRef.current = coreEnvRef.current + (target - coreEnvRef.current) * k;
        // Pulsation – langsames Atmen plus leichte Random‑Mod
        const t = tRef.current;
        const slow = 0.5 + 0.5 * Math.sin(t * 0.7 + 0.3 * Math.sin(t * 0.11));
        const jitter = 0.5 + 0.5 * Math.sin(t * 3.1 + 1.7);
        corePulseRef.current = (1 - CORE.pulseAmt) + CORE.pulseAmt * (0.75 * slow + 0.25 * jitter);
        // Micro-Jitter für Core
        corePulseRef.current *= 1.0 + 0.0025 * Math.sin(t * 13.7 + 0.9);
      }
      
      // Ripple phase update
      {
        ripplePhaseRef.current += RIP.speed * dtUsed;
      }
      
      // Speckle drift update
      {
        speckSeedRef.current += SPECK.speed * dtUsed;
      }
      
      // Twinkle update
      {
        // deterministische, leichte PRNG statt Math.random()
        let seed = speckSeedRef.current;
        const lcg = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
        for (let i = 0; i < twinkleBufRef.current.length; i++) {
          if (lcg() < TWK.rate * dtUsed) twinkleBufRef.current[i] = TWK.boost;
          twinkleBufRef.current[i] *= Math.exp(-TWK.decay * dtUsed);
        }
        speckSeedRef.current = seed;
      }
      
      // Organische Rotation ~ 6°/s mit "Atmen"
      const baseRot = Math.PI / 30; // ~6°/s
      const rotMod = 1 + 0.06 * Math.sin(tRef.current * 0.3); // Leichte Modulation
      rotRef.current += dtUsed * baseRot * rotMod;

      const targetAmplitude = amplitude / 100;
      ampRef.current = expSlew(ampRef.current, targetAmplitude, 6.6, 4.6, dtUsed);

      // REFR frame loop variables
      phaseRef.current = (phaseRef.current || 0) + REFR.speed * dtUsed;
      rimShiftRef.current = REFR.shift * (1 + REFR.breathShift * breathEnvRef.current); // 0..~
      const rimTarget = REFR.op + REFR.opAmp * Math.min(1, amplitude / 100);
      rimOpRef.current = expSlewSimple(rimOpRef.current || rimTarget, rimTarget, 0.22, dtUsed);

      setTick(x => (x + 1) % 1000);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRunning, amplitude]);

  // Optimized circle pulsation with smooth easing
  const t = tRef.current;
  const amplitudeEnv = ampRef.current;
  const eased = smoothstep(0, 1, clamp(amplitudeEnv, 0, 1));

  // Smooth pulsation between 65px and 75px radius
  const baseRadius = 70;
      const pulsationRange = 3.5;
  const baseOmega = 0.8;
  const driftF = 1.0 + 0.02 * (perlinFn(t * 0.17, 0.07, 2.4) - 0.5);
  const driftPhi = 0.25 * (perlinFn(t * 0.09, 0.11, 3.1) - 0.5);
  const puls = Math.sin((baseOmega * driftF) * t + driftPhi);
  const easedPulsation = smoothstep(-1, 1, puls);
  const pulsationScale = 1 + (easedPulsation - 0.5) * (pulsationRange / baseRadius);

  // Combine with amplitude scaling for responsive behavior
  const amplitudeScale = eased * (ANIMATION_CONFIG.amplitudeScaling * 0.3);
  const mainScale = pulsationScale + amplitudeScale;

  // Calculate target radius with dt-robust smoothing
  const rTarget = baseRadius * mainScale;
  const dt = dtEmaRef.current;
  mainRadiusRef.current = expSlewSimple(mainRadiusRef.current, rTarget, 0.32, dt);
  const mainRadius = mainRadiusRef.current;

  // Memoized circle paths for performance
  const circlePath = React.useMemo(() => {
    const p = Skia.Path.Make();
    // addCircle gibt die Path-Referenz zurück; zusätzliches Return aus addCircle nicht nötig
    p.addCircle(centerX, centerY, mainRadius);
    return p;
  }, [centerX, centerY, mainRadius]);

  const circlePathOuter = React.useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(centerX, centerY, mainRadius * (1.0 + REFR.width));
    return p;
  }, [centerX, centerY, mainRadius]);

  const circlePathInnerWarm = React.useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(centerX, centerY, mainRadius * (1.0 - REFR.width * 0.35));
    return p;
  }, [centerX, centerY, mainRadius]);

  // Sphere radius
  const sphereRadius = mainRadius * ANIMATION_CONFIG.sphereRadiusFactor;

  // Simple blob positions with organic movement and dynamic colors
  const blobPositions: BlobPosition[] = React.useMemo(() => {
    const t = tRef.current;
    const amplitudeEnv = ampRef.current;
    const eased = smoothstep(0,1, clamp(amplitudeEnv,0,1));
    const orbScale = 1 + 0.08 * eased;
  
    const stablePositions = blobIds.map((blobId) => {
      const blob = BLOB_CONFIGS[blobId];
      const blobTime = t * (0.15 + blob.seed * 0.08);
      const phaseOffset = blob.seed * Math.PI * 2;

      const baseTheta = blobTime * (blob.rotationSpeed * 0.2 * (1 + 0.03*eased)) + phaseOffset;
      const basePhi = blobTime * (blob.rotationSpeed * 0.15 * (1 + 0.02*eased)) + phaseOffset * 0.5;
    
      const pre = precessAngles(
        { theta: baseTheta, phi: basePhi },
        t,
        blob.seed
      );
      const rotationMatrix = createRotationMatrix(pre.theta, pre.phi);

      const orbitTime = t * (0.004 + blob.seed * 0.0012) + blob.seed * 0.8;
      const orbitAngle = blobId * 0.8 + orbitTime;
    
      const baseOrbitRadius = sphereRadius * (0.78 * orbScale); // Orbit
      const clampR = sphereRadius * 0.82; // Grenze - enger für zentrierte Orbits
    
      const breathingTime = t * 0.02 + blob.seed * 0.4;
      const breathingPhase = Math.sin(breathingTime) * 0.15 + 0.85;
      const breathingRadius = baseOrbitRadius * (0.98 + 0.02 * breathingPhase);
    
      // Eccentric orbits with dynamic eccentricity - reduziert für zentrierte Orbits
      const ecc = 0.05 + 0.02 * Math.sin(t * 0.15 + blob.seed * 3.1);
    
      const basePos: Point3D = {
        x: Math.sin(orbitAngle) * breathingRadius * (1 + ecc),
        y: Math.cos(orbitAngle) * breathingRadius * (1 - ecc),
        z: Math.sin(blobId * 0.5 + blob.seed * 0.3) * sphereRadius * (0.4 * orbScale)
      };

      const rotatedPos = rotate3DPoint(basePos, rotationMatrix);
      const physicsPos = rotatedPos;

      const rawPerspective = 1 + (physicsPos.z / sphereRadius) * (0.22 + 0.06 * eased);
    
      const prevP = perspRef.current[blobId] ?? rawPerspective;
      const perspective = expSlewSimple(prevP, rawPerspective, 0.28, dtEmaRef.current);
      perspRef.current[blobId] = perspective;
    
      const prevX = xEmaRef.current[blobId] ?? physicsPos.x;
      const prevY = yEmaRef.current[blobId] ?? physicsPos.y;
      const prevZ = zEmaRef.current[blobId] ?? physicsPos.z;
    
      const smoothedX = expSlewSimple(prevX, physicsPos.x, 0.28, dtEmaRef.current);
      const smoothedY = expSlewSimple(prevY, physicsPos.y, 0.28, dtEmaRef.current);
      const smoothedZ = expSlewSimple(prevZ, physicsPos.z, 0.28, dtEmaRef.current);
    
      xEmaRef.current[blobId] = smoothedX;
      yEmaRef.current[blobId] = smoothedY;
      zEmaRef.current[blobId] = smoothedZ;
    
      let projectedX = centerX + smoothedX * perspective;
      let projectedY = centerY + smoothedY * perspective;
      const dx = projectedX - centerX, dy = projectedY - centerY;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > clampR) {
        const k = clampR / dist;
        projectedX = centerX + dx * k;
        projectedY = centerY + dy * k;
      }

      const zDepth = (smoothedZ + sphereRadius) / (2 * sphereRadius);
      const frontness = clamp((smoothedZ / sphereRadius) * 0.5 + 0.5, 0, 1);
    
      const frontColorBoost = 0.20 * frontness; // vorn +20% Sättigung on top
    
      const enhancedDepthScale = 1.0;       // keine Größe aus Z
      const enhancedDepthOpacity = 0.75;    // konstante Sichtbarkeit

      // Farbsystem gemäß Slots + Lautstärke-Kopplung an Feldstärke
      const huePalette = [195, 270, 310, 220, 155]; // cyan, violet, magenta, blue, green
      const baseHue = huePalette[blobId % huePalette.length];
      const targetHue = baseHue; // Slot fix, geringe Drift optional
      const loud = clamp(ampRef.current, 0, 1);
      // Dynamik: Sättigung +7–15%, Luminanz +4–8% bei Lautstärke - abgeschwächt
      const satBoost = 0.07 + 0.08 * loud; // 7–15%
      const lumBoost = 0.04 + 0.04 * loud; // 4–8%
      const targetSaturation = Math.round( (baseHue===155?0.75:0.85) * 100 * (1 + satBoost) ); // 75–85% Basis
      const targetLightness = Math.round( (baseHue===155?0.55:0.60) * 100 * (1 + lumBoost) ); // 55–60% Basis
    
      const targetHSL = { h: targetHue, s: targetSaturation, l: targetLightness };
      const prevHSL = blobColorsRef.current[blobId] || targetHSL;
      const dtLocal = dtEmaRef.current;
      const newHSL = updateBlobColorSmooth(prevHSL, targetHSL, dtLocal);

      // kein frontness-Boost
      const boostedH = newHSL.h;
      const boostedS = newHSL.s;
      const boostedL = newHSL.l;

      // Frontness boost - reduziert für sattere Farben
      const frontnessBoost = clamp((smoothedZ / sphereRadius) * 0.5 + 0.5, 0, 1);
      const adjHSL = { 
        h: newHSL.h, 
        s: Math.max(0, Math.min(100, newHSL.s + 1.2 * frontnessBoost)), 
        l: Math.max(0, Math.min(100, newHSL.l + 0.8 * frontnessBoost)) 
      };
      const newRGB = hslToRgb(adjHSL.h, adjHSL.s, adjHSL.l);
    
      blobColorsRef.current[blobId] = {
        h: newHSL.h,
        s: newHSL.s,
        l: newHSL.l,
        r: newRGB.r,
        g: newRGB.g,
        b: newRGB.b
      };
      const prevRGB = colorEMARef.current[blobId] || newRGB;
      const smoothedRGB = {
        r: expSlewSimple(prevRGB.r, newRGB.r, 0.28, dtEmaRef.current),
        g: expSlewSimple(prevRGB.g, newRGB.g, 0.28, dtEmaRef.current),
        b: expSlewSimple(prevRGB.b, newRGB.b, 0.28, dtEmaRef.current)
      };
      colorEMARef.current[blobId] = smoothedRGB;
    
      const dynamicColor = { 
        h: newHSL.h, 
        s: newHSL.s, 
        l: newHSL.l,
        r: smoothedRGB.r,
        g: smoothedRGB.g,
        b: smoothedRGB.b
      };
    
      return {
        blobId,
        x: projectedX,
        y: projectedY,
        z: smoothedZ,
        depthScale: enhancedDepthScale,
        depthOpacity: enhancedDepthOpacity,
        color: dynamicColor,
        isVisible: smoothedZ > -sphereRadius * 0.95
      };
    });

    return stablePositions.sort((a,b) => a.z - b.z);
  }, [tick, mainRadius, centerX, centerY]);

  // Create main circle path with optimized pulsation
  const mainCirclePath = React.useMemo(() => {
    const t = tRef.current;
    const amplitudeEnv = ampRef.current;
    const mainTime = t * 0.8;
    const eased = smoothstep(0, 1, clamp(amplitudeEnv, 0, 1));
    const amplitudeFactor = eased * 0.1;

    const mainConfig: BlobConfig = {
      colorKey: 'siriBlue',
      size: 1.0,
      phases: [0, 0, 0],
      frequencies: [1.5, 2.8, 4.5],
      amplitudes: [0.003, 0.002, 0.0015],
      speeds: [0.5, 0.8, 1.2],
      rotationSpeed: 0,
      breathingFreq: 0.6,
      breathingAmp: 0.02,
      seed: 0.1
    };

    return createSiriBlobPath(
      centerX,
      centerY,
      mainRadius * 0.98,
      mainTime,
      amplitudeFactor,
      mainConfig,
      mainNoise,
      true,
      totalDefEmaMapRef
    );
  }, [tick, mainRadius, centerX, centerY]);

  // Einheitliche Lichtrichtung: leicht links/oben für konsistenten Siri-Look
  const lightDir = React.useMemo(() => {
    const lx = -0.68, ly = -0.60;
    const len = Math.hypot(lx, ly) || 1;
    return { x: lx/len, y: ly/len };
  }, []);

  const lightAngle = Math.atan2(lightDir.y, lightDir.x) + Math.PI;
  const arcAngle = lightAngle;

  // Arc sector helper function
  const makeArcSector = (cx:number, cy:number, rInner:number, rOuter:number, angle:number, arcDeg:number) => {
    const arc = (arcDeg * Math.PI) / 180;
    const steps = 36;
    const p = Skia.Path.Make();
    for (let i = 0; i <= steps; i++) {
      const a = angle - arc/2 + (i/steps) * arc;
      const x = cx + rOuter * Math.cos(a);
      const y = cy + rOuter * Math.sin(a);
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = angle - arc/2 + (i/steps) * arc;
      p.lineTo(cx + rInner * Math.cos(a), cy + rInner * Math.sin(a));
    }
    p.close();
    return p;
  };

  // 2.4: kleine Helper für Rim-Segmente
  const rimAngles = React.useMemo(() => {
    // Grundausrichtung: Licht kommt leicht links/oben -> wir starten um -45°
    const base = Math.atan2(lightDir.y, lightDir.x) + Math.PI; // Rim Richtung "weg" von Licht
    return {
      // drei Segmente über den Kreis verteilt
      cyan: base - Math.PI * 0.25,      // ~oben-links (Lichtseite)
      violet: base + Math.PI * 0.12,    // seitlich
      magenta: base + Math.PI * 0.48,   // unten-rechts
    };
  }, [lightDir]);

  // Shape smoothing refs for each blob
  const shapeRefs = React.useRef<{ [key: number]: { sx: number; sy: number; sh: number } }>({});
  
  // Path memoization cache
  const pathCache = React.useRef<{ [key: string]: SkPath }>({});
  
  // Create unified blob data array with performance optimization
  // BASELINE: Minimaler, funktionierender Einzel-Blob
  const blobDataArray: BlobData[] = React.useMemo(() => {
    // Blob-Setup: Atmen exakt wie Siri mit ease-in/out
    const breathT = tRef.current * (2*Math.PI/7.8); // ~7.8s
    const raw = Math.sin(breathT);
    const easedRaw = 0.5 - 0.5 * Math.cos((raw * 0.5 + 0.5) * Math.PI); // ease-in-out auf dem Sinus
    const blobScale = 1 + 0.010 * (easedRaw - 0.5) * 2; // weiterhin ±1.0%
    const baselineRadius = mainRadius * 0.72 * blobScale;
    const path = makeBlobPath2D(centerX, centerY, baselineRadius, tRef.current, 0, 0, shapeRefs, 0);
    
    return [{
      index: 0,
      blobId: 0,
      position: { 
        x: centerX, 
        y: centerY, 
        z: 0, 
        isVisible: true, 
        depthScale: 1.0, 
        blobId: 0,
        depthOpacity: 1.0,
        color: { r: 100, g: 150, b: 255, h: 220, s: 100, l: 70 }
      },
      blob: BLOB_CONFIGS[0],
        path,
      finalRadius: baselineRadius,
      adjustedX: centerX,
      adjustedY: centerY,
      depthOpacity: 1.0
    }];
  }, [tick, mainRadius, centerX, centerY]);

  // Create glow path with individual timing
  const glowPath = React.useMemo(() => {
    const t = tRef.current;
    const amplitudeEnv = ampRef.current;
    const glowRadius = mainRadius * 1.35;
    const glowTime = t * 0.06;
    const eased = smoothstep(0, 1, clamp(amplitudeEnv, 0, 1));
    const amplitudeFactor = eased * 0.1;

    const glowConfig: BlobConfig = {
      colorKey: 'siriBlue',
      size: 1.0,
      phases: [0, 0, 0],
      frequencies: [2.1, 3.7, 6.2],
      amplitudes: [0.012, 0.008, 0.006],
      speeds: [0.7, 1.1, 1.5],
      rotationSpeed: 0,
      breathingFreq: 0.9,
      breathingAmp: 0.03,
      seed: 0.1
    };

    return createSiriBlobPath(
      centerX,
      centerY,
      glowRadius,
      glowTime,
      amplitudeFactor,
      glowConfig,
      mainNoise,
      true,
      totalDefEmaMapRef,
      0,
      shapeRefs
    );
  }, [tick, mainRadius, centerX, centerY]);

  // 2.5: kombinierte Helligkeitsumgebung
  const haloEnv = (() => {
    const k = breathEnvRef.current;           // 0..1 breath
    const a = clamp(ampRef.current, 0, 1);    // 0..1 amplitude
    // Gewichtung: Breath 40%, Amplitude 60% (dezenter Boost)
    return clamp(0.40 * k + 0.60 * a, 0, 1);
  })();

  // 2.5: versetzte Phase für Halo (verhindert gleichzeitige Peaks)
  const haloPhase = (() => {
    const phase = breathPhaseRef.current + 0.35; // 0.35 radian offset (~20°)
    return 0.5 - 0.5 * Math.cos(phase); // 0..1, ease-in-out
  })();

  // 2.6: Ripple-Umgebung
  const rippleEnv = (() => {
    const a = clamp(ampRef.current, 0, 1);     // treibt Stärke
    const k = breathEnvRef.current;            // atmet Breite leicht
    return { a, k };
  })();

  // Leichte Opacity-Jitter gegen Banding (subtil)
  const popJit = 1.0 + 0.04 * Math.sin(tRef.current * 1.7 + 0.9);
  const rimOpacityPop = rimOpRef.current * popJit;

  return (
    <View style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: defaultBackground(isDarkMode),
      justifyContent: 'center', 
      alignItems: 'center', 
      margin: 0 
    }}>
      <Canvas 
        style={{ width: '100%', height: '100%' }}
        // Konsistente Farbraum-Einstellungen für Baseline-Test
        // Keine globalen Transformationen oder Filter
      >
        
        
        {/* RENDER ORDER: Top to Bottom */}
        
        {/* 1. Outer Bloom and Vignette (BLOOM) */}
        {(() => {
          const R = mainRadius;
          const cx = centerX, cy = centerY + R * BLOOM.tilt;
          // Edge Bloom
          return (
            <Group blendMode="screen">
              <Path path={Skia.Path.Make().addCircle(cx, cy, R * BLOOM.edgeR)} opacity={BLOOM.edgeOp}>
                <RadialGradient
                  c={vec(cx, cy)}
                  r={R * BLOOM.edgeR}
                  colors={['#FFFFFF40', '#FFFFFF12', 'rgba(255,255,255,0)']}
                  positions={[Math.min(0.999, 1 / BLOOM.edgeR), 0.92, 1.0]}
                />
              </Path>

              {/* Vignette tie-in (leicht abdunkeln, multiplizieren) */}
              <Group blendMode="multiply" opacity={BLOOM.vignette}>
                <Path path={Skia.Path.Make().addCircle(centerX, centerY, R * 1.05)}>
          <RadialGradient
            c={vec(centerX, centerY)}
                    r={R * 1.05}
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
                    positions={[0.78, 1.0]}
                  />
                </Path>
              </Group>
            </Group>
          );
        })()}
        
        {/* 2. Edge Rims and Refraction ring(s) with clamps */}
        {/* Edge Refraction: kühler Saum (leicht nach außen) */}
        {Math.min(RIM_CLAMP.opMax, rimOpacityPop * 1.08) >= 0.003 && (
        <Path
          path={circlePathOuter}
          opacity={Math.min(RIM_CLAMP.opMax, rimOpacityPop * 1.08)}
          blendMode="screen"
        >
          <SweepGradient
            c={vec(centerX, centerY)}
            colors={[
              'rgba(255,255,255,0.00)',
              `${REFR.hueCool}CC`,
              'rgba(255,255,255,0.00)',
            ]}
            positions={[0.08, 0.16, 0.28]}
            start={phaseRef.current}
            end={phaseRef.current + Math.PI * 2}
          />
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * (1.0 + REFR.width + rimShiftRef.current)}
            colors={['rgba(255,255,255,0.0)', `${REFR.hueCool}CA`, 'rgba(255,255,255,0.0)']}
            positions={[
              Math.max(0, Math.min(1, 0.74)),
              Math.max(0, Math.min(1, 0.90)),
              Math.max(0, Math.min(1, 0.988)),
            ]}
          />
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * (1.0 + REFR.width + rimShiftRef.current * 1.15)}
            colors={['rgba(255,255,255,0.0)', `${REFR.hueCool}AA`, 'rgba(255,255,255,0.0)']}
            positions={[0.80, 0.92, 0.995]}
          />
        </Path>
        )}

        {/* Edge Refraction: warmer Gegen‑Saum (leicht nach innen) */}
        {Math.min(RIM_CLAMP.opMax, rimOpacityPop * 0.90) >= 0.003 && (
        <Path
          path={circlePathInnerWarm}
          opacity={Math.min(RIM_CLAMP.opMax, rimOpacityPop * 0.90)}
          blendMode="screen"
        >
          <SweepGradient
            c={vec(centerX, centerY)}
            colors={[
              'rgba(255,255,255,0.00)',
              `${REFR.hueWarm}BB`,
              'rgba(255,255,255,0.00)',
            ]}
            positions={[0.62, 0.70, 0.82]}
            start={-phaseRef.current * 0.85}
            end={-phaseRef.current * 0.85 + Math.PI * 2}
          />
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * (1.0 - REFR.width*0.35 - rimShiftRef.current*0.8)}
            colors={['rgba(255,255,255,0.0)', `${REFR.hueWarm}B1`, 'rgba(255,255,255,0.0)']}
            positions={[
              Math.max(0, Math.min(1, 0.60)),
              Math.max(0, Math.min(1, 0.84)),
              Math.max(0, Math.min(1, 0.988)),
            ]}
          />
        </Path>
        )}
        
        {/* 3. Specular Arc Sparkle (SPARC) */}
        {(() => {
          const R = mainRadius;
          const env = Math.pow(clamp(sparkEnvRef.current, 0, 1), 0.9);
          const n = SPARC.count;
          const baseAng = arcAngle; // gleiche Lichtseite wie 2.9
          const arcRad = (CAU.arcDeg * Math.PI) / 180;
          const drift = phaseRef.current * 0.8;
          return (
            <Group>
              {Array.from({ length: n }, (_, i) => {
                const span = arcRad * 0.75; // innerhalb des Arcs bleiben
                const off = (-0.5 + (n === 1 ? 0.5 : i / (n - 1))) * span;
                const wob = 0.12 * Math.sin(tRef.current * 0.6 + i * 1.7);
                const ang = baseAng + off + wob;
                const cx = centerX + Math.cos(ang) * R * SPARC.baseR;
                const cy = centerY + Math.sin(ang) * R * SPARC.baseR;
                const sR = R * SPARC.sizeR * (0.9 + 0.3 * env);
                const op = SPARC.opMin + (SPARC.opMax - SPARC.opMin) * env * (0.9 + 0.1 * Math.sin(drift + i));
                if (op < 0.003) return null;

                return (
                  <Path key={`spark-${i}`} path={Skia.Path.Make().addCircle(cx, cy, sR)} opacity={op}>
                    <RadialGradient
                      c={vec(cx, cy)}
                      r={sR}
                      colors={[`${SPARC.hue}F0`, 'rgba(255,255,255,0.0)']}
                      positions={[0.0, 1.0]}
                    />
                  </Path>
                );
              })}
            </Group>
          );
        })()}
        
        {/* 4. Micro Speck layer (SPECK) */}
        {(() => {
          const R = mainRadius;
          const t = speckSeedRef.current;
          const env = Math.pow(clamp(ampRef.current, 0, 1), 0.9);
          const baseAng = arcAngle; // gleiche Lichtseite
          const arcRad = (CAU.arcDeg * Math.PI) / 180;
          const nodes = Array.from({ length: SPECK.count }, (_, i) => {
            const u = (i + 1.7) / (SPECK.count + 2);
            const ang = baseAng - arcRad * 0.35 + u * arcRad * 0.7
              + SPECK.swirl * 0.12 * Math.sin(t * 0.7 + i * 1.9);
            const rr = SPECK.rMin + (SPECK.rMax - SPECK.rMin) *
              (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * SPECK.drift + i)));
            const rad = R * rr;
            const cx = centerX + Math.cos(ang) * rad;
            const cy = centerY + Math.sin(ang) * rad;
            const s = R * (SPECK.size[0] + (SPECK.size[1] - SPECK.size[0]) * (0.3 + 0.7 * env));
            const boost = 1 + (twinkleBufRef.current[i] || 0);
            const op = Math.min(
              SPECK.opMin + (SPECK.opMax - SPECK.opMin) * env * (0.8 + 0.2 * Math.sin(t + i)) * boost,
              RIM_CLAMP.opMax
            );
            return { cx, cy, s, op };
          });

          return (
            <Group>
              {nodes.filter(p => p.op >= 0.003).map((p, i) => (
                <Path key={`spk-${i}`} path={Skia.Path.Make().addCircle(p.cx, p.cy, p.s)} opacity={p.op}>
                  <RadialGradient
                    c={vec(p.cx, p.cy)}
                    r={p.s}
                    colors={['#FFFFFFE0', 'rgba(255,255,255,0)']}
                    positions={[0.0, 1.0]}
                  />
                </Path>
              ))}
            </Group>
          );
        })()}
        
        {/* 5. Inner Ripple Interference (RIP) */}
        {(() => {
          const R = mainRadius * 0.88; // etwas innerhalb
          const cx = centerX, cy = centerY;
          const env = clamp(coreEnvRef.current, 0, 1); // warm/cool crossfade
          const op = RIP.op * (0.9 + 0.1 * ampRef.current);
          if (op < 0.003) return null;
          // choose colors
          const cA = RIP.hueCool;
          const cB = RIP.hueWarm;

          // build a radial function texture via SweepGradient trick
          const t = ripplePhaseRef.current;
          const ang0 = t * RIP.swirl;

          // colors array (positions are memoized)
          const colors: string[] = new Array(RIP_SWEEP_POS.length);
          for (let i = 0; i < RIP_SWEEP_POS.length; i++) {
            const u = RIP_SWEEP_POS[i]; // 0..1 around the circle
            const theta = ang0 + u * Math.PI * 2;
            // multi-sine interference
            const s =
              Math.sin(theta * RIP.freq[0]) +
              Math.sin(theta * RIP.freq[1] + 1.1) +
              Math.sin(theta * RIP.freq[2] + 2.3);
            // normalize to 0..1
            const n = 0.5 + 0.5 * (s / 3.0);
            // mix warm/cool per crossfade
            const col = env < 0.5 ? cA : cB;
            const a = op * (0.35 + 0.65 * n);
            colors[i] = `${col}${toHexA(a)}`;
          }

          const rIn = mainRadius * CORE.rInner * corePulseRef.current;
          const rOut = R;

          return (
            <Path path={Skia.Path.Make().addCircle(cx, cy, rOut)}>
              <RadialGradient
                c={vec(cx, cy)}
                r={rOut}
                colors={[`${cA}00`, `${cA}00`, `${cA}00`]}
                positions={[0, 0.001, 0.002]}
              />
              <SweepGradient
                c={vec(cx, cy)}
                colors={colors}
                positions={RIP_SWEEP_POS}
                transform={[{ rotate: ang0 }]}
              />
              <RadialGradient
                c={vec(cx, cy)}
                r={rOut}
            colors={[
                  'rgba(0,0,0,0)',
                  `rgba(0,0,0,${0.6 * RIP.amp})`,
                  'rgba(0,0,0,0)'
                ]}
                positions={[Math.max(0, Math.min(1, rIn / rOut)), Math.max(0, Math.min(1, Math.pow(rIn / rOut, 0.55))), 1.0]}
          />
        </Path>
          );
        })()}
        
        {/* 6. Core Caustic Crossfade (CORE) */}
        {(() => {
          const R = mainRadius;
          const rIn = R * CORE.rInner * corePulseRef.current;
          const rOut = R * CORE.rOuter;
          const fade = clamp(coreEnvRef.current, 0, 1);
          // opacities für warm/cool
          const opCool = CORE.opMax * (1 - fade);
          const opWarm = CORE.opMax * fade;
          if (opCool < 0.003 && opWarm < 0.003) return null;

          // Körnung minimal über Positions‑Noise
          const g = CORE.grain;
          const cx = centerX + g * Math.sin(phaseRef.current * 1.1) * 2.0;
          const cy = centerY + g * Math.cos(phaseRef.current * 0.9) * 2.0;

          return (
            <Group>
              {/* Cool core */}
              <Path path={Skia.Path.Make().addCircle(cx, cy, rOut)} opacity={opCool}>
                <RadialGradient
                  c={vec(cx, cy)}
                  r={rOut}
                  colors={[`${CORE.cool}F0`, `${CORE.cool}80`, 'rgba(0,0,0,0)']}
                  positions={[Math.max(0, Math.min(1, rIn / rOut)), Math.max(0, Math.min(1, mix(rIn / rOut, 0.72, 0.6))), 1.0]}
                />
              </Path>

              {/* Warm overlay */}
              <Path path={Skia.Path.Make().addCircle(cx, cy, rOut)} opacity={opWarm}>
                <RadialGradient
                  c={vec(cx, cy)}
                  r={rOut}
                  colors={[`${CORE.warm}E6`, `${CORE.warm}66`, 'rgba(0,0,0,0)']}
                  positions={[Math.max(0, Math.min(1, rIn / rOut)), Math.max(0, Math.min(1, mix(rIn / rOut, 0.68, 0.6))), 1.0]}
                />
              </Path>
            </Group>
          );
        })()}
        
        {/* 7. Base center glow/background */}
        <Circle cx={centerX} cy={centerY} r={mainRadius * 0.982}>
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius}
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(210,230,255,0.040)',
              'rgba(120,150,200,0.060)',
              'rgba(0,0,0,0.00)',
            ]}
            positions={[0.00, 0.86, 0.95, 1.00]}
          />
        </Circle>

        {/* 2.5: Subtle Outer Halo (screen, neutral, groß) */}
        {(() => {
          const k = clamp(0.40 * haloPhase + 0.60 * clamp(ampRef.current, 0, 1), 0, 1);
          const fpsK = (0.9 + 0.2 * Math.min(1, 1 / (60 * (dtEmaRef.current || 1))));
          const op = (0.010 + 0.017 * k) * fpsK;     // minimal weniger Peak
          if (op < 0.003) return null;
          const r  = mainRadius * (1.72 + 0.30 * k); // 1.72R..2.02R
          return (
            <Path
              path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, width, height))}
              blendMode="screen"
              opacity={op}
            >
          <RadialGradient
            c={vec(centerX, centerY)}
                r={r}
            colors={[
                  'rgba(240,246,255,0.030)', // sehr neutral, leicht kühl
                  'rgba(210,230,255,0.012)',
                  'rgba(0,0,0,0.00)',
                ]}
                positions={[0.00, 0.58, 1.00]}
          />
        </Path>
          );
        })()}

        {/* 1) Glass Core – Schritt 2.2 (2 Layer) */}
        {blobDataArray.map((b)=>(
          (() => {
            // Hotspot-Position: leicht nach oben links kippen (wie ein Licht)
            const hsx = centerX + Math.cos(-Math.PI/2 + SPEC.tilt) * b.finalRadius * 0.08;
            const hsy = centerY + Math.sin(-Math.PI/2 + SPEC.tilt) * b.finalRadius * 0.08;

            // Größe moduliert minimal mit breath (optional)
            const size = b.finalRadius * SPEC.sizeR * (1.0 + 0.03 * breathEnvRef.current);

            // Opacity map
            const baseOp = SPEC.minOp;
            const peakOp = SPEC.maxOp;
            const specOp = baseOp + (peakOp - baseOp) * Math.pow(specEnvRef.current, 0.9);

            // Bloom-Komponente etwas stärker bei Peaks
            const bloomOp = specOp * 0.48 * SPEC.bloomMul;

            return (
          <Group key={`fill-${b.blobId}`}>
            {/* Core cool */}
            <Path path={b.path} opacity={1}>
              <RadialGradient
                c={vec(b.adjustedX, b.adjustedY)}
                r={b.finalRadius}
                colors={[
                  'rgba(210,230,255,0.92)',
                  'rgba(150,200,255,0.42)',
                  'rgba(150,200,255,0.00)',
                ]}
                positions={[0.00, 0.22, 1.00]}
              />
            </Path>

            {/* Inner shadow (gegen Lichtquelle), multiply 0.35 */}
            <Path path={b.path} blendMode="multiply" opacity={0.22}>
              <RadialGradient
                c={vec(
                  b.adjustedX - lightDir.x * b.finalRadius * 0.26,
                  b.adjustedY - lightDir.y * b.finalRadius * 0.26
                )}
                r={b.finalRadius * 1.10}
                colors={[
                  'rgba(0,0,0,0.06)',
                  'rgba(0,0,0,0.02)',
                  'rgba(0,0,0,0.00)',
                ]}
                positions={[0.00, 0.90, 1.00]}
              />
            </Path>

            {/* 2.3: Specular microrim (Screen, pulsiert mit Breath) */}
            {(() => {
              const k = breathEnvRef.current; // 0..1
              // Opacity 0.018 → 0.036
              const op = 0.018 + k * 0.018;
              // Fokus enger bei Peak: positions eng zusammenrücken
              const posMid = 0.972 + k * 0.006;  // 0.972..0.978
              const posEnd = 0.994 + k * 0.004;  // 0.994..0.998
              const rc = b.finalRadius * 0.82;   // noch kompakter
              return (
                <Path key={`spec-rim-${b.blobId}`} path={b.path} blendMode="screen" opacity={op}>
                  <RadialGradient
                    c={vec(
                      b.adjustedX + lightDir.x * b.finalRadius * 0.32,
                      b.adjustedY + lightDir.y * b.finalRadius * 0.32
                    )}
                    r={rc}
                    colors={[
                      'rgba(255,255,255,0.00)',
                      'rgba(255,255,255,0.12)',
                      'rgba(255,255,255,0.00)',
                    ]}
                    positions={[
                      Math.max(0, Math.min(1, posMid - 0.047)),
                      Math.max(0, Math.min(1, posMid)),
                      Math.max(0, Math.min(1, Math.max(posMid, posEnd)))
                    ]}
                  />
                </Path>
              );
            })()}

            {/* Sehr kleine Funken, die bei specStrength > 0.7 auftauchen, drehen langsam */}
            {specEnvRef.current > 0.7 && [0,1].map(i => {
              const ang = (tRef.current * 0.6 + i * 2.1);
              const rr = size * (1.1 + 0.25 * i);
              const sx = hsx + Math.cos(ang) * rr;
              const sy = hsy + Math.sin(ang) * rr;
              const sSize = size * (0.28 - 0.06*i);
              const sOp = (specEnvRef.current - 0.7) * (0.6 - 0.2*i);
              return (
                <Path
                  key={`spark-${i}`}
                  path={Skia.Path.Make().addCircle(sx, sy, sSize)}
                  opacity={sOp}
                  blendMode="screen"
                >
                  <RadialGradient
                    c={vec(sx, sy)}
                    r={sSize}
                    colors={['rgba(255,255,255,0.9)','rgba(255,255,255,0.0)']}
                    positions={[0.0, 0.9]}
                  />
                </Path>
              );
            })}
          </Group>
            );
          })()
        ))}

        {/* 2.3: Breathing Core Glow (Screen) */}
        {blobDataArray.map((b) => {
          const k = breathEnvRef.current; // 0..1 eased
          // Opacity fährt 0.028 → 0.060; Radius 0.14R → 0.20R
          const op = 0.028 + k * 0.032;
          if (op < 0.003) return null;
          const rg = b.finalRadius * (0.14 + k * 0.06);
          return (
            <Path key={`breath-glow-${b.blobId}`} path={Skia.Path.Make().addCircle(b.adjustedX, b.adjustedY, rg)} blendMode="screen" opacity={op}>
              <RadialGradient
                c={vec(b.adjustedX, b.adjustedY)}
                r={rg}
                colors={[
                  'rgba(180,220,255,0.24)',  // zarte kühle Mitte
                  'rgba(180,220,255,0.06)',
                  'rgba(180,220,255,0.00)',
                ]}
                positions={[0.00, 0.54, 1.00]}
              />
            </Path>
          );
        })}

        {/* 2) Farbige Kante nur entlang des Blob-Pfades (Screen) - niedrige Opacity */}
        {!BASELINE_22 && (
        <Group blendMode="screen">
          {blobDataArray.map((b) => (
            <Path key={`sweep-${b.blobId}`} path={b.path} opacity={0.025}>
              <SweepGradient
                c={vec(b.adjustedX, b.adjustedY)}
                colors={[
                  '#25D6FF', // Cyan
                  '#5BE2FF', // Teal/Azure
                  '#7C72FF', // Indigo/Violet
                  '#FF6CDA', // Magenta
                  '#FF8C66', // Peach/Crimson
                  '#25D6FF',
                ]}
                positions={[0.00, 0.18, 0.42, 0.66, 0.88, 1.00]}
              />
            </Path>
          ))}
        </Group>
        )}

        {/* 3) Weißer Rim (Screen) - sehr niedrige Opacity */}
        {!BASELINE_22 && (
        <Group blendMode="screen">
          {blobDataArray.map((b)=>(
            <Path key={`rim-${b.blobId}`} path={b.path} opacity={0.06}>
              <RadialGradient
                c={vec(b.adjustedX + lightDir.x * b.finalRadius * 0.20, b.adjustedY + lightDir.y * b.finalRadius * 0.20)}
                r={b.finalRadius}
                colors={['rgba(255,255,255,0.00)','rgba(255,255,255,0.06)','rgba(255,255,255,0.00)']}
                positions={[0.86,0.94,1.00]}
              />
            </Path>
          ))}
        </Group>
        )}

        {/* 4) Farbiger Rim (Screen) - sehr niedrige Opacity */}
        {!BASELINE_22 && (
        <Group blendMode="screen">
          {blobDataArray.map((b)=>(
            <Path key={`rimcolor-${b.blobId}`} path={b.path} opacity={0.022}>
              <SweepGradient
                c={vec(b.adjustedX, b.adjustedY)}
                colors={['#25D6FF','#5BE2FF','#7C72FF','#FF6CDA','#FF8C66','#25D6FF']}
                positions={[0.00,0.20,0.44,0.68,0.90,1.00]}
              />
            </Path>
          ))}
        </Group>
        )}
        
        {/* Siri-Rainbow um den Hauptkreis */}
        {!BASELINE_22 && (
        <Group origin={vec(centerX, centerY)} transform={[{ rotate: rotRef.current }]}>
          <Path
            path={Skia.Path.Make().addCircle(centerX, centerY, mainRadius * 0.994)}
            blendMode="screen"
            opacity={0.115}
          >
            <SweepGradient
              c={vec(centerX, centerY)}
              colors={[
                '#12CCFF', // etwas satteres Cyan
                '#4FD9FF', // Azure
                '#6A62FF', // Indigo
                '#FF5FD2', // Magenta
                '#FF8659', // Peach/Crimson
                '#12CCFF',
              ]}
              positions={[0.00, 0.18, 0.42, 0.66, 0.88, 1.00]}
            />
          </Path>
        </Group>
        )}

        {/* Weißer Außen-Rim - schmaler und weicher */}
        {!BASELINE_22 && (
        <Path path={Skia.Path.Make().addCircle(centerX, centerY, mainRadius * 0.9965)} blendMode="screen" opacity={0.048}>
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius}
            colors={[
              'rgba(255,255,255,0.00)',
              'rgba(255,255,255,0.14)',
              'rgba(255,255,255,0.00)',
            ]}
            positions={[0.918, 0.974, 1.00]}
          />
        </Path>
        )}
        
        {/* 6. Petals – 3 farbige Lappen (Screen) */}
        {!BASELINE_22 && (
        <Group blendMode="screen">
          {[
            { hue: '#25D6FF', rot: 0.00, pos: [0.00, 0.55, 1.00], op: 0.050 }, // Cyan
            { hue: '#7C72FF', rot: 2.10, pos: [0.00, 0.55, 1.00], op: 0.045 }, // Indigo/Violet
            { hue: '#FF6CDA', rot: 4.10, pos: [0.00, 0.55, 1.00], op: 0.040 }, // Magenta
          ].map((p, i) => {
            const rPetal = mainRadius * 0.58;
            const path = makeBlobPath2D(centerX, centerY, rPetal, tRef.current + i * 0.7, i * 0.37, p.rot, shapeRefs, i+10);
            return (
              <Path key={`petal-${i}`} path={path} opacity={p.op}>
          <RadialGradient
            c={vec(centerX, centerY)}
                  r={rPetal}
                  colors={[
                    'rgba(255,255,255,0.00)',
                    'rgba(255,255,255,0.00)',
                    'rgba(255,255,255,0.00)',
                  ]}
                  positions={p.pos}
                />
                <SweepGradient
                  c={vec(centerX, centerY)}
                  colors={[p.hue, '#5BE2FF', '#7C72FF', '#FF6CDA', '#FF8C66', p.hue]}
                  positions={[0.00, 0.22, 0.46, 0.70, 0.90, 1.00]}
          />
        </Path>
            );
          })}
        </Group>
        )}

        {/* 6c. Petal Edge Rim (weiß, schmal) */}
        {!BASELINE_22 && (
        <Group blendMode="screen">
          {[0,1,2].map((i) => {
            const r = mainRadius * 0.58;
            const p = makeBlobPath2D(centerX, centerY, r, tRef.current + i * 0.7, i * 0.37, 0.0, shapeRefs, i+20);
            return (
              <Path key={`petal-rim-${i}`} path={p} opacity={0.030}>
                <RadialGradient
                  c={vec(centerX + lightDir.x * r * 0.16, centerY + lightDir.y * r * 0.16)}
                  r={r}
                  colors={['rgba(255,255,255,0.00)','rgba(255,255,255,0.08)','rgba(255,255,255,0.00)']}
                  positions={[0.86, 0.94, 1.00]}
                />
              </Path>
            );
          })}
        </Group>
        )}

        {/* 6b. Caustic Overlaps – schmale additive Glows */}
        {!BASELINE_22 && (
        <Group blendMode="screen" opacity={0.055}>
          {[0,1,2].map((i) => {
            const r = mainRadius * 0.60;
            const off = 0.22 + i * 0.06;
            return (
              <Path key={`caustic-${i}`} path={Skia.Path.Make().addCircle(
                centerX + lightDir.x * r * off,
                centerY + lightDir.y * r * off,
                r * 0.32
              )}>
                <RadialGradient
                  c={vec(centerX + lightDir.x * r * off, centerY + lightDir.y * r * off)}
                  r={r * 0.32}
                  colors={[
                    'rgba(255,255,255,0.10)',
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0.00)',
                  ]}
                  positions={[0.00, 0.58, 1.00]}
                />
              </Path>
            );
          })}
        </Group>
        )}

        {/* 
        <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, width, height))} blendMode="screen" opacity={0.012}>
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * 1.45}
            colors={[
              'rgba(235,245,255,0.055)',
              'rgba(170,215,255,0.032)',
              'rgba(160,90,210,0.025)',
              'rgba(0,0,0,0.00)'
            ]}
            positions={[0.00, 0.52, 0.86, 1.00]}
          />
        </Path>
        */}


        {/* 2.3: Center Bloom (leicht atmend) */}
        {!BASELINE_22 && (() => {
          const k = breathEnvRef.current; // 0..1
          const op = 0.0025 + k * 0.002;  // 0.0025..0.0045
          const rr = mainRadius * (1.06 + 0.03 * k);
          return (
            <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0,0,width,height))} blendMode="screen" opacity={op}>
              <RadialGradient
                c={vec(centerX, centerY)}
                r={rr}
                colors={[
                  'rgba(235,245,255,0.026)',
                  'rgba(170,215,255,0.012)',
                  'rgba(0,0,0,0.00)'
                ]}
                positions={[0.00, 0.58, 1.00]}
              />
            </Path>
          );
        })()}

        {/* 2.4: Edge Color Whisper (ultraleise, segmentiert) */}
        {BASELINE_24 && (
          <Group blendMode="screen" opacity={1}>
            {blobDataArray.map((b) => {
              const k = breathEnvRef.current; // 0..1
              // globale Atemsteuerung für Opacity
              const opBase = 0.006;      // Minimum
              const opSpan = 0.012 * (0.9 + 0.2 * Math.min(1, 1 / (60 * dtEmaRef.current || 1)));
              const op = opBase + opSpan * k;

              // Randradius leicht kleiner als Außenkante -> verhindert Übersprechen
              const r = b.finalRadius * 0.985;

              // Positions eng am Rand
              const pInner = 0.968;
              const pMid   = 0.980 + 0.004 * k; // 0.980..0.984
              const pOuter = 0.995;

              // Segmentbreite (Bogen) ~30°; Skia liefert keinen Winkel-Clip für Gradients direkt.
              // Workaround: wir verwenden je Segment einen schmalen lokal rotierten Blob-Pfad als "Maske" (ein dünner Torus-Sektor).
              const mkSectorPath = (angle: number, arcDeg = 30) => {
                const arc = (arcDeg * Math.PI) / 180;
                const steps = 32;
                const innerR = b.finalRadius * 0.955;
                const outerR = b.finalRadius * 1.010;
                const cx = b.adjustedX, cy = b.adjustedY;

                const path = Skia.Path.Make();
                // Außenbogen
                for (let i = 0; i <= steps; i++) {
                  const a = angle - arc/2 + (i/steps) * arc;
                  const x = cx + outerR * Math.cos(a);
                  const y = cy + outerR * Math.sin(a);
                  if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
                }
                // Innenbogen zurück
                for (let i = steps; i >= 0; i--) {
                  const a = angle - arc/2 + (i/steps) * arc;
                  const x = cx + innerR * Math.cos(a);
                  const y = cy + innerR * Math.sin(a);
                  path.lineTo(x, y);
                }
                path.close();
                return path;
              };

              // Segment-Definitionen: Farben sehr zart
              const segments = [
                {
                  key: 'whisper-cyan',
                  angle: rimAngles.cyan,
                  colors: ['rgba(37,214,255,0.00)','rgba(37,214,255,0.18)','rgba(37,214,255,0.00)'],
                },
                {
                  key: 'whisper-violet',
                  angle: rimAngles.violet,
                  colors: ['rgba(124,114,255,0.00)','rgba(124,114,255,0.18)','rgba(124,114,255,0.00)'],
                },
                {
                  key: 'whisper-magenta',
                  angle: rimAngles.magenta,
                  colors: ['rgba(255,108,218,0.00)','rgba(255,108,218,0.14)','rgba(255,108,218,0.00)'],
                },
              ];

              return (
                <Group key={`whisper-wrap-${b.blobId}`} opacity={1}>
                  {segments.map((seg) => {
                    const sector = mkSectorPath(seg.angle, 32); // 32° Segment
                    return (
                      <Path key={`${seg.key}-${b.blobId}`} path={sector} opacity={op}>
                        <RadialGradient
                          c={vec(b.adjustedX, b.adjustedY)}
                          r={r}
                          colors={seg.colors}
                          positions={[pInner, pMid, pOuter]}
                        />
                      </Path>
                    );
                  })}
                </Group>
              );
            })}
          </Group>
        )}


        {/* 2.9: Chromatic Edge Caustics */}
        {(() => {
          const R = mainRadius;
          const env = Math.min(1, amplitude / 100);
          const phiJ = 0.12 * Math.sin(tRef.current * 0.8);
          const sectorScroll = 0.10 * tRef.current; // rad/s very slow
          const angleNow = arcAngle + sectorScroll;
          const sector = makeArcSector(centerX, centerY, R * 0.92, R * (1.0 + REFR.width * 1.40), angleNow, CAU.arcDeg);
          // Nonlinear arc speed with easing
          const raw = (phaseRef.current || 0) * (CAU_SPEED / (REFR.speed || 1));
          const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * raw); // smooth cycle 0..1
          const eased = Math.pow(u, MOT.arcEase) / (Math.pow(u, MOT.arcEase) + Math.pow(1 - u, MOT.arcEase));
          const arcPhase = eased * 2 * Math.PI;
          
          // safety cap (optional)
          const cap = (v:number, m:number) => Math.min(m, v);
          
          const coolOp = cap(CAU.coolOp * (0.85 + 0.30*env), RIM_CLAMP.arcCoolMax);
          const warmOp = cap(CAU.warmOp * (0.85 + 0.28*env), RIM_CLAMP.arcWarmMax);
          
          if (coolOp < 0.003 && warmOp < 0.003) return null;
          
          return (
            <Group>
              {/* Cold outer arc */}
              {coolOp >= 0.003 && (
              <Path path={sector} opacity={coolOp}>
                <SweepGradient
                  c={vec(centerX, centerY)}
                  colors={['rgba(0,0,0,0.00)', `${CAU.coolHue}D0`, 'rgba(0,0,0,0.00)']}
                  positions={CAU.sweepTightC}
                  start={arcPhase + phiJ}
                  end={arcPhase + phiJ + Math.PI * 2}
                />
                <RadialGradient
                  c={vec(centerX, centerY)}
                  r={R * (1.0 + REFR.width + rimShiftRef.current)}
                  colors={['rgba(0,0,0,0.00)', `${CAU.coolHue}C0`, 'rgba(0,0,0,0.00)']}
                  positions={CAU.radialTightCool}
                />
              </Path>
              )}

              {/* Warm inner arc */}
              {warmOp >= 0.003 && (
              <Path path={sector} opacity={warmOp}>
                <SweepGradient
                  c={vec(centerX, centerY)}
                  colors={['rgba(0,0,0,0.00)', `${CAU.warmHue}BB`, 'rgba(0,0,0,0.00)']}
                  positions={CAU.sweepTightW}
                  start={-arcPhase * 0.9 - phiJ}
                  end={-arcPhase * 0.9 - phiJ + Math.PI * 2}
                />
                <RadialGradient
                  c={vec(centerX, centerY)}
                  r={R * (1.0 - REFR.width * 0.25 - rimShiftRef.current * 0.6)}
                  colors={['rgba(0,0,0,0.00)', `${CAU.warmHue}B0`, 'rgba(0,0,0,0.00)']}
                  positions={CAU.radialTightWarm}
                />
              </Path>
              )}

              {/* micro bloom */}
              {CAU.bloom >= 0.003 && (
              <Path path={sector} opacity={CAU.bloom}>
                <RadialGradient
                  c={vec(centerX, centerY)}
                  r={R * (1.05 + 0.02 * breathEnvRef.current)}
                  colors={['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']}
                  positions={[0.78, 0.90, 0.995]}
                />
              </Path>
              )}
            </Group>
          );
        })()}


        {/* 2.6: Outer Amplitude Ripples (screen) */}
        {(() => {
          const { a, k } = rippleEnv;
          // Gesamt-Opacity skaliert mit Amplitude; sehr vorsichtig
          const baseOp = 0.008 * (0.9 + 0.2 * Math.min(1, 1 / (60*(dtEmaRef.current||1))));
          const op = baseOp + a * 0.032; // etwas reaktiver
          if (op < 0.003) return null;
          // Grundradius etwas innen, damit es am Rand „entsteht"
          const R = mainRadius * 0.985;
          // Wellenparameter
          const waves = 3;                    // 2–3 flache Wellen
          const spread = 0.022 + 0.016 * k;   // Bandbreite (breath)
          const speed = 2.2;                  // testweise schneller
          const phase = tRef.current * speed;

          // Wir zeichnen mehrere schmale konzentrische Bänder mit verschobenem Peak
          const bands = Array.from({ length: waves }, (_, i) => {
            const u = i / (waves - 1 || 1);
            const center = 0.965 + u * 0.030;         // 0.965..0.995
            const shift = 0.022 * Math.sin(phase + i * 1.9); // testweise größere Bewegung
            // Mini-Noise gegen Banding
            const n = 0.5 * (Math.sin(17.0*i + 29.0*phase) + Math.sin(13.0*i + 23.0*phase+1.7));
            const opJitter = 1.0 + 0.06 * n;
            const opFinal = op * (0.85 - 0.35 * u) * opJitter;
            
            return {
              inner: Math.max(0.90, center - spread * 0.5 + shift),
              mid:   Math.min(0.999, center + shift),
              outer: Math.min(1.00, center + spread * 0.5 + shift),
              opacity: opFinal        // outermost am stärksten
            };
          });

          const sweep = (idx:number) => (
            <Path
              key={`ripple-sweep-${idx}`}
              path={Skia.Path.Make().addCircle(centerX, centerY, R * (1.0 + 0.006 * idx))}
              opacity={op * (0.35 + 0.25 * idx)}
              blendMode="screen"
            >
              <SweepGradient
                c={vec(centerX, centerY)}
                colors={[
                  'rgba(255,255,255,0.00)',
                  'rgba(255,255,255,0.08)',
                  'rgba(255,255,255,0.00)'
                ]}
                positions={[0.00, 0.14, 0.28]}
              />
            </Path>
          );

          return (
            <Group blendMode="screen" opacity={1}>
              {bands.map((bnd, idx) => (
                <Path key={`ripple-${idx}`}
                      path={Skia.Path.Make().addCircle(centerX, centerY, R)}
                      opacity={bnd.opacity}>
                  <RadialGradient
                    c={vec(centerX, centerY)}
                    r={R * (1.012 + 0.012 * idx) * (1.0 + 0.005 * k)}
                    colors={[
                      'rgba(255,255,255,0.00)',
                      'rgba(255,255,255,0.09)',
                      'rgba(255,255,255,0.00)',
                    ]}
                    positions={[
                      Math.max(0, Math.min(1, Math.min(bnd.inner, bnd.mid, bnd.outer))),
                      Math.max(0, Math.min(1, bnd.mid)),
                      Math.max(0, Math.min(1, Math.max(bnd.inner, bnd.mid, bnd.outer)))
                    ]}
                  />
                </Path>
              ))}
              {[0,1].map(i => sweep(i))}
            </Group>
          );
        })()}


        {/* Farbige Rim-Reflex auf Lichtseite */}
        {!BASELINE_22 && (
        <Path
          path={Skia.Path.Make().addCircle(centerX, centerY, mainRadius * 0.996)}
          blendMode="screen"
          opacity={0.025}
        >
          <SweepGradient
            c={vec(centerX, centerY)}
            colors={[
              'rgba(255,255,255,0.00)', // Start: unsichtbar
              '#FFE1C9',                // warmes Highlight
              '#C9F1FF',                // kühler Übergang
              'rgba(255,255,255,0.00)', // Ende: ausblenden
            ]}
            positions={[0.00, 0.08, 0.16, 0.22]}
          />
        </Path>
        )}


        {/* Lokaler Core-Glow */}
        {0.075 >= 0.003 && (
        <Path path={Skia.Path.Make().addCircle(centerX, centerY, mainRadius * 0.16)} blendMode="screen" opacity={0.075}>
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * 0.16}
            colors={[
              'rgba(160,220,255,0.17)',
              'rgba(160,220,255,0.033)',
              'rgba(160,220,255,0.00)',
            ]}
            positions={[0.00, 0.46, 1.00]}
          />
        </Path>
        )}


        {/* 15. Anti-Banding Grain - sehr schwach */}
        {!BASELINE_22 && 0.008 >= 0.003 && (
        <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0,0,width,height))} blendMode="screen" opacity={0.008}>
          <RadialGradient
            c={vec(centerX, centerY)}
            r={mainRadius * 2.0}
            colors={['rgba(255,255,255,0.008)','rgba(255,255,255,0.004)','rgba(0,0,0,0.00)']}
            positions={[0.00,0.50,1.00]}
          />
        </Path>
        )}

      </Canvas>
    </View>
  );
}
