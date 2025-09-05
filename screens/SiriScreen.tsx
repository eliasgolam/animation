import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SiriSkia from '../src/components/SiriSkia';

export default function SiriScreen() {
  const [amplitude] = useState(50);

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
