'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

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
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) {
      setDisplay(formatRef.current(to));
      return;
    }

    const obj = { val: from };
    if (tweenRef.current) tweenRef.current.kill();
    tweenRef.current = gsap.to(obj, {
      val: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => setDisplay(formatRef.current(obj.val)),
    });

    return () => { if (tweenRef.current) tweenRef.current.kill(); };
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
