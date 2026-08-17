/**
 * Founder homepage — collection carousel & preview modal
 */
const SHOWROOM_SECTIONS = [
    {
        title: 'Living room',
        items: [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
            buildShowroomItem(`images/collection_living_${n}.jpg`)
        )
    },
    {
        title: 'Bedroom',
        items: [1, 2, 4, 5].map((n) =>
            buildShowroomItem(`images/collection_bed_${n}.jpg`)
        )
    },
    {
        title: 'Dining room',
        items: [1, 2, 3, 4].map((n) =>
            buildShowroomItem(`images/collection_dining_${n}.jpg`)
        )
    },
    {
        title: 'Accessories',
        subtitle: 'Statement pieces to complete your room.',
        layout: 'collage',
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) =>
            buildShowroomItem(`images/accessory_${n}.jpg`)
        )
    }
];

const showroomModal = document.getElementById('showroomModal');
const partnersModal = document.getElementById('partnersModal');
const partnersList = document.getElementById('partnersList');
const showroomGallery = document.getElementById('showroomGallery');
const showroomScroll = document.getElementById('showroomScroll');
const openShowroomEls = document.querySelectorAll('[data-open-showroom]');
const closeShowroomEls = document.querySelectorAll('[data-close-showroom]');

let showroomIsOpen = false;
let lastShowroomLayoutColumns = null;
let showroomResizeTimer = null;
let showroomCloseTimer = null;
const showroomAspectCache = new Map();
const SHOWROOM_MODAL_ANIM_MS = 500;
const IMAGE_WARM_CONCURRENCY = 2;
const warmedImageUrls = new Set();
let homepageImageWarmStarted = false;

function getShowroomImageKey(item) {
    return item.image || '';
}

function resolveShowroomImageUrl(item) {
    if (!item.image) return '';
    return new URL(item.image, window.location.href).href;
}

function getShowroomColumnCount() {
    const w = showroomGallery?.clientWidth || window.innerWidth;
    return w < 768 ? 1 : 2;
}

function createShowroomMasonryColumns(parent, columnCount) {
    const columns = [];

    for (let i = 0; i < columnCount; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-column';
        parent.appendChild(col);
        columns.push(col);
    }

    return columns;
}

function createShowroomGalleryItem(item, eager = false) {
    const figure = document.createElement('figure');
    figure.className = 'lp-showroom-gallery__item';

    const img = document.createElement('img');
    img.alt = item.alt || 'Curated whole-room collection';
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = resolveShowroomImageUrl(item);

    figure.appendChild(img);

    if (item.caption) {
        const caption = document.createElement('figcaption');
        caption.className = 'lp-showroom-gallery__caption';
        caption.textContent = item.caption;
        figure.appendChild(caption);
    }

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
    return columnCount >= 2 ? 14 : 10;
}

function getShowroomColumnWidth(columnCount, gridEl) {
    const columnGap = getShowroomColumnGap(columnCount);
    const galleryWidth = gridEl?.clientWidth || showroomGallery?.clientWidth || window.innerWidth;
    return Math.max(120, (galleryWidth - columnGap * (columnCount - 1)) / columnCount);
}

function loadShowroomImageAspect(item) {
    const key = getShowroomImageKey(item);
    if (showroomAspectCache.has(key)) {
        return Promise.resolve(showroomAspectCache.get(key));
    }

    const probeUrl = resolveShowroomImageUrl(item);

    return new Promise((resolve) => {
        if (!probeUrl) {
            showroomAspectCache.set(key, 1.2);
            resolve(1.2);
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

function distributeShowroomImages(columns, images, columnCount, aspects, gridEl) {
    const heights = new Array(columnCount).fill(0);
    const columnGap = getShowroomColumnGap(columnCount);
    const columnWidth = getShowroomColumnWidth(columnCount, gridEl);
    const eagerCount = columnCount * 2;

    images.forEach((item, i) => {
        const target = pickShortestShowroomColumn(columns, heights);
        const figure = createShowroomGalleryItem(item, i < eagerCount);
        columns[target].appendChild(figure);
        heights[target] += columnWidth * aspects[i] + columnGap;
    });
}

function mountShowroomSection(section) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'lp-showroom-section';

    const title = document.createElement('h3');
    title.className = 'lp-showroom-section-title';
    title.textContent = section.title;
    sectionEl.appendChild(title);

    if (section.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'lp-showroom-section-subtitle';
        subtitle.textContent = section.subtitle;
        sectionEl.appendChild(subtitle);
    }

    const grid = document.createElement('div');
    grid.className = 'lp-showroom-section-grid masonry-layout';
    sectionEl.appendChild(grid);

    return { sectionEl, grid };
}

function createShowroomCollageItem(item, eager = false) {
    const figure = document.createElement('figure');
    figure.className = 'lp-showroom-accessories__item';

    const img = document.createElement('img');
    img.alt = item.alt || 'Showroom accessory piece';
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = resolveShowroomImageUrl(item);

    figure.appendChild(img);
    return figure;
}

function mountShowroomCollageSection(section) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'lp-showroom-section lp-showroom-section--accessories';

    const title = document.createElement('h3');
    title.className = 'lp-showroom-section-title';
    title.textContent = section.title;
    sectionEl.appendChild(title);

    if (section.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'lp-showroom-section-subtitle';
        subtitle.textContent = section.subtitle;
        sectionEl.appendChild(subtitle);
    }

    const grid = document.createElement('div');
    grid.className = 'lp-showroom-section-grid lp-showroom-section-grid--accessories';
    section.items.forEach((item, index) => {
        grid.appendChild(createShowroomCollageItem(item, index < 6));
    });
    sectionEl.appendChild(grid);

    return sectionEl;
}

async function renderShowroomGallery(sections = SHOWROOM_SECTIONS) {
    if (!showroomGallery || !sections.length) return;

    const hasItems = sections.some((section) => section.items?.length);
    if (!hasItems) return;

    setShowroomLoading('Loading collections…');

    const columnCount = getShowroomColumnCount();
    lastShowroomLayoutColumns = columnCount;

    const aspectGroups = await Promise.all(
        sections.map((section) =>
            section.layout === 'collage'
                ? Promise.resolve(null)
                : getShowroomImageAspects(section.items)
        )
    );

    showroomGallery.innerHTML = '';
    showroomGallery.classList.remove('is-loading');
    showroomGallery.classList.add('lp-showroom-sections');
    showroomScroll?.classList.remove('is-gallery-loading');

    sections.forEach((section, index) => {
        if (section.layout === 'collage') {
            showroomGallery.appendChild(mountShowroomCollageSection(section));
            return;
        }

        const { sectionEl, grid } = mountShowroomSection(section);
        const columns = createShowroomMasonryColumns(grid, columnCount);
        distributeShowroomImages(
            columns,
            section.items,
            columnCount,
            aspectGroups[index],
            grid
        );
        showroomGallery.appendChild(sectionEl);
    });
}

async function refreshShowroomLayoutIfColumnsChanged() {
    if (!showroomIsOpen) return;
    const cols = getShowroomColumnCount();
    if (cols === lastShowroomLayoutColumns) return;
    await renderShowroomGallery(SHOWROOM_SECTIONS);
}

function setShowroomLoading(message) {
    if (!showroomGallery) return;

    showroomScroll?.classList.add('is-gallery-loading');
    showroomGallery.classList.add('is-loading');
    showroomGallery.classList.remove('lp-showroom-sections');
    lastShowroomLayoutColumns = null;
    showroomGallery.innerHTML = `
        <div class="lp-showroom-loading" role="status" aria-live="polite">
            <div class="lp-showroom-loading__spinner" aria-hidden="true"></div>
            <p class="lp-showroom-loading__text">${message}</p>
        </div>
    `;
}

function showroomMotionEnabled() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let founderBodyLockScrollY = 0;

function syncFounderModalBodyLock() {
    const contactModal = document.getElementById('contactModal');
    const anyOpen =
        (showroomModal && !showroomModal.hidden) ||
        (contactModal && !contactModal.hidden) ||
        (partnersModal && !partnersModal.hidden);

    if (anyOpen) {
        if (document.body.dataset.bsScrollLocked === '1') return;
        founderBodyLockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.dataset.bsScrollLocked = '1';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${founderBodyLockScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        return;
    }

    if (document.body.dataset.bsScrollLocked !== '1') return;
    document.body.removeAttribute('data-bs-scroll-locked');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, founderBodyLockScrollY);
}

function syncShowroomModalBodyLock() {
    syncFounderModalBodyLock();
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
    syncShowroomModalBodyLock();

    if (showroomScroll) showroomScroll.scrollTop = 0;

    try {
        await renderShowroomGallery(SHOWROOM_SECTIONS);
    } catch (error) {
        console.error('[showroom]', error);
        setShowroomLoading('Unable to load collections. Please try again.');
    }
}

async function closeShowroomModal() {
    if (!showroomModal || showroomModal.hidden) return;

    showroomIsOpen = false;
    await hideShowroomModalShell();
    syncShowroomModalBodyLock();
}

function initShowroomModal() {
    openShowroomEls.forEach((el) => {
        el.addEventListener('click', openShowroomModal);
    });

    closeShowroomEls.forEach((el) => {
        el.addEventListener('click', closeShowroomModal);
    });

    showroomModal?.querySelectorAll('[data-showroom-book]').forEach((el) => {
        el.addEventListener('click', async () => {
            await closeShowroomModal();
            if (typeof window.openFounderContact === 'function') {
                window.openFounderContact();
            }
        });
    });
}

/** Living → bedroom → dining → accessories (SHOWROOM_SECTIONS order). */
function getModalPrefetchUrls() {
    return SHOWROOM_SECTIONS.flatMap((section) =>
        (section.items || [])
            .map((item) => resolveShowroomImageUrl(item))
            .filter(Boolean)
    );
}

/**
 * In-page images below the hero, document order (bridge collage → carousels → …).
 * Hero is left to its existing eager/preload path.
 */
function getInPageWarmUrls() {
    const main = document.querySelector('main');
    if (!main) return [];

    const hero = main.querySelector('.hero-wrap');
    const urls = [];
    const seen = new Set();

    main.querySelectorAll('img[src]').forEach((img) => {
        if (hero && hero.contains(img)) return;

        const raw = img.getAttribute('src');
        if (!raw) return;

        const url = new URL(raw, window.location.href).href;
        if (seen.has(url) || warmedImageUrls.has(url)) return;
        seen.add(url);
        urls.push(url);
    });

    return urls;
}

function isAnyFounderImageModalOpen() {
    return (
        showroomIsOpen ||
        (showroomModal && !showroomModal.hidden) ||
        (partnersModal && !partnersModal.hidden)
    );
}

function prefetchImageUrl(url) {
    if (!url || warmedImageUrls.has(url)) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        if ('fetchPriority' in img) {
            img.fetchPriority = 'low';
        }

        const finish = () => {
            warmedImageUrls.add(url);
            resolve();
        };

        img.onload = finish;
        img.onerror = finish;
        img.src = url;
    });
}

function waitWhileModalOpen() {
    if (!isAnyFounderImageModalOpen()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const tick = () => {
            if (!isAnyFounderImageModalOpen()) {
                resolve();
                return;
            }
            window.setTimeout(tick, 400);
        };
        tick();
    });
}

async function warmImageUrlQueue(urls) {
    const queue = urls.filter((url) => url && !warmedImageUrls.has(url));
    if (!queue.length) return;

    let next = 0;

    async function worker() {
        while (next < queue.length) {
            await waitWhileModalOpen();
            const url = queue[next++];
            if (!url || warmedImageUrls.has(url)) continue;
            await prefetchImageUrl(url);
        }
    }

    const workers = Math.min(IMAGE_WARM_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
}

/**
 * After page load: warm in-page images top→bottom (excl. hero), then modal gallery.
 * Concurrency 1–2 so GitHub Pages is not flooded.
 */
async function runHomepageImageWarmPipeline() {
    await warmImageUrlQueue(getInPageWarmUrls());
    await warmImageUrlQueue(getModalPrefetchUrls());
}

function scheduleHomepageImageWarmPipeline() {
    if (homepageImageWarmStarted) return;
    homepageImageWarmStarted = true;

    const start = () => {
        if (navigator.connection?.saveData) return;

        const run = () => {
            runHomepageImageWarmPipeline().catch(() => {});
        };

        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout: 4000 });
        } else {
            window.setTimeout(run, 2000);
        }
    };

    if (document.readyState === 'complete') {
        start();
    } else {
        window.addEventListener('load', start, { once: true });
    }
}

function createPartnerStat(label, value) {
    const row = document.createElement('div');
    row.className = 'lp-partner-card__stat';

    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = value;

    row.appendChild(dt);
    row.appendChild(dd);
    return row;
}

function createPartnerCard(partner) {
    const card = document.createElement('article');
    card.className = 'lp-partner-card';
    card.id = `partner-${partner.id}`;

    const img = document.createElement('img');
    img.className = 'lp-partner-card__img';
    img.src = partner.image;
    img.alt = `${partner.companyName}, ${partner.location}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    const header = document.createElement('div');
    header.className = 'lp-partner-card__header';

    const companyName = document.createElement('h3');
    companyName.className = 'lp-partner-card__name';
    companyName.textContent = partner.companyName;

    const location = document.createElement('p');
    location.className = 'lp-partner-card__location';
    location.textContent = partner.location;

    header.appendChild(companyName);
    header.appendChild(location);

    const stats = document.createElement('dl');
    stats.className = 'lp-partner-card__stats';
    stats.appendChild(createPartnerStat('Established', partner.established));
    stats.appendChild(createPartnerStat('Production floor', partner.productionArea));
    stats.appendChild(createPartnerStat('Showroom', partner.showroomArea));
    stats.appendChild(createPartnerStat('Annual export volume', partner.turnover));
    stats.appendChild(createPartnerStat('Large-home projects', partner.projects));
    stats.appendChild(createPartnerStat('Export markets', partner.exportMarkets));

    const specialty = document.createElement('p');
    specialty.className = 'lp-partner-card__specialty';
    specialty.textContent = partner.specialty;

    card.appendChild(img);
    card.appendChild(header);
    card.appendChild(stats);
    card.appendChild(specialty);

    return card;
}

function renderPartnersList() {
    if (!partnersList || !Array.isArray(FACTORY_PARTNERS)) return;

    partnersList.innerHTML = '';
    FACTORY_PARTNERS.forEach((partner) => {
        partnersList.appendChild(createPartnerCard(partner));
    });

    const footer = document.createElement('div');
    footer.className = 'lp-partners-list__footer';

    const watermark = document.createElement('span');
    watermark.className = 'lp-partners-list__footer-watermark';
    watermark.setAttribute('aria-hidden', 'true');
    watermark.textContent = 'BS';

    const footerText = document.createElement('p');
    footerText.className = 'lp-partners-list__footer-text';
    footerText.textContent = '25+ premium factories in my network';

    footer.appendChild(watermark);
    footer.appendChild(footerText);
    partnersList.appendChild(footer);
}

let partnersLastFocus = null;

function openPartnersModal() {
    if (!partnersModal) return;

    partnersLastFocus = document.activeElement;
    renderPartnersList();
    partnersModal.hidden = false;
    syncFounderModalBodyLock();
    partnersModal.querySelector('.lp-modal__close')?.focus({ preventScroll: true });
}

function closePartnersModal() {
    if (!partnersModal || partnersModal.hidden) return;

    partnersModal.hidden = true;
    syncFounderModalBodyLock();
    if (partnersLastFocus && partnersLastFocus.focus) {
        partnersLastFocus.focus({ preventScroll: true });
    }
}

function initPartnersModal() {
    document.querySelectorAll('[data-open-partners]').forEach((el) => {
        el.addEventListener('click', openPartnersModal);
    });

    document.querySelectorAll('[data-close-partners]').forEach((el) => {
        el.addEventListener('click', closePartnersModal);
    });
}

function handleFounderModalEscape(event) {
    if (event.key !== 'Escape') return;

    if (partnersModal && !partnersModal.hidden) {
        event.preventDefault();
        closePartnersModal();
        return;
    }

    if (showroomModal && !showroomModal.hidden) {
        event.preventDefault();
        closeShowroomModal();
    }
}

function initSlideCarousel(carousel, config) {
    const track = carousel.querySelector(config.track);
    const slides = [...carousel.querySelectorAll(config.slide)];
    const captions = [...carousel.querySelectorAll(config.caption)];
    const prevBtn = carousel.querySelector(config.prev);
    const nextBtn = carousel.querySelector(config.next);
    const dotsContainer = carousel.querySelector(config.dots);
    const viewport = carousel.querySelector(config.viewport);

    if (!track || slides.length === 0) return;

    let index = 0;
    let touchStartX = 0;
    let autoTimer = null;
    const dotLabel = config.dotLabel || 'Slide';
    const autoRotateMs = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? (config.autoRotateMs || 0)
        : 0;
    const pauseWhenOffscreen = config.pauseWhenOffscreen === true;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = config.dotClass;
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `${dotLabel} ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer?.appendChild(dot);
    });

    const dots = [...dotsContainer?.querySelectorAll(`.${config.dotClass}`) ?? []];

    function stopAuto() {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
    }

    function startAuto() {
        if (!autoRotateMs) return;
        stopAuto();
        autoTimer = setInterval(() => goTo(index + 1, { fromAuto: true }), autoRotateMs);
    }

    function goTo(nextIndex, options = {}) {
        index = (nextIndex + slides.length) % slides.length;

        track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;

        slides.forEach((slide, i) => {
            slide.setAttribute('aria-hidden', i !== index ? 'true' : 'false');
        });

        captions.forEach((caption, i) => {
            caption.hidden = i !== index;
        });

        dots.forEach((dot, i) => {
            const isActive = i === index;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (!options.fromAuto) {
            startAuto();
        }
    }

    prevBtn?.addEventListener('click', () => goTo(index - 1));
    nextBtn?.addEventListener('click', () => goTo(index + 1));

    carousel.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(index - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(index + 1);
        }
    });

    if (autoRotateMs) {
        carousel.addEventListener('mouseenter', stopAuto);
        carousel.addEventListener('mouseleave', startAuto);
        carousel.addEventListener('focusin', stopAuto);
        carousel.addEventListener('focusout', (event) => {
            if (!carousel.contains(event.relatedTarget)) {
                startAuto();
            }
        });

        if (pauseWhenOffscreen && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    const isVisible = entries.some((entry) => entry.isIntersecting);
                    if (isVisible) {
                        startAuto();
                    } else {
                        stopAuto();
                    }
                },
                { threshold: 0.2 }
            );
            observer.observe(carousel);
        }
    }

    viewport?.addEventListener(
        'touchstart',
        (event) => {
            touchStartX = event.changedTouches[0]?.screenX ?? 0;
        },
        { passive: true }
    );

    viewport?.addEventListener(
        'touchend',
        (event) => {
            const touchEndX = event.changedTouches[0]?.screenX ?? 0;
            const delta = touchEndX - touchStartX;

            if (Math.abs(delta) < 40) return;

            if (delta < 0) goTo(index + 1);
            else goTo(index - 1);
        },
        { passive: true }
    );

    goTo(0);
    startAuto();
}

function initAfterOrderGrid() {
    const root = document.querySelector('[data-after-order-grid]');
    if (!root) return;

    const cells = [...root.querySelectorAll('[data-after-order-cell]')];
    const captions = [...root.querySelectorAll('[data-after-order-caption]')];
    const dotsContainer = root.querySelector('[data-after-order-dots]');
    const progress = root.querySelector('[data-after-order-progress]');
    const progressFill = root.querySelector('[data-after-order-progress-fill]');
    if (!cells.length) return;

    let index = 0;
    const autoRotateMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 4500;
    let isOnScreen = true;

    cells.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'after-order-grid__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Step ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer?.appendChild(dot);
    });

    const dots = [...dotsContainer?.querySelectorAll('.after-order-grid__dot') ?? []];

    function restartProgress() {
        if (!autoRotateMs || !progressFill) return;
        progressFill.style.animation = 'none';
        progressFill.offsetHeight;
        progressFill.style.animation = '';
    }

    function pauseProgress() {
        progress?.classList.add('is-paused');
    }

    function resumeProgress() {
        if (!isOnScreen) return;
        progress?.classList.remove('is-paused');
    }

    function goTo(nextIndex) {
        index = (nextIndex + cells.length) % cells.length;

        cells.forEach((cell, i) => {
            const isActive = i === index;
            cell.classList.toggle('is-active', isActive);
            cell.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        captions.forEach((caption, i) => {
            caption.hidden = i !== index;
        });

        dots.forEach((dot, i) => {
            const isActive = i === index;
            dot.classList.toggle('is-active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (progress) {
            cells[index]?.appendChild(progress);
        }

        restartProgress();
    }

    if (autoRotateMs) {
        progressFill?.style.setProperty('--progress-duration', `${autoRotateMs}ms`);
        progressFill?.addEventListener('animationend', (event) => {
            if (event.animationName !== 'after-order-progress') return;
            if (!isOnScreen) return;
            goTo(index + 1);
        });
    } else {
        progress?.classList.add('is-hidden');
    }

    cells.forEach((cell, i) => {
        cell.addEventListener('click', () => goTo(i));
    });

    root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(index - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(index + 1);
        }
    });

    if (autoRotateMs) {
        root.addEventListener('mouseenter', pauseProgress);
        root.addEventListener('mouseleave', resumeProgress);
        root.addEventListener('focusin', pauseProgress);
        root.addEventListener('focusout', (event) => {
            if (!root.contains(event.relatedTarget)) {
                resumeProgress();
            }
        });

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    isOnScreen = entries.some((entry) => entry.isIntersecting);
                    if (isOnScreen) {
                        resumeProgress();
                        restartProgress();
                    } else {
                        pauseProgress();
                    }
                },
                { threshold: 0.2 }
            );
            observer.observe(root);
        }
    }

    goTo(0);
}

function initCaseStudyCarousel() {
    const carousel = document.querySelector('[data-case-carousel]');
    if (!carousel) return;

    initSlideCarousel(carousel, {
        track: '[data-case-track]',
        slide: '[data-case-slide]',
        caption: '[data-case-caption]',
        prev: '[data-case-prev]',
        next: '[data-case-next]',
        dots: '[data-case-dots]',
        viewport: '.lp-case-carousel__viewport',
        dotClass: 'lp-case-carousel__dot',
        dotLabel: 'Home'
    });
}

function initShowroomCarousel() {
    const carousel = document.querySelector('[data-showroom-carousel]');
    if (!carousel) return;

    initSlideCarousel(carousel, {
        track: '[data-showroom-track]',
        slide: '[data-showroom-slide]',
        caption: '[data-showroom-caption]',
        prev: '[data-showroom-prev]',
        next: '[data-showroom-next]',
        dots: '[data-showroom-dots]',
        viewport: '.lp-case-carousel__viewport',
        dotClass: 'lp-case-carousel__dot',
        dotLabel: 'Collection',
        autoRotateMs: 7500
    });
}

function initDocHero() {
    const config = window.__BS_VISITOR || { staticHero: false };
    const youtubeAnswer = document.querySelector('[data-bridge-answer="youtube"]');
    const directAnswer = document.querySelector('[data-bridge-answer="direct"]');

    if (config.staticHero) {
        if (youtubeAnswer) youtubeAnswer.hidden = false;
        if (directAnswer) directAnswer.hidden = true;
        return;
    }

    if (youtubeAnswer) youtubeAnswer.hidden = true;
    if (directAnswer) directAnswer.hidden = false;

    const playBtn = document.querySelector('[data-doc-video-play]');
    const embedHost = document.querySelector('[data-doc-video-embed]');
    if (!playBtn || !embedHost) return;

    const videoId = 'IIxz0ih0inw';
    const startSeconds = 11;

    playBtn.addEventListener('click', () => {
        if (embedHost.querySelector('iframe')) return;

        const iframe = document.createElement('iframe');
        iframe.className = 'doc-visual__iframe';
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?start=${startSeconds}&autoplay=1&rel=0`;
        iframe.title = 'Beyond Showrooms docuseries — Episode 1';
        iframe.allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';

        embedHost.appendChild(iframe);
        embedHost.hidden = false;
        playBtn.hidden = true;
    });
}

document.addEventListener('keydown', handleFounderModalEscape);

document.addEventListener('DOMContentLoaded', function () {
    initAfterOrderGrid();
    initShowroomCarousel();
    initCaseStudyCarousel();
    initShowroomModal();
    initPartnersModal();
    initDocHero();
    scheduleHomepageImageWarmPipeline();
    window.syncFounderModalBodyLock = syncFounderModalBodyLock;
});

window.addEventListener('resize', () => {
    clearTimeout(showroomResizeTimer);
    showroomResizeTimer = setTimeout(refreshShowroomLayoutIfColumnsChanged, 200);
});
