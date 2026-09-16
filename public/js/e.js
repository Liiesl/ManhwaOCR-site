/*
 * e.js — first-party page check-in for easyscanlate.site.
 * Self-hosted and cookie-free. Sends JSON to POST /event on the same
 * first-party host (e.easyscanlate.site). No third parties involved.
 *
 * Two signals per page:
 *   1. Raw load  — fired immediately for every load (bots included),
 *      so raw visit volume stays visible server-side.
 *   2. Engaged   — fired once the visitor shows human-like interaction
 *      (same scoring as before), so human visits stay separable.
 */
(function () {
    'use strict';

    var ENDPOINT = 'https://e.easyscanlate.site/event';
    var REQUIRED_SCORE = 20;
    var SID_KEY = 'es_sid';

    function sid() {
        try {
            var s = sessionStorage.getItem(SID_KEY);
            if (!s) {
                s = Math.random().toString(36).slice(2) + Date.now().toString(36);
                sessionStorage.setItem(SID_KEY, s);
            }
            return s;
        } catch (e) {
            return Math.random().toString(36).slice(2);
        }
    }

    var ID = sid();

    function utms() {
        var out = {};
        try {
            var q = new URLSearchParams(location.search);
            ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
                var v = q.get(k);
                if (v) out[k] = v.slice(0, 64);
            });
        } catch (e) { /* ignore */ }
        return out;
    }

    var UTM = utms();

    function guessOS() {
        var ua = navigator.userAgent || '';
        if (/Windows/i.test(ua)) return 'windows';
        if (/Android/i.test(ua)) return 'android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
        if (/Mac OS/i.test(ua)) return 'macos';
        if (/Linux/i.test(ua)) return 'linux';
        return 'other';
    }

    function tz() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (e) {
            return '';
        }
    }

    function base(event, extra) {
        var payload = {
            event: event,
            path: (location.pathname || '/').slice(0, 256),
            ref: (document.referrer || '').slice(0, 512),
            sid: ID,
            lang: (navigator.language || '').slice(0, 16),
            tz: tz().slice(0, 64),
            os: guessOS(),
            sw: window.innerWidth || 0,
            sh: window.innerHeight || 0,
            utm: UTM
        };
        if (extra) {
            for (var k in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
            }
        }
        return payload;
    }

    function send(payload) {
        try {
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(function () { /* silent */ });
        } catch (e) { /* silent */ }
    }

    function track(event, data) {
        send(base(event, { d: data || {} }));
    }

    // 1. Raw load signal — one per page load, no gating.
    var engagedKey = 'es_e_' + location.pathname;
    var alreadyEngaged = false;
    try { alreadyEngaged = !!sessionStorage.getItem(engagedKey); } catch (e) { /* ignore */ }

    send(base('view', { engaged: 0, score: 0 }));

    // 2. Engagement-gated human signal.
    var score = 0;
    function pass(points) {
        if (alreadyEngaged) return;
        score += points;
        if (score >= REQUIRED_SCORE) {
            alreadyEngaged = true;
            try { sessionStorage.setItem(engagedKey, '1'); } catch (e) { /* ignore */ }
            send(base('view', { engaged: 1, score: score }));
        }
    }

    if (!alreadyEngaged) {
        window.addEventListener('mousemove', function () { pass(1); }, { passive: true });
        window.addEventListener('scroll', function () { pass(5); }, { passive: true });
        window.addEventListener('click', function () { pass(20); }, { passive: true });
        window.addEventListener('touchstart', function () { pass(20); }, { passive: true });
        window.addEventListener('keydown', function () { pass(20); }, { passive: true });
        var t = setInterval(function () {
            if (alreadyEngaged) { clearInterval(t); return; }
            pass(2);
        }, 1000);
    }

    // 3. Download intent — fire-and-forget, never blocks navigation.
    function hookDownloads() {
        var btns = document.querySelectorAll('.js-download-trigger');
        Array.prototype.forEach.call(btns, function (btn) {
            if (btn.getAttribute('data-es-hooked')) return;
            btn.setAttribute('data-es-hooked', '1');
            btn.addEventListener('click', function () {
                var href = btn.getAttribute('href') || '';
                track('download_click', { target: href.slice(0, 512), os: guessOS() });
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookDownloads);
    } else {
        hookDownloads();
    }
    // nav-component.js injects buttons around DOMContentLoaded — re-hook after it.
    setTimeout(hookDownloads, 1500);

    window.__es = { track: track };
})();
