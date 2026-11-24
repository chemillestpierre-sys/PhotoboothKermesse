let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext?: typeof AudioContext})
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function unlockAudio(): void {
  getAudioContext();
}

export function playCountdownBeep(isLastSecond: boolean = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = isLastSecond ? 1046.5 : 784;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(baseFreq * 2, now);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.25, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.58, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + 0.21);
    harmonic.stop(now + 0.21);
  } catch {
    // Ignore audio errors on muted devices
  }
}

export function playShutterSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Crisp mechanical shutter click
    const bufferSize = Math.floor(ctx.sampleRate * 0.07);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Distinct bright two-note shutter confirmation chime
    const osc1 = ctx.createOscillator();
    const toneGain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1174.66, now + 0.015);
    osc1.frequency.setValueAtTime(1567.98, now + 0.095);
    toneGain1.gain.setValueAtTime(0.001, now + 0.015);
    toneGain1.gain.exponentialRampToValueAtTime(0.5, now + 0.035);
    toneGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(toneGain1);
    toneGain1.connect(ctx.destination);
    osc1.start(now + 0.015);
    osc1.stop(now + 0.29);
  } catch {
    // Ignore audio errors
  }
}
