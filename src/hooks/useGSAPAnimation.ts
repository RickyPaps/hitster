'use client';

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

/**
 * Animate an element on mount with GSAP fromTo.
 * Returns a ref to attach to the target element.
 */
export function useGSAPEntrance<T extends HTMLElement = HTMLDivElement>(
  config: {
    from: gsap.TweenVars;
    to: gsap.TweenVars;
    duration?: number;
    delay?: number;
    ease?: string;
    enabled?: boolean;
  },
  deps: React.DependencyList = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (config.enabled === false) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, config.to);
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(el, config.from, {
        ...config.to,
        duration: config.duration ?? 0.4,
        delay: config.delay ?? 0,
        ease: config.ease ?? 'power2.out',
      });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Pulsing animation (replaces motion animate={{ scale: [1, 1.05, 1] }} repeat)
 */
export function useGSAPPulse<T extends HTMLElement = HTMLDivElement>(
  config: {
    scale?: number;
    duration?: number;
    enabled?: boolean;
  } = {}
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || config.enabled === false) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        scale: config.scale ?? 1.05,
        duration: (config.duration ?? 1.5) / 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]);

  return ref;
}

/**
 * Opacity pulse (replaces animate={{ opacity: [0.5, 1, 0.5] }} repeat)
 */
export function useGSAPOpacityPulse<T extends HTMLElement = HTMLDivElement>(
  config: {
    min?: number;
    max?: number;
    duration?: number;
    enabled?: boolean;
  } = {}
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || config.enabled === false) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: config.min ?? 0.5 },
        {
          opacity: config.max ?? 1,
          duration: (config.duration ?? 1.5) / 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        }
      );
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]);

  return ref;
}

/**
 * Shake animation on trigger (replaces ScreenShake component)
 */
export function useGSAPShake<T extends HTMLElement = HTMLDivElement>(
  trigger: boolean,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!trigger) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const amounts = { light: 2, medium: 4, heavy: 8 };
    const amt = amounts[intensity];

    const ctx = gsap.context(() => {
      gsap.to(el, {
        x: amt,
        duration: 0.05,
        yoyo: true,
        repeat: 5,
        ease: 'power1.inOut',
        onComplete: () => { gsap.set(el, { x: 0 }); },
      });
    });
    return () => ctx.revert();
  }, [trigger, intensity]);

  return ref;
}

/**
 * Spring-like entrance (replaces framer-motion spring transitions)
 */
export function useGSAPSpring<T extends HTMLElement = HTMLDivElement>(
  config: {
    from: gsap.TweenVars;
    to: gsap.TweenVars;
    duration?: number;
    delay?: number;
    enabled?: boolean;
  },
  deps: React.DependencyList = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (config.enabled === false) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, config.to);
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(el, config.from, {
        ...config.to,
        duration: config.duration ?? 0.6,
        delay: config.delay ?? 0,
        ease: 'elastic.out(1, 0.5)',
      });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Imperative GSAP animation trigger — returns a play() function
 */
export function useGSAPTimeline() {
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const create = useCallback((config?: gsap.TimelineVars) => {
    if (tlRef.current) tlRef.current.kill();
    tlRef.current = gsap.timeline(config);
    return tlRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  return { create, timeline: tlRef };
}
