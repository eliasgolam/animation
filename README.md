# Siri-like Audio-Reactive Visualization

A React Native project featuring a Siri-like, audio-reactive visualization built with TypeScript and @shopify/react-native-skia.

## Features

- **Frame-based Animation**: Uses Skia's `useFrameCallback` for smooth 60fps animations
- **Audio-Reactive**: Responds to amplitude changes in real-time
- **Authentic Siri Look**: Replicates Apple's Siri interface with organic blob animations
- **TypeScript**: Fully typed with no `any` types
- **Modular Architecture**: Clean separation of concerns with dedicated modules

## Project Structure

```
src/
├── components/
│   └── SiriSkia.tsx          # Main visualization component
├── constants/
│   └── theme.ts              # Colors, animation config, blob configs
├── lib/
│   ├── math/
│   │   ├── noise.ts          # Perlin noise implementation
│   │   └── spline.ts         # Catmull-Rom spline utilities
│   └── animation/
│       └── easing.ts         # Easing functions
```

## Technologies

- **React Native**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **@shopify/react-native-skia**: High-performance 2D graphics
- **react-native-reanimated**: Smooth animations

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```

## Usage

The main component `SiriSkia` accepts the following props:

```typescript
interface SiriSkiaProps {
  amplitude: number;      // Audio amplitude (0-100)
  isRunning?: boolean;    // Animation state
  isDarkMode?: boolean;   // Theme preference
}
```

## Key Features

### Frame-Based Animation
- Uses `useFrameCallback` instead of `setInterval`
- Smooth 60fps animations
- Efficient rendering with Skia

### Audio Reactivity
- Real-time amplitude response
- Breathing animation tied to audio input
- Blob scaling based on amplitude

### Authentic Siri Design
- Organic blob shapes using Perlin noise
- Catmull-Rom splines for smooth curves
- Authentic Siri color palette
- 3D rotation and perspective effects

### Performance Optimized
- Memoized calculations with `useComputedValue`
- Efficient path generation
- Optimized rendering pipeline

## Development

### Adding New Blobs
1. Add configuration to `BLOB_CONFIGS` in `theme.ts`
2. Blobs automatically integrate with the animation system

### Customizing Colors
Modify `SIRI_COLORS` in `theme.ts` to change the visual appearance.

### Animation Parameters
Adjust `ANIMATION_CONFIG` in `theme.ts` to fine-tune animation behavior.

## License

MIT License 