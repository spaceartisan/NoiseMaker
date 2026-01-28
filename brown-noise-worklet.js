// Multi-noise generator implemented as an AudioWorkletProcessor.
// Supports white, pink (Paul Kellet filter), and brown (integrated white).
// noiseType: 0 = white, 1 = pink, 2 = brown

class NoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'gain', defaultValue: 1.0, minValue: 0.0, maxValue: 2.0 },
      { name: 'noiseType', defaultValue: 2.0, minValue: 0.0, maxValue: 2.0 },
    ];
  }

  constructor() {
    super();

    // brown
    this._brownLast = 0.0;

    // pink (Paul Kellet)
    this._p0 = 0.0;
    this._p1 = 0.0;
    this._p2 = 0.0;
    this._p3 = 0.0;
    this._p4 = 0.0;
    this._p5 = 0.0;
    this._p6 = 0.0;
  }

  _nextWhite() {
    return (Math.random() * 2.0) - 1.0;
  }

  _nextBrown() {
    const white = this._nextWhite();
    this._brownLast = (this._brownLast + 0.02 * white) / 1.02;
    return this._brownLast * 3.5;
  }

  _nextPink() {
    const white = this._nextWhite();
    this._p0 = 0.99886 * this._p0 + white * 0.0555179;
    this._p1 = 0.99332 * this._p1 + white * 0.0750759;
    this._p2 = 0.96900 * this._p2 + white * 0.1538520;
    this._p3 = 0.86650 * this._p3 + white * 0.3104856;
    this._p4 = 0.55000 * this._p4 + white * 0.5329522;
    this._p5 = -0.7616 * this._p5 - white * 0.0168980;
    const pink = this._p0 + this._p1 + this._p2 + this._p3 + this._p4 + this._p5 + this._p6 + white * 0.5362;
    this._p6 = white * 0.115926;
    return pink * 0.11;
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    const gainParam = parameters.gain;
    const typeParam = parameters.noiseType;

    for (let channel = 0; channel < output.length; channel++) {
      const out = output[channel];
      for (let i = 0; i < out.length; i++) {
        const g = gainParam.length === 1 ? gainParam[0] : gainParam[i];
        const t = typeParam.length === 1 ? typeParam[0] : typeParam[i];
        const type = Math.max(0, Math.min(2, Math.round(t)));

        let sample = 0;
        if (type === 0) sample = this._nextWhite();
        else if (type === 1) sample = this._nextPink();
        else sample = this._nextBrown();

        out[i] = sample * g;
      }
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
