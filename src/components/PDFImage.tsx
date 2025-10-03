import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';

// PDF-Dateien als Bilder laden
interface PDFImageProps {
  filename: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// PDF-Assets aus dem assets Ordner
const pdfAssets: Record<string, any> = {
  'blue-middle.pdf': require('../../assets/blue-middle.pdf'),
  'blue-right.pdf': require('../../assets/blue-right.pdf'),
  'bottom-pink.pdf': require('../../assets/bottom-pink.pdf'),
  'green-left-1.pdf': require('../../assets/green-left-1.pdf'),
  'green-left.pdf': require('../../assets/green-left.pdf'),
  'highlight.pdf': require('../../assets/highlight.pdf'),
  'icon-bg.pdf': require('../../assets/icon-bg.pdf'),
  'Intersect.pdf': require('../../assets/Intersect.pdf'),
  'pink-left.pdf': require('../../assets/pink-left.pdf'),
  'pink-top.pdf': require('../../assets/pink-top.pdf'),
  'shadow.pdf': require('../../assets/shadow.pdf'),
};

export default function PDFImage({ 
  filename, 
  width = 100, 
  height = 100, 
  style 
}: PDFImageProps) {
  const pdfAsset = pdfAssets[filename];
  
  if (!pdfAsset) {
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

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image 
        source={pdfAsset}
        style={[styles.image, { width, height }]}
        resizeMode="contain"
      />
    </View>
  );
}

// Fallback-Farben für verschiedene PDF-Dateien
function getFallbackColor(filename: string): string {
  const colorMap: Record<string, string> = {
    'blue-middle.pdf': '#7EA1E4',
    'blue-right.pdf': '#70CBFF',
    'pink-top.pdf': '#FF44AA',
    'pink-left.pdf': '#FF66BB',
    'green-left.pdf': '#00FF88',
    'green-left-1.pdf': '#44FFAA',
    'bottom-pink.pdf': '#FF88CC',
    'highlight.pdf': '#FFFFFF',
    'shadow.pdf': '#000000',
    'icon-bg.pdf': '#2A2A2A',
    'Intersect.pdf': '#FFAA44'
  };
  return colorMap[filename] || '#666666';
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    opacity: 0.8,
  },
  fallbackCircle: {
    borderRadius: 50,
    opacity: 0.8,
  },
});
