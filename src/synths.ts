/**
 * Synth Presets - Different sonic characters for the arp layer
 * 
 * Each preset defines synthesis parameters for melodic sounds.
 * Randomly selected per track to provide variety.
 */

export type OscillatorShape = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface OscillatorLayer {
  waveform: OscillatorShape;
  detuneRange: number;      // Random detune range in cents
  gainMultiplier: number;   // Relative volume (0-1)
  octaveOffset: number;     // Octave shift (-2, -1, 0, 1, 2)
}

export interface SynthPreset {
  name: string;
  description: string;
  
  // Oscillator layers (multiple for thickness)
  oscillators: OscillatorLayer[];
  
  // Amplitude envelope (seconds)
  attack: number;
  decay: number;
  sustain: number;    // 0-1 multiplier
  release: number;
  
  // Filter
  filterType: 'lowpass' | 'bandpass' | 'highpass';
  filterFreqStart: number;   // Starting frequency
  filterFreqEnd: number;     // End frequency after envelope
  filterQ: number;
  filterAttack: number;      // Time to reach end freq
  filterDecay: number;       // Time to settle
  
  // Character
  distortion: number;        // 0 = none, 1 = heavy
  reverbSend: number;        // 0-1, how much reverb
  
  // Note behavior
  noteDuration: number;      // Multiplier of step duration (0.5 = staccato, 1.5 = legato)
  velocityRange: [number, number];  // Min/max velocity
  
  // Pattern density (probability of playing on each step)
  density: number;           // 0-1, lower = more rests
}

// Distortion curve for warmth
export function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = amount * 50;
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Soft clipping curve
    curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k);
  }
  
  return curve;
}

export const SYNTH_PRESETS: SynthPreset[] = [
  // 1. Warm Pad - thick, warm, background
  {
    name: 'Warm Pad',
    description: 'Thick detuned saws, very warm',
    oscillators: [
      { waveform: 'sawtooth', detuneRange: 15, gainMultiplier: 0.4, octaveOffset: 0 },
      { waveform: 'sawtooth', detuneRange: 15, gainMultiplier: 0.3, octaveOffset: 0 },
      { waveform: 'triangle', detuneRange: 5, gainMultiplier: 0.3, octaveOffset: -1 },
    ],
    attack: 0.08,
    decay: 0.2,
    sustain: 0.6,
    release: 0.4,
    filterType: 'lowpass',
    filterFreqStart: 300,
    filterFreqEnd: 1200,
    filterQ: 1,
    filterAttack: 0.1,
    filterDecay: 0.3,
    distortion: 0.15,
    reverbSend: 0.5,
    noteDuration: 1.2,
    velocityRange: [0.15, 0.25],
    density: 0.7,
  },

  // 2. Soft Pluck - gentle, piano-like
  {
    name: 'Soft Pluck',
    description: 'Gentle plucked sound',
    oscillators: [
      { waveform: 'triangle', detuneRange: 3, gainMultiplier: 0.5, octaveOffset: 0 },
      { waveform: 'sine', detuneRange: 2, gainMultiplier: 0.5, octaveOffset: 1 },
    ],
    attack: 0.005,
    decay: 0.3,
    sustain: 0.2,
    release: 0.5,
    filterType: 'lowpass',
    filterFreqStart: 2000,
    filterFreqEnd: 400,
    filterQ: 0.5,
    filterAttack: 0.01,
    filterDecay: 0.4,
    distortion: 0,
    reverbSend: 0.6,
    noteDuration: 0.8,
    velocityRange: [0.12, 0.22],
    density: 0.8,
  },

  // 3. Glassy Bell - clean, bell-like harmonics
  {
    name: 'Glassy',
    description: 'Clean, bell-like tones',
    oscillators: [
      { waveform: 'sine', detuneRange: 0, gainMultiplier: 0.6, octaveOffset: 0 },
      { waveform: 'sine', detuneRange: 0, gainMultiplier: 0.25, octaveOffset: 1 },
      { waveform: 'sine', detuneRange: 0, gainMultiplier: 0.15, octaveOffset: 2 },
    ],
    attack: 0.002,
    decay: 0.5,
    sustain: 0.1,
    release: 0.8,
    filterType: 'lowpass',
    filterFreqStart: 4000,
    filterFreqEnd: 1500,
    filterQ: 0.3,
    filterAttack: 0.01,
    filterDecay: 0.6,
    distortion: 0,
    reverbSend: 0.7,
    noteDuration: 1.0,
    velocityRange: [0.1, 0.18],
    density: 0.6,
  },

  // 4. Analog Lead - classic synth lead
  {
    name: 'Analog Lead',
    description: 'Classic detuned analog sound',
    oscillators: [
      { waveform: 'sawtooth', detuneRange: 8, gainMultiplier: 0.35, octaveOffset: 0 },
      { waveform: 'sawtooth', detuneRange: 8, gainMultiplier: 0.35, octaveOffset: 0 },
      { waveform: 'square', detuneRange: 5, gainMultiplier: 0.3, octaveOffset: 0 },
    ],
    attack: 0.02,
    decay: 0.15,
    sustain: 0.5,
    release: 0.25,
    filterType: 'lowpass',
    filterFreqStart: 400,
    filterFreqEnd: 2000,
    filterQ: 2,
    filterAttack: 0.05,
    filterDecay: 0.2,
    distortion: 0.2,
    reverbSend: 0.4,
    noteDuration: 0.9,
    velocityRange: [0.15, 0.28],
    density: 0.75,
  },

  // 5. Sub Pulse - deep, minimal
  {
    name: 'Sub Pulse',
    description: 'Deep, subby pulse',
    oscillators: [
      { waveform: 'sine', detuneRange: 0, gainMultiplier: 0.7, octaveOffset: -1 },
      { waveform: 'triangle', detuneRange: 3, gainMultiplier: 0.3, octaveOffset: 0 },
    ],
    attack: 0.01,
    decay: 0.2,
    sustain: 0.4,
    release: 0.3,
    filterType: 'lowpass',
    filterFreqStart: 200,
    filterFreqEnd: 600,
    filterQ: 1,
    filterAttack: 0.02,
    filterDecay: 0.15,
    distortion: 0.1,
    reverbSend: 0.2,
    noteDuration: 0.7,
    velocityRange: [0.2, 0.35],
    density: 0.5,
  },

  // 6. Shimmer - bright, airy
  {
    name: 'Shimmer',
    description: 'Bright, ethereal shimmer',
    oscillators: [
      { waveform: 'sawtooth', detuneRange: 20, gainMultiplier: 0.3, octaveOffset: 1 },
      { waveform: 'sawtooth', detuneRange: 20, gainMultiplier: 0.3, octaveOffset: 1 },
      { waveform: 'triangle', detuneRange: 10, gainMultiplier: 0.4, octaveOffset: 0 },
    ],
    attack: 0.1,
    decay: 0.3,
    sustain: 0.5,
    release: 0.6,
    filterType: 'bandpass',
    filterFreqStart: 1500,
    filterFreqEnd: 3000,
    filterQ: 0.8,
    filterAttack: 0.15,
    filterDecay: 0.4,
    distortion: 0.05,
    reverbSend: 0.8,
    noteDuration: 1.4,
    velocityRange: [0.08, 0.15],
    density: 0.6,
  },

  // 7. Muted Keys - soft, rhodes-like
  {
    name: 'Muted Keys',
    description: 'Soft electric piano feel',
    oscillators: [
      { waveform: 'sine', detuneRange: 2, gainMultiplier: 0.5, octaveOffset: 0 },
      { waveform: 'triangle', detuneRange: 4, gainMultiplier: 0.3, octaveOffset: 0 },
      { waveform: 'sine', detuneRange: 1, gainMultiplier: 0.2, octaveOffset: 1 },
    ],
    attack: 0.008,
    decay: 0.4,
    sustain: 0.25,
    release: 0.5,
    filterType: 'lowpass',
    filterFreqStart: 1800,
    filterFreqEnd: 500,
    filterQ: 0.7,
    filterAttack: 0.01,
    filterDecay: 0.5,
    distortion: 0.08,
    reverbSend: 0.5,
    noteDuration: 0.85,
    velocityRange: [0.12, 0.2],
    density: 0.7,
  },

  // 8. Hollow - empty, haunting
  {
    name: 'Hollow',
    description: 'Empty, haunting texture',
    oscillators: [
      { waveform: 'square', detuneRange: 12, gainMultiplier: 0.4, octaveOffset: 0 },
      { waveform: 'square', detuneRange: 12, gainMultiplier: 0.4, octaveOffset: 0 },
      { waveform: 'sine', detuneRange: 0, gainMultiplier: 0.2, octaveOffset: -1 },
    ],
    attack: 0.05,
    decay: 0.25,
    sustain: 0.35,
    release: 0.4,
    filterType: 'bandpass',
    filterFreqStart: 600,
    filterFreqEnd: 1200,
    filterQ: 3,
    filterAttack: 0.08,
    filterDecay: 0.3,
    distortion: 0.12,
    reverbSend: 0.6,
    noteDuration: 1.0,
    velocityRange: [0.1, 0.18],
    density: 0.55,
  },
];

// Special preset: NO ARP (just returns null)
export const NO_ARP_CHANCE = 0.15; // 15% chance of no arp

// Get a random synth preset (or null for no arp)
export function getRandomSynthPreset(): SynthPreset | null {
  if (Math.random() < NO_ARP_CHANCE) {
    return null;
  }
  return SYNTH_PRESETS[Math.floor(Math.random() * SYNTH_PRESETS.length)];
}
