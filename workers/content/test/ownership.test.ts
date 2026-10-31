// Notes and documents are their author's: a reader sees their own and the shared ones, and only
// the author (or an admin) changes one. Someone else's private one answers as if it weren't there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../shared/src/router';
import { fakeD1 } from '../../shared/test/d1-sqlite';
import { noteRoutes } from '../src/routes/notes';
import { documentRoutes } from '../src/routes/documents';
import type { ContentEnv } from '../src/env';

const OWNER = 'CORE:OWNER', OTHER = 'CORE:OTHER', ADMIN = 'CORE:ADMIN';

function env(): ContentEnv {
  const DB_CM = fakeD1((db) => {
    db.exec(`CREATE TABLE cm_notes (note_id TEXT PRIMARY KEY, core_user_ref TEXT, note_type TEXT, title TEXT,
               body_text TEXT, passage_ref TEXT, domain TEXT, tags_json TEXT, meta_json TEXT,
               visibility TEXT DEFAULT 'private', deleted_at TEXT, created_at TEXT, updated_at TEXT)`);
    db.exec(`INSERT INTO cm_notes (note_id, core_user_ref, body_text, visibility, created_at) VALUES
               ('N:mine', '${OWNER}', 'mine', 'private', '1'), ('N:open', '${OWNER}', 'open', 'public', '2')`);
    db.exec(`CREATE TABLE cm_documents (doc_id TEXT PRIMARY KEY, core_user_ref TEXT, doc_type TEXT, title TEXT,
               title_ar TEXT, slug TEXT, language TEXT, word_count INT, reading_time_min INT,
               publication_state TEXT, policy_ref TEXT, workspace_ref TEXT, primary_source_ref TEXT,
               tags_json TEXT, meta_json TEXT, domain TEXT, subdomain TEXT, surah INT, ayah_from INT,
               ayah_to INT, passage_ref TEXT, created_at TEXT, updated_at TEXT)`);
    db.exec(`CREATE TABLE cm_blocks (block_id TEXT PRIMARY KEY, doc_id TEXT, parent_block_id TEXT, block_type TEXT,
               seq_order INT, depth INT, content_text TEXT, content_ar TEXT, attrs_json TEXT,
               annotations_json TEXT, meta_json TEXT, created_at TEXT, updated_at TEXT)`);
    db.exec(`INSERT INTO cm_documents (doc_id, core_user_ref, title, publication_state, updated_at) VALUES
               ('D:draft', '${OWNER}', 'draft', 'draft', '1'), ('D:pub', '${OWNER}', 'pub', 'published', '2')`);
  });
  return { DB_CM } as unknown as ContentEnv;
}

function app() {
  const r = new Router<ContentEnv>();
  noteRoutes(r); documentRoutes(r);
  const e = env();
  return (method: string, path: string, user: string | null, body?: unknown, role?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) headers['X-KM-User-Id'] = user;
    if (role) headers['X-KM-Role'] = role;
    return r.handle(new Request(`http://internal.k-maps.local${path}`,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), e);
  };
}

const ids = async (res: Response, key: string) =>
  ((await res.json()) as { data: Record<string, unknown>[] }).data.map((r) => r[key]).sort();

test('a reader lists their own notes and the public ones, never another\'s private note', async () => {
  const call = app();
  assert.deepEqual(await ids(await call('GET', '/cm/notes', OWNER), 'id'), ['N:mine', 'N:open']);
  assert.deepEqual(await ids(await call('GET', '/cm/notes', OTHER), 'id'), ['N:open']);
  assert.equal((await call('GET', '/cm/notes', null)).status, 401);
  assert.equal((await call('GET', '/cm/notes/N:mine', OTHER)).status, 404);
  assert.equal((await call('GET', '/cm/notes/N:open', OTHER)).status, 200);
});

test('only the author edits a note', async () => {
  const call = app();
  assert.equal((await call('PATCH', '/cm/notes/N:open', OTHER, { content_md: 'x' })).status, 404);
  assert.equal((await call('PATCH', '/cm/notes/N:mine', OTHER, { content_md: 'x' })).status, 404);
  const res = await call('PATCH', '/cm/notes/N:mine', OWNER, { content_md: 'edited' });
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { data: { content_md: string } }).data.content_md, 'edited');
});

test('documents: shared ones are read by anyone signed in, drafts by their author only', async () => {
  const call = app();
  assert.deepEqual(await ids(await call('GET', '/cm/documents', OWNER), 'doc_id'), ['D:draft', 'D:pub']);
  assert.deepEqual(await ids(await call('GET', '/cm/documents', OTHER), 'doc_id'), ['D:pub']);
  assert.deepEqual(await ids(await call('GET', '/cm/documents', ADMIN, undefined, 'admin'), 'doc_id'), ['D:draft', 'D:pub']);
  assert.equal((await call('GET', '/cm/documents/D:draft', OTHER)).status, 404);
  assert.equal((await call('GET', '/cm/documents/D:pub', OTHER)).status, 200);
  assert.equal((await call('GET', '/cm/documents/D:pub', null)).status, 401);
});

test('documents: only the author or an admin changes or deletes one', async () => {
  const call = app();
  assert.equal((await call('PATCH', '/cm/documents/D:pub', OTHER, { title: 'x' })).status, 403);
  assert.equal((await call('DELETE', '/cm/documents/D:pub?hard=true', OTHER)).status, 403);
  assert.equal((await call('DELETE', '/cm/documents/D:draft', OTHER)).status, 404);
  assert.equal((await call('POST', '/cm/documents/D:pub/blocks', OTHER, { block_type: 'p' })).status, 403);
  assert.equal((await call('DELETE', '/cm/documents/D:pub', ADMIN, undefined, 'admin')).status, 204);
});
