-- al-Ghalāyīnī's lessons (spine ghalayini_jami_durus) as the grammar path shows them: every one
-- with its English heading (English-primary, the Arabic kept beside it), the four headings the
-- import cut mid-word («التمييز اس», «المنادى اس», «الاستثناء هو», «المفعول به هو») made whole,
-- and «المفعول به هو», the same lesson as «المفعول به» (3:5) read twice, marked as its mirror.
UPDATE ar_lesson SET title_ar = 'التمييز'   WHERE id = 'LSN:gh:524329' AND title_ar = 'التمييز اس';
UPDATE ar_lesson SET title_ar = 'المنادى'   WHERE id = 'LSN:gh:524330' AND title_ar = 'المنادى اس';
UPDATE ar_lesson SET title_ar = 'الاستثناء' WHERE id = 'LSN:gh:2411514' AND title_ar = 'الاستثناء هو';
UPDATE ar_lesson SET title_ar = 'المفعول به', mirrors_id = 'LSN:gh:524328' WHERE id = 'LSN:gh:524327';
UPDATE ar_lesson SET title_ar = 'جمع المذكر السالم' WHERE id = 'LSN:gh:524316' AND title_ar = 'جمع المذكرالسالم';

UPDATE ar_lesson SET title_en = CASE id
  WHEN 'LSN:gh:2411498' THEN 'Declension and indeclinability'
  WHEN 'LSN:gh:524309'  THEN 'The transitive verb'
  WHEN 'LSN:gh:3353643' THEN 'The intransitive verb'
  WHEN 'LSN:gh:524311'  THEN 'Bare and augmented verbs'
  WHEN 'LSN:gh:2411500' THEN 'The two verbs of wonder (taʿajjub)'
  WHEN 'LSN:gh:3353644' THEN 'The two nūns of emphasis on the verb'
  WHEN 'LSN:gh:2411502' THEN 'Nouns ending in -ā, -āʾ and -ī (maqṣūr, mamdūd, manqūṣ)'
  WHEN 'LSN:gh:1469151' THEN 'Nouns that act like verbs'
  WHEN 'LSN:gh:2411504' THEN 'What taṣrīf means'
  WHEN 'LSN:gh:3353649' THEN 'Deriving the verbs'
  WHEN 'LSN:gh:1469152' THEN 'The verb patterns (awzān)'
  WHEN 'LSN:gh:2411505' THEN 'Conjugating the verb with the pronouns'
  WHEN 'LSN:gh:2411506' THEN 'Bare and augmented nouns'
  WHEN 'LSN:gh:524316'  THEN 'The sound masculine plural'
  WHEN 'LSN:gh:1469156' THEN 'The broken plural'
  WHEN 'LSN:gh:1469157' THEN 'The relative adjective (nisba)'
  WHEN 'LSN:gh:524317'  THEN 'The diminutive (taṣghīr)'
  WHEN 'LSN:gh:2411507' THEN 'Weak-letter change (iʿlāl)'
  WHEN 'LSN:gh:2411508' THEN 'Letter substitution (ibdāl)'
  WHEN 'LSN:gh:3353650' THEN 'The pause (waqf)'
  WHEN 'LSN:gh:524319'  THEN 'The fixed ending of the past verb'
  WHEN 'LSN:gh:524320'  THEN 'The fixed ending of the imperative'
  WHEN 'LSN:gh:1469160' THEN 'The incomplete verbs (kāna and her sisters)'
  WHEN 'LSN:gh:524325'  THEN 'The particles like the verb (inna and her sisters)'
  WHEN 'LSN:gh:524327'  THEN 'Direct object'
  WHEN 'LSN:gh:524329'  THEN 'The specifying accusative (tamyīz)'
  WHEN 'LSN:gh:2411514' THEN 'Exception (istithnāʾ)'
  WHEN 'LSN:gh:524330'  THEN 'The vocative (munādā)'
  WHEN 'LSN:gh:1469166' THEN 'Conditional particles'
  WHEN 'LSN:gh:524335'  THEN 'Particles of urging and reproach'
  WHEN 'LSN:gh:524338'  THEN 'The infinitive particles (maṣdariyya)'
  WHEN 'LSN:gh:1469167' THEN 'Particles of the future'
  WHEN 'LSN:gh:2411518' THEN 'Particles of emphasis'
  WHEN 'LSN:gh:3353653' THEN 'The two interrogative particles'
  WHEN 'LSN:gh:524339'  THEN 'Particles of wishing'
  WHEN 'LSN:gh:524340'  THEN 'The particle of hope and apprehension'
  WHEN 'LSN:gh:2411520' THEN 'The linking (redundant) particles'
  WHEN 'LSN:gh:1469168' THEN 'The particle of cause'
  WHEN 'LSN:gh:524341'  THEN 'The particle of rebuff (kallā)'
  WHEN 'LSN:gh:524342'  THEN 'The lāms'
  WHEN 'LSN:gh:524343'  THEN 'The quiescent tāʾ of the feminine'
  WHEN 'LSN:gh:1469169' THEN 'The hāʾ of pause'
  WHEN 'LSN:gh:1469170' THEN 'Particles of request'
  WHEN 'LSN:gh:1469171' THEN 'The particle of nunation (tanwīn)'
  WHEN 'LSN:gh:2411521' THEN 'The remaining particles'
  WHEN 'LSN:gh:2411523' THEN 'What governor, governed and government mean'
  WHEN 'LSN:gh:1469172' THEN 'The governor (ʿāmil)'
  WHEN 'LSN:gh:1469173' THEN 'The governed (maʿmūl)'
  WHEN 'LSN:gh:524344'  THEN 'Government (ʿamal)'
  WHEN 'LSN:gh:524345'  THEN 'The verbal noun and the verb-like adjectives at work'
  WHEN 'LSN:gh:524346'  THEN 'The verbal noun and the noun of the verbal noun at work'
  WHEN 'LSN:gh:3353654' THEN 'The active participle at work'
  WHEN 'LSN:gh:3353655' THEN 'The passive participle at work'
  WHEN 'LSN:gh:3353656' THEN 'The quasi-participle at work'
  WHEN 'LSN:gh:3353657' THEN 'The elative at work'
  WHEN 'LSN:gh:3353658' THEN 'Sentences and their kinds'
  WHEN 'LSN:gh:3353659' THEN 'The verbal sentence'
  WHEN 'LSN:gh:3353660' THEN 'The nominal sentence'
  WHEN 'LSN:gh:3353661' THEN 'Clauses with no case-position'
  ELSE title_en END
WHERE spine = 'ghalayini_jami_durus' AND title_en IS NULL;

-- the balāgha spine's lesson headings, capitalised as headings («simile» → «Simile»)
UPDATE ar_lesson SET title_en = upper(substr(title_en, 1, 1)) || substr(title_en, 2)
 WHERE spine = 'البلاغة' AND title_en IS NOT NULL AND substr(title_en, 1, 1) <> upper(substr(title_en, 1, 1));
