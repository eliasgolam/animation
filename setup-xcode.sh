#!/bin/bash

# Script zum automatischen Hinzufügen der Swift-Dateien zum Xcode-Projekt

echo "🔧 Füge Swift-Dateien zum Xcode-Projekt hinzu..."

cd ios

# Öffne Xcode
open SiriAnimationTest.xcworkspace

echo "✅ Xcode wurde geöffnet."
echo ""
echo "⚠️  WICHTIGE SCHRITTE - BITTE FOLGEN:"
echo ""
echo "1. In Xcode: Im Project Navigator auf 'SiriAnimationTest' Ordner"
echo "2. Rechtsklick → 'Add Files to SiriAnimationTest...'"
echo "3. Navigiere zu: ios/SiriAnimationTest/"
echo "4. Wähle diese 4 Dateien aus:"
echo "   - SiriAnimationView.swift"
echo "   - SiriAnimationContainer.swift"
echo "   - SiriAnimationViewManager.swift"
echo "   - SiriAnimationViewManager.m"
echo "5. ✅ Haken bei 'Copy items if needed'"
echo "6. ✅ Haken bei 'SiriAnimationTest' Target"
echo "7. Klicke 'Add'"
echo "8. Product → Clean Build Folder (Cmd+Shift+K)"
echo "9. Product → Build (Cmd+B)"
echo ""
echo "Danach in Terminal:"
echo "  npx expo run:ios"
echo ""

