'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Home,
  Gamepad2,
  Users,
  HeartHandshake,
  Crown,
  Trophy,
  Sparkles,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Coins,
  ShieldCheck,
  Sun,
  Moon,
  Package,
  Backpack,
  Swords,
  PartyPopper,
  Mail,
  Mic,
} from 'lucide-react';
import { PlayerProfile } from './AuthModal';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { ArcadeInlineSpinner } from './ArcadeLoader';
import { AnimatedSkinnedAvatar } from './CosmeticAvatarAndBanner';
import { getSkinById } from '@/src/lib/arcade-data';
import { soundFX } from '@/src/lib/sound';

export type ArcadeNavSection =
  | 'home'
  | 'single'
  | 'multiplayer'
  | 'mp-1v1'
  | 'mp-2v2'
  | 'mp-party'
  | 'mp-create-room'
  | 'mp-join-group'
  | 'mp-matchmaking'
  | 'mp-invitations'
  | 'mp-voice-chat'
  | 'mailbox'
  | 'couple-voice-chat'
  | 'couple-profile'
  | 'trophy-road'
  | 'leaderboard'
  | 'shop'
  | 'shop-profile'
  | 'shop-banners'
  | 'shop-avatars'
  | 'shop-chests'
  | 'shop-keys'
  | 'inventory'
  | 'achievements'
  | 'settings'
  | 'our-games'
  | 'rewards'
  | 'profile';

export interface SidebarNavItem {
  id: ArcadeNavSection;
  section: string;
  label: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'home',
    section: 'Arcade',
    label: 'Home',
    purpose: 'Main arcade notebook',
    icon: Home,
  },
  {
    id: 'single',
    section: 'Games',
    label: 'Single Player',
    purpose: 'All 7 solo cozy games',
    icon: Gamepad2,
    badge: '7',
  },
  {
    id: 'mp-1v1',
    section: 'Multiplayer',
    label: '1v1 Games',
    purpose: 'Play with your paired partner',
    icon: Swords,
    badge: '1V1',
  },
  {
    id: 'mp-2v2',
    section: 'Multiplayer',
    label: '2v2 Games',
    purpose: 'Compete with another couple',
    icon: Users,
    badge: '2V2',
  },
  {
    id: 'mp-party',
    section: 'Multiplayer',
    label: 'Party Games',
    purpose: 'Play with 3–10 couples',
    icon: PartyPopper,
    badge: '3–10',
  },
  {
    id: 'mailbox',
    section: 'Social',
    label: 'Mailbox',
    purpose: 'Receive and manage invitations',
    icon: Mail,
  },
  {
    id: 'couple-voice-chat',
    section: 'Social',
    label: 'Couple Voice Chat',
    purpose: 'Couple voice communication',
    icon: Mic,
  },
  {
    id: 'couple-profile',
    section: 'Couple',
    label: 'Couple Profile',
    purpose: 'Shared couple keepsake & stats',
    icon: HeartHandshake,
  },
  {
    id: 'trophy-road',
    section: 'Competition',
    label: 'Trophy Road',
    purpose: '2v2 couple milestones',
    icon: Crown,
    badge: '2V2',
  },
  {
    id: 'leaderboard',
    section: 'Competition',
    label: 'Couple Leaderboard',
    purpose: '2v2 couple standings',
    icon: Trophy,
    badge: '2V2',
  },
  {
    id: 'shop',
    section: 'Collection',
    label: 'Shop',
    purpose: 'Profile, banners, avatars, chests & keys',
    icon: Package,
    badge: '5 TABS',
  },
  {
    id: 'inventory',
    section: 'Collection',
    label: 'Inventory',
    purpose: 'Owned skins, banners, chests & shields',
    icon: Backpack,
  },
  {
    id: 'achievements',
    section: 'Progression',
    label: 'Achievements',
    purpose: '21 games & custom studio',
    icon: Sparkles,
  },
  {
    id: 'settings',
    section: 'Account',
    label: 'Settings',
    purpose: 'Audio & theme preferences',
    icon: Settings,
  },
];

function getAvatarEmoji(avatarId: string): string {
  const map: Record<string, string> = {
    kitsune: '🦊',
    'star-cat': '🐱',
    bunny: '🐰',
    'mochi-bunny': '🐰',
    otter: '🦦',
    'cloud-bear': '🐻‍❄️',
    'cherry-owl': '🦉',
    'matcha-frog': '🐸',
    'trophy-crown-fox': '👑🦊',
    'celestial-swan': '🦢✨',
  };
  return map[avatarId] || '🦊';
}

interface ArcadeSidebarProps {
  currentUser: PlayerProfile;
  levelMetrics: {
    level: number;
    currentLevelXp: number;
    progressPercent: number;
  };
  activeCouple: EnrichedCouplePairing | null;
  pairedPartnerUsername: string | null;
  activeSection: ArcadeNavSection;
  activeGameTitle: string | null;
  isCollapsed: boolean;
  isLoadingData?: boolean;
  isDarkTheme?: boolean;
  unreadMailboxCount?: number;
  coupleVoiceCallStatus?: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
  onToggleDarkTheme?: () => void;
  onToggleCollapse: () => void;
  onSelectSection: (section: ArcadeNavSection) => void;
  onOpenAccountModal: () => void;
  onLogout: () => void;
}

export function ArcadeSidebar({
  currentUser,
  levelMetrics,
  activeCouple,
  pairedPartnerUsername,
  activeSection,
  activeGameTitle,
  isCollapsed,
  isLoadingData = false,
  isDarkTheme = false,
  unreadMailboxCount = 0,
  coupleVoiceCallStatus = 'idle',
  onToggleDarkTheme,
  onToggleCollapse,
  onSelectSection,
  onOpenAccountModal,
  onLogout,
}: ArcadeSidebarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ArcadeNavSection | null>(null);

  const desktopSidebarRef = useRef<HTMLElement | null>(null);
  const brandBadgeRef = useRef<HTMLSpanElement | null>(null);
  const collapseBtnRef = useRef<HTMLButtonElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const mobileBackdropRef = useRef<HTMLDivElement | null>(null);
  const navListRef = useRef<HTMLDivElement | null>(null);

  // Normalize aliases so active state always highlights cleanly
  const normalizedSection: ArcadeNavSection =
    activeSection === 'profile'
      ? 'couple-profile'
      : activeSection === 'rewards' ||
        activeSection === 'shop' ||
        activeSection === 'shop-profile' ||
        activeSection === 'shop-banners' ||
        activeSection === 'shop-avatars' ||
        activeSection === 'shop-chests' ||
        activeSection === 'shop-keys'
      ? 'shop'
      : activeSection === 'mp-invitations'
      ? 'mailbox'
      : activeSection === 'mp-voice-chat'
      ? 'couple-voice-chat'
      : activeSection === 'our-games'
      ? 'achievements'
      : activeSection;

  // GSAP expand / collapse width & label animation for Desktop/Tablet sidebar
  useEffect(() => {
    const el = desktopSidebarRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetWidth = isCollapsed ? 82 : 268;

    if (prefersReducedMotion) {
      gsap.set(el, { width: targetWidth });
      return;
    }

    gsap.to(el, {
      width: targetWidth,
      duration: 0.36,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });

    if (collapseBtnRef.current) {
      gsap.fromTo(
        collapseBtnRef.current,
        { scale: 0.88, rotation: isCollapsed ? -12 : 12 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.32,
          ease: 'back.out(1.8)',
          overwrite: 'auto',
        }
      );
    }

    if (brandBadgeRef.current && !isCollapsed) {
      gsap.fromTo(
        brandBadgeRef.current,
        { scale: 0.85, rotation: -8 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.36,
          ease: 'back.out(1.7)',
          overwrite: 'auto',
        }
      );
    }

    const textLabels = el.querySelectorAll('.sidebar-label-item');
    if (isCollapsed) {
      gsap.to(textLabels, {
        opacity: 0,
        x: -10,
        duration: 0.15,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    } else {
      gsap.fromTo(
        textLabels,
        { opacity: 0, x: -10 },
        {
          opacity: 1,
          x: 0,
          duration: 0.28,
          delay: 0.08,
          stagger: 0.016,
          ease: 'power2.out',
          overwrite: 'auto',
        }
      );
    }
  }, [isCollapsed]);

  // Initial staggered entrance for sidebar navigation items
  useEffect(() => {
    const navEl = navListRef.current;
    if (!navEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const buttons = navEl.querySelectorAll('.sidebar-nav-btn');
    gsap.fromTo(
      buttons,
      { x: -12, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.36,
        stagger: 0.032,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      }
    );
  }, []);

  // GSAP animation for Mobile Slide-Out Drawer open
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const drawer = mobileDrawerRef.current;
    const backdrop = mobileBackdropRef.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    if (backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
    }
    if (drawer) {
      gsap.fromTo(
        drawer,
        { x: -300, opacity: 0.85 },
        { x: 0, opacity: 1, duration: 0.34, ease: 'power3.out' }
      );
      const mobileItems = drawer.querySelectorAll('.mobile-nav-item');
      gsap.fromTo(
        mobileItems,
        { x: -12, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.28,
          stagger: 0.025,
          delay: 0.08,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    }
  }, [mobileDrawerOpen]);

  function handleNavButtonHover(e: React.MouseEvent<HTMLButtonElement>, entering: boolean) {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const iconEl = e.currentTarget.querySelector('.sidebar-nav-icon');
    if (iconEl) {
      gsap.to(iconEl, {
        scale: entering ? 1.12 : 1,
        rotation: entering ? -6 : 0,
        duration: 0.2,
        ease: 'back.out(1.7)',
        overwrite: 'auto',
      });
    }
  }

  function closeMobileDrawerWithAnimation(callback?: () => void) {
    const drawer = mobileDrawerRef.current;
    const backdrop = mobileBackdropRef.current;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !drawer) {
      setMobileDrawerOpen(false);
      callback?.();
      return;
    }

    if (backdrop) {
      gsap.to(backdrop, { opacity: 0, duration: 0.18, ease: 'power2.in' });
    }
    gsap.to(drawer, {
      x: -300,
      opacity: 0.85,
      duration: 0.24,
      ease: 'power2.in',
      onComplete: () => {
        setMobileDrawerOpen(false);
        callback?.();
      },
    });
  }

  return (
    <>
      {/* ====================================================================
          MOBILE TOP BAR (< md): Cozy Sketch Sheet Header
          ==================================================================== */}
      <div className="arcade-sidebar-shell sticky top-0 z-40 flex items-center justify-between border-b border-[var(--dp-color-line)] px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.playMove();
              setMobileDrawerOpen(true);
            }}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center border border-[var(--dp-color-ink)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] shadow-[2px_2px_0px_rgba(56,53,47,0.18)]"
          >
            <Menu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('home')}
            className="flex items-center gap-1.5 text-left"
          >
            <span className="text-base font-bold tracking-tight text-[var(--dp-color-ink)]">
              Her Little Arcade
            </span>
            {isLoadingData && (
              <ArcadeInlineSpinner size={14} className="text-[var(--dp-color-accent)]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onToggleDarkTheme && (
            <button
              type="button"
              onClick={onToggleDarkTheme}
              aria-label={isDarkTheme ? 'Switch to warm light paper' : 'Switch to cozy night paper'}
              className="flex h-8 w-8 items-center justify-center border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)]"
            >
              {isDarkTheme ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelectSection('couple-profile')}
            className="flex items-center gap-1.5 border border-[var(--dp-color-ink)] bg-[var(--dp-color-highlight)] px-2.5 py-1 text-xs font-bold text-[var(--dp-color-ink)]"
          >
            <span>{getAvatarEmoji(currentUser.avatar)}</span>
            <span className="max-w-[92px] truncate">{currentUser.username}</span>
            <span className="font-mono text-[11px] text-[var(--dp-color-accent)]">
              Lv.{levelMetrics.level}
            </span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          MOBILE SLIDE-OUT DRAWER (< md) — Cozy Unboxed Sketchbook Margin
          ==================================================================== */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Arcade Navigation Drawer"
        >
          <div
            ref={mobileBackdropRef}
            onClick={() => closeMobileDrawerWithAnimation()}
            className="fixed inset-0 bg-[#38352f]/45 backdrop-blur-[2px]"
          />

          <div
            ref={mobileDrawerRef}
            className="arcade-sidebar-shell arcade-no-scrollbar relative z-10 flex h-full w-72 max-w-[86vw] flex-col justify-between overflow-x-hidden p-4 shadow-2xl"
          >
            <div className="arcade-no-scrollbar space-y-4 overflow-y-auto overflow-x-hidden">
              {/* Drawer Brand Header */}
              <div className="flex items-center justify-between border-b border-dashed border-[var(--dp-color-line)] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border-[1.5px] border-[var(--dp-color-ink)] bg-[var(--dp-color-highlight)] text-base shadow-[2px_2px_0px_var(--dp-color-accent)]">
                    🐰
                  </span>
                  <div>
                    <span className="block text-base font-bold tracking-tight text-[var(--dp-color-ink)]">
                      Her Little Arcade
                    </span>
                    <span className="sketch-annotation block text-xs">
                      Cozy Sketchbook Hub
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => closeMobileDrawerWithAnimation()}
                  aria-label="Close navigation menu"
                  className="flex h-8 w-8 items-center justify-center border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Clean Unboxed Mobile Player & Partner Summary */}
              <div className="border-b border-dashed border-[var(--dp-color-line)] pb-3.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      closeMobileDrawerWithAnimation(() => onSelectSection('couple-profile'))
                    }
                    className="shrink-0"
                  >
                    <AnimatedSkinnedAvatar
                      avatarId={currentUser.avatar}
                      customPhotoUrl={currentUser.customPhotoUrl}
                      skinId={currentUser.equippedSkin}
                      size="sm"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-bold text-[var(--dp-color-ink)]">
                        {currentUser.username}
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--dp-color-accent)] tabular-nums">
                        Lv.{levelMetrics.level}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[var(--dp-color-ink-muted)] tabular-nums">
                      {currentUser.coins} Coins · {currentUser.xp} XP
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]">
                      <div
                        className="h-full origin-left bg-[var(--dp-color-accent)] transition-transform duration-300"
                        style={{ transform: `scaleX(${levelMetrics.progressPercent / 100})` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 text-xs">
                  {activeCouple && pairedPartnerUsername ? (
                    <button
                      type="button"
                      onClick={() =>
                        closeMobileDrawerWithAnimation(() => onSelectSection('couple-profile'))
                      }
                      className="flex w-full items-center justify-between font-semibold text-[var(--dp-color-accent)] hover:underline"
                    >
                      <span className="truncate">♥ Paired with @{pairedPartnerUsername}</span>
                      <span className="font-mono text-[11px] text-[var(--dp-color-annotation)] tabular-nums">
                        🏆 {activeCouple.coupleTrophies ?? 0}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        closeMobileDrawerWithAnimation(() => onSelectSection('couple-profile'))
                      }
                      className="flex items-center gap-1.5 font-semibold text-[var(--dp-color-annotation)] hover:underline"
                    >
                      <HeartHandshake className="h-3.5 w-3.5" />
                      <span>Pair with Partner</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Navigation List (Clean Unboxed Marker Rows with Section Headers) */}
              <nav aria-label="Mobile Arcade Navigation" className="space-y-1">
                {SIDEBAR_NAV_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = normalizedSection === item.id && !activeGameTitle;
                  const showSectionHeader =
                    idx === 0 || SIDEBAR_NAV_ITEMS[idx - 1].section !== item.section;
                  const dynamicBadge =
                    item.id === 'mailbox'
                      ? unreadMailboxCount > 0
                        ? String(unreadMailboxCount)
                        : undefined
                      : item.id === 'couple-voice-chat'
                      ? coupleVoiceCallStatus === 'connected'
                        ? 'LIVE'
                        : coupleVoiceCallStatus === 'ringing'
                        ? 'RING'
                        : coupleVoiceCallStatus === 'connecting'
                        ? 'CALL'
                        : undefined
                      : item.badge;

                  return (
                    <div key={item.id}>
                      {showSectionHeader && (
                        <div className="px-3 pb-0.5 pt-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--dp-color-annotation)]">
                          {item.section}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playMove();
                          closeMobileDrawerWithAnimation(() => onSelectSection(item.id));
                        }}
                        className={`mobile-nav-item arcade-sidebar-nav-item flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold ${
                          isActive ? 'arcade-sidebar-nav-item-active font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? 'text-[var(--dp-color-accent)]'
                                : 'text-[var(--dp-color-ink-muted)]'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-[var(--dp-color-ink)]">{item.label}</div>
                            <div className="truncate text-[11px] font-normal text-[var(--dp-color-ink-muted)]">
                              {item.purpose}
                            </div>
                          </div>
                        </div>
                        {dynamicBadge && (
                          <span
                            className={`font-mono text-[11px] font-bold tabular-nums ${
                              item.id === 'mailbox' && unreadMailboxCount > 0
                                ? 'rounded bg-[var(--dp-color-accent)] px-1.5 py-0.5 text-white'
                                : item.id === 'couple-voice-chat' &&
                                  coupleVoiceCallStatus !== 'idle'
                                ? 'rounded bg-emerald-600 px-1.5 py-0.5 text-white'
                                : 'text-[var(--dp-color-annotation)]'
                            }`}
                          >
                            {dynamicBadge}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer: Unboxed Clean Notebook Actions */}
            <div className="space-y-1.5 border-t border-dashed border-[var(--dp-color-line)] pt-3">
              {onToggleDarkTheme && (
                <button
                  type="button"
                  onClick={onToggleDarkTheme}
                  className="arcade-sidebar-nav-item flex w-full items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-[var(--dp-color-ink)]"
                >
                  {isDarkTheme ? (
                    <Sun className="h-4 w-4 text-[var(--dp-color-accent)]" />
                  ) : (
                    <Moon className="h-4 w-4 text-[var(--dp-color-annotation)]" />
                  )}
                  <span>{isDarkTheme ? 'Warm Day Sketchbook' : 'Cozy Night Sketchbook'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeMobileDrawerWithAnimation(() => onOpenAccountModal());
                }}
                className="arcade-sidebar-nav-item flex w-full items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-[var(--dp-color-ink)]"
              >
                <ShieldCheck className="h-4 w-4 text-[var(--dp-color-annotation)]" />
                <span>Account &amp; Rename Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMobileDrawerWithAnimation(() => onLogout());
                }}
                className="arcade-sidebar-nav-item flex w-full items-center gap-2.5 px-3 py-1.5 text-xs font-bold text-[var(--dp-color-accent)]"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DESKTOP & TABLET PERSISTENT COLLAPSIBLE SIDEBAR (md and up)
          Cozy Sketchbook Margin — Clean & Unboxed
          ==================================================================== */}
      <aside
        ref={desktopSidebarRef}
        aria-label="Main Arcade Sidebar"
        style={{ width: isCollapsed ? 82 : 268 }}
        className="arcade-sidebar-shell sticky top-0 z-30 hidden h-screen shrink-0 flex-col justify-between px-3.5 py-4 md:flex"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3.5">
          {/* 1. Brand Header + Hand-Drawn Red Wave & Collapse Toggle */}
          <div className="border-b border-dashed border-[var(--dp-color-line)] pb-3">
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between gap-2'
              }`}
            >
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => onSelectSection('home')}
                  className="sidebar-label-item group flex min-w-0 items-center gap-2.5 text-left"
                >
                  <span
                    ref={brandBadgeRef}
                    className="flex h-9 w-9 shrink-0 items-center justify-center border-[1.5px] border-[var(--dp-color-ink)] bg-[var(--dp-color-highlight)] text-base shadow-[2px_2px_0px_var(--dp-color-accent)]"
                  >
                    🐰
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-bold tracking-tight text-[var(--dp-color-ink)]">
                      Her Little Arcade
                    </div>
                    <div className="sketch-annotation flex items-center gap-1.5 truncate text-xs">
                      <span>Solo &amp; Couple Notebook</span>
                      {isLoadingData && (
                        <ArcadeInlineSpinner
                          size={12}
                          className="text-[var(--dp-color-accent)]"
                        />
                      )}
                    </div>
                  </div>
                </button>
              )}

              <button
                ref={collapseBtnRef}
                type="button"
                onClick={() => {
                  soundFX.playMove();
                  onToggleCollapse();
                }}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex h-8 w-8 shrink-0 items-center justify-center border-[1.5px] border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] transition-colors hover:border-[var(--dp-color-ink)] hover:bg-[var(--dp-color-highlight)]"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Subtle hand-drawn red sketch underline under brand */}
            {!isCollapsed && (
              <svg
                aria-hidden="true"
                viewBox="0 0 220 8"
                className="sidebar-label-item mt-1.5 h-2 w-44 text-[var(--dp-color-accent)] opacity-75"
                fill="none"
              >
                <path
                  d="M2 5.5 C62 1.5, 148 7.5, 216 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {/* 2. Unboxed Player Identity & Partner Status Note */}
          <div className="border-b border-dashed border-[var(--dp-color-line)] pb-3.5">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <button
                type="button"
                onClick={() => onSelectSection('couple-profile')}
                title={`${currentUser.username} · Lv.${levelMetrics.level} (${currentUser.coins} Coins)`}
                className="relative shrink-0 transition-transform hover:scale-105"
              >
                <AnimatedSkinnedAvatar
                  avatarId={currentUser.avatar}
                  customPhotoUrl={currentUser.customPhotoUrl}
                  skinId={currentUser.equippedSkin}
                  size="sm"
                />
              </button>

              {!isCollapsed && (
                <div className="sidebar-label-item min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectSection('couple-profile')}
                      className="truncate text-sm font-bold text-[var(--dp-color-ink)] hover:underline"
                    >
                      {currentUser.username}
                    </button>
                    <span className="font-mono text-[11px] font-bold text-[var(--dp-color-accent)] tabular-nums">
                      Lv.{levelMetrics.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--dp-color-ink-muted)] tabular-nums">
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--dp-color-annotation)]">
                      <Coins className="h-3 w-3" />
                      {currentUser.coins}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{currentUser.xp} XP</span>
                  </div>

                  {/* Equipped Skin Emblem & Rarity Note */}
                  {(() => {
                    const eqSkin = getSkinById(currentUser.equippedSkin);
                    return (
                      <div className="mt-1 flex items-center gap-1 truncate text-[10px] font-semibold text-[var(--dp-color-annotation)]">
                        <span>{eqSkin.emblem}</span>
                        <span className="truncate">{eqSkin.name}</span>
                        <span className="font-mono text-[9px] uppercase text-[var(--dp-color-accent)]">
                          [{eqSkin.rarity}]
                        </span>
                      </div>
                    );
                  })()}

                  {/* Hand-sketched XP progress track */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]">
                    <div
                      className="h-full origin-left bg-[var(--dp-color-accent)] transition-transform duration-300"
                      style={{ transform: `scaleX(${levelMetrics.progressPercent / 100})` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="sidebar-label-item mt-2.5 flex items-center justify-between text-xs">
                {activeCouple && pairedPartnerUsername ? (
                  <button
                    type="button"
                    onClick={() => onSelectSection('couple-profile')}
                    className="flex w-full items-center justify-between text-left font-semibold text-[var(--dp-color-accent)] hover:underline"
                  >
                    <span className="truncate">♥ @{pairedPartnerUsername}</span>
                    <span className="font-mono text-[11px] font-bold text-[var(--dp-color-annotation)] tabular-nums">
                      🏆 {activeCouple.coupleTrophies ?? 0}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectSection('couple-profile')}
                    className="flex w-full items-center gap-1.5 font-semibold text-[var(--dp-color-annotation)] hover:underline"
                  >
                    <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-[var(--dp-color-accent)]" />
                    <span className="truncate">Pair with Partner</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Primary Navigation Items (Playful Sketchbook Marker Highlight + Section Headers) */}
          <nav
            ref={navListRef}
            aria-label="Primary Sidebar Navigation"
            className="arcade-no-scrollbar flex-1 space-y-1 overflow-y-auto overflow-x-hidden"
          >
            {SIDEBAR_NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = normalizedSection === item.id && !activeGameTitle;
              const isHovered = hoveredItem === item.id;
              const showSectionHeader =
                idx === 0 || SIDEBAR_NAV_ITEMS[idx - 1].section !== item.section;
              const dynamicBadge =
                item.id === 'mailbox'
                  ? unreadMailboxCount > 0
                    ? String(unreadMailboxCount)
                    : undefined
                  : item.id === 'couple-voice-chat'
                  ? coupleVoiceCallStatus === 'connected'
                    ? 'LIVE'
                    : coupleVoiceCallStatus === 'ringing'
                    ? 'RING'
                    : coupleVoiceCallStatus === 'connecting'
                    ? 'CALL'
                    : undefined
                  : item.badge;

              return (
                <div key={item.id} className="relative">
                  {!isCollapsed && showSectionHeader && (
                    <div className="sidebar-label-item px-3 pb-0.5 pt-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--dp-color-annotation)]">
                      {item.section}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playMove();
                      onSelectSection(item.id);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredItem(item.id);
                      handleNavButtonHover(e, true);
                    }}
                    onMouseLeave={(e) => {
                      setHoveredItem(null);
                      handleNavButtonHover(e, false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    title={isCollapsed ? `${item.label} — ${item.purpose}` : item.purpose}
                    className={`sidebar-nav-btn arcade-sidebar-nav-item group relative flex w-full items-center ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                    } text-left text-xs font-semibold ${
                      isActive ? 'arcade-sidebar-nav-item-active font-bold' : ''
                    }`}
                  >
                    <div className="relative flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={`sidebar-nav-icon h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[var(--dp-color-accent)]'
                            : 'text-[var(--dp-color-ink-muted)] group-hover:text-[var(--dp-color-ink)]'
                        }`}
                      />
                      {isCollapsed && item.id === 'mailbox' && unreadMailboxCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--dp-color-accent)] px-1 font-mono text-[9px] font-bold text-white">
                          {unreadMailboxCount}
                        </span>
                      )}
                      {isCollapsed &&
                        item.id === 'couple-voice-chat' &&
                        coupleVoiceCallStatus !== 'idle' &&
                        coupleVoiceCallStatus !== 'ended' && (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--dp-color-ground)]" />
                        )}
                      {!isCollapsed && (
                        <span className="sidebar-label-item truncate text-sm">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="sidebar-label-item flex items-center gap-1.5">
                        {dynamicBadge && (
                          <span
                            className={`font-mono text-[11px] font-bold tabular-nums ${
                              item.id === 'mailbox' && unreadMailboxCount > 0
                                ? 'rounded bg-[var(--dp-color-accent)] px-1.5 py-0.5 text-white'
                                : item.id === 'couple-voice-chat' &&
                                  coupleVoiceCallStatus !== 'idle' &&
                                  coupleVoiceCallStatus !== 'ended'
                                ? 'rounded bg-emerald-600 px-1.5 py-0.5 text-white'
                                : isActive
                                ? 'text-[var(--dp-color-accent)]'
                                : 'text-[var(--dp-color-annotation)]'
                            }`}
                          >
                            {dynamicBadge}
                          </span>
                        )}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="text-xs font-bold text-[var(--dp-color-accent)]"
                          >
                            ✦
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Floating Sketchbook Note Tooltip when Sidebar is Collapsed */}
                  {isCollapsed && isHovered && (
                    <div
                      role="tooltip"
                      className="sketch-scrap pointer-events-none fixed left-20 z-50 ml-2 w-48 px-3 py-2 text-xs"
                    >
                      <div className="font-mono text-[10px] font-bold uppercase text-[var(--dp-color-annotation)]">
                        {item.section}
                      </div>
                      <div className="font-bold text-[var(--dp-color-ink)]">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--dp-color-ink-muted)]">
                        {item.purpose}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* 4. Unboxed Footer Controls: Theme Toggle, Account & Clear Logout */}
        <div className="space-y-1 border-t border-dashed border-[var(--dp-color-line)] pt-3">
          {onToggleDarkTheme && (
            <button
              type="button"
              onClick={() => {
                soundFX.playMove();
                onToggleDarkTheme();
              }}
              title={
                isDarkTheme
                  ? 'Switch to Warm Day Sketchbook'
                  : 'Switch to Cozy Night Sketchbook'
              }
              className={`arcade-sidebar-nav-item flex w-full items-center ${
                isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
              } py-1.5 text-xs font-semibold text-[var(--dp-color-ink)]`}
            >
              {isDarkTheme ? (
                <Sun className="h-4 w-4 shrink-0 text-[var(--dp-color-accent)]" />
              ) : (
                <Moon className="h-4 w-4 shrink-0 text-[var(--dp-color-annotation)]" />
              )}
              {!isCollapsed && (
                <span className="sidebar-label-item truncate">
                  {isDarkTheme ? 'Warm Day Sheet' : 'Cozy Night Sheet'}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAccountModal}
            title="Account Security, Email Verification & Rename Card"
            className={`arcade-sidebar-nav-item flex w-full items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-1.5 text-xs font-semibold text-[var(--dp-color-ink)]`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--dp-color-annotation)]" />
            {!isCollapsed && (
              <span className="sidebar-label-item truncate">Account &amp; Rename</span>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Log out of your account"
            className={`arcade-sidebar-nav-item flex w-full items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-1.5 text-xs font-bold text-[var(--dp-color-accent)]`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="sidebar-label-item truncate">Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
