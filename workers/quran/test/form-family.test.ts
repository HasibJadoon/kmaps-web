// A word's verb-form family from its own shape against the root's letters — how a root's expressions are grouped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formFamilyOf } from '../src/lib/form-family';

test("جدل's expression words fall in their families", () => {
  const has = new Set(['iii'] as const);
  const cases: Array<[string, string]> = [
    ['جَدَّلَ', 'ii'], ['مُجَدَّل', 'ii'], ['جَادَلَ', 'iii'], ['جِدَال', 'iii'], ['مُنْجَدِل', 'vii'],
    ['جَدِيلَة', 'i'], ['جَدَّال', 'i'], ['جَدْوَل', 'i'], ['جَدْلَاء', 'i'], ['مَجْدُول', 'i'], ['مِجْدَل', 'i'],
    ['جَٰدَلُ', 'iii'], ['اِجْتِدَالٌ', 'viii'], ['تَجَدَّلَ', 'v'], ['أَجْدَلُ', 'i'], ['جَادِلٌ', 'i'],
  ];
  for (const [w, f] of cases) assert.equal(formFamilyOf(w, 'جدل', has), f, w);
});

test('فِعَال is Form III only when the root has a Form III verb; أَفْعَلَ is Form IV only as a verb', () => {
  assert.equal(formFamilyOf('كِتَاب', 'كتب'), 'i');
  assert.equal(formFamilyOf('أَنْزَلَ', 'نزل'), 'iv');
  assert.equal(formFamilyOf('إِنْزَال', 'نزل'), 'iv');
  assert.equal(formFamilyOf('اِسْتَغْفَرَ', 'غفر'), 'x');
  assert.equal(formFamilyOf('تَفَاعُل', 'فعل'), 'vi');
});
