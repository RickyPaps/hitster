import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

export function ConfettiStar({ size = 16, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <polygon points="12,0 14.5,9.5 24,12 14.5,14.5 12,24 9.5,14.5 0,12 9.5,9.5" />
    </svg>
  );
}

export function ConfettiDiamond({ size = 14, color = '#00f2ff', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" transform="rotate(45 12 12)" />
    </svg>
  );
}

export function MusicalNote({ size = 18, color = '#8b5cf6', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 3v14a4 4 0 1 1-2-3.46V3h2zM10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M12 3h6v2h-6z" />
    </svg>
  );
}

export function MusicalNotes({ size = 20, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M9 3v12a3.5 3.5 0 1 1-2-3.16V5h8v8a3.5 3.5 0 1 1-2-3.16V3H9zM7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
      <path d="M9 5h8V3H9v2z" />
    </svg>
  );
}

export function StreakFlame({ size = 24, color = '#EAB308', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2C8.5 7 4 9.5 4 14a8 8 0 0 0 16 0c0-4.5-4.5-7-8-12z"
        fill={color}
      />
      <path
        d="M12 9c-2 3-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-2-4-4-7z"
        fill="#ff6b00"
      />
      <path
        d="M12 14c-1 1.5-2 2.5-2 4a2 2 0 0 0 4 0c0-1.5-1-2.5-2-4z"
        fill="#fff4"
      />
    </svg>
  );
}

export function SparkleIcon({ size = 20, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 0l2.5 8.5L24 12l-9.5 3.5L12 24l-2.5-8.5L0 12l9.5-3.5z" />
      <path d="M5 2l1 3.5L10 7 6 8.5 5 12l-1-3.5L0 7l4-1.5z" opacity={0.6} />
      <path d="M19 14l1 3.5L24 19l-4 1.5L19 24l-1-3.5L14 19l4-1.5z" opacity={0.6} />
    </svg>
  );
}

export function TrophyIcon({ size = 96, color = '#EAB308', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" {...props}>
      {/* Cup */}
      <path
        d="M16 8h32v20c0 10-7.16 18-16 18S16 38 16 28V8z"
        fill={color}
      />
      {/* Left handle */}
      <path
        d="M16 14H10a4 4 0 0 0-4 4v4a8 8 0 0 0 8 8h2"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M48 14h6a4 4 0 0 1 4 4v4a8 8 0 0 1-8 8h-2"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />
      {/* Inner shine */}
      <path
        d="M22 14h6v14c0 4-2 6-3 6s-3-2-3-6V14z"
        fill="#fff"
        opacity={0.3}
      />
      {/* Stem */}
      <rect x="28" y="44" width="8" height="8" rx="1" fill={color} />
      {/* Base */}
      <rect x="20" y="52" width="24" height="5" rx="2.5" fill={color} />
      {/* Star decoration */}
      <path
        d="M32 16l2 4 4.5 0.5-3.25 3 0.75 4.5L32 26l-4 2 0.75-4.5-3.25-3L30 20z"
        fill="#fff"
        opacity={0.5}
      />
    </svg>
  );
}

export function LightningBolt({ size = 20, color = '#EAB308', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function CrownIcon({ size = 20, color = '#EAB308', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M2 20h20v2H2zM2 18l3-12 5 6 2-10 2 10 5-6 3 12z" />
    </svg>
  );
}

export function ArrowUp({ size = 14, color = '#22c55e', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 4l-8 8h5v8h6v-8h5z" />
    </svg>
  );
}

export function ArrowDown({ size = 14, color = '#ef4444', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 20l8-8h-5V4h-6v8H4z" />
    </svg>
  );
}

// ── Milestone & Surprise Icons ──

export function ShieldIcon({ size = 24, color = '#4d9fff', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12.99H5V8.26l7-3.89v8.62z" />
    </svg>
  );
}

export function SwapIcon({ size = 24, color = '#33ff77', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M6 7h8l-3-3 1.5-1.5L17 7l-4.5 4.5L11 10l3-3H6v5H4V7h2zm12 10h-8l3 3-1.5 1.5L7 17l4.5-4.5L13 14l-3 3h8v-5h2v5h-2z" />
    </svg>
  );
}

export function DoublePtsIcon({ size = 24, color = '#ff8833', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2" y="6" width="20" height="12" rx="3" fill={color} />
      <text x="12" y="16" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="12" fill="white">x2</text>
    </svg>
  );
}

export function StealIcon({ size = 24, color = '#ef4444', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 17a2 2 0 0 0 2-2v-1h-4v1a2 2 0 0 0 2 2zm6-6V8A6 6 0 0 0 6 8v3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2zm-2 0H8V8a4 4 0 0 1 8 0v3z" />
    </svg>
  );
}

export function SurpriseIcon({ size = 24, color = '#bc4dff', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} {...props}>
      <path d="M12 0l3 7.5L24 9l-6 5.5L19.5 24 12 19.5 4.5 24 6 14.5 0 9l9-1.5z" />
      <text x="12" y="15" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="10" fill="white">!</text>
    </svg>
  );
}

// ── Bingo Card Category Icons ──

export function BingoCalendar({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="6" width="24" height="22" rx="3" />
      <path d="M4 13h24" />
      <path d="M10 3v5M22 3v5" />
      <rect x="9" y="17" width="4" height="4" rx="0.5" fill={color} stroke="none" />
      <rect x="19" y="17" width="4" height="4" rx="0.5" fill={color} stroke="none" opacity={0.5} />
    </svg>
  );
}

export function BingoArtist({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="16" cy="11" r="5" />
      <path d="M6 28c0-5.52 4.48-10 10-10s10 4.48 10 10" />
    </svg>
  );
}

export function BingoSongTitle({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 6v16" />
      <path d="M12 6h10v4" />
      <circle cx="8" cy="22" r="4" fill={color} stroke="none" />
    </svg>
  );
}

export function BingoAlbum({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="4" fill={color} stroke="none" />
      <circle cx="16" cy="16" r="1.5" fill="#1a0a30" stroke="none" />
    </svg>
  );
}

export function BingoYearApprox({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 8v8l5 3" />
    </svg>
  );
}

export function BingoDecade({ size = 32, color = '#d946ef', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="6" width="24" height="22" rx="3" />
      <path d="M4 13h24" />
      <path d="M10 3v5M22 3v5" />
      <path d="M10 18h12M10 23h8" />
    </svg>
  );
}

// ── Leaderboard & Animation Icons ──

/** Flame crown — a crown wreathed in stylized flames for #1 takeover */
export function FlameCrown({ size = 32, color = '#EAB308', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
      {/* Outer flames */}
      <path
        d="M8 30C6 22 10 16 14 12c-1 5 2 8 5 6-2-4 1-10 5-14 2 6 4 8 6 6 1-3 4-6 6-8 0 5 3 10 1 16 3 2 6-1 5-6 4 4 8 10 6 18"
        fill="url(#flame-grad)"
        opacity={0.7}
      />
      {/* Crown */}
      <path
        d="M10 36h28v4H10zM10 34l5-14 5 8 4-12 4 12 5-8 5 14z"
        fill={color}
      />
      {/* Crown jewels */}
      <circle cx="24" cy="28" r="2.5" fill="#fff" opacity={0.5} />
      <circle cx="17" cy="30" r="1.5" fill="#ff6b00" opacity={0.7} />
      <circle cx="31" cy="30" r="1.5" fill="#ff6b00" opacity={0.7} />
      {/* Gradient definition */}
      <defs>
        <linearGradient id="flame-grad" x1="24" y1="2" x2="24" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="30%" stopColor="#ffb700" />
          <stop offset="60%" stopColor="#ff6b00" />
          <stop offset="100%" stopColor="#ff4500" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Shattered cell icon — cracked tile for block/remove effects */
export function ShatterIcon({ size = 24, color = '#ef4444', ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {/* Broken tile pieces */}
      <path d="M2 2l8 3 2 7-7 2z" fill={color} opacity={0.8} />
      <path d="M12 2l7 1-1 9-6-2z" fill={color} opacity={0.6} />
      <path d="M5 14l7-2 3 8-8 2z" fill={color} opacity={0.7} />
      <path d="M18 12l4 2-3 8-7-2z" fill={color} opacity={0.5} />
      {/* Crack lines */}
      <line x1="12" y1="2" x2="12" y2="12" stroke="#fff" strokeWidth="0.5" opacity={0.4} />
      <line x1="2" y1="12" x2="12" y2="12" stroke="#fff" strokeWidth="0.5" opacity={0.4} />
      <line x1="12" y1="12" x2="22" y2="22" stroke="#fff" strokeWidth="0.5" opacity={0.4} />
    </svg>
  );
}
