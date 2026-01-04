import {
  OscillatorNode,
  GainNode,
  BiquadFilterNode,
} from 'node-web-audio-api';
import type { Engine } from '../engine';
import type { ClockListener } from '../clock';
import { Modulator, ModPresets } from '../modulation';

/**
 * Pad Layer - Deep, warm sustained chords
 * 
 * - Holds one chord for a LONG time (60+ seconds)
 * - Movement comes from Perlin-modulated filter, not chord changes
 * - Multiple detuned oscillators for thickness
 * - Slow attack, very soft overall
 */
export class PadLayer implements ClockListener {
  private engine: Engine;
  private oscillators: OscillatorNode[] = [];
  private masterGain: GainNode;
  private filter: BiquadFilterNode;
  
  // Modulation
  private filterMod: Modulator;
  private detuneMod: Modulator;
  
  // State
  private currentChord: number[] = [];
  private phraseCount = 0;
  private lastFilterUpdate = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    
    // Perlin modulators
    this.filterMod = new Modulator(ModPresets.slow(700, 350));
    this.detuneMod = new Modulator(ModPresets.fast(0, 4));
    
    // Master gain for this layer
    this.masterGain = new GainNode(engine.ctx, { gain: 0 });
    
    // Warm lowpass filter
    this.filter = new BiquadFilterNode(engine.ctx, {
      type: 'lowpass',
      frequency: 600,
      Q: 0.8,
    });
    
    this.filter.connect(this.masterGain);
    this.masterGain.connect(engine.getMainBus());
    
    // Build initial chord and start oscillators
    this.buildChord();
    this.startOscillators();
    
    // Fade in
    const now = engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.35, now + 4);
  }

  private buildChord() {
    const state = this.engine.state;
    const root = state.root;
    const scale = state.scale;
    
    // Build a simple, stable chord: root + 3rd/4th + 5th
    // This gives us a solid foundation without too much complexity
    this.currentChord = [
      root,                           // Root
      root + scale[2],                // Third (or equivalent in scale)
      root + scale[Math.min(4, scale.length - 1)], // Fifth
      root + 12,                      // Octave
    ];
  }

  private startOscillators() {
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    
    // Stop existing oscillators
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.oscillators = [];
    
    // Create oscillators for each chord note
    this.currentChord.forEach((note, noteIndex) => {
      const baseFreq = this.engine.noteToFreq(note);
      
      // 3 oscillators per note: center + detuned pair
      const detunes = [0, -7, 7];
      
      detunes.forEach((detune, i) => {
        // Mix of waveforms for richness
        const type = i === 0 ? 'triangle' : 'sawtooth';
        
        const osc = new OscillatorNode(ctx, {
          type,
          frequency: baseFreq,
          detune,
        });
        
        // Individual gain for each oscillator
        const gain = new GainNode(ctx, { 
          gain: i === 0 ? 0.08 : 0.04  // Center louder than detuned
        });
        
        osc.connect(gain);
        gain.connect(this.filter);
        osc.start(now);
        
        this.oscillators.push(osc);
      });
    });
  }

  // Called every phrase (16 beats) - maybe change chord
  onPhrase(phrase: number, time: number) {
    this.phraseCount++;
    
    // Only change chord every 4-8 phrases (64-128 beats ≈ 45-90 seconds at 88bpm)
    if (this.phraseCount >= 6 && Math.random() < 0.3) {
      this.phraseCount = 0;
      
      // Subtle chord change: shift root by a scale degree
      const state = this.engine.state;
      const intervals = [0, 5, 7, -5]; // Unison, 4th up, 5th up, 4th down
      const interval = intervals[Math.floor(Math.random() * intervals.length)];
      
      if (interval !== 0) {
        // Crossfade to new chord
        const ctx = this.engine.ctx;
        
        // Fade out current
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, time);
        this.masterGain.gain.linearRampToValueAtTime(0.05, time + 4);
        
        // Schedule new chord
        setTimeout(() => {
          // Update root temporarily for this chord
          const newRoot = state.root + interval;
          const oldRoot = state.root;
          state.root = Math.max(36, Math.min(60, newRoot));
          
          this.buildChord();
          this.startOscillators();
          
          // Restore original root
          state.root = oldRoot;
          
          // Fade back in
          const now = this.engine.ctx.currentTime;
          this.masterGain.gain.setValueAtTime(0.05, now);
          this.masterGain.gain.linearRampToValueAtTime(0.35, now + 4);
        }, 4500);
      }
    }
  }

  // Called every tick - update filter with Perlin modulation
  onTick(tick: number, time: number) {
    // Only update filter every few ticks to save CPU
    if (time - this.lastFilterUpdate < 0.1) return;
    this.lastFilterUpdate = time;
    
    // Smooth filter movement via Perlin noise
    // Use setTargetAtTime for exponential smoothing to avoid clicks
    const filterFreq = this.filterMod.getValue(time);
    const smoothedFreq = Math.max(200, Math.min(1200, filterFreq));
    this.filter.frequency.setTargetAtTime(smoothedFreq, time, 0.05);
    
    // Subtle detune modulation on oscillators
    const detuneOffset = this.detuneMod.getValue(time);
    this.oscillators.forEach((osc, i) => {
      const baseDetune = i % 3 === 0 ? 0 : (i % 3 === 1 ? -7 : 7);
      osc.detune.setValueAtTime(baseDetune + detuneOffset, time);
    });
  }

  stop() {
    const now = this.engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 3);
    
    setTimeout(() => {
      this.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
    }, 3500);
  }
}
