import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { QuranEnv } from '../env';
import { withIraabBlockLabels } from '../lib/display-labels';

type BlockRow = {
  id: string;
  source_id: string | null;
  source_chunk_id: string | null;
  source_entry_id: string | null;
  source_slug: string;
  book_title: string | null;
  author: string | null;
  surah_no: number | null;
  ayah_no: number | null;
  ayah_to: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  ayah_keys_json: string | null;
  is_grouped: number;
  word_index: number | null;
  word_text: string | null;
  phrase_text: string | null;
  scope_type: string | null;
  block_type: string;
  block_subtype: string | null;
  display_order: number;
  title_ar: string | null;
  title_en: string | null;
  text_ar: string | null;
  text_en: string | null;
  raw_text: string | null;
  tags_json: string | null;
  grammar_tags_json: string | null;
  sarf_tags_json: string | null;
  balagha_tags_json: string | null;
  quran_refs_json: string | null;
  backlinks_json: string | null;
  related_links_json: string | null;
  external_resource_json: string | null;
  confidence: string | null;
  review_status: string;
  extraction_method: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
};

const parseArr = <T = unknown>(s: string | null): T[] => {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
const parseObj = <T extends object>(s: string | null): T => {
  if (!s) return {} as T;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : ({} as T); } catch { return {} as T; }
};
const parseOrNull = <T extends object>(s: string | null): T | null => {
  if (!s) return null;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : null; } catch { return null; }
};

type GroupResolverRow = {
  source_slug: string;
  ayah_group_key: string;
  group_start: number;
  group_end: number;
};

function hydrateBlock(r: BlockRow) {
  const {
    ayah_keys_json, tags_json, grammar_tags_json, sarf_tags_json, balagha_tags_json,
    quran_refs_json, backlinks_json, related_links_json,
    external_resource_json, meta_json, ...rest
  } = r;
  return withIraabBlockLabels({
    ...rest,
    ayah_keys: parseArr<string>(ayah_keys_json),
    tags: parseArr<string>(tags_json),
    grammar_tags: parseArr<string>(grammar_tags_json),
    sarf_tags: parseArr<string>(sarf_tags_json),
    balagha_tags: parseArr<string>(balagha_tags_json),
    quran_refs: parseArr(quran_refs_json),
    backlinks: parseArr(backlinks_json),
    related_links: parseArr(related_links_json),
    external_resource: parseOrNull(external_resource_json),
    meta: parseObj(meta_json),
  });
}

export function iraabDisplayRoutes(router: Router<QuranEnv>) {

  router.get('/qr/iraab/display/sources', (req, env) => cached(req, async () => {
    const { results } = await env.DB_QR
      .prepare(`
        SELECT s.id, s.source_slug, s.book_title_ar, s.book_title_en,
               s.author_name_ar, s.author_name_en, s.author_period,
               s.badge_color, s.badge_glyph,
               s.short_description, s.long_description, s.cover_image_url,
               s.display_order, s.is_visible,
               (SELECT COUNT(*) FROM qr_irab_book_display_block b WHERE b.source_slug = s.source_slug) AS block_count
        FROM qr_irab_book_display_source s
        WHERE s.is_visible = 1
        ORDER BY s.display_order ASC, s.source_slug
      `).all();
    return ok({ sources: results });
  }));

  router.get('/qr/iraab/display', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const surah = parseInt(url.searchParams.get('surah') ?? '');
    const ayah  = parseInt(url.searchParams.get('ayah')  ?? '');
    const slug  = url.searchParams.get('source_slug');
    if (isNaN(surah)) return badRequest('surah param required');
    if (isNaN(ayah))  return badRequest('ayah param required');

    const groupSql = `
      SELECT DISTINCT source_slug, ayah_group_key,
             MIN(ayah_no) AS group_start, MAX(COALESCE(ayah_to, ayah_no)) AS group_end
      FROM qr_irab_book_display_block
      WHERE surah_no = ?
        AND ayah_no <= ? AND COALESCE(ayah_to, ayah_no) >= ?
        ${slug ? 'AND source_slug = ?' : ''}
        AND review_status != 'rejected'
      GROUP BY source_slug, ayah_group_key
    `;
    const groupParams: unknown[] = [surah, ayah, ayah];
    if (slug) groupParams.push(slug);
    const groupRes = await env.DB_QR.prepare(groupSql).bind(...groupParams).all<GroupResolverRow>();

    if (!groupRes.results.length) {
      return notFound('no iʿrāb display blocks for this ayah');
    }

    const groupKeys = [...new Set(groupRes.results.map((r: GroupResolverRow) => r.ayah_group_key))];
    const placeholders = groupKeys.map(() => '?').join(',');
    const blockSql = `
      SELECT * FROM qr_irab_book_display_block
      WHERE surah_no = ?
        AND ayah_group_key IN (${placeholders})
        ${slug ? 'AND source_slug = ?' : ''}
        AND review_status != 'rejected'
      ORDER BY source_slug, display_order, id
    `;
    const blockParams: unknown[] = [surah, ...groupKeys];
    if (slug) blockParams.push(slug);
    const blockRes = await env.DB_QR.prepare(blockSql).bind(...blockParams).all<BlockRow>();
    const blocks = blockRes.results.map(hydrateBlock);

    if (!blocks.length) return notFound('no display blocks');

    const blockIds: string[] = blocks.map((b: { id: string }) => b.id);
    const idPlaceholders = blockIds.map(() => '?').join(',');

    const [tagsRes, refsRes, notesRes] = await Promise.all([
      env.DB_QR.prepare(`SELECT * FROM qr_irab_book_display_tag WHERE block_id IN (${idPlaceholders})`).bind(...blockIds).all(),
      env.DB_QR.prepare(`SELECT * FROM qr_irab_book_display_ref WHERE block_id IN (${idPlaceholders})`).bind(...blockIds).all(),
      env.DB_QR.prepare(`SELECT * FROM qr_irab_book_display_note WHERE block_id IN (${idPlaceholders}) AND review_status != 'rejected'`).bind(...blockIds).all(),
    ]);

    const presentSlugs: string[] = Array.from(new Set(blocks.map((b: { source_slug: string }) => b.source_slug)));
    const slugPlaceholders = presentSlugs.map(() => '?').join(',');
    const sourcesRes = await env.DB_QR
      .prepare(`SELECT * FROM qr_irab_book_display_source WHERE source_slug IN (${slugPlaceholders}) ORDER BY display_order ASC`)
      .bind(...presentSlugs).all();

    const minStart = Math.min(...groupRes.results.map((r: GroupResolverRow) => r.group_start));
    const maxEnd   = Math.max(...groupRes.results.map((r: GroupResolverRow) => r.group_end));
    const canonical = minStart === maxEnd ? `${surah}:${minStart}` : `${surah}:${minStart}-${maxEnd}`;
    const ayahKeys: string[] = [];
    for (let a = minStart; a <= maxEnd; a++) ayahKeys.push(`${surah}:${a}`);

    return ok({
      ayah_group_key: canonical,
      surah_no: surah,
      ayah_no: minStart,
      ayah_to: maxEnd,
      ayah_keys: ayahKeys,
      requested_ayah_no: ayah,
      source_groups: groupRes.results,
      sources: sourcesRes.results,
      blocks,
      tags: tagsRes.results,
      refs: refsRes.results,
      links: [],
      notes: notesRes.results,
    });
  }));

  router.get('/qr/iraab/display/search', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const q     = url.searchParams.get('q')?.trim();
    const surah = url.searchParams.get('surah');
    const bType = url.searchParams.get('block_type');
    const slug  = url.searchParams.get('source_slug');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));
    if (!q) return badRequest('q param required');

    const where: string[] = ['qr_irab_book_display_block_fts MATCH ?'];
    const params: unknown[] = [q];
    if (surah)  { where.push('surah_no = ?');     params.push(parseInt(surah, 10)); }
    if (bType)  { where.push('block_type = ?');   params.push(bType); }
    if (slug)   { where.push('source_slug = ?');  params.push(slug); }

    const sql = `
      SELECT block_id, source_slug, surah_no, ayah_no, ayah_key, ayah_group_key, block_type,
             snippet(qr_irab_book_display_block_fts, -1, '«', '»', '…', 12) AS hit,
             bm25(qr_irab_book_display_block_fts) AS rank_score
      FROM qr_irab_book_display_block_fts
      WHERE ${where.join(' AND ')}
      ORDER BY rank_score
      LIMIT ?
    `;
    params.push(limit);
    const { results } = await env.DB_QR.prepare(sql).bind(...params).all();
    return ok({ q, hits: results });
  }));
}
