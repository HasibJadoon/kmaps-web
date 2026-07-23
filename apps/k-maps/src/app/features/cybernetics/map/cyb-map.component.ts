import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import type {
  CybNode, Surah, StudyUnit, StagingMatrix, StageCell, SubLayer,
  RootDetail, RootClaim, RootMemlet, RootQuestion, RootOption, RootMedia, PassageRoot,
} from '../data/cyb.models';

// Quran Map — Qurʾān-centric, over the Surah Study module:
//   Qurʾān(114) → Surah → Study passages → Streams(6) → Roots → Root Dashboard.
// The cybernetics build/study/content/retention overlays at every level; the
// deepest level is each root's own dashboard (4 outputs + staged layers +
// recursion), fed by the live cyb tree + AL staging matrix.
// The Membean word-page panel layout, mapped onto K-Maps memlet kinds.
// col 'l' = the learning column (context, hook, examples);
// col 'r' = the analysis column (ingredients, theater, constellation, related…).
const MEMBEAN_PANELS: { key: string; en: string; ar: string; col: 'l' | 'r' }[] = [
  { key: 'context',        en: 'Context',            ar: 'السياق',       col: 'l' },
  { key: 'root_image',     en: 'Memory Hook',        ar: 'صورة الجذر',   col: 'l' },
  { key: 'examples',       en: 'Examples',           ar: 'الشواهد',      col: 'l' },
  { key: 'attestation',    en: 'Attestation',        ar: 'الشهادات',     col: 'l' },
  { key: 'recitation',     en: 'Recitation',         ar: 'التلاوة',      col: 'l' },
  { key: 'image',          en: 'Image',              ar: 'الصورة',       col: 'l' },
  { key: 'word_sum',       en: 'Word Ingredients',   ar: 'الجذر والوزن', col: 'r' },
  { key: 'wazn_operation', en: 'Wazn Operation',     ar: 'عمل الوزن',    col: 'r' },
  { key: 'video',          en: 'Word Theater',       ar: 'المقطع',       col: 'r' },
  { key: 'constellation',  en: 'Word Constellation', ar: 'الشبكة',       col: 'r' },
  { key: 'related',        en: 'Related Words',      ar: 'النظائر',      col: 'r' },
  { key: 'variants',       en: 'Word Variants',      ar: 'المشتقات',     col: 'r' },
  { key: 'irab',           en: 'Iʿrāb in context',   ar: 'الإعراب',      col: 'r' },
  { key: 'drops',          en: 'Drops',              ar: 'ما لا يحمله',  col: 'r' },
  { key: 'spelling',       en: 'Spelling',           ar: 'الإملاء',      col: 'r' },
  { key: 'diacritics',     en: 'Vocalisation',       ar: 'الشكل',        col: 'r' },
];

const STREAM_LABELS: Record<string, { ar: string; en: string; hint: string }> = {
  vocabulary: { ar: 'المفردات', en: 'Root / Vocabulary', hint: 'roots' },
  reading:    { ar: 'القراءة',  en: 'Reading', hint: 'tilāwa · tajwīd' },
  ss:         { ar: 'الإعراب',  en: 'Sentence Structure', hint: 'iʿrāb' },
  structure:  { ar: 'النظم',    en: 'Passage Structure', hint: 'naẓm · coherence' },
  tafsir:     { ar: 'التفسير',  en: 'Tafsīr', hint: '8 books' },
  worldview:  { ar: 'رؤية العالم', en: 'Worldview · WVS', hint: 'ʿaqīda · ethics' },
};

@Component({
  selector: 'km-cyb-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else {
      <!-- breadcrumb -->
      <div class="crumbs">
        <button class="crumb" [class.cur]="view()==='surahs'" (click)="goSurahs()">القرآن · Qurʾān</button>
        @if (surahId()) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="view()==='passages'" (click)="goSurah()">
            {{ surah()?.name_en || 'Surah ' + surahId() }} <span class="aa">{{ surah()?.name_ar }}</span></button>
        }
        @if (passageNo()) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="view()==='streams'" (click)="goPassage()">
            {{ selUnit() ? surahId() + ':' + selUnit()!.ayah_from + '–' + selUnit()!.ayah_to : 'Passage ' + passageNo() }}</button>
        }
        @if (streamParam(); as st) {
          <span class="csep">›</span>
          <button class="crumb" [class.cur]="view()==='pieces'" (click)="goStream()">{{ streamLabelKey(st).en }}</button>
        }
        @if (rootParam(); as rn) {
          <span class="csep">›</span>
          <button class="crumb cur">{{ rn }}</button>
        }
      </div>

      <!-- ══ L1 · 114 surahs ══ -->
      @if (view()==='surahs') {
        @if (surahs().length) {
          <div class="vh"><span>Entire Qurʾān · 114 surahs</span><span class="h">{{ activeCount() }} active · tap to open</span></div>
          <div class="grid">
            @for (s of surahs(); track s.id) {
              @let node = surahNode(s.id);
              <button class="cell" [class.active]="node && node.build_pct > 0" (click)="openSurah(s)">
                <div class="top"><span class="num">{{ s.id }}</span>
                  <span class="rt" [class.makki]="s.revelation_type==='makki'" [class.madani]="s.revelation_type==='madani'"></span></div>
                <div class="nar">{{ s.name_ar }}</div>
                <div class="nen">{{ s.name_transliteration || s.name_en }}</div>
                <div class="ay">{{ s.ayah_count }} āyāt</div>
                <div class="pbar"><div class="pf" [style.width.%]="node?.build_pct || 0"></div></div>
                <div class="pl">{{ node && node.build_pct > 0 ? 'build ' + node.build_pct + '%' : 'not started' }}</div>
              </button>
            }
          </div>
        } @else { <div class="msg">Loading the Qurʾān…</div> }
      }

      <!-- ══ L2 · a surah's study passages ══ -->
      @else if (view()==='passages') {
        @if (loadingPassages()) { <div class="msg">Loading passages…</div> }
        @else if (units().length) {
          <div class="vh"><span>{{ surah()?.name_en }} · study passages</span><span class="h">{{ units().length }} passages · tap to open</span></div>
          <div class="list">
            @for (u of units(); track u.passage_id) {
              @let pnode = passageNode(u);
              <div class="lc clickable" [style.--lc]="pnode && pnode.build_pct > 0 ? 'var(--content)' : 'var(--gold-d)'"
                   (click)="onPassageCard(u, pnode)">
                <div class="lct"><span class="en">{{ u.passage_no }}. {{ u.label }}</span><span class="no">{{ surah()?.id }}:{{ u.ayah_from }}–{{ u.ayah_to }}</span></div>
                @if (u.theme) { <div class="lcd">{{ u.theme }}</div> }
                <div class="steps">
                  <span class="step" [class.on]="u.reading.has">reading</span>
                  <span class="step" [class.on]="u.vocabulary.total > 0">vocab {{ u.vocabulary.total || '' }}</span>
                  <span class="step" [class.on]="u.sentence_structure.has">iʿrāb</span>
                  <span class="step" [class.on]="u.passage_structure.has">naẓm</span>
                  <span class="step" [class.on]="u.expressions.has">idioms</span>
                </div>
                @if (pnode && pnode.build_pct > 0) {
                  <div class="pbuild"><span class="o" style="--oc:var(--build)"><i [style.width.%]="pnode.build_pct"></i></span>
                    <span class="pl2">build {{ pnode.build_pct }}% · study {{ pnode.study_pct }}%</span></div>
                }
                <div class="lcact">
                  <span class="hint">{{ pnode && pnode.children.length ? 'tap card → streams · roots' : 'tap card → open in Study' }}</span>
                  <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study', u.passage_no]" (click)="$event.stopPropagation()">Open in Study ›</a>
                </div>
                <span class="go">›</span>
              </div>
            }
          </div>
        } @else {
          <div class="msg">{{ surah()?.name_en }} — no study passages defined yet.
            <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study']">Open the surah in Study ›</a></div>
        }
      }

      <!-- ══ L3 · the 6 stream-systems ══ -->
      @else if (view()==='streams') {
        @let kids = current();
        @if (kids.length) {
          <div class="vh"><span>{{ drillTitle() }} · the 6 stream-systems</span><span class="h">tap Vocabulary to reach the roots</span></div>
          <div class="list">
            @for (n of kids; track n.id) {
              @let lab = streamLabel(n);
              <div class="lc" [style.--lc]="streamColor(n.layer)" [class.dim]="!n.children.length"
                   (click)="n.children.length ? drill(n) : null">
                <div class="lct"><span class="aa" [style.color]="streamColor(n.layer)">{{ lab.ar }}</span><span class="en">{{ lab.en }}</span><span class="no">{{ lab.hint }}</span></div>
                <div class="o4big">
                  <div class="ob"><span class="obl">Build <b>{{ n.build_pct }}</b></span><span class="o" style="--oc:var(--build)"><i [style.width.%]="n.build_pct"></i></span></div>
                  <div class="ob"><span class="obl">Study <b>{{ n.study_pct }}</b></span><span class="o" style="--oc:var(--study)"><i [style.width.%]="n.study_pct"></i></span></div>
                  <div class="ob"><span class="obl">Content <b>{{ n.content_pct }}</b></span><span class="o" style="--oc:var(--content)"><i [style.width.%]="n.content_pct"></i></span></div>
                  <div class="ob"><span class="obl">Retn <b>{{ n.retention_pct }}</b></span><span class="o" style="--oc:var(--retn)"><i [style.width.%]="n.retention_pct"></i></span></div>
                </div>
                @if (n.children.length) { <span class="go">›</span> }
              </div>
            }
          </div>
        } @else { <div class="msg">Loading the passage's streams…</div> }
      }

      <!-- ══ L4 · the stream's pieces (roots for Vocabulary) ══ -->
      @else if (view()==='pieces') {
        @let kids = current();
        @if (streamParam() === 'vocabulary') {
          <div class="vh"><span>Root / Vocabulary · {{ verseRoots().length }} unique roots</span><span class="h">from the āyāt · tap a root for its dashboard</span></div>
          @if (verseRoots().length) {
            <div class="grid">
              @for (vr of verseRoots(); track vr.root) {
                @let rnode = cybNodeForRoot(vr.root);
                <button class="cell rootcell"
                        [style.borderLeftColor]="(rnode?.build_pct || 0) >= 50 ? 'var(--content)' : 'var(--gold-d)'"
                        (click)="openRootNorm(vr.root)">
                  <div class="top"><span class="num">{{ surahId() }}:{{ vr.first_ayah }} · {{ vr.occurrences }}×</span></div>
                  <div class="nar rootar">{{ vr.root }}</div>
                  <div class="pbar"><div class="pf" [style.width.%]="rnode?.build_pct || 0"></div></div>
                  <div class="pl">build {{ rnode?.build_pct || 0 }}%</div>
                </button>
              }
            </div>
          } @else { <div class="msg">Loading the passage's roots…</div> }
        } @else if (kids.length) {
          <div class="vh"><span>Root / Vocabulary · {{ kids.length }} roots</span><span class="h">tap a root for its dashboard</span></div>
          <div class="grid">
            @for (n of kids; track n.id) {
              <button class="cell rootcell" [style.borderLeftColor]="n.build_pct >= 50 ? 'var(--content)' : 'var(--gold-d)'" (click)="openRoot(n)">
                <div class="top"><span class="num">{{ n.piece_kind }}</span></div>
                <div class="nar rootar">{{ rootNorm(n) }}</div>
                <div class="pbar"><div class="pf" [style.width.%]="n.build_pct"></div></div>
                <div class="pl">build {{ n.build_pct }}%</div>
              </button>
            }
          </div>
        } @else { <div class="msg">Leaf node — no further breakdown staged yet.</div> }
      }

      <!-- ══ L5 · Root Dashboard ══ -->
      @else if (view()==='root' && selRootNorm(); as rn) {
        @let r = selRoot();
        @let roll = rootRollup(rn);
        <div class="vh"><span>Root Dashboard</span><span class="h">4 outputs + staged layers</span></div>
        <div class="rd">
          <div class="rdh">
            <span class="rdar">{{ rn }}</span>
            <div class="rdm">
              <div class="rn">{{ rn }} <span class="rk">· {{ r?.piece_kind || 'root' }}</span></div>
              <div class="rdd">build {{ r?.build_pct || 0 }}% · {{ roll?.staged || 0 }} claims staged · {{ roll?.promoted || 0 }} promoted · {{ memletCount(rn) }} memlets · ↑ reports to Vocabulary</div>
            </div>
          </div>

          <div class="sub2">The 4 outputs</div>
          <div class="o4dash">
            <div class="ob"><span class="obl">Build <b>{{ r?.build_pct || 0 }}</b></span><span class="o" style="--oc:var(--build)"><i [style.width.%]="r?.build_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Study <b>{{ r?.study_pct || 0 }}</b></span><span class="o" style="--oc:var(--study)"><i [style.width.%]="r?.study_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Content <b>{{ r?.content_pct || 0 }}</b></span><span class="o" style="--oc:var(--content)"><i [style.width.%]="r?.content_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Retn <b>{{ r?.retention_pct || 0 }}</b></span><span class="o" style="--oc:var(--retn)"><i [style.width.%]="r?.retention_pct || 0"></i></span></div>
          </div>

          <!-- three structurally identical layer families -->
          <div class="fam">
            <div class="sub2">Information layers <span class="famn">{{ infoFilled(rn) }}/{{ subLayers().length }}</span> · tap to read claims · green ring = promoted</div>
            @if (rootCells(rn).length) {
              <div class="heat">
                <div class="hc all" [class.sel]="rootTab()==='layers' && !selLayer()"
                     title="All information layers" (click)="showAllLayers()">
                  <div class="hn">{{ roll?.staged || 0 }}</div><div class="hk">ALL</div>
                </div>
                @for (c of subLayers(); track c.sub_code) {
                  @let cell = cellFor(rn, c.sub_code);
                  <div class="hc" [class.z]="!cell" [class.sel]="selLayer() === c.sub_code"
                       [style.background]="cell ? shade(cell.n) : '#0d0d0d'"
                       [style.boxShadow]="cell && cell.promoted === cell.n && cell.n > 0 ? 'inset 0 0 0 2px var(--content)' : 'none'"
                       [title]="c.name_en + ' · ' + c.sub_code + ' · ' + c.scope_level"
                       (click)="cell ? selectLayer(c.sub_code) : null">
                    <div class="hn">{{ cell?.n || '·' }}</div><div class="hk">{{ c.sub_code }}</div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty">{{ rn }} — {{ r?.build_pct || 0 }}% built from its lexicon sources, but no layers staged yet.</div>
            }
          </div>

          <div class="fam">
            <div class="sub2">Memlet layers <span class="famn">{{ memFilled() }}/{{ rootDetail()?.memlet_kinds?.length || 0 }}</span> · Membean · tap to open the memlet</div>
            <div class="heat">
              <div class="hc all mem" [class.sel]="rootTab()==='memlets' && !selMemletKind()"
                   title="All memlet layers" (click)="showAllMemlets()">
                <div class="hn">{{ memletsN() }}</div><div class="hk">ALL</div>
              </div>
              @for (k of rootDetail()?.memlet_kinds || []; track k.memlet_key) {
                @let n = memletCountFor(k.memlet_key);
                <div class="hc mem" [class.z]="!n" [class.sel]="selMemletKind() === k.memlet_key"
                     [style.background]="n ? shadeM(n) : '#0d0d0d'"
                     [title]="k.name_en + ' · ' + k.modality + ' · ' + k.scope_level"
                     (click)="n ? selectMemletKind(k.memlet_key) : null">
                  <div class="hn">{{ n || '·' }}</div><div class="hk">{{ k.memlet_key }}</div>
                </div>
              }
            </div>
          </div>

          <div class="fam">
            <div class="sub2">Question layers <span class="famn">{{ qFilled() }}/{{ rootDetail()?.question_kinds?.length || 0 }}</span> · tap to open the items</div>
            <div class="heat">
              <div class="hc all qk2" [class.sel]="rootTab()==='questions' && !selQuestionKind()"
                   title="All question layers" (click)="showAllQuestions()">
                <div class="hn">{{ questionsN() }}</div><div class="hk">ALL</div>
              </div>
              @for (k of rootDetail()?.question_kinds || []; track k.question_key) {
                @let n = questionCountFor(k.question_key);
                <div class="hc qk2" [class.z]="!n" [class.sel]="selQuestionKind() === k.question_key"
                     [style.background]="n ? shadeQ(n) : '#0d0d0d'"
                     [title]="k.name_en + ' · ' + k.response_kind + ' · ' + k.cognitive_level"
                     (click)="n ? selectQuestionKind(k.question_key) : null">
                  <div class="hn">{{ n || '·' }}</div><div class="hk">{{ k.question_key }}</div>
                </div>
              }
            </div>
          </div>

          <div class="paneh">{{ paneTitle() }}</div>
          @if (!rootDetail()) { <div class="msg">Loading root detail…</div> }
          @else if (rootTab()==='layers') {
            @for (lyr of visibleLayers(); track lyr.sub_code) {
              <div class="lyr">
                <div class="lyrh"><span class="lyrc">{{ lyr.sub_code }}</span> {{ lyr.name_en }} <span class="lyrn">{{ lyr.claims.length }} claims</span></div>
                @for (c of lyr.claims; track c.id) {
                  <div class="claim">
                    @if (c.quote_ar) { <div class="qar">{{ c.quote_ar }}</div> }
                    @if (c.gloss_en) { <div class="gen">{{ c.gloss_en }}</div> }
                    @if (c.gloss_ur) { <div class="gur">{{ c.gloss_ur }}</div> }
                    <div class="cmeta"><span class="src">{{ c.source_slug }}</span> · {{ c.claim_type }}
                      · <span class="cst" [class.promoted]="c.status==='promoted'">{{ c.status }}</span></div>
                  </div>
                }
              </div>
            } @empty { <div class="empty">No staged claims yet.</div> }
          }
          @else if (rootTab()==='memlets') {
            @if (memletsN()) {
              <!-- Membean word-page layout: learning column | analysis column -->
              <div class="mbwrap">
                <div class="mbcol">
                  @for (p of panelsFor('l'); track p.key) {
                    <div class="mbpanel">
                      <div class="mbhead">{{ p.en }}<span class="mbar">{{ p.ar }}</span><span class="mbn">{{ p.items.length }}</span></div>
                      <div class="mbbody">
                        @for (m of p.items; track m.id) {
                          <div class="mbitem">
                            <div class="mbt">{{ m.title_en }}@if (m.title_ar) { <span class="mbta">{{ m.title_ar }}</span> }</div>
                            @if (m.body_en) { <div class="mbb">{{ m.body_en }}</div> }
                            @if (m.body_ar) { <div class="mbba">{{ m.body_ar }}</div> }
                            @if (m.body_ur) { <div class="mbbu">{{ m.body_ur }}</div> }
                            @let med = mediaFor(m.memlet_key);
                            @if (med.length) {
                              <div class="mmed">
                                @for (x of med; track x.id) {
                                  <span class="medb" [class.ready]="x.status==='ready'" [title]="x.bucket + '/' + x.r2_key">
                                    {{ mediaIcon(x.media_kind) }} {{ x.media_kind }}@if (x.mime) { · {{ x.mime }} } · {{ x.status }}
                                  </span>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
                <div class="mbcol">
                  @for (p of panelsFor('r'); track p.key) {
                    <div class="mbpanel">
                      <div class="mbhead">{{ p.en }}<span class="mbar">{{ p.ar }}</span><span class="mbn">{{ p.items.length }}</span></div>
                      <div class="mbbody">
                        @for (m of p.items; track m.id) {
                          <div class="mbitem">
                            <div class="mbt">{{ m.title_en }}@if (m.title_ar) { <span class="mbta">{{ m.title_ar }}</span> }</div>
                            @if (m.body_en) { <div class="mbb">{{ m.body_en }}</div> }
                            @if (m.body_ar) { <div class="mbba">{{ m.body_ar }}</div> }
                            @if (m.body_ur) { <div class="mbbu">{{ m.body_ur }}</div> }
                            @let med = mediaFor(m.memlet_key);
                            @if (med.length) {
                              <div class="mmed">
                                @for (x of med; track x.id) {
                                  <span class="medb" [class.ready]="x.status==='ready'" [title]="x.bucket + '/' + x.r2_key">
                                    {{ mediaIcon(x.media_kind) }} {{ x.media_kind }}@if (x.mime) { · {{ x.mime }} } · {{ x.status }}
                                  </span>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
              @if (otherMemlets().length) {
                <div class="sub2">Other memlets</div>
                <div class="mbwrap">
                  <div class="mbcol">
                    @for (m of otherMemlets(); track m.id) {
                      <div class="mbpanel"><div class="mbhead">{{ m.memlet_key }}</div>
                        <div class="mbbody"><div class="mbitem">
                          <div class="mbt">{{ m.title_en }}@if (m.title_ar) { <span class="mbta">{{ m.title_ar }}</span> }</div>
                          @if (m.body_en) { <div class="mbb">{{ m.body_en }}</div> }
                        </div></div>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else { <div class="empty">No memlets seeded for {{ rn }} yet — the mining passes stage them per source.</div> }
          }
          @else if (rootTab()==='questions') {
            <div class="qcards">
              @for (q of visibleQuestions(); track q.id) {
                <div class="qcard">
                  <div class="qk">{{ q.question_key }}<span class="qkn">{{ questionKindName(q.question_key) }}</span></div>
                  <div class="qp">{{ q.prompt_en || q.prompt_ar }}</div>
                  @if (q.prompt_ar && q.prompt_en) { <div class="qpa">{{ q.prompt_ar }}</div> }
                  <div class="qopts">
                    @for (o of optionsFor(q.id); track o.id; let i = $index) {
                      <div class="qopt" [class.correct]="o.is_correct">
                        <span class="ql">{{ letter(i) }}</span>
                        <span class="qotext">
                          <span class="qoen">{{ o.option_en || o.option_ar }}</span>
                          @if (o.option_en && o.option_ar) { <span class="qoar">{{ o.option_ar }}</span> }
                          @if (!o.is_correct && o.why_wrong_en) {
                            <span class="qwhy"><b>{{ o.distractor_kind }}</b> — {{ o.why_wrong_en }}</span>
                          }
                        </span>
                        @if (o.is_correct) { <span class="qtick">✓</span> }
                      </div>
                    } @empty { <div class="qnoopt">answer: {{ answerOf(q) }}</div> }
                  </div>
                  @if (q.explanation_en) { <div class="qx">{{ q.explanation_en }}</div> }
                </div>
              } @empty { <div class="empty">No question items built for {{ rn }} yet — the mining pass mints them per source.</div> }
            </div>
          }

          <div class="sub2">Recursion</div>
          <div class="rec">This root senses its own state and reports up: its build feeds the <b>Vocabulary</b> stream → the <b>Passage</b> → <b>{{ surah()?.name_en }}</b> → the whole Qurʾān.</div>
        </div>
      }
    }
  `,
  styles: [`
    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .crumbs { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:16px 0 14px; }
    .crumb { color:var(--gold-b); font-family:var(--serif); border:1px solid var(--bd); border-radius:16px; padding:4px 12px; background:#0f0f0f; cursor:pointer; font-size:12px; }
    .crumb .aa { font-family:var(--ar); margin-left:3px; }
    .crumb:hover { border-color:var(--bd-hi); } .crumb.cur { color:#2a2205; background:linear-gradient(180deg,var(--gold-b),var(--gold)); border-color:var(--gold-b); font-weight:700; }
    .csep { color:var(--gold-d); font-weight:700; }
    .vh { font-family:var(--serif); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:0 0 12px; display:flex; justify-content:space-between; align-items:baseline; }
    .vh .h { font-size:10px; color:var(--t3); font-family:ui-monospace,monospace; letter-spacing:0; text-transform:none; }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:7px; }
    .cell { text-align:left; border:1px solid rgba(255,255,255,.08); border-radius:9px; background:linear-gradient(160deg,#151515,#0d0d0d); padding:7px 8px 8px; cursor:pointer; color:var(--text); }
    .cell:hover { border-color:var(--bd-hi); transform:translateY(-2px); }
    .cell.active { border-color:var(--content); box-shadow:0 0 0 1px var(--content); }
    .cell.rootcell { border-left:3px solid var(--gold-d); text-align:center; }
    .top { display:flex; justify-content:space-between; align-items:center; }
    .num { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); text-transform:uppercase; }
    .rt { width:7px; height:7px; border-radius:50%; } .rt.makki { background:#e8b45c; } .rt.madani { background:#6bbaff; }
    .nar { font-family:var(--ar); font-size:18px; color:var(--gold-b); line-height:1.15; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rootar { text-align:center; font-size:22px; }
    .nen { font-size:9px; color:var(--t2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ay { font-size:7.5px; color:var(--t3); }
    .pbar { height:5px; border-radius:3px; background:#222; overflow:hidden; margin-top:6px; } .pf { height:100%; background:var(--content); }
    .pl { font-size:7.5px; margin-top:2px; font-family:ui-monospace,monospace; color:var(--t3); } .cell.active .pl { color:var(--content); }

    .list { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:9px; }
    .lc { border:1px solid rgba(255,255,255,.09); border-left:3px solid var(--lc,var(--gold-d)); border-radius:11px; background:linear-gradient(90deg,#161616,#0d0d0d); padding:11px 13px; position:relative; }
    .lc.dim { opacity:.6; } .lc:not(.dim) { cursor:pointer; } .lc:not(.dim):hover { border-color:var(--bd-hi); }
    .lct { display:flex; align-items:baseline; gap:8px; } .lct .aa { font-family:var(--ar); font-size:19px; } .lct .en { font-family:var(--serif); font-size:14px; color:var(--text); } .lct .no { margin-left:auto; font-size:9px; color:var(--t3); font-family:ui-monospace,monospace; }
    .lcd { font-size:10.5px; color:var(--t3); margin-top:3px; }
    .steps { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
    .step { font-size:8.5px; font-family:ui-monospace,monospace; border:1px solid rgba(255,255,255,.1); border-radius:7px; padding:2px 6px; color:var(--t3); } .step.on { color:var(--content); border-color:rgba(77,217,168,.4); }
    .pbuild { display:flex; align-items:center; gap:8px; margin-top:8px; } .pbuild .o { flex:1; height:6px; border-radius:4px; background:#242424; overflow:hidden; } .pbuild .o i { display:block; height:100%; background:var(--oc); } .pl2 { font-size:8.5px; color:var(--t3); font-family:ui-monospace,monospace; }
    .lcact { display:flex; gap:12px; align-items:center; margin-top:9px; }
    .hint { font-size:10.5px; color:var(--content); font-family:var(--serif); }
    .lc.clickable { cursor:pointer; } .lc.clickable:hover { border-color:var(--bd-hi); transform:translateY(-1px); }
    .drillbtn { background:none; border:none; color:var(--content); font-size:11px; cursor:pointer; padding:0; font-family:var(--serif); }
    .studylink { color:var(--gold-b); font-size:11px; text-decoration:none; font-family:var(--serif); } .studylink:hover { text-decoration:underline; }
    .go { position:absolute; right:11px; bottom:10px; color:var(--gold-d); font-size:14px; }

    .o4big { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:9px; }
    .ob { } .obl { display:flex; justify-content:space-between; font-size:7.5px; color:var(--t3); text-transform:uppercase; } .obl b { font-family:ui-monospace,monospace; font-size:9px; color:var(--text); }
    .o4big .o, .o4dash .o { height:6px; border-radius:4px; background:#242424; overflow:hidden; margin-top:2px; display:block; } .o4big .o i, .o4dash .o i { display:block; height:100%; background:var(--oc); }

    /* root dashboard */
    .rd { border:1px solid var(--bd-hi); border-radius:13px; background:linear-gradient(180deg,#161512,#0c0c0c); padding:15px 17px; }
    .rdh { display:flex; align-items:center; gap:14px; border-bottom:1px solid var(--bd); padding-bottom:12px; margin-bottom:12px; }
    .rdar { font-family:var(--ar); font-size:38px; color:var(--gold-b); }
    .rn { font-family:var(--serif); font-size:18px; color:var(--text); } .rn .rk { color:var(--t3); font-size:12px; }
    .rdd { font-size:11px; color:var(--t3); margin-top:2px; }
    .sub2 { font-family:var(--serif); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:14px 0 8px; }
    .o4dash { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; max-width:520px; }
    .heat { display:flex; flex-wrap:wrap; gap:4px; }
    .hc { width:50px; border-radius:6px; padding:5px 3px; text-align:center; font-family:ui-monospace,monospace; color:#0c0c0c; cursor:pointer; } .hc.z { background:#0d0d0d !important; color:#3a3a3a; cursor:default; }
    .hc:not(.z):hover { transform:translateY(-1px); } .hc.sel { outline:2px solid var(--gold-b); outline-offset:1px; }
    .hc .hn { font-size:12px; font-weight:700; } .hc .hk { font-size:7px; opacity:.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .empty { font-size:12px; color:var(--t3); font-style:italic; padding:16px; text-align:center; border:1px dashed rgba(255,255,255,.12); border-radius:10px; }
    .rec { font-size:12px; color:var(--t2); line-height:1.5; } .rec b { color:var(--gold-b); }

    /* deep tabs + claims + memlets */
    .rtabs { display:flex; gap:0; border-bottom:1px solid var(--bd); margin:16px 0 12px; overflow-x:auto; }
    .rtabs button { font-family:var(--serif); font-size:11.5px; letter-spacing:.03em; padding:9px 15px; color:var(--t3); cursor:pointer; white-space:nowrap; background:none; border:none; border-bottom:2px solid transparent; }
    .rtabs button.on { color:var(--gold-b); border-bottom-color:var(--gold-b); }
    .clearlayer { background:none; border:1px solid var(--bd); color:var(--gold-b); border-radius:16px; padding:3px 12px; font-size:11px; cursor:pointer; margin-bottom:10px; font-family:var(--serif); }
    .lyr { margin-bottom:14px; }
    .lyrh { font-family:var(--serif); font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--gold-d); margin-bottom:6px; display:flex; align-items:baseline; gap:8px; }
    .lyrh .lyrc { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); } .lyrh .lyrn { margin-left:auto; font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); }
    .claim { border:1px solid rgba(255,255,255,.07); border-left:2px solid var(--gold-d); border-radius:8px; background:#0f0f0f; padding:9px 12px; margin-bottom:6px; }
    .claim .qar { font-family:var(--ar); font-size:17px; color:var(--arab); line-height:1.7; direction:rtl; text-align:right; }
    .claim .gen { font-size:12px; color:var(--t2); margin-top:5px; line-height:1.5; }
    .claim .gur { font-family:var(--ar); font-size:13px; color:var(--t2); margin-top:3px; direction:rtl; text-align:right; }
    .claim .cmeta { font-size:9.5px; color:var(--t3); margin-top:6px; font-family:ui-monospace,monospace; } .claim .src { color:var(--gold-d); }
    .claim .cst.promoted { color:var(--content); }
    /* Membean word-page panel layout */
    .mbwrap { display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start; }
    @media(max-width:860px){ .mbwrap { grid-template-columns:1fr; } }
    .mbcol { display:flex; flex-direction:column; gap:12px; }
    .mbpanel { border:1px solid rgba(255,255,255,.09); border-radius:10px; overflow:hidden; background:#0f0f0f; }
    .mbhead { display:flex; align-items:baseline; gap:8px; background:linear-gradient(180deg,#2a2a2a,#1c1c1c); border-bottom:1px solid rgba(255,255,255,.08);
      padding:8px 12px; font-family:var(--serif); font-size:12px; letter-spacing:.04em; color:var(--gold-b); }
    .mbhead .mbar { font-family:var(--ar); font-size:13px; color:var(--t2); }
    .mbhead .mbn { margin-left:auto; font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); }
    .mbbody { padding:10px 12px; display:flex; flex-direction:column; gap:10px; }
    .mbitem + .mbitem { border-top:1px solid rgba(255,255,255,.06); padding-top:10px; }
    .mbt { font-weight:640; font-size:13px; color:var(--text); } .mbta { font-family:var(--ar); color:var(--gold-b); font-size:14px; margin-right:6px; }
    .mbb { font-size:11.5px; color:var(--t2); line-height:1.6; margin-top:4px; }
    .mbba { font-family:var(--ar); font-size:14px; color:var(--arab); line-height:1.8; margin-top:5px; direction:rtl; text-align:right; }
    .mbbu { font-family:var(--ar); font-size:12.5px; color:var(--t3); line-height:1.8; margin-top:3px; direction:rtl; text-align:right; }
    .fam { margin-bottom:12px; }
    .hc.all { background:#141414 !important; color:var(--gold-b); border:1px dashed var(--bd); }
    .hc.all.mem { color:var(--study); } .hc.all.qk2 { color:var(--content); }
    .hc.all.sel { border-style:solid; outline:2px solid currentColor; outline-offset:1px; }
    .paneh { font-family:var(--serif); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-b);
      margin:16px 0 10px; padding-bottom:7px; border-bottom:1px solid var(--bd); }
    .famn { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); margin-left:6px; letter-spacing:0; text-transform:none; }
    .hc.mem .hk, .hc.qk2 .hk { font-size:6.5px; }
    .mmed { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
    .medb { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); border:1px solid rgba(255,255,255,.14); border-radius:7px; padding:2px 7px; }
    .medb.ready { color:var(--content); border-color:rgba(77,217,168,.4); }
    .qkn { font-family:var(--serif); font-size:10px; color:var(--t3); margin-left:8px; text-transform:none; letter-spacing:0; }
    .qpa { font-family:var(--ar); font-size:15px; color:var(--arab); margin-top:4px; direction:rtl; text-align:right; }
    .qopts { display:flex; flex-direction:column; gap:5px; margin-top:9px; }
    .qopt { display:flex; align-items:flex-start; gap:8px; border:1px solid rgba(255,255,255,.09); border-radius:8px; background:#141414; padding:7px 10px; }
    .qopt.correct { border-color:rgba(77,217,168,.5); background:rgba(77,217,168,.07); }
    .ql { font-family:var(--serif); font-size:11px; color:var(--t3); width:14px; flex:0 0 auto; }
    .qotext { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .qoen { font-size:12.5px; color:var(--text); }
    .qoar { font-family:var(--ar); font-size:14px; color:var(--arab); direction:rtl; text-align:right; }
    .qwhy { font-size:10px; color:var(--t3); line-height:1.45; } .qwhy b { color:var(--err); font-family:ui-monospace,monospace; font-size:9px; }
    .qtick { color:var(--content); font-weight:800; flex:0 0 auto; }
    .qnoopt { font-family:ui-monospace,monospace; font-size:11px; color:var(--content); margin-top:6px; }
    .qcards { display:flex; flex-direction:column; gap:8px; }
    .qcard { border:1px solid rgba(77,217,168,.28); border-left:3px solid var(--content); border-radius:9px; background:rgba(77,217,168,.04); padding:10px 12px; }
    .qcard .qk { font-family:ui-monospace,monospace; font-size:9px; color:var(--content); text-transform:uppercase; }
    .qcard .qp { font-size:12.5px; color:var(--text); margin-top:3px; } .qcard .qx { font-size:11px; color:var(--t3); margin-top:4px; }
  `],
})
export class CybMapComponent {
  private readonly svc = inject(CybService);
  private readonly router = inject(Router);

  readonly surahs = signal<Surah[]>([]);
  readonly error = signal<string | null>(null);
  private readonly treeRoots = signal<CybNode[]>([]);
  private readonly matrix = signal<StagingMatrix | null>(null);

  // ── URL is the source of truth for where you are in the drill ──
  private readonly route = inject(ActivatedRoute);
  private readonly pm = signal<ParamMap | null>(null);

  readonly surahId    = computed(() => { const v = this.pm()?.get('surahId'); return v ? Number(v) : null; });
  readonly passageNo  = computed(() => { const v = this.pm()?.get('passageNo'); return v ? Number(v) : null; });
  readonly streamParam = computed(() => this.pm()?.get('stream') ?? null);
  readonly rootParam   = computed(() => this.pm()?.get('root') ?? null);

  readonly view = computed<'surahs' | 'passages' | 'streams' | 'pieces' | 'root'>(() => {
    if (this.rootParam()) return 'root';
    if (this.streamParam()) return 'pieces';
    if (this.passageNo()) return 'streams';
    if (this.surahId()) return 'passages';
    return 'surahs';
  });

  readonly surah  = computed(() => this.surahs().find((s) => s.id === this.surahId()) ?? null);
  readonly units = signal<StudyUnit[]>([]);
  readonly loadingPassages = signal(false);
  readonly selUnit = computed(() => this.units().find((u) => u.passage_no === this.passageNo()) ?? null);
  readonly passageNodeCur = computed(() => { const u = this.selUnit(); return u ? this.passageNode(u) : undefined; });
  readonly stageNodeCur = computed(() => {
    const p = this.passageNodeCur(); const st = this.streamParam();
    return p && st ? p.children.find((c) => c.layer === st) : undefined;
  });
  readonly selRootNorm = computed(() => this.rootParam());
  readonly selRoot = computed(() => { const rn = this.rootParam(); return rn ? (this.cybNodeForRoot(rn) ?? null) : null; });
  readonly rootDetail = signal<RootDetail | null>(null);
  readonly rootTab = signal<'layers' | 'memlets' | 'questions'>('layers');
  readonly selLayer = signal<string | null>(null);
  readonly selMemletKind = signal<string | null>(null);
  readonly verseRoots = signal<PassageRoot[]>([]);
  readonly selQuestionKind = signal<string | null>(null);

  private readonly flat = computed<CybNode[]>(() => {
    const out: CybNode[] = [];
    const walk = (n: CybNode) => { out.push(n); n.children.forEach(walk); };
    this.treeRoots().forEach(walk);
    return out;
  });

  readonly activeCount = computed(() =>
    this.flat().filter((n) => n.scale === 'surah' && n.build_pct > 0).length);

  readonly current = computed<CybNode[]>(() => {
    if (this.streamParam()) return this.stageNodeCur()?.children ?? [];
    return this.passageNodeCur()?.children ?? [];
  });

  readonly drillTitle = computed(() => {
    const p = this.passageNodeCur();
    return p ? this.crumbLabel(p) : '';
  });

  readonly subLayers = computed<SubLayer[]>(() => this.matrix()?.sub_layers ?? []);

  constructor() {
    // Every URL change re-derives the view and pulls only what that level needs.
    this.route.paramMap.subscribe((pm) => {
      const prevSurah = this.surahId(); const prevRoot = this.rootParam();
      this.pm.set(pm);
      const sid = this.surahId();
      if (sid && sid !== prevSurah) this.loadStudyGrid(sid);
      if (!sid) this.units.set([]);
      if (this.streamParam() === 'vocabulary' && this.passageNo()) this.loadVerseRoots();
      const rn = this.rootParam();
      if (rn && rn !== prevRoot) {
        this.rootTab.set('layers'); this.selLayer.set(null);
        this.selMemletKind.set(null); this.selQuestionKind.set(null);
        this.rootDetail.set(null);
        this.svc.rootDetail(rn).subscribe({ next: (d) => this.rootDetail.set(d), error: () => {} });
      }
    });

    forkJoin({ surahs: this.svc.surahs(), tree: this.svc.tree(), matrix: this.svc.stagingMatrix() }).subscribe({
      next: ({ surahs, tree, matrix }) => {
        this.surahs.set(surahs.sort((a, b) => a.id - b.id));
        this.treeRoots.set(tree.roots);
        this.matrix.set(matrix);
        const sid = this.surahId();
        if (sid && !this.units().length) this.loadStudyGrid(sid);
        if (this.streamParam() === 'vocabulary' && this.passageNo()) this.loadVerseRoots();
      },
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  // ── cyb overlays ──
  surahNode(id: number): CybNode | undefined {
    return this.flat().find((n) => n.scale === 'surah' && Number(n.target_ref) === id);
  }
  passageNode(u: StudyUnit): CybNode | undefined {
    const s = this.surah()?.id;
    const key = `${s}:${u.ayah_from}-${u.ayah_to}`;
    return this.flat().find((n) => n.scale === 'passage' && (n.target_ref ?? '').replace(/^QR:SP:/, '') === key);
  }

  // ── staging overlays for the root dashboard ──
  rootCells(rn: string): StageCell[] { return (this.matrix()?.cells ?? []).filter((c) => c.root_norm === rn); }
  cellFor(rn: string, sub: string): StageCell | undefined { return this.rootCells(rn).find((c) => c.sub_code === sub); }
  rootRollup(rn: string) { return (this.matrix()?.roots ?? []).find((r) => r.root_norm === rn); }
  memletCount(rn: string): number { return this.cellFor(rn, '72-MEM')?.n ?? 0; }

  // ── navigation ──
  private loadStudyGrid(surahId: number) {
    this.units.set([]); this.loadingPassages.set(true);
    this.svc.studyGrid(surahId).subscribe({
      next: (g) => { this.units.set(g.units ?? []); this.loadingPassages.set(false); },
      error: () => { this.units.set([]); this.loadingPassages.set(false); },
    });
  }
  openSurah(s: Surah) { this.router.navigate(['/cybernetics/map', s.id]); }
  /** Clicking a passage card: built → its streams; else open it in Study. */
  onPassageCard(u: StudyUnit, pnode: CybNode | undefined) {
    if (pnode && pnode.children.length) this.router.navigate(['/cybernetics/map', this.surahId(), u.passage_no]);
    else this.router.navigate(['/quran/surahs', this.surahId(), 'study', u.passage_no]);
  }
  drill(n: CybNode) {
    if (!n.children.length && n.layer !== 'vocabulary') return;
    this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(), n.layer]);
  }
  /** The passage's UNIQUE roots, straight from its āyāt (no duplicates). */
  private loadVerseRoots() {
    const sid = this.surahId(); const pno = this.passageNo();
    if (!sid || !pno) { this.verseRoots.set([]); return; }
    this.verseRoots.set([]);
    this.svc.passageRoots(sid, pno).subscribe({
      next: (r) => this.verseRoots.set(r), error: () => this.verseRoots.set([]),
    });
  }
  /** The cyb node carrying this root's outputs — prefer the real root piece. */
  cybNodeForRoot(rn: string): CybNode | undefined {
    const pieces = this.flat().filter((n) => n.scale === 'piece' && this.rootNorm(n) === rn);
    return pieces.find((n) => n.piece_kind === 'root') ?? pieces[0];
  }
  /** Open the Root Dashboard for a root norm (works with or without a cyb node). */
  openRootNorm(rn: string) {
    this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(),
                          this.streamParam() ?? 'vocabulary', rn]);
  }
  openRoot(n: CybNode) { this.openRootNorm(this.rootNorm(n)); }
  // breadcrumb targets
  goSurahs()  { this.router.navigate(['/cybernetics/map']); }
  goSurah()   { this.router.navigate(['/cybernetics/map', this.surahId()]); }
  goPassage() { this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo()]); }
  goStream()  { this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(), this.streamParam()]); }
  selectLayer(sub: string) { this.selLayer.set(sub); this.rootTab.set('layers'); }
  showAllLayers() { this.selLayer.set(null); this.rootTab.set('layers'); }
  showAllMemlets() { this.selMemletKind.set(null); this.rootTab.set('memlets'); }
  showAllQuestions() { this.selQuestionKind.set(null); this.rootTab.set('questions'); }
  /** What the content pane below the strips is currently showing. */
  paneTitle(): string {
    const t = this.rootTab();
    if (t === 'layers') return this.selLayer() ? `Claims · ${this.selLayer()}` : 'All claims · every information layer';
    if (t === 'memlets') return this.selMemletKind() ? `Memlet · ${this.selMemletKind()}` : 'All memlets · the Membean page';
    return this.selQuestionKind() ? `Questions · ${this.selQuestionKind()}` : 'All questions · the bank';
  }
  selectMemletKind(k: string) { this.selMemletKind.set(k); this.rootTab.set('memlets'); }
  selectQuestionKind(k: string) { this.selQuestionKind.set(k); this.rootTab.set('questions'); }

  // ── family coverage (filled / total), rendered identically for all three ──
  infoFilled(rn: string): number { return this.rootCells(rn).filter((c) => c.n > 0).length; }
  memFilled(): number {
    const d = this.rootDetail();
    return d ? new Set(d.memlets.map((m) => m.memlet_key)).size : 0;
  }
  qFilled(): number {
    const d = this.rootDetail();
    return d ? new Set(d.questions.map((q) => q.question_key)).size : 0;
  }
  memletCountFor(key: string): number {
    return (this.rootDetail()?.memlets ?? []).filter((m) => m.memlet_key === key).length;
  }
  questionCountFor(key: string): number {
    return (this.rootDetail()?.questions ?? []).filter((q) => q.question_key === key).length;
  }
  shadeM(v: number): string { return v <= 0 ? '#0d0d0d' : v <= 2 ? '#2f5f86' : v <= 5 ? '#3f83b8' : '#6bbaff'; }
  shadeQ(v: number): string { return v <= 0 ? '#0d0d0d' : v <= 2 ? '#2d6b55' : v <= 5 ? '#3f9c78' : '#4dd9a8'; }

  // ── question bank ──
  visibleQuestions(): RootQuestion[] {
    const d = this.rootDetail();
    if (!d) return [];
    const sel = this.selQuestionKind();
    return sel ? d.questions.filter((q) => q.question_key === sel) : d.questions;
  }
  optionsFor(itemId: string): RootOption[] {
    return (this.rootDetail()?.options ?? []).filter((o) => o.item_id === itemId);
  }
  letter(i: number): string { return 'abcdefgh'[i] ?? String(i + 1); }
  answerOf(q: RootQuestion): string {
    if (!q.answer_json) return '—';
    try { return JSON.parse(q.answer_json).correct ?? q.answer_json; } catch { return q.answer_json; }
  }
  questionKindName(key: string): string {
    return (this.rootDetail()?.question_kinds ?? []).find((k) => k.question_key === key)?.name_en ?? '';
  }

  // ── media catalogued for a memlet kind ──
  mediaFor(key: string): RootMedia[] {
    return (this.rootDetail()?.media ?? []).filter((m) => m.memlet_key === key);
  }
  mediaIcon(kind: string): string {
    return kind === 'image' ? '🖼' : kind === 'video' ? '🎬' : kind === 'audio' ? '🔊' : '📎';
  }

  // Layers with claims (filtered to the selected layer, if any), ordered by registry.
  visibleLayers(): { sub_code: string; name_en: string; claims: RootClaim[] }[] {
    const d = this.rootDetail();
    if (!d) return [];
    const sel = this.selLayer();
    return d.sub_layers
      .map((sl) => ({ sub_code: sl.sub_code, name_en: sl.name_en, claims: d.claims.filter((c) => c.sub_code === sl.sub_code) }))
      .filter((x) => x.claims.length && (!sel || x.sub_code === sel));
  }
  /** Membean panels for one column, each carrying its matching memlets. */
  panelsFor(col: 'l' | 'r'): { key: string; en: string; ar: string; items: RootMemlet[] }[] {
    const d = this.rootDetail();
    if (!d) return [];
    const sel = this.selMemletKind();
    return MEMBEAN_PANELS.filter((p) => p.col === col && (!sel || p.key === sel))
      .map((p) => ({ key: p.key, en: p.en, ar: p.ar, items: d.memlets.filter((m) => m.memlet_key === p.key) }))
      .filter((x) => x.items.length);
  }
  /** Memlet kinds that have no Membean panel yet. */
  otherMemlets(): RootMemlet[] {
    const d = this.rootDetail();
    if (!d) return [];
    const known = new Set(MEMBEAN_PANELS.map((p) => p.key));
    return d.memlets.filter((m) => !known.has(m.memlet_key));
  }
  memletsN(): number { return this.rootDetail()?.memlets.length ?? 0; }
  questionsN(): number { return this.rootDetail()?.questions.length ?? 0; }

  // ── labels ──
  streamLabelKey(key: string) { return STREAM_LABELS[key] ?? { ar: '', en: key, hint: '' }; }
  streamLabel(n: CybNode) { return STREAM_LABELS[n.layer ?? ''] ?? { ar: '', en: n.layer ?? n.scale, hint: '' }; }
  streamColor(layer: string | null): string {
    switch (layer) {
      case 'vocabulary': return 'var(--build)';
      case 'reading': return '#e8b45c';
      case 'ss': return 'var(--study)';
      case 'structure': return 'var(--retn)';
      case 'tafsir': return 'var(--content)';
      case 'worldview': return 'var(--retn)';
      default: return 'var(--gold-d)';
    }
  }
  crumbLabel(n: CybNode): string {
    if (n.scale === 'passage') return (n.target_ref ?? '').replace(/^QR:SP:/, '');
    if (n.scale === 'stage') return this.streamLabel(n).en;
    if (n.piece_kind === 'root') return this.rootNorm(n);
    return n.layer ?? n.target_ref ?? n.id;
  }
  rootNorm(n: CybNode): string { return (n.target_ref ?? '').split(':').pop() ?? n.id; }
  short(sub: string): string { return sub.split('-').pop() ?? sub; }
  shade(v: number): string {
    if (v <= 0) return '#0d0d0d';
    if (v <= 2) return '#6e5a1f';
    if (v <= 4) return '#a5842f';
    if (v <= 6) return '#c79f3a';
    if (v <= 9) return '#dcb44a';
    return '#e8c96a';
  }
}
