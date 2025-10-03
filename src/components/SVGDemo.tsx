import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SVGImage from './SVGImage';

export default function SVGDemo() {
  const siriAssets = [
    'blue-middle.svg',
    'blue-right.svg', 
    'bottom-pink.svg',
    'green-left.svg',
    'green-left-1.svg',
    'highlight.svg',
    'icon-bg.svg',
    'Intersect.svg',
    'pink-left.svg',
    'pink-top.svg',
    'shadow.svg'
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Siri Assets Demo</Text>
      
      {/* Alle Siri Assets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Siri Assets</Text>
        <View style={styles.grid}>
          {siriAssets.map((asset, index) => (
            <View key={index} style={styles.assetItem}>
              <SVGImage filename={asset} width={80} height={80} />
              <Text style={styles.assetName}>{asset}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Verschiedene Größen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Different Sizes</Text>
        <View style={styles.sizeRow}>
          <SVGImage filename="blue-middle.svg" width={60} height={60} />
          <SVGImage filename="pink-top.svg" width={80} height={80} />
          <SVGImage filename="green-left.svg" width={100} height={100} />
          <SVGImage filename="highlight.svg" width={120} height={120} />
        </View>
      </View>
      
      {/* Siri Blob Stack */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Siri Blob Stack</Text>
        <View style={styles.blobStack}>
          <SVGImage filename="shadow.svg" width={200} height={200} />
          <SVGImage filename="icon-bg.svg" width={150} height={150} />
          <SVGImage filename="blue-middle.svg" width={100} height={100} />
          <SVGImage filename="pink-top.svg" width={80} height={80} />
          <SVGImage filename="green-left.svg" width={70} height={70} />
          <SVGImage filename="highlight.svg" width={40} height={40} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#9ecbff',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  assetItem: {
    alignItems: 'center',
    margin: 5,
  },
  assetName: {
    fontSize: 10,
    color: '#9ecbff',
    textAlign: 'center',
    marginTop: 5,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  blobStack: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
