# ⚡ SCHNELLE XCODE ANLEITUNG - Swift-Animation aktivieren

## 🎯 Ziel: Swift-Animation oben (30%) sichtbar machen

---

## ✅ SCHRITT 1: Dateien in Xcode hinzufügen (2 Minuten)

**Xcode sollte bereits offen sein** (`ios/SiriAnimationTest.xcworkspace`)

### In Xcode:

1. **Project Navigator** (links, Ordner-Icon oder Cmd+1)
2. Finde den Ordner **`SiriAnimationTest`** (blau, mit App-Icon)
3. **Rechtsklick** auf `SiriAnimationTest` → **"Add Files to 'SiriAnimationTest'..."**

4. **Datei-Auswahl:**
   - Navigiere zu: `ios/SiriAnimationTest/`
   - **Wähle diese 4 Dateien** (mit Cmd+Klick):
     ```
     ✅ SiriAnimationView.swift
     ✅ SiriAnimationContainer.swift
     ✅ SiriAnimationViewManager.swift
     ✅ SiriAnimationViewManager.m
     ```

5. **Wichtige Optionen** (unten im Dialog):
   - ✅ **"Copy items if needed"** - Haken setzen
   - ✅ **"Add to targets: SiriAnimationTest"** - Haken setzen
   - ✅ **"Create groups"** - ausgewählt (nicht "Create folder references")

6. Klicke **"Add"**

---

## ✅ SCHRITT 2: Build vorbereiten

### In Xcode:

1. **Simulator auswählen:**
   - Oben links: **SiriAnimationTest** > **iPhone 15 Pro** (oder ein anderer Simulator)

2. **Clean Build Folder:**
   - Menü: **Product** → **Clean Build Folder** (oder **Cmd+Shift+K**)
   - Warte bis "Clean finished"

---

## ✅ SCHRITT 3: App bauen und starten

### In Xcode:

1. **Build & Run:**
   - Menü: **Product** → **Run** (oder **Cmd+R**)
   - Warte bis der Simulator startet und die App lädt

---

## 🎉 ERWARTETES ERGEBNIS:

- ✅ **Oben (30%)**: Native SwiftUI-Animation mit **echten PDF-Assets**
- ✅ **Unten (70%)**: SiriSkia-Animation
- ✅ **Keine Render-Errors** mehr
- ✅ **Alle 11 PDF-Layer** sichtbar mit Animationen

---

## ❌ FALLS FEHLER AUFTRETEN:

### "requireNativeComponent: SiriAnimationView was not found"

**Lösung:**
1. In Xcode: Prüfe ob die 4 Swift-Dateien im Project Navigator sichtbar sind
2. Klicke auf jede Datei → File Inspector (rechts) → Target Membership → Haken bei "SiriAnimationTest"
3. Clean Build Folder + Run

### "Bridging Header not found"

**Lösung:**
1. Build Settings → Swift Compiler - General
2. Objective-C Bridging Header = `SiriAnimationTest/SiriAnimationTest-Bridging-Header.h`
3. Clean Build Folder + Run

---

## 📱 Das war's!

Nach diesen Schritten sollte die Swift-Animation mit den echten PDF-Assets oben angezeigt werden!

