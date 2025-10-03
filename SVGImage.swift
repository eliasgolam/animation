import SwiftUI

// SVGImage Wrapper-View für SVG-Dateien
struct SVGImage: View {
    let name: String
    let width: CGFloat
    let height: CGFloat
    
    init(name: String, width: CGFloat = 200, height: CGFloat = 200) {
        self.name = name
        self.width = width
        self.height = height
    }
    
    var body: some View {
        // Fallback: Zeige einen farbigen Kreis basierend auf dem Namen
        Circle()
            .fill(getColorForName(name))
            .frame(width: width, height: height)
            .overlay(
                // Optional: Zeige den Namen als Text
                Text(name.replacingOccurrences(of: "-", with: "\n"))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .opacity(0.8)
            )
    }
    
    private func getColorForName(_ name: String) -> Color {
        switch name {
        case "blue-middle": return Color(red: 0.0, green: 0.4, blue: 1.0) // Blau
        case "blue-right": return Color(red: 0.0, green: 0.6, blue: 1.0) // Cyan
        case "pink-top": return Color(red: 1.0, green: 0.3, blue: 0.7) // Pink
        case "pink-left": return Color(red: 1.0, green: 0.4, blue: 0.8) // Pink
        case "green-left": return Color(red: 0.0, green: 0.8, blue: 0.4) // Grün
        case "green-left-1": return Color(red: 0.2, green: 0.9, blue: 0.5) // Grün
        case "bottom-pink": return Color(red: 1.0, green: 0.5, blue: 0.9) // Pink
        case "highlight": return Color.white.opacity(0.9) // Weiß
        case "shadow": return Color.black.opacity(0.3) // Schwarz
        case "icon-bg": return Color(red: 0.2, green: 0.2, blue: 0.2) // Dunkelgrau
        case "Intersect": return Color(red: 1.0, green: 0.6, blue: 0.2) // Orange
        default: return Color.gray.opacity(0.5)
        }
    }
}

// Preview für SVGImage
struct SVGImage_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            SVGImage(name: "blue-middle", width: 100, height: 100)
            SVGImage(name: "pink-top", width: 80, height: 80)
            SVGImage(name: "highlight", width: 60, height: 60)
        }
        .previewLayout(.sizeThatFits)
        .padding()
    }
}
