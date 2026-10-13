/**
 * Sound Effects Engine for DOAB Platform
 * Low-latency audio pool and tactical click sound feedback.
 */

const CLICK_SOUND_PATH = '/sounds/click.mp3';
const LOADING_SOUND_PATH = '/sounds/Loading_Screen.mp3';
const CARD_SPREAD_PATH = '/sounds/card_spread.wav';
const CARD_SWIPED_PATH = '/sounds/card_swiped.wav';

const clickAudioPool: HTMLAudioElement[] = [];
const POOL_SIZE = 6;
let poolIndex = 0;
let isAudioPoolInitialized = false;

export function initAudioPool() {
  if (typeof window === 'undefined' || isAudioPoolInitialized) return;
  isAudioPoolInitialized = true;
  for (let i = 0; i < POOL_SIZE; i++) {
    try {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = 0.35;
      audio.load();
      clickAudioPool.push(audio);
    } catch (e) {
      console.warn('Failed to initialize click audio:', e);
    }
  }
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('doab_sounds_muted') !== 'true';
}

export function playClick() {
  if (!isSoundEnabled()) return;

  initAudioPool();
  try {
    if (clickAudioPool.length > 0) {
      const sound = clickAudioPool[poolIndex];
      sound.currentTime = 0;
      sound.volume = 0.35;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      poolIndex = (poolIndex + 1) % clickAudioPool.length;
    }
  } catch (err) {
    // Fallback silently
  }
}

export function playLoadingSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio(LOADING_SOUND_PATH);
    audio.volume = 0.45;
    audio.play().catch(() => {});
  } catch (err) {}
}

export function playCardSpread() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio(CARD_SPREAD_PATH);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch (err) {}
}

export function playCardSwiped() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio(CARD_SWIPED_PATH);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch (err) {}
}

/**
 * High-urgency pulsing / buzzing emergency alarm for SOS & Life-Threatening Hazards.
 * Features a dual-frequency square/sawtooth warble with aggressive tremolo buzzer.
 */
export function playEmergencyBuzzingAlarm(durationMs: number = 3200) {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime;
    const stopTime = startTime + durationMs / 1000;

    // Dual-tone buzzer: 920Hz and 780Hz square waves with rapid modulation
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // Warbling Siren Pitch modulation
    osc1.frequency.setValueAtTime(880, startTime);
    osc2.frequency.setValueAtTime(640, startTime);

    // Rapid alternating buzzer pulse (every 180ms)
    for (let t = startTime; t < stopTime; t += 0.36) {
      osc1.frequency.setValueAtTime(960, t);
      osc2.frequency.setValueAtTime(720, t);
      osc1.frequency.setValueAtTime(640, t + 0.18);
      osc2.frequency.setValueAtTime(480, t + 0.18);
    }

    // Buzzing amplitude envelope with hard staccato chops
    gainNode.gain.setValueAtTime(0.35, startTime);
    for (let t = startTime; t < stopTime; t += 0.18) {
      gainNode.gain.setValueAtTime(0.35, t);
      gainNode.gain.setValueAtTime(0.02, t + 0.14);
    }
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  } catch (err) {
    console.warn('Emergency buzzer sound error:', err);
  }
}

/**
 * Standard Civic Notification Alert chime:
 * A modern, 2-note ascending marimba/crystal chime (G5 -> C6).
 */
export function playCivicNotificationChime() {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Note 1: G5 (784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.24, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Note 2: C6 (1046.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.12);
    gain2.gain.setValueAtTime(0.26, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.42);
  } catch (err) {}
}

/**
 * Gentle, reassuring arrival accomplishment chime (E5 -> G#5 -> B5 major triad).
 */
export function playArrivalSuccessChime() {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const chord = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.20, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch (err) {}
}

export function playAlertAlarm() {
  playEmergencyBuzzingAlarm(2400);
}

/**
 * Playful, cute giggling sound effect synthesized using musical chimes & bubbly frequency modulations
 */
export function playChildGiggle() {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const start = ctx.currentTime;

    // Pattern of playful bubbly laughs: "hee-hee-hee-hee!"
    const chuckleTones = [
      { freq: 880, startOffset: 0.00, dur: 0.10 },
      { freq: 1100, startOffset: 0.09, dur: 0.11 },
      { freq: 1320, startOffset: 0.20, dur: 0.12 },
      { freq: 1040, startOffset: 0.33, dur: 0.10 },
      { freq: 1396, startOffset: 0.44, dur: 0.13 },
      { freq: 1568, startOffset: 0.58, dur: 0.16 }
    ];

    chuckleTones.forEach(({ freq, startOffset, dur }, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sine wave with slight vibrato for cute, soft organic laugh
      osc.type = 'sine';
      const t = start + startOffset;
      osc.frequency.setValueAtTime(freq, t);
      // Pitch inflection upward like a giggle
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + dur * 0.7);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, t + dur);

      // Amplitude envelope
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16 + (idx % 2) * 0.04, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur);
    });
  } catch (err) {}
}

export function initGlobalClickSound() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.soundInit === '1') return;
  document.documentElement.dataset.soundInit = '1';
  initAudioPool();

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-sound="click"], .cta-sound');
    if (target) {
      playClick();
    }
  }, { capture: true, passive: true });
}
