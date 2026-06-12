/**
 * Beyond Showrooms — Landing Page
 * Update contact URLs before going live.
 */
const LANDING_CONFIG = {
    discoveryCallUrl: '#book-call',
    whatsAppUrl: 'https://wa.me/',
    emailUrl: 'mailto:hello@beyondshowrooms.com',
    /** YouTube playlist or channel — update when the series is published */
    youtubeSeriesUrl: '#youtube-series'
};

const PERSONA_PARAM = 'persona';
const VALID_PERSONAS = ['confidence', 'designer'];

const copySnapshot = new Map();
let activePersona = 'confidence';

function getPersonaFromUrl() {
    const value = new URLSearchParams(window.location.search).get(PERSONA_PARAM);
    return VALID_PERSONAS.includes(value) ? value : null;
}

function snapshotCopyDefaults() {
    document.querySelectorAll('[data-copy], [data-copy-html]').forEach((el) => {
        const key = el.dataset.copy || el.dataset.copyHtml;
        if (!key) return;
        copySnapshot.set(key, el.innerHTML);
    });

    const metaDesc = document.querySelector('meta[name="description"][data-copy]');
    if (metaDesc) {
        copySnapshot.set('meta.description', metaDesc.getAttribute('content') || '');
    }

    const titleEl = document.querySelector('title[data-copy]');
    if (titleEl) {
        copySnapshot.set('meta.title', titleEl.textContent || '');
    }
}

function applyCopyValue(el, key, value) {
    if (value === undefined || value === null) return;

    if (value === '') {
        el.hidden = true;
        return;
    }

    el.hidden = false;

    if (el.dataset.copyHtml) {
        el.innerHTML = value;
        return;
    }

    if (el.tagName === 'META') {
        el.setAttribute('content', value);
        return;
    }

    if (el.tagName === 'TITLE') {
        el.textContent = value;
        document.title = value;
        return;
    }

    el.textContent = value;
}

function applyDesignerOverrides() {
    const copy = typeof LANDING_COPY_DESIGNER !== 'undefined' ? LANDING_COPY_DESIGNER : {};

    document.querySelectorAll('[data-copy], [data-copy-html]').forEach((el) => {
        const key = el.dataset.copy || el.dataset.copyHtml;
        if (!key || !(key in copy)) return;
        applyCopyValue(el, key, copy[key]);
    });

    if (copy['meta.description']) {
        const metaDesc = document.querySelector('meta[name="description"][data-copy]');
        if (metaDesc) metaDesc.setAttribute('content', copy['meta.description']);
    }

    if (copy['meta.title']) {
        document.title = copy['meta.title'];
        const titleEl = document.querySelector('title[data-copy]');
        if (titleEl) titleEl.textContent = copy['meta.title'];
    }
}

function restoreConfidenceCopy() {
    document.querySelectorAll('[data-copy], [data-copy-html]').forEach((el) => {
        const key = el.dataset.copy || el.dataset.copyHtml;
        if (!key || !copySnapshot.has(key)) return;

        const value = copySnapshot.get(key);
        el.hidden = false;
        if (el.dataset.copyHtml) {
            el.innerHTML = value;
        } else if (el.tagName === 'META') {
            el.setAttribute('content', value);
        } else if (el.tagName === 'TITLE') {
            el.textContent = value;
            document.title = value;
        } else {
            el.textContent = value;
        }
    });
}

function syncPersonaVisibility() {
    document.querySelectorAll('[data-persona-show]').forEach((el) => {
        el.hidden = el.dataset.personaShow !== activePersona;
    });

    document.body.dataset.persona = activePersona;
}

function updatePersonaUrl(persona) {
    const url = new URL(window.location.href);
    if (persona === 'designer') {
        url.searchParams.set(PERSONA_PARAM, persona);
    } else {
        url.searchParams.delete(PERSONA_PARAM);
    }
    window.history.replaceState(null, '', url);
}

function applyPersona(persona, { scrollToHero = false } = {}) {
    if (!VALID_PERSONAS.includes(persona)) return;

    activePersona = persona;

    if (persona === 'designer') {
        applyDesignerOverrides();
    } else {
        restoreConfidenceCopy();
    }

    syncPersonaVisibility();
    updatePersonaUrl(persona);

    if (scrollToHero) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function initPersonaReset() {
    document.querySelector('[data-reset-persona]')?.addEventListener('click', resetPersona);
}

/** Footer — return to default V1 copy and strip campaign persona from URL */
function resetPersona() {
    applyPersona('confidence', { scrollToHero: true });
}

function initPersona() {
    snapshotCopyDefaults();

    const urlPersona = getPersonaFromUrl();

    if (urlPersona === 'designer') {
        applyPersona('designer');
    } else {
        activePersona = 'confidence';
        syncPersonaVisibility();

        if (urlPersona === 'confidence') {
            updatePersonaUrl('confidence');
        }
    }

    initPersonaReset();
}

/** Hand-picked collection heroes — captions in landing_image_captions.js */
const SHOWROOM_SECTIONS = [
    {
        title: 'Living room',
        items: [1, 2, 3, 4, 5].map((n) =>
            buildShowroomItem(`html_images/collection_living_${n}.jpg`)
        )
    },
    {
        title: 'Bedroom',
        items: [1, 2, 4, 5].map((n) =>
            buildShowroomItem(`html_images/collection_bed_${n}.jpg`)
        )
    },
    {
        title: 'Dining room',
        items: [1, 2, 3].map((n) =>
            buildShowroomItem(`html_images/collection_dining_${n}.jpg`)
        )
    },
    {
        title: 'Accessories',
        subtitle: 'Statement pieces to complete your room.',
        layout: 'collage',
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) =>
            buildShowroomItem(`html_images/accessory_${n}.jpg`)
        )
    }
];

/** Image paths only — caption/alt from landing_image_captions.js */
const SPOTLIGHT_ITEMS = {
    bedroom: { full: 'html_images/img_bedroom_full.jpg' },
    dining: { full: 'html_images/img_dining_full.jpg' },
    accent: { full: 'html_images/style_img.jpg' },
    living: { full: 'html_images/img_living.jpg' }
};

const header = document.querySelector('.lp-header');
const revealEls = document.querySelectorAll('.lp-reveal, .lp-reveal-group');
const hero = document.querySelector('.lp-hero');
const contactModal = document.getElementById('contactModal');
const spotlightModal = document.getElementById('spotlightModal');
const spotlightImage = document.getElementById('spotlightImage');
const spotlightCaption = document.getElementById('spotlightCaption');
const showroomModal = document.getElementById('showroomModal');
const showroomGallery = document.getElementById('showroomGallery');
const showroomScroll = document.getElementById('showroomScroll');
const openContactBtns = document.querySelectorAll('[data-open-contact]');
const closeContactEls = document.querySelectorAll('[data-close-contact]');
const spotlightTriggers = document.querySelectorAll('[data-spotlight]');
const closeSpotlightEls = document.querySelectorAll('[data-close-spotlight]');
const openShowroomEls = document.querySelectorAll('[data-open-showroom]');
const closeShowroomEls = document.querySelectorAll('[data-close-showroom]');
const partnersModal = document.getElementById('partnersModal');
const partnersList = document.getElementById('partnersList');
const openPartnersEls = document.querySelectorAll('[data-open-partners]');
const closePartnersEls = document.querySelectorAll('[data-close-partners]');

let showroomIsOpen = false;
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

    const documentary = document.getElementById('documentaryLink');
    if (documentary) documentary.setAttribute('href', LANDING_CONFIG.youtubeSeriesUrl);
}

function updateHeader() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 48);
}

function syncModalBodyLock() {
    const anyOpen =
        (contactModal && !contactModal.hidden) ||
        (spotlightModal && !spotlightModal.hidden) ||
        (showroomModal && !showroomModal.hidden) ||
        (partnersModal && !partnersModal.hidden);

    document.body.classList.toggle('lp-modal-open', Boolean(anyOpen));
}

function openContactModal() {
    if (!contactModal) return;
    contactModal.hidden = false;
    syncModalBodyLock();
}

function closeContactModal() {
    if (!contactModal) return;
    contactModal.hidden = true;
    syncModalBodyLock();
}

function openSpotlightModal(key) {
    const item = SPOTLIGHT_ITEMS[key];
    if (!spotlightModal || !spotlightImage || !spotlightCaption || !item) return;

    const meta = getLandingImageMeta(item.full);

    spotlightImage.src = item.full;
    spotlightImage.alt = meta.alt || 'Showroom collection';
    spotlightCaption.textContent = meta.caption;
    spotlightModal.hidden = false;
    syncModalBodyLock();
    spotlightModal.querySelector('.lp-modal__close')?.focus();
}

function closeSpotlightModal() {
    if (!spotlightModal || spotlightModal.hidden) return;

    spotlightModal.hidden = true;
    syncModalBodyLock();
}

function initSpotlightModal() {
    spotlightTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            openSpotlightModal(trigger.dataset.spotlight);
        });
    });

    closeSpotlightEls.forEach((el) => {
        el.addEventListener('click', closeSpotlightModal);
    });

    spotlightModal?.querySelector('[data-spotlight-explore]')?.addEventListener('click', async () => {
        closeSpotlightModal();
        await openShowroomModal();
    });
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
    footerText.textContent = '25+ premium factories in our network';

    footer.appendChild(watermark);
    footer.appendChild(footerText);
    partnersList.appendChild(footer);
}

function openPartnersModal() {
    if (!partnersModal) return;

    renderPartnersList();
    partnersModal.hidden = false;
    syncModalBodyLock();
    partnersModal.querySelector('.lp-modal__close')?.focus();
}

function closePartnersModal() {
    if (!partnersModal || partnersModal.hidden) return;

    partnersModal.hidden = true;
    syncModalBodyLock();
}

function initPartnersModal() {
    openPartnersEls.forEach((el) => {
        el.addEventListener('click', openPartnersModal);
    });

    closePartnersEls.forEach((el) => {
        el.addEventListener('click', closePartnersModal);
    });
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
    syncModalBodyLock();

    if (showroomScroll) showroomScroll.scrollTop = 0;

    try {
        await renderShowroomGallery(SHOWROOM_SECTIONS);
    } catch (error) {
        console.error('[showroom]', error);
        setShowroomLoading('Unable to load showroom collections. Please try again.');
    }
}

async function closeShowroomModal() {
    if (!showroomModal || showroomModal.hidden) return;

    showroomIsOpen = false;
    await hideShowroomModalShell();

    syncModalBodyLock();
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
}

function handleModalEscape(event) {
    if (event.key !== 'Escape') return;

    if (showroomModal && !showroomModal.hidden) {
        closeShowroomModal();
        return;
    }

    if (partnersModal && !partnersModal.hidden) {
        closePartnersModal();
        return;
    }

    if (spotlightModal && !spotlightModal.hidden) {
        closeSpotlightModal();
        return;
    }

    if (contactModal && !contactModal.hidden) {
        closeContactModal();
    }
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

    const mobileReveal = window.matchMedia('(max-width: 767px)');

    revealEls.forEach((el) => {
        if (mobileReveal.matches && el.closest('#approach')) {
            el.classList.add('is-visible');
            return;
        }
        observer.observe(el);
    });

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

function initCaseStudyCarousel() {
    const carousel = document.querySelector('[data-case-carousel]');
    if (!carousel) return;

    const track = carousel.querySelector('[data-case-track]');
    const slides = [...carousel.querySelectorAll('[data-case-slide]')];
    const captions = [...carousel.querySelectorAll('[data-case-caption]')];
    const prevBtn = carousel.querySelector('[data-case-prev]');
    const nextBtn = carousel.querySelector('[data-case-next]');
    const dotsContainer = carousel.querySelector('[data-case-dots]');
    const counter = carousel.querySelector('[data-case-counter]');
    const viewport = carousel.querySelector('.lp-case-carousel__viewport');

    if (!track || slides.length === 0) return;

    let index = 0;
    let touchStartX = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'lp-case-carousel__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Home ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer?.appendChild(dot);
    });

    const dots = [...dotsContainer?.querySelectorAll('.lp-case-carousel__dot') ?? []];

    function goTo(nextIndex) {
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

        if (counter) {
            counter.textContent = `${index + 1} of ${slides.length}`;
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
}

initPersona();
initCaseStudyCarousel();
applyContactLinks();
initContactModal();
initSpotlightModal();
initPartnersModal();
initShowroomModal();
document.addEventListener('keydown', handleModalEscape);
updateHeader();
initReveal();
initNavHighlight();

window.addEventListener('scroll', updateHeader, { passive: true });

window.addEventListener('resize', () => {
    clearTimeout(showroomResizeTimer);
    showroomResizeTimer = setTimeout(refreshShowroomLayoutIfColumnsChanged, 200);
});
