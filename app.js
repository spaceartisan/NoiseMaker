/* eslint-disable no-console */

const ui = {
  toggleBtn: document.getElementById('toggleBtn'),
  panicBtn: document.getElementById('panicBtn'),
  statusText: document.getElementById('statusText'),
  engineText: document.getElementById('engineText'),
  sampleRateText: document.getElementById('sampleRateText'),

  sound: document.getElementById('sound'),
  soundVal: document.getElementById('soundVal'),
  freqControl: document.getElementById('freqControl'),
  frequency: document.getElementById('frequency'),
  frequencyVal: document.getElementById('frequencyVal'),

  bpmControl: document.getElementById('bpmControl'),
  bpm: document.getElementById('bpm'),
  bpmVal: document.getElementById('bpmVal'),

  loopControl: document.getElementById('loopControl'),
  loopSong: document.getElementById('loopSong'),

  melodyControl: document.getElementById('melodyControl'),
  melody: document.getElementById('melody'),
  melodyVal: document.getElementById('melodyVal'),

  volume: document.getElementById('volume'),
  volumeVal: document.getElementById('volumeVal'),
  masterVolume: document.getElementById('masterVolume'),
  masterVolumeVal: document.getElementById('masterVolumeVal'),
  brownNoiseEnable: document.getElementById('brownNoiseEnable'),
  brownNoiseMix: document.getElementById('brownNoiseMix'),
  brownNoiseMixVal: document.getElementById('brownNoiseMixVal'),
  cutoff: document.getElementById('cutoff'),
  cutoffVal: document.getElementById('cutoffVal'),
  filterHint: document.getElementById('filterHint'),

  vizMode: document.getElementById('vizMode'),
  vizHint: document.getElementById('vizHint'),

  scope: document.getElementById('scope'),
  levelText: document.getElementById('levelText'),
  secureContextBadge: document.getElementById('secureContextBadge'),
  themeSelector: document.getElementById('themeSelector'),
};

const state = {
  audioContext: null,

  // Main audio graph nodes
  sourceNode: null,
  sourceController: null,
  modGainNode: null,
  lfoOsc: null,
  lfoGain: null,
  gainNode: null,
  filterNode: null,
  analyserNode: null,
  
  // Master output and brown noise mixer
  masterGainNode: null,
  brownNoiseNode: null,
  brownNoiseController: null,
  brownNoiseGainNode: null,
  brownNoiseMixNode: null,

  engine: 'Not initialized',
  running: false,
  rafId: null,
};

function fmtHz(value) {
  const v = Math.max(0, Number(value) || 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`;
}

function fmtPct(value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return `${Math.round(v)}%`;
}

function setStatus(text) {
  ui.statusText.textContent = text;
}

function setEngine(text) {
  state.engine = text;
  ui.engineText.textContent = text;
}

const SOUND_PRESETS = {
  brown: {
    label: 'Brown noise',
    kind: 'noise',
    noiseType: 2,
    filter: { type: 'lowpass', frequency: 12000, q: 0.7 },
    mod: null,
    hint: 'Brown noise (~1/f²). Great for masking low rumble.',
  },
  pink: {
    label: 'Pink noise',
    kind: 'noise',
    noiseType: 1,
    filter: { type: 'lowpass', frequency: 14000, q: 0.7 },
    mod: null,
    hint: 'Pink noise (~1/f). More balanced to human ears.',
  },
  white: {
    label: 'White noise',
    kind: 'noise',
    noiseType: 0,
    filter: { type: 'lowpass', frequency: 16000, q: 0.7 },
    mod: null,
    hint: 'White noise (flat spectrum). Bright/hissy without filtering.',
  },
  ocean: {
    label: 'Ocean (modulated brown)',
    kind: 'noise',
    noiseType: 2,
    filter: { type: 'lowpass', frequency: 700, q: 0.7 },
    mod: { rate: 0.12, depth: 0.45 },
    hint: 'A simple “ocean-ish” effect: brown noise + slow amplitude swell.',
  },
  rain: {
    label: 'Rain (filtered white)',
    kind: 'noise',
    noiseType: 0,
    filter: { type: 'highpass', frequency: 1800, q: 0.7 },
    mod: { rate: 6.5, depth: 0.25 },
    hint: 'A simple “rain-ish” effect: filtered noise + light amplitude shimmer.',
  },
  wind: {
    label: 'Wind (modulated brown)',
    kind: 'noise',
    noiseType: 2,
    filter: { type: 'bandpass', frequency: 500, q: 0.4 },
    mod: { rate: 0.18, depth: 0.65 },
    hint: 'Wind-like sound: brown noise with bandpass filter and slow modulation.',
  },
  faucet: {
    label: 'Faucet (modulated white)',
    kind: 'noise',
    noiseType: 0,
    filter: { type: 'bandpass', frequency: 3500, q: 1.2 },
    mod: { rate: 2.8, depth: 0.85 },
    hint: 'Running water/faucet sound: bright noise with tight bandpass and fast modulation.',
  },
  waterStream: {
    label: 'Water Stream (modulated white)',
    kind: 'noise',
    noiseType: 0,
    filter: { type: 'bandpass', frequency: 2000, q: 0.8 },
    mod: { rate: 1.2, depth: 0.55 },
    hint: 'Flowing water stream: white noise with moderate bandpass and gentle flow modulation.',
  },
  sine: { label: 'Sine tone', kind: 'tone', wave: 'sine', hint: 'Pure tone.' },
  triangle: { label: 'Triangle tone', kind: 'tone', wave: 'triangle', hint: 'Softer harmonic tone.' },
  square: { label: 'Square tone', kind: 'tone', wave: 'square', hint: 'Buzzy harmonic tone.' },
  sawtooth: { label: 'Sawtooth tone', kind: 'tone', wave: 'sawtooth', hint: 'Bright harmonic tone.' },
  trance: {
    label: 'Trance demo (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 12000, q: 0.8 },
    hint: 'Original trance-style demo (not a recreation of any song).',
  },
  dwarven: {
    label: 'Dwarven Bridge (original cinematic)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 6500, q: 0.9 },
    hint: 'Original cinematic “dwarven bridge” vibe: drone + heavy drums (no copied themes).',
  },
  synthwave: {
    label: 'Synthwave Night Drive (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 12000, q: 0.8 },
    hint: 'Original synthwave song: drums + bass + pads + lead (with ending + optional loop).',
  },
  sovietwave: {
    label: 'Sovietwave Memory Tapes (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9000, q: 0.85 },
    hint: 'Original sovietwave-style track: nostalgic pads + tape wobble + restrained drums (with ending + optional loop).',
  },
  sovietRadio: {
    label: 'Soviet Radio (original sovietwave)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 8500, q: 0.88 },
    hint: 'Slower, melancholic sovietwave: tape crackle, distant broadcasts, fading memories.',
  },
  redSquare: {
    label: 'Red Square Nights (original sovietwave)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 8800, q: 0.86 },
    hint: 'Dark sovietwave: heavy bass, minor progressions, cold war atmosphere.',
  },
  factoryFloors: {
    label: 'Factory Floors (original sovietwave)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9200, q: 0.84 },
    hint: 'Industrial sovietwave: mechanical rhythms, metallic textures, production line vibe.',
  },
  glasnostDreams: {
    label: 'Glasnost Dreams (original sovietwave)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9500, q: 0.82 },
    hint: 'Hopeful sovietwave: major chords, brighter tones, optimistic melodies.',
  },
  probabilityGarden: {
    label: 'Probability Garden (Claude-inspired)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 11000, q: 0.5 },
    hint: 'Generative exploration: polyrhythms, probabilistic melodies, glitchy textures, order emerging from chaos.',
  },
  aurora: {
    label: 'Aurora Drift (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9000, q: 0.8 },
    hint: 'Ambient original: airy pads, gentle arpeggios, and slow pulses with a soft wash.',
  },
  nebula: {
    label: 'Nebula Nights (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 10000, q: 0.85 },
    hint: 'Original ambient-electronic: evolving pads, warm bass, soft arpeggios.',
  },
  electric: {
    label: 'Electric Reverie (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 11000, q: 0.82 },
    hint: 'Original mid-tempo electronic: dreamy pads, plucky bass, emotive lead melodies.',
  },
  neon: {
    label: 'Neon Pulse (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 12000, q: 0.80 },
    hint: 'Original future bass: uplifting major chords, funky bass, synth stabs, high energy.',
  },
  mongolian: {
    label: 'Mongolian Throat (original)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9000, q: 0.8 },
    hint: 'Deep drone with whistle-like overtone melodies. Inspired by Khoomei, Sygyt & Kargyraa styles.',
  },
  celestial: {
    label: 'Celestial Garden (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 8000, q: 0.75 },
    hint: 'Original ambient soundscape: layered bells, evolving pads, floating textures.',
  },
  forest: {
    label: 'Deep Forest (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 7000, q: 0.8 },
    hint: 'Original ambient soundscape: deep drones, organic tones, natural evolution.',
  },
  crystalline: {
    label: 'Crystalline Cavern (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 9500, q: 0.75 },
    hint: 'Original ambient soundscape: resonant ice crystals, echoing drops, cold atmosphere.',
  },
  mirage: {
    label: 'Desert Mirage (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 8500, q: 0.78 },
    hint: 'Original ambient soundscape: shimmering heat waves, sparse tones, warm drones.',
  },
  morningMist: {
    label: 'Morning Mist (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 7500, q: 0.72 },
    hint: 'Original ambient soundscape: soft dawn atmosphere, gentle pads, peaceful awakening.',
  },
  underwater: {
    label: 'Underwater Dream (original ambient)',
    kind: 'demo',
    filter: { type: 'lowpass', frequency: 6500, q: 0.85 },
    hint: 'Original ambient soundscape: submerged atmosphere, muffled tones, dreamy depths.',
  },
};

const VIZ_HINTS = {
  waveform: 'Waveform (time-domain). This is a simple monitor, not a calibration tool.',
  spectrum: 'Spectrum (frequency-domain). Peaks are approximate.',
  bars: 'Bars (frequency-domain). Rainbow bars show band energy.',
  kaleidoscope: 'Kaleidoscope (symmetry + spectrum). Mirrors and colors react to audio.',
  particles: 'Particles (audio-reactive physics). Spawns and animates particles based on frequency energy.',
  sauron: 'Eye of Sauron (LOTR). The Great Eye watches and reacts to your audio with flame and fury.',
  rings: 'Rings (time + frequency). Concentric rings react to waveform and spectrum energy.',
  nyan: 'Nyan Cat (internet legend). Pop-Tart cat flies through space leaving a rainbow trail.',
};

function updateSecureContextBadge() {
  const secure = window.isSecureContext;
  const proto = location.protocol;
  if (secure) {
    ui.secureContextBadge.textContent = `Secure context: yes (${proto})`;
    ui.secureContextBadge.style.borderColor = 'rgba(52,211,153,0.35)';
  } else {
    ui.secureContextBadge.textContent = `Secure context: no (${proto})`;
    ui.secureContextBadge.style.borderColor = 'rgba(251,113,133,0.40)';
  }
}

function uiSync() {
  ui.toggleBtn.textContent = state.running ? 'Stop' : 'Start';
  ui.panicBtn.disabled = !state.audioContext;

  const preset = SOUND_PRESETS[ui.sound.value] || SOUND_PRESETS.brown;
  ui.soundVal.textContent = preset.label;
  ui.freqControl.classList.toggle('hidden', preset.kind !== 'tone');
  ui.bpmControl.classList.toggle('hidden', preset.kind !== 'demo');
  ui.loopControl.classList.toggle('hidden', preset.kind !== 'demo');
  ui.melodyControl.classList.toggle('hidden', preset.kind !== 'demo');
  ui.frequencyVal.textContent = fmtHz(ui.frequency.value);
  ui.bpmVal.textContent = String(Math.round(Number(ui.bpm.value) || 136));
  ui.melodyVal.textContent = fmtPct(ui.melody.value);

  ui.volumeVal.textContent = fmtPct(ui.volume.value);
  ui.masterVolumeVal.textContent = fmtPct(ui.masterVolume.value);
  ui.brownNoiseMixVal.textContent = fmtPct(ui.brownNoiseMix.value);
  ui.cutoffVal.textContent = `${Number(ui.cutoff.value).toLocaleString()} Hz`;

  ui.vizHint.textContent = VIZ_HINTS[ui.vizMode.value] || VIZ_HINTS.waveform;

  ui.filterHint.textContent = preset.hint || 'Filter shapes the sound.';
}

function linearFromSlider(slider01) {
  // perceptual-ish volume curve
  const x = Math.max(0, Math.min(1, slider01));
  return x * x;
}

async function createNoiseNode(ctx, initialNoiseType) {
  // Prefer AudioWorklet when possible.
  // Note: AudioWorklet typically requires secure context (https/localhost).
  if (ctx.audioWorklet && window.isSecureContext) {
    try {
      await ctx.audioWorklet.addModule('brown-noise-worklet.js');
      const node = new AudioWorkletNode(ctx, 'noise-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      const typeParam = node.parameters.get('noiseType');
      if (typeParam) typeParam.setValueAtTime(initialNoiseType, ctx.currentTime);

      setEngine('AudioWorklet');
      return {
        node,
        setNoiseType: (noiseType) => {
          const p = node.parameters.get('noiseType');
          if (p) p.setTargetAtTime(noiseType, ctx.currentTime, 0.01);
        },
      };
    } catch (err) {
      console.warn('AudioWorklet failed; falling back:', err);
    }
  }

  // Fallback: ScriptProcessorNode (deprecated, but widely supported).
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 0, 1);

  let noiseType = initialNoiseType;

  // brown
  let brownLast = 0.0;

  // pink (Paul Kellet)
  let p0 = 0.0;
  let p1 = 0.0;
  let p2 = 0.0;
  let p3 = 0.0;
  let p4 = 0.0;
  let p5 = 0.0;
  let p6 = 0.0;

  node.onaudioprocess = (e) => {
    const out = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < out.length; i++) {
      const white = (Math.random() * 2.0) - 1.0;

      let sample = 0;
      if (noiseType === 0) {
        sample = white;
      } else if (noiseType === 1) {
        p0 = 0.99886 * p0 + white * 0.0555179;
        p1 = 0.99332 * p1 + white * 0.0750759;
        p2 = 0.96900 * p2 + white * 0.1538520;
        p3 = 0.86650 * p3 + white * 0.3104856;
        p4 = 0.55000 * p4 + white * 0.5329522;
        p5 = -0.7616 * p5 - white * 0.0168980;
        const pink = p0 + p1 + p2 + p3 + p4 + p5 + p6 + white * 0.5362;
        p6 = white * 0.115926;
        sample = pink * 0.11;
      } else {
        brownLast = (brownLast + 0.02 * white) / 1.02;
        sample = brownLast * 3.5;
      }

      out[i] = sample;
    }
  };

  setEngine('ScriptProcessor (fallback)');
  return {
    node,
    setNoiseType: (t) => {
      noiseType = Math.max(0, Math.min(2, Math.round(Number(t) || 0)));
    },
  };
}

function createToneNode(ctx, wave) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = Number(ui.frequency.value) || 220;
  osc.start();
  setEngine('Oscillator');
  return {
    node: osc,
    setFrequency: (hz) => {
      osc.frequency.setTargetAtTime(Math.max(1, Number(hz) || 220), ctx.currentTime, 0.01);
    },
    stop: () => {
      try { osc.stop(); } catch { /* ignore */ }
    },
  };
}

function createNoiseBufferSource(ctx, seconds = 1.0) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2) - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start();
  return src;
}

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createImpulseResponse(ctx, seconds = 2.2, decay = 2.5) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let c = 0; c < impulse.numberOfChannels; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      data[i] = ((Math.random() * 2) - 1) * env;
    }
  }

  return impulse;
}

function createTranceDemo(ctx) {
  // Original trance-ish demo: 4-on-the-floor kick, offbeat bass, simple lead.
  // This is intentionally not a recreation of any copyrighted song.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  // shared noise source for hats/snare
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 6000;
  noise.connect(noiseHP);

  let bpm = Number(ui.bpm.value) || 136;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.12;
  const lookaheadMs = 25;
  let timerId = null;

  const activeStops = new Set();

  function timePerStep() {
    // 16th notes
    return (60 / bpm) / 4;
  }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc.connect(g);
    g.connect(output);

    osc.start(t);
    osc.stop(t + 0.35);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkHat(t, open = false) {
    const g = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.18 : 0.12, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.12 : 0.045));

    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(output);

    // disconnect after envelope to avoid node buildup
    const stopAt = t + (open ? 0.2 : 0.1);
    activeStops.add(() => { try { hp.disconnect(); } catch { /* ignore */ } });
    setTimeout(() => {
      try { hp.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkSnare(t) {
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(output);

    // add a tonal snap
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.10, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(og);
    og.connect(output);
    osc.start(t);
    osc.stop(t + 0.08);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });

    const stopAt = t + 0.25;
    activeStops.add(() => { try { bp.disconnect(); } catch { /* ignore */ } });
    setTimeout(() => {
      try { bp.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi) {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToHz(midi), t);

    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(500, t);
    filt.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    filt.Q.value = 0.9;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(filt);
    filt.connect(g);
    g.connect(output);
    osc.start(t);
    osc.stop(t + 0.16);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkLead(t, midi) {
    // small supersaw-ish stack
    const baseHz = midiToHz(midi);
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.8;
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(2400, t + 0.07);
    filt.frequency.exponentialRampToValueAtTime(1100, t + 0.25);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    const detunes = [-7, +7];
    const oscs = detunes.map((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(baseHz, t);
      o.detune.setValueAtTime(d, t);
      o.connect(filt);
      o.start(t);
      o.stop(t + 0.30);
      activeStops.add(() => { try { o.stop(); } catch { /* ignore */ } });
      return o;
    });

    filt.connect(g);
    g.connect(output);

    // cleanup
    const stopAt = t + 0.35;
    setTimeout(() => {
      try { filt.disconnect(); } catch { /* ignore */ }
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  // Patterns (16 steps). Original, generic trance groove.
  const kickSteps = new Set([0, 4, 8, 12]);
  const snareSteps = new Set([4, 12]);
  const hatSteps = new Set([2, 6, 10, 14]);
  const offbeatBassSteps = new Set([2, 6, 10, 14]);

  // A-minor-ish: A2, G2, F2, G2 loop
  const bassRoots = [45, 43, 41, 43];
  // Lead motif (midi), sparse and not iconic
  const leadNotes = [69, 72, 76, 74, 72, 76, 79, 76];

  function scheduleStep(step, t) {
    const barIndex = Math.floor((currentStep / 16) % 4);
    const root = bassRoots[barIndex];

    if (kickSteps.has(step)) mkKick(t);
    if (snareSteps.has(step)) mkSnare(t);
    if (hatSteps.has(step)) mkHat(t, step === 14);

    if (offbeatBassSteps.has(step)) mkBass(t, root);

    // lead every 2 bars, every 2 steps
    const globalStep = currentStep;
    const phraseOn = Math.floor(globalStep / 32) % 2 === 1;
    if (phraseOn && step % 2 === 0 && step !== 0) {
      const idx = Math.floor((globalStep / 2) % leadNotes.length);
      mkLead(t, leadNotes[idx]);
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    // stop any currently playing oscillators we still can
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { /* ignore */ }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { /* ignore */ }
    try { noise.stop(); } catch { /* ignore */ }
    try { noiseHP.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(60, Math.min(220, Number(v) || 136)); },
    stop: stopAll,
  };
}

function createDwarvenBridgeDemo(ctx) {
  // Original cinematic demo: dark drone + sparse heavy percussion.
  // Intentionally avoids any recognizable LOTR melodic material.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // simple reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.4, 2.8);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.82;
  wet.gain.value = 0.30;

  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // noise source for impacts/metal
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 900;
  noise.connect(noiseHP);

  // drone: two detuned oscillators into a lowpass
  const droneBus = ctx.createGain();
  // Keep the drone supportive; melody should sit above it.
  droneBus.gain.value = 0.14;

  const droneLP = ctx.createBiquadFilter();
  droneLP.type = 'lowpass';
  droneLP.frequency.value = 820;
  droneLP.Q.value = 0.7;

  const droneHP = ctx.createBiquadFilter();
  droneHP.type = 'highpass';
  droneHP.frequency.value = 55;

  // Reduce low-end buildup so it doesn't mask the melody.
  const droneLowShelf = ctx.createBiquadFilter();
  droneLowShelf.type = 'lowshelf';
  droneLowShelf.frequency.value = 170;
  droneLowShelf.gain.value = -9;

  const droneOsc1 = ctx.createOscillator();
  const droneOsc2 = ctx.createOscillator();
  droneOsc1.type = 'sawtooth';
  droneOsc2.type = 'triangle';
  droneOsc2.detune.value = +6;

  // gentle vibrato
  const vibOsc = ctx.createOscillator();
  vibOsc.type = 'sine';
  vibOsc.frequency.value = 0.25;
  const vibGain = ctx.createGain();
  vibGain.gain.value = 6; // cents via detune
  vibOsc.connect(vibGain);
  vibGain.connect(droneOsc1.detune);
  vibGain.connect(droneOsc2.detune);

  droneOsc1.connect(droneLP);
  droneOsc2.connect(droneLP);
  droneLP.connect(droneHP);
  droneHP.connect(droneLowShelf);
  droneLowShelf.connect(droneBus);
  droneBus.connect(preMix);

  // pick roots (dark-ish, but generic)
  const roots = [
    { midi: 38, fifth: 45 }, // D2 + A2
    { midi: 36, fifth: 43 }, // C2 + G2
    { midi: 41, fifth: 48 }, // F2 + C3
    { midi: 39, fifth: 46 }, // Eb2 + Bb2
  ];

  function setDroneRoot(t, root) {
    const base = midiToHz(root.midi);
    const fifth = midiToHz(root.fifth);
    droneOsc1.frequency.setTargetAtTime(base, t, 0.08);
    droneOsc2.frequency.setTargetAtTime(fifth, t, 0.10);
  }

  setDroneRoot(ctx.currentTime, roots[0]);
  droneOsc1.start();
  droneOsc2.start();
  vibOsc.start();

  // melody bus: EQ it for presence so it reads clearly
  const melodyBus = ctx.createGain();
  melodyBus.gain.value = 1.0;
  const melodyHP = ctx.createBiquadFilter();
  melodyHP.type = 'highpass';
  melodyHP.frequency.value = 240;
  melodyHP.Q.value = 0.7;
  const melodyBP = ctx.createBiquadFilter();
  melodyBP.type = 'bandpass';
  melodyBP.frequency.value = 1400;
  melodyBP.Q.value = 0.9;
  melodyHP.connect(melodyBP);
  melodyBP.connect(melodyBus);
  melodyBus.connect(preMix);

  // evolving pad (continuous, section-controlled)
  const padBus = ctx.createGain();
  padBus.gain.value = 0.0001;
  const padLP = ctx.createBiquadFilter();
  padLP.type = 'lowpass';
  padLP.frequency.value = 1200;
  padLP.Q.value = 0.6;

  const padOscA = ctx.createOscillator();
  const padOscB = ctx.createOscillator();
  padOscA.type = 'sawtooth';
  padOscB.type = 'triangle';
  padOscB.detune.value = -8;

  const padLfo = ctx.createOscillator();
  padLfo.type = 'sine';
  padLfo.frequency.value = 0.08;
  const padLfoGain = ctx.createGain();
  padLfoGain.gain.value = 0.08;

  padOscA.connect(padLP);
  padOscB.connect(padLP);
  padLP.connect(padBus);
  padBus.connect(preMix);

  padLfo.connect(padLfoGain);
  padLfoGain.connect(padBus.gain);

  function setPadRoot(t, root) {
    // simple “open” color around root + octave
    const base = midiToHz(root.midi + 12);
    const upper = midiToHz(root.fifth + 12);
    padOscA.frequency.setTargetAtTime(base, t, 0.12);
    padOscB.frequency.setTargetAtTime(upper, t, 0.12);
  }

  setPadRoot(ctx.currentTime, roots[0]);
  padOscA.start();
  padOscB.start();
  padLfo.start();

  let bpm = Number(ui.bpm.value) || 92;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;

  const activeStops = new Set();

  function timePerStep() {
    // 16th notes
    return (60 / bpm) / 4;
  }

  // A complete "song" structure with a definite ending (Finale + Silence).
  // If looping is enabled, it returns to Intro after the silence.
  const ARRANGEMENT = [
    { name: 'Intro', bars: 8, pad: 0.00, drums: 'sparse', metal: false, melody: 'none' },
    { name: 'March', bars: 8, pad: 0.10, drums: 'march', metal: false, melody: 'sparse' },
    { name: 'Tension', bars: 8, pad: 0.14, drums: 'tension', metal: true, melody: 'answer' },
    { name: 'Clash', bars: 16, pad: 0.18, drums: 'dense', metal: true, melody: 'active' },
    { name: 'Aftermath', bars: 8, pad: 0.08, drums: 'sparse', metal: false, melody: 'sparse' },
    { name: 'Finale', bars: 4, pad: 0.10, drums: 'tension', metal: true, melody: 'finale' },
    { name: 'Silence', bars: 2, pad: 0.00, drums: 'none', metal: false, melody: 'none' },
  ];

  const TOTAL_BARS = ARRANGEMENT.reduce((a, s) => a + s.bars, 0);

  function getSectionForBar(barIndex) {
    let acc = 0;
    for (const s of ARRANGEMENT) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    // loop
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return getSectionForBar(wrapped);
  }

  function mkBigDrum(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);

    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.7;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(lp);
    lp.connect(g);
    g.connect(preMix);

    osc.start(t);
    osc.stop(t + 0.60);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkTom(t, freq) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, t + 0.14);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(g);
    g.connect(preMix);
    osc.start(t);
    osc.stop(t + 0.40);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkMetalHit(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 6.0;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);

    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(preMix);

    const stopAt = t + 0.30;
    activeStops.add(() => { try { bp.disconnect(); } catch { /* ignore */ } });
    setTimeout(() => {
      try { bp.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkSubImpact(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(32, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.30);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(g);
    g.connect(preMix);
    osc.start(t);
    osc.stop(t + 0.95);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkHornStab(t, rootMidi) {
    // Brass-like stab, original and generic.
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc2.detune.value = +7;

    const hz = midiToHz(rootMidi + 12);
    osc.frequency.setValueAtTime(hz, t);
    osc2.frequency.setValueAtTime(hz * 1.005, t);

    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.Q.value = 1.1;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(bp);
    osc2.connect(bp);
    bp.connect(g);
    g.connect(preMix);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.55);
    osc2.stop(t + 0.55);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { osc2.stop(); } catch { /* ignore */ } });
  }

  function mkMelodyNote(t, midi, durationSec = 0.28, intensity = 1.0) {
    if (melodyLevel <= 0.001) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    // Lead-ish tone: a little brighter than a triangle, but still smooth.
    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc2.detune.value = +11;

    const hz = midiToHz(midi);
    osc.frequency.setValueAtTime(hz, t);
    osc2.frequency.setValueAtTime(hz * 1.002, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.Q.value = 0.8;

    // Push melody a bit so it doesn't get swallowed by the drone.
    const target = 0.26 * melodyLevel * Math.max(0, Math.min(1.25, intensity));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, durationSec));

    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    g.connect(melodyHP);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + durationSec + 0.10);
    osc2.stop(t + durationSec + 0.10);

    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { osc2.stop(); } catch { /* ignore */ } });
  }

  // Minor-ish scale degrees (relative): 0,2,3,5,7,8,10
  const SCALE = [0, 2, 3, 5, 7, 8, 10];
  const MOTIF_A = [0, 2, 3, 5, 3, 2, 0, 2];
  const MOTIF_B = [7, 5, 3, 2, 3, 5, 7, 10];
  const MOTIF_C = [0, 3, 5, 7, 5, 3, 2, 0];

  function degreeToMidi(rootMidi, deg) {
    const octave = Math.floor(deg / SCALE.length);
    const idx = ((deg % SCALE.length) + SCALE.length) % SCALE.length;
    return rootMidi + 12 * octave + SCALE[idx];
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = getSectionForBar(barIndex);
    const rootIdx = Math.floor((barIndex / 2) % roots.length);
    const root = roots[rootIdx];

    // If not looping, end cleanly after the arrangement.
    if (!loopEnabled && currentStep >= TOTAL_BARS * 16) {
      // fade continuous layers down and stop transport
      padBus.gain.setTargetAtTime(0.0001, t, 0.35);
      droneBus.gain.setTargetAtTime(0.0001, t, 0.45);
      output.gain.setTargetAtTime(0.0001, t, 0.55);
      setStatus('Finished');
      stopTransport();
      // Stop global playback state too
      setTimeout(() => {
        try { autoStopFromDemo(); } catch { /* ignore */ }
      }, 250);
      return;
    }

    // Update section display and continuous layers at bar boundaries
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      setDroneRoot(t, root);
      setPadRoot(t, root);
      // fade pad intensity per section
      const targetPad = section.pad;
      padBus.gain.setTargetAtTime(targetPad, t, 0.35);
      // open pad a bit more during Clash
      const padCutoff = section.name === 'Clash' ? 1800 : 1200;
      padLP.frequency.setTargetAtTime(padCutoff, t, 0.30);
    }

    // Percussion density varies by section
    if (section.drums === 'none') {
      // intentionally silent
    } else if (section.drums === 'sparse') {
      if (step === 0) mkBigDrum(t);
      if (step === 12 && barInSection % 4 === 3) mkSubImpact(t);
      if (step === 10 && section.metal) mkMetalHit(t);
    } else if (section.drums === 'march') {
      if (step === 0 || step === 8) mkBigDrum(t);
      if (step === 6 || step === 14) mkTom(t, step === 6 ? 145 : 120);
      if (step === 10 && barInSection % 2 === 1) mkMetalHit(t);
    } else if (section.drums === 'tension') {
      if (step === 0 || step === 8) mkBigDrum(t);
      if (step === 4 || step === 12) mkTom(t, step === 4 ? 160 : 125);
      if (step === 10) mkMetalHit(t);
      if (step === 15 && barInSection % 4 === 3) mkSubImpact(t);
    } else {
      // dense/clash
      if (step === 0 || step === 4 || step === 8 || step === 12) mkBigDrum(t);
      if (step === 6 || step === 14) mkTom(t, step === 6 ? 170 : 135);
      if (step === 10 || step === 2) mkMetalHit(t);
      if (step === 0 && barInSection % 4 === 0) mkSubImpact(t);
      // occasional horn stabs on downbeat
      if (step === 0 && (barInSection % 2 === 1)) mkHornStab(t + 0.02, root.midi);
    }

    // Melody (original) — plays mostly above the drone.
    const melodyRoot = root.midi + 24;
    if (section.melody === 'sparse') {
      if (step % 8 === 0) {
        const motif = (barIndex % 2 === 0) ? MOTIF_A : MOTIF_C;
        const note = degreeToMidi(melodyRoot, motif[(step / 8) % motif.length]);
        mkMelodyNote(t + 0.01, note, 0.35, 0.9);
      }
    } else if (section.melody === 'answer') {
      if (step % 4 === 0 && step !== 0) {
        const motif = (barInSection % 2 === 0) ? MOTIF_B : MOTIF_A;
        const idx = (step / 4) % motif.length;
        const note = degreeToMidi(melodyRoot, motif[idx]);
        mkMelodyNote(t + 0.01, note, 0.25, 1.0);
      }
    } else if (section.melody === 'active') {
      if (step % 2 === 0 && step !== 0) {
        const motif = (barInSection % 3 === 0) ? MOTIF_B : MOTIF_C;
        const idx = (Math.floor(step / 2) + barIndex) % motif.length;
        const note = degreeToMidi(melodyRoot, motif[idx]);
        mkMelodyNote(t + 0.01, note, 0.18, 1.15);
      }
    } else if (section.melody === 'finale') {
      // a slow cadence, then a held final note
      if (barInSection < section.bars - 1) {
        if (step === 0 || step === 8) {
          const motif = (barInSection % 2 === 0) ? MOTIF_A : MOTIF_B;
          const note = degreeToMidi(melodyRoot, motif[(step === 0 ? 0 : 4)]);
          mkMelodyNote(t + 0.01, note, 0.45, 1.0);
        }
      } else {
        if (step === 0) {
          const finalNote = degreeToMidi(melodyRoot, 0);
          mkMelodyNote(t + 0.01, finalNote, 1.6, 1.1);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { /* ignore */ }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { /* ignore */ }
    try { noise.stop(); } catch { /* ignore */ }
    try { noiseHP.disconnect(); } catch { /* ignore */ }

    try { droneOsc1.disconnect(); } catch { /* ignore */ }
    try { droneOsc2.disconnect(); } catch { /* ignore */ }
    try { vibOsc.disconnect(); } catch { /* ignore */ }
    try { vibGain.disconnect(); } catch { /* ignore */ }
    try { droneLP.disconnect(); } catch { /* ignore */ }
    try { droneHP.disconnect(); } catch { /* ignore */ }
    try { droneLowShelf.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }

    try { melodyBus.disconnect(); } catch { /* ignore */ }
    try { melodyHP.disconnect(); } catch { /* ignore */ }
    try { melodyBP.disconnect(); } catch { /* ignore */ }

    try { padOscA.disconnect(); } catch { /* ignore */ }
    try { padOscB.disconnect(); } catch { /* ignore */ }
    try { padLfo.disconnect(); } catch { /* ignore */ }
    try { padLfoGain.disconnect(); } catch { /* ignore */ }
    try { padLP.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }

    try { droneOsc1.stop(); } catch { /* ignore */ }
    try { droneOsc2.stop(); } catch { /* ignore */ }
    try { vibOsc.stop(); } catch { /* ignore */ }

    try { padOscA.stop(); } catch { /* ignore */ }
    try { padOscB.stop(); } catch { /* ignore */ }
    try { padLfo.stop(); } catch { /* ignore */ }

    try { preMix.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(40, Math.min(180, Number(v) || 92)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createMongolianThroatDemo(ctx) {
  // Mongolian throat singing: deep drone + prominent whistle-like overtones
  // Inspired by Khoomei, Sygyt, and Kargyraa styles
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Rich drone with multiple detuned voices for warmth
  let droneMidi = 33; // A1 (110 Hz) - traditional throat singing range
  const droneBus = ctx.createGain();
  droneBus.gain.value = 0.68;

  const droneOsc1 = ctx.createOscillator();
  const droneOsc2 = ctx.createOscillator();
  const droneOsc3 = ctx.createOscillator();
  droneOsc1.type = 'sawtooth'; // rich in harmonics
  droneOsc2.type = 'triangle';
  droneOsc3.type = 'sine';
  droneOsc2.detune.value = -8;
  droneOsc3.detune.value = +5;

  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 500;
  droneLp.Q.value = 0.8;

  droneOsc1.connect(droneLp);
  droneOsc2.connect(droneLp);
  droneOsc3.connect(droneLp);
  droneLp.connect(droneBus);
  droneBus.connect(preMix);

  droneOsc1.start();
  droneOsc2.start();
  droneOsc3.start();

  // Subharmonic "kargyraa" layer for extra depth
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  const subGain = ctx.createGain();
  subGain.gain.value = 0.35;
  subOsc.connect(subGain);
  subGain.connect(preMix);
  subOsc.start();

  // Overtone whistle: use higher harmonics (8-16) for that characteristic sound
  const overtoneSource = ctx.createOscillator();
  overtoneSource.type = 'sawtooth';
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 1.2;
  overtoneSource.connect(overtoneGain);

  // Bank of high-Q bandpass filters for isolated harmonics
  const HARMONIC_START = 8;
  const HARMONIC_COUNT = 9; // harmonics 8-16
  const bands = [];
  for (let i = 0; i < HARMONIC_COUNT; i++) {
    const harmNum = HARMONIC_START + i;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 12.0; // very narrow for whistle-like quality
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    overtoneGain.connect(bp);
    bp.connect(g);
    g.connect(preMix);
    bands.push({ bp, g, harmNum });
  }

  overtoneSource.start();

  // Vibrato for overtone melody (makes it sound more vocal/alive)
  const vibrato = ctx.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = 5.8; // moderate vibrato
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = 12; // cents
  vibrato.connect(vibratoGain);
  vibratoGain.connect(overtoneSource.detune);
  vibrato.start();

  // Rhythmic tremolo/pulsing (characteristic of throat singing)
  const tremolo = ctx.createOscillator();
  tremolo.type = 'sine';
  tremolo.frequency.value = 2.4;
  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 0.15;
  tremolo.connect(tremoloGain);
  tremoloGain.connect(droneBus.gain);
  tremolo.start();

  // Breath/air noise (essential for realism)
  const breath = createNoiseBufferSource(ctx, 1.0);
  const breathBp = ctx.createBiquadFilter();
  breathBp.type = 'bandpass';
  breathBp.frequency.value = 900;
  breathBp.Q.value = 2.5;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.14;
  breath.connect(breathBp);
  breathBp.connect(breathGain);
  breathGain.connect(preMix);

  // Subtle reverb for natural space
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 1.8, 2.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.85;
  wet.gain.value = 0.22;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 58;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.16;
  const lookaheadMs = 30;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Pentatonic-ish overtone melodies (using harmonic numbers)
  // These create the "whistle" melody characteristic of Sygyt style
  const PHRASE_A = [10, 12, 10, 9, 10, 12, 14, 12];
  const PHRASE_B = [12, 14, 15, 14, 12, 10, 12, 10];
  const PHRASE_C = [9, 10, 12, 10, 9, 8, 9, 10];
  const PHRASES = [PHRASE_A, PHRASE_B, PHRASE_C, PHRASE_A];

  function setDroneRoot(t, midi) {
    droneMidi = midi;
    const baseHz = midiToHz(midi);
    droneOsc1.frequency.setTargetAtTime(baseHz, t, 0.12);
    droneOsc2.frequency.setTargetAtTime(baseHz, t, 0.13);
    droneOsc3.frequency.setTargetAtTime(baseHz, t, 0.11);
    overtoneSource.frequency.setTargetAtTime(baseHz, t, 0.12);
    subOsc.frequency.setTargetAtTime(baseHz * 0.5, t, 0.12);
    
    // Update all band centers
    for (const b of bands) {
      b.bp.frequency.setTargetAtTime(baseHz * b.harmNum, t, 0.12);
    }
  }

  setDroneRoot(ctx.currentTime, droneMidi);

  function mkOvertoneNote(t, harmonicNum, dur = 0.45, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;
    
    // Find the closest band to this harmonic
    const bandIdx = Math.max(0, Math.min(bands.length - 1, harmonicNum - HARMONIC_START));
    const b = bands[bandIdx];
    
    const target = 0.28 * melodyLevel * intensity;
    b.g.gain.cancelScheduledValues(t);
    b.g.gain.setValueAtTime(b.g.gain.value, t);
    b.g.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), t + 0.02);
    b.g.gain.setTargetAtTime(target * 0.8, t + 0.08, 0.04); // sustain with slight dip
    b.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function mkBreathPulse(t, intensity = 0.18) {
    breathGain.gain.cancelScheduledValues(t);
    breathGain.gain.setValueAtTime(0.0001, t);
    breathGain.gain.exponentialRampToValueAtTime(intensity, t + 0.015);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const phraseIdx = Math.floor(barIndex / 4) % PHRASES.length;
    const phrase = PHRASES[phraseIdx];
    
    // Modal drone shifts every 4 bars for variety
    if (step === 0) {
      if (barIndex % 16 === 0) setDroneRoot(t, 33); // A1
      else if (barIndex % 16 === 4) setDroneRoot(t, 35); // B1
      else if (barIndex % 16 === 8) setDroneRoot(t, 31); // G1
      else if (barIndex % 16 === 12) setDroneRoot(t, 33); // back to A1
      
      // Vary tremolo rate slightly for organic feel
      const tremoloRate = 2.2 + (barIndex % 3) * 0.3;
      tremolo.frequency.setTargetAtTime(tremoloRate, t, 0.1);
    }

    // Overtone melody on half-note grid (more spacious, traditional feel)
    if (step % 8 === 0) {
      const noteIdx = Math.floor((currentStep / 8) % phrase.length);
      const harmonic = phrase[noteIdx];
      const intensity = 1.0 + (noteIdx % 2) * 0.15; // slight accent variation
      mkOvertoneNote(t, harmonic, 0.55, intensity);
    }

    // Additional overtone ornaments on quarter notes (adds complexity)
    if (melodyLevel > 0.5 && step % 4 === 2 && barIndex % 2 === 1) {
      const noteIdx = Math.floor((currentStep / 4) % phrase.length);
      const harmonic = phrase[noteIdx];
      mkOvertoneNote(t, harmonic + 1, 0.22, 0.65); // grace note above
    }

    // Breath pulses for rhythm and realism
    if (step % 16 === 0) {
      mkBreathPulse(t, 0.20);
    } else if (step % 8 === 4) {
      mkBreathPulse(t, 0.12);
    }

    // Occasional subharmonic emphasis (kargyraa effect)
    if (step === 0 && barIndex % 8 === 7) {
      subGain.gain.cancelScheduledValues(t);
      subGain.gain.setValueAtTime(0.35, t);
      subGain.gain.exponentialRampToValueAtTime(0.52, t + 0.02);
      subGain.gain.setTargetAtTime(0.35, t + 2.0, 0.3);
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { droneOsc1.stop(); } catch { /* ignore */ }
    try { droneOsc2.stop(); } catch { /* ignore */ }
    try { droneOsc3.stop(); } catch { /* ignore */ }
    try { subOsc.stop(); } catch { /* ignore */ }
    try { overtoneSource.stop(); } catch { /* ignore */ }
    try { vibrato.stop(); } catch { /* ignore */ }
    try { tremolo.stop(); } catch { /* ignore */ }
    try { breath.stop(); } catch { /* ignore */ }
    try { droneOsc1.disconnect(); } catch { /* ignore */ }
    try { droneOsc2.disconnect(); } catch { /* ignore */ }
    try { droneOsc3.disconnect(); } catch { /* ignore */ }
    try { subOsc.disconnect(); } catch { /* ignore */ }
    try { subGain.disconnect(); } catch { /* ignore */ }
    try { overtoneSource.disconnect(); } catch { /* ignore */ }
    try { overtoneGain.disconnect(); } catch { /* ignore */ }
    try { vibrato.disconnect(); } catch { /* ignore */ }
    try { vibratoGain.disconnect(); } catch { /* ignore */ }
    try { tremolo.disconnect(); } catch { /* ignore */ }
    try { tremoloGain.disconnect(); } catch { /* ignore */ }
    try { breath.disconnect(); } catch { /* ignore */ }
    try { breathBp.disconnect(); } catch { /* ignore */ }
    try { breathGain.disconnect(); } catch { /* ignore */ }
    try { droneLp.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
    for (const b of bands) {
      try { b.bp.disconnect(); } catch { /* ignore */ }
      try { b.g.disconnect(); } catch { /* ignore */ }
    }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(30, Math.min(120, Number(v) || 58)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createCelestialGardenDemo(ctx) {
  // Celestial Garden: Ethereal bells, shimmering pads, and floating textures
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Bell layer - crystalline chimes
  const bellBus = ctx.createGain();
  bellBus.gain.value = 0.42;

  // Pad layer - warm evolving background
  const padBus = ctx.createGain();
  padBus.gain.value = 0.55;

  // Create pad voices with slow modulation
  const pad1 = ctx.createOscillator();
  const pad2 = ctx.createOscillator();
  const pad3 = ctx.createOscillator();
  pad1.type = 'sine';
  pad2.type = 'triangle';
  pad3.type = 'sine';
  pad2.detune.value = -4;
  pad3.detune.value = 7;

  const padLfo = ctx.createOscillator();
  padLfo.type = 'sine';
  padLfo.frequency.value = 0.12;
  const padLfoGain = ctx.createGain();
  padLfoGain.gain.value = 18;
  padLfo.connect(padLfoGain);
  padLfoGain.connect(pad1.detune);
  padLfoGain.connect(pad2.detune);
  padLfoGain.connect(pad3.detune);

  pad1.connect(padBus);
  pad2.connect(padBus);
  pad3.connect(padBus);
  padBus.connect(preMix);

  pad1.start();
  pad2.start();
  pad3.start();
  padLfo.start();

  // Shimmer layer - high sparkles
  const shimmerBus = ctx.createGain();
  shimmerBus.gain.value = 0.28;
  shimmerBus.connect(preMix);

  // Rich reverb for spaciousness
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 3.5, 3.8);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.45;
  wet.gain.value = 0.65;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 45;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Pentatonic scale for celestial bells (C major pentatonic)
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

  // Section structure
  const SECTIONS = [
    { name: 'Awakening', bars: 4 },
    { name: 'Bloom', bars: 4 },
    { name: 'Floating', bars: 4 },
    { name: 'Shimmer', bars: 4 },
    { name: 'Fade', bars: 2 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setPadChord(t, rootMidi) {
    const root = midiToHz(rootMidi);
    const third = midiToHz(rootMidi + 4);
    const fifth = midiToHz(rootMidi + 7);
    pad1.frequency.setTargetAtTime(root, t, 0.35);
    pad2.frequency.setTargetAtTime(third, t, 0.38);
    pad3.frequency.setTargetAtTime(fifth, t, 0.33);
  }

  function mkBell(t, midi, dur = 1.8, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    osc2.frequency.value = midiToHz(midi + 12);

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    osc2.connect(env);
    env.connect(bellBus);

    const peak = 0.18 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.1);
    osc2.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
      try { osc2.stop(); } catch { /* ignore */ }
    });
  }

  function mkShimmer(t, midi, dur = 0.8) {
    if (melodyLevel <= 0.3) return;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi + 24);

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    env.connect(shimmerBus);

    const peak = 0.12 * melodyLevel;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Chord progressions per section
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setPadChord(t, 60); // C
      else if (cycleBar === 4) setPadChord(t, 65); // F
      else if (cycleBar === 8) setPadChord(t, 67); // G
      else if (cycleBar === 12) setPadChord(t, 62); // D
      else if (cycleBar === 16) setPadChord(t, 60); // C
    }

    // Bell patterns - sparse and ethereal
    if (step % 16 === 0) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkBell(t, SCALE[noteIdx], 2.2, 1.0);
    } else if (step % 8 === 4 && barIndex % 2 === 1) {
      const noteIdx = Math.floor((currentStep / 8) % SCALE.length);
      mkBell(t, SCALE[noteIdx], 1.5, 0.7);
    }

    // Shimmer accents
    if (melodyLevel > 0.4 && step % 6 === 0 && barIndex >= 8) {
      const noteIdx = Math.floor((currentStep / 6) % SCALE.length);
      mkShimmer(t, SCALE[noteIdx], 1.0);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setPadChord(ctx.currentTime, 60);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { pad1.stop(); } catch { /* ignore */ }
    try { pad2.stop(); } catch { /* ignore */ }
    try { pad3.stop(); } catch { /* ignore */ }
    try { padLfo.stop(); } catch { /* ignore */ }
    try { pad1.disconnect(); } catch { /* ignore */ }
    try { pad2.disconnect(); } catch { /* ignore */ }
    try { pad3.disconnect(); } catch { /* ignore */ }
    try { padLfo.disconnect(); } catch { /* ignore */ }
    try { padLfoGain.disconnect(); } catch { /* ignore */ }
    try { bellBus.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }
    try { shimmerBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(100, Number(v) || 45)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createDeepForestDemo(ctx) {
  // Deep Forest: Organic drones, natural tones, and evolving textures
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Deep drone layer
  const droneBus = ctx.createGain();
  droneBus.gain.value = 0.65;

  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const drone3 = ctx.createOscillator();
  drone1.type = 'sine';
  drone2.type = 'triangle';
  drone3.type = 'sine';
  drone2.detune.value = -6;
  drone3.detune.value = 9;

  // Very slow modulation for organic feel
  const droneLfo = ctx.createOscillator();
  droneLfo.type = 'sine';
  droneLfo.frequency.value = 0.08;
  const droneLfoGain = ctx.createGain();
  droneLfoGain.gain.value = 25;
  droneLfo.connect(droneLfoGain);
  droneLfoGain.connect(drone1.detune);
  droneLfoGain.connect(drone2.detune);
  droneLfoGain.connect(drone3.detune);

  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 800;
  droneLp.Q.value = 0.6;

  drone1.connect(droneLp);
  drone2.connect(droneLp);
  drone3.connect(droneLp);
  droneLp.connect(droneBus);
  droneBus.connect(preMix);

  drone1.start();
  drone2.start();
  drone3.start();
  droneLfo.start();

  // Organic tone layer
  const toneBus = ctx.createGain();
  toneBus.gain.value = 0.38;
  toneBus.connect(preMix);

  // Texture layer - subtle noise
  const textureBus = ctx.createGain();
  textureBus.gain.value = 0.15;
  const texture = createNoiseBufferSource(ctx, 2.0);
  const textureBp = ctx.createBiquadFilter();
  textureBp.type = 'bandpass';
  textureBp.frequency.value = 600;
  textureBp.Q.value = 1.8;
  texture.connect(textureBp);
  textureBp.connect(textureBus);
  textureBus.connect(preMix);

  // Deep reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 4.2, 4.8);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.50;
  wet.gain.value = 0.58;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 38;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Minor pentatonic for forest tones (D minor pentatonic)
  const SCALE = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72];

  // Section structure
  const SECTIONS = [
    { name: 'Roots', bars: 4 },
    { name: 'Growth', bars: 4 },
    { name: 'Canopy', bars: 4 },
    { name: 'Depths', bars: 4 },
    { name: 'Twilight', bars: 2 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setDroneRoot(t, midi) {
    const hz = midiToHz(midi);
    drone1.frequency.setTargetAtTime(hz, t, 0.5);
    drone2.frequency.setTargetAtTime(hz * 0.995, t, 0.52);
    drone3.frequency.setTargetAtTime(hz * 1.008, t, 0.48);
  }

  function mkTone(t, midi, dur = 2.5, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = (Math.random() - 0.5) * 8; // slight organic variation

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    env.connect(toneBus);

    const peak = 0.22 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.3);
    env.gain.setTargetAtTime(peak * 0.7, t + 0.5, 0.2);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Drone root changes per section
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setDroneRoot(t, 38); // D
      else if (cycleBar === 4) setDroneRoot(t, 36); // C
      else if (cycleBar === 8) setDroneRoot(t, 41); // F
      else if (cycleBar === 12) setDroneRoot(t, 38); // D
      else if (cycleBar === 16) setDroneRoot(t, 33); // A
    }

    // Very sparse organic tones
    if (step % 16 === 0) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkTone(t, SCALE[noteIdx], 3.0, 1.0);
    } else if (step % 12 === 6 && barIndex % 3 === 1) {
      const noteIdx = Math.floor((currentStep / 12) % SCALE.length);
      mkTone(t, SCALE[noteIdx], 2.2, 0.65);
    }

    // Texture swells
    if (step === 0 && barIndex % 4 === 2) {
      textureBus.gain.cancelScheduledValues(t);
      textureBus.gain.setValueAtTime(0.15, t);
      textureBus.gain.linearRampToValueAtTime(0.28, t + 2.0);
      textureBus.gain.setTargetAtTime(0.15, t + 3.0, 1.0);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setDroneRoot(ctx.currentTime, 38);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { drone1.stop(); } catch { /* ignore */ }
    try { drone2.stop(); } catch { /* ignore */ }
    try { drone3.stop(); } catch { /* ignore */ }
    try { droneLfo.stop(); } catch { /* ignore */ }
    try { texture.stop(); } catch { /* ignore */ }
    try { drone1.disconnect(); } catch { /* ignore */ }
    try { drone2.disconnect(); } catch { /* ignore */ }
    try { drone3.disconnect(); } catch { /* ignore */ }
    try { droneLfo.disconnect(); } catch { /* ignore */ }
    try { droneLfoGain.disconnect(); } catch { /* ignore */ }
    try { droneLp.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }
    try { toneBus.disconnect(); } catch { /* ignore */ }
    try { texture.disconnect(); } catch { /* ignore */ }
    try { textureBp.disconnect(); } catch { /* ignore */ }
    try { textureBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(80, Number(v) || 38)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createCrystallineCavernDemo(ctx) {
  // Crystalline Cavern: Resonant ice crystals, echoing drops, cold atmosphere
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Ice drone layer - high and cold
  const droneBus = ctx.createGain();
  droneBus.gain.value = 0.32;

  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const drone3 = ctx.createOscillator();
  drone1.type = 'sine';
  drone2.type = 'sine';
  drone3.type = 'triangle';
  drone2.detune.value = 3;
  drone3.detune.value = -5;

  // Slow shimmer
  const droneLfo = ctx.createOscillator();
  droneLfo.type = 'sine';
  droneLfo.frequency.value = 0.15;
  const droneLfoGain = ctx.createGain();
  droneLfoGain.gain.value = 12;
  droneLfo.connect(droneLfoGain);
  droneLfoGain.connect(drone1.detune);
  droneLfoGain.connect(drone2.detune);

  const droneHp = ctx.createBiquadFilter();
  droneHp.type = 'highpass';
  droneHp.frequency.value = 600;
  droneHp.Q.value = 0.5;

  drone1.connect(droneHp);
  drone2.connect(droneHp);
  drone3.connect(droneHp);
  droneHp.connect(droneBus);
  droneBus.connect(preMix);

  drone1.start();
  drone2.start();
  drone3.start();
  droneLfo.start();

  // Crystal chime layer
  const chimeBus = ctx.createGain();
  chimeBus.gain.value = 0.48;
  chimeBus.connect(preMix);

  // Drop layer - water droplets
  const dropBus = ctx.createGain();
  dropBus.gain.value = 0.35;
  dropBus.connect(preMix);

  // Massive reverb for cavern echoes
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 5.5, 6.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.25;
  wet.gain.value = 0.80;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 40;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Bright crystalline scale (E major pentatonic high)
  const SCALE = [76, 78, 80, 83, 85, 88, 90, 92, 95, 97];

  // Section structure
  const SECTIONS = [
    { name: 'Frozen Entry', bars: 3 },
    { name: 'Ice Columns', bars: 4 },
    { name: 'Crystal Cathedral', bars: 4 },
    { name: 'Echo Chamber', bars: 4 },
    { name: 'Frozen Exit', bars: 3 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setDroneRoot(t, midi) {
    const hz = midiToHz(midi);
    drone1.frequency.setTargetAtTime(hz, t, 0.6);
    drone2.frequency.setTargetAtTime(hz * 1.002, t, 0.62);
    drone3.frequency.setTargetAtTime(hz * 0.997, t, 0.58);
  }

  function mkChime(t, midi, dur = 3.5, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = midiToHz(midi);
    osc2.frequency.value = midiToHz(midi + 19); // bright harmonic

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    osc2.connect(env);
    env.connect(chimeBus);

    const peak = 0.15 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.1);
    osc2.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
      try { osc2.stop(); } catch { /* ignore */ }
    });
  }

  function mkDrop(t, midi, dur = 0.4) {
    if (melodyLevel <= 0.2) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi + 24);

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    env.connect(dropBus);

    const peak = 0.18 * melodyLevel;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // Pitch drop for water droplet effect
    osc.frequency.exponentialRampToValueAtTime(midiToHz(midi + 12), t + dur);

    osc.start(t);
    osc.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Drone shifts
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setDroneRoot(t, 64); // E
      else if (cycleBar === 3) setDroneRoot(t, 69); // A
      else if (cycleBar === 7) setDroneRoot(t, 66); // F#
      else if (cycleBar === 11) setDroneRoot(t, 71); // B
      else if (cycleBar === 15) setDroneRoot(t, 64); // E
    }

    // Sparse crystalline chimes
    if (step % 16 === 0) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkChime(t, SCALE[noteIdx], 4.0, 1.0);
    } else if (step % 12 === 6 && barIndex % 2 === 0) {
      const noteIdx = Math.floor((currentStep / 12) % SCALE.length);
      mkChime(t, SCALE[noteIdx], 2.8, 0.65);
    }

    // Water drops (sparse)
    if (step % 8 === 3 && Math.random() > 0.4 && barIndex >= 3) {
      const noteIdx = Math.floor(Math.random() * SCALE.length);
      mkDrop(t, SCALE[noteIdx], 0.5);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setDroneRoot(ctx.currentTime, 64);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { drone1.stop(); } catch { /* ignore */ }
    try { drone2.stop(); } catch { /* ignore */ }
    try { drone3.stop(); } catch { /* ignore */ }
    try { droneLfo.stop(); } catch { /* ignore */ }
    try { drone1.disconnect(); } catch { /* ignore */ }
    try { drone2.disconnect(); } catch { /* ignore */ }
    try { drone3.disconnect(); } catch { /* ignore */ }
    try { droneLfo.disconnect(); } catch { /* ignore */ }
    try { droneLfoGain.disconnect(); } catch { /* ignore */ }
    try { droneHp.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }
    try { chimeBus.disconnect(); } catch { /* ignore */ }
    try { dropBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(90, Number(v) || 40)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createDesertMirageDemo(ctx) {
  // Desert Mirage: Shimmering heat waves, sparse tones, warm drones
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Warm drone layer - low and shimmering
  const droneBus = ctx.createGain();
  droneBus.gain.value = 0.58;

  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const drone3 = ctx.createOscillator();
  drone1.type = 'triangle';
  drone2.type = 'sine';
  drone3.type = 'sawtooth';
  drone2.detune.value = -7;
  drone3.detune.value = 5;

  // Heat shimmer modulation
  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine';
  shimmerLfo.frequency.value = 0.22;
  const shimmerLfoGain = ctx.createGain();
  shimmerLfoGain.gain.value = 28;
  shimmerLfo.connect(shimmerLfoGain);
  shimmerLfoGain.connect(drone1.detune);
  shimmerLfoGain.connect(drone2.detune);
  shimmerLfoGain.connect(drone3.detune);

  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 1200;
  droneLp.Q.value = 0.7;

  drone1.connect(droneLp);
  drone2.connect(droneLp);
  drone3.connect(droneLp);
  droneLp.connect(droneBus);
  droneBus.connect(preMix);

  drone1.start();
  drone2.start();
  drone3.start();
  shimmerLfo.start();

  // Mirage tone layer - sparse melodic elements
  const toneBus = ctx.createGain();
  toneBus.gain.value = 0.42;
  toneBus.connect(preMix);

  // Heat wave layer - subtle shimmer
  const waveBus = ctx.createGain();
  waveBus.gain.value = 0.25;
  const waveNoise = createNoiseBufferSource(ctx, 1.0);
  const waveBp = ctx.createBiquadFilter();
  waveBp.type = 'bandpass';
  waveBp.frequency.value = 1800;
  waveBp.Q.value = 2.5;
  waveNoise.connect(waveBp);
  waveBp.connect(waveBus);
  waveBus.connect(preMix);

  // Warm reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.8, 3.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.60;
  wet.gain.value = 0.48;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 35;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Phrygian dominant scale for desert feel (E Phrygian dominant)
  const SCALE = [52, 53, 56, 57, 59, 60, 62, 64, 65, 68];

  // Section structure
  const SECTIONS = [
    { name: 'Dawn Heat', bars: 4 },
    { name: 'Mirage Rising', bars: 4 },
    { name: 'Shimmer Peak', bars: 4 },
    { name: 'Distant Oasis', bars: 4 },
    { name: 'Sunset Fade', bars: 2 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setDroneRoot(t, midi) {
    const hz = midiToHz(midi);
    drone1.frequency.setTargetAtTime(hz, t, 0.7);
    drone2.frequency.setTargetAtTime(hz * 1.005, t, 0.72);
    drone3.frequency.setTargetAtTime(hz * 0.502, t, 0.68); // octave down with slight detune
  }

  function mkMirageTone(t, midi, dur = 2.8, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    osc2.frequency.value = midiToHz(midi + 7); // fifth above
    osc.detune.value = (Math.random() - 0.5) * 15; // heat shimmer variation

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    osc2.connect(env);
    env.connect(toneBus);

    const peak = 0.20 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.4);
    env.gain.setTargetAtTime(peak * 0.6, t + 0.8, 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.1);
    osc2.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
      try { osc2.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Drone shifts for desert atmosphere
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setDroneRoot(t, 40); // E
      else if (cycleBar === 4) setDroneRoot(t, 43); // G
      else if (cycleBar === 8) setDroneRoot(t, 45); // A
      else if (cycleBar === 12) setDroneRoot(t, 41); // F
      else if (cycleBar === 16) setDroneRoot(t, 40); // E
    }

    // Very sparse mirage tones
    if (step % 16 === 0) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkMirageTone(t, SCALE[noteIdx], 3.5, 1.0);
    } else if (step % 12 === 8 && barIndex % 3 === 1) {
      const noteIdx = Math.floor((currentStep / 12) % SCALE.length);
      mkMirageTone(t, SCALE[noteIdx], 2.5, 0.7);
    }

    // Heat wave swells
    if (step === 0 && barIndex % 2 === 1) {
      waveBus.gain.cancelScheduledValues(t);
      waveBus.gain.setValueAtTime(0.25, t);
      waveBus.gain.linearRampToValueAtTime(0.42, t + 1.5);
      waveBus.gain.setTargetAtTime(0.25, t + 2.5, 0.8);
    }

    // Shimmer LFO rate variation for heat effect
    if (step === 0 && barIndex >= 4 && barIndex < 12) {
      const rate = 0.20 + (barIndex % 4) * 0.03;
      shimmerLfo.frequency.setTargetAtTime(rate, t, 0.5);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setDroneRoot(ctx.currentTime, 40);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { drone1.stop(); } catch { /* ignore */ }
    try { drone2.stop(); } catch { /* ignore */ }
    try { drone3.stop(); } catch { /* ignore */ }
    try { shimmerLfo.stop(); } catch { /* ignore */ }
    try { waveNoise.stop(); } catch { /* ignore */ }
    try { drone1.disconnect(); } catch { /* ignore */ }
    try { drone2.disconnect(); } catch { /* ignore */ }
    try { drone3.disconnect(); } catch { /* ignore */ }
    try { shimmerLfo.disconnect(); } catch { /* ignore */ }
    try { shimmerLfoGain.disconnect(); } catch { /* ignore */ }
    try { droneLp.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }
    try { toneBus.disconnect(); } catch { /* ignore */ }
    try { waveNoise.disconnect(); } catch { /* ignore */ }
    try { waveBp.disconnect(); } catch { /* ignore */ }
    try { waveBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(75, Number(v) || 35)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createMorningMistDemo(ctx) {
  // Morning Mist: Soft dawn atmosphere with gentle pads and peaceful awakening
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Soft pad layer - dawn atmosphere
  const padBus = ctx.createGain();
  padBus.gain.value = 0.50;

  const pad1 = ctx.createOscillator();
  const pad2 = ctx.createOscillator();
  const pad3 = ctx.createOscillator();
  const pad4 = ctx.createOscillator();
  pad1.type = 'sine';
  pad2.type = 'sine';
  pad3.type = 'triangle';
  pad4.type = 'sine';
  pad2.detune.value = -3;
  pad3.detune.value = 5;
  pad4.detune.value = -7;

  // Very gentle breathing modulation
  const breathLfo = ctx.createOscillator();
  breathLfo.type = 'sine';
  breathLfo.frequency.value = 0.08;
  const breathLfoGain = ctx.createGain();
  breathLfoGain.gain.value = 8;
  breathLfo.connect(breathLfoGain);
  breathLfoGain.connect(pad1.detune);
  breathLfoGain.connect(pad2.detune);
  breathLfoGain.connect(pad3.detune);

  const padLp = ctx.createBiquadFilter();
  padLp.type = 'lowpass';
  padLp.frequency.value = 1500;
  padLp.Q.value = 0.5;

  pad1.connect(padLp);
  pad2.connect(padLp);
  pad3.connect(padLp);
  pad4.connect(padLp);
  padLp.connect(padBus);
  padBus.connect(preMix);

  pad1.start();
  pad2.start();
  pad3.start();
  pad4.start();
  breathLfo.start();

  // Gentle tone layer - morning birds/distant sounds
  const toneBus = ctx.createGain();
  toneBus.gain.value = 0.28;
  toneBus.connect(preMix);

  // Subtle air layer
  const airBus = ctx.createGain();
  airBus.gain.value = 0.08;
  const airNoise = createNoiseBufferSource(ctx, 1.0);
  const airHp = ctx.createBiquadFilter();
  airHp.type = 'highpass';
  airHp.frequency.value = 3000;
  airHp.Q.value = 0.4;
  airNoise.connect(airHp);
  airHp.connect(airBus);
  airBus.connect(preMix);

  // Gentle reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.5, 2.8);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.65;
  wet.gain.value = 0.40;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 32;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Gentle pentatonic scale (C major pentatonic, low register)
  const SCALE = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69];

  // Section structure
  const SECTIONS = [
    { name: 'Pre-Dawn', bars: 4 },
    { name: 'First Light', bars: 4 },
    { name: 'Soft Awakening', bars: 4 },
    { name: 'Morning Glow', bars: 4 },
    { name: 'Day Begins', bars: 2 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setPadChord(t, rootMidi) {
    const root = midiToHz(rootMidi);
    const third = midiToHz(rootMidi + 4);
    const fifth = midiToHz(rootMidi + 7);
    const octave = midiToHz(rootMidi + 12);
    pad1.frequency.setTargetAtTime(root, t, 0.8);
    pad2.frequency.setTargetAtTime(third, t, 0.82);
    pad3.frequency.setTargetAtTime(fifth, t, 0.78);
    pad4.frequency.setTargetAtTime(octave, t, 0.85);
  }

  function mkGentleTone(t, midi, dur = 2.5, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = (Math.random() - 0.5) * 3;

    const env = ctx.createGain();
    env.gain.value = 0;

    osc.connect(env);
    env.connect(toneBus);

    const peak = 0.12 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.6);
    env.gain.setTargetAtTime(peak * 0.8, t + 1.0, 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.start(t);
    osc.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Gentle chord progressions
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setPadChord(t, 48); // C
      else if (cycleBar === 4) setPadChord(t, 50); // D
      else if (cycleBar === 8) setPadChord(t, 52); // E
      else if (cycleBar === 12) setPadChord(t, 55); // G
      else if (cycleBar === 16) setPadChord(t, 48); // C
    }

    // Very sparse gentle tones
    if (step % 16 === 0 && barIndex >= 2) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkGentleTone(t, SCALE[noteIdx], 3.0, 1.0);
    } else if (step % 12 === 8 && barIndex >= 6 && barIndex % 2 === 0) {
      const noteIdx = Math.floor((currentStep / 12) % SCALE.length);
      mkGentleTone(t, SCALE[noteIdx], 2.0, 0.6);
    }

    // Gentle air swells
    if (step === 0 && barIndex >= 8 && barIndex % 3 === 0) {
      airBus.gain.cancelScheduledValues(t);
      airBus.gain.setValueAtTime(0.08, t);
      airBus.gain.linearRampToValueAtTime(0.15, t + 2.0);
      airBus.gain.setTargetAtTime(0.08, t + 3.0, 1.2);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setPadChord(ctx.currentTime, 48);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { pad1.stop(); } catch { /* ignore */ }
    try { pad2.stop(); } catch { /* ignore */ }
    try { pad3.stop(); } catch { /* ignore */ }
    try { pad4.stop(); } catch { /* ignore */ }
    try { breathLfo.stop(); } catch { /* ignore */ }
    try { airNoise.stop(); } catch { /* ignore */ }
    try { pad1.disconnect(); } catch { /* ignore */ }
    try { pad2.disconnect(); } catch { /* ignore */ }
    try { pad3.disconnect(); } catch { /* ignore */ }
    try { pad4.disconnect(); } catch { /* ignore */ }
    try { breathLfo.disconnect(); } catch { /* ignore */ }
    try { breathLfoGain.disconnect(); } catch { /* ignore */ }
    try { padLp.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }
    try { toneBus.disconnect(); } catch { /* ignore */ }
    try { airNoise.disconnect(); } catch { /* ignore */ }
    try { airHp.disconnect(); } catch { /* ignore */ }
    try { airBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(70, Number(v) || 32)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createUnderwaterDreamDemo(ctx) {
  // Underwater Dream: Submerged atmosphere with muffled tones and dreamy depths
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Deep submerged drone layer
  const droneBus = ctx.createGain();
  droneBus.gain.value = 0.48;

  const drone1 = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const drone3 = ctx.createOscillator();
  drone1.type = 'sine';
  drone2.type = 'sine';
  drone3.type = 'triangle';
  drone2.detune.value = -4;
  drone3.detune.value = 6;

  // Underwater current modulation
  const currentLfo = ctx.createOscillator();
  currentLfo.type = 'sine';
  currentLfo.frequency.value = 0.10;
  const currentLfoGain = ctx.createGain();
  currentLfoGain.gain.value = 15;
  currentLfo.connect(currentLfoGain);
  currentLfoGain.connect(drone1.detune);
  currentLfoGain.connect(drone2.detune);
  currentLfoGain.connect(drone3.detune);

  // Heavy lowpass for underwater effect
  const droneLp = ctx.createBiquadFilter();
  droneLp.type = 'lowpass';
  droneLp.frequency.value = 900;
  droneLp.Q.value = 0.8;

  drone1.connect(droneLp);
  drone2.connect(droneLp);
  drone3.connect(droneLp);
  droneLp.connect(droneBus);
  droneBus.connect(preMix);

  drone1.start();
  drone2.start();
  drone3.start();
  currentLfo.start();

  // Bubble/tone layer
  const bubbleBus = ctx.createGain();
  bubbleBus.gain.value = 0.30;
  bubbleBus.connect(preMix);

  // Pressure layer - deep water feeling
  const pressureBus = ctx.createGain();
  pressureBus.gain.value = 0.12;
  const pressureNoise = createNoiseBufferSource(ctx, 2.0);
  const pressureLp = ctx.createBiquadFilter();
  pressureLp.type = 'lowpass';
  pressureLp.frequency.value = 400;
  pressureLp.Q.value = 1.2;
  pressureNoise.connect(pressureLp);
  pressureLp.connect(pressureBus);
  pressureBus.connect(preMix);

  // Deep underwater reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 3.8, 4.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.40;
  wet.gain.value = 0.68;
  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Transport
  let bpm = Number(ui.bpm.value) || 30;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 70) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 35;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Lydian mode for dreamy underwater feel (F Lydian)
  const SCALE = [41, 43, 45, 47, 48, 50, 52, 53, 55, 57];

  // Section structure
  const SECTIONS = [
    { name: 'Descent', bars: 3 },
    { name: 'Deep Waters', bars: 4 },
    { name: 'Dreamscape', bars: 5 },
    { name: 'Rising Currents', bars: 4 },
    { name: 'Surface', bars: 2 }
  ];
  const TOTAL_BARS = SECTIONS.reduce((sum, s) => sum + s.bars, 0);

  function getCurrentSection(barIndex) {
    let acc = 0;
    for (const sec of SECTIONS) {
      if (barIndex < acc + sec.bars) return sec;
      acc += sec.bars;
    }
    return SECTIONS[SECTIONS.length - 1];
  }

  function setDroneRoot(t, midi) {
    const hz = midiToHz(midi);
    drone1.frequency.setTargetAtTime(hz, t, 0.9);
    drone2.frequency.setTargetAtTime(hz * 1.003, t, 0.92);
    drone3.frequency.setTargetAtTime(hz * 0.498, t, 0.88);
  }

  function mkBubbleTone(t, midi, dur = 1.8, intensity = 1.0) {
    if (melodyLevel <= 0.01) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);

    const env = ctx.createGain();
    env.gain.value = 0;

    const bubbleLp = ctx.createBiquadFilter();
    bubbleLp.type = 'lowpass';
    bubbleLp.frequency.value = 1200;
    bubbleLp.Q.value = 0.6;

    osc.connect(bubbleLp);
    bubbleLp.connect(env);
    env.connect(bubbleBus);

    const peak = 0.16 * melodyLevel * intensity;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.2);
    env.gain.setTargetAtTime(peak * 0.7, t + 0.5, 0.2);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // Slight pitch rise like a bubble
    osc.frequency.exponentialRampToValueAtTime(midiToHz(midi + 0.5), t + dur * 0.6);

    osc.start(t);
    osc.stop(t + dur + 0.1);

    activeStops.add(() => {
      try { osc.stop(); } catch { /* ignore */ }
    });
  }

  function scheduleStep(step, t) {
    const barIndex = Math.floor(currentStep / 16);
    const section = getCurrentSection(barIndex % TOTAL_BARS);
    
    if (step === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      
      // Slow drone shifts
      const cycleBar = barIndex % TOTAL_BARS;
      if (cycleBar === 0) setDroneRoot(t, 41); // F
      else if (cycleBar === 3) setDroneRoot(t, 43); // G
      else if (cycleBar === 7) setDroneRoot(t, 45); // A
      else if (cycleBar === 12) setDroneRoot(t, 48); // C
      else if (cycleBar === 16) setDroneRoot(t, 41); // F
    }

    // Sparse bubble tones
    if (step % 16 === 0 && barIndex >= 1) {
      const noteIdx = Math.floor((currentStep / 16) % SCALE.length);
      mkBubbleTone(t, SCALE[noteIdx], 2.2, 1.0);
    } else if (step % 12 === 7 && barIndex >= 5 && barIndex % 2 === 1) {
      const noteIdx = Math.floor((currentStep / 12) % SCALE.length);
      mkBubbleTone(t, SCALE[noteIdx], 1.5, 0.7);
    }

    // Pressure swells for depth feeling
    if (step === 0 && barIndex >= 3 && barIndex <= 11 && barIndex % 2 === 0) {
      pressureBus.gain.cancelScheduledValues(t);
      pressureBus.gain.setValueAtTime(0.12, t);
      pressureBus.gain.linearRampToValueAtTime(0.20, t + 2.5);
      pressureBus.gain.setTargetAtTime(0.12, t + 4.0, 1.5);
    }

    // Current speed variations
    if (step === 0 && barIndex >= 7 && barIndex < 16) {
      const rate = 0.09 + (barIndex % 3) * 0.015;
      currentLfo.frequency.setTargetAtTime(rate, t, 1.0);
    }

    // Check for loop end
    if (step === 0 && barIndex > 0 && barIndex % TOTAL_BARS === 0 && !loopEnabled) {
      stopTransport();
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepInBar = currentStep % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    setDroneRoot(ctx.currentTime, 41);
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { /* ignore */ } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { drone1.stop(); } catch { /* ignore */ }
    try { drone2.stop(); } catch { /* ignore */ }
    try { drone3.stop(); } catch { /* ignore */ }
    try { currentLfo.stop(); } catch { /* ignore */ }
    try { pressureNoise.stop(); } catch { /* ignore */ }
    try { drone1.disconnect(); } catch { /* ignore */ }
    try { drone2.disconnect(); } catch { /* ignore */ }
    try { drone3.disconnect(); } catch { /* ignore */ }
    try { currentLfo.disconnect(); } catch { /* ignore */ }
    try { currentLfoGain.disconnect(); } catch { /* ignore */ }
    try { droneLp.disconnect(); } catch { /* ignore */ }
    try { droneBus.disconnect(); } catch { /* ignore */ }
    try { bubbleBus.disconnect(); } catch { /* ignore */ }
    try { pressureNoise.disconnect(); } catch { /* ignore */ }
    try { pressureLp.disconnect(); } catch { /* ignore */ }
    try { pressureBus.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(20, Math.min(65, Number(v) || 30)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createSynthwaveDemo(ctx) {
  // Original synthwave track: kick/snare/hats + sidechained pads + bass + lead.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // FX: delay + reverb (big neon space)
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.33;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 3200;

  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.6, 2.6);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.82;
  wet.gain.value = 0.30;

  preMix.connect(dry);
  preMix.connect(convolver);
  convolver.connect(wet);
  dry.connect(output);
  wet.connect(output);

  // Send bus for delay
  const send = ctx.createGain();
  send.gain.value = 0.22;
  send.connect(delay);
  delay.connect(preMix);

  // Noise source for hats/snare
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 6500;
  noise.connect(noiseHP);

  // Mix buses
  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.95;
  drumsBus.connect(preMix);

  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.55;
  bassBus.connect(preMix);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.32;
  padBus.connect(preMix);
  padBus.connect(send);

  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.42;
  leadBus.connect(preMix);
  leadBus.connect(send);

  // Sidechain ducking for pads/lead
  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.10, t, 0.005);
    leadBus.gain.setTargetAtTime(0.20, t, 0.005);
    padBus.gain.setTargetAtTime(0.32, t + 0.06, 0.08);
    leadBus.gain.setTargetAtTime(0.42, t + 0.06, 0.10);
  }

  let bpm = Number(ui.bpm.value) || 105;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.14;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g);
    g.connect(drumsBus);

    // click
    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(220, t);
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.exponentialRampToValueAtTime(0.10, t + 0.001);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    click.connect(cg);
    cg.connect(drumsBus);

    osc.start(t);
    osc.stop(t + 0.35);
    click.start(t);
    click.stop(t + 0.03);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { click.stop(); } catch { /* ignore */ } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.50, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(200, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.10);
    activeStops.add(() => { try { tone.stop(); } catch { /* ignore */ } });

    const stopAt = t + 0.25;
    setTimeout(() => { try { bp.disconnect(); } catch { /* ignore */ } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.16 : 0.10, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.14 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    const stopAt = t + 0.22;
    setTimeout(() => { try { hp.disconnect(); } catch { /* ignore */ } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.05, steps * timePerStep());
    const hz = midiToHz(midi);

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + Math.min(0.12, dur));
    lp.Q.value = 0.9;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.40, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);

    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.05);
    sub.stop(t + dur + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { sub.stop(); } catch { /* ignore */ } });
  }

  function mkPadChord(t, rootMidi, quality = 'minor') {
    // simple triad pad, 1 bar
    const dur = 16 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7] : [0, 3, 7];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.08);
    g.gain.setTargetAtTime(0.16, t + 0.30, 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -10;
      const hz = midiToHz(rootMidi + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.005, t);
      og.gain.setValueAtTime(0.45, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.1);
      o2.stop(t + dur + 0.1);
      activeStops.add(() => { try { o1.stop(); } catch { /* ignore */ } });
      activeStops.add(() => { try { o2.stop(); } catch { /* ignore */ } });
    }

    lp.connect(g);
    g.connect(padBus);
    setTimeout(() => {
      try { lp.disconnect(); } catch { /* ignore */ }
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (t + dur + 0.25 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.05, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    o1.type = 'square';
    o2.type = 'sawtooth';
    o2.detune.value = +8;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t);
    lp.Q.value = 0.8;

    const target = 0.26 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(leadBus);

    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
    activeStops.add(() => { try { o1.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { o2.stop(); } catch { /* ignore */ } });
  }

  // Arrangement (definite ending + optional loop)
  const SECTIONS = [
    { name: 'Intro', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Verse', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'Chorus', bars: 8, drums: 'full+', lead: 'active' },
    { name: 'Break', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Chorus', bars: 8, drums: 'full+', lead: 'active' },
    { name: 'Outro', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'Silence', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc, sectionIndex: SECTIONS.indexOf(s) };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // Original chord progression (F# minor-ish): i - VI - III - VII
  const CHORDS = [
    { root: 54, quality: 'minor', bass: 42 }, // F#
    { root: 50, quality: 'major', bass: 38 }, // D
    { root: 57, quality: 'major', bass: 45 }, // A
    { root: 52, quality: 'major', bass: 40 }, // E
  ];

  // Lead motifs (original)
  const LEAD_A = [66, 69, 73, 69, 66, 64, 66, 69];
  const LEAD_B = [73, 76, 73, 71, 69, 71, 73, 76];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Silence') {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      // kick
      const kickExtra = section.drums === 'full+';
      if (stepInBar === 0 || stepInBar === 8 || (kickExtra && stepInBar === 12)) {
        mkKick(t);
        duck(t);
      }
      // snare
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      // hats (8ths)
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
    }

    if (section.name !== 'Silence') {
      // bass: offbeat 8ths (steps 2,6,10,14) with occasional walk
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        const walk = (section.name === 'Chorus' && stepInBar === 14) ? (chord.bass + 2) : chord.bass;
        mkBass(t, walk, 2);
      }
    }

    // lead
    if (section.lead !== 'none' && section.name !== 'Silence') {
      const base = chord.root + 12; // around F#4 region depending chord
      if (section.lead === 'sparse') {
        if (stepInBar === 0 || stepInBar === 8) {
          const seq = (barIndex % 2 === 0) ? LEAD_A : LEAD_B;
          const note = seq[(barInSection + (stepInBar === 8 ? 4 : 0)) % seq.length];
          mkLead(t + 0.01, note, 4, 0.95);
        }
      } else {
        // active: 8th-note hook
        if (stepInBar % 2 === 0 && stepInBar !== 0) {
          const seq = (barIndex % 2 === 0) ? LEAD_A : LEAD_B;
          const idx = (Math.floor(stepInBar / 2) + barInSection) % seq.length;
          const note = seq[idx];
          mkLead(t + 0.01, note, 2, 1.05);
        }
        // little octave pop
        if (stepInBar === 15 && (barInSection % 4 === 3)) {
          mkLead(t + 0.01, base + 12, 1, 0.7);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;

      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.25);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.35);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { /* ignore */ } }, 250);
        return;
      }

      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);

      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.06);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.06);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { /* ignore */ }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { /* ignore */ }
    try { noise.stop(); } catch { /* ignore */ }
    try { noiseHP.disconnect(); } catch { /* ignore */ }
    try { send.disconnect(); } catch { /* ignore */ }
    try { delay.disconnect(); } catch { /* ignore */ }
    try { delayLP.disconnect(); } catch { /* ignore */ }
    try { feedback.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { drumsBus.disconnect(); } catch { /* ignore */ }
    try { bassBus.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }
    try { leadBus.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(170, Number(v) || 105)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createSovietwaveDemo(ctx) {
  // Original sovietwave-style track: nostalgic pads, tape-ish wobble, restrained beat.
  // This is an original composition and does not recreate any existing song.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Tape-ish wobble using very short modulated delay (subtle).
  const wowDelay = ctx.createDelay(0.05);
  wowDelay.delayTime.value = 0.012;
  const wowLfo = ctx.createOscillator();
  wowLfo.type = 'sine';
  wowLfo.frequency.value = 0.18;
  const wowGain = ctx.createGain();
  wowGain.gain.value = 0.0018;
  wowLfo.connect(wowGain);
  wowGain.connect(wowDelay.delayTime);

  const flutterLfo = ctx.createOscillator();
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 4.2;
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = 0.00025;
  flutterLfo.connect(flutterGain);
  flutterGain.connect(wowDelay.delayTime);

  // Cassette-ish tone shaping
  const tapeHP = ctx.createBiquadFilter();
  tapeHP.type = 'highpass';
  tapeHP.frequency.value = 45;

  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = 'lowpass';
  tapeLP.frequency.value = 7200;
  tapeLP.Q.value = 0.7;

  const tapeHiShelf = ctx.createBiquadFilter();
  tapeHiShelf.type = 'highshelf';
  tapeHiShelf.frequency.value = 5200;
  tapeHiShelf.gain.value = -6.5;

  // FX: subtle delay + roomy verb
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.34;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.24;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2400;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.0, 2.4);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.86;
  wet.gain.value = 0.24;

  // Routing: preMix -> tape -> output, with sends into delay/verb
  const send = ctx.createGain();
  send.gain.value = 0.18;

  preMix.connect(send);
  send.connect(delay);
  delay.connect(preMix);

  preMix.connect(convolver);
  convolver.connect(wet);

  preMix.connect(wowDelay);
  wowDelay.connect(tapeHP);
  tapeHP.connect(tapeLP);
  tapeLP.connect(tapeHiShelf);
  tapeHiShelf.connect(dry);
  dry.connect(output);
  wet.connect(output);

  wowLfo.start();
  flutterLfo.start();
  wowDelay.delayTime.setValueAtTime(0.012, ctx.currentTime);
  // (Don't call start() twice on the same oscillator.)

  // Noise for hats + tape hiss
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 7000;
  noise.connect(noiseHP);

  const hiss = ctx.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 5200;
  hiss.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.012;
  noiseHP.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(preMix);

  // Mix buses
  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.70;
  drumsBus.connect(preMix);

  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.48;
  bassBus.connect(preMix);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.36;
  padBus.connect(preMix);

  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.30;
  leadBus.connect(preMix);
  leadBus.connect(send);

  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.12, t, 0.006);
    leadBus.gain.setTargetAtTime(0.16, t, 0.006);
    padBus.gain.setTargetAtTime(0.36, t + 0.05, 0.14);
    leadBus.gain.setTargetAtTime(0.30, t + 0.05, 0.16);
  }

  let bpm = Number(ui.bpm.value) || 98;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.36);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(190, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.10, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.12);
    activeStops.add(() => { try { tone.stop(); } catch { /* ignore */ } });

    const stopAt = t + 0.28;
    setTimeout(() => { try { bp.disconnect(); } catch { /* ignore */ } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.13 : 0.08, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.16 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    const stopAt = t + 0.24;
    setTimeout(() => { try { hp.disconnect(); } catch { /* ignore */ } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + Math.min(0.12, dur));
    lp.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { sub.stop(); } catch { /* ignore */ } });
  }

  function mkPadChord(t, rootMidi, quality = 'minor') {
    // warm pad, 2 bars
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.20, t + 0.18);
    g.gain.setTargetAtTime(0.15, t + 0.60, 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -12;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.002, t);
      og.gain.setValueAtTime(0.34, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { /* ignore */ } });
      activeStops.add(() => { try { o2.stop(); } catch { /* ignore */ } });
    }

    lp.connect(g);
    g.connect(padBus);
    g.connect(send);
    setTimeout(() => {
      try { lp.disconnect(); } catch { /* ignore */ }
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (t + dur + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o2.detune.value = +6;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1200, t);
    bp.Q.value = 0.75;

    const target = 0.22 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g);
    g.connect(leadBus);

    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.08);
    o2.stop(t + dur + 0.08);
    activeStops.add(() => { try { o1.stop(); } catch { /* ignore */ } });
    activeStops.add(() => { try { o2.stop(); } catch { /* ignore */ } });
  }

  const SECTIONS = [
    { name: 'Intro', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Theme A', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'Theme B', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Break', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Theme A', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Outro', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'Silence', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // Classic, generic minor progression (E minor): i - VI - III - VII
  const CHORDS = [
    { root: 52, quality: 'minor', bass: 40 }, // E
    { root: 48, quality: 'major', bass: 36 }, // C
    { root: 55, quality: 'major', bass: 43 }, // G
    { root: 50, quality: 'major', bass: 38 }, // D
  ];

  // Original melodic fragments in E natural minor.
  const MELODY_A = [76, 74, 72, 71, 69, 71, 72, 74];
  const MELODY_B = [74, 72, 71, 69, 67, 69, 71, 72];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Silence' && (barIndex % 2 === 0)) {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      // kick: 4-on-the-floor, but softer
      if (stepInBar === 0 || stepInBar === 8) {
        mkKick(t);
        duck(t);
      }
      // snare on 2/4
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      // hats: 8ths, slightly open at the end of bar
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
    }

    if (section.name !== 'Silence') {
      // bass: offbeat 8ths (2,6,10,14)
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        const walk = (section.name === 'Theme B' && stepInBar === 14) ? (chord.bass + 2) : chord.bass;
        mkBass(t, walk, 2);
      }
    }

    if (section.lead !== 'none' && section.name !== 'Silence') {
      const seq = (barIndex % 2 === 0) ? MELODY_A : MELODY_B;
      if (section.lead === 'sparse') {
        if (stepInBar === 8) {
          const idx = (barInSection + 2) % seq.length;
          mkLead(t + 0.01, seq[idx], 4, 0.95);
        }
      } else {
        // active: 8th-note-ish call, but with space
        if (stepInBar % 4 === 2) {
          const idx = (Math.floor(stepInBar / 4) + barInSection) % seq.length;
          mkLead(t + 0.01, seq[idx], 2, 1.05);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;

      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.30);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { /* ignore */ } }, 250);
        return;
      }

      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);

      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { /* ignore */ }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { /* ignore */ }
    try { noise.stop(); } catch { /* ignore */ }
    try { noiseHP.disconnect(); } catch { /* ignore */ }
    try { hiss.disconnect(); } catch { /* ignore */ }
    try { hissGain.disconnect(); } catch { /* ignore */ }

    try { wowLfo.disconnect(); } catch { /* ignore */ }
    try { wowGain.disconnect(); } catch { /* ignore */ }
    try { flutterLfo.disconnect(); } catch { /* ignore */ }
    try { flutterGain.disconnect(); } catch { /* ignore */ }
    try { wowDelay.disconnect(); } catch { /* ignore */ }

    try { tapeHP.disconnect(); } catch { /* ignore */ }
    try { tapeLP.disconnect(); } catch { /* ignore */ }
    try { tapeHiShelf.disconnect(); } catch { /* ignore */ }

    try { send.disconnect(); } catch { /* ignore */ }
    try { delay.disconnect(); } catch { /* ignore */ }
    try { delayLP.disconnect(); } catch { /* ignore */ }
    try { feedback.disconnect(); } catch { /* ignore */ }
    try { convolver.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { drumsBus.disconnect(); } catch { /* ignore */ }
    try { bassBus.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }
    try { leadBus.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }

    try { wowLfo.stop(); } catch { /* ignore */ }
    try { flutterLfo.stop(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(160, Number(v) || 98)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createSovietRadioDemo(ctx) {
  // Soviet Radio: Slower, more melancholic sovietwave with tape crackle and distant broadcasts
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;
  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Tape wobble (more pronounced)
  const wowDelay = ctx.createDelay(0.05);
  wowDelay.delayTime.value = 0.015;
  const wowLfo = ctx.createOscillator();
  wowLfo.type = 'sine';
  wowLfo.frequency.value = 0.14;
  const wowGain = ctx.createGain();
  wowGain.gain.value = 0.0025;
  wowLfo.connect(wowGain);
  wowGain.connect(wowDelay.delayTime);

  const flutterLfo = ctx.createOscillator();
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 3.8;
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = 0.00035;
  flutterLfo.connect(flutterGain);
  flutterGain.connect(wowDelay.delayTime);

  // Old radio tone shaping
  const tapeHP = ctx.createBiquadFilter();
  tapeHP.type = 'highpass';
  tapeHP.frequency.value = 55;
  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = 'lowpass';
  tapeLP.frequency.value = 6500;
  tapeLP.Q.value = 0.8;
  const tapeHiShelf = ctx.createBiquadFilter();
  tapeHiShelf.type = 'highshelf';
  tapeHiShelf.frequency.value = 4800;
  tapeHiShelf.gain.value = -7.5;

  // Delay and reverb
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2000;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.4, 2.8);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.82;
  wet.gain.value = 0.32;

  const send = ctx.createGain();
  send.gain.value = 0.22;
  preMix.connect(send);
  send.connect(delay);
  delay.connect(preMix);
  preMix.connect(convolver);
  convolver.connect(wet);
  preMix.connect(wowDelay);
  wowDelay.connect(tapeHP);
  tapeHP.connect(tapeLP);
  tapeLP.connect(tapeHiShelf);
  tapeHiShelf.connect(dry);
  dry.connect(output);
  wet.connect(output);

  wowLfo.start();
  flutterLfo.start();

  // Tape hiss/crackle
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 6500;
  noise.connect(noiseHP);
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 5000;
  hiss.Q.value = 0.8;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.018;
  noiseHP.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(preMix);

  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.62;
  drumsBus.connect(preMix);
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.44;
  bassBus.connect(preMix);
  const padBus = ctx.createGain();
  padBus.gain.value = 0.42;
  padBus.connect(preMix);
  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.28;
  leadBus.connect(preMix);
  leadBus.connect(send);

  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.14, t, 0.008);
    leadBus.gain.setTargetAtTime(0.18, t, 0.008);
    padBus.gain.setTargetAtTime(0.42, t + 0.06, 0.16);
    leadBus.gain.setTargetAtTime(0.28, t + 0.06, 0.18);
  }

  let bpm = Number(ui.bpm.value) || 85;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() { return (60 / bpm) / 4; }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.88, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.38);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);
    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(180, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.14);
    activeStops.add(() => { try { tone.stop(); } catch { } });
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.11 : 0.07, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.18 : 0.06));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (t + 0.26 - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(110, t + Math.min(0.14, dur));
    lp.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { sub.stop(); } catch { } });
  }

  function mkPadChord(t, rootMidi, quality = 'minor') {
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.22);
    g.gain.setTargetAtTime(0.17, t + 0.70, 0.40);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -14;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.003, t);
      og.gain.setValueAtTime(0.36, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }
    lp.connect(g);
    g.connect(padBus);
    g.connect(send);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o2.detune.value = +8;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.002, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, t);
    bp.Q.value = 0.8;
    const target = 0.20 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g);
    g.connect(leadBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.08);
    o2.stop(t + dur + 0.08);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
  }

  const SECTIONS = [
    { name: 'Opening', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Broadcast A', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'Broadcast B', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Static', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Broadcast A', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Fadeout', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'Silence', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // D minor progression
  const CHORDS = [
    { root: 50, quality: 'minor', bass: 38 }, // D
    { root: 46, quality: 'major', bass: 34 }, // Bb
    { root: 53, quality: 'major', bass: 41 }, // F
    { root: 48, quality: 'major', bass: 36 }, // C
  ];

  const MELODY_A = [74, 72, 70, 69, 67, 69, 70, 72];
  const MELODY_B = [72, 70, 69, 67, 65, 67, 69, 70];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Silence' && (barIndex % 2 === 0)) {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      if (stepInBar === 0 || stepInBar === 8) { mkKick(t); duck(t); }
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
    }

    if (section.name !== 'Silence') {
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkBass(t, chord.bass, 2);
      }
    }

    if (section.lead !== 'none' && section.name !== 'Silence') {
      const seq = (barIndex % 2 === 0) ? MELODY_A : MELODY_B;
      if (section.lead === 'sparse') {
        if (stepInBar === 8) {
          const idx = (barInSection + 2) % seq.length;
          mkLead(t + 0.01, seq[idx], 4, 0.90);
        }
      } else {
        if (stepInBar % 4 === 2) {
          const idx = (Math.floor(stepInBar / 4) + barInSection) % seq.length;
          mkLead(t + 0.01, seq[idx], 2, 1.0);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.30);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); noise.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { hiss.disconnect(); } catch { }
    try { hissGain.disconnect(); } catch { }
    try { wowLfo.disconnect(); wowLfo.stop(); } catch { }
    try { wowGain.disconnect(); } catch { }
    try { flutterLfo.disconnect(); flutterLfo.stop(); } catch { }
    try { flutterGain.disconnect(); } catch { }
    try { wowDelay.disconnect(); } catch { }
    try { tapeHP.disconnect(); } catch { }
    try { tapeLP.disconnect(); } catch { }
    try { tapeHiShelf.disconnect(); } catch { }
    try { send.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayLP.disconnect(); } catch { }
    try { feedback.disconnect(); } catch { }
    try { convolver.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(160, Number(v) || 85)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createRedSquareDemo(ctx) {
  // Red Square Nights: Dark, heavy sovietwave with minor progressions
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;
  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Tape effects
  const wowDelay = ctx.createDelay(0.05);
  wowDelay.delayTime.value = 0.013;
  const wowLfo = ctx.createOscillator();
  wowLfo.type = 'sine';
  wowLfo.frequency.value = 0.16;
  const wowGain = ctx.createGain();
  wowGain.gain.value = 0.002;
  wowLfo.connect(wowGain);
  wowGain.connect(wowDelay.delayTime);
  const flutterLfo = ctx.createOscillator();
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 4.0;
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = 0.0003;
  flutterLfo.connect(flutterGain);
  flutterGain.connect(wowDelay.delayTime);

  const tapeHP = ctx.createBiquadFilter();
  tapeHP.type = 'highpass';
  tapeHP.frequency.value = 40;
  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = 'lowpass';
  tapeLP.frequency.value = 7000;
  tapeLP.Q.value = 0.75;
  const tapeHiShelf = ctx.createBiquadFilter();
  tapeHiShelf.type = 'highshelf';
  tapeHiShelf.frequency.value = 5000;
  tapeHiShelf.gain.value = -7.0;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.36;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.26;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2200;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.2, 2.6);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.84;
  wet.gain.value = 0.28;

  const send = ctx.createGain();
  send.gain.value = 0.20;
  preMix.connect(send);
  send.connect(delay);
  delay.connect(preMix);
  preMix.connect(convolver);
  convolver.connect(wet);
  preMix.connect(wowDelay);
  wowDelay.connect(tapeHP);
  tapeHP.connect(tapeLP);
  tapeLP.connect(tapeHiShelf);
  tapeHiShelf.connect(dry);
  dry.connect(output);
  wet.connect(output);

  wowLfo.start();
  flutterLfo.start();

  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 7000;
  noise.connect(noiseHP);
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 5200;
  hiss.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.014;
  noiseHP.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(preMix);

  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.75;
  drumsBus.connect(preMix);
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.52;
  bassBus.connect(preMix);
  const padBus = ctx.createGain();
  padBus.gain.value = 0.38;
  padBus.connect(preMix);
  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.32;
  leadBus.connect(preMix);
  leadBus.connect(send);

  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.10, t, 0.007);
    leadBus.gain.setTargetAtTime(0.14, t, 0.007);
    padBus.gain.setTargetAtTime(0.38, t + 0.06, 0.15);
    leadBus.gain.setTargetAtTime(0.32, t + 0.06, 0.17);
  }

  let bpm = Number(ui.bpm.value) || 92;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() { return (60 / bpm) / 4; }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.34);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1600;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);
    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(200, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.11);
    activeStops.add(() => { try { tone.stop(); } catch { } });
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.26 - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.12 : 0.08, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.15 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (t + 0.22 - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, t);
    lp.frequency.exponentialRampToValueAtTime(125, t + Math.min(0.11, dur));
    lp.Q.value = 0.85;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { sub.stop(); } catch { } });
  }

  function mkPadChord(t, rootMidi, quality = 'minor') {
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1500, t);
    lp.Q.value = 0.65;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.21, t + 0.20);
    g.gain.setTargetAtTime(0.16, t + 0.65, 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -13;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.002, t);
      og.gain.setValueAtTime(0.35, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }
    lp.connect(g);
    g.connect(padBus);
    g.connect(send);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o2.detune.value = +7;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1150, t);
    bp.Q.value = 0.78;
    const target = 0.21 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g);
    g.connect(leadBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.08);
    o2.stop(t + dur + 0.08);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
  }

  const SECTIONS = [
    { name: 'Dusk', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Dark Streets A', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'Dark Streets B', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Silence', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Dark Streets A', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Dawn', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'End', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // A minor progression (dark)
  const CHORDS = [
    { root: 45, quality: 'minor', bass: 33 }, // A
    { root: 53, quality: 'major', bass: 41 }, // F
    { root: 48, quality: 'major', bass: 36 }, // C
    { root: 55, quality: 'major', bass: 43 }, // G
  ];

  const MELODY_A = [69, 67, 65, 64, 62, 64, 65, 67];
  const MELODY_B = [67, 65, 64, 62, 60, 62, 64, 65];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'End' && (barIndex % 2 === 0)) {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      if (stepInBar === 0 || stepInBar === 8) { mkKick(t); duck(t); }
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
    }

    if (section.name !== 'End') {
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkBass(t, chord.bass, 2);
      }
    }

    if (section.lead !== 'none' && section.name !== 'End') {
      const seq = (barIndex % 2 === 0) ? MELODY_A : MELODY_B;
      if (section.lead === 'sparse') {
        if (stepInBar === 8) {
          const idx = (barInSection + 2) % seq.length;
          mkLead(t + 0.01, seq[idx], 4, 0.92);
        }
      } else {
        if (stepInBar % 4 === 2) {
          const idx = (Math.floor(stepInBar / 4) + barInSection) % seq.length;
          mkLead(t + 0.01, seq[idx], 2, 1.03);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.30);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); noise.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { hiss.disconnect(); } catch { }
    try { hissGain.disconnect(); } catch { }
    try { wowLfo.disconnect(); wowLfo.stop(); } catch { }
    try { wowGain.disconnect(); } catch { }
    try { flutterLfo.disconnect(); flutterLfo.stop(); } catch { }
    try { flutterGain.disconnect(); } catch { }
    try { wowDelay.disconnect(); } catch { }
    try { tapeHP.disconnect(); } catch { }
    try { tapeLP.disconnect(); } catch { }
    try { tapeHiShelf.disconnect(); } catch { }
    try { send.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayLP.disconnect(); } catch { }
    try { feedback.disconnect(); } catch { }
    try { convolver.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(160, Number(v) || 92)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createFactoryFloorsDemo(ctx) {
  // Factory Floors: Industrial sovietwave with mechanical rhythms
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;
  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Tape effects
  const wowDelay = ctx.createDelay(0.05);
  wowDelay.delayTime.value = 0.011;
  const wowLfo = ctx.createOscillator();
  wowLfo.type = 'sine';
  wowLfo.frequency.value = 0.20;
  const wowGain = ctx.createGain();
  wowGain.gain.value = 0.0016;
  wowLfo.connect(wowGain);
  wowGain.connect(wowDelay.delayTime);
  const flutterLfo = ctx.createOscillator();
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 4.5;
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = 0.00022;
  flutterLfo.connect(flutterGain);
  flutterGain.connect(wowDelay.delayTime);

  const tapeHP = ctx.createBiquadFilter();
  tapeHP.type = 'highpass';
  tapeHP.frequency.value = 48;
  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = 'lowpass';
  tapeLP.frequency.value = 7500;
  tapeLP.Q.value = 0.7;
  const tapeHiShelf = ctx.createBiquadFilter();
  tapeHiShelf.type = 'highshelf';
  tapeHiShelf.frequency.value = 5400;
  tapeHiShelf.gain.value = -6.0;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.30;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.22;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2600;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 1.8, 2.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.88;
  wet.gain.value = 0.22;

  const send = ctx.createGain();
  send.gain.value = 0.16;
  preMix.connect(send);
  send.connect(delay);
  delay.connect(preMix);
  preMix.connect(convolver);
  convolver.connect(wet);
  preMix.connect(wowDelay);
  wowDelay.connect(tapeHP);
  tapeHP.connect(tapeLP);
  tapeLP.connect(tapeHiShelf);
  tapeHiShelf.connect(dry);
  dry.connect(output);
  wet.connect(output);

  wowLfo.start();
  flutterLfo.start();

  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 7000;
  noise.connect(noiseHP);
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 5200;
  hiss.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.011;
  noiseHP.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(preMix);

  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.78;
  drumsBus.connect(preMix);
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.50;
  bassBus.connect(preMix);
  const padBus = ctx.createGain();
  padBus.gain.value = 0.34;
  padBus.connect(preMix);
  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.28;
  leadBus.connect(preMix);
  leadBus.connect(send);

  // Metallic hit layer
  const metalBus = ctx.createGain();
  metalBus.gain.value = 0.18;
  metalBus.connect(preMix);

  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.11, t, 0.006);
    leadBus.gain.setTargetAtTime(0.15, t, 0.006);
    padBus.gain.setTargetAtTime(0.34, t + 0.05, 0.14);
    leadBus.gain.setTargetAtTime(0.28, t + 0.05, 0.16);
  }

  let bpm = Number(ui.bpm.value) || 102;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() { return (60 / bpm) / 4; }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(112, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.98, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.36);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1550;
    bp.Q.value = 0.65;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.40, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);
    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(195, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.11, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.12);
    activeStops.add(() => { try { tone.stop(); } catch { } });
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.27 - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.13 : 0.09, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.16 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (t + 0.24 - ctx.currentTime) * 1000 + 50));
  }

  function mkMetalHit(t) {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sine';
    o2.type = 'sine';
    o3.type = 'sine';
    o1.frequency.setValueAtTime(1800, t);
    o2.frequency.setValueAtTime(2400, t);
    o3.frequency.setValueAtTime(3200, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o1.connect(g);
    o2.connect(g);
    o3.connect(g);
    g.connect(metalBus);
    o1.start(t);
    o2.start(t);
    o3.start(t);
    o1.stop(t + 0.10);
    o2.stop(t + 0.10);
    o3.stop(t + 0.10);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
    activeStops.add(() => { try { o3.stop(); } catch { } });
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(230, t);
    lp.frequency.exponentialRampToValueAtTime(118, t + Math.min(0.12, dur));
    lp.Q.value = 0.82;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.40, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { sub.stop(); } catch { } });
  }

  function mkPadChord(t, rootMidi, quality = 'minor') {
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1550, t);
    lp.Q.value = 0.62;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.19, t + 0.19);
    g.gain.setTargetAtTime(0.14, t + 0.62, 0.36);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -11;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.001, t);
      og.gain.setValueAtTime(0.33, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }
    lp.connect(g);
    g.connect(padBus);
    g.connect(send);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o2.detune.value = +5;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1220, t);
    bp.Q.value = 0.73;
    const target = 0.19 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.032);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g);
    g.connect(leadBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.08);
    o2.stop(t + dur + 0.08);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
  }

  const SECTIONS = [
    { name: 'Shift Start', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Production Line A', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'Production Line B', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Machine Break', bars: 4, drums: 'light', lead: 'none' },
    { name: 'Production Line A', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Shift End', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'Power Down', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // G minor progression
  const CHORDS = [
    { root: 55, quality: 'minor', bass: 43 }, // G
    { root: 51, quality: 'major', bass: 39 }, // Eb
    { root: 46, quality: 'major', bass: 34 }, // Bb
    { root: 53, quality: 'major', bass: 41 }, // F
  ];

  const MELODY_A = [79, 77, 75, 74, 72, 74, 75, 77];
  const MELODY_B = [77, 75, 74, 72, 70, 72, 74, 75];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Power Down' && (barIndex % 2 === 0)) {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      if (stepInBar === 0 || stepInBar === 8) { mkKick(t); duck(t); }
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
      // Metallic hits on offbeats for industrial feel
      if (stepInBar === 3 || stepInBar === 11) mkMetalHit(t);
    }

    if (section.name !== 'Power Down') {
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkBass(t, chord.bass, 2);
      }
    }

    if (section.lead !== 'none' && section.name !== 'Power Down') {
      const seq = (barIndex % 2 === 0) ? MELODY_A : MELODY_B;
      if (section.lead === 'sparse') {
        if (stepInBar === 8) {
          const idx = (barInSection + 2) % seq.length;
          mkLead(t + 0.01, seq[idx], 4, 0.93);
        }
      } else {
        if (stepInBar % 4 === 2) {
          const idx = (Math.floor(stepInBar / 4) + barInSection) % seq.length;
          mkLead(t + 0.01, seq[idx], 2, 1.04);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.30);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); noise.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { hiss.disconnect(); } catch { }
    try { hissGain.disconnect(); } catch { }
    try { wowLfo.disconnect(); wowLfo.stop(); } catch { }
    try { wowGain.disconnect(); } catch { }
    try { flutterLfo.disconnect(); flutterLfo.stop(); } catch { }
    try { flutterGain.disconnect(); } catch { }
    try { wowDelay.disconnect(); } catch { }
    try { tapeHP.disconnect(); } catch { }
    try { tapeLP.disconnect(); } catch { }
    try { tapeHiShelf.disconnect(); } catch { }
    try { send.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayLP.disconnect(); } catch { }
    try { feedback.disconnect(); } catch { }
    try { convolver.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { metalBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(160, Number(v) || 102)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createGlasnostDreamsDemo(ctx) {
  // Glasnost Dreams: Hopeful sovietwave with major chords and optimistic melodies
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;
  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Tape effects (lighter)
  const wowDelay = ctx.createDelay(0.05);
  wowDelay.delayTime.value = 0.012;
  const wowLfo = ctx.createOscillator();
  wowLfo.type = 'sine';
  wowLfo.frequency.value = 0.17;
  const wowGain = ctx.createGain();
  wowGain.gain.value = 0.0015;
  wowLfo.connect(wowGain);
  wowGain.connect(wowDelay.delayTime);
  const flutterLfo = ctx.createOscillator();
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 4.1;
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = 0.00020;
  flutterLfo.connect(flutterGain);
  flutterGain.connect(wowDelay.delayTime);

  const tapeHP = ctx.createBiquadFilter();
  tapeHP.type = 'highpass';
  tapeHP.frequency.value = 50;
  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = 'lowpass';
  tapeLP.frequency.value = 8000;
  tapeLP.Q.value = 0.65;
  const tapeHiShelf = ctx.createBiquadFilter();
  tapeHiShelf.type = 'highshelf';
  tapeHiShelf.frequency.value = 5600;
  tapeHiShelf.gain.value = -5.5;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.32;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.25;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2800;
  delay.connect(delayLP);
  delayLP.connect(feedback);
  feedback.connect(delay);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.1, 2.5);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.85;
  wet.gain.value = 0.26;

  const send = ctx.createGain();
  send.gain.value = 0.19;
  preMix.connect(send);
  send.connect(delay);
  delay.connect(preMix);
  preMix.connect(convolver);
  convolver.connect(wet);
  preMix.connect(wowDelay);
  wowDelay.connect(tapeHP);
  tapeHP.connect(tapeLP);
  tapeLP.connect(tapeHiShelf);
  tapeHiShelf.connect(dry);
  dry.connect(output);
  wet.connect(output);

  wowLfo.start();
  flutterLfo.start();

  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 7000;
  noise.connect(noiseHP);
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'bandpass';
  hiss.frequency.value = 5200;
  hiss.Q.value = 0.7;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.010;
  noiseHP.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(preMix);

  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.68;
  drumsBus.connect(preMix);
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.46;
  bassBus.connect(preMix);
  const padBus = ctx.createGain();
  padBus.gain.value = 0.38;
  padBus.connect(preMix);
  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.34;
  leadBus.connect(preMix);
  leadBus.connect(send);

  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.13, t, 0.007);
    leadBus.gain.setTargetAtTime(0.20, t, 0.007);
    padBus.gain.setTargetAtTime(0.38, t + 0.05, 0.15);
    leadBus.gain.setTargetAtTime(0.34, t + 0.05, 0.17);
  }

  let bpm = Number(ui.bpm.value) || 95;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() { return (60 / bpm) / 4; }

  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(108, t);
    osc.frequency.exponentialRampToValueAtTime(47, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.92, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.36);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1450;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);
    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(185, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.13);
    activeStops.add(() => { try { tone.stop(); } catch { } });
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.29 - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.12 : 0.08, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.17 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (t + 0.25 - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, midi, steps = 2) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(210, t);
    lp.frequency.exponentialRampToValueAtTime(115, t + Math.min(0.13, dur));
    lp.Q.value = 0.78;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.011);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.06);
    sub.stop(t + dur + 0.06);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { sub.stop(); } catch { } });
  }

  function mkPadChord(t, rootMidi, quality = 'major') {
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1650, t);
    lp.Q.value = 0.58;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.21, t + 0.17);
    g.gain.setTargetAtTime(0.16, t + 0.58, 0.34);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -10;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.001, t);
      og.gain.setValueAtTime(0.35, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }
    lp.connect(g);
    g.connect(padBus);
    g.connect(send);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.30 - ctx.currentTime) * 1000 + 50));
  }

  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o2.detune.value = +4;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1280, t);
    bp.Q.value = 0.72;
    const target = 0.23 * melodyLevel * Math.max(0.3, Math.min(1.2, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.028);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g);
    g.connect(leadBus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.08);
    o2.stop(t + dur + 0.08);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
  }

  const SECTIONS = [
    { name: 'Hope Rises', bars: 4, drums: 'light', lead: 'none' },
    { name: 'New Dawn A', bars: 8, drums: 'full', lead: 'sparse' },
    { name: 'New Dawn B', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Reflection', bars: 4, drums: 'light', lead: 'none' },
    { name: 'New Dawn A', bars: 8, drums: 'full', lead: 'active' },
    { name: 'Tomorrow', bars: 4, drums: 'full', lead: 'sparse' },
    { name: 'Peace', bars: 2, drums: 'none', lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // C major progression (hopeful)
  const CHORDS = [
    { root: 48, quality: 'major', bass: 36 }, // C
    { root: 55, quality: 'major', bass: 43 }, // G
    { root: 45, quality: 'minor', bass: 33 }, // A
    { root: 53, quality: 'major', bass: 41 }, // F
  ];

  const MELODY_A = [72, 74, 76, 77, 79, 77, 76, 74];
  const MELODY_B = [74, 76, 77, 79, 81, 79, 77, 76];

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Peace' && (barIndex % 2 === 0)) {
        mkPadChord(t, chord.root, chord.quality);
      }
    }

    if (section.drums !== 'none') {
      if (stepInBar === 0 || stepInBar === 8) { mkKick(t); duck(t); }
      if (stepInBar === 4 || stepInBar === 12) mkSnare(t);
      if (stepInBar % 2 === 0 && stepInBar !== 0) mkHat(t, stepInBar === 14);
    }

    if (section.name !== 'Peace') {
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkBass(t, chord.bass, 2);
      }
    }

    if (section.lead !== 'none' && section.name !== 'Peace') {
      const seq = (barIndex % 2 === 0) ? MELODY_A : MELODY_B;
      if (section.lead === 'sparse') {
        if (stepInBar === 8) {
          const idx = (barInSection + 2) % seq.length;
          mkLead(t + 0.01, seq[idx], 4, 0.96);
        }
      } else {
        if (stepInBar % 4 === 2) {
          const idx = (Math.floor(stepInBar / 4) + barInSection) % seq.length;
          mkLead(t + 0.01, seq[idx], 2, 1.06);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.30);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); noise.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { hiss.disconnect(); } catch { }
    try { hissGain.disconnect(); } catch { }
    try { wowLfo.disconnect(); wowLfo.stop(); } catch { }
    try { wowGain.disconnect(); } catch { }
    try { flutterLfo.disconnect(); flutterLfo.stop(); } catch { }
    try { flutterGain.disconnect(); } catch { }
    try { wowDelay.disconnect(); } catch { }
    try { tapeHP.disconnect(); } catch { }
    try { tapeLP.disconnect(); } catch { }
    try { tapeHiShelf.disconnect(); } catch { }
    try { send.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayLP.disconnect(); } catch { }
    try { feedback.disconnect(); } catch { }
    try { convolver.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(70, Math.min(160, Number(v) || 95)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createProbabilityGardenDemo(ctx) {
  // Probability Garden: Claude-inspired generative piece
  // Explores polyrhythms, probabilistic triggering, glitchy textures, emergent patterns
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;
  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // Bright, open reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 2.8, 3.2);
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.70;
  wet.gain.value = 0.40;

  // Short, rhythmic delay
  const delay1 = ctx.createDelay(1.0);
  delay1.delayTime.value = 0.125; // 1/8 note
  const delay2 = ctx.createDelay(1.0);
  delay2.delayTime.value = 0.1875; // Dotted 1/8
  const feedback1 = ctx.createGain();
  feedback1.gain.value = 0.35;
  const feedback2 = ctx.createGain();
  feedback2.gain.value = 0.28;
  const delayHP = ctx.createBiquadFilter();
  delayHP.type = 'highpass';
  delayHP.frequency.value = 800;
  
  delay1.connect(delayHP);
  delayHP.connect(feedback1);
  feedback1.connect(delay1);
  delayHP.connect(delay2);
  delay2.connect(feedback2);
  feedback2.connect(delay2);

  const sendDelay = ctx.createGain();
  sendDelay.gain.value = 0.25;
  
  preMix.connect(sendDelay);
  sendDelay.connect(delay1);
  delay1.connect(preMix);
  delay2.connect(preMix);
  
  preMix.connect(convolver);
  convolver.connect(wet);
  preMix.connect(dry);
  dry.connect(output);
  wet.connect(output);

  // Glitchy digital texture
  const noise = createNoiseBufferSource(ctx, 0.5);
  const noiseBP = ctx.createBiquadFilter();
  noiseBP.type = 'bandpass';
  noiseBP.frequency.value = 3200;
  noiseBP.Q.value = 3.0;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.006;
  noise.connect(noiseBP);
  noiseBP.connect(noiseGain);
  noiseGain.connect(preMix);

  // LFO for filter modulation
  const modLfo = ctx.createOscillator();
  modLfo.type = 'sine';
  modLfo.frequency.value = 0.17;
  const modGain = ctx.createGain();
  modGain.gain.value = 150;
  modLfo.connect(modGain);
  modLfo.start();

  const bellBus = ctx.createGain();
  bellBus.gain.value = 0.40;
  bellBus.connect(preMix);
  bellBus.connect(sendDelay);
  
  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.28;
  bassBus.connect(preMix);
  
  const glitchBus = ctx.createGain();
  glitchBus.gain.value = 0.22;
  glitchBus.connect(preMix);
  
  const percBus = ctx.createGain();
  percBus.gain.value = 0.35;
  percBus.connect(preMix);

  let bpm = Number(ui.bpm.value) || 110;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 80) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.15;
  const lookaheadMs = 25;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() { return (60 / bpm) / 4; }

  // Random but seeded-like for consistency
  function pseudoRandom(step, offset) {
    const val = Math.sin(step * 12.9898 + offset * 78.233) * 43758.5453;
    return val - Math.floor(val);
  }

  function mkBellTone(t, midi, steps = 2, vel = 1.0, prob = 1.0) {
    if (melodyLevel <= 0.001) return;
    if (pseudoRandom(currentStep, midi) > prob) return; // Probabilistic triggering
    
    const dur = Math.max(0.2, steps * timePerStep());
    const hz = midiToHz(midi);
    
    // Bell-like with inharmonic partials
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    const o4 = ctx.createOscillator();
    
    o1.type = 'sine';
    o2.type = 'sine';
    o3.type = 'sine';
    o4.type = 'sine';
    
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 2.76, t); // Inharmonic
    o3.frequency.setValueAtTime(hz * 5.4, t);
    o4.frequency.setValueAtTime(hz * 8.93, t);
    
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const g3 = ctx.createGain();
    const g4 = ctx.createGain();
    const master = ctx.createGain();
    
    const target = 0.28 * melodyLevel * vel;
    
    g1.gain.setValueAtTime(target, t);
    g2.gain.setValueAtTime(target * 0.4, t);
    g3.gain.setValueAtTime(target * 0.15, t);
    g4.gain.setValueAtTime(target * 0.08, t);
    
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(1.0, t + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    
    o1.connect(g1);
    o2.connect(g2);
    o3.connect(g3);
    o4.connect(g4);
    g1.connect(master);
    g2.connect(master);
    g3.connect(master);
    g4.connect(master);
    master.connect(bellBus);
    
    o1.start(t);
    o2.start(t);
    o3.start(t);
    o4.start(t);
    const stopTime = t + dur + 0.1;
    o1.stop(stopTime);
    o2.stop(stopTime);
    o3.stop(stopTime);
    o4.stop(stopTime);
    
    activeStops.add(() => { try { o1.stop(); o2.stop(); o3.stop(); o4.stop(); } catch { } });
  }

  function mkSubBass(t, midi, steps = 4) {
    const dur = Math.max(0.3, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, t);
    lp.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.50, t + 0.05);
    g.gain.setTargetAtTime(0.42, t + 0.2, 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(bassBus);
    osc.start(t);
    osc.stop(t + dur + 0.1);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkGlitch(t, type = 'click') {
    if (type === 'click') {
      // Sharp digital click
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400 + pseudoRandom(currentStep, 7) * 3000;
      bp.Q.value = 8.0;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.30, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
      noiseBP.connect(bp);
      bp.connect(g);
      g.connect(glitchBus);
      setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.05 - ctx.currentTime) * 1000));
    } else if (type === 'burst') {
      // Granular burst
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      noiseBP.connect(hp);
      hp.connect(g);
      g.connect(glitchBus);
      setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (t + 0.08 - ctx.currentTime) * 1000));
    }
  }

  function mkPolyrhythmicPerc(t, division) {
    // Different timbres for different polyrhythmic layers
    const freq = division === 3 ? 800 : division === 4 ? 1200 : 1800;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 4.0;
    const g = ctx.createGain();
    const amp = division === 3 ? 0.25 : division === 4 ? 0.20 : 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    noiseBP.connect(bp);
    bp.connect(g);
    g.connect(percBus);
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (t + 0.20 - ctx.currentTime) * 1000));
  }

  const SECTIONS = [
    { name: 'Seed', bars: 4, density: 0.3, glitch: 'sparse' },
    { name: 'Sprouting', bars: 4, density: 0.5, glitch: 'medium' },
    { name: 'Growth', bars: 4, density: 0.7, glitch: 'active' },
    { name: 'Bloom', bars: 4, density: 0.9, glitch: 'intense' },
    { name: 'Full Garden', bars: 4, density: 1.0, glitch: 'intense' },
    { name: 'Scattering', bars: 4, density: 0.6, glitch: 'medium' },
    { name: 'Return', bars: 4, density: 0.3, glitch: 'sparse' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (const s of SECTIONS) {
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // F# Lydian scale (bright, dreamy)
  const F_SHARP_LYDIAN = [66, 68, 70, 72, 73, 75, 77, 78]; // F# G# A# B# C# D# E# F#
  
  // Three independent melodic voices with different rhythms
  const VOICE_A = [78, 82, 85, 82, 78, 75, 73, 75]; // High bells
  const VOICE_B = [73, 75, 77, 78, 75, 73, 70, 72]; // Mid bells
  const VOICE_C = [70, 68, 66, 68, 70, 72, 73, 70]; // Low bells

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);

    if (stepInBar === 0) {
      setStatus(`Running — ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
    }

    // Bass on root - every 4 steps
    if (stepInBar % 4 === 0 && pseudoRandom(currentStep, 1) < 0.7 + section.density * 0.3) {
      mkSubBass(t, 54, 4); // F# bass
    }

    // Voice A: plays in 5-step cycles (polyrhythm against 4/4)
    if (currentStep % 5 === 0) {
      const idx = Math.floor(currentStep / 5) % VOICE_A.length;
      const prob = 0.5 + section.density * 0.5;
      mkBellTone(t, VOICE_A[idx], 3, 0.9, prob);
    }

    // Voice B: plays in 3-step cycles
    if (currentStep % 3 === 0) {
      const idx = Math.floor(currentStep / 3) % VOICE_B.length;
      const prob = 0.4 + section.density * 0.6;
      mkBellTone(t + 0.01, VOICE_B[idx], 2, 0.8, prob);
    }

    // Voice C: plays in 4-step cycles (normal time)
    if (stepInBar % 4 === 2) {
      const idx = Math.floor(currentStep / 4) % VOICE_C.length;
      const prob = 0.6 + section.density * 0.4;
      mkBellTone(t + 0.02, VOICE_C[idx], 2, 0.75, prob);
    }

    // Polyrhythmic percussion
    if (section.density > 0.4) {
      if (currentStep % 3 === 0) mkPolyrhythmicPerc(t, 3);
      if (currentStep % 4 === 0) mkPolyrhythmicPerc(t, 4);
      if (section.density > 0.7 && currentStep % 5 === 0) mkPolyrhythmicPerc(t, 5);
    }

    // Glitchy textures
    if (section.glitch === 'sparse') {
      if (pseudoRandom(currentStep, 13) < 0.08) mkGlitch(t, 'click');
    } else if (section.glitch === 'medium') {
      if (pseudoRandom(currentStep, 13) < 0.15) mkGlitch(t, pseudoRandom(currentStep, 14) < 0.5 ? 'click' : 'burst');
    } else if (section.glitch === 'active') {
      if (pseudoRandom(currentStep, 13) < 0.22) mkGlitch(t, pseudoRandom(currentStep, 14) < 0.6 ? 'click' : 'burst');
    } else if (section.glitch === 'intense') {
      if (pseudoRandom(currentStep, 13) < 0.35) mkGlitch(t, pseudoRandom(currentStep, 14) < 0.5 ? 'click' : 'burst');
    }

    // Occasional harmonic accent on downbeat
    if (stepInBar === 0 && section.density > 0.6 && pseudoRandom(currentStep, 20) < 0.4) {
      mkBellTone(t + 0.015, 90, 8, 0.6, 1.0); // High accent
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 1.0);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 1.2);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 400);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); noise.stop(); } catch { }
    try { noiseBP.disconnect(); } catch { }
    try { noiseGain.disconnect(); } catch { }
    try { modLfo.disconnect(); modLfo.stop(); } catch { }
    try { modGain.disconnect(); } catch { }
    try { sendDelay.disconnect(); } catch { }
    try { delay1.disconnect(); } catch { }
    try { delay2.disconnect(); } catch { }
    try { delayHP.disconnect(); } catch { }
    try { feedback1.disconnect(); } catch { }
    try { feedback2.disconnect(); } catch { }
    try { convolver.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { bellBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { glitchBus.disconnect(); } catch { }
    try { percBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(85, Math.min(140, Number(v) || 110)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createAuroraDemo(ctx) {
  // Ambient aurora drift: airy pads, gentle pulses, slow arpeggios.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.38;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 2800;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.28;
  delay.connect(delayLP);
  delayLP.connect(delayFeedback);
  delayFeedback.connect(delay);

  const verb = ctx.createConvolver();
  verb.buffer = createImpulseResponse(ctx, 3.2, 3.4);
  const dry = ctx.createGain();
  dry.gain.value = 0.74;
  const wet = ctx.createGain();
  wet.gain.value = 0.32;

  preMix.connect(dry);
  dry.connect(output);
  preMix.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  preMix.connect(verb);
  verb.connect(output);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.34;
  padBus.connect(preMix);

  const arpBus = ctx.createGain();
  arpBus.gain.value = 0.24;
  arpBus.connect(preMix);
  arpBus.connect(delay);

  const pulseBus = ctx.createGain();
  pulseBus.gain.value = 0.18;
  pulseBus.connect(preMix);
  pulseBus.connect(delay);

  let bpm = Number(ui.bpm.value) || 72;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 55) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.18;
  const lookaheadMs = 30;
  let timerId = null;
  const activeStops = new Set();

  const ARP_PATTERNS = [
    [0, 3, 7, 12],
    [0, 4, 7, 11],
    [0, 5, 9, 12],
  ];

  const SECTIONS = [
    { name: 'Drift', bars: 6, drums: 'pulse', arpeggio: 'sparse', quality: 'minor' },
    { name: 'Glow', bars: 8, drums: 'pulse', arpeggio: 'active', quality: 'major' },
    { name: 'Lift', bars: 6, drums: 'pulse', arpeggio: 'active', quality: 'major' },
    { name: 'Breath', bars: 4, drums: 'soft', arpeggio: 'sparse', quality: 'minor' },
    { name: 'Pulse', bars: 6, drums: 'pulse', arpeggio: 'active', quality: 'minor' },
    { name: 'Outro', bars: 4, drums: 'soft', arpeggio: 'sparse', quality: 'minor' },
    { name: 'Silence', bars: 2, drums: 'none', arpeggio: 'none', quality: 'minor' },
  ];

  const CHORDS = [
    { root: 57, quality: 'minor', bass: 45 },
    { root: 53, quality: 'major', bass: 41 },
    { root: 50, quality: 'major', bass: 38 },
    { root: 62, quality: 'major', bass: 50 },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  function mkPulse(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.48, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(pulseBus);
    osc.start(t);
    osc.stop(t + 0.4);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    setTimeout(() => {
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (t + 0.35 - ctx.currentTime) * 1000 + 50));
  }

  function mkPadChord(t, rootMidi, quality) {
    const dur = 32 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 12] : [0, 3, 7, 10];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    lp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.7);
    g.gain.setTargetAtTime(0.22, t + 1.2, 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    g.connect(padBus);

    for (const iv of intervals) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToHz(rootMidi + iv), t);
      osc.detune.setValueAtTime(Math.random() * 6 - 3, t);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.25);
      activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    }

    setTimeout(() => {
      try { lp.disconnect(); } catch { /* ignore */ }
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (t + dur + 0.4 - ctx.currentTime) * 1000 + 50));
  }

  function mkArp(t, rootMidi, pattern) {
    if (melodyLevel <= 0.01) return;
    const dur = Math.max(0.08, 2 * timePerStep());
    const idx = Math.floor(Math.random() * pattern.length);
    const midi = rootMidi + pattern[idx];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToHz(midi), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * melodyLevel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(arpBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { /* ignore */ } });
    setTimeout(() => {
      try { g.disconnect(); } catch { /* ignore */ }
    }, Math.max(0, (t + dur + 0.2 - ctx.currentTime) * 1000 + 50));
  }

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc, sectionIndex: i };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, sectionIndex } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      setStatus(`Running - ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      if (section.name !== 'Silence') {
        mkPadChord(t, chord.root, section.quality);
      }
    }

    if (section.drums === 'pulse') {
      if (stepInBar === 0 || stepInBar === 8) {
        mkPulse(t);
      }
    } else if (section.drums === 'soft' && stepInBar === 8) {
      mkPulse(t);
    }

    if (section.arpeggio === 'active' && stepInBar % 4 === 0 && stepInBar !== 0) {
      const pattern = ARP_PATTERNS[(sectionIndex + Math.floor(stepInBar / 4)) % ARP_PATTERNS.length];
      mkArp(t + 0.01, chord.root + 12, pattern);
    } else if (section.arpeggio === 'sparse' && stepInBar === 8) {
      const pattern = ARP_PATTERNS[sectionIndex % ARP_PATTERNS.length];
      mkArp(t + 0.02, chord.root + 7, pattern);
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;

      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.36);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.42);
        setStatus('Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { /* ignore */ } }, 250);
        return;
      }

      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);

      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { /* ignore */ }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { delay.disconnect(); } catch { /* ignore */ }
    try { delayLP.disconnect(); } catch { /* ignore */ }
    try { delayFeedback.disconnect(); } catch { /* ignore */ }
    try { verb.disconnect(); } catch { /* ignore */ }
    try { dry.disconnect(); } catch { /* ignore */ }
    try { wet.disconnect(); } catch { /* ignore */ }
    try { padBus.disconnect(); } catch { /* ignore */ }
    try { arpBus.disconnect(); } catch { /* ignore */ }
    try { pulseBus.disconnect(); } catch { /* ignore */ }
    try { preMix.disconnect(); } catch { /* ignore */ }
    try { output.disconnect(); } catch { /* ignore */ }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(50, Math.min(130, Number(v) || 72)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createElectricReverieDemo(ctx) {
  // Electric Reverie: original mid-tempo electronic with dreamy atmosphere.
  // C minor progression, emotive lead, plucky bass, warm evolving pads.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // FX: lush reverb + rhythmic delay
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.32;
  const delayFB = ctx.createGain();
  delayFB.gain.value = 0.38;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = 'lowpass';
  delayLP.frequency.value = 3600;
  delay.connect(delayLP);
  delayLP.connect(delayFB);
  delayFB.connect(delay);

  const verb = ctx.createConvolver();
  verb.buffer = createImpulseResponse(ctx, 2.8, 2.7);
  const dry = ctx.createGain();
  dry.gain.value = 0.80;
  const wet = ctx.createGain();
  wet.gain.value = 0.34;

  preMix.connect(dry);
  dry.connect(output);
  preMix.connect(verb);
  verb.connect(wet);
  wet.connect(output);

  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.26;
  delaySend.connect(delay);
  delay.connect(preMix);

  // Noise for hats/snare
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 7500;
  noise.connect(noiseHP);

  // Mix buses
  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.88;
  drumsBus.connect(preMix);

  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.52;
  bassBus.connect(preMix);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.38;
  padBus.connect(preMix);

  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.45;
  leadBus.connect(preMix);
  leadBus.connect(delaySend);

  // Sidechain ducking
  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    leadBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    leadBus.gain.setValueAtTime(leadBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.14, t, 0.006);
    leadBus.gain.setTargetAtTime(0.22, t, 0.006);
    padBus.gain.setTargetAtTime(0.38, t + 0.06, 0.12);
    leadBus.gain.setTargetAtTime(0.45, t + 0.06, 0.14);
  }

  let bpm = Number(ui.bpm.value) || 110;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.16;
  const lookaheadMs = 26;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Drum synthesis
  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.1, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.38);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1650;
    bp.Q.value = 0.75;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.48, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(210, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.14, t + 0.003);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.12);
    activeStops.add(() => { try { tone.stop(); } catch { } });

    const stopAt = t + 0.26;
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.15 : 0.09, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.15 : 0.05));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    const stopAt = t + 0.24;
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkRiser(t, duration = 2.0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(4800, t + duration);
    lp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + duration * 0.3);
    g.gain.setTargetAtTime(0.32, t + duration * 0.6, 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(lp);
    lp.connect(g);
    g.connect(preMix);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  // Plucky bass synth
  function mkPluckyBass(t, midi, steps = 2) {
    const dur = Math.max(0.08, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'square';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(hz, t);
    sub.frequency.setValueAtTime(hz / 2, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(280, t + Math.min(0.08, dur * 0.5));
    lp.Q.value = 1.1;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.24, dur));

    osc.connect(lp);
    sub.connect(lp);
    lp.connect(g);
    g.connect(bassBus);

    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.05);
    sub.stop(t + dur + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { sub.stop(); } catch { } });
  }

  // Warm pad chords with filter automation
  function mkPadChord(t, rootMidi, quality = 'minor', filterOpen = 0.5) {
    const dur = 16 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 11] : [0, 3, 7, 10];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const baseCutoff = 800 + (filterOpen * 1600);
    lp.frequency.setValueAtTime(baseCutoff, t);
    lp.frequency.setTargetAtTime(baseCutoff * 0.75, t + dur * 0.3, 0.4);
    lp.Q.value = 0.8;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.26, t + 0.12);
    g.gain.setTargetAtTime(0.18, t + 0.5, 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -14;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.003, t);
      og.gain.setValueAtTime(0.38, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.15);
      o2.stop(t + dur + 0.15);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }

    lp.connect(g);
    g.connect(padBus);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.3 - ctx.currentTime) * 1000 + 50));
  }

  // Emotive lead melody
  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.08, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    o1.type = 'sawtooth';
    o2.type = 'square';
    o2.detune.value = +12;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.002, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4800, t);
    lp.frequency.setTargetAtTime(2400, t + dur * 0.3, 0.08);
    lp.Q.value = 0.9;

    const target = 0.28 * melodyLevel * Math.max(0.4, Math.min(1.3, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(leadBus);

    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.06);
    o2.stop(t + dur + 0.06);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
  }

  // Arrangement sections
  const SECTIONS = [
    { name: 'Intro - Setting the mood', bars: 4, drums: 'light', bass: 'none', pads: true, lead: 'none', filterOpen: 0.3 },
    { name: 'Verse A - Establishing theme', bars: 8, drums: 'full', bass: 'pattern', pads: true, lead: 'verse', filterOpen: 0.4 },
    { name: 'Build - Rising tension', bars: 8, drums: 'full+', bass: 'pattern', pads: true, lead: 'call', filterOpen: 0.6 },
    { name: 'Drop - Main hook unleashed', bars: 16, drums: 'full+', bass: 'active', pads: true, lead: 'hook', filterOpen: 0.8 },
    { name: 'Breakdown - Breathing space', bars: 8, drums: 'light', bass: 'sparse', pads: true, lead: 'response', filterOpen: 0.4 },
    { name: 'Final Drop - Bringing it home', bars: 8, drums: 'full+', bass: 'active', pads: true, lead: 'hook', filterOpen: 0.9 },
    { name: 'Outro - Fading into memory', bars: 4, drums: 'full', bass: 'pattern', pads: true, lead: 'verse', filterOpen: 0.3 },
    { name: 'Silence - End', bars: 2, drums: 'none', bass: 'none', pads: false, lead: 'none', filterOpen: 0.2 },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc, sectionIndex: i };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // Original C minor progression: i - VI - III - VII
  const CHORDS = [
    { root: 48, quality: 'minor', bass: 36 },  // Cm
    { root: 44, quality: 'major', bass: 32 },  // Ab
    { root: 51, quality: 'major', bass: 39 },  // Eb
    { root: 46, quality: 'major', bass: 34 },  // Bb
  ];

  // Original lead melodies in C minor scale (C D Eb F G Ab Bb)
  // Verse melody: contemplative, lower register
  const MELODY_VERSE = [72, 70, 67, 68, 67, 65, 63, 67];  // C5 Bb4 G4 Ab4 G4 F4 Eb4 G4
  // Hook melody: uplifting, call-and-response
  const MELODY_HOOK_CALL = [75, 77, 79, 77, 75, 72, 70, 72];  // Eb5 F5 G5 F5 Eb5 C5 Bb4 C5
  const MELODY_HOOK_RESPONSE = [79, 77, 75, 74, 72, 70, 68, 67];  // G5 F5 Eb5 D5 C5 Bb4 Ab4 G4

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection, sectionIndex } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      const barNum = (barIndex % TOTAL_BARS) + 1;
      const totalBars = TOTAL_BARS;
      const pct = Math.round((barNum / totalBars) * 100);
      setStatus(`♪ ${section.name} - Bar ${barNum}/${totalBars} (${pct}%)`);

      // Schedule pad chords
      if (section.pads) {
        mkPadChord(t, chord.root, chord.quality, section.filterOpen);
      }

      // Riser in build section
      if (section.name.includes('Build') && barInSection === section.bars - 2) {
        const riserDur = 16 * timePerStep();
        mkRiser(t, riserDur);
      }
    }

    // Drums
    if (section.drums !== 'none') {
      // Kick patterns
      if (section.drums === 'light') {
        if (stepInBar === 0 || stepInBar === 8) {
          mkKick(t);
          duck(t);
        }
      } else {
        // full or full+
        if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
          mkKick(t);
          duck(t);
        }
      }

      // Snare on 2 and 4
      if (section.drums !== 'light' && (stepInBar === 4 || stepInBar === 12)) {
        mkSnare(t);
      }

      // Hi-hats
      if (section.drums !== 'none') {
        if (stepInBar % 2 === 0 && stepInBar !== 0) {
          mkHat(t, stepInBar === 14);
        }
        // Extra hats in full+
        if (section.drums === 'full+' && stepInBar % 4 === 1) {
          mkHat(t, false);
        }
      }
    }

    // Bass patterns
    if (section.bass === 'pattern') {
      // Offbeat 8ths
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkPluckyBass(t, chord.bass, 2);
      }
    } else if (section.bass === 'active') {
      // More active: on beats and offbeats
      if (stepInBar % 2 === 0) {
        mkPluckyBass(t, chord.bass, 1);
      }
      // Add root note walk
      if (stepInBar === 14) {
        mkPluckyBass(t, chord.bass + 2, 1);
      }
    } else if (section.bass === 'sparse') {
      // Just downbeats
      if (stepInBar === 0 || stepInBar === 8) {
        mkPluckyBass(t, chord.bass, 4);
      }
    }

    // Lead melodies
    if (section.lead !== 'none') {
      if (section.lead === 'verse') {
        // Sparse, contemplative
        if (stepInBar % 8 === 0) {
          const idx = (Math.floor(stepInBar / 8) + barInSection) % MELODY_VERSE.length;
          mkLead(t + 0.02, MELODY_VERSE[idx], 4, 0.9);
        }
      } else if (section.lead === 'call') {
        // Build section: introducing the hook
        if (stepInBar % 4 === 0 && barInSection >= 4) {
          const idx = Math.floor(stepInBar / 4) % MELODY_HOOK_CALL.length;
          mkLead(t + 0.02, MELODY_HOOK_CALL[idx], 2, 1.0);
        }
      } else if (section.lead === 'hook') {
        // Main hook: call and response
        if (stepInBar % 2 === 0 && stepInBar !== 0) {
          const phrasePos = Math.floor((currentStep % 32) / 4);
          const isCall = phrasePos < 4;
          const seq = isCall ? MELODY_HOOK_CALL : MELODY_HOOK_RESPONSE;
          const idx = (Math.floor(stepInBar / 2) + (isCall ? 0 : 1)) % seq.length;
          mkLead(t + 0.02, seq[idx], 2, 1.1);
        }
      } else if (section.lead === 'response') {
        // Breakdown: just the response
        if (stepInBar % 4 === 0) {
          const idx = Math.floor(stepInBar / 4) % MELODY_HOOK_RESPONSE.length;
          mkLead(t + 0.02, MELODY_HOOK_RESPONSE[idx], 3, 0.85);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;

      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.32);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.40);
        setStatus('♪ Electric Reverie - Finished');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }

      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);

      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.08);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { }
    try { noise.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayLP.disconnect(); } catch { }
    try { delayFB.disconnect(); } catch { }
    try { verb.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { delaySend.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(80, Math.min(150, Number(v) || 110)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createNeonPulseDemo(ctx) {
  // Neon Pulse: uplifting future bass with major key, energetic rhythm, synth stabs.
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  // FX: bright reverb + tight delay
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.1875;  // dotted 8th at 128 BPM
  const delayFB = ctx.createGain();
  delayFB.gain.value = 0.35;
  const delayHP = ctx.createBiquadFilter();
  delayHP.type = 'highpass';
  delayHP.frequency.value = 800;
  delay.connect(delayHP);
  delayHP.connect(delayFB);
  delayFB.connect(delay);

  const verb = ctx.createConvolver();
  verb.buffer = createImpulseResponse(ctx, 2.2, 2.5);
  const dry = ctx.createGain();
  dry.gain.value = 0.84;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;

  preMix.connect(dry);
  dry.connect(output);
  preMix.connect(verb);
  verb.connect(wet);
  wet.connect(output);

  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.32;
  delaySend.connect(delay);
  delay.connect(preMix);

  // Noise sources
  const noise = createNoiseBufferSource(ctx, 1.0);
  const noiseHP = ctx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 8000;
  noise.connect(noiseHP);

  const noiseWhite = createNoiseBufferSource(ctx, 1.0);

  // Mix buses
  const drumsBus = ctx.createGain();
  drumsBus.gain.value = 0.92;
  drumsBus.connect(preMix);

  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.58;
  bassBus.connect(preMix);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.42;
  padBus.connect(preMix);

  const stabBus = ctx.createGain();
  stabBus.gain.value = 0.48;
  stabBus.connect(preMix);
  stabBus.connect(delaySend);

  const leadBus = ctx.createGain();
  leadBus.gain.value = 0.50;
  leadBus.connect(preMix);
  leadBus.connect(delaySend);

  // Sidechain ducking
  function duck(t) {
    padBus.gain.cancelScheduledValues(t);
    bassBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(padBus.gain.value, t);
    bassBus.gain.setValueAtTime(bassBus.gain.value, t);
    padBus.gain.setTargetAtTime(0.16, t, 0.004);
    bassBus.gain.setTargetAtTime(0.28, t, 0.005);
    padBus.gain.setTargetAtTime(0.42, t + 0.05, 0.10);
    bassBus.gain.setTargetAtTime(0.58, t + 0.05, 0.12);
  }

  let bpm = Number(ui.bpm.value) || 128;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.14;
  const lookaheadMs = 24;
  let timerId = null;
  const activeStops = new Set();

  function timePerStep() {
    return (60 / bpm) / 4;
  }

  // Punchy club kick
  function mkKick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    lp.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.2, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(lp);
    lp.connect(g);
    g.connect(drumsBus);
    osc.start(t);
    osc.stop(t + 0.32);
    activeStops.add(() => { try { osc.stop(); } catch { } });
  }

  function mkSnare(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.85;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.52, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(220, t);
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.16, t + 0.003);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    tone.connect(tg);
    tg.connect(drumsBus);
    tone.start(t);
    tone.stop(t + 0.10);
    activeStops.add(() => { try { tone.stop(); } catch { } });

    const stopAt = t + 0.24;
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkHat(t, open = false) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 10000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(open ? 0.16 : 0.10, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.12 : 0.04));
    noiseHP.connect(hp);
    hp.connect(g);
    g.connect(drumsBus);
    const stopAt = t + 0.20;
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkClap(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.002);
    g.gain.setValueAtTime(0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.020);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    noiseHP.connect(bp);
    bp.connect(g);
    g.connect(drumsBus);
    const stopAt = t + 0.22;
    setTimeout(() => { try { bp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  function mkRiser(t, duration = 2.0) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(200, t);
    hp.frequency.exponentialRampToValueAtTime(8000, t + duration);
    hp.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + duration * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    noiseWhite.connect(hp);
    hp.connect(g);
    g.connect(preMix);
    const stopAt = t + duration + 0.05;
    setTimeout(() => { try { hp.disconnect(); } catch { } }, Math.max(0, (stopAt - ctx.currentTime) * 1000 + 50));
  }

  // Funky bass groove
  function mkFunkBass(t, midi, steps = 1) {
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc2.type = 'square';
    osc2.detune.value = -7;
    osc.frequency.setValueAtTime(hz, t);
    osc2.frequency.setValueAtTime(hz * 0.998, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(320, t + Math.min(0.06, dur * 0.4));
    lp.Q.value = 1.8;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.18, dur));

    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    g.connect(bassBus);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.05);
    osc2.stop(t + dur + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    activeStops.add(() => { try { osc2.stop(); } catch { } });
  }

  // Bright major pads
  function mkPadChord(t, rootMidi, quality = 'major') {
    const dur = 16 * timePerStep();
    const intervals = quality === 'major' ? [0, 4, 7, 11] : [0, 3, 7, 10];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.setTargetAtTime(1800, t + dur * 0.4, 0.3);
    lp.Q.value = 0.7;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.10);
    g.gain.setTargetAtTime(0.24, t + 0.4, 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const iv of intervals) {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const og = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o2.detune.value = -10;
      const hz = midiToHz(rootMidi + 12 + iv);
      o1.frequency.setValueAtTime(hz, t);
      o2.frequency.setValueAtTime(hz * 1.002, t);
      og.gain.setValueAtTime(0.42, t);
      o1.connect(og);
      o2.connect(og);
      og.connect(lp);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.12);
      o2.stop(t + dur + 0.12);
      activeStops.add(() => { try { o1.stop(); } catch { } });
      activeStops.add(() => { try { o2.stop(); } catch { } });
    }

    lp.connect(g);
    g.connect(padBus);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.3 - ctx.currentTime) * 1000 + 50));
  }

  // Synth stab (short, punchy chord)
  function mkStab(t, rootMidi, quality = 'major') {
    const dur = 0.12;
    const intervals = quality === 'major' ? [0, 4, 7] : [0, 3, 7];
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
    lp.Q.value = 1.2;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.48, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    for (const iv of intervals) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      const hz = midiToHz(rootMidi + 24 + iv);
      osc.frequency.setValueAtTime(hz, t);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      activeStops.add(() => { try { osc.stop(); } catch { } });
    }

    lp.connect(g);
    g.connect(stabBus);
    setTimeout(() => {
      try { lp.disconnect(); } catch { }
      try { g.disconnect(); } catch { }
    }, Math.max(0, (t + dur + 0.1 - ctx.currentTime) * 1000 + 50));
  }

  // Bright melodic lead
  function mkLead(t, midi, steps = 2, vel = 1.0) {
    if (melodyLevel <= 0.001) return;
    const dur = Math.max(0.06, steps * timePerStep());
    const hz = midiToHz(midi);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o3 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o3.type = 'square';
    o2.detune.value = +10;
    o3.detune.value = -15;
    o1.frequency.setValueAtTime(hz, t);
    o2.frequency.setValueAtTime(hz * 1.001, t);
    o3.frequency.setValueAtTime(hz * 0.999, t);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6000, t);
    lp.frequency.setTargetAtTime(3200, t + dur * 0.2, 0.06);
    lp.Q.value = 1.0;

    const target = 0.24 * melodyLevel * Math.max(0.4, Math.min(1.4, vel));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(target, t + 0.010);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(lp);
    o2.connect(lp);
    o3.connect(lp);
    lp.connect(g);
    g.connect(leadBus);

    o1.start(t);
    o2.start(t);
    o3.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
    o3.stop(t + dur + 0.05);
    activeStops.add(() => { try { o1.stop(); } catch { } });
    activeStops.add(() => { try { o2.stop(); } catch { } });
    activeStops.add(() => { try { o3.stop(); } catch { } });
  }

  // Song structure
  const SECTIONS = [
    { name: 'Intro - Energy building', bars: 4, drums: 'light', bass: 'none', stabs: false, lead: 'none' },
    { name: 'Groove - Bass drops', bars: 8, drums: 'full', bass: 'groove', stabs: true, lead: 'verse' },
    { name: 'Build - Rising up', bars: 8, drums: 'full+', bass: 'groove', stabs: true, lead: 'active' },
    { name: 'Drop - Full power', bars: 16, drums: 'full+', bass: 'active', stabs: true, lead: 'hook' },
    { name: 'Bridge - Breathing', bars: 8, drums: 'light', bass: 'sparse', stabs: false, lead: 'melodic' },
    { name: 'Final Drop - Maximum energy', bars: 8, drums: 'full+', bass: 'active', stabs: true, lead: 'hook' },
    { name: 'Outro - Winding down', bars: 4, drums: 'full', bass: 'groove', stabs: false, lead: 'verse' },
    { name: 'End - Fadeout', bars: 2, drums: 'none', bass: 'none', stabs: false, lead: 'none' },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc, sectionIndex: i };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  // E major progression: I - V - vi - IV (uplifting, positive)
  const CHORDS = [
    { root: 52, quality: 'major', bass: 40 },  // E
    { root: 59, quality: 'major', bass: 47 },  // B
    { root: 57, quality: 'minor', bass: 45 },  // C#m
    { root: 56, quality: 'major', bass: 44 },  // A
  ];

  // Uplifting melodies in E major (E F# G# A B C# D#)
  const MELODY_VERSE = [76, 78, 80, 78, 76, 73, 71, 73];  // E5 F#5 G#5 F#5 E5 C#5 B4 C#5
  const MELODY_HOOK = [80, 83, 85, 83, 80, 78, 76, 78];   // G#5 B5 C#6 B5 G#5 F#5 E5 F#5
  const MELODY_MELODIC = [73, 76, 80, 78, 76, 73, 71, 69]; // C#5 E5 G#5 F#5 E5 C#5 B4 A4

  function scheduleStep(stepInBar, t) {
    const barIndex = Math.floor(currentStep / 16);
    const { section, barInSection } = sectionAtBar(barIndex);
    const chord = CHORDS[barIndex % CHORDS.length];

    if (stepInBar === 0) {
      const barNum = (barIndex % TOTAL_BARS) + 1;
      const pct = Math.round((barNum / TOTAL_BARS) * 100);
      setStatus(`⚡ ${section.name} - Bar ${barNum}/${TOTAL_BARS} (${pct}%)`);

      // Pad chords
      if (section.drums !== 'none') {
        mkPadChord(t, chord.root, chord.quality);
      }

      // Riser in Build section
      if (section.name.includes('Build') && barInSection === section.bars - 2) {
        const riserDur = 16 * timePerStep();
        mkRiser(t, riserDur);
      }
    }

    // Drums
    if (section.drums !== 'none') {
      // 4-on-the-floor kick
      if (section.drums === 'light') {
        if (stepInBar === 0 || stepInBar === 8) {
          mkKick(t);
          duck(t);
        }
      } else {
        if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
          mkKick(t);
          duck(t);
        }
      }

      // Snare/Clap on 2 and 4
      if (section.drums !== 'light') {
        if (stepInBar === 4 || stepInBar === 12) {
          mkSnare(t);
        }
        // Add claps in full+
        if (section.drums === 'full+' && (stepInBar === 4 || stepInBar === 12)) {
          mkClap(t + 0.002);
        }
      }

      // Hi-hats
      if (stepInBar % 2 === 0 && stepInBar !== 0) {
        mkHat(t, stepInBar === 14);
      }
      if (section.drums === 'full+' && stepInBar % 4 === 1) {
        mkHat(t, false);
      }
    }

    // Bass grooves
    if (section.bass === 'groove') {
      // Funky pattern
      if (stepInBar === 0 || stepInBar === 3 || stepInBar === 7 || stepInBar === 10 || stepInBar === 14) {
        mkFunkBass(t, chord.bass, stepInBar === 0 ? 2 : 1);
      }
    } else if (section.bass === 'active') {
      // More driving
      if (stepInBar % 2 === 0) {
        mkFunkBass(t, chord.bass, 1);
      }
      if (stepInBar === 7 || stepInBar === 15) {
        mkFunkBass(t, chord.bass + 2, 1);
      }
    } else if (section.bass === 'sparse') {
      if (stepInBar === 0 || stepInBar === 8) {
        mkFunkBass(t, chord.bass, 4);
      }
    }

    // Synth stabs
    if (section.stabs) {
      // Offbeat stabs
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
        mkStab(t, chord.root, chord.quality);
      }
    }

    // Lead melodies
    if (section.lead !== 'none') {
      if (section.lead === 'verse') {
        if (stepInBar % 8 === 0) {
          const idx = (Math.floor(stepInBar / 8) + barInSection) % MELODY_VERSE.length;
          mkLead(t + 0.02, MELODY_VERSE[idx], 4, 0.9);
        }
      } else if (section.lead === 'active') {
        if (stepInBar % 4 === 0 && barInSection >= 4) {
          const idx = Math.floor(stepInBar / 4) % MELODY_VERSE.length;
          mkLead(t + 0.02, MELODY_VERSE[idx], 2, 1.0);
        }
      } else if (section.lead === 'hook') {
        if (stepInBar % 2 === 0 && stepInBar !== 0) {
          const idx = (Math.floor(stepInBar / 2) + barInSection) % MELODY_HOOK.length;
          mkLead(t + 0.02, MELODY_HOOK[idx], 2, 1.15);
        }
      } else if (section.lead === 'melodic') {
        if (stepInBar % 4 === 0) {
          const idx = Math.floor(stepInBar / 4) % MELODY_MELODIC.length;
          mkLead(t + 0.02, MELODY_MELODIC[idx], 3, 0.85);
        }
      }
    }
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;

      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.28);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.36);
        setStatus('⚡ Neon Pulse - Complete!');
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }

      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);

      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.06);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.06);
    nextNoteTime = ctx.currentTime + 0.05;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    for (const stopFn of activeStops) {
      try { stopFn(); } catch { }
    }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { noise.disconnect(); } catch { }
    try { noise.stop(); } catch { }
    try { noiseWhite.disconnect(); } catch { }
    try { noiseWhite.stop(); } catch { }
    try { noiseHP.disconnect(); } catch { }
    try { delay.disconnect(); } catch { }
    try { delayHP.disconnect(); } catch { }
    try { delayFB.disconnect(); } catch { }
    try { verb.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { delaySend.disconnect(); } catch { }
    try { drumsBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { stabBus.disconnect(); } catch { }
    try { leadBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(100, Math.min(160, Number(v) || 128)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function createNebulaDemo(ctx) {
  // Nebula Nights: evolving pads, warm sub bass, soft arpeggio
  setEngine('Sequencer');

  const output = ctx.createGain();
  output.gain.value = 1.0;

  const preMix = ctx.createGain();
  preMix.gain.value = 1.0;

  const verb = ctx.createConvolver();
  verb.buffer = createImpulseResponse(ctx, 2.8, 3.0);
  const dry = ctx.createGain();
  dry.gain.value = 0.78;
  const wet = ctx.createGain();
  wet.gain.value = 0.36;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.28;
  const delayFB = ctx.createGain();
  delayFB.gain.value = 0.22;
  delay.connect(delayFB);
  delayFB.connect(delay);

  preMix.connect(dry);
  dry.connect(output);
  preMix.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  preMix.connect(verb);
  verb.connect(output);

  const padBus = ctx.createGain();
  padBus.gain.value = 0.40;
  padBus.connect(preMix);

  const bassBus = ctx.createGain();
  bassBus.gain.value = 0.48;
  bassBus.connect(preMix);

  const arpBus = ctx.createGain();
  arpBus.gain.value = 0.22;
  arpBus.connect(preMix);
  arpBus.connect(delay);

  let bpm = Number(ui.bpm.value) || 88;
  let loopEnabled = !!ui.loopSong.checked;
  let melodyLevel = (Number(ui.melody.value) || 60) / 100;
  let isRunning = false;
  let nextNoteTime = 0;
  let currentStep = 0;
  const scheduleAheadTime = 0.16;
  const lookaheadMs = 28;
  let timerId = null;
  const activeStops = new Set();

  const ARP = [0, 3, 7, 10];
  const SECTIONS = [
    { name: 'Intro', bars: 4 },
    { name: 'Drift', bars: 8 },
    { name: 'Build', bars: 8 },
    { name: 'Glow', bars: 8 },
    { name: 'Outro', bars: 4 },
    { name: 'Silence', bars: 2 },
  ];

  const TOTAL_BARS = SECTIONS.reduce((a, s) => a + s.bars, 0);
  const TOTAL_STEPS = TOTAL_BARS * 16;

  function timePerStep() { return (60 / bpm) / 4; }

  function sectionAtBar(barIndex) {
    let acc = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      const end = acc + s.bars;
      if (barIndex < end) return { section: s, barInSection: barIndex - acc, sectionIndex: i };
      acc = end;
    }
    const wrapped = ((barIndex % TOTAL_BARS) + TOTAL_BARS) % TOTAL_BARS;
    return sectionAtBar(wrapped);
  }

  function mkPad(t, root) {
    const dur = 32 * timePerStep();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.46, t + 0.8);
    g.gain.setTargetAtTime(0.30, t + 1.4, 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(padBus);
    for (const iv of [0, 3, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(midiToHz(root + iv), t);
      osc.detune.setValueAtTime(Math.random() * 8 - 4, t);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.2);
      activeStops.add(() => { try { osc.stop(); } catch { } });
    }
    setTimeout(() => { try { lp.disconnect(); } catch { } try { g.disconnect(); } catch { } }, Math.max(0, (t + dur + 0.3 - ctx.currentTime) * 1000 + 50));
  }

  function mkBass(t, root) {
    const dur = 8 * timePerStep();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToHz(root - 12), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(bassBus);
    osc.start(t); osc.stop(t + dur + 0.05);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    setTimeout(() => { try { g.disconnect(); } catch { } }, Math.max(0, (t + dur + 0.2 - ctx.currentTime) * 1000 + 50));
  }

  function mkArp(t, root) {
    if (melodyLevel <= 0.01) return;
    const dur = Math.max(0.06, 1.5 * timePerStep());
    const idx = Math.floor(Math.random() * ARP.length);
    const midi = root + ARP[idx];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToHz(midi), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * melodyLevel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(arpBus);
    osc.start(t); osc.stop(t + dur + 0.04);
    activeStops.add(() => { try { osc.stop(); } catch { } });
    setTimeout(() => { try { g.disconnect(); } catch { } }, Math.max(0, (t + dur + 0.2 - ctx.currentTime) * 1000 + 50));
  }

  function scheduleStep(stepInBar, t) {
    // update UI status on bar boundaries
    const barIndex = Math.floor(currentStep / 16);
    const { section } = sectionAtBar(barIndex);
    if (stepInBar === 0) {
      setStatus(`Running - ${section.name} (${(barIndex % TOTAL_BARS) + 1}/${TOTAL_BARS} bars)`);
      mkPad(t, 54 + (Math.floor(Math.random() * 3) * 2));
    }

    // instrumentation scheduling
    if (stepInBar % 4 === 0) mkBass(t, 42);
    if (stepInBar % 3 === 2) mkArp(t, 60);
  }

  function scheduler() {
    if (!isRunning) return;
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      const stepIndex = currentStep;
      if (!loopEnabled && stepIndex >= TOTAL_STEPS) {
        preMix.gain.setTargetAtTime(0.0001, nextNoteTime, 0.36);
        output.gain.setTargetAtTime(0.0001, nextNoteTime, 0.42);
        stopTransport();
        setTimeout(() => { try { autoStopFromDemo(); } catch { } }, 250);
        return;
      }
      const wrapped = loopEnabled ? (stepIndex % TOTAL_STEPS) : stepIndex;
      const stepInBar = wrapped % 16;
      scheduleStep(stepInBar, nextNoteTime);
      nextNoteTime += timePerStep();
      currentStep += 1;
    }
  }

  function startTransport() {
    if (isRunning) return;
    isRunning = true;
    preMix.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    output.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    nextNoteTime = ctx.currentTime + 0.04;
    timerId = setInterval(scheduler, lookaheadMs);
  }

  function stopTransport() {
    isRunning = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    for (const stopFn of activeStops) { try { stopFn(); } catch { } }
    activeStops.clear();
  }

  function stopAll() {
    stopTransport();
    try { delay.disconnect(); } catch { }
    try { delayFB.disconnect(); } catch { }
    try { verb.disconnect(); } catch { }
    try { dry.disconnect(); } catch { }
    try { wet.disconnect(); } catch { }
    try { padBus.disconnect(); } catch { }
    try { bassBus.disconnect(); } catch { }
    try { arpBus.disconnect(); } catch { }
    try { preMix.disconnect(); } catch { }
    try { output.disconnect(); } catch { }
  }

  return {
    node: output,
    startTransport,
    stopTransport,
    setBpm: (v) => { bpm = Math.max(40, Math.min(150, Number(v) || 88)); },
    setLoop: (v) => { loopEnabled = !!v; },
    setMelody: (v) => { melodyLevel = Math.max(0, Math.min(1, (Number(v) || 0) / 100)); },
    stop: stopAll,
  };
}

function disconnectGraph() {
  if (state.sourceController && state.sourceController.stop) {
    try { state.sourceController.stop(); } catch { /* already stopped */ }
  }

  if (state.sourceNode) {
    try { state.sourceNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.filterNode) {
    try { state.filterNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.modGainNode) {
    try { state.modGainNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.gainNode) {
    try { state.gainNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.masterGainNode) {
    try { state.masterGainNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.analyserNode) {
    try { state.analyserNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.brownNoiseNode) {
    try { state.brownNoiseNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.brownNoiseMixNode) {
    try { state.brownNoiseMixNode.disconnect(); } catch { /* already disconnected */ }
  }
  if (state.brownNoiseGainNode) {
    try { state.brownNoiseGainNode.disconnect(); } catch { /* already disconnected */ }
  }

  if (state.lfoOsc) {
    try { state.lfoOsc.disconnect(); } catch { /* already disconnected */ }
    try { state.lfoOsc.stop(); } catch { /* already stopped */ }
  }
  if (state.lfoGain) {
    try { state.lfoGain.disconnect(); } catch { /* already disconnected */ }
  }

  state.sourceNode = null;
  state.sourceController = null;
  state.modGainNode = null;
  state.lfoOsc = null;
  state.lfoGain = null;
  state.filterNode = null;
  state.gainNode = null;
  state.analyserNode = null;
  // Note: masterGainNode, brownNoiseNode, brownNoiseController, brownNoiseGainNode,
  // and brownNoiseMixNode remain connected for persistent brown noise mixing
}

async function buildGraph() {
  if (!state.audioContext) return;

  disconnectGraph();

  const preset = SOUND_PRESETS[ui.sound.value] || SOUND_PRESETS.brown;

  state.filterNode = state.audioContext.createBiquadFilter();
  state.gainNode = state.audioContext.createGain();
  state.analyserNode = state.audioContext.createAnalyser();
  state.analyserNode.fftSize = 2048;
  state.masterGainNode = state.audioContext.createGain();
  state.masterGainNode.gain.value = (Number(ui.masterVolume.value) || 80) / 100;

  state.modGainNode = state.audioContext.createGain();
  state.modGainNode.gain.value = 1.0;

  // Create brown noise mixer
  const brownNoiseCreated = await createNoiseNode(state.audioContext, 2); // 2 = brown noise
  state.brownNoiseNode = brownNoiseCreated.node;
  state.brownNoiseController = brownNoiseCreated;
  state.brownNoiseGainNode = state.audioContext.createGain();
  state.brownNoiseGainNode.gain.value = 0; // Start at 0
  state.brownNoiseMixNode = state.audioContext.createBiquadFilter();
  state.brownNoiseMixNode.type = 'lowpass';
  state.brownNoiseMixNode.frequency.value = 12000;
  state.brownNoiseMixNode.Q.value = 0.7;

  if (preset.kind === 'noise') {
    const created = await createNoiseNode(state.audioContext, preset.noiseType);
    state.sourceNode = created.node;
    state.sourceController = created;
  } else if (preset.kind === 'demo') {
    let created;
    if (ui.sound.value === 'dwarven') created = createDwarvenBridgeDemo(state.audioContext);
    else if (ui.sound.value === 'synthwave') created = createSynthwaveDemo(state.audioContext);
    else if (ui.sound.value === 'mongolian') created = createMongolianThroatDemo(state.audioContext);
    else if (ui.sound.value === 'sovietwave') created = createSovietwaveDemo(state.audioContext);
    else if (ui.sound.value === 'sovietRadio') created = createSovietRadioDemo(state.audioContext);
    else if (ui.sound.value === 'redSquare') created = createRedSquareDemo(state.audioContext);
    else if (ui.sound.value === 'factoryFloors') created = createFactoryFloorsDemo(state.audioContext);
    else if (ui.sound.value === 'glasnostDreams') created = createGlasnostDreamsDemo(state.audioContext);
    else if (ui.sound.value === 'probabilityGarden') created = createProbabilityGardenDemo(state.audioContext);
    else if (ui.sound.value === 'aurora') created = createAuroraDemo(state.audioContext);
    else if (ui.sound.value === 'nebula') created = createNebulaDemo(state.audioContext);
    else if (ui.sound.value === 'electric') created = createElectricReverieDemo(state.audioContext);
    else if (ui.sound.value === 'neon') created = createNeonPulseDemo(state.audioContext);
    else if (ui.sound.value === 'celestial') created = createCelestialGardenDemo(state.audioContext);
    else if (ui.sound.value === 'forest') created = createDeepForestDemo(state.audioContext);
    else if (ui.sound.value === 'crystalline') created = createCrystallineCavernDemo(state.audioContext);
    else if (ui.sound.value === 'mirage') created = createDesertMirageDemo(state.audioContext);
    else if (ui.sound.value === 'morningMist') created = createMorningMistDemo(state.audioContext);
    else if (ui.sound.value === 'underwater') created = createUnderwaterDreamDemo(state.audioContext);
    else created = createTranceDemo(state.audioContext);
    state.sourceNode = created.node;
    state.sourceController = created;
  } else {
    const created = createToneNode(state.audioContext, preset.wave);
    state.sourceNode = created.node;
    state.sourceController = created;
  }

  // Main audio chain: source -> filter -> modGain -> gain -> masterGain -> analyser -> output
  // Brown noise chain: brownNoise -> brownNoiseMixNode -> brownNoiseGain -> masterGain (parallel)
  state.sourceNode.connect(state.filterNode);
  state.filterNode.connect(state.modGainNode);
  state.modGainNode.connect(state.gainNode);
  state.gainNode.connect(state.masterGainNode);
  
  // Connect brown noise mixer (parallel to main source)
  state.brownNoiseNode.connect(state.brownNoiseMixNode);
  state.brownNoiseMixNode.connect(state.brownNoiseGainNode);
  state.brownNoiseGainNode.connect(state.masterGainNode);
  
  state.masterGainNode.connect(state.analyserNode);
  state.analyserNode.connect(state.audioContext.destination);

  // Optional amplitude modulation for presets
  if (preset.mod) {
    const depth = Math.max(0, Math.min(0.95, preset.mod.depth));
    const rate = Math.max(0.01, preset.mod.rate);

    // baseline + sine LFO scaled into gain parameter
    state.modGainNode.gain.value = 1.0 - depth * 0.5;

    state.lfoOsc = state.audioContext.createOscillator();
    state.lfoOsc.type = 'sine';
    state.lfoOsc.frequency.value = rate;

    state.lfoGain = state.audioContext.createGain();
    state.lfoGain.gain.value = depth * 0.5;

    state.lfoOsc.connect(state.lfoGain);
    state.lfoGain.connect(state.modGainNode.gain);
    state.lfoOsc.start();
  }

  // Apply preset filter defaults (and set UI sliders to match)
  if (preset.filter) {
    state.filterNode.type = preset.filter.type;
    ui.cutoff.value = String(preset.filter.frequency);
    state.filterNode.frequency.value = preset.filter.frequency;
    state.filterNode.Q.value = preset.filter.q || 0.7;
  } else {
    state.filterNode.type = 'lowpass';
    state.filterNode.frequency.value = Number(ui.cutoff.value) || 12000;
  }

  applyParams();
}

function ensureVisualizerRunning() {
  if (!state.analyserNode) return;
  const canvas = ui.scope;
  const ctx2d = canvas.getContext('2d');
  const analyser = state.analyserNode;

  const waveBuffer = new Uint8Array(analyser.fftSize);
  const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

  // Particle system for particles mode
  let particles = [];
  const MAX_PARTICLES = 150;

  function createParticle(w, h, energy, freqIndex) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 1 + energy * 3;
    const hue = (freqIndex / freqBuffer.length) * 360;
    return {
      x: w / 2 + (Math.random() - 0.5) * 100,
      y: h / 2 + (Math.random() - 0.5) * 100,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.01 + Math.random() * 0.01,
      size: 2 + energy * 6,
      hue: hue,
      sat: 70 + energy * 30,
      light: 50 + energy * 20
    };
  }

  function frame() {
    state.rafId = requestAnimationFrame(frame);

    const mode = ui.vizMode.value;
    if (mode === 'spectrum' || mode === 'particles') {
      analyser.getByteFrequencyData(freqBuffer);
    }
    if (mode === 'waveform' || mode === 'particles') {
      analyser.getByteTimeDomainData(waveBuffer);
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);

    let rms = 0;

    if (mode === 'particles') {
      // Particle visualizer
      // Compute energy metrics
      let totalEnergy = 0;
      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;

      for (let i = 0; i < freqBuffer.length; i++) {
        const v = freqBuffer[i] / 255;
        totalEnergy += v;
        if (i < freqBuffer.length * 0.1) bassEnergy += v;
        else if (i < freqBuffer.length * 0.4) midEnergy += v;
        else highEnergy += v;
      }

      totalEnergy /= freqBuffer.length;
      bassEnergy /= (freqBuffer.length * 0.1);
      midEnergy /= (freqBuffer.length * 0.3);
      highEnergy /= (freqBuffer.length * 0.6);

      // Spawn particles based on energy
      const spawnRate = Math.floor(totalEnergy * 8);
      for (let i = 0; i < spawnRate && particles.length < MAX_PARTICLES; i++) {
        const freqIndex = Math.floor(Math.random() * freqBuffer.length);
        const energy = freqBuffer[freqIndex] / 255;
        if (energy > 0.15) {
          particles.push(createParticle(w, h, energy, freqIndex));
        }
      }

      // Update and draw particles
      ctx2d.globalCompositeOperation = 'lighter';
      particles = particles.filter(p => {
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.vx *= 0.98; // friction
        p.vy *= 0.98;
        p.life -= p.decay;

        // Bounce off walls
        if (p.x < 0 || p.x > w) p.vx *= -0.5;
        if (p.y < 0 || p.y > h) p.vy *= -0.5;

        // Draw particle
        if (p.life > 0) {
          ctx2d.globalAlpha = p.life * 0.8;
          ctx2d.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`;
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx2d.fill();

          // Glow effect
          ctx2d.globalAlpha = p.life * 0.3;
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, p.size * p.life * 2, 0, Math.PI * 2);
          ctx2d.fill();

          return true;
        }
        return false;
      });

      ctx2d.globalCompositeOperation = 'source-over';

      // Draw energy rings
      ctx2d.globalAlpha = 0.2;
      ctx2d.strokeStyle = `rgba(96,165,250,${bassEnergy})`;
      ctx2d.lineWidth = 3;
      ctx2d.beginPath();
      ctx2d.arc(w / 2, h / 2, 30 + bassEnergy * 40, 0, Math.PI * 2);
      ctx2d.stroke();

      ctx2d.strokeStyle = `rgba(52,211,153,${midEnergy})`;
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(w / 2, h / 2, 60 + midEnergy * 30, 0, Math.PI * 2);
      ctx2d.stroke();

      ctx2d.strokeStyle = `rgba(251,146,60,${highEnergy})`;
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.arc(w / 2, h / 2, 80 + highEnergy * 20, 0, Math.PI * 2);
      ctx2d.stroke();

      ui.levelText.textContent = `Particles: ${particles.length} | Energy: ${(totalEnergy * 100).toFixed(1)}%`;
    } else if (mode === 'spectrum') {
      // grid
      ctx2d.globalAlpha = 0.35;
      ctx2d.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx2d.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (h * i) / 6;
        ctx2d.beginPath();
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(w, y);
        ctx2d.stroke();
      }

      // bars
      const barCount = 80;
      const step = Math.max(1, Math.floor(freqBuffer.length / barCount));
      const barW = w / barCount;
      ctx2d.globalAlpha = 1;
      for (let i = 0; i < barCount; i++) {
        const idx = i * step;
        const v = freqBuffer[idx] / 255;
        const barH = v * (h - 12);
        const x = i * barW;
        const y = h - barH;
        ctx2d.fillStyle = `rgba(52,211,153,${0.15 + 0.85 * v})`;
        ctx2d.fillRect(x + 1, y, Math.max(1, barW - 2), barH);
      }

      // approximate level from spectrum energy
      for (let i = 0; i < freqBuffer.length; i++) {
        const centered = (freqBuffer[i] / 255);
        rms += centered * centered;
      }
      rms = Math.sqrt(rms / freqBuffer.length);
      ui.levelText.textContent = `Energy: ${(rms * 100).toFixed(1)}%`;
    } else if (mode === 'bars') {
      // Vertical bars visualizer - classic frequency bars with gradient colors
      analyser.getByteFrequencyData(freqBuffer);
      
      const barCount = 64;
      const step = Math.max(1, Math.floor(freqBuffer.length / barCount));
      const barW = w / barCount;
      const barSpacing = Math.max(2, barW * 0.1);
      const actualBarW = barW - barSpacing;
      
      let totalEnergy = 0;
      
      ctx2d.globalAlpha = 1;
      for (let i = 0; i < barCount; i++) {
        const idx = i * step;
        const v = freqBuffer[idx] / 255;
        totalEnergy += v;
        
        const barH = v * (h - 20);
        const x = i * barW + barSpacing / 2;
        const y = h - barH;
        
        // Create gradient from bottom to top
        const gradient = ctx2d.createLinearGradient(x, h, x, y);
        const hue = (i / barCount) * 360;
        gradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.95)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 1)`);
        
        ctx2d.fillStyle = gradient;
        ctx2d.fillRect(x, y, actualBarW, barH);
        
        // Add glow on top of tall bars
        if (v > 0.5) {
          ctx2d.globalAlpha = (v - 0.5) * 0.8;
          ctx2d.fillStyle = `hsla(${hue}, 100%, 80%, 1)`;
          ctx2d.fillRect(x, y, actualBarW, Math.min(8, barH));
          ctx2d.globalAlpha = 1;
        }
      }
      
      totalEnergy /= barCount;
      ui.levelText.textContent = `Bars: ${barCount} | Energy: ${(totalEnergy * 100).toFixed(1)}%`;
    } else if (mode === 'kaleidoscope') {
      // Kaleidoscope visualizer - symmetrical mirrored patterns
      analyser.getByteFrequencyData(freqBuffer);
      analyser.getByteTimeDomainData(waveBuffer);
      
      const centerX = w / 2;
      const centerY = h / 2;
      const numSegments = 8;
      const segmentAngle = (Math.PI * 2) / numSegments;
      
      // Calculate energy
      let totalEnergy = 0;
      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      for (let i = 0; i < freqBuffer.length; i++) {
        const v = freqBuffer[i] / 255;
        totalEnergy += v;
        if (i < freqBuffer.length * 0.2) bassEnergy += v;
        else if (i < freqBuffer.length * 0.5) midEnergy += v;
        else highEnergy += v;
      }
      totalEnergy /= freqBuffer.length;
      bassEnergy /= (freqBuffer.length * 0.2);
      midEnergy /= (freqBuffer.length * 0.3);
      highEnergy /= (freqBuffer.length * 0.5);
      
      // Dynamic color shift based on energy and time
      const timeShift = Date.now() / 30; // Faster color cycling
      const energyShift = totalEnergy * 180; // Energy affects hue range
      const bassHue = (timeShift + bassEnergy * 120) % 360;
      const midHue = (timeShift * 1.5 + midEnergy * 120 + 120) % 360;
      const highHue = (timeShift * 2 + highEnergy * 120 + 240) % 360;
      
      // Background glow with shifting colors
      const bgGradient = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(w, h) / 2);
      bgGradient.addColorStop(0, `hsla(${bassHue}, 70%, 50%, ${totalEnergy * 0.2})`);
      bgGradient.addColorStop(0.5, `hsla(${midHue}, 60%, 40%, ${totalEnergy * 0.1})`);
      bgGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx2d.fillStyle = bgGradient;
      ctx2d.fillRect(0, 0, w, h);
      
      ctx2d.globalCompositeOperation = 'lighter';
      
      // Draw each symmetrical segment
      for (let seg = 0; seg < numSegments; seg++) {
        const angle = seg * segmentAngle;
        
        ctx2d.save();
        ctx2d.translate(centerX, centerY);
        ctx2d.rotate(angle);
        
        // Draw radial lines based on frequency data
        const numLines = 32;
        for (let i = 0; i < numLines; i++) {
          const freqIdx = Math.floor((i / numLines) * freqBuffer.length);
          const freqValue = freqBuffer[freqIdx] / 255;
          
          if (freqValue > 0.1) {
            const lineAngle = (i / numLines) * segmentAngle;
            const length = 50 + freqValue * Math.min(w, h) * 0.35;
            
            const x1 = 0;
            const y1 = 0;
            const x2 = Math.cos(lineAngle) * length;
            const y2 = Math.sin(lineAngle) * length;
            
            // Multi-layered color based on frequency band and energy
            let hue;
            if (i < numLines * 0.3) {
              hue = (bassHue + i * 5 + seg * 15) % 360; // Bass = warm colors
            } else if (i < numLines * 0.7) {
              hue = (midHue + i * 5 + seg * 15) % 360; // Mid = cool colors
            } else {
              hue = (highHue + i * 5 + seg * 15) % 360; // High = bright colors
            }
            
            const gradient = ctx2d.createLinearGradient(x1, y1, x2, y2);
            const sat = 70 + freqValue * 30;
            const light = 50 + freqValue * 30;
            gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${freqValue * 0.6})`);
            gradient.addColorStop(0.5, `hsla(${(hue + 30) % 360}, ${sat + 10}%, ${light + 10}%, ${freqValue * 0.8})`);
            gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, ${sat + 20}%, ${light + 20}%, ${freqValue})`);
            
            ctx2d.globalAlpha = 0.7;
            ctx2d.strokeStyle = gradient;
            ctx2d.lineWidth = 1 + freqValue * 3;
            ctx2d.beginPath();
            ctx2d.moveTo(x1, y1);
            ctx2d.lineTo(x2, y2);
            ctx2d.stroke();
          }
        }
        
        ctx2d.restore();
      }
      
      // Center circle pulsing with energy and shifting colors
      ctx2d.globalCompositeOperation = 'source-over';
      ctx2d.globalAlpha = 0.8;
      const centerRadius = 15 + totalEnergy * 25;
      const centerGradient = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerRadius);
      centerGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      centerGradient.addColorStop(0.5, `hsla(${bassHue}, 80%, 70%, ${totalEnergy})`);
      centerGradient.addColorStop(1, `hsla(${midHue}, 70%, 50%, 0.3)`);
      ctx2d.fillStyle = centerGradient;
      ctx2d.beginPath();
      ctx2d.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
      ctx2d.fill();
      
      ui.levelText.textContent = `Kaleidoscope | Segments: ${numSegments} | Energy: ${(totalEnergy * 100).toFixed(1)}%`;
    } else if (mode === 'sauron') {
      // Eye of Sauron visualizer
      analyser.getByteFrequencyData(freqBuffer);
      
      // Calculate energy metrics
      let totalEnergy = 0;
      let bassEnergy = 0;
      let midEnergy = 0;
      
      for (let i = 0; i < freqBuffer.length; i++) {
        const v = freqBuffer[i] / 255;
        totalEnergy += v;
        if (i < freqBuffer.length * 0.2) bassEnergy += v;
        else if (i < freqBuffer.length * 0.5) midEnergy += v;
      }
      
      totalEnergy /= freqBuffer.length;
      bassEnergy /= (freqBuffer.length * 0.2);
      midEnergy /= (freqBuffer.length * 0.3);
      
      const centerX = w / 2;
      const centerY = h / 2;
      
      // Outer eye glow (reacts to bass)
      const outerRadiusX = 180 + bassEnergy * 60;
      const outerRadiusY = 100 + bassEnergy * 30;
      
      ctx2d.globalCompositeOperation = 'lighter';
      
      // Multiple layers of fire glow
      for (let layer = 5; layer > 0; layer--) {
        const layerScale = layer / 5;
        const radiusX = outerRadiusX * layerScale * (1 + totalEnergy * 0.3);
        const radiusY = outerRadiusY * layerScale * (1 + totalEnergy * 0.3);
        
        const gradient = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX);
        gradient.addColorStop(0, `rgba(255, 69, 0, ${0.4 * layerScale * totalEnergy})`);
        gradient.addColorStop(0.3, `rgba(255, 140, 0, ${0.3 * layerScale * totalEnergy})`);
        gradient.addColorStop(0.6, `rgba(139, 0, 0, ${0.2 * layerScale * totalEnergy})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx2d.globalAlpha = 0.8;
        ctx2d.fillStyle = gradient;
        ctx2d.beginPath();
        ctx2d.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx2d.fill();
      }
      
      // Iris (orange fire)
      const irisRadiusX = 120 + midEnergy * 40;
      const irisRadiusY = 70 + midEnergy * 20;
      
      const irisGradient = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, irisRadiusX);
      irisGradient.addColorStop(0, 'rgba(255, 140, 0, 0.3)');
      irisGradient.addColorStop(0.4, 'rgba(255, 69, 0, 0.9)');
      irisGradient.addColorStop(0.7, 'rgba(200, 40, 0, 0.8)');
      irisGradient.addColorStop(1, 'rgba(80, 0, 0, 0.6)');
      
      ctx2d.globalAlpha = 1;
      ctx2d.fillStyle = irisGradient;
      ctx2d.beginPath();
      ctx2d.ellipse(centerX, centerY, irisRadiusX, irisRadiusY, 0, 0, Math.PI * 2);
      ctx2d.fill();
      
      // Pupil (vertical slit)
      const pupilWidth = 8 + totalEnergy * 15;
      const pupilHeight = irisRadiusY * 1.6;
      
      ctx2d.globalCompositeOperation = 'source-over';
      ctx2d.globalAlpha = 1;
      ctx2d.fillStyle = '#000000';
      ctx2d.fillRect(centerX - pupilWidth / 2, centerY - pupilHeight / 2, pupilWidth, pupilHeight);
      
      // Pupil edge glow
      const pupilGradient = ctx2d.createLinearGradient(centerX - pupilWidth, centerY, centerX + pupilWidth, centerY);
      pupilGradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
      pupilGradient.addColorStop(0.3, 'rgba(255, 140, 0, 0.4)');
      pupilGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      pupilGradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.4)');
      pupilGradient.addColorStop(1, 'rgba(255, 69, 0, 0.8)');
      
      ctx2d.globalCompositeOperation = 'lighter';
      ctx2d.globalAlpha = 0.6;
      ctx2d.fillStyle = pupilGradient;
      ctx2d.fillRect(centerX - pupilWidth * 2, centerY - pupilHeight / 2, pupilWidth * 4, pupilHeight);
      
      // Flame tendrils (react to frequency bands)
      ctx2d.globalCompositeOperation = 'lighter';
      const numTendrils = 12;
      for (let i = 0; i < numTendrils; i++) {
        const angle = (i / numTendrils) * Math.PI * 2;
        const freqIndex = Math.floor((i / numTendrils) * freqBuffer.length);
        const intensity = freqBuffer[freqIndex] / 255;
        
        if (intensity > 0.1) {
          const startX = centerX + Math.cos(angle) * outerRadiusX * 0.7;
          const startY = centerY + Math.sin(angle) * outerRadiusY * 0.7;
          const length = 40 + intensity * 80;
          const endX = centerX + Math.cos(angle) * (outerRadiusX * 0.7 + length);
          const endY = centerY + Math.sin(angle) * (outerRadiusY * 0.7 + length);
          
          const tendrilGradient = ctx2d.createLinearGradient(startX, startY, endX, endY);
          tendrilGradient.addColorStop(0, `rgba(255, 140, 0, ${intensity * 0.8})`);
          tendrilGradient.addColorStop(0.5, `rgba(255, 69, 0, ${intensity * 0.5})`);
          tendrilGradient.addColorStop(1, 'rgba(139, 0, 0, 0)');
          
          ctx2d.globalAlpha = 0.6;
          ctx2d.strokeStyle = tendrilGradient;
          ctx2d.lineWidth = 3 + intensity * 5;
          ctx2d.beginPath();
          ctx2d.moveTo(startX, startY);
          
          // Wavy tendril
          const midX = (startX + endX) / 2 + Math.sin(Date.now() / 200 + i) * 15;
          const midY = (startY + endY) / 2 + Math.cos(Date.now() / 200 + i) * 15;
          ctx2d.quadraticCurveTo(midX, midY, endX, endY);
          ctx2d.stroke();
        }
      }
      
      ctx2d.globalCompositeOperation = 'source-over';
      ui.levelText.textContent = `The Eye sees all | Power: ${(totalEnergy * 100).toFixed(1)}%`;
    } else if (mode === 'rings') {
      // Rings visualizer: concentric rings reacting to waveform amplitude
      analyser.getByteTimeDomainData(waveBuffer);
      analyser.getByteFrequencyData(freqBuffer);

      const centerX = w / 2;
      const centerY = h / 2;

      // Calculate overall energy
      let totalEnergy = 0;
      for (let i = 0; i < freqBuffer.length; i++) {
        totalEnergy += freqBuffer[i] / 255;
      }
      totalEnergy /= freqBuffer.length;

      // Calculate waveform RMS for ring intensity
      let waveRMS = 0;
      for (let i = 0; i < waveBuffer.length; i++) {
        const v = (waveBuffer[i] - 128) / 128;
        waveRMS += v * v;
      }
      waveRMS = Math.sqrt(waveRMS / waveBuffer.length);

      // Background glow
      const bgGradient = ctx2d.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(w, h) / 2);
      bgGradient.addColorStop(0, `rgba(96,165,250,${totalEnergy * 0.15})`);
      bgGradient.addColorStop(0.6, `rgba(52,211,153,${totalEnergy * 0.08})`);
      bgGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx2d.fillStyle = bgGradient;
      ctx2d.fillRect(0, 0, w, h);

      // Draw concentric rings
      const numRings = 12;
      const maxRadius = Math.min(w, h) / 2.2;

      ctx2d.globalCompositeOperation = 'lighter';

      for (let ring = 0; ring < numRings; ring++) {
        const ringProgress = ring / numRings;
        const baseRadius = (ring + 1) * (maxRadius / numRings);

        // Sample waveform for this ring
        const sampleIdx = Math.floor((ring / numRings) * waveBuffer.length);
        const waveValue = (waveBuffer[sampleIdx] - 128) / 128;

        // Ring radius varies with waveform
        const radiusOffset = waveValue * 25 * (1 - ringProgress * 0.5);
        const radius = baseRadius + radiusOffset + totalEnergy * 30;

        // Ring color based on frequency bands
        const freqIdx = Math.floor((ring / numRings) * freqBuffer.length);
        const freqValue = freqBuffer[freqIdx] / 255;
        const hue = 180 + ringProgress * 60; // Cyan to green
        const alpha = (0.3 + freqValue * 0.7) * (1 - ringProgress * 0.4);

        // Draw ring
        ctx2d.globalAlpha = alpha;
        ctx2d.strokeStyle = `hsla(${hue}, 70%, 60%, 1)`;
        ctx2d.lineWidth = 2 + freqValue * 4;
        ctx2d.beginPath();
        ctx2d.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx2d.stroke();

        // Inner glow
        ctx2d.globalAlpha = alpha * 0.5;
        ctx2d.strokeStyle = `hsla(${hue}, 80%, 80%, 1)`;
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
        ctx2d.stroke();
      }

      ctx2d.globalCompositeOperation = 'source-over';

      // Draw waveform around center
      ctx2d.globalAlpha = 0.8;
      ctx2d.strokeStyle = 'rgba(96,165,250,0.8)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      const waveRadius = 40;
      for (let i = 0; i < waveBuffer.length; i++) {
        const angle = (i / waveBuffer.length) * Math.PI * 2;
        const amp = ((waveBuffer[i] - 128) / 128) * 25;
        const r = waveRadius + amp;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      ctx2d.stroke();

      // Center dot
      ctx2d.globalAlpha = 1;
      ctx2d.fillStyle = `rgba(96,165,250,${0.6 + totalEnergy * 0.4})`;
      ctx2d.beginPath();
      ctx2d.arc(centerX, centerY, 8 + totalEnergy * 12, 0, Math.PI * 2);
      ctx2d.fill();

      // Compute RMS for display
      rms = 0;
      for (let i = 0; i < waveBuffer.length; i++) {
        const centered = (waveBuffer[i] - 128) / 128;
        rms += centered * centered;
      }
      rms = Math.sqrt(rms / waveBuffer.length);
      ui.levelText.textContent = `Energy: ${(totalEnergy * 100).toFixed(1)}% | RMS: ${(rms * 100).toFixed(1)}%`;
    } else if (mode === 'nyan') {
      // Nyan Cat visualizer!
      analyser.getByteFrequencyData(freqBuffer);
      
      // Calculate energy from audio
      let totalEnergy = 0;
      let bassEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;
      
      for (let i = 0; i < freqBuffer.length; i++) {
        const v = freqBuffer[i] / 255;
        totalEnergy += v;
        if (i < freqBuffer.length * 0.15) bassEnergy += v;
        else if (i < freqBuffer.length * 0.4) midEnergy += v;
        else highEnergy += v;
      }
      
      totalEnergy /= freqBuffer.length;
      bassEnergy /= (freqBuffer.length * 0.15);
      midEnergy /= (freqBuffer.length * 0.25);
      highEnergy /= (freqBuffer.length * 0.6);
      
      // Nyan cat position (bounces based on bass)
      const catX = w * 0.65;
      const catY = h / 2 + Math.sin(Date.now() / 300) * 30 * (1 + bassEnergy);
      const catSize = 8; // pixel size
      
      // Speed varies with energy
      const speed = 2 + totalEnergy * 4;
      
      // Draw stars in background (react to high frequencies)
      ctx2d.fillStyle = '#001133';
      ctx2d.fillRect(0, 0, w, h);
      
      const numStars = 50;
      const starOffset = (Date.now() / 20) % w;
      for (let i = 0; i < numStars; i++) {
        const sx = ((i * 137) % w - starOffset) % w;
        const sy = (i * 67) % h;
        const starBrightness = 0.3 + (freqBuffer[Math.floor(i * freqBuffer.length / numStars)] / 255) * 0.7;
        const starSize = 2 + (highEnergy * 2) * (i % 3 === 0 ? 1 : 0);
        ctx2d.fillStyle = `rgba(255, 255, 255, ${starBrightness})`;
        ctx2d.fillRect(sx, sy, starSize, starSize);
      }
      
      // Draw rainbow trail
      const rainbowColors = [
        '#FF0000', // Red
        '#FF7F00', // Orange
        '#FFFF00', // Yellow
        '#00FF00', // Green
        '#0000FF', // Blue
        '#4B0082', // Indigo
        '#9400D3'  // Violet
      ];
      
      const trailWidth = 60;
      const trailSegments = 40;
      
      for (let i = 0; i < trailSegments; i++) {
        const trailX = catX - i * 12 - (Date.now() % 1000) / 100;
        if (trailX < -20) continue;
        
        const trailAlpha = 1 - (i / trailSegments) * 0.7;
        const waveOffset = Math.sin((Date.now() / 200) - i * 0.3) * 8 * (1 + midEnergy * 0.5);
        
        for (let c = 0; c < rainbowColors.length; c++) {
          const colorY = catY + waveOffset + (c - 3) * (trailWidth / 7) * (1 + totalEnergy * 0.3);
          const colorHeight = (trailWidth / 7) * (1 + totalEnergy * 0.2);
          
          ctx2d.fillStyle = rainbowColors[c];
          ctx2d.globalAlpha = trailAlpha * (0.7 + totalEnergy * 0.3);
          ctx2d.fillRect(trailX, colorY, 12, colorHeight);
        }
      }
      
      ctx2d.globalAlpha = 1;
      
      // Draw Pop-Tart body (pixel art)
      const drawPixel = (x, y, color) => {
        ctx2d.fillStyle = color;
        ctx2d.fillRect(catX - x * catSize, catY + y * catSize, catSize, catSize);
      };
      
      // Pop-Tart body - pink with sprinkles
      const bodyColor = '#FFC0CB';
      const crustColor = '#D4A574';
      const sprinkleColors = ['#FF1493', '#00CED1', '#FFD700', '#32CD32', '#FF4500'];
      
      // Crust outline
      for (let x = 1; x < 5; x++) {
        for (let y = -1; y < 3; y++) {
          drawPixel(x, y, crustColor);
        }
      }
      
      // Pink filling
      for (let x = 1.5; x < 4.5; x++) {
        for (let y = -0.5; y < 2.5; y++) {
          drawPixel(x, y, bodyColor);
        }
      }
      
      // Animated sprinkles (change with beat)
      const sprinkleFrame = Math.floor(Date.now() / 200) % 5;
      for (let i = 0; i < 8; i++) {
        const sx = 1.5 + (i % 3);
        const sy = -0.5 + Math.floor(i / 3);
        if ((i + sprinkleFrame) % 3 === 0) {
          drawPixel(sx, sy, sprinkleColors[(i + sprinkleFrame) % sprinkleColors.length]);
        }
      }
      
      // Cat head (gray)
      const catGray = '#999999';
      const catDark = '#666666';
      const catPink = '#FFB6C1';
      
      // Head
      drawPixel(-1, -1, catGray);
      drawPixel(0, -1, catGray);
      drawPixel(-1, 0, catGray);
      drawPixel(0, 0, catGray);
      
      // Ears
      drawPixel(-1.5, -2, catGray);
      drawPixel(0.5, -2, catGray);
      drawPixel(-1.5, -1.5, catPink);
      drawPixel(0.5, -1.5, catPink);
      
      // Eyes (blink with bass)
      const eyeOpen = bassEnergy < 0.7;
      if (eyeOpen) {
        drawPixel(-0.7, -0.5, '#000000');
        drawPixel(0.2, -0.5, '#000000');
      } else {
        drawPixel(-0.7, -0.5, catDark);
        drawPixel(0.2, -0.5, catDark);
      }
      
      // Mouth
      drawPixel(-0.3, 0.3, '#000000');
      
      // Cat tail
      const tailWag = Math.sin(Date.now() / 100) > 0 ? 1 : 0;
      drawPixel(5, -1 + tailWag, catGray);
      drawPixel(6, -2 + tailWag, catGray);
      drawPixel(6, -1 + tailWag, catDark);
      
      // Cat paws (front)
      drawPixel(1, 3, catGray);
      drawPixel(2, 3, catGray);
      
      // Cat paws (back) 
      drawPixel(4, 3, catGray);
      drawPixel(5, 3, catGray);
      
      // Add sparkles around cat (react to high frequencies)
      const numSparkles = Math.floor(highEnergy * 20);
      for (let i = 0; i < numSparkles; i++) {
        const angle = (Date.now() / 30 + i * 137) % 360;
        const distance = 50 + (i % 3) * 20;
        const sparkleX = catX + Math.cos(angle) * distance;
        const sparkleY = catY + Math.sin(angle) * distance;
        const sparkleSize = 3 + Math.random() * 3;
        
        ctx2d.fillStyle = `hsla(${angle}, 100%, 70%, ${0.5 + highEnergy * 0.5})`;
        ctx2d.beginPath();
        ctx2d.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx2d.fill();
      }
      
      ui.levelText.textContent = `NYAN CAT~ | Energy: ${(totalEnergy * 100).toFixed(1)}% | Speed: ${speed.toFixed(1)}x`;
    } else {
      // waveform (default)
      // grid
      ctx2d.globalAlpha = 0.35;
      ctx2d.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx2d.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (h * i) / 6;
        ctx2d.beginPath();
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(w, y);
        ctx2d.stroke();
      }

      ctx2d.globalAlpha = 1;
      ctx2d.strokeStyle = 'rgba(96,165,250,0.95)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();

      for (let i = 0; i < waveBuffer.length; i++) {
        const v = waveBuffer[i] / 128.0; // 0..2
        const y = (v * h) / 2;
        const x = (i / (waveBuffer.length - 1)) * w;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);

        const centered = (waveBuffer[i] - 128) / 128;
        rms += centered * centered;
      }
      ctx2d.stroke();

      rms = Math.sqrt(rms / waveBuffer.length);
      ui.levelText.textContent = `Level: ${(rms * 100).toFixed(1)}%`;
    }
  }

  if (!state.rafId) frame();
}

function stopVisualizer() {
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  ui.levelText.textContent = 'Level: —';
}

function applyParams() {
  if (!state.audioContext) return;
  if (!state.gainNode || !state.filterNode) return;

  const vol01 = Number(ui.volume.value) / 100;
  const gain = linearFromSlider(vol01);
  state.gainNode.gain.setTargetAtTime(gain, state.audioContext.currentTime, 0.015);

  // Apply master volume
  if (state.masterGainNode) {
    const masterVol01 = Number(ui.masterVolume.value) / 100;
    const masterGain = linearFromSlider(masterVol01);
    state.masterGainNode.gain.setTargetAtTime(masterGain, state.audioContext.currentTime, 0.015);
  }

  // Apply brown noise mix
  if (state.brownNoiseGainNode) {
    if (ui.brownNoiseEnable.checked) {
      const mixVol01 = Number(ui.brownNoiseMix.value) / 100;
      const mixGain = linearFromSlider(mixVol01);
      state.brownNoiseGainNode.gain.setTargetAtTime(mixGain, state.audioContext.currentTime, 0.015);
    } else {
      state.brownNoiseGainNode.gain.setTargetAtTime(0, state.audioContext.currentTime, 0.015);
    }
  }

  const cutoff = Number(ui.cutoff.value);
  state.filterNode.frequency.setTargetAtTime(cutoff, state.audioContext.currentTime, 0.015);

  const preset = SOUND_PRESETS[ui.sound.value] || SOUND_PRESETS.brown;
  if (preset.kind === 'noise' && state.sourceController && state.sourceController.setNoiseType) {
    state.sourceController.setNoiseType(preset.noiseType);
  }
  if (preset.kind === 'tone' && state.sourceController && state.sourceController.setFrequency) {
    state.sourceController.setFrequency(ui.frequency.value);
  }
  if (preset.kind === 'demo' && state.sourceController && state.sourceController.setBpm) {
    state.sourceController.setBpm(ui.bpm.value);
  }
  if (preset.kind === 'demo' && state.sourceController && state.sourceController.setLoop) {
    state.sourceController.setLoop(ui.loopSong.checked);
  }
  if (preset.kind === 'demo' && state.sourceController && state.sourceController.setMelody) {
    state.sourceController.setMelody(ui.melody.value);
  }

  uiSync();
}

function autoStopFromDemo() {
  // Called by a demo when it reaches its ending (loop disabled).
  // We keep this minimal: it will suspend the context and update UI.
  if (!state.running) return;
  void stop();
}

async function start() {
  if (state.running) return;

  if (!state.audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
    ui.sampleRateText.textContent = `${state.audioContext.sampleRate.toLocaleString()} Hz`;

    await buildGraph();
  }

  if (state.audioContext.state !== 'running') {
    await state.audioContext.resume();
  }

  // Start transport for demo sources
  if (state.sourceController && state.sourceController.startTransport) {
    state.sourceController.startTransport();
  }

  state.running = true;
  setStatus('Running');
  uiSync();
  ensureVisualizerRunning();
}

async function stop() {
  if (!state.audioContext) return;
  state.running = false;
  setStatus('Stopped');
  uiSync();

  // Stop transport to reduce CPU while suspended
  if (state.sourceController && state.sourceController.stopTransport) {
    state.sourceController.stopTransport();
  }

  // Suspend instead of closing so "Start" is instant.
  if (state.audioContext.state === 'running') {
    await state.audioContext.suspend();
  }

  stopVisualizer();
}

async function panic() {
  // Hard stop: disconnect everything and close context.
  try {
    state.running = false;
    stopVisualizer();

    disconnectGraph();

    if (state.audioContext) {
      try { await state.audioContext.close(); } catch { /* ignore */ }
    }
  } finally {
    state.audioContext = null;
    disconnectGraph();
    setEngine('Not initialized');
    ui.sampleRateText.textContent = '—';
    setStatus('Idle');
    uiSync();
  }
}

// Wire UI
ui.toggleBtn.addEventListener('click', async () => {
  try {
    if (!state.running) await start();
    else await stop();
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err && err.message ? err.message : String(err)}`);
  }
});

ui.panicBtn.addEventListener('click', async () => {
  try {
    await panic();
  } catch (err) {
    console.error(err);
  }
});

ui.volume.addEventListener('input', applyParams);
ui.masterVolume.addEventListener('input', applyParams);
ui.brownNoiseEnable.addEventListener('change', applyParams);
ui.brownNoiseMix.addEventListener('input', applyParams);
ui.cutoff.addEventListener('input', applyParams);

ui.frequency.addEventListener('input', applyParams);
ui.bpm.addEventListener('input', applyParams);
ui.loopSong.addEventListener('change', applyParams);
ui.melody.addEventListener('input', applyParams);

ui.sound.addEventListener('change', async () => {
  uiSync();
  if (!state.audioContext) return;
  try {
    await buildGraph();
    if (state.running && state.audioContext.state !== 'running') {
      await state.audioContext.resume();
    }
    ensureVisualizerRunning();
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err && err.message ? err.message : String(err)}`);
  }
});

ui.vizMode.addEventListener('change', () => {
  uiSync();
});

// Theme management
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('noisemaker-theme', theme);
}

function loadSavedTheme() {
  const saved = localStorage.getItem('noisemaker-theme') || 'dark';
  ui.themeSelector.value = saved;
  applyTheme(saved);
}

ui.themeSelector.addEventListener('change', () => {
  applyTheme(ui.themeSelector.value);
});

// Keep audio from getting stuck if tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (!state.audioContext) return;
  // Do nothing; user controls start/stop. This just refreshes status.
  uiSync();
});

// Initial UI
loadSavedTheme();
updateSecureContextBadge();
setStatus('Idle');
uiSync();
