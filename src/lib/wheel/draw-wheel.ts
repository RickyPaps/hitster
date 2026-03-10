import { WHEEL_SEGMENTS } from '@/types/game';

export function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  currentRotation: number
): void {
  const center = size / 2;
  const radius = center - 12;
  const segments = WHEEL_SEGMENTS;
  const arc = (2 * Math.PI) / segments.length;
  const fontSize = Math.max(11, size / 28);

  ctx.clearRect(0, 0, size, size);

  // --- Segments with radial gradients ---
  for (let i = 0; i < segments.length; i++) {
    const startAngle = i * arc + currentRotation;
    const endAngle = startAngle + arc;
    const seg = segments[i];

    // Radial gradient: base color at center → accent color at edge
    const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
    grad.addColorStop(0, seg.baseColor);
    grad.addColorStop(0.6, seg.baseColor);
    grad.addColorStop(1, seg.accentColor);

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
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

  // --- Text labels: uppercase, bold, white glow ---
  ctx.save();
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 6;

  for (let i = 0; i < segments.length; i++) {
    const startAngle = i * arc + currentRotation;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + arc / 2);
    ctx.fillText(segments[i].label.toUpperCase(), radius - 20, 0);
    ctx.restore();
  }
  ctx.restore();

  // --- Center hub: vinyl record feel ---
  const hubRadius = Math.max(20, size / 16);

  // Dark fill with radial gradient
  const hubGrad = ctx.createRadialGradient(center, center, 0, center, center, hubRadius);
  hubGrad.addColorStop(0, '#1a0a2e');
  hubGrad.addColorStop(0.7, '#0d0216');
  hubGrad.addColorStop(1, '#1a0a2e');

  ctx.beginPath();
  ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
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

  const pGrad = ctx.createLinearGradient(center, pointerY, center, pointerY + pointerH);
  pGrad.addColorStop(0, '#ff007f');
  pGrad.addColorStop(1, '#bc13fe');

  ctx.beginPath();
  ctx.moveTo(center - pointerW, pointerY);
  ctx.lineTo(center + pointerW, pointerY);
  ctx.lineTo(center, pointerY + pointerH);
  ctx.closePath();
  ctx.fillStyle = pGrad;
  ctx.fill();

  // Thin bright edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
