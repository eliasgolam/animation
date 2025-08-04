import React, { useEffect, useRef } from "react";
import { View, Dimensions, Animated } from "react-native";

const { width, height } = Dimensions.get("window");
const centerX = width / 2;
const centerY = height / 2;

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
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, [animationValue]);

  // Create Siri-like curves using SVG paths
  const createSiriCurves = () => {
    const curves = [];
    const colors = [
      "rgba(147, 51, 234, 0.8)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(245, 158, 11, 0.8)",
      "rgba(239, 68, 68, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(34, 197, 94, 0.8)",
    ];

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const amplitudeFactor = amplitudeRef.current / 100;
      const baseRadius = 100 + amplitudeFactor * 50;
      
      curves.push(
        <Animated.View
          key={`curve-${i}`}
          style={{
            position: 'absolute',
            width: 240,
            height: 60,
            left: centerX - 120,
            top: centerY - 30,
            transform: [{
              rotate: `${(angle * 180) / Math.PI}deg`
            }, {
              scale: animationValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2 + amplitudeFactor * 0.3, 1]
              })
            }],
            opacity: 0.8 + amplitudeFactor * 0.2,
          }}
        >
          <svg width="240" height="60" style={{ position: 'absolute' }}>
            <defs>
              <filter id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              d={`M 20 30 Q 60 ${20 + Math.sin(i * 0.5) * 10} 120 30 Q 180 ${40 + Math.sin(i * 0.5) * 10} 220 30`}
              stroke={colors[i]}
              strokeWidth={25 + amplitudeFactor * 10}
              fill="none"
              filter={`url(#glow-${i})`}
            />
          </svg>
        </Animated.View>
      );
    }

    return curves;
  };

  // Create center glow effect
  const createCenterGlow = () => {
    const amplitudeFactor = amplitudeRef.current / 100;
    
    return (
      <>
        {/* Outer glow */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 120 + amplitudeFactor * 40,
            height: 120 + amplitudeFactor * 40,
            borderRadius: 60 + amplitudeFactor * 20,
            backgroundColor: 'rgba(147, 51, 234, 0.3)',
            left: centerX - 60 - amplitudeFactor * 20,
            top: centerY - 60 - amplitudeFactor * 20,
            transform: [{
              scale: animationValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.1 + amplitudeFactor * 0.2, 1]
              })
            }],
            shadowColor: '#9333ea',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 30,
            elevation: 15
          }}
        />
        
        {/* Middle pulse */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 80 + amplitudeFactor * 20,
            height: 80 + amplitudeFactor * 20,
            borderRadius: 40 + amplitudeFactor * 10,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            left: centerX - 40 - amplitudeFactor * 10,
            top: centerY - 40 - amplitudeFactor * 10,
            transform: [{
              scale: animationValue.interpolate({
                inputRange: [0, 0.3, 0.7, 1],
                outputRange: [1, 1.05 + amplitudeFactor * 0.15, 1.1 + amplitudeFactor * 0.1, 1]
              })
            }],
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 20,
            elevation: 12
          }}
        />
        
        {/* Core */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 40 + amplitudeFactor * 10,
            height: 40 + amplitudeFactor * 10,
            borderRadius: 20 + amplitudeFactor * 5,
            backgroundColor: '#ffffff',
            left: centerX - 20 - amplitudeFactor * 5,
            top: centerY - 20 - amplitudeFactor * 5,
            transform: [{
              scale: animationValue.interpolate({
                inputRange: [0, 0.2, 0.5, 0.8, 1],
                outputRange: [1, 1.02 + amplitudeFactor * 0.03, 1.05 + amplitudeFactor * 0.05, 1.02 + amplitudeFactor * 0.03, 1]
              })
            }],
            shadowColor: '#ffffff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 15,
            elevation: 20
          }}
        />
      </>
    );
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: "#0f0f23",
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Background gradient effect */}
      <View style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e'
      }} />
      
      {/* Siri curves */}
      {createSiriCurves()}
      
      {/* Center glow */}
      {createCenterGlow()}
    </View>
  );
} 