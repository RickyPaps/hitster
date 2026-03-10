'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Player, BingoCell } from '@/types/game';

interface MilestoneRewardProps {
  milestone: { type: 'drinks500' | 'block1000' } | null;
  players: Player[];
  myPlayerId: string;
  onDismiss: () => void;
}

type Step = 'announce' | 'selectPlayer' | 'selectCell';

export default function MilestoneReward({ milestone, players, myPlayerId, onDismiss }: MilestoneRewardProps) {
  const [step, setStep] = useState<Step>('announce');
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);

  if (!milestone) return null;

  const isDrinks = milestone.type === 'drinks500';
  const otherPlayers = players.filter((p) => p.id !== myPlayerId && p.connected);

  const handlePlayerSelect = (player: Player) => {
    if (isDrinks) {
      // Assign drink immediately
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.MILESTONE_USE_DRINKS, { targetPlayerId: player.id });
      onDismiss();
    } else {
      // Need to select a cell next
      setTargetPlayer(player);
      setStep('selectCell');
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <div
          className="max-w-sm mx-auto rounded-2xl p-5"
          style={{
            background: isDrinks
              ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(20, 12, 50, 0.95))'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(20, 12, 50, 0.95))',
            border: `2px solid ${isDrinks ? 'rgba(234, 179, 8, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
            boxShadow: isDrinks
              ? '0 0 30px rgba(234, 179, 8, 0.3)'
              : '0 0 30px rgba(239, 68, 68, 0.3)',
          }}
        >
          {step === 'announce' && (
            <div className="text-center">
              <p className="text-3xl mb-2">{isDrinks ? '\u{1F37B}' : '\u{1F6E1}'}</p>
              <h3
                className="text-xl font-black uppercase mb-1"
                style={{
                  color: isDrinks ? '#EAB308' : '#ef4444',
                  textShadow: isDrinks
                    ? '0 0 12px rgba(234, 179, 8, 0.5)'
                    : '0 0 12px rgba(239, 68, 68, 0.5)',
                }}
              >
                {isDrinks ? 'Milestone: 500 pts!' : 'Milestone: 1000 pts!'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                {isDrinks
                  ? 'Assign a drink to another player!'
                  : 'Block a cell on another player\'s bingo card!'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('selectPlayer')}
                  className="py-2.5 px-6 rounded-xl font-bold text-white cursor-pointer"
                  style={{
                    background: isDrinks
                      ? 'linear-gradient(135deg, #EAB308, #d97706)'
                      : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: isDrinks
                      ? '0 0 12px rgba(234, 179, 8, 0.4)'
                      : '0 0 12px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {isDrinks ? 'Assign Drink' : 'Block Cell'}
                </button>
                <button
                  onClick={onDismiss}
                  className="py-2.5 px-4 rounded-xl font-semibold cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(148, 163, 184, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'selectPlayer' && (
            <div>
              <h3
                className="text-sm font-black uppercase tracking-wider text-center mb-3"
                style={{ color: isDrinks ? '#EAB308' : '#ef4444' }}
              >
                {isDrinks ? 'Who gets the drink?' : 'Whose card to block?'}
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

          {step === 'selectCell' && targetPlayer && (
            <div>
              <h3
                className="text-sm font-black uppercase tracking-wider text-center mb-1"
                style={{ color: '#ef4444' }}
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
