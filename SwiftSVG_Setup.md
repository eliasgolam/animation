# SwiftSVG Package Setup

## 📦 SwiftSVG Package hinzufügen

### 1. Xcode Package Manager öffnen
- Öffne `ios/SiriAnimationTest.xcworkspace` in Xcode
- Gehe zu **File → Add Package Dependencies...**

### 2. SwiftSVG Package hinzufügen
- URL eingeben: `https://github.com/exyte/SwiftSVG.git`
- Version: **Latest** (oder spezifische Version wählen)
- **Add Package** klicken

### 3. Target auswählen
- Wähle das **SiriAnimationTest** Target
- **Add Package** klicken

### 4. SVG-Dateien zum Bundle hinzufügen
- Kopiere alle SVG-Dateien aus `assets/` in das iOS Bundle:
  - `blue-middle.svg`
  - `blue-right.svg` 
  - `bottom-pink.svg`
  - `green-left.svg`
  - `green-left-1.svg`
  - `highlight.svg`
  - `icon-bg.svg`
  - `Intersect.svg`
  - `pink-left.svg`
  - `pink-top.svg`
  - `shadow.svg`

### 5. Bundle Resources konfigurieren
- In Xcode: **SiriAnimationTest Target → Build Phases → Copy Bundle Resources**
- Alle SVG-Dateien hinzufügen (drag & drop)

## 🔧 Alternative: SwiftSVG durch SwiftUI ersetzen

Falls SwiftSVG Probleme verursacht, kann `SVGImage` durch eine einfache SwiftUI-Implementierung ersetzt werden:

```swift
struct SVGImage: View {
    let name: String
    let width: CGFloat
    let height: CGFloat
    
    var body: some View {
        // Fallback: Zeige einen farbigen Kreis
        Circle()
            .fill(getColorForName(name))
            .frame(width: width, height: height)
    }
    
    private func getColorForName(_ name: String) -> Color {
        switch name {
        case "blue-middle": return .blue
        case "blue-right": return .cyan
        case "pink-top": return .pink
        case "green-left": return .green
        case "highlight": return .white
        case "shadow": return .black.opacity(0.3)
        default: return .gray
        }
    }
}
```

## ✅ Verwendung

Nach dem Setup können die Views verwendet werden:

```swift
// In SiriOverlayView.swift
SVGImage(name: "blue-middle", width: 260, height: 260)
SVGImage(name: "pink-top", width: 160, height: 160)
```

## 🐛 Troubleshooting

- **"SwiftSVG not found"**: Package nicht korrekt hinzugefügt → Xcode neu starten
- **"SVG file not found"**: SVG-Dateien nicht im Bundle → Copy Bundle Resources prüfen
- **Build errors**: iOS Deployment Target auf 13.0+ setzen
