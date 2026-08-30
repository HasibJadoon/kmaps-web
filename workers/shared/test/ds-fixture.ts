import type Database from 'better-sqlite3';

const ROOT = 'نزل';

export function seedRegistry(db: Database.Database): void {
  db.exec(`
    CREATE TABLE ar_ling_reg_build_layer (
      layer_code TEXT, layer_key TEXT, name_ar TEXT, name_en TEXT, name_ur TEXT,
      scope_level TEXT, fill_order INTEGER, mode TEXT, note_en TEXT, status TEXT);

    CREATE TABLE ar_ling_reg_sub_layer (
      sub_code TEXT PRIMARY KEY, band INTEGER, band_key TEXT,
      band_name_ar TEXT, band_name_en TEXT,
      name_ar TEXT, name_en TEXT, name_ur TEXT,
      scope_level TEXT, discipline TEXT, default_card TEXT, produced_by TEXT,
      fill_state TEXT, carrier_state TEXT, tables_json TEXT,
      display_order INTEGER, display_icon TEXT, status TEXT);

    CREATE TABLE ar_ling_reg_table_map (
      db TEXT, table_name TEXT, sub_code TEXT, role TEXT,
      root_bind TEXT, root_bind_col TEXT, root_bind_via_json TEXT);

    CREATE TABLE ar_ling_reg_band_color (band_key TEXT, color_hex TEXT, color_name_en TEXT);

    CREATE TABLE ar_ling_roots (
      id TEXT, root_text TEXT, root_normalized TEXT, root_letters TEXT,
      root_type TEXT, weak_pattern TEXT, frequency_quran INTEGER,
      meaning_core_ar TEXT, meaning_core_en TEXT, meaning_core_ur TEXT, note_md TEXT);

    CREATE TABLE ar_ling_root_letter_slot (
      id TEXT, root_norm TEXT, slot_index INTEGER, slot_role TEXT,
      letter_ar TEXT, is_weak INTEGER, is_hamza INTEGER);

    CREATE TABLE ar_ling_root_naw_sawti (
      root_norm TEXT, radical_count INTEGER, soundness TEXT, category TEXT,
      hamza_slot TEXT, weak_letter TEXT);

    CREATE TABLE ar_ling_root_taqalib (
      id TEXT, root_norm TEXT, permutation TEXT, perm_index INTEGER,
      is_used INTEGER, used_root_id TEXT, family_size INTEGER);

    CREATE TABLE ar_ling_root_asl (
      id TEXT, root_norm TEXT, statement_ar TEXT, statement_en TEXT,
      authority_ar TEXT, death_hijri INTEGER, source_slug TEXT,
      page_ref TEXT, is_primary INTEGER, sort_order INTEGER);

    CREATE TABLE ar_ling_root_sense (
      id TEXT, root_norm TEXT, sense_key TEXT,
      gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT,
      is_core INTEGER, sort_order INTEGER, confidence REAL,
      source_slug TEXT, status TEXT, definition_md TEXT);

    CREATE TABLE ar_ling_sense_attestation (
      id TEXT, target_type TEXT, target_id TEXT, source_slug TEXT,
      quote_ar TEXT, quote_en TEXT, locator TEXT, agreement TEXT, confidence REAL);

    CREATE TABLE ar_ling_root_didd (
      id TEXT, root_norm TEXT, antonym_ar TEXT, antonym_root TEXT,
      antonym_en TEXT, relation_kind TEXT, sort_order INTEGER);

    CREATE TABLE ar_ling_learn_memlet (
      id TEXT, root_norm TEXT, memlet_key TEXT, body_en TEXT);
  `);

  const scopes = db.prepare(
    `INSERT INTO ar_ling_reg_build_layer VALUES (?,?,?,?,?,?,?,?,?,'live')`);
  scopes.run('100', 'root', 'الجذر', 'Root', 'جذر', 'root', 1, 'full', null);

  const sub = db.prepare(`INSERT INTO ar_ling_reg_sub_layer VALUES
    (?,?,?,?,?,?,?,NULL, 'root', ?, 'P', 'ingest', 'has', ?, ?, ?, ?, 'live')`);

  sub.run('00-CORE', 0, 'CORE',  'الهوية','Identity','الأصل',   'Core identity', 'SF', 'populated', '["ar_ling_roots"]',                    0,  '🧬');
  sub.run('03-ASWAT',0, 'CORE',  'الهوية','Identity','الأصوات', 'Phonology',     'SF', 'populated', '["ar_ling_root_letter_slot","ar_ling_root_naw_sawti"]', 3, '🔤');
  sub.run('06-TAQL', 0, 'CORE',  'الهوية','Identity','التقاليب','Permutation table','SF','partial', '["ar_ling_root_taqalib"]',             6,  '🔁');
  sub.run('12-ASL', 10, 'SYN',   'الدنا', 'Synthesis','الأصول', 'Attested asl',  'XC', 'partial',   '["ar_ling_root_asl"]',                12,  '🌱');
  sub.run('14-SENSE',14,'SENSE', 'المعاني','Sense',  'المعاني', 'Senses',        'DL', 'partial',   '["ar_ling_root_sense"]',              14,  '💠');
  sub.run('19-ATT', 14, 'SENSE', 'المعاني','Sense',  'الشواهد', 'Attestations',  'DL', 'unknown',   '["ar_ling_sense_attestation"]',       19,  null);
  sub.run('30-KIN', 30, 'GRAPH', 'الشبكة','Graph',   'الأضداد', 'Antonyms',      'DL', 'partial',   '["ar_ling_root_didd"]',               30,  '⇄');
  sub.run('72-MEM', 70, 'LEARN', 'الحفظ', 'Learn',   'الحافظات','Memlets',       'DL', 'unknown',   '["ar_ling_learn_memlet"]',            72,  '🧠');

  const map = db.prepare(`INSERT INTO ar_ling_reg_table_map VALUES ('km_arabic_linguistic',?,?,?,?,?,?)`);
  map.run('ar_ling_roots',             '00-CORE',  'carrier', 'direct', 'root_text', null);
  map.run('ar_ling_root_letter_slot',  '03-ASWAT', 'carrier', 'direct', 'root_norm', null);
  map.run('ar_ling_root_naw_sawti',    '03-ASWAT', 'carrier', 'direct', 'root_norm', null);
  map.run('ar_ling_root_taqalib',      '06-TAQL',  'carrier', 'direct', 'root_norm', null);
  map.run('ar_ling_root_asl',          '12-ASL',   'carrier', 'direct', 'root_norm', null);
  map.run('ar_ling_root_sense',        '14-SENSE', 'carrier', 'direct', 'root_norm', null);
  map.run('ar_ling_root_didd',         '30-KIN',   'carrier', 'direct', 'root_norm', null);

  map.run('ar_ling_sense_attestation', '19-ATT',   'carrier', 'via',
    "target_id -> ar_ling_root_sense.id WHERE target_type='sense' -> root_norm",
    JSON.stringify({ col: 'target_id', to_table: 'ar_ling_root_sense', to_col: 'id',
                     root_col: 'root_norm', where_col: 'target_type', where_val: 'sense' }));

  map.run('ar_ling_learn_memlet',      '72-MEM',   'carrier', 'unset', null, null);

  const colour = db.prepare(`INSERT INTO ar_ling_reg_band_color VALUES (?,?,?)`);
  colour.run('CORE', '#c9a24b', 'gold');
  colour.run('SYN',  '#d98c4a', 'copper');
  colour.run('GRAPH','#3f9c8f', 'teal');

  db.prepare(`INSERT INTO ar_ling_roots VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`).run(
    'AL01NZL', ROOT, ROOT, '["ن","ز","ل"]', 'trilateral', 'sound', 293,
    'هبوطُ الشيءِ ووقوعُه من عُلوّ', 'descent and befalling from a height', null);

  const slot = db.prepare(`INSERT INTO ar_ling_root_letter_slot VALUES (?,?,?,?,?,?,?)`);
  slot.run('S1', ROOT, 0, 'fa',  'ن', 0, 0);
  slot.run('S2', ROOT, 1, 'ain', 'ز', 0, 0);
  slot.run('S3', ROOT, 2, 'lam', 'ل', 1, 0);

  db.prepare(`INSERT INTO ar_ling_root_naw_sawti VALUES (?,?,?,?,?,?)`)
    .run(ROOT, 3, 'sound', 'salim', null, null);

  const perm = db.prepare(`INSERT INTO ar_ling_root_taqalib VALUES (?,?,?,?,?,?,?)`);
  [['نزل', 0, 1], ['نلز', 1, 0], ['زنل', 2, 0],
   ['زلن', 3, 0], ['لنز', 4, 0], ['لزن', 5, 1]].forEach(([p, i, used], n) =>
    perm.run(`T${n}`, ROOT, p as string, i as number, used as number, 'AL01NZL', 6));

  const asl = db.prepare(`INSERT INTO ar_ling_root_asl VALUES (?,?,?,?,?,?,?,?,?,?)`);
  asl.run('A1', ROOT, 'النُّزول: الحُطوط من عُلوّ', 'A coming down from a height',
          'ابن فارس', 395, 'maqayis', 'ج5 ص417', 1, 0);
  asl.run('A2', ROOT, 'أصل يدلّ على هُبوط', 'A root denoting descent',
          'ابن دريد', 321, 'jamhara', 'ج2 ص311', 0, 1);
  asl.run('A3', ROOT, 'قول بلا تأريخ', 'An undated statement',
          'مجهول', null, 'unknown_src', null, 0, 2);

  const sense = db.prepare(`INSERT INTO ar_ling_root_sense VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL)`);
  sense.run('SNS1', ROOT, 'descent', 'النزول من عُلوّ', 'descent from a height', null,
            1, 0, 0.95, 'maqayis', 'live');
  sense.run('SNS2', ROOT, 'hospitality', 'النُّزول ضِيافةً', 'alighting as a guest', null,
            0, 2, 0.8, 'lisan_al_arab', 'draft');

  const att = db.prepare(`INSERT INTO ar_ling_sense_attestation VALUES (?,?,?,?,?,?,?,?,?)`);
  att.run('ATT1', 'sense', 'SNS1', 'maqayis', 'ومنه النزول', null, 'ج5 ص417', 'supports', 0.9);
  att.run('ATT2', 'sense', 'SNS2', 'lisan_al_arab', 'النُّزُل: ما يُهيَّأ', null, null, 'partial', 0.7);

  att.run('ATT3', 'lemma', 'SNS1', 'other_src', 'لا ينبغي أن يظهر', null, null, 'supports', 0.5);
}

export const FIXTURE_ROOT = ROOT;
