/**
 * Sound Effects Engine for DOAB Platform
 * Replicates low-latency audio pool and tactical click sound feedback from SAHNIRMAAN / SWATVA.
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

export function playAlertAlarm() {
  if (!isSoundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // First high beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second higher urgency beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.16); // D6
    gain2.gain.setValueAtTime(0.22, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.38);
  } catch (err) {}
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
