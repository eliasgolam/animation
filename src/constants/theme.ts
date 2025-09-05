export interface SiriColors {
  siriBlue: string;
  siriLightBlue: string;
  siriCyan: string;
  siriDeepBlue: string;
  backgroundDark: string;
  white: string;
  transparent: string;
}

export interface AnimationConfig {
  mainCircleRadius: number;
  blobBaseRadius: number;
  breathingSpeed: number;
  breathingAmplitude: number;
  amplitudeScaling: number;
  sphereRadiusFactor: number;
  maxBlobRadius: number;
  minInteractionDist: number;
  maxInteractionDist: number;
  numPoints: number;
  catmullTension: number;
  depthScaleRange: {
    min: number;
    max: number;
  };
  depthOpacityRange: {
    min: number;
    max: number;
  };
}

export interface BlobConfig {
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

export const SIRI_COLORS = {
  // Core Siri colors - bright blue/white core
  siriBlue: '#007AFF',
  siriLightBlue: '#5AC8FA',
  siriCyan: '#00D4FF',
  siriDeepBlue: '#0A84FF',
  
  // Additional Siri-like colors for more organic gradients
  siriAqua: '#00E5FF',
  siriLavender: '#8E8E93',
  siriPurple: '#AF52DE',
  siriIndigo: '#5856D6',
  siriTeal: '#5AC8FA',
  siriElectricBlue: '#007AFF',
  siriSoftBlue: '#64D2FF',
  siriGlowBlue: '#00B4FF',
  
  // Background and utility colors
  backgroundDark: '#0a001a',
  white: '#FFFFFF',
  transparent: 'transparent'
} as const;

export const SIRI_PALETTE = {
  white: 'rgba(255,255,255,1)',
  cyan: 'rgba(0,229,255,1)',
  lightCyan: 'rgba(100,210,255,1)',
  lavender: 'rgba(175,82,222,1)'
} as const;

export const SIRI_GRADIENT_POSITIONS = {
  // Main circle - organic blue-lavender gradient
  main: [0, 0.15, 0.28, 0.45, 0.65, 0.82, 1.0],
  
  // Blob core - bright center with soft edges
  blobCore: [0.0, 0.08, 0.22, 0.45, 0.72, 1.0],
  
  // Glow - soft outer glow
  glow: [0, 0.35, 0.65, 0.85, 1.0],
  
  // Additional organic gradients
  softGlow: [0, 0.25, 0.55, 0.8, 1.0],
  innerCore: [0, 0.12, 0.35, 0.68, 1.0],
  outerHalo: [0, 0.4, 0.7, 0.9, 1.0]
} as const;

export const defaultBackground = (isDark: boolean): string => 
  isDark ? SIRI_COLORS.backgroundDark : SIRI_COLORS.white;

export const ANIMATION_CONFIG = {
  mainCircleRadiusFactor: 0.35, // Increased from 0.25 for larger main circle
  sphereRadiusFactor: 0.22, // Increased from 0.15 for larger sphere
  numPoints: 120, // Reduced from 160 for better performance
  catmullTension: 0.65, // Increased from 0.16 to minimize overshoot and eliminate jagged edges
  breathingSpeed: 0.25,
  breathingAmplitude: 0.01,
  amplitudeScaling: 0.02,
  maxBlobRadiusFactor: 0.65, // Increased from 0.58 for larger blobs
  minInteractionDist: 0.12,
  maxInteractionDist: 0.25,
  depthScaleRange: { min: 0.7, max: 3.2 },
  depthOpacityRange: { min: 0.6, max: 1.0 }
} as const;

export const BLOB_CONFIGS = [
  { colorKey: 'siriBlue', size: 1.55, phases: [0.0, 2.8, 5.6], frequencies: [1.8, 3.2, 5.8], amplitudes: [0.18, 0.12, 0.07], speeds: [0.5, 0.9, 1.3], rotationSpeed: 0.18, breathingFreq: 0.75, breathingAmp: 0.025, seed: 0.15 },
  { colorKey: 'siriCyan', size: 1.15, phases: [1.4, 3.9, 6.4], frequencies: [2.4, 4.1, 7.2], amplitudes: [0.16, 0.11, 0.06], speeds: [0.8, 1.2, 1.6], rotationSpeed: 0.22, breathingFreq: 1.15, breathingAmp: 0.035, seed: 0.67 },
  { colorKey: 'siriLightBlue', size: 1.65, phases: [2.8, 5.2, 7.6], frequencies: [1.6, 2.8, 5.4], amplitudes: [0.14, 0.09, 0.05], speeds: [0.6, 1.0, 1.4], rotationSpeed: 0.20, breathingFreq: 0.95, breathingAmp: 0.018, seed: 0.42 },
  { colorKey: 'siriDeepBlue', size: 1.05, phases: [4.2, 6.8, 9.4], frequencies: [2.8, 4.8, 8.2], amplitudes: [0.12, 0.08, 0.04], speeds: [0.9, 1.3, 1.7], rotationSpeed: 0.21, breathingFreq: 1.25, breathingAmp: 0.042, seed: 0.89 },
  { colorKey: 'siriAqua', size: 1.35, phases: [0.7, 3.2, 5.8], frequencies: [2.0, 3.5, 6.0], amplitudes: [0.15, 0.10, 0.06], speeds: [0.7, 1.1, 1.5], rotationSpeed: 0.19, breathingFreq: 1.05, breathingAmp: 0.030, seed: 0.33 }
];
