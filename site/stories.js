// TOE Stories — dynamic renderer (public read-only).
// Uses Firebase Firestore when window.TOE_USE_FIREBASE is true,
// otherwise falls back to local seed-stories.json so the site works before setup.

(function () {
  const gridId = 'postsGrid';
  const MORE_STEP = 6;
  let allStories = [];
  let shown = 0;
  let expandedIds = new Set();

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function para(text, style) {
    if (!text) return '';
    return `<p${style ? ` style="${style}"` : ''}>${escapeHTML(text)}</p>`;
  }

  // Allowlist: <br>, <em>, <strong> for body text admins paste from docs.
  function richPara(text, style) {
    if (!text) return '';
    let safe = escapeHTML(text);
    safe = safe
      .replace(/&lt;br\s*\/?&gt;/g, '<br>')
      .replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>')
      .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
    return `<p${style ? ` style="${style}"` : ''}>${safe}</p>`;
  }

  function storyCard(s, idx) {
    const id = `dyn-${String(s.id || idx).replace(/[^a-zA-Z0-9-_]/g, '')}`;
    const moreId = `${id}-more`;
    const isOpen = expandedIds.has(moreId);
    const tag = s.tag ? `<span class="post-tag">${escapeHTML(s.tag)}</span>` : '';
    const imgH = s.imageHeight || (idx === 0 ? 280 : 320);
    const img = s.imageUrl
      ? `<img src="${escapeHTML(s.imageUrl)}" alt="${escapeHTML(s.imageAlt || s.title || 'TOE story')}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;object-position:top;position:relative;z-index:0;" onerror="this.style.display='none'">`
      : '';
    const excerpt = (s.excerpt || []).map((p, i) =>
      richPara(p, `margin-bottom:12px;${i > 0 ? '' : ''}`)
    ).join('');
    const bodyParas = (s.body || []).map(p => richPara(p, 'margin-bottom:12px;')).join('');
    const highlight = s.highlight
      ? `<p style="color:var(--gold);font-weight:600;font-size:14px;margin-bottom:8px;">${escapeHTML(s.highlight)}</p>`
      : '';
    const signoff = s.signoff
      ? `<p style="margin-top:8px;font-size:13px;color:var(--gray);font-style:italic;">${escapeHTML(s.signoff)}</p>`
      : '';
    const credits = (s.credits || s.hashtags)
      ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.10);">`
        + (s.credits ? `<p style="font-size:12px;color:var(--gray);line-height:1.6;"><strong style="color:var(--gray-light);">Credits:</strong><br>${escapeHTML(s.credits).replace(/\n/g, '<br>')}</p>` : '')
        + (s.hashtags ? `<p style="font-size:11px;color:rgba(255,255,255,0.40);margin-top:10px;letter-spacing:0.5px;">${escapeHTML(s.hashtags)}</p>` : '')
        + `</div>`
      : '';

    const hasMore = bodyParas || highlight || credits;
    const collapsible = hasMore
      ? `<div class="post-collapsible${isOpen ? ' expanded' : ''}" id="${moreId}">${bodyParas}${highlight}${credits}</div>
         <a href="javascript:void(0)" class="read-more" data-toggle="${moreId}">${isOpen ? 'Show Less' : 'Read Full Story'}</a>`
      : `${highlight}${credits}`;

    return `
      <div class="post-card reveal" style="grid-column:1/-1;">
        <div class="post-image" style="height:${imgH}px;">${tag}${img}</div>
        <div class="post-content">
          ${s.date ? `<div class="post-date">${escapeHTML(s.date)}</div>` : ''}
          ${s.title ? `<h3>${escapeHTML(s.title)}</h3>` : ''}
          ${excerpt}${collapsible}
        </div>
      </div>`;
  }

  function observeNewCards(root) {
    const cards = root.querySelectorAll('.post-card.reveal:not(.visible)');
    cards.forEach((el, i) => {
      el.style.willChange = 'opacity, transform';
      el.style.transitionDelay = Math.min(i * 0.06, 0.3) + 's';
      if (window.__toeReveal) window.__toeReveal(el);
      else {
        // fallback if main observer not ready
        new IntersectionObserver((es, obs) => {
          es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.12 }).observe(el);
      }
      if (window.__toeTiltCard) window.__toeTiltCard(el);
    });
  }

  function renderMore() {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const next = allStories.slice(shown, shown + MORE_STEP);
    if (!next.length) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = next.map((s, i) => storyCard(s, shown + i)).join('');
    while (tmp.firstChild) grid.appendChild(tmp.firstChild);
    shown += next.length;
    observeNewCards(grid);
    updateLoadMore();
  }

  function updateLoadMore() {
    let btn = document.getElementById('storiesMoreBtn');
    if (shown >= allStories.length) { if (btn) btn.style.display = 'none'; return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'storiesMoreBtn';
      btn.className = 'btn-secondary';
      btn.style.marginTop = '36px';
      btn.textContent = 'Load more stories';
      btn.addEventListener('click', renderMore);
      const sec = document.querySelector('.posts-section');
      if (sec) sec.appendChild(btn);
    }
    btn.style.display = '';
    btn.textContent = `Load more stories (${allStories.length - shown} left)`;
  }

  function showState(html) {
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = html;
  }

  // Diagnostic status for debugging (see ?debug=stories or window.__toeStoriesStatus).
  // The site silently falls back to seed data when Firestore reads fail —
  // this records WHY so a blocked API key / missing index / denied rule is visible.
  window.__toeStoriesStatus = { phase: 'init', error: null, source: null };

  function reportError(stage, err) {
    const code = err && (err.code || err.name) || 'unknown';
    const msg = err && (err.message || String(err)) || 'unknown error';
    window.__toeStoriesStatus = { phase: stage, error: code + ': ' + msg, source: null };
    if (window.console && console.error) {
      console.error('[TOE stories][' + stage + '][' + code + '] ' + msg);
      if (/referer|blocked|403|API key/i.test(msg)) {
        console.error('[TOE stories] FIX: add this domain to Google Cloud API-key HTTP referrers + Firebase Auth authorized domains.');
      } else if (/failed-precondition|index/i.test(msg)) {
        console.error('[TOE stories] FIX: Firestore needs a composite index for where(status)+orderBy(publishedAt) — open the index link in this error, Create it, wait 2 min.');
      } else if (/permission|denied|unauthorized/i.test(msg)) {
        console.error('[TOE stories] FIX: publish firestore.rules with your ADMIN_UID in the Firebase console.');
      }
    }
  }

  function snapToStories(snap) {
    const out = [];
    snap.forEach(d => {
      const v = d.data();
      out.push({
        id: d.id,
        tag: v.tag || '',
        date: v.date || '',
        title: v.title || '',
        excerpt: Array.isArray(v.excerpt) ? v.excerpt : (v.excerpt ? [v.excerpt] : []),
        body: Array.isArray(v.body) ? v.body : (v.body ? [v.body] : []),
        highlight: v.highlight || '',
        signoff: v.signoff || '',
        credits: v.credits || '',
        hashtags: v.hashtags || '',
        imageUrl: v.imageUrl || '',
        imageAlt: v.imageAlt || v.title || '',
        imageHeight: v.imageHeight || 320,
        status: v.status || 'published'
      });
    });
    return out;
  }

  async function loadFromFirebase() {
    const cfg = window.TOE_FIREBASE_CONFIG;
    if (!window.TOE_USE_FIREBASE || !cfg || String(cfg.apiKey || '').startsWith('PASTE')) return null;
    if (!window.firebase || !firebase.firestore) return null;
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.firestore();
    try {
      const snap = await db.collection('stories')
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')
        .limit(50)
        .get();
      const out = snapToStories(snap);
      window.__toeStoriesStatus = { phase: 'firebase', error: null, source: 'firestore' };
      try { localStorage.setItem('toe-stories-cache', JSON.stringify({ t: Date.now(), stories: out })); } catch (e) {}
      return out;
    } catch (err) {
      reportError('firebase-query', err);
      // Self-heal: composite index for where()+orderBy() often missing on fresh
      // projects — retry index-free and filter published client-side.
      try {
        const snap = await db.collection('stories')
          .orderBy('publishedAt', 'desc')
          .limit(50)
          .get();
        const out = snapToStories(snap).filter(s => s.status === 'published');
        window.__toeStoriesStatus = { phase: 'firebase-fallback-query', error: null, source: 'firestore' };
        try { localStorage.setItem('toe-stories-cache', JSON.stringify({ t: Date.now(), stories: out })); } catch (e) {}
        return out;
      } catch (err2) {
        reportError('firebase-fallback-query', err2);
        return null;
      }
    }
  }

  async function loadFromSeed() {
    // 1) try cache (keeps section alive offline)
    try {
      const c = JSON.parse(localStorage.getItem('toe-stories-cache') || 'null');
      if (c && Array.isArray(c.stories) && c.stories.length) return c.stories;
    } catch (e) {}
    // 2) local seed file (works on http/https; file:// falls back to DOM below)
    try {
      const r = await fetch('seed-stories.json', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j.length) return j;
      }
    } catch (e) {}
    return null;
  }

  function readHardcodedFallback() {
    // file:// or no seed file: scrape the server-rendered cards already in the DOM.
    const grid = document.getElementById(gridId);
    if (!grid) return [];
    const cards = Array.from(grid.querySelectorAll('.post-card'));
    if (!cards.length) return [];
    return cards.map((card, i) => ({
      _html: card.outerHTML,
      id: 'hardcoded-' + i
    }));
  }

  async function init() {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // Toggle delegation (works for seed + dynamic cards, keeps old onclick working too)
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-toggle]');
      if (!t) return;
      e.preventDefault();
      const content = document.getElementById(t.getAttribute('data-toggle'));
      if (!content) return;
      const open = content.classList.toggle('expanded');
      expandedIds[open ? 'add' : 'delete'](content.id);
      t.textContent = open ? 'Show Less' : 'Read Full Story';
    });
    // Back-compat for old inline onclick="togglePost(...)"
    window.togglePost = function (id, el) {
      const content = document.getElementById(id);
      if (!content) return;
      const open = content.classList.toggle('expanded');
      if (el) el.textContent = open ? 'Show Less' : 'Read Full Story';
    };

    showState(`<div style="grid-column:1/-1;color:var(--d-text3);padding:40px 0;">Loading stories…</div>`);

    let stories = null;
    let storesrc = null;
    try {
      stories = await loadFromFirebase();
      if (stories && stories.length) storesrc = window.__toeStoriesStatus.source;
    } catch (e) { reportError('firebase-top', e); stories = null; }
    if (!stories || !stories.length) {
      const seed = await loadFromSeed();
      if (seed && seed.length) { stories = seed; storesrc = 'seed/cache'; }
    }
    // Debug mode (?debug=stories): reveal the exact Firestore failure instead of
    // silently showing seed data — send us the red line to fix console-side blocks.
    const debugMode = /[?&]debug=stories/.test(window.location.search || '');
    let debugBanner = '';
    if (debugMode && window.__toeStoriesStatus.error) {
      debugBanner = `<div style="grid-column:1/-1;color:#ffb3b3;background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.4);border-radius:14px;padding:18px 20px;font-size:13px;line-height:1.7;">Firestore read failed, showing fallback data.<br><code>${escapeHTML(window.__toeStoriesStatus.error)}</code><br>Fix: allowlist this domain on the API key + Auth authorized domains, or create the composite index from the Console error link.</div>`;
    }
    if (!stories || !stories.length) {
      // Keep the hardcoded HTML already on the page (no blank section).
      const hard = readHardcodedFallback();
      if (hard.length && hard[0]._html) {
        showState(debugBanner + hard.map(h => h._html).join(''));
        observeNewCards(grid);
        return;
      }
      showState(`<div style="grid-column:1/-1;color:var(--d-text3);padding:40px 0;">No stories yet — check back soon.</div>`);
      return;
    }

    allStories = stories;
    shown = 0;
    showState(debugBanner);
    renderMore();
    if (debugBanner) {
      window.__toeStoriesStatus.source = storesrc;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
