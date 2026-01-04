/**
 * Modulation System - Perlin noise-based parameter control
 * 
 * Provides smooth, organic modulation for any parameter.
 * Each modulator has its own noise seed and speed.
 */

import { createNoise2D } from 'simplex-noise';

export interface ModulatorConfig {
  /** Base value when modulation is 0 */
  base: number;
  /** How much the value can deviate from base */
  range: number;
  /** Speed of modulation in Hz (cycles per second) */
  speed: number;
  /** Optional: different seed for this modulator */
  seed?: number;
}

export class Modulator {
  private noise2D: ReturnType<typeof createNoise2D>;
  private config: ModulatorConfig;
  private offset: number;

  constructor(config: ModulatorConfig) {
    this.config = config;
    // Create noise function with optional seed
    this.noise2D = createNoise2D(() => config.seed ?? Math.random());
    // Random offset so multiple modulators don't correlate
    this.offset = Math.random() * 1000;
  }

  /**
   * Get the modulated value at a given time
   */
  getValue(time: number): number {
    // Use noise2D with time on X axis, offset on Y for variety
    const noiseValue = this.noise2D(time * this.config.speed, this.offset);
    // noiseValue is in range [-1, 1], map to [base - range, base + range]
    return this.config.base + noiseValue * this.config.range;
  }

  /**
   * Get normalized value in range [0, 1]
   */
  getNormalized(time: number): number {
    const noiseValue = this.noise2D(time * this.config.speed, this.offset);
    return (noiseValue + 1) / 2;
  }

  /**
   * Update config on the fly
   */
  setBase(base: number) {
    this.config.base = base;
  }

  setRange(range: number) {
    this.config.range = range;
  }

  setSpeed(speed: number) {
    this.config.speed = speed;
  }
}

/**
 * ModulationBank - Collection of named modulators
 * 
 * Convenient way to manage multiple modulation sources
 */
export class ModulationBank {
  private modulators: Map<string, Modulator> = new Map();

  add(name: string, config: ModulatorConfig): Modulator {
    const mod = new Modulator(config);
    this.modulators.set(name, mod);
    return mod;
  }

  get(name: string): Modulator | undefined {
    return this.modulators.get(name);
  }

  getValue(name: string, time: number): number {
    const mod = this.modulators.get(name);
    return mod?.getValue(time) ?? 0;
  }

  getNormalized(name: string, time: number): number {
    const mod = this.modulators.get(name);
    return mod?.getNormalized(time) ?? 0.5;
  }
}

/**
 * Pre-configured modulation presets for common uses
 */
export const ModPresets = {
  // Very slow drift - for chord changes, key shifts
  glacial: (base: number, range: number): ModulatorConfig => ({
    base,
    range,
    speed: 0.01, // ~100 second cycle
  }),

  // Slow movement - for filter sweeps, intensity
  slow: (base: number, range: number): ModulatorConfig => ({
    base,
    range,
    speed: 0.05, // ~20 second cycle
  }),

  // Medium - for velocity, expression
  medium: (base: number, range: number): ModulatorConfig => ({
    base,
    range,
    speed: 0.2, // ~5 second cycle
  }),

  // Faster - for subtle vibrato, micro-timing
  fast: (base: number, range: number): ModulatorConfig => ({
    base,
    range,
    speed: 0.8, // ~1.25 second cycle
  }),

  // Very fast - for texture, shimmer
  shimmer: (base: number, range: number): ModulatorConfig => ({
    base,
    range,
    speed: 2.5, // sub-second
  }),
};
