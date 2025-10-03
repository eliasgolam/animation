import React

@objc(SiriAnimationViewManager)
class SiriAnimationViewManager: RCTViewManager {
    @objc override static func moduleName() -> String! { "SiriAnimationView" } // Name für RN
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> UIView! { SiriAnimationContainer() }
}