/* ═══════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════ */
const STORAGE_KEY = 'furniture_bookmarks_v1';
const STYLE_OPTIONS = [
    'minimalist luxury',
    'refined luxury',
    'ultra luxury',
    'mid century luxury',
    'playful luxury'
];

const STYLE_DESCRIPTIONS = {
    'minimalist luxury':
        'Refined simplicity and restrained design with exceptional clarity and purpose.',
    'refined luxury':
        'Elegant luxury defined by premium materials, balanced richness, and timeless appeal.',
    'ultra luxury':
        'Bold, expressive interiors defined by maximal opulence and statement-making design.',
    'mid century luxury':
        'Iconic mid-century forms reimagined through a modern luxury lens.',
    'playful luxury':
        'Youthful, expressive, and experimental design inspired by emerging trends and social-media culture.'
};

/** Short chip labels (data keys stay full "… luxury" strings). */
const STYLE_LABELS = {
    'minimalist luxury': 'Minimalist',
    'refined luxury': 'Refined Luxury',
    'ultra luxury': 'Ultra Luxury',
    'mid century luxury': 'Mid Century',
    'playful luxury': 'Playful'
};

function styleLabel(style) {
    return STYLE_LABELS[style] || capitalize(style);
}

const PRICE_LABELS = {
    premium: 'Premium $',
    luxury: 'Luxury $$'
};

function priceLabel(price) {
    return PRICE_LABELS[price] || capitalize(price);
}

const ROOM_OPTIONS = ['bedroom', 'living', 'dining', 'study'];

/* ═══════════════════════════════════════════
   WATERFALL MIX RATIOS (tune these, 0.0–1.0)
   Browse pool: anchor_item === "yes" only (staged sets + manual anchor loose heroes).
   Target share of visible tiles that are img_category "collection"
   (remainder = anchor loose_item heroes; collection_item never in waterfall).
   ═══════════════════════════════════════════ */
const EXPLORE_COLL_RATIO = 0.70;
const DESIGN_COLL_RATIO  = 0.70;

/** Explore Styles only: relative room frequency in the feed (higher = more tiles) */
const EXPLORE_ROOM_WEIGHT = {
    living: 2,
    bedroom: 1,
    dining: 1,
    study: 1
};
const EXPLORE_ROOM_ORDER = ['living', 'bedroom', 'dining', 'study'];

/**
 * Browse feed (search off): every anchor A hero once, 70/30 collection vs anchor loose
 * (interleaved). No repeats or extra variant tiles in the waterfall.
 */

/**
 * Thumbnail crop: gallery/bookmarks only (lightbox = full image).
 * Moderate landscape (≥ THRESHOLD): taller frames + center cover.
 * Extreme wides: stronger crop; ~half become square-ish texture zoom tiles.
 */
const EXTREME_LANDSCAPE_THRESHOLD = 1.55;
const EXTREME_LANDSCAPE_FULL = 2.15;
const THUMB_FRAME_5_4 = 1.38;
const THUMB_FRAME_3_2 = 1.68;

/** Share of cropped wides that become texture zoom tiles (0–1). */
const EXTREME_LANDSCAPE_TEXTURE_RATE = 0.45;

/** width÷height for texture zoom frames — square or slight portrait */
const EXTREME_LANDSCAPE_TEXTURE_ASPECTS = [1, 5 / 6, 4 / 5];

/**
 * Thumbnail folder (relative to index.html).
 * Local dev: keep img_db_final/ in this project.
 * GitHub Pages: upload img_db_final/ beside index.html, waterfall.js, waterfall.css.
 */
const THUMBNAIL_BASE_URL = 'img_db_final/';

/* ═══════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════ */
let MASTER = [];
let SHUFFLED = [];
let BOOKMARKS = new Map();

let currentMode = null;        // 'explore' | 'design'
let selectedRoom = null;       // for design mode
let exploreFilter = null;      // single style for explore mode
let designFilters = new Set(); // multi-select styles for design mode

let currentLightboxItem = null;
let lightboxMode = null;           // 'overview' | 'detail'
let lightboxOverviewAnchor = null; // anchor when overview is active

let priceFilters = new Set(['premium', 'luxury']); // design mode: both active by default
const PRICE_FILTER_OPTIONS = ['premium', 'luxury'];
let productSearch = '';                           // design mode: product type search
let designBrowseTab = 'collections';              // 'collections' | 'accessories'
let PRODUCT_TYPES = [];                           // extracted from data for autocomplete

/* ═══════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════ */
const views = {
    home:    document.getElementById('homeView'),
    style:   document.getElementById('stepStyleView'),
    gallery: document.getElementById('galleryView')
};

const gallery      = document.getElementById('gallery');
const emptyState   = document.getElementById('emptyState');
const galleryShowroomNote = document.getElementById('galleryShowroomNote');
const filterContainer = document.getElementById('filterContainer');
const galleryTitle    = document.getElementById('galleryTitle');
const lightbox     = document.getElementById('lightbox');
const lightboxContent = document.querySelector('#lightbox .lightbox-content');
const lightboxImg  = document.getElementById('lightboxImg');
const starBtn      = document.getElementById('starBtn');
const lightboxBackBtn = document.getElementById('lightboxBackBtn');
const lightboxImageWrap = document.getElementById('lightboxImageWrap');
const lightboxStage = document.getElementById('lightboxStage');
const lightboxOverview = document.getElementById('lightboxOverview');
const lightboxOverviewScroll = document.getElementById('lightboxOverviewScroll');
const lightboxDetail = document.getElementById('lightboxDetail');
const lightboxDetailTitle = document.getElementById('lightboxDetailTitle');
const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
/** collection_ids that have at least one collection_item in the DB */
let collectionIdsWithItems = new Set();

let lightboxSource = 'gallery';       // 'gallery' | 'bookmark' | 'accessories'
let bookmarkLightboxWasStarred = false;
const bookmarkBtn  = document.getElementById('bookmarkBtn');
const bookmarkCount = document.getElementById('bookmarkCount');
const bookmarkView = document.getElementById('bookmarkView');

/* Search & price filter DOM refs */
const searchIcon         = document.getElementById('searchIcon');
const searchModal        = document.getElementById('searchModal');
const searchModalClose   = document.getElementById('searchModalClose');
const searchModalInput   = document.getElementById('searchModalInput');
const searchModalClear   = document.getElementById('searchModalClear');
const searchModalSuggestions = document.getElementById('searchModalSuggestions');
const searchModalRoomNote = document.getElementById('searchModalRoomNote');
const priceFilterContainer = document.getElementById('priceFilterContainer');
const spinnerOverlay     = document.getElementById('spinnerOverlay');
const activeSearchRow    = document.getElementById('activeSearchRow');
const activeSearchTag    = document.getElementById('activeSearchTag');
const designBrowseTabs     = document.getElementById('designBrowseTabs');
const designTabCollections = document.getElementById('designTabCollections');
const designTabAccessories = document.getElementById('designTabAccessories');
const accessoriesGallery = document.getElementById('accessoriesGallery');
const accessoriesEmpty   = document.getElementById('accessoriesEmpty');
const scrollToTopBtn     = document.getElementById('scrollToTopBtn');

/* ═══════════════════════════════════════════
   SCROLL TO TOP  (gallery + accessories only)
   ═══════════════════════════════════════════ */
const SCROLL_TO_TOP_THRESHOLD = 520;
let scrollToTopRaf = 0;

function isWaterfallScrollContextActive() {
    if (!scrollToTopBtn) return false;
    if (bookmarkView && bookmarkView.style.display === 'block') return false;
    if (lightbox && lightbox.style.display === 'flex') return false;
    if (searchModal && searchModal.style.display === 'flex') return false;
    return views.gallery && views.gallery.style.display !== 'none' && !!currentMode;
}

function getWaterfallScrollTop() {
    return window.scrollY || document.documentElement.scrollTop || 0;
}

function scrollWaterfallToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateScrollToTopButton() {
    if (!scrollToTopBtn) return;

    const show =
        isWaterfallScrollContextActive() &&
        getWaterfallScrollTop() >= SCROLL_TO_TOP_THRESHOLD;

    scrollToTopBtn.classList.toggle('scroll-to-top--visible', show);
    scrollToTopBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function scheduleScrollToTopUpdate() {
    if (scrollToTopRaf) return;
    scrollToTopRaf = requestAnimationFrame(() => {
        scrollToTopRaf = 0;
        updateScrollToTopButton();
    });
}

/* ═══════════════════════════════════════════
   DATA LOADING
   ═══════════════════════════════════════════ */
function resolveThumbnailUrl(item) {
    const file = item.filename_raw ||
        (item.thumbnail_url && item.thumbnail_url.split('/').pop());
    if (!file) return '';
    return `${THUMBNAIL_BASE_URL}${encodeURIComponent(file).replace(/%2F/g, '/')}`;
}

function findMasterByBookmarkKey(key, fallbackItem) {
    const byUrl = MASTER.find(x => x.thumbnail_url === key);
    if (byUrl) return byUrl;

    const file = key && key.split('/').pop();
    if (!file) return fallbackItem;

    return MASTER.find(x =>
        x.filename_raw === file || x.thumbnail_url.endsWith(`/${file}`)
    ) || fallbackItem;
}

async function loadData() {
    console.log('[DATA] Loading JSON...');
    const res = await fetch('furniture_database.json');
    const data = await res.json();

    MASTER = data.map(item => ({
        ...item,
        thumbnail_url: resolveThumbnailUrl(item)
    }));

    SHUFFLED = shuffle([...MASTER]);
    console.log('[DATA] Loaded', MASTER.length, 'items');

    // Extract unique values for autocomplete (product types + categories)
    const typeSet = new Set();
    const catSet  = new Set();
    MASTER.forEach(item => {
        if (item.img_product_type && item.img_product_type.trim()) {
            typeSet.add(item.img_product_type.trim().toUpperCase());
        }
        if (item.img_category && item.img_category.trim()) {
            catSet.add(item.img_category.trim().toLowerCase());
        }
    });
    // Combine: product types first, then category keywords
    PRODUCT_TYPES = Array.from(typeSet).sort().concat(Array.from(catSet).sort());
    console.log('[DATA] Product types:', typeSet.size, '| Categories:', catSet.size);

    collectionIdsWithItems = new Set();
    MASTER.forEach(item => {
        if (item.collection_id && item.img_category === 'collection_item') {
            collectionIdsWithItems.add(item.collection_id);
        }
    });
    console.log('[DATA] Collections with items:', collectionIdsWithItems.size);

    loadBookmarks();
    updateBookmarkUI();
}

/* ═══════════════════════════════════════════
   VIEW MANAGEMENT
   ═══════════════════════════════════════════ */
function showView(name) {
    Object.values(views).forEach(el => el.style.display = 'none');
    if (views[name]) views[name].style.display = '';

    // Gallery view needs special handling (it's a div, not flex center)
    if (name === 'gallery') {
        views.gallery.style.display = 'block';
    }
    updateScrollToTopButton();
}

function goHome() {
    currentMode = null;
    selectedRoom = null;
    exploreFilter = null;
    designFilters.clear();
    designBrowseTab = 'collections';
    priceFilters = new Set(['premium', 'luxury']);
    productSearch = '';
    closeSearchModal();
    updateActiveSearchTag();
    showView('home');
}

/* ═══════════════════════════════════════════
   HERO & MIX HELPERS
   ═══════════════════════════════════════════ */
function isHeroImage(item) {
    return item.filename_raw && /_A\.jpg$/i.test(item.filename_raw);
}

/** Staged set or room anchor piece — eligible for default browse waterfall */
function isAnchorBrowseItem(item) {
    return item && item.anchor_item === 'yes';
}

function mixWeighted(collections, looseItems, ratio, exhaustPool = false) {
    const shuffledColl = shuffle([...collections]);
    const shuffledLoose = shuffle([...looseItems]);

    if (shuffledColl.length === 0) return shuffledLoose;
    if (shuffledLoose.length === 0) return shuffledColl;

    let nColl;
    let nLoose;

    if (exhaustPool) {
        nColl = shuffledColl.length;
        nLoose = shuffledLoose.length;
    } else {
        // Hit ratio on the *feed we show*, not the whole filtered pool.
        const looseNeededForAllColl = Math.round(
            shuffledColl.length * (1 - ratio) / ratio
        );

        if (looseNeededForAllColl <= shuffledLoose.length) {
            nColl = shuffledColl.length;
            nLoose = looseNeededForAllColl;
        } else {
            nLoose = shuffledLoose.length;
            nColl = Math.min(
                shuffledColl.length,
                Math.round(nLoose * ratio / (1 - ratio))
            );
        }
    }

    const collPool = shuffledColl.slice(0, nColl);
    const loosePool = shuffledLoose.slice(0, nLoose);

    // Interleave: distribute loose items evenly among collections
    const result = [];
    const loosePerColl = nLoose / nColl;
    let looseInserted = 0;

    for (let i = 0; i < collPool.length; i++) {
        const targetLoose = Math.round((i + 1) * loosePerColl);
        while (looseInserted < targetLoose && looseInserted < nLoose) {
            result.push(loosePool[looseInserted++]);
        }
        result.push(collPool[i]);
    }

    while (looseInserted < nLoose) {
        result.push(loosePool[looseInserted++]);
    }

    return result;
}

/** Build pick cycle from room weights (e.g. living twice per bedroom once) */
function buildExploreRoomPickCycle(weights) {
    const scale = 2;
    const cycle = [];
    EXPLORE_ROOM_ORDER.forEach(room => {
        const n = Math.max(0, Math.round((weights[room] ?? 1) * scale));
        for (let i = 0; i < n; i++) cycle.push(room);
    });
    return cycle.length ? cycle : [...EXPLORE_ROOM_ORDER];
}

/** Round-robin across rooms so tiles don't cluster by room_type */
function interleaveRoomQueues(roomPools, pickCycle) {
    const queues = {};
    Object.entries(roomPools).forEach(([room, items]) => {
        queues[room] = [...items];
    });

    const remaining = () =>
        Object.values(queues).reduce((sum, q) => sum + q.length, 0);

    const result = [];
    let cycleIdx = 0;

    while (remaining() > 0) {
        let placed = false;
        for (let attempt = 0; attempt < pickCycle.length; attempt++) {
            const room = pickCycle[(cycleIdx + attempt) % pickCycle.length];
            if (queues[room]?.length) {
                result.push(queues[room].shift());
                cycleIdx = (cycleIdx + attempt + 1) % pickCycle.length;
                placed = true;
                break;
            }
        }
        if (!placed) break;
    }

    return result;
}

/**
 * Explore Styles: all rooms for one style, collection/loose mix per room,
 * then weighted interleave (living favored, rooms spread out).
 */
function buildExploreFeed(list, collRatio) {
    const roomPools = {};

    EXPLORE_ROOM_ORDER.forEach(room => {
        const roomList = list.filter(x => x.room_type === room);
        if (roomList.length === 0) return;

        const coll = roomList.filter(x => x.img_category === 'collection');
        const loose = roomList.filter(x => x.img_category === 'loose_item');
        roomPools[room] = mixWeighted(coll, loose, collRatio, true);
    });

    const pickCycle = buildExploreRoomPickCycle(EXPLORE_ROOM_WEIGHT);
    const mixed = interleaveRoomQueues(roomPools, pickCycle);

    const other = list.filter(x => !EXPLORE_ROOM_ORDER.includes(x.room_type));
    if (other.length) {
        const coll = other.filter(x => x.img_category === 'collection');
        const loose = other.filter(x => x.img_category === 'loose_item');
        return mixed.concat(mixWeighted(coll, loose, collRatio, true));
    }

    return mixed;
}

function buildDesignBrowseFeed(list, collRatio) {
    const collections = list.filter(x => x.img_category === 'collection');
    const looseItems = list.filter(x => x.img_category === 'loose_item');
    return mixWeighted(collections, looseItems, collRatio, true);
}

/** One tile per anchor A hero — 70/30 mix, no repeats or variant tiles. */
function buildBrowseFeed(list, mode) {
    const browse = list.filter(x => isAnchorBrowseItem(x) && isHeroImage(x));
    const collRatio = mode === 'explore' ? EXPLORE_COLL_RATIO : DESIGN_COLL_RATIO;
    const items = mode === 'explore'
        ? buildExploreFeed(browse, collRatio)
        : buildDesignBrowseFeed(browse, collRatio);

    return { items };
}

/* ═══════════════════════════════════════════
   EXPLORE STYLES
   ═══════════════════════════════════════════ */
function enterExplore() {
    currentMode = 'explore';
    selectedRoom = null;
    designFilters.clear();
    designBrowseTab = 'collections';

    // Pick a random style
    const randomStyle = STYLE_OPTIONS[Math.floor(Math.random() * STYLE_OPTIONS.length)];
    exploreFilter = randomStyle;

    showView('gallery');
    renderFilters();
    render();
}

/* ═══════════════════════════════════════════
   START  —  Room (step 1) + Explore link
   ═══════════════════════════════════════════ */
function selectAllDesignStyles() {
    designFilters.clear();
    STYLE_OPTIONS.forEach(style => designFilters.add(style));
}

function enterDesignGallery() {
    selectAllDesignStyles();
    currentMode = 'design';
    exploreFilter = null;
    designBrowseTab = 'collections';
    showView('gallery');
    updateGalleryHeader();
    renderFilters();
    render();
}

function selectRoomAndEnterStyle(room) {
    selectedRoom = room;
    enterDesignGallery();
}

document.querySelectorAll('#homeView .step-card').forEach(card => {
    const room = card.dataset.room;
    card.addEventListener('click', () => selectRoomAndEnterStyle(room));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectRoomAndEnterStyle(room);
        }
    });
});

document.getElementById('exploreStylesLink').addEventListener('click', enterExplore);

/* ═══════════════════════════════════════════
   HOME BUTTON
   ═══════════════════════════════════════════ */
document.getElementById('homeBtn').addEventListener('click', goHome);

/* ═══════════════════════════════════════════
   FILTER RENDERING
   ═══════════════════════════════════════════ */
function renderFilters() {
    filterContainer.innerHTML = '';

    // Show/hide design-mode-only UI
    if (currentMode === 'design') {
        searchIcon.style.display = 'flex';
        priceFilterContainer.style.display = '';
        renderPriceFilters();
    } else {
        searchIcon.style.display = 'none';
        priceFilterContainer.style.display = 'none';
        productSearch = '';
        closeSearchModal();
    }

    // Update active search tag visibility
    updateActiveSearchTag();

    // Style filters (always shown in gallery)
    STYLE_OPTIONS.forEach(style => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn style-filter-btn';
        btn.dataset.cat = style;

        const isActive = currentMode === 'explore'
            ? exploreFilter === style
            : designFilters.has(style);

        if (isActive) btn.classList.add('active');
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const check = document.createElement('span');
        check.className = 'filter-btn-check';
        check.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'filter-btn-label';
        label.textContent = styleLabel(style);

        btn.appendChild(check);
        btn.appendChild(label);

        btn.addEventListener('click', () => handleFilterClick(style, btn));
        filterContainer.appendChild(btn);
    });

    updateGalleryHeader();
}

function updateActiveSearchTag() {
    const hintEl = document.getElementById('activeSearchHint');

    if (currentMode === 'design' && productSearch) {
        activeSearchRow.style.display = '';
        activeSearchTag.innerHTML = `
            Search: "${escapeHtml(productSearch)}"
            <button class="search-clear-inline" id="clearSearchTag" title="Clear search">✕</button>
        `;
        if (hintEl) {
            hintEl.style.display = '';
            hintEl.textContent =
                'Room filter ignored while keyword search is active. Style and price filters still apply. ' +
                'Collection sets are not included in search results (search targets loose items and collection pieces with a product type).';
        }
        document.getElementById('clearSearchTag').addEventListener('click', () => {
            productSearch = '';
            updateActiveSearchTag();
            updateGalleryHeader();
            render();
        });
    } else {
        activeSearchRow.style.display = 'none';
        activeSearchTag.innerHTML = '';
        if (hintEl) hintEl.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function togglePriceFilter(price) {
    if (priceFilters.has(price) && priceFilters.size === 1) return false;
    if (priceFilters.has(price)) priceFilters.delete(price);
    else priceFilters.add(price);
    return true;
}

function syncPriceFilterButtons(container) {
    if (!container) return;
    container.querySelectorAll('.filter-btn[data-price]').forEach(btn => {
        btn.classList.toggle('active', priceFilters.has(btn.dataset.price));
    });
}

function onPriceFiltersChanged() {
    syncPriceFilterButtons(priceFilterContainer);
    updateGalleryHeader();
    if (currentMode === 'design') {
        render();
    }
}

function buildPriceFilterButton(price) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.dataset.price = price;
    btn.textContent = priceLabel(price);
    if (priceFilters.has(price)) btn.classList.add('active');
    btn.addEventListener('click', () => {
        if (!togglePriceFilter(price)) return;
        onPriceFiltersChanged();
    });
    return btn;
}

function renderPriceFilters() {
    if (!priceFilterContainer) return;
    priceFilterContainer.innerHTML = '';
    PRICE_FILTER_OPTIONS.forEach(price => {
        priceFilterContainer.appendChild(buildPriceFilterButton(price));
    });
}

function getGalleryTitle() {
    if (currentMode === 'design' && selectedRoom) {
        if (designBrowseTab === 'accessories') {
            return 'Find accessories';
        }
        return `Explore ${formatRoomLabel(selectedRoom)} styles`;
    }
    if (currentMode === 'explore') {
        return 'Explore Styles';
    }
    return 'Beyond Showrooms';
}

function getAccessoriesTabLabel() {
    const roomLabels = {
        living: 'Living room accessories',
        bedroom: 'Bedroom accessories',
        dining: 'Dining room accessories',
        study: 'Study accessories'
    };
    return roomLabels[selectedRoom] ||
        `${capitalize(formatRoomLabel(selectedRoom))} accessories`;
}

function showDesignBrowseTabs() {
    return currentMode === 'design' && selectedRoom && !productSearch;
}

function isDesignAccessoriesTab() {
    return showDesignBrowseTabs() && designBrowseTab === 'accessories';
}

function isDesignCollectionsTab() {
    return showDesignBrowseTabs() && designBrowseTab === 'collections';
}

function hasOrigBrandTag(item) {
    return Boolean((item.orig_brand_tag || '').trim());
}

/** Branded collection title for lightbox — collection heroes with orig_brand_tag only. */
function getCollectionLightboxTitle(item) {
    if (!item || item.img_category !== 'collection' || !hasOrigBrandTag(item)) return null;
    return `${item.orig_brand_tag.trim()} Inspired Collection`;
}

function setDesignBrowseTab(tab) {
    if (!showDesignBrowseTabs() || designBrowseTab === tab) return;
    designBrowseTab = tab;
    scrollWaterfallToTop();
    updateGalleryHeader();
    render();
}

function updateDesignBrowseTabs() {
    const visible = showDesignBrowseTabs();

    if (designBrowseTabs) {
        designBrowseTabs.style.display = visible ? 'flex' : 'none';
    }

    if (!visible) return;

    if (designTabAccessories) {
        designTabAccessories.textContent = getAccessoriesTabLabel();
    }

    const onCollections = designBrowseTab === 'collections';

    if (designTabCollections) {
        designTabCollections.classList.toggle('design-browse-tab--active', onCollections);
        designTabCollections.setAttribute('aria-selected', onCollections ? 'true' : 'false');
    }

    if (designTabAccessories) {
        designTabAccessories.classList.toggle('design-browse-tab--active', !onCollections);
        designTabAccessories.setAttribute('aria-selected', !onCollections ? 'true' : 'false');
    }

    if (views.gallery) {
        views.gallery.classList.toggle('gallery-view--accessories-tab', !onCollections);
    }
}

function updateExploreStyleCaption() {
    const el = document.getElementById('exploreStyleCaption');
    if (!el) return;
    if (currentMode === 'explore' && exploreFilter) {
        el.style.display = 'block';
        el.textContent = STYLE_DESCRIPTIONS[exploreFilter] || '';
    } else {
        el.style.display = 'none';
        el.textContent = '';
    }
}

function updateGalleryHeader() {
    if (!galleryTitle) return;
    const title = getGalleryTitle();
    galleryTitle.textContent = title;
    document.title = title;

    if (bookmarkBtn) {
        bookmarkBtn.style.display = currentMode === 'explore' ? 'none' : 'flex';
    }

    if (views.gallery) {
        views.gallery.classList.toggle('gallery-view--explore', currentMode === 'explore');
        views.gallery.classList.toggle('gallery-view--design', currentMode === 'design');
    }

    updateExploreStyleCaption();

    if (filterContainer) {
        filterContainer.style.display =
            currentMode === 'design' && isDesignAccessoriesTab() ? 'none' : '';
    }

    updateDesignBrowseTabs();
}

function handleFilterClick(style, btn) {
    if (currentMode === 'explore') {
        exploreFilter = style;
        renderFilters();
        render();
    } else if (currentMode === 'design') {
        if (designFilters.has(style)) {
            designFilters.delete(style);
        } else {
            designFilters.add(style);
        }
        btn.classList.toggle('active');
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        updateGalleryHeader();
        render();
    }
}

/* ═══════════════════════════════════════════
   SEARCH MODAL
   ═══════════════════════════════════════════ */
function openSearchModal() {
    searchModal.style.display = 'flex';
    updateScrollToTopButton();
    searchModalInput.value = productSearch;
    searchModalClear.style.display = productSearch ? 'flex' : 'none';
    if (searchModalRoomNote) {
        const show = currentMode === 'design' && selectedRoom;
        searchModalRoomNote.style.display = show ? 'block' : 'none';
    }
    setTimeout(() => searchModalInput.focus(), 50);
}

function closeSearchModal() {
    searchModal.style.display = 'none';
    hideModalSuggestions();
    updateScrollToTopButton();
}

searchIcon.addEventListener('click', openSearchModal);
searchModalClose.addEventListener('click', closeSearchModal);
searchModal.querySelector('.search-modal-backdrop').addEventListener('click', closeSearchModal);

// Escape closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal.style.display === 'flex') {
        closeSearchModal();
    }
});

/* ═══════════════════════════════════════════
   SEARCH  —  Autocomplete + Filter (Modal)
   ═══════════════════════════════════════════ */
function showModalSuggestions(query) {
    searchModalSuggestions.innerHTML = '';
    if (!query) {
        hideModalSuggestions();
        return;
    }

    const term = query.toLowerCase();
    const matches = PRODUCT_TYPES.filter(t => t.toLowerCase().includes(term));

    if (matches.length === 0) {
        hideModalSuggestions();
        return;
    }

    matches.slice(0, 8).forEach(type => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';

        const idx = type.toLowerCase().indexOf(term);
        if (idx >= 0) {
            div.innerHTML = type.slice(0, idx) +
                '<strong>' + type.slice(idx, idx + term.length) + '</strong>' +
                type.slice(idx + term.length);
        } else {
            div.textContent = type;
        }

        div.addEventListener('click', () => {
            searchModalInput.value = type;
            searchModalClear.style.display = 'flex';
            hideModalSuggestions();
            applySearch(type);
            closeSearchModal();
        });

        searchModalSuggestions.appendChild(div);
    });

    searchModalSuggestions.classList.add('visible');
}

function hideModalSuggestions() {
    searchModalSuggestions.classList.remove('visible');
}

function applySearch(term) {
    productSearch = term.trim();
    updateGalleryHeader();
    updateActiveSearchTag();

    spinnerOverlay.classList.add('visible');
    setTimeout(() => {
        spinnerOverlay.classList.remove('visible');
        render();
    }, 200);
}

/* Modal search input events */
searchModalInput.addEventListener('input', () => {
    const val = searchModalInput.value.trim();
    searchModalClear.style.display = val ? 'flex' : 'none';
    showModalSuggestions(val);
});

searchModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        hideModalSuggestions();
        applySearch(searchModalInput.value);
        closeSearchModal();
    }
});

searchModalClear.addEventListener('click', () => {
    searchModalInput.value = '';
    searchModalClear.style.display = 'none';
    hideModalSuggestions();
    if (productSearch) {
        productSearch = '';
        updateGalleryHeader();
        updateActiveSearchTag();
        render();
    }
});

// Hide suggestions when clicking inside modal but outside input/suggestions
searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal || e.target.classList.contains('search-modal-content')) {
        hideModalSuggestions();
    }
});

function setGalleryShowroomNoteVisible(visible) {
    if (!galleryShowroomNote) return;
    galleryShowroomNote.hidden = !visible;
}

function hideDesignBrowsePanels() {
    if (gallery) gallery.style.display = 'none';
    if (accessoriesGallery) accessoriesGallery.style.display = 'none';
    if (accessoriesEmpty) accessoriesEmpty.style.display = 'none';
}

/* ═══════════════════════════════════════════
   GALLERY RENDERING
   ═══════════════════════════════════════════ */
function render() {
    gallery.innerHTML = '';
    gallery.classList.remove('gallery-collections-grouped');
    if (accessoriesGallery) accessoriesGallery.innerHTML = '';
    hideDesignBrowsePanels();

    if (isDesignAccessoriesTab()) {
        renderAccessoriesBrowse();
        return;
    }

    if (currentMode === 'design' && selectedRoom && designFilters.size === 0) {
        emptyState.style.display = 'flex';
        emptyState.textContent = 'Choose a style to get started.';
        setGalleryShowroomNoteVisible(false);
        updateScrollToTopButton();
        return;
    }

    let list = SHUFFLED;

    if (currentMode === 'explore' && exploreFilter) {
        list = list.filter(x => x.style_cat === exploreFilter);
    } else if (currentMode === 'design' && selectedRoom) {
        // Product search matches img_product_type / img_category across rooms (not only selectedRoom).
        if (!productSearch) {
            list = list.filter(x => x.room_type === selectedRoom);
        }
        if (designFilters.size > 0) {
            list = list.filter(x => designFilters.has(x.style_cat));
        }
        // Price filter
        if (priceFilters.size > 0) {
            list = list.filter(x => priceFilters.has(x.price_level));
        }
        // Product type search: img_product_type = contains match
        //                    img_category     = exact match
        if (productSearch) {
            const term = productSearch.toLowerCase();
            const beforeSearch = list.length;
            list = list.filter(x => {
                const typeMatch = x.img_product_type &&
                    x.img_product_type.toLowerCase().includes(term);
                const catMatch = x.img_category &&
                    x.img_category.toLowerCase() === term;
                return typeMatch || catMatch;
            });
            console.log('[SEARCH] term:', term, '| before:', beforeSearch, '| after:', list.length);
            if (list.length === 0) {
                // Debug: show what product types were available before search
                const availableTypes = new Set();
                SHUFFLED.filter(x =>
                    (currentMode === 'design' && selectedRoom && !productSearch
                        ? x.room_type === selectedRoom
                        : true) &&
                    (designFilters.size > 0 ? designFilters.has(x.style_cat) : true) &&
                    (priceFilters.size > 0 ? priceFilters.has(x.price_level) : true)
                ).forEach(x => {
                    if (x.img_product_type) availableTypes.add(x.img_product_type);
                });
                console.log('[SEARCH] Available product types in current filters:', Array.from(availableTypes).sort());
            }
        }
    }

    if (isDesignCollectionsTab() && !productSearch) {
        renderDesignCollectionsBrowse(list);
        return;
    }

    let mixed;

    if (productSearch) {
        // Search: all matching rows (A/B/C…); browse still uses heroes only below
        mixed = shuffle([...list]);
    } else {
        list = list.filter(isHeroImage);
        list = list.filter(isAnchorBrowseItem);
        mixed = buildBrowseFeed(list, currentMode).items;
        const collN = mixed.filter(x => x.img_category === 'collection').length;
        const looseN = mixed.filter(x => x.img_category === 'loose_item').length;
        console.log('[WATERFALL]', currentMode,
            '| total:', mixed.length,
            '| collection:', collN, '| anchor loose:', looseN);
    }

    // Empty state
    if (mixed.length === 0) {
        emptyState.style.display = 'flex';
        emptyState.textContent = getEmptyMessage();
        setGalleryShowroomNoteVisible(false);
        updateScrollToTopButton();
        return;
    }

    emptyState.style.display = 'none';
    gallery.style.removeProperty('display');

    const cards = mixed.map(item => createGalleryCard(item));
    const columnCount = getGalleryColumnCount();
    distributeMasonryCards(gallery, cards, columnCount, { stagger: true });
    lastGalleryLayoutColumns = columnCount;
    setGalleryShowroomNoteVisible(true);
    updateScrollToTopButton();
}

function getEmptyMessage() {
    if (currentMode === 'explore') {
        return `No items found for "${styleLabel(exploreFilter)}". Try another style.`;
    }
    if (currentMode === 'design') {
        if (designFilters.size === 0) {
            return 'Choose a style to get started.';
        }
        const styles = Array.from(designFilters).map(styleLabel).join(', ');
        const prices = Array.from(priceFilters).map(priceLabel).join(' + ');
        let msg = `No items found for ${capitalize(formatRoomLabel(selectedRoom))} with ${styles} at ${prices} price.`;
        if (productSearch) {
            msg += ` Product search "${productSearch}" returned no matches.`;
        }
        return msg + ' Try adjusting your filters.';
    }
    return 'No items to display.';
}

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */
function shuffle(a) {
    const arr = [...a];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function capitalize(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function hashStableKey(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function isExtremeLandscapeTextureTile(stableKey) {
    if (!stableKey || EXTREME_LANDSCAPE_TEXTURE_RATE <= 0) return false;
    const bucket = hashStableKey(stableKey) % 1000;
    return bucket < EXTREME_LANDSCAPE_TEXTURE_RATE * 1000;
}

function pickExtremeLandscapeTextureRatio(stableKey) {
    const aspects = EXTREME_LANDSCAPE_TEXTURE_ASPECTS;
    return aspects[hashStableKey(stableKey + ':tex') % aspects.length];
}

/** Display width÷height for thumb frame, or null to keep natural aspect. */
function pickExtremeLandscapeDisplayRatio(imageRatio, stableKey = '') {
    if (!imageRatio || imageRatio < EXTREME_LANDSCAPE_THRESHOLD) return null;

    if (isExtremeLandscapeTextureTile(stableKey)) {
        return pickExtremeLandscapeTextureRatio(stableKey);
    }

    if (imageRatio >= EXTREME_LANDSCAPE_FULL) return THUMB_FRAME_3_2;

    const t = (imageRatio - EXTREME_LANDSCAPE_THRESHOLD) /
        (EXTREME_LANDSCAPE_FULL - EXTREME_LANDSCAPE_THRESHOLD);
    return THUMB_FRAME_5_4 + t * (THUMB_FRAME_3_2 - THUMB_FRAME_5_4);
}

/** Wraps a lazy-loaded thumb <img>; crops only extreme landscape after decode. */
function createThumbMedia(img, stableKey = '') {
    const media = document.createElement('div');
    media.className = 'thumb-media';

    const applyCrop = () => {
        const imageRatio = img.naturalWidth / img.naturalHeight;
        const displayRatio = pickExtremeLandscapeDisplayRatio(imageRatio, stableKey);
        if (displayRatio == null) return;

        media.classList.add('thumb-media--landscape-crop');
        media.style.aspectRatio = String(Number(displayRatio.toFixed(4)));
    };

    if (img.complete && img.naturalWidth > 0) {
        applyCrop();
    } else {
        img.addEventListener('load', applyCrop, { once: true });
    }

    media.appendChild(img);
    return media;
}

/* ═══════════════════════════════════════════
   MASONRY  —  flex columns (replaces CSS column-count)
   CSS column-count causes image paint bugs in cols 2+ (WebKit/Blink).
   ═══════════════════════════════════════════ */
function getGalleryColumnCount() {
    const w = views.gallery.clientWidth || gallery.clientWidth || window.innerWidth;
    if (w <= 600) return 2;
    if (w <= 900) return 2;
    if (w <= 1200) return 3;
    return 4;
}

function getBookmarkColumnCount(container) {
    const w = container.clientWidth || window.innerWidth;
    if (w <= 1000) return 2;
    return 3;
}

const GALLERY_COLUMN_STAGGER_MS = 90;
let galleryStaggerGeneration = 0;
/** Last masonry column count; resize re-renders only when this changes (avoids mobile URL-bar refresh) */
let lastGalleryLayoutColumns = null;
let lastAccessoriesLayoutColumns = null;
let lastBookmarkLayoutColumns = null;

function randomGalleryColumnDelays(columnCount) {
    const slots = Array.from(
        { length: columnCount },
        (_, i) => i * GALLERY_COLUMN_STAGGER_MS
    );
    return shuffle(slots);
}

function scheduleGalleryColumnStagger(columns) {
    const gen = ++galleryStaggerGeneration;
    const delays = randomGalleryColumnDelays(columns.length);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (gen !== galleryStaggerGeneration) return;

            columns.forEach((col, i) => {
                const delay = delays[i];
                window.setTimeout(() => {
                    if (gen !== galleryStaggerGeneration) return;
                    col.classList.add('masonry-column-show');
                }, delay);
            });
        });
    });
}

function mountMasonryColumns(container, columnCount, options = {}) {
    container.innerHTML = '';
    container.classList.add('masonry-layout');

    const columns = [];
    for (let i = 0; i < columnCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column';
        container.appendChild(col);
        columns.push(col);
    }

    if (options.stagger) {
        scheduleGalleryColumnStagger(columns);
    } else {
        columns.forEach(col => col.classList.add('masonry-column-show'));
    }

    return columns;
}

function distributeMasonryCards(container, cards, columnCount, options = {}) {
    const columns = mountMasonryColumns(container, columnCount, options);
    cards.forEach((card, i) => {
        columns[i % columnCount].appendChild(card);
    });
}

function syncCardStars(container, thumbUrl, bookmarked) {
    if (!thumbUrl || !container) return;
    container.querySelectorAll('.card').forEach(card => {
        if (card.dataset.thumbUrl !== thumbUrl) return;
        const star = card.querySelector('.star-thumb');
        if (star) star.style.display = bookmarked ? 'flex' : 'none';
    });
}

function syncGalleryCardStar(thumbUrl, bookmarked) {
    syncCardStars(gallery, thumbUrl, bookmarked);
    syncCardStars(accessoriesGallery, thumbUrl, bookmarked);
}

/** Loose-item hero shots (_A) for current room — accents and standalone anchor pieces. */
function buildAccessoriesBrowseList() {
    if (!selectedRoom) return [];

    let list = SHUFFLED.filter(
        x =>
            x.room_type === selectedRoom &&
            x.img_category === 'loose_item' &&
            isHeroImage(x)
    );

    if (designFilters.size > 0) {
        list = list.filter(x => designFilters.has(x.style_cat));
    }

    if (priceFilters.size > 0) {
        list = list.filter(x => priceFilters.has(x.price_level));
    }

    return shuffle(list);
}

/** Design → Collections tab: brand-tagged sets first, then the rest; shuffled within each group. */
function buildDesignCollectionsBrowseGroups(list) {
    const collections = list.filter(
        x =>
            x.img_category === 'collection' &&
            isHeroImage(x) &&
            isAnchorBrowseItem(x)
    );

    return {
        featured: shuffle(collections.filter(hasOrigBrandTag)),
        more: shuffle(collections.filter(x => !hasOrigBrandTag(x)))
    };
}

function createGalleryCollectionGroup(title, items, columnCount, options = {}) {
    if (items.length === 0) return null;

    const section = document.createElement('section');
    section.className = 'gallery-collection-group';

    const heading = document.createElement('h2');
    heading.className = 'gallery-collection-group__title';
    heading.textContent = title;
    section.appendChild(heading);

    const masonry = document.createElement('div');
    masonry.className = 'gallery-collection-group__masonry masonry-layout';
    const cards = items.map(item => createGalleryCard(item));
    distributeMasonryCards(masonry, cards, columnCount, {
        stagger: Boolean(options.stagger)
    });
    section.appendChild(masonry);

    return section;
}

function renderDesignCollectionsBrowse(list) {
    emptyState.style.display = 'none';
    gallery.style.removeProperty('display');
    gallery.classList.add('gallery-collections-grouped');
    gallery.innerHTML = '';

    const { featured, more } = buildDesignCollectionsBrowseGroups(list);
    const columnCount = getGalleryColumnCount();

    if (featured.length === 0 && more.length === 0) {
        gallery.classList.remove('gallery-collections-grouped');
        emptyState.style.display = 'flex';
        emptyState.textContent = getEmptyMessage();
        setGalleryShowroomNoteVisible(false);
        lastGalleryLayoutColumns = null;
        updateScrollToTopButton();
        return;
    }

    let usedStagger = false;
    const featuredGroup = createGalleryCollectionGroup(
        'Featured collections',
        featured,
        columnCount,
        { stagger: true }
    );
    if (featuredGroup) {
        gallery.appendChild(featuredGroup);
        usedStagger = true;
    }

    const moreGroup = createGalleryCollectionGroup(
        'More collections',
        more,
        columnCount,
        { stagger: !usedStagger }
    );
    if (moreGroup) gallery.appendChild(moreGroup);

    lastGalleryLayoutColumns = columnCount;
    setGalleryShowroomNoteVisible(true);
    updateScrollToTopButton();
}

function renderAccessoriesBrowse() {
    if (!accessoriesGallery || !accessoriesEmpty) return;

    emptyState.style.display = 'none';
    const list = buildAccessoriesBrowseList();

    if (list.length === 0) {
        accessoriesEmpty.style.display = 'block';
        accessoriesEmpty.textContent =
            'No items for this room with your current style and price filters.';
        setGalleryShowroomNoteVisible(false);
        lastAccessoriesLayoutColumns = null;
        updateScrollToTopButton();
        return;
    }

    accessoriesEmpty.style.display = 'none';
    accessoriesGallery.style.removeProperty('display');

    const cards = list.map(item => createGalleryCard(item, { fromAccessories: true }));
    const columnCount = getGalleryColumnCount();
    distributeMasonryCards(accessoriesGallery, cards, columnCount);
    lastAccessoriesLayoutColumns = columnCount;
    setGalleryShowroomNoteVisible(true);
    updateScrollToTopButton();
}

function createGalleryCard(item, options = {}) {
    const hero = toHeroItem(item);
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.thumbUrl = hero.thumbnail_url;

    const img = document.createElement('img');
    img.src = item.thumbnail_url;
    img.alt = item.filename_raw || 'Furniture';
    img.loading = 'lazy';
    img.decoding = 'async';

    const star = document.createElement('div');
    star.className = 'star-thumb';
    star.textContent = '★';
    if (isBookmarked(hero)) {
        star.style.display = 'flex';
    }

    if (shouldShowSetBadge(item)) {
        const badge = document.createElement('div');
        badge.className = 'collection-badge';
        badge.textContent = 'SET';
        card.appendChild(badge);
    }

    card.appendChild(createThumbMedia(img, item.thumbnail_url));
    card.appendChild(star);
    card.addEventListener('click', () => {
        if (options.fromAccessories) {
            openLightbox(item, { fromAccessories: true });
        } else {
            openLightbox(item);
        }
    });
    return card;
}

function formatRoomLabel(room) {
    const labels = {
        bedroom: 'bedroom',
        living: 'living room',
        dining: 'dining room',
        study: 'study room'
    };
    return labels[room] || room;
}

/* ═══════════════════════════════════════════
   ITEM / VARIANT / COLLECTION HELPERS
   ═══════════════════════════════════════════ */
function getItemBaseName(item) {
    if (!item.filename_raw) return null;
    return item.filename_raw.replace(/_[A-Z]\.jpg$/i, '');
}

function getVariantSuffix(filename) {
    const match = filename && filename.match(/_([A-Z])\.jpg$/i);
    return match ? match[1].toUpperCase() : 'A';
}

/** All photo variants (A, B, C…) for one furniture piece */
function getItemImageGroup(item) {
    const base = getItemBaseName(item);
    if (!base) return [item];
    return MASTER
        .filter(x => getItemBaseName(x) === base)
        .sort((a, b) =>
            getVariantSuffix(a.filename_raw).localeCompare(getVariantSuffix(b.filename_raw))
        );
}

function getCollectionItems(collectionId) {
    if (!collectionId) return [];
    return MASTER.filter(x =>
        x.collection_id === collectionId &&
        x.img_category === 'collection_item' &&
        isHeroImage(x)
    );
}

/** SET badge + View collection: collection hero with linked collection_item rows */
function shouldShowSetBadge(item) {
    return item.img_category === 'collection' &&
        item.collection_id &&
        collectionIdsWithItems.has(item.collection_id);
}

function getCollectionAnchorItem(item) {
    if (item.img_category === 'collection') return item;
    if (item.collection_id) {
        const hero = MASTER.find(x =>
            x.collection_id === item.collection_id &&
            x.img_category === 'collection' &&
            isHeroImage(x)
        );
        if (hero) return hero;
    }
    return item;
}

/* ═══════════════════════════════════════════
   LIGHTBOX  —  overview scroll + detail view
   ═══════════════════════════════════════════ */
function needsLightboxOverview(item) {
    const anchor = getCollectionAnchorItem(item);
    if (getItemImageGroup(anchor).length > 1) return true;
    if (
        anchor.img_category === 'collection' &&
        anchor.collection_id &&
        collectionIdsWithItems.has(anchor.collection_id)
    ) {
        return getCollectionItems(anchor.collection_id).length > 0;
    }
    return getItemImageGroup(item).length > 1;
}

function getOverviewItemLabel(item, index) {
    if (item.img_product_type) {
        return item.img_product_type.replace(/_/g, ' ');
    }
    return `Collection item ${index + 1}`;
}

function buildLightboxOverviewSections(anchor) {
    const root = getCollectionAnchorItem(anchor);
    const sections = [];
    const collItems =
        root.img_category === 'collection' && root.collection_id
            ? getCollectionItems(root.collection_id)
            : [];
    const rootVariants = getItemImageGroup(root);
    const isCollection = root.img_category === 'collection';

    if (isCollection || collItems.length > 0) {
        if (rootVariants.length > 0) {
            sections.push({
                title: isCollection
                    ? (getCollectionLightboxTitle(root) || 'Collection')
                    : 'Photos',
                collectionId: isCollection && root.collection_id ? root.collection_id : null,
                images: rootVariants
            });
        }
    } else if (rootVariants.length > 1) {
        const title = root.img_product_type
            ? root.img_product_type.replace(/_/g, ' ')
            : 'Photos';
        sections.push({ title, images: rootVariants });
    }

    collItems.forEach((nested, i) => {
        sections.push({
            title: getOverviewItemLabel(nested, i),
            images: getItemImageGroup(nested)
        });
    });

    return sections;
}

function renderLightboxOverview(anchor) {
    lightboxOverviewScroll.innerHTML = '';
    const sections = buildLightboxOverviewSections(anchor);

    sections.forEach(section => {
        const block = document.createElement('section');
        block.className = 'lightbox-overview-section';

        const heading = document.createElement('div');
        heading.className = 'lightbox-overview-section-heading';

        const title = document.createElement('h3');
        title.className = 'lightbox-overview-section-title';
        title.textContent = section.title;
        heading.appendChild(title);

        if (section.collectionId) {
            const idLine = document.createElement('p');
            idLine.className = 'lightbox-overview-section-id';
            idLine.textContent = `(${section.collectionId})`;
            heading.appendChild(idLine);
        }

        block.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'lightbox-overview-grid';
        if (section.images.length === 1) {
            grid.classList.add('lightbox-overview-grid--single');
        }
        grid.setAttribute('role', 'list');

        section.images.forEach(imgItem => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lightbox-overview-cell';
            btn.setAttribute('role', 'listitem');
            btn.setAttribute('aria-label', imgItem.filename_raw || 'View photo');

            const img = document.createElement('img');
            img.src = imgItem.thumbnail_url;
            img.alt = imgItem.filename_raw || 'Furniture';
            img.loading = 'lazy';
            img.decoding = 'async';

            btn.appendChild(img);
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightboxDetail(imgItem, {
                    fromBookmark: lightboxSource === 'bookmark',
                    fromAccessories: lightboxSource === 'accessories',
                    returnToOverview: true
                });
            });

            grid.appendChild(btn);
        });

        block.appendChild(grid);
        lightboxOverviewScroll.appendChild(block);
    });
}

function applyLightboxOverviewLayout() {
    const showOverview = lightboxMode === 'overview';
    lightboxOverview.style.display = showOverview ? 'flex' : 'none';
    lightboxDetail.style.display = showOverview ? 'none' : 'flex';
    lightboxContent.classList.toggle('lightbox-content--overview', showOverview);
    lightbox.classList.toggle('lightbox--overview', showOverview);
    lightbox.classList.toggle('lightbox--detail', !showOverview && lightboxMode === 'detail');
    starBtn.style.display = showOverview ? 'none' : 'flex';
}

/** Keep lightbox above bookmark board (2100) and accessories page (1500). */
function applyLightboxLayering(opts) {
    lightbox.classList.remove('lightbox-over-bookmarks', 'lightbox-over-accessories');

    if (opts.fromBookmark) {
        lightbox.classList.add('lightbox-over-bookmarks');
        lightboxCloseBtn.style.display = 'flex';
        return;
    }
    if (opts.fromAccessories) {
        lightbox.classList.add('lightbox-over-accessories');
    }
    lightboxCloseBtn.style.display = 'none';
}

function openLightboxOverview(anchor, opts) {
    const options = normalizeLightboxOptions(opts);
    lightboxMode = 'overview';
    lightboxOverviewAnchor = getCollectionAnchorItem(anchor);
    if (options.fromBookmark) {
        lightboxSource = 'bookmark';
    } else if (options.fromAccessories) {
        lightboxSource = 'accessories';
    } else {
        lightboxSource = 'gallery';
    }
    renderLightboxOverview(lightboxOverviewAnchor);
    applyLightboxLayering(options);
    applyLightboxOverviewLayout();

    lightboxBackBtn.style.display = 'flex';
    lightbox.style.display = 'flex';
    updateScrollToTopButton();
}

function updateLightboxDetailTitle(item) {
    if (!lightboxDetailTitle) return;
    const title = getCollectionLightboxTitle(item);
    if (title) {
        lightboxDetailTitle.textContent = title;
        lightboxDetailTitle.hidden = false;
    } else {
        lightboxDetailTitle.textContent = '';
        lightboxDetailTitle.hidden = true;
    }
}

function showLightboxDetailImage(item) {
    if (!item) return;
    currentLightboxItem = item;
    lightboxImg.src = item.thumbnail_url;
    lightboxImg.alt = item.filename_raw || 'Furniture';
    updateLightboxDetailTitle(item);
    updateLightboxStar();
}

function normalizeLightboxOptions(options) {
    if (options == null) {
        return { fromBookmark: false, returnToOverview: false, fromAccessories: false };
    }
    if (typeof options === 'string') {
        return { fromBookmark: false, returnToOverview: options === 'overview', fromAccessories: false };
    }
    return {
        fromBookmark: options.fromBookmark ?? false,
        returnToOverview: options.returnToOverview ?? false,
        fromAccessories: options.fromAccessories ?? false
    };
}

function openLightboxDetail(item, options = {}) {
    const opts = normalizeLightboxOptions(options);
    lightboxMode = 'detail';
    if (opts.fromBookmark) {
        lightboxSource = 'bookmark';
    } else if (opts.fromAccessories) {
        lightboxSource = 'accessories';
    } else {
        lightboxSource = 'gallery';
    }

    if (opts.fromBookmark) {
        bookmarkLightboxWasStarred = isBookmarked(item);
    }
    applyLightboxLayering(opts);
    applyLightboxOverviewLayout();

    lightboxBackBtn.style.display = 'flex';

    showLightboxDetailImage(item);
    lightbox.style.display = 'flex';
    updateScrollToTopButton();
}

function openLightbox(item, options = {}) {
    const opts = normalizeLightboxOptions(options);
    const subject = opts.fromAccessories ? toHeroItem(item) : item;

    if (opts.fromBookmark) {
        lightboxSource = 'bookmark';
        lightboxOverviewAnchor = null;
        openLightboxDetail(toHeroItem(item), { ...opts, returnToOverview: false });
        return;
    }

    if (opts.fromAccessories) {
        lightboxSource = 'accessories';
    } else {
        lightboxSource = 'gallery';
    }

    if (needsLightboxOverview(subject)) {
        openLightboxOverview(subject, opts);
        return;
    }

    lightboxOverviewAnchor = null;
    openLightboxDetail(subject, opts);
}

function closeLightbox() {
    if (lightbox.style.display !== 'flex') return;

    if (lightboxSource === 'bookmark' && currentLightboxItem) {
        const hero = toHeroItem(currentLightboxItem);
        if (bookmarkLightboxWasStarred && !isBookmarked(hero)) {
            const remove = window.confirm(
                'Remove this item from your saved board? It will no longer appear in your bookmark manager.'
            );
            if (!remove) {
                if (!BOOKMARKS.has(hero.thumbnail_url)) {
                    BOOKMARKS.set(hero.thumbnail_url, hero);
                    saveBookmarks();
                    updateBookmarkUI();
                    updateLightboxStar();
                }
                return;
            }
        }
    }

    lightbox.style.display = 'none';
    currentLightboxItem = null;
    lightboxMode = null;
    lightboxOverviewAnchor = null;
    lightboxSource = 'gallery';
    lightbox.classList.remove('lightbox-over-bookmarks', 'lightbox-over-accessories');
    lightboxCloseBtn.style.display = 'none';
    lightboxBackBtn.style.display = 'none';
    applyLightboxOverviewLayout();
    updateScrollToTopButton();

    if (bookmarkView.style.display === 'block') {
        renderBookmarkView();
    }
    updateBookmarkUI();
    render();
}

function dismissLightbox() {
    if (lightboxSource === 'bookmark') {
        closeLightbox();
        return;
    }
    lightbox.style.display = 'none';
    currentLightboxItem = null;
    lightboxMode = null;
    lightboxOverviewAnchor = null;
    lightboxSource = 'gallery';
    lightbox.classList.remove('lightbox-over-bookmarks', 'lightbox-over-accessories');
    lightboxCloseBtn.style.display = 'none';
    lightboxBackBtn.style.display = 'none';
    applyLightboxOverviewLayout();
    updateScrollToTopButton();
}

function updateLightboxStar() {
    if (!currentLightboxItem) return;
    if (isBookmarked(currentLightboxItem)) {
        starBtn.textContent = '★';
        starBtn.classList.add('starred');
        starBtn.dataset.starred = 'true';
    } else {
        starBtn.textContent = '☆';
        starBtn.classList.remove('starred');
        delete starBtn.dataset.starred;
    }
}

starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentLightboxItem) return;
    if (!toggleBookmark(currentLightboxItem)) return;
    updateLightboxStar();
    const hero = toHeroItem(currentLightboxItem);
    syncGalleryCardStar(hero.thumbnail_url, isBookmarked(hero));
});

lightboxCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
});

lightboxBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxMode === 'overview') {
        dismissLightbox();
        return;
    }
    if (
        lightboxMode === 'detail' &&
        lightboxOverviewAnchor &&
        needsLightboxOverview(lightboxOverviewAnchor)
    ) {
        openLightboxOverview(lightboxOverviewAnchor, {
            fromBookmark: lightboxSource === 'bookmark',
            fromAccessories: lightboxSource === 'accessories'
        });
        return;
    }
    dismissLightbox();
});

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        if (lightboxMode === 'detail' && lightboxOverviewAnchor) {
            openLightboxOverview(lightboxOverviewAnchor, {
                fromBookmark: lightboxSource === 'bookmark',
                fromAccessories: lightboxSource === 'accessories'
            });
            return;
        }
        dismissLightbox();
    }
});

function handleEscape() {
    if (searchModal.style.display === 'flex') {
        closeSearchModal();
        return;
    }
    if (lightbox.style.display === 'flex') {
        if (lightboxMode === 'detail' && lightboxOverviewAnchor) {
            openLightboxOverview(lightboxOverviewAnchor, {
                fromBookmark: lightboxSource === 'bookmark',
                fromAccessories: lightboxSource === 'accessories'
            });
            return;
        }
        if (lightboxSource === 'bookmark') {
            closeLightbox();
        } else {
            dismissLightbox();
        }
        return;
    }
    if (bookmarkView.style.display === 'block') {
        bookmarkView.style.display = 'none';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        handleEscape();
    }
});

/* ═══════════════════════════════════════════
   BOOKMARKS  —  Core
   ═══════════════════════════════════════════ */
function toHeroItem(item) {
    if (!item) return item;
    if (isHeroImage(item)) return item;
    const base = getItemBaseName(item);
    if (!base) return item;
    const hero = MASTER.find(x => getItemBaseName(x) === base && isHeroImage(x));
    return hero || item;
}

function isBookmarked(item) {
    const hero = toHeroItem(item);
    return BOOKMARKS.has(hero.thumbnail_url);
}

function getStarredNestedCollectionItems(collectionId) {
    return getCollectionItems(collectionId).filter(n => isBookmarked(n));
}

function canUnstarBookmarkItem(item) {
    const hero = toHeroItem(item);
    if (!BOOKMARKS.has(hero.thumbnail_url)) return true;
    if (hero.img_category === 'collection' && hero.collection_id) {
        return getStarredNestedCollectionItems(hero.collection_id).length === 0;
    }
    return true;
}

function toggleBookmark(item) {
    const hero = toHeroItem(item);
    const key = hero.thumbnail_url;

    if (BOOKMARKS.has(key)) {
        if (!canUnstarBookmarkItem(hero)) {
            window.alert(
                'This set is still on your board because one or more pieces inside it are starred.\n\n' +
                'Unstar each piece in the set first, then you can remove the set.'
            );
            return false;
        }
        BOOKMARKS.delete(key);
    } else {
        BOOKMARKS.set(key, hero);
    }
    saveBookmarks();
    updateBookmarkUI();

    if (bookmarkView.style.display === 'block') {
        const deferRefresh =
            lightboxSource === 'bookmark' && lightbox.style.display === 'flex';
        if (!deferRefresh) renderBookmarkView();
    }
    return true;
}

function updateBookmarkUI() {
    bookmarkCount.textContent = BOOKMARKS.size;
}

/* ═══════════════════════════════════════════
   BOOKMARKS  —  localStorage
   ═══════════════════════════════════════════ */
function saveBookmarks() {
    const data = Array.from(BOOKMARKS.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadBookmarks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const entries = JSON.parse(raw);
        BOOKMARKS = new Map();
        entries.forEach(([key, item]) => {
            const fresh = findMasterByBookmarkKey(key, item);
            const hero = toHeroItem(fresh);
            if (hero && hero.thumbnail_url) {
                BOOKMARKS.set(hero.thumbnail_url, hero);
            }
        });
    } catch (e) {
        console.warn('[BOOKMARKS] Failed to load from localStorage', e);
        BOOKMARKS = new Map();
    }
}

/* ═══════════════════════════════════════════
   BOOKMARKS  —  Smart grouping + waterfall UI
   ═══════════════════════════════════════════ */
bookmarkBtn.addEventListener('click', () => {
    renderBookmarkView();
    bookmarkView.style.display = 'block';
    updateScrollToTopButton();
});

function buildBookmarkGroups() {
    const byRoom = {};
    const bookmarkedCollectionIds = new Set();

    BOOKMARKS.forEach(item => {
        const hero = toHeroItem(item);
        const room = hero.room_type || 'other';
        if (!byRoom[room]) {
            byRoom[room] = { collections: [], loose: [] };
        }

        if (hero.img_category === 'collection' && hero.collection_id) {
            bookmarkedCollectionIds.add(hero.collection_id);
        }
    });

    BOOKMARKS.forEach(item => {
        const hero = toHeroItem(item);
        const room = hero.room_type || 'other';

        if (hero.img_category === 'collection' && hero.collection_id) {
            const already = byRoom[room].collections.some(c => c.id === hero.collection_id);
            if (already) return;

            const nestedItems = collectionIdsWithItems.has(hero.collection_id)
                ? getCollectionItems(hero.collection_id)
                : [];

            byRoom[room].collections.push({
                id: hero.collection_id,
                anchor: hero,
                nested: nestedItems.map(n => ({
                    item: n,
                    starred: isBookmarked(n),
                    linked: true
                }))
            });
        }
    });

    BOOKMARKS.forEach(item => {
        const hero = toHeroItem(item);
        const room = hero.room_type || 'other';

        if (hero.img_category === 'collection' && hero.collection_id) return;

        if (hero.img_category === 'collection_item' &&
            hero.collection_id &&
            bookmarkedCollectionIds.has(hero.collection_id)) {
            return;
        }

        const alreadyLoose = byRoom[room].loose.some(x => x.thumbnail_url === hero.thumbnail_url);
        if (!alreadyLoose) {
            byRoom[room].loose.push(hero);
        }
    });

    return byRoom;
}

function clearAllGalleryBookmarkStars() {
    if (!gallery) return;
    gallery.querySelectorAll('.star-thumb').forEach(st => {
        st.style.display = 'none';
    });
}

function clearAllBookmarks() {
    if (BOOKMARKS.size === 0) return;

    const ok = window.confirm(
        'This will clear all your bookmarks.\n\nAre you sure you wish to proceed?'
    );
    if (!ok) return;

    BOOKMARKS.clear();
    saveBookmarks();
    updateBookmarkUI();
    clearAllGalleryBookmarkStars();

    if (lightbox.style.display === 'flex') {
        updateLightboxStar();
    }

    renderBookmarkView();
}

function closeBookmarkView() {
    bookmarkView.style.display = 'none';
    updateScrollToTopButton();
}

function createBookmarkToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'bookmark-toolbar';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'bookmark-back';
    backBtn.setAttribute('aria-label', 'Back');
    backBtn.addEventListener('click', closeBookmarkView);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'bookmark-clear';
    clearBtn.textContent = 'Clear all';
    clearBtn.disabled = BOOKMARKS.size === 0;
    clearBtn.addEventListener('click', clearAllBookmarks);

    toolbar.appendChild(backBtn);
    toolbar.appendChild(clearBtn);
    return toolbar;
}

function createBookmarkTop(headerHtml) {
    const top = document.createElement('div');
    top.className = 'bookmark-top';
    top.appendChild(createBookmarkToolbar());

    const header = document.createElement('div');
    header.className = 'bookmark-header';
    header.innerHTML = headerHtml;
    top.appendChild(header);

    return top;
}

function countBookmarkSubtitleTotals() {
    let collections = 0;
    let standalone = 0;
    BOOKMARKS.forEach(item => {
        const hero = toHeroItem(item);
        if (hero.img_category === 'collection') {
            collections += 1;
        } else if (
            hero.img_category === 'loose_item' ||
            hero.img_category === 'collection_item'
        ) {
            standalone += 1;
        }
    });
    return { collections, standalone };
}

function formatBookmarkHeaderCount() {
    const { collections, standalone } = countBookmarkSubtitleTotals();
    const collLabel = collections === 1 ? 'collection' : 'collections';
    const pieceLabel = standalone === 1 ? 'standalone piece' : 'standalone pieces';
    return (
        `<strong>${collections}</strong> ${collLabel}` +
        ` · <strong>${standalone}</strong> ${pieceLabel}`
    );
}

/** Multi-piece block: anchor + at least one collection_item on the board. */
function isMultiPieceBookmarkCollection(coll) {
    return coll.nested.length > 0;
}

function buildBookmarkCollectionCards(coll) {
    return [
        createBookmarkCard(coll.anchor, {
            starred: true,
            linked: false,
            role: 'collection'
        }),
        ...coll.nested.map(entry =>
            createBookmarkCard(entry.item, {
                starred: entry.starred,
                linked: true,
                role: 'collection_item'
            })
        )
    ];
}

function mountBookmarkWaterfall(parent, cards) {
    const waterfall = document.createElement('div');
    waterfall.className = 'bookmark-waterfall masonry-layout';
    distributeMasonryCards(
        waterfall,
        cards,
        getBookmarkColumnCount(waterfall)
    );
    parent.appendChild(waterfall);
    return waterfall;
}

function renderBookmarkView() {
    bookmarkView.innerHTML = '';

    if (BOOKMARKS.size === 0) {
        bookmarkView.appendChild(createBookmarkTop(`
            <h2>Your Favorites</h2>
            <p>Your personal taste board</p>
        `));
        const empty = document.createElement('div');
        empty.className = 'bookmark-empty';
        empty.textContent = 'No bookmarks yet. Tap the star on any image to save it.';
        bookmarkView.appendChild(empty);
        return;
    }

    const byRoom = buildBookmarkGroups();

    bookmarkView.appendChild(createBookmarkTop(`
        <h2>Your Favorites</h2>
        <p class="bookmark-header-count">${formatBookmarkHeaderCount()}</p>
    `));

    const scroll = document.createElement('div');
    scroll.className = 'bookmark-scroll';

    const roomOrder = ['bedroom', 'living', 'dining', 'study'];
    const sortedRooms = Object.keys(byRoom)
        .filter(room => {
            const d = byRoom[room];
            return d.collections.length > 0 || d.loose.length > 0;
        })
        .sort((a, b) => {
            const ia = roomOrder.indexOf(a);
            const ib = roomOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        });

    sortedRooms.forEach(room => {
        const roomSection = document.createElement('section');
        roomSection.className = 'bookmark-room';

        const roomTitle = document.createElement('h3');
        roomTitle.className = 'bookmark-room-title';
        roomTitle.textContent = capitalize(formatRoomLabel(room));
        roomSection.appendChild(roomTitle);

        const roomData = byRoom[room];
        const sortedCollections = [...roomData.collections].sort((a, b) =>
            a.id.localeCompare(b.id)
        );
        const multiCollections = sortedCollections.filter(isMultiPieceBookmarkCollection);
        const singletonCollections = sortedCollections.filter(
            c => !isMultiPieceBookmarkCollection(c)
        );

        multiCollections.forEach(coll => {
            const collSection = document.createElement('div');
            collSection.className = 'bookmark-subgroup bookmark-subgroup-collection';

            const collTitle = document.createElement('h4');
            collTitle.className = 'bookmark-subgroup-title';
            collTitle.textContent = formatCollectionName(coll.id);
            collSection.appendChild(collTitle);

            mountBookmarkWaterfall(collSection, buildBookmarkCollectionCards(coll));
            roomSection.appendChild(collSection);
        });

        if (singletonCollections.length > 0) {
            const singletonSection = document.createElement('div');
            singletonSection.className =
                'bookmark-subgroup bookmark-subgroup-singleton';

            const singletonTitle = document.createElement('h4');
            singletonTitle.className = 'bookmark-subgroup-title';
            singletonTitle.textContent = 'Collection sets';
            singletonSection.appendChild(singletonTitle);

            const singletonCards = singletonCollections.map(coll =>
                createBookmarkCard(coll.anchor, {
                    starred: true,
                    linked: false,
                    role: 'collection'
                })
            );
            mountBookmarkWaterfall(singletonSection, singletonCards);
            roomSection.appendChild(singletonSection);
        }

        if (roomData.loose.length > 0) {
            const looseSection = document.createElement('div');
            looseSection.className = 'bookmark-subgroup bookmark-subgroup-loose';

            const looseTitle = document.createElement('h4');
            looseTitle.className = 'bookmark-subgroup-title';
            looseTitle.textContent = 'Standalone Pieces';
            looseSection.appendChild(looseTitle);

            const looseCards = roomData.loose.map(item =>
                createBookmarkCard(item, {
                    starred: true,
                    linked: false,
                    role: 'loose'
                })
            );
            mountBookmarkWaterfall(looseSection, looseCards);
            roomSection.appendChild(looseSection);
        }

        scroll.appendChild(roomSection);
    });

    bookmarkView.appendChild(scroll);

    const bookmarkWaterfall = bookmarkView.querySelector('.bookmark-waterfall');
    lastBookmarkLayoutColumns = getBookmarkColumnCount(bookmarkWaterfall || bookmarkView);
}

function getBookmarkCardCaption(item, role) {
    if (role === 'collection' && item.collection_id) {
        return item.collection_id;
    }
    if (role === 'collection_item' && item.img_product_type) {
        return item.img_product_type.replace(/_/g, ' ');
    }
    if (item.style_cat) return styleLabel(item.style_cat);
    return item.filename_raw || '';
}

function createBookmarkCard(item, { starred, linked, role }) {
    const hero = toHeroItem(item);
    const el = document.createElement('div');
    el.className = 'bookmark-card';
    if (role) el.dataset.role = role;
    if (linked) el.classList.add('bookmark-card--linked');
    if (starred) el.classList.add('bookmark-card--starred');

    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'bookmark-card-star';
    star.textContent = starred ? '★' : '☆';
    star.setAttribute('aria-label', starred ? 'Remove from starred' : 'Star this item');
    star.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!toggleBookmark(hero)) return;
        if (lightbox.style.display === 'flex') {
            updateLightboxStar();
            return;
        }
        renderBookmarkView();
    });

    const img = document.createElement('img');
    img.src = hero.thumbnail_url;
    img.alt = hero.filename_raw || 'Furniture';
    img.loading = 'lazy';
    img.decoding = 'async';

    const caption = document.createElement('div');
    caption.className = 'bookmark-card-caption';
    if (role === 'collection') {
        caption.classList.add('bookmark-card-caption--collection-id');
    }
    caption.textContent = getBookmarkCardCaption(hero, role);

    el.appendChild(star);
    el.appendChild(createThumbMedia(img, hero.thumbnail_url));
    el.appendChild(caption);

    el.addEventListener('click', () => {
        openLightbox(hero, { fromBookmark: true });
    });

    return el;
}

function formatCollectionName(collId) {
    if (!collId) return 'Collection';
    return `COLLECTION: ${collId}`;
}

// Close bookmark view on background click
bookmarkView.addEventListener('click', (e) => {
    if (e.target === bookmarkView) {
        closeBookmarkView();
    }
});

if (designTabCollections) {
    designTabCollections.addEventListener('click', () => setDesignBrowseTab('collections'));
}
if (designTabAccessories) {
    designTabAccessories.addEventListener('click', () => setDesignBrowseTab('accessories'));
}

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
let masonryResizeTimer = null;

function refreshGalleryLayoutIfColumnsChanged() {
    if (views.gallery.style.display === 'none' || !currentMode) {
        lastGalleryLayoutColumns = null;
        return;
    }
    const cols = getGalleryColumnCount();
    if (cols === lastGalleryLayoutColumns) return;
    render();
}

function refreshBookmarkLayoutIfColumnsChanged() {
    if (bookmarkView.style.display !== 'block') {
        lastBookmarkLayoutColumns = null;
        return;
    }
    const sample = bookmarkView.querySelector('.bookmark-waterfall');
    const cols = getBookmarkColumnCount(sample || bookmarkView);
    if (cols === lastBookmarkLayoutColumns) return;
    renderBookmarkView();
}

function refreshAccessoriesLayoutIfColumnsChanged() {
    if (!isDesignAccessoriesTab()) {
        lastAccessoriesLayoutColumns = null;
        return;
    }
    const cols = getGalleryColumnCount();
    if (cols === lastAccessoriesLayoutColumns) return;
    renderAccessoriesBrowse();
}

function handleMasonryResize() {
    // Mobile Safari/Chrome fire resize when the URL bar shows/hides on scroll.
    // Only rebuild masonry when column breakpoints change, not on height-only resizes.
    refreshGalleryLayoutIfColumnsChanged();
    refreshBookmarkLayoutIfColumnsChanged();
    refreshAccessoriesLayoutIfColumnsChanged();
}

window.addEventListener('resize', () => {
    clearTimeout(masonryResizeTimer);
    masonryResizeTimer = setTimeout(handleMasonryResize, 200);
});

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        clearTimeout(masonryResizeTimer);
        masonryResizeTimer = setTimeout(handleMasonryResize, 200);
    });
}

if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', () => {
        scrollWaterfallToTop();
    });
    window.addEventListener('scroll', scheduleScrollToTopUpdate, { passive: true });
}

loadData();
