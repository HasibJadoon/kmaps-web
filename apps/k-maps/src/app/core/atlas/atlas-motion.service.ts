import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { SceneLayer } from './atlas.models';

@Injectable({ providedIn: 'root' })
export class AtlasMotionService {
  private activeTransition: gsap.core.Timeline | null = null;

  entrySequence(
    starHost: HTMLElement,
    modeIndicatorEl: HTMLElement,
    titleEl?: HTMLElement | null,
    subtitleEl?: HTMLElement | null,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(starHost, { opacity: 0 }, { opacity: 1, duration: 2.2 }, 0);

    if (titleEl) {
      tl.fromTo(
        titleEl,
        { opacity: 0, filter: 'blur(12px)', y: 6 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.4 },
        0.8,
      );
    }

    if (subtitleEl) {
      tl.fromTo(
        subtitleEl,
        { opacity: 0, y: 10, letterSpacing: '0.25em' },
        { opacity: 0.68, y: 0, letterSpacing: '0.06em', duration: 1.1 },
        1.4,
      );
    }

    tl.fromTo(
      modeIndicatorEl,
      { opacity: 0, x: -8 },
      { opacity: 0.52, x: 0, duration: 0.7 },
      2.0,
    );

    this.activeTransition = tl;
    return tl;
  }

  skyToConstellation(
    svgCanvas: SVGSVGElement,
    focusLabel: HTMLElement,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      onComplete,
    });

    tl.fromTo(
      svgCanvas,
      { opacity: 0.9 },
      { opacity: 0.78, duration: 0.34, ease: 'sine.inOut' },
      0,
    ).to(
      svgCanvas,
      { opacity: 1, duration: 1.05, ease: 'expo.out' },
      0.14,
    );

    tl.fromTo(
      focusLabel,
      { opacity: 0, y: 10, letterSpacing: '0.18em' },
      { opacity: 1, y: 0, letterSpacing: '0.08em', duration: 0.62, ease: 'power2.out' },
      0.24,
    );

    this.activeTransition = tl;
    return tl;
  }

  constellationToNode(
    constellationLayer: SVGGElement | null,
    nodeDots: NodeListOf<SVGCircleElement> | SVGCircleElement[],
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete,
    });

    if (constellationLayer) {
      tl.to(constellationLayer, { opacity: 0, duration: 0.32 }, 0);
    }

    if (nodeDots.length) {
      tl.fromTo(
        nodeDots,
        { scale: 0.4, opacity: 0, transformOrigin: 'center center' },
        { scale: 1, opacity: 1, duration: 0.48, stagger: 0.024 },
        0.2,
      );
    }

    this.activeTransition = tl;
    return tl;
  }

  nodeToHistory(
    focusedNode: SVGCircleElement | null,
    historyPanel: HTMLElement | null,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete,
    });

    if (focusedNode) {
      tl.to(focusedNode, { scale: 1.28, duration: 0.15, transformOrigin: 'center center', ease: 'power1.out' })
        .to(focusedNode, { scale: 1, duration: 0.22, ease: 'power1.inOut' });
    }

    if (historyPanel) {
      tl.fromTo(
        historyPanel,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.38 },
        0.1,
      );
    }

    this.activeTransition = tl;
    return tl;
  }

  stepBack(
    focusLabel: HTMLElement,
    onComplete?: () => void,
  ): gsap.core.Timeline {
    this.kill();

    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete,
    });

    tl.to(focusLabel, { opacity: 0, y: -5, duration: 0.28 });

    this.activeTransition = tl;
    return tl;
  }

  startQuranBreath(glowEl: SVGCircleElement | HTMLElement): gsap.core.Tween {
    return gsap.to(glowEl, {
      scale: 1.04,
      opacity: 0.85,
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: 'center center',
    });
  }

  startDrift(el: HTMLElement, amplitude = 6, period = 14): gsap.core.Tween {
    return gsap.to(el, {
      y: amplitude,
      duration: period,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  pulseNode(nodeEl: SVGCircleElement): gsap.core.Timeline {
    return gsap.timeline()
      .to(nodeEl, { scale: 1.35, duration: 0.14, transformOrigin: 'center center', ease: 'power1.out' })
      .to(nodeEl, { scale: 1.0, duration: 0.22, ease: 'power1.inOut' });
  }

  transitionModeLabel(el: HTMLElement, newLabel: string): gsap.core.Timeline {
    return gsap.timeline()
      .to(el, { opacity: 0, y: -4, duration: 0.18, ease: 'power1.in' })
      .call(() => { el.textContent = newLabel; })
      .to(el, { opacity: 0.52, y: 0, duration: 0.26, ease: 'power1.out' });
  }

  revealCard(cardEl: HTMLElement): gsap.core.Tween {
    return gsap.fromTo(
      cardEl,
      { opacity: 0, y: 14, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out' },
    );
  }

  dismissCard(cardEl: HTMLElement, onComplete?: () => void): gsap.core.Tween {
    return gsap.to(cardEl, {
      opacity: 0,
      y: 8,
      scale: 0.97,
      duration: 0.22,
      ease: 'power1.in',
      onComplete,
    });
  }

  revealModuleShortcuts(items: HTMLElement[] | NodeListOf<HTMLElement>): gsap.core.Tween {
    return gsap.fromTo(
      items,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.34, stagger: 0.055, ease: 'power2.out', delay: 2.8 },
    );
  }

  exitToApp(host: HTMLElement, onComplete?: () => void): gsap.core.Tween {
    return gsap.to(host, {
      opacity: 0,
      duration: 0.52,
      ease: 'power1.inOut',
      onComplete,
    });
  }

  dispose(): void {
    this.kill();
  }

  private kill(): void {
    this.activeTransition?.kill();
    this.activeTransition = null;
  }

  static layerLabel(layer: SceneLayer): string {
    switch (layer) {
      case 'sky': return 'Sky';
      case 'constellation': return 'Constellation';
      case 'node': return 'Concept Map';
      case 'history': return 'History';
    }
  }
}
