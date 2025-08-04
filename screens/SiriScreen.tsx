import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import SiriSkia from '../components/SiriSkia';

export default function SiriScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Berechtigung erforderlich',
          'Mikrofonzugriff ist für diese App erforderlich.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Fehler beim Anfordern der Berechtigungen:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        await requestPermissions();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);

      // Simulate amplitude changes for demo purposes
      // In a real app, you would analyze the audio data
      const amplitudeInterval = setInterval(() => {
        if (isRecording) {
          const randomAmplitude = Math.random() * 100;
          setAmplitude(randomAmplitude);
        } else {
          clearInterval(amplitudeInterval);
        }
      }, 100);

      // Cleanup interval when component unmounts
      return () => clearInterval(amplitudeInterval);
    } catch (error) {
      console.error('Fehler beim Starten der Aufnahme:', error);
      Alert.alert('Fehler', 'Aufnahme konnte nicht gestartet werden.');
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      setIsRecording(false);
      setAmplitude(0);
    } catch (error) {
      console.error('Fehler beim Stoppen der Aufnahme:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      {/* Animation Component */}
      <View style={styles.animationContainer}>
        <SiriSkia amplitude={amplitude} />
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.amplitudeText}>
          Amplitude: {amplitude.toFixed(1)}
        </Text>
        
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive
          ]}
          onPress={toggleRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.statusText}>
          Status: {isRecording ? 'Aufnahme läuft...' : 'Bereit'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  animationContainer: {
    flex: 1,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  amplitudeText: {
    color: '#00ffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  recordButtonActive: {
    backgroundColor: '#44ff44',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
}); 