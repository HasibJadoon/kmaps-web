# Global term IDs — never write a bare string

Every classification on a root card resolves through the **`GT`** namespace, declared in
`ar_ling_reg_ref_namespace`: **`GT` → `km_arabic_linguistic.ar_ling_gram_term.id`**.

Sibling namespaces: `AL:ROOT` · `AL:LEMMA` · `QR:WORD` · `QR:SS` · `QR:EVID` · `QR:TERM`.

## Categories a root card binds to

| Field | Category | Live terms | Example |
|---|---|---|---|
| `FormLadder[].form` | `form_family` | 28 | `GT:form_family:form_i` |
| `FormLadder[].bab` | `form_family` | — | `GT:form_family:bab_nasara` |
| `gov[].trans` | `transitivity` | 5 | `GT:transitivity:transitive_by_harf` |
| `gov[].route` | `taddiya_route` | 5 | `GT:taddiya_route:biharf` |
| `gov[].harfPos` | `pos` | 18 | `GT:pos:harf_jarr` |
| `masadir[].deriv`, `ap`, `pp` | `derivation_type` | 13 | `GT:derivation_type:masdar` |
| `Soundness.ref` | `root_type` | 15 | `GT:root_type:sound` |
| `Soundness.tier` | `form_tier` | 6 | `GT:form_tier:thulathi_mujarrad` |

Each row also carries a 26-char `uid`, same shape as the Universal Root ID. Use `uid` for
cross-database references where the readable id would be brittle; carry both on the card.

## The eight forms of كتب, bound

| Form | `GT:` ref | uid |
|---|---|---|
| I المجرّد | `GT:form_family:form_i` | `c5be22c508d4cf5870d77d8f00` |
| II التفعيل | `GT:form_family:form_ii` | `0b1055a1809aa7331f121c6111` |
| III المفاعلة | `GT:form_family:form_iii` | `746712101aaa7bfd307670006f` |
| IV الإفعال | `GT:form_family:form_iv` | `728420831f26760236b62eebdd` |
| V التفعّل | `GT:form_family:form_v` | `eb92c38c5eaa2aa9b0ca09c734` |
| VI التفاعل | `GT:form_family:form_vi` | `2fe76d632069504f6a61afb785` |
| VIII الافتعال | `GT:form_family:form_viii` | `17717eba6feea16e3b5921d821` |
| X الاستفعال | `GT:form_family:form_x` | `8af9a225e08f3b124fc2faa32d` |

## Two distinctions the registry forces

**`transitive` is not `transitive_by_harf`.** مُتَعَدٍّ (naṣb) and مُتَعَدٍّ بِحَرْف are separate
registered terms. For كتب this is exactly the burden/benefit polarity — كَتَبَ عَلَى and
كَتَبَ لِ are both `transitive_by_harf`, and flattening them to `transitive` erases the point.

**`taddiya_route` is a second axis, not a synonym for transitivity.** `binafsihi` (by naṣb) ·
`biharf` (by particle) · `bitadeef` (Form II gemination) · `bihamza` (Form IV hamza) · `lazim`.
Form II كَتَّبَ and Form IV أكْتَبَ are causativizations of the SAME verb by DIFFERENT routes —
which is why II splits into teach/muster/bind and IV into dictate/tie-shut. The route names the
mechanism; without it the two forms look like unrelated coincidences.

## Check before commit

```sql
-- every GT: ref on the card must resolve to a live row
SELECT DISTINCT value AS ref FROM json_tree(
  (SELECT fields_json FROM core_srs_card WHERE id = :card_id))
WHERE value LIKE 'GT:%'
  AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');
-- must return ZERO rows
```

If a term you need is missing, **add it to `ar_ling_gram_term` first**, with a category_key that
already exists. Do not invent a `GT:` id on the card — that is the same failure as inventing a
band code, and it will pass silently because nothing joins on it.
