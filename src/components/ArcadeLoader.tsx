'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export const DEFAULT_LOADING_MESSAGES = [
  'Preparing your arcade...',
  'Setting up your game...',
  'Getting everything ready...',
  'Almost there!',
];

export interface ArcadeCircularLoaderProps {
  /** Controls visibility; component animates out smoothly with GSAP before unmounting */
  active: boolean;
  /** Primary context message or list of messages to rotate through */
  messages?: string[];
  /** Optional subtitle / context note below the rotating message */
  subtitle?: string;
  /** Optional real progress (0-100). Never pass fake/fabricated percentages. */
  progress?: number | null;
  /** Presentation mode: fullscreen overlay, container overlay, or inline card */
  variant?: 'fullscreen' | 'overlay' | 'card' | 'compact';
  /** Optional callback after fade-out completes */
  onExited?: () => void;
}

export function ArcadeCircularLoader({
  active,
  messages = DEFAULT_LOADING_MESSAGES,
  subtitle,
  progress = null,
  variant = 'fullscreen',
  onExited,
}: ArcadeCircularLoaderProps) {
  const [hasExited, setHasExited] = useState<boolean>(!active);
  const [messageIndex, setMessageIndex] = useState<number>(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const outerRingRef = useRef<SVGGElement | null>(null);
  const innerRingRef = useRef<SVGGElement | null>(null);
  const rabbitGroupRef = useRef<SVGGElement | null>(null);
  const earsRef = useRef<SVGGElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const messageTextRef = useRef<HTMLParagraphElement | null>(null);
  const particlesRef = useRef<HTMLDivElement | null>(null);

  const safeMessages = messages.length > 0 ? messages : DEFAULT_LOADING_MESSAGES;
  const isRendered = active || !hasExited;

  // Handle smooth GSAP fade-out when active transitions to false
  useEffect(() => {
    if (active) {
      const rafId = window.requestAnimationFrame(() => {
        setHasExited(false);
        setMessageIndex(0);
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    if (hasExited) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rootEl = rootRef.current;
    const cardEl = cardRef.current;

    if (prefersReducedMotion || !rootEl) {
      const rafId = window.requestAnimationFrame(() => {
        setHasExited(true);
        onExited?.();
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setHasExited(true);
        onExited?.();
      },
    });

    if (cardEl) {
      tl.to(
        cardEl,
        {
          scale: 0.95,
          y: 6,
          opacity: 0,
          duration: 0.24,
          ease: 'power2.in',
        },
        0
      );
    }

    tl.to(
      rootEl,
      {
        opacity: 0,
        duration: 0.28,
        ease: 'power2.inOut',
      },
      0.04
    );

    return () => {
      tl.kill();
    };
  }, [active, hasExited, onExited]);

  // Core GSAP circular ring rotation, rabbit bounce, glow pulse & particle float
  useEffect(() => {
    if (!isRendered || !active) return;

    const rootEl = rootRef.current;
    const cardEl = cardRef.current;
    const outerRing = outerRingRef.current;
    const innerRing = innerRingRef.current;
    const rabbit = rabbitGroupRef.current;
    const ears = earsRef.current;
    const glow = glowRef.current;
    const particlesContainer = particlesRef.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (rootEl) gsap.set(rootEl, { opacity: 1 });
      if (cardEl) gsap.set(cardEl, { opacity: 1, scale: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Smooth entrance fade-in
      if (rootEl) {
        gsap.fromTo(
          rootEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      }
      if (cardEl) {
        gsap.fromTo(
          cardEl,
          { opacity: 0, scale: 0.94, y: 8 },
          { opacity: 1, scale: 1, y: 0, duration: 0.36, ease: 'back.out(1.4)' }
        );
      }

      // 2. Smooth continuous circular rotation on outer ring
      if (outerRing) {
        gsap.to(outerRing, {
          rotation: 360,
          transformOrigin: '50% 50%',
          duration: 2.8,
          repeat: -1,
          ease: 'none',
        });
      }

      // 3. Gentle counter-rotation on inner dashed sketch ring
      if (innerRing) {
        gsap.to(innerRing, {
          rotation: -360,
          transformOrigin: '50% 50%',
          duration: 7.5,
          repeat: -1,
          ease: 'none',
        });
      }

      // 4. Cozy breathing / bobbing pulse on the center Little Rabbit illustration
      if (rabbit) {
        gsap.to(rabbit, {
          y: -3.5,
          scale: 1.04,
          transformOrigin: '50% 55%',
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // 5. Playful subtle ear twitch
      if (ears) {
        gsap.to(ears, {
          rotation: 3.5,
          transformOrigin: '50% 85%',
          duration: 0.65,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // 6. Soft warm highlight glow pulse
      if (glow) {
        gsap.to(glow, {
          scale: 1.12,
          opacity: 0.75,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // 7. Decorative floating sketch particles (stars, tiny hearts, sparkles)
      if (particlesContainer) {
        const dots = particlesContainer.querySelectorAll('.loader-particle');
        dots.forEach((dot, i) => {
          gsap.to(dot, {
            y: i % 2 === 0 ? -7 : 7,
            x: i % 3 === 0 ? 4 : -4,
            rotation: i % 2 === 0 ? 18 : -18,
            opacity: 0.9,
            duration: 1.3 + i * 0.22,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.15,
          });
        });
      }
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, [isRendered, active]);

  // Rotate loading message every 2.2s with a gentle GSAP cross-fade
  useEffect(() => {
    if (!isRendered || !active || safeMessages.length <= 1) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const interval = setInterval(() => {
      const msgEl = messageTextRef.current;
      if (prefersReducedMotion || !msgEl) {
        setMessageIndex((prev) => (prev + 1) % safeMessages.length);
        return;
      }

      gsap.to(msgEl, {
        opacity: 0,
        y: -4,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          setMessageIndex((prev) => (prev + 1) % safeMessages.length);
          gsap.fromTo(
            msgEl,
            { opacity: 0, y: 4 },
            { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' }
          );
        },
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isRendered, active, safeMessages.length]);

  if (!isRendered) return null;

  const isCompact = variant === 'compact';
  const circleRadius = 56;
  const circumference = 2 * Math.PI * circleRadius;
  const hasRealProgress =
    typeof progress === 'number' && !Number.isNaN(progress) && progress >= 0 && progress <= 100;
  const progressOffset = hasRealProgress
    ? circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference
    : undefined;

  const wrapperClasses =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#f7f2e7]/92 px-4 backdrop-blur-xs'
      : variant === 'overlay'
      ? 'absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[#f7f2e7]/90 p-4 backdrop-blur-xs'
      : variant === 'compact'
      ? 'flex items-center gap-3.5 py-2'
      : 'flex flex-col items-center justify-center rounded-2xl border border-[#b3ac9d] bg-[#fcf8ef] p-6 text-center shadow-xs';

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={wrapperClasses}
    >
      <div
        ref={cardRef}
        className={
          isCompact
            ? 'flex items-center gap-3.5'
            : 'relative flex max-w-sm flex-col items-center text-center'
        }
      >
        {/* Central Circular Loading Ring + Cozy Little Rabbit Illustration */}
        <div
          className={`relative flex items-center justify-center ${
            isCompact ? 'h-14 w-14 shrink-0' : 'h-36 w-36'
          }`}
        >
          {/* Warm Paper Highlight Glow */}
          <div
            ref={glowRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-full bg-[#f0dfa0]/55 blur-md"
          />

          {/* Floating Decorative Sketch Particles (Stars, Hearts, Sparkles) */}
          {!isCompact && (
            <div
              ref={particlesRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <span className="loader-particle absolute left-2 top-3 text-xs text-[#9e3a2e] opacity-65">
                ✦
              </span>
              <span className="loader-particle absolute right-3 top-2 text-xs text-[#344c69] opacity-65">
                ★
              </span>
              <span className="loader-particle absolute bottom-4 left-1 text-[11px] text-[#9e3a2e] opacity-60">
                ♥
              </span>
              <span className="loader-particle absolute bottom-2 right-2 text-xs text-[#38352f] opacity-55">
                ✦
              </span>
              <span className="loader-particle absolute -left-1 top-1/2 text-[10px] text-[#344c69] opacity-55">
                •
              </span>
              <span className="loader-particle absolute -right-1 top-1/2 text-[10px] text-[#9e3a2e] opacity-60">
                •
              </span>
            </div>
          )}

          <svg
            viewBox="0 0 140 140"
            className="relative h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {/* Soft warm inner paper medallion */}
            <circle
              cx="70"
              cy="70"
              r="46"
              fill="#fcf8ef"
              stroke="#b3ac9d"
              strokeWidth="1.25"
            />

            {/* Outer base track ring */}
            <circle
              cx="70"
              cy="70"
              r={circleRadius}
              fill="none"
              stroke="#e5dec9"
              strokeWidth="4.5"
            />

            {/* Optional Real Progress Arc (only when actual progress is known) */}
            {hasRealProgress && (
              <circle
                cx="70"
                cy="70"
                r={circleRadius}
                fill="none"
                stroke="#344c69"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 70 70)"
                className="transition-[stroke-dashoffset] duration-300 ease-out"
              />
            )}

            {/* Counter-rotating inner dashed notebook ring */}
            <g ref={innerRingRef}>
              <circle
                cx="70"
                cy="70"
                r="50"
                fill="none"
                stroke="#344c69"
                strokeWidth="1.4"
                strokeDasharray="4 6"
                opacity="0.55"
              />
            </g>

            {/* Primary Rotating Circular Ring with Orbiting Berry & Gold Beads */}
            <g ref={outerRingRef}>
              <circle
                cx="70"
                cy="70"
                r={circleRadius}
                fill="none"
                stroke="#9e3a2e"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="88 264"
              />
              <circle
                cx="70"
                cy="70"
                r={circleRadius}
                fill="none"
                stroke="#38352f"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="24 328"
                strokeDashoffset="-135"
              />
              {/* Orbiting lead token dot at top of arc */}
              <circle
                cx="70"
                cy={70 - circleRadius}
                r="5"
                fill="#f0dfa0"
                stroke="#38352f"
                strokeWidth="2"
              />
              {/* Trailing berry dot */}
              <circle
                cx={70 + circleRadius}
                cy="70"
                r="3.2"
                fill="#9e3a2e"
              />
            </g>

            {/* Center Cozy Little Rabbit (Mochi Bunny) Illustration */}
            <g ref={rabbitGroupRef}>
              {/* Bunny Ears */}
              <g ref={earsRef}>
                {/* Left Ear */}
                <path
                  d="M58 54 C53 34, 45 33, 48 52 C49 56, 54 58, 58 56 Z"
                  fill="#fcf8ef"
                  stroke="#38352f"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M55 51 C52 39, 49 39, 51 50"
                  fill="none"
                  stroke="#9e3a2e"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.65"
                />

                {/* Right Floppy Ear */}
                <path
                  d="M81 54 C86 34, 96 35, 92 53 C90 57, 85 58, 81 56 Z"
                  fill="#fcf8ef"
                  stroke="#38352f"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M84 51 C87 40, 91 40, 88 50"
                  fill="none"
                  stroke="#9e3a2e"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.65"
                />
              </g>

              {/* Soft Bunny Body / Paws */}
              <path
                d="M52 88 C52 77, 88 77, 88 88 C88 94, 52 94, 52 88 Z"
                fill="#f7f2e7"
                stroke="#38352f"
                strokeWidth="2.1"
                strokeLinejoin="round"
              />

              {/* Bunny Head (Plump Mochi Shape) */}
              <path
                d="M46 69 C46 53, 94 53, 94 69 C94 81, 84 85, 70 85 C56 85, 46 81, 46 69 Z"
                fill="#fcf8ef"
                stroke="#38352f"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Rosy Sketch Cheeks */}
              <ellipse cx="55" cy="72" rx="4.2" ry="2.5" fill="#9e3a2e" opacity="0.28" />
              <ellipse cx="85" cy="72" rx="4.2" ry="2.5" fill="#9e3a2e" opacity="0.28" />

              {/* Happy Sparkling Eyes */}
              <circle cx="60" cy="67" r="2.3" fill="#38352f" />
              <circle cx="59.3" cy="66.2" r="0.8" fill="#fcf8ef" />
              <circle cx="80" cy="67" r="2.3" fill="#38352f" />
              <circle cx="79.3" cy="66.2" r="0.8" fill="#fcf8ef" />

              {/* Cute Y-Nose & Smile */}
              <path
                d="M68 70.5 L70 72.5 L72 70.5 M70 72.5 L70 75 M66.5 75.5 Q70 78 73.5 75.5"
                fill="none"
                stroke="#38352f"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Tiny Cozy Arcade Gamepad / Heart Held in Paws */}
              <rect
                x="61"
                y="81"
                width="18"
                height="10"
                rx="4.5"
                fill="#f0dfa0"
                stroke="#38352f"
                strokeWidth="1.8"
              />
              <path
                d="M65 86 H68 M66.5 84.5 V87.5"
                stroke="#38352f"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="74" cy="85" r="1.2" fill="#9e3a2e" />
              <circle cx="76.2" cy="87" r="1.2" fill="#344c69" />

              {/* Bunny Paws resting on controller */}
              <circle
                cx="60"
                cy="85.5"
                r="3.2"
                fill="#fcf8ef"
                stroke="#38352f"
                strokeWidth="1.8"
              />
              <circle
                cx="80"
                cy="85.5"
                r="3.2"
                fill="#fcf8ef"
                stroke="#38352f"
                strokeWidth="1.8"
              />
            </g>
          </svg>
        </div>

        {/* Rotating Loading Message & Optional Real Progress / Subtitle */}
        <div className={isCompact ? 'text-left' : 'mt-4 space-y-1'}>
          <p
            ref={messageTextRef}
            className={`font-bold tracking-tight text-[#38352f] ${
              isCompact ? 'text-sm' : 'text-lg'
            }`}
          >
            {safeMessages[messageIndex % safeMessages.length]}
          </p>

          {subtitle && (
            <p className="sketch-annotation text-xs text-[#514d44]">{subtitle}</p>
          )}

          {hasRealProgress && (
            <p className="font-mono text-[11px] font-semibold text-[#344c69] tabular-nums">
              Step progress: {Math.round(progress!)}%
            </p>
          )}

          {!isCompact && (
            <svg
              aria-hidden="true"
              viewBox="0 0 140 10"
              className="mx-auto mt-1 h-2.5 w-28 text-[#9e3a2e]"
              fill="none"
            >
              <path
                d="M4 6 C42 2, 98 9, 136 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact circular inline spinner for buttons and minor operations.
 * Matches the arcade's circular motif without blocking the screen.
 */
export function ArcadeInlineSpinner({
  size = 16,
  label,
  className = '',
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  const ringRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const tween = gsap.to(el, {
      rotation: 360,
      transformOrigin: '50% 50%',
      duration: 1.05,
      repeat: -1,
      ease: 'none',
    });

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="shrink-0 overflow-visible"
      >
        <circle
          cx="14"
          cy="14"
          r="10.5"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.75"
        />
        <g ref={ringRef}>
          <circle
            cx="14"
            cy="14"
            r="10.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray="22 46"
          />
          <circle cx="14" cy="3.5" r="2" fill="currentColor" />
        </g>
        <circle cx="14" cy="14" r="2.2" fill="currentColor" opacity="0.65" />
      </svg>
      {label && <span>{label}</span>}
    </span>
  );
}
