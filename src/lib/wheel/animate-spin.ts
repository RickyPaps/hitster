import { WHEEL_SEGMENTS } from '@/types/game';

export function easeOutQuintic(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * Calculate spin animation parameters from a result index and swipe velocity.
 * Higher velocity = more spins and longer duration.
 */
export function calculateSpinAnimation(
  resultIndex: number,
  swipeVelocity: number
): { totalRotation: number; duration: number } {
  const segmentCount = WHEEL_SEGMENTS.length;
  const arc = (2 * Math.PI) / segmentCount;

  // Pointer is at top (-PI/2). We need the center of resultIndex's segment
  // to align with the pointer.
  let landAngle = -(resultIndex * arc + arc / 2) - Math.PI / 2;
  landAngle = ((landAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Map velocity to full spins and duration
  // velocity 0.3 → 3 spins, 2800ms
  // velocity 1.0 → 6 spins, 3500ms
  // velocity 3.0 → 12 spins, 5500ms
  const clampedVelocity = Math.max(0.3, Math.min(3.0, swipeVelocity));
  const fullSpins = Math.floor(3 + (clampedVelocity - 0.3) * (9 / 2.7));
  const duration = 2800 + (clampedVelocity - 0.3) * (2700 / 2.7);

  const totalRotation = fullSpins * 2 * Math.PI + landAngle;

  return { totalRotation, duration };
}

/**
 * Calculate spin animation from the wheel's current momentum state.
 * Used when the player has been dragging/flicking and the server result arrives.
 * Computes a target rotation and duration that starts from the current position
 * and lands on the target segment with natural deceleration.
 */
export function calculateSpinFromMomentum(
  resultIndex: number,
  currentRotation: number,
  currentVelocity: number,
  minExtraSpins: number = 3
): { targetRotation: number; duration: number } {
  const segmentCount = WHEEL_SEGMENTS.length;
  const arc = (2 * Math.PI) / segmentCount;

  // Target angle where the pointer (top, -PI/2) aligns with segment center
  let landAngle = -(resultIndex * arc + arc / 2) - Math.PI / 2;
  landAngle = ((landAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Normalize current rotation to [0, 2PI)
  const normalizedCurrent = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // How far we need to go from current position to land angle (forward direction)
  let forwardDelta = landAngle - normalizedCurrent;
  if (forwardDelta < 0) forwardDelta += 2 * Math.PI;

  // Determine spin direction from velocity (positive = clockwise in canvas)
  const direction = currentVelocity >= 0 ? 1 : -1;

  // Use forward delta for forward spin, backward delta for backward spin
  const effectiveDelta = direction >= 0
    ? forwardDelta
    : (2 * Math.PI - forwardDelta) % (2 * Math.PI);

  // Add minimum extra full spins to ensure visual satisfaction
  const absVelocity = Math.abs(currentVelocity);
  const extraSpins = Math.max(minExtraSpins, Math.floor(absVelocity * 800));
  const totalDelta = direction * (extraSpins * 2 * Math.PI + effectiveDelta);

  const targetRotation = currentRotation + totalDelta;

  // Duration proportional to distance, clamped 2-5 seconds
  const duration = Math.min(5000, Math.max(2000, Math.abs(totalDelta) * 200));

  return { targetRotation, duration };
}
