#!/usr/bin/env python3
"""Extract a PDF's text in page order, with no third-party libraries.

    python3 pdftext.py book.pdf -o book.txt

Uses `pdftotext` when it is installed, because it is better at this than
anything written here. Otherwise falls back to parsing the file directly:
index every object, expand the compressed object streams that hold the page
tree in modern PDFs, walk /Root -> /Pages -> /Kids for the real reading order,
and pull the strings out of each page's content stream.

The fallback reads each font's /ToUnicode CMap where there is one, which is
what makes text from an ebook-converter PDF (calibre and friends emit glyph
ids, not characters) come out as words at all. Where there is no such map it
falls back to the raw bytes, and then it loses what lives in the font encoding:
ligatures come through as gaps ("Eective"), and glyphs from a subset font may
not come through at all. Either way it is fine for what this is for — checking
claims against the source — and wrong for anything needing exact text. Quote
nothing from this output.

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


def utf16be(hexdigits: bytes) -> str:
    b = bytes.fromhex(hexdigits.decode('ascii'))
    if len(b) % 2:
        b = b'\x00' + b
    return b.decode('utf-16-be', 'replace')


HEXPAIR = re.compile(rb'<([0-9A-Fa-f]+)>')


def parse_cmap(data: bytes) -> tuple[dict[int, str], int]:
    """A /ToUnicode CMap: glyph code -> the characters it stands for."""
    out: dict[int, str] = {}
    for blk in re.findall(rb'beginbfchar(.*?)endbfchar', data, re.S):
        codes = HEXPAIR.findall(blk)
        for src, dst in zip(codes[::2], codes[1::2]):
            out[int(src, 16)] = utf16be(dst)

    for blk in re.findall(rb'beginbfrange(.*?)endbfrange', data, re.S):
        # Two forms share the block: <lo> <hi> <dst>, and <lo> <hi> [<d> <d>…]
        for m in re.finditer(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*'
                             rb'(?:<([0-9A-Fa-f]+)>|\[([^\]]*)\])', blk, re.S):
            lo, hi = int(m.group(1), 16), int(m.group(2), 16)
            if hi < lo or hi - lo > 65535:
                continue
            if m.group(3) is not None:
                base = utf16be(m.group(3))
                for i in range(hi - lo + 1):
                    out[lo + i] = base[:-1] + chr(ord(base[-1]) + i) if base else ''
            else:
                for i, dst in enumerate(HEXPAIR.findall(m.group(4))):
                    if lo + i <= hi:
                        out[lo + i] = utf16be(dst)

    width = 1
    cs = re.search(rb'begincodespacerange(.*?)endcodespacerange', data, re.S)
    if cs:
        first = HEXPAIR.search(cs.group(1))
        if first and len(first.group(1)) >= 4:
            width = 2
    return out, width


def resources(objs: dict[int, bytes], page: int) -> bytes:
    """A page's /Resources, which it may inherit from a /Pages ancestor."""
    num, seen = page, set()
    while num is not None and num not in seen:
        seen.add(num)
        body = objs.get(num, b'')
        ref = re.search(rb'/Resources\s+(\d+)\s+\d+\s+R', body)
        if ref:
            return objs.get(int(ref.group(1)), b'')
        inline = re.search(rb'/Resources\s*<<', body)
        if inline:
            return body[inline.end() - 2:]
        parent = re.search(rb'/Parent\s+(\d+)\s+\d+\s+R', body)
        num = int(parent.group(1)) if parent else None
    return b''


def font_map(objs: dict[int, bytes], num: int,
             cache: dict[int, tuple[dict[int, str], int]]):
    if num in cache:
        return cache[num]
    body = objs.get(num, b'')
    width = 2 if re.search(rb'/Identity-[HV]\b', body) else 1
    table: dict[int, str] = {}
    tu = re.search(rb'/ToUnicode\s+(\d+)\s+\d+\s+R', body)
    if tu:
        payload = inflate(objs.get(int(tu.group(1)), b''))
        if payload:
            table, width = parse_cmap(payload)
    cache[num] = (table, width)
    return cache[num]


def page_fonts(objs: dict[int, bytes], page: int, cache: dict) -> dict:
    res = resources(objs, page)
    ref = re.search(rb'/Font\s+(\d+)\s+\d+\s+R', res)
    if ref:
        fdict = objs.get(int(ref.group(1)), b'')
    else:
        m = re.search(rb'/Font\s*<<(.*?)>>', res, re.S)
        fdict = m.group(1) if m else b''
    return {name.decode('latin-1'): font_map(objs, int(n), cache)
            for name, n in re.findall(rb'/([A-Za-z0-9._+-]+)\s+(\d+)\s+\d+\s+R',
                                      fdict)}


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
HEXSTR = rb'<[0-9A-Fa-f\s]*>'
TOKENS = re.compile(
    rb'/([A-Za-z0-9._+-]+)\s+[-\d.]+\s+Tf'                  # 1: font switch
    rb'|\[((?:' + STRING + rb'|' + HEXSTR + rb'|[^\[\]])*)\]\s*TJ'  # 2
    rb'|(' + STRING + rb')\s*Tj'                             # 3: literal
    rb'|(' + HEXSTR + rb')\s*Tj'                             # 4: hex
    rb'|([-\d.]+)\s+([-\d.]+)\s+T[Dd]\b'                   # 5,6: move
    rb'|(T\*)')                                             # 7: next line
PIECE = re.compile(STRING + rb'|' + HEXSTR)


def unescape(raw: bytes) -> bytes:
    r"""Resolve a literal string's \n, \053 and \( escapes to bytes."""
    out, i = bytearray(), 0
    while i < len(raw):
        c = raw[i:i + 1]
        if c != b'\\':
            out += c
            i += 1
            continue
        nxt = raw[i + 1:i + 2]
        if nxt in (b'n', b'r', b't'):
            out += b' '
            i += 2
        elif nxt.isdigit():
            m = re.match(rb'[0-7]{1,3}', raw[i + 1:])
            out += bytes([int(m.group(0), 8) & 0xFF])
            i += 1 + len(m.group(0))
        else:
            out += nxt
            i += 2
    return bytes(out)


def decode(raw: bytes, font) -> str:
    """One string's bytes, through the current font's /ToUnicode map."""
    table, width = font if font else ({}, 1)
    if not table:
        return raw.decode('latin-1')
    out = []
    for i in range(0, len(raw) - width + 1, width):
        code = int.from_bytes(raw[i:i + width], 'big')
        out.append(table.get(code, ''))
    return ''.join(out)


def text_of(stream: bytes, fonts: dict | None = None) -> str:
    fonts = fonts or {}
    parts: list[str] = []
    font = None

    def piece(tok: bytes) -> str:
        if tok.startswith(b'<'):
            h = re.sub(rb'\s', b'', tok)[1:-1]
            if len(h) % 2:
                h += b'0'
            return decode(bytes.fromhex(h.decode('ascii')), font)
        return decode(unescape(tok[1:-1]), font)

    for m in TOKENS.finditer(stream):
        if m.group(1) is not None:                  # /F3 11 Tf
            font = fonts.get(m.group(1).decode('latin-1'))
        elif m.group(2) is not None:                # [ (a) -30 (b) ] TJ
            parts.append(''.join(piece(t.group(0))
                                 for t in PIECE.finditer(m.group(2))))
        elif m.group(3) is not None or m.group(4) is not None:
            parts.append(piece(m.group(3) or m.group(4)))
        elif m.group(7) is not None:                # T*
            parts.append('\n')
        else:                                       # tx ty Td
            # Converter PDFs place every glyph with its own Td. Only a move
            # that changes the vertical is a new line; the rest is kerning.
            try:
                parts.append('\n' if float(m.group(6)) else '')
            except ValueError:
                pass
    return ''.join(parts)


def via_parser(path: str) -> str:
    data = open(path, 'rb').read()
    objs = load_objects(data)
    order = page_order(objs, data)
    if not order:
        sys.exit('no pages found — the file may be encrypted or damaged')
    cache: dict = {}
    return ''.join(
        f'\n\n=== PAGE {i} ===\n'
        f'{text_of(content(objs, p), page_fonts(objs, p, cache))}'
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
