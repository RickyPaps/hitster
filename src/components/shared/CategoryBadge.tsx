'use client';

import { motion } from 'framer-motion';
import { ALL_WHEEL_SEGMENTS } from '@/types/game';

interface CategoryBadgeProps {
  category: string;
  large?: boolean;
}

export default function CategoryBadge({ category, large }: CategoryBadgeProps) {
  const segment = ALL_WHEEL_SEGMENTS.find((s) => s.category === category);
  if (!segment) return null;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25, duration: 0.3 }}
      className={`inline-block rounded-full font-bold ${large ? 'px-6 py-2 text-xl' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: segment.color, color: '#fff' }}
    >
      {segment.label}
    </motion.span>
  );
}
