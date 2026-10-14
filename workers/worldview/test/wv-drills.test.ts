// What is practised in Worldview files to review once answered: every WV drill carries its card (module WV) with
// the drill kept to replay, and its wrong answers are other real entries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rhetoricDrills, arcDrills } from '../src/lib/wv-drills';

const term = (id: string, t: string, fig: string, hides: string | null, device: string | null = 'D1') => ({
  id, slug: id, term: t, lang: 'en', term_ar: null, term_ur: null, device_id: device, literal_sense: 'a picture', figurative_sense: fig,
  source_domain: null, target_domain: 'politics', register: 'general', stance: 'neutral', origin_note: null, highlights: null, hides,
  counter_term: null, tradition_id: null, al_concept_ref: null, quran_ref: null, concept_ref: null, notes_md: null, sort_order: 0,
  status: 'live', created_at: '', updated_at: '' });
const dev = (id: string, title: string) => ({ id, slug: id, title, title_ar: null, definition_en: 'def', balagha_fit: null, divergence_en: null } as never);

test('rhetoric entries become drills that file WV review cards', () => {
  const pool = [term('T1', 'melting pot', 'many peoples fused into one', 'that some never fused'),
                term('T2', 'domino theory', 'one fall brings the next', 'that states are not dominoes'),
                term('T3', 'iron curtain', 'a sealed divide', 'the traffic across it'),
                term('T4', 'arms race', 'rivals arming against each other', 'who profits')];
  const devices = [dev('D1', 'Metaphor'), dev('D2', 'Metonymy'), dev('D3', 'Simile')];
  const usages = [{ id: 'U1', rhetoric_term_id: 'T1', quote: 'America is a Melting-Pot of races', speaker: 'Zangwill', venue: null, said_on: '1908', function_note: 'coined on stage' }] as never[];
  const ds = rhetoricDrills([pool[0]] as never, pool as never, devices, usages);
  assert.deepEqual(ds.map((d) => String(d.id).split(':')[2]), ['recognise', 'reach', 'hides', 'device', 'wild']);
  for (const d of ds) {
    const opts = d.options as string[];
    assert.ok(opts.includes(String(d.answer)) && opts.length >= 3 && new Set(opts).size === opts.length, String(d.id));
    const srs = d.srs as { module: string; extra: { drill: { id: string; srs?: unknown } } };
    assert.equal(srs.module, 'WV');
    assert.equal(srs.extra.drill.id, d.id);
    assert.equal(srs.extra.drill.srs, undefined, 'the kept drill does not nest its card');
  }
  assert.match(String(ds[4].prompt), /\[ … \] of races/);
});

test('an arc phase becomes concept → passage drills', () => {
  const it = (id: string, p: string, q: string) => ({ id, prompt: p, prompt_ar: null, hint: 'Iliad', answer_cite: `Iliad ${id}`, answer_greek: null, quote: q, note: null, en: null });
  const ds = arcDrills('A1', 'homeric', 'Homer', [it('1', 'aidōs', 'shame before the host'), it('2', 'kleos', 'undying fame'), it('3', 'xenia', 'the guest-bond'), it('4', 'mēnis', 'the wrath')]);
  assert.equal(ds.length, 4);
  assert.equal(ds[0].answer, 'shame before the host');
  assert.equal((ds[0].srs as { resource_ref: string }).resource_ref, 'WV:arc:1');
});
