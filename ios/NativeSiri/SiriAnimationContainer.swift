import SwiftUI

@objc class SiriAnimationContainer: UIView {
    private var host: UIHostingController<SiriAnimationView>!
    @objc var isListening: Bool = true {
        didSet { host.rootView = SiriAnimationView(isListening: isListening) }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        host = UIHostingController(rootView: SiriAnimationView(isListening: isListening))
        host.view.backgroundColor = .clear
        addSubview(host.view)
    }

    required init?(coder: NSCoder) { super.init(coder: coder) }

    override func layoutSubviews() {
        super.layoutSubviews()
        host.view.frame = bounds
    }
}