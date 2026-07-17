import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Placeholder shell for the K-MAPS cross-source synthesis of a root. The real
// synthesis view (meaning-core, semantic poles, development stages, five-lens
// analysis — kmaps_five_lens / kmaps_usage_map / kmaps_development) is a
// separate design still to be built; this page reserves the route and root.
@Component({
  selector: 'km-lexicon-synthesis',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="syn" dir="rtl">
      <a class="syn__back" [routerLink]="['/lexicon/search']"
         [queryParams]="{ q: root(), mode: 'root' }">
        <span class="syn__chev">‹</span><span>نتائج «{{ root() }}»</span>
      </a>
      <span class="syn__badge">K-MAPS · خلاصة</span>
      <h1 class="syn__root">{{ root() }}</h1>
      <p class="syn__title">تحليل المعاني الخمسة</p>
      <div class="syn__placeholder">
        <span class="syn__mark">◆</span>
        <p>صفحة الخلاصة التوليفية لهذا الجذر — قيد التصميم.</p>
        <p class="syn__note">ستجمع المعنى الجامع والأقطاب الدلاليّة ومراحل التطوّر عبر كل المعاجم.</p>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: radial-gradient(130% 90% at 82% -10%, rgba(55, 217, 154, .07), transparent 60%), #080808;
      color: #ede0c4;
      font-family: 'Poppins', system-ui, sans-serif;
    }
    .syn { max-width: 1180px; margin: 0 auto; padding: 30px 28px 100px; }
    .syn__back {
      display: inline-flex; align-items: center; gap: 6px;
      color: #b7ac90; font-size: 0.82rem; text-decoration: none;
      padding: 7px 10px; border-radius: 9px;
    }
    .syn__back:hover { background: #161009; color: #ede0c4; }
    .syn__chev { font-size: 1.1rem; line-height: 1; }
    .syn__badge {
      display: inline-block; margin-top: 18px;
      font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 700;
      letter-spacing: 0.2em; color: #0a120e;
      background: linear-gradient(120deg, #37d99a, #b6e86a);
      border-radius: 7px; padding: 4px 11px;
    }
    .syn__root {
      margin: 14px 0 2px; font-family: 'Amiri', serif; font-weight: 700;
      font-size: 4.4rem; line-height: 1;
      background: linear-gradient(160deg, #d6ffe9, #37d99a 55%, #0c7c5a);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .syn__title { font-family: 'Amiri', serif; font-size: 1.3rem; color: #b7ac90; margin: 0 0 26px; }
    .syn__placeholder {
      text-align: center; padding: 60px 24px;
      border: 1px dashed rgba(55, 217, 154, .28); border-radius: 18px;
      background: linear-gradient(150deg, #0d1a15, #0a0f0c);
      font-family: 'Amiri', serif; color: #cbe9db;
    }
    .syn__mark { display: block; font-size: 2.4rem; color: rgba(55, 217, 154, .5); margin-bottom: 12px; }
    .syn__placeholder p { margin: 6px 0; font-size: 1.1rem; }
    .syn__note { color: #8a7e63 !important; font-size: 0.95rem !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LexiconSynthesisComponent {
  readonly root = signal('');

  constructor() {
    const route = inject(ActivatedRoute);
    route.paramMap.pipe(takeUntilDestroyed()).subscribe(p => {
      this.root.set(p.get('root') ?? '');
    });
  }
}
