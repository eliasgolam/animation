import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, useWindowDimensions } from "react-native";
import { Canvas, Group, Path, Blur, useClockValue, useComputedValue, Skia, vec, RadialGradient, type SkPath } from "@shopify/react-native-skia";
import type { SiriController } from "../state";
import { PALETTES, paramsFor } from "../theme";
import { SHAPES } from "../spec/siri.spec";

export interface SkiaProps { controller: SiriController; style?: ViewStyle; }
export function SkiaRenderer({ controller, style }: SkiaProps){
  const t = useClockValue();
  const { width, height } = useWindowDimensions();
  const palette = PALETTES[controller.state];
  type ShapeDraw = { id: string; alpha: number; blur?: number; path: SkPath };
  const shapes = useMemo(() => {
    const items = SHAPES.map(s => {
      const p = Skia.Path.MakeFromSVGString(s.pathD);
      if (!p) return null;
      const base = { id: s.id, alpha: s.alpha, path: p } as ShapeDraw;
      return s.blur ? { ...base, blur: s.blur } : base;
    }).filter(Boolean) as ShapeDraw[];
    return items;
  }, []);

  const transform = useComputedValue(() => {
    const seconds = t.current / 1000;
    const p = paramsFor(controller.state, controller.micAmp, controller.ttsAmp);
    const wobble = p.wobble;
    const sx = p.baseScale + Math.sin(seconds * 2.1) * wobble;
    const sy = p.baseScale + Math.cos(seconds * 1.7) * wobble;
    const cx = width / 2, cy = height / 2;
    return [
      { translateX: -cx }, { translateY: -cy },
      { scaleX: sx }, { scaleY: sy },
      { translateX: cx }, { translateY: cy },
    ];
  }, [t, width, height, controller.state, controller.micAmp, controller.ttsAmp]);
  return (
    <View style={[styles.root, style]}>
      <Canvas style={{ width, height }}>
        <Group transform={transform}>
          {shapes.map(s => (
            <Group key={s.id}>
              {s.blur ? <Blur blur={s.blur} /> : null}
              <Path path={s.path} opacity={s.alpha}>
                <RadialGradient
                  c={vec(width/2, height/2)}
                  r={Math.max(width, height)}
                  colors={[ toSkia(palette.inner), toSkia(palette.outer) ]}
                />
              </Path>
            </Group>
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
function toSkia([r,g,b,a]: [number,number,number,number]) {
  const ri = Math.round(r*255), gi = Math.round(g*255), bi = Math.round(b*255);
  return Skia.Color(`rgba(${ri}, ${gi}, ${bi}, ${a})`);
}
const styles = StyleSheet.create({ root: { overflow:"hidden" } });

