'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Shield, Sparkles } from 'lucide-react';
import {
  calculateLevelFromXp,
  MAX_COIN_CAPACITY,
  MAX_PLAYER_LEVEL,
} from '@/src/lib/game-rules';

interface ProgressionHudProps {
  xp: number;
  level?: number;
  coins: number;
  shieldCards?: number;
  shieldCardArmed?: boolean;
  onOpenShopChests?: () => void;
  onOpenInventoryConsumables?: () => void;
}

export function CustomArcadeCoinSvg({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="hlaCoinFace" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
        <linearGradient id="hlaCoinRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      {/* Outer notched coin rim */}
      <circle
        cx="18"
        cy="18"
        r="16"
        fill="url(#hlaCoinFace)"
        stroke="url(#hlaCoinRim)"
        strokeWidth="2.5"
      />
      {/* Inner engraved dashed ring */}
      <circle
        cx="18"
        cy="18"
        r="12.2"
        stroke="#78350F"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeDasharray="2.5 2"
      />
      {/* Arcade star-heart center emblem */}
      <path
        d="M18 9.5L20.1 14.6L25.5 15.1L21.4 18.7L22.6 24L18 21.2L13.4 24L14.6 18.7L10.5 15.1L15.9 14.6L18 9.5Z"
        fill="#FFFBEB"
        stroke="#92400E"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Top specular highlight */}
      <path
        d="M9 11.5C11.2 8.2 14.8 6.5 18.8 6.5"
        stroke="#FEF9C3"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function ProgressionHud({
  xp,
  coins,
  shieldCards = 0,
  shieldCardArmed = false,
  onOpenShopChests,
  onOpenInventoryConsumables,
}: ProgressionHudProps) {
  const levelInfo = calculateLevelFromXp(xp);
  const safeCoins = Math.max(0, Math.min(MAX_COIN_CAPACITY, Math.floor(Number(coins) || 0)));
  const coinPercentRaw = (safeCoins / MAX_COIN_CAPACITY) * 100;
  const coinPercentDisplay =
    safeCoins === 0
      ? '0%'
      : coinPercentRaw < 0.01
      ? '<0.01%'
      : coinPercentRaw < 1
      ? `${coinPercentRaw.toFixed(2)}%`
      : `${Math.min(100, Math.round(coinPercentRaw * 10) / 10)}%`;

  const xpBarRef = useRef<HTMLDivElement | null>(null);
  const coinBarRef = useRef<HTMLDivElement | null>(null);
  const levelBadgeRef = useRef<HTMLDivElement | null>(null);
  const coinCardRef = useRef<HTMLDivElement | null>(null);

  const prevLevelRef = useRef<number>(levelInfo.level);
  const prevCoinsRef = useRef<number>(safeCoins);
  const [levelUpBanner, setLevelUpBanner] = useState<number | null>(null);
  const [coinDeltaPop, setCoinDeltaPop] = useState<number | null>(null);

  useEffect(() => {
    if (xpBarRef.current) {
      gsap.to(xpBarRef.current, {
        width: `${levelInfo.isMaxLevel ? 100 : levelInfo.progressPercent}%`,
        duration: 0.65,
        ease: 'power3.out',
      });
    }
  }, [levelInfo.progressPercent, levelInfo.isMaxLevel]);

  useEffect(() => {
    if (coinBarRef.current) {
      const visualWidth =
        safeCoins > 0 ? Math.max(2, Math.min(100, coinPercentRaw)) : 0;
      gsap.to(coinBarRef.current, {
        width: `${visualWidth}%`,
        duration: 0.65,
        ease: 'power3.out',
      });
    }
  }, [safeCoins, coinPercentRaw]);

  useEffect(() => {
    if (levelInfo.level > prevLevelRef.current) {
      setLevelUpBanner(levelInfo.level);
      if (levelBadgeRef.current) {
        gsap.fromTo(
          levelBadgeRef.current,
          { scale: 1 },
          {
            scale: 1.14,
            duration: 0.26,
            yoyo: true,
            repeat: 3,
            ease: 'power2.out',
          }
        );
      }
      const timer = setTimeout(() => setLevelUpBanner(null), 3800);
      prevLevelRef.current = levelInfo.level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = levelInfo.level;
  }, [levelInfo.level]);

  useEffect(() => {
    const delta = safeCoins - prevCoinsRef.current;
    if (delta !== 0) {
      setCoinDeltaPop(delta);
      if (coinCardRef.current) {
        gsap.fromTo(
          coinCardRef.current,
          { scale: 1 },
          {
            scale: 1.03,
            duration: 0.18,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
          }
        );
      }
      const timer = setTimeout(() => setCoinDeltaPop(null), 2600);
      prevCoinsRef.current = safeCoins;
      return () => clearTimeout(timer);
    }
    prevCoinsRef.current = safeCoins;
  }, [safeCoins]);

  return (
    <div
      className="w-full border-b border-stone-800/90 bg-stone-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5"
      role="region"
      aria-label="Player Progression and Coin Capacity HUD"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-4 items-center">
        {/* TOP-LEFT: PLAYER LEVEL & HORIZONTAL XP PROGRESSION BAR */}
        <div
          ref={levelBadgeRef}
          className="flex flex-col gap-1 rounded-xl border border-stone-800/90 bg-stone-900/80 px-3.5 py-2 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                LEVEL {levelInfo.level}
              </span>
              {levelInfo.isMaxLevel ? (
                <span className="text-[11px] font-bold text-amber-300">
                  Maximum Level ({MAX_PLAYER_LEVEL}) Achieved
                </span>
              ) : (
                <span className="text-[11px] font-medium text-stone-400">
                  XP progression to Level {Math.min(MAX_PLAYER_LEVEL, levelInfo.level + 1)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {levelUpBanner && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 px-2 py-0.5 text-[10px] font-bold text-emerald-200 animate-pulse">
                  LEVEL UP! LVL {levelUpBanner}
                </span>
              )}
              {onOpenInventoryConsumables && (
                <button
                  type="button"
                  onClick={onOpenInventoryConsumables}
                  title={
                    shieldCardArmed
                      ? 'Ranked Shield Card armed for your next 2v2 match'
                      : `Ranked Shield Cards owned: ${shieldCards}`
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    shieldCardArmed
                      ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                      : shieldCards > 0
                      ? 'border-stone-700 bg-stone-800/90 text-stone-300 hover:border-sky-400/50'
                      : 'border-stone-800 bg-stone-900/60 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <Shield className="w-3 h-3 text-sky-400" />
                  {shieldCardArmed
                    ? `Shield Armed (${shieldCards})`
                    : `Shields: ${shieldCards}`}
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Landscape XP Bar with Centered XP Text */}
          <div className="relative h-6 w-full overflow-hidden rounded-lg border border-stone-700/90 bg-stone-950 shadow-inner">
            <div
              ref={xpBarRef}
              style={{
                width: `${levelInfo.isMaxLevel ? 100 : levelInfo.progressPercent}%`,
              }}
              className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all"
            />
            {/* Subtle segmented ruler ticks */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent, transparent 19%, rgba(255,255,255,0.35) 19%, rgba(255,255,255,0.35) 20%)',
              }}
            />
            {/* Strictly centered XP text */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2">
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {levelInfo.isMaxLevel
                  ? 'MAX LEVEL'
                  : `${levelInfo.currentLevelXp.toLocaleString()} / ${levelInfo.nextLevelXp.toLocaleString()} XP`}
              </span>
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: CUSTOM COIN ICON & HORIZONTAL COIN CAPACITY BAR */}
        <div
          ref={coinCardRef}
          className="flex flex-col gap-1 rounded-xl border border-stone-800/90 bg-stone-900/80 px-3.5 py-2 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CustomArcadeCoinSvg className="w-5 h-5 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                ARCADE COINS
              </span>
              {coinDeltaPop !== null && (
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    coinDeltaPop > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                  }`}
                >
                  {coinDeltaPop > 0
                    ? `+${coinDeltaPop.toLocaleString()}`
                    : coinDeltaPop.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-stone-400">
                {coinPercentDisplay} of coin capacity
              </span>
              {safeCoins >= MAX_COIN_CAPACITY && (
                <span className="rounded bg-amber-500/20 border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                  CAPACITY FULL
                </span>
              )}
              {onOpenShopChests && (
                <button
                  type="button"
                  onClick={onOpenShopChests}
                  className="hidden sm:inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors"
                >
                  Spend in Shop
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Landscape Coin Capacity Bar with Centered Balance / 5,000,000 Text */}
          <div className="relative h-6 w-full overflow-hidden rounded-lg border border-stone-700/90 bg-stone-950 shadow-inner">
            <div
              ref={coinBarRef}
              style={{
                width: `${
                  safeCoins > 0 ? Math.max(2, Math.min(100, coinPercentRaw)) : 0
                }%`,
              }}
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all"
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent, transparent 19%, rgba(255,255,255,0.35) 19%, rgba(255,255,255,0.35) 20%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2">
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {safeCoins.toLocaleString()} / {MAX_COIN_CAPACITY.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
