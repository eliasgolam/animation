import SwiftUI

private struct SiriBlob: Identifiable {
    let id = UUID()
    let name: String
    let size: CGFloat
    let x: CGFloat
    let y: CGFloat
    let sx: CGFloat
    let sy: CGFloat
    let opacity: Double
}

struct SiriAnimationView: View {
    var isListening: Bool = true
    @State private var phase: CGFloat = 0

    // Asset-Namen aus Assets.xcassets
    private let blobs: [SiriBlob] = [
        .init(name: "blue-middle",  size: 220, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 1.00),
        .init(name: "blue-right",   size: 150, x: 100, y: -60, sx: 1.00, sy: 1.00, opacity: 0.90),
        .init(name: "green-left",   size: 160, x: -80, y: -40, sx: 1.10, sy: 0.90, opacity: 0.90),
        .init(name: "green-left-1",  size: 130, x: -60, y:  60, sx: 1.00, sy: 1.20, opacity: 0.85),
        .init(name: "pink-left",    size: 140, x:  70, y:  70, sx: 0.90, sy: 1.20, opacity: 0.80),
        .init(name: "pink-top",     size: 120, x:   0, y: -120,sx: 1.00, sy: 1.00, opacity: 0.80),
        .init(name: "bottom-pink",  size: 120, x:   0, y: 140, sx: 1.00, sy: 1.00, opacity: 0.85),
        .init(name: "Intersect",   size: 130, x:  10, y:  30, sx: 1.00, sy: 1.00, opacity: 0.90),
        .init(name: "highlight",   size:  80, x:  40, y: -10, sx: 1.00, sy: 1.00, opacity: 1.00),
        .init(name: "shadow",      size: 270, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 0.50),
        .init(name: "icon-bg",      size: 300, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 0.30),
    ]

    var body: some View {
        ZStack {
            ForEach(blobs) { b in
                Image(b.name)
                    .renderingMode(.original)
                    .resizable()
                    .scaledToFit()
                    .frame(width: b.size, height: b.size)
                    .scaleEffect(x: b.sx + osc(axis: .x), y: b.sy + osc(axis: .y))
                    .offset(x: b.x + move(axis: .x), y: b.y + move(axis: .y))
                    .opacity(b.opacity)
                    .blendMode(.plusLighter)
            }
        }
        .drawingGroup()
        .onAppear { if isListening { animate() } }
        .onChange(of: isListening) { if $0 { animate() } }
    }

    private func animate() {
        withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
            phase = 1
        }
    }
    private func osc(axis: Axis) -> CGFloat { isListening ? sin(phase * .pi * 2 + (axis == .x ? 0 : 1)) * 0.06 : 0 }
    private func move(axis: Axis) -> CGFloat { isListening ? sin(phase * .pi * 2 + (axis == .x ? 0.5 : 1.2)) * 6 : 0 }
}