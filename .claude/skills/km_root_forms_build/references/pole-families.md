# pole_family registry (cross-root)

`pole_family` values are **not** bound to `ar_ling_gram_term` (they're each source's own semantic
axis, not universal grammar) but they should still be **reused across roots** wherever the
underlying semantic pattern genuinely repeats, so a future "compare the contronym treatment
across every root that has one" query works. This file is the running list -- check it before
minting a new `PF:*` key; add to it whenever you do mint one.

## Cross-root families (reusable on any root that fits)

| Key | Sense | Seen on |
|---|---|---|
| `PF:addad_separation_union` | the separation/union contronym | بين |
| `PF:disclosure_clarity` | the clarity/disclosure sense | بين |
| `PF:mutual_parting_social` | parting as a reciprocal social act (Forms III/VI pair) | بين |
| `PF:distance` | plain physical/spatial distance | بين |

## Root-specific families (do not force onto other roots)

| Key | Sense | Root |
|---|---|---|
| `PF:excellence_gap` | the gap created by excellence (بَوْن) | بين |
| `PF:ktb_joining_writing` | joining/assembling, specialized to writing | كتب |
| `PF:baraka_fixity_kneeling` | kneeling / pressing down / staying fixed | برك |
| `PF:baraka_increase_blessing` | increase, divine good, blessing | برك |
| `PF:baraka_chest` | the physical chest/brisket sense (جمهرة only) | برك |
| `PF:nzl_alighting_sending_down` | alighting at a place / causing something to descend | نزل |

## Rule for minting a new key

1. Check this file first -- if an existing cross-root family fits the sense, reuse it.
2. If the sense is genuinely root-specific (e.g. برك's chest/kneeling literal sense has no
   equivalent in بين), mint `PF:<root>_<short_sense>` and add the row above.
3. Never bend a root's actual sense to fit an existing key just for tidiness -- a forced fit is
   worse than an extra key. The `PF:baraka_fixity_kneeling` vs `PF:addad_separation_union`
   distinction (both roots have a "physical/settling" pole, but they aren't the same pole) is the
   worked example: keep them separate.
4. When a source's own `pole` tag doesn't match its content well (e.g. Lane's برك form IV tagged
   "separation" in the source data but actually about disclosure), `pole_family` can and should
   diverge from the literal `pole` string to reflect the real content -- note this divergence in
   the block's `note` field so it's not mistaken for an error.
