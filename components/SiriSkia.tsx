import React, { useEffect, useRef } from 'react';
import { View, Dimensions, Animated } from 'react-native';

interface SiriSkiaProps {
  amplitude: number;
}

export default function SiriSkia({ amplitude }: SiriSkiaProps) {
  const animationValue = useRef(new Animated.Value(0)).current;
  const amplitudeRef = useRef(amplitude);

  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  }, [animationValue]);

  const createWaveCircles = () => {
    const circles = [];
    for (let i = 0; i < 8; i++) {
      const radius = 60 + i * 20 + (amplitudeRef.current / 10);
      const opacity = 0.6 - i * 0.07;
      
      circles.push(
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderWidth: 2,
            borderColor: `rgba(0, 150, 255, ${0.8 - i * 0.1})`,
            opacity: opacity,
            left: '50%',
            top: '50%',
            marginLeft: -radius,
            marginTop: -radius,
            transform: [{
              scale: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2 + (amplitudeRef.current / 100)]
              })
            }]
          }}
        />
      );
    }
    return circles;
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#1a1a2e',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Wave circles */}
      {createWaveCircles()}
      
      {/* Center pulse */}
      <Animated.View
        style={{
          width: 40 + (amplitudeRef.current / 5),
          height: 40 + (amplitudeRef.current / 5),
          borderRadius: 20 + (amplitudeRef.current / 10),
          backgroundColor: '#00ffff',
          opacity: 0.8,
          transform: [{
            scale: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1 + (amplitudeRef.current / 200)]
            })
          }],
          shadowColor: '#00ffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 10
        }}
      />
    </View>
  );
} 