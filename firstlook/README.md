# First Look — Client Proposal Templates

Private, unlisted “light proposals” for Beyond Showrooms clients.

**Public URL pattern:** `https://www.beyondshowrooms.com/firstlook/{clientId}/`  
Example: `https://www.beyondshowrooms.com/firstlook/matt_12sQ/`

---

## Folder structure

```
firstlook/
├── README.md                 ← this file
├── style.css                 ← shared styles (all clients)
├── lightbox.js               ← shared masonry, lightbox, sticky nav, collapse
├── resize_images.py          ← compress client JPGs for web
├── compress_pdfs.py          ← compress brochure PDFs for web
├── david.jpg                 ← shared founder photo for CTA
├── _first_look_template/     ← duplicate this for a new First Look
├── _second_look_template/    ← duplicate this for a new Second Look
├── matt_12sQ/                ← live client First Look
└── matt_12sQ_2/              ← live client Second Look
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

Do **not** change `style.css` or `lightbox.js` for a single client.

---

## Related look versions

Under the header date, pick **one** versions pattern (placeholders are commented in each template):

| Looks | Pattern |
|-------|---------|
| 1 | Omit the versions block entirely |
| 2 | Inline switcher: `First Look · Second Look` (current = dark chip) |
| 3+ | Compact `<details>` menu listing dated looks |

Link sibling folders with relative paths, e.g. `../matt_12sQ/` and `../matt_12sQ_2/`.

---

## Image naming

Prefer clear, stable names next to `index.html`:

```
living_room_1.jpg
dining_table_1.jpg
bedroom_1.jpg
```

Rules:

- Lowercase; captions live in the config, not in filenames  
- After adding photos, run `python3 ../resize_images.py` (max long edge 1600px)  
- Brochure PDFs: `brochure_*.pdf` — compress with `python3 ../compress_pdfs.py` when large  

---

## Config block (`FIRST_LOOK_CONFIG`)

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

---

## Page behavior (shared)

| Feature | Behavior |
|---------|----------|
| Sticky nav | Room jump links; horizontal swipe when overflow; tracks active section on scroll |
| Collapsible rooms | Title toggles section; **open by default** |
| Masonry | 1 col &lt;640px · 2 cols 640–959 · 3 cols ≥960 |
| Lightbox | Click image → full-screen; Esc / × / backdrop to close |
| Privacy | `noindex, nofollow` in `<head>` |

---

## Locked copy & content decisions

Keep these unless intentionally revising the templates for all clients:

- First Look title / subtitle as in `_first_look_template`  
- Second Look title / subtitle as in `_second_look_template`  
- No client name in the hero — personalization lives in the intro greeting only  
- Furniture only (no floor plan on the page)  
- No site nav, cookies, pop-ups, or social share buttons  
- Contact block: WhatsApp + Email, shared founder photo (`../david.jpg`)  

---

## Checklist before sending

- [ ] Client name in intro greeting (+ title / meta)  
- [ ] Proposal / update date set  
- [ ] Real photos in the client folder; captions updated  
- [ ] Room titles / intros match the project  
- [ ] Brochure PDFs linked and opening correctly (Second Look)  
- [ ] Version switcher links work both ways (when 2+ looks)  
- [ ] Spot-check WhatsApp + Email  
- [ ] Spot-check mobile + desktop masonry + lightbox  
- [ ] Confirm `noindex, nofollow` still present  
- [ ] Template folders (`_…`) are **not** deployed as client URLs  
