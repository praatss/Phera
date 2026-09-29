/* Phera showcase — dependency-free progressive enhancement. */
'use strict';

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header + page progress.
  let scrollFrame = 0;
  function renderScroll() {
    scrollFrame = 0;
    const y = window.scrollY;
    const total = Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--page-progress', String(Math.min(1, y / total)));
    $('#site-header')?.classList.toggle('scrolled', y > 24);
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll);
  }, { passive: true });
  renderScroll();

  // Mobile navigation.
  const menuButton = $('#mobile-menu');
  const mobilePanel = $('#mobile-panel');
  function setMenu(open) {
    if (!menuButton || !mobilePanel) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobilePanel.classList.toggle('open', open);
    mobilePanel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  }
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#mobile-panel a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveals.
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    $$('.reveal').forEach(el => observer.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }

  // Very light pointer tilt on the hero card. No pointer capture, no scroll hijacking.
  const tilt = $('[data-tilt]');
  if (tilt && !reduced && matchMedia('(pointer:fine)').matches) {
    tilt.addEventListener('pointermove', event => {
      const r = tilt.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - .5;
      const y = (event.clientY - r.top) / r.height - .5;
      tilt.style.transform = `rotateY(${x * 6 - 3}deg) rotateX(${-y * 5 + 1}deg) translateY(-2px)`;
    });
    tilt.addEventListener('pointerleave', () => { tilt.style.transform = 'rotateY(-4deg) rotateX(2deg)'; });
  }

  // Memory demo.
  const memoryStates = [
    { mode: 'smart replies', detail: 'Jamie usually plays Minecraft on Tuesday nights.', human: 'guys what are we playing tonight', phera: 'it is literally Tuesday. minecraft is staring at you bro 😭' },
    { mode: 'memory updated', detail: 'Jamie prefers late-night jazz now.', human: '/remember i am more into jazz lately', phera: 'got it. deleting the minecraft agenda from my propaganda department.' },
    { mode: 'memory off', detail: 'Memory collection is off for Jamie in this channel.', human: 'what should we put on', phera: 'give me the vibe and i can still help — i just will not save this convo.' }
  ];
  $$('[data-memory-state]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.memoryState || 0);
    const state = memoryStates[index];
    $$('[data-memory-state]').forEach((b, i) => b.classList.toggle('active', i === index));
    $('#mode-pill').textContent = state.mode;
    $('#memory-detail').textContent = state.detail;
    $('#human-line').textContent = state.human;
    $('#phera-line').textContent = state.phera;
  }));

  // Music visual demo — deliberately silent.
  const tracks = [
    { title: 'After Hours', artist: 'The Lounge · shared VC', duration: 222, lyric: '♪ save your tears for another day', next: 'Blue Hour', source: 'matched source' },
    { title: 'Blue Hour', artist: 'Phera Radio · current VC', duration: 198, lyric: '♪ autoplay is learning the room', next: 'One More Song', source: 'artist radio' },
    { title: 'One More Song', artist: 'Jamie · from favourites', duration: 247, lyric: '♪ pulled back from your history', next: 'After Hours', source: 'saved favourite' }
  ];
  let trackIndex = 0;
  let elapsed = 42;
  let playing = true;
  let timer = null;
  const fmt = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  function drawMusic() {
    const t = tracks[trackIndex];
    $('#track-title').textContent = t.title;
    $('#track-artist').textContent = t.artist;
    $('#track-source').textContent = t.source;
    $('#lyric-text').textContent = t.lyric;
    $('#next-track').textContent = t.next;
    $('#elapsed').textContent = fmt(elapsed);
    $('#duration').textContent = fmt(t.duration);
    $('#scrub-fill').style.width = `${Math.min(100, elapsed / t.duration * 100)}%`;
    $('#music-player').classList.toggle('paused', !playing);
    $('#play').setAttribute('aria-pressed', String(playing));
    $('#play').setAttribute('aria-label', playing ? 'Pause visual demo' : 'Play visual demo');
    $('#play use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
  function startTimer() {
    clearInterval(timer);
    if (!playing || reduced) return;
    timer = setInterval(() => {
      elapsed += 1;
      if (elapsed >= tracks[trackIndex].duration) nextTrack();
      drawMusic();
    }, 1000);
  }
  function nextTrack() {
    trackIndex = (trackIndex + 1) % tracks.length;
    elapsed = 12;
    drawMusic();
  }
  $('#play')?.addEventListener('click', () => { playing = !playing; drawMusic(); startTimer(); });
  $('#next')?.addEventListener('click', () => { nextTrack(); startTimer(); });
  $('#favourite')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const saved = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!saved));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timer); else startTimer(); });
  drawMusic(); startTimer();

  // Voice waveform.
  const wave = $('#voice-wave');
  if (wave) {
    for (let i = 0; i < 52; i++) {
      const bar = document.createElement('i');
      const envelope = Math.sin((i + 1) / 53 * Math.PI);
      const variation = .48 + Math.abs(Math.sin(i * 1.71)) * .52;
      bar.style.height = `${8 + envelope * variation * 49}px`;
      bar.style.animationDelay = `${-(i % 11) * .08}s`;
      wave.appendChild(bar);
    }
  }

  // Tiny animated Snake cabinet.
  const snakeGrid = $('#snake-grid');
  const score = $('#arcade-score');
  if (snakeGrid) {
    const cols = 12, rows = 9;
    let head = {x: 5, y: 4};
    let dir = {x: 1, y: 0};
    let body = [{x:3,y:4},{x:4,y:4},{x:5,y:4}];
    let food = {x: 9, y: 6};
    let points = 1280;
    const pieces = body.map(() => { const el = document.createElement('i'); el.className = 'snake-piece'; snakeGrid.appendChild(el); return el; });
    const foodEl = document.createElement('b'); foodEl.className = 'snake-food'; snakeGrid.appendChild(foodEl);
    function position(el, p) {
      el.style.left = `calc(${p.x} * (100% / ${cols}) + 6px)`;
      el.style.top = `calc(${p.y} * (100% / ${rows}) + 6px)`;
    }
    function drawSnake() { body.forEach((p,i) => position(pieces[i],p)); position(foodEl,food); if (score) score.textContent = String(points); }
    const route = [{x:1,y:0},{x:1,y:0},{x:0,y:1},{x:0,y:1},{x:-1,y:0},{x:-1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:-1},{x:1,y:0}];
    let routeIndex = 0;
    drawSnake();
    if (!reduced) setInterval(() => {
      dir = route[routeIndex++ % route.length];
      head = {x:(head.x + dir.x + cols)%cols,y:(head.y + dir.y + rows)%rows};
      body = [...body.slice(1), head];
      if (Math.abs(head.x-food.x)+Math.abs(head.y-food.y) < 2) { points += 40; food = {x:(food.x+4)%cols,y:(food.y+3)%rows}; }
      drawSnake();
    }, 420);
  }
})();
