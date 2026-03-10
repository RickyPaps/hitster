'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Player, BingoCell, MilestoneType } from '@/types/game';
import { ShieldIcon, SwapIcon, DoublePtsIcon, StealIcon, SparkleIcon, StreakFlame } from '@/components/animations/SVGIcons';

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
  shield250: {
    title: 'Shield Activated!',
    description: 'You\'re immune to your next drink penalty!',
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
  swap750: {
    title: 'Bingo Swap!',
    description: 'Swap a bingo cell — you gain a mark, they lose one!',
    buttonLabel: 'Pick Target',
    color: '#33ff77',
    colorRgb: '51, 255, 119',
    icon: <SwapIcon size={32} color="#33ff77" />,
    needsTarget: true,
    needsOwnCell: false,
    autoApplied: false,
  },
  block1000: {
    title: 'Milestone: 1000 pts!',
    description: 'Block a cell on another player\'s bingo card!',
    buttonLabel: 'Block Cell',
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    icon: <span className="text-3xl">{'\u{1F6E1}'}</span>,
    needsTarget: true,
    needsOwnCell: false,
    autoApplied: false,
  },
  doublePts1500: {
    title: 'Double Down!',
    description: 'Your next correct answer earns 2x points!',
    buttonLabel: 'Got it!',
    color: '#ff8833',
    colorRgb: '255, 136, 51',
    icon: <DoublePtsIcon size={32} color="#ff8833" />,
    needsTarget: false,
    needsOwnCell: false,
    autoApplied: true,
  },
  steal2000: {
    title: 'Point Heist!',
    description: 'Steal 200 points from any opponent!',
    buttonLabel: 'Pick Target',
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    icon: <StealIcon size={32} color="#ef4444" />,
    needsTarget: true,
    needsOwnCell: false,
    autoApplied: false,
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

type Step = 'announce' | 'selectPlayer' | 'selectCell' | 'selectOwnCell';

export default function MilestoneReward({ milestone, players, myPlayerId, myBingoCard, onDismiss }: MilestoneRewardProps) {
  const [step, setStep] = useState<Step>('announce');
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);

  // Reset step when milestone changes
  useEffect(() => {
    setStep('announce');
    setTargetPlayer(null);
  }, [milestone?.type]);

  const handleAnnounceAction = useCallback(() => {
    if (!milestone) return;
    const config = MILESTONE_CONFIG[milestone.type];
    if (config.autoApplied) {
      onDismiss();
    } else if (config.needsTarget) {
      setStep('selectPlayer');
    } else if (config.needsOwnCell) {
      setStep('selectOwnCell');
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
      case 'swap750':
        socket.emit(SOCKET_EVENTS.MILESTONE_USE_SWAP, { targetPlayerId: player.id });
        onDismiss();
        return;
      case 'steal2000':
        socket.emit(SOCKET_EVENTS.MILESTONE_USE_STEAL, { targetPlayerId: player.id });
        onDismiss();
        return;
      case 'block1000':
        // Need to select a cell next
        setTargetPlayer(player);
        setStep('selectCell');
        return;
    }
  };

  const handleCellSelect = (cellIndex: number) => {
    if (!targetPlayer) return;
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.MILESTONE_USE_BLOCK, {
      targetPlayerId: targetPlayer.id,
      cellIndex,
    });
    onDismiss();
  };

  const handleOwnCellSelect = (cellIndex: number) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.MILESTONE_USE_FREE_MARK, { cellIndex });
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={milestone.type}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        className="fixed top-0 left-0 right-0 z-[60] p-4"
      >
        <div
          className="max-w-sm mx-auto rounded-2xl p-5"
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
                {milestone.type === 'drinks500' ? 'Who gets the drink?' :
                  milestone.type === 'swap750' ? 'Whose cell to swap?' :
                  milestone.type === 'steal2000' ? 'Who to steal from?' :
                  'Whose card to block?'}
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
                    {milestone.type === 'steal2000' && (
                      <span className="float-right text-xs opacity-60">{p.score} pts</span>
                    )}
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

          {step === 'selectCell' && targetPlayer && (
            <div>
              <h3
                className="text-sm font-black uppercase tracking-wider text-center mb-1"
                style={{ color: config.color }}
              >
                Block a cell on {targetPlayer.name}&apos;s card
              </h3>
              <p className="text-xs text-center mb-3" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                Tap a marked cell to unmark it
              </p>
              <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                {targetPlayer.bingoCard.map((cell: BingoCell, i: number) => (
                  <button
                    key={i}
                    onClick={() => cell.marked && handleCellSelect(i)}
                    disabled={!cell.marked}
                    className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold uppercase cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                    style={{
                      background: cell.marked
                        ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.5), rgba(139, 92, 246, 0.5))'
                        : 'rgba(30, 20, 60, 0.8)',
                      border: cell.marked
                        ? '2px solid rgba(239, 68, 68, 0.8)'
                        : '1px solid rgba(100, 80, 140, 0.2)',
                    }}
                  >
                    {cell.category === 'year-approx' ? 'Y\u00B11' : cell.category.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setStep('selectPlayer'); setTargetPlayer(null); }}
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
      </motion.div>
    </AnimatePresence>
  );
}

function AutoDismissAnnounce({
  config,
  autoDismiss,
  onAction,
  onSkip,
}: {
  config: MilestoneConfig;
  autoDismiss: boolean;
  onAction: () => void;
  onSkip: () => void;
}) {
  useEffect(() => {
    if (autoDismiss) {
      const t = setTimeout(onAction, 3000);
      return () => clearTimeout(t);
    }
  }, [autoDismiss, onAction]);

  return (
    <div className="text-center">
      <div className="flex justify-center mb-2">{config.icon}</div>
      <h3
        className="text-xl font-black uppercase mb-1"
        style={{
          color: config.color,
          textShadow: `0 0 12px rgba(${config.colorRgb}, 0.5)`,
        }}
      >
        {config.title}
      </h3>
      <p className="text-sm mb-4" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
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
        {!autoDismiss && (
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
