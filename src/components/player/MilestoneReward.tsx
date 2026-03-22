'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Player, BingoCell, MilestoneType } from '@/types/game';
import { ShieldIcon, SparkleIcon, StreakFlame, LightningBolt } from '@/components/animations/SVGIcons';

interface MilestoneConfig {
  title: string;
  description: string;
  buttonLabel: string;
  color: string;
  colorRgb: string;
  icon: React.ReactNode;
  needsTarget: boolean;
  needsOwnCell: boolean;
  autoApplied: boolean;
}

const MILESTONE_CONFIG: Record<MilestoneType, MilestoneConfig> = {
  streakSaver250: {
    title: 'Streak Saver!',
    description: 'Your next wrong answer won\'t break your streak!',
    buttonLabel: 'Got it!',
    color: '#4d9fff',
    colorRgb: '77, 159, 255',
    icon: <ShieldIcon size={32} color="#4d9fff" />,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
  drinks500: {
    title: 'Milestone: 500 pts!',
    description: 'Assign a drink to another player!',
    buttonLabel: 'Assign Drink',
    color: '#EAB308',
    colorRgb: '234, 179, 8',
    icon: <span className="text-3xl">{'\u{1F37B}'}</span>,
    needsTarget: true,
    needsOwnCell: false,
    autoApplied: false,
  },
  bonusRound750: {
    title: 'Bonus Round!',
    description: 'Earn 1.5x points for the next 2 rounds!',
    buttonLabel: 'Got it!',
    color: '#33ff77',
    colorRgb: '51, 255, 119',
    icon: <LightningBolt size={32} color="#33ff77" />,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
  hint1000: {
    title: 'Hint Unlocked!',
    description: 'You\'ll see the first letter of the next answer!',
    buttonLabel: 'Got it!',
    color: '#00f2ff',
    colorRgb: '0, 242, 255',
    icon: <span className="text-3xl">{'\u{1F50D}'}</span>,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: false,
  },
  pointSurge1500: {
    title: 'Point Surge!',
    description: '+50 bonus points per correct answer for 3 rounds!',
    buttonLabel: 'Got it!',
    color: '#ff8833',
    colorRgb: '255, 136, 51',
    icon: <LightningBolt size={32} color="#ff8833" />,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
  jackpot2000: {
    title: 'JACKPOT!',
    description: 'You just earned 300 bonus points!',
    buttonLabel: 'Got it!',
    color: '#EAB308',
    colorRgb: '234, 179, 8',
    icon: <span className="text-3xl">{'\u{1F4B0}'}</span>,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
  streak3FreeMark: {
    title: '3-Streak Reward!',
    description: 'Mark any unmarked cell on your card!',
    buttonLabel: 'Pick Cell',
    color: '#d946ef',
    colorRgb: '217, 70, 239',
    icon: <SparkleIcon size={32} color="#d946ef" />,
    needsTarget: false,
    needsOwnCell: true,
    autoApplied: false,
  },
  streak5AllDrink: {
    title: '5-Streak Domination!',
    description: 'All other players take a drink!',
    buttonLabel: 'Got it!',
    color: '#EAB308',
    colorRgb: '234, 179, 8',
    icon: <StreakFlame size={32} color="#EAB308" />,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
};

interface MilestoneRewardProps {
  milestone: { type: MilestoneType } | null;
  players: Player[];
  myPlayerId: string;
  myBingoCard: BingoCell[];
  onDismiss: () => void;
}

type Step = 'announce' | 'selectPlayer' | 'selectOwnCell';

export default function MilestoneReward({ milestone, players, myPlayerId, myBingoCard, onDismiss }: MilestoneRewardProps) {
  const [step, setStep] = useState<Step>('announce');
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset step when milestone changes
  useEffect(() => {
    setStep('announce');
  }, [milestone?.type]);

  // Entrance animation
  useEffect(() => {
    if (!milestone) return;
    const el = overlayRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [milestone?.type]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!milestone) return;
    const el = modalRef.current;
    if (!el) return;

    // Focus first focusable element
    const focusFirst = () => {
      const focusable = el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
      focusable[0]?.focus();
    };
    // Small delay to let animation render
    const t = setTimeout(focusFirst, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = el.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [milestone, step, onDismiss]);

  const handleAnnounceAction = useCallback(() => {
    if (!milestone) return;
    const config = MILESTONE_CONFIG[milestone.type];
    if (config.autoApplied) {
      onDismiss();
    } else if (config.needsTarget) {
      setStep('selectPlayer');
    } else if (config.needsOwnCell) {
      setStep('selectOwnCell');
    } else {
      // Milestones like hint1000 that just notify — dismiss on acknowledge
      onDismiss();
    }
  }, [milestone?.type, onDismiss]);

  if (!milestone) return null;

  const config = MILESTONE_CONFIG[milestone.type];
  const otherPlayers = players.filter((p) => p.id !== myPlayerId && p.connected);

  const handlePlayerSelect = (player: Player) => {
    const socket = getSocket();
    switch (milestone.type) {
      case 'drinks500':
        socket.emit(SOCKET_EVENTS.MILESTONE_USE_DRINKS, { targetPlayerId: player.id });
        onDismiss();
        return;
    }
  };

  const handleOwnCellSelect = (cellIndex: number) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.MILESTONE_USE_FREE_MARK, { cellIndex });
    onDismiss();
  };

  return (
    <div
      ref={overlayRef}
      key={milestone.type}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
    >
      <div
        ref={modalRef}
        className="max-w-sm w-full rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, rgba(${config.colorRgb}, 0.2), rgba(20, 12, 50, 0.95))`,
          border: `2px solid rgba(${config.colorRgb}, 0.6)`,
          boxShadow: `0 0 30px rgba(${config.colorRgb}, 0.3)`,
        }}
      >
        {step === 'announce' && (
          <AutoDismissAnnounce
            config={config}
            autoDismiss={config.autoApplied}
            onAction={handleAnnounceAction}
            onSkip={onDismiss}
          />
        )}

        {step === 'selectPlayer' && (
          <div>
            <h3
              className="text-sm font-black uppercase tracking-wider text-center mb-3"
              style={{ color: config.color }}
            >
              Who gets the drink?
            </h3>
            <div className="flex flex-col gap-2">
              {otherPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlayerSelect(p)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white text-left cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('announce')}
              className="mt-3 text-sm font-medium cursor-pointer w-full text-center"
              style={{ color: 'rgba(148, 163, 184, 0.6)' }}
            >
              Back
            </button>
          </div>
        )}

        {step === 'selectOwnCell' && (
          <div>
            <h3
              className="text-sm font-black uppercase tracking-wider text-center mb-1"
              style={{ color: config.color }}
            >
              Pick a cell to mark
            </h3>
            <p className="text-xs text-center mb-3" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
              Tap an unmarked cell to mark it for free
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
              {myBingoCard.map((cell: BingoCell, i: number) => (
                <button
                  key={i}
                  onClick={() => !cell.marked && handleOwnCellSelect(i)}
                  disabled={cell.marked}
                  className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  style={{
                    background: cell.marked
                      ? 'rgba(30, 20, 60, 0.4)'
                      : 'linear-gradient(135deg, rgba(217, 70, 239, 0.3), rgba(139, 92, 246, 0.3))',
                    border: cell.marked
                      ? '1px solid rgba(100, 80, 140, 0.2)'
                      : `2px solid rgba(${config.colorRgb}, 0.8)`,
                  }}
                >
                  {cell.category === 'year-approx' ? 'Y\u00B11' : cell.category.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('announce')}
              className="mt-3 text-sm font-medium cursor-pointer w-full text-center"
              style={{ color: 'rgba(148, 163, 184, 0.6)' }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AutoDismissAnnounce({
  config,
  onAction,
  onSkip,
}: {
  config: MilestoneConfig;
  autoDismiss: boolean;
  onAction: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">{config.icon}</div>
      <h3
        id="milestone-title"
        className="text-xl font-black uppercase mb-1"
        style={{
          color: config.color,
          textShadow: `0 0 12px rgba(${config.colorRgb}, 0.5)`,
        }}
      >
        {config.title}
      </h3>
      <p className="text-sm mb-5" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
        {config.description}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onAction}
          className="py-2.5 px-6 rounded-xl font-bold text-white cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
            boxShadow: `0 0 12px rgba(${config.colorRgb}, 0.4)`,
          }}
        >
          {config.buttonLabel}
        </button>
        {!config.autoApplied && (
          <button
            onClick={onSkip}
            className="py-2.5 px-4 rounded-xl font-semibold cursor-pointer"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(148, 163, 184, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
