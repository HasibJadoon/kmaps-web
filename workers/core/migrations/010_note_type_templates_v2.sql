-- 010_note_type_templates_v2.sql
--
-- Templates v2: Arabic, English and Urdu are separate properties.
--
-- The fields were already language-typed (text_ar, text_en, and json fields
-- carrying {ar,en,ur}). The templates then re-mixed them onto one line —
-- "{{ar}} · {{en}} · {{ur}}", "{{DnaThread.ar}} · {{DnaThread.en}}",
-- "Sense: {{construction_ar}} ×{{count}} · {{arc_en}}" — so a renderer had no
-- way to typeset each language in its own direction, face and colour. v2
-- replaces the single mustache blob with an ordered list of sections, and the
-- rule is absolute: no body string carries two languages. `meta` is
-- language-neutral apparatus — refs, counts, death years, attestation status.
--
--   section = { id, style, label:{en,ar}, when?,
--               ar?, en?, ur?, meta?, note_en?,      -- scalar bodies
--               each?, item? }                        -- list bodies, one nesting level
--
-- It also fixes a real bug: root.v1 and word.v1 stored \n where lemma.v9
-- stored a newline, so both templates parsed to a SINGLE LINE with a literal
-- backslash-n printed as text. Verified before the change:
--
--   note type          front_has_backslash   front_has_newline
--   lemma:sarf:v9               0                   35   correct
--   root:v1                     9                    0   broken
--   word:v1                    12                    0   broken
--
-- The ṣarf ṣaghīr is now declared rather than guessed: the lemma front's
-- Chain section names its six slots in the order the field states them, with
-- the markers that delimit them (فهو, والمفعول), so a renderer colours by slot
-- without parsing Arabic to find them. Colours stay in render_hints — the
-- renderer owns formatting, the record owns data, per the note types' own rule.

UPDATE core_srs_note_type SET templates_json = '{"v": 2, "front": [{"id": "verse", "style": "verse", "ar": "{{VerseAr}}"}, {"id": "verse_ref", "style": "meta", "en": "{{VerseRef}}"}, {"id": "headword", "style": "headword", "ar": "{{Headword}}"}], "back": [{"id": "meaning_arc", "style": "list", "label": {"en": "Meaning arc", "ar": "مدى المعنى"}, "each": "MeaningArc", "item": {"ar": "{{ar}}", "en": "{{en}}", "ur": "{{ur}}"}}, {"id": "in_this_verse", "style": "prose", "label": {"en": "In this verse", "ar": "في هذه الآية"}, "en": "{{InThisVerse}}"}, {"id": "near_synonyms", "style": "list", "when": "NearSynonyms", "label": {"en": "Near synonyms · furūq", "ar": "الفروق"}, "each": "NearSynonyms", "item": {"ar": "{{word}}", "en": "{{farq}}", "meta": "{{auth}}"}}, {"id": "antonyms", "style": "list", "when": "Antonyms", "label": {"en": "Antonyms · aḍdād", "ar": "الأضداد"}, "each": "Antonyms", "item": {"ar": "{{word}}", "en": "{{axis}}", "meta": "{{status}}"}}, {"id": "fluent_verse", "style": "group", "label": {"en": "The verse", "ar": "الآية"}, "ar": "{{FluentVerse.ar}}", "en": "{{FluentVerse.en}}", "ur": "{{FluentVerse.ur}}"}, {"id": "ladder", "style": "refs", "label": {"en": "Up the ladder", "ar": "السلّم"}, "refs": [{"field": "LemmaRef", "en": "Lemma", "ar": "المفردة"}, {"field": "RootRef", "en": "Root", "ar": "الجذر"}]}]}'
 WHERE id = 'NT:kmaps:word:v1';

UPDATE core_srs_note_type SET templates_json = '{"v": 2, "front": [{"id": "headword", "style": "headword", "ar": "{{Headword}}"}, {"id": "root_wazn", "style": "meta", "ar": "{{Root}} · {{Wazn}}"}, {"id": "chain", "style": "sarf_saghir", "ar": "{{Chain}}", "label": {"en": "Ṣarf ṣaghīr", "ar": "الصرف الصغير"}, "split": {"primary": "—", "secondary": "،"}, "slots": [{"key": "madi", "role": "past", "label": {"en": "past", "ar": "الماضي"}}, {"key": "mudari", "role": "present", "label": {"en": "present", "ar": "المضارع"}}, {"key": "amr", "role": "imperative", "label": {"en": "imperative", "ar": "الأمر"}}, {"key": "masdar", "role": "verbal-noun", "label": {"en": "maṣdar", "ar": "المصدر"}}, {"key": "fail", "role": "active", "label": {"en": "ism fāʿil", "ar": "اسم الفاعل"}, "marker": "فهو"}, {"key": "maful", "role": "passive", "label": {"en": "ism mafʿūl", "ar": "اسم المفعول"}, "marker": "والمفعول"}]}, {"id": "identity", "style": "prose", "ar": "{{Identity}}"}, {"id": "form_effects", "style": "prose", "when": "FormEffects", "ar": "{{FormEffects}}"}, {"id": "verse", "style": "verse", "ar": "{{VerseAr}}"}, {"id": "verse_ref", "style": "meta", "en": "{{VerseRef}}"}], "back": [{"id": "meaning_range", "style": "prose", "label": {"en": "Meaning range", "ar": "مدى المعنى"}, "en": "{{MeaningRange}}"}, {"id": "imagery", "style": "group", "when": "Imagery", "label": {"en": "Image", "ar": "الصورة"}, "ar": "{{Imagery.passage_ar}}", "en": "{{Imagery.passage_en}}"}, {"id": "arcs", "style": "list", "marker": "this_lemma", "label": {"en": "Senses", "ar": "الأقواس"}, "each": "Arcs", "item": {"head_ar": "{{construction_ar}}", "meta": "×{{count}}", "ar": "{{arc_ar}}", "en": "{{arc_en}}", "each": "examples", "item": {"ar": "{{ar}}", "en": "{{en}}", "meta": "{{ref}}", "note_en": "{{note}}"}}}, {"id": "family_heading", "style": "meta", "when": "FamilyHeading", "ar": "{{FamilyHeading}}"}, {"id": "family_arcs", "style": "list", "marker": "sibling_lemma", "when": "FamilyArcs", "each": "FamilyArcs", "item": {"head_ar": "{{construction_ar}}", "meta": "×{{count}}", "ar": "{{arc_ar}}", "en": "{{arc_en}}", "each": "examples", "item": {"ar": "{{ar}}", "en": "{{en}}", "meta": "{{ref}}", "note_en": "{{note}}"}}}, {"id": "sibling_line", "style": "meta", "when": "SiblingLine", "ar": "{{SiblingLine}}"}, {"id": "family_line", "style": "meta", "ar": "{{FamilyLine}}"}, {"id": "outside_family", "style": "prose", "when": "OutsideFamily", "ar": "{{OutsideFamily}}"}]}'
 WHERE id = 'NT:kmaps:lemma:sarf:v9';

UPDATE core_srs_note_type SET templates_json = '{"v": 2, "front": [{"id": "root", "style": "headword", "ar": "{{Root}}"}, {"id": "radicals", "style": "list", "each": "Radicals", "label": {"en": "Radicals", "ar": "الحروف"}, "item": {"ar": "{{l}} · {{name}} · {{makhraj}} · {{sifa}}", "meta": "{{order}}"}}, {"id": "soundness", "style": "meta", "ar": "{{Soundness}}"}, {"id": "form_ladder", "style": "list", "each": "FormLadder", "label": {"en": "Forms", "ar": "الأبواب"}, "item": {"head_en": "{{form}}", "ar": "{{verb}}", "meta": "bāb {{bab}} · {{trans}}", "gov_ar": "{{#gov}}{{.}} {{/gov}}", "each": "masadir", "item": {"ar": "{{m}}", "meta": "{{s}}"}}}, {"id": "verse", "style": "verse", "ar": "{{VerseAr}}"}, {"id": "verse_ref", "style": "meta", "en": "{{VerseRef}} · {{QuranTotal}} in the Qurʾān"}], "back": [{"id": "asl", "style": "group", "label": {"en": "Aṣl", "ar": "الأصل"}, "ar": "{{AslStatement.ar}}", "en": "{{AslStatement.en}}", "meta": "{{AslStatement.auth}} ت{{AslStatement.deathAH}}", "note_en": "{{AslStatement.note}}"}, {"id": "dna", "style": "group", "label": {"en": "DNA thread", "ar": "الخيط"}, "ar": "{{DnaThread.ar}}", "en": "{{DnaThread.en}}", "ur": "{{DnaThread.ur}}"}, {"id": "sense_arc", "style": "list", "each": "SenseArc", "label": {"en": "Sense arc", "ar": "قوس المعنى"}, "item": {"head_en": "{{n}} · form {{fam}}", "ar": "{{ar}}", "en": "{{en}}", "meta": "{{auth}} ت{{d}}", "flag": "concrete"}}, {"id": "axes", "style": "list", "when": "Axes", "each": "Axes", "label": {"en": "Axes", "ar": "المحاور"}, "item": {"ar": "{{ar}}", "en": "{{en}}", "meta": "×{{w}}"}}, {"id": "taqalib", "style": "group", "when": "Taqalib", "label": {"en": "Taqālīb", "ar": "التقاليب"}, "ar": "{{Taqalib.group}}", "note_en": "{{Taqalib.note}}", "each": "Taqalib.members", "item": {"ar": "{{.}}"}, "meta": "unused {{Taqalib.unused}}"}, {"id": "furuq", "style": "list", "when": "Furuq", "each": "Furuq", "label": {"en": "Furūq", "ar": "الفروق"}, "item": {"ar": "{{w}}", "en": "{{farq}}"}}, {"id": "addad", "style": "list", "when": "Addad", "each": "Addad", "label": {"en": "Aḍdād", "ar": "الأضداد"}, "item": {"ar": "{{w}}", "en": "{{axis}}", "meta": "{{status}}"}}, {"id": "field", "style": "list", "when": "Field", "each": "Field", "label": {"en": "Semantic field", "ar": "الحقل"}, "item": {"en": "{{en}}", "meta": "{{id}} ×{{w}}", "flag": "primary"}}, {"id": "expressions", "style": "list", "when": "Expressions", "each": "Expressions", "label": {"en": "Expressions", "ar": "التعابير"}, "item": {"ar": "{{e}}", "en": "{{en}}", "meta": "{{ref}}"}}, {"id": "lemma_inventory", "style": "list", "each": "LemmaInventory", "label": {"en": "Lemmas", "ar": "المفردات"}, "item": {"ar": "{{t}}", "en": "{{gloss}}", "meta": "{{pos}} ×{{n}}", "ref": "{{ref}}"}}, {"id": "scholarship", "style": "list", "when": "Scholarship", "each": "Scholarship", "label": {"en": "Scholarship", "ar": "أقوال"}, "item": {"en": "{{claim}}", "meta": "{{author}} · {{ref}} · {{via}}"}}]}'
 WHERE id = 'NT:kmaps:root:v1';


-- The ṣarf ṣaghīr palette. Roles, not hex: each client maps them.
UPDATE core_srs_note_type SET render_hints_json = '{"arc_marker": {"this_lemma": "■", "sibling_lemma": "□"}, "arrow": "←", "example_indent": 1, "arabic_font": "Amiri", "latin_font": "EB Garamond", "bidi": "wrap Arabic runs inside English prose with U+2066 … U+2069", "labels": {"Image": "the concrete picture behind the root — stated by a lexicon, shown by a shahid", "Sense": "one arc: a construction and the meaning it yields", "Example": "an attestation of that construction, with a fluent rendering", "Note": "what the lemma sense does in THIS place — never how it parses"}, "label_style": "Labels are rendered by the template, not stored in the data. HTML may replace them with headings or colour; iOS may replace them with SF Symbols. The renderer may drop them entirely on a narrow screen where indent alone carries the role.", "sarf_saghir": {"note": "One colour per slot, held across every card, so the eye learns the shape of a chain before it reads it. Roles are named, not hexed: each client maps them to its own palette.", "roles": ["past", "present", "imperative", "verbal-noun", "active", "passive"]}}'
 WHERE id = 'NT:kmaps:lemma:sarf:v9';

-- card_kind follows cyb_card_type, which is the registry of record: LEMMA is
-- 'lemma'. Two of the three lemma cards still said 'morphology', so grouping
-- by kind split one card type across two groups.
UPDATE core_srs_card SET card_kind = (
         SELECT t.card_kind FROM cyb_card_type t
          WHERE t.note_type_id = core_srs_card.note_type_id
            AND t.card_template = core_srs_card.card_template),
       updated_at = datetime('now')
 WHERE note_type_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM cyb_card_type t
                WHERE t.note_type_id = core_srs_card.note_type_id
                  AND t.card_template = core_srs_card.card_template
                  AND t.card_kind <> core_srs_card.card_kind);

-- The word card's link up the ladder was dangling: LemmaRef ended ':lemma.card'
-- but every lemma card ends ':lemma.mushtaqq'. Since the word note type's whole
-- design is "link up the ladder — no lemma content on this card", the card was
-- teaching a word whose lemma could not be reached. The root card's
-- LemmaInventory refs had the same ending.
UPDATE core_srs_card
   SET fields_json = replace(fields_json, ':lemma.card"', ':lemma.mushtaqq"'),
       updated_at = datetime('now')
 WHERE fields_json LIKE '%:lemma.card"%';

-- Dead versions: v6 and v7 carry zero cards and are referenced by no
-- cyb_card_type row. v9 is the live lemma note type.
DELETE FROM core_srs_note_type WHERE id IN ('NT:kmaps:lemma:sarf:v6', 'NT:kmaps:lemma:sarf:v7');
