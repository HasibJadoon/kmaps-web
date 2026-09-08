-- 004_wv_rhetoric_terms.sql
-- WGRT — WorldView Global Rhetorical Terms
--
-- Stores the figures of speech that carry worldview claims in living political
-- and journalistic English (and, over time, other languages): the surface
-- expression, the picture it is built on, what it foregrounds, and what it
-- quietly hides. The `hides` column is the analytical payload — it is what
-- turns a phrasebook into a worldview instrument.
--
-- Three tables:
--   wv_rhetoric_devices  the figure taxonomy (metaphor, kinaya, euphemism ...)
--   wv_rhetoric_terms    the concrete expressions ("olive branch", "red line")
--   wv_rhetoric_usages   attested instances, with speaker and function
--
-- Cross-domain policy (see CLAUDE.md): no canonical AL/QR data is copied here.
-- `al_concept_ref` / `quran_ref` hold typed references only (AL:<id>, QR:<id>)
-- and are left NULL until the counterpart row is bound in its owning domain.

-- ---------------------------------------------------------------- devices ---

CREATE TABLE IF NOT EXISTS wv_rhetoric_devices (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  title_ar         TEXT,
  title_ur         TEXT,
  classical_name   TEXT,
  device_family    TEXT NOT NULL DEFAULT 'trope'
                   CHECK (device_family IN ('trope','scheme','figure_of_thought','argument_move','frame')),
  definition_en    TEXT,
  al_concept_ref   TEXT,
  balagha_fit      TEXT CHECK (balagha_fit IS NULL OR balagha_fit IN ('exact','close','partial','false_friend')),
  divergence_en    TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'live',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------ terms ---

CREATE TABLE IF NOT EXISTS wv_rhetoric_terms (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  term             TEXT NOT NULL,
  lang             TEXT NOT NULL DEFAULT 'en',
  term_ar          TEXT,
  term_ur          TEXT,
  device_id        TEXT REFERENCES wv_rhetoric_devices(id),

  literal_sense    TEXT,
  figurative_sense TEXT,
  source_domain    TEXT,
  target_domain    TEXT,

  register         TEXT NOT NULL DEFAULT 'general'
                   CHECK (register IN ('general','diplomatic','journalistic','academic',
                                       'military','legal','commercial','colloquial','religious')),
  stance           TEXT NOT NULL DEFAULT 'neutral'
                   CHECK (stance IN ('neutral','persuasive','euphemistic','dysphemistic',
                                     'propagandistic','polemical')),

  origin_note      TEXT,
  highlights       TEXT,
  hides            TEXT,
  counter_term     TEXT,

  tradition_id     TEXT REFERENCES wv_traditions(id),
  al_concept_ref   TEXT,
  quran_ref        TEXT,
  concept_ref      TEXT,

  notes_md         TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'live',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------- usages ---

CREATE TABLE IF NOT EXISTS wv_rhetoric_usages (
  id                 TEXT PRIMARY KEY,
  rhetoric_term_id   TEXT NOT NULL REFERENCES wv_rhetoric_terms(id),
  quote              TEXT NOT NULL,
  speaker            TEXT,
  speaker_ref        TEXT,
  venue              TEXT,
  said_on            TEXT,
  source_url         TEXT,
  function_note      TEXT,
  is_locus_classicus INTEGER NOT NULL DEFAULT 0,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wv_rhd_family  ON wv_rhetoric_devices(device_family, sort_order);
CREATE INDEX IF NOT EXISTS idx_wv_rht_device  ON wv_rhetoric_terms(device_id);
CREATE INDEX IF NOT EXISTS idx_wv_rht_source  ON wv_rhetoric_terms(source_domain);
CREATE INDEX IF NOT EXISTS idx_wv_rht_target  ON wv_rhetoric_terms(target_domain);
CREATE INDEX IF NOT EXISTS idx_wv_rht_stance  ON wv_rhetoric_terms(stance, status);
CREATE INDEX IF NOT EXISTS idx_wv_rht_lang    ON wv_rhetoric_terms(lang, status);
CREATE INDEX IF NOT EXISTS idx_wv_rhu_term    ON wv_rhetoric_usages(rhetoric_term_id, sort_order);

-- =========================================================== seed: devices ===
-- al_concept_ref stays NULL: the balagha counterpart is named here in Arabic,
-- but the typed AL:<id> reference is bound only once the matching row exists in
-- km_arabic_linguistic (ar_ling_gram_term). Do not invent the reference.

INSERT OR IGNORE INTO wv_rhetoric_devices
  (id, slug, title, title_ar, classical_name, device_family, definition_en, balagha_fit, divergence_en, sort_order)
VALUES
 ('WV:RHD:metaphor','metaphor','Metaphor','استعارة','istiʿāra','trope',
  'Names one thing by the name of another on the strength of a likeness, with the likeness itself left unstated.',
  'close',
  'Arabic istiʿāra is defined as a tashbīh with one of its two terms suppressed, so its internal machinery (mustaʿār minhu, mustaʿār lahu, qarīna) is finer-grained than the single English label.', 10),

 ('WV:RHD:allegory','allegory','Extended metaphor / allegory','استعارة تمثيلية','istiʿāra tamthīliyya','trope',
  'Borrows a whole scene from one field and maps it piece by piece onto another, so that the parts of the picture keep working as an argument.',
  'close',
  'The Arabic term requires the borrowed image to be a composite (murakkab) transferred whole; English allegory also covers sustained narrative fiction.', 20),

 ('WV:RHD:simile','simile','Simile','تشبيه','tashbīh','trope',
  'States the likeness openly, with a particle of comparison.',
  'exact', NULL, 30),

 ('WV:RHD:metonymy','metonymy','Metonymy','كناية','kināya','trope',
  'Names a thing by something bound up with it — its instrument, its sign, its setting — rather than by a likeness.',
  'close',
  'Kināya is wider than metonymy: it covers any statement made by way of its concomitant, including what English calls periphrasis and indirection, and it keeps the literal sense available alongside the intended one.', 40),

 ('WV:RHD:synecdoche','synecdoche','Synecdoche','مجاز مرسل','majāz mursal','trope',
  'Names the whole by a part, or the part by the whole.',
  'partial',
  'Majāz mursal is the genus of all non-similarity tropes (part/whole, cause/effect, container/contained); English synecdoche picks out only its part/whole relations.', 50),

 ('WV:RHD:hyperbole','hyperbole','Hyperbole','مبالغة','mubālagha','trope',
  'Overstates in order to press a claim past what is literally credible.',
  'close',
  'Arabic grades it — tablīgh, ighrāq, ghuluww — by whether the claim stays possible in reason and in custom.', 60),

 ('WV:RHD:personification','personification','Personification','تشخيص','tashkhīṣ','trope',
  'Gives will, speech or agency to what has none — a state, a market, a nation.',
  'close', NULL, 70),

 ('WV:RHD:euphemism','euphemism','Euphemism','تلطيف','talṭīf','trope',
  'Substitutes a mild or technical expression for one that would name the harm plainly.',
  'partial',
  'Classical Arabic treats this under kināya (kināya ʿan al-makrūh) as one use of indirection rather than as a device in its own right.', 80),

 ('WV:RHD:allusion','allusion','Allusion','تلميح','talmīḥ','figure_of_thought',
  'Points at a known story, verse or figure without retelling it, and borrows its verdict.',
  'close', NULL, 90),

 ('WV:RHD:antithesis','antithesis','Antithesis','طباق ومقابلة','ṭibāq / muqābala','scheme',
  'Sets opposites against each other so that the pairing itself carries the argument.',
  'close',
  'Arabic separates ṭibāq (two opposed words) from muqābala (two opposed sets).', 100),

 ('WV:RHD:irony','irony','Irony','تهكم','tahakkum','figure_of_thought',
  'Says the opposite of what is meant, with the reversal signalled by context.',
  'close', NULL, 110),

 ('WV:RHD:framing','framing','Framing','—',NULL,'frame',
  'Selects which aspect of a situation is made salient, and thereby fixes the diagnosis and the remedy without arguing for either.',
  NULL,
  'A modern analytic category with no single classical counterpart; the balāgha tradition handles the same effect piecemeal under majāz, kināya and taqdīm wa-taʾkhīr.', 120),

 ('WV:RHD:labelling-epithet','labelling-epithet','Labelling epithet','—',NULL,'argument_move',
  'Attaches a fixed evaluative name to an actor, so that the verdict travels with every later mention.',
  NULL, NULL, 130);

-- ============================================================= seed: terms ===
-- Starter set for WGRT. Chosen so that every entry carries a live worldview
-- claim, and so that `hides` says something a dictionary gloss would not.
--
-- source_domain and target_domain are kept to a short controlled vocabulary so
-- that /wv/rhetoric/facets returns usable filter chips. The specific picture
-- ("a row of standing dominoes") belongs in literal_sense, not in the facet.
--   source_domain: nature, games, theatre, mechanics, cartography, finance,
--                  medicine, war, commerce, physics, industry, myth, urban space
--   target_domain: diplomacy, geopolitics, foreign policy, security policy, war,
--                  sovereignty, history, identity, public opinion, domestic politics

INSERT OR IGNORE INTO wv_rhetoric_terms
  (id, slug, term, lang, device_id, literal_sense, figurative_sense,
   source_domain, target_domain, register, stance, origin_note,
   highlights, hides, counter_term, sort_order)
VALUES

 ('WV:RHT:olive-branch','olive-branch','olive branch','en','WV:RHD:metonymy',
  'A cut branch of the olive tree, held out in the open hand.',
  'An offer of peace or reconciliation, extended by the stronger party or by the one who gave offence.',
  'nature','diplomacy','diplomatic','persuasive',
  'Greco-Roman: suppliants and envoys carried olive branches as a sign of peaceful intent. Reinforced in the biblical tradition by the dove returning with an olive leaf (Genesis 8:11).',
  'The gesture as voluntary, generous, and costless to accept; the one extending it as the party seeking peace.',
  'Who set the terms. A branch can be extended while the conditions attached to it are dictated — and then refusing the conditions is reported as refusing the peace.',
  'poisoned chalice; Trojan horse', 10),

 ('WV:RHT:queen-on-the-chessboard','queen-on-the-chessboard','the queen on the chessboard','en','WV:RHD:allegory',
  'In chess, the piece with the widest freedom of movement, striking along rank, file and diagonal.',
  'A state cast as the most powerful and least constrained actor on a field of rivals — in current usage most often the United States.',
  'games','geopolitics','journalistic','persuasive',
  'Part of the long chessboard frame for great-power politics, given its present currency by Cold War strategic writing and by Brzezinski''s The Grand Chessboard (1997).',
  'Reach, freedom of movement, and decisive weight relative to every other piece.',
  'Three things the board smuggles in. The queen serves a king — so who is being protected, and by whom? The pieces do not move themselves; there is a player off the board whose agency the metaphor never names. And a board is symmetrical, rule-bound and finite, while the terrain being described is none of the three.',
  'who is the player?; the board is not symmetrical', 20),

 ('WV:RHT:iron-curtain','iron-curtain','iron curtain','en','WV:RHD:metaphor',
  'The fireproof iron screen lowered across a theatre stage to seal the auditorium off from the stage.',
  'A sealed political and informational frontier dividing Soviet-controlled Europe from the West.',
  'theatre','geopolitics','journalistic','persuasive',
  'Older in German and English usage, but fixed in political vocabulary by Winston Churchill''s address at Fulton, Missouri, 5 March 1946.',
  'Impermeability, suddenness, and a single clean line of division.',
  'That the frontier was built and maintained by decisions on both sides. A curtain is an object that descends; the image spares its makers from being named.',
  NULL, 30),

 ('WV:RHT:axis-of-evil','axis-of-evil','axis of evil','en','WV:RHD:labelling-epithet',
  'An axis is the line about which a body turns; in 1939–45 usage, the alliance of Germany, Italy and Japan.',
  'A set of states named together as one hostile bloc and morally disqualified in the same breath.',
  'mechanics','foreign policy','diplomatic','propagandistic',
  'George W. Bush, State of the Union address, 29 January 2002, naming Iraq, Iran and North Korea.',
  'Coordination among the states named, and continuity with a war already agreed to have been just.',
  'That the states named were not allied, and in some cases hostile to one another. Axis supplies a coalition that does not exist; evil forecloses the question of interests before it can be asked.',
  NULL, 40),

 ('WV:RHT:red-line','red-line','red line','en','WV:RHD:metaphor',
  'A line drawn in red on a map or a page to mark a limit.',
  'A declared threshold whose crossing is said to trigger a response.',
  'cartography','security policy','diplomatic','persuasive',
  'Long-standing in diplomatic and commercial usage; ubiquitous in security discourse from the late twentieth century.',
  'Clarity, prior warning, and the automatic character of the consequence.',
  'That the line is drawn by one party, is movable, and names no consequence. A red line crossed without response converts a threat into a public demonstration that it was empty.',
  NULL, 50),

 ('WV:RHT:collateral-damage','collateral-damage','collateral damage','en','WV:RHD:euphemism',
  'In finance, collateral is property pledged alongside a loan; collateral effects are those falling to the side of the main effect.',
  'Civilians killed or injured, and civilian property destroyed, in the course of an attack aimed at something else.',
  'finance','war','military','euphemistic',
  'United States military usage, current from the Vietnam period and standard in briefing language by 1991.',
  'The unintended character of the harm, and its position outside the aim of the operation.',
  'The dead. The phrase has no agent, no human subject and no number; it turns killing into an accounting remainder and closes off the question of whether the harm was foreseen.',
  'civilian deaths', 60),

 ('WV:RHT:surgical-strike','surgical-strike','surgical strike','en','WV:RHD:metaphor',
  'An operation in which a surgeon removes diseased tissue and leaves healthy tissue intact.',
  'An attack presented as precisely bounded to its military target.',
  'medicine','war','military','euphemistic',
  'Current in Anglophone strategic writing from the 1960s, dominant in air-campaign coverage from 1991.',
  'Precision, technical expertise, and a healing intent.',
  'That surgery is consented to by the patient and performed for the patient''s good — neither of which holds here. The medical frame also lends the attacking party a physician''s authority to decide what counts as diseased.',
  NULL, 70),

 ('WV:RHT:great-game','great-game','the Great Game','en','WV:RHD:allegory',
  'A game played for high stakes between two skilled players.',
  'Nineteenth-century Anglo-Russian rivalry over Central Asia, and by extension any great-power contest over a region.',
  'games','geopolitics','journalistic','persuasive',
  'Attributed to Arthur Conolly and given wide currency by Kipling''s Kim (1901).',
  'Skill, rivalry, and the reciprocity of two well-matched players.',
  'The people living on the board. A game has players and pieces; the populations of the region enter only as pieces, and the stakes are described as the players'' rather than as theirs.',
  NULL, 80),

 ('WV:RHT:domino-theory','domino-theory','domino theory / domino effect','en','WV:RHD:allegory',
  'A row of standing dominoes, each toppling the next.',
  'The claim that one state falling to a rival ideology will cause its neighbours to fall in sequence.',
  'games','security policy','academic','persuasive',
  'Dwight Eisenhower, press conference of 7 April 1954, on Indochina.',
  'Inevitability, chain causation, and the urgency of acting at the first tile.',
  'That states are not identical, not touching, and not passive. The image supplies a mechanism where an argument is owed, and makes local causes invisible.',
  NULL, 90),

 ('WV:RHT:balance-of-power','balance-of-power','balance of power','en','WV:RHD:metaphor',
  'A pair of scales resting in equilibrium.',
  'A distribution of strength among states said to keep any one of them from dominating.',
  'mechanics','diplomacy','academic','neutral',
  'European diplomatic vocabulary from the seventeenth century onward, canonical after Utrecht (1713).',
  'Equilibrium, measurability, and self-correction.',
  'Who holds the scales. Balance language presents one preferred distribution as a natural resting state, so acting to preserve it reads as maintenance rather than as intervention.',
  NULL, 100),

 ('WV:RHT:war-on-terror','war-on-terror','war on terror','en','WV:RHD:framing',
  'War is an armed conflict between organised belligerents, ending in victory, defeat or terms.',
  'An open-ended campaign against a tactic, with no defined enemy, territory or terminal condition.',
  'war','security policy','diplomatic','propagandistic',
  'United States usage from September 2001; the construction is older in war on drugs and war on poverty.',
  'Emergency, national unity, and the legitimacy of wartime powers.',
  'That a tactic cannot surrender. With no belligerent there is no terminal condition, so the emergency powers the war frame licenses carry no built-in end.',
  NULL, 110),

 ('WV:RHT:failed-state','failed-state','failed state','en','WV:RHD:labelling-epithet',
  'A business fails when it can no longer meet its obligations and is wound up.',
  'A state judged unable to perform core functions, and thereby made a fit object of external management.',
  'commerce','sovereignty','academic','persuasive',
  'Anglophone policy literature of the 1990s.',
  'Internal causation, and the need for administration from outside.',
  'The external history — debt, sanction, partition, intervention — that produced the condition. Fail is intransitive: it assigns the fault wholly inward, and casts the outside party as receiver rather than as creditor or cause.',
  NULL, 120),

 ('WV:RHT:clash-of-civilizations','clash-of-civilizations','clash of civilizations','en','WV:RHD:metaphor',
  'Two solid bodies colliding.',
  'The thesis that conflict after the Cold War runs principally along the fault lines between cultural blocs.',
  'physics','history','academic','polemical',
  'Bernard Lewis, The Roots of Muslim Rage (1990); made into a thesis by Samuel Huntington (1993, 1996).',
  'Bloc solidity, the cultural depth of conflict, and the inevitability of friction at the edges.',
  'The argument going on inside each bloc. Treating civilisations as bodies with edges makes their self-appointed spokesmen authoritative and their dissenters invisible, and explains conflict without reference to interest or policy.',
  'clash of interests; dialogue of civilisations', 130),

 ('WV:RHT:melting-pot','melting-pot','melting pot','en','WV:RHD:metaphor',
  'A crucible in which metals are melted until their distinctness is destroyed and a single alloy is poured.',
  'A society in which incoming groups are said to fuse into one national type.',
  'industry','identity','general','persuasive',
  'Popularised by Israel Zangwill''s play The Melting Pot (1908).',
  'Unity, equality of contribution, and voluntary blending.',
  'Who fires the crucible, and at what temperature. The image makes the blending mutual when in practice the receiving majority sets the alloy — and it makes keeping a distinct identity look like a failure to melt.',
  'salad bowl; mosaic', 140),

 ('WV:RHT:trojan-horse','trojan-horse','Trojan horse','en','WV:RHD:allusion',
  'The hollow wooden horse by which Greek soldiers were carried inside the walls of Troy.',
  'Something accepted as a gift or a benign presence which carries a hostile purpose inside it.',
  'myth','security policy','journalistic','polemical',
  'Virgil, Aeneid II; in continuous political use since.',
  'Concealment, betrayal of trust, and a threat already within the walls.',
  'That the charge cannot be tested in advance. Any admitted party can be called a horse, and the accusation needs no evidence of what is inside it.',
  'olive branch', 150),

 ('WV:RHT:arab-street','arab-street','the Arab street','en','WV:RHD:metonymy',
  'The street as a public space where people gather.',
  'Arab public opinion, treated as a single volatile mass.',
  'urban space','public opinion','journalistic','polemical',
  'Anglophone journalism of the late twentieth century. No equivalent formula is used for European or American publics.',
  'Immediacy, numbers, and the volatility of feeling.',
  'Deliberation, institutions, and disagreement. Locating opinion in the street rather than in a public denies it parties, press and argument, and makes it a thing to be gauged for temperature rather than heard.',
  'Arab public opinion', 160);

-- ============================================================ seed: usages ===
-- Only attestations that can be checked against a named speech or text. An
-- entry with no verifiable locus classicus gets no usage row rather than an
-- invented one.

INSERT OR IGNORE INTO wv_rhetoric_usages
  (id, rhetoric_term_id, quote, speaker, venue, said_on, function_note, is_locus_classicus, sort_order)
VALUES
 ('WV:RHU:iron-curtain-fulton','WV:RHT:iron-curtain',
  'From Stettin in the Baltic to Trieste in the Adriatic, an iron curtain has descended across the Continent.',
  'Winston Churchill','Address at Westminster College, Fulton, Missouri (The Sinews of Peace)','1946-03-05',
  'Converts a still-contested postwar settlement into a completed fact, and locates the act of division entirely on the far side of the line.',
  1, 10),

 ('WV:RHU:axis-of-evil-sotu','WV:RHT:axis-of-evil',
  'States like these, and their terrorist allies, constitute an axis of evil, arming to threaten the peace of the world.',
  'George W. Bush','State of the Union address','2002-01-29',
  'Binds three unallied states into one enemy and imports the moral settlement of the Second World War to cover them.',
  1, 10),

 ('WV:RHU:domino-eisenhower','WV:RHT:domino-theory',
  'You have a row of dominoes set up, you knock over the first one, and what will happen to the last one is the certainty that it will go over very quickly.',
  'Dwight D. Eisenhower','Presidential press conference','1954-04-07',
  'Supplies a mechanism of inevitability in place of an argument about any particular country, and makes early intervention the only prudent move.',
  1, 10),

 ('WV:RHU:melting-pot-zangwill','WV:RHT:melting-pot',
  'America is God''s Crucible, the great Melting-Pot where all the races of Europe are melting and re-forming.',
  'Israel Zangwill','The Melting Pot, Act I','1908',
  'Sacralises assimilation: the crucible is divine, so the loss of the incoming identity is framed as consecration rather than as cost.',
  1, 10),

 ('WV:RHU:grand-chessboard-brzezinski','WV:RHT:queen-on-the-chessboard',
  'The Grand Chessboard: American Primacy and Its Geostrategic Imperatives',
  'Zbigniew Brzezinski','Book title','1997',
  'Attests the chessboard frame for Eurasian geopolitics, on which the queen formula depends. The book supplies the board and the player, not the queen line itself — recorded here as the frame''s modern anchor, not as a quotation of the term.',
  0, 10);
