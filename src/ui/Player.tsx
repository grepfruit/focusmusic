import { useEffect, useState } from 'react';
import { useKeyboard } from '@opentui/react';

export interface TrackInfo {
  scale: string;
  root: number;
  bpm: number;
  kitName: string;
  synthName: string;
}

export interface PlayerProps {
  trackInfo: TrackInfo;
  trackLength: number; // seconds
  onNext: () => void;
  onQuit: () => void;
  isTransitioning: boolean;
  isQuitting: boolean;
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

export function Player({ 
  trackInfo, 
  trackLength, 
  onNext, 
  onQuit,
  isTransitioning,
  isQuitting,
}: PlayerProps) {
  const [elapsed, setElapsed] = useState(0);
  
  // Update elapsed time every second
  useEffect(() => {
    if (isTransitioning) return;
    
    const interval = setInterval(() => {
      setElapsed((e: number) => {
        const newElapsed = e + 1;
        // Auto-advance when track ends
        if (newElapsed >= trackLength) {
          onNext();
          return 0;
        }
        return newElapsed;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTransitioning, trackLength, onNext]);
  
  // Reset elapsed when track changes
  useEffect(() => {
    setElapsed(0);
  }, [trackInfo.kitName, trackInfo.scale]);
  
  // Handle keyboard
  useKeyboard((key) => {
    // Don't handle keys during transitions or quitting
    if (isTransitioning || isQuitting) return;
    
    if (key.name === 'q' || key.name === 'escape') {
      onQuit();
    } else if (key.name === 'n' || key.name === 'space') {
      onNext();
    }
  });
  
  const remaining = Math.max(0, trackLength - elapsed);
  const progress = Math.min(1, elapsed / trackLength);
  
  // Progress bar (40 chars wide)
  const barWidth = 38;
  const filledWidth = Math.floor(progress * barWidth);
  const progressBar = '━'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);
  
  const status = isQuitting ? 'Stopping...' : isTransitioning ? 'Switching...' : 'Playing';
  const statusColor = isQuitting ? '#ef4444' : isTransitioning ? '#f59e0b' : '#22c55e';

  return (
    <box
      style={{
        flexDirection: 'column',
        border: true,
        borderStyle: 'single',
        borderColor: '#4a4a4a',
        padding: 1,
        width: 46,
      }}
    >
      {/* Header */}
      <box style={{ marginBottom: 1 }}>
        <text>
          <strong fg="#a78bfa">focusmusic</strong>
        </text>
      </box>
      
      {/* Divider */}
      <text fg="#4a4a4a">──────────────────────────────────────────</text>
      
      {/* Status */}
      <box style={{ marginTop: 1, marginBottom: 1 }}>
        <text>
          <span fg={statusColor}>▶</span>
          <span fg="#888"> {status}</span>
        </text>
      </box>
      
      {/* Track Info */}
      <box style={{ flexDirection: 'column', gap: 0 }}>
        <text>
          <span fg="#666">Scale:  </span>
          <span fg="#e2e8f0">{trackInfo.scale}</span>
        </text>
        <text>
          <span fg="#666">Root:   </span>
          <span fg="#e2e8f0">{midiToNoteName(trackInfo.root)}</span>
          <span fg="#555"> ({trackInfo.root})</span>
        </text>
        <text>
          <span fg="#666">BPM:    </span>
          <span fg="#e2e8f0">{trackInfo.bpm}</span>
        </text>
        <text>
          <span fg="#666">Kit:    </span>
          <span fg="#38bdf8">{trackInfo.kitName || 'Loading...'}</span>
        </text>
        <text>
          <span fg="#666">Synth:  </span>
          <span fg="#f472b6">{trackInfo.synthName || 'Loading...'}</span>
        </text>
      </box>
      
      {/* Progress */}
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text fg="#666">{progressBar}</text>
        <text>
          <span fg="#888">{formatTime(elapsed)}</span>
          <span fg="#555"> / </span>
          <span fg="#888">{formatTime(trackLength)}</span>
        </text>
      </box>
      
      {/* Controls */}
      <box style={{ marginTop: 1 }}>
        <text>
          <span fg="#555">[</span>
          <span fg="#a78bfa">n</span>
          <span fg="#555">] Next  [</span>
          <span fg="#a78bfa">q</span>
          <span fg="#555">] Quit</span>
        </text>
      </box>
    </box>
  );
}
