#!/usr/bin/env python3
"""Check the checkable parts of a distillation against its source text.

Pulls every figure, year, money amount and proper-noun term out of the
Markdown under a book directory and looks for each one in the extracted
source, trying the formatting variants that trip a literal search up
(thousands separators, "%" vs "percent", "$5 billion" vs "5bn") and the
ligature gaps the built-in PDF parser leaves behind ("efficient" ->
"ecient").

    checkclaims.py source.txt content/book-slug/ [--context N] [--all]

Exit status is 1 when anything is missing, so it can gate a build.
A miss is a question, not a verdict: tables extract badly and the source
may simply spell something differently. Read them one at a time.
"""

import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------- source

LIGATURES = ('ffi', 'ffl', 'ff', 'fi', 'fl')


def deligature(s):
    """The parser drops glyphs that live in a ligature: 'efficient' arrives
    as 'ecient'. Produce that form so a real match is not reported missing."""
    for lig in LIGATURES:
        s = s.replace(lig, lig[-1] if lig in ('ffi', 'ffl') else '')
    return s


def load_source(path):
    raw = Path(path).read_text(encoding='latin-1', errors='replace')
    raw = re.sub(r'=== PAGE \d+ ===', ' ', raw)
    flat = re.sub(r'\s+', ' ', raw)
    return flat, flat.lower(), deligature(flat.lower())


# ------------------------------------------------------------- markdown

FENCE = re.compile(r'^\s*(```|~~~)')


def strip_markdown(text):
    """Drop the parts that are structure rather than claims: frontmatter,
    fenced blocks (code and Mermaid), link targets, inline code. Returns
    [(lineno, segment)] — a table row yields one segment per cell, so a
    name is never invented by reading across a cell boundary."""
    out, in_fence, in_front = [], False, False
    for n, line in enumerate(text.splitlines(), 1):
        if n == 1 and line.strip() == '---':
            in_front = True
            continue
        if in_front:
            if line.strip() == '---':
                in_front = False
            continue
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        line = re.sub(r'\]\([^)]*\)', ']', line)     # link targets
        line = re.sub(r'`[^`]*`', ' ', line)         # inline code
        line = re.sub(r'<[^>]+>', ' ', line)         # html/mermaid breaks
        # Bold that opens a bullet or a paragraph is a label the distiller
        # wrote, not a term the book coined. Bold *inside* a sentence is
        # where a real term gets defined, so that stays.
        line = re.sub(r'^(\s*(?:[-*]|\d+\.)?\s*)\*\*[^*]+\*\*', r'\1', line)
        for cell in line.split('|'):
            if cell.strip():
                out.append((n, cell))
    return out


# ------------------------------------------------------------- claims

YEAR = re.compile(r'\b(1[5-9]\d{2}|20\d{2})\b')
PERCENT = re.compile(r'\b(\d+(?:\.\d+)?)\s?(?:%|per ?cent)')
MONEY = re.compile(
    r'([$£€])\s?(\d[\d,]*(?:\.\d+)?)\s?(trillion|billion|million|bn|m\b)?',
    re.I)
NUMBER = re.compile(r'(?<![\w.$£€])(\d[\d,]*(?:\.\d+)?)(?![\w%])')
BOLD = re.compile(r'\*\*([^*]{3,60})\*\*')
PROPER = re.compile(r'\b([A-Z][a-z]{2,}(?:\s+(?:of|the|and|de|von)\s+)?'
                    r'(?:\s+[A-Z][a-z]{2,}){1,3})\b')

# Numbers that are almost always structure, not claims.
BORING = {'1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '0'}


def claims_in(lines):
    """Yield (kind, text) candidates with the line they came from."""
    for n, line in lines:
        if re.match(r'^\s*(Previous|Next):', line):
            continue
        for m in YEAR.finditer(line):
            yield n, 'year', m.group(1)
        for m in PERCENT.finditer(line):
            yield n, 'percent', m.group(1)
        for m in MONEY.finditer(line):
            amount = m.group(2)
            scale = (m.group(3) or '').lower()
            yield n, 'money', f'{amount} {scale}'.strip()
        for m in NUMBER.finditer(line):
            v = m.group(1)
            if v in BORING or YEAR.fullmatch(v):
                continue
            yield n, 'number', v
        for m in BOLD.finditer(line):
            t = m.group(1).strip(' .,:;')
            if len(t.split()) <= 6:
                yield n, 'term', t
        for m in PROPER.finditer(line):
            yield n, 'name', m.group(1).strip()


def variants(kind, value):
    """Spellings of one claim that all count as a hit."""
    v = value.strip()
    out = {v}
    if kind in ('number', 'percent', 'money', 'year'):
        bare = v.split()[0] if ' ' in v else v
        plain = bare.replace(',', '')
        out |= {bare, plain}
        if plain.isdigit() and len(plain) > 3:                 # 1000 -> 1,000
            out.add(f'{int(plain):,}')
        if plain.endswith('.0'):
            out.add(plain[:-2])
        if kind == 'percent':
            out |= {f'{plain}%', f'{plain} percent', f'{plain} per cent'}
        if kind == 'money':
            scale = v.split()[1] if ' ' in v else ''
            if scale:
                short = {'billion': 'bn', 'million': 'm',
                         'trillion': 'tn'}.get(scale, scale)
                long = {'bn': 'billion', 'm': 'million',
                        'tn': 'trillion'}.get(scale, scale)
                out |= {f'{plain} {scale}', f'{plain}{short}',
                        f'{plain} {long}'}
    else:
        out.add(re.sub(r'\s+', ' ', v))
        if v.endswith('s'):
            out.add(v[:-1])
        out.add(v.replace('’', "'").replace('‘', "'"))
    return {x for x in out if x}


def find(flat, lower, deligged, kind, value, context):
    for cand in variants(kind, value):
        needle = cand if kind in ('number', 'percent', 'money', 'year') \
            else cand.lower()
        hay = flat if kind in ('number', 'percent', 'money', 'year') else lower
        i = hay.find(needle)
        if i == -1 and kind not in ('number', 'percent', 'money', 'year'):
            i = deligged.find(deligature(needle))
            hay = deligged
        if i != -1:
            if context:
                lo, hi = max(0, i - context), i + len(needle) + context
                return True, hay[lo:hi]
            return True, ''
    return False, ''


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source', help='text extracted from the PDF')
    ap.add_argument('book', help='content/book-<slug>/ directory, or one .md')
    ap.add_argument('--context', type=int, default=0,
                    help='characters of source context to print for hits')
    ap.add_argument('--all', action='store_true',
                    help='list hits as well as misses')
    args = ap.parse_args()

    flat, lower, deligged = load_source(args.source)

    book = Path(args.book)
    files = sorted(book.rglob('*.md')) if book.is_dir() else [book]
    if not files:
        sys.exit(f'no markdown under {book}')

    misses = hits = 0
    for f in files:
        seen, rows = set(), []
        for n, kind, value in claims_in(strip_markdown(f.read_text())):
            key = (kind, value.lower())
            if key in seen:
                continue
            seen.add(key)
            ok, ctx = find(flat, lower, deligged, kind, value, args.context)
            if ok:
                hits += 1
                if args.all:
                    rows.append(f'  ok      {kind:<8} {value}'
                                + (f'\n            …{ctx}…' if ctx else ''))
            else:
                misses += 1
                rows.append(f'  MISSING {kind:<8} {value}   ({f.name}:{n})')
        if rows:
            print(f'\n{f}')
            print('\n'.join(rows))

    print(f'\n{hits} found, {misses} missing, across {len(files)} file(s).')
    if misses:
        print('A miss is a question, not a verdict — tables extract badly.\n'
              'But a figure that is nowhere in the source is usually one you\n'
              'imported from the present world instead of the book’s.')
    return 1 if misses else 0


if __name__ == '__main__':
    sys.exit(main())
