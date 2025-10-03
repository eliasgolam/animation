# 📁 PDF-Assets aus "siri recources og" korrekt verbinden

## 🎯 **Manuelle Setup-Anleitung:**

### **1. Xcode öffnen**
- Öffne `ios/SiriAnimationTest.xcworkspace` in Xcode
- Navigiere zu `SiriAnimationTest/Images.xcassets`

### **2. PDF-Dateien manuell importieren**
**Für jede PDF-Datei aus "siri recources og" Ordner:**

1. **Rechtsklick** in Assets.xcassets
2. **"New Image Set"** wählen
3. **Namen vergeben** (ohne .pdf):
   - `blue-middle`
   - `blue-right`
   - `bottom-pink`
   - `green-left-1`
   - `green-left`
   - `highlight`
   - `icon-bg`
   - `Intersect`
   - `pink-left`
   - `pink-top`
   - `shadow`

4. **PDF-Datei hineinziehen** aus "siri recources og" Ordner
5. **"Preserve Vector Data"** aktivieren ✅

### **3. SwiftUI-Integration**
Die `SiriOverlayView.swift` ist bereits konfiguriert:

```swift
Image("blue-middle")  // Lädt PDF aus Assets.xcassets
    .resizable()
    .aspectRatio(contentMode: .fit)
    .frame(width: 87, height: 87)
```

### **4. Verifikation**
Nach dem Import sollten alle PDFs verfügbar sein:
- ✅ `Image("blue-middle")`
- ✅ `Image("blue-right")`
- ✅ `Image("pink-top")`
- ✅ etc.

## 🎨 **Animationen:**
- **Pulsieren**: `scaleEffect` (1.0 → 1.1)
- **Rotation**: Verschiedene Geschwindigkeiten
- **Opacity**: Sanfte Fade-Animation

**Perfect! Nach dem manuellen Import funktioniert die SwiftUI-Animation mit echten PDF-Vektoren!** 🎉
