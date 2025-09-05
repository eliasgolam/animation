/**
 * Catmull-Rom Spline implementation for smooth blob paths
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface SplineConfig {
  tension: number;
  numSegments: number;
  closed: boolean;
}

/**
 * Catmull-Rom spline interpolation
 */
export const catmullRomSpline = (
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number,
  tension: number = 0.5
): Point2D => {
  const t2 = t * t;
  const t3 = t2 * t;
  
  // Catmull-Rom matrix coefficients
  const c0 = -tension * t3 + 2 * tension * t2 - tension * t;
  const c1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
  const c2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
  const c3 = tension * t3 - tension * t2;
  
  return {
    x: c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x,
    y: c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y
  };
};

/**
 * Create smooth path from control points using Catmull-Rom splines
 */
export const createSmoothPath = (
  points: Point2D[],
  config: SplineConfig = {
    tension: 0.5,
    numSegments: 10,
    closed: true
  }
): Point2D[] => {
  if (points.length < 2) return points;
  
  const result: Point2D[] = [];
  const numPoints = points.length;
  
  for (let i = 0; i < numPoints; i++) {
    const p0 = points[(i - 1 + numPoints) % numPoints];
    const p1 = points[i];
    const p2 = points[(i + 1) % numPoints];
    const p3 = points[(i + 2) % numPoints];
    
    // Add segments between control points
    for (let j = 0; j < config.numSegments; j++) {
      const t = j / config.numSegments;
      const interpolatedPoint = catmullRomSpline(p0, p1, p2, p3, t, config.tension);
      result.push(interpolatedPoint);
    }
  }
  
  // Close the path if requested
  if (config.closed && result.length > 0) {
    result.push(result[0]);
  }
  
  return result;
};

/**
 * Convert points array to Skia path commands
 */
export const pointsToSkiaPath = (points: Point2D[]): string => {
  if (points.length === 0) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return path;
};

/**
 * Generate blob control points with deformation
 */
export const generateBlobControlPoints = (
  centerX: number,
  centerY: number,
  baseRadius: number,
  time: number,
  phases: [number, number, number],
  frequencies: [number, number, number],
  amplitudes: [number, number, number],
  speeds: [number, number, number],
  perlinSeed: number,
  breathingFreq: number,
  breathingAmp: number,
  breathingPhase: number,
  amplitudeFactor: number = 0
): Point2D[] => {
  const points: Point2D[] = [];
  const numPoints = 16; // Control points for smooth blob
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // Wave deformations
    const [phase1, phase2, phase3] = phases;
    const [freq1, freq2, freq3] = frequencies;
    const [amp1, amp2, amp3] = amplitudes;
    const [speed1, speed2, speed3] = speeds;
    
    const wave1 = Math.sin(angle * freq1 + phase1 + time * speed1) * (amp1 * baseRadius);
    const wave2 = Math.sin(angle * freq2 + phase2 + time * speed2) * (amp2 * baseRadius);
    const wave3 = Math.sin(angle * freq3 + phase3 + time * speed3) * (amp3 * baseRadius);
    
    // Shimmer effect
    const shimmer = Math.sin(angle * 8 + time * 2) * baseRadius * 0.008;
    
    // Breathing animation
    const breathingTime = time * breathingFreq + breathingPhase;
    const breathingProgress = (Math.sin(breathingTime) + 1) / 2;
    const breathingScale = 1 + breathingProgress * breathingAmp + amplitudeFactor * 0.02;
    
    // Lobe shaping
    const lobe = Math.sin(angle * 3 + time * 0.5) * baseRadius * 0.08;
    
    const radius = baseRadius + wave1 + wave2 + wave3 + shimmer + lobe;
    const finalRadius = radius * breathingScale;
    
    const x = centerX + Math.cos(angle) * finalRadius;
    const y = centerY + Math.sin(angle) * finalRadius;
    
    points.push({ x, y });
  }
  
  return points;
};

/**
 * Creates a closed Catmull-Rom spline path from control points
 * @param points - Array of control points with x,y coordinates
 * @param tension - Tension parameter for the spline (0.0 to 1.0)
 * @param skia - Skia import object
 * @returns A closed, smooth Skia path without kinks at transitions
 */
export function createClosedCatmullRomPath(
  points: { x: number; y: number; }[], 
  tension: number, 
  skia: typeof import('@shopify/react-native-skia')
): import('@shopify/react-native-skia').SkPath {
  if (points.length < 3) {
    return skia.Path.Make();
  }

  const path = skia.Path.Make();
  
  // Catmull-Rom spline interpolation
  const catmullRom = (p0: { x: number; y: number; }, p1: { x: number; y: number; }, p2: { x: number; y: number; }, p3: { x: number; y: number; }, t: number): { x: number; y: number; } => {
    const t2 = t * t;
    const t3 = t2 * t;
    
    // Catmull-Rom matrix coefficients
    const c0 = -tension * t3 + 2 * tension * t2 - tension * t;
    const c1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
    const c2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
    const c3 = tension * t3 - tension * t2;
    
    return {
      x: c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x,
      y: c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y
    };
  };

  const numPoints = points.length;
  const segments = 10; // Number of segments between each control point
  
  // Start at the first point
  path.moveTo(points[0].x, points[0].y);
  
  // Generate smooth curve through all points
  for (let i = 0; i < numPoints; i++) {
    const p0 = points[(i - 1 + numPoints) % numPoints];
    const p1 = points[i];
    const p2 = points[(i + 1) % numPoints];
    const p3 = points[(i + 2) % numPoints];
    
    // Generate segments between control points
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const interpolatedPoint = catmullRom(p0, p1, p2, p3, t);
      path.lineTo(interpolatedPoint.x, interpolatedPoint.y);
    }
  }
  
  // Close the path
  path.close();
  
  return path;
}
