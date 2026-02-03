
class SoundService {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = false;
  private musicInterval: number | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, freqEnd?: number) {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  playPop() {
    this.playTone(600, 'sine', 0.1, 0.1);
  }

  playPanelDone() {
    this.playTone(400, 'square', 0.2, 0.05);
    setTimeout(() => this.playTone(800, 'square', 0.2, 0.05), 50);
  }

  playVillainSpawn() {
    this.playTone(100, 'sawtooth', 0.8, 0.15, 40);
  }

  playSuccess() {
    const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    tones.forEach((t, i) => {
      setTimeout(() => this.playTone(t, 'sine', 0.4, 0.05), i * 100);
    });
  }

  playClick() {
    this.playTone(1000, 'sine', 0.05, 0.05);
  }

  playActionZap() {
    this.playTone(1200, 'sawtooth', 0.3, 0.1, 200);
  }

  playActionPow() {
    this.playTone(200, 'square', 0.2, 0.15, 50);
    this.playTone(100, 'sine', 0.2, 0.2);
  }

  playActionBoom() {
    this.playTone(80, 'sawtooth', 0.6, 0.3, 20);
    // Noise simulation for explosion
    if (!this.audioCtx) return;
    const bufferSize = this.audioCtx.sampleRate * 0.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.5);
    noise.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    noise.start();
  }

  playEpicTrailerMusic() {
    if (this.muted) return;
    this.init();
    if (!this.audioCtx) return;
    if (this.musicInterval) return;

    const notes = [110, 110, 130, 110, 164, 110, 146, 110];
    let step = 0;
    
    this.musicInterval = window.setInterval(() => {
      this.playTone(notes[step % notes.length], 'sawtooth', 0.25, 0.03);
      if (step % 4 === 0) this.playTone(55, 'square', 0.4, 0.06);
      if (step % 4 === 2) this.playTone(800, 'sine', 0.1, 0.02);
      step++;
    }, 200);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundService = new SoundService();
