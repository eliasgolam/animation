import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// Fallback für react-native-svg falls nicht verfügbar
let Svg, Path, Circle, Rect, G, Defs, LinearGradient, Stop;

try {
  const svgModule = require('react-native-svg');
  Svg = svgModule.default || svgModule.Svg;
  Path = svgModule.Path;
  Circle = svgModule.Circle;
  Rect = svgModule.Rect;
  G = svgModule.G;
  Defs = svgModule.Defs;
  LinearGradient = svgModule.LinearGradient;
  Stop = svgModule.Stop;
} catch (error) {
  console.warn('react-native-svg not available, using fallback');
}

interface SVGImageProps {
  filename: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// SVG-Daten für verschiedene Dateien - jetzt mit allen Siri Assets
const svgData: Record<string, string> = {
  'blue-middle.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0066ff" />
          <stop offset="50%" stop-color="#0088ff" />
          <stop offset="100%" stop-color="#00aaff" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#blueGradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="25" fill="#ffffff" opacity="0.3" />
    </svg>
  `,
  'blue-right.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueRightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0066ff" />
          <stop offset="50%" stop-color="#0088ff" />
          <stop offset="100%" stop-color="#00aaff" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="35" fill="url(#blueRightGradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.3" />
    </svg>
  `,
  'bottom-pink.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomPinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff44aa" />
          <stop offset="50%" stop-color="#ff66bb" />
          <stop offset="100%" stop-color="#ff88cc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="30" fill="url(#bottomPinkGradient)" opacity="0.7" />
      <circle cx="50" cy="50" r="15" fill="#ffffff" opacity="0.4" />
    </svg>
  `,
  'green-left.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00ff88" />
          <stop offset="50%" stop-color="#44ffaa" />
          <stop offset="100%" stop-color="#88ffcc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="30" fill="url(#greenGradient)" opacity="0.7" />
      <circle cx="50" cy="50" r="15" fill="#ffffff" opacity="0.5" />
    </svg>
  `,
  'green-left-1.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="greenLeft1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00ff88" />
          <stop offset="50%" stop-color="#44ffaa" />
          <stop offset="100%" stop-color="#88ffcc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="32" fill="url(#greenLeft1Gradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="18" fill="#ffffff" opacity="0.4" />
    </svg>
  `,
  'highlight.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.9" />
      <circle cx="50" cy="50" r="10" fill="#ffffff" opacity="1.0" />
    </svg>
  `,
  'icon-bg.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="iconBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a2a2a" />
          <stop offset="50%" stop-color="#1a1a1a" />
          <stop offset="100%" stop-color="#0a0a0a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#iconBgGradient)" opacity="0.8" />
    </svg>
  `,
  'Intersect.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="intersectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffaa44" />
          <stop offset="50%" stop-color="#ffbb55" />
          <stop offset="100%" stop-color="#ffcc66" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="25" fill="url(#intersectGradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="12" fill="#ffffff" opacity="0.6" />
    </svg>
  `,
  'pink-left.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pinkLeftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff44aa" />
          <stop offset="50%" stop-color="#ff66bb" />
          <stop offset="100%" stop-color="#ff88cc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="35" fill="url(#pinkLeftGradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.4" />
    </svg>
  `,
  'pink-top.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff44aa" />
          <stop offset="50%" stop-color="#ff66bb" />
          <stop offset="100%" stop-color="#ff88cc" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="35" fill="url(#pinkGradient)" opacity="0.8" />
      <circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.4" />
    </svg>
  `,
  'shadow.svg': `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadowGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.0" />
          <stop offset="70%" stop-color="#000000" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#shadowGradient)" />
    </svg>
  `
};

// SVG-Parser für einfache SVG-Dateien
const parseSVG = (svgString: string) => {
  // Vereinfachter Parser - in der Praxis würde man eine richtige SVG-Bibliothek verwenden
  const circleMatch = svgString.match(/<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"[^>]*fill="([^"]*)"[^>]*opacity="([^"]*)"[^>]*\/>/g);
  const gradientMatch = svgString.match(/<linearGradient[^>]*id="([^"]*)"[^>]*>/g);
  
  return {
    circles: circleMatch || [],
    gradients: gradientMatch || []
  };
};

export default function SVGImage({ 
  filename, 
  width = 100, 
  height = 100, 
  style 
}: SVGImageProps) {
  const svgContent = svgData[filename];
  
  if (!svgContent) {
    console.warn(`SVG file "${filename}" not found`);
    return null;
  }

  // Fallback wenn react-native-svg nicht verfügbar ist
  if (!Svg) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={[styles.fallbackCircle, { 
          width: width * 0.8, 
          height: height * 0.8,
          backgroundColor: getFallbackColor(filename)
        }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0066ff" />
            <Stop offset="50%" stopColor="#0088ff" />
            <Stop offset="100%" stopColor="#00aaff" />
          </LinearGradient>
          <LinearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ff44aa" />
            <Stop offset="50%" stopColor="#ff66bb" />
            <Stop offset="100%" stopColor="#ff88cc" />
          </LinearGradient>
          <LinearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00ff88" />
            <Stop offset="50%" stopColor="#44ffaa" />
            <Stop offset="100%" stopColor="#88ffcc" />
          </LinearGradient>
        </Defs>
        
        {filename === 'blue-middle.svg' && (
          <>
            <Circle cx="50" cy="50" r="40" fill="url(#blueGradient)" opacity="0.8" />
            <Circle cx="50" cy="50" r="25" fill="#ffffff" opacity="0.3" />
          </>
        )}
        
        {filename === 'pink-top.svg' && (
          <>
            <Circle cx="50" cy="50" r="35" fill="url(#pinkGradient)" opacity="0.8" />
            <Circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.4" />
          </>
        )}
        
        {filename === 'green-left.svg' && (
          <>
            <Circle cx="50" cy="50" r="30" fill="url(#greenGradient)" opacity="0.7" />
            <Circle cx="50" cy="50" r="15" fill="#ffffff" opacity="0.5" />
          </>
        )}
        
        {filename === 'highlight.svg' && (
          <>
            <Circle cx="50" cy="50" r="20" fill="#ffffff" opacity="0.9" />
            <Circle cx="50" cy="50" r="10" fill="#ffffff" opacity="1.0" />
          </>
        )}
      </Svg>
    </View>
  );
}

// Fallback-Farben für verschiedene SVG-Dateien
function getFallbackColor(filename: string): string {
  const colorMap: Record<string, string> = {
    'blue-middle.svg': '#0066ff',
    'blue-right.svg': '#0088ff',
    'pink-top.svg': '#ff44aa',
    'pink-left.svg': '#ff66bb',
    'green-left.svg': '#00ff88',
    'green-left-1.svg': '#44ffaa',
    'bottom-pink.svg': '#ff88cc',
    'highlight.svg': '#ffffff',
    'shadow.svg': '#000000',
    'icon-bg.svg': '#2a2a2a',
    'Intersect.svg': '#ffaa44'
  };
  return colorMap[filename] || '#666666';
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackCircle: {
    borderRadius: 50,
    opacity: 0.8,
  },
});
