'use client';

class ArcadeSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.35;
  public musicEnabled = false;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(
    freq: number,
    duration = 0.09,
    type: OscillatorType = 'sine',
    slideFreq?: number,
    gainScale = 0.25
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(Math.max(0.001, this.volume * gainScale), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio autoplay lock before user gesture
    }
  }

  playMove() {
    this.playTone(440, 0.06, 'triangle', 520);
  }

  playFlip() {
    this.playTone(580, 0.05, 'sine', 740, 0.2);
  }

  playDrop() {
    this.playTone(360, 0.08, 'triangle', 210, 0.3);
  }

  playPop(combo = 1) {
    const base = Math.min(880, 420 + combo * 55);
    this.playTone(base, 0.07, 'sine', base * 1.45, 0.28);
  }

  playCapture() {
    this.playTone(320, 0.1, 'sine', 640);
  }

  playSplash() {
    this.playTone(260, 0.12, 'sine', 140, 0.22);
  }

  playExplosion() {
    this.playTone(130, 0.18, 'sawtooth', 52, 0.35);
    setTimeout(() => this.playTone(95, 0.15, 'triangle', 45, 0.3), 45);
  }

  playCheck() {
    this.playTone(659.25, 0.09, 'sawtooth', 880, 0.28);
    setTimeout(() => this.playTone(880, 0.14, 'sawtooth', 659.25, 0.28), 95);
  }

  playSuccess() {
    this.playTone(523.25, 0.11, 'triangle', 659.25);
    setTimeout(() => this.playTone(783.99, 0.16, 'triangle', 1046.5), 90);
  }

  playFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.15, 'triangle', n * 1.02, 0.28), idx * 80);
    });
  }

  playError() {
    this.playTone(220, 0.14, 'sawtooth', 165);
  }

  toggleMusic(forceState?: boolean): boolean {
    const next = typeof forceState === 'boolean' ? forceState : !this.musicEnabled;
    this.musicEnabled = next;
    if (this.musicEnabled) {
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
    return this.musicEnabled;
  }

  private startMusicLoop() {
    this.stopMusicLoop();
    // Cozy pentatonic music box arpeggio loop
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || !this.enabled) return;
      const note = scale[this.noteIndex % scale.length];
      this.noteIndex = (this.noteIndex + 1) % scale.length;
      this.playTone(note, 0.28, 'sine', note * 1.005, 0.07);
    }, 460);
  }

  private stopMusicLoop() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundFX = new ArcadeSoundEngine();
