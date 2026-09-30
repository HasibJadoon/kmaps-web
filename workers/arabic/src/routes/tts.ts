import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArabicEnv } from '../env';
import { ttsClips, ttsHash, ttsKey } from '../lib/tts';

// ── Rendered voice for text-only drills ──────────────────────────────────────
//   GET  /ar/practice/tts?text=…&text=…      (public, like the rest of /ar/practice)
//        the clips there are for these texts: { clips: { <text>: { hash, audio, words } }, missing: [text] }
//   POST /ar/practice/tts  { texts: [...], source?: 'arc_rung' | 'gram_example' | … }
//        the same, and every text with no clip yet is queued (ar_tts_request) for the
//        render script (kmaps-resources scripts/tts/silma_clips.py export-al → render → publish)
// Qurʾān text is not voiced here: it has the recitation; the script skips it.

export function ttsRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/practice/tts', async (req, env) => {
    const texts = new URL(req.url).searchParams.getAll('text').slice(0, 100);
    if (!texts.length) return badRequest('text is required');
    const clips = await ttsClips(env, texts);
    return ok({ clips: Object.fromEntries(clips), missing: texts.filter((t) => !clips.has(t)) });
  });

  router.post('/ar/practice/tts', async (req, env) => {
    const body = await req.json().catch(() => null) as { texts?: unknown; source?: unknown } | null;
    const texts = Array.isArray(body?.texts) ? (body!.texts as unknown[]).filter((t): t is string => typeof t === 'string' && !!t.trim()).slice(0, 200) : [];
    if (!texts.length) return badRequest('texts is required');
    const source = typeof body?.source === 'string' ? body.source.slice(0, 40) : 'request';
    const clips = await ttsClips(env, texts);
    const missing = texts.filter((t) => !clips.has(t) && t.length <= 600);
    if (missing.length) {
      const stmts = await Promise.all(missing.map(async (t) => env.DB_AR.prepare(
        `INSERT OR IGNORE INTO ar_tts_request (text_hash, text_ar, source) VALUES (?, ?, ?)`).bind(await ttsHash(t), ttsKey(t), source)));
      await env.DB_AR.batch(stmts);
    }
    return ok({ clips: Object.fromEntries(clips), missing, queued: missing.length });
  });
}
