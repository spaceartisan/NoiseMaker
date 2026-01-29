# Custom Songs

This folder contains custom song files that can be played in NoiseMaker.

## Song File Format

Each song is a JavaScript file with the following structure:

```javascript
// Song metadata
const songInfo_yourSong = {
  title: "Song Title",
  artist: "Artist Name",
  description: "Brief description shown in status",
  bpm: 120 // Default tempo (beats per minute)
};

// Four arrays that must have the same length:

// 1. Instrument IDs (which instrument plays each note)
const instrument_yourSong = [
  1, 2, 1, 3, // etc...
];

// 2. Note lengths (duration of each note)
const length_yourSong = [
  4, 4, 2, 8, // etc...
];

// 3. Piano keys (which note to play)
const key_yourSong = [
  52, 54, 56, 59, // etc...
];

// Register the song (IMPORTANT!)
if (typeof window !== 'undefined' && !window.CUSTOM_SONGS) {
  window.CUSTOM_SONGS = {};
}
if (typeof window !== 'undefined') {
  window.CUSTOM_SONGS['your-song-id'] = {
    songInfo: songInfo_yourSong,
    instrument: instrument_yourSong,
    length: length_yourSong,
    key: key_yourSong
  };
}
```

**Important:** Use unique variable names for each song (append song name) to avoid conflicts!

## Instrument IDs

- `0` - Rest/silence (no sound)
- `1` - Piano (warm, with attack envelope)
- `2` - Sine (pure tone)
- `3` - Sawtooth (bright, buzzy)
- `4` - Square (hollow, retro)
- `5` - Triangle (mellow, flute-like)

## Note Lengths

Based on standard music notation:
- `1` - Whole note (4 beats)
- `2` - Half note (2 beats)
- `3` - Triplet (2/3 beat)
- `4` - Quarter note (1 beat) **← Most common**
- `8` - Eighth note (1/2 beat)
- `16` - Sixteenth note (1/4 beat)

## Piano Keys

88-key piano keyboard mapping:
- `0` - Rest (silence, no note)
- `1` - A0 (27.5 Hz, lowest note)
- `52` - C4 (Middle C, 261.63 Hz) **← Reference point**
- `88` - C8 (4186 Hz, highest note)

### Common Notes (4th Octave)

- `52` - C4 (Middle C)
- `54` - D4
- `56` - E4
- `57` - F4
- `59` - G4
- `61` - A4 (440 Hz, concert pitch)
- `63` - B4

**Note:** Add 12 for each octave up, subtract 12 for each octave down.

## Example: Twinkle Twinkle Little Star

```javascript
const songInfo_twinkleTwinkle = {
  title: "Twinkle Twinkle Little Star",
  artist: "Traditional",
  description: "Classic children's melody in C major",
  bpm: 120
};

const instrument_twinkleTwinkle = [
  // C C G G A A G (all piano)
  1,1,1,1,1,1,1,
  // F F E E D D C
  1,1,1,1,1,1,1
];

const length_twinkleTwinkle = [
  // Quarter notes except last two notes (half, whole)
  4,4,4,4,4,4,2,
  4,4,4,4,4,4,1
];

const key_twinkleTwinkle = [
  // C C G G A A G
  52,52,59,59,61,61,59,
  // F F E E D D C
  57,57,56,56,54,54,52
];

// Register the song
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
```

## Adding Your Song

1. Create a new `.js` file in this folder
2. Use the format above with your melody (use unique variable names!)
3. Add a script tag to `index.html` BEFORE the app.js script:

```html
<!-- Load custom song files -->
<script src="songs/twinkle-twinkle.js"></script>
<script src="songs/mary-had-a-little-lamb.js"></script>
<script src="songs/your-new-song.js"></script> <!-- Add this line -->

<!-- Main application -->
<script src="app.js"></script>
```

4. Reload the page - your song will appear in the "Custom Songs" dropdown

## Tips

- All three arrays (`instrument`, `length`, `key`) must be the same length
- Use `0` for the key to create rests (silence)
- Comments help organize your melody
- Test with different BPM values to find the right tempo
- Songs automatically loop if "Loop song" is enabled

## Music Theory Helper

**Major Scale (C Major):**
C=52, D=54, E=56, F=57, G=59, A=61, B=63, C=64

**Chromatic (all notes, C4 octave):**
- C=52, C#=53, D=54, D#=55, E=56, F=57
- F#=58, G=59, G#=60, A=61, A#=62, B=63

Have fun composing!
