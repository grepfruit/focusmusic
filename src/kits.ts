/**
 * Drum Kits - Different sonic characters for the beat layer
 * 
 * Each kit defines synthesis parameters for kick drum and pattern style.
 * Randomly selected per track to provide variety.
 */

export type PatternType = 
  | 'four-on-floor'   // Kick on every beat
  | 'half-time'       // Kick on 1 and 3
  | 'broken'          // Syncopated, off-grid
  | 'sparse'          // Very minimal
  | 'driving';        // Relentless, every 8th note accented

export type OscillatorShape = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface KickParams {
  // Oscillator
  waveform: OscillatorShape;
  startFreq: number;      // Initial pitch (Hz)
  endFreq: number;        // Final pitch after envelope (Hz)
  pitchDecay: number;     // Time for pitch to drop (seconds)
  
  // Amplitude envelope
  attack: number;         // Attack time (seconds)
  decay: number;          // Decay time (seconds)
  
  // Character
  distortion: number;     // Distortion amount (0 = none, 1 = heavy)
  noiseAmount: number;    // Noise transient layer (0-1)
  clickAmount: number;    // Click transient amount (0-1)
  
  // Filter
  filterFreq: number;     // Post-filter frequency
  filterQ: number;        // Filter resonance
  
  // Sub layer
  subLevel: number;       // Sub-bass layer level (0-1)
  subFreq: number;        // Sub frequency
}

export interface DrumKit {
  name: string;
  description: string;
  pattern: PatternType;
  kick: KickParams;
  ghostVelocity: number;  // How loud ghost notes are (0-1)
  swing: number;          // Timing swing amount (0-1)
}

// Distortion curve for WaveShaperNode
export function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = amount * 100;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  
  return curve;
}

export const DRUM_KITS: DrumKit[] = [
  // 1. Deep House - warm, round, classic
  {
    name: 'Deep House',
    description: 'Warm, round kick with soft attack',
    pattern: 'four-on-floor',
    kick: {
      waveform: 'sine',
      startFreq: 150,
      endFreq: 45,
      pitchDecay: 0.08,
      attack: 0.005,
      decay: 0.3,
      distortion: 0.1,
      noiseAmount: 0.05,
      clickAmount: 0.15,
      filterFreq: 200,
      filterQ: 1,
      subLevel: 0.4,
      subFreq: 40,
    },
    ghostVelocity: 0.25,
    swing: 0.1,
  },
  
  // 2. Techno - punchy, hard transient
  {
    name: 'Techno',
    description: 'Punchy kick with hard transient',
    pattern: 'four-on-floor',
    kick: {
      waveform: 'sine',
      startFreq: 180,
      endFreq: 40,
      pitchDecay: 0.04,
      attack: 0.001,
      decay: 0.2,
      distortion: 0.3,
      noiseAmount: 0.1,
      clickAmount: 0.4,
      filterFreq: 150,
      filterQ: 2,
      subLevel: 0.5,
      subFreq: 35,
    },
    ghostVelocity: 0.15,
    swing: 0,
  },
  
  // 3. Ambient - soft, muted, background
  {
    name: 'Ambient',
    description: 'Soft, muted thump for background',
    pattern: 'half-time',
    kick: {
      waveform: 'sine',
      startFreq: 100,
      endFreq: 50,
      pitchDecay: 0.15,
      attack: 0.02,
      decay: 0.5,
      distortion: 0,
      noiseAmount: 0,
      clickAmount: 0,
      filterFreq: 120,
      filterQ: 0.5,
      subLevel: 0.6,
      subFreq: 45,
    },
    ghostVelocity: 0.1,
    swing: 0.15,
  },
  
  // 4. EDM/Modern - heavy sub, compressed feel
  {
    name: 'EDM',
    description: 'Heavy sub with layered punch',
    pattern: 'four-on-floor',
    kick: {
      waveform: 'sine',
      startFreq: 200,
      endFreq: 35,
      pitchDecay: 0.05,
      attack: 0.001,
      decay: 0.25,
      distortion: 0.2,
      noiseAmount: 0.15,
      clickAmount: 0.5,
      filterFreq: 180,
      filterQ: 1.5,
      subLevel: 0.7,
      subFreq: 30,
    },
    ghostVelocity: 0.2,
    swing: 0.05,
  },
  
  // 5. Minimal - short, clicky, lots of space
  {
    name: 'Minimal',
    description: 'Short, clicky with space',
    pattern: 'sparse',
    kick: {
      waveform: 'triangle',
      startFreq: 120,
      endFreq: 55,
      pitchDecay: 0.03,
      attack: 0.002,
      decay: 0.12,
      distortion: 0.05,
      noiseAmount: 0.02,
      clickAmount: 0.6,
      filterFreq: 300,
      filterQ: 3,
      subLevel: 0.2,
      subFreq: 50,
    },
    ghostVelocity: 0.3,
    swing: 0.2,
  },
  
  // 6. Dark/Industrial - distorted, aggressive
  {
    name: 'Dark',
    description: 'Distorted, aggressive punch',
    pattern: 'broken',
    kick: {
      waveform: 'triangle',
      startFreq: 160,
      endFreq: 38,
      pitchDecay: 0.06,
      attack: 0.001,
      decay: 0.18,
      distortion: 0.6,
      noiseAmount: 0.25,
      clickAmount: 0.3,
      filterFreq: 250,
      filterQ: 4,
      subLevel: 0.5,
      subFreq: 32,
    },
    ghostVelocity: 0.35,
    swing: 0.08,
  },
  
  // 7. Lo-Fi - warm, saturated, wobbly
  {
    name: 'Lo-Fi',
    description: 'Warm, saturated, slight wobble',
    pattern: 'half-time',
    kick: {
      waveform: 'sine',
      startFreq: 130,
      endFreq: 48,
      pitchDecay: 0.1,
      attack: 0.008,
      decay: 0.35,
      distortion: 0.4,
      noiseAmount: 0.08,
      clickAmount: 0.1,
      filterFreq: 140,
      filterQ: 0.8,
      subLevel: 0.35,
      subFreq: 42,
    },
    ghostVelocity: 0.2,
    swing: 0.25,
  },
  
  // 8. Dub - deep, long tail, spacious
  {
    name: 'Dub',
    description: 'Deep kick with long tail',
    pattern: 'half-time',
    kick: {
      waveform: 'sine',
      startFreq: 110,
      endFreq: 35,
      pitchDecay: 0.12,
      attack: 0.01,
      decay: 0.6,
      distortion: 0.15,
      noiseAmount: 0.03,
      clickAmount: 0.05,
      filterFreq: 100,
      filterQ: 0.7,
      subLevel: 0.8,
      subFreq: 38,
    },
    ghostVelocity: 0.15,
    swing: 0.18,
  },
];

// Get a random drum kit
export function getRandomKit(): DrumKit {
  return DRUM_KITS[Math.floor(Math.random() * DRUM_KITS.length)];
}

// Get patterns based on kit type
export function getPattern(type: PatternType): boolean[] {
  // 16 steps (1 bar of 16th notes)
  switch (type) {
    case 'four-on-floor':
      // Kick on every beat (steps 0, 4, 8, 12)
      return [
        true, false, false, false,
        true, false, false, false,
        true, false, false, false,
        true, false, false, false,
      ];
    
    case 'half-time':
      // Kick on 1 and 3 (steps 0, 8)
      return [
        true, false, false, false,
        false, false, false, false,
        true, false, false, false,
        false, false, false, false,
      ];
    
    case 'broken':
      // Syncopated pattern
      return [
        true, false, false, false,
        false, false, true, false,
        false, false, true, false,
        true, false, false, false,
      ];
    
    case 'sparse':
      // Very minimal - just beat 1
      return [
        true, false, false, false,
        false, false, false, false,
        false, false, false, false,
        false, false, false, false,
      ];
    
    case 'driving':
      // Heavy - kick on every beat + some 8ths
      return [
        true, false, true, false,
        true, false, false, false,
        true, false, true, false,
        true, false, false, false,
      ];
    
    default:
      return getPattern('four-on-floor');
  }
}
