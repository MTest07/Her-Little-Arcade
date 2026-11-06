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
  ShoppingBag,
  Sparkles,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { PlayerProfile } from './AuthModal';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { soundFX } from '@/src/lib/sound';

export type ArcadeNavSection =
  | 'home'
  | 'single'
  | 'multiplayer'
  | 'couple-profile'
  | 'trophy-road'
  | 'leaderboard'
  | 'shop'
  | 'achievements'
  | 'settings'
  | 'our-games'
  | 'rewards'
  | 'profile';

export interface SidebarNavItem {
  id: ArcadeNavSection;
  label: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    purpose: 'Main arcade dashboard',
    icon: Home,
  },
  {
    id: 'single',
    label: 'Single Player',
    purpose: 'All 7 single-player games',
    icon: Gamepad2,
    badge: '7',
  },
  {
    id: 'multiplayer',
    label: 'Multiplayer',
    purpose: '1v1, 2v2, rooms, matchmaking & invitations',
    icon: Users,
    badge: '14',
  },
  {
    id: 'couple-profile',
    label: 'Couple Profile',
    purpose: 'Shared couple profile and statistics',
    icon: HeartHandshake,
  },
  {
    id: 'trophy-road',
    label: 'Trophy Road',
    purpose: '2v2 trophy progression',
    icon: Crown,
    badge: '2v2',
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    purpose: '2v2 couple rankings',
    icon: Trophy,
    badge: '2v2',
  },
  {
    id: 'shop',
    label: 'Shop',
    purpose: 'Coins, Rename Cards and cosmetics',
    icon: ShoppingBag,
  },
  {
    id: 'achievements',
    label: 'Achievements',
    purpose: 'Individual and couple achievements',
    icon: Sparkles,
  },
  {
    id: 'settings',
    label: 'Settings',
    purpose: 'Account and application preferences',
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
  onToggleCollapse,
  onSelectSection,
  onOpenAccountModal,
  onLogout,
}: ArcadeSidebarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<ArcadeNavSection | null>(null);

  const desktopSidebarRef = useRef<HTMLElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const mobileBackdropRef = useRef<HTMLDivElement | null>(null);
  const navListRef = useRef<HTMLDivElement | null>(null);

  // Normalize aliases so active state always highlights cleanly
  const normalizedSection: ArcadeNavSection =
    activeSection === 'profile'
      ? 'couple-profile'
      : activeSection === 'rewards'
      ? 'shop'
      : activeSection === 'our-games'
      ? 'achievements'
      : activeSection;

  // GSAP expand / collapse width animation for Desktop/Tablet sidebar
  useEffect(() => {
    const el = desktopSidebarRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetWidth = isCollapsed ? 80 : 264;

    if (prefersReducedMotion) {
      gsap.set(el, { width: targetWidth });
      return;
    }

    gsap.to(el, {
      width: targetWidth,
      duration: 0.34,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });

    const textLabels = el.querySelectorAll('.sidebar-label-item');
    if (isCollapsed) {
      gsap.to(textLabels, {
        opacity: 0,
        x: -8,
        duration: 0.16,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    } else {
      gsap.fromTo(
        textLabels,
        { opacity: 0, x: -8 },
        {
          opacity: 1,
          x: 0,
          duration: 0.26,
          delay: 0.1,
          stagger: 0.015,
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
      { x: -14, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.38,
        stagger: 0.035,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      }
    );
  }, []);

  // GSAP animation for Mobile Slide-Out Drawer
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
        { x: -290, opacity: 0.8 },
        { x: 0, opacity: 1, duration: 0.32, ease: 'power3.out' }
      );
    }
  }, [mobileDrawerOpen]);

  function handleNavButtonHover(e: React.MouseEvent<HTMLButtonElement>, entering: boolean) {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.to(e.currentTarget, {
      x: entering ? 3 : 0,
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
    });
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
      x: -290,
      opacity: 0.8,
      duration: 0.22,
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
          MOBILE TOP BAR (< md): Menu Trigger + Brand + Avatar Pill
          ==================================================================== */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundFX.playMove();
              setMobileDrawerOpen(true);
            }}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-800 bg-stone-900 text-stone-100"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('home')}
            className="text-base font-bold tracking-tight text-amber-300"
          >
            Her Little Arcade
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelectSection('couple-profile')}
          className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-stone-100"
        >
          <span>{getAvatarEmoji(currentUser.avatar)}</span>
          <span className="max-w-[100px] truncate">{currentUser.username}</span>
          <span className="font-mono text-[11px] text-amber-300">Lv.{levelMetrics.level}</span>
        </button>
      </div>

      {/* ====================================================================
          MOBILE SLIDE-OUT DRAWER (< md)
          ==================================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Arcade Navigation Drawer">
          <div
            ref={mobileBackdropRef}
            onClick={() => closeMobileDrawerWithAnimation()}
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs"
          />

          <div
            ref={mobileDrawerRef}
            className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-stone-800 bg-stone-900 p-4 shadow-2xl"
          >
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <span className="text-base font-bold tracking-tight text-amber-300">
                    Her Little Arcade
                  </span>
                  <p className="text-[11px] text-stone-400">Cozy Couple &amp; Solo Gaming Hub</p>
                </div>
                <button
                  type="button"
                  onClick={() => closeMobileDrawerWithAnimation()}
                  aria-label="Close navigation menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-800 bg-stone-950 text-stone-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile User Profile Summary */}
              <div className="rounded-2xl border border-stone-800 bg-stone-950 p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      closeMobileDrawerWithAnimation(() => onSelectSection('couple-profile'))
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-stone-900 text-lg"
                  >
                    {getAvatarEmoji(currentUser.avatar)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-stone-100">
                      {currentUser.username}
                    </div>
                    <div className="font-mono text-[11px] text-amber-300 tabular-nums">
                      Lv.{levelMetrics.level} · {currentUser.xp} XP · {currentUser.coins} Coins
                    </div>
                  </div>
                </div>
                {activeCouple && pairedPartnerUsername ? (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-rose-300">
                    <span className="truncate font-semibold">
                      ♥ Paired with @{pairedPartnerUsername}
                    </span>
                    <span className="font-mono">🏆 {activeCouple.coupleTrophies ?? 0}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      closeMobileDrawerWithAnimation(() => onSelectSection('couple-profile'))
                    }
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:underline"
                  >
                    <HeartHandshake className="h-3 w-3" />
                    <span>Pair with Partner</span>
                  </button>
                )}
              </div>

              {/* Mobile Navigation List */}
              <nav aria-label="Mobile Arcade Navigation" className="space-y-1">
                {SIDEBAR_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = normalizedSection === item.id && !activeGameTitle;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundFX.playMove();
                        closeMobileDrawerWithAnimation(() => onSelectSection(item.id));
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'text-stone-300 hover:bg-stone-950 hover:text-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <div>
                          <div>{item.label}</div>
                          <div
                            className={`text-[10px] font-normal ${
                              isActive ? 'text-stone-900' : 'text-stone-400'
                            }`}
                          >
                            {item.purpose}
                          </div>
                        </div>
                      </div>
                      {item.badge && (
                        <span className="font-mono text-[10px] font-bold opacity-80">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer: Account & Logout */}
            <div className="space-y-2 border-t border-stone-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  closeMobileDrawerWithAnimation(() => onOpenAccountModal());
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-200"
              >
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                <span>Account &amp; Rename Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMobileDrawerWithAnimation(() => onLogout());
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300"
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
          ==================================================================== */}
      <aside
        ref={desktopSidebarRef}
        aria-label="Main Arcade Sidebar"
        style={{ width: isCollapsed ? 80 : 264 }}
        className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col justify-between border-r border-stone-800 bg-stone-900/95 p-3 backdrop-blur-md md:flex"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Brand Header & Collapse Toggle */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            } border-b border-stone-800 pb-3`}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => onSelectSection('home')}
                className="sidebar-label-item flex items-center gap-2 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-stone-950">
                  ♥
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold tracking-tight text-stone-100">
                    Her Little Arcade
                  </div>
                  <div className="truncate text-[10px] text-stone-400">
                    Solo &amp; Couple Gaming Hub
                  </div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundFX.playMove();
                onToggleCollapse();
              }}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-800 bg-stone-950 text-stone-300 transition-colors hover:border-amber-500/60 hover:text-amber-300"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Player Avatar & Couple Status Card */}
          <div className="rounded-2xl border border-stone-800 bg-stone-950 p-2.5">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <button
                type="button"
                onClick={() => onSelectSection('couple-profile')}
                title={`${currentUser.username} · Lv.${levelMetrics.level} (${currentUser.coins} Coins)`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-stone-900 text-lg transition-transform hover:scale-105"
              >
                {getAvatarEmoji(currentUser.avatar)}
              </button>

              {!isCollapsed && (
                <div className="sidebar-label-item min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectSection('couple-profile')}
                      className="truncate text-xs font-bold text-stone-100 hover:underline"
                    >
                      {currentUser.username}
                    </button>
                    <span className="font-mono text-[10px] font-bold text-amber-300 tabular-nums">
                      Lv.{levelMetrics.level}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-stone-400 tabular-nums">
                    <span className="inline-flex items-center gap-1 text-teal-300">
                      <Coins className="h-3 w-3" />
                      {currentUser.coins}
                    </span>
                    <span>·</span>
                    <span>{currentUser.xp} XP</span>
                  </div>

                  {/* Level XP Mini Bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-900">
                    <div
                      className="h-full origin-left bg-amber-400 transition-transform duration-300"
                      style={{ transform: `scaleX(${levelMetrics.progressPercent / 100})` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="sidebar-label-item mt-2 flex items-center justify-between pt-1.5 text-[11px]">
                {activeCouple && pairedPartnerUsername ? (
                  <button
                    type="button"
                    onClick={() => onSelectSection('couple-profile')}
                    className="flex w-full items-center justify-between text-left text-rose-300 hover:underline"
                  >
                    <span className="truncate font-semibold">
                      ♥ @{pairedPartnerUsername}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-300 tabular-nums">
                      🏆 {activeCouple.coupleTrophies ?? 0}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectSection('couple-profile')}
                    className="flex w-full items-center gap-1.5 font-semibold text-amber-300 hover:underline"
                  >
                    <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Pair with Partner</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Primary Navigation Items */}
          <nav
            ref={navListRef}
            aria-label="Primary Sidebar Navigation"
            className="flex-1 space-y-1 overflow-y-auto overflow-x-visible pr-0.5"
          >
            {SIDEBAR_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = normalizedSection === item.id && !activeGameTitle;
              const isHovered = hoveredItem === item.id;

              return (
                <div key={item.id} className="relative">
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
                    className={`sidebar-nav-btn group relative flex w-full items-center ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                    } rounded-xl text-left text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'text-stone-300 hover:bg-stone-950 hover:text-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="sidebar-label-item truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`sidebar-label-item font-mono text-[10px] font-bold tabular-nums ${
                          isActive ? 'text-stone-950' : 'text-amber-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Floating Tooltip when Sidebar is Collapsed */}
                  {isCollapsed && isHovered && (
                    <div
                      role="tooltip"
                      className="pointer-events-none fixed left-20 z-50 ml-2 w-48 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs shadow-xl"
                    >
                      <div className="font-bold text-stone-100">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-stone-400">{item.purpose}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Account Security & Clear Logout Button */}
        <div className="space-y-1.5 border-t border-stone-800 pt-3">
          <button
            type="button"
            onClick={onOpenAccountModal}
            title="Account Security, Email Verification & Rename Card"
            className={`flex w-full items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } rounded-xl border border-stone-800 bg-stone-950 py-2 text-xs font-semibold text-stone-300 transition-colors hover:border-amber-500/50 hover:text-stone-100`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-400" />
            {!isCollapsed && <span className="sidebar-label-item truncate">Account &amp; Rename</span>}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Log out of your account"
            className={`flex w-full items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } rounded-xl border border-rose-500/40 bg-rose-500/10 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="sidebar-label-item truncate">Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
