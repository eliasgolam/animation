import { PATHS } from "./paths.generated";

export interface ShapeSpec {
  id: string;
  pathD: string;
  z: number;
  alpha: number;
  blur?: number;
}

export const SHAPES: ShapeSpec[] = [
  PATHS["shadow"] ? { id:"shadow", pathD: PATHS["shadow"], z: 0,  alpha: 0.5, blur: 12 } : null,
  PATHS["icon_bg"] ? { id:"icon_bg", pathD: PATHS["icon_bg"], z: 1,  alpha: 1.0 } : null,
  PATHS["green_left"] ? { id:"green_left", pathD: PATHS["green_left"], z: 2,  alpha: 0.90 } : null,
  PATHS["green_left_1"] ? { id:"green_left_1", pathD: PATHS["green_left_1"], z: 3,  alpha: 0.85 } : null,
  PATHS["blue_middle"] ? { id:"blue_middle", pathD: PATHS["blue_middle"], z: 4,  alpha: 0.95 } : null,
  PATHS["blue_right"] ? { id:"blue_right", pathD: PATHS["blue_right"], z: 5,  alpha: 0.95 } : null,
  PATHS["pink_left"] ? { id:"pink_left", pathD: PATHS["pink_left"], z: 6,  alpha: 0.95 } : null,
  PATHS["bottom_pink"] ? { id:"bottom_pink", pathD: PATHS["bottom_pink"], z: 7,  alpha: 0.90 } : null,
  PATHS["pink_top"] ? { id:"pink_top", pathD: PATHS["pink_top"], z: 8,  alpha: 0.90 } : null,
  PATHS["highlight"] ? { id:"highlight", pathD: PATHS["highlight"], z: 9,  alpha: 0.90 } : null,
  PATHS["Intersect"] ? { id:"Intersect", pathD: PATHS["Intersect"], z: 10, alpha: 0.70 } : null,
].filter(Boolean) as ShapeSpec[];

