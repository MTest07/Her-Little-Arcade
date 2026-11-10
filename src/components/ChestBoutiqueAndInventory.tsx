'use client';

import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import {
  Sparkles,
  Key,
  Package,
  Coins,
  Check,
  Lock,
  Eye,
  FastForward,
  Info,
  Layers,
  Award,
  CheckCircle2,
  ShieldAlert,
  Camera,
  Heart,
} from 'lucide-react';
import {
  ARCADE_SKINS,
  ARCADE_BANNERS,
  ARCADE_CHESTS,
  ARCADE_KEYS,
  DUPLICATE_COSMETIC_COIN_PAYOUT,
  SkinRarity,
  ArcadeChestDef,
  getSkinById,
  getBannerById,
  getKeyByTier,
  getChestByTier,
  getRewardPoolForChest,
  parseTierCountMap,
} from '@/src/lib/arcade-data';
import {
  AnimatedSkinnedAvatar,
  ProfileBannerBackdrop,
  ThreeLayerProfileHeader,
  CustomChestArtwork,
  CustomKeyArtwork,
  getRarityBadgeClasses,
} from './CosmeticAvatarAndBanner';

export interface ChestOpeningResultPayload {
  id?: number;
  chestTier: SkinRarity;
  chestName: string;
  openMethod: 'coins' | 'key' | 'inventory';
  rewardCategory: 'skin' | 'banner';
  rewardId: string;
  rewardName: string;
  rewardRarity: SkinRarity;
  rewardDescription?: string;
  wasDuplicate: boolean;
  duplicateCoinsAwarded: number;
  createdAt?: string | Date;
}

/* ============================================================================
   1. GSAP 5-TIER CHEST-OPENING & CARD-DRAWING REVEAL MODAL
   ============================================================================ */

interface ChestOpeningCeremonyModalProps {
  isOpen: boolean;
  chestTier: SkinRarity;
  openingResult: ChestOpeningResultPayload | null;
  playerAvatarId?: string;
  playerCustomPhotoUrl?: string;
  onClose: () => void;
  onEquipReward?: (category: 'skin' | 'banner', itemId: string) => Promise<void>;
}

export function ChestOpeningCeremonyModal({
  isOpen,
  chestTier,
  openingResult,
  playerAvatarId = 'kitsune',
  playerCustomPhotoUrl = '',
  onClose,
  onEquipReward,
}: ChestOpeningCeremonyModalProps) {
  const [phase, setPhase] = useState<'animating' | 'revealed'>('animating');
  const [equipping, setEquipping] = useState(false);
  const [equippedSuccess, setEquippedSuccess] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const chestWrapRef = useRef<HTMLDivElement | null>(null);
  const ringsRef = useRef<HTMLDivElement | null>(null);
  const raysRef = useRef<HTMLDivElement | null>(null);
  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const chestDef = getChestByTier(chestTier) || ARCADE_CHESTS[0];

  useEffect(() => {
    if (!isOpen || !openingResult) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    Promise.resolve().then(() => {
      setEquippedSuccess(false);
      setPhase(prefersReducedMotion ? 'revealed' : 'animating');
    });

    if (prefersReducedMotion) {
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setPhase('revealed');
        },
      });
      timelineRef.current = tl;

      gsap.set(chestWrapRef.current, {
        scale: 0.75,
        y: 20,
        rotation: 0,
        opacity: 0,
      });
      gsap.set(ringsRef.current, { scale: 0.4, opacity: 0, rotation: 0 });
      gsap.set(raysRef.current, { scale: 0.3, opacity: 0, rotation: 0 });
      gsap.set(cardWrapRef.current, {
        scale: 0.2,
        y: 60,
        rotationY: 180,
        opacity: 0,
      });

      // Stage 1: Chest Entrance
      tl.to(chestWrapRef.current, {
        scale: 1,
        y: 0,
        opacity: 1,
        duration: 0.42,
        ease: 'back.out(1.6)',
      });

      // Stage 2: Tier-Unique Chest Opening Choreography
      if (chestTier === 'Common') {
        // Quick kraft parcel tremble & slide
        tl.to(chestWrapRef.current, {
          rotation: 4,
          duration: 0.08,
          yoyo: true,
          repeat: 5,
        }).to(chestWrapRef.current, {
          scale: 1.08,
          y: -8,
          duration: 0.28,
          ease: 'power2.out',
        });
      } else if (chestTier === 'Uncommon') {
        // Brass clasp snap + botanical bloom
        tl.to(chestWrapRef.current, {
          y: -12,
          scale: 1.1,
          duration: 0.25,
          ease: 'power2.out',
        })
          .to(
            ringsRef.current,
            {
              scale: 1.15,
              opacity: 0.75,
              duration: 0.35,
              ease: 'back.out(1.5)',
            },
            '-=0.15'
          )
          .to(chestWrapRef.current, {
            rotation: -5,
            duration: 0.07,
            yoyo: true,
            repeat: 5,
          });
      } else if (chestTier === 'Rare') {
        // 180-degree compass dial spin + sapphire beam
        tl.to(
          ringsRef.current,
          {
            opacity: 0.9,
            scale: 1.25,
            rotation: 180,
            duration: 0.65,
            ease: 'power3.inOut',
          },
          '-=0.1'
        )
          .to(
            chestWrapRef.current,
            {
              y: -16,
              scale: 1.14,
              duration: 0.35,
              ease: 'back.out(1.7)',
            },
            '-=0.3'
          )
          .to(raysRef.current, {
            opacity: 0.85,
            scale: 1.3,
            rotation: 45,
            duration: 0.4,
          });
      } else if (chestTier === 'Epic') {
        // Crimson lacquer doors + sakura storm vortex
        tl.to(ringsRef.current, {
          opacity: 0.95,
          scale: 1.35,
          rotation: -120,
          duration: 0.55,
          ease: 'power2.out',
        })
          .to(
            chestWrapRef.current,
            {
              y: -22,
              scale: 1.18,
              rotation: 6,
              duration: 0.08,
              yoyo: true,
              repeat: 7,
            },
            '-=0.35'
          )
          .to(raysRef.current, {
            opacity: 0.95,
            scale: 1.45,
            rotation: 90,
            duration: 0.45,
            ease: 'power3.out',
          });
      } else {
        // Legendary: Solar Eclipse Levitation, Shattered Lock & 3 Astrolabe Rings
        tl.to(chestWrapRef.current, {
          y: -28,
          scale: 1.22,
          duration: 0.5,
          ease: 'power3.out',
        })
          .to(
            ringsRef.current,
            {
              opacity: 1,
              scale: 1.5,
              rotation: 360,
              duration: 0.95,
              ease: 'power2.inOut',
            },
            '-=0.4'
          )
          .to(
            chestWrapRef.current,
            {
              rotation: 8,
              duration: 0.06,
              yoyo: true,
              repeat: 9,
            },
            '-=0.6'
          )
          .to(raysRef.current, {
            opacity: 1,
            scale: 1.7,
            rotation: 180,
            duration: 0.55,
            ease: 'expo.out',
          });
      }

      // Stage 3: Card-Drawing Arc & 3D Flip Reveal
      tl.to(
        chestWrapRef.current,
        {
          scale: 0.65,
          y: 75,
          opacity: 0.2,
          duration: 0.35,
          ease: 'power2.in',
        },
        '+=0.05'
      ).to(
        cardWrapRef.current,
        {
          scale: 1,
          y: 0,
          rotationY: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'back.out(1.4)',
        },
        '-=0.2'
      );
    }, stageRef);

    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, [isOpen, openingResult, chestTier]);

  if (!isOpen || !openingResult) return null;

  const handleSkipAnimation = () => {
    if (timelineRef.current) {
      timelineRef.current.progress(1);
    }
    setPhase('revealed');
  };

  const handleEquipNow = async () => {
    if (!onEquipReward) return;
    setEquipping(true);
    try {
      await onEquipReward(openingResult.rewardCategory, openingResult.rewardId);
      setEquippedSuccess(true);
    } finally {
      setEquipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        ref={stageRef}
        className="sketch-scrap w-full max-w-lg p-6 relative overflow-hidden text-center my-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#b3ac9d] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9e3a2e]" />
            <span className="text-sm font-mono uppercase tracking-wider font-bold">
              {chestDef.name} · {chestDef.openingAnimationStyle}
            </span>
          </div>
          {phase === 'animating' ? (
            <button
              type="button"
              onClick={handleSkipAnimation}
              className="px-3 py-1 text-xs font-bold bg-[#f0dfa0] text-[#38352f] border border-[#38352f] flex items-center gap-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip Animation</span>
            </button>
          ) : (
            <span
              className={`px-2.5 py-0.5 text-xs font-mono uppercase rounded border ${getRarityBadgeClasses(
                openingResult.rewardRarity
              )}`}
            >
              {openingResult.rewardRarity} Drop
            </span>
          )}
        </div>

        {/* Animation & Card-Drawing Stage */}
        <div className="relative min-h-[310px] flex flex-col items-center justify-center py-6">
          {/* Orbital Astrolabe Rings */}
          <div
            ref={ringsRef}
            className="absolute w-52 h-52 rounded-full border-2 border-dashed pointer-events-none"
            style={{ borderColor: chestDef.primaryColor }}
          />
          {/* Radiant Burst Rays */}
          <div
            ref={raysRef}
            className="absolute w-60 h-60 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${chestDef.accentColor}55 0%, transparent 70%)`,
            }}
          />

          {/* Chest Vessel */}
          <div
            ref={chestWrapRef}
            className={`${phase === 'revealed' ? 'hidden' : 'flex'} flex-col items-center justify-center z-10`}
          >
            <CustomChestArtwork
              tier={chestTier}
              size={128}
              isOpen={phase === 'revealed'}
            />
            <p className="mt-3 text-xs font-mono text-[#514d44]">
              Drawing {chestDef.name} reward card...
            </p>
          </div>

          {/* Drawn Cosmetic Reward Card */}
          <div
            ref={cardWrapRef}
            className={`${
              phase === 'revealed' ? 'opacity-100 scale-100' : ''
            } w-full max-w-sm z-20`}
          >
            <div className="sketch-scrap p-5 border-2 border-[#38352f] bg-[#fcf8ef] shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#514d44]">
                  {openingResult.rewardCategory === 'skin'
                    ? 'Animated Avatar Frame Skin'
                    : 'Profile Backdrop Banner'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold uppercase rounded border ${getRarityBadgeClasses(
                    openingResult.rewardRarity
                  )}`}
                >
                  {openingResult.rewardRarity}
                </span>
              </div>

              {/* Visual Preview of Drawn Skin or Banner */}
              <div className="py-3 flex flex-col items-center justify-center">
                {openingResult.rewardCategory === 'skin' ? (
                  <AnimatedSkinnedAvatar
                    avatarId={playerAvatarId}
                    customPhotoUrl={playerCustomPhotoUrl}
                    skinId={openingResult.rewardId}
                    size="xl"
                  />
                ) : (
                  <ProfileBannerBackdrop
                    bannerId={openingResult.rewardId}
                    className="w-full h-28 flex items-center justify-center p-3"
                  >
                    <AnimatedSkinnedAvatar
                      avatarId={playerAvatarId}
                      customPhotoUrl={playerCustomPhotoUrl}
                      skinId="skin-classic-notebook"
                      size="md"
                    />
                  </ProfileBannerBackdrop>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#38352f]">
                  {openingResult.rewardName}
                </h3>
                {openingResult.rewardDescription && (
                  <p className="text-xs text-[#514d44] mt-1">
                    {openingResult.rewardDescription}
                  </p>
                )}
              </div>

              {/* Duplicate Conversion Notice OR New Item Badge */}
              {openingResult.wasDuplicate ? (
                <div className="p-3 rounded bg-[#f0dfa0]/80 border border-[#38352f] text-xs text-[#38352f] space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#9e3a2e]" />
                    <span>
                      Duplicate {openingResult.rewardRarity} Converted: +
                      {openingResult.duplicateCoinsAwarded} Coins!
                    </span>
                  </div>
                  <p className="text-[11px] text-[#514d44]">
                    You already own this {openingResult.rewardCategory}, so the arcade
                    automatically credited rarity-scaled Coins to your balance.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-700/40 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>New Cosmetic Added to Your Inventory!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        {phase === 'revealed' && (
          <div className="pt-3 border-t border-[#b3ac9d] flex items-center justify-center gap-3">
            {onEquipReward && !equippedSuccess && (
              <button
                type="button"
                disabled={equipping}
                onClick={handleEquipNow}
                className="px-4 py-2 text-xs font-bold bg-[#f0dfa0] text-[#38352f] border-[1.5px] border-[#38352f] flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {equipping
                    ? 'Equipping...'
                    : `Equip ${
                        openingResult.rewardCategory === 'skin' ? 'Skin Frame' : 'Banner'
                      } Now`}
                </span>
              </button>
            )}
            {equippedSuccess && (
              <span className="px-3 py-2 text-xs font-mono font-bold text-emerald-800 flex items-center gap-1">
                <Check className="w-4 h-4" /> Equipped!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f]"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   2. UNIFIED COSMETIC BOUTIQUE (CHESTS, SKINS, BANNERS) & 4-CATEGORY INVENTORY
   ============================================================================ */

interface CosmeticChestShopAndInventorySuiteProps {
  player: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    coins: number;
    level: number;
    equippedSkin?: string;
    equippedBanner?: string;
    unlockedItems: string[];
    unlockedBanners?: string[];
    chestInventory?: Record<SkinRarity, number>;
    keyInventory?: Record<SkinRarity, number>;
  };
  activeCouple?: {
    id: number;
    coupleName: string;
    equippedCoupleSkin?: string;
    coupleBanner?: string;
  } | null;
  chestOpenings?: Array<{
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
  }>;
  initialSection?: 'chests' | 'skins' | 'banners' | 'inventory';
  onOpenPhotoStudio?: () => void;
  onBuyChest: (chestTier: SkinRarity) => Promise<void>;
  onOpenChest: (
    chestTier: SkinRarity,
    openMethod: 'coins' | 'key' | 'inventory'
  ) => Promise<ChestOpeningResultPayload | null>;
  onPurchaseSkin: (skinId: string) => Promise<void>;
  onEquipSkin: (skinId: string, applyToCouple?: boolean) => Promise<void>;
  onPurchaseBanner: (bannerId: string) => Promise<void>;
  onEquipBanner: (bannerId: string, applyToCouple?: boolean) => Promise<void>;
}

export function CosmeticChestShopAndInventorySuite({
  player,
  activeCouple,
  chestOpenings = [],
  initialSection = 'chests',
  onOpenPhotoStudio,
  onBuyChest,
  onOpenChest,
  onPurchaseSkin,
  onEquipSkin,
  onPurchaseBanner,
  onEquipBanner,
}: CosmeticChestShopAndInventorySuiteProps) {
  const [activeTab, setActiveTab] = useState<'chests' | 'skins' | 'banners' | 'inventory'>(
    initialSection
  );
  const [inventoryCategory, setInventoryCategory] = useState<
    'all' | 'skins' | 'banners' | 'chests' | 'keys'
  >('all');
  const [previewSkinId, setPreviewSkinId] = useState<string>(
    player.equippedSkin || 'skin-classic-notebook'
  );
  const [previewBannerId, setPreviewBannerId] = useState<string>(
    player.equippedBanner || 'banner-sketchbook-grid'
  );
  const [applyToCouple, setApplyToCouple] = useState<boolean>(false);
  const [expandedPoolTier, setExpandedPoolTier] = useState<SkinRarity | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Chest Ceremony Modal State
  const [ceremonyOpen, setCeremonyOpen] = useState(false);
  const [ceremonyTier, setCeremonyTier] = useState<SkinRarity>('Common');
  const [ceremonyResult, setCeremonyResult] =
    useState<ChestOpeningResultPayload | null>(null);

  const chestInv = player.chestInventory || {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    Epic: 0,
    Legendary: 0,
  };
  const keyInv = player.keyInventory || {
    Common: 0,
    Uncommon: 0,
    Rare: 0,
    Epic: 0,
    Legendary: 0,
  };
  const unlockedSkins = Array.from(
    new Set([
      ...(player.unlockedItems || []),
      ...ARCADE_SKINS.filter((s) => s.acquisitionSource === 'starter').map((s) => s.id),
    ])
  );
  const unlockedBanners = Array.from(
    new Set([
      ...(player.unlockedBanners || []).map((id) => getBannerById(id).id),
      ...ARCADE_BANNERS.filter((b) => b.acquisitionSource === 'starter').map((b) => b.id),
    ])
  );

  const totalKeysOwned = Object.values(keyInv).reduce((acc, v) => acc + (v || 0), 0);
  const totalChestsOwned = Object.values(chestInv).reduce((acc, v) => acc + (v || 0), 0);

  const handleTriggerOpenChest = async (
    tier: SkinRarity,
    method: 'coins' | 'key' | 'inventory'
  ) => {
    setBusyAction(`open-${tier}-${method}`);
    setFeedback(null);
    try {
      const result = await onOpenChest(tier, method);
      if (result) {
        setCeremonyTier(tier);
        setCeremonyResult(result);
        setCeremonyOpen(true);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not open chest.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerBuyChest = async (tier: SkinRarity) => {
    setBusyAction(`buy-${tier}`);
    setFeedback(null);
    try {
      await onBuyChest(tier);
      setFeedback({
        type: 'success',
        text: `${tier} Chest added to your Inventory! You can open it anytime from Inventory → Chests.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to buy chest.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live 3-Layer Composite Preview Banner at Top */}
      <div className="sketch-scrap p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9e3a2e]" />
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-[#514d44]">
              Live 3-Layer Cosmetic Preview (Banner + Uploaded Photo + Animated Skin Frame)
            </span>
          </div>
          {activeCouple && (
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToCouple}
                onChange={(e) => setApplyToCouple(e.target.checked)}
                className="accent-[#9e3a2e]"
              />
              <Heart className="w-3.5 h-3.5 text-[#9e3a2e]" />
              <span>Also apply equipped Skin/Banner to Couple ({activeCouple.coupleName})</span>
            </label>
          )}
        </div>

        <ThreeLayerProfileHeader
          username={player.username || 'Player'}
          titleOrSubtitle="Previewing your active or selected Banner + Profile Picture + Animated Frame"
          avatarId={player.avatar}
          customPhotoUrl={player.customPhotoUrl}
          equippedSkinId={previewSkinId}
          equippedBannerId={previewBannerId}
          level={player.level}
          coins={player.coins}
          onOpenPhotoUpload={onOpenPhotoStudio}
        />
      </div>

      {/* Navigation Tabs + Key & Coin Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chests')}
            className={`px-3.5 py-2 text-xs font-bold border-[1.5px] border-[#38352f] flex items-center gap-1.5 ${
              activeTab === 'chests'
                ? 'bg-[#f0dfa0] text-[#38352f] shadow-[2px_2px_0px_#9e3a2e]'
                : 'bg-[#fcf8ef] text-[#514d44]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>5-Tier Chests & Keys</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skins')}
            className={`px-3.5 py-2 text-xs font-bold border-[1.5px] border-[#38352f] flex items-center gap-1.5 ${
              activeTab === 'skins'
                ? 'bg-[#f0dfa0] text-[#38352f] shadow-[2px_2px_0px_#9e3a2e]'
                : 'bg-[#fcf8ef] text-[#514d44]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Avatar Frames ({unlockedSkins.length}/{ARCADE_SKINS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`px-3.5 py-2 text-xs font-bold border-[1.5px] border-[#38352f] flex items-center gap-1.5 ${
              activeTab === 'banners'
                ? 'bg-[#f0dfa0] text-[#38352f] shadow-[2px_2px_0px_#9e3a2e]'
                : 'bg-[#fcf8ef] text-[#514d44]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Profile Banners ({unlockedBanners.length}/{ARCADE_BANNERS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 text-xs font-bold border-[1.5px] border-[#38352f] flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-[#f0dfa0] text-[#38352f] shadow-[2px_2px_0px_#9e3a2e]'
                : 'bg-[#fcf8ef] text-[#514d44]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>
              Inventory ({totalChestsOwned} Chests · {totalKeysOwned} Keys)
            </span>
          </button>
        </div>

        {/* Owned Keys Strip */}
        <div className="sketch-strip px-3 py-1.5 flex flex-wrap items-center gap-2.5 text-xs font-mono">
          {ARCADE_KEYS.map((k) => (
            <span
              key={k.id}
              title={`${k.name}: ${keyInv[k.tier] || 0} owned`}
              className="inline-flex items-center gap-1"
            >
              <CustomKeyArtwork tier={k.tier} size={20} />
              <strong className="text-[#38352f]">{keyInv[k.tier] || 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'error'
              ? 'bg-[#9e3a2e]/10 border-[#9e3a2e] text-[#9e3a2e]'
              : 'bg-emerald-500/15 border-emerald-700/50 text-emerald-950 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] font-mono underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ====================================================================
          TAB 1: 5-TIER CHESTS & CUSTOM KEYS BOUTIQUE
         ==================================================================== */}
      {activeTab === 'chests' && (
        <div className="space-y-6">
          {/* Challenge Key Progression Banner */}
          <div className="sketch-strip p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-3">
              <CustomKeyArtwork tier="Common" size={38} />
              <div>
                <p className="font-bold text-[#38352f]">Daily Challenges (24h)</p>
                <p className="text-[#514d44]">
                  Complete Daily Challenges to earn <strong>Common</strong> &{' '}
                  <strong>Uncommon Keys</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CustomKeyArtwork tier="Rare" size={38} />
              <div>
                <p className="font-bold text-[#38352f]">Weekly Challenges (7d)</p>
                <p className="text-[#514d44]">
                  Complete Weekly Challenges to earn <strong>Rare</strong> &{' '}
                  <strong>Epic Keys</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CustomKeyArtwork tier="Legendary" size={38} />
              <div>
                <p className="font-bold text-[#38352f]">Monthly Challenges (1m)</p>
                <p className="text-[#514d44]">
                  Complete Monthly Challenges to earn <strong>Legendary Keys</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* 5 Chest Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ARCADE_CHESTS.map((chest: ArcadeChestDef) => {
              const keysOwned = keyInv[chest.tier] || 0;
              const storedOwned = chestInv[chest.tier] || 0;
              const canAffordCoins = player.coins >= chest.costCoins;
              const poolItems = getRewardPoolForChest(chest.tier);
              const poolSkins = poolItems.filter((item) => item.category === 'skin');
              const poolBanners = poolItems.filter((item) => item.category === 'banner');
              const isPoolExpanded = expandedPoolTier === chest.tier;

              return (
                <div
                  key={chest.id}
                  className="sketch-scrap p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getRarityBadgeClasses(
                            chest.tier
                          )}`}
                        >
                          {chest.tier} Tier
                        </span>
                        <h3 className="text-lg font-bold mt-1">{chest.name}</h3>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <div className="font-bold text-[#9e3a2e]">
                          {chest.costCoins.toLocaleString()} Coins
                        </div>
                        <div className="text-[11px] text-[#514d44]">
                          or 1 {chest.tier} Key
                        </div>
                      </div>
                    </div>

                    {/* Chest & Matching Key Visual */}
                    <div className="py-3 px-4 rounded-xl bg-[#efe8d8]/60 border border-[#b3ac9d] flex items-center justify-around">
                      <CustomChestArtwork tier={chest.tier} size={88} />
                      <div className="flex flex-col items-center gap-1">
                        <CustomKeyArtwork tier={chest.tier} size={46} />
                        <span className="text-[11px] font-mono text-[#38352f]">
                          Keys: <strong>{keysOwned}</strong>
                        </span>
                        {storedOwned > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f0dfa0] text-[#38352f] border border-[#38352f]/40">
                            Stored: {storedOwned}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#514d44]">{chest.description}</p>

                    {/* Rarity Drop Probabilities Table */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#514d44]">
                        <span>Drop Probabilities</span>
                        <span>
                          Pool: {poolSkins.length} Skins · {poolBanners.length} Banners
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {(
                          ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as SkinRarity[]
                        ).map((r) => {
                          const pct = chest.rarityProbabilities[r] || 0;
                          return (
                            <div
                              key={r}
                              className={`p-1 rounded border text-[10px] font-mono ${
                                pct > 0
                                  ? getRarityBadgeClasses(r)
                                  : 'opacity-35 border-stone-400/40 text-stone-400'
                              }`}
                            >
                              <div className="truncate">{r.slice(0, 3)}</div>
                              <div className="font-bold">{pct}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expandable Reward Pool Inspector */}
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPoolTier(isPoolExpanded ? null : chest.tier)
                        }
                        className="text-[11px] font-mono text-[#344c69] underline flex items-center gap-1"
                      >
                        <Info className="w-3 h-3" />
                        <span>
                          {isPoolExpanded ? 'Hide Reward Pool' : 'Inspect Possible Drops'}
                        </span>
                      </button>

                      {isPoolExpanded && (
                        <div className="mt-2 p-2.5 rounded bg-[#fcf8ef] border border-[#b3ac9d] max-h-40 overflow-y-auto text-[11px] space-y-1.5">
                          <div className="font-bold text-[#38352f]">
                            Skins ({poolSkins.length}):
                          </div>
                          {poolSkins.map((s) => (
                            <div key={s.id} className="flex items-center justify-between">
                              <span className="truncate">{s.name}</span>
                              <span className="font-mono text-[10px] text-[#514d44]">
                                {s.rarity}
                              </span>
                            </div>
                          ))}
                          <div className="font-bold text-[#38352f] pt-1">
                            Banners ({poolBanners.length}):
                          </div>
                          {poolBanners.map((b) => (
                            <div key={b.id} className="flex items-center justify-between">
                              <span className="truncate">{b.name}</span>
                              <span className="font-mono text-[10px] text-[#514d44]">
                                {b.rarity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chest Actions: Unlock with Key, Open Stored, or Buy with Coins */}
                  <div className="space-y-2 pt-2 border-t border-[#b3ac9d]">
                    {keysOwned > 0 && (
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleTriggerOpenChest(chest.tier, 'key')}
                        className="w-full py-2 px-3 text-xs font-bold bg-[#f0dfa0] text-[#38352f] border-[1.5px] border-[#38352f] flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>
                          Unlock with 1 {chest.tier} Key ({keysOwned} owned)
                        </span>
                      </button>
                    )}

                    {storedOwned > 0 && (
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleTriggerOpenChest(chest.tier, 'inventory')}
                        className="w-full py-2 px-3 text-xs font-bold bg-emerald-500/20 text-[#38352f] border-[1.5px] border-[#38352f] flex items-center justify-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Open Stored Chest ({storedOwned} in Inventory)</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busyAction !== null || !canAffordCoins}
                        onClick={() => handleTriggerOpenChest(chest.tier, 'coins')}
                        className="py-2 px-2.5 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f] disabled:opacity-45 flex items-center justify-center gap-1"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Buy & Open ({chest.costCoins})</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== null || !canAffordCoins}
                        onClick={() => handleTriggerBuyChest(chest.tier)}
                        className="py-2 px-2.5 text-xs font-medium bg-[#fcf8ef] text-[#38352f] border-[1.5px] border-[#38352f] disabled:opacity-45 flex items-center justify-center gap-1"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Store Chest</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duplicate-to-Coin Conversion Policy Bar */}
          <div className="sketch-strip p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#38352f]">
              Duplicate Protection (Automatic Coin Conversion):
            </span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              {(
                ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as SkinRarity[]
              ).map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded bg-[#fcf8ef] border border-[#b3ac9d]"
                >
                  {r}: +{DUPLICATE_COSMETIC_COIN_PAYOUT[r]} Coins
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: ANIMATED AVATAR FRAME SKINS BOUTIQUE
         ==================================================================== */}
      {activeTab === 'skins' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCADE_SKINS.map((skin) => {
            const owned =
              unlockedSkins.includes(skin.id) ||
              skin.acquisitionSource === 'starter';
            const equipped = (player.equippedSkin || 'skin-classic-notebook') === skin.id;
            const isPreviewing = previewSkinId === skin.id;

            return (
              <div
                key={skin.id}
                className={`sketch-scrap p-4 flex flex-col justify-between space-y-4 ${
                  equipped ? 'ring-2 ring-[#9e3a2e]' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getRarityBadgeClasses(
                        skin.rarity
                      )}`}
                    >
                      {skin.rarity}
                    </span>
                    <span className="text-[11px] font-mono text-[#514d44]">
                      {skin.animationLabel}
                    </span>
                  </div>

                  {/* Live Animated Frame around Player's Picture */}
                  <div className="py-4 flex flex-col items-center justify-center bg-[#efe8d8]/50 rounded-xl border border-[#b3ac9d]">
                    <AnimatedSkinnedAvatar
                      avatarId={player.avatar}
                      customPhotoUrl={player.customPhotoUrl}
                      skinId={skin.id}
                      size="lg"
                    />
                  </div>

                  <div>
                    <h4 className="text-base font-bold">{skin.name}</h4>
                    <p className="text-xs text-[#514d44] mt-0.5">{skin.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#b3ac9d] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSkinId(skin.id)}
                    className={`px-2.5 py-1.5 text-xs font-mono border border-[#38352f] flex items-center gap-1 ${
                      isPreviewing ? 'bg-[#f0dfa0] font-bold' : 'bg-[#fcf8ef]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPreviewing ? 'Previewing' : 'Preview'}</span>
                  </button>

                  {owned ? (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={async () => {
                        setBusyAction(`skin-${skin.id}`);
                        try {
                          const target = equipped
                            ? 'skin-classic-notebook'
                            : skin.id;
                          await onEquipSkin(target, applyToCouple);
                          setPreviewSkinId(target);
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold border-[1.5px] border-[#38352f] ${
                        equipped
                          ? 'bg-[#f0dfa0] text-[#38352f]'
                          : 'bg-[#9e3a2e] text-[#fcf8ef]'
                      }`}
                    >
                      {equipped
                        ? skin.id === 'skin-classic-notebook'
                          ? 'Equipped'
                          : 'Unequip'
                        : 'Equip Frame'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction !== null || player.coins < skin.costCoins}
                      onClick={async () => {
                        setBusyAction(`buy-skin-${skin.id}`);
                        try {
                          await onPurchaseSkin(skin.id);
                          setPreviewSkinId(skin.id);
                        } catch (err: unknown) {
                          setFeedback({
                            type: 'error',
                            text:
                              err instanceof Error
                                ? err.message
                                : 'Could not purchase skin.',
                          });
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f] disabled:opacity-45"
                    >
                      Unlock ({skin.costCoins.toLocaleString()} Coins)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          TAB 3: PROFILE BANNERS BOUTIQUE (5 RARITIES)
         ==================================================================== */}
      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ARCADE_BANNERS.map((banner) => {
            const owned =
              unlockedBanners.includes(banner.id) ||
              banner.acquisitionSource === 'starter';
            const equipped =
              getBannerById(player.equippedBanner || 'banner-warm-sketchbook').id === banner.id;
            const isPreviewing = previewBannerId === banner.id;

            return (
              <div
                key={banner.id}
                className={`sketch-scrap p-4 flex flex-col justify-between space-y-3 ${
                  equipped ? 'ring-2 ring-[#9e3a2e]' : ''
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getRarityBadgeClasses(
                        banner.rarity
                      )}`}
                    >
                      {banner.rarity} Banner
                    </span>
                    <span className="text-xs font-mono text-[#514d44]">
                      {owned
                        ? 'Owned'
                        : banner.costCoins > 0
                        ? `${banner.costCoins.toLocaleString()} Coins`
                        : 'Chest / Seasonal'}
                    </span>
                  </div>

                  {/* Rectangular Banner Preview with Player's Avatar + Frame in Front */}
                  <ProfileBannerBackdrop bannerId={banner.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <AnimatedSkinnedAvatar
                        avatarId={player.avatar}
                        customPhotoUrl={player.customPhotoUrl}
                        skinId={previewSkinId}
                        size="md"
                      />
                      <div>
                        <div
                          className="text-sm font-bold"
                          style={{ color: '#fcf8ef' }}
                        >
                          {player.username || 'Player'}
                        </div>
                        <div
                          className="text-[11px] opacity-85"
                          style={{ color: banner.accentColor }}
                        >
                          {banner.name}
                        </div>
                      </div>
                    </div>
                  </ProfileBannerBackdrop>

                  <div>
                    <h4 className="text-base font-bold">{banner.name}</h4>
                    <p className="text-xs text-[#514d44]">{banner.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#b3ac9d] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewBannerId(banner.id)}
                    className={`px-2.5 py-1.5 text-xs font-mono border border-[#38352f] flex items-center gap-1 ${
                      isPreviewing ? 'bg-[#f0dfa0] font-bold' : 'bg-[#fcf8ef]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPreviewing ? 'Previewing' : 'Preview'}</span>
                  </button>

                  {owned ? (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={async () => {
                        setBusyAction(`banner-${banner.id}`);
                        try {
                          const target = equipped
                            ? 'banner-sketchbook-grid'
                            : banner.id;
                          await onEquipBanner(target, applyToCouple);
                          setPreviewBannerId(target);
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold border-[1.5px] border-[#38352f] ${
                        equipped
                          ? 'bg-[#f0dfa0] text-[#38352f]'
                          : 'bg-[#9e3a2e] text-[#fcf8ef]'
                      }`}
                    >
                      {equipped
                        ? banner.id === 'banner-sketchbook-grid'
                          ? 'Equipped'
                          : 'Unequip'
                        : 'Equip Banner'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction !== null || player.coins < banner.costCoins}
                      onClick={async () => {
                        setBusyAction(`buy-banner-${banner.id}`);
                        try {
                          await onPurchaseBanner(banner.id);
                          setPreviewBannerId(banner.id);
                        } catch (err: unknown) {
                          setFeedback({
                            type: 'error',
                            text:
                              err instanceof Error
                                ? err.message
                                : 'Could not purchase banner.',
                          });
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f] disabled:opacity-45"
                    >
                      Buy · {banner.costCoins.toLocaleString()} Coins
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          TAB 4: UNIFIED 4-CATEGORY INVENTORY (SKINS, BANNERS, CHESTS, KEYS)
         ==================================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'All Owned Items' },
                { id: 'skins', label: `Skins (${unlockedSkins.length})` },
                { id: 'banners', label: `Banners (${unlockedBanners.length})` },
                { id: 'chests', label: `Chests (${totalChestsOwned})` },
                { id: 'keys', label: `Keys (${totalKeysOwned})` },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setInventoryCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-mono border border-[#38352f] ${
                  inventoryCategory === cat.id
                    ? 'bg-[#f0dfa0] text-[#38352f] font-bold'
                    : 'bg-[#fcf8ef] text-[#514d44]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 1. Owned Skins Section */}
          {(inventoryCategory === 'all' || inventoryCategory === 'skins') && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-mono uppercase tracking-wider text-[#514d44]">
                Owned Avatar Frame Skins ({unlockedSkins.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ARCADE_SKINS.filter((s) => unlockedSkins.includes(s.id)).map((skin) => {
                  const equipped =
                    (player.equippedSkin || 'skin-classic-notebook') === skin.id;
                  return (
                    <div
                      key={skin.id}
                      className="sketch-scrap p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AnimatedSkinnedAvatar
                          avatarId={player.avatar}
                          customPhotoUrl={player.customPhotoUrl}
                          skinId={skin.id}
                          size="md"
                        />
                        <div className="min-w-0">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[9px] font-mono uppercase rounded border ${getRarityBadgeClasses(
                              skin.rarity
                            )}`}
                          >
                            {skin.rarity}
                          </span>
                          <div className="text-sm font-bold truncate mt-0.5">
                            {skin.name}
                          </div>
                          <div className="text-[11px] text-[#514d44] truncate">
                            {skin.animationLabel}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onEquipSkin(
                            equipped ? 'skin-classic-notebook' : skin.id,
                            applyToCouple
                          )
                        }
                        className={`px-2.5 py-1.5 text-xs font-bold border border-[#38352f] shrink-0 ${
                          equipped
                            ? 'bg-[#f0dfa0] text-[#38352f]'
                            : 'bg-[#9e3a2e] text-[#fcf8ef]'
                        }`}
                      >
                        {equipped
                          ? skin.id === 'skin-classic-notebook'
                            ? 'Active'
                            : 'Unequip'
                          : 'Equip'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Owned Banners Section */}
          {(inventoryCategory === 'all' || inventoryCategory === 'banners') && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-mono uppercase tracking-wider text-[#514d44]">
                Owned Profile Banners ({unlockedBanners.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ARCADE_BANNERS.filter((b) => unlockedBanners.includes(b.id)).map(
                  (banner) => {
                    const equipped =
                      getBannerById(player.equippedBanner || 'banner-warm-sketchbook').id ===
                      banner.id;
                    return (
                      <div key={banner.id} className="sketch-scrap p-3.5 space-y-2.5">
                        <ProfileBannerBackdrop bannerId={banner.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <AnimatedSkinnedAvatar
                                avatarId={player.avatar}
                                customPhotoUrl={player.customPhotoUrl}
                                skinId={player.equippedSkin}
                                size="sm"
                              />
                              <span
                                className="text-xs font-bold"
                                style={{ color: '#fcf8ef' }}
                              >
                                {banner.name}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getRarityBadgeClasses(
                                banner.rarity
                              )}`}
                            >
                              {banner.rarity}
                            </span>
                          </div>
                        </ProfileBannerBackdrop>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#514d44] truncate">
                            {banner.description}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onEquipBanner(
                                equipped ? 'banner-warm-sketchbook' : banner.id,
                                applyToCouple
                              )
                            }
                            className={`px-3 py-1 text-xs font-bold border border-[#38352f] shrink-0 ${
                              equipped
                                ? 'bg-[#f0dfa0] text-[#38352f]'
                                : 'bg-[#9e3a2e] text-[#fcf8ef]'
                            }`}
                          >
                            {equipped
                              ? banner.id === 'banner-warm-sketchbook'
                                ? 'Active'
                                : 'Unequip'
                              : 'Equip'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* 3. Stored Chests Section */}
          {(inventoryCategory === 'all' || inventoryCategory === 'chests') && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-mono uppercase tracking-wider text-[#514d44]">
                Stored Chests ({totalChestsOwned})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {ARCADE_CHESTS.map((chest) => {
                  const qty = chestInv[chest.tier] || 0;
                  return (
                    <div
                      key={chest.id}
                      className={`sketch-scrap p-3.5 text-center flex flex-col items-center justify-between space-y-2 ${
                        qty === 0 ? 'opacity-65' : ''
                      }`}
                    >
                      <CustomChestArtwork tier={chest.tier} size={64} />
                      <div>
                        <div className="text-xs font-bold">{chest.name}</div>
                        <div className="text-[11px] font-mono text-[#514d44]">
                          Quantity: <strong>{qty}</strong>
                        </div>
                      </div>
                      {qty > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleTriggerOpenChest(chest.tier, 'inventory')
                          }
                          className="w-full py-1.5 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border border-[#38352f]"
                        >
                          Open Chest
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab('chests')}
                          className="w-full py-1.5 text-[11px] font-mono bg-[#fcf8ef] border border-[#b3ac9d]"
                        >
                          Get in Shop
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Owned Challenge Keys Section */}
          {(inventoryCategory === 'all' || inventoryCategory === 'keys') && (
            <div className="space-y-2.5">
              <h4 className="text-sm font-mono uppercase tracking-wider text-[#514d44]">
                Challenge Keys ({totalKeysOwned})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {ARCADE_KEYS.map((k) => {
                  const qty = keyInv[k.tier] || 0;
                  return (
                    <div
                      key={k.id}
                      className={`sketch-scrap p-3.5 text-center flex flex-col items-center justify-between space-y-2 ${
                        qty === 0 ? 'opacity-65' : ''
                      }`}
                    >
                      <CustomKeyArtwork tier={k.tier} size={52} />
                      <div>
                        <div className="text-xs font-bold">{k.name}</div>
                        <div className="text-[10px] text-[#514d44]">
                          {k.challengeSourceLabel}
                        </div>
                        <div className="text-[11px] font-mono mt-1">
                          Owned: <strong>{qty}</strong>
                        </div>
                      </div>
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => handleTriggerOpenChest(k.tier, 'key')}
                          className="w-full py-1.5 text-xs font-bold bg-[#f0dfa0] text-[#38352f] border border-[#38352f]"
                        >
                          Unlock {k.tier} Chest
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Chest Openings History */}
          {chestOpenings.length > 0 && (
            <div className="sketch-strip p-4 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#514d44]">
                Recent Verified Chest Openings
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {chestOpenings.slice(0, 10).map((op) => (
                  <div
                    key={op.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 border-b border-[#b3ac9d]/40 last:border-none"
                  >
                    <span>
                      Opened <strong>{op.chestTier} Chest</strong> ({op.openMethod}) →{' '}
                      <strong>{op.rewardName}</strong> ({op.rewardRarity}{' '}
                      {op.rewardCategory})
                    </span>
                    <span className="font-mono text-[11px]">
                      {op.wasDuplicate
                        ? `Duplicate → +${op.duplicateCoinsAwarded} Coins`
                        : 'New Unlock'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GSAP Chest Opening & Card-Drawing Ceremony Modal */}
      <ChestOpeningCeremonyModal
        isOpen={ceremonyOpen}
        chestTier={ceremonyTier}
        openingResult={ceremonyResult}
        playerAvatarId={player.avatar}
        playerCustomPhotoUrl={player.customPhotoUrl}
        onClose={() => setCeremonyOpen(false)}
        onEquipReward={async (category, itemId) => {
          if (category === 'skin') {
            await onEquipSkin(itemId, applyToCouple);
            setPreviewSkinId(itemId);
          } else {
            await onEquipBanner(itemId, applyToCouple);
            setPreviewBannerId(itemId);
          }
        }}
      />
    </div>
  );
}
