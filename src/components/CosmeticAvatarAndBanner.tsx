'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  X,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ARCADE_SKINS,
  ARCADE_BANNERS,
  ARCADE_KEYS,
  ARCADE_CHESTS,
  SkinRarity,
  getSkinById,
  getBannerById,
  getKeyByTier,
  getChestByTier,
} from '@/src/lib/arcade-data';

export function getRarityBadgeClasses(rarity: SkinRarity): string {
  switch (rarity) {
    case 'Legendary':
      return 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-600/60';
    case 'Epic':
      return 'bg-purple-500/20 text-purple-900 dark:text-purple-200 border-purple-600/60';
    case 'Rare':
      return 'bg-sky-500/20 text-sky-900 dark:text-sky-200 border-sky-600/60';
    case 'Uncommon':
      return 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-600/60';
    case 'Common':
    default:
      return 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/50';
  }
}

/* ============================================================================
   1. SKIN-BASED AVATAR FRAMES & UNIQUE PER-SKIN ANIMATIONS
   ============================================================================ */

interface AnimatedSkinnedAvatarProps {
  avatarId?: string;
  customPhotoUrl?: string;
  skinId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRarityBadge?: boolean;
}

const SIZE_CONFIG = {
  xs: { box: 'w-8 h-8', inner: 'w-6 h-6 text-xs', svgSize: 36 },
  sm: { box: 'w-11 h-11', inner: 'w-8 h-8 text-base', svgSize: 48 },
  md: { box: 'w-14 h-14', inner: 'w-11 h-11 text-xl', svgSize: 64 },
  lg: { box: 'w-20 h-20', inner: 'w-16 h-16 text-3xl', svgSize: 88 },
  xl: { box: 'w-28 h-28', inner: 'w-22 h-22 text-4xl', svgSize: 120 },
};

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

export function AnimatedSkinnedAvatar({
  avatarId = 'kitsune',
  customPhotoUrl = '',
  skinId = 'skin-classic-notebook',
  size = 'md',
  className = '',
  showRarityBadge = false,
}: AnimatedSkinnedAvatarProps) {
  const skin = getSkinById(skinId) || ARCADE_SKINS[ARCADE_SKINS.length - 1];
  const avatarEmoji = getAvatarEmoji(avatarId);
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const hasPhoto = Boolean(customPhotoUrl && customPhotoUrl.trim().length > 0);

  const primary = skin.framePrimaryColor || '#38352f';
  const secondary = skin.frameSecondaryColor || '#b3ac9d';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${cfg.box} ${className}`}
      title={`${skin.name} (${skin.rarity} Frame · ${skin.animationLabel})`}
    >
      {/* Unique SVG Animated Frame Overlay Surrounding the Profile Picture */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
        aria-hidden="true"
      >
        {/* 1. LEGENDARY: Solar Eclipse Sovereign — Corona Rays + Orbiting Sunspot */}
        {skin.animationStyle === 'solar_eclipse_corona' && (
          <>
            <g className="hla-anim-corona-pulse">
              {Array.from({ length: 12 }).map((_, idx) => {
                const angle = idx * 30;
                return (
                  <polygon
                    key={idx}
                    points="50,1 47,12 53,12"
                    fill={idx % 2 === 0 ? primary : secondary}
                    opacity={0.9}
                    transform={`rotate(${angle} 50 50)`}
                  />
                );
              })}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={primary}
                strokeWidth="2.8"
                strokeDasharray="6 3"
              />
            </g>
            <g className="hla-anim-orbit-cw">
              <circle
                cx="50"
                cy="50"
                r="41"
                fill="none"
                stroke={secondary}
                strokeWidth="2.2"
              />
              <circle cx="50" cy="9" r="4.5" fill={primary} stroke="#1e1b18" strokeWidth="1.5" />
              <circle cx="50" cy="91" r="3.5" fill={secondary} stroke="#1e1b18" strokeWidth="1.2" />
            </g>
            {/* Top Sovereign Crown */}
            <path
              d="M38 11 L43 3 L50 9 L57 3 L62 11 Z"
              fill={primary}
              stroke="#38352f"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* 2. LEGENDARY: Celestial Waltz — Counter-Rotating Astrolabe & Orbiting Stars */}
        {skin.animationStyle === 'celestial_waltz_orbit' && (
          <>
            <g className="hla-anim-orbit-ccw">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={secondary}
                strokeWidth="1.8"
                strokeDasharray="4 4"
              />
              <polygon
                points="50,2 52,7 57,7 53,10 54,15 50,12 46,15 47,10 43,7 48,7"
                fill={primary}
              />
              <polygon
                points="50,98 52,93 57,93 53,90 54,85 50,88 46,85 47,90 43,93 48,93"
                fill={primary}
              />
            </g>
            <g className="hla-anim-orbit-cw">
              <circle
                cx="50"
                cy="50"
                r="41"
                fill="none"
                stroke={primary}
                strokeWidth="2.6"
              />
              <circle cx="9" cy="50" r="3.8" fill={primary} />
              <circle cx="91" cy="50" r="3.8" fill={secondary} />
              <path
                d="M82 18 A7 7 0 1 1 74 26 A5 5 0 1 0 82 18 Z"
                fill={primary}
              />
            </g>
          </>
        )}

        {/* 3. EPIC: Midnight Lantern River — Swaying Lanterns & Floating Fireflies */}
        {skin.animationStyle === 'lantern_river_sway' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={secondary}
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="44.5"
              fill="none"
              stroke={primary}
              strokeWidth="1.5"
              strokeDasharray="8 4"
            />
            <g className="hla-anim-lantern-sway">
              {/* Left & Right glowing paper lanterns */}
              <rect
                x="4"
                y="43"
                width="9"
                height="13"
                rx="4"
                fill={primary}
                stroke="#38352f"
                strokeWidth="1.4"
              />
              <rect
                x="87"
                y="43"
                width="9"
                height="13"
                rx="4"
                fill={primary}
                stroke="#38352f"
                strokeWidth="1.4"
              />
              <circle cx="22" cy="16" r="2.8" fill="#fde68a" />
              <circle cx="78" cy="18" r="2.5" fill="#fde68a" />
              <circle cx="50" cy="93" r="3" fill={primary} />
            </g>
          </>
        )}

        {/* 4. EPIC: Velvet Clockwork Heart — Step-Ticking Brass Escapement Gear */}
        {skin.animationStyle === 'clockwork_escapement' && (
          <>
            <g className="hla-anim-gear-step">
              {Array.from({ length: 12 }).map((_, idx) => (
                <rect
                  key={idx}
                  x="47"
                  y="3"
                  width="6"
                  height="7"
                  rx="1.5"
                  fill={primary}
                  stroke="#38352f"
                  strokeWidth="1.2"
                  transform={`rotate(${idx * 30} 50 50)`}
                />
              ))}
              <circle
                cx="50"
                cy="50"
                r="41.5"
                fill="none"
                stroke={primary}
                strokeWidth="3"
              />
            </g>
            <circle
              cx="50"
              cy="50"
              r="38.5"
              fill="none"
              stroke={secondary}
              strokeWidth="1.6"
              strokeDasharray="3 3"
            />
            {/* Bottom Brass Heart Escapement Jewel */}
            <path
              d="M50 96 C45 91 42 88 45 85 C47 83 50 86 50 86 C50 86 53 83 55 85 C58 88 55 91 50 96 Z"
              fill={secondary}
              stroke="#38352f"
              strokeWidth="1.2"
            />
          </>
        )}

        {/* 5. EPIC: Sakura Ink Scroll — Floating Cherry Blossom Petals */}
        {skin.animationStyle === 'sakura_petal_drift' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="41.5"
              fill="none"
              stroke={primary}
              strokeWidth="2.8"
            />
            <circle
              cx="50"
              cy="50"
              r="44.5"
              fill="none"
              stroke={secondary}
              strokeWidth="1.4"
              strokeDasharray="10 5"
            />
            <g className="hla-anim-petal-float">
              <ellipse
                cx="18"
                cy="20"
                rx="5"
                ry="3"
                transform="rotate(-30 18 20)"
                fill={secondary}
                stroke={primary}
                strokeWidth="1.2"
              />
              <ellipse
                cx="83"
                cy="24"
                rx="5"
                ry="3"
                transform="rotate(35 83 24)"
                fill={secondary}
                stroke={primary}
                strokeWidth="1.2"
              />
              <ellipse
                cx="80"
                cy="80"
                rx="4.5"
                ry="2.8"
                transform="rotate(-25 80 80)"
                fill={secondary}
                stroke={primary}
                strokeWidth="1.2"
              />
              <ellipse
                cx="20"
                cy="78"
                rx="4.5"
                ry="2.8"
                transform="rotate(20 20 78)"
                fill={secondary}
                stroke={primary}
                strokeWidth="1.2"
              />
            </g>
          </>
        )}

        {/* 6. RARE: Starlight Compass — Sweeping Magnetic Pointer & Cardinal Ticks */}
        {skin.animationStyle === 'starlight_compass_sweep' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={primary}
              strokeWidth="2.8"
            />
            {/* N E S W Cardinal Marks */}
            <rect x="48.5" y="3" width="3" height="7" fill={secondary} />
            <rect x="48.5" y="90" width="3" height="7" fill={primary} />
            <rect x="3" y="48.5" width="7" height="3" fill={primary} />
            <rect x="90" y="48.5" width="7" height="3" fill={primary} />
            <g className="hla-anim-compass-sweep">
              <polygon
                points="50,3 46,13 54,13"
                fill={secondary}
                stroke="#38352f"
                strokeWidth="1.2"
              />
            </g>
          </>
        )}

        {/* 7. UNCOMMON: Pressed Botanical — Herbarium Clover Leaves */}
        {skin.animationStyle === 'botanical_clover_bloom' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="41.5"
              fill="none"
              stroke={primary}
              strokeWidth="2.5"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={secondary}
              strokeWidth="1.4"
              strokeDasharray="5 4"
            />
            <g className="hla-anim-petal-float">
              <circle cx="16" cy="18" r="4" fill={secondary} stroke={primary} strokeWidth="1.2" />
              <circle cx="21" cy="15" r="4" fill={secondary} stroke={primary} strokeWidth="1.2" />
              <circle cx="84" cy="82" r="4" fill={secondary} stroke={primary} strokeWidth="1.2" />
              <circle cx="79" cy="85" r="4" fill={secondary} stroke={primary} strokeWidth="1.2" />
            </g>
          </>
        )}

        {/* 8. UNCOMMON: Strawberry Wax Seal — Pulsing Scalloped Crimson Wax Stamp */}
        {skin.animationStyle === 'strawberry_wax_pulse' && (
          <>
            <g className="hla-anim-wax-pulse">
              <circle
                cx="50"
                cy="50"
                r="42.5"
                fill="none"
                stroke={primary}
                strokeWidth="3.2"
                strokeDasharray="7 3"
              />
              <circle
                cx="50"
                cy="50"
                r="39.5"
                fill="none"
                stroke={secondary}
                strokeWidth="1.5"
              />
              <circle
                cx="82"
                cy="82"
                r="7.5"
                fill={primary}
                stroke="#fcf8ef"
                strokeWidth="1.5"
              />
            </g>
          </>
        )}

        {/* 9. COMMON: Classic Sketchbook — Double Hand-Drawn Graphite Ring */}
        {skin.animationStyle === 'sketchbook_graphite_tick' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="41.5"
              fill="none"
              stroke={primary}
              strokeWidth="2.2"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={secondary}
              strokeWidth="1.2"
              strokeDasharray="6 4"
            />
          </>
        )}

        {/* 10. COMMON: Warm Kraft Paper — Stitched Border & Swinging Twine Tag */}
        {skin.animationStyle === 'kraft_twine_swing' && (
          <>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={primary}
              strokeWidth="2.4"
              strokeDasharray="5 3"
            />
            <g className="hla-anim-twine-swing">
              <path
                d="M44 89 L50 96 L56 89 Z"
                fill={secondary}
                stroke={primary}
                strokeWidth="1.3"
              />
            </g>
          </>
        )}
      </svg>

      {/* Layer 2: User's Uploaded Profile Picture or Character Emoji (Never Modified by Frame) */}
      <div
        className={`relative z-10 rounded-full overflow-hidden flex items-center justify-center bg-[#fcf8ef] dark:bg-[#28241f] border border-[#38352f]/30 shadow-inner ${cfg.inner}`}
      >
        {hasPhoto ? (
          <img
            src={customPhotoUrl}
            alt="Player profile avatar"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="leading-none select-none">{avatarEmoji}</span>
        )}
      </div>

      {showRarityBadge && (
        <span
          className={`absolute -bottom-1.5 z-30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border rounded ${getRarityBadgeClasses(
            skin.rarity
          )}`}
        >
          {skin.rarity}
        </span>
      )}
    </div>
  );
}

/* ============================================================================
   2. RECTANGULAR PROFILE BANNERS (5 RARITIES, INDEPENDENT LAYER)
   ============================================================================ */

interface ProfileBannerBackdropProps {
  bannerId?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ProfileBannerBackdrop({
  bannerId = 'banner-warm-sketchbook',
  className = '',
  children,
}: ProfileBannerBackdropProps) {
  const banner = getBannerById(bannerId) || ARCADE_BANNERS[ARCADE_BANNERS.length - 2];

  return (
    <div
      className={`relative overflow-hidden border-[1.5px] border-[#38352f] rounded-[12px_6px_14px_6px] ${className}`}
      style={{
        background: `linear-gradient(125deg, ${banner.primaryColor} 0%, ${banner.secondaryColor} 100%)`,
      }}
    >
      {/* Decorative Vector Artwork Pattern per Banner */}
      <svg
        viewBox="0 0 600 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
        aria-hidden="true"
      >
        {banner.artworkPattern === 'solar_eclipse_sanctuary' && (
          <>
            <circle cx="490" cy="80" r="62" fill="none" stroke={banner.accentColor} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />
            <circle cx="490" cy="80" r="42" fill="none" stroke={banner.accentColor} strokeWidth="1.2" opacity="0.5" />
            <path d="M40 130 Q 220 20 560 110" fill="none" stroke={banner.accentColor} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.55" />
            <circle cx="130" cy="44" r="3" fill={banner.accentColor} />
            <circle cx="240" cy="32" r="4" fill="#ffffff" />
            <circle cx="350" cy="52" r="3" fill={banner.accentColor} />
            <circle cx="490" cy="80" r="7" fill={banner.accentColor} />
            <path d="M510 38 A18 18 0 1 1 492 58 A14 14 0 1 0 510 38 Z" fill={banner.accentColor} opacity="0.85" />
          </>
        )}

        {banner.artworkPattern === 'imperial_clockwork_orrery' && (
          <>
            <circle cx="480" cy="80" r="56" fill="none" stroke={banner.accentColor} strokeWidth="2" strokeDasharray="8 4" opacity="0.5" />
            <circle cx="480" cy="80" r="34" fill="none" stroke={banner.accentColor} strokeWidth="1.5" opacity="0.45" />
            <circle cx="380" cy="60" r="24" fill="none" stroke={banner.accentColor} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.45" />
          </>
        )}

        {banner.artworkPattern === 'astral_swan_nocturne' && (
          <>
            <path d="M40 130 Q 260 30 560 120" fill="none" stroke={banner.accentColor} strokeWidth="1.6" strokeDasharray="5 4" opacity="0.5" />
            <circle cx="510" cy="46" r="22" fill={banner.accentColor} opacity="0.28" />
            <circle cx="180" cy="42" r="3" fill="#ffffff" />
            <circle cx="320" cy="28" r="3.5" fill={banner.accentColor} />
          </>
        )}

        {banner.artworkPattern === 'moonlit_sakura_bridge' && (
          <>
            <circle cx="515" cy="75" r="46" fill={banner.accentColor} opacity="0.32" />
            <path d="M360 160 L410 95 L575 95 L595 160 Z" fill={banner.accentColor} opacity="0.24" />
            <ellipse cx="140" cy="42" rx="9" ry="5" transform="rotate(-25 140 42)" fill={banner.accentColor} opacity="0.65" />
            <ellipse cx="260" cy="68" rx="8" ry="4.5" transform="rotate(20 260 68)" fill={banner.accentColor} opacity="0.6" />
            <ellipse cx="390" cy="36" rx="10" ry="5" transform="rotate(-15 390 36)" fill={banner.accentColor} opacity="0.7" />
            <ellipse cx="460" cy="115" rx="8" ry="4" transform="rotate(32 460 115)" fill={banner.accentColor} opacity="0.65" />
          </>
        )}

        {banner.artworkPattern === 'river_lantern_festival' && (
          <>
            <path d="M0 135 Q 300 75 600 135" fill="none" stroke={banner.accentColor} strokeWidth="2.5" opacity="0.55" />
            <rect x="150" y="34" width="18" height="24" rx="6" fill={banner.accentColor} opacity="0.75" />
            <rect x="290" y="24" width="20" height="26" rx="7" fill={banner.accentColor} opacity="0.75" />
            <rect x="440" y="38" width="18" height="24" rx="6" fill={banner.accentColor} opacity="0.75" />
            <circle cx="210" cy="115" r="3.5" fill={banner.accentColor} opacity="0.8" />
            <circle cx="370" cy="122" r="4" fill={banner.accentColor} opacity="0.8" />
            <circle cx="510" cy="110" r="3" fill={banner.accentColor} opacity="0.8" />
          </>
        )}

        {banner.artworkPattern === 'celestial_compass_chart' && (
          <>
            <path d="M0 125 Q 150 110 300 125 T 600 125" fill="none" stroke={banner.accentColor} strokeWidth="2" opacity="0.5" />
            <circle cx="490" cy="76" r="44" fill="none" stroke={banner.accentColor} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
            <polygon points="490,34 498,68 532,76 498,84 490,118 482,84 448,76 482,68" fill={banner.accentColor} opacity="0.4" />
          </>
        )}

        {banner.artworkPattern === 'pressed_clover_herbarium' && (
          <>
            <path d="M350 160 Q 430 60 580 20" fill="none" stroke={banner.accentColor} strokeWidth="2" opacity="0.45" />
            <ellipse cx="420" cy="95" rx="18" ry="9" transform="rotate(-35 420 95)" fill={banner.accentColor} opacity="0.38" />
            <ellipse cx="470" cy="65" rx="18" ry="9" transform="rotate(25 470 65)" fill={banner.accentColor} opacity="0.38" />
            <ellipse cx="525" cy="45" rx="16" ry="8" transform="rotate(-25 525 45)" fill={banner.accentColor} opacity="0.38" />
          </>
        )}

        {banner.artworkPattern === 'strawberry_airmail_parlor' && (
          <>
            <rect x="360" y="-15" width="140" height="42" transform="rotate(14 360 0)" fill={banner.accentColor} opacity="0.28" />
            <rect x="450" y="85" width="150" height="40" transform="rotate(-12 450 85)" fill={banner.accentColor} opacity="0.28" />
            <circle cx="240" cy="50" r="14" fill={banner.accentColor} opacity="0.22" />
          </>
        )}

        {banner.artworkPattern === 'warm_sketchbook_grid' && (
          <>
            {Array.from({ length: 15 }).map((_, i) => (
              <line
                key={`sg-${i}`}
                x1={i * 42}
                y1="0"
                x2={i * 42}
                y2="160"
                stroke={banner.accentColor}
                strokeWidth="0.8"
                opacity="0.18"
              />
            ))}
            <line x1="0" y1="45" x2="600" y2="45" stroke={banner.accentColor} strokeWidth="0.8" opacity="0.25" />
            <line x1="0" y1="95" x2="600" y2="95" stroke={banner.accentColor} strokeWidth="0.8" opacity="0.25" />
            <line x1="72" y1="0" x2="72" y2="160" stroke="#9e3a2e" strokeWidth="1.2" opacity="0.35" />
          </>
        )}

        {banner.artworkPattern === 'kraft_twine_postscript' && (
          <>
            <rect
              x="460"
              y="22"
              width="105"
              height="68"
              fill="none"
              stroke={banner.accentColor}
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity="0.45"
            />
            <circle cx="410" cy="95" r="28" fill="none" stroke={banner.accentColor} strokeWidth="1.8" opacity="0.4" />
            <line x1="370" y1="88" x2="450" y2="88" stroke={banner.accentColor} strokeWidth="1.2" opacity="0.4" />
            <line x1="370" y1="102" x2="450" y2="102" stroke={banner.accentColor} strokeWidth="1.2" opacity="0.4" />
          </>
        )}
      </svg>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ============================================================================
   3. THREE-LAYER COMPOSITE PROFILE HEADER (BANNER + UPLOADED PHOTO + SKIN FRAME)
   ============================================================================ */

interface ThreeLayerProfileHeaderProps {
  username: string;
  titleOrSubtitle?: string;
  avatarId?: string;
  customPhotoUrl?: string;
  equippedSkinId?: string;
  equippedBannerId?: string;
  level?: number;
  coins?: number;
  onOpenPhotoUpload?: () => void;
  onOpenCosmeticsVault?: () => void;
  compact?: boolean;
}

export function ThreeLayerProfileHeader({
  username,
  titleOrSubtitle,
  avatarId = 'kitsune',
  customPhotoUrl = '',
  equippedSkinId = 'skin-classic-notebook',
  equippedBannerId = 'banner-sketchbook-grid',
  level = 1,
  coins,
  onOpenPhotoUpload,
  onOpenCosmeticsVault,
  compact = false,
}: ThreeLayerProfileHeaderProps) {
  const skin = getSkinById(equippedSkinId) || ARCADE_SKINS[ARCADE_SKINS.length - 1];
  const banner = getBannerById(equippedBannerId) || ARCADE_BANNERS[ARCADE_BANNERS.length - 2];

  return (
    <ProfileBannerBackdrop
      bannerId={banner.id}
      className={compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-6'}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Layer 2 & 3: Uploaded Profile Picture + Equipped Skin Animated Frame */}
          <div className="relative group shrink-0">
            <AnimatedSkinnedAvatar
              avatarId={avatarId}
              customPhotoUrl={customPhotoUrl}
              skinId={skin.id}
              size={compact ? 'md' : 'lg'}
            />
            {onOpenPhotoUpload && (
              <button
                type="button"
                onClick={onOpenPhotoUpload}
                title="Upload or crop profile picture"
                className="absolute -bottom-1 -right-1 z-30 w-7 h-7 rounded-full bg-[#fcf8ef] text-[#38352f] border-[1.5px] border-[#38352f] shadow flex items-center justify-center hover:bg-[#f0dfa0] transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Player Identity & Cosmetic Layer Pill Tags */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="text-lg sm:text-xl font-bold truncate"
                style={{ color: '#fcf8ef' }}
              >
                {username || 'Player'}
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#fcf8ef]/90 text-[#38352f] border border-[#38352f]/40">
                Lv.{level}
              </span>
              {typeof coins === 'number' && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#f0dfa0]/95 text-[#38352f] border border-[#38352f]/40">
                  {coins.toLocaleString()} Coins
                </span>
              )}
            </div>
            {titleOrSubtitle && (
              <p
                className="text-xs sm:text-sm opacity-90 truncate mt-0.5"
                style={{ color: banner.accentColor }}
              >
                {titleOrSubtitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#fcf8ef]/90 text-[#38352f] border border-[#38352f]/30">
                Frame: {skin.name} ({skin.rarity})
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#fcf8ef]/90 text-[#38352f] border border-[#38352f]/30">
                Banner: {banner.name} ({banner.rarity})
              </span>
            </div>
          </div>
        </div>

        {(onOpenPhotoUpload || onOpenCosmeticsVault) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenPhotoUpload && (
              <button
                type="button"
                onClick={onOpenPhotoUpload}
                className="px-3 py-1.5 text-xs font-medium bg-[#fcf8ef]/95 hover:bg-[#f0dfa0] text-[#38352f] border-[1.5px] border-[#38352f] flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{customPhotoUrl ? 'Edit Photo' : 'Upload Photo'}</span>
              </button>
            )}
            {onOpenCosmeticsVault && (
              <button
                type="button"
                onClick={onOpenCosmeticsVault}
                className="px-3 py-1.5 text-xs font-medium bg-[#f0dfa0] hover:bg-[#e5d188] text-[#38352f] border-[1.5px] border-[#38352f] flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Skins & Banners</span>
              </button>
            )}
          </div>
        )}
      </div>
    </ProfileBannerBackdrop>
  );
}

/* ============================================================================
   4. CUSTOM KEY ARTWORK & 5-TIER CHEST ARTWORK (SVG ILLUSTRATIONS)
   ============================================================================ */

export function CustomKeyArtwork({
  tier,
  size = 44,
  className = '',
}: {
  tier: SkinRarity;
  size?: number;
  className?: string;
}) {
  const keyDef = getKeyByTier(tier) || ARCADE_KEYS[0];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 select-none ${className}`}
      aria-label={keyDef.name}
    >
      {/* Subtle Rarity Glow Aura for Rare / Epic / Legendary */}
      {(tier === 'Rare' || tier === 'Epic' || tier === 'Legendary') && (
        <circle
          cx="32"
          cy="32"
          r="28"
          fill={keyDef.glowColor}
          opacity={tier === 'Legendary' ? 0.25 : 0.16}
        />
      )}

      {/* Key Shaft & Bit Teeth */}
      <g transform="rotate(-35 32 32)">
        <rect
          x="29"
          y="24"
          width="6"
          height="30"
          rx="2"
          fill={keyDef.primaryColor}
          stroke="#38352f"
          strokeWidth="2"
        />

        {/* Tier-Progressive Key Teeth */}
        {tier === 'Common' && (
          <rect
            x="35"
            y="44"
            width="7"
            height="6"
            rx="1"
            fill={keyDef.secondaryColor}
            stroke="#38352f"
            strokeWidth="1.8"
          />
        )}
        {tier === 'Uncommon' && (
          <>
            <rect x="35" y="40" width="7" height="4" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
            <rect x="35" y="47" width="9" height="5" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
          </>
        )}
        {tier === 'Rare' && (
          <>
            <rect x="35" y="39" width="9" height="4" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
            <rect x="35" y="46" width="11" height="6" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
            <rect x="23" y="44" width="6" height="5" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
          </>
        )}
        {tier === 'Epic' && (
          <>
            <path
              d="M35 38 L46 38 L46 43 L40 43 L40 46 L48 46 L48 52 L35 52 Z"
              fill={keyDef.secondaryColor}
              stroke="#38352f"
              strokeWidth="1.6"
            />
            <rect x="22" y="42" width="7" height="7" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.6" />
          </>
        )}
        {tier === 'Legendary' && (
          <>
            <path
              d="M35 36 L49 36 L49 42 L41 42 L41 45 L51 45 L51 52 L35 52 Z"
              fill={keyDef.secondaryColor}
              stroke="#38352f"
              strokeWidth="1.6"
            />
            <path
              d="M29 38 L19 42 L29 48 Z"
              fill={keyDef.secondaryColor}
              stroke="#38352f"
              strokeWidth="1.6"
            />
          </>
        )}

        {/* Key Bow (Head) */}
        {tier === 'Common' && (
          <circle
            cx="32"
            cy="16"
            r="10"
            fill={keyDef.secondaryColor}
            stroke="#38352f"
            strokeWidth="2.2"
          />
        )}
        {tier === 'Uncommon' && (
          <>
            <circle cx="27" cy="16" r="6.5" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.8" />
            <circle cx="37" cy="16" r="6.5" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.8" />
            <circle cx="32" cy="11" r="6.5" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.8" />
          </>
        )}
        {tier === 'Rare' && (
          <>
            <circle cx="32" cy="16" r="11.5" fill={keyDef.primaryColor} stroke="#38352f" strokeWidth="2" />
            <polygon points="32,6 35,13 42,16 35,19 32,26 29,19 22,16 29,13" fill={keyDef.secondaryColor} />
          </>
        )}
        {tier === 'Epic' && (
          <>
            <path d="M18 18 Q 14 8 25 11 L32 16 L39 11 Q 50 8 46 18 Z" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.8" />
            <circle cx="32" cy="16" r="9.5" fill={keyDef.primaryColor} stroke="#38352f" strokeWidth="2" />
            <circle cx="32" cy="16" r="4.5" fill="#f5d0fe" />
          </>
        )}
        {tier === 'Legendary' && (
          <>
            <path d="M14 19 Q 10 6 24 10 L32 4 L40 10 Q 54 6 50 19 Z" fill={keyDef.secondaryColor} stroke="#38352f" strokeWidth="1.8" />
            <circle cx="32" cy="16" r="10.5" fill={keyDef.primaryColor} stroke="#38352f" strokeWidth="2" />
            <circle cx="32" cy="16" r="5" fill="#fef08a" stroke="#9e3a2e" strokeWidth="1.5" />
          </>
        )}

        {/* Inner Keyhole Cutout for Common/Uncommon */}
        {(tier === 'Common' || tier === 'Uncommon') && (
          <circle cx="32" cy="16" r="3.5" fill="#fcf8ef" stroke="#38352f" strokeWidth="1.5" />
        )}
      </g>
    </svg>
  );
}

export function CustomChestArtwork({
  tier,
  size = 84,
  isOpen = false,
  className = '',
}: {
  tier: SkinRarity;
  size?: number;
  isOpen?: boolean;
  className?: string;
}) {
  const chest = getChestByTier(tier) || ARCADE_CHESTS[0];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={`shrink-0 select-none ${className}`}
      aria-label={chest.name}
    >
      {/* Background Glow */}
      {(tier === 'Rare' || tier === 'Epic' || tier === 'Legendary') && (
        <circle
          cx="48"
          cy="50"
          r="40"
          fill={chest.accentColor}
          opacity={tier === 'Legendary' ? 0.3 : 0.18}
        />
      )}

      {/* Chest Base Box */}
      <rect
        x="16"
        y="46"
        width="64"
        height="34"
        rx="6"
        fill={chest.primaryColor}
        stroke="#38352f"
        strokeWidth="2.6"
      />

      {/* Vertical Metal Straps */}
      <rect
        x="26"
        y="46"
        width="8"
        height="34"
        fill={chest.secondaryColor}
        stroke="#38352f"
        strokeWidth="1.8"
      />
      <rect
        x="62"
        y="46"
        width="8"
        height="34"
        fill={chest.secondaryColor}
        stroke="#38352f"
        strokeWidth="1.8"
      />

      {/* Inner Glow When Open */}
      {isOpen && (
        <ellipse
          cx="48"
          cy="45"
          rx="28"
          ry="10"
          fill={chest.accentColor}
          opacity="0.85"
        />
      )}

      {/* Chest Lid */}
      <g
        transform={isOpen ? 'translate(0, -14) rotate(-8 48 34)' : undefined}
      >
        <path
          d="M14 46 C14 26 82 26 82 46 Z"
          fill={chest.primaryColor}
          stroke="#38352f"
          strokeWidth="2.6"
        />
        <path
          d="M26 46 L26 31 L34 29 L34 46 Z"
          fill={chest.secondaryColor}
          stroke="#38352f"
          strokeWidth="1.8"
        />
        <path
          d="M62 46 L62 29 L70 31 L70 46 Z"
          fill={chest.secondaryColor}
          stroke="#38352f"
          strokeWidth="1.8"
        />
        {/* Crown Crest for Legendary */}
        {tier === 'Legendary' && (
          <path
            d="M36 27 L41 16 L48 23 L55 16 L60 27 Z"
            fill={chest.secondaryColor}
            stroke="#38352f"
            strokeWidth="2"
          />
        )}
      </g>

      {/* Center Lock Escutcheon */}
      <rect
        x="41"
        y="40"
        width="14"
        height="16"
        rx="4"
        fill={chest.secondaryColor}
        stroke="#38352f"
        strokeWidth="2.2"
      />
      <circle cx="48" cy="46" r="2.6" fill="#38352f" />
      <path d="M46.5 47 L45.5 52 L50.5 52 L49.5 47 Z" fill="#38352f" />
    </svg>
  );
}

/* ============================================================================
   5. PROFILE PICTURE UPLOAD, PREVIEW & CROP STUDIO MODAL
   ============================================================================ */

interface ProfilePhotoUploadAndCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  avatarId?: string;
  equippedSkinId?: string;
  equippedBannerId?: string;
  username?: string;
  onSavePhoto: (croppedDataUrl: string) => Promise<void>;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export function ProfilePhotoUploadAndCropModal({
  isOpen,
  onClose,
  currentPhotoUrl = '',
  avatarId = 'kitsune',
  equippedSkinId = 'skin-classic-notebook',
  equippedBannerId = 'banner-sketchbook-grid',
  username = 'Player',
  onSavePhoto,
}: ProfilePhotoUploadAndCropModalProps) {
  const [sourceImageObj, setSourceImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string>(currentPhotoUrl || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        setCroppedPreviewUrl(currentPhotoUrl || '');
        setSourceImageObj(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setErrorMsg(null);
      });
    }
  }, [isOpen, currentPhotoUrl]);

  // Render square crop to hidden/visible canvas whenever sourceImageObj, zoom, or pan changes
  const renderSquareCrop = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !sourceImageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280; // Output 280x280 crisp square avatar
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#fcf8ef';
    ctx.fillRect(0, 0, size, size);

    const imgW = sourceImageObj.naturalWidth || sourceImageObj.width || 1;
    const imgH = sourceImageObj.naturalHeight || sourceImageObj.height || 1;

    // Fit shortest side to canvas size at zoom = 1
    const baseScale = Math.max(size / imgW, size / imgH);
    const finalScale = baseScale * zoom;

    const drawW = imgW * finalScale;
    const drawH = imgH * finalScale;

    const dx = (size - drawW) / 2 + pan.x;
    const dy = (size - drawH) / 2 + pan.y;

    ctx.drawImage(sourceImageObj, dx, dy, drawW, drawH);

    try {
      const webpUrl = canvas.toDataURL('image/webp', 0.88);
      if (webpUrl.startsWith('data:image/webp')) {
        setCroppedPreviewUrl(webpUrl);
      } else {
        setCroppedPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
      }
    } catch {
      setCroppedPreviewUrl(canvas.toDataURL('image/png'));
    }
  }, [sourceImageObj, zoom, pan]);

  useEffect(() => {
    if (sourceImageObj) {
      renderSquareCrop();
    }
  }, [sourceImageObj, renderSquareCrop]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('Invalid format. Please choose a PNG, JPG, JPEG, or WebP image.');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum file size is 5.0 MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new window.Image();
      img.onload = () => {
        setSourceImageObj(img);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.onerror = () => {
        setErrorMsg('Could not decode the selected image file.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sourceImageObj) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !sourceImageObj) return;
    const nextX = Math.max(-180, Math.min(180, e.clientX - dragStart.x));
    const nextY = Math.max(-180, Math.min(180, e.clientY - dragStart.y));
    setPan({ x: nextX, y: nextY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!croppedPreviewUrl) {
      setErrorMsg('Please upload an image before saving.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSavePhoto(croppedPreviewUrl);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile picture.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSavePhoto('');
      setCroppedPreviewUrl('');
      setSourceImageObj(null);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove profile picture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="sketch-scrap w-full max-w-2xl p-5 sm:p-6 relative my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#b3ac9d]">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#9e3a2e]" />
            <div>
              <h2 className="text-xl font-bold">Profile Picture Studio</h2>
              <p className="text-xs text-[#514d44]">
                Upload, crop, and preview your picture inside your equipped skin frame & banner
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#514d44] hover:text-[#38352f]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-[#9e3a2e]/10 border border-[#9e3a2e] text-xs text-[#9e3a2e] flex items-center gap-2 rounded">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Left Column: File Picker & Interactive Square Crop Canvas */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="sketch-strip p-3 flex flex-col items-center justify-center">
              {sourceImageObj ? (
                <>
                  <div className="relative w-56 h-56 rounded-xl overflow-hidden border-2 border-[#38352f] shadow-inner cursor-move touch-none">
                    <canvas
                      ref={cropCanvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="w-full h-full block"
                    />
                    {/* Circular Avatar Frame Guide Overlay */}
                    <div className="absolute inset-3 rounded-full border-2 border-dashed border-[#fcf8ef]/90 pointer-events-none shadow-[0_0_0_9999px_rgba(30,27,24,0.32)]" />
                  </div>
                  <div className="w-full mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-[#514d44]">
                      <span className="flex items-center gap-1">
                        <Move className="w-3.5 h-3.5" /> Drag to reposition
                      </span>
                      <span>Zoom: {Math.round(zoom * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZoomOut className="w-4 h-4 text-[#514d44]" />
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-[#9e3a2e]"
                      />
                      <ZoomIn className="w-4 h-4 text-[#514d44]" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 px-4 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#fcf8ef] border-[1.5px] border-[#38352f] flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-[#344c69]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#38352f]">
                      Choose a Profile Picture
                    </p>
                    <p className="text-xs text-[#514d44] mt-0.5">
                      Supports PNG, JPG, JPEG, and WebP up to 5 MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f] inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Image File</span>
                  </button>
                </div>
              )}
            </div>

            {sourceImageObj && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium bg-[#fcf8ef] border border-[#38352f] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="px-3 py-1.5 text-xs font-mono text-[#514d44] hover:text-[#38352f]"
                >
                  Reset Crop
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live 3-Layer Composite Preview */}
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#514d44]">
              Live 3-Layer Arcade Preview
            </div>

            <ThreeLayerProfileHeader
              username={username}
              titleOrSubtitle="Independent Banner + Photo + Animated Skin Frame"
              avatarId={avatarId}
              customPhotoUrl={croppedPreviewUrl}
              equippedSkinId={equippedSkinId}
              equippedBannerId={equippedBannerId}
              compact
            />

            <div className="sketch-strip p-3 space-y-2 text-xs text-[#514d44]">
              <p className="font-bold text-[#38352f]">
                Non-Destructive Layer Guarantee:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your uploaded photo stays strictly separate from skins & banners.</li>
                <li>Changing or unequipping skins never alters your uploaded picture.</li>
                <li>Displays on your profile, couple card, sidebar, and leaderboards.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-[#b3ac9d] flex flex-wrap items-center justify-between gap-2">
          <div>
            {currentPhotoUrl && (
              <button
                type="button"
                disabled={saving}
                onClick={handleRemovePhoto}
                className="px-3 py-2 text-xs font-medium text-[#9e3a2e] border border-[#9e3a2e] bg-[#fcf8ef] hover:bg-[#9e3a2e]/10 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Uploaded Picture</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-[#fcf8ef] border border-[#38352f]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !croppedPreviewUrl}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold bg-[#9e3a2e] text-[#fcf8ef] border-[1.5px] border-[#38352f] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Picture'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
