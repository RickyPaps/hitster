'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const TILE_COLORS = ['#ff2d95', '#bc13fe', '#00f2ff', '#ff6bcb', '#f59e0b', '#22c55e'];
const FLOOR_COLS = 12;
const FLOOR_ROWS = 8;
const FLOOR_COLS_MOBILE = 8;
const FLOOR_ROWS_MOBILE = 6;

const SPOTLIGHT_CONFIGS = [
  { color: '#bc13fe', left: '15%', rotation: -15, targetRotation: 15 },
  { color: '#00f2ff', left: '40%', rotation: 10, targetRotation: -10 },
  { color: '#ff2d95', left: '65%', rotation: -8, targetRotation: 12 },
  { color: '#fffbe6', left: '85%', rotation: 5, targetRotation: -15 },
];

const PARTICLE_COUNT = 60;
const PARTICLE_COUNT_MOBILE = 30;

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export default function DiscoBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas DPI scaling
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2.5 + 1,
      speed: Math.random() * 0.4 + 0.15,
      opacity: Math.random(),
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    if (reducedMotion.current) {
      // Static single-frame render for reduced motion
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.6})`;
        ctx.fill();
      });
      return () => window.removeEventListener('resize', resizeCanvas);
    }

    // GSAP context for cleanup
    const gsapCtx = gsap.context(() => {
      // Tile color cycling
      const tiles = container.querySelectorAll('.disco-tile');
      tiles.forEach((tile, i) => {
        const randomDelay = Math.random() * 2;
        const randomColor = () => TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
        gsap.to(tile, {
          backgroundColor: randomColor(),
          duration: 0.5 + Math.random() * 0.5,
          delay: randomDelay,
          repeat: -1,
          repeatDelay: 0.3 + Math.random() * 1.2,
          yoyo: true,
          ease: 'power1.inOut',
          onRepeat: function () {
            gsap.set(tile, { backgroundColor: randomColor() });
          },
        });
        // Staggered initial brightness pulse
        gsap.fromTo(
          tile,
          { opacity: 0.3 },
          {
            opacity: 0.85,
            duration: 0.8,
            delay: i * 0.02,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }
        );
      });

      // Spotlight sweeping
      const spotlights = container.querySelectorAll('.disco-spotlight');
      spotlights.forEach((el, i) => {
        const config = SPOTLIGHT_CONFIGS[i];
        gsap.fromTo(
          el,
          { rotation: config.rotation },
          {
            rotation: config.targetRotation,
            duration: 3 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.5,
          }
        );
      });

      // Disco ball rotation
      const ballHighlight = container.querySelector('.disco-ball-highlight');
      if (ballHighlight) {
        gsap.to(ballHighlight, {
          rotation: 360,
          duration: 8,
          repeat: -1,
          ease: 'none',
        });
      }

      // Disco ball reflections
      const reflections = container.querySelectorAll('.disco-reflection');
      reflections.forEach((dot, i) => {
        const angle = (i / reflections.length) * Math.PI * 2;
        const radius = 60 + Math.random() * 30;
        gsap.to(dot, {
          motionPath: {
            path: [
              { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
              { x: Math.cos(angle + Math.PI) * radius, y: Math.sin(angle + Math.PI) * radius },
            ],
          },
          duration: 4 + Math.random() * 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        // Fallback: simple orbit via x/y
        gsap.to(dot, {
          x: Math.cos(angle + Math.PI) * radius,
          y: Math.sin(angle + Math.PI) * radius,
          duration: 4 + Math.random() * 2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3,
        });
        gsap.to(dot, {
          opacity: 0.2,
          duration: 1 + Math.random(),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    }, container);

    // Particle animation via gsap.ticker
    let tickerFrame = 0;
    const animateParticles = () => {
      tickerFrame++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const w = window.innerWidth;
      const h = window.innerHeight;

      particlesRef.current.forEach((p) => {
        p.y -= p.speed;
        p.twinklePhase += p.twinkleSpeed;
        p.opacity = 0.3 + Math.sin(p.twinklePhase) * 0.4;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, p.opacity)})`;
        ctx.fill();
      });
    };
    gsap.ticker.add(animateParticles);

    return () => {
      gsapCtx.revert();
      gsap.ticker.remove(animateParticles);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const isMobileSSR = false; // Grid is always full; CSS hides extra on mobile
  const cols = FLOOR_COLS;
  const rows = FLOOR_ROWS;

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Dark background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #0a0a0f 70%)',
        }}
      />

      {/* Spotlights */}
      {SPOTLIGHT_CONFIGS.map((config, i) => (
        <div
          key={i}
          className="disco-spotlight absolute"
          style={{
            left: config.left,
            top: 0,
            width: '120px',
            height: '110vh',
            background: `linear-gradient(180deg, ${config.color}40 0%, ${config.color}15 30%, transparent 70%)`,
            mixBlendMode: 'screen',
            transformOrigin: 'top center',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Disco ball */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '20px' }}
      >
        {/* Ball body */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #ffffff 0%, #c0c0c0 20%, #808080 50%, #404040 80%, #202020 100%)',
            boxShadow: '0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(184,41,255,0.2)',
            position: 'relative',
          }}
        >
          {/* Rotating highlight */}
          <div
            className="disco-ball-highlight absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.4) 10%, transparent 20%, rgba(255,255,255,0.3) 40%, transparent 50%, rgba(255,255,255,0.5) 60%, transparent 70%, rgba(255,255,255,0.2) 85%, transparent 100%)',
            }}
          />
        </div>
        {/* String */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '-20px',
            width: '1px',
            height: '20px',
            background: 'rgba(255,255,255,0.3)',
          }}
        />
        {/* Reflections */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const radius = 50;
          return (
            <div
              key={i}
              className="disco-reflection absolute"
              style={{
                left: `${Math.round(40 + Math.cos(angle) * radius)}px`,
                top: `${Math.round(40 + Math.sin(angle) * radius)}px`,
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: TILE_COLORS[i % TILE_COLORS.length],
                filter: 'blur(2px)',
                opacity: '0.7',
              }}
            />
          );
        })}
      </div>

      {/* Dance floor */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          perspective: '600px',
          height: '45vh',
        }}
      >
        <div
          style={{
            transform: 'rotateX(65deg)',
            transformOrigin: 'center bottom',
            width: '120%',
            marginLeft: '-10%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: '2px',
            padding: '2px',
          }}
        >
          {Array.from({ length: cols * rows }).map((_, i) => (
            <div
              key={i}
              className="disco-tile hidden sm:block"
              style={{
                backgroundColor: TILE_COLORS[i % TILE_COLORS.length],
                opacity: 0.5,
                borderRadius: '1px',
              }}
            />
          ))}
          {/* Mobile tiles: fewer */}
          {Array.from({ length: FLOOR_COLS_MOBILE * FLOOR_ROWS_MOBILE }).map((_, i) => (
            <div
              key={`m-${i}`}
              className="disco-tile block sm:hidden"
              style={{
                backgroundColor: TILE_COLORS[i % TILE_COLORS.length],
                opacity: 0.5,
                borderRadius: '1px',
                gridColumn: `${(i % FLOOR_COLS_MOBILE) + 1}`,
                gridRow: `${Math.floor(i / FLOOR_COLS_MOBILE) + 1}`,
              }}
            />
          ))}
        </div>
        {/* Floor gradient overlay for fade */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,15,0.8) 0%, transparent 40%, rgba(10,10,15,0.3) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Sparkle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: 'none', zIndex: 1 }}
      />
    </div>
  );
}
