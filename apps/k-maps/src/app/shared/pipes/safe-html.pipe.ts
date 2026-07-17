import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Render trusted, class-scoped HTML fragments authored in our own D1 (e.g. the
 * Mufradat trilingual translations and family-map glosses, which use
 * `<span class="ar">`, `<span class="r">`, `<b>`, `<i>`, `<em>`).
 *
 * Angular's default sanitizer strips the `class` attribute needed for that
 * markup, so we bypass for this specifically-trusted content source. Never
 * feed user-supplied HTML through this pipe.
 */
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value ?? '');
  }
}
