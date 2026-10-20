/*
 * Site behaviour: glass navbar, scroll reveals, video/photo lightbox,
 * story filters and reading-time estimates. No dependencies.
 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navbar ---------- */
  const nav = $('[data-nav]');
  if (nav) {
    const toggle = $('[data-nav-toggle]', nav);
    const onScroll = () => { nav.dataset.scrolled = String(window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const setOpen = (open) => {
      nav.dataset.open = String(open);
      toggle?.setAttribute('aria-expanded', String(open));
      toggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle?.addEventListener('click', () => setOpen(nav.dataset.open !== 'true'));
    $$('[data-nav-panel] a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.dataset.open === 'true') { setOpen(false); toggle?.focus(); } });
    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

    // Highlight the nav link of the section currently in view.
    const links = $$('a[data-section]', nav);
    const sections = links.map((a) => document.getElementById(a.dataset.section)).filter(Boolean);
    if (sections.length && 'IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.section === entry.target.id)));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => spy.observe(s));
    }
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- YouTube thumbnails: fall back when maxres is missing ---------- */
  // YouTube serves a 120px grey placeholder (not a 404) when maxresdefault does not exist.
  $$('img[src*="/maxresdefault.jpg"]').forEach((img) => {
    const check = () => { if (img.naturalWidth && img.naturalWidth <= 120) img.src = img.src.replace('maxresdefault', 'hqdefault'); };
    img.complete ? check() : img.addEventListener('load', check, { once: true });
  });

  /* ---------- Lightbox ---------- */
  const parseVideo = (value) => {
    const v = value.trim();
    let m;
    if ((m = v.match(/^youtube:([\w-]{6,})$/)) || (m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,})/))) {
      return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1` };
    }
    if ((m = v.match(/^vimeo:(\d+)$/)) || (m = v.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
      return { type: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1&title=0&byline=0` };
    }
    return { type: 'video', src: v.replace(/^(mp4|file):/, '') };
  };

  let box, stage, caption, prevBtn, nextBtn, lastFocus, group = [], index = 0;

  const buildLightbox = () => {
    box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Media viewer');
    box.innerHTML = `
      <div class="lightbox-backdrop" data-close></div>
      <div class="lightbox-dialog">
        <div data-stage class="flex w-full justify-center"></div>
        <p data-caption class="lightbox-caption"></p>
      </div>
      <button type="button" class="lightbox-btn right-3 top-3 sm:right-5 sm:top-5" data-close aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <button type="button" class="lightbox-btn left-2 top-1/2 -translate-y-1/2 sm:left-5" data-prev aria-label="Previous photo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button type="button" class="lightbox-btn right-2 top-1/2 -translate-y-1/2 sm:right-5" data-next aria-label="Next photo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>`;
    document.body.appendChild(box);
    stage = $('[data-stage]', box);
    caption = $('[data-caption]', box);
    prevBtn = $('[data-prev]', box);
    nextBtn = $('[data-next]', box);
    $$('[data-close]', box).forEach((el) => el.addEventListener('click', close));
    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    box.addEventListener('keydown', onKey);

    // Swipe between photos on touch devices.
    let x0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 === null || group.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
  };

  const render = (trigger) => {
    stage.replaceChildren();
    const title = trigger.dataset.title || trigger.getAttribute('aria-label') || '';
    if (trigger.dataset.video) {
      const media = parseVideo(trigger.dataset.video);
      const frame = document.createElement('div');
      frame.className = 'frame-16x9';
      if (media.type === 'iframe') {
        const iframe = document.createElement('iframe');
        iframe.src = media.src;
        iframe.title = title || 'Video player';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.appendChild(iframe);
      } else {
        const video = document.createElement('video');
        video.src = media.src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        if (trigger.dataset.poster) video.poster = trigger.dataset.poster;
        frame.appendChild(video);
      }
      stage.appendChild(frame);
    } else {
      const img = document.createElement('img');
      img.className = 'lightbox-photo';
      img.src = trigger.dataset.full || trigger.getAttribute('href');
      img.alt = trigger.querySelector('img')?.alt || title;
      img.decoding = 'async';
      stage.appendChild(img);
    }
    caption.textContent = trigger.dataset.caption || title;
    caption.hidden = !caption.textContent;
    const multi = group.length > 1;
    prevBtn.hidden = nextBtn.hidden = !multi;
  };

  const open = (trigger) => {
    if (!box) buildLightbox();
    const name = trigger.dataset.gallery;
    group = name ? $$(`[data-gallery="${name}"]`) : [trigger];
    index = Math.max(0, group.indexOf(trigger));
    lastFocus = document.activeElement;
    render(trigger);
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbar ? `${scrollbar}px` : '';
    box.hidden = false;
    $('[data-close].lightbox-btn', box).focus();
  };

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    stage.replaceChildren(); // removing the iframe stops playback
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';
    lastFocus?.focus?.();
  }

  function step(dir) {
    if (group.length < 2) return;
    index = (index + dir + group.length) % group.length;
    render(group[index]);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {
      const focusable = $$('button:not([hidden]), iframe, video', box).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-video], [data-photo]');
    if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; // let modified clicks open a new tab
    e.preventDefault();
    open(trigger);
  });

  /* ---------- Story filters ---------- */
  const chips = $$('[data-filter]');
  if (chips.length) {
    const items = $$('[data-category]');
    const status = $('[data-filter-status]');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      let shown = 0;
      items.forEach((item) => {
        const match = f === 'all' || item.dataset.category.split(' ').includes(f);
        item.hidden = !match;
        if (match) { shown++; item.classList.add('is-visible'); }
      });
      if (status) status.textContent = `${shown} ${shown === 1 ? 'story' : 'stories'}`;
    }));
  }

  /* ---------- Reading time for on-site articles ---------- */
  const article = $('[data-article]');
  const readOut = $('[data-reading-time]');
  if (article && readOut) {
    const words = article.textContent.trim().split(/\s+/).length;
    readOut.textContent = `${Math.max(1, Math.round(words / 220))} min read`;
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
