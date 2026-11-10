'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import {
  SINGLE_PLAYER_GAMES,
  MULTIPLAYER_GAMES,
  MULTIPLAYER_1V1_EXCLUSIVE_GAMES,
  MULTIPLAYER_2V2_COUPLE_GAMES,
  ALL_ARCADE_GAMES,
  REWARD_SHOP_ITEMS,
  RENAME_CARD_COST_COINS,
  TROPHY_ROAD_MILESTONES,
  ACHIEVEMENTS,
  HERO_BANNER_IMAGE,
  VIRTUAL_PET_IMAGE,
  KEEPSAKE_PICNIC_IMAGE,
  ArcadeGameDef,
  ArcadeSkinDef,
  SkinRarity,
  SeasonalBracketConfig,
  getSkinById,
  getBannerById,
} from '@/src/lib/arcade-data';
import { calculateLevelFromXp } from '@/src/lib/game-rules';
import {
  AuthModal,
  PlayerProfile,
  normalizePlayerProfile,
} from '@/src/components/AuthModal';
import {
  CouplePairingPanel,
  CoupleContextData,
  EnrichedCouplePairing,
} from '@/src/components/CouplePairingPanel';
import {
  VoiceAndLobbyDock,
  MultiplayerRoomState,
  IncomingInvitationRecord,
  parseRawDatabaseRoom,
} from '@/src/components/VoiceAndLobbyDock';
import { PlayGameSetupModal } from '@/src/components/PlayGameSetupModal';
import {
  useGsapSectionTransition,
  useGsapScrollReveal,
  animateButtonPress,
  animateCardHover,
  smoothScrollToTop,
} from '@/src/lib/gsap-motion';
import { ChessArena } from '@/src/components/ChessArena';
import {
  SinglePlayerGameArena,
  PersonalizedItemRecord,
} from '@/src/components/SinglePlayerGames';
import { MultiplayerGameArena } from '@/src/components/MultiplayerGames';
import { ArcadeSidebar, ArcadeNavSection } from '@/src/components/ArcadeSidebar';
import {
  ArcadeCircularLoader,
  ArcadeInlineSpinner,
  DEFAULT_LOADING_MESSAGES,
} from '@/src/components/ArcadeLoader';
import {
  ChallengesVaultPanel,
  SeasonalLeaderboardAndBracketPanel,
  SkinsBoutiqueAndVaultPanel,
  ActiveChallengeRecord,
  ChallengeHistoryRecord,
  ChallengePeriodWindows,
  SeasonDataState,
} from '@/src/components/SeasonalAndChallengePanels';
import {
  AnimatedSkinnedAvatar,
  ProfilePhotoUploadAndCropModal,
} from '@/src/components/CosmeticAvatarAndBanner';
import {
  CosmeticChestShopAndInventorySuite,
  ChestOpeningResultPayload,
} from '@/src/components/ChestBoutiqueAndInventory';
import { soundFX } from '@/src/lib/sound';
import {
  Users,
  Heart,
  HeartHandshake,
  Play,
  Coins,
  Flame,
  Sparkles,
  Check,
  Lock,
  Search,
  Volume2,
  VolumeX,
  Plus,
  ShieldAlert,
} from 'lucide-react';

type NavSection = ArcadeNavSection;

interface GameHistoryRecord {
  id: number;
  userUid: string;
  username: string;
  coupleId: number;
  opponentLabel: string;
  gameId: string;
  mode: string;
  result: string;
  score: number;
  xpEarned: number;
  coinsEarned: number;
  trophiesDelta?: number;
  durationSeconds: number;
  details: string;
  createdAt: string;
}

interface CoinTransactionRecord {
  id: number;
  userUid: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string;
  createdAt: string;
}

function getAvatarEmoji(avatarId: string): string {
  const map: Record<string, string> = {
    kitsune: '🦊',
    'star-cat': '🐱',
    'mochi-bunny': '🐰',
    'cloud-bear': '🐻‍❄️',
    'cherry-owl': '🦉',
    'matcha-frog': '🐸',
    'trophy-crown-fox': '👑🦊',
    'celestial-swan': '🦢✨',
  };
  return map[avatarId] || '🎮';
}

export default function HerLittleArcadePage() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [autostartGame, setAutostartGame] = useState<boolean>(false);

  // Strict Authenticated Player State (Null until user signs up or signs in)
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [verificationCodeHint, setVerificationCodeHint] = useState<string | null>(null);

  // Real Database Collections (Zero Mock Data)
  const [couplesLeaderboard, setCouplesLeaderboard] = useState<EnrichedCouplePairing[]>([]);
  const [coupleContext, setCoupleContext] = useState<CoupleContextData>({
    activeCouple: null,
    pendingOutgoing: null,
    pendingIncoming: null,
  });
  const [gameHistory, setGameHistory] = useState<GameHistoryRecord[]>([]);
  const [personalizedItems, setPersonalizedItems] = useState<PersonalizedItemRecord[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<IncomingInvitationRecord[]>([]);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransactionRecord[]>([]);
  const [challenges, setChallenges] = useState<ActiveChallengeRecord[]>([]);
  const [challengeHistory, setChallengeHistory] = useState<ChallengeHistoryRecord[]>([]);
  const [challengePeriodWindows, setChallengePeriodWindows] =
    useState<ChallengePeriodWindows | null>(null);
  const [seasonState, setSeasonState] = useState<SeasonDataState | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const [chestOpenings, setChestOpenings] = useState<
    Array<{
      id: number;
      chestTier: string;
      openMethod: string;
      rewardCategory: string;
      rewardId: string;
      rewardName: string;
      rewardRarity: string;
      wasDuplicate: boolean;
      duplicateCoinsAwarded: number;
      createdAt?: string;
    }>
  >([]);

  // Real Multiplayer Room State (Null until user creates or joins a validated room)
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoomState | null>(null);

  // URL Deep-Link Parameters (?pair=CODE or ?room=CODE)
  const [urlPairCode, setUrlPairCode] = useState<string>('');

  // Filters & UI controls
  const [catalogFilter, setCatalogFilter] = useState<
    'all' | 'single' | '1v1' | '2v2' | 'competitive' | 'cooperative' | 'party'
  >('all');
  const [multiplayerFilter, setMultiplayerFilter] = useState<
    'all' | '1v1' | '2v2' | 'trophy-road' | 'couple-leaderboard'
  >('all');
  const [selectedMultiplayerMode, setSelectedMultiplayerMode] = useState<'1v1' | '2v2'>('1v1');
  const [requestedDockTab, setRequestedDockTab] = useState<'matchmake' | 'invite' | 'create' | 'join' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [leaderboardTab, setLeaderboardTab] = useState<'couples' | 'trophy-road'>('couples');
  const [coupleLeaderboardPeriod, setCoupleLeaderboardPeriod] = useState<'global' | 'weekly' | 'monthly'>('global');
  const [claimingChallengeKey, setClaimingChallengeKey] = useState<string | null>(null);
  const [isUpdatingSeason, setIsUpdatingSeason] = useState<boolean>(false);
  const [voiceJoinedOnce, setVoiceJoinedOnce] = useState<boolean>(false);
  const [rewardStatusBanner, setRewardStatusBanner] = useState<string | null>(null);

  // Personalized Content Creator form state
  const [customCategory, setCustomCategory] = useState<'quiz_question' | 'truth_or_dare' | 'memory_photo'>('quiz_question');
  const [customTitle, setCustomTitle] = useState('');
  const [customOptionA, setCustomOptionA] = useState('');
  const [customOptionB, setCustomOptionB] = useState('');
  const [customPromptType, setCustomPromptType] = useState<'truth' | 'dare'>('truth');
  const [customStatusBanner, setCustomStatusBanner] = useState<string | null>(null);

  // Audio, Theme & Sidebar settings
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [sfxVolume, setSfxVolume] = useState<number>(35);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);

  // Real Application Loading States (Zero Fake Progress)
  const [isInitialBoot, setIsInitialBoot] = useState<boolean>(true);
  const [isBootstrappingProfile, setIsBootstrappingProfile] = useState<boolean>(false);
  const [isFetchingDatabase, setIsFetchingDatabase] = useState<boolean>(false);
  const [gameLoadingTarget, setGameLoadingTarget] = useState<string | null>(null);
  const [pendingShopItemId, setPendingShopItemId] = useState<string | null>(null);
  const [pendingMilestoneId, setPendingMilestoneId] = useState<string | null>(null);
  const [isSavingCustomItem, setIsSavingCustomItem] = useState<boolean>(false);

  const hasBootstrappedOnceRef = useRef<boolean>(false);
  const gameSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainViewportRef = useRef<HTMLElement | null>(null);

  // Modal state for Play Game -> 1v1 or 2v2 Match Setup
  const [playSetupModal, setPlaySetupModal] = useState<{
    isOpen: boolean;
    gameId: string;
    mode: '1v1' | '2v2';
  }>({
    isOpen: false,
    gameId: 'chess',
    mode: '1v1',
  });
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  // Sync Light / Dark Sketchbook class on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDarkTheme);
  }, [isDarkTheme]);

  // Smooth initial website boot transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialBoot(false);
    }, 380);
    return () => clearTimeout(timer);
  }, []);

  // Helper to launch or switch between games with a smooth circular loading transition
  const handleLaunchGame = useCallback(
    (
      nextGameId: string | null,
      options?: { autostart?: boolean; mode?: '1v1' | '2v2' }
    ) => {
      if (gameSwitchTimeoutRef.current) {
        clearTimeout(gameSwitchTimeoutRef.current);
      }
      if (options?.mode) {
        setSelectedMultiplayerMode(options.mode);
      }
      if (!nextGameId) {
        setGameLoadingTarget(null);
        setActiveGameId(null);
        setAutostartGame(false);
        return;
      }

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setAutostartGame(Boolean(options?.autostart));
      setActiveGameId(nextGameId);

      if (prefersReducedMotion) {
        setGameLoadingTarget(null);
        return;
      }

      setGameLoadingTarget(nextGameId);
      gameSwitchTimeoutRef.current = setTimeout(() => {
        setGameLoadingTarget(null);
      }, 340);
    },
    []
  );

  // Global GSAP Section Transitions & ScrollTrigger Reveal Animations
  const gsapRefreshKey = `${activeSection}-${activeGameId || 'grid'}-${multiplayerFilter}-${catalogFilter}-${leaderboardTab}-${couplesLeaderboard.length}-${challenges.length}`;
  useGsapSectionTransition(mainViewportRef, gsapRefreshKey);
  useGsapScrollReveal(mainViewportRef, gsapRefreshKey);

  useEffect(() => {
    const container = mainViewportRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const cards = container.querySelectorAll('.gsap-stagger-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.028,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    }
  }, [
    activeSection,
    activeGameId,
    multiplayerFilter,
    catalogFilter,
    leaderboardTab,
  ]);

  // Unified Play Game Navigation Flow:
  // Single-Player games open directly; Multiplayer games open the 1v1 or 2v2 Setup Modal
  // (unless the player is already inside a full active room for that exact game & mode).
  const handlePlayGameClick = useCallback(
    (game: ArcadeGameDef, forcedMode?: '1v1' | '2v2') => {
      if (game.collection === 'single') {
        handleLaunchGame(game.id, { autostart: false });
        return;
      }

      const resolvedMode: '1v1' | '2v2' =
        forcedMode ||
        (game.supports2v2 && selectedMultiplayerMode === '2v2' ? '2v2' : '1v1');

      setSelectedMultiplayerMode(resolvedMode);

      // If already in an active room with all required seats filled for this game & mode, launch immediately
      if (
        activeRoom &&
        activeRoom.status !== 'finished' &&
        activeRoom.status !== 'expired' &&
        activeRoom.gameId === game.id &&
        activeRoom.mode === resolvedMode &&
        activeRoom.players.length >= activeRoom.maxPlayers
      ) {
        handleLaunchGame(game.id, { mode: resolvedMode, autostart: true });
        return;
      }

      setPlaySetupModal({
        isOpen: true,
        gameId: game.id,
        mode: resolvedMode,
      });
    },
    [activeRoom, handleLaunchGame, selectedMultiplayerMode]
  );

  const authFetcher = useCallback(
    async (url: string, options?: RequestInit) => {
      const headers = new Headers(options?.headers || {});
      if (sessionToken) {
        headers.set('Authorization', `Bearer ${sessionToken}`);
      }
      return fetch(url, { ...options, headers });
    },
    [sessionToken]
  );

  const loadBootstrapData = useCallback(async (uid: string) => {
    if (!uid) return;
    const isFirstBootstrap = !hasBootstrappedOnceRef.current;
    if (isFirstBootstrap) {
      setIsBootstrappingProfile(true);
    }
    setIsFetchingDatabase(true);
    try {
      const res = await fetch(`/api/arcade?uid=${encodeURIComponent(uid)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data.players)) {
        const mapped = data.players.map((raw: Record<string, unknown>) =>
          normalizePlayerProfile(raw)
        );
        const me = mapped.find((p: PlayerProfile) => p.uid === uid);
        if (me) {
          setCurrentUser(me);
          if (me.usernameSetupCompleted === false) {
            setAuthModalOpen(true);
          }
        }
      }

      if (Array.isArray(data.couplesLeaderboard)) {
        setCouplesLeaderboard(data.couplesLeaderboard);
      }

      if (data.coupleContext) {
        setCoupleContext(data.coupleContext);
      }

      if (Array.isArray(data.records)) {
        setGameHistory(data.records);
      }

      if (Array.isArray(data.personalizedContent)) {
        setPersonalizedItems(data.personalizedContent);
      }

      if (Array.isArray(data.incomingInvitations)) {
        setIncomingInvitations(data.incomingInvitations);
      }

      if (Array.isArray(data.coinTransactions)) {
        setCoinTransactions(data.coinTransactions);
      }

      if (Array.isArray(data.challenges)) {
        setChallenges(data.challenges);
      }

      if (Array.isArray(data.challengeHistory)) {
        setChallengeHistory(data.challengeHistory);
      }

      if (data.challengePeriodWindows) {
        setChallengePeriodWindows(data.challengePeriodWindows);
      }

      if (data.seasonState) {
        setSeasonState(data.seasonState);
      }

      if (Array.isArray(data.chestOpenings)) {
        setChestOpenings(data.chestOpenings);
      }

      hasBootstrappedOnceRef.current = true;
    } catch {
      // Non-fatal network error
    } finally {
      setIsFetchingDatabase(false);
      setIsBootstrappingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pairParam = params.get('pair');
    if (pairParam) {
      Promise.resolve().then(() => {
        setUrlPairCode(pairParam.toUpperCase());
        setActiveSection('profile');
      });
    }
    const roomParam = params.get('room');
    if (roomParam) {
      Promise.resolve().then(() => {
        setUrlRoomCode(roomParam.toUpperCase().trim());
        setActiveSection('multiplayer');
        setRequestedDockTab('join');
      });
    }
  }, []);

  // Automatically join or load room when arriving via shared ?room=CODE invitation link
  useEffect(() => {
    if (!urlRoomCode || !currentUser || !sessionToken) return;
    const codeToJoin = urlRoomCode;
    (async () => {
      setUrlRoomCode('');
      try {
        const res = await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'join_room',
            roomCode: codeToJoin,
            player: {
              uid: currentUser.uid,
              username: currentUser.username,
              avatar: currentUser.avatar,
              ready: true,
              isHost: false,
              voiceActive: false,
              muted: false,
            },
          }),
        });
        const data = await res.json();
        if (res.ok && data.room) {
          setActiveRoom(parseRawDatabaseRoom(data.room));
          setActiveSection('multiplayer');
        }
      } catch {
        // Non-fatal
      }
    })();
  }, [urlRoomCode, currentUser, sessionToken]);

  // Real-time online presence & availability heartbeat
  const currentUid = currentUser?.uid || '';
  const currentRoomCode = activeRoom?.roomCode || '';
  const isPlayingMultiplayer = Boolean(
    activeGameId &&
      ALL_ARCADE_GAMES.find((g) => g.id === activeGameId)?.collection === 'multiplayer'
  );

  useEffect(() => {
    if (!currentUid || !sessionToken) return;

    async function sendHeartbeat(statusOverride?: 'online' | 'in_match' | 'offline') {
      try {
        await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'presence_heartbeat',
            presenceStatus:
              statusOverride || (isPlayingMultiplayer ? 'in_match' : 'online'),
            activeRoomCode: currentRoomCode,
          }),
        });
      } catch {
        // Ignore transient network error
      }
    }

    sendHeartbeat();
    const interval = setInterval(() => sendHeartbeat(), 18000);

    const handleBeforeUnload = () => {
      sendHeartbeat('offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUid, sessionToken, currentRoomCode, isPlayingMultiplayer]);

  async function handlePersistRoom(nextRoom: MultiplayerRoomState) {
    setActiveRoom(nextRoom);
    if (!sessionToken) return;
    try {
      await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'sync_room',
          ...nextRoom,
        }),
      });
    } catch {
      // Non-blocking sync
    }
  }

  async function handleRecordMatch(
    gameId: string,
    mode: string,
    result: 'win' | 'loss' | 'draw' | 'completed',
    score: number,
    xpEarned: number,
    coinsEarned: number,
    details?: Record<string, unknown>
  ) {
    if (!currentUser || !sessionToken) return;
    const is2v2 = mode === '2v2_couple' || mode === '2v2';
    const safeCoins = is2v2 ? coinsEarned : 0;
    const nextXp = currentUser.xp + xpEarned;
    const nextCoins = currentUser.coins + safeCoins;
    const { level } = calculateLevelFromXp(nextXp);

    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            xp: nextXp,
            level,
            coins: nextCoins,
            wins: prev.wins + (result === 'win' || result === 'completed' ? 1 : 0),
            losses: prev.losses + (result === 'loss' ? 1 : 0),
            draws: prev.draws + (result === 'draw' ? 1 : 0),
          }
        : null
    );

    const matchKey =
      activeRoom && mode !== 'single'
        ? `${activeRoom.roomCode}:${gameId}:${String(
            details?.sessionSeed || activeRoom.gameState?.sessionSeed || '1'
          )}`
        : '';

    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'record_game',
          username: currentUser.username,
          coupleId: coupleContext.activeCouple?.id || 0,
          opponentLabel: partnerDisplayName,
          gameId,
          mode,
          result,
          score,
          xpEarned,
          coinsEarned: safeCoins,
          matchKey,
          details,
        }),
      });
      if (res.ok) {
        loadBootstrapData(currentUser.uid);
      }
    } catch {
      // Optimistic state already applied
    }
  }

  async function handleUpdateProfile(updates: Partial<PlayerProfile>) {
    if (!currentUser || !sessionToken) return;
    const merged = { ...currentUser, ...updates };
    setCurrentUser(merged);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'update_profile',
          updates,
        }),
      });
      if (res.ok) {
        loadBootstrapData(currentUser.uid);
      }
    } catch {
      // Optimistic state preserved
    }
  }

  function toggleFavoriteGame(gameId: string) {
    if (!currentUser) return;
    const exists = currentUser.favoriteGames.includes(gameId);
    const nextFavs = exists
      ? currentUser.favoriteGames.filter((id) => id !== gameId)
      : [...currentUser.favoriteGames, gameId];
    handleUpdateProfile({ favoriteGames: nextFavs });
    soundFX.playMove();
  }

  async function handleBuyOrEquipShopItem(
    itemId: string,
    costCoins: number,
    category: string,
    previewCode: string
  ) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    const isRenameCard = itemId === 'rename-card';
    const isOwned =
      !isRenameCard && (currentUser.unlockedItems.includes(itemId) || costCoins === 0);

    if (!isOwned) {
      if ( currentUser.coins < costCoins) {
        setRewardStatusBanner(
          `Insufficient Coins! You need ${costCoins.toLocaleString()} Coins (you have ${currentUser.coins.toLocaleString()} Coins). Play 2v2 Couple Matches to earn Coins!`
        );
        soundFX.playError();
        return;
      }
      setPendingShopItemId(itemId);
      try {
        const res = await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'purchase_shop_item',
            itemId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setRewardStatusBanner(data.error || 'Could not purchase item.');
          soundFX.playError();
          return;
        }
        if (data.user) {
          setCurrentUser(normalizePlayerProfile(data.user));
        }
        setRewardStatusBanner(
          isRenameCard
            ? 'Purchased 1 Official Rename Card (10,000 Coins)! Click "Use Rename Card" to change your username.'
            : `Unlocked & equipped ${itemId} for ${costCoins.toLocaleString()} Coins!`
        );
        loadBootstrapData(currentUser.uid);
        soundFX.playSuccess();
      } catch {
        setRewardStatusBanner('Network error while purchasing item.');
      } finally {
        setPendingShopItemId(null);
      }
    } else {
      const updates: Partial<PlayerProfile> = {};
      if (category === 'avatar') updates.avatar = previewCode;
      if (category === 'theme') updates.theme = previewCode;
      if (category === 'pet') {
        updates.petState = { ...currentUser.petState, accessory: previewCode };
      }
      handleUpdateProfile(updates);
      setRewardStatusBanner(`Equipped ${itemId}!`);
      soundFX.playMove();
    }
  }

  async function handleClaimTrophyMilestone(milestoneId: string) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    setPendingMilestoneId(milestoneId);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'claim_trophy_milestone',
          milestoneId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not claim Trophy Road milestone.');
        soundFX.playError();
        return;
      }
      if (data.coupleContext) {
        setCoupleContext(data.coupleContext);
      }
      setRewardStatusBanner('Claimed Couple Trophy Road Milestone Reward! Unlocked for both partners.');
      loadBootstrapData(currentUser.uid);
      soundFX.playSuccess();
    } catch {
      setRewardStatusBanner('Could not claim milestone right now.');
    } finally {
      setPendingMilestoneId(null);
    }
  }

  async function handleClaimChallenge(challengeKey: string) {
    if (!currentUser || !sessionToken) return;
    setClaimingChallengeKey(challengeKey);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'claim_challenge',
          challengeKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not claim challenge reward.');
        soundFX.playError();
        return;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (Array.isArray(data.challenges)) {
        setChallenges(data.challenges);
      }
      if (Array.isArray(data.challengeHistory)) {
        setChallengeHistory(data.challengeHistory);
      }
      soundFX.playSuccess();
      loadBootstrapData(currentUser.uid);
    } catch {
      soundFX.playError();
    } finally {
      setClaimingChallengeKey(null);
    }
  }

  async function handleEquipSkin(skinId: string, applyToCouple = false) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    setPendingShopItemId(skinId);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'equip_skin',
          skinId,
          applyToCouple,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not equip skin.');
        soundFX.playError();
        return;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (data.coupleContext) {
        setCoupleContext(data.coupleContext);
      }
      const skinDef = getSkinById(skinId);
      setRewardStatusBanner(
        `Equipped ${skinDef?.name || skinId}${
          applyToCouple && coupleContext.activeCouple ? ' on your Player & Couple Profile!' : '!'
        }`
      );
      soundFX.playSuccess();
      loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Could not equip skin right now.');
    } finally {
      setPendingShopItemId(null);
    }
  }

  async function handlePurchaseSkin(skin: ArcadeSkinDef) {
    await handleBuyOrEquipShopItem(skin.id, skin.costCoins, 'skin', skin.id);
  }

  async function handleSaveProfilePhoto(croppedDataUrl: string) {
    if (!currentUser || !sessionToken) return;
    const res = await fetch('/api/arcade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        action: 'update_profile_photo',
        photoDataUrl: croppedDataUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      soundFX.playError();
      throw new Error(data.error || 'Could not update profile picture.');
    }
    if (data.user) {
      setCurrentUser(normalizePlayerProfile(data.user));
    }
    setRewardStatusBanner(
      croppedDataUrl
        ? 'Updated your custom profile picture! Your equipped skin frame & banner remain untouched.'
        : 'Removed custom profile picture and restored your default avatar.'
    );
    soundFX.playSuccess();
    await loadBootstrapData(currentUser.uid);
  }

  async function handlePurchaseBanner(bannerId: string) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    setPendingShopItemId(bannerId);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'purchase_banner',
          bannerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not purchase banner.');
        soundFX.playError();
        return;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (Array.isArray(data.coinTransactions)) {
        setCoinTransactions(data.coinTransactions);
      }
      const bannerDef = getBannerById(bannerId);
      setRewardStatusBanner(`Unlocked & equipped banner: ${bannerDef?.name || bannerId}!`);
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Could not purchase banner right now.');
    } finally {
      setPendingShopItemId(null);
    }
  }

  async function handleEquipBanner(bannerId: string, applyToCouple = false) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    setPendingShopItemId(bannerId);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'equip_banner',
          bannerId,
          applyToCouple,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not equip banner.');
        soundFX.playError();
        return;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (data.coupleContext) {
        setCoupleContext(data.coupleContext);
      }
      const bannerDef = getBannerById(bannerId);
      setRewardStatusBanner(
        `Equipped banner: ${bannerDef?.name || bannerId}${
          applyToCouple && coupleContext.activeCouple ? ' on Player & Couple Profile!' : '!'
        }`
      );
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Could not equip banner right now.');
    } finally {
      setPendingShopItemId(null);
    }
  }

  async function handleBuyChest(chestTier: SkinRarity) {
    if (!currentUser || !sessionToken) return;
    setRewardStatusBanner(null);
    setPendingShopItemId(`buy-chest-${chestTier}`);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'buy_chest',
          chestTier,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not purchase chest.');
        soundFX.playError();
        return;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (Array.isArray(data.coinTransactions)) {
        setCoinTransactions(data.coinTransactions);
      }
      setRewardStatusBanner(
        `Stored 1 ${chestTier.toUpperCase()} Chest in your Inventory! Open it anytime from Shop or Inventory.`
      );
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Could not buy chest right now.');
    } finally {
      setPendingShopItemId(null);
    }
  }

  async function handleOpenChest(
    chestTier: SkinRarity,
    openMethod: 'coins' | 'key' | 'inventory'
  ): Promise<ChestOpeningResultPayload | null> {
    if (!currentUser || !sessionToken) return null;
    setRewardStatusBanner(null);
    setPendingShopItemId(`open-chest-${chestTier}`);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'open_chest',
          chestTier,
          openMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not open chest.');
        soundFX.playError();
        return null;
      }
      if (data.user) {
        setCurrentUser(normalizePlayerProfile(data.user));
      }
      if (Array.isArray(data.coinTransactions)) {
        setCoinTransactions(data.coinTransactions);
      }
      if (Array.isArray(data.chestOpenings)) {
        setChestOpenings(data.chestOpenings);
      }
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
      return (data.openingResult as ChestOpeningResultPayload) || null;
    } catch {
      setRewardStatusBanner('Could not open chest right now.');
      soundFX.playError();
      return null;
    } finally {
      setPendingShopItemId(null);
    }
  }

  async function handleUpdateSeasonBracket(configUpdates: Partial<SeasonalBracketConfig>) {
    if (!currentUser || !sessionToken) return;
    setIsUpdatingSeason(true);
    setRewardStatusBanner(null);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'update_season_bracket',
          ...configUpdates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not update seasonal bracket.');
        soundFX.playError();
        return;
      }
      setRewardStatusBanner(
        'Updated Dynamic Seasonal Coin Reward Bracket & Season configuration!'
      );
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Failed to update seasonal bracket.');
    } finally {
      setIsUpdatingSeason(false);
    }
  }

  async function handleConcludeSeasonNow() {
    if (!currentUser || !sessionToken) return;
    setIsUpdatingSeason(true);
    setRewardStatusBanner(null);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'conclude_season_now',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewardStatusBanner(data.error || 'Could not conclude season.');
        soundFX.playError();
        return;
      }
      setRewardStatusBanner(
        `Season Rollover Complete! Final standings saved, Top 3 Exclusive Skins & 4th+ Dynamic Bracket Coins distributed, and active couple trophies reset to 0 for the new season!`
      );
      soundFX.playSuccess();
      await loadBootstrapData(currentUser.uid);
    } catch {
      setRewardStatusBanner('Failed to conclude season.');
    } finally {
      setIsUpdatingSeason(false);
    }
  }

  async function handleAddPersonalizedContent(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !sessionToken || !customTitle.trim()) return;

    let payload: Record<string, unknown> = {};
    if (customCategory === 'quiz_question') {
      payload = {
        question: customTitle.trim(),
        options: [
          customOptionA.trim() || 'Option A',
          customOptionB.trim() || 'Option B',
          'Option C',
          'Option D',
        ],
        answerIndex: 0,
        category: 'Custom Trivia',
      };
    } else if (customCategory === 'truth_or_dare') {
      payload = {
        type: customPromptType,
        prompt: customTitle.trim(),
        deck: 'Shared Custom Deck',
      };
    } else {
      payload = {
        imageUrl: KEEPSAKE_PICNIC_IMAGE,
        caption: customTitle.trim(),
        date: new Date().toISOString().slice(0, 10),
      };
    }

    setIsSavingCustomItem(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'add_personalized',
          category: customCategory,
          title: customTitle.trim(),
          payload,
        }),
      });
      const data = await res.json();
      if (data.item) {
        setPersonalizedItems((prev) => [data.item, ...prev]);
      }
      setCustomTitle('');
      setCustomOptionA('');
      setCustomOptionB('');
      setCustomStatusBanner('Saved to your database collection! (+15 XP · 0 Coins)');
      handleUpdateProfile({ xp: currentUser.xp + 15 });
      soundFX.playSuccess();
    } catch {
      setCustomStatusBanner('Could not save item right now.');
    } finally {
      setIsSavingCustomItem(false);
    }
  }

  // MANDATORY INDIVIDUAL ACCOUNT & USERNAME GATE:
  // Every player must register/sign in AND choose a valid unique username before accessing the arcade
  if (!currentUser || !currentUser.usernameSetupCompleted || !currentUser.username.trim()) {
    return (
      <>
        <ArcadeCircularLoader
          active={isInitialBoot}
          variant="fullscreen"
          messages={DEFAULT_LOADING_MESSAGES}
          subtitle="Her Little Arcade · Working Sheet Edition"
        />
        <AuthModal
          isOpen={true}
          isFullPageGate={true}
          onClose={() => {}}
          currentUser={currentUser}
          sessionToken={sessionToken}
          onAuthenticated={(profile, token, verifyCode) => {
            setSessionToken(token);
            setCurrentUser(profile);
            if (verifyCode) setVerificationCodeHint(verifyCode);
            if (profile.usernameSetupCompleted && profile.username) {
              loadBootstrapData(profile.uid);
            }
          }}
          onProfileUpdated={(updatedProfile) => {
            setCurrentUser(updatedProfile);
            if (updatedProfile.usernameSetupCompleted && updatedProfile.username) {
              loadBootstrapData(updatedProfile.uid);
            }
          }}
          onLogout={() => {
            hasBootstrappedOnceRef.current = false;
            setCurrentUser(null);
            setSessionToken('');
          }}
        />
      </>
    );
  }

  const levelMetrics = calculateLevelFromXp(currentUser.xp);
  const activeCouple = coupleContext.activeCouple;
  const pairedPartnerProfile = activeCouple
    ? activeCouple.requesterUid === currentUser.uid
      ? activeCouple.partnerProfile
      : activeCouple.requesterProfile
    : null;

  const partnerDisplayName =
    pairedPartnerProfile?.username ||
    activeRoom?.players.find((p) => p.uid !== currentUser.uid)?.username ||
    'Challenger';

  // Compute personal best per game from real persisted records for this user
  const myGameRecords = gameHistory.filter((r) => r.userUid === currentUser.uid);
  const personalBestByGame: Record<string, number> = {};
  for (const rec of myGameRecords) {
    if (!personalBestByGame[rec.gameId] || rec.score > personalBestByGame[rec.gameId]) {
      personalBestByGame[rec.gameId] = rec.score;
    }
  }

  const activeGameDef = activeGameId
    ? ALL_ARCADE_GAMES.find((g) => g.id === activeGameId) || null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100 md:flex-row">
      {/* Fullscreen Little Rabbit Circular Loader when bootstrapping initial session/profile */}
      <ArcadeCircularLoader
        active={isInitialBoot || isBootstrappingProfile}
        variant="fullscreen"
        messages={[
          'Preparing your arcade...',
          'Loading your notebook & couple profile...',
          'Getting everything ready...',
          'Almost there!',
        ]}
        subtitle="Syncing your real PostgreSQL arcade ledger"
      />

      {/* Collapsible Left Sidebar (Desktop/Tablet) + Slide-Out Drawer (Mobile) */}
      <ArcadeSidebar
        currentUser={currentUser}
        levelMetrics={levelMetrics}
        activeCouple={activeCouple}
        pairedPartnerUsername={pairedPartnerProfile?.username || null}
        activeSection={activeSection}
        activeGameTitle={activeGameDef?.title || null}
        isCollapsed={Boolean(activeGameDef) || isSidebarCollapsed}
        isLoadingData={isFetchingDatabase}
        isDarkTheme={isDarkTheme}
        onToggleDarkTheme={() => setIsDarkTheme((prev) => !prev)}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectSection={(nextSection) => {
          handleLaunchGame(null);
          if (nextSection === 'trophy-road') {
            setLeaderboardTab('trophy-road');
            setActiveSection('trophy-road');
          } else if (nextSection === 'leaderboard') {
            setLeaderboardTab('couples');
            setActiveSection('leaderboard');
          } else {
            setActiveSection(nextSection);
          }
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenAccountModal={() => setAuthModalOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          setSessionToken('');
          setActiveRoom(null);
          handleLaunchGame(null);
        }}
      />

      {/* Right Content Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Email Verification Reminder Bar if not yet verified */}
        {!currentUser.emailVerified && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-200">
            <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>
                  Verify your email ({currentUser.email}) to earn +25 bonus XP.
                  {verificationCodeHint
                    ? ` Your verification code is ${verificationCodeHint}.`
                    : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="font-bold text-amber-300 underline hover:text-amber-100"
              >
                Enter Verification Code
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Container */}
        <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 py-6 lg:px-8">
          {/* Central Content Viewport */}
          <main ref={mainViewportRef} className="min-w-0 flex-1 space-y-6">
            {/* ACTIVE GAME SHELL VIEW */}
            {activeGameDef ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div
                className={
                  activeGameDef.collection === 'multiplayer'
                    ? 'xl:col-span-8'
                    : 'xl:col-span-12'
                }
              >
                {/* Equipped Player & Couple Skin Banner in Active Game Arena */}
                {(() => {
                  const playerSkin = getSkinById(currentUser.equippedSkin);
                  const coupleSkin = getSkinById(activeCouple?.equippedCoupleSkin);
                  if (!playerSkin && !coupleSkin) return null;
                  return (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-900/90 px-3.5 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-stone-200">
                          @{currentUser.username}
                        </span>
                        {playerSkin && (
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${playerSkin.badgeClass}`}
                          >
                            {playerSkin.icon} {playerSkin.name} ({playerSkin.rarity})
                          </span>
                        )}
                      </div>
                      {activeCouple && coupleSkin && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400">♥ {activeCouple.coupleName}:</span>
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${coupleSkin.badgeClass}`}
                          >
                            {coupleSkin.icon} {coupleSkin.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {gameLoadingTarget ? (
                  <ArcadeCircularLoader
                    active={true}
                    variant="card"
                    messages={[
                      `Setting up ${activeGameDef.title}...`,
                      'Preparing game pieces & rules...',
                      'Getting everything ready...',
                      'Almost there!',
                    ]}
                    subtitle={
                      activeGameDef.collection === 'single'
                        ? 'Single-Player Sanctuary'
                        : `${(activeRoom?.mode || selectedMultiplayerMode).toUpperCase()} Multiplayer Arena`
                    }
                  />
                ) : activeGameDef.collection === 'single' ? (
                  /* Single-Player Mode: Never requires account pairing or a partner */
                  <SinglePlayerGameArena
                    gameId={activeGameDef.id}
                    autostart={autostartGame}
                    personalBest={personalBestByGame[activeGameDef.id] || 0}
                    petState={currentUser.petState}
                    unlockedItems={currentUser.unlockedItems}
                    personalizedItems={personalizedItems}
                    onUpdatePet={(nextPet) => handleUpdateProfile({ petState: nextPet })}
                    onBackToArcade={() => {
                      handleLaunchGame(null);
                    }}
                    onGameComplete={(gId, score, xp, coins, details) =>
                      handleRecordMatch(gId, 'single', 'win', score, xp, coins, details)
                    }
                  />
                ) : !activeCouple ? (
                  /* Mandatory Couple Pairing Gate for 1v1 and 2v2 Multiplayer */
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-stone-900 p-8 text-center">
                    <HeartHandshake className="h-12 w-12 text-rose-400" />
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-100">
                      Couple Pairing is Mandatory for {activeGameDef.title} (1v1 &amp; 2v2 Multiplayer)
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-300">
                      To access <strong>1v1 Mode</strong> or{' '}
                      <strong>2v2 Couple Mode</strong>, both partners must have registered individual accounts and be actively paired through the Couple Account Pairing system.
                    </p>
                    <div className="mt-4 max-w-xl text-left text-xs text-stone-300">
                      <div className="font-bold text-stone-100">Multiplayer Access Rules:</div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                        <li>
                          <strong>1v1 Multiplayer Mode:</strong> Mandatory active Couple Pairing. Invite players by username or play against your partner (+XP only · 0 Coins · 0 Trophies).
                        </li>
                        <li>
                          <strong>2v2 Couple Mode:</strong> Mandatory active Couple Pairing. Invite another couple or use Trophy-Based Automatic Couple Matchmaking (+XP · +Coins · +Couple Trophies).
                        </li>
                      </ul>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          handleLaunchGame(null);
                          setActiveSection('profile');
                        }}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
                      >
                        <HeartHandshake className="h-4 w-4" />
                        <span>Pair with Partner in Profile &amp; Couple</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleLaunchGame(null);
                          setActiveSection('multiplayer');
                        }}
                        className="flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-5 py-2.5 text-xs font-semibold text-stone-100 hover:border-amber-500"
                      >
                        <Users className="h-4 w-4" />
                        <span>Back to Multiplayer Lobby</span>
                      </button>
                    </div>
                  </div>
                ) : activeGameDef.id === 'chess' ? (
                  <ChessArena
                    playerName={currentUser.username}
                    partnerName={partnerDisplayName}
                    autostart={autostartGame}
                    roomGameState={activeRoom?.gameState}
                    onSyncRoomGameState={(nextGameState) => {
                      if (!activeRoom) return;
                      handlePersistRoom({
                        ...activeRoom,
                        gameState: {
                          ...activeRoom.gameState,
                          ...nextGameState,
                        },
                      });
                    }}
                    onBackToArcade={() => {
                      handleLaunchGame(null);
                    }}
                    onMatchFinished={(res, score, details) =>
                      handleRecordMatch('chess', '1v1', res, score, 30, 0, details)
                    }
                  />
                ) : (
                  <MultiplayerGameArena
                    key={`${activeGameDef.id}-${activeRoom?.mode || selectedMultiplayerMode}`}
                    gameId={activeGameDef.id}
                    playerName={currentUser.username}
                    partnerName={partnerDisplayName}
                    roomMode={activeRoom?.mode || selectedMultiplayerMode}
                    roomTeams={activeRoom?.teams || []}
                    roomGameState={activeRoom?.gameState}
                    onSyncRoomGameState={(nextGameState) => {
                      if (!activeRoom) return;
                      handlePersistRoom({
                        ...activeRoom,
                        gameState: {
                          ...activeRoom.gameState,
                          ...nextGameState,
                        },
                      });
                    }}
                    autostart={autostartGame}
                    personalizedItems={personalizedItems}
                    onBackToArcade={() => {
                      handleLaunchGame(null);
                    }}
                    onMatchFinished={(gId, mode, res, score, xp, coins, details) =>
                      handleRecordMatch(gId, mode, res, score, xp, coins, details)
                    }
                  />
                )}
              </div>

              {activeGameDef.collection === 'multiplayer' && (
                <div className="xl:col-span-4">
                  <VoiceAndLobbyDock
                    currentUser={currentUser}
                    sessionToken={sessionToken}
                    activeCouple={activeCouple}
                    activeRoom={activeRoom}
                    incomingInvitations={incomingInvitations}
                    preferredMode={selectedMultiplayerMode}
                    onRefreshInvitations={() => loadBootstrapData(currentUser.uid)}
                    onUpdateRoom={handlePersistRoom}
                    onStartRoomGame={(room) => {
                      handleLaunchGame(room.gameId, { autostart: true });
                    }}
                    onSelectGame={(nextId) => handleLaunchGame(nextId)}
                    onOpenCouplePairing={() => {
                      handleLaunchGame(null);
                      setActiveSection('profile');
                    }}
                    onVoiceAchievement={() => setVoiceJoinedOnce(true)}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ============================================================
                  SECTION 1: HOME DASHBOARD
                  ============================================================ */}
              {activeSection === 'home' && (
                <div className="space-y-8">
                  {/* Hero Split Working Sheet Header (Unboxed Clean Presentation) */}
                  <section className="relative overflow-visible border-b border-stone-800 pb-8 pt-2">
                    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                      <div className="flex flex-col justify-between lg:col-span-7">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="sketch-annotation text-sm font-semibold">
                              {activeCouple
                                ? `Paired Couple Sanctuary · ${activeCouple.coupleName}`
                                : 'Personalized Solo & Couple Multiplayer Working Sheet'}
                              {activeRoom ? ` · Room #${activeRoom.roomCode}` : ''}
                            </p>
                            {/* Small cluster of blue notes & pencil line drawing (unboxed) */}
                            <div className="sketch-annotation flex items-center gap-2 text-xs">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 36 24"
                                className="h-5 w-7 shrink-0 stroke-[#344c69]"
                                fill="none"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="5" width="30" height="15" rx="4" />
                                <circle cx="11" cy="12.5" r="2.2" />
                                <path d="M22 10h5M24.5 7.5v5" />
                              </svg>
                              <span>Note: 7 Solo + 14 Co-Op/1v1/2v2 sheets ready</span>
                            </div>
                          </div>

                          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-100 sm:text-5xl">
                            Welcome to Her Little Arcade,{' '}
                            <span className="sketch-highlight">{currentUser.username}</span>.
                          </h1>
                          {/* Irregular hand-drawn red underline */}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 340 14"
                            className="mt-1 h-3.5 w-64 text-[#9e3a2e]"
                            fill="none"
                          >
                            <path
                              d="M3 9.5C78 3.5 168 12.5 336 5.5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          </svg>

                          <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-300">
                            Enjoy 7 cozy single-player games or create and join real multiplayer rooms across 14 competitive, cooperative, and party games—supporting both 1v1 duels and 2v2 Couple Mode.
                          </p>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveSection('multiplayer')}
                            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
                          >
                            <Users className="h-4 w-4" />
                            <span>Create Room / Join Group</span>
                          </button>

                          {/* Hand-drawn arrow pointing toward the main action */}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 68 26"
                            className="hidden h-6 w-14 text-[#9e3a2e] sm:block"
                            fill="none"
                          >
                            <path
                              d="M64 15C44 21 25 18 6 12M6 12L15 6M6 12L14 20"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <button
                            type="button"
                            onClick={() => setActiveSection('profile')}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 whitespace-nowrap shrink-0"
                          >
                            <HeartHandshake className="h-4 w-4" />
                            <span>
                              {activeCouple ? 'View Couple Profile' : 'Pair with Partner'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLaunchGame('chess')}
                            className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-xs font-semibold text-stone-100 hover:border-amber-500/60 whitespace-nowrap shrink-0"
                          >
                            Play Chess
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-5">
                        <div className="sketch-photo-mount relative mx-auto max-w-md">
                          <span aria-hidden="true" className="sketch-tape" />
                          <img
                            src={HERO_BANNER_IMAGE}
                            alt="Cozy miniature tabletop arcade cabinet with two pastel controllers on an oak desk"
                            referrerPolicy="no-referrer"
                            className="h-60 w-full rounded object-cover"
                          />
                          <p className="sketch-annotation mt-2 text-center text-xs">
                            Fig 1. Shared tabletop cabinet &amp; two-player controls
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Drawn Bracket + 4-Column Real Player & Couple Telemetry Strip */}
                  <section className="space-y-2">
                    <div className="flex flex-col items-center">
                      <span className="sketch-annotation text-xs font-semibold">
                        Live Notebook Tally (PostgreSQL Verified)
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 600 22"
                        className="h-5 w-full max-w-2xl text-[#514d44]"
                        fill="none"
                      >
                        <path
                          d="M6 20C10 8 275 11 300 3C325 11 590 8 594 20"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="gsap-stagger-card rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                        <div className="text-xs text-stone-400">Your Personal Record</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-stone-100 tabular-nums">
                          {currentUser.wins}W · {currentUser.losses}L
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                          {myGameRecords.length} Matches Played
                        </div>
                      </div>

                      <div className="gsap-stagger-card rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                        <div className="text-xs text-stone-400">Player Level &amp; XP</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
                          Lv.{levelMetrics.level} · {currentUser.xp} XP
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                          {200 - levelMetrics.currentLevelXp} XP to next level
                        </div>
                      </div>

                      <div className="gsap-stagger-card rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                        <div className="text-xs text-stone-400">Arcade Coin Vault</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-teal-300 tabular-nums">
                          {currentUser.coins} Coins
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                          {currentUser.unlockedItems.length} Cosmetics Unlocked
                        </div>
                      </div>

                      <div className="gsap-stagger-card rounded-2xl border border-stone-800 bg-stone-900/80 p-4">
                        <div className="text-xs text-stone-400">Couple Pairing Status</div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold text-rose-300 tabular-nums">
                          <HeartHandshake className="h-5 w-5 text-rose-400 shrink-0" />
                          <span className="truncate">
                            {activeCouple && pairedPartnerProfile
                              ? pairedPartnerProfile.username
                              : 'Unpaired'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400">
                          {activeCouple
                            ? `Couple Lv.${activeCouple.combinedLevel} · ${activeCouple.coupleWins}W`
                            : 'Pair in Profile to unlock 2v2'}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Featured Games & Daily Challenges Split */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <section className="space-y-4 lg:col-span-7">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-stone-100">Featured Arcade Games</h2>
                        <button
                          type="button"
                          onClick={() => setActiveSection('our-games')}
                          className="text-xs font-semibold text-amber-400 hover:underline"
                        >
                          Browse All 21 Games
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {ALL_ARCADE_GAMES.filter((g) =>
                          [
                            'chess',
                            'virtual-pet',
                            'memory-match',
                            'cooking-together',
                            'quiz-battle',
                            '2048-puzzle',
                          ].includes(g.id)
                        ).map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            isFavorite={currentUser.favoriteGames.includes(game.id)}
                            personalBest={personalBestByGame[game.id]}
                            onPlay={() => handlePlayGameClick(game)}
                            onPlayMode={(m) => handlePlayGameClick(game, m)}
                            onToggleFav={() => toggleFavoriteGame(game.id)}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Daily, Weekly & Monthly Challenges */}
                    <div className="lg:col-span-5">
                      <ChallengesVaultPanel
                        challenges={challenges}
                        challengeHistory={challengeHistory}
                        periodWindows={challengePeriodWindows}
                        streak={currentUser.streak}
                        claimingKey={claimingChallengeKey}
                        compact={true}
                        onPlayGame={(gId) => handleLaunchGame(gId)}
                        onClaimChallenge={handleClaimChallenge}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SECTION 2: SINGLE PLAYER (7 Games)
                  ============================================================ */}
              {activeSection === 'single' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                        Single-Player Sanctuary (7 Games · No Partner Required)
                      </h1>
                      <p className="mt-1 text-xs text-stone-400">
                        Access all 7 single-player games independently without account pairing. Your scores, XP, achievements, and statistics are saved directly to your individual account.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {SINGLE_PLAYER_GAMES.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        isFavorite={currentUser.favoriteGames.includes(game.id)}
                        personalBest={personalBestByGame[game.id]}
                        onPlay={() => handleLaunchGame(game.id)}
                        onToggleFav={() => toggleFavoriteGame(game.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================
                  SECTION 3: MULTIPLAYER & COMPETITIVE RANKING (1v1, 2v2, Rooms, Matchmaking, Invitations, Lobby, Voice, 2v2 Trophy Road & 2v2 Couple Leaderboard)
                  ============================================================ */}
              {activeSection === 'multiplayer' && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="space-y-5 xl:col-span-8">
                    <div className="space-y-3 border-b border-stone-800 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                            Multiplayer Arcade (1v1 &amp; 2v2 Modes)
                          </h1>
                          <p className="mt-1 text-xs text-stone-400">
                            Couple pairing is required for all 1v1 and 2v2 multiplayer modes. Coins, Couple Trophies, Trophy Road, and Couple Leaderboard are exclusive to 2v2 matches.
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {activeCouple
                            ? `♥ ${activeCouple.coupleName} · 🏆 ${activeCouple.coupleTrophies ?? 0} Trophies`
                            : 'Unpaired (Pair in Profile to unlock 1v1 & 2v2)'}
                        </span>
                      </div>

                      {/* Multiplayer-Only Navigation Bar (Strict Section 6 Compliance: Zero Single-Player / Solo items) */}
                      <nav
                        aria-label="Multiplayer Navigation"
                        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-800 bg-stone-900/95 p-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => setMultiplayerFilter('all')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                            multiplayerFilter === 'all'
                              ? 'bg-stone-100 text-stone-950'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          All 1v1 &amp; 2v2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiplayerFilter('1v1');
                            setSelectedMultiplayerMode('1v1');
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                            multiplayerFilter === '1v1'
                              ? 'bg-amber-500 text-stone-950'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          1v1 Games (14)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiplayerFilter('2v2');
                            setSelectedMultiplayerMode('2v2');
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                            multiplayerFilter === '2v2'
                              ? 'bg-rose-500 text-stone-950'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          2v2 Couple Games (10)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedDockTab('create')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            requestedDockTab === 'create'
                              ? 'border border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          Create Room
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedDockTab('join')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            requestedDockTab === 'join'
                              ? 'border border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          Join Group
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedDockTab('matchmake')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            requestedDockTab === 'matchmake'
                              ? 'border border-rose-400 bg-rose-500/20 text-rose-200'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          Matchmaking (2v2)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedDockTab('invite')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            requestedDockTab === 'invite'
                              ? 'border border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                          }`}
                        >
                          Invitations
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('multiplayer-lobby-panel');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                        >
                          Multiplayer Lobby
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('multiplayer-voice-panel');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                        >
                          Voice Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => setMultiplayerFilter('trophy-road')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                            multiplayerFilter === 'trophy-road'
                              ? 'bg-amber-500 text-stone-950'
                              : 'text-amber-300 hover:bg-stone-800'
                          }`}
                        >
                          Couple Trophy Road (2v2)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMultiplayerFilter('couple-leaderboard')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                            multiplayerFilter === 'couple-leaderboard'
                              ? 'bg-rose-500 text-stone-950'
                              : 'text-rose-300 hover:bg-stone-800'
                          }`}
                        >
                          Couple Leaderboard (2v2)
                        </button>
                      </nav>
                    </div>

                    {/* 1v1 vs 2v2 Final Rules Table (Clean Unboxed Layout) */}
                    <div className="overflow-x-auto border-b border-stone-800 pb-4 text-xs">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-stone-100">
                          Multiplayer Modes &amp; Competitive Ranking Rules (1v1 vs 2v2)
                        </span>
                        <span className="font-mono text-[11px] text-stone-400">
                          Rename Card: 10,000 Coins · New Users Start with 0 Coins
                        </span>
                      </div>
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-400">
                            <th className="py-1.5 pr-3 font-semibold">Feature</th>
                            <th className="py-1.5 px-3 font-semibold text-amber-300">1v1 Mode</th>
                            <th className="py-1.5 pl-3 font-semibold text-rose-300">2v2 Mode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/70 text-stone-200">
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Multiplayer gameplay</td>
                            <td className="py-1.5 px-3 text-emerald-400">Yes (2 paired players)</td>
                            <td className="py-1.5 pl-3 text-emerald-400">Yes (2 active couples)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Couple pairing required</td>
                            <td className="py-1.5 px-3 font-semibold text-rose-300">Yes</td>
                            <td className="py-1.5 pl-3 font-semibold text-rose-300">Yes</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Username invitations</td>
                            <td className="py-1.5 px-3 text-emerald-400">Yes (Invite player or partner)</td>
                            <td className="py-1.5 pl-3 text-emerald-400">Yes (Invite another couple)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Automatic couple matchmaking</td>
                            <td className="py-1.5 px-3 text-stone-400">No</td>
                            <td className="py-1.5 pl-3 font-semibold text-emerald-400">Yes (Trophy-based)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">XP</td>
                            <td className="py-1.5 px-3 text-amber-300">Yes</td>
                            <td className="py-1.5 pl-3 text-amber-300">Yes</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Coins</td>
                            <td className="py-1.5 px-3 text-stone-400">No (0 Coins)</td>
                            <td className="py-1.5 pl-3 font-semibold text-teal-300">Yes (+25 Win / +12 Draw / +8 Loss)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Trophies</td>
                            <td className="py-1.5 px-3 text-stone-400">No (0 Trophies)</td>
                            <td className="py-1.5 pl-3 font-semibold text-amber-300">Yes (+30 Win / +6 Draw / -15 Loss)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Trophy Road</td>
                            <td className="py-1.5 px-3 text-stone-400">No</td>
                            <td className="py-1.5 pl-3 font-semibold text-emerald-300">Yes (2v2 Exclusive)</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 pr-3 font-semibold">Couple leaderboard</td>
                            <td className="py-1.5 px-3 text-stone-400">No</td>
                            <td className="py-1.5 pl-3 font-semibold text-emerald-300">Yes (2v2 Exclusive)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* VIEW A: 1V1 GAMES & 2V2 COUPLE GAMES LISTED ACCORDINGLY */}
                    {(multiplayerFilter === 'all' ||
                      multiplayerFilter === '1v1' ||
                      multiplayerFilter === '2v2') && (
                      <div className="space-y-8">
                        {/* 1v1 MULTIPLAYER GAMES SECTION */}
                        {(multiplayerFilter === 'all' || multiplayerFilter === '1v1') && (
                          <section aria-labelledby="mp-1v1-games-heading" className="space-y-5">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2
                                  id="mp-1v1-games-heading"
                                  className="text-lg font-bold tracking-tight text-amber-300"
                                >
                                  1v1 Multiplayer Games (14 Games · Head-to-Head Duels)
                                </h2>
                                <span className="font-mono text-xs text-stone-400">
                                  Couple Pairing Required · Username Invites · +XP Only (0 Coins · 0 🏆)
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-stone-300">
                                Play 1v1 head-to-head against your paired partner or invite any paired player by username. Includes 4 classic 1v1-exclusive strategy board games and 10 head-to-head party, trivia, word, drawing, and co-op games.
                              </p>
                            </div>

                            {/* 1v1 Sub-Group A: 1v1 Exclusive Board & Strategy Games (4) */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                                  1v1 Exclusive Strategy &amp; Board Duels (4 Games — 1v1 Mode Only)
                                </h3>
                                <span className="font-mono text-[11px] text-stone-400">
                                  Games 01–04 · 1v1 Head-to-Head
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {MULTIPLAYER_1V1_EXCLUSIVE_GAMES.map((game) => (
                                    <GameCard
                                    key={`1v1-excl-${game.id}`}
                                    game={game}
                                    forcedMultiplayerMode="1v1"
                                    isFavorite={currentUser.favoriteGames.includes(game.id)}
                                    personalBest={personalBestByGame[game.id]}
                                    onPlay={() => handlePlayGameClick(game, '1v1')}
                                    onPlayMode={(m) => handlePlayGameClick(game, m)}
                                    onToggleFav={() => toggleFavoriteGame(game.id)}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* 1v1 Sub-Group B: 1v1 Party, Trivia, Word, Drawing & Co-Op Duels (10) */}
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                                  1v1 Party, Trivia, Word, Drawing &amp; Partner Co-Op Games (10 Games in 1v1 Mode)
                                </h3>
                                <span className="font-mono text-[11px] text-stone-400">
                                  Games 05–14 · Launches in 1v1 Mode
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {MULTIPLAYER_2V2_COUPLE_GAMES.map((game) => (
                                  <GameCard
                                    key={`1v1-shared-${game.id}`}
                                    game={game}
                                    forcedMultiplayerMode="1v1"
                                    isFavorite={currentUser.favoriteGames.includes(game.id)}
                                    personalBest={personalBestByGame[game.id]}
                                    onPlay={() => handlePlayGameClick(game, '1v1')}
                                    onPlayMode={(m) => handlePlayGameClick(game, m)}
                                    onToggleFav={() => toggleFavoriteGame(game.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          </section>
                        )}

                        {/* 2v2 COUPLE MODE GAMES SECTION */}
                        {(multiplayerFilter === 'all' || multiplayerFilter === '2v2') && (
                          <section aria-labelledby="mp-2v2-games-heading" className="space-y-5">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2
                                  id="mp-2v2-games-heading"
                                  className="text-lg font-bold tracking-tight text-rose-300"
                                >
                                  2v2 Couple Mode Games (10 Games · Couple vs Couple Team Battles)
                                </h2>
                                <span className="font-mono text-xs text-rose-300">
                                  Trophy Matchmaking &amp; Couple Invites · +XP, +Coins &amp; +🏆 Trophies
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-stone-300">
                                Team up with your paired partner against another couple via Trophy-Based Automatic Matchmaking or Couple Invitations. Only 2v2 matches award Arcade Coins (+25 Win / +12 Draw / +8 Loss) and Couple Trophies (+30 Win / +6 Draw / -15 Loss) toward Trophy Road and the Couple Leaderboard!
                              </p>
                            </div>

                            {/* 2v2 Sub-Group A: 2v2 Party, Trivia, Word & Drawing Couple Battles (6) */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                                  2v2 Party, Trivia, Word &amp; Drawing Couple Battles (6 Games)
                                </h3>
                                <span className="font-mono text-[11px] text-stone-400">
                                  Games 05–10 · Launches in 2v2 Couple Mode
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {MULTIPLAYER_2V2_COUPLE_GAMES.filter(
                                  (g) => g.category !== 'cooperative'
                                ).map((game) => (
                                  <GameCard
                                    key={`2v2-party-${game.id}`}
                                    game={game}
                                    forcedMultiplayerMode="2v2"
                                    isFavorite={currentUser.favoriteGames.includes(game.id)}
                                    personalBest={personalBestByGame[game.id]}
                                    onPlay={() => handlePlayGameClick(game, '2v2')}
                                    onPlayMode={(m) => handlePlayGameClick(game, m)}
                                    onToggleFav={() => toggleFavoriteGame(game.id)}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* 2v2 Sub-Group B: 2v2 Cooperative Couple Team Games (4) */}
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">
                                  2v2 Cooperative Couple Team Challenges (4 Games)
                                </h3>
                                <span className="font-mono text-[11px] text-stone-400">
                                  Games 11–14 · Launches in 2v2 Couple Mode
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {MULTIPLAYER_2V2_COUPLE_GAMES.filter(
                                  (g) => g.category === 'cooperative'
                                ).map((game) => (
                                  <GameCard
                                    key={`2v2-coop-${game.id}`}
                                    game={game}
                                    forcedMultiplayerMode="2v2"
                                    isFavorite={currentUser.favoriteGames.includes(game.id)}
                                    personalBest={personalBestByGame[game.id]}
                                    onPlay={() => handlePlayGameClick(game, '2v2')}
                                    onPlayMode={(m) => handlePlayGameClick(game, m)}
                                    onToggleFav={() => toggleFavoriteGame(game.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          </section>
                        )}
                      </div>
                    )}

                    {/* VIEW B: COUPLE TROPHY ROAD (2V2 ONLY) */}
                    {multiplayerFilter === 'trophy-road' && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                              2v2 Couple Trophy Road (Exclusive to 2v2 Gameplay)
                            </div>
                            <h2 className="mt-1 text-xl font-bold text-stone-100">
                              {activeCouple
                                ? `${activeCouple.coupleName} · 🏆 ${activeCouple.coupleTrophies ?? 0} Couple Trophies`
                                : 'Pair with a Partner to Unlock the 2v2 Couple Trophy Road'}
                            </h2>
                            <p className="mt-1 text-xs text-stone-400">
                              Only completed 2v2 couple matches contribute to Trophy Road progression. Unlock shared Couple Titles, Banners, Avatars, Decorations, and Themes!
                            </p>
                          </div>
                          {activeCouple && (
                            <div className="text-right font-mono text-xs tabular-nums">
                              <div className="text-stone-400">Peak 2v2 Trophies</div>
                              <div className="mt-0.5 text-lg font-bold text-amber-300">
                                🏆 {activeCouple.highestTrophies ?? 0}
                              </div>
                            </div>
                          )}
                        </div>

                        {rewardStatusBanner && (
                          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">
                            {rewardStatusBanner}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {TROPHY_ROAD_MILESTONES.map((ms) => {
                            const currentTrophies = Math.max(
                              activeCouple?.coupleTrophies ?? 0,
                              activeCouple?.highestTrophies ?? 0
                            );
                            let claimedList: string[] = [];
                            try {
                              claimedList = JSON.parse(
                                activeCouple?.claimedTrophyMilestones || '[]'
                              );
                            } catch {
                              claimedList = [];
                            }
                            const isClaimed = claimedList.includes(ms.id);
                            const isEligible = Boolean(
                              activeCouple && currentTrophies >= ms.trophiesRequired
                            );

                            return (
                              <div
                                key={ms.id}
                                className={`flex flex-col justify-between rounded-2xl border p-4 ${
                                  isClaimed
                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                    : isEligible
                                    ? 'border-amber-400 bg-amber-500/10'
                                    : 'border-stone-800 bg-stone-900/80'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                                      🏆 {ms.trophiesRequired} Trophies
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase text-stone-400">
                                      {ms.rewardType.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <h3 className="mt-1.5 text-sm font-bold text-stone-100">
                                    {ms.title}
                                  </h3>
                                  <p className="mt-0.5 text-xs font-semibold text-rose-300">
                                    Reward: {ms.rewardName}
                                  </p>
                                  <p className="mt-1 text-xs text-stone-400">{ms.description}</p>
                                </div>

                                <div className="mt-4 pt-2">
                                  {isClaimed ? (
                                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-200">
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Milestone Claimed</span>
                                    </div>
                                  ) : isEligible ? (
                                    <button
                                      type="button"
                                      disabled={pendingMilestoneId === ms.id}
                                      onClick={() => handleClaimTrophyMilestone(ms.id)}
                                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60"
                                    >
                                      {pendingMilestoneId === ms.id ? (
                                        <ArcadeInlineSpinner size={14} label="Claiming Milestone..." />
                                      ) : (
                                        <span>Claim Milestone Reward</span>
                                      )}
                                    </button>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 py-2 font-mono text-xs text-stone-500 tabular-nums">
                                      <Lock className="h-3.5 w-3.5" />
                                      <span>
                                        {currentTrophies}/{ms.trophiesRequired} 🏆
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* VIEW C: COUPLE LEADERBOARD (2V2 ONLY) */}
                    {multiplayerFilter === 'couple-leaderboard' && (
                      <div className="space-y-5">
                        <SeasonalLeaderboardAndBracketPanel
                          seasonState={seasonState}
                          activeCouple={activeCouple}
                          isUpdatingSeason={isUpdatingSeason}
                          onUpdateBracketConfig={handleUpdateSeasonBracket}
                          onConcludeSeasonNow={handleConcludeSeasonNow}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3 text-xs">
                          <div>
                            <div className="font-bold text-stone-100">
                              2v2 Couple Leaderboard (Ranked Exclusively by Active Season 2v2 Trophies)
                            </div>
                            <p className="mt-0.5 text-stone-400">
                              1v1 and single-player scores are never included. Win: +30 🏆 · Draw: +6 🏆 · Loss: -15 🏆
                            </p>
                          </div>

                          <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
                            {(
                              [
                                { id: 'global', label: 'Seasonal' },
                                { id: 'weekly', label: 'Weekly' },
                                { id: 'monthly', label: 'Monthly' },
                              ] as const
                            ).map((period) => (
                              <button
                                key={period.id}
                                type="button"
                                onClick={() => setCoupleLeaderboardPeriod(period.id)}
                                className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                                  coupleLeaderboardPeriod === period.id
                                    ? 'bg-rose-500 text-stone-950'
                                    : 'text-stone-400 hover:text-stone-200'
                                }`}
                              >
                                {period.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/90">
                          {couplesLeaderboard.length === 0 ? (
                            <div className="p-8 text-center text-xs text-stone-400">
                              No active couples ranked yet. Pair with your partner and complete a 2v2 match to appear on the Couple Leaderboard!
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-stone-800 bg-stone-950 text-stone-400">
                                <tr>
                                  <th className="px-4 py-3">Rank</th>
                                  <th className="px-4 py-3">Couple Name &amp; Skin</th>
                                  <th className="px-4 py-3">Both Partners (Avatars &amp; Usernames)</th>
                                  <th className="px-4 py-3 text-right">
                                    {coupleLeaderboardPeriod === 'weekly'
                                      ? 'Weekly 2v2 Trophies'
                                      : coupleLeaderboardPeriod === 'monthly'
                                      ? 'Monthly 2v2 Trophies'
                                      : 'Seasonal 2v2 Trophies'}
                                  </th>
                                  <th className="px-4 py-3 text-right">2v2 Record</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-800/60 font-mono tabular-nums">
                                {[...couplesLeaderboard]
                                  .sort((a, b) => {
                                    const tA =
                                      coupleLeaderboardPeriod === 'weekly'
                                        ? (a.weeklyTrophies ?? a.coupleTrophies ?? 0)
                                        : coupleLeaderboardPeriod === 'monthly'
                                        ? (a.monthlyTrophies ?? a.coupleTrophies ?? 0)
                                        : (a.coupleTrophies ?? 0);
                                    const tB =
                                      coupleLeaderboardPeriod === 'weekly'
                                        ? (b.weeklyTrophies ?? b.coupleTrophies ?? 0)
                                        : coupleLeaderboardPeriod === 'monthly'
                                        ? (b.monthlyTrophies ?? b.coupleTrophies ?? 0)
                                        : (b.coupleTrophies ?? 0);
                                    if (tB !== tA) return tB - tA;
                                    return b.coupleWins - a.coupleWins;
                                  })
                                  .map((c, idx) => {
                                    const displayedTrophies =
                                      coupleLeaderboardPeriod === 'weekly'
                                        ? (c.weeklyTrophies ?? c.coupleTrophies ?? 0)
                                        : coupleLeaderboardPeriod === 'monthly'
                                        ? (c.monthlyTrophies ?? c.coupleTrophies ?? 0)
                                        : (c.coupleTrophies ?? 0);
                                    const isMyCouple = activeCouple?.id === c.id;
                                    const cpSkin = getSkinById(c.equippedCoupleSkin);
                                    return (
                                      <tr
                                        key={c.id}
                                        className={`hover:bg-stone-800/40 ${
                                          isMyCouple ? 'bg-amber-500/5' : ''
                                        }`}
                                      >
                                        <td className="px-4 py-3 font-bold text-rose-300">
                                          #{idx + 1}
                                        </td>
                                        <td className="px-4 py-3 font-sans">
                                          <div className="flex flex-wrap items-center gap-1.5 font-bold text-stone-100">
                                            <span>{c.coupleName || `Couple #${c.pairingCode}`}</span>
                                            {cpSkin && (
                                              <span
                                                className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${cpSkin.badgeClass}`}
                                              >
                                                {cpSkin.icon} {cpSkin.name}
                                              </span>
                                            )}
                                            {isMyCouple && (
                                              <span className="text-[11px] text-amber-300">
                                                (Your Couple)
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-rose-300">
                                            {c.coupleTitle || 'Newcomer Duo'}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 font-sans text-stone-200">
                                          {getAvatarEmoji(c.requesterProfile?.avatar || 'kitsune')}{' '}
                                          @{c.requesterProfile?.username || 'Partner1'} &amp;{' '}
                                          {getAvatarEmoji(c.partnerProfile?.avatar || 'star-cat')}{' '}
                                          @{c.partnerProfile?.username || 'Partner2'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-amber-300">
                                          🏆 {displayedTrophies}
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-300">
                                          {c.coupleWins}W - {c.coupleLosses}L - {c.coupleDraws}D
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-4">
                    <VoiceAndLobbyDock
                      currentUser={currentUser}
                      sessionToken={sessionToken}
                      activeCouple={activeCouple}
                      activeRoom={activeRoom}
                      incomingInvitations={incomingInvitations}
                      requestedLobbyTab={requestedDockTab}
                      preferredMode={
                        multiplayerFilter === '2v2' ? '2v2' : selectedMultiplayerMode
                      }
                      onLobbyTabChange={(tab) => setRequestedDockTab(tab)}
                      onRefreshInvitations={() => loadBootstrapData(currentUser.uid)}
                      onUpdateRoom={handlePersistRoom}
                      onStartRoomGame={(room) => {
                        handleLaunchGame(room.gameId, { autostart: true });
                      }}
                      onSelectGame={(gId) => handleLaunchGame(gId)}
                      onOpenCouplePairing={() => {
                        handleLaunchGame(null);
                        setActiveSection('profile');
                      }}
                      onVoiceAchievement={() => setVoiceJoinedOnce(true)}
                    />
                  </div>
                </div>
              )}

              {/* ============================================================
                  SECTION 4: ACHIEVEMENTS & COMPLETE 21-GAME COLLECTION + PERSONALIZED STUDIO
                  ============================================================ */}
              {(activeSection === 'achievements' || activeSection === 'our-games') && (
                <div className="space-y-8">
                  {/* Daily, Weekly & Monthly Challenges Full Vault */}
                  <ChallengesVaultPanel
                    challenges={challenges}
                    challengeHistory={challengeHistory}
                    periodWindows={challengePeriodWindows}
                    streak={currentUser.streak}
                    claimingKey={claimingChallengeKey}
                    compact={false}
                    onPlayGame={(gId) => handleLaunchGame(gId)}
                    onClaimChallenge={handleClaimChallenge}
                  />

                  {/* Individual & Couple Achievements Section */}
                  <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                          Individual &amp; Couple Achievements
                        </h1>
                        <p className="mt-1 text-xs text-stone-400">
                          Unlock milestones across Single-Player, 1v1 Duels, 2v2 Couple Mode, Couple Pairing, and Personalized Keepsakes.
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {
                          ACHIEVEMENTS.filter(
                            (ach) =>
                              (ach.conditionType === 'games_played' && myGameRecords.length >= 1) ||
                              (ach.conditionType === 'couple_paired' && Boolean(activeCouple)) ||
                              (ach.conditionType === 'chess_win' &&
                                myGameRecords.some((r) => r.gameId === 'chess')) ||
                              (ach.conditionType === 'custom_content' &&
                                personalizedItems.length >= 1) ||
                              (ach.conditionType === 'coop_win' &&
                                myGameRecords.some(
                                  (r) => r.mode === 'cooperative' || r.mode === '2v2_couple'
                                )) ||
                              (ach.conditionType === 'score_2048' &&
                                myGameRecords.some((r) => r.score >= 500)) ||
                              (ach.conditionType === 'voice_joined' && voiceJoinedOnce)
                          ).length
                        }{' '}
                        / {ACHIEVEMENTS.length} Unlocked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ACHIEVEMENTS.map((ach) => {
                        const unlocked =
                          (ach.conditionType === 'games_played' && myGameRecords.length >= 1) ||
                          (ach.conditionType === 'couple_paired' && Boolean(activeCouple)) ||
                          (ach.conditionType === 'chess_win' &&
                            myGameRecords.some((r) => r.gameId === 'chess')) ||
                          (ach.conditionType === 'custom_content' &&
                            personalizedItems.length >= 1) ||
                          (ach.conditionType === 'coop_win' &&
                            myGameRecords.some(
                              (r) => r.mode === 'cooperative' || r.mode === '2v2_couple'
                            )) ||
                          (ach.conditionType === 'score_2048' &&
                            myGameRecords.some((r) => r.score >= 500)) ||
                          (ach.conditionType === 'voice_joined' && voiceJoinedOnce);

                        return (
                          <div
                            key={ach.id}
                            className={`gsap-stagger-card rounded-2xl border p-4 ${
                              unlocked
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-stone-800 bg-stone-900/50 opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-100">{ach.title}</span>
                              <span className="font-mono text-amber-300 tabular-nums">
                                +{ach.xpBonus} XP
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-stone-400">{ach.description}</p>
                            <div className="mt-2 text-[11px] font-semibold text-teal-300">
                              {unlocked ? '✓ Unlocked' : 'In Progress'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4 pt-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-stone-100">
                        Complete Arcade Collection (21 Games) &amp; Personalized Studio
                      </h2>
                      <p className="mt-1 text-xs text-stone-400">
                        7 Single-Player Games · 14 Multiplayer Games · Customized with your shared photos and questions.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search 21 games..."
                          aria-label="Search games"
                          className="rounded-lg border border-stone-800 bg-stone-900 py-1.5 pl-8 pr-3 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1">
                        {(
                          [
                            'all',
                            'single',
                            '1v1',
                            '2v2',
                            'competitive',
                            'cooperative',
                            'party',
                          ] as const
                        ).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCatalogFilter(cat)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
                              catalogFilter === cat
                                ? 'bg-amber-500 text-stone-950'
                                : 'text-stone-400 hover:text-stone-100'
                            }`}
                          >
                            {cat === 'single'
                              ? 'Single (7)'
                              : cat === '1v1'
                              ? '1v1 Games (14)'
                              : cat === '2v2'
                              ? '2v2 Games (10)'
                              : cat === 'all'
                              ? 'All (21)'
                              : cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ALL_ARCADE_GAMES.filter((g) => {
                      const matchesFilter =
                        catalogFilter === 'all' ||
                        (catalogFilter === 'single' && g.collection === 'single') ||
                        (catalogFilter === '1v1' && g.collection === 'multiplayer') ||
                        (catalogFilter === '2v2' &&
                          g.collection === 'multiplayer' &&
                          Boolean(g.supports2v2)) ||
                        g.category === catalogFilter;
                      const matchesSearch =
                        !searchQuery.trim() ||
                        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        g.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesFilter && matchesSearch;
                    }).map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        forcedMultiplayerMode={
                          catalogFilter === '2v2'
                            ? '2v2'
                            : catalogFilter === '1v1'
                            ? '1v1'
                            : undefined
                        }
                        isFavorite={currentUser.favoriteGames.includes(game.id)}
                        personalBest={personalBestByGame[game.id]}
                        onPlay={() => {
                          if (catalogFilter === '2v2' && game.supports2v2) {
                            handlePlayGameClick(game, '2v2');
                          } else if (game.collection === 'multiplayer') {
                            handlePlayGameClick(game, '1v1');
                          } else {
                            handlePlayGameClick(game);
                          }
                        }}
                        onPlayMode={(m) => handlePlayGameClick(game, m)}
                        onToggleFav={() => toggleFavoriteGame(game.id)}
                      />
                    ))}
                  </div>

                  {/* Personalized Games Content Studio (Clean Unboxed Section) */}
                  <section className="border-t border-stone-800 pt-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="lg:col-span-5">
                        <div className="flex items-center gap-2 text-amber-300">
                          <Sparkles className="h-4 w-4" />
                          <h2 className="text-base font-bold text-stone-100">
                            Personalized Games Studio
                          </h2>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-stone-400">
                          Add your own shared memories, custom Quiz Battle trivia questions, Truth or Dare prompts, and keepsake photo captions. When paired, your custom items are shared automatically with your partner!
                        </p>

                        <form onSubmit={handleAddPersonalizedContent} className="mt-4 space-y-3">
                          <div className="flex gap-2">
                            {(
                              [
                                { id: 'quiz_question', label: 'Quiz Question' },
                                { id: 'truth_or_dare', label: 'Truth or Dare' },
                                { id: 'memory_photo', label: 'Photo Keepsake' },
                              ] as const
                            ).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setCustomCategory(t.id)}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                                  customCategory === t.id
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                                    : 'border-stone-800 bg-stone-950 text-stone-400'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <div>
                            <label
                              htmlFor="custom-content-title"
                              className="block text-xs font-medium text-stone-300"
                            >
                              {customCategory === 'quiz_question'
                                ? 'Your Custom Question'
                                : customCategory === 'truth_or_dare'
                                ? 'Your Custom Truth or Dare Prompt'
                                : 'Memory Title / Caption'}
                            </label>
                            <input
                              id="custom-content-title"
                              type="text"
                              value={customTitle}
                              onChange={(e) => setCustomTitle(e.target.value)}
                              placeholder={
                                customCategory === 'quiz_question'
                                  ? 'e.g. Where did we go on our first weekend trip?'
                                  : customCategory === 'truth_or_dare'
                                  ? 'e.g. Share your favorite memory of us from this month!'
                                  : 'e.g. Evening Matcha Walk'
                              }
                              className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          {customCategory === 'quiz_question' && (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={customOptionA}
                                onChange={(e) => setCustomOptionA(e.target.value)}
                                placeholder="Correct Answer"
                                aria-label="Correct Answer"
                                className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs text-stone-100"
                              />
                              <input
                                type="text"
                                value={customOptionB}
                                onChange={(e) => setCustomOptionB(e.target.value)}
                                placeholder="Decoy Option"
                                aria-label="Decoy Option"
                                className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs text-stone-100"
                              />
                            </div>
                          )}

                          {customCategory === 'truth_or_dare' && (
                            <div className="flex gap-2">
                              {(['truth', 'dare'] as const).map((td) => (
                                <button
                                  key={td}
                                  type="button"
                                  onClick={() => setCustomPromptType(td)}
                                  className={`rounded-lg border px-3 py-1 text-xs font-semibold uppercase ${
                                    customPromptType === td
                                      ? 'border-teal-400 bg-teal-500/20 text-teal-200'
                                      : 'border-stone-800 bg-stone-950 text-stone-400'
                                  }`}
                                >
                                  {td}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isSavingCustomItem}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60"
                          >
                            {isSavingCustomItem ? (
                              <ArcadeInlineSpinner size={14} label="Saving Keepsake..." />
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>Save to Personalized Games</span>
                              </>
                            )}
                          </button>
                          {customStatusBanner && (
                            <p className="text-xs font-medium text-emerald-400">
                              {customStatusBanner}
                            </p>
                          )}
                        </form>
                      </div>

                      <div className="lg:col-span-7">
                        <h3 className="text-xs font-bold text-stone-400">
                          Your Saved Personalized Items ({personalizedItems.length})
                        </h3>
                        {personalizedItems.length === 0 ? (
                          <p className="mt-3 text-xs text-stone-400">
                            No custom questions, prompts, or photo keepsakes saved yet. Add your first item using the form on the left!
                          </p>
                        ) : (
                          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {personalizedItems.slice(0, 6).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs"
                              >
                                <div className="text-[11px] text-amber-300">
                                  {item.category.replace('_', ' ')}
                                </div>
                                <div className="mt-1 font-semibold text-stone-100">
                                  {item.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ============================================================
                  SECTION 5: 2V2 COUPLE LEADERBOARD & COUPLE TROPHY ROAD (Exclusive to 2v2)
                  ============================================================ */}
              {(activeSection === 'leaderboard' || activeSection === 'trophy-road') && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                        {activeSection === 'trophy-road'
                          ? '2v2 Couple Trophy Road'
                          : '2v2 Couple Leaderboard'}
                      </h1>
                      <p className="mt-1 text-xs text-stone-400">
                        Exclusive to 2v2 couple matches. 1v1 and single-player scores are never included in Couple Leaderboard rankings or Trophy Road progression.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1">
                        {(
                          [
                            {
                              id: 'couples',
                              label: `2v2 Couple Leaderboard (${couplesLeaderboard.length})`,
                              section: 'leaderboard' as const,
                            },
                            {
                              id: 'trophy-road',
                              label: `2v2 Trophy Road (${TROPHY_ROAD_MILESTONES.length})`,
                              section: 'trophy-road' as const,
                            },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setLeaderboardTab(t.id);
                              setActiveSection(t.section);
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              (activeSection === 'trophy-road'
                                ? t.id === 'trophy-road'
                                : leaderboardTab === t.id)
                                ? 'bg-amber-500 text-stone-950'
                                : 'text-stone-400 hover:text-stone-100'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {rewardStatusBanner && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">
                      {rewardStatusBanner}
                    </div>
                  )}

                  {/* TAB 1: Couple Leaderboard (Seasonal / Weekly / Monthly Ranked by Couple Trophies) */}
                  {leaderboardTab === 'couples' && (
                    <div className="space-y-5">
                      <SeasonalLeaderboardAndBracketPanel
                        seasonState={seasonState}
                        activeCouple={activeCouple}
                        isUpdatingSeason={isUpdatingSeason}
                        onUpdateBracketConfig={handleUpdateSeasonBracket}
                        onConcludeSeasonNow={handleConcludeSeasonNow}
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3 text-xs">
                        <div>
                          <div className="font-bold text-stone-100">
                            2v2 Couple Trophy Standings (Ranked by Active Season Shared Couple Trophies)
                          </div>
                          <p className="mt-0.5 text-stone-400">
                            2v2 Victory: <strong className="text-emerald-300">+30 🏆</strong> · 2v2 Draw:{' '}
                            <strong className="text-amber-300">+6 🏆</strong> · 2v2 Loss:{' '}
                            <strong className="text-rose-300">-15 🏆</strong> (Minimum 0 🏆 · Resets to 0 at Season End)
                          </p>
                        </div>

                        <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
                          {(
                            [
                              { id: 'global', label: 'Current Season' },
                              { id: 'weekly', label: 'Weekly' },
                              { id: 'monthly', label: 'Monthly' },
                            ] as const
                          ).map((period) => (
                            <button
                              key={period.id}
                              type="button"
                              onClick={() => setCoupleLeaderboardPeriod(period.id)}
                              className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                                coupleLeaderboardPeriod === period.id
                                  ? 'bg-rose-500 text-stone-950'
                                  : 'text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              {period.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/90">
                        {couplesLeaderboard.length === 0 ? (
                          <div className="p-8 text-center text-xs text-stone-400">
                            <p className="font-semibold text-stone-200">
                              No active Couple Pairings recorded yet.
                            </p>
                            <p className="mt-1">
                              Use <strong className="text-amber-300">Pair with Partner</strong> in your Profile section to link two registered accounts and compete in 2v2 matches!
                            </p>
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-stone-800 bg-stone-950 text-stone-400">
                              <tr>
                                <th className="px-4 py-3">Season Rank</th>
                                <th className="px-4 py-3">Couple Name, Skin &amp; Title</th>
                                <th className="px-4 py-3">Paired Partners</th>
                                <th className="px-4 py-3 text-right">
                                  {coupleLeaderboardPeriod === 'weekly'
                                    ? 'Weekly Trophies'
                                    : coupleLeaderboardPeriod === 'monthly'
                                    ? 'Monthly Trophies'
                                    : 'Seasonal Couple Trophies'}
                                </th>
                                <th className="px-4 py-3 text-right">Peak 🏆</th>
                                <th className="px-4 py-3 text-right">2v2 W-L-D</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/60 font-mono tabular-nums">
                              {[...couplesLeaderboard]
                                .sort((a, b) => {
                                  const tA =
                                    coupleLeaderboardPeriod === 'weekly'
                                      ? (a.weeklyTrophies ?? a.coupleTrophies ?? 0)
                                      : coupleLeaderboardPeriod === 'monthly'
                                      ? (a.monthlyTrophies ?? a.coupleTrophies ?? 0)
                                      : (a.coupleTrophies ?? 0);
                                  const tB =
                                    coupleLeaderboardPeriod === 'weekly'
                                      ? (b.weeklyTrophies ?? b.coupleTrophies ?? 0)
                                      : coupleLeaderboardPeriod === 'monthly'
                                      ? (b.monthlyTrophies ?? b.coupleTrophies ?? 0)
                                      : (b.coupleTrophies ?? 0);
                                  if (tB !== tA) return tB - tA;
                                  return b.coupleWins - a.coupleWins;
                                })
                                .map((c, idx) => {
                                  const displayedTrophies =
                                    coupleLeaderboardPeriod === 'weekly'
                                      ? (c.weeklyTrophies ?? c.coupleTrophies ?? 0)
                                      : coupleLeaderboardPeriod === 'monthly'
                                      ? (c.monthlyTrophies ?? c.coupleTrophies ?? 0)
                                      : (c.coupleTrophies ?? 0);
                                  const isMyCouple = activeCouple?.id === c.id;
                                  const cpSkin = getSkinById(c.equippedCoupleSkin);
                                  return (
                                    <tr
                                      key={c.id}
                                      className={`hover:bg-stone-800/40 ${
                                        isMyCouple ? 'bg-amber-500/5' : ''
                                      }`}
                                    >
                                      <td className="px-4 py-3 font-bold text-rose-300">
                                        #{idx + 1}
                                      </td>
                                      <td className="px-4 py-3 font-sans">
                                        <div className="flex flex-wrap items-center gap-1.5 font-bold text-stone-100">
                                          <span>{c.coupleName || `Couple #${c.pairingCode}`}</span>
                                          {cpSkin && (
                                            <span
                                              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${cpSkin.badgeClass}`}
                                            >
                                              {cpSkin.icon} {cpSkin.name}
                                            </span>
                                          )}
                                          {isMyCouple && (
                                            <span className="text-[11px] text-amber-300">
                                              (Your Couple)
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-rose-300">
                                          {c.coupleTitle || 'Newcomer Duo'} · Lv.{c.coupleLevel}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-sans text-stone-200">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex items-center gap-1.5">
                                            <AnimatedSkinnedAvatar
                                              avatarId={c.requesterProfile?.avatar || 'kitsune'}
                                              customPhotoUrl={c.requesterProfile?.customPhotoUrl || ''}
                                              skinId={c.requesterProfile?.equippedSkin || c.equippedCoupleSkin || 'skin-paper-kraft'}
                                              size="xs"
                                            />
                                            <span>@{c.requesterProfile?.username || 'Partner 1'}</span>
                                          </span>
                                          <span className="text-stone-500">&amp;</span>
                                          <span className="inline-flex items-center gap-1.5">
                                            <AnimatedSkinnedAvatar
                                              avatarId={c.partnerProfile?.avatar || 'star-cat'}
                                              customPhotoUrl={c.partnerProfile?.customPhotoUrl || ''}
                                              skinId={c.partnerProfile?.equippedSkin || c.equippedCoupleSkin || 'skin-paper-kraft'}
                                              size="xs"
                                            />
                                            <span>@{c.partnerProfile?.username || 'Partner 2'}</span>
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-right font-bold text-amber-300">
                                        🏆 {displayedTrophies}
                                      </td>
                                      <td className="px-4 py-3 text-right text-stone-400">
                                        {c.highestTrophies ?? displayedTrophies}
                                      </td>
                                      <td className="px-4 py-3 text-right text-emerald-300">
                                        {c.coupleWins}W - {c.coupleLosses}L - {c.coupleDraws}D
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Couple Trophy Road (Exclusive to 2v2) */}
                  {leaderboardTab === 'trophy-road' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            2v2 Couple Trophy Road Progression
                          </div>
                          <h2 className="mt-1 text-xl font-bold text-stone-100">
                            {activeCouple
                              ? `${activeCouple.coupleName} · 🏆 ${activeCouple.coupleTrophies ?? 0} Couple Trophies`
                              : 'Pair with a Partner to Unlock the 2v2 Couple Trophy Road'}
                          </h2>
                          <p className="mt-1 text-xs text-stone-400">
                            Win 2v2 Couple Matches (+30 🏆) to reach Trophy Road milestones and unlock exclusive Couple Titles, Banners, Avatars, Profile Decorations, and Themes for both partners!
                          </p>
                        </div>
                        {activeCouple && (
                          <div className="text-right font-mono text-xs tabular-nums">
                            <div className="text-stone-400">Highest Peak Trophies</div>
                            <div className="mt-0.5 text-lg font-bold text-amber-300">
                              🏆 {activeCouple.highestTrophies ?? 0}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {TROPHY_ROAD_MILESTONES.map((ms) => {
                          const currentTrophies = Math.max(
                            activeCouple?.coupleTrophies ?? 0,
                            activeCouple?.highestTrophies ?? 0
                          );
                          let claimedList: string[] = [];
                          try {
                            claimedList = JSON.parse(
                              activeCouple?.claimedTrophyMilestones || '[]'
                            );
                          } catch {
                            claimedList = [];
                          }
                          const isClaimed = claimedList.includes(ms.id);
                          const isEligible = Boolean(
                            activeCouple && currentTrophies >= ms.trophiesRequired
                          );

                          return (
                            <div
                              key={ms.id}
                              className={`gsap-stagger-card flex flex-col justify-between rounded-2xl border p-4 ${
                                isClaimed
                                  ? 'border-emerald-500/50 bg-emerald-500/10'
                                  : isEligible
                                  ? 'border-amber-400 bg-amber-500/10'
                                  : 'border-stone-800 bg-stone-900/80'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-amber-300 tabular-nums">
                                    🏆 {ms.trophiesRequired} Trophies
                                  </span>
                                  <span className="uppercase text-[10px] font-semibold text-stone-400">
                                    {ms.rewardType.replace('_', ' ')}
                                  </span>
                                </div>
                                <h3 className="mt-1.5 text-sm font-bold text-stone-100">
                                  {ms.title}
                                </h3>
                                <p className="mt-0.5 text-xs font-semibold text-rose-300">
                                  Reward: {ms.rewardName}
                                </p>
                                <p className="mt-1 text-xs text-stone-400">{ms.description}</p>
                              </div>

                              <div className="mt-4 pt-2">
                                {isClaimed ? (
                                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-200">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Milestone Claimed</span>
                                  </div>
                                ) : isEligible ? (
                                  <button
                                    type="button"
                                    disabled={pendingMilestoneId === ms.id}
                                    onClick={() => handleClaimTrophyMilestone(ms.id)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60"
                                  >
                                    {pendingMilestoneId === ms.id ? (
                                      <ArcadeInlineSpinner size={14} label="Claiming Milestone..." />
                                    ) : (
                                      <span>Claim Milestone Reward</span>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 py-2 font-mono text-xs text-stone-500 tabular-nums">
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>
                                      {currentTrophies}/{ms.trophiesRequired} 🏆
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  SECTION 6: SHOP — COINS, RENAME CARDS, COSMETICS & ACHIEVEMENTS
                  ============================================================ */}
              {(activeSection === 'shop' || activeSection === 'rewards') && (
                <div className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                        Arcade Shop — Coins, Official Rename Card &amp; Cosmetics
                      </h1>
                      <p className="mt-1 text-xs text-stone-400">
                        Coins are earned exclusively in 2v2 Couple Matches (0 starting balance). Spend coins on cosmetics or the 10,000-Coin Official Rename Card.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2 font-mono text-xs font-bold text-amber-300 tabular-nums">
                        <span>Rename Cards: {currentUser.renameCards ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-4 py-2 font-mono text-sm font-bold text-teal-300 tabular-nums">
                        <Coins className="h-4 w-4 text-amber-400" />
                        <span>{currentUser.coins.toLocaleString()} Coins Available</span>
                      </div>
                    </div>
                  </div>

                  {rewardStatusBanner && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-200">
                      {rewardStatusBanner}
                    </div>
                  )}

                  {/* Featured Official Rename Card (10,000 Coins) — Clean Unboxed Presentation */}
                  <section className="border-b border-stone-800 pb-6">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Identity &amp; Username Management · 10,000 Coins
                        </div>
                        <h2 className="mt-1 text-lg font-bold text-stone-100">
                          Official Rename Card ({RENAME_CARD_COST_COINS.toLocaleString()} Coins)
                        </h2>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-300">
                          Every player chooses their initial unique username for free during onboarding. Any subsequent username change requires <strong>1 Official Rename Card (10,000 Coins)</strong>. Your new username is validated for uniqueness and cascades automatically across your Couple Profile, Leaderboards, and Match History.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          disabled={pendingShopItemId === 'rename-card'}
                          onClick={() =>
                            handleBuyOrEquipShopItem(
                              'rename-card',
                              RENAME_CARD_COST_COINS,
                              'utility',
                              'rename-card'
                            )
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60"
                        >
                          {pendingShopItemId === 'rename-card' ? (
                            <ArcadeInlineSpinner size={14} label="Purchasing Rename Card..." />
                          ) : (
                            <span>Buy Rename Card ({RENAME_CARD_COST_COINS.toLocaleString()} Coins)</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthModalOpen(true)}
                          className="rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2.5 text-xs font-bold text-teal-200 hover:bg-teal-500/25"
                        >
                          Use Rename Card ({currentUser.renameCards ?? 0} Owned)
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* 5-Tier Chests & Keys Boutique + Banners + Unified 4-Category Inventory */}
                  <CosmeticChestShopAndInventorySuite
                    player={currentUser}
                    activeCouple={activeCouple}
                    chestOpenings={chestOpenings}
                    onBuyChest={handleBuyChest}
                    onOpenChest={handleOpenChest}
                    onPurchaseSkin={(skinId) => {
                      const skin = getSkinById(skinId);
                      if (skin) return handlePurchaseSkin(skin);
                      return Promise.resolve();
                    }}
                    onEquipSkin={handleEquipSkin}
                    onPurchaseBanner={handlePurchaseBanner}
                    onEquipBanner={handleEquipBanner}
                    onOpenPhotoStudio={() => setPhotoModalOpen(true)}
                  />

                  {/* 5-Rarity Equippable Skins Vault & Live Preview */}
                  <SkinsBoutiqueAndVaultPanel
                    currentUser={currentUser}
                    activeCouple={activeCouple}
                    pendingSkinActionId={pendingShopItemId}
                    onPurchaseSkin={handlePurchaseSkin}
                    onEquipSkin={handleEquipSkin}
                  />

                  {/* Cosmetic Unlockables Boutique */}
                  <section className="space-y-4">
                    <h2 className="text-base font-bold text-stone-100">
                      Avatars, Themes, Pet Accessories &amp; Utility Unlockables
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {REWARD_SHOP_ITEMS.filter((item) => item.category !== 'skin').map((item) => {
                        const isRename = item.id === 'rename-card';
                        const isOwned =
                          !isRename &&
                          (currentUser.unlockedItems.includes(item.id) || item.costCoins === 0);
                        const isEquipped =
                          !isRename &&
                          (currentUser.avatar === item.previewCode ||
                            currentUser.theme === item.previewCode ||
                            currentUser.petState.accessory === item.previewCode);

                        return (
                          <div
                            key={item.id}
                            className="gsap-stagger-card flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900/90 p-4"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs text-stone-400">
                                <span className="capitalize">{item.category}</span>
                                <span className="font-mono font-semibold text-amber-300 tabular-nums">
                                  {item.costCoins === 0
                                    ? 'Starter'
                                    : `${item.costCoins.toLocaleString()} Coins`}
                                </span>
                              </div>
                              <h3 className="mt-1.5 text-sm font-bold text-stone-100">
                                {item.name}
                              </h3>
                              <p className="mt-1 text-xs text-stone-400">{item.description}</p>
                            </div>

                            <button
                              type="button"
                              disabled={pendingShopItemId === item.id}
                              onClick={() =>
                                handleBuyOrEquipShopItem(
                                  item.id,
                                  item.costCoins,
                                  item.category,
                                  item.previewCode
                                )
                              }
                              className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                                isEquipped
                                  ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                                  : isOwned
                                  ? 'bg-stone-800 text-stone-100 hover:bg-stone-700'
                                  : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                              }`}
                            >
                              {pendingShopItemId === item.id ? (
                                <ArcadeInlineSpinner size={14} label="Updating Vault..." />
                              ) : isEquipped ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Equipped</span>
                                </>
                              ) : isOwned ? (
                                <span>Equip {item.category}</span>
                              ) : (
                                <>
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>
                                    {isRename
                                      ? `Purchase (${item.costCoins.toLocaleString()} Coins)`
                                      : `Unlock (${item.costCoins.toLocaleString()} Coins)`}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Server-Validated Coin Transaction Ledger */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-stone-100">
                        Verified Coin Transaction Ledger (2v2 Matches &amp; Shop)
                      </h2>
                      <span className="font-mono text-xs text-stone-400">
                        Starting Balance: 0 Coins · No Registration Bonus
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/90">
                      {coinTransactions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-stone-400">
                          No coin transactions recorded yet. Your account begins with <strong>0 Coins</strong>. Complete <strong>2v2 Couple Matches</strong> to earn Coins (+25 Win / +12 Draw / +8 Loss)!
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-stone-800 bg-stone-950 text-stone-400">
                            <tr>
                              <th className="px-4 py-2.5">Reason</th>
                              <th className="px-4 py-2.5">Reference</th>
                              <th className="px-4 py-2.5 text-right">Amount</th>
                              <th className="px-4 py-2.5 text-right">Balance After</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/60 font-mono tabular-nums">
                            {coinTransactions.slice(0, 12).map((tx) => (
                              <tr key={tx.id}>
                                <td className="px-4 py-2 font-sans font-semibold text-stone-200">
                                  {tx.reason}
                                </td>
                                <td className="px-4 py-2 text-stone-400">{tx.referenceId}</td>
                                <td
                                  className={`px-4 py-2 text-right font-bold ${
                                    tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} Coins
                                </td>
                                <td className="px-4 py-2 text-right text-teal-300">
                                  {tx.balanceAfter} Coins
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>

                  {/* Achievements Gallery */}
                  <section className="space-y-4">
                    <h2 className="text-base font-bold text-stone-100">Arcade Achievements</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ACHIEVEMENTS.map((ach) => {
                        const unlocked =
                          (ach.conditionType === 'games_played' && myGameRecords.length >= 1) ||
                          (ach.conditionType === 'couple_paired' && Boolean(activeCouple)) ||
                          (ach.conditionType === 'chess_win' &&
                            myGameRecords.some((r) => r.gameId === 'chess')) ||
                          (ach.conditionType === 'custom_content' &&
                            personalizedItems.length >= 1) ||
                          (ach.conditionType === 'coop_win' &&
                            myGameRecords.some(
                              (r) => r.mode === 'cooperative' || r.mode === '2v2_couple'
                            )) ||
                          (ach.conditionType === 'score_2048' &&
                            myGameRecords.some((r) => r.score >= 500)) ||
                          (ach.conditionType === 'voice_joined' && voiceJoinedOnce);

                        return (
                          <div
                            key={ach.id}
                            className={`rounded-2xl border p-4 ${
                              unlocked
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-stone-800 bg-stone-900/50 opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-100">{ach.title}</span>
                              <span className="font-mono text-amber-300 tabular-nums">
                                +{ach.xpBonus} XP
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-stone-400">{ach.description}</p>
                            <div className="mt-2 text-[11px] font-semibold text-teal-300">
                              {unlocked ? '✓ Unlocked' : 'In Progress'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {/* ============================================================
                  SECTION 7: COUPLE PROFILE & PLAYER PROFILE
                  ============================================================ */}
              {(activeSection === 'couple-profile' || activeSection === 'profile') && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                        Couple Profile &amp; Partner Pairing · {currentUser.username}
                      </h1>
                      <p className="mt-1 text-xs text-stone-400">
                        {currentUser.email} ·{' '}
                        {currentUser.emailVerified ? 'Verified Account' : 'Unverified Email'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-100 hover:border-amber-500/60"
                    >
                      Account Security / Verify Email / Log Out
                    </button>
                  </div>

                  {/* Couple Account Pairing & Shared Couple Profile Panel */}
                  <CouplePairingPanel
                    currentUser={currentUser}
                    sessionToken={sessionToken}
                    coupleContext={coupleContext}
                    initialPairCodeFromUrl={urlPairCode}
                    onCoupleContextChanged={(nextCtx) => {
                      setCoupleContext(nextCtx);
                      loadBootstrapData(currentUser.uid);
                    }}
                    onOpenPhotoUpload={() => setPhotoModalOpen(true)}
                    onOpenCosmeticsVault={() => setActiveSection('shop')}
                  />

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900/90 p-5 lg:col-span-5">
                      <h2 className="text-base font-bold text-stone-100">
                        Individual Identity &amp; Companion
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="sketch-photo-mount relative shrink-0">
                          <span aria-hidden="true" className="sketch-tape" />
                          <img
                            src={VIRTUAL_PET_IMAGE}
                            alt={currentUser.petState.name}
                            referrerPolicy="no-referrer"
                            className="h-20 w-20 rounded object-cover"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="text-sm font-bold text-stone-100">
                            Companion: {currentUser.petState.name} (Stage{' '}
                            {currentUser.petState.stage})
                          </div>
                          <div className="text-stone-400">
                            Equipped Accessory: {currentUser.petState.accessory}
                          </div>
                          {(() => {
                            const equippedSkinDef = getSkinById(currentUser.equippedSkin);
                            if (!equippedSkinDef) return null;
                            return (
                              <div className="pt-0.5">
                                <span
                                  className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${equippedSkinDef.badgeClass}`}
                                >
                                  {equippedSkinDef.icon} Skin: {equippedSkinDef.name} (
                                  {equippedSkinDef.rarity})
                                </span>
                              </div>
                            );
                          })()}
                          <div className="font-mono text-amber-300 tabular-nums">
                            Joy {currentUser.petState.happiness}% · Energy{' '}
                            {currentUser.petState.energy}%
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-stone-800 pt-4">
                        <span className="text-xs font-semibold text-stone-300">
                          Favorite Games ({currentUser.favoriteGames.length})
                        </span>
                        {currentUser.favoriteGames.length === 0 ? (
                          <p className="mt-1.5 text-xs text-stone-500">
                            Click the heart icon on any game card to pin your favorites here.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {currentUser.favoriteGames.map((fId) => {
                              const g = ALL_ARCADE_GAMES.find((x) => x.id === fId);
                              if (!g) return null;
                              return (
                                <button
                                  key={fId}
                                  type="button"
                                  onClick={() => handleLaunchGame(fId)}
                                  className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500"
                                >
                                  {g.title}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900/90 p-5 lg:col-span-7">
                      <h2 className="text-base font-bold text-stone-100">
                        Personal Match Statistics (Preserved Across Unpairing)
                      </h2>
                      <div className="grid grid-cols-3 gap-3 font-mono text-xs tabular-nums">
                        <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
                          <div className="text-stone-400">Matches Played</div>
                          <div className="mt-1 text-xl font-bold text-stone-100">
                            {myGameRecords.length}
                          </div>
                        </div>
                        <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
                          <div className="text-stone-400">Personal Wins</div>
                          <div className="mt-1 text-xl font-bold text-emerald-400">
                            {currentUser.wins}W · {currentUser.losses}L
                          </div>
                        </div>
                        <div className="rounded-xl border border-stone-800 bg-stone-950 p-3">
                          <div className="text-stone-400">Unlocked Items</div>
                          <div className="mt-1 text-xl font-bold text-amber-300">
                            {currentUser.unlockedItems.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SECTION 8: SETTINGS
                  ============================================================ */}
              {activeSection === 'settings' && (
                <div className="mx-auto max-w-2xl space-y-6">
                  <div className="border-b border-stone-800 pb-4">
                    <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                      Arcade Preferences &amp; Audio Settings
                    </h1>
                    <p className="mt-1 text-xs text-stone-400">
                      Customize synthesized Web Audio feedback, theme atmosphere, and account preferences.
                    </p>
                  </div>

                  <div className="space-y-5 rounded-2xl border border-stone-800 bg-stone-900/90 p-6">
                    {/* Profile Picture Upload Studio Option in Profile Settings */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-5">
                      <div className="flex items-center gap-3.5">
                        <AnimatedSkinnedAvatar
                          avatarId={currentUser.avatar}
                          customPhotoUrl={currentUser.customPhotoUrl}
                          skinId={currentUser.equippedSkin}
                          size="md"
                        />
                        <div>
                          <div className="text-sm font-bold text-stone-100">
                            Upload Profile Picture &amp; Avatar Crop Studio
                          </div>
                          <div className="text-xs text-stone-400">
                            Upload PNG, JPG, JPEG, or WebP (up to 5 MB). Stored independently so changing skin frames or banners never modifies your photo.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoModalOpen(true)}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
                      >
                        {currentUser.customPhotoUrl ? 'Replace / Crop Photo' : 'Upload Profile Picture'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-stone-100">
                          Arcade Sound Effects (Web Audio Synthesizer)
                        </div>
                        <div className="text-xs text-stone-400">
                          Tactile chimes for chess moves, tile flips, bubble pops, and victories.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !sfxEnabled;
                          setSfxEnabled(next);
                          soundFX.enabled = next;
                          if (next) soundFX.playSuccess();
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-200"
                      >
                        {sfxEnabled ? (
                          <Volume2 className="h-4 w-4 text-teal-400" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-rose-400" />
                        )}
                        <span>{sfxEnabled ? 'SFX Enabled' : 'SFX Muted'}</span>
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="settings-volume-range"
                        className="block text-xs font-medium text-stone-300"
                      >
                        Synthesizer Volume ({sfxVolume}%)
                      </label>
                      <input
                        id="settings-volume-range"
                        type="range"
                        min={0}
                        max={100}
                        value={sfxVolume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setSfxVolume(v);
                          soundFX.volume = v / 100;
                        }}
                        className="mt-2 h-2 w-full accent-amber-500"
                      />
                    </div>

                    <div className="border-t border-stone-800 pt-4">
                      <span className="block text-xs font-semibold text-stone-300">
                        Active Arcade Atmosphere Theme
                      </span>
                      <div className="mt-2 grid grid-cols-3 gap-2.5">
                        {[
                          { id: 'twilight-cocoa', label: 'Twilight Cocoa' },
                          { id: 'strawberry-milk', label: 'Rosewood Parlor' },
                          { id: 'matcha-garden', label: 'Matcha Conservatory' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => handleUpdateProfile({ theme: th.id })}
                            className={`rounded-xl border p-3 text-xs font-semibold ${
                              currentUser.theme === th.id
                                ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                                : 'border-stone-800 bg-stone-950 text-stone-400'
                            }`}
                          >
                            {th.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-stone-800 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-stone-100">
                            Sketchbook Paper Lighting (Day vs Night Sheet)
                          </div>
                          <div className="text-xs text-stone-400">
                            Switch between the Warm Day Working Sheet and Cozy Night Sketchbook palette across the sidebar and loader.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDarkTheme((prev) => !prev)}
                          className="rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-amber-300 hover:border-amber-500"
                        >
                          {isDarkTheme ? 'Cozy Night Sheet (Dark)' : 'Warm Day Sheet (Light)'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sketch Closing Red Statement & Lightly Divided Working-Sheet Footer */}
          <footer className="mt-14 pt-6">
            <p className="sketch-correction text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Every match, memory, and shared victory—penciled in for two.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#b3ac9d] pt-4 text-xs text-stone-400">
              <span>Her Little Arcade · Working Sheet Edition</span>
              <span>7 Single-Player Games · 14 Multiplayer Rooms (1v1 &amp; 2v2 Couple Mode)</span>
            </div>
          </footer>
        </main>
      </div>
      </div>

      {/* 1v1 Match Setup & 2v2 Team/Matchmaking Modal Overlay */}
      <PlayGameSetupModal
        isOpen={playSetupModal.isOpen}
        initialGameId={playSetupModal.gameId}
        mode={playSetupModal.mode}
        currentUser={{
          uid: currentUser.uid,
          username: currentUser.username,
          avatar: currentUser.avatar,
          equippedSkin: currentUser.equippedSkin,
        }}
        activeCouple={
          activeCouple
            ? {
                id: activeCouple.id,
                coupleName: activeCouple.coupleName,
                coupleTitle: activeCouple.coupleTitle,
                coupleTrophies: activeCouple.coupleTrophies ?? 0,
                equippedCoupleSkin: activeCouple.equippedCoupleSkin,
                coupleBanner: activeCouple.coupleBanner,
                status: activeCouple.status,
                requesterUid: activeCouple.requesterUid,
                partnerUid: activeCouple.partnerUid,
                partnerProfile: pairedPartnerProfile
                  ? {
                      uid: pairedPartnerProfile.uid,
                      username: pairedPartnerProfile.username,
                      avatar: pairedPartnerProfile.avatar,
                      equippedSkin: pairedPartnerProfile.equippedSkin,
                      presenceStatus: pairedPartnerProfile.presenceStatus,
                    }
                  : null,
              }
            : null
        }
        activeRoom={activeRoom}
        authFetcher={authFetcher}
        onClose={() =>
          setPlaySetupModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        onSwitchMode={(nextMode) => {
          setSelectedMultiplayerMode(nextMode);
          setPlaySetupModal((prev) => ({
            ...prev,
            mode: nextMode,
          }));
        }}
        onRoomJoinedOrCreated={(room, autoLaunchGame) => {
          setActiveRoom(room);
          setSelectedMultiplayerMode(room.mode);
          if (autoLaunchGame) {
            setPlaySetupModal((prev) => ({ ...prev, isOpen: false }));
            handleLaunchGame(room.gameId, {
              mode: room.mode,
              autostart: true,
            });
          }
        }}
        onOpenCouplePairing={() => {
          setPlaySetupModal((prev) => ({ ...prev, isOpen: false }));
          handleLaunchGame(null);
          setActiveSection('profile');
          smoothScrollToTop();
        }}
      />

      {/* Account Management Modal (when already authenticated) */}
      <AuthModal
        isOpen={authModalOpen}
        isFullPageGate={false}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        sessionToken={sessionToken}
        onAuthenticated={(profile, token, verifyCode) => {
          setSessionToken(token);
          setCurrentUser(profile);
          if (verifyCode) setVerificationCodeHint(verifyCode);
          loadBootstrapData(profile.uid);
        }}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          loadBootstrapData(updated.uid);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setSessionToken('');
          setActiveRoom(null);
        }}
      />

      {/* Profile Picture Upload, Crop & Preview Studio Modal */}
      <ProfilePhotoUploadAndCropModal
        isOpen={photoModalOpen}
        currentPhotoUrl={currentUser.customPhotoUrl || ''}
        avatarId={currentUser.avatar}
        equippedSkinId={currentUser.equippedSkin}
        equippedBannerId={currentUser.equippedBanner}
        username={currentUser.username}
        onClose={() => setPhotoModalOpen(false)}
        onSavePhoto={handleSaveProfilePhoto}
      />
    </div>
  );
}

/* ============================================================================
   REUSABLE GAME CARD (Zero-Pill Unboxed Metadata Discipline + GSAP Micro-Hover)
   ============================================================================ */
function GameCard({
  game,
  forcedMultiplayerMode,
  isFavorite,
  personalBest,
  onPlay,
  onPlayMode,
  onToggleFav,
}: {
  game: ArcadeGameDef;
  forcedMultiplayerMode?: '1v1' | '2v2';
  isFavorite: boolean;
  personalBest?: number;
  onPlay: () => void;
  onPlayMode?: (mode: '1v1' | '2v2') => void;
  onToggleFav: () => void;
}) {
  const is2v2Card = forcedMultiplayerMode === '2v2' && Boolean(game.supports2v2);
  const is1v1Card = forcedMultiplayerMode === '1v1' && game.collection === 'multiplayer';
  const showDualModeButtons =
    !forcedMultiplayerMode &&
    game.collection === 'multiplayer' &&
    Boolean(game.supports2v2) &&
    Boolean(onPlayMode);

  return (
    <div
      data-gsap-card
      onMouseEnter={(e) => animateCardHover(e.currentTarget, true)}
      onMouseLeave={(e) => animateCardHover(e.currentTarget, false)}
      className="gsap-stagger-card flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900/90 p-4 transition-colors hover:border-stone-700"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* Unboxed quiet inline metadata per Frontend Design Zero-Pill rule */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
              <span>{game.collection === 'single' ? 'Single Player' : 'Multiplayer'}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{game.category}</span>
              {game.collection === 'multiplayer' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      is2v2Card
                        ? 'font-semibold text-rose-300'
                        : is1v1Card
                        ? 'font-semibold text-amber-300'
                        : 'text-rose-300/90'
                    }
                  >
                    {is2v2Card
                      ? '2v2 Couple Mode'
                      : is1v1Card
                      ? game.supports2v2
                        ? '1v1 Mode (Also in 2v2)'
                        : '1v1 Exclusive Duel'
                      : game.supports2v2
                      ? '1v1 & 2v2 Couple'
                      : '1v1 Exclusive Duel'}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-300/90 tabular-nums">
                +{is2v2Card ? game.xpReward + 10 : game.xpReward} XP
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold text-stone-100">
              {String(game.number).padStart(2, '0')}. {game.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={(e) => {
              animateButtonPress(e.currentTarget);
              onToggleFav();
            }}
            aria-label={
              isFavorite ? `Remove ${game.title} from favorites` : `Favorite ${game.title}`
            }
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-rose-400"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-stone-300">{game.shortDesc}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="font-mono text-xs text-stone-400 tabular-nums">
          {personalBest !== undefined
            ? `Best: ${personalBest}`
            : game.collection === 'single'
            ? 'Single-Player: +XP Only'
            : is2v2Card
            ? '2v2 Rewards: +25 Coins & +30 🏆'
            : is1v1Card
            ? '1v1 Rewards: +XP Only (0 Coins / 0 🏆)'
            : game.supports2v2
            ? '1v1: +XP · 2v2: +25 Coins & +30 🏆'
            : '1v1 Mode: +XP Only (0 Coins / 0 🏆)'}
        </div>

        {showDualModeButtons ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                animateButtonPress(e.currentTarget);
                onPlayMode?.('1v1');
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-stone-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Play 1v1</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                animateButtonPress(e.currentTarget);
                onPlayMode?.('2v2');
              }}
              className="flex items-center gap-1 rounded-lg bg-rose-400 px-2.5 py-1.5 text-xs font-bold text-stone-950 transition-colors hover:bg-rose-300 whitespace-nowrap"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Play 2v2</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              animateButtonPress(e.currentTarget);
              onPlay();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-stone-950 transition-colors whitespace-nowrap shrink-0 ${
              is2v2Card
                ? 'bg-rose-400 hover:bg-rose-300'
                : 'bg-amber-500 hover:bg-amber-400'
            }`}
          >
            <Play className="h-3 w-3 fill-current" />
            <span>
              {is2v2Card
                ? `Play 2v2 · ${game.title}`
                : is1v1Card || game.collection === 'multiplayer'
                ? `Play 1v1 · ${game.title}`
                : `Play ${game.title}`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
