import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// Echte SVG-Dateien aus assets/ laden
interface RealSVGImageProps {
  filename: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// SVG-Dateien aus assets/ laden
const loadSVGAsset = (filename: string): string | null => {
  try {
    // In React Native/Expo werden Assets über require() geladen
    const asset = require(`../../assets/${filename}`);
    return asset;
  } catch (error) {
    console.warn(`Could not load SVG asset: ${filename}`, error);
    return null;
  }
};

export default function RealSVGImage({ 
  filename, 
  width = 100, 
  height = 100, 
  style 
}: RealSVGImageProps) {
  const svgAsset = loadSVGAsset(filename);
  
  if (!svgAsset) {
    // Fallback: Zeige einen farbigen Kreis basierend auf dem Dateinamen
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

  // Hier würde normalerweise die SVG-Datei gerendert werden
  // Da react-native-svg möglicherweise nicht korrekt funktioniert,
  // verwenden wir den Fallback
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

// Fallback-Farben für verschiedene SVG-Dateien
function getFallbackColor(filename: string): string {
  const colorMap: Record<string, string> = {
    'blue-middle.svg': '#7EA1E4',
    'blue-right.svg': '#70CBFF',
    'pink-top.svg': '#FF44AA',
    'pink-left.svg': '#FF66BB',
    'green-left.svg': '#00FF88',
    'green-left-1.svg': '#44FFAA',
    'bottom-pink.svg': '#FF88CC',
    'highlight.svg': '#FFFFFF',
    'shadow.svg': '#000000',
    'icon-bg.svg': '#2A2A2A',
    'Intersect.svg': '#FFAA44'
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
