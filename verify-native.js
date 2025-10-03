// Verifikation der nativen SwiftUI-Animation
const { NativeModules, Platform } = require('react-native');

console.log('🔍 Verifikation der nativen SwiftUI-Animation...');
console.log('Platform:', Platform.OS);

// 1. UIManager Check
try {
  const UIManager = require('react-native/Libraries/ReactNative/UIManager');
  const config = UIManager.getViewManagerConfig('SiriAnimationView');
  
  if (config) {
    console.log('✅ SiriAnimationView ist im UIManager registriert');
    console.log('Config:', Object.keys(config));
  } else {
    console.log('❌ SiriAnimationView ist NICHT im UIManager registriert');
    console.log('Verfügbare ViewManager:', Object.keys(UIManager.getViewManagerNames?.() || {}));
  }
} catch (e) {
  console.log('❌ UIManager Check fehlgeschlagen:', e.message);
}

// 2. Native Modules Check
console.log('\n📱 Native Modules:');
Object.keys(NativeModules).forEach(key => {
  if (key.includes('Siri') || key.includes('Animation')) {
    console.log('✅ Gefunden:', key);
  }
});

// 3. Test der requireNativeComponent
try {
  const { requireNativeComponent } = require('react-native');
  const NativeComponent = requireNativeComponent('SiriAnimationView');
  console.log('✅ requireNativeComponent("SiriAnimationView") erfolgreich');
} catch (e) {
  console.log('❌ requireNativeComponent fehlgeschlagen:', e.message);
}

console.log('\n🎯 Erwartung:');
console.log('- SiriAnimationView sollte im UIManager registriert sein');
console.log('- requireNativeComponent sollte funktionieren');
console.log('- Obere Animation sollte echte PDFs aus resources/siri og verwenden');
