'use client';

import { useEffect, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let scrollTriggerRegistered = false;

export function ensureGsapPlugins() {
  if (typeof window !== 'undefined' && !scrollTriggerRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    scrollTriggerRegistered = true;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Smoothly scrolls window to top or a target element using native/GSAP-friendly easing
 * and refreshes ScrollTrigger after movement completes.
 */
export function smoothScrollToTop() {
  if (typeof window === 'undefined') return;
  if (prefersReducedMotion()) {
    window.scrollTo(0, 0);
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.setTimeout(() => {
    if (scrollTriggerRegistered) {
      ScrollTrigger.refresh();
    }
  }, 360);
}

/**
 * Subtle tactile GSAP button press feedback.
 */
export function animateButtonPress(target: HTMLElement | null) {
  if (!target || prefersReducedMotion()) return;
  gsap.killTweensOf(target);
  gsap.fromTo(
    target,
    { scale: 0.96 },
    {
      scale: 1,
      duration: 0.28,
      ease: 'back.out(2)',
      clearProps: 'transform',
    }
  );
}

/**
 * Subtle tactile GSAP card hover elevation.
 */
export function animateCardHover(target: HTMLElement | null, entering: boolean) {
  if (!target || prefersReducedMotion()) return;
  gsap.to(target, {
    y: entering ? -4 : 0,
    scale: entering ? 1.01 : 1,
    duration: 0.26,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}

/**
 * Coordinates smooth page/section transitions and staggered item reveals
 * whenever the active navigation section or sub-view changes.
 */
export function useGsapSectionTransition(
  containerRef: RefObject<HTMLElement | null>,
  triggerKey: string
) {
  useEffect(() => {
    ensureGsapPlugins();
    const el = containerRef.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      tl.fromTo(
        el,
        { autoAlpha: 0.01, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.38, clearProps: 'transform' }
      );

      const headers = el.querySelectorAll('[data-gsap-header]');
      if (headers.length > 0) {
        tl.fromTo(
          headers,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.34,
            stagger: 0.05,
            clearProps: 'transform',
          },
          '-=0.26'
        );
      }

      const cards = el.querySelectorAll('[data-gsap-card]');
      if (cards.length > 0) {
        tl.fromTo(
          cards,
          { autoAlpha: 0, y: 18, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.38,
            stagger: { amount: Math.min(0.42, cards.length * 0.035) },
            clearProps: 'transform',
          },
          '-=0.24'
        );
      }

      const rows = el.querySelectorAll('[data-gsap-row]');
      if (rows.length > 0) {
        tl.fromTo(
          rows,
          { autoAlpha: 0, x: -10 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 0.3,
            stagger: { amount: Math.min(0.35, rows.length * 0.025) },
            clearProps: 'transform',
          },
          '-=0.22'
        );
      }
    }, el);

    return () => {
      ctx.revert();
    };
  }, [containerRef, triggerKey]);
}

/**
 * Registers GSAP ScrollTrigger animations for scroll-revealed sections and staggered groups.
 * Automatically cleans up all ScrollTrigger instances when unmounting or changing views.
 */
export function useGsapScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  triggerKey: string
) {
  useEffect(() => {
    ensureGsapPlugins();
    const root = containerRef.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const scrollBlocks = root.querySelectorAll('[data-gsap-scroll]');
      scrollBlocks.forEach((block) => {
        gsap.fromTo(
          block,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.46,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: block,
              start: 'top 90%',
              toggleActions: 'play none none none',
              once: true,
            },
          }
        );
      });

      const staggerGroups = root.querySelectorAll('[data-gsap-stagger-group]');
      staggerGroups.forEach((group) => {
        const items = group.querySelectorAll('[data-gsap-stagger-item]');
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 16, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.38,
            stagger: 0.045,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: group,
              start: 'top 88%',
              toggleActions: 'play none none none',
              once: true,
            },
          }
        );
      });
    }, root);

    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      window.clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, [containerRef, triggerKey]);
}

/**
 * Smoothly animates modal overlays and dialog cards on open.
 */
export function useGsapModalTransition(
  backdropRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  subKey?: string
) {
  useEffect(() => {
    if (!isOpen || prefersReducedMotion()) return;
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!panel) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (backdrop) {
        tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 }, 0);
      }
      tl.fromTo(
        panel,
        { autoAlpha: 0, y: 20, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          clearProps: 'transform',
        },
        0.03
      );

      const innerItems = panel.querySelectorAll('[data-gsap-modal-item]');
      if (innerItems.length > 0) {
        tl.fromTo(
          innerItems,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.04,
            clearProps: 'transform',
          },
          '-=0.18'
        );
      }
    }, panel);

    return () => {
      ctx.revert();
    };
  }, [backdropRef, panelRef, isOpen, subKey]);
}
