import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import SiriSkia from "./src/components/SiriSkia";

export default function App() {
  const [amplitude, setAmplitude] = useState(50);

  console.log('App rendering with amplitude:', amplitude);

  // Simulate amplitude changes
  useEffect(() => {
    const interval = setInterval(() => {
      setAmplitude(prev => {
        const change = (Math.random() - 0.5) * 20;
        return Math.max(0, Math.min(100, prev + change));
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <SiriSkia 
        amplitude={amplitude}
        isRunning={true}
        isDarkMode={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
}); 