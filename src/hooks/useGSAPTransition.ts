'use client';

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

export interface PhaseTransitionConfig {
  /** Exit animation for the outgoing phase content */
  exit?: gsap.TweenVars;
  /** Enter animation starting state */
  enterFrom?: gsap.TweenVars;
  /** Enter animation ending state */
  enterTo?: gsap.TweenVars;
  /** Duration of exit animation */
  exitDuration?: number;
  /** Duration of enter animation */
  enterDuration?: number;
  /** Custom timeline builder for complex transitions */
  onEnter?: (el: HTMLElement, tl: gsap.core.Timeline) => void;
  /** Custom timeline builder for exit */
  onExit?: (el: HTMLElement, tl: gsap.core.Timeline) => void;
}

const DEFAULT_EXIT: gsap.TweenVars = { opacity: 0, scale: 0.95 };
const DEFAULT_ENTER_FROM: gsap.TweenVars = { opacity: 0, scale: 0.98 };
const DEFAULT_ENTER_TO: gsap.TweenVars = { opacity: 1, scale: 1 };

/**
 * Hook that manages phase transitions with GSAP.
 * Uses a two-layer approach: current content animates out, new content animates in.
 *
 * Attach `containerRef` to the wrapper div. The hook will animate its children
 * when `phase` changes.
 */
export function useGSAPPhaseTransition<P extends string>(
  phase: P,
  configs?: Partial<Record<string, PhaseTransitionConfig>>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef<P>(phase);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // First render — just do enter animation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        gsap.set(el, { opacity: 1, scale: 1 });
        return;
      }
      const config = configs?.[phase];
      const enterFrom = config?.enterFrom ?? DEFAULT_ENTER_FROM;
      const enterTo = config?.enterTo ?? DEFAULT_ENTER_TO;
      const enterDuration = config?.enterDuration ?? 0.4;

      if (config?.onEnter) {
        const tl = gsap.timeline();
        config.onEnter(el, tl);
        tlRef.current = tl;
      } else {
        gsap.fromTo(el, enterFrom, {
          ...enterTo,
          duration: enterDuration,
          ease: 'power2.out',
        });
      }
      return;
    }

    // Phase changed
    if (phase === prevPhaseRef.current) return;
    const oldPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // Kill any running transition
    if (tlRef.current) tlRef.current.kill();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(el, { opacity: 1, scale: 1, x: 0, y: 0 });
      return;
    }

    const exitConfig = configs?.[oldPhase];
    const enterConfig = configs?.[phase];

    const tl = gsap.timeline();
    tlRef.current = tl;

    // Exit animation
    const exitVars = exitConfig?.exit ?? DEFAULT_EXIT;
    const exitDuration = exitConfig?.exitDuration ?? 0.25;

    if (exitConfig?.onExit) {
      exitConfig.onExit(el, tl);
    } else {
      tl.to(el, {
        ...exitVars,
        duration: exitDuration,
        ease: 'power2.in',
      });
    }

    // Enter animation (after exit completes, React re-renders with new content)
    const enterFrom = enterConfig?.enterFrom ?? DEFAULT_ENTER_FROM;
    const enterTo = enterConfig?.enterTo ?? DEFAULT_ENTER_TO;
    const enterDuration = enterConfig?.enterDuration ?? 0.4;

    if (enterConfig?.onEnter) {
      tl.call(() => {
        // Small delay to let React re-render
        requestAnimationFrame(() => {
          const enterTl = gsap.timeline();
          enterConfig.onEnter!(el, enterTl);
        });
      });
    } else {
      tl.fromTo(el, enterFrom, {
        ...enterTo,
        duration: enterDuration,
        ease: 'power2.out',
      });
    }

    return () => {
      if (tlRef.current) tlRef.current.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  return containerRef;
}

/**
 * Simpler version: just animate the container on phase change with
 * a quick exit→enter opacity+transform cycle.
 * Good for sub-phase content swaps (like CenterContent in HostGameShell).
 */
export function useGSAPCrossfade(phase: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef(phase);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prevPhaseRef.current === phase) {
      // First render
      gsap.fromTo(el,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );
      return;
    }

    prevPhaseRef.current = phase;
    if (tlRef.current) tlRef.current.kill();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const tl = gsap.timeline();
    tlRef.current = tl;

    tl.to(el, { opacity: 0, y: -15, duration: 0.2, ease: 'power2.in' })
      .fromTo(el,
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );

    return () => { if (tlRef.current) tlRef.current.kill(); };
  }, [phase]);

  useEffect(() => {
    return () => { if (tlRef.current) tlRef.current.kill(); };
  }, []);

  return containerRef;
}

/**
 * Staggered children entrance — animate direct children of a container.
 * Replaces framer-motion staggerChildren pattern.
 */
export function useGSAPStagger<T extends HTMLElement = HTMLDivElement>(
  config: {
    from?: gsap.TweenVars;
    to?: gsap.TweenVars;
    stagger?: number;
    duration?: number;
    ease?: string;
    enabled?: boolean;
    childSelector?: string;
  } = {},
  deps: React.DependencyList = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || config.enabled === false) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const children = config.childSelector
      ? el.querySelectorAll(config.childSelector)
      : el.children;

    if (children.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(children,
        config.from ?? { opacity: 0, y: 20 },
        {
          ...(config.to ?? { opacity: 1, y: 0 }),
          duration: config.duration ?? 0.4,
          stagger: config.stagger ?? 0.08,
          ease: config.ease ?? 'power2.out',
        }
      );
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
