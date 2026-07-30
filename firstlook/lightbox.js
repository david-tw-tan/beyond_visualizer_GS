/**
 * Beyond Showrooms — First Look (shared)
 * Masonry grid + lightbox + sticky room nav + collapsible rooms.
 *
 * Expects window.FIRST_LOOK_CONFIG (defined in the client index.html):
 * {
 *   rooms: [
 *     {
 *       id: 'living-room',          // used for anchors + sticky nav
 *       title: 'Living Room',
 *       images: [
 *         { src: 'livingroom1_01.jpg', caption: 'Material — detail.', alt: '…' }
 *       ]
 *     }
 *   ]
 * }
 */

(function () {
    'use strict';

    const config = window.FIRST_LOOK_CONFIG;
    if (!config || !Array.isArray(config.rooms)) {
        console.error('FIRST_LOOK_CONFIG.rooms is required.');
        return;
    }

    const roomsRoot = document.getElementById('fl-rooms');
    const navRoot = document.getElementById('fl-room-nav');
    if (!roomsRoot) return;

    const aspectCache = new Map();
    const masonryState = new WeakMap();
    let resizeTimer = null;

    /* ─── Column count (mobile 1 / tablet 2 / desktop 3) ─── */

    /* Column count uses gallery width (page is capped ~68rem, so viewport≥1280 never applied before). */
    function getColumnCount(width) {
        if (width < 640) return 1;
        if (width < 960) return 2;
        return 3;
    }

    function getColumnGap(columnCount) {
        if (columnCount >= 3) return 16;
        if (columnCount >= 2) return 14;
        return 10;
    }

    /* ─── Masonry helpers (adapted from homepage showroom modal) ─── */

    function createColumns(parent, columnCount) {
        const columns = [];
        for (let i = 0; i < columnCount; i++) {
            const col = document.createElement('div');
            col.className = 'masonry-column';
            parent.appendChild(col);
            columns.push(col);
        }
        return columns;
    }

    function pickShortestColumn(columns, heights) {
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

    function getColumnWidth(columnCount, gridEl) {
        const columnGap = getColumnGap(columnCount);
        const galleryWidth = gridEl.clientWidth || window.innerWidth;
        return Math.max(120, (galleryWidth - columnGap * (columnCount - 1)) / columnCount);
    }

    function loadAspect(src) {
        if (aspectCache.has(src)) {
            return Promise.resolve(aspectCache.get(src));
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                const ratio =
                    img.naturalWidth > 0 && img.naturalHeight > 0
                        ? img.naturalHeight / img.naturalWidth
                        : 1.2;
                aspectCache.set(src, ratio);
                resolve(ratio);
            };
            img.onerror = () => {
                aspectCache.set(src, 1.2);
                resolve(1.2);
            };
            img.src = src;
        });
    }

    const EAGER_IMAGE_COUNT = 6; // first N images on the page load immediately (above the fold)

    function createGalleryItem(item, globalIndex) {
        const figure = document.createElement('figure');
        figure.className = 'fl-gallery__item';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'View larger: ' + (item.alt || item.caption || 'Furniture piece'));
        btn.dataset.lightboxIndex = String(globalIndex);

        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.alt || item.caption || '';
        // Top of page: eager. Below fold: browser lazy-loads as user scrolls.
        const eager = globalIndex < EAGER_IMAGE_COUNT;
        img.loading = eager ? 'eager' : 'lazy';
        img.decoding = 'async';
        if (globalIndex < 2) {
            img.fetchPriority = 'high';
        }

        btn.appendChild(img);
        figure.appendChild(btn);

        if (item.caption) {
            const caption = document.createElement('figcaption');
            caption.className = 'fl-gallery__caption';
            caption.textContent = item.caption;
            figure.appendChild(caption);
        }

        return figure;
    }

    function distributeImages(columns, images, columnCount, aspects, gridEl, indexOffset) {
        const heights = new Array(columnCount).fill(0);
        const columnGap = getColumnGap(columnCount);
        const columnWidth = getColumnWidth(columnCount, gridEl);

        images.forEach((item, i) => {
            const target = pickShortestColumn(columns, heights);
            const figure = createGalleryItem(item, indexOffset + i);
            columns[target].appendChild(figure);
            heights[target] += columnWidth * aspects[i] + columnGap;
        });
    }

    async function renderMasonry(gridEl, images, indexOffset) {
        if (!images.length) {
            gridEl.innerHTML = '';
            return;
        }

        const columnCount = getColumnCount(gridEl.clientWidth || window.innerWidth);
        const aspects = await Promise.all(images.map((item) => loadAspect(item.src)));

        gridEl.innerHTML = '';
        gridEl.classList.add('masonry-layout');
        const columns = createColumns(gridEl, columnCount);
        distributeImages(columns, images, columnCount, aspects, gridEl, indexOffset);

        masonryState.set(gridEl, { images, indexOffset, columnCount });
    }

    async function rerenderAllMasonry() {
        const grids = roomsRoot.querySelectorAll('.fl-masonry');
        for (const grid of grids) {
            const state = masonryState.get(grid);
            if (!state) continue;
            const nextCount = getColumnCount(grid.clientWidth || window.innerWidth);
            if (nextCount === state.columnCount) continue;
            await renderMasonry(grid, state.images, state.indexOffset);
        }
    }

    /* ─── Sticky nav ─── */

    function buildStickyNav(rooms) {
        if (!navRoot) return;

        const inner = document.createElement('div');
        inner.className = 'fl-room-nav__inner';

        const topBtn = document.createElement('button');
        topBtn.type = 'button';
        topBtn.className = 'fl-room-nav__top';
        topBtn.setAttribute('aria-label', 'Back to top');
        topBtn.innerHTML =
            '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M8 3.2 3.6 7.6a.75.75 0 0 0 1.06 1.06L7.25 6.07V13a.75.75 0 0 0 1.5 0V6.07l2.59 2.59a.75.75 0 1 0 1.06-1.06L8 3.2z"/>' +
            '</svg>';
        topBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        const list = document.createElement('ul');
        list.className = 'fl-room-nav__list';
        list.setAttribute('role', 'list');

        rooms.forEach((room) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'fl-room-nav__link';
            a.href = '#' + room.id;
            a.textContent = room.title;
            a.dataset.roomTarget = room.id;
            li.appendChild(a);
            list.appendChild(li);
        });

        inner.appendChild(topBtn);
        inner.appendChild(list);
        navRoot.innerHTML = '';
        navRoot.appendChild(inner);
        navRoot.hidden = false;
    }

    function setupActiveNav() {
        const links = navRoot ? Array.from(navRoot.querySelectorAll('.fl-room-nav__link')) : [];
        if (!links.length) return;

        const sections = config.rooms
            .map((room) => document.getElementById(room.id))
            .filter(Boolean);
        if (!sections.length) return;

        let activeId = null;
        let lockUntil = 0;

        const setActive = (id) => {
            if (!id || id === activeId) return;
            activeId = id;
            links.forEach((link) => {
                const isActive = link.dataset.roomTarget === id;
                link.classList.toggle('is-active', isActive);
                if (isActive && typeof link.scrollIntoView === 'function') {
                    link.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
                }
            });
        };

        const updateFromScroll = () => {
            if (Date.now() < lockUntil) return;

            const offset = (navRoot ? navRoot.getBoundingClientRect().height : 0) + 8;
            let current = sections[0].id;

            for (const section of sections) {
                if (section.getBoundingClientRect().top <= offset) {
                    current = section.id;
                }
            }

            const nearBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 48;
            if (nearBottom) {
                current = sections[sections.length - 1].id;
            }

            setActive(current);
        };

        links.forEach((link) => {
            link.addEventListener('click', () => {
                const id = link.dataset.roomTarget;
                if (!id) return;
                setActive(id);
                // Keep the clicked tab active while smooth scroll settles.
                lockUntil = Date.now() + 900;
            });
        });

        window.addEventListener('scroll', updateFromScroll, { passive: true });
        window.addEventListener('resize', updateFromScroll, { passive: true });
        updateFromScroll();
    }

    /* ─── Collapsible rooms ─── */

    function setupCollapse(sectionEl, toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const collapsed = sectionEl.classList.toggle('is-collapsed');
            toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    }

    /* ─── Lightbox ─── */

    let lightboxEl = null;
    let lightboxImg = null;
    let lightboxCaption = null;
    let allImages = [];

    function ensureLightbox() {
        lightboxEl = document.createElement('div');
        lightboxEl.className = 'fl-lightbox';
        lightboxEl.setAttribute('role', 'dialog');
        lightboxEl.setAttribute('aria-modal', 'true');
        lightboxEl.setAttribute('aria-label', 'Image preview');
        lightboxEl.hidden = true;

        lightboxEl.innerHTML =
            '<button type="button" class="fl-lightbox__close" aria-label="Close">&times;</button>' +
            '<figure class="fl-lightbox__figure">' +
            '<img class="fl-lightbox__img" alt="">' +
            '<figcaption class="fl-lightbox__caption"></figcaption>' +
            '</figure>';

        document.body.appendChild(lightboxEl);
        lightboxImg = lightboxEl.querySelector('.fl-lightbox__img');
        lightboxCaption = lightboxEl.querySelector('.fl-lightbox__caption');

        lightboxEl.querySelector('.fl-lightbox__close').addEventListener('click', closeLightbox);
        lightboxEl.addEventListener('click', (e) => {
            if (e.target === lightboxEl) closeLightbox();
        });
    }

    function openLightbox(index) {
        const item = allImages[index];
        if (!item || !lightboxEl) return;

        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt || item.caption || '';
        lightboxCaption.textContent = item.caption || '';
        lightboxCaption.hidden = !item.caption;

        lightboxEl.hidden = false;
        // Force reflow so the opacity transition runs from closed → open
        void lightboxEl.offsetWidth;
        lightboxEl.classList.add('is-open');
        document.body.classList.add('fl-lightbox-open');
    }

    function closeLightbox() {
        if (!lightboxEl) return;
        lightboxEl.classList.remove('is-open');
        document.body.classList.remove('fl-lightbox-open');
        window.setTimeout(() => {
            if (!lightboxEl.classList.contains('is-open')) {
                lightboxEl.hidden = true;
                lightboxImg.removeAttribute('src');
            }
        }, 250);
    }

    function setupLightboxClicks() {
        roomsRoot.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-lightbox-index]');
            if (!btn) return;
            const index = Number(btn.dataset.lightboxIndex);
            if (!Number.isNaN(index)) openLightbox(index);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxEl && lightboxEl.classList.contains('is-open')) {
                closeLightbox();
            }
        });
    }

    /* ─── Build page ─── */

    async function build() {
        allImages = [];
        buildStickyNav(config.rooms);
        roomsRoot.innerHTML = '';

        let indexOffset = 0;

        for (const room of config.rooms) {
            const section = document.createElement('section');
            section.className = 'fl-room';
            section.id = room.id;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'fl-room__toggle';
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-controls', room.id + '-body');

            const title = document.createElement('h2');
            title.className = 'fl-room__title';
            title.textContent = room.title;

            const chevron = document.createElement('span');
            chevron.className = 'fl-room__chevron';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.textContent = '▾';

            toggle.appendChild(title);
            toggle.appendChild(chevron);
            section.appendChild(toggle);

            const images = Array.isArray(room.images) ? room.images : [];

            const body = document.createElement('div');
            body.className = 'fl-room__body';
            body.id = room.id + '-body';

            const brochures = Array.isArray(room.brochures)
                ? room.brochures
                : room.brochure
                    ? [room.brochure]
                    : [];
            const primaryBrochure = brochures[0] || null;

            if (room.intro) {
                const intro = document.createElement('p');
                intro.className = 'fl-room__intro';

                if (primaryBrochure && primaryBrochure.href) {
                    const label = primaryBrochure.label || 'factory brochure';
                    const parts = String(room.intro).split('{{brochure}}');
                    if (parts.length === 2) {
                        intro.appendChild(document.createTextNode(parts[0]));
                        const link = document.createElement('a');
                        link.href = primaryBrochure.href;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = label;
                        intro.appendChild(link);
                        intro.appendChild(document.createTextNode(parts[1]));
                    } else {
                        intro.textContent = room.intro;
                    }
                } else {
                    intro.textContent = room.intro;
                }

                body.appendChild(intro);
            }

            const grid = document.createElement('div');
            grid.className = 'fl-masonry masonry-layout';
            body.appendChild(grid);

            const ctaBrochures = brochures.filter((item) => item && item.href && item.cta);
            if (ctaBrochures.length) {
                const list = document.createElement('div');
                list.className = 'fl-room__brochures';

                for (const item of ctaBrochures) {
                    const cta = document.createElement('a');
                    cta.className = 'fl-room__brochure';
                    cta.href = item.href;
                    cta.target = '_blank';
                    cta.rel = 'noopener noreferrer';

                    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    icon.setAttribute('class', 'fl-room__brochure-icon');
                    icon.setAttribute('viewBox', '0 0 24 24');
                    icon.setAttribute('width', '26');
                    icon.setAttribute('height', '26');
                    icon.setAttribute('aria-hidden', 'true');
                    icon.setAttribute('focusable', 'false');
                    icon.innerHTML =
                        '<path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15zM8.5 12h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1 0-1.5zm0 3.25h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1 0-1.5zm0 3.25h4.5a.75.75 0 0 1 0 1.5H8.5a.75.75 0 0 1 0-1.5z"/>';

                    const text = document.createElement('span');
                    text.textContent = item.cta;

                    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    arrow.setAttribute('class', 'fl-room__brochure-arrow');
                    arrow.setAttribute('viewBox', '0 0 24 24');
                    arrow.setAttribute('width', '16');
                    arrow.setAttribute('height', '16');
                    arrow.setAttribute('aria-hidden', 'true');
                    arrow.setAttribute('focusable', 'false');
                    arrow.innerHTML =
                        '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M9 7h8v8"/>';

                    cta.appendChild(icon);
                    cta.appendChild(text);
                    cta.appendChild(arrow);
                    list.appendChild(cta);
                }

                body.appendChild(list);
            }

            section.appendChild(body);

            roomsRoot.appendChild(section);
            setupCollapse(section, toggle);

            allImages.push(...images);
            await renderMasonry(grid, images, indexOffset);
            indexOffset += images.length;
        }

        ensureLightbox();
        setupLightboxClicks();
        setupActiveNav();

        window.addEventListener('resize', () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                rerenderAllMasonry();
            }, 180);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
