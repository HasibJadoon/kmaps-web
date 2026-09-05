import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

// Flip is what makes the persistent chrome travel between slides instead of
// cross-fading — the Keynote "Magic Move" model, and the SwiftUI side's
// matchedGeometryEffect. Registered at module scope, the way
// QuranGsapService registers ScrollTrigger.
gsap.registerPlugin(Flip);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A hidden document has no animation clock — browsers stop rAF for tabs that
 * are not visible — so a tween started there freezes on its first frame until
 * the tab is shown. A deck opened in a background tab (cmd-click) would sit
 * half-faded. Nobody is watching a hidden tab, so treat it like reduced
 * motion and land in the settled state.
 */
const settleImmediately = (): boolean =>
  prefersReducedMotion() || (typeof document !== 'undefined' && document.hidden);

/**
 * Contract §6. These durations and eases are shared with the SwiftUI renderer,
 * which reads the same curves as bézier control points — parity is exact, not
 * approximate. Change them here and in DeckMotion.swift together.
 */
const BEAT = {
  out:     { d: 0.18, ease: 'power2.in' },
  kicker:  { d: 0.26, ease: 'power2.out' },
  lines:   { d: 0.42, ease: 'power3.out', stagger: 0.07 },
  gloss:   { d: 0.32, ease: 'power2.out', stagger: 0.05, delay: 0.12 },
  notes:   { d: 0.30, ease: 'power2.out', stagger: 0.045 },
  refs:    { d: 0.34, ease: 'back.out(1.6)', stagger: 0.06 },
  source:  { d: 0.26, ease: 'power1.out' },
} as const;

/** Lines enter from the reading direction; going back reverses the sign. */
const ENTER_X = 24;

@Injectable({ providedIn: 'root' })
export class DeckMotionService {
  private timeline: gsap.core.Timeline | null = null;

  /** Capture the chrome's geometry before the DOM changes. */
  captureChrome(root: HTMLElement | null): Flip.FlipState | null {
    if (!root || settleImmediately()) return null;
    const targets = root.querySelectorAll<HTMLElement>('[data-deck-flip]');
    return targets.length ? Flip.getState(targets) : null;
  }

  /**
   * Animate a slide in. `state` is whatever captureChrome returned before the
   * slide swapped; `forward` decides which way the lines travel in from.
   */
  enter(root: HTMLElement, state: Flip.FlipState | null, forward: boolean): void {
    this.kill();

    const q = <T extends HTMLElement>(sel: string) =>
      Array.from(root.querySelectorAll<T>(sel));

    const kicker = q('.deck-kicker');
    const cards = q('.deck-card');
    // Text inside a card rides the card in; only loose lines travel on their own.
    const lines = q('.deck-line').filter((el) => !el.closest('.deck-card'));
    const glosses = q('.deck-gloss');
    const notes = q('.deck-note');
    const refs = q('.deck-ref');
    const source = q('.deck-source');
    // Pills are the labels over panels; they pop once their panel has landed.
    const decor = q('.deck-pill, .deck-quote-mark').filter((el) => !el.classList.contains('deck-ref'));
    const rules = q('.deck-band-rule, .deck-gold-rule, .deck-cell-rule');
    const draws = q('.deck-arrow, .deck-rail');

    if (settleImmediately()) {
      // Set the final state outright. A zero-duration tween still schedules a
      // frame, and that still shows as a flicker.
      gsap.set([...kicker, ...cards, ...lines, ...glosses, ...notes, ...refs, ...source, ...decor], {
        opacity: 1, x: 0, y: 0, scale: 1, clearProps: 'transform',
      });
      gsap.set([...rules, ...draws], { scaleX: 1, scaleY: 1, clearProps: 'transform' });
      return;
    }

    // The chrome travels from where it was; everything else is new and enters.
    if (state) {
      Flip.from(state, { duration: 0.42, ease: 'power2.inOut', absolute: false });
    }

    const dx = forward ? ENTER_X : -ENTER_X;
    const tl = gsap.timeline();

    if (kicker.length) {
      tl.fromTo(kicker, { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: BEAT.kicker.d, ease: BEAT.kicker.ease }, 0);
    }
    if (lines.length) {
      tl.fromTo(lines, { opacity: 0, x: dx },
        { opacity: 1, x: 0, duration: BEAT.lines.d, ease: BEAT.lines.ease,
          stagger: BEAT.lines.stagger, clearProps: 'transform' }, 0.05);
    }
    if (cards.length) {
      // Panels rise rather than slide: a card is a thing set down, not read.
      tl.fromTo(cards, { opacity: 0, y: 18, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: BEAT.lines.d, ease: BEAT.lines.ease,
          stagger: BEAT.lines.stagger * 1.3, clearProps: 'transform' }, 0.12);
    }
    if (rules.length) {
      // Rules wipe out from their centre, the way a Keynote line draws.
      tl.fromTo(rules, { scaleX: 0 },
        { scaleX: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08, clearProps: 'transform' }, 0.1);
    }
    if (draws.length) {
      // Arrows and the proof rail draw toward the next step before it lands.
      tl.fromTo(draws, { scaleX: 0 },
        { scaleX: 1, duration: 0.36, ease: 'power2.out', stagger: 0.12, clearProps: 'transform' }, 0.18);
    }
    if (decor.length) {
      // Tags, numerals, ornaments pop in last — the finishing touches.
      tl.fromTo(decor, { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: BEAT.refs.d, ease: BEAT.refs.ease,
          stagger: 0.07, clearProps: 'transform' }, 0.34);
    }
    if (glosses.length) {
      tl.fromTo(glosses, { opacity: 0 },
        { opacity: 1, duration: BEAT.gloss.d, ease: BEAT.gloss.ease,
          stagger: BEAT.gloss.stagger }, 0.05 + BEAT.gloss.delay);
    }
    if (notes.length) {
      tl.fromTo(notes, { opacity: 0, x: dx * 0.5 },
        { opacity: 1, x: 0, duration: BEAT.notes.d, ease: BEAT.notes.ease,
          stagger: BEAT.notes.stagger, clearProps: 'transform' }, 0.3);
    }
    if (refs.length) {
      tl.fromTo(refs, { opacity: 0, scale: 0.82 },
        { opacity: 1, scale: 1, duration: BEAT.refs.d, ease: BEAT.refs.ease,
          stagger: BEAT.refs.stagger, clearProps: 'transform' }, 0.38);
    }
    if (source.length) {
      tl.fromTo(source, { opacity: 0 },
        { opacity: 1, duration: BEAT.source.d, ease: BEAT.source.ease }, 0.42);
    }

    // title: the calligraphy lifts rather than merely appearing.
    const hero = root.querySelector<HTMLElement>('.deck-hero-title');
    if (hero) {
      tl.fromTo(hero, { scale: 0.94 },
        { scale: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }, 0);
    }
    // The verse panel lands slower and heavier than the others.
    const verse = q('.deck-card--verse');
    if (verse.length) {
      tl.fromTo(verse, { opacity: 0, y: 26, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.62, ease: 'power3.out',
          stagger: 0.1, clearProps: 'transform', overwrite: 'auto' }, 0.1);
    }

    this.timeline = tl;
  }

  kill(): void {
    this.timeline?.kill();
    this.timeline = null;
  }
}
