/**
 * Minimal Web Audio synth for interface feedback. Nothing plays until the
 * visitor enables sound through the toggle in the navigation — no autoplay.
 * Structured so generated tones can later be swapped for real audio files.
 */

let audioContext: AudioContext | null = null;
let soundEnabled = false;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (enabled) {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

interface ToneOptions {
  frequency: number;
  /** Optional glide target — gives tones a mechanical "servo" quality. */
  glideTo?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
}

function tone({ frequency, glideTo, duration = 0.18, type = 'sine', gain = 0.045 }: ToneOptions): void {
  if (!soundEnabled || !audioContext) return;
  const now = audioContext.currentTime;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + duration);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

export const sfx = {
  /** System activation — the Core powering on. */
  activate(): void {
    tone({ frequency: 90, glideTo: 220, duration: 0.5, type: 'sawtooth', gain: 0.03 });
    tone({ frequency: 440, glideTo: 880, duration: 0.35, type: 'sine', gain: 0.02 });
  },
  /** World/project selection. */
  select(): void {
    tone({ frequency: 520, glideTo: 700, duration: 0.12, type: 'triangle' });
  },
  /** Capability module installed. */
  install(): void {
    tone({ frequency: 320, glideTo: 260, duration: 0.1, type: 'square', gain: 0.02 });
  },
  /** Portal opening / final CTA. */
  portal(): void {
    tone({ frequency: 140, glideTo: 420, duration: 0.6, type: 'sawtooth', gain: 0.03 });
  },
};
