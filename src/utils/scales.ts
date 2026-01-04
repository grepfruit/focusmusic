// Musical scales and utilities

// All scales defined as semitone intervals from root
export const SCALES = {
  // Pentatonics - great for ambient, hard to sound "wrong"
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  
  // Modes - different moods
  dorian: [0, 2, 3, 5, 7, 9, 10],      // jazzy, sophisticated
  phrygian: [0, 1, 3, 5, 7, 8, 10],    // dark, spanish
  lydian: [0, 2, 4, 6, 7, 9, 11],      // dreamy, floating
  mixolydian: [0, 2, 4, 5, 7, 9, 10],  // bluesy, relaxed
  aeolian: [0, 2, 3, 5, 7, 8, 10],     // natural minor, melancholic
  locrian: [0, 1, 3, 5, 6, 8, 10],     // tense, unstable
  
  // Exotic scales
  hirajoshi: [0, 2, 3, 7, 8],          // Japanese
  insen: [0, 1, 5, 7, 10],             // Japanese, melancholic
  iwato: [0, 1, 5, 6, 10],             // Japanese, dark
  wholetone: [0, 2, 4, 6, 8, 10],      // dreamy, impressionist
  diminished: [0, 2, 3, 5, 6, 8, 9, 11], // tension, mystery
  
  // Ambient favorites
  suspended: [0, 2, 5, 7, 9],          // no third, open feeling
  prometheus: [0, 2, 4, 6, 9, 10],     // Scriabin's mystic chord
} as const;

export type ScaleName = keyof typeof SCALES;

// Note names for reference
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert MIDI note to frequency
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert frequency to MIDI note
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

// Get note name from MIDI
export function midiToName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

// Generate scale notes as MIDI values
export function getScaleNotes(
  root: number,       // MIDI root note (e.g., 60 = C4)
  scale: number[],    // Scale intervals
  octaves: number = 2 // How many octaves to span
): number[] {
  const notes: number[] = [];
  for (let octave = 0; octave < octaves; octave++) {
    for (const interval of scale) {
      notes.push(root + octave * 12 + interval);
    }
  }
  return notes;
}

// Get chord tones (1st, 3rd, 5th, 7th) from scale
export function getChordTones(
  root: number,
  scale: number[]
): number[] {
  // For pentatonic/shorter scales, just use 1st, 3rd, 5th
  if (scale.length <= 5) {
    return [
      root + scale[0],
      root + scale[2],
      root + scale[4 % scale.length],
    ];
  }
  // For full scales, use 1st, 3rd, 5th, 7th
  return [
    root + scale[0],
    root + scale[2],
    root + scale[4],
    root + scale[6 % scale.length],
  ];
}

// Suggest good root notes for ambient music (avoiding too low/high)
export const AMBIENT_ROOTS = {
  bass: [36, 38, 40, 41, 43],     // C2-G2 range
  low: [48, 50, 52, 53, 55],      // C3-G3 range  
  mid: [60, 62, 64, 65, 67],      // C4-G4 range
  high: [72, 74, 76, 77, 79],     // C5-G5 range
};

// Musical intervals in semitones
export const INTERVALS = {
  unison: 0,
  minorSecond: 1,
  majorSecond: 2,
  minorThird: 3,
  majorThird: 4,
  perfectFourth: 5,
  tritone: 6,
  perfectFifth: 7,
  minorSixth: 8,
  majorSixth: 9,
  minorSeventh: 10,
  majorSeventh: 11,
  octave: 12,
};
