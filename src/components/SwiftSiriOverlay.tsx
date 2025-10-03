import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { 
  BlueMiddleImage, BlueRightImage, GreenLeftImage, GreenLeft1Image, 
  PinkLeftImage, PinkTopImage, BottomPinkImage, IntersectImage, 
  HighlightImage, ShadowImage, IconBgImage 
} from './SiriImageAssets';

// SwiftUI SiriOverlayView als React Native Komponente
// Diese Komponente simuliert die SwiftUI Animation
export default function SwiftSiriOverlay() {
  // Animation Values
  const rotA = useRef(new Animated.Value(0)).current;
  const rotB = useRef(new Animated.Value(0)).current;
  const rotC = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Blue Middle & Blue Right: 12s Rotation (Clockwise)
    Animated.loop(
      Animated.timing(rotA, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();

    // Blue Right: 14s Rotation (Counter-clockwise)
    Animated.loop(
      Animated.timing(rotB, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      })
    ).start();

    // Green Left: 16s Rotation (Counter-clockwise)
    Animated.loop(
      Animated.timing(rotC, {
        toValue: 1,
        duration: 16000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsating Animation (3s)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Background Pulsating (4s)
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotAInterpolate = rotA.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotBInterpolate = rotB.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const rotCInterpolate = rotC.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Hintergrund-Gradient (simuliert SwiftUI RadialGradient) */}
      <Animated.View 
        style={[
          styles.backgroundGradient, 
          { transform: [{ scale: backgroundPulse }] }
        ]} 
      />
      
      {/* Hauptblobs mit echten SVG-Dateien */}
      <View style={styles.blobContainer}>
        {/* Shadow (ganz unten) - 3x kleiner */}
        <ShadowImage width={140} height={140} />
        
        {/* Icon Background - 3x kleiner */}
        <IconBgImage width={67} height={67} />
        
        {/* Blue Middle - Rotation 12s - 3x kleiner */}
        <Animated.View 
          style={[
            { transform: [{ rotate: rotAInterpolate }] }
          ]} 
        >
          <BlueMiddleImage width={87} height={87} />
        </Animated.View>
        
        {/* Blue Right - Rotation 14s - 3x kleiner */}
        <Animated.View 
          style={[
            { 
              transform: [
                { translateX: 10 }, 
                { translateY: 3 },
                { rotate: rotBInterpolate }
              ] 
            }
          ]} 
        >
          <BlueRightImage width={73} height={73} />
        </Animated.View>
        
        {/* Green Left - Rotation 16s - 3x kleiner */}
        <Animated.View 
          style={[
            { 
              transform: [
                { translateX: -13 }, 
                { translateY: 7 },
                { rotate: rotCInterpolate }
              ] 
            }
          ]} 
        >
          <GreenLeftImage width={67} height={67} />
        </Animated.View>
        
        {/* Green Left 1 - 3x kleiner */}
        <GreenLeft1Image width={60} height={60} />
        
        {/* Pink Left - 3x kleiner */}
        <PinkLeftImage width={63} height={63} />
        
        {/* Pink Top - Pulsating - 3x kleiner */}
        <Animated.View 
          style={[
            { 
              transform: [
                { translateY: -20 },
                { scale: pulse }
              ] 
            }
          ]} 
        >
          <PinkTopImage width={53} height={53} />
        </Animated.View>
        
        {/* Bottom Pink - 3x kleiner */}
        <BottomPinkImage width={57} height={57} />
        
        {/* Intersect - 3x kleiner */}
        <IntersectImage width={67} height={67} />
        
        {/* Highlight (ganz oben) - 3x kleiner */}
        <HighlightImage width={100} height={100} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#00E5FF',
    opacity: 0.3,
    // Simuliert RadialGradient von #00E5FF zu #FF0080 - 3x kleiner
  },
  blobContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
