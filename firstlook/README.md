# First Look — Client Proposal Templates

Private, unlisted “light proposals” for Beyond Showrooms clients.

**Public URL pattern:** `https://www.beyondshowrooms.com/firstlook/{clientId}/`  
Example: `https://www.beyondshowrooms.com/firstlook/matt_12sQ/`

---

## Folder structure

```
firstlook/
├── README.md                        ← this file
├── style.css                        ← shared styles (all clients)
├── lightbox.js                      ← shared masonry, lightbox, sticky nav, quote list
├── resize_images.py                 ← compress client JPGs for web
├── compress_pdfs.py                 ← compress brochure PDFs for web
├── david.jpg                        ← shared founder photo for CTA
├── _first_look_template/            ← duplicate for a new First Look
├── _second_look_template/           ← duplicate for a new Second Look
├── _first_rough_quote_template/     ← duplicate for a new First Rough Quote
├── matt_12sQ/                       ← live client First Look
├── matt_12sQ_2/                     ← live client Second Look
└── matt_12sQ_3/                     ← live client First Rough Quote
```

`style.css`, `lightbox.js`, and the Python tools are shared. Never copy CSS/JS into a client folder.  
**Do not deploy** the `_…_template` folders.

---

## Create a new First Look

1. Duplicate `_first_look_template/` → rename to `{firstname}_{4charSuffix}`  
   Example: `sarah_7xKp` (random suffix keeps the URL non-guessable).
2. Edit `index.html`:
   - `<title>` / meta description
   - Date under the header
   - Greeting (`Hi [Name] —` + brief)
   - **`FIRST_LOOK_CONFIG`** — rooms, image paths, captions
   - Versions switcher (default: none; enable when a Second Look exists)
3. Drop photos into the folder; run `python3 ../resize_images.py`
4. Deploy. Send: `www.beyondshowrooms.com/firstlook/{folder}/`

## Create a Second Look (follow-up)

1. Duplicate `_second_look_template/` → rename to `{firstname}_{4charSuffix}_2`  
   Keep it a **sibling** of the First Look folder.
2. Edit `index.html`:
   - Title / meta / date / greeting
   - Versions links → point at the First Look folder (`../{firstname}_{suffix}/`)
   - Room intros + brochure CTAs in **`FIRST_LOOK_CONFIG`**
3. Drop photos + brochure PDFs into the folder  
   - Images: `python3 ../resize_images.py`  
   - Large PDFs: `python3 ../compress_pdfs.py` (requires `pymupdf` + Pillow)
4. On the **First Look** page, uncomment the 2-look versions switcher and link to this Second Look.
5. Deploy both folders. Spot-check the version chips both ways.

## Create a First Rough Quote

1. Duplicate `_first_rough_quote_template/` → rename to `{firstname}_{4charSuffix}_3`  
   Keep it a **sibling** of the Look folders (same pattern as `matt_12sQ_3`).
2. Edit `index.html`:
   - Title / meta / date / greeting
   - Versions links → Look 1 / Look 2 / this Quote
   - **`FIRST_LOOK_CONFIG.quote`** — room title, intro, hero reference image, line items, totals, footnotes
3. Drop product photos (+ optional secondary images, e.g. finish boards) into the folder  
   - Images: `python3 ../resize_images.py`
4. On Look 1 / Look 2 pages, switch the versions nav to the **3+ compact menu** and link this Quote.
5. Double-check: every `priceLabel` matches the factory sheet, and `totalLabel` equals the sum.
6. Deploy. Spot-check version links all ways + mobile quote rows + lightbox (including multi-image items).

Do **not** change `style.css` or `lightbox.js` for a single client.

---

## Related look versions

Under the header date, pick **one** versions pattern (placeholders are commented in each template):

| Looks | Pattern |
|-------|---------|
| 1 | Omit the versions block entirely |
| 2 | Inline switcher: `First Look · Second Look` (current = dark chip) |
| 3+ | Compact `<details>` menu listing dated looks (use when a Rough Quote exists) |

Link sibling folders with relative paths, e.g. `../matt_12sQ/`, `../matt_12sQ_2/`, `../matt_12sQ_3/`.

---

## Image naming

Prefer clear, stable names next to `index.html`:

```
living_room_1.jpg
dining_table_1.jpg
bedroom_1.jpg
bed.jpg                 ← rough-quote product thumbs
wallfitout_2.jpg        ← optional secondary lightbox image
```

Rules:

- Lowercase; captions / summaries live in the config, not in filenames  
- After adding photos, run `python3 ../resize_images.py` (max long edge 1600px)  
- Brochure PDFs: `brochure_*.pdf` — compress with `python3 ../compress_pdfs.py` when large  

---

## Config block (`FIRST_LOOK_CONFIG`)

### Looks (rooms + masonry)

```js
window.FIRST_LOOK_CONFIG = {
  rooms: [
    {
      id: 'living-room',       // anchor + sticky nav
      title: 'Living Room',
      // optional:
      intro: "Room note. Link with {{brochure}}.",
      brochure: {
        label: 'factory brochure',
        href: 'brochure_example.pdf',
        cta: 'Brochure: Extended Options'
      },
      // or multiple end-of-section CTAs:
      // brochures: [ { href, cta }, { href, cta } ],
      images: [
        {
          src: 'living_room_1.jpg',
          caption: 'Caption — material and one distinguishing detail.',
          alt: 'Short accessible description'
        }
      ]
    }
  ]
};
```

Caption format: **`Caption — material and one distinguishing detail`**  
Factual and restrained. **Never use the word “replica”.** Prefer “designer-inspired.”

### Rough quote (`quote`)

```js
window.FIRST_LOOK_CONFIG = {
  hideRoomNav: true,
  rooms: [],
  quote: {
    id: 'master-bedroom',
    title: 'Master Bedroom',
    intro: 'Short framing line for the price list…',
    hero: { src: 'reference_photo.jpg', alt: '…' },
    totalLabel: '$18,520',
    totalHeading: 'Room total*',
    priceNoteHtml: '* All items above are <strong>quoted as ex-factory prices</strong>, …',
    dimsNoteHtml: '† Dimensions converted from metric…',
    photoTip: 'Tap a row to enlarge.',
    items: [
      {
        src: 'bed.jpg',
        label: 'Bedframe & headboard',
        summary: 'Polished factory description…',
        dims: '~ 7\'9" × 7\'6" × 4\'6" (L × W × H)',
        qty: 1,
        priceLabel: '$5,380'
      },
      {
        src: 'wallfitout.jpg',
        images: [
          { src: 'wallfitout.jpg' },
          { src: 'wallfitout_2.jpg', caption: 'Marble finish options' }
        ],
        label: 'Wall fit-out behind bed',
        summary: 'Primary product description…',
        dims: '~ 11\'6" × 9\'10" (W × H)',
        qty: 1,
        priceLabel: '$1,870'
      }
    ]
  }
};
```

Multi-image items: optional `images[]`. Secondary slides use their own `caption` in the lightbox (not the product `summary`). Thumb shows a count badge when `images.length > 1`.

---

## Page behavior (shared)

| Feature | Behavior |
|---------|----------|
| Sticky nav | Room jump links; horizontal swipe when overflow; tracks active section on scroll |
| Collapsible rooms | Title toggles section; **open by default** |
| Masonry | 1 col &lt;640px · 2 cols 640–959 · 3 cols ≥960 |
| Lightbox | Click image (or quote row) → full-screen; Esc / × / backdrop to close; ←/→ when multiple |
| Quote list | Mobile stacked rows; desktop columns; optional multi-image carousel per item |
| Privacy | `noindex, nofollow` in `<head>` |

---

## Locked copy & content decisions

Keep these unless intentionally revising the templates for all clients:

- First Look title / subtitle as in `_first_look_template`  
- Second Look title / subtitle as in `_second_look_template`  
- Rough Quote title / subtitle as in `_first_rough_quote_template`  
- No client name in the hero — personalization lives in the intro greeting only  
- Furniture only on Look pages (no floor plan on the page)  
- Quote prices are **ex-factory** / indicative; footnotes stay near the total  
- No site nav, cookies, pop-ups, or social share buttons  
- Contact block: WhatsApp + Email, shared founder photo (`../david.jpg`)  

---

## Checklist before sending

- [ ] Client name in intro greeting (+ title / meta)  
- [ ] Proposal / update date set  
- [ ] Real photos in the client folder; captions / summaries updated  
- [ ] Room titles / intros match the project  
- [ ] Brochure PDFs linked and opening correctly (Second Look)  
- [ ] Quote: prices + qty match factory sheet; room total sums correctly  
- [ ] Quote: multi-image items (if any) open correctly in the lightbox  
- [ ] Version switcher links work both ways (when 2+ docs)  
- [ ] Spot-check WhatsApp + Email  
- [ ] Spot-check mobile + desktop (masonry / quote rows + lightbox)  
- [ ] Confirm `noindex, nofollow` still present  
- [ ] Template folders (`_…`) are **not** deployed as client URLs  
