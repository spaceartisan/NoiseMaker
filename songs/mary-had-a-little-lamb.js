// Mary Had a Little Lamb
// Traditional melody

// Song metadata
const songInfo_maryLamb = {
  title: "Mary Had a Little Lamb",
  artist: "Traditional",
  description: "Simple melody with repeating pattern",
  bpm: 100
};

// Instrument IDs: 1=Piano, 2=Sine, 3=Sawtooth, 4=Square, 5=Triangle
const instrument_maryLamb = [
  // Mary had a little lamb
  1,1,1,1,1,1,1,
  // Little lamb, little lamb
  1,1,1,1,1,1,0,
  // Mary had a little lamb
  1,1,1,1,1,1,1,
  // Its fleece was white as snow
  1,1,1,1,1,1,1,1
];

// Note lengths: 1=whole, 2=half, 3=triplet, 4=quarter, 8=eighth, 16=sixteenth
const length_maryLamb = [
  // Mary had a little lamb
  4,4,4,4,4,4,2,
  // Little lamb, little lamb
  4,4,2,4,4,2,4,
  // Mary had a little lamb
  4,4,4,4,4,4,4,
  // Its fleece was white as snow
  4,4,4,4,4,4,4,1
];

// Piano keys: 0=rest, 1=A0, 52=C4 (middle C)
const key_maryLamb = [
  // E D C D E E E
  56,54,52,54,56,56,56,
  // D D D E G G
  54,54,54,56,59,59,0,
  // E D C D E E E
  56,54,52,54,56,56,56,
  // E D D E D C
  56,54,54,56,54,52,0,0
];

// Register this song
if (typeof window !== 'undefined' && !window.CUSTOM_SONGS) {
  window.CUSTOM_SONGS = {};
}
if (typeof window !== 'undefined') {
  window.CUSTOM_SONGS['mary-had-a-little-lamb'] = {
    songInfo: songInfo_maryLamb,
    instrument: instrument_maryLamb,
    length: length_maryLamb,
    key: key_maryLamb
  };
}
