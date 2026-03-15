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
  const formatRef = useRef(format);
  formatRef.current = format;
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const fmt = formatRef.current;
    prevRef.current = value;

    if (from === to) {
      setDisplay(fmt(to));
      return;
    }

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(formatRef.current(latest)),
    });

    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
