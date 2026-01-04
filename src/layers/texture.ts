import {
  AudioBufferSourceNode,
  GainNode,
  BiquadFilterNode,
  AudioBuffer,
} from 'node-web-audio-api';
import type { Engine } from '../engine';
import type { ClockListener } from '../clock';
import { Modulator, ModPresets } from '../modulation';

/**
 * Texture Layer - Ambient noise atmosphere
 * 
 * Provides filtered noise for "air" and depth
 * Uses Perlin modulation for smooth filter sweeps
 */
export class TextureLayer implements ClockListener {
  private engine: Engine;
  private masterGain: GainNode;
  private filter: BiquadFilterNode;
  private noiseSource: AudioBufferSourceNode | null = null;
  
  // Modulation
  private filterMod: Modulator;
  private lastFilterUpdate = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    
    this.filterMod = new Modulator(ModPresets.glacial(600, 400));
    
    this.masterGain = new GainNode(engine.ctx, { gain: 0 });
    
    // Bandpass for "air" texture
    this.filter = new BiquadFilterNode(engine.ctx, {
      type: 'bandpass',
      frequency: 500,
      Q: 0.4,
    });
    
    this.filter.connect(this.masterGain);
    this.masterGain.connect(engine.getMainBus());
    
    // Start noise
    this.startNoise();
    
    // Very quiet fade in
    const now = engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.04, now + 8);
  }

  private createBrownNoiseBuffer(): AudioBuffer {
    const ctx = this.engine.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 10;
    const length = sampleRate * duration;
    
    const buffer = new AudioBuffer({
      numberOfChannels: 2,
      length,
      sampleRate,
    });
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0;
      
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5;
      }
    }
    
    return buffer;
  }

  private startNoise() {
    const ctx = this.engine.ctx;
    const buffer = this.createBrownNoiseBuffer();
    
    this.noiseSource = new AudioBufferSourceNode(ctx, {
      buffer,
      loop: true,
    });
    
    this.noiseSource.connect(this.filter);
    this.noiseSource.start();
  }

  // Called every tick - update filter smoothly
  onTick(tick: number, time: number) {
    // Only update every ~100ms to save CPU
    if (time - this.lastFilterUpdate < 0.1) return;
    this.lastFilterUpdate = time;
    
    const filterFreq = this.filterMod.getValue(time);
    this.filter.frequency.setValueAtTime(
      Math.max(150, Math.min(1200, filterFreq)),
      time
    );
  }

  stop() {
    const now = this.engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 3);
    
    setTimeout(() => {
      try {
        this.noiseSource?.stop();
      } catch {
        // Ignore - source may not have started
      }
    }, 3500);
  }
}
