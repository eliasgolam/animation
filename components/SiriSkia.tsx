import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Dimensions } from "react-native";
import { Canvas, Path, Skia, RadialGradient, SweepGradient, vec, BlendMode, mix, Group, Mask, Circle, Rect } from "@shopify/react-native-skia";

const { width, height } = Dimensions.get("window");
const centerX = width / 2;
const centerY = height / 2;

// Siri colors
const SIRI_COLORS = {
  darkBlue: "#0a0a23",
  violet: "#3a1c71", 
  turquoise: "#00c3ff",
  pink: "#ff4f81",
  cyan: "#00fff7",
  white: "#ffffff"
};

interface SiriSkiaProps {
  amplitude: number;
  isRunning?: boolean;
  isDarkMode?: boolean;
}

// Perlin noise for organic movement
const perlinNoise = (x: number, y: number, time: number) => {
  const n = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time * 0.5) * 
            Math.sin((x + y) * 0.05 + time * 0.3) * Math.cos((x - y) * 0.03 + time * 0.7);
  return n * 0.5 + 0.5;
};

// Create organic blob path with fluid deformation
const createOrganicBlobPath = (
  centerX: number,
  centerY: number,
  baseRadius: number,
  time: number,
  amplitudeFactor: number,
  waveFreqs: number[],
  phase: number,
  isMainCircle: boolean
) => {
  const path = Skia.Path.Make();
  const points = [];
  const numPoints = isMainCircle ? 240 : 120; // More points for main circle

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    if (isMainCircle) {
      // Main circle: organic deformation with multiple non-integer frequencies
      const time1 = time * 0.25;
      const time2 = time * 0.35;
      const time3 = time * 0.45;
      
      // Multiple sine wave modulations with non-integer frequencies
      const wave1 = Math.sin(angle * 2.3 + time1) * (baseRadius * 0.012 * (1 + Math.sin(i * 0.1) * 0.2));
      const wave2 = Math.sin(angle * 3.7 + time2) * (baseRadius * 0.008 * (1 + Math.cos(i * 0.15) * 0.15));
      const wave3 = Math.sin(angle * 5.1 + time3) * (baseRadius * 0.006 * (1 + Math.sin(i * 0.2) * 0.1));
      const wave4 = Math.sin(angle * 7.2 + time1 * 0.8) * (baseRadius * 0.004 * (1 + Math.cos(i * 0.25) * 0.1));
      
      // Multiple Perlin noise layers for organic variation
      const noiseValue1 = perlinNoise(Math.cos(angle) * 0.4 + time * 0.06, Math.sin(angle) * 0.4 + time * 0.06, time * 0.03);
      const noiseValue2 = perlinNoise(Math.cos(angle) * 0.8 + time * 0.08, Math.sin(angle) * 0.8 + time * 0.08, time * 0.04);
      
      const distortion1 = (noiseValue1 - 0.5) * baseRadius * 0.008 * (1 + amplitudeFactor * 0.2);
      const distortion2 = (noiseValue2 - 0.5) * baseRadius * 0.005 * (1 + amplitudeFactor * 0.15);
      
      const totalDeformation = wave1 + wave2 + wave3 + wave4 + distortion1 + distortion2;
      const finalRadius = baseRadius + totalDeformation;
      const finalX = centerX + Math.cos(angle) * finalRadius;
      const finalY = centerY + Math.sin(angle) * finalRadius;
      
      points.push({ x: finalX, y: finalY });
    } else {
      // Inner blobs: cloud-like organic deformation with unique noise
      const time1 = time * 0.8 + phase;
      const time2 = time * 1.2 + phase * 1.3;
      const time3 = time * 0.6 + phase * 0.7;
      const time4 = time * 1.0 + phase * 1.1;
      
      // Multiple sine wave modulations with varying frequencies per blob
      const wave1 = Math.sin(angle * (waveFreqs[0] + phase * 0.1) + time1) * (baseRadius * 0.3);
      const wave2 = Math.sin(angle * (waveFreqs[1] + phase * 0.2) + time2) * (baseRadius * 0.25);
      const wave3 = Math.sin(angle * (waveFreqs[2] + phase * 0.15) + time3) * (baseRadius * 0.35);
      const wave4 = Math.sin(angle * (1.5 + phase * 0.3) + time4) * (baseRadius * 0.2);
      
      // Multiple Perlin noise layers with unique seeds
      const noiseValue1 = perlinNoise(Math.cos(angle) * 3.0 + time * 0.6 + phase, Math.sin(angle) * 3.0 + time * 0.6 + phase, time * 0.3);
      const noiseValue2 = perlinNoise(Math.cos(angle) * 4.5 + time * 0.8 + phase, Math.sin(angle) * 4.5 + time * 0.8 + phase, time * 0.4);
      const noiseValue3 = perlinNoise(Math.cos(angle) * 2.2 + time * 0.5 + phase, Math.sin(angle) * 2.2 + time * 0.5 + phase, time * 0.2);
      
      // Amplitude-based modulation for dynamic deformation
      const amplitudeMod = 1 + amplitudeFactor * 1.0;
      
      // Combine all deformations for cloud-like shape
      const totalDeformation = (wave1 + wave2 + wave3 + wave4 + 
        (noiseValue1 - 0.5) * baseRadius * 0.35 + 
        (noiseValue2 - 0.5) * baseRadius * 0.3 + 
        (noiseValue3 - 0.5) * baseRadius * 0.25) * amplitudeMod;
      
      // Add organic asymmetry
      const asymmetryX = Math.sin(angle * 2.5 + time * 0.4 + phase) * baseRadius * 0.15;
      const asymmetryY = Math.cos(angle * 2.8 + time * 0.5 + phase) * baseRadius * 0.15;
      
      const finalRadius = baseRadius + totalDeformation;
      const finalX = centerX + Math.cos(angle) * finalRadius + asymmetryX;
      const finalY = centerY + Math.sin(angle) * finalRadius + asymmetryY;
      
      points.push({ x: finalX, y: finalY });
    }
  }

  // Create smooth path using Catmull-Rom spline approximation
  if (points.length > 0) {
    path.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      const nextNext = points[(i + 2) % points.length];
      
      // Calculate Catmull-Rom control points for smooth curves
      const tension = 0.5;
      const cp1x = curr.x - (next.x - prev.x) * tension * 0.25;
      const cp1y = curr.y - (next.y - prev.y) * tension * 0.25;
      const cp2x = curr.x + (next.x - prev.x) * tension * 0.25;
      const cp2y = curr.y + (next.y - prev.y) * tension * 0.25;
      
      path.cubicTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
    }
    
    path.close();
  }
  
  return path;
};

export default React.memo(function SiriSkia({ 
  amplitude, 
  isRunning = true, 
  isDarkMode = true 
}: SiriSkiaProps) {
  // Animation state
  const [currentTime, setCurrentTime] = useState(0);
  const [mainCircleScale, setMainCircleScale] = useState(1);

  // Amplitude interpolation
  const effectiveAmplitude = useMemo(() => {
    return Math.max(0, Math.min(100, amplitude));
  }, [amplitude]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 0.02);
    }, 20);

    return () => clearInterval(interval);
  }, []);

  // Main circle breathing animation
  useEffect(() => {
    const breathingInterval = setInterval(() => {
      const breathingPhase = (currentTime * 0.4) % (Math.PI * 2);
      const baseScale = 1 + Math.sin(breathingPhase) * 0.03; // 3% breathing
      const amplitudeScale = 1 + (effectiveAmplitude / 100) * 0.08; // 8% amplitude scaling
      setMainCircleScale(baseScale * amplitudeScale);
    }, 16);

    return () => clearInterval(breathingInterval);
  }, [currentTime, effectiveAmplitude]);

  // Main circle radius and blob base radius
  const mainCircleRadius = Math.min(width, height) * 0.25; // 25% of screen
  const blobBaseRadius = mainCircleRadius * 0.4; // 40% of main circle



  // Render Siri background with 4 very large, strongly overlapping color blobs
  const renderMainCircle = useCallback(() => {
    const mainRadius = mainCircleRadius * mainCircleScale;
    const amplitudeFactor = effectiveAmplitude / 100;
    
    // Base animation time
    const time = currentTime * 0.01;
    
    // Main circle path
    const backgroundCirclePath = createOrganicBlobPath(
      centerX,
      centerY,
      mainRadius * 0.8,
      currentTime * 0.25,
      amplitudeFactor * 0.45,
      [2.3, 3.7, 5.1, 1.9, 2.8],
      time * 0.8,
      true
    );
    

    
    // Inner blobs radius
    const innerBlobRadius = mainRadius * 0.3;
    


    return (
      <Group>
                {/* Main gradient background */}
        <Path
          path={backgroundCirclePath}
        >
          <RadialGradient
            c={vec(centerX + Math.sin(time * 2.0) * 100, centerY + Math.cos(time * 1.6) * 100)}
            r={mainRadius * 2.0}
            colors={[
              "#1a0033", // Very dark violet
              "#2E335A", // Dark blue
              "#6B2D5C", // Violet
              "#B07B4F", // Brown/Gold
              "#A96A7A", // Soft pink
              "#2E335A", // Dark blue
            ]}
            positions={[
              0.01 + Math.sin(time * 2.5) * 0.05,
              0.2 + Math.sin(time * 3.2) * 0.15,
              0.4 + Math.sin(time * 2.8) * 0.25,
              0.6 + Math.sin(time * 3.0) * 0.3,
              0.8 + Math.sin(time * 2.2) * 0.2,
              1.0
            ]}
          />
        </Path>
        
        {/* Overlay gradient */}
        <Path
          path={backgroundCirclePath}
        >
          <RadialGradient
            c={vec(centerX + Math.cos(time * 1.8) * 80, centerY + Math.sin(time * 2.2) * 80)}
            r={mainRadius * 1.6}
            colors={[
              "rgba(46, 51, 90, 0.6)",
              "rgba(107, 45, 92, 0.5)",
              "rgba(176, 123, 79, 0.4)",
              "rgba(169, 106, 122, 0.3)",
            ]}
            positions={[
              0.1 + Math.sin(time * 1.9) * 0.1,
              0.4 + Math.sin(time * 2.1) * 0.2,
              0.7 + Math.sin(time * 1.7) * 0.15,
              0.95 + Math.sin(time * 2.3) * 0.1
            ]}
          />
        </Path>
        

        
        {/* Organic cloud-like Siri blobs */}
        {[
          { color: "#0A84FF", size: 0.9, speed: 1.0, seed: 0.1 }, // Siri blue - larger
          { color: "#FF375F", size: 0.85, speed: 1.2, seed: 0.3 }, // Siri pink - larger
          { color: "#30D158", size: 0.95, speed: 1.1, seed: 0.5 }, // Siri green - larger
          { color: "#FFD60A", size: 0.8, speed: 1.3, seed: 0.7 }, // Siri yellow - larger
          { color: "#8B5CF6", size: 0.85, speed: 0.9, seed: 0.9 }, // Siri violet - larger
        ].map((blob, i) => {
          // Unique noise seed for each blob
          const noiseSeed = blob.seed;
          
          // 3D rotation with noise
          const rotationY = Math.sin(time * 0.6 + i * 0.5) * 0.4 + Math.cos(time * 1.0 + i * 0.3) * 0.3;
          const rotationX = Math.cos(time * 0.5 + i * 0.4) * 0.35 + Math.sin(time * 0.8 + i * 0.2) * 0.25;
          const rotationSpeed = 1.0 + i * 0.3;
          
          // Position calculation with drift
          const baseAngle = time * rotationSpeed + i * Math.PI / 2;
          const posX = Math.sin(baseAngle) * 4 + Math.cos(time * 0.8 + i) * 2;
          const posY = Math.cos(baseAngle) * 3 + Math.sin(time * 0.6 + i) * 1.5;
          
          // Drift effect with noise
          const driftX = perlinNoise(time * 0.1 + noiseSeed, 0, 0) * 8;
          const driftY = perlinNoise(0, time * 0.1 + noiseSeed, 0) * 6;
          
          const x3d = centerX + posX * Math.cos(rotationY) * Math.cos(rotationX) + driftX;
          const y3d = centerY + posY * Math.cos(rotationX) + driftY;
          
          // Organic breathing effect with multiple frequencies
          const breathing1 = Math.sin(currentTime * 1.2 + i * Math.PI / 2) * 0.25;
          const breathing2 = Math.cos(currentTime * 0.8 + i * Math.PI / 3) * 0.2;
          const breathing3 = Math.sin(currentTime * 0.6 + i * Math.PI / 4) * 0.15;
          const breathing4 = perlinNoise(time * 0.3 + noiseSeed, 0, 0) * 0.1;
          const breathingScale = 0.85 + breathing1 + breathing2 + breathing3 + breathing4;
          
          // Ensure minimum radius for guaranteed overlap
          const minBlobRadius = mainRadius * 0.65; // Minimum 65% of main circle radius
          const calculatedRadius = innerBlobRadius * blob.size * breathingScale;
          const finalRadius = Math.max(calculatedRadius, minBlobRadius);
          
          // Store blob positions for interaction
          const blobPositions = [
            { color: "#0A84FF", size: 0.9, speed: 1.0, seed: 0.1 },
            { color: "#FF375F", size: 0.85, speed: 1.2, seed: 0.3 },
            { color: "#30D158", size: 0.95, speed: 1.1, seed: 0.5 },
            { color: "#FFD60A", size: 0.8, speed: 1.3, seed: 0.7 },
            { color: "#8B5CF6", size: 0.85, speed: 0.9, seed: 0.9 },
          ].map((blob, j) => {
            const blobSeed = blob.seed;
            const blobAngle = time * (1.0 + j * 0.3) + j * Math.PI / 2;
            const blobPosX = Math.sin(blobAngle) * 4 + Math.cos(time * 0.8 + j) * 2;
            const blobPosY = Math.cos(blobAngle) * 3 + Math.sin(time * 0.6 + j) * 1.5;
            const blobDriftX = perlinNoise(time * 0.1 + blobSeed, 0, 0) * 8;
            const blobDriftY = perlinNoise(0, time * 0.1 + blobSeed, 0) * 6;
            return {
              x: centerX + blobPosX + blobDriftX,
              y: centerY + blobPosY + blobDriftY
            };
          });
          
          // Blob interaction (attraction/repulsion)
          let interactionX = 0;
          let interactionY = 0;
          for (let j = 0; j < blobPositions.length; j++) {
            if (j !== i) {
              const dx = blobPositions[j].x - x3d;
              const dy = blobPositions[j].y - y3d;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = finalRadius * 1.8; // Increased interaction distance for better overlap
              if (dist < minDist && dist > 0) {
                const force = (minDist - dist) / minDist * 0.015; // Reduced force for smoother movement
                interactionX += dx * force;
                interactionY += dy * force;
              }
            }
          }
          
          // Apply interaction
          const finalX = x3d + interactionX;
          const finalY = y3d + interactionY;
          
          // Create blob path with unique frequencies
          const blobPath = createOrganicBlobPath(
            finalX,
            finalY,
            finalRadius,
            currentTime * (0.8 + i * 0.15),
            amplitudeFactor * 0.15,
            [1.0 + i * 0.1, 1.2 + i * 0.08, 1.1 + i * 0.12],
            i * Math.PI / 2 + noiseSeed,
            false
          );
          
          // Soft glow for cloud effect
          const glowPath = createOrganicBlobPath(
            finalX,
            finalY,
            finalRadius * 1.3,
            currentTime * (0.8 + i * 0.15),
            amplitudeFactor * 0.1,
            [1.0 + i * 0.05, 1.15 + i * 0.05, 1.08 + i * 0.05],
            i * Math.PI / 2 + noiseSeed,
            false
          );
          
          // 3D shadow
          const shadowOffsetX = Math.cos(rotationY) * 3;
          const shadowOffsetY = Math.sin(rotationX) * 3;
          const shadowPath = createOrganicBlobPath(
            finalX + shadowOffsetX,
            finalY + shadowOffsetY,
            finalRadius * 0.9,
            currentTime * (0.8 + i * 0.15),
            amplitudeFactor * 0.1,
            [1.0 + i * 0.05, 1.15 + i * 0.05, 1.08 + i * 0.05],
            i * Math.PI / 2 + noiseSeed,
            false
          );
          
          // 3D highlight
          const highlightOffsetX = -Math.cos(rotationY) * 2;
          const highlightOffsetY = -Math.sin(rotationX) * 2;
          const highlightPath = createOrganicBlobPath(
            finalX + highlightOffsetX,
            finalY + highlightOffsetY,
            finalRadius * 0.2,
            currentTime * (0.8 + i * 0.15),
            amplitudeFactor * 0.05,
            [1.0, 1.05, 1.02],
            i * Math.PI / 2 + noiseSeed,
            false
          );
          
          return (
            <Group key={`cloud-blob-${i}`}>
              <Path path={glowPath} color={`${blob.color}20`} blendMode="screen" />
              <Path path={shadowPath} color="rgba(0, 0, 0, 0.2)" blendMode="multiply" />
              <Path path={blobPath} color={blob.color} opacity={0.55} blendMode="screen" />
              <Path path={highlightPath} color="rgba(255, 255, 255, 0.3)" blendMode="screen" />
            </Group>
          );
        })}
        

        

      
      
      </Group>
    );
  }, [mainCircleScale, currentTime, effectiveAmplitude]);

  // Render main circle glow effect with enhanced depth
  const renderMainCircleGlow = useCallback(() => {
    const mainRadius = mainCircleRadius * mainCircleScale;
    const glowRadius = mainRadius * 1.3;
    const amplitudeFactor = effectiveAmplitude / 100;
    
    // Add slow, smooth rotation to the glow
    const rotationAngle = (currentTime * 0.02) % (Math.PI * 2);
    
    // Create organically deformed glow path with rotation
    const glowPath = createOrganicBlobPath(
      centerX,
      centerY,
      glowRadius,
      currentTime * 0.06,
      amplitudeFactor * 0.08,
      [0, 0, 0],
      rotationAngle,
      true
    );

    // Subtle amplitude-based glow intensity
    const glowIntensity = 0.03 + amplitudeFactor * 0.08; // 3% to 11% glow

    return (
      <Path
        path={glowPath}
        color="transparent"
        antiAlias={true}
      >
        <RadialGradient
          c={vec(centerX, centerY)}
          r={glowRadius}
          colors={[
            `rgba(255, 255, 255, ${glowIntensity * 0.8})`, // Subtle white center
            `rgba(0, 195, 255, ${glowIntensity * 0.6})`, // Turquoise glow
            `rgba(255, 79, 129, ${glowIntensity * 0.5})`, // Pink glow
            `rgba(162, 89, 255, ${glowIntensity * 0.4})`, // Violet glow
            `rgba(58, 28, 113, ${glowIntensity * 0.3})`, // Dark violet glow
            `rgba(10, 10, 35, ${glowIntensity * 0.2})`, // Dark blue glow
            "transparent"
          ]}
          positions={[0, 0.2, 0.4, 0.6, 0.8, 0.95, 1]}
        />
      </Path>
    );
  }, [mainCircleScale, currentTime, effectiveAmplitude]);



  return (
    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 0, margin: 0 }}>
      <Canvas style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
        {/* Render order: overlapping circles, highlights, shadows */}
        {renderMainCircle()}
      </Canvas>
    </View>
  );
}); 