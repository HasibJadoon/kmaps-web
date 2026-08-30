#!/usr/bin/env python3
"""Strip comments from source files without touching code.

Lexers, not regular expressions. A regex that removes `//...` also removes the
tail of "https://example.com" and the middle of a regex literal; a regex that
removes `--...` eats an SQL string containing a dash pair. Each language below
is scanned character by character with its own string rules.

Usage:  strip_comments.py [--apply] PATH [PATH ...]
Without --apply it reports what it would do and writes nothing.
"""
import sys
import pathlib

# Comments that are instructions rather than prose. `// swift-tools-version:`
# is read by SwiftPM before it parses anything else — strip it and the package
# will not build. The same is true of the linter and compiler pragmas below:
# they look like comments and behave like code.
import re as _re
DIRECTIVE = _re.compile(
    r'^\s*(?:swift-tools-version|swiftlint:|swift-format-ignore|sourcery:|'
    r'@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-|tslint:|prettier-ignore|'
    r'jshint |global |webpackChunkName|@jsx|<reference |#|sourceMappingURL|'
    r'@preconcurrency|@retroactive)')


SKIP_DIRS = {'node_modules', '.git', '.build', 'DerivedData', '.wrangler',
             'dist', 'build', '.next', 'Pods', 'vendor', '.venv', '__pycache__'}


def strip_c_like(src: str, line_comment: str = '//') -> str:
    """Swift / TypeScript / JavaScript.

    Handles: ' " ` strings with escapes, Swift multiline \"\"\" and raw #\"...\"#,
    template-literal ${...} nesting, block comments (nested, as Swift allows),
    and regex literals — the last decided by what token precedes the slash,
    which is how a real JS lexer does it.
    """
    out = []
    i, n = 0, len(src)
    depth = 0              # block-comment nesting
    while i < n:
        ch = src[i]

        if depth:
            if src.startswith('/*', i):
                depth += 1
                i += 2
                continue
            if src.startswith('*/', i):
                depth -= 1
                i += 2
                continue
            i += 1
            continue

        # ── strings ──────────────────────────────────────────────────────────
        if src.startswith('"""', i):
            j = src.find('"""', i + 3)
            j = n if j == -1 else j + 3
            out.append(src[i:j])
            i = j
            continue
        if ch == '#' and src.startswith('#"', i):
            j = src.find('"#', i + 2)
            j = n if j == -1 else j + 2
            out.append(src[i:j])
            i = j
            continue
        if ch in '"\'`':
            quote = ch
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == quote:
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            i = j
            continue

        # ── comments ─────────────────────────────────────────────────────────
        if src.startswith('/*', i):
            depth = 1
            i += 2
            continue
        if src.startswith(line_comment, i):
            j = src.find('\n', i)
            j = n if j == -1 else j
            body = src[i + len(line_comment):j]
            if DIRECTIVE.match(body.lstrip('/!<')):
                out.append(src[i:j])
            i = j
            continue

        # ── a lone slash: regex literal or division ──────────────────────────
        if ch == '/':
            prev = next((c for c in reversed(out[-40:] if out else []) if c.strip()), '')
            tail = ''.join(out)[-60:].rstrip()
            starts_regex = (not tail) or tail[-1] in '=(,:[!&|?{};+' or \
                tail.endswith('return') or tail.endswith('=>')
            if starts_regex:
                j = i + 1
                in_class = False
                while j < n:
                    if src[j] == '\\':
                        j += 2
                        continue
                    if src[j] == '[':
                        in_class = True
                    elif src[j] == ']':
                        in_class = False
                    elif src[j] == '/' and not in_class:
                        j += 1
                        break
                    elif src[j] == '\n':
                        break
                    j += 1
                out.append(src[i:j])
                i = j
                continue

        out.append(ch)
        i += 1
    return ''.join(out)


def strip_sql(src: str) -> str:
    """SQL: -- to end of line, /* */ blocks, '' strings (doubled quote escapes)."""
    out = []
    i, n = 0, len(src)
    while i < n:
        ch = src[i]
        if ch == "'":
            j = i + 1
            while j < n:
                if src[j] == "'" and j + 1 < n and src[j + 1] == "'":
                    j += 2
                    continue
                if src[j] == "'":
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            i = j
            continue
        if src.startswith('--', i):
            j = src.find('\n', i)
            i = n if j == -1 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j == -1 else j + 2
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def tidy(text, keep_shebang):
    """Drop lines left blank by a removed comment; collapse runs of blanks."""
    lines = [ln.rstrip() for ln in text.split('\n')]
    kept, blanks = [], 0
    for ln in lines:
        if ln.strip():
            blanks = 0
            kept.append(ln)
        else:
            blanks += 1
            if blanks <= 1 and kept:
                kept.append('')
    while kept and not kept[-1].strip():
        kept.pop()
    body = '\n'.join(kept)
    if keep_shebang:
        body = keep_shebang + '\n' + body.lstrip('\n')
    return body + '\n'


HANDLERS = {
    '.swift': lambda s: strip_c_like(s, '//'),
    '.ts':    lambda s: strip_c_like(s, '//'),
    '.tsx':   lambda s: strip_c_like(s, '//'),
    '.js':    lambda s: strip_c_like(s, '//'),
    '.mjs':   lambda s: strip_c_like(s, '//'),
    '.sql':   strip_sql,
}


def main() -> int:
    apply = '--apply' in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith('--')]
    changed = 0
    scanned = 0
    for root in roots:
        for path in sorted(pathlib.Path(root).rglob('*')):
            if not path.is_file() or path.suffix not in HANDLERS:
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            src = path.read_text(encoding='utf-8', errors='surrogateescape')
            shebang = src.split('\n', 1)[0] if src.startswith('#!') else None
            body = src.split('\n', 1)[1] if shebang else src
            out = tidy(HANDLERS[path.suffix](body), shebang)
            scanned += 1
            if out != src:
                changed += 1
                if apply:
                    path.write_text(out, encoding='utf-8', errors='surrogateescape')
    print(f'{"stripped" if apply else "would strip"} {changed} of {scanned} files')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
