// src/constants/theme.ts
export const ANIMATION_CONFIG = {
  amplitudeScaling: 0.35,
  sphereRadiusFactor: 1.0,
};

export type BlobConfig = {
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
};

export const BLOB_CONFIGS: BlobConfig[] = [
  {
    colorKey: 'siriBlue',
    size: 1,
    phases: [0, 0, 0],
    frequencies: [1.2, 1.8, 2.3],
    amplitudes: [0.003, 0.002, 0.0015],
    speeds: [0.4, 0.55, 0.75],
    rotationSpeed: 0.4,
    breathingFreq: 0.6,
    breathingAmp: 0.02,
    seed: 0.1,
  },
];

export const SIRI_COLORS = {
  siriBlue: '#12CCFF',
};

export const defaultBackground = (isDark: boolean) =>
  (isDark ? '#0B1020' : '#F4F7FB');