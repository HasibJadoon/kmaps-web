import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CybService } from '../data/cyb.service';
import { CybTopbarComponent } from '../shared/cyb-topbar.component';
import type {
  CybNode, CybNodeTree, CybAxis, Surah, StudyUnit, CybLayerRow, NodeCarrierRows,
  LayerModel, LayerModelBand, LayerModelSub, RootFillCell, RootCarrierRows,
  RootDetail, RootMemlet, RootQuestion, RootOption, RootMedia, PassageRoot,
  RootGloss, RootSenseBundle,
} from '../data/cyb.models';
import { CYB_AXES } from '../data/cyb.models';
import { BackendApiService } from '../../../shared/services/backend-api.service';
import { CybDsReaderComponent } from '../ds/cyb-ds-reader.component';
import { normaliseSpec } from '@kmaps/contracts/ds';
import type { DisplaySpec } from '@kmaps/contracts/ds';

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

interface StreamRow {
  layer: string;
  node: CybNodeTree | undefined;
  reg: CybLayerRow | undefined;
}

@Component({
  selector: 'km-cyb-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CybTopbarComponent, CybDsReaderComponent],
  template: `
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @else {
      <km-cyb-topbar view="map" [surahs]="surahs()" [nodes]="flatNodes()"
                     [surahId]="surahId()" [passageNo]="passageNo()"
                     [stream]="streamParam()" [root]="rootParam()" />
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
          <div class="vh"><span>Entire Qurʾān · {{ surahs().length }} surahs</span>
            <span class="h">
              @if (quranBuild().measured) { <b class="qp">build {{ quranPct() }}%</b> }
              @else { <b class="qp unm">build not measured</b> }
              · {{ activeCount() }} active · tap to open</span></div>
          <div class="grid">
            @for (s of surahs(); track s.id) {
              @let node = surahNode(s.id);
              <button class="cell glass" [class.active]="node && node.build_pct > 0" (click)="openSurah(s)">
                <div class="top"><span class="num">{{ s.id }}</span>
                  <span class="rt" [class.makki]="s.revelation_type==='makki'" [class.madani]="s.revelation_type==='madani'"></span></div>
                <div class="nar">{{ s.name_ar }}</div>
                <div class="nen">{{ s.name_transliteration || s.name_en }}</div>
                <div class="ay">{{ s.ayah_count }} āyāt</div>
                <!-- All four outputs, not build alone: a surah reads on the
                     same four axes as every other scale, and an axis no sensor
                     has read shows a dashed track rather than an empty one. -->
                <div class="o4m">
                  @for (a of axes; track a) {
                    <div class="m" [class.unm]="!measured(node, a)">
                      <span>{{ axisInitial(a) }}
                        @if (measured(node, a)) { <b>{{ axisPct(node, a) }}</b> }</span>
                      <div class="b"><i [style.width.%]="bar(axisPct(node, a))" [style.background]="axisColor(a)"></i></div>
                    </div>
                  }
                </div>
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
          <div class="pgrid">
            @for (u of units(); track u.passage_id) {
              @let pnode = passageNode(u);
              <div class="glass pc" [class.act]="pnode && pnode.build_pct > 0" (click)="onPassageCard(u, pnode)">
                <div class="pt">{{ u.passage_no }}. {{ u.label }}</div>
                <div class="pref">{{ surah()?.id }}:{{ u.ayah_from }}–{{ u.ayah_to }}</div>
                @if (u.theme) { <div class="pslug">{{ u.theme }}</div> }
                <!-- The six registered steps, named as the server names them.
                     "idioms" was a seventh that no longer exists: the server
                     folds expressions into vocabulary and reports tafsīr and
                     worldview instead. -->
                <div class="steps">
                  <span class="step" [class.on]="u.reading.has"><span class="o"></span>reading</span>
                  <span class="step" [class.on]="u.vocabulary.total > 0"><span class="o"></span>vocab {{ u.vocabulary.total || '' }}</span>
                  <span class="step" [class.on]="u.sentence_structure.has"><span class="o"></span>iʿrāb</span>
                  <span class="step" [class.on]="u.passage_structure.has"><span class="o"></span>naẓm</span>
                  <span class="step" [class.on]="u.tafsir.has"><span class="o"></span>tafsīr</span>
                  <span class="step" [class.on]="u.worldview.has"><span class="o"></span>worldview</span>
                  <span class="step" [class.on]="u.surah_structure.has"><span class="o"></span>surah naẓm</span>
                </div>
                @if (pnode && pnode.build_pct > 0) {
                  <div class="pbuild"><span class="o" style="--oc:var(--build)"><i [style.width.%]="bar(pnode.build_pct)"></i></span>
                    <span class="pl2">build {{ pnode.build_pct }}%</span></div>
                }
                <div class="plink">
                  <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study', u.passage_no]" (click)="$event.stopPropagation()">Open in Study ›</a>
                  <span class="go">{{ pnode && pnode.children.length ? '› streams' : '›' }}</span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="msg">{{ surah()?.name_en }} — no study passages defined yet.
            <a class="studylink" [routerLink]="['/quran/surahs', surah()?.id, 'study']">Open the surah in Study ›</a></div>
        }
      }

      <!-- ══ L3 · the stream-systems, from the layer registry ══ -->
      @else if (view()==='streams') {
        @let rows = streamRows();
        @if (rows.length) {
          <div class="vh"><span>{{ drillTitle() }} · {{ rows.length }} stream-systems</span>
            <span class="h">from cyb_layer · tap Vocabulary to reach the roots</span></div>
          <div class="pgrid">
            @for (r of rows; track r.layer) {
              @let lab = streamLabelKey(r.layer);
              <div class="glass lc sc" [style.--lc]="streamColor(r.layer)"
                   [class.act]="openable(r)" [class.dim]="!openable(r)"
                   (click)="openable(r) ? drillLayer(r.layer) : null">
                <div class="lct">
                  @if (lab.ar) { <span class="aa" [style.color]="streamColor(r.layer)">{{ lab.ar }}</span> }
                  <span class="en">{{ lab.en }}</span><span class="no">{{ lab.hint }}</span>
                  @if (!r.reg) { <span class="drift" title="the plane staged this layer; the registry has not declared it">drift</span> }
                </div>
                <div class="o4big">
                  @for (a of axes; track a) {
                    <div class="ob">
                      <span class="obl">{{ axisLabel(a) }}
                        <b [class.unm]="!measured(r.node, a)">{{ measured(r.node, a) ? axisPct(r.node, a) : '—' }}</b></span>
                      <span class="o" [style.--oc]="axisColor(a)" [class.unm]="!measured(r.node, a)">
                        <i [style.width.%]="bar(axisPct(r.node, a))"></i></span>
                    </div>
                  }
                </div>
                @if (openable(r)) { <span class="go">›</span> }
              </div>
            }
          </div>
        } @else { <div class="msg">Loading the passage's streams…</div> }
      }

      <!-- ══ L4 · the stream's pieces ══ -->
      <!-- For Vocabulary the pieces are the passage's own unique roots, straight
           from the āyāt, so every root appears whether or not the plane has
           minted a node for it. Every other stream shows what its CARRIERS hold
           — the āyāt, the sentences, the renderings, the tafsīr. It used to show
           cyb_node children, which is how the plane tracks work, not what the
           work is: a screen called Sentence Structure should show sentences. -->
      @else if (view()==='pieces') {
        @if (streamParam() === 'vocabulary') {
          <div class="vh"><span>Root / Vocabulary · {{ verseRoots().length }} unique roots</span><span class="h">in āyah order · tap a root for its dashboard</span></div>
          @if (verseRoots().length) {
            <!-- A root gets the room to be read, not a chip: the glyph carries
                 the tile, its core meaning sits under it, and hovering one
                 pushes the rest back so a single root can be looked at. -->
            <div class="rgrid" [class.hovering]="hoverRoot() !== null">
              @for (vr of verseRoots(); track vr.root) {
                @let rnode = cybNodeForRoot(vr.root);
                @let card = glossFor(vr.root);
                <button class="rtile" [class.near]="hoverRoot() === vr.root"
                        (mouseenter)="hoverRoot.set(vr.root)" (mouseleave)="hoverRoot.set(null)"
                        (click)="openRootNorm(vr.root)">
                  <span class="rref">{{ surahId() }}:{{ vr.first_ayah }}</span>
                  <span class="rpct" [class.hi]="(rnode?.build_pct || 0) >= 40"
                        [class.mid]="(rnode?.build_pct || 0) >= 25 && (rnode?.build_pct || 0) < 40"
                        [class.unm]="!measured(rnode,'build')">{{ pctLabel(rnode) }}</span>
                  <span class="rglyph">{{ vr.root }}</span>
                  @if (card?.meaning_core_en) {
                    <span class="rgloss">{{ card!.meaning_core_en }}</span>
                  } @else if (glossesLoaded()) {
                    <span class="rgloss none">no core meaning stored for this root</span>
                  }
                  <span class="rocc">{{ vr.occurrences }}× here
                    @if (card?.frequency_quran) { · {{ card!.frequency_quran }} in muṣḥaf }
                    · {{ vr.lemmas }} lemma{{ vr.lemmas === 1 ? '' : 's' }}</span>
                </button>
              }
            </div>
          } @else { <div class="msg">Loading the passage's roots…</div> }
        }
        <!-- every other stream: what the carriers actually hold -->
        @else {
          @let bands = carrierBands();
          @if (bands === null) { <div class="msg">Reading the carriers…</div> }
          @else if (!bands.length) {
            <div class="vh"><span>{{ streamLabelKey(streamParam()!).en }}</span><span class="h">no carrier holds this passage</span></div>
            <div class="empty">The registry binds no {{ streamLabelKey(streamParam()!).en }} table that speaks
              about {{ surahId() }}:{{ passageNo() }} — nothing here can be built until one is bound.</div>
          }
          @else {
            <div class="vh"><span>{{ streamLabelKey(streamParam()!).en }} · {{ carrierRowCount() }} rows</span>
              <span class="h">{{ bands.length }} carrier{{ bands.length === 1 ? '' : 's' }} · live off the tables</span></div>
            @for (b of bands; track b.band_code + b.table_name) {
              <div class="cb">
                <div class="cbh">
                  <span class="cbb">{{ b.band_code }}</span>
                  <span class="cbt">{{ b.table_name }}</span>
                  <span class="cbd">{{ b.db_name }} · bound on {{ b.bind_col }}</span>
                  <span class="cbn">
                    {{ b.rows.length }} of {{ b.total }}
                    @if (b.total > b.rows.length) { <em title="the reader's limit cut this carrier short">truncated</em> }
                  </span>
                </div>
                <div class="cbw">
                  <table class="cbtbl">
                    <thead><tr>@for (c of columnsOf(b); track c) { <th>{{ c }}</th> }</tr></thead>
                    <tbody>
                      @for (row of b.rows; track $index) {
                        <tr>@for (c of columnsOf(b); track c) {
                          <td [class.ar]="isArabic(row[c])" [title]="fullText(row[c])">
                            <span class="cv">{{ cellText(row[c]) }}</span></td>
                        }</tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }
        }
      }

      <!-- ══ L5 · Root Dashboard ══ -->
      @else if (view()==='root' && selRootNorm(); as rn) {
        @let r = selRoot();
        <!-- The root now opens as a READER by default: the composed spec from
             km_core, chaptered the way somebody asking about a word reads it
             (what it is, what it means, who says so). The three-pane builder
             dashboard this used to open as is still one click away — it answers
             a different question (which carrier is bound, how built is it), and
             that question did not stop mattering. -->
        <div class="vh">
          @if (rootView() === 'reader') {
            <span>Root Reader</span>
            <span class="h">the composed spec — chapters, sections, and what each carrier holds</span>
          } @else {
            <span>Root Dashboard</span>
            <span class="h">4 outputs · the registry bands · memlets · questions</span>
          }
          <span class="vhsp"></span>
          <div class="rvt">
            <button [class.on]="rootView()==='reader'" (click)="setRootView('reader')">reader</button>
            <button [class.on]="rootView()==='audit'" (click)="setRootView('audit')">audit</button>
          </div>
        </div>

        @if (rootView() === 'reader') {
          @if (dsError(); as e) {
            <p class="dsmsg err">{{ e }}</p>
          } @else if (dsSpec(); as sp) {
            <km-ds-reader [spec]="sp" />
          } @else {
            <p class="dsmsg">Reading {{ rn }}…</p>
          }
        }

        @if (rootView() === 'audit') {
        <div class="rd">
          <div class="rdh">
            <span class="rdar">{{ rn }}</span>
            <div class="rdm">
              <div class="rn">{{ rn }}
                <span class="rk">· {{ r?.piece_kind || 'root' }} · {{ surah()?.name_en }} {{ drillTitle() }} · Vocabulary</span></div>
              <div class="rdd">
                DB_AL · km_arabic_linguistic ·
                {{ measured(r,'build') ? 'build ' + (r?.build_pct || 0) + '%' : 'build not measured' }}
                · <b>{{ filledSubs() }}</b>/{{ scopeSubs().length }} {{ scope() }} sub-layers hold rows
                @if (rootCard(); as c) {
                  @if (c.frequency_quran) { · {{ c.frequency_quran }} words in the muṣḥaf }
                }
                · {{ memletCount() }} memlets · {{ questionsN() }} questions
                · ↑ reports to Vocabulary</div>
            </div>
            <!-- Filled · empty · unknown are three different states, and the
                 third is the one a build plan needs: nobody bound a carrier. -->
            <span class="pill grn">{{ filledSubs() }} carriers filled</span>
            <span class="pill">{{ emptySubs() }} empty</span>
            <span class="pill unk">{{ unknownSubs() }} unknown</span>
          </div>

          <div class="sub2">The 4 outputs</div>
          <div class="o4dash">
            <div class="ob"><span class="obl">Build <b>{{ r?.build_pct || 0 }}</b></span><span class="o" style="--oc:var(--build)"><i [style.width.%]="r?.build_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Study <b>{{ r?.study_pct || 0 }}</b></span><span class="o" style="--oc:var(--study)"><i [style.width.%]="r?.study_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Content <b>{{ r?.content_pct || 0 }}</b></span><span class="o" style="--oc:var(--content)"><i [style.width.%]="r?.content_pct || 0"></i></span></div>
            <div class="ob"><span class="obl">Retn <b>{{ r?.retention_pct || 0 }}</b></span><span class="o" style="--oc:var(--retn)"><i [style.width.%]="r?.retention_pct || 0"></i></span></div>
          </div>

          <!-- ── the registry's bands, filled live off the carriers ──
               This used to be a strip of staged-claim counts from
               /al/staging/matrix. That contract was dropped with
               ar_ling_stg_claim on 2026-08-21, so the strip had been rendering
               an empty array. A row is in its carrier or it does not exist, so
               each cell below is a live count off the carrier itself. -->
          <!-- ══ The layer data browser ══
               Registry on the left, what the carrier holds in the middle, the
               registry's own metadata for the selected sub-layer on the right.
               A row is read twice in the centre: once as the content it is
               (gloss, translation, provenance), once as the columns it is
               stored in — the second is what tells you a field is NULL. -->
          <div class="panes">
            <div class="rail">
              <div class="seg">
                @for (sc of layerModel()?.scopes || []; track sc.key) {
                  <button class="segi" [class.on]="scope()===sc.key" (click)="setScope(sc.key)"
                          [title]="sc.layers + ' bands · ' + sc.subs + ' sub-layers'">
                    <span class="aa">{{ sc.name_ar }}</span>{{ sc.name_en }}</button>
                }
              </div>
              <div class="rlabel">BANDS · SUB-LAYERS · ROWS</div>
              @if (!layerModel()) { <div class="msg">Loading the carrier registry…</div> }
              @else if (fillPending()) { <div class="msg">Counting this root's carriers…</div> }
              @else {
                @for (b of scopeBands(); track b.band) {
                  <div class="bandg">
                    <div class="bandt">
                      <span class="bc">{{ b.band }}</span>
                      <span class="bn">{{ b.key }}</span>
                      @if (b.name_ar) { <span class="baa">{{ b.name_ar }}</span> }
                    </div>
                    @for (sl of b.subs; track sl.sub_code) {
                      @let f = fillFor(sl.sub_code);
                      <button class="leaf" [attr.data-state]="fillState(sl.sub_code)"
                              [class.on]="selLayer()===sl.sub_code"
                              [title]="sl.name_en + ' · ' + sl.scope_level + ' · ' + carrierLabel(sl)"
                              (click)="selectLayer(sl.sub_code)">
                        <span class="lc">{{ sl.sub_code }}</span>
                        <span class="ln">{{ sl.name_en }}</span>
                        <span class="lq">{{ f === null ? '?' : f.rows }}</span>
                      </button>
                    }
                  </div>
                }
                <p class="note">A number is the rows that carrier holds <b>for {{ rn }}</b>, read
                  now. <b class="unk">?</b> means no audited carrier binding — unknown, which is
                  not the same as zero.</p>
              }
            </div>

            <div class="main">
              @if (!selLayer()) {
                <div class="empty">Pick a sub-layer on the left to read what its carrier holds for {{ rn }}.</div>
              } @else if (subRows() === null) {
                <div class="msg">Reading {{ selLayer() }}…</div>
              } @else if (!subRows()!.length) {
                <!-- Two different findings share this branch, and only one of
                     them is a zero: a bound carrier that holds no rows, and a
                     sub-layer nobody has bound a carrier to. Saying "0 rows"
                     for the second would report a measurement that was never
                     taken. -->
                @let unknown = fillState(selLayer()!) === 'unknown';
                <div class="mh"><span class="code">{{ selLayer() }}</span>
                  <span class="tbl">{{ selSub()?.tables?.length ? selSub()!.tables.join(' · ') : 'no carrier bound' }}</span>
                  <span class="cnt" [class.unk]="unknown">{{ unknown ? 'unknown' : '0 rows' }}</span></div>
                @if (unknown) {
                  <div class="empty">{{ selLayer() }} — <b class="unk">unknown</b>, not zero. No audited
                    carrier binds this sub-layer, so nothing has been read for {{ rn }}. Bind one in
                    <span class="mono">ar_ling_reg_table_map</span> and the count becomes a reading.</div>
                } @else {
                  <div class="empty">{{ selLayer() }} — the carrier was read and holds nothing for {{ rn }}.</div>
                }
              } @else {
                @for (c of subRows()!; track c.carrier_table) {
                  <div class="mh">
                    <span class="code">{{ c.sub_code }}</span>
                    <span class="tbl">{{ c.carrier_table }}</span>
                    <span class="meta">bound on <b>{{ c.bind_col }}</b> = {{ rn }}</span>
                    <span class="cnt">{{ c.rows.length }} of {{ c.total }} rows</span>
                  </div>
                  <!-- as content -->
                  @for (row of c.rows; track $index) {
                    @let rd = readRow(row);
                    <div class="row">
                      <div class="rowh">
                        <span class="rown">#{{ $index + 1 }}</span>
                        @for (bg of rd.badges; track bg.k) {
                          <span class="badge" [class.core]="bg.core" [class.ok]="bg.ok">{{ bg.k }} {{ bg.v }}</span>
                        }
                      </div>
                      <div class="rowb">
                        @if (rd.ar) { <div class="gar">{{ rd.ar }}</div> }
                        @if (rd.en) { <div class="gen">{{ rd.en }}</div> }
                        @if (rd.ur) { <div class="gur">{{ rd.ur }}</div> }
                        @if (!rd.ar && !rd.en && !rd.ur) {
                          <div class="gen dim">This carrier holds no glossed text — read it as columns below.</div>
                        }
                        @if (rd.fields.length) {
                          <div class="fields">
                            @for (f of rd.fields; track f.k) {
                              <span class="fld" [title]="f.full">{{ f.k }} <b>{{ f.v }}</b></span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                  <!-- as stored -->
                  <div class="storeh">
                    <span class="t">AS STORED · SELECT * FROM {{ c.carrier_table }} WHERE {{ c.bind_col }} = '{{ rn }}'</span>
                    <span class="l"></span>
                  </div>
                  <div class="cbw">
                    <table class="cbtbl">
                      <thead><tr>@for (col of columnsOfRoot(c); track col) { <th>{{ col }}</th> }</tr></thead>
                      <tbody>
                        @for (row of c.rows; track $index) {
                          <tr>@for (col of columnsOfRoot(c); track col) {
                            <td [class.ar]="isArabic(row[col])" [class.nul]="row[col] === null || row[col] === undefined"
                                [title]="fullText(row[col])"><span class="cv">{{ cellText(row[col]) }}</span></td>
                          }</tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  @if (nullColumns(c).length) {
                    <p class="note">NULL for every row read, and so carrying nothing here:
                      @for (col of nullColumns(c); track col) { <span class="mono">{{ col }}</span> }</p>
                  }
                }
              }
            </div>

            <div class="insp">
              @if (selSub(); as sl) {
                <p class="ih">SUB-LAYER · REGISTRY</p>
                <div class="kv"><span class="k">sub_code</span><span class="v g">{{ sl.sub_code }}</span></div>
                <div class="kv"><span class="k">band · band_key</span><span class="v">{{ selBand()?.band }} · {{ selBand()?.key }}</span></div>
                <div class="kv"><span class="k">name_ar</span><span class="v aa">{{ sl.name_ar }}</span></div>
                @if (sl.name_ur) { <div class="kv"><span class="k">name_ur</span><span class="v aa">{{ sl.name_ur }}</span></div> }
                <div class="kv"><span class="k">scope_level</span><span class="v">{{ sl.scope_level }}</span></div>
                <div class="kv"><span class="k">discipline</span><span class="v">{{ sl.discipline }}</span></div>
                <div class="kv"><span class="k">default_card</span><span class="v">{{ sl.card }}</span></div>
                <div class="kv"><span class="k">produced_by</span><span class="v">{{ sl.produced_by }}</span></div>
                <div class="kv"><span class="k">fill_state</span>
                  <span class="v" [class.grn]="fillState(sl.sub_code)==='filled'"
                        [class.unk]="fillState(sl.sub_code)==='unknown'">{{ fillState(sl.sub_code) }}</span></div>
                <div class="kv"><span class="k">carrier_state</span>
                  <span class="v" [class.grn]="sl.carrier_state==='audited'">{{ sl.carrier_state }}</span></div>
                <div class="kv"><span class="k">display_order</span><span class="v">{{ sl.display_order }}</span></div>

                <p class="ih sp">CARRIERS · tables_json</p>
                @for (t of sl.tables; track t) {
                  <span class="tchip">{{ t }} <small>· {{ carrierNote(t) }}</small></span>
                } @empty {
                  <span class="tchip dim">no table bound <small>· root_bind unset — reported unknown, never zero</small></span>
                }

                <p class="ih sp">ATTESTATION · 360°</p>
                @if (senseBundle() === null) { <div class="msg">Reading the attestations…</div> }
                @else if (attestSources().length) {
                  @for (s of attestSources(); track s.slug) {
                    <div class="src"><span class="nm">{{ s.slug }}</span>
                      <span class="ag" [class.p]="s.agreement !== 'supports'">{{ s.agreement }}</span>
                      <span class="agn">{{ s.n }}</span></div>
                  }
                  <p class="note">Distinct <span class="mono">source_slug</span> over
                    <span class="mono">ar_ling_sense_attestation</span> for {{ rn }} — who stands behind
                    this root's senses, and whether they agree.</p>
                } @else {
                  <p class="note">No source has attested a sense of {{ rn }} yet.</p>
                }

                <p class="ih sp">READ RULES</p>
                <p class="note">Rows are ordered before the read is capped, so a truncated carrier shows
                  its opening rows rather than whatever happens to sort first. A sub-layer whose
                  <span class="mono">root_bind</span> is unset is reported <b class="unk">unknown</b>,
                  never zero.</p>
              } @else {
                <p class="ih">SUB-LAYER · REGISTRY</p>
                <p class="note">Nothing selected. The rail lists every band this scope declares and
                  how many rows each sub-layer's carrier holds for {{ rn }} right now.</p>
              }
            </div>
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

          <!-- The layers pane moved into the browser above: a sub-layer's rows
               are read there, beside the registry that describes them. What
               stays here are the two panes the browser does not cover. -->
          <div class="paneh">{{ paneTitle() }}</div>
          @if (!rootDetail()) { <div class="msg">Loading root detail…</div> }
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
    }
  `,
  styles: [`
    /* Reader / audit switch in the root view header. */
    .vhsp { flex:1; }
    .rvt { display:flex; gap:3px; padding:3px; border-radius:9px;
      background:var(--paper); border:1px solid var(--rule); }
    .rvt button { font-family:ui-monospace,monospace; font-size:10px;
      padding:5px 11px; border:0; border-radius:6px; cursor:pointer;
      background:transparent; color:var(--t3); }
    .rvt button.on { color:var(--bg);
      background:linear-gradient(180deg,var(--gold-b),var(--gold)); }
    .dsmsg { padding:40px; text-align:center; color:var(--t3); font-size:13px; }
    .dsmsg.err { color:var(--err); }

    :host { display:block; }
    .msg { color:var(--t2); padding:26px; text-align:center; } .msg.err { color:var(--err); }
    .crumbs { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:16px 0 14px; }
    .crumb { color:var(--gold-b); font-family:var(--serif); border:1px solid var(--bd); border-radius:16px; padding:4px 12px; background:#0f0f0f; cursor:pointer; font-size:12px; }
    .crumb .aa { font-family:var(--ar); margin-left:3px; }
    .crumb:hover { border-color:var(--bd-hi); } .crumb.cur { color:#2a2205; background:linear-gradient(180deg,var(--gold-b),var(--gold)); border-color:var(--gold-b); font-weight:700; }
    .csep { color:var(--gold-d); font-weight:700; }
    .vh { font-family:var(--serif); font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-d); margin:0 0 12px; display:flex; justify-content:space-between; align-items:baseline; }
    .vh .h { font-size:10px; color:var(--t3); font-family:ui-monospace,monospace; letter-spacing:0; text-transform:none; }
    .vh .qp { color:var(--build); font-weight:400; }

    /* ── the glossy glass card — one surface language for every level ── */
    .glass { position:relative; border-radius:12px; border:1px solid rgba(232,201,106,.18);
      background:linear-gradient(158deg,rgba(34,29,16,.7),rgba(13,11,7,.86));
      box-shadow:0 14px 22px rgba(0,0,0,.5),0 0 14px rgba(201,168,76,.06),inset 0 1px 0 rgba(255,255,255,.11);
      backdrop-filter:blur(9px); }
    .glass::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
      background:linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,.1) 14%,rgba(255,255,255,.02) 34%,transparent 54%);
      mix-blend-mode:plus-lighter; opacity:.5; }
    .glass.act { border-color:rgba(77,217,168,.55);
      box-shadow:0 14px 24px rgba(0,0,0,.5),0 0 18px rgba(77,217,168,.14),inset 0 1px 0 rgba(255,255,255,.13); }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:7px; }
    .cell { text-align:left; padding:9px 10px 10px; cursor:pointer; color:var(--text); display:flex; flex-direction:column; gap:1px; }
    .cell:hover { border-color:var(--bd-hi); transform:translateY(-2px); }
    .cell.active { border-color:var(--content); box-shadow:0 0 0 1px var(--content); }
    /* the four outputs on a surah tile · a dashed track = no sensor has read it */
    .o4m { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:8px; }
    .o4m .m { display:flex; flex-direction:column; gap:2px; }
    .o4m .m span { font-family:ui-monospace,monospace; font-size:7px; letter-spacing:.3px; color:var(--t3); white-space:nowrap; }
    .o4m .m span b { color:var(--text); font-weight:700; }
    .o4m .m .b { height:4px; border-radius:2px; background:rgba(255,255,255,.06); overflow:hidden; }
    .o4m .m .b i { display:block; height:100%; border-radius:2px; }
    .o4m .m.unm .b { background:transparent; border:1px dashed rgba(224,120,92,.26); }
    .o4m .m.unm .b i { display:none; }
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

    /* ── L4 · the passage's roots, given room to be read ── */
    .rgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
      border-top:1px solid rgba(232,201,106,.14); border-left:1px solid rgba(232,201,106,.14); }
    .rtile { position:relative; min-height:250px; padding:22px; cursor:pointer; color:var(--text);
      border:0; border-right:1px solid rgba(232,201,106,.14); border-bottom:1px solid rgba(232,201,106,.14);
      background:transparent; display:flex; flex-direction:column; align-items:center; justify-content:center;
      transition:background .3s, filter .35s, opacity .35s; }
    /* Hovering one root pushes the others back, so a single root can be looked
       at without the grid competing for the eye. */
    .rgrid.hovering .rtile { filter:blur(3px) saturate(.6); opacity:.45; }
    .rgrid.hovering .rtile.near { filter:none; opacity:1; background:rgba(232,201,106,.07); }
    .rref { position:absolute; top:0; left:0; font-family:ui-monospace,monospace; font-size:10px; color:var(--gold-d);
      border-right:1px solid rgba(232,201,106,.14); border-bottom:1px solid rgba(232,201,106,.14); padding:6px 11px; }
    .rpct { position:absolute; top:11px; right:14px; font-family:ui-monospace,monospace; font-weight:700; font-size:10px; color:#6b5f4c; }
    .rpct.mid { color:var(--gold-b); } .rpct.hi { color:var(--content); }
    .rpct.unm { color:var(--t3); font-style:italic; }
    .rglyph { font-family:var(--ar); font-weight:700; font-size:64px; line-height:1; color:#e4d6b8;
      text-shadow:0 6px 34px rgba(201,168,76,.18); transition:color .3s; }
    .rtile:hover .rglyph { color:var(--gold-b); }
    .rgloss { font-family:var(--serif); font-size:16px; color:var(--t2); margin-top:20px; text-align:center;
      text-wrap:pretty; opacity:.62; transition:opacity .3s; }
    .rtile:hover .rgloss { opacity:1; }
    .rgloss.none { font-size:12px; color:var(--t3); font-style:italic; }
    .rocc { font-family:ui-monospace,monospace; font-size:10px; color:#5e5445; margin-top:9px; text-align:center; }

    .list { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:9px; }
    /* passages and streams: the design's four-up card wall */
    .pgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:13px; align-items:stretch; }

    /* ── L2 · a study passage ── */
    .pc { padding:14px 16px; display:flex; flex-direction:column; min-height:158px; cursor:pointer; }
    .pc:hover { transform:translateY(-1px); border-color:var(--bd-hi); }
    .pt { font-family:var(--serif); font-size:14.5px; color:var(--text); line-height:1.28; max-width:78%; }
    .pref { position:absolute; top:14px; right:15px; font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); white-space:nowrap; }
    .pslug { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--gold-d); margin-top:6px; }
    .plink { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:11px; }
    .plink .go { position:static; font-family:ui-monospace,monospace; font-size:9.5px; color:var(--gold-d); }

    .lc { border:1px solid rgba(255,255,255,.09); border-left:3px solid var(--lc,var(--gold-d)); border-radius:11px; background:linear-gradient(90deg,#161616,#0d0d0d); padding:11px 13px; position:relative; }
    .lc.sc { border:1px solid rgba(232,201,106,.18); border-left:3px solid var(--lc,var(--gold-d)); display:flex; flex-direction:column; min-height:130px; padding:14px 16px; }
    .lc.sc .o4big { margin-top:auto; padding-top:14px; }
    .lc.dim { opacity:.6; } .lc:not(.dim) { cursor:pointer; } .lc:not(.dim):hover { border-color:var(--bd-hi); }
    .lct { display:flex; align-items:baseline; gap:8px; } .lct .aa { font-family:var(--ar); font-size:19px; } .lct .en { font-family:var(--serif); font-size:14px; color:var(--text); } .lct .no { margin-left:auto; font-size:9px; color:var(--t3); font-family:ui-monospace,monospace; }
    .lcd { font-size:10.5px; color:var(--t3); margin-top:3px; }
    .steps { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
    .step { font-size:8.5px; font-family:ui-monospace,monospace; border:1px solid rgba(255,255,255,.1); border-radius:8px; padding:3px 7px; color:var(--t3); display:inline-flex; align-items:center; gap:5px; }
    .step.on { color:var(--content); border-color:rgba(77,217,168,.4); }
    .step .o { width:8px; height:8px; border-radius:50%; border:1px solid rgba(255,255,255,.18); flex:none; }
    .step.on .o { background:var(--content); border-color:var(--content); }
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

    /* ══ the layer data browser · registry | rows | metadata ══ */
    .panes { display:flex; align-items:flex-start; margin:14px -17px 0; border-top:1px solid rgba(201,168,76,.13); }
    .rail { width:300px; flex:none; align-self:stretch; border-right:1px solid rgba(201,168,76,.11);
      padding:16px 14px 30px; background:linear-gradient(180deg,rgba(22,18,8,.42),transparent); }
    .main { flex:1; min-width:0; padding:20px 24px 34px; overflow:hidden; }
    .insp { width:330px; flex:none; align-self:stretch; border-left:1px solid rgba(201,168,76,.11);
      padding:20px 20px 30px; background:linear-gradient(180deg,rgba(22,18,8,.35),transparent); }
    @media(max-width:1200px){ .panes { flex-wrap:wrap; } .rail, .insp { width:100%; border:0; } }

    /* scope segmented control */
    .seg { display:flex; gap:5px; padding:4px; border-radius:8px; background:rgba(0,0,0,.45);
      border:1px solid rgba(201,168,76,.14); box-shadow:inset 0 2px 6px rgba(0,0,0,.5); }
    .segi { flex:1; text-align:center; padding:8px 4px; border:0; border-radius:6px; cursor:pointer;
      font-weight:600; font-size:11px; color:var(--gold-d); background:transparent; }
    .segi .aa { font-family:var(--ar); font-size:13px; display:block; color:var(--t3); }
    .segi.on { color:#2a2205; background:linear-gradient(180deg,var(--gold-b),var(--gold));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 2px 6px rgba(0,0,0,.4); }
    .segi.on .aa { color:#3a2f08; }
    .rlabel { font-family:ui-monospace,monospace; font-weight:600; font-size:9px; letter-spacing:1.4px; color:#6b5f4c; margin:20px 0 8px; }

    /* the registry tree */
    .bandg { margin-bottom:12px; }
    .bandt { display:flex; align-items:center; gap:8px; padding:8px 9px; border-radius:6px; background:rgba(232,201,106,.06); }
    .bandt .bc { font-family:ui-monospace,monospace; font-weight:700; font-size:8px; color:#2a2205;
      background:linear-gradient(180deg,#f0d987,var(--gold)); border-radius:3px; padding:2px 6px; }
    .bandt .bn { font-weight:600; font-size:11.5px; color:var(--gold-b); }
    .bandt .baa { font-family:var(--ar); font-size:13px; color:var(--gold-d); margin-left:auto; }
    .leaf { display:flex; width:100%; align-items:center; gap:9px; text-align:left; cursor:pointer;
      padding:8px 10px 8px 14px; margin-top:3px; border:0; border-radius:6px;
      border-left:2px solid #33322c; background:transparent; transition:.15s; }
    .leaf:hover { background:rgba(255,255,255,.03); }
    .leaf[data-state="filled"] { border-left-color:var(--content); }
    .leaf[data-state="unknown"] { border-left-color:var(--err); }
    .leaf.on { background:linear-gradient(90deg,rgba(232,201,106,.16),rgba(232,201,106,.03));
      border-left-color:var(--gold-b); box-shadow:inset 0 1px 0 rgba(255,255,255,.06); }
    .leaf .lc { font-family:ui-monospace,monospace; font-size:8px; color:#6b5f4c; width:60px; flex:none; }
    .leaf .ln { font-size:11.5px; color:var(--t2); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .leaf.on .ln { color:var(--text); font-weight:500; }
    .leaf .lq { font-family:ui-monospace,monospace; font-weight:700; font-size:11px; color:#3d3a33; }
    .leaf[data-state="filled"] .lq { color:var(--content); }
    .leaf[data-state="unknown"] .lq { color:var(--err); }
    .unk { color:var(--err); }

    /* the selected carrier */
    .mh { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding-bottom:14px; margin-top:18px;
      border-bottom:1px solid rgba(201,168,76,.13); }
    .mh:first-child { margin-top:0; }
    .mh .code { font-family:ui-monospace,monospace; font-weight:700; font-size:10px; color:#2a2205;
      background:linear-gradient(180deg,#f0d987,var(--gold)); border-radius:4px; padding:4px 9px; }
    .mh .tbl { font-family:ui-monospace,monospace; font-weight:500; font-size:14px; color:var(--gold-b); }
    .mh .meta { font-family:ui-monospace,monospace; font-size:10.5px; color:var(--gold-d); }
    .mh .meta b { color:var(--t2); }
    .mh .cnt { margin-left:auto; font-family:ui-monospace,monospace; font-weight:500; font-size:11px; color:var(--t2); }

    /* a row, read as content */
    .row { border-radius:8px; margin-top:14px; overflow:hidden;
      background:linear-gradient(180deg,rgba(23,19,11,.7),rgba(11,10,8,.8)); border:1px solid rgba(232,201,106,.12);
      box-shadow:0 1px 2px rgba(0,0,0,.5),0 12px 26px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.06); }
    .rowh { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 16px;
      background:linear-gradient(180deg,rgba(34,28,16,.85),transparent); box-shadow:inset 0 1px 0 rgba(255,255,255,.07); }
    .rown { font-family:ui-monospace,monospace; font-weight:700; font-size:11px; color:var(--gold-d); }
    .badge { font-family:ui-monospace,monospace; font-weight:600; font-size:8.5px; letter-spacing:.4px;
      padding:3px 8px; border-radius:11px; border:1px solid rgba(201,168,76,.3); color:var(--gold); }
    .badge.core { color:#2a2205; background:linear-gradient(180deg,#f0d987,var(--gold)); border-color:transparent; }
    .badge.ok { color:var(--content); border-color:rgba(77,217,168,.4); }
    .rowb { padding:14px 16px 16px; }
    .gar { font-family:var(--ar); font-size:20px; color:var(--arab); direction:rtl; text-align:right; line-height:1.7; }
    .gen { font-size:13px; line-height:1.5; color:#e8dcc4; margin-top:5px; }
    .gen.dim { color:var(--t3); font-style:italic; }
    .gur { font-family:var(--ar); font-size:15px; color:var(--t3); direction:rtl; text-align:right; margin-top:4px; }
    .fields { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; padding-top:12px; border-top:1px solid rgba(201,168,76,.1); }
    .fld { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); border:1px solid rgba(255,255,255,.08);
      border-radius:5px; padding:4px 9px; background:rgba(0,0,0,.3); }
    .fld b { color:var(--t2); font-weight:500; }
    .storeh { display:flex; align-items:center; gap:10px; margin:26px 0 10px; }
    .storeh .t { font-family:ui-monospace,monospace; font-weight:600; font-size:9px; letter-spacing:1.1px; color:#6b5f4c; }
    .storeh .l { flex:1; height:1px; background:rgba(201,168,76,.12); }
    .cbtbl td.nul { color:#3d3a33; font-style:italic; }

    /* the inspector */
    .ih { font-family:ui-monospace,monospace; font-weight:600; font-size:9px; letter-spacing:1.4px; color:#6b5f4c; margin:0 0 10px; }
    .ih.sp { margin-top:22px; }
    .kv { display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05); }
    .kv .k { font-family:ui-monospace,monospace; font-size:10px; color:#6b5f4c; }
    .kv .v { font-family:ui-monospace,monospace; font-weight:500; font-size:10.5px; color:var(--t2); text-align:right; }
    .kv .v.g { color:var(--gold-b); } .kv .v.grn { color:var(--content); }
    .kv .v.aa { font-family:var(--ar); font-size:14px; }
    .tchip { display:block; font-family:ui-monospace,monospace; font-size:10px; color:var(--gold);
      border:1px solid rgba(201,168,76,.18); border-radius:5px; padding:7px 10px; margin-top:6px;
      background:rgba(0,0,0,.35); overflow-wrap:anywhere; }
    .tchip.dim { opacity:.55; } .tchip small { color:#6b5f4c; }
    .src { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.05); }
    .src .nm { font-size:11px; color:var(--t2); flex:1; overflow-wrap:anywhere; }
    .src .ag { font-family:ui-monospace,monospace; font-weight:600; font-size:8.5px; color:var(--content); }
    .src .ag.p { color:var(--gold-b); }
    .src .agn { font-family:ui-monospace,monospace; font-size:9px; color:#6b5f4c; width:20px; text-align:right; }
    .note .mono { font-family:ui-monospace,monospace; color:var(--t2); margin-right:5px; }

    /* the root strip's three states */
    .pill { font-family:ui-monospace,monospace; font-weight:500; font-size:10px; padding:5px 11px; border-radius:20px;
      border:1px solid rgba(201,168,76,.3); color:var(--gold); white-space:nowrap; }
    .pill.grn { color:var(--content); border-color:rgba(77,217,168,.4); }
    .pill.unk { color:var(--err); border-color:rgba(224,120,92,.4); }

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
    .langs { margin-left:8px; display:inline-flex; gap:3px; }
    .lg { font-size:8px; font-family:ui-monospace,monospace; border:1px solid rgba(255,255,255,.12); border-radius:4px;
      padding:0 4px; color:#4a4a4a; }
    .lg.on { color:var(--content); border-color:rgba(77,217,168,.45); }
    .tri { font-family:ui-monospace,monospace; font-size:10px; color:var(--content); }
    .tri.gap { color:var(--err); }
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

    /* ── unmeasured · the plane has read nothing here ── */
    .unm { color:var(--t3) !important; font-style:italic; }
    .pbar.unm, .o.unm { background:transparent; border:1px dashed rgba(224,120,92,.3); box-sizing:border-box; }
    .qp.unm { font-style:italic; }
    .drift { font-family:ui-monospace,monospace; font-size:8px; letter-spacing:.6px; text-transform:uppercase;
      color:var(--err); border:1px solid rgba(224,120,92,.4); border-radius:9px; padding:1px 6px; }

    /* ── the recursion's scopes ── */
    .scopetabs { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 14px; }
    .st { display:flex; flex-direction:column; gap:1px; text-align:left; cursor:pointer; font-family:inherit;
      background:#0f0f0f; border:1px solid var(--bd); border-radius:11px; padding:8px 13px; color:var(--t2); }
    .st:hover { border-color:var(--bd-hi); }
    .st.on { border-color:var(--gold-b); background:linear-gradient(180deg,#1a1710,#0f0f0f); }
    .star { font-family:var(--ar); font-size:15px; color:var(--gold-b); }
    .sten { font-family:var(--serif); font-size:12px; color:var(--text); }
    .stn { font-family:ui-monospace,monospace; font-size:8.5px; color:var(--t3); }

    /* ── a band and its sub-layers ── */
    .bnd { border:1px solid var(--bd); border-radius:12px; margin-bottom:10px; overflow:hidden; }
    .bndh { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; padding:9px 13px;
      background:linear-gradient(90deg,#16150f,#0d0d0d); border-bottom:1px solid rgba(255,255,255,.05); }
    .bndn { font-family:ui-monospace,monospace; font-size:9px; color:#2a2205; background:var(--gold-b);
      border-radius:5px; padding:2px 6px; font-weight:700; }
    .bndk { font-family:ui-monospace,monospace; font-size:10px; letter-spacing:1px; color:var(--gold-b); }
    .bndar { font-family:var(--ar); font-size:15px; color:var(--t2); }
    .bndt { font-family:var(--serif); font-size:12.5px; color:var(--text); }
    .bndc { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t3); margin-left:auto; }
    .bsubs { display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:1px; background:rgba(255,255,255,.05); }
    .bsub { display:flex; flex-direction:column; gap:2px; text-align:left; cursor:pointer; font-family:inherit;
      background:#0e0e0e; border:none; border-top:2px solid var(--blocked); padding:9px 11px; color:var(--t2); }
    .bsub:hover { background:#141414; }
    .bsub.sel { outline:2px solid var(--gold-b); outline-offset:-2px; }
    .bsub[data-state="filled"] { border-top-color:var(--ready); }
    .bsub[data-state="empty"]  { border-top-color:#2a2a2a; }
    .bsub[data-state="unknown"]{ border-top-color:var(--err); }
    .bsn { font-family:ui-monospace,monospace; font-size:15px; font-weight:700; color:var(--text); line-height:1; }
    .bsub[data-state="empty"] .bsn { color:#3a3a3a; }
    .bsub[data-state="unknown"] .bsn { color:var(--err); }
    .bsc { font-family:ui-monospace,monospace; font-size:8px; color:var(--t3); }
    .bsl { font-size:10.5px; color:var(--t2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .note .k.unknown { font-family:ui-monospace,monospace; color:var(--err); font-weight:700; }

    /* ── a carrier, rendered as the table it is ── */
    .cb { border:1px solid var(--bd); border-radius:12px; margin-bottom:12px; overflow:hidden; }
    .cbh { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; padding:9px 13px;
      background:linear-gradient(90deg,#141414,#0d0d0d); border-bottom:1px solid rgba(255,255,255,.06); }
    .cbb { font-family:ui-monospace,monospace; font-size:9px; color:#2a2205; background:var(--gold-b);
      border-radius:5px; padding:2px 6px; font-weight:700; }
    .cbt { font-family:ui-monospace,monospace; font-size:12px; color:var(--gold-b); }
    .cbd { font-family:ui-monospace,monospace; font-size:9px; color:var(--t3); }
    .cbn { font-family:ui-monospace,monospace; font-size:9.5px; color:var(--t2); margin-left:auto; }
    .cbn em { color:var(--err); font-style:normal; margin-left:5px; }
    .cbw { overflow-x:auto; max-height:520px; overflow-y:auto; }
    .cbtbl { border-collapse:collapse; width:100%; font-size:11.5px; }
    .cbtbl th { position:sticky; top:0; background:#101010; font-family:ui-monospace,monospace; font-size:8.5px;
      letter-spacing:.5px; text-transform:uppercase; color:var(--t3); text-align:left; padding:6px 9px;
      border-bottom:1px solid var(--bd); white-space:nowrap; }
    /* overflow-wrap:anywhere also shrinks a column's intrinsic width, which set
       the id column one character wide and made every row as tall as its id was
       long. break-word wraps the long prose the same way without touching the
       min-content size. */
    .cbtbl td { padding:6px 9px; border-bottom:1px solid rgba(255,255,255,.05); color:var(--t2);
      vertical-align:top; min-width:72px; max-width:380px; overflow-wrap:break-word; }
    /* A carrier's prose columns run to paragraphs. Three lines is enough to
       recognise the row; the whole value is on the cell's title. */
    .cbtbl .cv { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;
      overflow:hidden; line-height:1.45; }
    .cbtbl td.ar { font-family:var(--ar); font-size:15px; color:var(--arab); direction:rtl; text-align:right; }
    .cbtbl tr:hover td { background:rgba(201,168,76,.05); }
  `],
})
export class CybMapComponent {
  private readonly svc = inject(CybService);
  private readonly api = inject(BackendApiService);
  private readonly router = inject(Router);

  readonly surahs = signal<Surah[]>([]);
  readonly error = signal<string | null>(null);
  private readonly treeRoots = signal<CybNodeTree[]>([]);

  private readonly layerRegistry = signal<CybLayerRow[]>([]);

  readonly layerModel = signal<LayerModel | null>(null);

  readonly scope = signal('root');

  readonly rootView = signal<'reader' | 'audit'>('reader');
  readonly dsSpec = signal<DisplaySpec | null>(null);
  readonly dsError = signal<string | null>(null);
  private dsLoadedFor: string | null = null;
  private auditLoadedFor: string | null = null;

  readonly rootFill = signal<RootFillCell[] | null>(null);

  readonly subRows = signal<RootCarrierRows[] | null>(null);

  readonly carrierBands = signal<NodeCarrierRows[] | null>(null);

  private readonly columnCache = new Map<string, string[]>();

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

  readonly rootGlosses = signal<Map<string, RootGloss> | null>(null);
  readonly glossesLoaded = computed(() => this.rootGlosses() !== null);
  readonly hoverRoot = signal<string | null>(null);

  readonly senseBundle = signal<RootSenseBundle | null>(null);

  private readonly flat = computed<CybNodeTree[]>(() => {
    const out: CybNodeTree[] = [];
    const walk = (n: CybNodeTree) => { out.push(n); n.children.forEach(walk); };
    this.treeRoots().forEach(walk);
    return out;
  });

  readonly flatNodes = computed<CybNodeTree[]>(() => this.flat());
  readonly axes = CYB_AXES;
  readonly activeCount = computed(() =>
    this.flat().filter((n) => n.scale === 'surah' && n.build_pct > 0).length);

  readonly quranBuild = computed<{ pct: number; measured: boolean; n: number }>(() => {
    const read = this.surahs()
      .map((s) => this.surahNode(s.id))
      .filter((n): n is CybNodeTree => !!n && n.build_measured === 1);
    if (!read.length) return { pct: 0, measured: false, n: 0 };
    return {
      pct: read.reduce((a, n) => a + n.build_pct, 0) / read.length,
      measured: true,
      n: read.length,
    };
  });
  readonly quranPct = computed(() => this.fmt(this.quranBuild().pct));

  readonly current = computed<CybNodeTree[]>(() => {
    if (this.streamParam()) return this.stageNodeCur()?.children ?? [];
    return this.passageNodeCur()?.children ?? [];
  });

  readonly drillTitle = computed(() => {
    const p = this.passageNodeCur();
    return p ? this.crumbLabel(p) : '';
  });

  readonly streamRows = computed<StreamRow[]>(() => {
    const reg = this.layerRegistry();
    const staged = this.passageNodeCur()?.children ?? [];
    const keys = reg.map((l) => l.layer_key);
    const extra = staged.map((n) => n.layer ?? '').filter((k) => k && !keys.includes(k));
    return [...keys, ...extra].map((layer) => ({
      layer,
      node: staged.find((n) => n.layer === layer),
      reg: reg.find((l) => l.layer_key === layer),
    }));
  });

  readonly scopeBands = computed<LayerModelBand[]>(() =>
    (this.layerModel()?.layers ?? []).filter((b) => b.scope === this.scope()));

  readonly scopeSubs = computed<LayerModelSub[]>(() =>
    this.scopeBands().flatMap((b) => b.subs));

  readonly fillPending = computed(() => this.rootFill() === null);

  constructor() {

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
        this.rootDetail.set(null); this.subRows.set(null); this.senseBundle.set(null);
        this.scope.set('root');

        if (this.rootView() === 'audit') this.loadAudit(rn);
        else this.loadDsSpec(rn);
      }
      if (!rn) {
        this.rootFill.set(null); this.subRows.set(null);
        this.dsSpec.set(null); this.dsError.set(null);
        this.dsLoadedFor = null; this.auditLoadedFor = null;
      }

      const st = this.streamParam();
      if (st && st !== 'vocabulary' && this.view() === 'pieces') this.loadCarrierBands();
      else this.carrierBands.set(null);
    });

    forkJoin({
      surahs: this.svc.surahs(),
      tree: this.svc.tree(),
      layers: this.svc.layers('quran'),
      model: this.svc.layerModel(),
    }).subscribe({
      next: ({ surahs, tree, layers, model }) => {
        this.surahs.set(surahs.sort((a, b) => a.id - b.id));
        this.treeRoots.set(tree.roots);
        this.layerRegistry.set(layers.layers);
        this.layerModel.set(model);
        const sid = this.surahId();
        if (sid && !this.units().length) this.loadStudyGrid(sid);
        if (this.streamParam() === 'vocabulary' && this.passageNo()) this.loadVerseRoots();
        const st = this.streamParam();
        if (st && st !== 'vocabulary' && this.view() === 'pieces') this.loadCarrierBands();
      },
      error: (e) => this.error.set(String(e?.message ?? e)),
    });
  }

  private loadRootFill(root: string) {
    this.rootFill.set(null);
    this.svc.rootFillScope(root, this.scope()).subscribe({
      next: (f) => this.rootFill.set(f.root_fill),
      error: () => this.rootFill.set([]),
    });
  }

  setScope(key: string) {
    if (this.scope() === key) return;
    this.scope.set(key);
    this.selLayer.set(null); this.subRows.set(null);
    const rn = this.rootParam();
    if (rn) this.loadRootFill(rn);
  }
  private loadCarrierBands() {
    const u = this.selUnit(); const st = this.streamParam();
    const node = this.passageNodeCur();
    if (!u || !st || !node) { this.carrierBands.set([]); return; }
    this.carrierBands.set(null);
    this.svc.nodeRows(node.id, st).subscribe({
      next: (r) => this.carrierBands.set(r.carriers),
      error: () => this.carrierBands.set([]),
    });
  }

  surahNode(id: number): CybNodeTree | undefined {
    return this.flat().find((n) => n.scale === 'surah' && Number(n.target_ref) === id);
  }
  passageNode(u: StudyUnit): CybNodeTree | undefined {
    const s = this.surah()?.id;
    const key = `${s}:${u.ayah_from}-${u.ayah_to}`;
    return this.flat().find((n) => n.scale === 'passage' && (n.target_ref ?? '').replace(/^QR:SP:/, '') === key);
  }

  measured(n: CybNode | null | undefined, axis: CybAxis): boolean {
    if (!n) return false;
    const flag = axis === 'build' ? n.build_measured
      : axis === 'study' ? n.study_measured
      : axis === 'content' ? n.content_measured
      : n.retention_measured;
    return flag === 1;
  }
  axisPct(n: CybNode | null | undefined, axis: CybAxis): number {
    if (!n) return 0;
    return axis === 'build' ? n.build_pct : axis === 'study' ? n.study_pct
         : axis === 'content' ? n.content_pct : n.retention_pct;
  }
  axisLabel(a: CybAxis): string { return a === 'retention' ? 'Retn' : a[0].toUpperCase() + a.slice(1); }

  axisInitial(a: CybAxis): string { return a === 'retention' ? 'R' : a[0].toUpperCase(); }
  axisColor(a: CybAxis): string {
    return a === 'build' ? 'var(--build)' : a === 'study' ? 'var(--study)'
         : a === 'content' ? 'var(--content)' : 'var(--retn)';
  }

  buildLabel(n: CybNode | null | undefined): string {
    if (!this.measured(n, 'build')) return 'not measured';
    return n!.build_pct > 0 ? `build ${n!.build_pct}%` : 'not started';
  }

  bar(v: number): number { return v > 0 ? Math.min(100, Math.max(0.9, v)) : 0; }
  fmt(v: number): string {
    if (v <= 0) return '0';
    if (v >= 10) return String(Math.round(v));
    return v >= 1 ? v.toFixed(1) : v.toFixed(2);
  }

  fillFor(sub: string): RootFillCell | null {
    return (this.rootFill() ?? []).find((f) => f.sub_code === sub) ?? null;
  }
  fillState(sub: string): 'unknown' | 'empty' | 'filled' {
    const f = this.fillFor(sub);
    if (!f) return 'unknown';
    return f.rows > 0 ? 'filled' : 'empty';
  }
  bandFilled(b: LayerModelBand): number {
    return b.subs.filter((sl) => this.fillState(sl.sub_code) === 'filled').length;
  }
  filledSubs(): number {
    return this.scopeSubs().filter((sl) => this.fillState(sl.sub_code) === 'filled').length;
  }

  emptySubs(): number {
    return this.scopeSubs().filter((sl) => this.fillState(sl.sub_code) === 'empty').length;
  }

  unknownSubs(): number {
    return this.scopeSubs().filter((sl) => this.fillState(sl.sub_code) === 'unknown').length;
  }

  selSub(): LayerModelSub | undefined {
    const code = this.selLayer();
    return code ? this.scopeSubs().find((sl) => sl.sub_code === code) : undefined;
  }
  selBand(): LayerModelBand | undefined {
    const code = this.selLayer();
    return code ? this.scopeBands().find((b) => b.subs.some((sl) => sl.sub_code === code)) : undefined;
  }

  carrierNote(table: string): string {
    const c = (this.subRows() ?? []).find((x) => x.carrier_table === table);
    if (!c) return 'not read for this root';
    return `${c.bind_col} · ${c.total} row${c.total === 1 ? '' : 's'}`;
  }

  nullColumns(c: RootCarrierRows): string[] {
    return this.columnsOfRoot(c).filter((col) =>
      c.rows.every((r) => r[col] === null || r[col] === undefined || r[col] === ''));
  }

  rootCard(): RootGloss | undefined {
    const rn = this.selRootNorm();
    return rn ? this.glossFor(rn) : undefined;
  }

  attestSources(): { slug: string; agreement: string; n: number }[] {
    const by = new Map<string, { slug: string; agreement: string; n: number }>();
    for (const a of this.senseBundle()?.attestations ?? []) {
      const cur = by.get(a.source_slug);
      if (!cur) { by.set(a.source_slug, { slug: a.source_slug, agreement: a.agreement, n: 1 }); continue; }
      cur.n++;
      if (a.agreement !== 'supports') cur.agreement = a.agreement;
    }
    return [...by.values()].sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug));
  }

  readRow(row: Record<string, unknown>): {
    ar: string; en: string; ur: string;
    badges: { k: string; v: string; core: boolean; ok: boolean }[];
    fields: { k: string; v: string; full: string }[];
  } {
    const str = (v: unknown) => (v === null || v === undefined) ? '' : String(v);
    const cols = Object.keys(row);
    const pick = (suffix: string) => {
      const c = cols.find((k) => k.endsWith(suffix) && str(row[k]).trim() !== '');
      return c ? str(row[c]) : '';
    };
    const arCol = cols.find((k) => k.endsWith('_ar') && str(row[k]).trim() !== '');
    const enCol = cols.find((k) => k.endsWith('_en') && str(row[k]).trim() !== '');
    const urCol = cols.find((k) => k.endsWith('_ur') && str(row[k]).trim() !== '');
    const BADGE = ['is_core', 'status', 'confidence', 'sense_key', 'relation', 'agreement'];
    const SKIP = new Set([arCol, enCol, urCol, 'id', 'created_at', 'updated_at', 'canonical_id']);
    const badges = BADGE.filter((k) => cols.includes(k) && str(row[k]).trim() !== '').map((k) => {
      const v = str(row[k]);
      return { k, v, core: k === 'is_core' && v === '1', ok: k === 'status' && (v === 'live' || v === 'published') };
    });
    badges.forEach((b) => SKIP.add(b.k));
    const fields = cols.filter((k) => !SKIP.has(k) && str(row[k]).trim() !== '').map((k) => {
      const full = this.fullText(row[k]);
      return { k, v: full.length > 48 ? full.slice(0, 48) + '…' : full, full };
    });
    return { ar: pick('_ar'), en: pick('_en'), ur: pick('_ur'), badges, fields };
  }

  carrierLabel(sl: LayerModelSub): string {
    if (!sl.tables.length) return 'no carrier';
    return sl.tables.length === 1 ? sl.tables[0] : `${sl.tables.length} tables`;
  }
  memletCount(): number { return this.rootDetail()?.memlets.length ?? 0; }

  columnsOf(b: NodeCarrierRows): string[] { return this.columns(`n:${b.table_name}`, b.rows); }
  columnsOfRoot(c: RootCarrierRows): string[] { return this.columns(`r:${c.carrier_table}`, c.rows); }
  private columns(key: string, rows: Record<string, unknown>[]): string[] {
    const cached = this.columnCache.get(key);
    if (cached) return cached;
    const cols = rows.length ? Object.keys(rows[0]) : [];
    this.columnCache.set(key, cols);
    return cols;
  }
  carrierRowCount(): number {
    return (this.carrierBands() ?? []).reduce((a, b) => a + b.rows.length, 0);
  }

  fullText(v: unknown): string {
    if (v === null || v === undefined) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  cellText(v: unknown): string {
    if (v === null || v === undefined) return '—';
    const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return t.length > 220 ? t.slice(0, 220) + '…' : t;
  }
  isArabic(v: unknown): boolean {
    return typeof v === 'string' && /[\u0600-\u06FF]/.test(v);
  }

  private loadStudyGrid(surahId: number) {
    this.units.set([]); this.loadingPassages.set(true);
    this.svc.studyGrid(surahId).subscribe({
      next: (g) => { this.units.set(g.units ?? []); this.loadingPassages.set(false); },
      error: () => { this.units.set([]); this.loadingPassages.set(false); },
    });
  }
  openSurah(s: Surah) { this.router.navigate(['/cybernetics/map', s.id]); }

  onPassageCard(u: StudyUnit, pnode: CybNodeTree | undefined) {
    if (pnode && pnode.children.length) this.router.navigate(['/cybernetics/map', this.surahId(), u.passage_no]);
    else this.router.navigate(['/quran/surahs', this.surahId(), 'study', u.passage_no]);
  }

  private loadVerseRoots() {
    const sid = this.surahId(); const pno = this.passageNo();
    if (!sid || !pno) { this.verseRoots.set([]); return; }
    this.verseRoots.set([]); this.rootGlosses.set(null);
    this.svc.passageRoots(sid, pno).subscribe({
      next: (r) => { this.verseRoots.set(r); this.loadRootGlosses(r.map((x) => x.root)); },
      error: () => { this.verseRoots.set([]); this.rootGlosses.set(new Map()); },
    });
  }

  private loadRootGlosses(roots: string[]) {
    if (!roots.length) { this.rootGlosses.set(new Map()); return; }
    this.svc.rootGlosses(roots).subscribe({
      next: (g) => {
        const m = new Map<string, RootGloss>();

        for (const r of g.roots) {
          if (r.root_normalized) m.set(r.root_normalized, r);
          if (r.root_text) m.set(r.root_text, r);
        }
        this.rootGlosses.set(m);
      },
      error: () => this.rootGlosses.set(new Map()),
    });
  }
  glossFor(rn: string): RootGloss | undefined { return this.rootGlosses()?.get(rn); }

  pctLabel(n: CybNode | null | undefined): string {
    return this.measured(n, 'build') ? `${n!.build_pct}%` : '—';
  }

  cybNodeForRoot(rn: string): CybNodeTree | undefined {
    const pieces = this.flat().filter((n) => n.scale === 'piece' && this.rootNorm(n) === rn);
    return pieces.find((n) => n.piece_kind === 'root') ?? pieces[0];
  }

  openRootNorm(rn: string) {
    this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(),
                          this.streamParam() ?? 'vocabulary', rn]);
  }
  openRoot(n: CybNode) { this.openRootNorm(this.rootNorm(n)); }

  goSurahs()  { this.router.navigate(['/cybernetics/map']); }
  goSurah()   { this.router.navigate(['/cybernetics/map', this.surahId()]); }
  goPassage() { this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo()]); }
  goStream()  { this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(), this.streamParam()]); }

  selectLayer(sub: string) {
    this.rootTab.set('layers');
    const rn = this.rootParam();
    if (this.selLayer() === sub) { this.selLayer.set(null); this.subRows.set(null); return; }
    this.selLayer.set(sub); this.subRows.set(null);
    if (!rn) return;
    this.svc.rootRows(rn, sub).subscribe({
      next: (r) => this.subRows.set(r.carriers),
      error: () => this.subRows.set([]),
    });
  }
  showAllLayers() { this.selLayer.set(null); this.subRows.set(null); this.rootTab.set('layers'); }
  showAllMemlets() { this.selMemletKind.set(null); this.rootTab.set('memlets'); }
  showAllQuestions() { this.selQuestionKind.set(null); this.rootTab.set('questions'); }

  paneTitle(): string {
    const t = this.rootTab();
    if (t === 'layers') return this.selLayer() ? `Carrier · ${this.selLayer()}` : 'Pick a sub-layer to read its carrier';
    if (t === 'memlets') return this.selMemletKind() ? `Memlet · ${this.selMemletKind()}` : 'All memlets · the Membean page';
    return this.selQuestionKind() ? `Questions · ${this.selQuestionKind()}` : 'All questions · the bank';
  }
  selectMemletKind(k: string) { this.selMemletKind.set(k); this.rootTab.set('memlets'); }
  selectQuestionKind(k: string) { this.selQuestionKind.set(k); this.rootTab.set('questions'); }

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

  mediaFor(key: string): RootMedia[] {
    return (this.rootDetail()?.media ?? []).filter((m) => m.memlet_key === key);
  }
  mediaIcon(kind: string): string {
    return kind === 'image' ? '🖼' : kind === 'video' ? '🎬' : kind === 'audio' ? '🔊' : '📎';
  }

  panelsFor(col: 'l' | 'r'): { key: string; en: string; ar: string; items: RootMemlet[] }[] {
    const d = this.rootDetail();
    if (!d) return [];
    const sel = this.selMemletKind();
    return MEMBEAN_PANELS.filter((p) => p.col === col && (!sel || p.key === sel))
      .map((p) => ({ key: p.key, en: p.en, ar: p.ar, items: d.memlets.filter((m) => m.memlet_key === p.key) }))
      .filter((x) => x.items.length);
  }

  otherMemlets(): RootMemlet[] {
    const d = this.rootDetail();
    if (!d) return [];
    const known = new Set(MEMBEAN_PANELS.map((p) => p.key));
    return d.memlets.filter((m) => !known.has(m.memlet_key));
  }
  memletsN(): number { return this.rootDetail()?.memlets.length ?? 0; }
  questionsN(): number { return this.rootDetail()?.questions.length ?? 0; }

  streamLabelKey(key: string): { ar: string; en: string; hint: string } {
    const l = this.layerRegistry().find((x) => x.layer_key === key);
    return {
      ar: l?.name_ar ?? '',
      en: l?.name_en ?? key.replace(/_/g, ' '),
      hint: l?.hint ?? 'declared by the control plane',
    };
  }
  streamLabel(n: CybNode) { return this.streamLabelKey(n.layer ?? ''); }
  streamColor(layer: string | null): string {
    return this.layerRegistry().find((x) => x.layer_key === layer)?.color_hex ?? 'var(--gold-d)';
  }

  openable(r: StreamRow): boolean { return true; }
  drillLayer(layer: string) {
    this.router.navigate(['/cybernetics/map', this.surahId(), this.passageNo(), layer]);
  }
  crumbLabel(n: CybNode): string {
    if (n.scale === 'passage') return (n.target_ref ?? '').replace(/^QR:SP:/, '');
    if (n.scale === 'stage') return this.streamLabel(n).en;
    if (n.piece_kind === 'root') return this.rootNorm(n);
    return n.layer ?? n.target_ref ?? n.id;
  }
  rootNorm(n: CybNode): string { return (n.target_ref ?? '').split(':').pop() ?? n.id; }
  short(sub: string): string { return sub.split('-').pop() ?? sub; }

  setRootView(v: 'reader' | 'audit') {
    if (this.rootView() === v) return;
    this.rootView.set(v);
    const rn = this.rootParam();
    if (v === 'reader') this.loadDsSpec(rn);
    else this.loadAudit(rn);
  }

  private loadAudit(rn: string | null) {
    if (!rn || this.auditLoadedFor === rn) return;
    this.auditLoadedFor = rn;
    this.svc.rootDetail(rn).subscribe({ next: (d) => this.rootDetail.set(d), error: () => {} });

    this.svc.rootSenses(rn).subscribe({
      next: (b) => this.senseBundle.set(b),
      error: () => this.senseBundle.set({ root: rn, senses: [], arcs: [], steps: [], attestations: [] }),
    });
    this.loadRootFill(rn);
  }

  private loadDsSpec(root: string | null) {

    if (!root) return;
    if (this.dsLoadedFor === root && this.dsSpec()) return;
    this.dsLoadedFor = root;
    this.dsSpec.set(null);
    this.dsError.set(null);
    this.api
      .getData<DisplaySpec>('core', ['ds', 'root', root], { params: { form: 'desktop' } })
      .subscribe({

        next: (spec) => this.dsSpec.set(normaliseSpec(spec)),
        error: (e) =>
          this.dsError.set(
            `Could not read the display spec for ${root}. (${String(e?.message ?? e)})`,
          ),
      });
  }

}
