import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeGtResolver, aliasKey, latinGlossary, type GtAliasRow } from '../src/gt-resolve';

// a slice of the registry's spellings, as AL 0111 / 0121 store them
const aliases: GtAliasRow[] = [
  { alias_bare: 'مبتدأ', term_id: 'GT:irab_role:mubtada', category_key: 'irab_role' },
  { alias_bare: 'مبتدا', term_id: 'GT:irab_role:mubtada', category_key: 'irab_role' },
  { alias_bare: 'mubtada', term_id: 'GT:irab_role:mubtada', category_key: 'irab_role' },
  { alias_bare: 'خبر', term_id: 'GT:irab_role:khabar', category_key: 'irab_role' },
  { alias_bare: 'خبر', term_id: 'GT:sentence_role:khabar', category_key: 'sentence_role' },
  { alias_bare: 'mudaf_ilayh', term_id: 'GT:irab_role:mudaf_ilayh', category_key: 'irab_role' },
  { alias_bare: 'naat (daas, al-darwish, ibn ashur)', term_id: 'GT:irab_role:naat', category_key: 'irab_role' },
  { alias_bare: 'في محل رفع', term_id: 'GT:mahall:raf', category_key: 'mahall' },
  { alias_bare: 'jarr', term_id: 'GT:case:genitive', category_key: 'case' },
  { alias_bare: 'rafa_mahall', term_id: 'GT:mahall:raf', category_key: 'mahall' },
  { alias_bare: 'kasra', term_id: 'GT:irab_sign:kasra', category_key: 'irab_sign' },
  { alias_bare: 'الكسرة', term_id: 'GT:irab_sign:kasra', category_key: 'irab_sign' },
];
const slots = {
  function: ['irab_role', 'nawasikh', 'harf_maani', 'pos', 'mahall', 'case', 'balagha_maani'],
  position: ['mahall', 'case', 'mood', 'irab_sign'],
  sign: ['irab_sign'],
};
const resolve = makeGtResolver(aliases, slots);

describe('the lookup key is the stored alias_bare', () => {
  test('Arabic loses its ḥarakāt; anything else is lower-cased', () => {
    assert.equal(aliasKey('مُبْتَدَأٌ'), 'مبتدأ');
    assert.equal(aliasKey('فعل ماضٍ'), 'فعل ماض');
    assert.equal(aliasKey('  Naat (Daas, al-Darwish, Ibn Ashur) '), 'naat (daas, al-darwish, ibn ashur)');
  });
});

describe('a value resolves only through a spelling the registry holds', () => {
  test('each spelling lands on its term', () => {
    assert.equal(resolve('function', 'مبتدا'), 'GT:irab_role:mubtada');
    assert.equal(resolve('function', 'mubtada'), 'GT:irab_role:mubtada');
    assert.equal(resolve('function', 'mudaf_ilayh'), 'GT:irab_role:mudaf_ilayh');
    assert.equal(resolve('function', 'naat (Daas, al-Darwish, Ibn Ashur)'), 'GT:irab_role:naat');
    assert.equal(resolve('function', 'في محلّ رفع'), 'GT:mahall:raf');
    assert.equal(resolve('position', 'jarr'), 'GT:case:genitive');
    assert.equal(resolve('position', 'rafa_mahall'), 'GT:mahall:raf');
    assert.equal(resolve('sign', 'الكسرة'), 'GT:irab_sign:kasra');
  });
  test("the slot's categories decide between terms that share a spelling", () => {
    assert.equal(resolve('function', 'خبر'), 'GT:irab_role:khabar');
    assert.equal(makeGtResolver(aliases, { s: ['sentence_role', 'irab_role'] })('s', 'خبر'), 'GT:sentence_role:khabar');
  });
  test('nothing is guessed', () => {
    assert.equal(resolve('function', 'naat (third)'), null);       // not a stored spelling
    assert.equal(resolve('sign', 'jarr'), null);                    // not in the slot's categories
    assert.equal(resolve('nowhere', 'مبتدا'), null);                // a slot with no categories
    assert.equal(resolve('function', ''), null);
    assert.equal(resolve('function', null), null);
  });
});

describe('Latin spellings in English prose', () => {
  const rows: GtAliasRow[] = [
    { alias_bare: 'khabar', term_id: 'GT:irab_role:khabar', category_key: 'irab_role' },
    { alias_bare: 'mafʿūl bihi', term_id: 'GT:irab_role:maful_bih', category_key: 'irab_role' },
    { alias_bare: 'maṣdar', term_id: 'GT:derivation_type:masdar', category_key: 'derivation_type' },
    { alias_bare: 'kasra', term_id: 'GT:irab_sign:kasra', category_key: 'irab_sign' },
    { alias_bare: 'خبر', term_id: 'GT:irab_role:khabar', category_key: 'irab_role' },
  ];
  test('whole words in the given categories, longest first', () => {
    const g = latinGlossary(rows, ['irab_role', 'derivation_type'],
      'It is the Khabar of Ḥā Mīm; a maṣdar meaning the thing sent down, as mafʿūl bihi. The kasra …');
    assert.deepEqual(g, [
      { en: 'mafʿūl bihi', ref: 'GT:irab_role:maful_bih' },
      { en: 'khabar', ref: 'GT:irab_role:khabar' },
      { en: 'maṣdar', ref: 'GT:derivation_type:masdar' },
    ]);
  });
  test('not inside another word', () => {
    assert.deepEqual(latinGlossary(rows, ['irab_role'], 'khabarayn'), []);
  });
});
