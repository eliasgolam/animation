import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';

interface AudioVisualizerProps {
  audioLevels: number[]; // Array of frequency levels (0-1)
  isActive: boolean;
  isDarkMode?: boolean;
}

export default function AudioVisualizer({ audioLevels, isActive, isDarkMode = true }: AudioVisualizerProps) {
  const [currentTime, setCurrentTime] = useState(0);

  // Update time for animation
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  // Generate audio bars
  const createAudioBars = () => {
    const bars = [];
    const numBars = audioLevels.length || 20;
    const barWidth = 300 / numBars;
    const maxHeight = 100;

    for (let i = 0; i < numBars; i++) {
      const level = audioLevels[i] || Math.random() * 0.5;
      const height = level * maxHeight;
      const x = i * barWidth;
      const y = 150 - height / 2;

      // Create bar path
      const path = Skia.Path.Make();
      path.addRect({ x, y, width: barWidth - 2, height });

      // Static colors to avoid gradient array mismatch
      const colors = isDarkMode 
        ? [
            'rgba(0, 255, 255, 0.5)',
            'rgba(68, 170, 255, 0.4)',
            'rgba(170, 68, 255, 0.3)',
          ]
        : [
            'rgba(33, 150, 243, 0.5)',
            'rgba(156, 39, 176, 0.4)',
            'rgba(255, 87, 34, 0.3)',
          ];

      bars.push(
        <Path key={`bar-${i}`} path={path}>
          <RadialGradient
            c={vec(x + barWidth / 2, y + height / 2)}
            r={height / 2}
            colors={colors}
            positions={[0.0, 0.5, 1.0]}
          />
        </Path>
      );
    }

    return bars;
  };

  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        {createAudioBars()}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: 300,
    height: 150,
  },
});
