-- 037_a_figure_you_can_study.sql
--
-- The note type behind WGRT cards (WorldView Global Rhetorical Terms). WV owns
-- the entries in km_worldview; km_core owns the cards, so the rendering
-- contract lives here.
--
-- One note type serves all five card templates. The front is whichever prompt
-- the generator wrote (rhetoric.recognition, .production, .critique, .device,
-- .attestation all put their question in Front); the back renders the whole
-- entry, with every block guarded by `when` so a sparse entry shows no empty
-- headings. Seeing the full entry on reveal is deliberate: the figure, what it
-- foregrounds and what it hides belong together at the moment of recall.
--
-- Cards carry module = 'EN' and resource_type = 'vocabulary'. resource_ref is
-- the typed WV reference (WV:RHT:<slug>, or WV:RHU:<id> for an attestation),
-- so a card always walks back to the row it came from.

INSERT OR REPLACE INTO core_srs_note_type
  (id, name, version, direction, fields_json, templates_json, render_hints_json, note_md)
VALUES (
  'NT:kmaps:rhetoric:v1',
  'kmaps.rhetoric.v1',
  1,
  'ltr',
  '["Term","Slug","Title","Front","Back","Device","DeviceAr","DeviceClassical","LiteralSense","FigurativeSense","Highlights","Hides","CounterTerm","OriginNote","SourceDomain","TargetDomain","Register","Stance","Quote","Speaker"]',
  '{"v": 2, "front": [{"id": "prompt", "style": "prose", "en": "{{Front}}"}], "back": [{"id": "term", "style": "headword", "en": "{{Term}}"}, {"id": "figure", "style": "meta", "when": "Device", "en": "{{Device}}", "ar": "{{DeviceAr}}"}, {"id": "figurative", "style": "prose", "when": "FigurativeSense", "label": {"en": "What it says"}, "en": "{{FigurativeSense}}"}, {"id": "literal", "style": "prose", "when": "LiteralSense", "label": {"en": "The picture"}, "en": "{{LiteralSense}}"}, {"id": "highlights", "style": "prose", "when": "Highlights", "label": {"en": "It foregrounds"}, "en": "{{Highlights}}"}, {"id": "hides", "style": "prose", "when": "Hides", "label": {"en": "It hides"}, "en": "{{Hides}}"}, {"id": "counter", "style": "meta", "when": "CounterTerm", "label": {"en": "Counter-move"}, "en": "{{CounterTerm}}"}, {"id": "origin", "style": "prose", "when": "OriginNote", "label": {"en": "Where it comes from"}, "en": "{{OriginNote}}"}, {"id": "attested", "style": "prose", "when": "Quote", "label": {"en": "Attested"}, "en": "{{Quote}}", "meta": "{{Speaker}}"}, {"id": "provenance", "style": "meta", "en": "{{Register}} · {{Stance}} · {{SourceDomain}} → {{TargetDomain}}"}]}',
  '{"latin_font": "EB Garamond", "arabic_font": "Amiri", "bidi": "wrap Arabic runs inside English prose with U+2066 … U+2069", "labels": {"It hides": "the load-bearing block — what the figure removes from the argument without arguing for its removal", "It foregrounds": "what the figure makes salient, which is usually what makes it persuasive", "Counter-move": "the figure that answers this one"}, "label_style": "Labels are rendered by the template, not stored in the data. A narrow screen may drop them and carry the roles by indent alone.", "emphasis": "On a critique card the hides block is the answer; render it first and give it the weight the headword gets elsewhere."}',
  'WGRT — WorldView Global Rhetorical Terms. Source rows live in km_worldview (wv_rhetoric_terms, wv_rhetoric_devices, wv_rhetoric_usages). Cards are built by GET/POST /wv/rhetoric/terms/:id/cards and written through POST /core/srs/cards/bulk. See docs/wv-global-rhetorical-terms.md in kmaps-web.'
);
