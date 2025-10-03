import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';

// Siri Assets als Bilder laden
interface SiriImageProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// Blue Middle Image (Hauptblob) - Echte Siri-Farben
export function BlueMiddleImage({ width = 87, height = 87, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#7EA1E4', // Echte Siri-Farbe
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        // Siri-typische Form: leicht oval
        transform: [{ scaleX: 1.1 }, { scaleY: 0.9 }]
      }]} />
    </View>
  );
}

// Blue Right Image
export function BlueRightImage({ width = 73, height = 73, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#70CBFF',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.2 }, { scaleY: 0.8 }]
      }]} />
    </View>
  );
}

// Green Left Image
export function GreenLeftImage({ width = 67, height = 67, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#00FF88',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.1 }, { scaleY: 0.9 }]
      }]} />
    </View>
  );
}

// Green Left 1 Image
export function GreenLeft1Image({ width = 60, height = 60, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#44FFAA',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.3 }, { scaleY: 0.7 }]
      }]} />
    </View>
  );
}

// Pink Left Image
export function PinkLeftImage({ width = 63, height = 63, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF66BB',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.2 }, { scaleY: 0.8 }]
      }]} />
    </View>
  );
}

// Pink Top Image
export function PinkTopImage({ width = 53, height = 53, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF44AA',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.1 }, { scaleY: 0.9 }]
      }]} />
    </View>
  );
}

// Bottom Pink Image
export function BottomPinkImage({ width = 57, height = 57, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FF88CC',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.2 }, { scaleY: 0.8 }]
      }]} />
    </View>
  );
}

// Intersect Image
export function IntersectImage({ width = 67, height = 67, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FFAA44',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        transform: [{ scaleX: 1.1 }, { scaleY: 0.9 }]
      }]} />
    </View>
  );
}

// Highlight Image
export function HighlightImage({ width = 100, height = 100, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#FFFFFF',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.9,
        transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }]
      }]} />
    </View>
  );
}

// Shadow Image
export function ShadowImage({ width = 140, height = 140, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#000000',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.25,
        transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }]
      }]} />
    </View>
  );
}

// Icon Background Image
export function IconBgImage({ width = 67, height = 67, style }: SiriImageProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.blob, { 
        backgroundColor: '#2A2A2A',
        width: width * 0.8,
        height: height * 0.8,
        borderRadius: width * 0.4,
        opacity: 0.8,
        transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }]
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
