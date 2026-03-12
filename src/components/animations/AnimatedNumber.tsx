'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({
  value,
  duration = 0.6,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  style,
}: AnimatedNumberProps) {
  const prevRef = useRef(value);
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) {
      setDisplay(format(to));
      return;
    }

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(format(latest)),
    });

    return () => controls.stop();
  }, [value, duration, format]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
