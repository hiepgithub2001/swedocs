#!/usr/bin/env python3
"""Extract a PDF's text in page order, with no third-party libraries.

    python3 pdftext.py book.pdf -o book.txt

Uses `pdftotext` when it is installed, because it is better at this than
anything written here. Otherwise falls back to parsing the file directly:
index every object, expand the compressed object streams that hold the page
tree in modern PDFs, walk /Root -> /Pages -> /Kids for the real reading order,
and pull the strings out of each page's content stream.

The fallback loses the things that live in the font encoding rather than the
text: ligatures come through as gaps ("Eective"), and glyphs from a subset
font with no standard encoding may not come through at all. That is fine for
what this is for — checking claims against the source — and wrong for anything
that needs the text to be exact. Quote nothing from this output.

Output carries `=== PAGE n ===` markers so a passage can be traced back to a
page, which is also how you find the table of contents.
"""
import argparse, re, shutil, subprocess, sys, zlib


def via_pdftotext(path: str) -> str | None:
    if not shutil.which('pdftotext'):
        return None
    out = subprocess.run(['pdftotext', '-layout', path, '-'],
                         capture_output=True, text=True)
    if out.returncode != 0:
        return None
    # pdftotext separates pages with a form feed; make it the same marker.
    pages = out.stdout.split('\f')
    return ''.join(f'\n\n=== PAGE {i} ===\n{p}' for i, p in enumerate(pages, 1))


def inflate(body: bytes) -> bytes | None:
    m = re.search(rb'stream\r?\n', body)
    if not m:
        return None
    raw = body[m.end():body.rfind(b'endstream')]
    try:
        return zlib.decompress(raw)
    except zlib.error:
        try:                                  # truncated or mis-declared length
            return zlib.decompressobj().decompress(raw)
        except zlib.error:
            return None


def load_objects(data: bytes) -> dict[int, bytes]:
    objs: dict[int, bytes] = {}
    for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b', data):
        start = m.end()
        end = data.find(b'endobj', start)
        objs[int(m.group(1))] = data[start:end]

    # /ObjStm holds objects compressed inside another object. Since PDF 1.5
    # that is where the page tree usually lives, so skipping these finds no
    # pages at all on a modern file.
    for body in list(objs.values()):
        if b'/ObjStm' not in body:
            continue
        payload = inflate(body)
        n = re.search(rb'/N\s+(\d+)', body)
        first = re.search(rb'/First\s+(\d+)', body)
        if not (payload and n and first):
            continue
        n, first = int(n.group(1)), int(first.group(1))
        header = payload[:first].split()
        for i in range(n):
            num, off = int(header[2 * i]), int(header[2 * i + 1])
            nxt = int(header[2 * i + 3]) + first if i + 1 < n else len(payload)
            objs.setdefault(num, payload[off + first:nxt])
    return objs


def page_order(objs: dict[int, bytes], data: bytes) -> list[int]:
    root = None
    for m in re.finditer(rb'/Root\s+(\d+)\s+\d+\s+R', data):
        root = int(m.group(1))                # last trailer wins
    pages_ref = None
    if root in objs:
        m = re.search(rb'/Pages\s+(\d+)\s+\d+\s+R', objs[root])
        pages_ref = int(m.group(1)) if m else None

    order: list[int] = []
    seen: set[int] = set()

    def walk(num: int) -> None:
        if num in seen:
            return
        seen.add(num)
        body = objs.get(num, b'')
        kids = re.search(rb'/Kids\s*\[(.*?)\]', body, re.S)
        if kids:
            for r in re.finditer(rb'(\d+)\s+\d+\s+R', kids.group(1)):
                walk(int(r.group(1)))
        elif re.search(rb'/Type\s*/Page\b', body):
            order.append(num)

    if pages_ref:
        walk(pages_ref)
    if not order:                             # damaged tree: fall back to file order
        order = [n for n, b in objs.items()
                 if re.search(rb'/Type\s*/Page\b', b) and b'/Contents' in b]
    return order


def content(objs: dict[int, bytes], page: int) -> bytes:
    body = objs.get(page, b'')
    single = re.search(rb'/Contents\s+(\d+)\s+\d+\s+R', body)
    if single:
        refs = [int(single.group(1))]
    else:
        arr = re.search(rb'/Contents\s*\[(.*?)\]', body, re.S)
        refs = [int(r.group(1)) for r in re.finditer(rb'(\d+)\s+\d+\s+R', arr.group(1))] if arr else []
    out = b''
    for r in refs:
        s = inflate(objs.get(r, b''))
        if s:
            out += s + b'\n'
    return out


STRING = rb'\((?:\\.|[^\\()])*\)'
TOKENS = re.compile(rb'(?:\[((?:' + STRING + rb'|[^\[\]])*)\]\s*TJ)'
                    rb'|(' + STRING + rb'\s*Tj)'
                    rb'|(TD|Td|T\*)')


def text_of(stream: bytes) -> str:
    parts: list[bytes] = []
    for m in TOKENS.finditer(stream):
        if m.group(1) is not None:            # [ (a) -30 (b) ] TJ
            parts.append(b''.join(s.group(0)[1:-1] for s in re.finditer(STRING, m.group(1))))
        elif m.group(2) is not None:          # (a) Tj
            parts.append(m.group(2).rsplit(b')', 1)[0][1:])
        else:                                 # a line break in the layout
            parts.append(b'\n')
    s = b''.join(parts).decode('latin-1')
    s = re.sub(r'\\([nrt])', ' ', s)
    s = re.sub(r'\\([0-7]{1,3})',
               lambda m: chr(int(m.group(1), 8)) if int(m.group(1), 8) < 256 else '', s)
    return re.sub(r'\\(.)', r'\1', s)


def via_parser(path: str) -> str:
    data = open(path, 'rb').read()
    objs = load_objects(data)
    order = page_order(objs, data)
    if not order:
        sys.exit('no pages found — the file may be encrypted or damaged')
    return ''.join(f'\n\n=== PAGE {i} ===\n{text_of(content(objs, p))}'
                   for i, p in enumerate(order, 1))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('-o', '--out', help='write here instead of stdout')
    ap.add_argument('--force-parser', action='store_true',
                    help='skip pdftotext even when it is installed')
    args = ap.parse_args()

    text = None if args.force_parser else via_pdftotext(args.pdf)
    how = 'pdftotext'
    if text is None:
        text, how = via_parser(args.pdf), 'built-in parser'

    if args.out:
        open(args.out, 'w').write(text)
        pages = text.count('=== PAGE ')
        print(f'{args.out}: {pages} pages, {len(text):,} chars, via {how}', file=sys.stderr)
    else:
        sys.stdout.write(text)


if __name__ == '__main__':
    main()
