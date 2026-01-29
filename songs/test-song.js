// Twinkle Twinkle Little Star
// Traditional melody

// Song metadata
const songInfo_testSong = {
  title: "Test Song",
  artist: "Test",
  description: "Test song for debugging purposes",
  bpm: 200 // Default tempo
};

// Instrument IDs: 1=Piano, 2=Sine, 3=Sawtooth, 4=Square, 5=Triangle
const instrument_testSong = [
  // B B B B B
  1,1,1,1,1,
  // B B B B B
  1,1,1,1,1,
  // E E E E E
    1,1,1,1,1,
    // D D D D D
    1,1,1,1,1,
    // A
    1,
    // B B B B B
  1,1,1,1,1,
  // B B B B B
  1,1,1,1,1,
  // D D D D D
    1,
    // B B B B B
  1,1,1,1,1,
  // D D D D D
    1,1,1,1,1,
];

// Note lengths: 1=whole, 2=half, 3=triplet, 4=quarter, 8=eighth, 16=sixteenth
const length_testSong = [
  // B B B B B
  8,8,8,8,4,
  // B B B B B
  8,8,8,8,4,
  // E E E E E
  8,8,8,8,4,
    // D D D D D
    8,8,8,8,4,
    // A
    4,
    // B B B B B
  8,8,8,8,4,
  // B B B B B
  8,8,8,8,4,
  // E
    4,
    // B B B B B
  8,8,8,8,4,
  // D D D D D
    8,8,8,8,4,
];

// Piano keys: 0=rest, 1=A0 (27.5Hz), 88=C8 (4186Hz)
// Middle C (C4) = key 52
const key_testSong = [
  // B B B B B
  51,51,51,51,51,
  // B B B B B
  51,51,51,51,51,
  // E E E E E
  56,56,56,56,56,
  // D D D D D
  54,54,54,54,54,
  // A
    49,
// B B B B B
  51,51,51,51,51,
  // B B B B B
  51,51,51,51,51,
  // E
  56,
  // B B B B B
  51,51,51,51,51,
  // B B B B B
  51,51,51,51,51,
];

// Register this song
if (typeof window !== 'undefined' && !window.CUSTOM_SONGS) {
  window.CUSTOM_SONGS = {};
}
if (typeof window !== 'undefined') {
  window.CUSTOM_SONGS['test-song'] = {
    songInfo: songInfo_testSong,
    instrument: instrument_testSong,
    length: length_testSong,
    key: key_testSong
  };
}
