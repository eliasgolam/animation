import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Group, Circle, RadialGradient, useClockValue, useComputedValue, vec } from '@shopify/react-native-skia';
import SVGImage from './SVGImage';
import { useMicAmplitude } from '../../hooks/useMicAmplitude';

interface SiriAnimationViewProps {
  isAnimating?: boolean;
  showIndividualBlobs?: boolean;
}

export default function SiriAnimationView({ 
  isAnimating = true, 
  showIndividualBlobs = false 
}: SiriAnimationViewProps) {
  const { width, height } = Dimensions.get('window');
  const centerX = width / 2;
  const centerY = height / 2;
  
  const clock = useClockValue();
  const audioLevel = useMicAmplitude(); // Audio-Reaktivität
  
  // Animation für alle Blobs mit individuellen Rotationen und Pulsierungen
  const animation = useComputedValue(() => {
    if (!isAnimating) return { 
      scale: 1, 
      blueMiddleRotation: 0,
      blueRightRotation: 0,
      greenLeftRotation: 0,
      pinkLeftRotation: 0,
      // Pulsierende Scale-Animationen (0.95 - 1.05)
      shadowPulse: 1,
      iconBgPulse: 1,
      blueMiddlePulse: 1,
      blueRightPulse: 1,
      pinkTopPulse: 1,
      pinkLeftPulse: 1,
      greenLeftPulse: 1,
      greenLeft1Pulse: 1,
      bottomPinkPulse: 1,
      intersectPulse: 1,
      highlightPulse: 1
    };
    
    const t = clock.current / 1000;
    return {
      scale: 1 + 0.1 * Math.sin(t * 0.5),
      // Blue Middle & Blue Right: 12s im Uhrzeigersinn
      blueMiddleRotation: (t / 12) * 360,
      blueRightRotation: (t / 12) * 360,
      // Green Left & Pink Left: 14s gegen Uhrzeigersinn
      greenLeftRotation: -(t / 14) * 360,
      pinkLeftRotation: -(t / 14) * 360,
      // Audio-reaktive Pulsierung (Siri-Wave-Animation)
      shadowPulse: 0.95 + 0.05 * (1.0 + audioLevel), // Audio-reaktiv
      iconBgPulse: 0.95 + 0.04 * (1.0 + audioLevel), // Audio-reaktiv
      blueMiddlePulse: 0.95 + 0.1 * (1.0 + audioLevel), // Audio-reaktiv
      blueRightPulse: 0.95 + 0.08 * (1.0 + audioLevel), // Audio-reaktiv
      pinkTopPulse: 0.95 + 0.06 * (1.0 + audioLevel), // Audio-reaktiv
      pinkLeftPulse: 0.95 + 0.07 * (1.0 + audioLevel), // Audio-reaktiv
      greenLeftPulse: 0.95 + 0.09 * (1.0 + audioLevel), // Audio-reaktiv
      greenLeft1Pulse: 0.95 + 0.05 * (1.0 + audioLevel), // Audio-reaktiv
      bottomPinkPulse: 0.95 + 0.06 * (1.0 + audioLevel), // Audio-reaktiv
      intersectPulse: 0.95 + 0.08 * (1.0 + audioLevel), // Audio-reaktiv
      highlightPulse: 0.95 + 0.1 * (1.0 + audioLevel), // Audio-reaktiv
      // Hintergrund-Effekt Pulsierung
      backgroundPulse: 1.0 + 0.1 * Math.sin(t * (2 * Math.PI / 4)) // 4s
    };
  }, [clock, isAnimating, audioLevel]);

  // Alle Siri Assets in der richtigen Reihenfolge (von unten nach oben)
  const siriAssets = [
    { filename: 'shadow.svg', opacity: 0.6, scale: 1.05, rotation: 0, pulse: 'shadowPulse' },
    { filename: 'icon-bg.svg', opacity: 0.8, scale: 1.02, rotation: 0, pulse: 'iconBgPulse' },
    { filename: 'blue-middle.svg', opacity: 0.9, scale: 1.1, rotation: 'blueMiddleRotation', pulse: 'blueMiddlePulse' },
    { filename: 'blue-right.svg', opacity: 0.8, scale: 1.08, rotation: 'blueRightRotation', pulse: 'blueRightPulse' },
    { filename: 'pink-top.svg', opacity: 0.85, scale: 1.06, rotation: 0, pulse: 'pinkTopPulse' },
    { filename: 'pink-left.svg', opacity: 0.8, scale: 1.04, rotation: 'pinkLeftRotation', pulse: 'pinkLeftPulse' },
    { filename: 'green-left.svg', opacity: 0.75, scale: 1.07, rotation: 'greenLeftRotation', pulse: 'greenLeftPulse' },
    { filename: 'green-left-1.svg', opacity: 0.7, scale: 1.03, rotation: 0, pulse: 'greenLeft1Pulse' },
    { filename: 'bottom-pink.svg', opacity: 0.8, scale: 1.05, rotation: 0, pulse: 'bottomPinkPulse' },
    { filename: 'Intersect.svg', opacity: 0.9, scale: 1.12, rotation: 0, pulse: 'intersectPulse' },
    { filename: 'highlight.svg', opacity: 1.0, scale: 1.15, rotation: 0, pulse: 'highlightPulse' }
  ];

  if (showIndividualBlobs) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {siriAssets.map((asset, index) => (
            <View key={index} style={styles.assetItem}>
              <SVGImage 
                filename={asset.filename} 
                width={80} 
                height={80} 
                style={{ opacity: asset.opacity }}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Group>
          {/* Hintergrund-Effekt - Großer RadialGradient */}
          <Circle cx={centerX} cy={centerY} r={200 * animation.current.backgroundPulse} opacity={0.3}>
            <RadialGradient
              c={vec(centerX, centerY)}
              r={200 * animation.current.backgroundPulse}
              colors={[
                '#00E5FF', // Cyan
                '#FF0080'  // Magenta
              ]}
              positions={[0, 1]}
            />
          </Circle>
          
          {/* ZStack mit allen Siri Blobs */}
          {siriAssets.map((asset, index) => {
            // Bestimme die Rotation basierend auf dem Asset
            let rotation = 0;
            if (typeof asset.rotation === 'string') {
              rotation = animation.current[asset.rotation as keyof typeof animation.current] as number;
            } else {
              rotation = asset.rotation;
            }
            
            // Bestimme die Pulsierung basierend auf dem Asset
            let pulse = 1;
            if (typeof asset.pulse === 'string') {
              pulse = animation.current[asset.pulse as keyof typeof animation.current] as number;
            } else {
              pulse = asset.pulse || 1;
            }
            
            return (
              <Group
                key={index}
                transform={[
                  { translateX: centerX - 100 }, // 200x200 centered
                  { translateY: centerY - 100 },
                  { scaleX: asset.scale * animation.current.scale * pulse },
                  { scaleY: asset.scale * animation.current.scale * pulse },
                  { rotate: rotation },
                  { translateX: -(centerX - 100) },
                  { translateY: -(centerY - 100) }
                ]}
              >
                <SVGImage 
                  filename={asset.filename} 
                  width={200} 
                  height={200} 
                  style={{ opacity: asset.opacity }}
                />
              </Group>
            );
          })}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvas: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  assetItem: {
    margin: 10,
    alignItems: 'center',
  },
});

// Vereinfachte SiriAnimationView ohne Kontrollen
export function SiriAnimationViewWithControls() {
  return (
    <View style={styles.container}>
      <SiriAnimationView 
        isAnimating={true} 
        showIndividualBlobs={false} 
      />
    </View>
  );
}
