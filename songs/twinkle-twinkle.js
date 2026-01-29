// Twinkle Twinkle Little Star
// Traditional melody

// Song metadata
const songInfo_twinkleTwinkle = {
  title: "Twinkle Twinkle Little Star",
  artist: "Traditional",
  description: "Classic children's melody in C major",
  bpm: 120 // Default tempo
};

// Instrument IDs: 1=Piano, 2=Sine, 3=Sawtooth, 4=Square, 5=Triangle
const instrument_twinkleTwinkle = [
  // C C G G A A G
  1,1,1,1,1,1,1,
  // F F E E D D C
  1,1,1,1,1,1,1,
  // G G F F E E D
  1,1,1,1,1,1,1,
  // G G F F E E D
  1,1,1,1,1,1,1,
  // C C G G A A G
  1,1,1,1,1,1,1,
  // F F E E D D C
  1,1,1,1,1,1,1
];

// Note lengths: 1=whole, 2=half, 3=triplet, 4=quarter, 8=eighth, 16=sixteenth
const length_twinkleTwinkle = [
  // C C G G A A G
  4,4,4,4,4,4,2,
  // F F E E D D C
  4,4,4,4,4,4,2,
  // G G F F E E D
  4,4,4,4,4,4,2,
  // G G F F E E D
  4,4,4,4,4,4,2,
  // C C G G A A G
  4,4,4,4,4,4,2,
  // F F E E D D C
  4,4,4,4,4,4,1
];

// Piano keys: 0=rest, 1=A0 (27.5Hz), 88=C8 (4186Hz)
// Middle C (C4) = key 52
const key_twinkleTwinkle = [
  // C C G G A A G
  52,52,59,59,61,61,59,
  // F F E E D D C
  57,57,56,56,54,54,52,
  // G G F F E E D
  59,59,57,57,56,56,54,
  // G G F F E E D
  59,59,57,57,56,56,54,
  // C C G G A A G
  52,52,59,59,61,61,59,
  // F F E E D D C
  57,57,56,56,54,54,52
];

// Register this song
if (typeof window !== 'undefined' && !window.CUSTOM_SONGS) {
  window.CUSTOM_SONGS = {};
}
if (typeof window !== 'undefined') {
  window.CUSTOM_SONGS['twinkle-twinkle'] = {
    songInfo: songInfo_twinkleTwinkle,
    instrument: instrument_twinkleTwinkle,
    length: length_twinkleTwinkle,
    key: key_twinkleTwinkle
  };
}
