import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

interface AlChunk {
  id: string;
  source_slug: string | null;
  chunk_kind: string | null;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  surah_no: number | null;
  ayah_start: number | null;
  ayah_end: number | null;
  source_url: string | null;
}

interface VectorLink {
  id: string;
  target_db: string;
  target_table: string;
  target_id: string;
  work_id: string | null;
  scholar_id: string | null;
  chunk_kind: string | null;
  source_slug: string | null;
  surah_no: number | null;
  ayah_start: number | null;
  ayah_end: number | null;
}

function parseAyah(url: URL): { surah: number | null; ayah: number | null } {
  const surah = parseInt(url.searchParams.get('surah') || '');
  const ayah  = parseInt(url.searchParams.get('ayah')  || '');
  return {
    surah: isNaN(surah) ? null : surah,
    ayah:  isNaN(ayah)  ? null : ayah,
  };
}

function extractSourceUrl(metaJson: string | null): string | null {
  if (!metaJson) return null;
  try {
    const m = JSON.parse(metaJson);
    return m?.source_url ?? m?.locator?.source_url ?? null;
  } catch {
    return null;
  }
}

function extractSourceSlug(metaJson: string | null): string | null {
  if (!metaJson) return null;
  try {
    const m = JSON.parse(metaJson);
    return m?.source_slug ?? null;
  } catch {
    return null;
  }
}

export function sourceRagRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/source-rag/bundle', async (req, env) => {
    const url  = new URL(req.url);
    const { surah, ayah } = parseAyah(url);
    if (!surah) return badRequest('surah param required');

    const kindsParam = url.searchParams.get('kinds');
    const kinds = kindsParam
      ? kindsParam.split(',').map(k => k.trim()).filter(Boolean)
      : ['lexical_entry', 'lexical_word_entry', 'irab', 'irab_tafsir', 'semantic', 'balagha_concept'];

    const ayahCondition = ayah !== null
      ? 'AND ayah_start <= ? AND ayah_end >= ?'
      : '';
    const ayahParams: number[] = ayah !== null ? [ayah, ayah] : [];

    const kindPlaceholders = kinds.map(() => '?').join(',');
    const alSql = `
      SELECT id, chunk_kind, heading_norm, text_ar, text_en,
             page_no, volume_no, meta_json,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_source_chunk
      WHERE surah_no = ? ${ayahCondition}
        AND chunk_kind IN (${kindPlaceholders})
        AND is_embedded = 1
      ORDER BY chunk_kind, ayah_start
      LIMIT 100
    `;
    const alParams: (number | string)[] = [surah, ...ayahParams, ...kinds];

    const tafsirSql = `
      SELECT id, target_db, target_table, target_id,
             work_id, scholar_id, chunk_kind, source_slug,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_infra_vector
      WHERE surah_no = ? ${ayahCondition}
        AND target_table = 'qr_tafsir_entry'
      ORDER BY work_id, ayah_start
      LIMIT 100
    `;

    const transSql = `
      SELECT id, target_db, target_table, target_id,
             work_id, scholar_id, chunk_kind, source_slug,
             surah_no, ayah_start, ayah_end
      FROM ar_ling_infra_vector
      WHERE surah_no = ? ${ayahCondition}
        AND chunk_kind = 'translation'
      ORDER BY source_slug, ayah_start
      LIMIT 50
    `;

    const [alRes, tafsirRes, transRes] = await Promise.all([
      env.DB_AL.prepare(alSql).bind(...alParams).all<Record<string, unknown>>(),
      env.DB_AL.prepare(tafsirSql).bind(surah, ...ayahParams).all<VectorLink>(),
      env.DB_AL.prepare(transSql).bind(surah, ...ayahParams).all<VectorLink>(),
    ]);

    const alChunks: AlChunk[] = alRes.results.map(r => ({
      id:           r.id as string,
      source_slug:  extractSourceSlug(r.meta_json as string | null),
      chunk_kind:   r.chunk_kind as string | null,
      heading_norm: r.heading_norm as string | null,
      text_ar:      r.text_ar as string,
      text_en:      r.text_en as string | null,
      page_no:      r.page_no as number | null,
      volume_no:    r.volume_no as number | null,
      surah_no:     r.surah_no as number | null,
      ayah_start:   r.ayah_start as number | null,
      ayah_end:     r.ayah_end as number | null,
      source_url:   extractSourceUrl(r.meta_json as string | null),
    }));

    return ok({
      surah,
      ayah,
      al_chunks:        alChunks,
      al_chunks_count:  alChunks.length,
      tafsir_refs:      tafsirRes.results,
      tafsir_count:     tafsirRes.results.length,
      translation_refs: transRes.results,
      trans_count:      transRes.results.length,
    });
  });
}
