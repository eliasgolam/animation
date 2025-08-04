# Siri Animation Test

Ein React Native + Expo Projekt mit Skia-Animationen für eine Siri-ähnliche Benutzeroberfläche.

## Features

- 🎨 Skia-basierte Wellen-Animationen mit Glow-Effekten
- 🎤 Mikrofonzugriff und Audioaufnahme
- 📱 Responsive Design für iOS und Android
- 🌊 Echtzeit-Amplitudenvisualisierung
- ⚡ Smooth Animationen mit Farbverläufen

## Installation

### Voraussetzungen

- Node.js (Version 16 oder höher)
- npm oder yarn
- Expo CLI
- Android Studio (für Android-Entwicklung)
- Xcode (für iOS-Entwicklung, nur auf macOS)

### Setup

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Expo CLI installieren (falls noch nicht vorhanden):**
   ```bash
   npm install -g @expo/cli
   ```

3. **Projekt starten:**
   ```bash
   npx expo start
   ```

## Verwendung

1. Starte das Projekt mit `npx expo start`
2. Scanne den QR-Code mit der Expo Go App auf deinem Smartphone
3. Oder drücke `a` für Android Emulator oder `i` für iOS Simulator
4. Tippe auf "Aufnahme starten" um die Animation zu aktivieren
5. Die Animation reagiert auf die Amplitude des Mikrofons

## Projektstruktur

```
SiriAnimationTest/
├── App.tsx                 # Haupt-App-Komponente
├── components/
│   └── SiriSkia.tsx       # Skia-Animation-Komponente
├── screens/
│   └── SiriScreen.tsx     # Haupt-Screen mit Mikrofonzugriff
├── assets/                # Bilder und Assets
├── package.json           # Dependencies
├── app.json              # Expo-Konfiguration
└── tsconfig.json         # TypeScript-Konfiguration
```

## Technologien

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform und Build-Tools
- **Skia**: 2D Graphics Engine für Animationen
- **Expo AV**: Audio/Video Funktionalität
- **TypeScript**: Type safety

## Berechtigungen

Die App benötigt folgende Berechtigungen:

- **Mikrofon**: Für Audioaufnahme und Amplitudenanalyse
- **Android**: `RECORD_AUDIO` Permission
- **iOS**: `NSMicrophoneUsageDescription` in Info.plist

## Entwicklung

### Debugging

- Verwende `console.log()` für Debugging
- Expo DevTools für Performance-Monitoring
- React Native Debugger für erweiterte Debugging-Features

### Customization

Die Animation kann angepasst werden durch:

- Ändern der Farben in `SiriSkia.tsx`
- Anpassen der Wellen-Parameter
- Modifizieren der Animation-Geschwindigkeit
- Hinzufügen neuer Effekte

## Troubleshooting

### Häufige Probleme

1. **Metro bundler startet nicht:**
   ```bash
   npx expo start --clear
   ```

2. **Dependencies Probleme:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS Build Fehler:**
   ```bash
   npx expo run:ios --clear
   ```

4. **Android Build Fehler:**
   ```bash
   npx expo run:android --clear
   ```

## Lizenz

MIT License - siehe LICENSE Datei für Details. 