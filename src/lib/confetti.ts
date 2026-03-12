import confetti from 'canvas-confetti';

const NEON_COLORS = ['#d946ef', '#00f2ff', '#8b5cf6', '#22c55e', '#EAB308', '#ff3355', '#bc13fe', '#33ff77'];
const GOLD_COLORS = ['#EAB308', '#fbbf24', '#f59e0b', '#d97706', '#ff3355', '#d946ef'];
const STAR_COLORS = ['#EAB308', '#d946ef', '#fbbf24', '#f59e0b', '#ff3355', '#bc13fe'];

function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function fireConfetti(opts?: {
  particleCount?: number;
  colors?: string[];
  origin?: { x: number; y: number };
  spread?: number;
  angle?: number;
}) {
  if (isReducedMotion()) return;
  confetti({
    particleCount: opts?.particleCount ?? 25,
    colors: opts?.colors ?? NEON_COLORS,
    origin: opts?.origin ?? { x: 0.5, y: 0.5 },
    spread: opts?.spread ?? 70,
    angle: opts?.angle,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}

export function fireSideCannons(count: number = 40) {
  if (isReducedMotion()) return;
  // Left cannon
  confetti({
    particleCount: count,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.6 },
    colors: NEON_COLORS,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
  // Right cannon
  confetti({
    particleCount: count,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.6 },
    colors: NEON_COLORS,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}

export function fireFireworks(bursts: number = 3) {
  if (isReducedMotion()) return;
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 20,
        startVelocity: 30,
        spread: 360,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.4 },
        colors: NEON_COLORS,
        disableForReducedMotion: true,
        zIndex: 9999,
      });
    }, i * 400);
  }
}

export function fireGoldConfetti(opts?: { particleCount?: number; origin?: { x: number; y: number } }) {
  if (isReducedMotion()) return;
  confetti({
    particleCount: opts?.particleCount ?? 20,
    colors: GOLD_COLORS,
    origin: opts?.origin ?? { x: 0.5, y: 0.5 },
    spread: 80,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}

export function fireStars(origin?: { x: number; y: number }) {
  if (isReducedMotion()) return;
  confetti({
    particleCount: 25,
    colors: STAR_COLORS,
    origin: origin ?? { x: 0.5, y: 0.5 },
    spread: 100,
    shapes: ['star'],
    scalar: 1.2,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}

export function fireFromElement(el: HTMLElement, opts?: { particleCount?: number; colors?: string[] }) {
  if (isReducedMotion()) return;
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  confetti({
    particleCount: opts?.particleCount ?? 30,
    colors: opts?.colors ?? NEON_COLORS,
    origin: { x, y },
    spread: 80,
    startVelocity: 25,
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}
