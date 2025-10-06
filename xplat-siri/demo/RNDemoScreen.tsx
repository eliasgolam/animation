import React, { useEffect, useRef, useState } from "react";
import { View, Text, Button, SafeAreaView, StyleSheet } from "react-native";
import { SiriController, SiriState } from "../src/state";
import { SkiaRenderer } from "../src/rn/SkiaRenderer";

export default function RNDemoScreen(){
  const controllerRef = useRef(new SiriController({ state: "idle" }));
  const [state, setState] = useState<SiriState>("idle");

  // State -> Controller
  useEffect(()=>{ controllerRef.current.setState(state); }, [state]);

  // Simulierte Mic/TTS-Amplituden (für sofortige Sichtbarkeit auf jedem Gerät)
  useEffect(()=>{
    let t = 0, raf = 0;
    const loop = () => {
      t += 1/60;
      // Mic lebt stärker in "listening"
      const mic = state === "listening" ? 0.4 + 0.4*Math.abs(Math.sin(t*3.1)) : 0.05 + 0.05*Math.abs(Math.sin(t*1.2));
      // TTS lebt in "speaking"
      const tts = state === "speaking" ? 0.4 + 0.5*Math.abs(Math.sin(t*5.0)) : 0.0;
      controllerRef.current.setMicAmp(mic);
      controllerRef.current.setTtsAmp(tts);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  }, [state]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.toolbar}>
        {( ["idle","listening","thinking","speaking"] as SiriState[] ).map(s => (
          <Button key={s} title={s} onPress={()=>setState(s)} />
        ))}
      </View>
      <View style={styles.stage}>
        <SkiaRenderer controller={controllerRef.current} style={{ width:"100%", height:"100%" }} />
      </View>
      <Text style={styles.caption}>State: {state}</Text>
      <Text style={styles.hint}>
        Hinweis: Mic/TTS sind hier simuliert, damit es überall sofort sichtbar ist.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:{ flex:1, backgroundColor:"#000" },
  toolbar:{ flexDirection:"row", justifyContent:"space-around", padding:8, backgroundColor:"#111" },
  stage:{ flex:1 },
  caption:{ color:"#fff", textAlign:"center", paddingTop:8 },
  hint:{ color:"#aaa", textAlign:"center", paddingBottom:10 }
});



