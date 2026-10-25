import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, unauthorized, noContent } from '../../../shared/src/response';
import { query, queryOne, execute, executeBatch } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { ContentEnv } from '../env';

interface DocNote {
  id: string;
  title: string | null;
  body: string;
  visibility: string;
  domain: string | null;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  is_pinned: number;
  tags_json: string | null;
  folder_ref: string | null;
  /** The passage this document was written against, where it has one. */
  passage_ref: string | null;
  /** The words it was written about, kept so the backlink reads on its own. */
  quote: string | null;
  /** Where the idea is in its journey (brainstorm · draft · review · published), and the piece it is a thread of. */
  stage: string | null;
  parent_ref: string | null;
  published_doc_ref: string | null;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  SELECT note_id AS id, note_type, title, body_text AS body, visibility, domain,
         surah, ayah_from, ayah_to, is_pinned, tags_json, folder_ref, deleted_at,
         passage_ref, json_extract(meta_json,'$.quote') AS quote,
         stage, parent_ref, published_doc_ref, published_at,
         created_at, updated_at
  FROM cm_notes`;

function ownerOf(req: Request): string | null {
  return req.headers.get('X-KM-User-Id');
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

/** The first stage of a shelf that has stages (or the one asked for, if it is one of them); null on a shelf without. */
async function stageForNew(env: ContentEnv, domain: string | null, asked: unknown, _owner: string): Promise<string | null> {
  if (!domain) return null;
  const rows = await query<{ stage_key: string }>(env.DB_CM, `SELECT stage_key FROM cm_note_stage WHERE domain_key = ? ORDER BY sort_order`, [domain]);
  if (!rows.length) return null;
  return typeof asked === 'string' && rows.some((r) => r.stage_key === asked) ? asked : rows[0].stage_key;
}

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'piece';

export function docSpaceRoutes(router: Router<ContentEnv>) {

  // a shelf's stages, in order (the workflow's names, hints and colours are rows)
  router.get('/cm/docspace/stages', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain');
    const rows = await query(env.DB_CM,
      `SELECT stage_key, title, title_ar, hint, empty_text, accent, icon FROM cm_note_stage ${domain ? 'WHERE domain_key = ?' : ''} ORDER BY sort_order`,
      domain ? [domain] : []);
    return ok({ stages: rows });
  });

  // Publish: the note and its threads, in order, become one read-only essay (the essay reader lays it out). Publishing
  // again updates it; the note moves to 'published' and keeps working as a note.
  router.post('/cm/docspace/:id/publish', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const note = await queryOne<{ note_id: string; title: string | null; body_text: string; tags_json: string | null; domain: string | null; published_doc_ref: string | null }>(
      env.DB_CM, `SELECT note_id, title, body_text, tags_json, domain, published_doc_ref FROM cm_notes WHERE note_id = ? AND core_user_ref = ? AND deleted_at IS NULL`, [id, owner]);
    if (!note) return notFound(`note ${id}`);
    const threads = await query<{ title: string | null; body_text: string }>(env.DB_CM,
      `SELECT title, body_text FROM cm_notes WHERE parent_ref = ? AND core_user_ref = ? AND deleted_at IS NULL ORDER BY created_at`, [id, owner]);
    const title = (note.title ?? '').trim() || (note.body_text.split('\n').find((l) => l.trim()) ?? 'Untitled').replace(/^#+\s*/, '').slice(0, 120);
    const md = [note.body_text.trim(), ...threads.map((t) => `## ${(t.title ?? '').trim() || 'Thread'}\n\n${t.body_text.trim()}`)].filter(Boolean).join('\n\n');
    if (!md.trim()) return badRequest('Nothing to publish yet — write something first.');
    const docId = note.published_doc_ref ?? typedId('CM');
    const slug = `${slugify(title)}-${docId.slice(-6).toLowerCase()}`;
    const words = md.split(/\s+/).length;
    await executeBatch(env.DB_CM, [
      { sql: `INSERT INTO cm_documents (doc_id, core_user_ref, doc_type, title, slug, language, word_count, reading_time_min, publication_state, tags_json, meta_json, domain)
              VALUES (?, ?, 'essay', ?, ?, 'en', ?, ?, 'published', ?, ?, ?)
              ON CONFLICT (doc_id) DO UPDATE SET title = excluded.title, word_count = excluded.word_count, reading_time_min = excluded.reading_time_min,
                publication_state = 'published', tags_json = excluded.tags_json, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
        params: [docId, owner, title, slug, words, Math.max(1, Math.round(words / 220)), note.tags_json ?? '[]', JSON.stringify({ source_note: id, kicker: 'Worldview' }), note.domain] },
      { sql: `DELETE FROM cm_blocks WHERE doc_id = ? AND block_type = 'markdown'`, params: [docId] },
      { sql: `INSERT INTO cm_blocks (block_id, doc_id, block_type, seq_order, content_text) VALUES (?, ?, 'markdown', 0, ?)`, params: [typedId('CB'), docId, md] },
      { sql: `UPDATE cm_notes SET stage = 'published', published_doc_ref = ?, published_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE note_id = ? AND core_user_ref = ?`, params: [docId, id, owner] },
    ]);
    return ok({ docId, slug, title, words });
  });

  // Unpublish: the essay stops being a finished read; the note goes back to review.
  router.post('/cm/docspace/:id/unpublish', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const note = await queryOne<{ published_doc_ref: string | null }>(env.DB_CM, `SELECT published_doc_ref FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`, [id, owner]);
    if (!note) return notFound(`note ${id}`);
    await executeBatch(env.DB_CM, [
      ...(note.published_doc_ref ? [{ sql: `UPDATE cm_documents SET publication_state = 'draft', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE doc_id = ? AND core_user_ref = ?`, params: [note.published_doc_ref, owner] }] : []),
      { sql: `UPDATE cm_notes SET stage = 'review', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE note_id = ? AND core_user_ref = ?`, params: [id, owner] },
    ]);
    return ok({ id, stage: 'review' });
  });

  interface FolderRow {
    id: string; parent_ref: string | null; name: string;
    color: string | null; sort_order: number; created_at: string; updated_at: string;
  }
  const SELECT_FOLDER = `
    SELECT id, parent_ref, name, color, sort_order, created_at, updated_at
    FROM cm_folders`;

  router.get('/cm/docspace/folders', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const folders = await query<FolderRow>(
      env.DB_CM,
      `${SELECT_FOLDER} WHERE core_user_ref = ? ORDER BY sort_order, name COLLATE NOCASE`,
      [owner],
    );
    return ok({ folders });
  });

  // the library's shelves (cm_note_domain), each with how many of the reader's notes it holds
  router.get('/cm/docspace/domains', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const domains = await query<{ domain_key: string; title: string; title_ar: string | null; subtitle: string | null;
                                   accent: string; icon: string | null; count: number }>(
      env.DB_CM,
      `SELECT d.domain_key, d.title, d.title_ar, d.subtitle, d.accent, d.icon,
              (SELECT COUNT(*) FROM cm_notes n WHERE n.domain = d.domain_key AND n.core_user_ref = ? AND n.deleted_at IS NULL) AS count
         FROM cm_note_domain d WHERE d.status = 'live' ORDER BY d.sort_order`,
      [owner],
    );
    return ok({ domains });
  });

  // A shelf's categories, each with the owner's notes in it (a note joins one through meta_json.category), in the
  // shelf's own order; a category with no notes is left out. The shelf draws these headings and nothing else decides
  // them (owner, 2026-10-25: the Arabic Reading shelf grouped by category).
  router.get('/cm/docspace/groups', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const domain = new URL(req.url).searchParams.get('domain') ?? '';
    const rows = await query<{ group_key: string; title: string; title_ar: string | null; icon: string | null;
                               accent: string | null; note_id: string }>(
      env.DB_CM,
      `SELECT g.group_key, g.title, g.title_ar, g.icon, g.accent, n.note_id
         FROM cm_note_group g
         JOIN cm_notes n ON n.domain = g.domain_key AND json_extract(n.meta_json, '$.category') = g.group_key
                        AND n.core_user_ref = ? AND n.deleted_at IS NULL
        WHERE g.domain_key = ?
        ORDER BY g.sort_order, n.updated_at DESC`,
      [owner, domain],
    );
    const groups: { key: string; title: string; titleAr: string | null; icon: string | null; accent: string | null; noteIds: string[] }[] = [];
    for (const r of rows) {
      let g = groups.find((x) => x.key === r.group_key);
      if (!g) { g = { key: r.group_key, title: r.title, titleAr: r.title_ar, icon: r.icon, accent: r.accent, noteIds: [] }; groups.push(g); }
      g.noteIds.push(r.note_id);
    }
    return ok({ groups });
  });

  router.post('/cm/docspace/folders', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }
    const name = String(b['name'] ?? '').trim();
    if (!name) return badRequest('name is required');
    const id = typedId('CF');
    await execute(
      env.DB_CM,
      `INSERT INTO cm_folders (id, core_user_ref, parent_ref, name, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
      [id, owner, (b['parent_ref'] as string | null) ?? null, name,
       (b['color'] as string | null) ?? null, intOrNull(b['sort_order']) ?? 0],
    );
    const row = await queryOne<FolderRow>(env.DB_CM, `${SELECT_FOLDER} WHERE id = ?`, [id]);
    return created(row);
  });

  router.patch('/cm/docspace/folders/:fid', async (req, env, { fid }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }
    const sets: string[] = [];
    const params: unknown[] = [];
    if (b['name'] !== undefined) { sets.push('name = ?'); params.push(String(b['name'])); }
    if (b['parent_ref'] !== undefined) { sets.push('parent_ref = ?'); params.push((b['parent_ref'] as string | null) ?? null); }
    if (b['color'] !== undefined) { sets.push('color = ?'); params.push((b['color'] as string | null) ?? null); }
    if (b['sort_order'] !== undefined) { sets.push('sort_order = ?'); params.push(intOrNull(b['sort_order']) ?? 0); }
    if (!sets.length) return badRequest('No fields to update');
    sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`);
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_folders SET ${sets.join(', ')} WHERE id = ? AND core_user_ref = ?`,
      [...params, fid, owner],
    );
    if (!res.meta.changes) return notFound(`folder ${fid}`);
    const row = await queryOne<FolderRow>(env.DB_CM, `${SELECT_FOLDER} WHERE id = ?`, [fid]);
    return ok(row);
  });

  router.delete('/cm/docspace/folders/:fid', async (req, env, { fid }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');

    const all = await query<{ id: string; parent_ref: string | null }>(
      env.DB_CM, `SELECT id, parent_ref FROM cm_folders WHERE core_user_ref = ?`, [owner]);
    const owned = new Set(all.map(f => f.id));
    if (!owned.has(fid)) return notFound(`folder ${fid}`);
    const toDelete = new Set<string>([fid]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of all) {
        if (f.parent_ref && toDelete.has(f.parent_ref) && !toDelete.has(f.id)) {
          toDelete.add(f.id); grew = true;
        }
      }
    }
    const ids = [...toDelete];
    const placeholders = ids.map(() => '?').join(',');
    await executeBatch(env.DB_CM, [
      { sql: `UPDATE cm_notes SET folder_ref = NULL WHERE core_user_ref = ? AND folder_ref IN (${placeholders})`, params: [owner, ...ids] },
      { sql: `DELETE FROM cm_folders WHERE core_user_ref = ? AND id IN (${placeholders})`, params: [owner, ...ids] },
    ]);
    return noContent();
  });

  router.get('/cm/docspace', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const surah = intOrNull(url.searchParams.get('surah'));
    const scope = url.searchParams.get('visibility');
    const q = url.searchParams.get('q')?.trim();

    const where: string[] = [];
    const params: unknown[] = [];
    if (scope === 'public') {
      where.push(`visibility = 'public'`);
    } else if (scope === 'workspace') {
      where.push(`visibility = 'workspace'`);
    } else {
      where.push(`core_user_ref = ?`);
      params.push(owner);
    }
    if (domain) { where.push(`domain = ?`); params.push(domain); }
    if (surah !== null) { where.push(`surah = ?`); params.push(surah); }
    const stage = url.searchParams.get('stage');
    if (stage) { where.push(`stage = ?`); params.push(stage); }
    const parent = url.searchParams.get('parent');
    if (parent) { where.push(`parent_ref = ?`); params.push(parent); }
    const tag = url.searchParams.get('tag')?.trim();

    if (tag) { where.push(`tags_json LIKE ?`); params.push(`%${JSON.stringify(tag)}%`); }
    if (q) {

      where.push(`(title LIKE ? OR body_text LIKE ? OR ocr_text LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (url.searchParams.get('deleted') === '1') {
      where.push(`deleted_at IS NOT NULL`);
    } else {
      where.push(`deleted_at IS NULL`);
    }

    const folder = url.searchParams.get('folder');
    if (folder === 'root') { where.push(`folder_ref IS NULL`); }
    else if (folder) { where.push(`folder_ref = ?`); params.push(folder); }

    const sort = url.searchParams.get('sort');
    const orderBy = sort === 'created' ? 'created_at DESC'
      : sort === 'title' ? 'title COLLATE NOCASE ASC'
      : 'updated_at DESC';

    const rows = await query<DocNote>(
      env.DB_CM,
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY is_pinned DESC, ${orderBy} LIMIT 500`,
      params,
    );
    return ok({ notes: rows });
  });

  router.get('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const row = await queryOne<DocNote>(
      env.DB_CM,
      `${SELECT} WHERE note_id = ? AND (core_user_ref = ? OR visibility = 'public')`,
      [id, owner],
    );
    return row ? ok(row) : notFound(`note ${id}`);
  });

  router.post('/cm/docspace', async (req, env) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const id = typedId('CM');
    const visibility = typeof b['visibility'] === 'string' ? b['visibility'] : 'private';
    await execute(
      env.DB_CM,
      `INSERT INTO cm_notes
         (note_id, core_user_ref, note_type, title, body_text, is_pinned,
          tags_json, meta_json, visibility, domain, surah, ayah_from, ayah_to, stage, parent_ref,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, '[]', '{}', ?, ?, ?, ?, ?, ?, ?,
               strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
      [
        id, owner,
        b['note_type'] === 'ink' ? 'ink' : 'note',
        (b['title'] as string | null) ?? null,
        String(b['body'] ?? ''),
        visibility,
        (b['domain'] as string | null) ?? null,
        intOrNull(b['surah']), intOrNull(b['ayah_from']), intOrNull(b['ayah_to']),
        // a new idea on a shelf that has stages starts at the first one
        await stageForNew(env, (b['domain'] as string | null) ?? null, b['stage'], owner), (b['parent_ref'] as string | null) ?? null,
      ],
    );
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return created(row);
  });

  router.patch('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (b['title'] !== undefined) { sets.push('title = ?'); params.push(b['title'] as string | null); }
    if (b['body'] !== undefined) { sets.push('body_text = ?'); params.push(String(b['body'])); }
    if (b['visibility'] !== undefined) { sets.push('visibility = ?'); params.push(String(b['visibility'])); }
    if (b['is_pinned'] !== undefined) { sets.push('is_pinned = ?'); params.push(b['is_pinned'] ? 1 : 0); }
    if (b['ocr_text'] !== undefined) { sets.push('ocr_text = ?'); params.push((b['ocr_text'] as string | null) ?? null); }
    if (b['tags'] !== undefined) {
      const tags = Array.isArray(b['tags'])
        ? (b['tags'] as unknown[]).map(String).map(t => t.trim()).filter(Boolean)
        : [];
      sets.push('tags_json = ?'); params.push(JSON.stringify(tags));
    }
    if (b['folder_ref'] !== undefined) {

      const fref = b['folder_ref'] === null ? null : String(b['folder_ref']);
      if (fref !== null) {
        const mine = await queryOne(env.DB_CM,
          `SELECT id FROM cm_folders WHERE id = ? AND core_user_ref = ?`, [fref, owner]);
        if (!mine) return badRequest('folder_ref is not your folder');
      }
      sets.push('folder_ref = ?'); params.push(fref);
    }
    if (b['stage'] !== undefined) {
      const ok2 = b['stage'] === null || await queryOne(env.DB_CM, `SELECT 1 FROM cm_note_stage WHERE stage_key = ?`, [String(b['stage'])]);
      if (!ok2) return badRequest('unknown stage');
      sets.push('stage = ?'); params.push(b['stage'] === null ? null : String(b['stage']));
    }
    if (b['parent_ref'] !== undefined) { sets.push('parent_ref = ?'); params.push((b['parent_ref'] as string | null) ?? null); }
    if (b['domain'] !== undefined) { sets.push('domain = ?'); params.push((b['domain'] as string | null) ?? null); }
    if (b['surah'] !== undefined) { sets.push('surah = ?'); params.push(intOrNull(b['surah'])); }
    if (b['ayah_from'] !== undefined) { sets.push('ayah_from = ?'); params.push(intOrNull(b['ayah_from'])); }
    if (b['ayah_to'] !== undefined) { sets.push('ayah_to = ?'); params.push(intOrNull(b['ayah_to'])); }
    if (!sets.length) return badRequest('No fields to update');
    sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`);

    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET ${sets.join(', ')} WHERE note_id = ? AND core_user_ref = ?`,
      [...params, id, owner],
    );
    if (!res.meta.changes) return notFound(`note ${id}`);
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return ok(row);
  });

  router.delete('/cm/docspace/:id', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const purge = new URL(req.url).searchParams.get('purge') === '1';
    if (purge) {
      await executeBatch(env.DB_CM, [
        { sql: `DELETE FROM cm_doc_ink WHERE note_id = ? AND note_id IN (SELECT note_id FROM cm_notes WHERE note_id = ? AND core_user_ref = ?)`, params: [id, id, owner] },
        { sql: `DELETE FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`, params: [id, owner] },
      ]);
      return noContent();
    }
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE note_id = ? AND core_user_ref = ? AND deleted_at IS NULL`,
      [id, owner],
    );
    return res.meta.changes ? noContent() : notFound(`note ${id}`);
  });

  router.post('/cm/docspace/:id/restore', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    const res = await execute(
      env.DB_CM,
      `UPDATE cm_notes SET deleted_at = NULL WHERE note_id = ? AND core_user_ref = ?`,
      [id, owner],
    );
    if (!res.meta.changes) return notFound(`note ${id}`);
    const row = await queryOne<DocNote>(env.DB_CM, `${SELECT} WHERE note_id = ?`, [id]);
    return ok(row);
  });

  const SELECT_INK = `
    SELECT ink_id AS id, note_id, page_index, kmink_json, pk_drawing_b64,
           pk_stale, width, height, updated_at
    FROM cm_doc_ink`;

  async function ownsNote(env: ContentEnv, noteId: string, owner: string): Promise<boolean> {
    const row = await queryOne<{ note_id: string }>(
      env.DB_CM,
      `SELECT note_id FROM cm_notes WHERE note_id = ? AND core_user_ref = ?`,
      [noteId, owner],
    );
    return !!row;
  }

  router.get('/cm/docspace/:id/ink', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    const pages = await query(env.DB_CM, `${SELECT_INK} WHERE note_id = ? ORDER BY page_index`, [id]);
    return ok({ pages });
  });

  router.put('/cm/docspace/:id/ink/:page', async (req, env, { id, page }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const pageIndex = intOrNull(page) ?? 0;
    const kmink = b['kmink_json'];
    if (kmink === undefined || kmink === null) return badRequest('kmink_json is required');
    const kminkStr = typeof kmink === 'string' ? kmink : JSON.stringify(kmink);
    const pkB64 = typeof b['pk_drawing_b64'] === 'string' ? b['pk_drawing_b64'] : null;
    const pkStale = pkB64 ? 0 : 1;

    await execute(
      env.DB_CM,
      `INSERT INTO cm_doc_ink
         (ink_id, note_id, page_index, kmink_json, pk_drawing_b64, pk_stale, width, height, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       ON CONFLICT(note_id, page_index) DO UPDATE SET
         kmink_json = excluded.kmink_json,
         pk_drawing_b64 = excluded.pk_drawing_b64,
         pk_stale = excluded.pk_stale,
         width = excluded.width,
         height = excluded.height,
         updated_at = excluded.updated_at`,
      [typedId('CM'), id, pageIndex, kminkStr, pkB64, pkStale, intOrNull(b['width']), intOrNull(b['height'])],
    );
    const row = await queryOne(env.DB_CM, `${SELECT_INK} WHERE note_id = ? AND page_index = ?`, [id, pageIndex]);
    return ok(row);
  });

  router.delete('/cm/docspace/:id/ink/:page', async (req, env, { id, page }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    const pageIndex = intOrNull(page);
    if (pageIndex === null) return badRequest('page must be an integer');
    const res = await execute(
      env.DB_CM,
      `DELETE FROM cm_doc_ink WHERE note_id = ? AND page_index = ?`,
      [id, pageIndex],
    );
    return res.meta.changes ? noContent() : notFound(`page ${pageIndex}`);
  });

  router.post('/cm/docspace/:id/ink/reorder', async (req, env, { id }) => {
    const owner = ownerOf(req);
    if (!owner) return unauthorized('Sign in required');
    if (!(await ownsNote(env, id, owner))) return notFound(`note ${id}`);
    let b: Record<string, unknown>;
    try { b = (await req.json() ?? {}) as Record<string, unknown>; }
    catch { return badRequest('Request body must be valid JSON'); }

    const order = Array.isArray(b['order']) ? (b['order'] as unknown[]).map(Number) : null;
    if (!order || order.some((n) => !Number.isInteger(n))) {
      return badRequest('order must be an array of integer page indexes');
    }
    const existing = (await query<{ page_index: number }>(
      env.DB_CM, `SELECT page_index FROM cm_doc_ink WHERE note_id = ? ORDER BY page_index`, [id],
    )).map((r) => r.page_index);

    const sameSet = order.length === existing.length &&
      [...order].sort((x, y) => x - y).every((v, i) => v === existing[i]);
    if (!sameSet) return badRequest('order must be a permutation of existing page indexes');

    const bump = existing.map((idx) => ({
      sql: `UPDATE cm_doc_ink SET page_index = page_index + 1000 WHERE note_id = ? AND page_index = ?`,
      params: [id, idx],
    }));
    const settle = order.map((oldIdx, newIdx) => ({
      sql: `UPDATE cm_doc_ink SET page_index = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE note_id = ? AND page_index = ?`,
      params: [newIdx, id, oldIdx + 1000],
    }));
    await executeBatch(env.DB_CM, [...bump, ...settle]);
    const pages = await query(env.DB_CM, `${SELECT_INK} WHERE note_id = ? ORDER BY page_index`, [id]);
    return ok({ pages });
  });
}
