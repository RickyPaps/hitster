'use client';

import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ScreenShakeProps {
  trigger: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

const shakeKeyframes = {
  light: [0, -4, 4, -3, 3, -1, 1, 0],
  medium: [0, -8, 8, -6, 6, -3, 3, 0],
  heavy: [0, -12, 12, -10, 10, -6, 6, -2, 2, 0],
};

const shakeDurations = {
  light: 0.35,
  medium: 0.5,
  heavy: 0.65,
};

export default function ScreenShake({ trigger, intensity = 'medium', children }: ScreenShakeProps) {
  const controls = useAnimation();

  useEffect(() => {
    if (trigger) {
      controls.start({
        x: shakeKeyframes[intensity],
        transition: { duration: shakeDurations[intensity], ease: 'easeInOut' },
      });
    }
  }, [trigger, intensity, controls]);

  return (
    <motion.div animate={controls}>
      {children}
    </motion.div>
  );
}
