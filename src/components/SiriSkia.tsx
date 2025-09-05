import React, { useState, useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { Canvas, Path, Skia, RadialGradient, vec, Group, Mask, Circle, PathOp, SweepGradient, Paint } from '@shopify/react-native-skia';
import { ANIMATION_CONFIG, BLOB_CONFIGS, SIRI_COLORS, SIRI_GRADIENT_POSITIONS, SIRI_PALETTE, defaultBackground } from '../constants/theme';
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

// Basisfüllung – sehr dunkel wie im Referenzbild
export const SIRI_BASE_COLORS: string[] = [
  'rgba(32,36,52,0.80)',
  'rgba(20,24,36,0.70)',
  'rgba(12,16,28,0.60)'
];

export const SIRI_BASE_POS: number[] = [0.00, 0.72, 1.00];

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
  sweepGradient: true,  // Sweep aktiv für Anti-Banding
  neonRing: false,      // DEAKTIVIERT für Baseline
  cyanHalo: false,      // DEAKTIVIERT für Baseline
  bloom: true,          // Bloom aktiv
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
  path: import('@shopify/react-native-skia').SkPath;
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
function makeBlobPath2D(cx: number, cy: number, baseR: number, t: number, seed = 0, rotLocal = 0, shapeRefs?: React.MutableRefObject<{ [key: number]: { sx: number; sy: number; sh: number } }>, blobId?: number) {
  const n = 120; // Reduziert für Performance, aber ausreichend glatt
  
  // Exakte Parameter wie gewünscht
  const noiseFreq = 0.8; // Niederfrequente Noise
  const noiseAmp = 0.045 * baseR; // Amplitude ≤ 4.5% des Radius (reduziert für weichere Geometrie)
  const speed = 0.022; // Noch langsamere Animation für glatte, lappenfreie Bewegung
  
  const phase0 = 2 * Math.PI * speed * t;

  const points: {x:number;y:number}[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 2 * Math.PI;

    // Einfache, niederfrequente Noise ohne viele Harmonische
    const phaseShift = seed * 1.57;
    const timeShift = phase0 * 0.5;
    
    // Easing-Funktion für sanfte Übergänge ohne scharfe Inflexionen
    const easedAngle = Math.sin(ang * 0.5) * 2;
    const radiusModulation = noiseAmp * Math.sin(noiseFreq * easedAngle + timeShift + phaseShift);

    // Keine asymmetrische Verschiebung - symmetrische, runde Form
    const r = baseR * (1 + radiusModulation);
    points.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }

  const tLocal = t * 0.15; // Reduzierte lokale Zeitmodulation
  // Minimale Ellipsen-Deformation für runde Form
  const rawSx = 1.001 + 0.0002 * Math.sin(tLocal * 0.6 + seed * 1.1);
  const rawSy = 0.999 + 0.0002 * Math.cos(tLocal * 0.7 + seed * 0.9);
  const rawSh = 0.00; // Kein Shear für symmetrische Form

  // EMA filtering for shape parameters
  let sx = rawSx, sy = rawSy, sh = rawSh;
  if (shapeRefs && blobId !== undefined) {
    const prevShape = shapeRefs.current[blobId] || { sx: rawSx, sy: rawSy, sh: rawSh };
    const dt = 0.016; // Assuming 60fps
    const tau = 0.75; // Stärkere Trägheit für stabilere Form
    
    sx = expSlewSimple(prevShape.sx, rawSx, tau, dt);
    sy = expSlewSimple(prevShape.sy, rawSy, tau, dt);
    sh = expSlewSimple(prevShape.sh, rawSh, tau, dt);
    
    shapeRefs.current[blobId] = { sx, sy, sh };
  }

  const warped = points.map(p => applyAnisoShear(cx, cy, p, sx, sy, sh, rotLocal));
  
  // Erhöhte Kurvenglättung für weiche, lappenfreie Konturen
  // Simuliert post-processing mit kleinem Gaussian blur (sigma ≈ 0.5-1.0 px)
  return createClosedCatmullRomPath(warped, 0.22, Skia as any);
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
  const lastTimeRef = React.useRef(Date.now());
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

    const animate = () => {
      const now = Date.now();
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const dt = Math.min(Math.max(rawDt, 0), 1/60);
      dtEmaRef.current = dtEmaRef.current + (dt - dtEmaRef.current) * 0.3;

      tRef.current += dtEmaRef.current;
      
      // Organische Rotation ~ 6°/s mit "Atmen"
      const baseRot = Math.PI / 30; // ~6°/s
      const rotMod = 1 + 0.06 * Math.sin(tRef.current * 0.3); // Leichte Modulation
      rotRef.current += dtEmaRef.current * baseRot * rotMod;

      const targetAmplitude = amplitude / 100;
      ampRef.current = expSlew(ampRef.current, targetAmplitude, 6.6, 4.6, dtEmaRef.current);

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
  }, [tick, sphereRadius, centerX, centerY]);

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

  // Shape smoothing refs for each blob
  const shapeRefs = React.useRef<{ [key: number]: { sx: number; sy: number; sh: number } }>({});
  
  // Path memoization cache
  const pathCache = React.useRef<{ [key: string]: import('@shopify/react-native-skia').SkPath }>({});
  
  // Create unified blob data array with performance optimization
  // BASELINE: Minimaler, funktionierender Einzel-Blob
  const blobDataArray: BlobData[] = React.useMemo(() => {
    // Einfacher, zentrierter Blob ohne Bewegung
    const baselineRadius = mainRadius * 0.4; // 40% des Hauptkreises
    
    // Optimierter Blob-Pfad mit glatten, lappenfreien Parametern
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
  }, [mainRadius, centerX, centerY]);

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
        
        
        {/* NEUE LAYER-REIHENFOLGE */}
        
        {/* 1. Base sphere (srcOver, dunkel) */}
        {DEBUG_LAYERS.base && (
          <Circle cx={centerX} cy={centerY} r={mainRadius}>
          <RadialGradient
            c={vec(centerX, centerY)}
              r={mainRadius}
              colors={SIRI_BASE_COLORS}
              positions={SIRI_BASE_POS}
            />
          </Circle>
        )}
        
        {/* 2. Gate falloff (srcOver, niedrige Alpha) */}
        {DEBUG_LAYERS.gate && (
          <Circle cx={centerX} cy={centerY} r={mainRadius * SIRI_FALLOFF_SETTINGS.gateRadiusK}>
            <RadialGradient
              c={vec(centerX, centerY)}
              r={mainRadius * SIRI_FALLOFF_SETTINGS.gateRadiusK}
              colors={SIRI_GATE_COLORS}
              positions={SIRI_GATE_POS}
            />
          </Circle>
        )}

                {/* 3. Container-Maske: weicher Kreis mit Blur-Kante */}
        {/* BASELINE: Einfacher, funktionierender Blob ohne Mask */}
          {/* BASELINE: Einfacher, funktionierender Blob */}
          <Group blendMode="screen">
            {blobDataArray && blobDataArray.length > 0 ? blobDataArray.map((blobData) => (
              <React.Fragment key={blobData.blobId}>
                {/* 1. Haupt-Fill: Optimiert für Siri-weiche Grundgeometrie */}
                <Path path={blobData.path} blendMode="screen" opacity={1.0}>
                  <RadialGradient
                    c={vec(blobData.adjustedX, blobData.adjustedY)}
                    r={blobData.finalRadius}
                    colors={[
                      'rgba(100,150,255,0.90)',
                      'rgba(100,150,255,0.78)',
                      'rgba(100,150,255,0.32)',
                      'rgba(100,150,255,0.08)',
                      'rgba(0,0,0,0.00)'
                    ]}
                    positions={[0.00, 0.22, 0.55, 0.90, 1.00]}
                  />
                </Path>
                
                {/* 2a. Weißer Rim Highlight: Subtiler, schmaler, weiter außen */}
                <Path path={blobData.path} blendMode="screen" opacity={0.55}>
                  <RadialGradient
                    c={vec(
                      blobData.adjustedX + lightDir.x * blobData.finalRadius * 0.24,
                      blobData.adjustedY + lightDir.y * blobData.finalRadius * 0.24
                    )}
                    r={blobData.finalRadius}
                    colors={[
                      'rgba(255,255,255,0.00)',
                      'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.03)',
                      'rgba(255,255,255,0.00)'
                    ]}
                    positions={[0.00, 0.70, 0.94, 1.00]}
                  />
                </Path>
                
                {/* 2b. Farbiger Rim Highlight: COMMENTED OUT - too strong */}
                {/* 
                <Path path={blobData.path} blendMode="screen" opacity={0.8}>
                  <RadialGradient
                    c={vec(
                      blobData.adjustedX + lightDir.x * blobData.finalRadius * 0.18,
                      blobData.adjustedY + lightDir.y * blobData.finalRadius * 0.18
                    )}
                    r={blobData.finalRadius}
                    colors={[
                      'rgba(0,0,0,0.00)',
                      'rgba(120,160,255,0.08)',
                      'rgba(90,165,255,0.04)',
                      'rgba(0,0,0,0.00)'
                    ]}
                    positions={[0.0, 0.65, 0.92, 1.0]}
                  />
                </Path>
                */}
                
                {/* 2c. Optional: Subtiler Glas-Rim (nur wenn "glasiger" gewünscht) */}
                {/* 
                <Path path={blobData.path} blendMode="screen" opacity={0.45}>
                  <RadialGradient
                    c={vec(
                      blobData.adjustedX + lightDir.x * blobData.finalRadius * 0.20,
                      blobData.adjustedY + lightDir.y * blobData.finalRadius * 0.20
                    )}
                    r={blobData.finalRadius}
                    colors={[
                      'rgba(140,170,255,0.00)',
                      'rgba(140,170,255,0.05)',
                      'rgba(120,160,255,0.02)',
                      'rgba(0,0,0,0.00)'
                    ]}
                    positions={[0.00, 0.68, 0.92, 1.00]}
                  />
                </Path>
                */}
              </React.Fragment>
            )) : null}
          </Group>
        
        {/* 4. SweepGradient (screen) - Sehr sparsam für subtile Hintergrund-Akzente */}
        <Group origin={vec(centerX, centerY)} transform={[{ rotate: rotRef.current }]}>
          <Path path={Skia.Path.Make().addCircle(centerX, centerY, mainRadius)} blendMode="screen" opacity={0.02}>
            <SweepGradient
              c={vec(centerX, centerY)}
              colors={[
                '#38E1FF',
                '#61E0FF',
                '#7A6DFF',
                '#FF6AD6',
                '#FF9966',
                '#38E1FF'
              ]}
              positions={[0.00, 0.12, 0.36, 0.58, 0.80, 1.00]}
            />
          </Path>
        </Group>
        
        {/* 5. Core-Flash - DEAKTIVIERT für Baseline-Test */}

        {/* 6. Petals - DEAKTIVIERT für Baseline-Test */}

        {/* 7a. Neon torus - DEAKTIVIERT für Baseline-Test */}

        {/* 7b. Cyanischer Halo - DEAKTIVIERT für Baseline-Test */}

        {/* 8. Caustics - DEAKTIVIERT für Baseline-Test */}

        {/* 9. Edge Highlight - DEAKTIVIERT für Baseline-Test */}

        {/* 10. Edge specular sweep - DEAKTIVIERT für Baseline-Test */}

        {/* 11. Bloom (screen) - Sehr sparsam für subtile Hintergrund-Aufhellung */}
        <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, width, height))} blendMode="screen" opacity={0.015}>
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

        {/* 12-13. Backdrop und Grain - DEAKTIVIERT für Baseline-Test */}


      </Canvas>
    </View>
  );
}
