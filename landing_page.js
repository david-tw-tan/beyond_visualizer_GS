/**
 * Beyond Showrooms — Landing Page
 * Update contact URLs before going live.
 */
const LANDING_CONFIG = {
    discoveryCallUrl: '#book-call',
    whatsAppUrl: 'https://wa.me/',
    emailUrl: 'mailto:hello@beyondshowrooms.com',
    databaseUrl: 'furniture_database.json'
};

const SHOWROOM_IMAGE_BASE = 'img_db_final/';

const SHOWROOM_CONFIG = {
    minImages: 36,
    maxImages: 80,
    avgThumbHeight: 200,
    footerOverhead: 480,
    poolWeights: [
        { key: 'collectionAnchor', share: 0.32 },
        { key: 'collection', share: 0.22 },
        { key: 'loose', share: 0.28 },
        { key: 'item', share: 0.18 }
    ]
};

const header = document.querySelector('.lp-header');
const revealEls = document.querySelectorAll('.lp-reveal');
const hero = document.querySelector('.lp-hero');
const contactModal = document.getElementById('contactModal');
const showroomModal = document.getElementById('showroomModal');
const showroomGallery = document.getElementById('showroomGallery');
const showroomScroll = document.getElementById('showroomScroll');
const openContactBtns = document.querySelectorAll('[data-open-contact]');
const closeContactEls = document.querySelectorAll('[data-close-contact]');
const openShowroomEls = document.querySelectorAll('[data-open-showroom]');
const closeShowroomEls = document.querySelectorAll('[data-close-showroom]');

let furnitureCache = null;
let currentShowroomImages = null;
let showroomIsOpen = false;
let showroomLoadPromise = null;
let showroomPreparePromise = null;
let lastShowroomLayoutColumns = null;
let showroomResizeTimer = null;
let showroomCloseTimer = null;
const showroomAspectCache = new Map();
const SHOWROOM_MODAL_ANIM_MS = 500;

function applyContactLinks() {
    const discovery = document.querySelector('[data-contact="discovery"]');
    const whatsapp = document.querySelector('[data-contact="whatsapp"]');
    const email = document.querySelector('[data-contact="email"]');

    if (discovery) discovery.setAttribute('href', LANDING_CONFIG.discoveryCallUrl);
    if (whatsapp) {
        whatsapp.setAttribute('href', LANDING_CONFIG.whatsAppUrl);
        whatsapp.setAttribute('target', '_blank');
        whatsapp.setAttribute('rel', 'noopener noreferrer');
    }
    if (email) email.setAttribute('href', LANDING_CONFIG.emailUrl);
}

function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 48);
}

function openContactModal() {
    if (!contactModal) return;
    contactModal.hidden = false;
    document.body.classList.add('lp-modal-open');
}

function closeContactModal() {
    if (!contactModal) return;
    contactModal.hidden = true;
    if (!showroomIsOpen) {
        document.body.classList.remove('lp-modal-open');
    }
}

function initContactModal() {
    openContactBtns.forEach((btn) => {
        btn.addEventListener('click', openContactModal);
    });

    closeContactEls.forEach((el) => {
        el.addEventListener('click', closeContactModal);
    });

    contactModal?.querySelectorAll('[data-contact]').forEach((link) => {
        link.addEventListener('click', () => closeContactModal());
    });
}

function shuffleArray(items) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function pickDiverse(items, count) {
    if (!items.length || count <= 0) return [];
    if (items.length <= count) return shuffleArray(items);

    const buckets = new Map();
    items.forEach((item) => {
        const key = `${item.room_type}|${item.style_cat}|${item.img_category}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
    });

    buckets.forEach((bucket) => shuffleArray(bucket));
    const bucketList = shuffleArray([...buckets.values()]);
    const picked = [];
    let round = 0;

    while (picked.length < count && bucketList.some((bucket) => round < bucket.length)) {
        bucketList.forEach((bucket) => {
            if (round < bucket.length && picked.length < count) {
                picked.push(bucket[round]);
            }
        });
        round += 1;
    }

    return picked;
}

function splitShowroomPools(items) {
    return {
        collectionAnchor: items.filter(
            (item) => item.img_category === 'collection' && item.anchor_item === 'yes'
        ),
        collection: items.filter(
            (item) => item.img_category === 'collection' && item.anchor_item !== 'yes'
        ),
        loose: items.filter((item) => item.img_category === 'loose_item'),
        item: items.filter((item) => item.img_category === 'collection_item')
    };
}

function getDatabaseUrl() {
    return new URL(LANDING_CONFIG.databaseUrl, window.location.href).href;
}

function getShowroomImageKey(item) {
    return item.filename_raw || item.thumbnail_url || '';
}

function resolveShowroomImageUrl(item) {
    const file =
        item.filename_raw ||
        (item.thumbnail_url && item.thumbnail_url.split('/').pop());

    if (file) {
        return new URL(`${SHOWROOM_IMAGE_BASE}${file}`, window.location.href).href;
    }

    return item.thumbnail_url || '';
}

function getShowroomTargetCount() {
    const columnCount = getShowroomColumnCount();
    const scrollHeight =
        showroomScroll?.clientHeight || Math.round(window.innerHeight * 0.72);
    const rowsNeeded =
        Math.ceil(
            (scrollHeight + SHOWROOM_CONFIG.footerOverhead) /
                SHOWROOM_CONFIG.avgThumbHeight
        ) + 4;
    const dynamicTarget = rowsNeeded * columnCount;

    return Math.min(
        SHOWROOM_CONFIG.maxImages,
        Math.max(SHOWROOM_CONFIG.minImages, dynamicTarget)
    );
}

function buildShowroomSelection(items, targetCount = getShowroomTargetCount()) {
    const validItems = items.filter((item) => getShowroomImageKey(item));
    const pools = splitShowroomPools(validItems);

    const selected = [];
    const usedKeys = new Set();

    const addItems = (poolItems) => {
        poolItems.forEach((item) => {
            if (selected.length >= targetCount) return;

            const key = getShowroomImageKey(item);
            if (!key || usedKeys.has(key)) return;

            usedKeys.add(key);
            selected.push(item);
        });
    };

    SHOWROOM_CONFIG.poolWeights.forEach(({ key, share }) => {
        const quota = Math.max(1, Math.round(targetCount * share));
        const picks = pickDiverse(pools[key] || [], quota);
        addItems(picks);
    });

    if (selected.length < targetCount) {
        const remainder = shuffleArray(
            validItems.filter((item) => !usedKeys.has(getShowroomImageKey(item)))
        );
        addItems(remainder);
    }

    return shuffleArray(selected);
}

async function loadFurnitureDatabase() {
    if (furnitureCache) return furnitureCache;

    if (window.location.protocol === 'file:') {
        throw new Error(
            'Showroom gallery requires a local server. Open landing_page.html via http://localhost, not file://.'
        );
    }

    if (!showroomLoadPromise) {
        showroomLoadPromise = (async () => {
            const response = await fetch(getDatabaseUrl());

            if (!response.ok) {
                throw new Error(`Failed to load furniture database (${response.status})`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error('Furniture database is not a valid image list.');
            }

            furnitureCache = data;
            return furnitureCache;
        })().catch((error) => {
            showroomLoadPromise = null;
            throw error;
        });
    }

    return showroomLoadPromise;
}

function getShowroomColumnCount() {
    const w = showroomGallery?.clientWidth || window.innerWidth;
    if (w < 768) return 2;
    if (w < 900) return 3;
    if (w < 1100) return 4;
    return 5;
}

function createShowroomMasonryColumns(columnCount) {
    const columns = [];

    for (let i = 0; i < columnCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column';
        showroomGallery.appendChild(col);
        columns.push(col);
    }

    return columns;
}

function createShowroomGalleryItem(item, eager = false) {
    const figure = document.createElement('figure');
    figure.className = 'lp-showroom-gallery__item';

    const img = document.createElement('img');
    img.alt = '';
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = resolveShowroomImageUrl(item);

    if (item.thumbnail_url) {
        img.addEventListener('error', () => {
            if (img.dataset.fallbackApplied === 'true') return;
            img.dataset.fallbackApplied = 'true';
            img.src = item.thumbnail_url;
        }, { once: true });
    }

    figure.appendChild(img);
    return figure;
}

function pickShortestShowroomColumn(columns, heights) {
    let target = 0;

    for (let c = 1; c < columns.length; c++) {
        if (heights[c] < heights[target]) {
            target = c;
        } else if (
            heights[c] === heights[target] &&
            columns[c].children.length < columns[target].children.length
        ) {
            target = c;
        }
    }

    return target;
}

function getShowroomColumnGap(columnCount) {
    if (columnCount >= 4) return 16;
    if (columnCount >= 2) return 14;
    return 10;
}

function getShowroomColumnWidth(columnCount) {
    const columnGap = getShowroomColumnGap(columnCount);
    const galleryWidth = showroomGallery?.clientWidth || window.innerWidth;
    return Math.max(120, (galleryWidth - columnGap * (columnCount - 1)) / columnCount);
}

function loadShowroomImageAspect(item) {
    const key = getShowroomImageKey(item);
    if (showroomAspectCache.has(key)) {
        return Promise.resolve(showroomAspectCache.get(key));
    }

    const probeUrl = item.thumbnail_url || resolveShowroomImageUrl(item);

    return new Promise((resolve) => {
        if (!probeUrl) {
            const fallback = 1.2;
            showroomAspectCache.set(key, fallback);
            resolve(fallback);
            return;
        }

        const img = new Image();
        img.decoding = 'async';

        img.onload = () => {
            const ratio =
                img.naturalWidth > 0 && img.naturalHeight > 0
                    ? img.naturalHeight / img.naturalWidth
                    : 1.2;
            showroomAspectCache.set(key, ratio);
            resolve(ratio);
        };

        img.onerror = () => {
            showroomAspectCache.set(key, 1.2);
            resolve(1.2);
        };

        img.src = probeUrl;
    });
}

async function getShowroomImageAspects(images) {
    return Promise.all(images.map((item) => loadShowroomImageAspect(item)));
}

function distributeShowroomImages(columns, images, columnCount, aspects) {
    const heights = new Array(columnCount).fill(0);
    const columnGap = getShowroomColumnGap(columnCount);
    const columnWidth = getShowroomColumnWidth(columnCount);
    const eagerCount = columnCount * 4;

    images.forEach((item, i) => {
        const target = pickShortestShowroomColumn(columns, heights);
        const figure = createShowroomGalleryItem(item, i < eagerCount);
        columns[target].appendChild(figure);
        heights[target] += columnWidth * aspects[i] + columnGap;
    });
}

async function renderShowroomGallery(images) {
    if (!showroomGallery || !images.length) return;

    setShowroomLoading('Curating sample pieces…');

    const columnCount = getShowroomColumnCount();
    lastShowroomLayoutColumns = columnCount;
    const aspects = await getShowroomImageAspects(images);

    showroomGallery.innerHTML = '';
    showroomGallery.classList.remove('is-loading');
    showroomGallery.classList.add('masonry-layout');
    showroomScroll?.classList.remove('is-gallery-loading');

    const columns = createShowroomMasonryColumns(columnCount);
    distributeShowroomImages(columns, images, columnCount, aspects);
}

async function refreshShowroomLayoutIfColumnsChanged() {
    if (!showroomIsOpen || !furnitureCache) return;
    const cols = getShowroomColumnCount();
    if (cols === lastShowroomLayoutColumns) return;
    currentShowroomImages = buildShowroomSelection(furnitureCache);
    await renderShowroomGallery(currentShowroomImages);
}

function setShowroomLoading(message) {
    if (!showroomGallery) return;

    showroomScroll?.classList.add('is-gallery-loading');
    showroomGallery.classList.add('is-loading');
    showroomGallery.classList.remove('masonry-layout');
    lastShowroomLayoutColumns = null;
    showroomGallery.innerHTML = `
        <div class="lp-showroom-loading" role="status" aria-live="polite">
            <div class="lp-showroom-loading__spinner" aria-hidden="true"></div>
            <p class="lp-showroom-loading__text">${message}</p>
        </div>
    `;
}

async function prepareShowroomGallery() {
    if (showroomPreparePromise) return showroomPreparePromise;

    showroomPreparePromise = (async () => {
        try {
            const database = await loadFurnitureDatabase();
            currentShowroomImages = buildShowroomSelection(database);

            if (!currentShowroomImages.length) {
                throw new Error('No showroom images available.');
            }

            await renderShowroomGallery(currentShowroomImages);
        } catch (error) {
            console.error('[showroom]', error);
            const hint =
                window.location.protocol === 'file:'
                    ? 'Open this page through a local server (for example: python3 -m http.server).'
                    : 'Unable to load showroom pieces. Please try again.';
            setShowroomLoading(hint);
            currentShowroomImages = null;
        }
    })().finally(() => {
        showroomPreparePromise = null;
    });

    return showroomPreparePromise;
}

function showroomMotionEnabled() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function revealShowroomModal() {
    if (!showroomModal) return;

    if (showroomCloseTimer) {
        clearTimeout(showroomCloseTimer);
        showroomCloseTimer = null;
    }

    showroomModal.hidden = false;
    showroomModal.classList.remove('is-open');

    if (!showroomMotionEnabled()) {
        showroomModal.classList.add('is-open');
        return;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            showroomModal.classList.add('is-open');
        });
    });
}

function hideShowroomModalShell() {
    return new Promise((resolve) => {
        if (!showroomModal || showroomModal.hidden) {
            resolve();
            return;
        }

        const finish = () => {
            showroomModal.hidden = true;
            showroomModal.classList.remove('is-open');
            showroomCloseTimer = null;
            resolve();
        };

        if (!showroomMotionEnabled() || !showroomModal.classList.contains('is-open')) {
            finish();
            return;
        }

        showroomModal.classList.remove('is-open');
        showroomCloseTimer = window.setTimeout(finish, SHOWROOM_MODAL_ANIM_MS);
    });
}

async function openShowroomModal(event) {
    if (event) event.preventDefault();
    if (!showroomModal || showroomIsOpen) return;

    showroomIsOpen = true;
    revealShowroomModal();
    document.body.classList.add('lp-modal-open');

    if (showroomScroll) showroomScroll.scrollTop = 0;

    if (!currentShowroomImages) {
        await prepareShowroomGallery();
    } else {
        await renderShowroomGallery(currentShowroomImages);
    }
}

async function closeShowroomModal() {
    if (!showroomModal || showroomModal.hidden) return;

    showroomIsOpen = false;
    await hideShowroomModalShell();
    currentShowroomImages = null;

    if (!contactModal || contactModal.hidden) {
        document.body.classList.remove('lp-modal-open');
    }
}

function initShowroomModal() {
    openShowroomEls.forEach((el) => {
        el.addEventListener('click', openShowroomModal);
    });

    closeShowroomEls.forEach((el) => {
        el.addEventListener('click', closeShowroomModal);
    });

    showroomModal?.querySelector('[data-showroom-book]')?.addEventListener('click', async () => {
        await closeShowroomModal();
        openContactModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (showroomModal && !showroomModal.hidden) {
            closeShowroomModal();
            return;
        }

        if (contactModal && !contactModal.hidden) {
            closeContactModal();
        }
    });
}

function initReveal() {
    if (!revealEls.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealEls.forEach((el) => el.classList.add('is-visible'));
        if (hero) hero.classList.add('is-visible');
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
    if (hero) {
        requestAnimationFrame(() => hero.classList.add('is-visible'));
    }
}

function initNavHighlight() {
    const sections = [...document.querySelectorAll('[data-section]')];
    const navLinks = [...document.querySelectorAll('.lp-nav a[data-nav]')];
    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.dataset.section;
                navLinks.forEach((link) => {
                    link.classList.toggle('is-active', link.dataset.nav === id);
                });
            });
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
}

applyContactLinks();
initContactModal();
initShowroomModal();
updateHeader();
initReveal();
initNavHighlight();

loadFurnitureDatabase().catch((error) => {
    console.warn('[showroom] Preload skipped:', error.message);
});

window.addEventListener('scroll', updateHeader, { passive: true });

window.addEventListener('resize', () => {
    clearTimeout(showroomResizeTimer);
    showroomResizeTimer = setTimeout(refreshShowroomLayoutIfColumnsChanged, 200);
});
