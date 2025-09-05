/**
 * Deterministic Perlin noise implementation with seed
 * @param seed - The seed value for deterministic noise generation
 * @returns A function that generates Perlin noise values in range [0,1]
 */
export function makePerlin(seed: number): (x: number, y: number, z: number) => number {
  // Permutation table for Perlin noise
  const p: number[] = new Array(512);
  
  // Initialize permutation table with seed
  for (let i = 0; i < 256; i++) {
    p[i] = Math.floor((Math.sin(i + seed) * 1000000) % 256);
  }
  for (let i = 0; i < 256; i++) {
    p[256 + i] = p[i];
  }

  /**
   * Fade function for smooth interpolation
   */
  const fade = (t: number): number => {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  /**
   * Linear interpolation
   */
  const lerp = (t: number, a: number, b: number): number => {
    return a + t * (b - a);
  };

  /**
   * Gradient function for Perlin noise
   */
  const grad = (hash: number, x: number, y: number, z: number): number => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  /**
   * 3D Perlin noise function
   * @param x - X coordinate
   * @param y - Y coordinate  
   * @param z - Z coordinate
   * @returns Noise value in range [0,1]
   */
  return (x: number, y: number, z: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;
    
    const noise = lerp(w, 
      lerp(v, 
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), 
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
      ), 
      lerp(v, 
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), 
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
    
    // Normalize to [0,1] range
    return (noise + 1) / 2;
  };
}

/**
 * Fractal Brownian Motion (fBm) for more natural noise
 */
export const fractalNoise = (
  x: number, 
  y: number, 
  z: number, 
  config: NoiseConfig = {
    scale: 1.0,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0
  }
): number => {
  let amplitude = 1.0;
  let frequency = 1.0;
  let noise = 0.0;
  let maxValue = 0.0;
  
  for (let i = 0; i < config.octaves; i++) {
    noise += perlinNoise(
      x * frequency * config.scale, 
      y * frequency * config.scale, 
      z * frequency * config.scale
    ) * amplitude;
    maxValue += amplitude;
    amplitude *= config.persistence;
    frequency *= config.lacunarity;
  }
  
  return noise / maxValue;
};

/**
 * Generate noise value for blob deformation
 */
export const generateBlobNoise = (
  angle: number, 
  time: number, 
  perlinSeed: number, 
  amplitude: number = 1.0
): number => {
  const x = Math.cos(angle) * 1.2 + time * 0.06;
  const y = Math.sin(angle) * 1.2 + time * 0.06;
  const z = time * 0.03 + perlinSeed;
  
  const noise1 = perlinNoise(x, y, z);
  const noise2 = perlinNoise(x * 2.4 + time * 0.08, y * 2.4 + time * 0.08, z + 0.5);
  
  return (noise1 - 0.5) * amplitude * 0.04 + (noise2 - 0.5) * amplitude * 0.02;
};
