import React from 'react';
import { View, Dimensions } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

export default function TestSkia() {
  const { width, height } = Dimensions.get('window');
  const centerX = width / 2;
  const centerY = height / 2;

  console.log('TestSkia: Rendering with dimensions:', { width, height, centerX, centerY });

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        <Circle
          cx={centerX}
          cy={centerY}
          r={100}
          color="rgba(255, 0, 0, 1.0)"
        />
        <Circle
          cx={centerX - 150}
          cy={centerY}
          r={50}
          color="rgba(0, 255, 0, 1.0)"
        />
        <Circle
          cx={centerX + 150}
          cy={centerY}
          r={50}
          color="rgba(0, 0, 255, 1.0)"
        />
      </Canvas>
    </View>
  );
}

