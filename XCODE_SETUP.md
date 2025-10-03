# Xcode Setup für Native SwiftUI-Animation

## WICHTIG: Manuelle Schritte erforderlich!

Die Swift-Dateien sind kopiert, aber **MÜSSEN** manuell zum Xcode-Projekt hinzugefügt werden:

### Schritte:

1. **Xcode öffnen:**
   ```bash
   open ios/SiriAnimationTest.xcworkspace
   ```

2. **Dateien zum Projekt hinzufügen:**
   - Im Xcode Project Navigator: `SiriAnimationTest` Ordner
   - Rechtsklick → "Add Files to 'SiriAnimationTest'..."
   - Navigiere zu: `ios/SiriAnimationTest/`
   - Wähle aus:
     - `SiriAnimationView.swift`
     - `SiriAnimationContainer.swift`
     - `SiriAnimationViewManager.swift`
     - `SiriAnimationViewManager.m`
   - **WICHTIG**: Haken setzen bei "Copy items if needed"
   - **WICHTIG**: Haken setzen bei "SiriAnimationTest" Target
   - Klicke "Add"

3. **Bridging Header prüfen:**
   - Build Settings → Swift Compiler - General
   - Objective-C Bridging Header sollte sein: `SiriAnimationTest/SiriAnimationTest-Bridging-Header.h`
   - Falls nicht vorhanden, hinzufügen:
     ```
     #import <React/RCTViewManager.h>
     ```

4. **Clean Build:**
   - Product → Clean Build Folder (Cmd+Shift+K)
   - Product → Build (Cmd+B)

5. **App neu starten:**
   ```bash
   npx expo run:ios
   ```

## Erwartetes Ergebnis:

- ✅ Native SwiftUI-Animation mit echten PDF-Assets oben (30%)
- ✅ SiriSkia-Animation unten (70%)
- ✅ Keine "requireNativeComponent" Fehler mehr

## Falls Fehler auftreten:

1. Prüfe, ob alle 4 Dateien im Target "SiriAnimationTest" enthalten sind
2. Prüfe, ob der Bridging Header korrekt ist
3. Führe Clean Build durch
4. Lösche Derived Data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`

