import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Makes a clickable non-button element keyboard- and screen-reader-operable:
 * role="button", focusable, and Enter/Space fire the element's own (click).
 * Keys pressed on a nested control (a button or link inside) are left alone.
 * Prefer a real <button>; use this where the element holds other controls
 * or its layout would not survive the switch.
 */
@Directive({
  selector: '[kmPressable]',
  standalone: true,
  host: {
    role: 'button',
    tabindex: '0',
    '(keydown)': 'onKeydown($event)',
  },
})
export class PressableDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  onKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.el.nativeElement.click();
  }
}
