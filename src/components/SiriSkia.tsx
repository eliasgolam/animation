import React, { useState, useEffect, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import { Canvas, Circle, RadialGradient, LinearGradient, vec, Group, Path, BlurMask, Blur, useClockValue, useComputedValue, Skia, useValue, RuntimeShader, Fill, Paint, Shader } from '@shopify/react-native-skia';

interface SiriSkiaProps {
  amplitude: number;
  isRunning: boolean;
  isDarkMode: boolean;
}

export default function SiriSkia({ amplitude, isRunning, isDarkMode }: SiriSkiaProps) {
  // Default-Design ohne Bewegung/Audio
  const DEFAULT_STATE = true;

  // Siri-Strict Preset für optimale Siri-Authentizität
  const SIRI_STRICT_PRESET = {
    tipStart: 0.74, tipEnd: 0.992, tipPow: 1.60, domPow: 1.40,
    coreStrength: 0.35, coreR1Mul: 0.10, coreR2Mul: 0.16,
    idle_thresh: 0.58, idle_soft: 0.045,
  };

const { width, height } = Dimensions.get('window');
const centerX = width / 2;
  const centerY = height / 2;
  
  // Siri Strict Switches
  const SIRI_STRICT = true;
  const SHOW_SLICES = false;   // OG Siri: keine Slices/Ribbons
  const SHOW_AO = false;       // Ambient Occlusion ausschalten
  
  // Siri Sweep Palette (statisch, nicht zeitbasiert)
  // 0 rad (rechts) = Cyan, oben = Magenta
  const SWEEP_START = -Math.PI / 2; // rotieren, so dass "oben" = 0.5 Position (Magenta)
  const SWEEP_END   = SWEEP_START + Math.PI * 2;

  const SIRI_SWEEP_COLORS = [
    'rgba(0,199,255,0.85)',   // Cyan
    'rgba(58,168,255,0.85)',  // Blau
    'rgba(122,77,255,0.85)',  // Violett
    'rgba(255,44,195,0.85)',  // Magenta
    'rgba(255,138,76,0.85)',  // Warm
    'rgba(0,199,255,0.85)'    // zurück zu Cyan
  ];
  const SIRI_SWEEP_POS = [0.00, 0.22, 0.46, 0.70, 0.92, 1.00];

  const LOBE = {
    right: 'rgba(56,225,255,0.85)',  // Cyan
    top:   'rgba(255,79,216,0.85)',  // Magenta
    left:  'rgba(122,77,255,0.85)',  // Violett/Blau
  };

  // SIRI META-PETALS v4 (SkSL) - sRGB→Linear, härtere Trennung, helleres Core
  const META_PETAL_SRC = `
uniform float2 u_res;
uniform float2 u_center;

uniform float aTop;   uniform float LTop;   uniform float w0Top;   uniform float w1Top;   uniform float pinchTop;   uniform float bendTop;
uniform float aRight; uniform float LRight; uniform float w0Right; uniform float w1Right; uniform float pinchRight; uniform float bendRight;
uniform float aLeft;  uniform float LLeft;  uniform float w0Left;  uniform float w1Left;  uniform float pinchLeft;  uniform float bendLeft;

uniform float3 colTop;
uniform float3 colRight;
uniform float3 colLeft;

uniform float u_thresh;
uniform float u_soft;

uniform float coreR1;
uniform float coreR2;
uniform float coreStrength;

uniform float2 offTop, offRight, offLeft;
uniform float sxTop, syTop, shTop;
uniform float sxRight, syRight, shRight;
uniform float sxLeft, syLeft, shLeft;
uniform float bTop, bRight, bLeft;

// NEU: Feder-Taper & Dominanz
uniform float tipStart;   // z.B. 0.70
uniform float tipEnd;     // z.B. 0.985
uniform float tipPow;     // z.B. 1.45
uniform float domPow;     // z.B. 1.25

const float PI = 3.14159265;

struct Lobe { float a; float L; float w0; float w1; float pinch; float bend; float3 col; };

float clamp01(float x){ return clamp(x, 0.0, 1.0); }
float toLin(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float3 srgb2lin(float3 c) { return float3(toLin(c.r), toLin(c.g), toLin(c.b)); }
float toSRGB(float c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * pow(max(c,0.0), 1.0/2.4) - 0.055; }
float3 lin2srgb(float3 c) { return float3(toSRGB(c.r), toSRGB(c.g), toSRGB(c.b)); }

// Basisfeld eines Lappens (mit Anisotropie/Shear); gibt Feldstärke zurück
float petalFieldL(float2 p, float2 c, Lobe lb, float2 off, float sx, float sy, float sh) {
  float ca = cos(lb.a), sa = sin(lb.a);
  float2 ux = float2(ca, sa);
  float2 vy = float2(-sa, ca);
  float2 d0 = p - (c + off);
  float u0 = dot(d0, ux);
  float v0 = dot(d0, vy);
  float u = clamp(u0, 0.0, lb.L);
  float s = (lb.L > 1e-3) ? (u / lb.L) : 0.0;

  float belly = 0.5 - 0.5 * cos(PI * s);
  float w = mix(lb.w0, lb.w1, smoothstep(0.06, 0.72, s)) * (0.62 + 0.38 * belly);
  w *= mix(1.0, 0.78, clamp01(lb.pinch));

  float curve = lb.bend * lb.L * 0.16 * (s - 0.35) * (1.0 - s);
  float v = v0 - curve;

  float uA = sx * u + sh * v;
  float vA = sy * v;

  float q = vA / (w + 1e-3);
  float tipFade = max(0.0, (abs(uA) - lb.L) / (0.25 * lb.L + 1.0));

  return exp(-q*q) * exp(-tipFade*tipFade);
}

// Anteil der Achsenlänge 0..1 (für Feder-Taper). Nutzt u0 ohne Aniso.
float axisFrac(float2 p, float2 c, Lobe lb, float2 off) {
  float2 d0 = p - (c + off);
  float ca = cos(lb.a), sa = sin(lb.a);
  float2 ux = float2(ca, sa);
  float u0 = dot(d0, ux);
  float u = clamp(u0, 0.0, lb.L);
  return (lb.L > 1e-3) ? (u / lb.L) : 0.0;
}

// schärferes weiches Maximum
float softmax3(float a, float b, float c, float k) {
  float ea = exp(k * a), eb = exp(k * b), ec = exp(k * c);
  return log(ea + eb + ec) / k;
}

half4 main(float2 frag) {
  float2 p = frag, c = u_center;

  Lobe t; t.a=aTop; t.L=LTop; t.w0=w0Top; t.w1=w1Top; t.pinch=pinchTop; t.bend=bendTop; t.col=colTop;
  Lobe r; r.a=aRight; r.L=LRight; r.w0=w0Right; r.w1=w1Right; r.pinch=pinchRight; r.bend=bendRight; r.col=colRight;
  Lobe l; l.a=aLeft; l.L=LLeft; l.w0=w0Left; l.w1=w1Left; l.pinch=pinchLeft; l.bend=bendLeft; l.col=colLeft;

  float Ft = petalFieldL(p, c, t, offTop,   sxTop,   syTop,   shTop);
  float Fr = petalFieldL(p, c, r, offRight, sxRight, syRight, shRight);
  float Fl = petalFieldL(p, c, l, offLeft,  sxLeft,  syLeft,  shLeft);

  float k = 1.45;            // schärferes softmax → klarere Überlagerungen
  float F = softmax3(Ft, Fr, Fl, k);
  float alpha = smoothstep(u_thresh - u_soft, u_thresh + u_soft, F);

  // Feder-Taper: entlang der Lappenachse zur Spitze ausfaden
  float st = axisFrac(p, c, t, offTop);
  float sr = axisFrac(p, c, r, offRight);
  float sl = axisFrac(p, c, l, offLeft);

  float taperT = 1.0 - smoothstep(tipStart, tipEnd, st);
  float taperR = 1.0 - smoothstep(tipStart, tipEnd, sr);
  float taperL = 1.0 - smoothstep(tipStart, tipEnd, sl);

  taperT = pow(clamp01(taperT), tipPow);
  taperR = pow(clamp01(taperR), tipPow);
  taperL = pow(clamp01(taperL), tipPow);

  // Dominanz-Gate: dort heller, wo der Lappen gewinnt; reduziert matschige Mitte
  float domScale = 1.0 / max(u_soft * 1.45, 1e-4);
  float dT = clamp((Ft - max(Fr, Fl)) * domScale, 0.0, 1.0);
  float dR = clamp((Fr - max(Ft, Fl)) * domScale, 0.0, 1.0);
  float dL = clamp((Fl - max(Ft, Fr)) * domScale, 0.0, 1.0);

  dT = pow(dT, domPow);
  dR = pow(dR, domPow);
  dL = pow(dL, domPow);

  // Per‑Lappen-Alphas (Kante) + Feder-Taper + Dominanz; premultiplied (für plus)
  float aT = smoothstep(u_thresh - u_soft, u_thresh + u_soft, Ft) * taperT * mix(0.28, 1.0, dT);
  float aR = smoothstep(u_thresh - u_soft, u_thresh + u_soft, Fr) * taperR * mix(0.28, 1.0, dR);
  float aL = smoothstep(u_thresh - u_soft, u_thresh + u_soft, Fl) * taperL * mix(0.28, 1.0, dL);

  float3 colTopL   = srgb2lin(t.col) * bTop;
  float3 colRightL = srgb2lin(r.col) * bRight;
  float3 colLeftL  = srgb2lin(l.col) * bLeft;

  float3 insideL = colTopL * aT + colRightL * aR + colLeftL * aL;

  // Core-Glint (zentral, hell)
  float2 pc = p - c;
  float d2 = dot(pc, pc);
  float core = coreStrength * 1.35 * (exp(-d2/(coreR1*coreR1)) + 0.55 * exp(-d2/(coreR2*coreR2)));
  insideL += core * 1.10;

  // Dünne iso‑Rim direkt an der Formkante
  float isoA = u_thresh + u_soft * 0.20;
  float isoB = u_thresh + u_soft * 0.95;
  float isoC = u_thresh + u_soft * 1.75;
  float rimBand = clamp((smoothstep(isoA, isoB, F) - smoothstep(isoB, isoC, F)), 0.0, 1.0);

  // Kantenableitung für feine Betonung
  float2 px = float2(1.25, 0.0), py = float2(0.0, 1.25);
  float Fx = softmax3(
    petalFieldL(p + px, c, t, offTop, sxTop, syTop, shTop),
    petalFieldL(p + px, c, r, offRight, sxRight, syRight, shRight),
    petalFieldL(p + px, c, l, offLeft, sxLeft, syLeft, shLeft), k
  ) - softmax3(
    petalFieldL(p - px, c, t, offTop, sxTop, syTop, shTop),
    petalFieldL(p - px, c, r, offRight, sxRight, syRight, shRight),
    petalFieldL(p - px, c, l, offLeft, sxLeft, syLeft, shLeft), k
  );
  float Fy = softmax3(
    petalFieldL(p + py, c, t, offTop, sxTop, syTop, shTop),
    petalFieldL(p + py, c, r, offRight, sxRight, syRight, shRight),
    petalFieldL(p + py, c, l, offLeft, sxLeft, syLeft, shLeft), k
  ) - softmax3(
    petalFieldL(p - py, c, t, offTop, sxTop, syTop, shTop),
    petalFieldL(p - py, c, r, offRight, sxRight, syRight, shRight),
    petalFieldL(p - py, c, l, offLeft, sxLeft, syLeft, shLeft), k
  );
  float edge = pow(clamp(length(float2(Fx, Fy)) * 0.70, 0.0, 1.0), 0.85) * smoothstep(0.15, 0.85, alpha);

  // Fresnel peakt an der Kante (nicht außerhalb)
  float fres = 0.60 * alpha * (1.0 - alpha);

  insideL += (edge * 0.06 + rimBand * 0.20) + fres * 0.85; // weniger Banding, etwas mehr Edge

  // Mildes Tonemapping -> Highlights bleiben hell
  insideL = insideL / (1.0 + 0.55 * insideL);

  float3 col = lin2srgb(max(insideL, float3(0.0)));
  return half4(col, alpha);
}
`;
  
  // Utils
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const deg = (d: number) => (d * Math.PI) / 180;

  // Noise helpers for endless, non-looping animations
  const fract = (x: number) => x - Math.floor(x);
  const hash1 = (x: number) => fract(Math.sin(x * 127.1 + 311.7) * 43758.5453123);
  const noise1D = (x: number, seed = 0) => {
    const i = Math.floor(x + seed * 17.123);
    const f = x - Math.floor(x);
    const u = f * f * (3 - 2 * f);
    const a = hash1(i);
    const b = hash1(i + 1);
    return (a * (1 - u) + b * u) * 2 - 1;
  };
  const fbm1D = (x: number, seed = 0, oct = 4) => {
    let v = 0, amp = 0.5, freq = 1.0;
    for (let o = 0; o < oct; o++) { v += amp * noise1D(x * freq, seed + o * 19.19); freq *= 2.02; amp *= 0.5; }
    return v;
  };

  const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Catmull-Rom -> Cubic helper for smooth outlines
  type V2 = { x: number; y: number };
  const cubicThrough = (p: any, pts: V2[]) => {
    if (pts.length < 2) return;
    p.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i === 0 ? pts[i] : pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i + 2 < pts.length ? pts[i + 2] : p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      p.cubicTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
  };

  // Wave-Ribbon builder: width(s) has mid "belly" + wave harmonics; bend offsets centerline.
  const makeWaveBlobPath3D = (
    theta: number,
    r0: number, r1: number,              // axis start/end
    w0: number, w1: number,              // base widths near root/toward mid
    pinch: number,                        // 0.45..0.70 (neck)
    bias: number,                         // -1..+1 (top/bottom asym)
    bend: number,                         // -1..+1 lateral curvature
    phi1: number, phi2: number,          // wave phases
    sx: number, sy: number, sh: number    // 3D surrogate
  ) => {
    const p = Skia.Path.Make();
    const steps = 40;
    const top: V2[] = [];
    const bot: V2[] = [];
    const L = r1 - r0;

    for (let i = 0; i <= steps; i++) {
      const s = i / steps;               // 0..1 along axis
      const x = r0 + L * s;

      // "Lens" profile: wide in der Mitte, schlanker an Wurzel/Spitze
      const belly = Math.sin(Math.PI * s);                       // peak at 0.5
      const base = lerp(w0, w1, smoothstep(0.05, 0.70, s)) * (0.68 + 0.32 * belly);

      // Wave modulation (2 harmonics) -> echte Formveränderung
      // Siri-typische "atmen"-Wellen: stärkere 2. Harmonik, leicht verschobene 4.
      const mod = 1
        + 0.06 * Math.sin(2 * Math.PI * s + phi1)
        + 0.03 * Math.sin(4 * Math.PI * s + phi2 + 0.35);

      const width = clamp(base * mod, 0, L * 0.9);
      const neck = lerp(1.0, 0.78, pinch);                       // neck factor (nicht zu spitz)
      const wTop = width * neck * (1 + 0.55 * bias);
      const wBot = width * neck * (1 - 0.55 * bias);

      // gentle S-like bend of the centerline
      const sB = s - 0.35;
      const curve = bend * L * 0.17 * sB * (1 - s);              // etwas stärkere S-Biegung

      const P = (yy: number): V2 => {
        const localY = yy + curve;
        const xl = sx * x + sh * localY, yl = sy * localY;
        const ux = Math.cos(theta), uy = Math.sin(theta);
        const vx = -Math.sin(theta), vy = Math.cos(theta);
        return { x: centerX + ux * xl + vx * yl, y: centerY + uy * xl + vy * yl };
      };

      top.push(P(+wTop));
      bot.push(P(-wBot));
    }

    const poly = top.concat(bot.reverse());
    cubicThrough(p, poly);
    p.close();
    return p;
  };

  // Zeitlich unabhängiger Smoother für ruhige 3D-Bewegung
  const smoothToward = (cur: number, target: number, dt: number, tau: number) =>
    cur + (target - cur) * (1 - Math.exp(-dt / Math.max(1e-3, tau)));

  // State-Packs für gekoppelte 3D-Surrogates + Morph-Kanäle pro Blob
  const Cstate = { last: useValue(0), yaw: useValue(0), pit: useValue(0), rol: useValue(0), pin: useValue(0), w0: useValue(0), w1: useValue(0), bias: useValue(0), c1v: useValue(0.30), c2v: useValue(0.78), bend: useValue(0) };
  const Bstate = { last: useValue(0), yaw: useValue(0), pit: useValue(0), rol: useValue(0), pin: useValue(0), w0: useValue(0), w1: useValue(0), bias: useValue(0), c1v: useValue(0.30), c2v: useValue(0.78), bend: useValue(0) };
  const Mstate = { last: useValue(0), yaw: useValue(0), pit: useValue(0), rol: useValue(0), pin: useValue(0), w0: useValue(0), w1: useValue(0), bias: useValue(0), c1v: useValue(0.30), c2v: useValue(0.78), bend: useValue(0) };

  // Amplitude 0..1 + Glättung
  const ampTarget = clamp(amplitude / 100, 0, 1);
  const [ampSmooth, setAmpSmooth] = useState(0);
  useEffect(() => { 
    setAmpSmooth(prev => {
      const isAttack = ampTarget > prev;
      const rate = isAttack ? 0.17 : 0.08; // Siri-typisch harmonisiert
      return prev + (ampTarget - prev) * rate;
    });
  }, [ampTarget]);

  // Phase C: eigener Envelope (schneller Attack, langsamer Release)
  const [ampEnvC, setAmpEnvC] = useState(0);
  useEffect(() => {
    setAmpEnvC(prev => {
      const isAttack = ampTarget > prev;
      const rate = isAttack ? 0.24 : 0.06;
      return prev + (ampTarget - prev) * rate;
    });
  }, [ampTarget]);

  // Keine globale Rotation mehr – Blobs stehen wie bei Siri übereinander

  // Phase C: integrierte Phase für Mikrodynamik (kein Modulo-Flackern)
  const lastTc = useValue(0);
  const phaseC = useValue(0);

  
  
  // Normalisierte Geometrie - Amplitude nur für subtilen Bloom
  const baseRadius = Math.min(width, height) * 0.23; // 0.22–0.26 ist Siri-typisch
  const ringRadius = baseRadius; // Konstanter Ring-Radius
  
  // Innere Ringe für mehr Tiefe
  const innerRadius = ringRadius * 0.6;
  const outerGlowRadius = ringRadius * 1.4 + (ampSmooth * 8); // Amplitudengesteuert
  
  // Robuster Kreis-Clip statt Mask (verhindert Artefakte)
  const orbClip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(centerX, centerY, ringRadius);
    return p;
  }, [centerX, centerY, ringRadius]);
  
  // Rainbow-Regler (vorhanden, aber standardmäßig deaktiviert)
  const ringAmp = Math.pow(ampSmooth, 0.75);
  const ringWidth = lerp(0.020, 0.036, ringAmp);   // leicht schmaler
  const ringGain  = lerp(0.24, 0.40, ringAmp);     // etwas sanfter
  const showRing = false; // OG Siri: kein bunter Ring / kein sichtbarer Border
  
  const blobAlphaBase = 0.55;
  const blobAlpha = blobAlphaBase + 0.28 * ampSmooth;
  const blobSoft = 0.72; // reserved
  const blobScale = ringRadius * 0.95;

  // Neutrale Blobs: keine Farbverschiebung, nur Helligkeit/“Sättigung”
  // Vorherige farbige Version deaktiviert:
  // false && (() => {
  //   const prevBlobColors = (hex: string, aCore = blobAlpha) => {
  //     switch (hex.toUpperCase()) {
  //       case '#38E1FF': return ['rgba(56,225,255,0.90)','rgba(56,225,255,0.40)',`rgba(255,255,255,${aCore * 0.10})`];
  //       case '#FF4FD8': return ['rgba(255,79,216,0.90)','rgba(255,79,216,0.40)',`rgba(255,255,255,${aCore * 0.10})`];
  //       case '#4CB6FF': return ['rgba(76,182,255,0.90)','rgba(76,182,255,0.40)',`rgba(255,255,255,${aCore * 0.10})`];
  //       default: return [Skia.Color(hex).toString(), Skia.Color(hex).toString(), `rgba(255,255,255,${aCore * 0.10})`];
  //     }
  //   };
  //   return prevBlobColors;
  // })();
  const blobColors = (hex: string, aCore = blobAlpha) => {
    switch (hex.toUpperCase()) {
      case '#38E1FF': // Cyan
        return [
          `rgba(56,225,255,${0.20 + 0.20 * ampSmooth})`,
          `rgba(56,225,255,${0.10 + 0.12 * ampSmooth})`,
          `rgba(255,255,255,${aCore * 0.04})`
        ];
      case '#FF4FD8': // Magenta
        return [
          `rgba(255,79,216,${0.20 + 0.20 * ampSmooth})`,
          `rgba(255,79,216,${0.10 + 0.12 * ampSmooth})`,
          `rgba(255,255,255,${aCore * 0.04})`
        ];
      case '#4CB6FF': // Blau
        return [
          `rgba(76,182,255,${0.20 + 0.20 * ampSmooth})`,
          `rgba(76,182,255,${0.10 + 0.12 * ampSmooth})`,
          `rgba(255,255,255,${aCore * 0.04})`
        ];
      default:
        return [
          Skia.Color(hex).toString(),
          Skia.Color(hex).toString(),
          `rgba(255,255,255,${aCore * 0.04})`
        ];
    }
  };
  const blobPositions = [0.0, 0.46, 1.0];
  
  // Siri-Blobs: heller Kern -> satter Midtone -> weiches Tail
  // Helper: rgba from tuple
  const rgba = (rgb: [number, number, number], a: number) =>
    `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  // Siri-Palette: exakte Farbspur
  const ramp: [number, number, number][] = [
    [0,199,255], [58,168,255], [122,77,255], [255,44,195], [255,138,76], [0,199,255]
  ];
  const mixRGB = (a: [number, number, number], b: [number, number, number], t: number) =>
    [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as [number, number, number];
  const colorCycle = (u: number) => {
    const n = ramp.length - 1;
    const x = u - Math.floor(u); // fract(u) ohne Modulo
    const i = Math.floor(x * n);
    const t = x * n - i;
    return mixRGB(ramp[i], ramp[i + 1], t);
  };

  const blobStops = (rgb: [number, number, number]) => ({
    colors: [
      `rgba(255,255,255,${0.48 + 0.38 * ampSmooth})`,
      rgba(rgb, 0.86),
      rgba(rgb, 0.30),
      'rgba(0,0,0,0.00)',
    ],
    positions: [0.00, 0.14, 0.72, 1.00]
  });

  // Lokales Achsensystem -> Weltkoordinaten (Winkel theta)
  const toWorld = (theta: number, x: number, y: number) => {
    const ux = Math.cos(theta), uy = Math.sin(theta);
    const vx = -Math.sin(theta), vy = Math.cos(theta);
    return { x: centerX + ux * x + vx * y, y: centerY + uy * x + vy * y };
  };

  // Blattförmiger Pfad (Basis): schmale Wurzel -> bauchige Spitze
  const makePetalPath = (
    theta: number,
    r0: number, r1: number,
    w0: number, w1: number,
    pinch: number,             // 0.35..0.65
    c1 = 0.33, c2 = 0.72       // Kurvenverlauf entlang der Achse
  ) => {
    const p = Skia.Path.Make();
    const L1 = r0 + (r1 - r0) * c1;
    const L2 = r0 + (r1 - r0) * c2;
    const P0t = toWorld(theta, r0, +w0 * pinch);
    const P0b = toWorld(theta, r0, -w0 * pinch);
    const C1t = toWorld(theta, L1, +((w0 + w1) * 0.55));
    const C2t = toWorld(theta, L2, +(w1));
    const Tip = toWorld(theta, r1, 0);
    const C2b = toWorld(theta, L2, -(w1));
    const C1b = toWorld(theta, L1, -((w0 + w1) * 0.55));
    p.moveTo(P0t.x, P0t.y);
    p.cubicTo(C1t.x, C1t.y, C2t.x, C2t.y, Tip.x, Tip.y);
    p.cubicTo(C2b.x, C2b.y, C1b.x, C1b.y, P0b.x, P0b.y);
    p.close();
    return p;
  };


  // Stabile Seeds für unabhängige 3D-Morphs pro Blob
  const seeds = useMemo(() => ({
    C: { yaw: 17, pit: 23, rol: 31, pin: 37 },
    B: { yaw: 29, pit: 41, rol: 53, pin: 59 },
    M: { yaw: 71, pit: 83, rol: 97, pin: 103 },
  }), []);

  // 3D-Helper für Petal-Pfade
  const toWorld3D = (theta: number, x: number, y: number, sx: number, sy: number, sh: number) => {
    const xl = sx * x + sh * y, yl = sy * y;
    const ux = Math.cos(theta), uy = Math.sin(theta);
    const vx = -Math.sin(theta), vy = Math.cos(theta);
    return { x: centerX + ux * xl + vx * yl, y: centerY + uy * xl + vy * yl };
  };

  const makePetalPath3D = (theta: number, r0: number, r1: number, w0: number, w1: number, pinch: number, sx: number, sy: number, sh: number, c1 = 0.33, c2 = 0.72) => {
    const p = Skia.Path.Make();
    const L1 = r0 + (r1 - r0) * c1, L2 = r0 + (r1 - r0) * c2;
    const P0t = toWorld3D(theta, r0, +w0 * pinch, sx, sy, sh);
    const P0b = toWorld3D(theta, r0, -w0 * pinch, sx, sy, sh);
    const C1t = toWorld3D(theta, L1, +((w0 + w1) * 0.55), sx, sy, sh);
    const C2t = toWorld3D(theta, L2, +(w1), sx, sy, sh);
    const Tip  = toWorld3D(theta, r1, 0, sx, sy, sh);
    const C2b = toWorld3D(theta, L2, -(w1), sx, sy, sh);
    const C1b = toWorld3D(theta, L1, -((w0 + w1) * 0.55), sx, sy, sh);
    p.moveTo(P0t.x, P0t.y); p.cubicTo(C1t.x, C1t.y, C2t.x, C2t.y, Tip.x, Tip.y);
    p.cubicTo(C2b.x, C2b.y, C1b.x, C1b.y, P0b.x, P0b.y); p.close(); return p;
  };

  // Morphing Path Builder mit Asymmetrie + Biegung
  const makeBlobPathMorph = (
    theta: number,
    r0: number, r1: number,
    w0: number, w1: number,
    pinch: number,       // 0.45..0.70
    bias: number,        // -1..+1 (oben/unten asym)
    bend: number,        // -1..+1 (seitliche Biegung)
    c1: number, c2: number,
    sx: number, sy: number, sh: number
  ) => {
    const p = Skia.Path.Make();
    const L1 = r0 + (r1 - r0) * c1;
    const L2 = r0 + (r1 - r0) * c2;

    // seitliche Biegung entlang der Achse (0=root .. 1=tip)
    const bendAmt = r1 * 0.12 * bend;
    const off = (s: number) => (s - 0.15) * bendAmt;

    // Asymmetrie: obere/untere Kante unterschiedlich
    const w0t = w0 * pinch * (1 + 0.60 * bias);
    const w0b = w0 * pinch * (1 - 0.60 * bias);
    const w1t = w1 * (1 + 0.40 * bias);
    const w1b = w1 * (1 - 0.40 * bias);

    const P = (x: number, y: number, s: number) => toWorld3D(theta, x, y + off(s), sx, sy, sh);
    const s0 = 0, s1 = c1, s2 = c2, s3 = 1;

    const P0t = P(r0, +w0t, s0);
    const P0b = P(r0, -w0b, s0);
    const C1t = P(L1, +((w0t + w1t) * 0.55), s1);
    const C2t = P(L2, +(w1t), s2);
    const Tip =  P(r1, 0, s3);
    const C2b = P(L2, -(w1b), s2);
    const C1b = P(L1, -((w0b + w1b) * 0.55), s1);

    p.moveTo(P0t.x, P0t.y);
    p.cubicTo(C1t.x, C1t.y, C2t.x, C2t.y, Tip.x, Tip.y);
    p.cubicTo(C2b.x, C2b.y, C1b.x, C1b.y, P0b.x, P0b.y);
    p.close();
    return p;
  };

  // Feste Siri-Ausrichtung: links-oben (C), rechts-oben (B), unten (M)
  const ANG_L = deg(125);
  const ANG_R = deg(55);
  const ANG_B = deg(-90);
  
  // Skia Clock
  const clock = useClockValue();

  // reaktive Zeit (in s)
  const tCV = useComputedValue(() => (isRunning ? clock.current / 1000 : 0), [clock, isRunning]);

  // Idle: ruhige, non-loop Noise-Amplitude (0.06..0.18)
  const idleAmp = (t: number) => {
    const n = 0.5 + 0.5 * fbm1D(t * 0.055, 1337, 4); // sehr langsame, nicht periodische Drift
    return 0.05 + 0.10 * n;  // dezenter für näher am Original
  };

  // Sprecherkennungsschwelle (klein halten, damit Idle selten "anspringt")
  const TALK_GATE = 0.14;

  // sanfte globale Drift (kleiner Orientierungswobble)
  const thetaDriftCV = useComputedValue(() => 0.18 * Math.sin(tCV.current * 0.35), [tCV]);

  // globale Orb-Neigung → anisotrope Skalierung + Shear (Siri-Glaslook)
  const tiltCV = useComputedValue(() => {
    const t = tCV.current;
    const yaw   = 0.035 * Math.sin(t * 0.16 + 0.6);   // Siri-typisch
    const pitch = 0.045 * Math.sin(t * 0.18 - 0.8);   // Siri-typisch
    const roll  = 0.05 * Math.sin(t * 0.14 + 2.2);   // Siri-typisch
    return {
      sx: 1 + 0.20 * yaw,
      sy: 1 - 0.16 * pitch,
      sh: 0.22 * roll,
    };
  }, [tCV]);

  // per-Blob Mikrotilt (leicht phasenversetzt für Parallaxe)
  const microTilt = (phase: number) => useComputedValue(() => {
    const t = tCV.current + phase;
    const base = tiltCV.current;
      return {
      sx: base.sx * (1 + 0.05 * Math.sin(t * 0.9)),
      sy: base.sy * (1 - 0.05 * Math.sin(t * 0.85)),
      sh: base.sh + 0.06 * Math.sin(t * 1.1),
    };
  }, [tCV, tiltCV]);

  const topTiltCV   = microTilt(0.0);
  const rightTiltCV = microTilt(2.1);
  const leftTiltCV  = microTilt(4.2);

  // Orbitale Parallaxe: Blobs kreisen leicht um das Zentrum (Siri-typisch)
  const orbitCV = useComputedValue(() => {
    const t = tCV.current;
    const Ax = ringRadius * 0.024;  // x-Amplitude (Siri-typisch, dezenter)
    const Ay = ringRadius * 0.036;  // y-Amplitude (Siri-typisch, dezenter)
      return {
      top:   { x:  Ax * Math.sin(t * 0.24 + 2.1), y: -Ay * Math.cos(t * 0.22 + 0.7) },
      right: { x:  Ax * Math.cos(t * 0.20 + 0.2), y:  Ay * Math.sin(t * 0.26 + 1.6) },
      left:  { x: -Ax * Math.cos(t * 0.22 + 2.6), y: -Ay * Math.sin(t * 0.24 + 3.2) },
    };
  }, [tCV]);

  // Transform-CVs mit einfacher Tiefen-Skalierung
  const depthScaleCV = useComputedValue(() => {
    const scale = (y: number) => 1 + (y / (ringRadius * 0.80)) * 0.08;
    const { top, right, left } = orbitCV.current;
    return { top: scale(top.y), right: scale(right.y), left: scale(left.y) };
  }, [orbitCV]);

  const topXformCV = useComputedValue(() => {
    const o = orbitCV.current.top; const s = depthScaleCV.current.top;
    return [
      { translateX: centerX }, { translateY: centerY },
      { scaleX: s }, { scaleY: s },
      { translateX: -centerX }, { translateY: -centerY },
      { translateX: o.x }, { translateY: o.y },
    ];
  }, [orbitCV, depthScaleCV]);
  const rightXformCV = useComputedValue(() => {
    const o = orbitCV.current.right; const s = depthScaleCV.current.right;
    return [
      { translateX: centerX }, { translateY: centerY },
      { scaleX: s }, { scaleY: s },
      { translateX: -centerX }, { translateY: -centerY },
      { translateX: o.x }, { translateY: o.y },
    ];
  }, [orbitCV, depthScaleCV]);
  const leftXformCV = useComputedValue(() => {
    const o = orbitCV.current.left; const s = depthScaleCV.current.left;
    return [
      { translateX: centerX }, { translateY: centerY },
      { scaleX: s }, { scaleY: s },
      { translateX: -centerX }, { translateY: -centerY },
      { translateX: o.x }, { translateY: o.y },
    ];
  }, [orbitCV, depthScaleCV]);

  // Frontness -> leichte Helligkeitsänderung je nach "Tiefe" (y-Position im Orbit) - ruhiger
  const frontnessCV = useComputedValue(() => {
    const f = (y: number) => clamp(0.88 + (y / (ringRadius * 0.12)) * 0.18, 0.75, 1.00); // ruhiger
    const { top, right, left } = orbitCV.current;
    return { top: f(top.y), right: f(right.y), left: f(left.y) };
  }, [orbitCV]);
  const topOpacityCV   = useComputedValue(() => frontnessCV.current.top,   [frontnessCV]);
  const rightOpacityCV = useComputedValue(() => frontnessCV.current.right, [frontnessCV]);
  const leftOpacityCV  = useComputedValue(() => frontnessCV.current.left,  [frontnessCV]);

  // Breath muss ebenso auf clock hören
  const breath = useComputedValue(() => {
    const t = tCV.current;
    const n = fbm1D(t * 0.08, 901, 4);
    return 0.5 + 0.5 * n;
  }, [tCV]);

  const sceneBreathTransform = useComputedValue(() => {
    const depth = lerp(0.018, 0.046, ampSmooth);
    const scale = 1 + depth * (breath.current * 2 - 1);
    return [
      { translateX: centerX }, { translateY: centerY },
      { scaleX: scale }, { scaleY: scale },
      { translateX: -centerX }, { translateY: -centerY },
    ];
  }, [breath, ampSmooth]);

  // Farb-Cycling (nach tCV-Deklaration)
  const colorC = useComputedValue(() => colorCycle(((tCV.current) * 0.04 + 0.00) % 1), [tCV]);
  const colorB = useComputedValue(() => colorCycle(((tCV.current) * 0.04 + 0.33) % 1), [tCV]);
  const colorM = useComputedValue(() => colorCycle(((tCV.current) * 0.04 + 0.66) % 1), [tCV]);

  // SkSL Meta-Petals Shader
  const metaPetalFx = useMemo(() => Skia.RuntimeEffect.Make(META_PETAL_SRC)!, []);

  // Statische Default-Uniforms (Siri-Design ohne Animation)
  const uniformsDefault = useMemo(() => {
    const blob = ringRadius * 0.95;

    const aTop = (-Math.PI/2);
    const aRight = (Math.PI/6);
    const aLeft = (7*Math.PI/6);

    const LTop = blob * 0.66;
    const LRight = blob * 0.68;
    const LLeft = blob * 0.67;

    const slim = 0.92;
    const w0Top = blob * (0.16 * slim * 1.06); // +6% für weniger säulenförmig
    const w1Top = blob * (0.36 * slim);
    const w0Right = blob * (0.14 * slim);
    const w1Right = blob * (0.34 * slim);
    const w0Left = blob * (0.15 * slim);
    const w1Left = blob * (0.35 * slim);

    const pinchTop = 0.53, pinchRight = 0.56, pinchLeft = 0.57; // -0.03 im Idle
    const bendTop = 0.02, bendRight = 0.015, bendLeft = -0.02;

    const oAmp = ringRadius * 0.052; // leicht erhöht für sichtbarere Trennung
    const offTop   = [0.0, -oAmp] as [number, number];
    const offRight = [ oAmp * 0.95,  oAmp * 0.45] as [number, number];
    const offLeft  = [-oAmp * 1.00,  oAmp * 0.55] as [number, number];

    const sx = 1.00, sy = 0.92, sh = 0.05;

    const u_thresh = SIRI_STRICT_PRESET.idle_thresh;  // 0.58 für Siri-Strict
    const u_soft   = SIRI_STRICT_PRESET.idle_soft;    // 0.045 für Siri-Strict

    const coreStrength = SIRI_STRICT_PRESET.coreStrength;  // 0.35 für Siri-Strict
    const coreR1 = blob * SIRI_STRICT_PRESET.coreR1Mul;    // 0.10 für Siri-Strict
    const coreR2 = blob * SIRI_STRICT_PRESET.coreR2Mul;    // 0.16 für Siri-Strict

    // Feder-Taper & Dominanz Parameter (Siri-Strict)
    const tipStart = SIRI_STRICT_PRESET.tipStart;  // 0.74
    const tipEnd = SIRI_STRICT_PRESET.tipEnd;      // 0.992
    const tipPow = SIRI_STRICT_PRESET.tipPow;      // 1.60
    const domPow = SIRI_STRICT_PRESET.domPow;      // 1.40

    return {
      u_res: [width, height] as [number, number],
      u_center: [centerX, centerY] as [number, number],

      aTop,   LTop,   w0Top,   w1Top,   pinchTop,   bendTop,
      aRight, LRight, w0Right, w1Right, pinchRight, bendRight,
      aLeft,  LLeft,  w0Left,  w1Left,  pinchLeft,  bendLeft,

      colTop:   [1.00, 0.172, 0.765],  // #FF2CC3
      colRight: [0.000, 0.780, 1.000], // #00C7FF
      colLeft:  [0.478, 0.302, 1.000], // #7A4DFF

      u_thresh, u_soft,
      coreR1, coreR2, coreStrength,

      offTop, offRight, offLeft,
      sxTop: sx, syTop: sy, shTop: sh,
      sxRight: sx, syRight: sy, shRight: sh,
      sxLeft: sx, syLeft: sy, shLeft: sh,
      bTop: 1.0, bRight: 1.0, bLeft: 1.0,

      // Feder-Taper & Dominanz
      tipStart, tipEnd, tipPow, domPow,
    };
  }, [width, height, centerX, centerY, ringRadius]);

  // Uniforms reaktiv setzen (Zeit/Amplitude → Form)
  const uniformsCV = useComputedValue(() => {
    const t = tCV.current;

    // Idle vs Talking
    const talking = !DEFAULT_STATE && isRunning && ampSmooth > TALK_GATE;
    const ampIdle = idleAmp(t);                    // 0.06..0.18
    const amp = talking ? Math.min(Math.max(ampSmooth, 0), 1) : ampIdle;

    // Skala der Formänderung abhängig vom Modus
    const lenScale  = talking ? 0.26 : 0.06;       // Idle: geringe Längenänderung
    const wScale    = talking ? 1.00 : 0.92;       // Idle: etwas schlanker (Siri-Look)
    const pinchBias = talking ? 0.18 : 0.06;       // Idle: weniger "Neck"-Pumping
    const bendAmt   = talking ? 1.00 : 0.55;       // Idle: geringere S-Biegung

    const rr = ringRadius;
    const blob = rr * 0.95;

    // Winkel (mini wobble, identisch in Idle/Talking)
    const aTop   = (-Math.PI/2) + 0.015 * Math.sin(t * 0.18 + 0.9);
    const aRight = ( Math.PI/6) + 0.012 * Math.sin(t * 0.20 + 2.1);
    const aLeft  = (7*Math.PI/6) + 0.018 * Math.sin(t * 0.16 + 4.2);

    // Längen – Idle hat nur ~±6% Variation, Talking wie gehabt
    const LTop   = blob * (0.66 + lenScale*amp + 0.006 * Math.sin(t * 0.18));
    const LRight = blob * (0.68 + lenScale*amp + 0.006 * Math.sin(t * 0.16 + 0.7));
    const LLeft  = blob * (0.67 + lenScale*amp + 0.006 * Math.sin(t * 0.20 + 1.1));

    // Breiten – Idle schlanker und ruhiger
    const w0Top   = blob * ((0.16 + 0.10*(1 - amp)) * wScale);
    const w1Top   = blob * ((0.36 + 0.20*(1 - amp)) * wScale);
    const w0Right = blob * ((0.14 + 0.10*(1 - amp)) * wScale);
    const w1Right = blob * ((0.34 + 0.22*(1 - amp)) * wScale);
    const w0Left  = blob * ((0.15 + 0.10*(1 - amp)) * wScale);
    const w1Left  = blob * ((0.35 + 0.22*(1 - amp)) * wScale);

    const pinchTop   = 0.56 + pinchBias*amp + 0.01 * Math.sin(t * 0.22);
    const pinchRight = 0.56 + pinchBias*amp + 0.01 * Math.sin(t * 0.20 + 0.6);
    const pinchLeft  = 0.57 + pinchBias*amp + 0.01 * Math.sin(t * 0.24 + 1.2);

    const bendTop   = 0.05 * bendAmt * Math.sin(t * 0.18 + 1.7);
    const bendRight = 0.04 * bendAmt * Math.sin(t * 0.16 + 0.9);
    const bendLeft  = 0.05 * bendAmt * Math.sin(t * 0.20 + 2.3);

    // Orbit/Parallaxe & Mikro‑Tilt wie gehabt
    const oT = orbitCV.current.top;
    const oR = orbitCV.current.right;
    const oL = orbitCV.current.left;

    const { sx: sxT, sy: syT, sh: shT } = topTiltCV.current;
    const { sx: sxR, sy: syR, sh: shR } = rightTiltCV.current;
    const { sx: sxL, sy: syL, sh: shL } = leftTiltCV.current;

    const bT = frontnessCV.current.top;
    const bR = frontnessCV.current.right;
    const bL = frontnessCV.current.left;

    // Kante/Weichheit – Idle etwas konservativer, damit Ränder nicht "ausbluten"
    const ampE = Math.pow(Math.min(Math.max(amp, 0), 1), 0.85);
    const u_thresh = talking ? (0.60 - 0.16 * ampE) : 0.56;
    const u_soft   = talking ? lerp(0.070, 0.050, ampE) : 0.055;

    return {
      u_res: [width, height],
      u_center: [centerX, centerY],

      aTop,   LTop,   w0Top,   w1Top,   pinchTop,   bendTop,
      aRight, LRight, w0Right, w1Right, pinchRight, bendRight,
      aLeft,  LLeft,  w0Left,  w1Left,  pinchLeft,  bendLeft,

      colTop:   [1.00, 0.172, 0.765],  // #FF2CC3
      colRight: [0.000, 0.780, 1.000], // #00C7FF
      colLeft:  [0.478, 0.302, 1.000], // #7A4DFF

      u_thresh, u_soft,

      // Core bleibt gleich
      coreStrength: 0.35,     // statt 0.42
      coreR1: blob * 0.10,    // statt 0.13
      coreR2: blob * 0.16,    // statt 0.20

      // Orbit Offsets
      offTop:   [oT.x, oT.y],
      offRight: [oR.x, oR.y],
      offLeft:  [oL.x, oL.y],

      // Tilt pro Blob
      sxTop: sxT, syTop: syT, shTop: shT,
      sxRight: sxR, syRight: syR, shRight: shR,
      sxLeft: sxL, syLeft: syL, shLeft: shL,

      // Frontness-Bias
      bTop: bT, bRight: bR, bLeft: bL,

      // Feder/Dominanz unverändert (passt gut zu Siri)
      tipStart: 0.74,
      tipEnd: 0.992,
      tipPow: 1.60,
      domPow: 1.40,
    };
  }, [tCV, ampSmooth, width, height, centerX, centerY, ringRadius, orbitCV, topTiltCV, rightTiltCV, leftTiltCV, frontnessCV]);

  // Debug-Logging entfernt für sauberen Siri-Look

  // Legacy Path-basierte Blobs (für Fallback)
  const topPath = useComputedValue(() => {
    const t = tCV.current;
    const { sx, sy, sh } = topTiltCV.current;
    const amp = ampSmooth;
    const theta = deg(-90) + 0.04 * Math.sin(t * 0.28 + 0.9);
    const r0 = ringRadius * 0.010;
    const r1 = blobScale * (0.66 + 0.26 * amp + 0.008 * Math.sin(t * 0.30));
    const w0 = blobScale * (0.16 + 0.10 * (1 - amp));
    const w1 = blobScale * (0.36 + 0.20 * (1 - amp));
    const pinch = 0.56 + 0.18 * amp + 0.01 * Math.sin(t * 0.40);
    return makePetalPath3D(theta, r0, r1, w0, w1, pinch, sx, sy, sh, 0.30, 0.74);
  }, [tCV, topTiltCV]);

  const rightPath = useComputedValue(() => {
    const t = tCV.current;
    const { sx, sy, sh } = rightTiltCV.current;
    const amp = ampSmooth;
    const theta = deg(30) + 0.04 * Math.sin(t * 0.30 + 2.1);
    const r0 = ringRadius * 0.010;
    const r1 = blobScale * (0.68 + 0.24 * amp + 0.008 * Math.sin(t * 0.28 + 0.7));
    const w0 = blobScale * (0.14 + 0.10 * (1 - amp));
    const w1 = blobScale * (0.34 + 0.22 * (1 - amp));
    const pinch = 0.56 + 0.17 * amp + 0.01 * Math.sin(t * 0.36 + 0.6);
    return makePetalPath3D(theta, r0, r1, w0, w1, pinch, sx, sy, sh, 0.30, 0.74);
  }, [tCV, rightTiltCV]);

  const leftPath = useComputedValue(() => {
    const t = tCV.current;
    const { sx, sy, sh } = leftTiltCV.current;
    const amp = ampSmooth;
    const theta = deg(210) + 0.04 * Math.sin(t * 0.29 + 4.2);
    const r0 = ringRadius * 0.010;
    const r1 = blobScale * (0.67 + 0.25 * amp + 0.008 * Math.sin(t * 0.31 + 1.1));
    const w0 = blobScale * (0.15 + 0.10 * (1 - amp));
    const w1 = blobScale * (0.35 + 0.22 * (1 - amp));
    const pinch = 0.57 + 0.17 * amp + 0.01 * Math.sin(t * 0.40 + 1.2);
    return makePetalPath3D(theta, r0, r1, w0, w1, pinch, sx, sy, sh, 0.30, 0.74);
  }, [tCV, leftTiltCV]);

  // Horizontaler Slice (fast-morphing ribbon crossing center)
  const ribbonPath = useComputedValue(() => {
    const t = tCV.current;
    const theta = deg(0) + 0.10 * Math.sin(t * 0.45);
    const r0 = ringRadius * 0.015, r1 = blobScale * (0.74 + 0.02 * Math.sin(t * 0.7));
    const w0 = blobScale * (0.10 + 0.03 * fbm1D(t * 0.9, 771, 3));
    const w1 = blobScale * (0.18 + 0.04 * fbm1D(t * 1.1, 773, 3));
    const pinch = 0.72 + 0.05 * fbm1D(t * 0.6, 775, 3);
    const bias = 0.02 * Math.sin(t * 0.9);
    const bend = 0.24 * fbm1D(t * 0.8, 777, 3);
    const phi1 = t * 3.2, phi2 = t * 5.1;  // Schneller als Blobs (3.2x, 5.1x vs max 1.6x)
    return makeWaveBlobPath3D(theta, r0, r1, w0, w1, pinch, bias, bend, phi1, phi2, 1, 1, 0.0);
  }, [tCV]);

  // Drei individuelle Slice-Paths mit unterschiedlichen Charakteristika
  const topSlicePath = useComputedValue(() => {
    const t = tCV.current;
    const theta = deg(90) + 0.08 * Math.sin(t * 0.4);
    const r0 = ringRadius * 0.015, r1 = blobScale * (0.72 + 0.03 * Math.sin(t * 0.6));
    const w0 = blobScale * (0.16 + 0.06 * fbm1D(t * 0.8, 801, 3));
    const w1 = blobScale * (0.28 + 0.06 * fbm1D(t * 1.0, 803, 3));
    const pinch = 0.74 + 0.04 * fbm1D(t * 0.5, 805, 3);     // Top: schlank, stark gepincht
    const bias = 0.0;
    const bend = 0.14 * fbm1D(t * 0.7, 807, 3);             // leicht positiv
    const phi1 = t * 0.9, phi2 = t * 1.2;
    return makeWaveBlobPath3D(theta, r0, r1, w0, w1, pinch, bias, bend, phi1, phi2, 1, 1, 0.0);
  }, [tCV]);

  const rightSlicePath = useComputedValue(() => {
    const t = tCV.current;
    const theta = deg(0) + 0.10 * Math.sin(t * 0.45);
    const r0 = ringRadius * 0.015, r1 = blobScale * (0.76 + 0.02 * Math.sin(t * 0.5));
    const w0 = blobScale * (0.20 + 0.06 * fbm1D(t * 0.9, 811, 3));
    const w1 = blobScale * (0.30 + 0.06 * fbm1D(t * 1.1, 813, 3));
    const pinch = 0.59 + 0.03 * fbm1D(t * 0.4, 815, 3);     // Rechts: flacher, breiter
    const bias = 0.035 * Math.sin(t * 0.8);                 // leicht positiv
    const bend = 0.0;
    const phi1 = t * 1.2, phi2 = t * 1.6;
    return makeWaveBlobPath3D(theta, r0, r1, w0, w1, pinch, bias, bend, phi1, phi2, 1, 1, 0.0);
  }, [tCV]);

  const leftSlicePath = useComputedValue(() => {
    const t = tCV.current;
    const theta = deg(180) + 0.12 * Math.sin(t * 0.5);
    const r0 = ringRadius * 0.015, r1 = blobScale * (0.78 + 0.04 * Math.sin(t * 0.8));
    const w0 = blobScale * (0.22 + 0.08 * fbm1D(t * 0.7, 821, 3));
    const w1 = blobScale * (0.32 + 0.08 * fbm1D(t * 0.9, 823, 3));
    const pinch = 0.62 + 0.04 * fbm1D(t * 0.6, 825, 3);     // Links: bauchiger
    const bias = 0.0;
    const bend = -0.15 * fbm1D(t * 0.6, 827, 3);            // leicht negativ
    const phi1 = t * 1.05, phi2 = t * 1.45;
    return makeWaveBlobPath3D(theta, r0, r1, w0, w1, pinch, bias, bend, phi1, phi2, 1, 1, 0.0);
  }, [tCV]);
  
  // Vorherige neutrale Blob-Farbgebung (nur Intensität) deaktiviert beibehalten:
  // false && (() => {
  //   const neutralBlobColors = (_hex: string, aCore = blobAlpha) => ([
  //     `rgba(245,250,255,${0.16 + 0.16 * ampSmooth})`,
  //     `rgba(230,240,255,${0.08 + 0.10 * ampSmooth})`,
  //     `rgba(255,255,255,${Math.max(0, aCore * 0.02)})`
  //   ]);
  //   return neutralBlobColors;
  // })();
  const colorizeOpacity = 0.88; // färbt neutrale Blobs mit Siri-Farben

  // Refraction Rims (dünne, mitrotierende Kantenbänder)
  const rimWidth = 0.012 + 0.012 * ampSmooth;
  const rimAlphaCool = 0.26 + 0.42 * ampSmooth;
  const rimAlphaWarm = 0.22 + 0.40 * ampSmooth;
  const rimRadialPositions = useMemo(() => ([
    1.0 - rimWidth * 1.25,
    1.0 - rimWidth * 0.55,
    1.0
  ]), [rimWidth]);

          return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0B1020' : '#0B1020' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        {/* Orb-Vignette/Glas-Ränder (aktiviert, zart) */}
            <Group>
          <Circle cx={centerX} cy={centerY} r={ringRadius}>
                  <RadialGradient
              c={vec(centerX, centerY)} r={ringRadius}
            colors={[
                'rgba(16,20,30,0.16)', // center: zart
                'rgba(12,16,24,0.30)',
                'rgba(8,10,16,0.00)'
              ]}
              positions={[0.00, 0.82, 1.00]}
          />
        </Circle>

          <Circle cx={centerX} cy={centerY} r={ringRadius * 1.10}>
          <RadialGradient
              c={vec(centerX, centerY)} r={ringRadius * 1.10}
            colors={[
                'rgba(8,12,20,0.14)',
                'rgba(4,6,12,0.24)'
              ]}
              positions={[0.00, 1.00]}
            />
          </Circle>
          </Group>

        {/* Nur Shader, additiv, im Kreis-Clip */}
        <Group
          clip={orbClip}
          blendMode="plus"
          opacity={1}
          transform={DEFAULT_STATE ? undefined : sceneBreathTransform}
          layer
        >
          <Fill>
            <Shader source={metaPetalFx} uniforms={uniformsCV} />
          </Fill>
        </Group>

        {/* Glas-Rand: dezente Top-Left-Aufhellung, kein rotierender Farb-Ring */}
        {DEFAULT_STATE ? (
          <Group>
            {/* zarter weißer Glint oben-links */}
            <Circle cx={centerX} cy={centerY} r={ringRadius * 1.06}>
                  <RadialGradient
                c={vec(centerX - ringRadius * 0.36, centerY - ringRadius * 0.46)}
                r={ringRadius * 1.10}
                    colors={[
                  'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.00)',
                  'rgba(255,255,255,0.00)'
                ]}
                positions={[0.0, 0.12, 1.0]}
              />
            </Circle>

            {/* feiner innerer Glanz direkt am Rand */}
            <Circle cx={centerX} cy={centerY} r={ringRadius * 0.998}>
                  <RadialGradient
                    c={vec(centerX, centerY)}
                r={ringRadius}
                    colors={[
                  'rgba(255,255,255,0.02)',
                  'rgba(255,255,255,0.10)',
                  'rgba(255,255,255,0.00)'
                ]}
                positions={[0.90, 0.97, 1.0]}
              />
            </Circle>
          </Group>
        ) : (
          <Group transform={sceneBreathTransform}>
            {/* zarter weißer Glint oben-links */}
            <Circle cx={centerX} cy={centerY} r={ringRadius * 1.06}>
                  <RadialGradient
                c={vec(centerX - ringRadius * 0.36, centerY - ringRadius * 0.46)}
                r={ringRadius * 1.10}
                    colors={[
                  'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.00)',
                  'rgba(255,255,255,0.00)'
                ]}
                positions={[0.0, 0.12, 1.0]}
              />
            </Circle>

            {/* feiner innerer Glanz direkt am Rand */}
            <Circle cx={centerX} cy={centerY} r={ringRadius * 0.998}>
                  <RadialGradient
                    c={vec(centerX, centerY)}
                r={ringRadius}
                    colors={[
                  'rgba(255,255,255,0.02)',
                  'rgba(255,255,255,0.10)',
                  'rgba(255,255,255,0.00)'
                ]}
                positions={[0.90, 0.97, 1.0]}
              />
            </Circle>
          </Group>
        )}

        {/* Fallback: Legacy Path-basierte Blobs */}
        {!metaPetalFx && (
          <Group transform={sceneBreathTransform} clip={orbClip} blendMode="screen" opacity={0.98} layer>
            <Group transform={rightXformCV} opacity={rightOpacityCV}>
              <Path path={rightPath}>
              <RadialGradient
                  c={vec(centerX, centerY)} r={blobScale * 0.96}
                  colors={['rgba(255,255,255,0.78)', LOBE.right, 'rgba(0,0,0,0)']}
                  positions={[0.00, 0.22, 0.92]}
              />
            </Path>
        </Group>
            <Group transform={leftXformCV} opacity={leftOpacityCV}>
              <Path path={leftPath}>
              <RadialGradient
                  c={vec(centerX, centerY)} r={blobScale * 0.96}
                  colors={['rgba(255,255,255,0.75)', LOBE.left, 'rgba(0,0,0,0)']}
                  positions={[0.00, 0.22, 0.92]}
              />
            </Path>
        </Group>
            <Group transform={topXformCV} opacity={topOpacityCV}>
              <Path path={topPath}>
          <RadialGradient
                  c={vec(centerX, centerY)} r={blobScale * 0.96}
                  colors={['rgba(255,255,255,0.72)', LOBE.top, 'rgba(0,0,0,0)']}
                  positions={[0.00, 0.22, 0.92]}
          />
        </Path>
                </Group>
          </Group>
        )}
      </Canvas>
    </View>
  );
}
