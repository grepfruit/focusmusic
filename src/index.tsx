#!/usr/bin/env bun
import { parseArgs } from 'util';
import { useState, useEffect, useCallback } from 'react';
import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { Engine, type EngineConfig } from './engine';
import { PadLayer } from './layers/pad';
import { ArpLayer } from './layers/arp';
import { BeatLayer } from './layers/beat';
import { TextureLayer } from './layers/texture';
import { Player, type TrackInfo } from './ui/Player';

// Track length range (8-15 minutes, randomized per track)
const MIN_TRACK_LENGTH = 8 * 60;  // 8 minutes
const MAX_TRACK_LENGTH = 15 * 60; // 15 minutes

function getRandomTrackLength(): number {
  return Math.floor(MIN_TRACK_LENGTH + Math.random() * (MAX_TRACK_LENGTH - MIN_TRACK_LENGTH));
}

function printHelp() {
  console.log(`
  focusmusic - deep generative electronic music

  Usage: focusmusic [options]

  Options:
    --bpm <number>      Set tempo (70-120, default: 88)
    --volume <number>   Master volume (0-100, default: 75)
    --help, -h          Show this help message

  Controls:
    n / Space           Next track
    q / Escape          Quit

  Examples:
    focusmusic              # Start with default settings
    focusmusic --bpm 95     # Slightly faster tempo
    focusmusic --volume 50  # Quieter for background listening
  `);
}

// Audio layer management
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

// Main App component
interface AppProps {
  config: Partial<EngineConfig>;
  onQuit: () => void;
}

function App({ config, onQuit }: AppProps) {
  const [layers, setLayers] = useState<AudioLayers | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo>({
    scale: '',
    root: 0,
    bpm: 88,
    kitName: '',
    synthName: '',
  });
  const [trackLength, setTrackLength] = useState(getRandomTrackLength());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const newLayers = createLayers(config);
    setLayers(newLayers);
    
    // Set initial track info
    setTrackInfo({
      scale: newLayers.engine.state.scaleName,
      root: newLayers.engine.state.root,
      bpm: newLayers.engine.config.bpm,
      kitName: newLayers.engine.state.kitName,
      synthName: newLayers.engine.state.synthName,
    });

    return () => {
      // Cleanup on unmount
      stopLayers(newLayers);
    };
  }, []);

  // Update kit and synth names after layers set them
  useEffect(() => {
    if (!layers) return;
    
    // Small delay to let layers set their names
    const timeout = setTimeout(() => {
      setTrackInfo(prev => ({
        ...prev,
        kitName: layers.engine.state.kitName,
        synthName: layers.engine.state.synthName,
      }));
    }, 100);

    return () => clearTimeout(timeout);
  }, [layers]);



  const handleNext = useCallback(async () => {
    if (isTransitioning || !layers) return;
    
    setIsTransitioning(true);
    
    // Stop current layers
    await stopLayers(layers);
    
    // Create new layers
    const newLayers = createLayers(config);
    setLayers(newLayers);
    
    // Update track info
    setTrackInfo({
      scale: newLayers.engine.state.scaleName,
      root: newLayers.engine.state.root,
      bpm: newLayers.engine.config.bpm,
      kitName: '', // Will be set after beat layer initializes
      synthName: '', // Will be set after arp layer initializes
    });
    
    // New random track length
    setTrackLength(getRandomTrackLength());
    
    // Small delay for kit/synth names
    setTimeout(() => {
      setTrackInfo(prev => ({
        ...prev,
        kitName: newLayers.engine.state.kitName,
        synthName: newLayers.engine.state.synthName,
      }));
    }, 100);
    
    setIsTransitioning(false);
  }, [isTransitioning, layers, config]);

  const handleQuit = useCallback(() => {
    // Set quitting state to show proper status
    setIsQuitting(true);
    
    // Stop layers in background, then quit
    if (layers) {
      stopLayers(layers).then(() => {
        onQuit();
      });
    } else {
      onQuit();
    }
  }, [layers, onQuit]);

  return (
    <Player
      trackInfo={trackInfo}
      trackLength={trackLength}
      onNext={handleNext}
      onQuit={handleQuit}
      isTransitioning={isTransitioning}
      isQuitting={isQuitting}
    />
  );
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      bpm: { type: 'string' },
      volume: { type: 'string' },
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

  // Create OpenTUI renderer
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  let isQuitting = false;

  const quit = () => {
    if (isQuitting) return;
    isQuitting = true;
    
    // Give time for audio fade out, then exit
    setTimeout(() => {
      // Properly cleanup renderer before exit (restores terminal state)
      renderer.destroy();
      process.exit(0);
    }, 3000);
  };

  // Handle Ctrl+C directly at process level as backup
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);

  // Render the app
  createRoot(renderer).render(
    <App config={config} onQuit={quit} />
  );
}

main();
