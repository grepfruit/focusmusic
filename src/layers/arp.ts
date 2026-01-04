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
  type SynthPreset, 
  getRandomSynthPreset, 
  makeDistortionCurve 
} from '../synths';
import { nodeCounter } from '../diagnostics';

/**
 * Arp Layer - Hypnotic melodic patterns with varied synth sounds
 * 
 * Features:
 * - Multiple synth presets (warm pad, pluck, glassy, etc.)
 * - Layered oscillators with detuning for thickness
 * - Proper ADSR envelopes
 * - Filter envelopes for movement
 * - Optional distortion for warmth
 * - Some tracks may have NO arp at all
 */
export class ArpLayer implements ClockListener {
  private engine: Engine;
  private masterGain: GainNode;
  private filter: BiquadFilterNode;
  private distortion: WaveShaperNode | null = null;
  
  // Current synth preset (null = no arp this track)
  private preset: SynthPreset | null;
  
  // Fixed melodic pattern (MIDI note offsets from root)
  private pattern: (number | null)[] = [];
  private patternLength = 16;
  
  // Modulation
  private velocityMod: Modulator;
  private filterMod: Modulator;
  
  // State
  private phraseCount = 0;
  private isActive = true;

  constructor(engine: Engine) {
    this.engine = engine;
    
    // Select random synth preset (might be null)
    this.preset = getRandomSynthPreset();
    
    // Store synth name on engine for UI access
    engine.setSynthName(this.preset?.name ?? 'None');
    
    // If no preset, this layer is essentially disabled
    if (!this.preset) {
      this.isActive = false;
      this.masterGain = new GainNode(engine.ctx, { gain: 0 });
      this.filter = new BiquadFilterNode(engine.ctx);
      this.velocityMod = new Modulator(ModPresets.medium(0.5, 0.1));
      this.filterMod = new Modulator(ModPresets.slow(1000, 500));
      return;
    }
    
    // Perlin modulators for organic variation
    this.velocityMod = new Modulator(ModPresets.medium(
      (this.preset.velocityRange[0] + this.preset.velocityRange[1]) / 2,
      (this.preset.velocityRange[1] - this.preset.velocityRange[0]) / 2
    ));
    this.filterMod = new Modulator(ModPresets.slow(
      (this.preset.filterFreqStart + this.preset.filterFreqEnd) / 2,
      Math.abs(this.preset.filterFreqEnd - this.preset.filterFreqStart) / 3
    ));
    
    this.masterGain = new GainNode(engine.ctx, { gain: 0 });
    
    // Master filter
    this.filter = new BiquadFilterNode(engine.ctx, {
      type: this.preset.filterType,
      frequency: this.preset.filterFreqStart,
      Q: this.preset.filterQ,
    });
    
    // Optional distortion
    if (this.preset.distortion > 0) {
      this.distortion = new WaveShaperNode(engine.ctx, {
        curve: makeDistortionCurve(this.preset.distortion),
        oversample: '2x',
      });
      this.filter.connect(this.distortion);
      this.distortion.connect(this.masterGain);
    } else {
      this.filter.connect(this.masterGain);
    }
    
    this.masterGain.connect(engine.getMainBus());
    
    // Generate initial pattern
    this.generatePattern();
    
    // Fade in
    const now = engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.6, now + 6);
  }

  getSynthName(): string {
    return this.preset?.name ?? 'None';
  }

  private generatePattern() {
    if (!this.preset) return;
    
    const state = this.engine.state;
    const scale = state.scale;
    
    // Pattern templates - musical phrases
    const templates = [
      // Rising pattern
      [0, 2, 4, 2, 0, 2, 4, null, 0, 2, 4, 2, 0, null, null, null],
      // Up-down pattern  
      [0, 2, 4, 2, 0, null, 4, 2, 0, 2, 4, null, 0, 2, null, null],
      // Rhythmic pattern with rests
      [0, null, 2, null, 4, 2, 0, null, 0, null, 4, null, 2, 0, null, null],
      // Steady pulse
      [0, 2, 0, 4, 0, 2, 0, 4, 0, 2, 4, 2, 0, 4, 2, 0],
      // Sparse, minimal
      [0, null, null, 2, null, null, 4, null, 0, null, null, 2, null, 4, null, null],
      // Offbeat emphasis
      [null, 0, null, 2, null, 4, null, 2, null, 0, null, 4, null, 2, null, 0],
      // Very sparse
      [0, null, null, null, 2, null, null, null, 0, null, null, null, 4, null, null, null],
      // Pedal tone
      [0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 4, 0, 0],
    ];
    
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // Apply density - remove some notes based on preset density
    template = template.map(note => {
      if (note === null) return null;
      return Math.random() < this.preset!.density ? note : null;
    });
    
    // Convert template indices to actual scale notes
    this.pattern = template.map(idx => {
      if (idx === null) return null;
      const scaleDegree = idx % scale.length;
      const octaveOffset = Math.floor(idx / scale.length) * 12;
      return scale[scaleDegree] + octaveOffset;
    });
    
    this.patternLength = this.pattern.length;
  }

  private playNote(noteOffset: number, time: number) {
    if (!this.preset || !this.isActive) return;
    
    const ctx = this.engine.ctx;
    const state = this.engine.state;
    const preset = this.preset;
    
    // Note in higher octave for clarity (root + 2 octaves + offset)
    const baseNote = state.root + 24 + noteOffset;
    
    // Perlin-modulated velocity
    const velocity = Math.max(
      preset.velocityRange[0],
      Math.min(preset.velocityRange[1], this.velocityMod.getValue(time))
    );
    
    // Calculate note duration based on preset and clock
    const beatDuration = 60 / this.engine.config.bpm;
    const stepDuration = beatDuration / 4; // 16th note
    const noteDuration = stepDuration * preset.noteDuration;
    
    // Create per-note gain
    const noteGain = new GainNode(ctx, { gain: 0 });
    
    // Create per-note filter
    const noteFilter = new BiquadFilterNode(ctx, {
      type: preset.filterType,
      frequency: preset.filterFreqStart,
      Q: preset.filterQ,
    });
    
    // Create oscillators based on preset layers
    const oscillators: OscillatorNode[] = [];
    const layerGains: GainNode[] = [];
    
    for (const layer of preset.oscillators) {
      const note = baseNote + (layer.octaveOffset * 12);
      const freq = this.engine.noteToFreq(note);
      
      // Random detune within range
      const detune = (Math.random() - 0.5) * 2 * layer.detuneRange;
      
      const osc = new OscillatorNode(ctx, {
        type: layer.waveform,
        frequency: freq,
        detune,
      });
      
      // Individual gain for this oscillator layer
      const layerGain = new GainNode(ctx, { 
        gain: velocity * layer.gainMultiplier 
      });
      
      osc.connect(layerGain);
      layerGain.connect(noteFilter);
      oscillators.push(osc);
      layerGains.push(layerGain);
    }
    
    // Connect filter to note gain
    noteFilter.connect(noteGain);
    noteGain.connect(this.filter);
    
    // Track node creation: oscs + layerGains + noteFilter + noteGain
    const nodeCount = oscillators.length + layerGains.length + 2;
    nodeCounter.create(nodeCount);
    
    // Amplitude ADSR envelope
    const attack = preset.attack;
    const decay = preset.decay;
    const sustainLevel = velocity * preset.sustain;
    const release = preset.release;
    
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(velocity, time + attack);
    noteGain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
    
    // Hold at sustain, then release
    const releaseStart = time + noteDuration - release;
    if (releaseStart > time + attack + decay) {
      noteGain.gain.setValueAtTime(sustainLevel, releaseStart);
    }
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);
    
    // Filter envelope
    noteFilter.frequency.setValueAtTime(preset.filterFreqStart, time);
    noteFilter.frequency.linearRampToValueAtTime(
      preset.filterFreqEnd, 
      time + preset.filterAttack
    );
    noteFilter.frequency.linearRampToValueAtTime(
      (preset.filterFreqStart + preset.filterFreqEnd) / 2,
      time + preset.filterAttack + preset.filterDecay
    );
    
    // Start and stop oscillators
    oscillators.forEach(osc => {
      osc.start(time);
      osc.stop(time + noteDuration + 0.1);
    });
    
    // Schedule cleanup - disconnect all nodes after sound completes
    const cleanupDelay = (noteDuration + 0.2) * 1000; // ms, after release
    setTimeout(() => {
      oscillators.forEach(osc => osc.disconnect());
      layerGains.forEach(g => g.disconnect());
      noteFilter.disconnect();
      noteGain.disconnect();
      nodeCounter.cleanup(nodeCount);
    }, cleanupDelay);
  }

  // Called every tick (16th note)
  onTick(tick: number, time: number) {
    if (!this.preset || !this.isActive) return;
    
    const patternIndex = tick % this.patternLength;
    const noteOffset = this.pattern[patternIndex];
    
    if (noteOffset !== null) {
      this.playNote(noteOffset, time);
    }
    
    // Update master filter with Perlin modulation
    const filterFreq = this.filterMod.getValue(time);
    this.filter.frequency.setValueAtTime(
      Math.max(200, Math.min(4000, filterFreq)),
      time
    );
  }

  // Called every phrase - maybe regenerate pattern
  onPhrase(phrase: number, time: number) {
    if (!this.preset || !this.isActive) return;
    
    this.phraseCount++;
    
    // Change pattern every 8+ phrases (~3+ minutes)
    if (this.phraseCount >= 8 && Math.random() < 0.25) {
      this.phraseCount = 0;
      
      // Brief fade during transition
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, time);
      this.masterGain.gain.linearRampToValueAtTime(0.1, time + 2);
      
      setTimeout(() => {
        this.generatePattern();
        const now = this.engine.ctx.currentTime;
        this.masterGain.gain.setValueAtTime(0.1, now);
        this.masterGain.gain.linearRampToValueAtTime(0.6, now + 2);
      }, 2500);
    }
  }

  stop() {
    const now = this.engine.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 2);
  }
}
