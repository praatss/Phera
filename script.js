/* Phera: plain JavaScript. No libraries, build step or bot connection. */
'use strict';

// Each third of the sticky section is a separate chapter.
function storyState(scrollY, start, travel, count) {
  const progress = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, travel)));
  return { progress, index: Math.min(count - 1, Math.floor(progress * count)) };
}

(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const body = document.body;
  const root = document.documentElement;
  const story = $('#story');
  const stage = $('.story-stage');
  const scenes = $$('.scene');
  const chapters = $$('.chapter-nav a');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pausedMotion = reduced.matches;
  let pinned = false;
  let current = -1;
  let pendingFrame = false;
  let noticeTimer;
  let playing = false;
  let playTimer;

  function notice(text) {
    clearTimeout(noticeTimer);
    $('#notice').textContent = text;
    $('#notice').classList.add('visible');
    noticeTimer = setTimeout(() => $('#notice').classList.remove('visible'), 3000);
  }

  function selectScene(index) {
    if (index !== current && current === 0 && playing) pauseMusic();
    current = index;
    story.dataset.scene = String(index);
    $('#scene-counter').textContent = `0${index + 1} / 03`;
    scenes.forEach((scene, i) => {
      scene.classList.toggle('active', i === index);
      // In natural-flow mode, every chapter stays accessible.
      scene.inert = pinned && i !== index;
      if (pinned && i !== index) scene.setAttribute('aria-hidden', 'true');
      else scene.removeAttribute('aria-hidden');
    });
    chapters.forEach((link, i) => {
      link.classList.toggle('active', index === i);
      if (i === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }

  function geometry() {
    const header = $('.header');
    const headerOffset = header ? header.offsetHeight : 0;
    return {
      // The sticky stage begins at the bottom edge of the fixed header.
      start: story.getBoundingClientRect().top + window.scrollY - headerOffset,
      travel: Math.max(1, story.offsetHeight - stage.offsetHeight)
    };
  }

  function renderScroll() {
    pendingFrame = false;
    const y = window.scrollY;
    const total = Math.max(1, root.scrollHeight - window.innerHeight);
    root.style.setProperty('--page-progress', String(Math.max(0, Math.min(1, y / total))));
    root.style.setProperty('--hero-shift', `${pausedMotion || reduced.matches ? 0 : Math.min(y * .09, 45)}px`);
    if (pinned) {
      const { start, travel } = geometry();
      const state = storyState(y, start, travel, scenes.length);
      root.style.setProperty('--chapter-progress', String(state.progress));
      if (state.index !== current) selectScene(state.index);
    } else {
      let nearest = 0;
      scenes.forEach((scene, index) => {
        if (scene.getBoundingClientRect().top < window.innerHeight * .55) nearest = index;
      });
      if (nearest !== current) selectScene(nearest);
    }
  }

  function requestScroll() {
    if (!pendingFrame) {
      pendingFrame = true;
      requestAnimationFrame(renderScroll);
    }
  }

  function configureLayout() {
    // Use the pinned scrollytelling experience on tablet/desktop.
    // Smaller screens and reduced-motion users keep natural document flow.
    const enoughSpace = window.innerWidth >= 720;
    pinned = enoughSpace && !pausedMotion && !reduced.matches;
    body.classList.toggle('pinned', pinned);

    // One viewport-ish scroll interval per chapter, plus the visible stage.
    story.style.setProperty('--story-length', `${100 + scenes.length * 100}svh`);

    current = -1;
    renderScroll();
  }

  function goToChapter(id, updateHash = true) {
    const index = scenes.findIndex((scene) => scene.id === id);
    if (index < 0) return;
    const behaviour = pausedMotion || reduced.matches ? 'auto' : 'smooth';
    if (pinned) {
      const { start, travel } = geometry();
      // Land inside the chapter's hold, not exactly on a rounding boundary.
      window.scrollTo({ top: start + travel * (index + .08) / scenes.length, behavior: behaviour });
    } else scenes[index].scrollIntoView({ behavior: behaviour, block: 'start' });
    if (updateHash && window.location.hash !== `#${id}`) {
      try { history.pushState(null, '', `#${id}`); } catch { /* file:// still scrolls normally */ }
    }
  }

  // Never intercept wheel/touch events, lock the page, or force scroll snapping.
  $$('a[href^="#"]').forEach((link) => {
    const target = link.getAttribute('href').slice(1);
    if (!scenes.some((scene) => scene.id === target)) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      goToChapter(target);
    });
  });
  window.addEventListener('popstate', () => {
    const id = window.location.hash.slice(1);
    if (scenes.some((scene) => scene.id === id)) goToChapter(id, false);
    else if (id === 'top' || !id) window.scrollTo({ top: 0, behavior: 'auto' });
  });
  window.addEventListener('scroll', requestScroll, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(configureLayout, 100);
  }, { passive: true });

  function updateMotion() {
    const wasPinned = pinned;
    const visibleChapter = current;
    const insideStory = story.getBoundingClientRect().top <= 78 && story.getBoundingClientRect().bottom > 78;
    body.classList.toggle('motion-paused', pausedMotion);
    $('#motion').setAttribute('aria-pressed', String(pausedMotion));
    const label = pausedMotion ? 'Resume animations' : 'Pause animations';
    $('#motion').setAttribute('aria-label', label);
    $('#motion').title = label;
    $('#motion use').setAttribute('href', pausedMotion ? '#i-play' : '#i-pause');
    configureLayout();
    // Preserve the reader's chapter when changing between pinned and natural flow.
    if (insideStory && wasPinned !== pinned && visibleChapter >= 0) {
      if (pinned) {
        const { start, travel } = geometry();
        window.scrollTo({ top: start + travel * (visibleChapter + .08) / 3, behavior: 'auto' });
      } else scenes[visibleChapter].scrollIntoView({ behavior: 'auto', block: 'start' });
      renderScroll();
    }
  }
  $('#motion').addEventListener('click', () => {
    pausedMotion = !pausedMotion;
    // If a logo asset is missing or mis-cased on GitHub Pages, show a visible
  // fallback instead of leaving a blank hole. GitHub Pages paths are case-sensitive.
  $$('img[src*="phera-symbol"], img[src*="phera-wordmark"]').forEach((img) => {
    img.addEventListener('error', () => {
      const fallback = document.createElement('span');
      const wordmark = img.getAttribute('src')?.includes('wordmark');
      fallback.className = wordmark ? 'logo-fallback logo-fallback-wordmark' : 'logo-fallback';
      fallback.textContent = wordmark ? 'Phera' : 'P';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', img.alt || 'Phera');
      img.replaceWith(fallback);
    }, { once: true });
  });

  updateMotion();
    notice(pausedMotion ? 'Motion paused. All chapters are available below.' : reduced.matches ? 'Your device’s reduced-motion preference remains active.' : 'Motion resumed.');
  });
  const onReducedMotionChange = (event) => {
    pausedMotion = event.matches;
    updateMotion();
  };
  if (typeof reduced.addEventListener === 'function') {
    reduced.addEventListener('change', onReducedMotionChange);
  } else if (typeof reduced.addListener === 'function') {
    reduced.addListener(onReducedMotionChange);
  }

  // Music is a silent UI demo. No external media or Discord connection is used.
  const tracks = [{ title: 'After Hours', duration: 222 }, { title: 'Blue Hour', duration: 198 }, { title: 'One More Song', duration: 247 }];
  let trackIndex = 0;
  let elapsed = 0;
  const favourites = new Set();
  const time = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  function renderMusic() {
    const track = tracks[trackIndex];
    $('#track-title').textContent = track.title;
    $('#duration').textContent = time(track.duration);
    $('#elapsed').textContent = time(elapsed);
    $('#track-line').style.width = `${elapsed / track.duration * 100}%`;
    $('#player').classList.toggle('is-playing', playing);
    $('#play').setAttribute('aria-pressed', String(playing));
    $('#play').setAttribute('aria-label', playing ? 'Pause silent visual preview' : 'Play silent visual preview');
    $('#play use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('#play-status').textContent = playing ? 'Silent preview playing' : elapsed ? 'Preview paused' : 'Ready when you are';
    const saved = favourites.has(trackIndex);
    $('#favourite').setAttribute('aria-pressed', String(saved));
    $('#favourite').setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${track.title} ${saved ? 'from' : 'to'} demo favourites`);
  }
  function pauseMusic() {
    playing = false;
    clearInterval(playTimer);
    renderMusic();
  }
  function nextTrack() {
    trackIndex = (trackIndex + 1) % tracks.length;
    elapsed = 0;
    renderMusic();
  }
  $('#play').addEventListener('click', () => {
    if (playing) return pauseMusic();
    playing = true;
    renderMusic();
    notice('Visual preview only — music plays inside Discord.');
    clearInterval(playTimer);
    playTimer = setInterval(() => {
      elapsed++;
      if (elapsed >= tracks[trackIndex].duration) nextTrack();
      else renderMusic();
    }, 1000);
  });
  $('#next').addEventListener('click', () => { nextTrack(); notice(`Preview: ${tracks[trackIndex].title}.`); });
  $('#favourite').addEventListener('click', () => {
    if (favourites.has(trackIndex)) favourites.delete(trackIndex);
    else favourites.add(trackIndex);
    renderMusic();
    notice(favourites.has(trackIndex) ? 'Saved to demo favourites.' : 'Removed from demo favourites.');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pauseMusic(); });
  window.addEventListener('pagehide', () => clearInterval(playTimer));

  const memories = [
    { detail: 'Jamie likes late-night jazz.', human: 'What’s the vibe tonight?', bot: 'Late-night jazz. Feels like your kind of evening.' },
    { detail: 'Music preference updated to ambient.', human: '/remember · I’m more into ambient now.', bot: 'Got it. Ambient from here on.' },
    { detail: 'Memory collection is off for Jamie here.', human: '/memory-optout · enabled: True', bot: 'Done. I can still reply to your current messages.' }
  ];
  const memoryTabs = $$('[data-memory]');
  function chooseMemory(index, focus = false) {
    const example = memories[index];
    $('#saved-detail span').textContent = example.detail;
    $('#human-message').textContent = example.human;
    $('#bot-message').textContent = example.bot;
    $('#memory-demo').setAttribute('aria-labelledby', `memory-tab-${index}`);
    memoryTabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(index === i));
      tab.tabIndex = index === i ? 0 : -1;
      if (focus && index === i) tab.focus();
    });
  }
  memoryTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseMemory(index));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % 3;
      if (event.key === 'ArrowLeft') next = (index + 2) % 3;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = 2;
      if (next !== undefined) { event.preventDefault(); chooseMemory(next, true); }
    });
  });
  for (let i = 0; i < 43; i++) {
    const bar = document.createElement('i');
    bar.style.setProperty('--height', `${8 + Math.sin((i + 1) / 44 * Math.PI) * (12 + Math.abs(Math.sin(i * 1.8)) * 43)}px`);
    bar.style.setProperty('--delay', `${-(i % 9) * .16}s`);
    $('.wave').append(bar);
  }

  const extras = $$('.extras details');
  extras.forEach((item) => item.addEventListener('toggle', () => {
    if (item.open) extras.forEach((other) => { if (other !== item) other.open = false; });
  }));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    $$('.reveal, .scene').forEach((element) => observer.observe(element));
    body.classList.add('has-js');
  }
  updateMotion();
  window.addEventListener('load', () => {
    configureLayout();
    const id = window.location.hash.slice(1);
    if (scenes.some((scene) => scene.id === id)) goToChapter(id, false);
  }, { once: true });
})();