# The reader

A PWA that opens the built books. No build step: plain ES modules, served as
files, so what runs in the browser is what is in this directory.

```bash
npm run dev          # http://localhost:8080/swedocs/
```

The dev server serves `src/` as the app and `dist/pub/` as `pub/`, at the same
path the deployed site uses, so relative URLs, the service worker's scope and
the `<base>` computation are exercised exactly as they will be in production.

## Shape

| | |
| --- | --- |
| `app.js` | Routing, and the wiring between the pieces below |
| `lib/library.js` | Finds the current build, opens a book as a publication |
| `lib/reader.js` | The reading surface: position, prefetch, page turns |
| `lib/panel.js` | Contents, and the two tiers of search |
| `lib/lightbox.js` | Diagrams, full screen, with pinch and wheel zoom |
| `lib/tables.js` | Keeps a scrolling table's drags away from the paginator |
| `lib/install.js` | The install button, and why there sometimes isn't one |
| `lib/shelf.js` | The library screen |
| `lib/settings.js` | Theme, text size, line height, layout |
| `lib/store.js` | Guarded `localStorage`: settings and reading positions |
| `sw.js` | Offline |
| `vendor/foliate/` | [foliate-js](https://github.com/johnfactotum/foliate-js) (MIT) at `78914ae` |

foliate-js owns pagination, the iframe and the touch gestures. It takes a
`{ loadText, loadBlob, getSize }` loader rather than a file, which is exactly
the shape of a package served unzipped — three `fetch` calls, no zip library,
no range requests, and every chapter its own cache entry.

## URLs

Routes are real paths, not fragments: `<base>/read/<book>/<path>`. The
converter writes those same URLs into every package for links that cross
between books, so one link works in the app *and* from a standalone `.epub`,
where following it opens the browser at the same page.

Static hosting serves `index.html` for those deep paths — on GitHub Pages
that is what `404.html` is for. The inline script in the document head
computes `<base>` from the path rather than hardcoding it, so the app runs at
a domain root, under `/swedocs/`, or from a local server unchanged.

## Theming

`book.css` inside each package declares every colour and metric as a custom
property. The app sets `data-theme` on the document it loads and injects a few
`--reader-*` values; the publisher's styles and the reader's preferences
compose rather than fight. The same stylesheet still works in a standalone
`.epub`, where no app is involved and `prefers-color-scheme` drives it.

Diagrams follow along: Mermaid's palette was rewritten at build time to
`var(--dg-*, …)`, so one SVG is legible in both themes.

## Diagrams and tables

A rendered diagram is an inline SVG sized to the column, and a table is the one
thing on the page that cannot reflow. Both get an app-side affordance that the
package itself knows nothing about, so the same `.epub` in any other reader is
exactly what the converter wrote:

- Tapping a diagram opens a clone of its SVG full screen, with pinch, wheel,
  double-tap and buttons for zoom, and bounded panning. It is vector, so the
  detail was always there — it only needed the room.
- A table becomes a frame the height of the reading surface, scrolling both
  ways, with its header row sticky and its cells capped at a readable measure.
  The paginator turns a touch-drag on the chapter document into a page turn, so
  a drag that starts inside a table that has somewhere to scroll stops
  propagating before it gets there.

## Installing

A manifest, a service worker with a fetch handler, icons, and an https:// origin
make the app installable; `beforeinstallprompt` is caught and spent on a button
rather than left to the browser's own banner, which appears on its own schedule
and is gone for months once dismissed. iOS has no such event — there the same
row names the two taps in the share sheet instead.

The row sits on the shelf, not in the display settings: that dialog opens from
the reader's toolbar, which does not exist on the library screen. `renderShelf`
replaces its container's children, so the row is a node the app owns and
re-mounts after each render.

Over plain http there is no install and no service worker: the row says so,
because that is the one cause a reader can do something about.

## Offline

Two caches with opposite lifetimes. The shell is versioned and swapped
wholesale on deploy. Published chapters live under an immutable
`pub/<build-id>/`, so a cached chapter is correct forever and is never
revalidated — a rebuild writes a new directory rather than changing a file.
Only `latest.json`, which names the current build, goes to the network first.

Chapters are cached as they are read; "Save this book offline" in the display
settings pulls a whole publication in one go.
