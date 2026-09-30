import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

// ── A voice for Arabic nobody recorded (ar_tts_clip, migration 0025) ─────────
// A clip is keyed by the text it speaks: sha1 of the text as shown — NFC, runs of
// white space as one space, trimmed. kmaps-resources scripts/tts/silma_clips.py
// hashes the same way when it renders, so a drill finds its audio by hashing its
// own text. words_json times each white-space token of that text inside the clip.

export const ttsKey = (text: string) => text.replace(/\s+/g, ' ').trim().normalize('NFC');

export async function ttsHash(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(ttsKey(text)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TtsClip {
  hash: string;
  audio: { url: string; start: number; end: number };
  words: Array<{ t: string; s: number; e: number }>;
  voice: string;
}

type Row = { text_hash: string; text_ar: string; object_key: string; duration_sec: number; words_json: string; voice: string };

export const audioUrl = (key: string) => `/api/ar/audio/${encodeURI(key)}`;

/// The clips for these texts, by the text asked for; a text with none is absent.
export async function ttsClips(env: ArabicEnv, texts: string[]): Promise<Map<string, TtsClip>> {
  const byHash = new Map<string, string>();
  for (const t of texts) if (t && t.trim()) byHash.set(await ttsHash(t), t);
  const hashes = [...byHash.keys()];
  const out = new Map<string, TtsClip>();
  for (let i = 0; i < hashes.length; i += 90) {
    const part = hashes.slice(i, i + 90);
    const rows = await query<Row>(env.DB_AR,
      `SELECT text_hash, text_ar, object_key, duration_sec, words_json, voice FROM ar_tts_clip WHERE text_hash IN (${part.map(() => '?').join(',')})`, part);
    for (const r of rows) {
      let times: Array<[number, number]> = [];
      try { times = JSON.parse(r.words_json); } catch { times = []; }
      const toks = r.text_ar.trim().split(/\s+/);
      out.set(byHash.get(r.text_hash)!, {
        hash: r.text_hash, voice: r.voice,
        audio: { url: audioUrl(r.object_key), start: 0, end: r.duration_sec },
        words: toks.map((t, k) => ({ t, s: times[k]?.[0] ?? 0, e: times[k]?.[1] ?? r.duration_sec })),
      });
    }
  }
  return out;
}
