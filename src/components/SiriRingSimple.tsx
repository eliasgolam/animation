import React from 'react';
import { Circle, RadialGradient, vec } from '@shopify/react-native-skia';

// Ultra-simple fallback version - Pure Skia

export type SiriRingSimpleProps = {
  centerX: number;
  centerY: number;
  radius: number;
  amplitude?: number;
};

export default function SiriRingSimple({ centerX, centerY, radius, amplitude = 0 }: SiriRingSimpleProps) {
  // Simple pulsing effect based on amplitude
  const opacity = 0.6 + amplitude * 0.3;
  
  return (
    <Circle cx={centerX} cy={centerY} r={radius}>
      <RadialGradient
        c={vec(centerX, centerY)}
        r={radius}
        colors={[
          'rgba(56, 225, 255, 0.6)', // #38E1FF with static opacity
          'rgba(122, 77, 255, 0.48)', // #7A4DFF
          'rgba(255, 79, 216, 0.36)', // #FF4FD8
          'rgba(0, 0, 0, 0)' // transparent edge
        ]}
        positions={[0.0, 0.4, 0.7, 1.0]}
      />
    </Circle>
  );
}
