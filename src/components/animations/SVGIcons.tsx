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
