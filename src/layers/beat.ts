import {
  OscillatorNode,
  GainNode,
  BiquadFilterNode,
  WaveShaperNode,
} from 'node-web-audio-api';
import type { Engine } from '../engine';
import type { ClockListener } from '../clock';
import { Modulator, ModPresets } from '../modulation';
import { 
  type DrumKit, 
  getRandomKit, 
  getPattern, 
  makeDistortionCurve 
} from '../kits';
import { nodeCounter } from '../diagnostics';

/**
 * Beat Layer - Varied kick drums with different sonic characters
 * 
 * Features:
 * - Multiple drum kit styles (deep house, techno, ambient, etc.)
 * - Different patterns per kit (four-on-floor, half-time, broken, etc.)
 * - Distortion, noise layers, and sub-bass for richness
 * - Sidechain ducking on kick hits
 * - Perlin-controlled ghost notes
 */
export class BeatLayer implements ClockListener {
  private engine: Engine;
  private masterGain: GainNode;
  
  // Current drum kit
  private kit: DrumKit;
  private pattern: boolean[];
  
  // Sub-bass drone
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode;
  
  // Distortion for character
  private distortion: WaveShaperNode;
  
  // Modulation for ghost notes
  private ghostMod: Modulator;

  constructor(engine: Engine) {
    this.engine = engine;
    
    // Select random drum kit
    this.kit = getRandomKit();
    this.pattern = getPattern(this.kit.pattern);
    
    // Store kit name on engine for UI access
    engine.setKitName(this.kit.name);
    
    this.ghostMod = new Modulator(ModPresets.slow(0.5, 0.3));
    
    this.masterGain = new GainNode(engine.ctx, { gain: 0 });
    
    // Distortion node
    this.distortion = new WaveShaperNode(engine.ctx, {
      curve: makeDistortionCurve(this.kit.kick.distortion),
      oversample: '2x',
    });
    
    // Post-distortion filter to tame harshness
    const postFilter = new BiquadFilterNode(engine.ctx, {
      type: 'lowpass',
      frequency: this.kit.kick.filterFreq,
      Q: this.kit.kick.filterQ,
    });
    
    this.distortion.connect(postFilter);
    postFilter.connect(this.masterGain);
    this.masterGain.connect(engine.getDrumBus());
    
    // Sub gain for continuous sub-bass
    this.subGain = new GainNode(engine.ctx, { gain: 0 });
    this.subGain.connect(engine.getDrumBus());
    
    // Start sub-bass drone
    this.startSubBass();
    
    // Fade in
    const now = engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.7, now + 4);
    this.subGain.gain.setValueAtTime(0, now);
    this.subGain.gain.linearRampToValueAtTime(this.kit.kick.subLevel * 0.2, now + 4);
  }

  getKitName(): string {
    return this.kit.name;
  }

  private startSubBass() {
    const ctx = this.engine.ctx;
    const subFreq = this.kit.kick.subFreq;
    
    this.subOsc = new OscillatorNode(ctx, {
      type: 'sine',
      frequency: subFreq,
    });
    
    const subFilter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: 80,
      Q: 1,
    });
    
    this.subOsc.connect(subFilter);
    subFilter.connect(this.subGain);
    this.subOsc.start();
  }

  private playKick(time: number, velocity: number = 0.5) {
    const ctx = this.engine.ctx;
    const kick = this.kit.kick;
    
    // Main oscillator
    const osc = new OscillatorNode(ctx, {
      type: kick.waveform,
      frequency: kick.startFreq,
    });
    
    const kickGain = new GainNode(ctx, { gain: 0 });
    
    // Track nodes
    nodeCounter.create(2); // osc + kickGain
    
    // Pitch envelope
    osc.frequency.setValueAtTime(kick.startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(kick.endFreq, time + kick.pitchDecay);
    
    // Amplitude envelope - ramp to 0 at end to avoid clicks
    kickGain.gain.setValueAtTime(0, time);
    kickGain.gain.linearRampToValueAtTime(velocity, time + kick.attack);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + kick.decay - 0.005);
    kickGain.gain.linearRampToValueAtTime(0, time + kick.decay);
    
    osc.connect(kickGain);
    kickGain.connect(this.distortion);
    
    osc.start(time);
    osc.stop(time + kick.decay + 0.05);
    
    // Schedule cleanup
    const cleanupDelay = (kick.decay + 0.1) * 1000;
    setTimeout(() => {
      osc.disconnect();
      kickGain.disconnect();
      nodeCounter.cleanup(2);
    }, cleanupDelay);
    
    // Click transient layer
    if (kick.clickAmount > 0) {
      this.playClick(time, velocity * kick.clickAmount);
    }
    
    // Noise transient layer
    if (kick.noiseAmount > 0) {
      this.playNoiseTransient(time, velocity * kick.noiseAmount);
    }
    
    // Trigger sidechain ducking
    this.engine.triggerSidechain(time);
  }

  private playClick(time: number, velocity: number) {
    const ctx = this.engine.ctx;
    
    const clickOsc = new OscillatorNode(ctx, {
      type: 'triangle',
      frequency: 1200,
    });
    
    const clickGain = new GainNode(ctx, { gain: 0 });
    
    // Track nodes
    nodeCounter.create(2);
    
    // Very short click - ramp to 0 at end to avoid clicks
    clickGain.gain.setValueAtTime(0, time);
    clickGain.gain.linearRampToValueAtTime(velocity, time + 0.001);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.010);
    clickGain.gain.linearRampToValueAtTime(0, time + 0.012);
    
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain); // Bypass distortion for cleaner click
    
    clickOsc.start(time);
    clickOsc.stop(time + 0.02);
    
    // Schedule cleanup
    setTimeout(() => {
      clickOsc.disconnect();
      clickGain.disconnect();
      nodeCounter.cleanup(2);
    }, 50); // 50ms after start
  }

  private playNoiseTransient(time: number, velocity: number) {
    const ctx = this.engine.ctx;
    
    // Create noise burst using multiple detuned oscillators
    const noiseGain = new GainNode(ctx, { gain: 0 });
    
    const noiseFilter = new BiquadFilterNode(ctx, {
      type: 'bandpass',
      frequency: 200,
      Q: 2,
    });
    
    // Multiple oscillators for noise-like texture
    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < 4; i++) {
      const osc = new OscillatorNode(ctx, {
        type: 'sawtooth',
        frequency: 80 + Math.random() * 60,
        detune: (Math.random() - 0.5) * 200,
      });
      osc.connect(noiseFilter);
      oscs.push(osc);
    }
    
    // Track nodes: 4 oscs + noiseFilter + noiseGain
    nodeCounter.create(6);
    
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.distortion);
    
    // Short burst - ramp to 0 at end to avoid clicks
    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(velocity * 0.5, time + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    noiseGain.gain.linearRampToValueAtTime(0, time + 0.04);
    
    oscs.forEach(osc => {
      osc.start(time);
      osc.stop(time + 0.05);
    });
    
    // Schedule cleanup
    setTimeout(() => {
      oscs.forEach(osc => osc.disconnect());
      noiseFilter.disconnect();
      noiseGain.disconnect();
      nodeCounter.cleanup(6);
    }, 100); // 100ms after start
  }

  private playGhostKick(time: number) {
    const ctx = this.engine.ctx;
    const kick = this.kit.kick;
    const velocity = this.kit.ghostVelocity;
    
    const osc = new OscillatorNode(ctx, {
      type: 'sine',
      frequency: kick.endFreq * 1.5,
    });
    
    const gain = new GainNode(ctx, { gain: 0 });
    
    // Track nodes
    nodeCounter.create(2);
    
    osc.frequency.setValueAtTime(kick.endFreq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(kick.endFreq, time + 0.025);
    
    // Ghost kick envelope - ramp to 0 at end to avoid clicks
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.3, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
    gain.gain.linearRampToValueAtTime(0, time + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + 0.12);
    
    // Schedule cleanup
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
      nodeCounter.cleanup(2);
    }, 150); // 150ms after start
  }

  // Called every tick (16th note)
  onTick(tick: number, time: number) {
    const patternIndex = tick % this.pattern.length;
    
    // Apply swing
    let swingOffset = 0;
    if (this.kit.swing > 0 && patternIndex % 2 === 1) {
      // Delay off-beats slightly
      swingOffset = this.kit.swing * 0.02; // Up to 20ms swing
    }
    
    const actualTime = time + swingOffset;
    
    if (this.pattern[patternIndex]) {
      this.playKick(actualTime, 0.55);
    } else {
      // Ghost notes on certain positions
      const ghostChance = this.ghostMod.getNormalized(time);
      const isGhostPosition = patternIndex === 2 || patternIndex === 6 || 
                              patternIndex === 10 || patternIndex === 14;
      
      if (isGhostPosition && ghostChance > 0.55) {
        this.playGhostKick(actualTime);
      }
    }
  }

  // Pulse sub-bass on beat
  // Uses short ramp to avoid clicks from instant gain changes
  onBeat(beat: number, time: number) {
    const subLevel = this.kit.kick.subLevel * 0.2;
    const attackTime = 0.005; // 5ms attack to avoid clicks
    this.subGain.gain.setValueAtTime(subLevel, time);
    this.subGain.gain.linearRampToValueAtTime(subLevel * 1.3, time + attackTime);
    this.subGain.gain.linearRampToValueAtTime(subLevel, time + 0.3);
  }

  stop() {
    const now = this.engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 2);
    this.subGain.gain.setValueAtTime(this.subGain.gain.value, now);
    this.subGain.gain.linearRampToValueAtTime(0, now + 2);
    
    setTimeout(() => {
      try {
        this.subOsc?.stop();
      } catch {
        // Ignore - oscillator may not have started
      }
    }, 2500);
  }
}
