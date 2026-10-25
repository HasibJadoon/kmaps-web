-- Prepositions of old (owner, 2026-10-25: "and prepositions"): how the Qur'an and the old Arabs used them, beside the ancient verbs.
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM000000000000000160','quran_preps_place','Prepositions of Place in the Qurʾān','حُرُوفُ الْمَكَانِ فِي الْقُرْآنِ','فِي، عَلَى، مِنْ، إِلَى، عَنْ as the Qurʾān places things',334,'MAP:ancient-words','preps',177),
 ('01ARDOM000000000000000161','quran_preps_shades','The Shades of a Preposition','مَعَانِي الْحَرْفِ الْوَاحِدِ','One letter, many senses: عَلَى for a duty (كُتِبَ عَلَيْكُمْ), بِـ for the means, مِنْ for part of',335,'MAP:ancient-words','preps',178),
 ('01ARDOM000000000000000162','prep_oaths','The Letters of Oath','حُرُوفُ الْقَسَمِ','وَ، بِـ، تَـ: وَاللَّهِ، بِاللَّهِ، تَاللَّهِ, and the Qurʾān''s oaths by the sun, the dawn and the fig',336,'MAP:ancient-words','preps',179);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
