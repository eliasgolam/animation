import React from 'react';
import { View, Text, StatusBar } from 'react-native';
import SiriSkia from '../src/components/SiriSkia';
import VoiceAnimation from '../components/VoiceAnimation';
import TestSkia from '../src/components/TestSkia';

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
    <View style={{ flex: 1, backgroundColor: '#0B1020' }}>
      <StatusBar barStyle="light-content" />
      <SiriSkia amplitude={amp} isRunning isDarkMode />
      {/* <VoiceAnimation /> */}
      <Text style={{ position: 'absolute', top: 50, alignSelf: 'center', color: '#9ecbff' }}>
        Siri Animation - Amp: {Math.round(amp)}
      </Text>
    </View>
  );
}
