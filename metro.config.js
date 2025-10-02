const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for Skia
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-skia': '@shopify/react-native-skia',
};

// Ensure proper asset resolution
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Enable experimental features for Skia
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  unstable_disableES6Transforms: false,
  routerRoot: '.',
};

// Add support for native modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Fix for require.context issues
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;