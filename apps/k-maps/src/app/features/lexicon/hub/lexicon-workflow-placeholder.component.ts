import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

/**
 * Shared placeholder shell for the not-yet-wired lexicon hub destinations
 * (K-Maps synthesized roots, Fix-Display workflow, Root-Synthesis workflow).
 * Title/eyebrow/note come from the route's `data` block so one component
 * serves all three. The live views (D1-backed, verse-by-verse) replace these
 * targets in the next slice.
 */
@Component({
  selector: 'km-lexicon-workflow-placeholder',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lwp">
      <km-back-button />
      <a class="lwp__home" [routerLink]="['/lexicon']">‹ Lexicon hub</a>
      <span class="lwp__eyebrow">{{ eyebrow() }}</span>
      <h1 class="lwp__title">{{ title() }}</h1>
      <div class="lwp__panel">
        <span class="lwp__mark">⚗</span>
        <p>{{ note() }}</p>
        <p class="lwp__sub">This view is reserved — the D1-backed, verse-by-verse data lands next.</p>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block; min-height: 100vh;
      background:
        radial-gradient(120% 80% at 82% -8%, rgba(200,160,74,.07), transparent 60%),
        #1c1b18;
      color: #e9e0c8;
      font-family: 'Amiri', 'Scheherazade New', Georgia, serif;
    }
    .lwp { max-width: 1000px; margin: 0 auto; padding: 34px 24px 90px; }
    .lwp__home {
      display: inline-block; margin: 6px 0 20px;
      font-family: 'Poppins', system-ui, sans-serif; font-size: .82rem;
      color: #a89f87; text-decoration: none; padding: 6px 10px; border-radius: 8px;
    }
    .lwp__home:hover { background: #25231e; color: #e9e0c8; }
    .lwp__eyebrow {
      display: block; font-family: 'Poppins', system-ui, sans-serif;
      font-size: .62rem; font-weight: 700; letter-spacing: .24em;
      text-transform: uppercase; color: #c8a04a;
    }
    .lwp__title { margin: 8px 0 26px; font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; }
    .lwp__panel {
      text-align: center; padding: 56px 24px;
      border: 1px dashed #3a362c; border-radius: 18px;
      background: linear-gradient(150deg, #25231e, #201e19);
      color: #cdbf9c;
    }
    .lwp__mark { display: block; font-size: 2.2rem; color: rgba(200,160,74,.55); margin-bottom: 12px; }
    .lwp__panel p { margin: 6px 0; font-size: 1.05rem; }
    .lwp__sub {
      color: #8a7f66 !important; font-size: .9rem !important;
      font-family: 'Poppins', system-ui, sans-serif;
    }
  `],
})
export class LexiconWorkflowPlaceholderComponent {
  private readonly data = toSignal(
    inject(ActivatedRoute).data.pipe(map(d => d as { eyebrow?: string; title?: string; note?: string })),
    { initialValue: {} as { eyebrow?: string; title?: string; note?: string } },
  );

  readonly eyebrow = () => this.data().eyebrow ?? 'Workflow';
  readonly title   = () => this.data().title ?? 'Lexicon';
  readonly note    = () => this.data().note ?? 'Coming next.';
}
