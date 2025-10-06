import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Canvas, Group, Path, Blur, useClockValue, useComputedValue, Skia, vec, RadialGradient } from "@shopify/react-native-skia";
import type { SiriController } from "../state";
import { PALETTES, paramsFor } from "../theme";
import { SHAPES } from "../spec/siri.spec";

export interface SkiaProps { controller: SiriController; style?: ViewStyle; }
export function SkiaRenderer({ controller, style }: SkiaProps){
  const t = useClockValue();
  const palette = PALETTES[controller.state];
  const shapes = useMemo(()=> SHAPES.map(s => ({ ...s, path: Skia.Path.MakeFromSVGString(s.pathD) })).filter(s=>s.path), []);
  const blobTransform = useComputedValue(() => {
    const seconds = t.current / 1000;
    const p = paramsFor(controller.state, controller.micAmp, controller.ttsAmp);
    const wobble = p.wobble;
    const sx = p.baseScale + Math.sin(seconds*2.1)*wobble;
    const sy = p.baseScale + Math.cos(seconds*1.7)*wobble;
    return { sx, sy };
  }, [t]);
  return (
    <View style={[styles.root, style]}>
      <Canvas style={styles.canvas}>
        <Group transform={[{ scaleX: blobTransform.current.sx }, { scaleY: blobTransform.current.sy }]}>
          {shapes.map(s => (
            <Group key={s.id}>
              {s.blur ? <Blur blur={s.blur} /> : null}
              <Path path={s.path} opacity={s.alpha}>
                <RadialGradient c={vec(0,0)} r={600} colors={[ toSkia(palette.inner), toSkia(palette.outer) ]} />
              </Path>
            </Group>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
function toSkia([r,g,b,a]: [number,number,number,number]) { return Skia.Color(Math.round(r*255), Math.round(g*255), Math.round(b*255), Math.round(a*255)); }
const styles = StyleSheet.create({ root: { overflow:"hidden" }, canvas: { width: "100%", height: "100%" } });

