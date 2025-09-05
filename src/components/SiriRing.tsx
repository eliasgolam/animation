import React, { useState, useEffect, useRef } from 'react';
import { Circle, SweepGradient, vec } from '@shopify/react-native-skia';

// Pure Skia component - NO React Native Views!

export type SiriRingProps = {
  centerX: number;
  centerY: number; 
  radius: number;
  speed?: number;
  amplitude?: number;
};

export default function SiriRing({ centerX, centerY, radius, speed = 1, amplitude = 0 }: SiriRingProps) {
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRotation = (elapsed * speed * 60) % 360; // 60 degrees per second
      setRotation(newRotation);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [speed]);

  return (
    <Circle cx={centerX} cy={centerY} r={radius}>
      <SweepGradient
        c={vec(centerX, centerY)}
        start={rotation}
        colors={[
          '#38E1FF', // cyanA
          '#61E0FF', // cyanB  
          '#7A4DFF', // violet
          '#FF4FD8', // magenta
          '#FF8A4C', // peach
          '#38E1FF'  // back to cyanA
        ]}
        positions={[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]}
      />
    </Circle>
  );
}
