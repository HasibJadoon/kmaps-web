import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { CybReading, CarrierRows } from '../data/cyb.models';

// ─── Card primitives ─────────────────────────────────────────────────────────
//
// One card vocabulary for the whole control plane, so a reading looks the same
// wherever it is read — the root dashboard, an episode stage, a passage. The
// screens that grew before these each drew their own bars, which is how the same
// number came to be rendered three ways.
//
// They take plain data and emit no events: a card states what a row says. Where
// a card needs to be clickable the caller wraps it, so the card never has to
// know what a click means on that screen.

/** A titled slab. The one place card chrome — border, radius, padding — lives. */
@Component({
  selector: 'km-cyb-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="c">
      @if (title()) {
        <header class="c__h">
          <h4>{{ title() }}</h4>
          @if (hint()) { <span class="c__hint">{{ hint() }}</span> }
        </header>
      }
      <div class="c__b"><ng-content /></div>
    </section>
  `,
  styles: [`
    .c { border:1px solid var(--bd); border-radius:12px; background:var(--s1); overflow:hidden; }
    .c__h { display:flex; align-items:baseline; gap:10px; padding:10px 13px 0; }
    .c__h h4 { margin:0; font-size:10px; letter-spacing:.14em; text-transform:uppercase;
                color:var(--t3); font-weight:600; }
    .c__hint { margin-inline-start:auto; font-size:10.5px; color:var(--t3); }
    .c__b { padding:11px 13px 12px; }
  `],
})
export class CybCardComponent {
  readonly title = input<string>('');
  readonly hint = input<string>('');
}

/**
 * One axis of one node.
 *
 * The distinction the card exists to make: `measured` says a sensor actually
 * read this. An unmeasured percentage is a stored intention — it may be right,
 * but nothing checked it — and every bar that renders the two identically
 * invites the reader to trust them equally.
 */
@Component({
  selector: 'km-cyb-reading-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="r" [attr.data-axis]="reading().axis" [class.r--unmeasured]="!reading().measured">
      <span class="r__k">{{ reading().axis }}</span>
      <span class="r__v">{{ reading().pct }}<i>%</i></span>
      <span class="r__bar"><i [style.width.%]="reading().pct"></i></span>
      <span class="r__m">
        @if (reading().measured) {
          {{ reading().read_sensors }}/{{ reading().sensors }} sensors
          @if (reading().stale) { <b class="r__stale">stale</b> }
        } @else {
          unmeasured
        }
      </span>
    </div>
  `,
  styles: [`
    .r { display:flex; flex-direction:column; gap:3px; min-width:104px;
         border:1px solid var(--bd); border-radius:10px; padding:8px 11px; background:#0d0d0d; }
    .r__k { font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--t3); }
    .r__v { font-size:19px; font-weight:600; color:var(--text); line-height:1; }
    .r__v i { font-size:11px; font-style:normal; color:var(--t3); margin-inline-start:1px; }
    .r__bar { display:block; height:3px; border-radius:2px; background:#241f12; overflow:hidden; }
    .r__bar i { display:block; height:100%; background:var(--t3); }
    .r__m { font-size:9.5px; color:var(--t3); }
    .r__stale { color:var(--err); font-weight:600; margin-inline-start:4px; }
    /* Unmeasured reads as an outline, not a fill — the number is not evidence. */
    .r--unmeasured .r__bar i { background:repeating-linear-gradient(
        90deg, var(--t3) 0 3px, transparent 3px 6px); opacity:.55; }
    .r--unmeasured .r__v { color:var(--t2); }
    .r[data-axis='build']     .r__bar i, .r[data-axis='build']:not(.r--unmeasured) .r__v { color:inherit; }
    .r[data-axis='build']:not(.r--unmeasured)     .r__bar i { background:var(--build); }
    .r[data-axis='study']:not(.r--unmeasured)     .r__bar i { background:var(--study); }
    .r[data-axis='content']:not(.r--unmeasured)   .r__bar i { background:var(--content); }
    .r[data-axis='retention']:not(.r--unmeasured) .r__bar i { background:var(--retn); }
  `],
})
export class CybReadingCardComponent {
  readonly reading = input.required<CybReading>();
}

/**
 * What one carrier table holds for a node.
 *
 * `total` is the count the bridge reports; `rows` is the sample it returned.
 * The card prints both, because a carrier holding 4,000 rows and returning 20 is
 * a different fact from one holding 20.
 */
@Component({
  selector: 'km-cyb-carrier-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="cc" [class.cc--empty]="!carrier().total">
      <div class="cc__h">
        <span class="cc__t">{{ carrier().table_name || carrier().carrier }}</span>
        @if (carrier().source_db) { <span class="cc__db">{{ carrier().source_db }}</span> }
        @if (carrier().band_code) { <span class="cc__band">{{ carrier().band_code }}</span> }
        <span class="cc__n">{{ carrier().total | number }}</span>
      </div>
      @if (carrier().rows.length) {
        <ul class="cc__rows">
          @for (row of carrier().rows.slice(0, previewRows()); track $index) {
            <li>{{ summarise(row) }}</li>
          }
        </ul>
        @if (carrier().total > carrier().rows.length) {
          <p class="cc__more">
            showing {{ carrier().rows.length }} of {{ carrier().total | number }}
          </p>
        }
      } @else {
        <p class="cc__none">nothing bound here yet</p>
      }
    </div>
  `,
  styles: [`
    .cc { border:1px solid var(--bd); border-radius:10px; padding:9px 11px; background:#0d0d0d; }
    .cc--empty { opacity:.62; }
    .cc__h { display:flex; align-items:baseline; gap:7px; flex-wrap:wrap; }
    .cc__t { font-size:11.5px; color:var(--text);
             font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
    .cc__db { font-size:9.5px; color:var(--study); }
    .cc__band { font-size:9.5px; color:var(--gold); }
    .cc__n { margin-inline-start:auto; font-size:12px; color:var(--content); font-weight:600; }
    .cc--empty .cc__n { color:var(--t3); }
    .cc__rows { list-style:none; margin:7px 0 0; padding:0; display:grid; gap:2px; }
    .cc__rows li { font-size:10.5px; color:var(--t2); line-height:1.45;
                   overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cc__more, .cc__none { margin:6px 0 0; font-size:9.5px; color:var(--t3); }
    .cc__none { font-style:italic; }
  `],
})
export class CybCarrierCardComponent {
  readonly carrier = input.required<CarrierRows>();
  readonly previewRows = input(4);

  /**
   * A carrier row is an arbitrary record — the bridge returns whatever the
   * table holds. Rather than guess a schema per table, prefer the fields that
   * carry meaning across all of them and fall back to the first few values, so
   * an unfamiliar carrier still shows something a reader can recognise.
   */
  summarise(row: Record<string, unknown>): string {
    const preferred = ['name_ar', 'text_ar', 'lemma_ar', 'surface', 'gloss_en',
                       'name_en', 'title', 'label', 'value', 'id'];
    for (const key of preferred) {
      const v = row[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return Object.values(row)
      .filter((v) => v !== null && v !== undefined && v !== '')
      .slice(0, 3)
      .map(String)
      .join(' · ');
  }
}
