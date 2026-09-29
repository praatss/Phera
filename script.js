/* Phera scroll-story — dependency-free progressive enhancement. */
'use strict';

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Page progress + header.
  let scrollRAF = 0;
  const renderPage = () => {
    scrollRAF = 0;
    const total = Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--page-progress', String(Math.min(1, scrollY / total)));
    $('#site-header')?.classList.toggle('scrolled', scrollY > 24);
    renderStory();
  };
  addEventListener('scroll', () => {
    if (!scrollRAF) scrollRAF = requestAnimationFrame(renderPage);
  }, {passive:true});
  addEventListener('resize', () => requestAnimationFrame(setStoryMode));

  // Mobile menu.
  const menuButton = $('#mobile-menu');
  const mobilePanel = $('#mobile-panel');
  function setMenu(open){
    if(!menuButton || !mobilePanel) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobilePanel.classList.toggle('open', open);
    mobilePanel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  }
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#mobile-panel a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });

  // Discord contact CTA. There is no public invite link; copy the owner's handle instead.
  $$('[data-copy-discord]').forEach(button => {
    const original = button.innerHTML;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('@prats__');
        button.innerHTML = 'Copied <strong>@prats__</strong>';
        button.classList.add('copied');
        setTimeout(() => { button.innerHTML = original; button.classList.remove('copied'); }, 1800);
      } catch {
        button.innerHTML = 'DM <strong>@prats__</strong> on Discord';
        setTimeout(() => { button.innerHTML = original; }, 1800);
      }
      setMenu(false);
    });
  });

  // Basic reveals outside the pinned story.
  if('IntersectionObserver' in window && !reduced){
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.13, rootMargin:'0px 0px -5% 0px'});
    $$('.reveal').forEach(el => observer.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }

  // Hero tilt: decorative only.
  const tilt = $('[data-tilt]');
  if(tilt && !reduced && matchMedia('(pointer:fine)').matches){
    tilt.addEventListener('pointermove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width-.5;
      const y = (e.clientY-r.top)/r.height-.5;
      tilt.style.transform = `rotateY(${x*6-3}deg) rotateX(${-y*5+1}deg) translateY(-2px)`;
    });
    tilt.addEventListener('pointerleave', () => tilt.style.transform='rotateY(-4deg) rotateX(2deg)');
  }

  // Scroll-driven slideshow. Desktop/tablet only; mobile falls back to natural reading flow.
  const story = $('#story');
  const slides = $$('.story-slide');
  const dots = $$('.story-dot');
  let storyEnabled = false;
  let activeSlide = -1;

  function setStoryMode(){
    storyEnabled = !!story && !reduced && innerWidth >= 900 && innerHeight >= 650;
    document.body.classList.toggle('story-mode', storyEnabled);
    if(!storyEnabled){
      slides.forEach(s => s.classList.remove('active'));
      slides[0]?.classList.add('active');
      activeSlide = 0;
    }
    renderStory();
  }

  function showSlide(index){
    index = Math.max(0, Math.min(slides.length - 1, index));
    if(index === activeSlide) return;
    activeSlide = index;
    slides.forEach((slide, i) => {
      const on = i === index;
      slide.classList.toggle('active', on);
      slide.setAttribute('aria-hidden', storyEnabled ? String(!on) : 'false');
    });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    const counter = $('#story-count');
    if(counter) counter.textContent = `${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
  }

  function renderStory(){
    if(!storyEnabled || !story || !slides.length) return;
    const rect = story.getBoundingClientRect();
    const scrollable = Math.max(1, story.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
    const scaled = progress * slides.length;
    const index = Math.min(slides.length - 1, Math.floor(scaled));
    showSlide(index);
    const fill = $('#story-progress-fill');
    if(fill) fill.style.transform = `scaleX(${progress})`;
  }

  dots.forEach((dot, index) => dot.addEventListener('click', () => {
    if(!storyEnabled || !story) return;
    const total = Math.max(1, story.offsetHeight - innerHeight);
    const target = story.offsetTop + total * ((index + .08) / slides.length);
    scrollTo({top:target, behavior:reduced?'auto':'smooth'});
  }));

  // Memory demo.
  const memoryStates = [
    {mode:'smart replies',detail:'Jamie usually plays Minecraft on Tuesday nights.',human:'guys what are we playing tonight',phera:'it is literally Tuesday. minecraft is staring at you bro 😭'},
    {mode:'memory updated',detail:'Jamie prefers late-night jazz now.',human:'/remember i am more into jazz lately',phera:'got it. the agenda has been updated.'},
    {mode:'memory off',detail:'Memory is off for Jamie here.',human:'what should we put on',phera:'give me the vibe — i can help without saving this.'}
  ];
  $$('[data-memory-state]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.memoryState || 0);
    const state = memoryStates[index];
    $$('[data-memory-state]').forEach((b,i) => b.classList.toggle('active', i===index));
    if($('#mode-pill')) $('#mode-pill').textContent = state.mode;
    if($('#memory-detail')) $('#memory-detail').textContent = state.detail;
    if($('#human-line')) $('#human-line').textContent = state.human;
    if($('#phera-line')) $('#phera-line').textContent = state.phera;
  }));

  // Music demo — visual only, deliberately silent.
  const tracks = [
    {title:'After Hours',artist:'The Lounge · shared VC',duration:222,lyric:'♪ save your tears for another day',next:'Blue Hour',source:'matched source'},
    {title:'Blue Hour',artist:'Phera Radio · current VC',duration:198,lyric:'♪ autoplay is learning the room',next:'One More Song',source:'artist radio'},
    {title:'One More Song',artist:'Jamie · from favourites',duration:247,lyric:'♪ pulled back from your history',next:'After Hours',source:'saved favourite'}
  ];
  let trackIndex=0, elapsed=42, playing=true, timer=null;
  const fmt = n => `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  function drawMusic(){
    const t=tracks[trackIndex];
    if(!$('#track-title')) return;
    $('#track-title').textContent=t.title; $('#track-artist').textContent=t.artist; $('#track-source').textContent=t.source;
    $('#lyric-text').textContent=t.lyric; $('#next-track').textContent=t.next; $('#elapsed').textContent=fmt(elapsed); $('#duration').textContent=fmt(t.duration);
    $('#scrub-fill').style.width=`${Math.min(100,elapsed/t.duration*100)}%`;
    $('#play').setAttribute('aria-pressed',String(playing)); $('#play').setAttribute('aria-label',playing?'Pause visual demo':'Play visual demo');
    $('#play use').setAttribute('href',playing?'#i-pause':'#i-play');
  }
  function nextTrack(){trackIndex=(trackIndex+1)%tracks.length;elapsed=12;drawMusic()}
  function startTimer(){clearInterval(timer);if(!playing||reduced)return;timer=setInterval(()=>{elapsed++;if(elapsed>=tracks[trackIndex].duration)nextTrack();drawMusic()},1000)}
  $('#play')?.addEventListener('click',()=>{playing=!playing;drawMusic();startTimer()});
  $('#next')?.addEventListener('click',()=>{nextTrack();startTimer()});
  $('#favourite')?.addEventListener('click',e=>{const b=e.currentTarget;b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'))});
  document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):startTimer());
  drawMusic();startTimer();

  // Voice waveform.
  const wave=$('#voice-wave');
  if(wave){
    for(let i=0;i<48;i++){
      const bar=document.createElement('i');
      const envelope=Math.sin((i+1)/49*Math.PI); const variation=.45+Math.abs(Math.sin(i*1.67))*.55;
      bar.style.height=`${8+envelope*variation*47}px`;bar.style.animationDelay=`${-(i%10)*.08}s`;wave.appendChild(bar);
    }
  }

  setStoryMode();
  renderPage();
})();
