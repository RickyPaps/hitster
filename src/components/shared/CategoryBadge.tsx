'use client';

import { ALL_WHEEL_SEGMENTS } from '@/types/game';

interface CategoryBadgeProps {
  category: string;
  large?: boolean;
}

export default function CategoryBadge({ category, large }: CategoryBadgeProps) {
  const segment = ALL_WHEEL_SEGMENTS.find((s) => s.category === category);
  if (!segment) return null;

  return (
    <span
      className={`inline-block rounded-full font-bold ${large ? 'px-6 py-2 text-xl' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: segment.color, color: '#fff' }}
    >
      {segment.label}
    </span>
  );
}
