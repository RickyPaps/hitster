import { WHEEL_SEGMENTS, type WheelSegment } from '@/types/game';

// Cache for gradients that don't change with rotation
let cachedSize = 0;
let cachedSegments: WheelSegment[] = [];
let cachedSegmentGrads: CanvasGradient[] = [];
let cachedHubGrad: CanvasGradient | null = null;
let cachedPointerGrad: CanvasGradient | null = null;

function segmentsMatch(a: WheelSegment[], b: WheelSegment[]): boolean {
  if (a.length !== b.length) return false;
  // Quick identity check first (covers the common WHEEL_SEGMENTS constant case)
  if (a === b) return true;
  // Compare first and last segment colors as a cheap hash
  return a[0]?.accentColor === b[0]?.accentColor && a[a.length - 1]?.accentColor === b[b.length - 1]?.accentColor;
}

function ensureGradientCache(ctx: CanvasRenderingContext2D, size: number, segments: WheelSegment[]): void {
  if (cachedSize === size && cachedSegmentGrads.length > 0 && segmentsMatch(cachedSegments, segments)) return;

  const center = size / 2;
  const radius = center - 12;

  // Segment radial gradients — color visible from 30% outward
  cachedSegmentGrads = segments.map(seg => {
    const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
    grad.addColorStop(0, seg.baseColor);
    grad.addColorStop(0.3, seg.baseColor);
    grad.addColorStop(1, seg.accentColor);
    return grad;
  });
  cachedSegments = segments;

  // Hub gradient
  const hubRadius = Math.max(20, size / 16);
  cachedHubGrad = ctx.createRadialGradient(center, center, 0, center, center, hubRadius);
  cachedHubGrad.addColorStop(0, '#1a0a2e');
  cachedHubGrad.addColorStop(0.7, '#0d0216');
  cachedHubGrad.addColorStop(1, '#1a0a2e');

  // Pointer gradient
  const pointerY = 4;
  const pointerH = 28;
  cachedPointerGrad = ctx.createLinearGradient(center, pointerY, center, pointerY + pointerH);
  cachedPointerGrad.addColorStop(0, '#ff007f');
  cachedPointerGrad.addColorStop(1, '#bc13fe');

  cachedSize = size;
}

export function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  currentRotation: number,
  customSegments?: WheelSegment[]
): void {
  const center = size / 2;
  const radius = center - 12;
  const segments = customSegments ?? WHEEL_SEGMENTS;
  const arc = (2 * Math.PI) / segments.length;
  const fontSize = Math.max(11, size / 28);

  ctx.clearRect(0, 0, size, size);

  ensureGradientCache(ctx, size, segments);

  // --- Segments with cached radial gradients ---
  for (let i = 0; i < segments.length; i++) {
    const startAngle = i * arc + currentRotation;
    const endAngle = startAngle + arc;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = cachedSegmentGrads[i];
    ctx.fill();
  }

  // --- Segment dividers: thin glowing white lines ---
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < segments.length; i++) {
    const angle = i * arc + currentRotation;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(angle) * radius,
      center + Math.sin(angle) * radius
    );
    ctx.stroke();
  }
  ctx.restore();

  // --- Outer rim: double neon purple ring ---
  ctx.save();
  ctx.shadowColor = 'rgba(188, 19, 254, 0.7)';
  ctx.shadowBlur = 12;
  // Outer ring
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(188, 19, 254, 0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Inner ring (slightly inset)
  ctx.beginPath();
  ctx.arc(center, center, radius - 5, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(188, 19, 254, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // --- Text labels: uppercase, bold, dark outline for readability ---
  ctx.save();
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < segments.length; i++) {
    const startAngle = i * arc + currentRotation;
    const label = segments[i].label.toUpperCase();
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + arc / 2);
    // Dark stroke outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.strokeText(label, radius - 20, 0);
    // White fill on top
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#fff';
    ctx.fillText(label, radius - 20, 0);
    ctx.restore();
  }
  ctx.restore();

  // --- Center hub: vinyl record feel ---
  const hubRadius = Math.max(20, size / 16);

  ctx.beginPath();
  ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
  ctx.fillStyle = cachedHubGrad!;
  ctx.fill();

  // Neon purple ring around hub
  ctx.save();
  ctx.shadowColor = 'rgba(188, 19, 254, 0.9)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#bc13fe';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Concentric groove lines (vinyl effect)
  ctx.strokeStyle = 'rgba(188, 19, 254, 0.15)';
  ctx.lineWidth = 0.5;
  const grooveCount = 3;
  for (let g = 1; g <= grooveCount; g++) {
    const r = (hubRadius * g) / (grooveCount + 1);
    ctx.beginPath();
    ctx.arc(center, center, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Small neon center dot
  ctx.beginPath();
  ctx.arc(center, center, 3, 0, 2 * Math.PI);
  ctx.fillStyle = '#bc13fe';
  ctx.shadowColor = 'rgba(188, 19, 254, 1)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // --- Pointer: pink-to-purple gradient triangle with glow ---
  ctx.save();
  ctx.shadowColor = 'rgba(255, 0, 127, 0.8)';
  ctx.shadowBlur = 14;

  const pointerW = 14;
  const pointerH = 28;
  const pointerY = 4;

  ctx.beginPath();
  ctx.moveTo(center - pointerW, pointerY);
  ctx.lineTo(center + pointerW, pointerY);
  ctx.lineTo(center, pointerY + pointerH);
  ctx.closePath();
  ctx.fillStyle = cachedPointerGrad!;
  ctx.fill();

  // Thin bright edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
