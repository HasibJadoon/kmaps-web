#!/usr/bin/env node
// Fails when an Arabic/Urdu font family is named literally anywhere in the web app
// outside the two places allowed to name it:
//   apps/k-maps/src/scss/_tokens.scss  — the font tokens (--km-font-quran, --km-font-arabic-ui, --km-font-urdu)
//   apps/k-maps/src/scss/_fonts.scss   — the self-hosted @font-face rules
// Everything else uses var(--km-font-quran) for Qurʾān text and var(--km-font-arabic-ui) for UI Arabic.
// Google-hosted Arabic fonts (fonts.googleapis.com …family=Amiri…) are flagged too.
//
// Usage: node scripts/check-fonts.mjs [appSrcDir]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = process.argv[2] ?? join(repo, 'apps/k-maps/src');

const ALLOWED = new Set([
  'scss/_tokens.scss',
  'scss/_fonts.scss',
  // Standalone static page (not bundled; cannot read the app's CSS tokens).
  'assets/kmaps-arabic-hub.html',
]);
const EXT = /\.(scss|css|ts|html|mjs|js)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', 'fonts', 'monaco']);

const NAMES = [
  'Amiri', 'Amiri Quran', 'AmiriQuran', 'Scheherazade', 'Scheherazade New', 'Geeza Pro',
  'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'NotoNastaliqUrdu', 'UthmanicHafs', 'KFGQPC[^\'"]*',
  'Lateef', 'Adobe Arabic', 'Traditional Arabic', 'SF Arabic', 'Arabic Typesetting', 'Noto Sans Arabic',
];
const nameAlt = NAMES.join('|');
const RULES = [
  // a quoted family name: 'Amiri', "Scheherazade New", …
  { re: new RegExp(`['"](?:${nameAlt})['"]`, 'g'), why: 'literal Arabic font family' },
  // an unquoted family name directly in a font/font-family value
  { re: new RegExp(`font(?:-family)?\\s*:[^;{}\\n]*\\b(?:Amiri|Scheherazade|Geeza|Lateef|UthmanicHafs)\\b`, 'g'), why: 'literal Arabic font family' },
  // Google-hosted Arabic/Urdu fonts
  { re: /fonts\.googleapis\.com[^'"\s)]*family=(?:Amiri|Scheherazade|Noto\+Naskh|Noto\+Nastaliq|Lateef|Noto\+Sans\+Arabic)/g, why: 'Google-hosted Arabic font' },
];

// Blank out comments (keeping newlines so line numbers stay right).
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(p);
    } else if (EXT.test(name)) {
      yield p;
    }
  }
}

const problems = [];
for (const file of walk(srcDir)) {
  const rel = relative(srcDir, file).split(sep).join('/');
  if (ALLOWED.has(rel)) continue;
  const text = stripComments(readFileSync(file, 'utf8'));
  for (const { re, why } of RULES) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text)); ) {
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(`${rel}:${line}: ${why}: ${m[0].trim()}`);
    }
  }
}

if (problems.length) {
  console.error(`check-fonts: ${problems.length} problem(s). Use var(--km-font-quran) for Qurʾān text and var(--km-font-arabic-ui) for UI Arabic (src/scss/_tokens.scss).`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('check-fonts: OK — Arabic font families are named only in _tokens.scss / _fonts.scss.');
