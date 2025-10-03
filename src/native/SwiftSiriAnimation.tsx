import React from 'react';
import { Platform, requireNativeComponent, ViewStyle } from 'react-native';

type Props = { style?: ViewStyle; isListening?: boolean };
const Native = requireNativeComponent<Props>('SiriAnimationView');

export default function SwiftSiriAnimation(props: Props) {
  if (Platform.OS !== 'ios') return null;
  return <Native {...props} />;
}
