#!/usr/bin/env bun
/**
 * Simple CLI version - NO OpenTUI dependency
 * Used to test if audio issues are related to OpenTUI or the audio engine itself.
 */

import { parseArgs } from 'util';
import * as readline from 'readline';
import { Engine, type EngineConfig } from './engine';
import { PadLayer } from './layers/pad';
import { ArpLayer } from './layers/arp';
import { BeatLayer } from './layers/beat';
import { TextureLayer } from './layers/texture';
import { logDiagnostics } from './diagnostics';

// Track length range (8-15 minutes, randomized per track)
const MIN_TRACK_LENGTH = 8 * 60;
const MAX_TRACK_LENGTH = 15 * 60;

function getRandomTrackLength(): number {
  return Math.floor(MIN_TRACK_LENGTH + Math.random() * (MAX_TRACK_LENGTH - MIN_TRACK_LENGTH));
}

// Convert MIDI note to readable name
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function printHelp() {
  console.log(`
  focusmusic (simple mode) - deep generative electronic music

  Usage: bun run src/simple.ts [options]

  Options:
    --bpm <number>      Set tempo (70-120, default: 88)
    --volume <number>   Master volume (0-100, default: 75)
    --debug             Show node/memory diagnostics every 5s
    --help, -h          Show this help message

  Controls:
    n           Next track
    q           Quit

  Examples:
    bun run src/simple.ts              # Start with default settings
    bun run src/simple.ts --bpm 95     # Slightly faster tempo
  `);
}

interface AudioLayers {
  engine: Engine;
  pad: PadLayer;
  texture: TextureLayer;
  arp: ArpLayer;
  beat: BeatLayer;
}

function createLayers(config: Partial<EngineConfig>): AudioLayers {
  const engine = new Engine(config);

  const pad = new PadLayer(engine);
  engine.registerLayer(pad);

  const texture = new TextureLayer(engine);
  engine.registerLayer(texture);

  const arp = new ArpLayer(engine);
  engine.registerLayer(arp);

  const beat = new BeatLayer(engine);
  engine.registerLayer(beat);

  engine.start();

  return { engine, pad, texture, arp, beat };
}

function stopLayers(layers: AudioLayers): Promise<void> {
  return new Promise((resolve) => {
    layers.pad.stop();
    layers.texture.stop();
    layers.arp.stop();
    layers.beat.stop();
    layers.engine.stop();
    
    setTimeout(resolve, 2500);
  });
}

function printTrackInfo(layers: AudioLayers, trackLength: number) {
  const state = layers.engine.state;
  const config = layers.engine.config;
  
  console.log('\n----------------------------------------');
  console.log('  focusmusic - simple mode');
  console.log('----------------------------------------');
  console.log(`  Scale:    ${state.scaleName}`);
  console.log(`  Root:     ${midiToNoteName(state.root)} (${state.root})`);
  console.log(`  BPM:      ${config.bpm}`);
  console.log(`  Kit:      ${state.kitName || 'Loading...'}`);
  console.log(`  Synth:    ${state.synthName || 'Loading...'}`);
  console.log(`  Length:   ${formatTime(trackLength)}`);
  console.log('----------------------------------------');
  console.log('  Controls: [n] Next  [q] Quit');
  console.log('----------------------------------------\n');
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      bpm: { type: 'string' },
      volume: { type: 'string' },
      debug: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const config: Partial<EngineConfig> = {};

  if (values.bpm) {
    const bpm = parseInt(values.bpm, 10);
    if (isNaN(bpm) || bpm < 70 || bpm > 120) {
      console.error('Error: BPM must be between 70 and 120');
      process.exit(1);
    }
    config.bpm = bpm;
  }

  if (values.volume) {
    const volume = parseInt(values.volume, 10);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      console.error('Error: Volume must be between 0 and 100');
      process.exit(1);
    }
    config.volume = volume;
  }

  // Create initial layers
  let layers = createLayers(config);
  let trackLength = getRandomTrackLength();
  let startTime = Date.now();
  let isQuitting = false;

  // Print initial info (with small delay for layer names to populate)
  setTimeout(() => {
    printTrackInfo(layers, trackLength);
  }, 150);

  // Setup raw keyboard input
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Diagnostics interval - log every 5 seconds (only if --debug flag is set)
  let diagInterval: ReturnType<typeof setInterval> | undefined;
  if (values.debug) {
    diagInterval = setInterval(() => {
      if (isQuitting) return;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      logDiagnostics(elapsed);
    }, 5000);
  }

  // Progress update interval
  const progressInterval = setInterval(() => {
    if (isQuitting) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, trackLength - elapsed);
    
    // Simple progress line (overwrites itself)
    process.stdout.write(`\r  Playing: ${formatTime(elapsed)} / ${formatTime(trackLength)}  `);
    
    // Auto-advance when track ends
    if (elapsed >= trackLength) {
      handleNext();
    }
  }, 1000);

  async function handleNext() {
    if (isQuitting) return;
    
    console.log('\n\n  Switching track...\n');
    
    await stopLayers(layers);
    
    layers = createLayers(config);
    trackLength = getRandomTrackLength();
    startTime = Date.now();
    
    setTimeout(() => {
      printTrackInfo(layers, trackLength);
    }, 150);
  }

  async function handleQuit() {
    if (isQuitting) return;
    isQuitting = true;
    
    clearInterval(progressInterval);
    if (diagInterval) clearInterval(diagInterval);
    console.log('\n\n  Stopping...\n');
    
    await stopLayers(layers);
    
    // Restore terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    console.log('  Goodbye!\n');
    process.exit(0);
  }

  // Handle keypresses
  process.stdin.on('keypress', (str, key) => {
    if (isQuitting) return;
    
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      handleQuit();
    } else if (key.name === 'n' || key.name === 'space') {
      handleNext();
    }
  });

  // Handle process signals
  process.on('SIGINT', handleQuit);
  process.on('SIGTERM', handleQuit);
}

main();
