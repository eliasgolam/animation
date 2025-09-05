import React from "react";
import { View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";

export default function TestSkia() {
  return (
    <View style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#000000',
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <Canvas style={{ width: '100%', height: '100%' }}>
        <Path 
          path={Skia.Path.Make().addCircle(200, 200, 50)} 
          color="red" 
        />
        <Path 
          path={Skia.Path.Make().addCircle(200, 200, 100)} 
          color="blue" 
        />
        <Path 
          path={Skia.Path.Make().addCircle(200, 200, 150)} 
          color="green" 
        />
      </Canvas>
    </View>
  );
}

