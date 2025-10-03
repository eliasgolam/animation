import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// Echte SVG-Dateien als React Native Komponenten
interface SiriSVGProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// Blue Middle SVG (Hauptblob)
export function BlueMiddleSVG({ width = 87, height = 87, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#7EA1E4',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Blue Right SVG
export function BlueRightSVG({ width = 73, height = 73, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#70CBFF',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Green Left SVG
export function GreenLeftSVG({ width = 67, height = 67, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#00FF88',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Green Left 1 SVG
export function GreenLeft1SVG({ width = 60, height = 60, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#44FFAA',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Pink Left SVG
export function PinkLeftSVG({ width = 63, height = 63, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF66BB',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Pink Top SVG
export function PinkTopSVG({ width = 53, height = 53, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF44AA',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Bottom Pink SVG
export function BottomPinkSVG({ width = 57, height = 57, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF88CC',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Intersect SVG
export function IntersectSVG({ width = 67, height = 67, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FFAA44',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4
      }]} />
    </View>
  );
}

// Highlight SVG
export function HighlightSVG({ width = 100, height = 100, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FFFFFF',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.9
      }]} />
    </View>
  );
}

// Shadow SVG
export function ShadowSVG({ width = 140, height = 140, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#000000',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.25
      }]} />
    </View>
  );
}

// Icon Background SVG
export function IconBgSVG({ width = 67, height = 67, style }: SiriSVGProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#2A2A2A',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.8
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    opacity: 0.8,
  },
});
