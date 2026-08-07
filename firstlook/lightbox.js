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
    const quoteRoot = document.getElementById('fl-quote');
    // Quote-only pages may omit #fl-rooms; look pages always have it.
    if (!roomsRoot && !quoteRoot) return;

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
    let lightboxPrevBtn = null;
    let lightboxNextBtn = null;
    let allImages = [];
    let lightboxIndex = 0;

    function ensureLightbox() {
        lightboxEl = document.createElement('div');
        lightboxEl.className = 'fl-lightbox';
        lightboxEl.setAttribute('role', 'dialog');
        lightboxEl.setAttribute('aria-modal', 'true');
        lightboxEl.setAttribute('aria-label', 'Image preview');
        lightboxEl.hidden = true;

        lightboxEl.innerHTML =
            '<button type="button" class="fl-lightbox__close" aria-label="Close">&times;</button>' +
            '<button type="button" class="fl-lightbox__nav fl-lightbox__nav--prev" aria-label="Previous image">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
            '<path fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/>' +
            '</svg></button>' +
            '<button type="button" class="fl-lightbox__nav fl-lightbox__nav--next" aria-label="Next image">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
            '<path fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/>' +
            '</svg></button>' +
            '<figure class="fl-lightbox__figure">' +
            '<img class="fl-lightbox__img" alt="">' +
            '<figcaption class="fl-lightbox__caption"></figcaption>' +
            '</figure>';

        document.body.appendChild(lightboxEl);
        lightboxImg = lightboxEl.querySelector('.fl-lightbox__img');
        lightboxCaption = lightboxEl.querySelector('.fl-lightbox__caption');
        lightboxPrevBtn = lightboxEl.querySelector('.fl-lightbox__nav--prev');
        lightboxNextBtn = lightboxEl.querySelector('.fl-lightbox__nav--next');

        lightboxEl.querySelector('.fl-lightbox__close').addEventListener('click', closeLightbox);
        lightboxPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stepLightbox(-1);
        });
        lightboxNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stepLightbox(1);
        });
        lightboxEl.addEventListener('click', (e) => {
            if (e.target === lightboxEl) closeLightbox();
        });
    }

    function galleryIndexesFor(index) {
        const current = allImages[index];
        if (!current) return [];
        const group = current.gallery || null;
        if (group) {
            return allImages
                .map((item, i) => (item.gallery === group ? i : -1))
                .filter((i) => i >= 0);
        }
        return allImages.map((_, i) => i);
    }

    function showLightboxItem(index) {
        if (!allImages.length || !lightboxEl) return;
        const len = allImages.length;
        lightboxIndex = ((index % len) + len) % len;
        const item = allImages[lightboxIndex];

        lightboxImg.src = item.src;
        lightboxImg.alt = item.alt || item.caption || '';
        if (item.captionHtml) {
            lightboxCaption.innerHTML = item.captionHtml;
            lightboxCaption.hidden = false;
        } else {
            lightboxCaption.textContent = item.caption || '';
            lightboxCaption.hidden = !item.caption;
        }

        const multi = galleryIndexesFor(lightboxIndex).length > 1;
        lightboxPrevBtn.hidden = !multi;
        lightboxNextBtn.hidden = !multi;
    }

    function openLightbox(index) {
        if (!lightboxEl || !allImages.length) return;
        showLightboxItem(index);
        lightboxEl.hidden = false;
        void lightboxEl.offsetWidth;
        lightboxEl.classList.add('is-open');
        document.body.classList.add('fl-lightbox-open');
    }

    function stepLightbox(delta) {
        if (!lightboxEl || !lightboxEl.classList.contains('is-open')) return;
        const group = galleryIndexesFor(lightboxIndex);
        if (group.length < 2) return;
        const pos = group.indexOf(lightboxIndex);
        const nextPos = ((pos + delta) % group.length + group.length) % group.length;
        showLightboxItem(group[nextPos]);
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
        const clickRoot = document.querySelector('.fl-page') || document;
        clickRoot.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-lightbox-index]');
            if (!btn) return;
            const index = Number(btn.dataset.lightboxIndex);
            if (!Number.isNaN(index)) openLightbox(index);
        });

        document.addEventListener('keydown', (e) => {
            if (lightboxEl && lightboxEl.classList.contains('is-open')) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') stepLightbox(-1);
                if (e.key === 'ArrowRight') stepLightbox(1);
                return;
            }

            if (e.key !== 'Enter' && e.key !== ' ') return;
            const row = e.target.closest('.fl-quote__row[data-lightbox-index]');
            if (!row || e.target !== row) return;
            e.preventDefault();
            const index = Number(row.dataset.lightboxIndex);
            if (!Number.isNaN(index)) openLightbox(index);
        });
    }

    function buildQuoteSection() {
        const quote = config.quote;
        if (!quote || !quoteRoot) return;

        quoteRoot.innerHTML = '';

        const section = document.createElement('section');
        section.className = 'fl-room fl-quote';
        section.id = quote.id || 'master-bedroom';

        const heading = document.createElement('h2');
        heading.className = 'fl-room__title fl-quote__title';
        heading.textContent = quote.title || 'Master Bedroom';
        section.appendChild(heading);

        if (quote.intro) {
            const intro = document.createElement('p');
            intro.className = 'fl-room__intro';
            intro.textContent = quote.intro;
            section.appendChild(intro);
        }

        if (quote.hero && quote.hero.src) {
            const heroIndex = allImages.length;
            allImages.push({
                src: quote.hero.src,
                alt: quote.hero.alt || '',
                caption: quote.hero.caption || '',
                captionHtml: quote.hero.captionHtml || '',
                gallery: 'quote-hero'
            });

            const hero = document.createElement('figure');
            hero.className = 'fl-quote__hero';
            const heroBtn = document.createElement('button');
            heroBtn.type = 'button';
            heroBtn.className = 'fl-quote__hero-btn';
            heroBtn.dataset.lightboxIndex = String(heroIndex);
            heroBtn.setAttribute('aria-label', quote.hero.alt || 'View reference image larger');
            const heroImg = document.createElement('img');
            heroImg.src = quote.hero.src;
            heroImg.alt = quote.hero.alt || '';
            heroImg.loading = 'eager';
            heroImg.decoding = 'async';
            heroBtn.appendChild(heroImg);
            hero.appendChild(heroBtn);
            if (quote.hero.caption) {
                const cap = document.createElement('figcaption');
                cap.className = 'fl-quote__hero-caption';
                cap.textContent = quote.hero.caption;
                hero.appendChild(cap);
            }
            section.appendChild(hero);
        }

        const items = Array.isArray(quote.items) ? quote.items : [];
        if (items.length) {
            const titleBlock = document.createElement('div');
            titleBlock.className = 'fl-quote__list-titleblock';

            const listTitle = document.createElement('h3');
            listTitle.className = 'fl-quote__list-title';
            listTitle.textContent = quote.listTitle || 'Price List';
            titleBlock.appendChild(listTitle);

            if (quote.photoTip) {
                const tip = document.createElement('p');
                tip.className = 'fl-quote__photo-tip';
                tip.innerHTML =
                    '<span class="fl-quote__photo-tip-icon" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" focusable="false">' +
                    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8.5 11.5V7.75a1.75 1.75 0 0 1 3.5 0V11"/>' +
                    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M12 11V6.75a1.75 1.75 0 0 1 3.5 0V11"/>' +
                    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M15.5 11V8.25a1.75 1.75 0 0 1 3.5 0V14.5c0 2.9-2.35 5.25-5.25 5.25h-1.1c-1.7 0-3.3-.8-4.3-2.15L6 14.5"/>' +
                    '<path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8.5 11.5V16"/>' +
                    '</svg></span>' +
                    '<span>' + escapeHtml(quote.photoTip) + '</span>';
                titleBlock.appendChild(tip);
            }

            section.appendChild(titleBlock);

            const list = document.createElement('div');
            list.className = 'fl-quote__list';
            list.setAttribute('role', 'list');

            const head = document.createElement('div');
            head.className = 'fl-quote__list-head';
            head.innerHTML =
                '<span class="fl-quote__col-item">Item</span>' +
                '<span class="fl-quote__col-desc">Description</span>' +
                '<span class="fl-quote__col-qty">Qty</span>' +
                '<span class="fl-quote__col-price">Price (USD)</span>';
            list.appendChild(head);

            items.forEach((item) => {
                const imageList = Array.isArray(item.images) && item.images.length
                    ? item.images.map((entry) => (
                        typeof entry === 'string'
                            ? { src: entry }
                            : { src: entry.src, caption: entry.caption || '' }
                    )).filter((entry) => entry.src)
                    : [{ src: item.src, caption: '' }];

                const firstIndex = allImages.length;
                imageList.forEach((imageEntry, imageIndex) => {
                    const isSecondary = imageIndex > 0;
                    const counterHtml = imageList.length > 1
                        ? '<span class="fl-lightbox__counter">' + (imageIndex + 1) + ' / ' + imageList.length + '</span>'
                        : '';
                    const bodyHtml = isSecondary
                        ? (imageEntry.caption
                            ? '<span class="fl-lightbox__caption-body">' + escapeHtml(imageEntry.caption) + '</span>'
                            : '')
                        : '<span class="fl-lightbox__caption-body">' + escapeHtml(item.summary) + '</span>';
                    const captionHtml =
                        '<span class="fl-lightbox__caption-title">' + escapeHtml(item.label) + '</span>' +
                        bodyHtml +
                        '<span class="fl-lightbox__meta">Qty ' + escapeHtml(String(item.qty)) +
                        ' · ' + escapeHtml(item.priceLabel) + '</span>' +
                        counterHtml;

                    allImages.push({
                        src: imageEntry.src,
                        alt: item.label + (imageEntry.caption ? ' — ' + imageEntry.caption : ''),
                        caption: item.label + ' — Qty ' + item.qty + ' · ' + item.priceLabel,
                        captionHtml: captionHtml,
                        gallery: 'quote-items'
                    });
                });

                const row = document.createElement('article');
                row.className = 'fl-quote__row';
                row.setAttribute('role', 'listitem');
                row.dataset.lightboxIndex = String(firstIndex);
                row.tabIndex = 0;
                row.title = 'Tap to enlarge' + (imageList.length > 1 ? ' (' + imageList.length + ' photos)' : '');

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fl-quote__thumb-btn';
                btn.tabIndex = -1;
                btn.setAttribute('aria-hidden', 'true');
                const img = document.createElement('img');
                img.src = item.src || imageList[0].src;
                img.alt = item.label;
                img.loading = 'lazy';
                img.decoding = 'async';
                btn.appendChild(img);

                if (imageList.length > 1) {
                    const badge = document.createElement('span');
                    badge.className = 'fl-quote__thumb-count';
                    badge.textContent = String(imageList.length);
                    badge.setAttribute('aria-hidden', 'true');
                    btn.appendChild(badge);
                }

                const desc = document.createElement('div');
                desc.className = 'fl-quote__desc';
                desc.innerHTML =
                    '<p class="fl-quote__label">' + escapeHtml(item.label) + '</p>' +
                    '<p class="fl-quote__summary">' + escapeHtml(item.summary) + '</p>' +
                    '<p class="fl-quote__dims">' + escapeHtml(item.dims) + '</p>';

                const qty = document.createElement('p');
                qty.className = 'fl-quote__cell-qty';
                qty.innerHTML = '<span class="fl-quote__mobile-label">Quantity:</span> ' + escapeHtml(String(item.qty));

                const price = document.createElement('p');
                price.className = 'fl-quote__cell-price';
                price.innerHTML = '<span class="fl-quote__mobile-label">Price:</span> ' + escapeHtml(item.priceLabel);

                row.appendChild(btn);
                row.appendChild(desc);
                row.appendChild(qty);
                row.appendChild(price);
                list.appendChild(row);
            });

            if (quote.totalLabel) {
                const total = document.createElement('div');
                total.className = 'fl-quote__total';
                total.innerHTML =
                    '<span class="fl-quote__total-label">' + escapeHtml(quote.totalHeading || 'Room total') + '</span>' +
                    '<span class="fl-quote__total-price">' + escapeHtml(quote.totalLabel) + '</span>';
                list.appendChild(total);
            }

            section.appendChild(list);
        }

        const footnotes = [];
        if (quote.priceNoteHtml || quote.priceNote) {
            footnotes.push(quote.priceNoteHtml || escapeHtml(quote.priceNote));
        }
        if (quote.dimsNoteHtml || quote.dimsNote) {
            footnotes.push(quote.dimsNoteHtml || escapeHtml(quote.dimsNote));
        }
        if (footnotes.length) {
            const notes = document.createElement('div');
            notes.className = 'fl-quote__footnotes';
            footnotes.forEach((html) => {
                const note = document.createElement('p');
                note.className = 'fl-quote__price-note';
                note.innerHTML = html;
                notes.appendChild(note);
            });
            section.appendChild(notes);
        }

        quoteRoot.appendChild(section);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ─── Build page ─── */

    async function build() {
        allImages = [];

        if (!config.hideRoomNav && config.rooms.length) {
            buildStickyNav(config.rooms);
        }

        if (roomsRoot) {
            roomsRoot.innerHTML = '';
        }

        let indexOffset = 0;

        for (const room of config.rooms) {
            if (!roomsRoot) break;
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
            chevron.innerHTML =
                '<svg viewBox="0 0 24 24" width="22" height="22" focusable="false">' +
                '<path fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>' +
                '</svg>';

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

        buildQuoteSection();
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
