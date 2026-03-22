'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { SHOP_ITEMS } from '@/types/game';
import type { ShopItemId, ShopItemDef, Player, BingoCell } from '@/types/game';

interface ShopProps {
  player: Player;
  players: Player[];
  phase: string;
  bingoCard: BingoCell[];
}

type ShopStep = 'browse' | 'selectTarget' | 'selectCell' | 'confirming' | 'result';

export default function Shop({ player, players, phase, bingoCard }: ShopProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ShopStep>('browse');
  const [selectedItem, setSelectedItem] = useState<ShopItemDef | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [peekData, setPeekData] = useState<{ name: string; nearLines: number }[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  const canPurchase = phase === 'SPINNING' || phase === 'ROUND_RESULTS';

  // Animate panel open/close
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) {
      gsap.fromTo(el,
        { y: '100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [open]);

  // Badge pulse when shop is available
  useEffect(() => {
    const el = badgeRef.current;
    if (!el || !canPurchase) return;
    const ctx = gsap.context(() => {
      gsap.to(el, { scale: 1.1, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    });
    return () => ctx.revert();
  }, [canPurchase, phase]);

  // Listen for shop results
  useEffect(() => {
    const socket = getSocket();

    const resultHandler = (data: { success: boolean; error?: string; item?: string; newScore?: number }) => {
      if (data.success) {
        setResultMsg(`Purchased ${SHOP_ITEMS.find(i => i.id === data.item)?.name ?? data.item}!`);
      } else {
        setResultMsg(data.error ?? 'Purchase failed');
      }
      setStep('result');
      setTimeout(() => {
        setResultMsg(null);
        setStep('browse');
        setSelectedItem(null);
        setSelectedTarget(null);
        setSelectedCell(null);
      }, 1500);
    };

    const peekHandler = (data: { players: { name: string; nearLines: number }[] }) => {
      setPeekData(data.players);
      setResultMsg('Card Peek activated!');
      setStep('result');
      // Auto-dismiss after 5s
      setTimeout(() => {
        setPeekData(null);
        setResultMsg(null);
        setStep('browse');
        setSelectedItem(null);
      }, 5000);
    };

    socket.on(SOCKET_EVENTS.SHOP_PURCHASE_RESULT, resultHandler);
    socket.on(SOCKET_EVENTS.SHOP_PEEK_RESULT, peekHandler);

    return () => {
      socket.off(SOCKET_EVENTS.SHOP_PURCHASE_RESULT, resultHandler);
      socket.off(SOCKET_EVENTS.SHOP_PEEK_RESULT, peekHandler);
    };
  }, []);

  const handleBuy = useCallback((item: ShopItemDef) => {
    if (player.score < item.cost) return;
    const purchased = player.shopState?.purchaseCount?.[item.id] ?? 0;
    if (item.maxPerGame > 0 && purchased >= item.maxPerGame) return;

    setSelectedItem(item);

    if (item.needsTarget) {
      setStep('selectTarget');
    } else if (item.needsOwnCell) {
      setStep('selectCell');
    } else {
      // Direct purchase
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.SHOP_PURCHASE, { itemId: item.id });
      setStep('confirming');
    }
  }, [player]);

  const handleTargetSelect = useCallback((targetId: string) => {
    if (!selectedItem) return;
    setSelectedTarget(targetId);

    // stealCell needs a cell index from target — but server picks randomly
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.SHOP_PURCHASE, {
      itemId: selectedItem.id,
      targetPlayerId: targetId,
    });
    setStep('confirming');
  }, [selectedItem]);

  const handleCellSelect = useCallback((cellIndex: number) => {
    if (!selectedItem) return;
    setSelectedCell(cellIndex);

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.SHOP_PURCHASE, {
      itemId: selectedItem.id,
      cellIndex,
    });
    setStep('confirming');
  }, [selectedItem]);

  const close = () => {
    const el = panelRef.current;
    if (el) {
      gsap.to(el, {
        y: '100%', opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          setOpen(false);
          setStep('browse');
          setSelectedItem(null);
          setSelectedTarget(null);
          setSelectedCell(null);
          setPeekData(null);
          setResultMsg(null);
        },
      });
    } else {
      setOpen(false);
    }
  };

  // Active items display
  const activeItems = player.shopState?.activeItems ?? [];

  const otherPlayers = players.filter(p => p.id !== player.id && p.connected);

  return (
    <>
      {/* Shop button */}
      <button
        ref={badgeRef}
        onClick={() => setOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors"
        style={{
          background: canPurchase ? 'rgba(234, 179, 8, 0.2)' : 'rgba(217, 70, 239, 0.15)',
          border: `1px solid ${canPurchase ? 'rgba(234, 179, 8, 0.4)' : 'rgba(217, 70, 239, 0.25)'}`,
        }}
        title="Shop"
      >
        <span style={{ fontSize: '14px' }}>&#x1F6D2;</span>
      </button>

      {/* Active items badges */}
      {activeItems.length > 0 && (
        <div className="flex gap-1">
          {activeItems.map((itemId, i) => {
            const def = SHOP_ITEMS.find(d => d.id === itemId);
            return def ? (
              <span
                key={`${itemId}-${i}`}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: '10px' }}
                title={def.name}
              >
                {def.icon}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Shop panel overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="relative z-10 rounded-t-2xl overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 15, 60, 0.98), rgba(13, 2, 22, 0.99))',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderBottom: 'none',
              maxHeight: '75vh',
              transform: 'translateY(100%)',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: 'rgba(30, 15, 60, 0.95)', borderBottom: '1px solid rgba(234, 179, 8, 0.15)' }}>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider" style={{ color: '#EAB308', textShadow: '0 0 10px rgba(234, 179, 8, 0.4)' }}>
                  &#x1F6D2; Power Shop
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(234, 179, 8, 0.6)' }}>
                  {canPurchase ? 'Shop is open!' : 'Available between rounds'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: '#00f2ff' }}>{player.score} pts</span>
                <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>&#10005;</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              {/* Browse items */}
              {step === 'browse' && (
                <div className="space-y-2">
                  {SHOP_ITEMS.map(item => {
                    const purchased = player.shopState?.purchaseCount?.[item.id] ?? 0;
                    const atMax = item.maxPerGame > 0 && purchased >= item.maxPerGame;
                    const cantAfford = player.score < item.cost;
                    const disabled = !canPurchase || atMax || cantAfford;

                    return (
                      <button
                        key={item.id}
                        onClick={() => !disabled && handleBuy(item)}
                        disabled={disabled}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all"
                        style={{
                          background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(234, 179, 8, 0.08)',
                          border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(234, 179, 8, 0.25)'}`,
                          opacity: disabled ? 0.5 : 1,
                        }}
                      >
                        <span className="text-2xl shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.name}</span>
                            {atMax && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>MAX</span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>{item.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`text-sm font-black ${cantAfford ? 'text-red-400' : ''}`} style={{ color: cantAfford ? '#ef4444' : '#EAB308' }}>
                            {item.cost}
                          </span>
                          <span className="text-[10px] block" style={{ color: 'rgba(234, 179, 8, 0.5)' }}>pts</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Select target player */}
              {step === 'selectTarget' && selectedItem && (
                <div>
                  <p className="text-sm font-bold mb-3" style={{ color: '#EAB308' }}>
                    {selectedItem.icon} {selectedItem.name} — Pick a target:
                  </p>
                  <div className="space-y-2">
                    {otherPlayers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleTargetSelect(p.id)}
                        className="w-full py-3 px-4 rounded-xl font-semibold text-white text-left cursor-pointer transition-all"
                        style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                      >
                        {p.name}
                        <span className="text-xs ml-2" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                          {p.score} pts
                        </span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setStep('browse'); setSelectedItem(null); }} className="w-full mt-3 py-2 text-sm cursor-pointer" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                    Cancel
                  </button>
                </div>
              )}

              {/* Select own cell */}
              {step === 'selectCell' && selectedItem && (
                <div>
                  <p className="text-sm font-bold mb-3" style={{ color: '#EAB308' }}>
                    {selectedItem.icon} {selectedItem.name} — Pick a cell to mark:
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                    {bingoCard.map((cell, i) => (
                      <button
                        key={i}
                        onClick={() => !cell.marked && handleCellSelect(i)}
                        disabled={cell.marked}
                        className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer"
                        style={{
                          background: cell.marked ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                          border: `1.5px solid ${cell.marked ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                          color: cell.marked ? '#22c55e' : '#EAB308',
                          opacity: cell.marked ? 0.4 : 1,
                        }}
                      >
                        {cell.marked ? '✓' : cell.category.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setStep('browse'); setSelectedItem(null); }} className="w-full mt-3 py-2 text-sm cursor-pointer" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                    Cancel
                  </button>
                </div>
              )}

              {/* Confirming purchase */}
              {step === 'confirming' && (
                <div className="text-center py-8">
                  <p className="text-lg font-bold animate-pulse" style={{ color: '#EAB308' }}>Processing...</p>
                </div>
              )}

              {/* Result */}
              {step === 'result' && (
                <div className="text-center py-6">
                  <p className="text-lg font-bold mb-2" style={{ color: '#EAB308', textShadow: '0 0 10px rgba(234, 179, 8, 0.4)' }}>
                    {resultMsg}
                  </p>
                  {peekData && (
                    <div className="space-y-1.5 mt-3">
                      {peekData.map(p => (
                        <div key={p.name} className="flex items-center justify-between px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <span className="text-sm text-white font-medium">{p.name}</span>
                          <span className="text-xs font-bold" style={{ color: p.nearLines > 0 ? '#ef4444' : '#22c55e' }}>
                            {p.nearLines > 0 ? `${p.nearLines} near-complete line${p.nearLines > 1 ? 's' : ''}` : 'No threats'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
