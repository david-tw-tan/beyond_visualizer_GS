# Furniture Moodboard — Architecture Notes

Frontend-only MVP (`index.html`, `waterfall.js`, `waterfall.css`, `furniture_database.json`). Thumbnails load from GitHub Pages (`THUMBNAIL_BASE_URL` in `waterfall.js`). Bookmarks in `localStorage`. This doc captures behavior worth preserving for future work.

---

## Waterfall gallery — what appears

- **Tiles:** `img_category` `collection` or `loose_item` only, and only **hero** images (`*_A.jpg` via `isHeroImage()`).
- **`collection_item` rows never appear** in the browse waterfall (exception: **keyword search** shows all matching rows, including `collection_item` and variant photos).
- **SET badge:** Shown on `collection` heroes only when that `collection_id` has at least one `collection_item` in the DB (`collectionIdsWithItems`).
- **Layout:** Flex-column masonry (`mountMasonryColumns` / `distributeMasonryCards`), not CSS `column-count` (avoids paint bugs). Gallery columns: 2 / 2 / 3 / 4 by viewport width. Column entrance uses shuffled stagger delays (`GALLERY_COLUMN_STAGGER_MS`).

---

## Feed weighting & ordering

All mix ratios target the **share of visible tiles**, not the raw pool size (`mixWeighted()`).

### Collection vs loose

| Constant | Default | Used in |
|----------|---------|---------|
| `EXPLORE_COLL_RATIO` | 0.70 | Explore cycle 1 |
| `DESIGN_COLL_RATIO` | 0.70 | Design cycle 1 |
| `CYCLE2_EXPLORE_COLL_RATIO` | 0.80 | Explore cycle 2 |
| `CYCLE2_DESIGN_COLL_RATIO` | 0.80 | Design cycle 2 |

`mixWeighted()` picks how many collection vs loose heroes to show, then **interleaves** loose items evenly between collection tiles so loose doesn’t cluster at the end.

### Explore Styles — room weighting

- One active style filter; all rooms included.
- Per room: `mixWeighted(collection, loose, ratio)` into `roomPools`.
- **Interleave across rooms** via `interleaveRoomQueues()` + `EXPLORE_ROOM_WEIGHT` (default: `living: 2`, others `1`) so living appears more often but rooms don’t stack in blocks.

### Design a Room

- Filtered by selected room, styles, price, optional product search.
- Single pool: `mixWeighted()` (no room interleave).

### Two-cycle browse feed (`FEED_CYCLE_COUNT = 2`)

Concatenated scroll (not infinite scroll):

1. **Cycle 1:** Hero `_A` images only, with ratios above.
2. **Cycle 2:** For pieces shown in cycle 1 — prefer variant photos `_B` / `_C`; extra loose heroes; collection hero repeats only if no variants exist. Re-uses explore room interleave or design `mixWeighted` with cycle-2 ratios.

Keyword search skips two-cycle logic and shuffles the filtered list (see **Keyword search** below).

---

## Thumbnail aspect — extreme landscape only (locked)

**Scope:** Gallery + bookmark waterfall thumbs only. **Lightbox / collection grid:** full natural aspect (`object-fit: contain`).

**No crop** unless natural `width ÷ height ≥ EXTREME_LANDSCAPE_THRESHOLD` (default **2.0**).

When cropped (`createThumbMedia` → `pickExtremeLandscapeDisplayRatio`):

| Case | Display frame (center crop, `object-fit: cover`) |
|------|--------------------------------------------------|
| **~2/3** of extreme wides (stable hash per `thumbnail_url`) | **Texture zoom:** `1`, `5/6`, or `4/5` — square / slight portrait detail shots |
| **~1/3** (remainder) | **Landscape preserve:** interpolate **5:4 → 3:2** as source gets wider; cap at **3:2** when ratio ≥ `EXTREME_LANDSCAPE_FULL` (2.75) |

**Tunables** (top of `waterfall.js`):

```js
EXTREME_LANDSCAPE_THRESHOLD      // when any thumb crop starts
EXTREME_LANDSCAPE_FULL           // full 3:2 frame
EXTREME_LANDSCAPE_TEXTURE_RATE   // e.g. 1/3 → texture zoom tiles
EXTREME_LANDSCAPE_TEXTURE_ASPECTS
THUMB_FRAME_5_4, THUMB_FRAME_3_2
```

Rationale: wide high-end sofas stay readable in most thumbs; occasional texture crops break up landscape clusters without overriding the whole feed.

---

## Three-layer navigation (gallery path)

```
Layer 1 — Waterfall grid
    click tile
Layer 2 — Lightbox (item / collection hero)
    A/B/C variants: dots, arrows, swipe
    "View collection (N items)" if SET collection has collection_items
    click View collection
Layer 3 — Collection grid (up to 16 items, dynamic grid layout)
    click piece
Layer 3b — Lightbox (collection_item)
    Back → Layer 3 grid
    Escape / backdrop: context-dependent (see below)
```

- **Variants:** `getItemImageGroup()` — all rows sharing the same base filename (`*_A`, `*_B`, `*_C`…).
- **Layer 2 anchor** stored in `lightboxLayer2Item` when drilling into a collection.
- **Collection grid** does not use extreme-landscape thumb normalization (natural thumbs).

---

## Bookmarks — how it differs

**Storage:** `localStorage` key `furniture_bookmarks_v1`; Map keyed by hero `thumbnail_url`. Always bookmark **hero** (`toHeroItem()`).

**Board UI (`renderBookmarkView`):**

- Grouped by **room** → **collections** (SET anchor + nested `collection_item` rows as linked, smaller cards) + **loose** heroes.
- Nested pieces from a starred SET appear under the collection even if not individually starred (`linked: true`). Individually starred nested pieces also exist in data but are **deduped** from the loose list when the parent collection is starred.
- Same masonry column layout; same extreme-landscape thumb rules as gallery.

**Bookmark lightbox (`openLightbox(..., { fromBookmark: true })`):**

- Renders **on top of** bookmark view (`lightbox-over-bookmarks`, higher z-index) — bookmark page stays visible underneath.
- **Close (✕)** instead of gallery back stack.
- No “View collection” button from bookmark path (simpler single-level lightbox UX).
- **Unstar on close:** If user opened a starred item and unstarred inside lightbox, confirm before removing from board on close.
- **Cannot unstar a SET** while any nested `collection_item` from that set is still starred (`canUnstarBookmarkItem()`).

**Gallery lightbox** uses backdrop/escape to dismiss or step back from Layer 3b → Layer 3; bookmark path uses `closeLightbox()` for a single overlay.

---

## Data model reminders

| `img_category` | Role |
|----------------|------|
| `collection` | Room/set hero (`_A` in waterfall) |
| `loose_item` | Standalone hero |
| `collection_item` | Piece inside a set; Layer 3 grid + 3b lightbox only |

Images: `filename_raw` → `https://david-tw-tan.github.io/beyond_visualizer_GS/waterfall_thumbnails/{file}` (see `THUMBNAIL_BASE_URL`).

---

## Modes

| Mode | Entry | Filters |
|------|-------|---------|
| **Explore Styles** | Home → random style | Style pills; all rooms |
| **Design a Room** | Room → style(s) → results | Room, multi-style, premium/luxury, optional keyword search (see below). |

### Keyword search (Design mode only)

**Where:** Design a Room gallery only (🔍 icon). Explore Styles has no product search.

**Match rules** (both must pass style + price filters first):

| Field | Rule | Example |
|-------|------|---------|
| `img_product_type` | Case-insensitive **substring** | `dining` → `diningtable`, `diningchair` |
| `img_category` | **Exact** match on full value | `loose_item` only if user types that whole string |

**What usually appears in results**

- **`loose_item`** rows with a populated `img_product_type`.
- **`collection_item`** rows (individual pieces inside a set) with a populated `img_product_type`.
- All photo variants for a match (`_A`, `_B`, `_C`…), not just hero `_A`.

**What does *not* appear (main gap users notice)**

- **`collection` set heroes** — room/set overview images tagged `img_category: collection` with **empty or blank `img_product_type`**. These are what carry the SET badge in the browse waterfall but they do not match typical keywords (`bed`, `dining`, `sofa`, etc.). Search is oriented toward **piece-level** types, not whole-set hero shots.
- Exception: typing the literal category name `collection` would match `img_category === 'collection'` (unusual).

**Filters while search is active**

| Filter | Behavior |
|--------|----------|
| Selected **room** | **Ignored** — search runs across all rooms. Mode line shows `All rooms`. |
| **Style** pills | Still applied |
| **Premium / Luxury** | Still applied |

**UI copy:** Caption under the active search tag (and note in the search modal) states that room filter is ignored, style/price still apply, and **collection sets are not included** in search results.

**After clear search:** Room filter returns; browse feed returns to hero-only `_A` tiles + two-cycle mixing (`collection` / `loose_item` only, no `collection_item` in waterfall).

**Implementation:** `render()` in `waterfall.js` — search block inside `currentMode === 'design'`; `productSearch` variable; `updateActiveSearchTag()` for caption.

---

## Files to edit for common tasks

| Task | Where |
|------|--------|
| Feed mix / room bias / cycles | `waterfall.js` CONFIG + `buildExploreFeed`, `mixWeighted`, `buildTwoCycleBrowseFeed` |
| Thumb crop / texture rate | `waterfall.js` CONFIG + `pickExtremeLandscapeDisplayRatio` |
| Lightbox / layers | `openLightbox`, `openCollectionGrid`, `closeLightbox`, escape handler |
| Bookmarks | `buildBookmarkGroups`, `toggleBookmark`, `renderBookmarkView` |
| Masonry / card UI | `mountMasonryColumns`, `createGalleryCard`, `waterfall.css` |
