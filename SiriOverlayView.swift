import SwiftUI

struct SiriOverlayView: View {
    @State private var isAnimating = false
    @State private var pulseScale: CGFloat = 1.0
    @State private var rotationAngle: Double = 0.0
    @State private var opacity: Double = 0.8
    
    var body: some View {
        ZStack {
            // Alle 11 PDFs aus Assets.xcassets übereinander
            // Shadow (ganz unten)
            Image("shadow")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 140, height: 140)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.3))
            
            // Icon Background
            Image("icon-bg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 67, height: 67)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.5))
            
            // Blue Middle (Hauptblob)
            Image("blue-middle")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 87, height: 87)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle))
            
            // Blue Right
            Image("blue-right")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 73, height: 73)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.8))
            
            // Green Left
            Image("green-left")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 67, height: 67)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 1.2))
            
            // Green Left 1
            Image("green-left-1")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 60, height: 60)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.7))
            
            // Pink Left
            Image("pink-left")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 63, height: 63)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 1.1))
            
            // Pink Top
            Image("pink-top")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 53, height: 53)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.9))
            
            // Bottom Pink
            Image("bottom-pink")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 57, height: 57)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 1.3))
            
            // Intersect
            Image("Intersect")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 67, height: 67)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.6))
            
            // Highlight (ganz oben)
            Image("highlight")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 100, height: 100)
                .opacity(opacity)
                .scaleEffect(pulseScale)
                .rotationEffect(.degrees(rotationAngle * 0.4))
        }
        .onAppear {
            startAnimations()
        }
    }
    
    private func startAnimations() {
        // Pulsierende Scale-Animation
        withAnimation(
            Animation.easeInOut(duration: 2.0)
                .repeatForever(autoreverses: true)
        ) {
            pulseScale = 1.1
        }
        
        // Sanfte Rotation
        withAnimation(
            Animation.linear(duration: 8.0)
                .repeatForever(autoreverses: false)
        ) {
            rotationAngle = 360
        }
        
        // Opacity-Animation
        withAnimation(
            Animation.easeInOut(duration: 3.0)
                .repeatForever(autoreverses: true)
        ) {
            opacity = 1.0
        }
    }
}

struct SiriOverlayView_Previews: PreviewProvider {
    static var previews: some View {
        SiriOverlayView()
            .previewLayout(.sizeThatFits)
            .padding()
    }
}