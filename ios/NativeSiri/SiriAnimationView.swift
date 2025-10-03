import SwiftUI

private struct PDFBlob: Identifiable {
    let id = UUID()
    let tokens: [String]  // zur Zuordnung zu Dateinamen
    let size: CGFloat
    let x: CGFloat
    let y: CGFloat
    let sx: CGFloat
    let sy: CGFloat
    let opacity: Double
    let z: Double
}

struct SiriAnimationView: View {
    var isListening: Bool = true
    @State private var phase: CGFloat = 0

    // 11 Layer – Position/Scale wie bisher (bei Bedarf feinjustieren)
    private let blobs: [PDFBlob] = [
        .init(tokens: ["icon-bg"],       size: 300, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 0.30, z: 0),
        .init(tokens: ["shadow"],        size: 270, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 0.50, z: 1),
        .init(tokens: ["blue-middle"],   size: 220, x:   0, y:   0, sx: 1.00, sy: 1.00, opacity: 1.00, z: 5),
        .init(tokens: ["blue-right"],    size: 150, x: 100, y: -60, sx: 1.00, sy: 1.00, opacity: 0.90, z: 6),
        .init(tokens: ["green-left"],    size: 160, x: -80, y: -40, sx: 1.10, sy: 0.90, opacity: 0.90, z: 6),
        .init(tokens: ["green-left-1"],  size: 130, x: -60, y:  60, sx: 1.00, sy: 1.20, opacity: 0.85, z: 6),
        .init(tokens: ["pink-left"],     size: 140, x:  70, y:  70, sx: 0.90, sy: 1.20, opacity: 0.80, z: 6),
        .init(tokens: ["pink-top"],      size: 120, x:   0, y: -120, sx: 1.00, sy: 1.00, opacity: 0.80, z: 7),
        .init(tokens: ["bottom-pink"],   size: 120, x:   0, y: 140, sx: 1.00, sy: 1.00, opacity: 0.85, z: 5),
        .init(tokens: ["Intersect"],     size: 130, x:  10, y:  30, sx: 1.00, sy: 1.00, opacity: 0.90, z: 8),
        .init(tokens: ["highlight"],     size: 80, x: 40, y: -10, sx: 1.00, sy: 1.00, opacity: 1.00, z: 9),
    ]

    var body: some View {
        ZStack {
            ForEach(blobs.sorted { $0.z < $1.z }) { b in
                let assetName = b.tokens[0]
                Image(assetName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: b.size, height: b.size)
                    .scaleEffect(x: b.sx + osc(.x), y: b.sy + osc(.y))
                    .offset(x: b.x + move(.x), y: b.y + move(.y))
                    .opacity(b.opacity)
                    .blendMode(.plusLighter)
                    .zIndex(b.z)
            }
        }
        .drawingGroup()
        .onAppear { startIfNeeded() }
        .onChange(of: isListening) { _ in startIfNeeded() }
    }

    private func startIfNeeded() {
        guard isListening else { return }
        withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
            phase = 1
        }
    }
    private func osc(_ axis: Axis) -> CGFloat { isListening ? sin(phase * .pi * 2 + (axis == .x ? 0 : 1)) * 0.06 : 0 }
    private func move(_ axis: Axis) -> CGFloat { isListening ? sin(phase * .pi * 2 + (axis == .x ? 0.5 : 1.2)) * 6 : 0 }
}