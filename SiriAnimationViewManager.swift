import React

@objc(SiriAnimationViewManager)
class SiriAnimationViewManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> UIView! { SiriAnimationContainer() }
}
