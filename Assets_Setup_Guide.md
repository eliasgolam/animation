# 📁 Assets.xcassets Setup für Siri PDFs

## 🎯 **Schritt-für-Schritt Anleitung:**

### **1. Xcode öffnen**
- Öffne `ios/SiriAnimationTest.xcworkspace` in Xcode
- Navigiere zu `SiriAnimationTest/Images.xcassets`

### **2. PDF-Dateien importieren**
Füge alle 11 PDF-Dateien aus dem "siri recources og" Ordner hinzu:

**Drag & Drop in Assets.xcassets:**
- `blue-middle.pdf` → Name: `blue-middle`
- `blue-right.pdf` → Name: `blue-right`
- `bottom-pink.pdf` → Name: `bottom-pink`
- `green-left-1.pdf` → Name: `green-left-1`
- `green-left.pdf` → Name: `green-left`
- `highlight.pdf` → Name: `highlight`
- `icon-bg.pdf` → Name: `icon-bg`
- `Intersect.pdf` → Name: `Intersect`
- `pink-left.pdf` → Name: `pink-left`
- `pink-top.pdf` → Name: `pink-top`
- `shadow.pdf` → Name: `shadow`

### **3. Asset-Konfiguration**
Für jede PDF-Datei:
- **Type**: `Vector` (wichtig für Skalierung)
- **Scales**: `Single Scale`
- **Preserve Vector Data**: ✅ (aktiviert)

### **4. SwiftUI Integration**
Die `SiriOverlayView.swift` verwendet:
```swift
Image("blue-middle")  // Lädt PDF aus Assets.xcassets
    .resizable()
    .aspectRatio(contentMode: .fit)
```

## ✅ **Verifikation:**
Nach dem Import sollten alle PDFs in SwiftUI verfügbar sein:
- `Image("blue-middle")` ✅
- `Image("blue-right")` ✅
- `Image("pink-top")` ✅
- etc.

## 🎨 **Animationen:**
- **Pulsieren**: `scaleEffect` (1.0 → 1.1)
- **Rotation**: Verschiedene Geschwindigkeiten pro PDF
- **Opacity**: Sanfte Fade-Animation (0.8 → 1.0)

**Perfect! Nach dem Assets-Import funktioniert die SwiftUI-Animation mit echten PDF-Vektoren!** 🎉
