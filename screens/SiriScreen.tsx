import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import SiriSkia from '../components/SiriSkia';

const { width, height } = Dimensions.get('window');

export default function SiriScreen() {
  const [isListening, setIsListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | NodeJS.Timeout | null>(null);

  // Initialize audio context and microphone
  useEffect(() => {
    const initAudio = async () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = context.createMediaStreamSource(stream);
        const analyserNode = context.createAnalyser();
        
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        
        setAudioContext(context);
        setAnalyser(analyserNode);
        setMicrophone(source);
      } catch (error) {
        console.log('Audio not available, using simulation');
      }
    };

    initAudio();
  }, []);

  // Audio analysis loop
  useEffect(() => {
    if (!isListening || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateAmplitude = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Convert to 0-100 scale with smooth transitions
      const newAmplitude = Math.min(100, (rms / 128) * 100);
      
      // Smooth amplitude changes for organic feel
      setAmplitude(prev => {
        const diff = newAmplitude - prev;
        return prev + diff * 0.3; // Smooth interpolation
      });
      
      animationRef.current = requestAnimationFrame(updateAmplitude);
    };

    updateAmplitude();

    return () => {
      if (animationRef.current && typeof animationRef.current === 'number') {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, analyser]);

  // Simulate amplitude when audio is not available
  useEffect(() => {
    if (!isListening || analyser) return;

    let time = 0;
    const simulateAmplitude = () => {
      // Create organic, voice-like amplitude patterns
      const baseAmplitude = 15 + Math.sin(time * 0.5) * 10;
      const voicePattern = Math.sin(time * 2.3) * Math.sin(time * 1.7) * 20;
      const randomVariation = Math.random() * 15;
      
      const newAmplitude = Math.max(0, Math.min(100, baseAmplitude + voicePattern + randomVariation));
      
      setAmplitude(prev => {
        const diff = newAmplitude - prev;
        return prev + diff * 0.2; // Smooth interpolation
      });
      
      time += 0.1;
      animationRef.current = setTimeout(simulateAmplitude, 100);
    };

    simulateAmplitude();

    return () => {
      if (animationRef.current && typeof animationRef.current !== 'number') {
        clearTimeout(animationRef.current);
      }
    };
  }, [isListening, analyser]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setAmplitude(0);
      if (animationRef.current) {
        if (typeof animationRef.current === 'number') {
          cancelAnimationFrame(animationRef.current);
        } else {
          clearTimeout(animationRef.current);
        }
      }
    } else {
      setIsListening(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Controls - Siri-like */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={[styles.button, isListening ? styles.stopButton : styles.startButton]}
          onPress={toggleListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Animation Area - Centered and Smaller */}
      <View style={styles.animationContainer}>
        <View style={styles.animationWrapper}>
          <SiriSkia 
            amplitude={amplitude} 
            isRunning={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 0,
    margin: 0,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0,
  },
  animationWrapper: {
    width: '80%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0,
  },
});
