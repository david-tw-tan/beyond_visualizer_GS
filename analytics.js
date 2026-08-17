(function () {
    'use strict';

    // Requires a static Umami tag in HTML, e.g.:
    // <script defer src="https://cloud.umami.is/script.js" data-website-id="..."></script>
    // Umami will not initialize if script.js is injected dynamically (no document.currentScript).

    if (new URLSearchParams(window.location.search).has('noanalytics')) {
        try {
            localStorage.setItem('bs_analytics_off', '1');
        } catch (e) {}
    }

    try {
        if (localStorage.getItem('bs_analytics_off') === '1') {
            return;
        }
    } catch (e) {}

    var CTA_RULES = [
        { selector: '[data-open-contact]', event: 'contact_cta' },
        { selector: '[data-hero-collections]', event: 'hero_collections' },
        { selector: '[data-open-showroom]', event: 'showroom_cta' },
        { selector: '[data-open-partners]', event: 'partners_cta' },
        { selector: '[data-doc-video-play]', event: 'video_play' },
        { selector: 'a[href="https://www.youtube.com/@beyondshowrooms"]', event: 'docuseries_link' },
        { selector: '[data-contact="whatsapp"]', event: 'contact_whatsapp' },
        { selector: '[data-contact="email"]', event: 'contact_email' },
        { selector: '[data-showroom-book]', event: 'contact_cta' }
    ];

    var pendingEvents = [];
    var youtubeReferralSent = false;

    function pagePath() {
        return window.location.pathname || '/';
    }

    function youtubeEpisodeFromUrl() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('utm_source') === 'youtube') {
            var campaign = params.get('utm_campaign');
            if (/^ep[123]$/.test(campaign)) {
                return campaign;
            }
        }

        try {
            var stored = sessionStorage.getItem('bs_youtube_episode');
            if (/^ep[123]$/.test(stored)) {
                return stored;
            }
        } catch (e) {}

        return null;
    }

    function withYoutubeEpisode(data) {
        var episode = youtubeEpisodeFromUrl();
        if (episode) {
            data.youtube_episode = episode;
        }
        return data;
    }

    function whenUmamiReady(fn) {
        if (window.umami && typeof window.umami.track === 'function') {
            fn();
            return;
        }

        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            if (window.umami && typeof window.umami.track === 'function') {
                clearInterval(timer);
                fn();
            } else if (attempts >= 100) {
                clearInterval(timer);
            }
        }, 100);
    }

    function sendToUmami(name, data) {
        var payload = data && Object.keys(data).length ? data : undefined;

        // Callback form is the reliable way to attach event data.
        // umami.track(name, data) recorded the name but left Properties empty.
        window.umami.track(function (props) {
            var next = {};
            for (var key in props) {
                if (Object.prototype.hasOwnProperty.call(props, key)) {
                    next[key] = props[key];
                }
            }
            next.name = name;
            if (payload) {
                next.data = payload;
            }
            return next;
        });
    }

    function flushPendingEvents() {
        if (!window.umami || typeof window.umami.track !== 'function') {
            return;
        }

        while (pendingEvents.length) {
            var item = pendingEvents.shift();
            sendToUmami(item.name, item.data);
        }
    }

    function trackEvent(name, data) {
        if (window.umami && typeof window.umami.track === 'function') {
            sendToUmami(name, data);
            return;
        }

        pendingEvents.push({ name: name, data: data || {} });
    }

    function initYoutubeReferralTracking() {
        if (youtubeReferralSent) {
            return;
        }

        var params = new URLSearchParams(window.location.search);
        var episode = youtubeEpisodeFromUrl();
        if (!episode) {
            return;
        }

        youtubeReferralSent = true;
        trackEvent('youtube_' + episode, {
            redirect: '/' + episode,
            medium: params.get('utm_medium') || '',
            page: pagePath()
        });
        flushPendingEvents();
    }

    function ctaLocation(el) {
        var section = el.closest('section');
        if (section) {
            if (section.id) {
                return section.id;
            }
            var labelledBy = section.getAttribute('aria-labelledby');
            if (labelledBy) {
                return labelledBy;
            }
            var heading = section.querySelector('h1, h2, h3');
            if (heading && heading.textContent) {
                return heading.textContent.trim().slice(0, 48);
            }
        }
        return pagePath();
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function isScrollable(root) {
        var height = root ? root.scrollHeight : document.documentElement.scrollHeight;
        var viewport = root ? root.clientHeight : window.innerHeight;
        return height > viewport + 24;
    }

    function observeSectionOnce(sentinel, eventName) {
        if (!sentinel || typeof IntersectionObserver === 'undefined') {
            return;
        }

        var fired = false;
        var observer = new IntersectionObserver(function (entries) {
            if (fired) {
                return;
            }

            for (var i = 0; i < entries.length; i += 1) {
                if (entries[i].isIntersecting) {
                    fired = true;
                    trackEvent(eventName);
                    observer.disconnect();
                    return;
                }
            }
        }, {
            threshold: 0.4
        });

        observer.observe(sentinel);
    }

    function observeScrollBottom(options) {
        var root = options.root || null;
        var sentinel = options.sentinel;
        var eventName = options.eventName;
        var eventData = options.eventData || {};

        if (!sentinel || typeof IntersectionObserver === 'undefined') {
            return null;
        }

        if (!isScrollable(root)) {
            return null;
        }

        var fired = false;
        var hasScrolled = false;
        var scrollTarget = root || window;

        function markScrolled() {
            hasScrolled = true;
        }

        scrollTarget.addEventListener('scroll', markScrolled, { passive: true });

        var observer = new IntersectionObserver(function (entries) {
            if (fired) {
                return;
            }

            for (var i = 0; i < entries.length; i += 1) {
                if (entries[i].isIntersecting && hasScrolled) {
                    fired = true;
                    trackEvent(eventName, eventData);
                    observer.disconnect();
                    scrollTarget.removeEventListener('scroll', markScrolled);
                    return;
                }
            }
        }, {
            root: root,
            threshold: 0.75
        });

        observer.observe(sentinel);
        return observer;
    }

    function watchModalScrollBottom(modalId, scrollRootSelector, sentinelSelector, modalName) {
        var modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        var activeObserver = null;

        function teardown() {
            if (activeObserver) {
                activeObserver.disconnect();
                activeObserver = null;
            }
        }

        function attach() {
            teardown();

            var root = modal.querySelector(scrollRootSelector);
            var sentinel = modal.querySelector(sentinelSelector);
            if (!root || !sentinel) {
                return;
            }

            activeObserver = observeScrollBottom({
                root: root,
                sentinel: sentinel,
                eventName: modalName === 'showroom' ? 'scroll_showroom_modal' : 'scroll_partners_modal'
            });
        }

        function attachWhenReady(getRoot) {
            var root = getRoot();
            if (root && root.children.length > 0) {
                attach();
                return;
            }

            if (!root) {
                return;
            }

            var listObserver = new MutationObserver(function () {
                if (root.children.length > 0) {
                    listObserver.disconnect();
                    attach();
                }
            });
            listObserver.observe(root, { childList: true });
        }

        var modalObserver = new MutationObserver(function () {
            if (modal.hidden) {
                teardown();
                return;
            }

            if (modalId === 'partnersModal') {
                attachWhenReady(function () {
                    return document.getElementById('partnersList');
                });
            } else {
                requestAnimationFrame(attach);
            }
        });

        modalObserver.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
    }

    function initSuccessStoriesCarouselTracking() {
        var carousel = document.querySelector('[data-case-carousel]');
        if (!carousel) {
            return;
        }

        var slides = carousel.querySelectorAll('[data-case-slide]');
        var totalSlides = slides.length;
        if (totalSlides === 0) {
            return;
        }

        var trackingEnabled = false;
        var viewed = Object.create(null);
        var viewedCount = 0;
        var summarySent = false;

        function recordSlide(index) {
            if (!trackingEnabled || viewed[index]) {
                return;
            }

            viewed[index] = true;
            viewedCount += 1;
        }

        function sendSummary() {
            if (!trackingEnabled || summarySent || viewedCount === 0) {
                return;
            }

            summarySent = true;
            trackEvent('success_stories_depth', {
                slides_viewed: viewedCount,
                total_slides: totalSlides,
                page: pagePath()
            });
        }

        function enableTracking() {
            if (trackingEnabled) {
                return;
            }

            trackingEnabled = true;

            for (var i = 0; i < slides.length; i += 1) {
                if (slides[i].getAttribute('aria-hidden') !== 'true') {
                    recordSlide(i);
                }
            }
        }

        var sectionHeading = document.getElementById('homes-title');
        if (sectionHeading && typeof IntersectionObserver !== 'undefined') {
            var sectionObserver = new IntersectionObserver(function (entries) {
                for (var i = 0; i < entries.length; i += 1) {
                    if (entries[i].isIntersecting) {
                        enableTracking();
                        sectionObserver.disconnect();
                        return;
                    }
                }
            }, { threshold: 0.35 });
            sectionObserver.observe(sectionHeading);
        }

        for (var s = 0; s < slides.length; s += 1) {
            (function (index) {
                var slideObserver = new MutationObserver(function () {
                    if (slides[index].getAttribute('aria-hidden') === 'false') {
                        recordSlide(index);
                    }
                });
                slideObserver.observe(slides[index], {
                    attributes: true,
                    attributeFilter: ['aria-hidden']
                });
            }(s));
        }

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                sendSummary();
            }
        });
        window.addEventListener('pagehide', sendSummary);
    }

    whenUmamiReady(function () {
        flushPendingEvents();
        initYoutubeReferralTracking();
    });

    onReady(function () {
        whenUmamiReady(function () {
            flushPendingEvents();
            initYoutubeReferralTracking();
        });

        observeSectionOnce(document.getElementById('collections-title'), 'scroll_collections');
        observeSectionOnce(document.getElementById('trust-title'), 'scroll_factories');
        observeSectionOnce(document.getElementById('homes-title'), 'scroll_success_stories');
        observeSectionOnce(document.querySelector('.founder-credit'), 'scroll_bottom');

        watchModalScrollBottom('showroomModal', '.lp-showroom-scroll', '.lp-showroom-cta', 'showroom');
        watchModalScrollBottom('partnersModal', '.lp-partners-list', '.lp-partner-card:last-child', 'partners');

        initSuccessStoriesCarouselTracking();
    });

    document.addEventListener('click', function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function') {
            return;
        }

        for (var i = 0; i < CTA_RULES.length; i += 1) {
            var rule = CTA_RULES[i];
            var el = target.closest(rule.selector);
            if (!el) {
                continue;
            }

            trackEvent(rule.event, withYoutubeEpisode({
                location: ctaLocation(el),
                page: pagePath()
            }));
            flushPendingEvents();
            return;
        }
    });
})();
