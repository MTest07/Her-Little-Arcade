'use client';

import React, { useState } from 'react';
import {
  ARCADE_SKINS,
  SKIN_RARITY_ORDER,
  SKIN_RARITY_META,
  SkinRarity,
  ArcadeSkinDef,
  ChallengePeriodType,
  ChallengeDifficulty,
  SeasonalBracketConfig,
  DEFAULT_SEASONAL_BRACKET_CONFIG,
  getSkinById,
} from '@/src/lib/arcade-data';
import { PlayerProfile } from './AuthModal';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { ArcadeInlineSpinner } from './ArcadeLoader';
import {
  AnimatedSkinnedAvatar,
  ThreeLayerProfileHeader,
  CustomKeyArtwork,
  getRarityBadgeClasses,
} from './CosmeticAvatarAndBanner';
import {
  Flame,
  Sparkles,
  Check,
  Trophy,
  Clock,
  Sliders,
  RotateCcw,
  Eye,
  ShieldCheck,
  Coins,
  Play,
  History,
  Key,
} from 'lucide-react';

export interface ActiveChallengeRecord {
  id: number;
  key?: string;
  challengeKey: string;
  periodType: ChallengePeriodType;
  periodKey: string;
  difficulty: ChallengeDifficulty;
  durationLabel: string;
  title: string;
  description: string;
  objectiveLabel: string;
  gameId: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed?: boolean;
  xpReward: number;
  xpAwarded: number;
  keyRewardTier?: SkinRarity;
  keyRewardCount?: number;
  expiresAtIso: string;
  remainingMs: number;
  remainingLabel: string;
  claimedAt?: string | null;
}

export interface ChallengeHistoryRecord {
  id: number;
  challengeKey: string;
  periodType: string;
  periodKey: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  xpAwarded: number;
  keyRewardTier?: SkinRarity;
  keyAwardedCount?: number;
  claimedAt?: string | null;
}

export interface ChallengePeriodWindows {
  daily: { periodKey: string; expiresAtIso: string; remainingMs: number; remainingLabel: string };
  weekly: { periodKey: string; expiresAtIso: string; remainingMs: number; remainingLabel: string };
  monthly: { periodKey: string; expiresAtIso: string; remainingMs: number; remainingLabel: string };
}

export interface SeasonDataState {
  activeSeason: {
    id: number;
    seasonNumber: number;
    name: string;
    status: string;
    startsAt: string;
    endsAt: string;
    remainingMs: number;
    remainingLabel: string;
    bracketConfig: SeasonalBracketConfig;
  } | null;
  dynamicBracket: {
    totalRegisteredCouples: number;
    eligibleCouplesCount: number;
    topThreeSkinRewards: Array<{
      rank: 1 | 2 | 3;
      skinId: string;
      skinName: string;
      rarity: SkinRarity;
      coupleId: number | null;
      coupleName: string | null;
      trophies: number;
    }>;
    coinBracketRows: Array<{
      label: string;
      startRank: number;
      endRank: number;
      coinsPerPartner: number;
      couplesInTier: Array<{
        rank: number;
        coupleId: number;
        coupleName: string;
        trophies: number;
        coinsReward: number;
      }>;
    }>;
  } | null;
  pastSeasons: Array<{
    id: number;
    seasonNumber: number;
    name: string;
    startsAt: string;
    endsAt: string;
    completedAt: string | null;
    totalEligibleCouples: number;
  }>;
  pastStandings: Array<{
    id: number;
    seasonId: number;
    seasonNumber: number;
    coupleId: number;
    coupleName: string;
    partnerAUid: string;
    partnerAUsername: string;
    partnerBUid: string;
    partnerBUsername: string;
    finalRank: number;
    finalTrophies: number;
    rewardTier: string;
    skinRewardId: string;
    skinRewardRarity: string;
    coinsAwardedPerPartner: number;
    createdAt: string;
  }>;
}

/* ============================================================================
   1. DAILY, WEEKLY & MONTHLY CHALLENGES VAULT PANEL
   ============================================================================ */
export function ChallengesVaultPanel({
  challenges,
  challengeHistory,
  periodWindows,
  streak,
  claimingKey,
  compact = false,
  onPlayGame,
  onClaimChallenge,
}: {
  challenges: ActiveChallengeRecord[];
  challengeHistory: ChallengeHistoryRecord[];
  periodWindows?: ChallengePeriodWindows | null;
  streak: number;
  claimingKey: string | null;
  compact?: boolean;
  onPlayGame: (gameId: string) => void;
  onClaimChallenge: (challengeKey: string) => void;
}) {
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<
    'daily' | 'weekly' | 'monthly' | 'history'
  >('daily');

  const activeWindow =
    selectedPeriodTab === 'daily'
      ? periodWindows?.daily
      : selectedPeriodTab === 'weekly'
      ? periodWindows?.weekly
      : selectedPeriodTab === 'monthly'
      ? periodWindows?.monthly
      : null;

  const filteredChallenges = challenges.filter(
    (c) => c.periodType === selectedPeriodTab
  );

  function getDifficultyBadge(diff: ChallengeDifficulty) {
    if (diff === 'Easy') {
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
    }
    if (diff === 'Medium') {
      return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
    }
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-stone-100">
            Daily, Weekly &amp; Monthly Challenges
          </h2>
          {!compact && (
            <p className="mt-0.5 text-xs text-stone-400">
              Verified progress from real gameplay &amp; companion care. Awards XP + Chest Keys (Daily: Common/Uncommon Key · Weekly: Rare/Epic Key · Monthly: Legendary Key).
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
          {activeWindow && (
            <span className="flex items-center gap-1 text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <span>Resets in {activeWindow.remainingLabel}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-rose-300">
            <Flame className="h-3.5 w-3.5" />
            <span>Streak: {streak}d</span>
          </span>
        </div>
      </div>

      {/* Category Switcher: Daily (Easy · 24h) / Weekly (Medium · 7d) / Monthly (Hard · 1m) / History */}
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
        {(
          [
            { id: 'daily', label: 'Daily', sub: 'Easy · 24h' },
            { id: 'weekly', label: 'Weekly', sub: 'Medium · 7d' },
            { id: 'monthly', label: 'Monthly', sub: 'Hard · 1m' },
            { id: 'history', label: 'History', sub: `${challengeHistory.length} Claimed` },
          ] as const
        ).map((tab) => {
          const active = selectedPeriodTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedPeriodTab(tab.id)}
              className={`flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition-colors ${
                active
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:bg-stone-900 hover:text-stone-100'
              }`}
            >
              <span className="text-xs font-bold">{tab.label}</span>
              <span
                className={`text-[9px] font-semibold ${
                  active ? 'text-stone-900' : 'text-stone-500'
                }`}
              >
                {tab.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Challenge Cards */}
      {selectedPeriodTab !== 'history' ? (
        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
          {filteredChallenges.map((ch, idx) => {
            const resolvedChallengeKey = ch.challengeKey || ch.key || `challenge-${ch.id ?? idx}`;
            const isClaimed = Boolean(ch.claimed ?? ch.completed);
            const pct = Math.min(100, Math.round((ch.progress / Math.max(1, ch.target)) * 100));
            const isEligibleToClaim = ch.progress >= ch.target && !isClaimed;

            return (
              <div
                key={`${ch.periodKey}-${resolvedChallengeKey}`}
                className={`rounded-2xl border p-3.5 transition-colors ${
                  isClaimed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : isEligibleToClaim
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-stone-800 bg-stone-900/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={`rounded border px-1.5 py-0.5 font-bold uppercase ${getDifficultyBadge(
                          ch.difficulty
                        )}`}
                      >
                        {ch.difficulty}
                      </span>
                      <span className="font-mono text-stone-400">
                        {ch.durationLabel} · Expires in {ch.remainingLabel}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-stone-100">{ch.title}</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-stone-300">
                      {ch.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1 font-mono text-xs font-bold text-amber-300 tabular-nums">
                    <span>+{ch.xpReward} XP</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono ${getRarityBadgeClasses(
                        ch.keyRewardTier || 'Common'
                      )}`}
                    >
                      <CustomKeyArtwork tier={ch.keyRewardTier || 'Common'} size={15} />
                      <span>
                        +{ch.keyRewardCount || 1} {ch.keyRewardTier || 'Common'} Key
                      </span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Objective */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-stone-400">{ch.objectiveLabel}</span>
                    <span className="font-mono font-bold text-stone-200 tabular-nums">
                      {ch.progress} / {ch.target} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-950">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isClaimed
                          ? 'bg-emerald-400'
                          : isEligibleToClaim
                          ? 'bg-amber-400'
                          : 'bg-teal-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onPlayGame(ch.gameId === 'any' ? 'chess' : ch.gameId)
                    }
                    className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 text-[11px] font-semibold text-stone-200 hover:border-amber-500/60"
                  >
                    <Play className="h-3 w-3" />
                    <span>
                      {ch.gameId === 'any' ? 'Play Arcade' : 'Launch Game'}
                    </span>
                  </button>

                  {isClaimed ? (
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
                      <Check className="h-3 w-3" />
                      <span>
                        Claimed (+{ch.xpAwarded || ch.xpReward} XP &amp; {ch.keyRewardTier || 'Common'} Key)
                      </span>
                    </span>
                  ) : isEligibleToClaim ? (
                    <button
                      type="button"
                      disabled={claimingKey === resolvedChallengeKey}
                      onClick={() => onClaimChallenge(resolvedChallengeKey)}
                      className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-[11px] font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                      {claimingKey === resolvedChallengeKey ? (
                        <ArcadeInlineSpinner size={12} label="Claiming..." />
                      ) : (
                        <>
                          <Key className="h-3 w-3" />
                          <span>
                            Claim +{ch.xpReward} XP &amp; {ch.keyRewardTier || 'Common'} Key
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="font-mono text-[10px] text-stone-500">
                      {ch.target - ch.progress} more to unlock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Completed Challenge History */
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900/90 p-3 text-xs">
          {challengeHistory.length === 0 ? (
            <div className="py-6 text-center text-stone-400">
              No completed challenges recorded yet. Complete Daily, Weekly, or Monthly objectives and claim your XP rewards!
            </div>
          ) : (
            challengeHistory.map((h, idx) => (
              <div
                key={`${h.id ?? idx}-${h.periodKey}-${h.challengeKey}`}
                className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-3 py-2"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-stone-100">
                    <History className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{h.title}</span>
                    <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[9px] uppercase text-stone-300">
                      {h.periodType} · {h.periodKey}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    Completed ({h.progress}/{h.target})
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                  +{h.xpAwarded} XP
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

/* ============================================================================
   2. SEASONAL 2V2 COUPLE LEADERBOARD, TOP 3 SKINS & DYNAMIC COIN BRACKET PANEL
   ============================================================================ */
export function SeasonalLeaderboardAndBracketPanel({
  seasonState,
  activeCouple,
  isUpdatingSeason,
  onUpdateBracketConfig,
  onConcludeSeasonNow,
}: {
  seasonState: SeasonDataState | null;
  activeCouple: EnrichedCouplePairing | null;
  isUpdatingSeason: boolean;
  onUpdateBracketConfig: (config: Partial<SeasonalBracketConfig>) => void;
  onConcludeSeasonNow: () => void;
}) {
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const currentConfig =
    seasonState?.activeSeason?.bracketConfig || DEFAULT_SEASONAL_BRACKET_CONFIG;

  const [rank4BaseInput, setRank4BaseInput] = useState<number>(
    currentConfig.rank4BaseCoins
  );
  const [minCoinsInput, setMinCoinsInput] = useState<number>(
    currentConfig.minEligibleCoins
  );
  const [curveInput, setCurveInput] = useState<number>(currentConfig.curveExponent);
  const [durationDaysInput, setDurationDaysInput] = useState<number>(
    currentConfig.seasonDurationDays
  );

  const activeSeason = seasonState?.activeSeason;
  const dynamicBracket = seasonState?.dynamicBracket;
  const pastStandings = seasonState?.pastStandings || [];

  return (
    <div className="space-y-5">
      {/* Active Season Status & Countdown Header */}
      <div className="rounded-2xl border border-amber-500/40 bg-stone-900/95 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-200">
                Active Competitive Season #{activeSeason?.seasonNumber || 1}
              </span>
              <span className="font-mono text-xs text-emerald-300">
                ● Live 2v2 Couple Ranking
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-bold text-stone-100">
              {activeSeason?.name || 'Season 1 · Starlight Sketchbook Season'}
            </h2>
            <p className="mt-0.5 text-xs text-stone-300">
              At season end, final standings are archived, Top 3 Couples unlock Exclusive Seasonal Skins, 4th+ eligible couples receive Dynamic Bracket Coins, and active 2v2 Couple Trophies reset to 0 for the new season!
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 font-mono text-xs tabular-nums">
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-stone-950 px-3 py-1.5 text-amber-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>
                Time Remaining: <strong>{activeSeason?.remainingLabel || '30d 0h'}</strong>
              </span>
            </div>
            {activeSeason && (
              <div className="text-[10px] text-stone-400">
                {new Date(activeSeason.startsAt).toLocaleDateString()} —{' '}
                {new Date(activeSeason.endsAt).toLocaleDateString()}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAdminConfig((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-sans font-semibold text-teal-300 hover:underline"
            >
              <Sliders className="h-3 w-3" />
              <span>
                {showAdminConfig
                  ? 'Hide Season & Bracket Controls'
                  : 'Season Rollover & Bracket Settings'}
              </span>
            </button>
          </div>
        </div>

        {/* Admin Season Configuration & Instant End-of-Season Rollover Verification Panel */}
        {showAdminConfig && (
          <div className="mt-4 space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-amber-300">
                  Administrator Seasonal Reward Bracket &amp; Season Rollover Controls
                </div>
                <p className="text-[11px] text-stone-400">
                  Adjust the dynamic coin payout curve for 4th place and below, or conclude the active season now to archive standings, distribute Top 3 Skins &amp; 4th+ Coins, and reset active couple trophies to 0.
                </p>
              </div>
              <button
                type="button"
                disabled={isUpdatingSeason}
                onClick={onConcludeSeasonNow}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-rose-400 disabled:opacity-50"
              >
                {isUpdatingSeason ? (
                  <ArcadeInlineSpinner size={14} label="Rolling over season..." />
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Conclude Season &amp; Distribute Rewards Now</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[10px] text-stone-400">
                  4th Place Base Coins
                </label>
                <input
                  type="number"
                  min={50}
                  max={50000}
                  value={rank4BaseInput}
                  onChange={(e) => setRank4BaseInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 font-mono text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-400">
                  Minimum Eligible Coins
                </label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={minCoinsInput}
                  onChange={(e) => setMinCoinsInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 font-mono text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-400">
                  Curve Exponent (0.5–3.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min={0.5}
                  max={3}
                  value={curveInput}
                  onChange={(e) => setCurveInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 font-mono text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-400">
                  Season Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={durationDaysInput}
                  onChange={(e) => setDurationDaysInput(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 font-mono text-xs text-stone-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isUpdatingSeason}
                onClick={() =>
                  onUpdateBracketConfig({
                    rank4BaseCoins: rank4BaseInput,
                    minEligibleCoins: minCoinsInput,
                    curveExponent: curveInput,
                    seasonDurationDays: durationDaysInput,
                  })
                }
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
              >
                Save Dynamic Bracket Formula
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Couples: End-of-Season Exclusive Skin Rewards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(
          dynamicBracket?.topThreeSkinRewards || [
            {
              rank: 1 as const,
              skinId: 'skin-season-sovereign-eclipse',
              skinName: 'Sovereign Eclipse Crown',
              rarity: 'Legendary' as SkinRarity,
              coupleId: null,
              coupleName: null,
              trophies: 0,
            },
            {
              rank: 2 as const,
              skinId: 'skin-season-celestial-waltz',
              skinName: 'Celestial Waltz Aura',
              rarity: 'Epic' as SkinRarity,
              coupleId: null,
              coupleName: null,
              trophies: 0,
            },
            {
              rank: 3 as const,
              skinId: 'skin-season-paper-lantern-harmony',
              skinName: 'Paper Lantern Harmony',
              rarity: 'Rare' as SkinRarity,
              coupleId: null,
              coupleName: null,
              trophies: 0,
            },
          ]
        ).map((tier) => {
          const skinDef = getSkinById(tier.skinId);
          const rarityMeta = SKIN_RARITY_META[tier.rarity];
          const isMyCouple = Boolean(activeCouple && tier.coupleId === activeCouple.id);

          return (
            <div
              key={tier.rank}
              className={`rounded-2xl border p-4 ${rarityMeta.borderClass} bg-stone-900/90`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-stone-100">
                  {tier.rank === 1
                    ? '🥇 1st Place Couple'
                    : tier.rank === 2
                    ? '🥈 2nd Place Couple'
                    : '🥉 3rd Place Couple'}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${rarityMeta.badgeClass}`}
                >
                  {tier.rarity} Skin
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl">{skinDef?.icon || '👑'}</span>
                <div>
                  <div className="text-sm font-bold text-stone-100">{tier.skinName}</div>
                  <div className="text-[11px] text-stone-400">
                    Exclusive Seasonal {tier.rarity} Skin · Both Partners
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs">
                {tier.coupleName ? (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-100">
                      ♥ {tier.coupleName}
                      {isMyCouple ? ' (You)' : ''}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      🏆 {tier.trophies}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-stone-500">
                    Open Contender Slot — Win 2v2 matches to claim Rank #{tier.rank}!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Seasonal Coin Reward Bracket (4th Place and Below) */}
      <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-100">
              Dynamic Seasonal Coin Reward Bracket (4th Place &amp; Below)
            </h3>
            <p className="mt-0.5 text-xs text-stone-400">
              Automatically scales to the exact number of eligible couples with &gt;0 Seasonal Trophies ({dynamicBracket?.eligibleCouplesCount || 0} eligible of {dynamicBracket?.totalRegisteredCouples || 0} active couples). No fabricated empty rank slots.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-teal-300">
            4th Base: {currentConfig.rank4BaseCoins} Coins · Min Eligible: {currentConfig.minEligibleCoins} Coins
          </span>
        </div>

        {dynamicBracket && dynamicBracket.coinBracketRows.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-800 text-stone-400">
                <tr>
                  <th className="py-2 pr-3">Rank Bracket</th>
                  <th className="py-2 px-3">Current Contenders</th>
                  <th className="py-2 pl-3 text-right">Seasonal Coin Reward (Per Partner)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono tabular-nums">
                {dynamicBracket.coinBracketRows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 pr-3 font-bold text-amber-300">{row.label}</td>
                    <td className="py-2.5 px-3 font-sans text-stone-200">
                      {row.couplesInTier.map((c) => (
                        <span
                          key={c.coupleId}
                          className="mr-2 inline-block rounded border border-stone-800 bg-stone-950 px-2 py-0.5 text-[11px]"
                        >
                          #{c.rank} ♥ {c.coupleName} (🏆 {c.trophies})
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-bold text-teal-300">
                      +{row.coinsPerPartner.toLocaleString()} Coins each
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs text-stone-400">
            Currently <strong>{dynamicBracket?.eligibleCouplesCount || 0}</strong> eligible couple(s) have &gt;0 trophies. As soon as 4 or more couples earn trophies in 2v2 matches, the dynamic 4th–Nth place Coin Bracket populates automatically with monotonically decreasing coin payouts ({currentConfig.rank4BaseCoins} Coins at 4th down to {currentConfig.minEligibleCoins} Coins at Nth).
          </div>
        )}
      </div>

      {/* Past Seasons Final Standings Archive */}
      {pastStandings.length > 0 && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4">
          <h3 className="text-sm font-bold text-stone-100">
            Archived Final Season Standings &amp; Distributed Rewards
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-800 text-stone-400">
                <tr>
                  <th className="py-2 pr-3">Season</th>
                  <th className="py-2 px-3">Final Rank</th>
                  <th className="py-2 px-3">Couple &amp; Partners</th>
                  <th className="py-2 px-3 text-right">Final Trophies</th>
                  <th className="py-2 pl-3 text-right">Seasonal Reward Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono tabular-nums">
                {pastStandings.slice(0, 15).map((st, idx) => {
                  const skin = st.skinRewardId ? getSkinById(st.skinRewardId) : null;
                  return (
                    <tr key={`${st.id ?? idx}-${st.seasonNumber}-${st.coupleId}`}>
                      <td className="py-2 pr-3 text-stone-300">S{st.seasonNumber}</td>
                      <td className="py-2 px-3 font-bold text-rose-300">#{st.finalRank}</td>
                      <td className="py-2 px-3 font-sans text-stone-200">
                        <strong>{st.coupleName}</strong> (@{st.partnerAUsername} &amp; @
                        {st.partnerBUsername})
                      </td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        🏆 {st.finalTrophies}
                      </td>
                      <td className="py-2 pl-3 text-right font-sans">
                        {skin ? (
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${skin.badgeClass}`}
                          >
                            {skin.icon} {skin.name} ({skin.rarity})
                          </span>
                        ) : st.coinsAwardedPerPartner > 0 ? (
                          <span className="font-mono font-bold text-teal-300">
                            +{st.coinsAwardedPerPartner.toLocaleString()} Coins / Partner
                          </span>
                        ) : (
                          <span className="text-stone-500">Unranked (0 🏆)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   3. EQUIPPABLE 5-RARITY SKIN SYSTEM & LIVE PREVIEW STUDIO
   ============================================================================ */
export function SkinsBoutiqueAndVaultPanel({
  currentUser,
  activeCouple,
  pendingSkinActionId,
  onPurchaseSkin,
  onEquipSkin,
}: {
  currentUser: PlayerProfile;
  activeCouple: EnrichedCouplePairing | null;
  pendingSkinActionId: string | null;
  onPurchaseSkin: (skin: ArcadeSkinDef) => void;
  onEquipSkin: (skinId: string, applyToCouple: boolean) => void;
}) {
  const [rarityFilter, setRarityFilter] = useState<'ALL' | SkinRarity>('ALL');
  const [applyToCoupleToggle, setApplyToCoupleToggle] = useState<boolean>(
    Boolean(activeCouple)
  );
  const [previewSkinId, setPreviewSkinId] = useState<string>(
    currentUser.equippedSkin || 'skin-classic-notebook'
  );

  const previewSkin = getSkinById(
    previewSkinId || currentUser.equippedSkin || 'skin-classic-notebook'
  );

  const orderedSkins = [...ARCADE_SKINS]
    .filter((s) => rarityFilter === 'ALL' || s.rarity === rarityFilter)
    .sort((a, b) => {
      const rankA = SKIN_RARITY_META[a.rarity].rankOrder;
      const rankB = SKIN_RARITY_META[b.rarity].rankOrder;
      if (rankA !== rankB) return rankA - rankB;
      return b.costCoins - a.costCoins;
    });

  return (
    <section className="space-y-5 border-b border-stone-800 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
            5-Rarity Equippable Skin System (Ordered Highest → Lowest Rarity)
          </div>
          <h2 className="mt-1 text-lg font-bold text-stone-100">
            Arcade Skins Vault &amp; Live Profile Preview
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">
            1. Legendary · 2. Epic · 3. Rare · 4. Uncommon · 5. Common. Preview any skin live before unlocking or equipping it to your Player Profile, Sidebar, Couple Card, and Game Arena!
          </p>
        </div>

        {activeCouple && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
            <input
              type="checkbox"
              checked={applyToCoupleToggle}
              onChange={(e) => setApplyToCoupleToggle(e.target.checked)}
              className="accent-rose-500"
            />
            <span>Also apply equipped skin to Couple Profile ({activeCouple.coupleName})</span>
          </label>
        )}
      </div>

      {/* Interactive Live 3-Layer Skin & Banner Preview Card */}
      {previewSkin && (
        <div className="space-y-2">
          <ThreeLayerProfileHeader
            username={currentUser.username}
            titleOrSubtitle={`${previewSkin.name} (${previewSkin.rarity} Frame · ${previewSkin.animationLabel})`}
            avatarId={currentUser.avatar}
            customPhotoUrl={currentUser.customPhotoUrl}
            equippedSkinId={previewSkin.id}
            equippedBannerId={currentUser.equippedBanner || 'banner-sketchbook-grid'}
            level={currentUser.level}
            coins={currentUser.coins}
          />
        </div>
      )}

      {/* Rarity Tier Filter Bar (Strict Order: Legendary -> Epic -> Rare -> Uncommon -> Common) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setRarityFilter('ALL')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
            rarityFilter === 'ALL'
              ? 'border-amber-400 bg-amber-500 text-stone-950'
              : 'border-stone-800 bg-stone-900 text-stone-300 hover:text-stone-100'
          }`}
        >
          All Skins ({ARCADE_SKINS.length})
        </button>
        {SKIN_RARITY_ORDER.map((rarity) => {
          const meta = SKIN_RARITY_META[rarity];
          const count = ARCADE_SKINS.filter((s) => s.rarity === rarity).length;
          return (
            <button
              key={rarity}
              type="button"
              onClick={() => setRarityFilter(rarity)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                rarityFilter === rarity
                  ? meta.badgeClass
                  : 'border-stone-800 bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
            >
              {meta.rankOrder}. {rarity} ({count})
            </button>
          );
        })}
      </div>

      {/* Skins Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderedSkins.map((skin) => {
          const rarityMeta = SKIN_RARITY_META[skin.rarity];
          const isOwned =
            skin.acquisitionSource === 'starter' ||
            currentUser.unlockedItems.includes(skin.id);
          const isEquippedPlayer = currentUser.equippedSkin === skin.id;
          const isEquippedCouple = activeCouple?.equippedCoupleSkin === skin.id;
          const isPreviewing = previewSkin?.id === skin.id;

          return (
            <div
              key={skin.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isPreviewing
                  ? 'border-amber-400 bg-stone-900'
                  : `${rarityMeta.borderClass} bg-stone-900/90`
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${rarityMeta.badgeClass}`}
                  >
                    #{rarityMeta.rankOrder} {skin.rarity}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                    {skin.acquisitionSource === 'starter'
                      ? 'Starter (Free)'
                      : `${skin.costCoins.toLocaleString()} Coins`}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <AnimatedSkinnedAvatar
                    avatarId={currentUser.avatar}
                    customPhotoUrl={currentUser.customPhotoUrl}
                    skinId={skin.id}
                    size="md"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-stone-100">{skin.name}</h3>
                    <div className="text-[10px] font-mono text-stone-400">
                      {skin.animationLabel}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {isOwned ? '✓ Owned in Inventory' : 'Locked Cosmetic Skin'}
                      {isEquippedCouple ? ' · ♥ Couple Equipped' : ''}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-stone-300">
                  {skin.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewSkinId(skin.id)}
                  className={`flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    isPreviewing
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-stone-700 bg-stone-950 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>

                {isOwned ? (
                  isEquippedPlayer ? (
                    <button
                      type="button"
                      disabled={pendingSkinActionId === skin.id}
                      onClick={() =>
                        onEquipSkin('skin-classic-notebook', applyToCoupleToggle)
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Equipped (Unequip)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingSkinActionId === skin.id}
                      onClick={() => onEquipSkin(skin.id, applyToCoupleToggle)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-500 py-2 text-xs font-bold text-stone-950 hover:bg-teal-400 disabled:opacity-50"
                    >
                      {pendingSkinActionId === skin.id ? (
                        <ArcadeInlineSpinner size={14} label="Equipping..." />
                      ) : (
                        <span>Equip Skin</span>
                      )}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={pendingSkinActionId === skin.id}
                    onClick={() => onPurchaseSkin(skin)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {pendingSkinActionId === skin.id ? (
                      <ArcadeInlineSpinner size={14} label="Unlocking..." />
                    ) : (
                      <>
                        <Coins className="h-3.5 w-3.5" />
                        <span>Unlock ({skin.costCoins.toLocaleString()} Coins)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
