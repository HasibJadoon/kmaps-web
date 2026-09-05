# Rendering the illuminated-manuscript page

Read this only if the user wants to *see* a rendered page. Persisting D1 blocks does not require it.

## Renderer and its constraints
The container has **`wkhtmltoimage`** (old Qt-WebKit). Author HTML for that engine:
- Use **concrete hex colors**; **no** CSS `var()`, **no** CSS grid. Layout with `flex` or a real `<table dir="rtl">`.
- Set `dir="rtl"` on the document and on Arabic/Urdu blocks; keep English blocks `direction:ltr`.
- Inline everything; a Google-Fonts `<link>` will 403 (harmless) — rely on the locally fetched fonts below.

## Fonts (fetch once per session)
```bash
mkdir -p ~/.fonts && cd ~/.fonts
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl
for f in amiri/Amiri-Regular.ttf amiri/Amiri-Bold.ttf \
         notonastaliqurdu/NotoNastaliqUrdu%5Bwght%5D.ttf \
         ebgaramond/EBGaramond%5Bwght%5D.ttf cinzel/Cinzel%5Bwght%5D.ttf; do
  curl -sSL "$BASE/$f" -O
done
fc-cache -f >/dev/null
```
`raw.githubusercontent.com` is on the allow-list. Families: **Amiri** (Arabic), **Noto Nastaliq Urdu** (Urdu), **EB Garamond** (English), **Cinzel** (Latin caps / roman form badges).

## Render command
```bash
wkhtmltoimage --enable-local-file-access --load-error-handling ignore \
  --load-media-error-handling ignore --disable-smart-width \
  --width 1280 --quality 90 IN.html OUT.png
```
Exit code **1** with `ContentAccessDenied` comes from the 403 on the web font link and is **expected/harmless** if the PNG is written.

## Sanity check (the built-in image viewer is flaky on these PNGs)
`view` on a rendered PNG intermittently returns a bare `[image]` placeholder. Do not trust that as "blank". Check with PIL instead, then present the file:
```bash
python3 -c "from PIL import Image,ImageStat; im=Image.open('OUT.png'); \
s=ImageStat.Stat(im.convert('L')); print(im.size, round(s.mean[0],1), round(s.stddev[0],1))"
```
A dark manuscript page reads roughly **mean ~20, stddev >15** = non-blank. For tall pages, crop into thirds before viewing:
```python
from PIL import Image
im=Image.open('OUT.png'); w,h=im.size
for i in range(3): im.crop((0,i*h//3,w,(i+1)*h//3)).save(f'part{i+1}.png')
```
Then `present_files` the full PNG (and/or the parts).

## Aesthetic tokens (dark warm-ink manuscript)
| token | hex | use |
|---|---|---|
| ground | `#0f0d0a` | page background |
| leaf | `#171208` | the vellum panel |
| ink | `#EDE0C4` / `#e7dcc2` | body text |
| gold | `#C9A24B` · bright `#E4C878` | rules, badges, headings |
| rubric red | `#B24A38` (soft `#cf8a7a`) | **separation** pole / root glyph |
| lapis | `#5B7BA8` (soft `#8fa9cd`) | **union / clarity** pole |
| muted | `#9b7f42` / `#7a6738` | Cinzel section labels |

Type: **Amiri** for all Arabic (root glyph large, e.g. 52px, letter-spacing); **Cinzel** for Latin small-caps labels and the roman form badges (I, II, IV…); **EB Garamond** italic for English glosses; **Noto Nastaliq Urdu** for Urdu (line-height ~2.1, `text-align:right`).

## Page composition (single column)
The reading layout the user settled on — **one column**, three movements top-to-bottom:
1. **Ribbon + root header** — source name (AR + EN), volume/page, the root glyph, the Quran anchor chip (e.g. al-Dukhān 44:2 · المُبين).
2. **Section A — the family map (study aid).** A core cartouche, then a two-pole `<table>` (rubric-red vs lapis) of form chips: roman badge · مَاضٍ·مُضارِع · مصادر · متعدٍّ/لازم · a representative āya. End with the author's own binding statement.
3. **Section B — verbatim reading.** Band labelled `verbatim · original`. Each passage: a Cinzel label, the **verbatim Arabic** (āyāt highlighted gold, keywords rubric), then a two-column EN | UR block beneath (`grid-template-columns:1fr 1fr` is unavailable — use a flex row or a `<table>`), each the **full** faithful translation.
4. **Apparatus.** Footnotes (Arabic + small EN) and a dotted-off defect note (e.g. D41).
5. **Colophon** — source, author (d. …), volume/page, entry id, and a line stating Section B is the author's verbatim text (public domain) with EN/UR added, verified vs tafsir.app.

Prior renders to imitate: `byn-mufradat-full.html` (al-Rāghib, full trilingual) and the Ṣiḥāḥ page. Keep the map above the reading; never let a gloss displace the Arabic.
