import React from 'react';
import { View, StatusBar } from 'react-native';
import SiriSkia from '../src/components/SiriSkia';
import SwiftSiriAnimation from '../src/native/SwiftSiriAnimation';

// Test-Amplitude (ersetzbar durch Mic-Hook)
function useTestAmp() {
  const [amp, setAmp] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setAmp(a => (a + 5) % 100), 50);
    return () => clearInterval(id);
  }, []);
  return amp;
}

export default function SiriMicDemo() {
  const amp = useTestAmp();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0E17' }}>
      <StatusBar barStyle="light-content" />
      
      {/* SwiftUI SiriAnimation (oben 30%) - Echte PDF-Assets aus Assets.xcassets */}
      <View style={{ flex: 0.3, alignItems: 'center', justifyContent: 'center' }}>
        <SwiftSiriAnimation style={{ width: 260, height: 260 }} isListening />
      </View>
      
      {/* SiriSkia Animation (unten 70%) */}
      <View style={{ flex: 0.7 }}>
        <SiriSkia amplitude={amp} isRunning isDarkMode />
      </View>
    </View>
  );
}
