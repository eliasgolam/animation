import * as React from 'react';
import { Audio } from 'expo-av';

const dbToLinear = (db: number) => Math.pow(10, db / 20);
const smoothStep = (prev: number, target01: number) => {
  const kUp = 1 - Math.exp(-14 * (1 / 60));
  const kDn = 1 - Math.exp(-6 * (1 / 60));
  return target01 > prev ? prev + (target01 - prev) * kUp : prev + (target01 - prev) * kDn;
};

export function useMicAmplitude() {
  const [amp, setAmp] = React.useState(0); // 0..100
  const recordingRef = React.useRef<Audio.Recording | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const start = async () => {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      const recording = new Audio.Recording();
      try {
        await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_LOW_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        const loop = async () => {
          if (!mounted || !recordingRef.current) return;
          try {
            const status = await recordingRef.current.getStatusAsync();
            // @ts-ignore
            const db = (status as any).metering ?? (status as any).meteringPeak;
            let amp01 = 0.03;
            if (typeof db === 'number' && isFinite(db)) {
              const linear = dbToLinear(db);
              const noiseFloor = 0.02;
              amp01 = Math.max(0, linear - noiseFloor) / (1 - noiseFloor);
            }
            setAmp(prev => Math.max(0, Math.min(100, smoothStep(prev / 100, amp01) * 100)));
          } catch {}
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {}
    };
    start();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      (async () => {
        try {
          if (recordingRef.current) await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      })();
    };
  }, []);

  return amp;
}