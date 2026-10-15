// tree_slots: a built sentence's pillars become roles to fill, their words tiles to place; particles and
// elided parts are not asked; a tree with fewer than two parts to place gives no drill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treeSlotDrill, type TreePillar, type TermName } from '../src/routes/practice-ss';

const terms = new Map<string, TermName>([
  ['GT:pos:fil', { id: 'GT:pos:fil', name_ar: 'فعل', name_en: 'verb', badge_color: '#111' }],
  ['GT:irab_role:fail', { id: 'GT:irab_role:fail', name_ar: 'فاعل', name_en: 'agent', badge_color: '#222' }],
  ['GT:irab_role:mutaalliq', { id: 'GT:irab_role:mutaalliq', name_ar: 'متعلق', name_en: 'attachment', badge_color: '#333' }],
  ['GT:irab_role:badal', { id: 'GT:irab_role:badal', name_ar: 'بدل', name_en: 'apposition', badge_color: '#444' }],
  ['GT:harf_maani:istinafiyya', { id: 'GT:harf_maani:istinafiyya', name_ar: 'استئنافية', name_en: 'resumption', badge_color: null }],
]);
// Ghāfir 40:6's pillars as its tree holds them
const P = (order: number, label: string, ref: string, virtual = 0): TreePillar => ({ node_order: order, node_label: label, gram_term_ref: ref, is_virtual: virtual });
const pillars = [P(2, 'وَ', 'GT:harf_maani:istinafiyya'), P(3, 'حَقًّا', 'GT:irab_role:maful_mutlaq', 1), P(7, 'حَقَّتْ', 'GT:pos:fil'),
                 P(8, 'كَلِمَتُ رَبِّكَ', 'GT:irab_role:fail'), P(13, 'عَلَى الَّذِينَ كَفَرُوا', 'GT:irab_role:mutaalliq'), P(19, 'أَنَّهُمْ أَصْحَابُ النَّارِ', 'GT:irab_role:badal')];
const sent = { id: 'QR:SS:40:6:jadwal:s1', surah: 40, ayah_from: 6, ws: 1, label: 'وَكَذَلِكَ حَقَّتْ …' };

test('the pillars in order become the roles; particles and elided parts are not asked', () => {
  const d = treeSlotDrill(sent, pillars, terms, () => 0.3)!;
  assert.equal(d.interaction, 'tree_slots');
  assert.deepEqual((d.slots as Array<{ labelAr: string }>).map((s) => s.labelAr), ['فعل', 'فاعل', 'متعلق', 'بدل']);
  const tokens = d.tokens as string[]; const solution = d.solution as number[];
  // each slot's solution tile is that pillar's words
  assert.deepEqual(solution.map((t) => tokens[t]), ['حَقَّتْ', 'كَلِمَتُ رَبِّكَ', 'عَلَى الَّذِينَ كَفَرُوا', 'أَنَّهُمْ أَصْحَابُ النَّارِ']);
  // dealt out of order, never already solved
  assert.notDeepEqual(solution, [0, 1, 2, 3]);
  assert.deepEqual(d.at, { ayah: 6, word: 1 });
  assert.ok((d.srs as { resource_ref: string }).resource_ref.endsWith(sent.id));
});

test('fewer than two parts to place, or two parts with the same words, gives no drill', () => {
  assert.equal(treeSlotDrill(sent, [P(1, 'وَ', 'GT:harf_maani:istinafiyya'), P(2, 'حَقَّتْ', 'GT:pos:fil')], terms), null);
  assert.equal(treeSlotDrill(sent, [P(1, 'هُ', 'GT:pos:fil'), P(2, 'هُ', 'GT:irab_role:fail')], terms), null);
  // a role the registry does not hold is not asked
  assert.equal(treeSlotDrill(sent, [P(1, 'حَقَّتْ', 'GT:pos:fil'), P(2, 'x', 'GT:unknown:role')], terms), null);
});
