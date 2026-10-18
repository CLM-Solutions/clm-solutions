/* CLM Solutions, behaviour
   - Boot sequence and hero entrance
   - Particle network (canvas)
   - Synthesized sound effects (Web Audio, no audio files; off until the visitor turns them on)
   - Cursor glow, tilt cards, magnetic buttons, ripples, scramble text, scroll reveals
   - Mailto contact form (no server needed)
*/
(function () {
  'use strict';

  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var body = doc.body;

  // Single source for the contact address: the mailto link in the contact block.
  var mailLink = $('.contact-info a[href^="mailto:"]');
  var CONTACT_EMAIL = mailLink ? mailLink.getAttribute('href').replace('mailto:', '') : '';

  /* ---------------- Shared audio context (created only after a visitor gesture) ---------------- */
  var AC = null;
  function audioCtx() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  /* ---------------- Sound (Web Audio, synthesized) ---------------- */
  var SFX = (function () {
    var on = false, lastHover = 0;
    try { on = localStorage.getItem('clm-sfx') === '1'; } catch (e) { /* storage blocked */ }

    function audio() { return audioCtx(); }
    function tone(freq, dur, type, vol, slide) {
      if (!on) return;
      var c = audio(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.04, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.03);
    }
    function whoosh() {
      if (!on) return;
      var c = audio(); if (!c) return;
      var len = Math.floor(c.sampleRate * 0.55), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      var src = c.createBufferSource(); src.buffer = buf;
      var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(350, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(3000, c.currentTime + 0.5);
      var g = c.createGain(); g.gain.value = 0.09;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    }
    return {
      isOn: function () { return on; },
      set: function (v) {
        on = !!v;
        try { localStorage.setItem('clm-sfx', on ? '1' : '0'); } catch (e) { /* ignore */ }
        if (on) audio();
      },
      hover: function () {
        var now = Date.now();
        if (now - lastHover < 90) return;
        lastHover = now;
        tone(1760, 0.06, 'sine', 0.018, 1.25);
      },
      click: function () { tone(520, 0.1, 'square', 0.02, 1.9); },
      confirm: function () { tone(660, 0.12, 'triangle', 0.03, 1.5); setTimeout(function () { tone(990, 0.16, 'triangle', 0.03, 1.4); }, 90); },
      whoosh: whoosh,
      tick: function () { tone(2200, 0.03, 'square', 0.012); }
    };
  })();

  // Browsers only allow audio after a gesture: resume on the first press.
  doc.addEventListener('pointerdown', function () { if (SFX.isOn()) audioCtx(); if (Music.isOn()) Music.resume(); }, { once: true, passive: true });

  /* ---------------- Background music: a playlist generated live in the browser (no audio files) ---------------- */
  var Music = (function () {
    var on = false, master = null, delay = null, timer = null, nextTime = 0, step = 0;
    var TRACKS = [
      { name: 'Night Drive', bpm: 84, bars: 16, cut: 1300, pattern: [1, 2, 3, 2, 4, 2, 3, 1],
        prog: [
          { root: 57, notes: [57, 60, 64, 67, 71] },
          { root: 53, notes: [53, 57, 60, 64, 67] },
          { root: 48, notes: [48, 52, 55, 57, 62] },
          { root: 55, notes: [55, 59, 62, 66, 69] }
        ] },
      { name: 'Glass Harbor', bpm: 76, bars: 16, cut: 1000, pattern: [0, 1, 2, 3, 2, 1, 2, 4],
        prog: [
          { root: 50, notes: [50, 53, 57, 60, 64] },
          { root: 46, notes: [46, 50, 53, 57, 60] },
          { root: 43, notes: [43, 46, 50, 53, 57] },
          { root: 45, notes: [45, 50, 52, 55, 59] }
        ] },
      { name: 'Cold Signal', bpm: 92, bars: 16, cut: 1600, pattern: [1, 3, 2, 4, 2, 3, 1, 2],
        prog: [
          { root: 52, notes: [52, 55, 59, 62, 66] },
          { root: 48, notes: [48, 52, 55, 59, 64] },
          { root: 55, notes: [55, 59, 62, 66, 69] },
          { root: 50, notes: [50, 54, 57, 62, 66] }
        ] }
    ];
    var trackIdx = 0, cur = TRACKS[0], beat = 60 / cur.bpm, eighth = beat / 2, barLen = beat * 4;

    function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function build(c) {
      master = c.createGain();
      master.gain.value = 0.0001;
      master.connect(c.destination);
      delay = c.createDelay(1);
      delay.delayTime.value = beat * 0.75;
      var fb = c.createGain(); fb.gain.value = 0.32;
      var dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
      delay.connect(dlp); dlp.connect(fb); fb.connect(delay);
      var out = c.createGain(); out.gain.value = 0.5;
      dlp.connect(out); out.connect(master);
    }
    function pad(c, t, chord, dur, cut) {
      chord.notes.slice(0, 4).forEach(function (m, i) {
        var f = mtof(m);
        var o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
        o1.type = 'sawtooth'; o2.type = 'sawtooth';
        o1.frequency.value = f; o2.frequency.value = f * 1.005;
        lp.type = 'lowpass'; lp.Q.value = 0.8;
        lp.frequency.setValueAtTime(cut * 0.4, t);
        lp.frequency.linearRampToValueAtTime(cut, t + dur * 0.5);
        lp.frequency.linearRampToValueAtTime(cut * 0.45, t + dur);
        var peak = 0.028 / (1 + i * 0.25);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.9);
        g.gain.linearRampToValueAtTime(peak * 0.7, t + dur - 0.6);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
        o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
      });
    }
    function bass(c, t, m, dur) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.25);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.1);
    }
    function pluck(c, t, m) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(master); g.connect(delay);
      o.start(t); o.stop(t + 0.55);
    }
    function setNowPlaying(name) {
      var np = $('#nowPlaying');
      if (np) np.textContent = name ? '· ' + name : '';
      var mm = $('#musicMobile');
      if (mm) mm.textContent = on ? 'Music on' + (name ? ' · ' + name : '') : 'Music off';
    }
    function setTrack(tr, startAt) {
      cur = tr;
      beat = 60 / tr.bpm; eighth = beat / 2; barLen = beat * 4;
      step = 0;
      nextTime = startAt;
      if (delay && AC) delay.delayTime.setTargetAtTime(beat * 0.75, AC.currentTime, 0.2);
      var ms = Math.max(0, (startAt - AC.currentTime) * 1000);
      setTimeout(function () { if (on) setNowPlaying(tr.name); }, ms);
    }
    function schedule() {
      var c = AC;
      if (!c) return;
      while (nextTime < c.currentTime + 0.25) {
        var t = nextTime;
        var bar = Math.floor(step / 8), s = step % 8;
        if (bar >= cur.bars) {
          // Track finished: the next one starts after a short breath.
          trackIdx = (trackIdx + 1) % TRACKS.length;
          setTrack(TRACKS[trackIdx], t + eighth * 2);
          continue;
        }
        var chord = cur.prog[bar % cur.prog.length];
        if (s === 0) {
          pad(c, t, chord, barLen, cur.cut);
          bass(c, t, chord.root - 12, barLen);
        }
        var idx = cur.pattern[s];
        if (idx !== undefined) {
          pluck(c, t + (s % 4 === 3 ? 0.02 : 0), chord.notes[idx] + (s % 2 === 0 ? 12 : 0));
        }
        nextTime += eighth;
        step++;
      }
    }
    function start() {
      var c = audioCtx();
      if (!c) return;
      if (!master) build(c);
      var startAt = c.currentTime + 0.1;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(0.42, c.currentTime + 2.5);
      setTrack(cur, startAt);
      if (!timer) timer = setInterval(schedule, 60);
      schedule();
    }
    function stop() {
      if (!AC || !master) return;
      var c = AC;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.8);
      clearInterval(timer); timer = null;
      setTimeout(function () { if (!on) setNowPlaying(''); }, 900);
    }
    try { on = localStorage.getItem('clm-music') === '1'; } catch (e) { /* storage blocked */ }
    return {
      isOn: function () { return on; },
      set: function (v) {
        on = !!v;
        try { localStorage.setItem('clm-music', on ? '1' : '0'); } catch (e) { /* ignore */ }
        if (on) start(); else stop();
      },
      resume: function () { if (on) start(); }
    };
  })();

  /* ---------------- Boot loader ---------------- */
  var loader = $('#loader');
  var ldBar = $('#ldBar'), ldLog = $('#ldLog'), ldPct = $('#ldPct');
  var started = Date.now();
  var finished = false;

  function finishBoot() {
    if (finished) return;
    finished = true;
    body.classList.add('is-ready');
    if (!loader) return;
    if (reduce) { loader.style.display = 'none'; return; }
    loader.classList.add('done');
    setTimeout(function () { loader.style.display = 'none'; }, 1200);
  }

  if (loader && !reduce) {
    var lines = ['Booting brand systems', 'Loading type and palette', 'Calibrating motion', 'Ready'];
    var duration = 1900, t0 = performance.now(), shown = -1, pctNow = 0;
    var raf = function (now) {
      var p = Math.min(1, (now - t0) / duration);
      p = 1 - Math.pow(1 - p, 2.2);
      pctNow = Math.round(p * 100);
      if (ldBar) ldBar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      if (ldPct) ldPct.textContent = String(pctNow).padStart(3, '0') + '%';
      var idx = Math.min(lines.length - 1, Math.floor(p * lines.length));
      if (idx !== shown) { shown = idx; if (ldLog) ldLog.textContent = lines[idx]; SFX.tick(); }
      if (p < 1) requestAnimationFrame(raf);
      else bootReady = true;
    };
    var bootReady = false;
    requestAnimationFrame(raf);

    var waitBoot = function () {
      var check = function () {
        if (bootReady && Date.now() - started > 2200) finishBoot();
        else setTimeout(check, 120);
      };
      check();
    };
    if (doc.readyState === 'complete') waitBoot();
    else window.addEventListener('load', waitBoot);
    setTimeout(finishBoot, 5200);
  } else {
    finishBoot();
  }

  /* ---------------- Particle network ---------------- */
  var cv = $('#net');
  if (cv && !reduce) {
    var ctx2 = cv.getContext('2d');
    var W = 0, H = 0, DPR = 1, pts = [], mouse = { x: -9999, y: -9999 }, running = true;

    var sizeNet = function () {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(95, Math.floor((W * H) / 21000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, r: Math.random() * 1.3 + 0.5 });
      }
    };
    var drawNet = function () {
      ctx2.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        dx = mouse.x - p.x; dy = mouse.y - p.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) { p.x += dx * 0.004; p.y += dy * 0.004; }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        ctx2.beginPath();
        ctx2.fillStyle = 'rgba(120, 200, 255, 0.85)';
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2.fill();
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < 130 * 130) {
            ctx2.strokeStyle = 'rgba(79, 163, 255, ' + ((1 - Math.sqrt(d) / 130) * 0.32).toFixed(3) + ')';
            ctx2.lineWidth = 0.8;
            ctx2.beginPath(); ctx2.moveTo(p.x, p.y); ctx2.lineTo(q.x, q.y); ctx2.stroke();
          }
        }
      }
    };
    var loop = function () {
      if (!running) return;
      drawNet();
      requestAnimationFrame(loop);
    };
    sizeNet();
    loop();
    var resizeT;
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(sizeNet, 150); });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    doc.addEventListener('visibilitychange', function () {
      running = !doc.hidden;
      if (running) loop();
    });
  } else if (cv) {
    cv.style.display = 'none';
  }

  /* ---------------- Header, progress, active section ---------------- */
  var top = $('#top');
  var progress = $('#progress');
  var heroVisual = $('#heroVisual');
  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--p', (max > 0 ? y / max : 0).toFixed(4));
      if (top) top.classList.toggle('scrolled', y > 24);
      if (heroVisual && !reduce) {
        var ty = Math.min(y * 0.18, 120);
        heroVisual.style.translate = '0 ' + (-ty * 0.2).toFixed(1) + 'px';
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = $$('.nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach(function (s) { secIO.observe(s); });
  }

  /* ---------------- Cursor glow ---------------- */
  var cursor = $('#cursor');
  if (cursor && fine && !reduce) {
    var cx = 0, cy = 0, tx = 0, ty2 = 0, moved = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty2 = e.clientY;
      if (!moved) { moved = true; cx = tx; cy = ty2; cursor.classList.add('on'); }
    }, { passive: true });
    doc.addEventListener('pointerleave', function () { cursor.classList.remove('on'); });
    var follow = function () {
      cx += (tx - cx) * 0.2; cy += (ty2 - cy) * 0.2;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
    var hotSel = 'a, button, .card, .value, .hero-tags li, select, input, textarea';
    doc.addEventListener('pointerover', function (e) { cursor.classList.toggle('hot', !!(e.target.closest && e.target.closest(hotSel))); });
  }

  /* ---------------- Hero: pointer parallax and spotlight ---------------- */
  var hero = $('#hero');
  if (hero && fine && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (heroVisual) heroVisual.style.transform = 'perspective(900px) rotateY(' + (px * 8).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { if (heroVisual) heroVisual.style.transform = ''; });
  }

  // Periodic glitch on the headline
  var glitch = $('.glitch');
  if (glitch && !reduce) {
    setInterval(function () {
      glitch.classList.add('run');
      setTimeout(function () { glitch.classList.remove('run'); }, 480);
    }, 6500);
  }

  /* ---------------- Scroll reveals, scramble, step sequence ---------------- */
  var scramble = function (el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var finalText = el.textContent;
    var chars = '01<>/[]{}#*+=-_';
    var f = 0, total = 22;
    var t = setInterval(function () {
      var out = '';
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText.charAt(i);
        if (ch === ' ' || i < (f / total) * finalText.length) out += ch;
        else out += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      el.textContent = out;
      if (++f > total) { clearInterval(t); el.textContent = finalText; }
    }, 34);
  };

  var lastWhoosh = 0;
  var stepsEl = $('#steps');
  var revealItems = $$('[data-reveal]');

  var onEnter = function (el) {
    el.classList.add('is-in');
    if (el.hasAttribute('data-scramble') && !reduce) scramble(el);
    if (el.classList.contains('sec-title')) {
      var now = Date.now();
      if (now - lastWhoosh > 1200) { lastWhoosh = now; SFX.whoosh(); }
    }
    if (el.id === 'steps') return;
    if (el.classList.contains('step')) {
      el.classList.add('on');
      SFX.tick();
    }
  };

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          onEnter(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-in'); el.classList.add('on'); });
  }

  if (stepsEl && 'IntersectionObserver' in window && !reduce) {
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        stepsEl.style.setProperty('--fill', '1');
        stepIO.unobserve(stepsEl);
      });
    }, { threshold: 0.4 });
    stepIO.observe(stepsEl);
  } else if (stepsEl) {
    stepsEl.style.setProperty('--fill', '1');
  }

  /* ---------------- Card tilt and spotlight ---------------- */
  if (fine && !reduce) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 8).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 10).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------------- Magnetic buttons, ripples, hover and click sounds ---------------- */
  if (fine && !reduce) {
    $$('.magnet').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () {
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    });
  }

  $$('.btn, .nav a, .card, .value, .hero-tags li, .sfx-btn').forEach(function (el) {
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') SFX.hover(); });
  });
  $$('.btn, .nav a').forEach(function (el) {
    el.addEventListener('click', function (e) { SFX.click(); });
  });
  $$('.btn').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) {
      if (reduce) return;
      var r = b.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2.2;
      var s = doc.createElement('span');
      s.className = 'ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s);
      setTimeout(function () { s.remove(); }, 720);
    });
  });

  /* ---------------- Sound and music toggles ---------------- */
  var musicBtn = $('#music'), musicText = $('#musicText'), musicMobile = $('#musicMobile');
  var paintMusic = function () {
    var v = Music.isOn();
    if (musicBtn) musicBtn.setAttribute('aria-pressed', String(v));
    if (musicText) musicText.textContent = v ? 'Music on' : 'Music off';
    if (musicMobile) { musicMobile.setAttribute('aria-pressed', String(v)); musicMobile.textContent = v ? 'Music on' : 'Music off'; }
  };
  var toggleMusic = function () { Music.set(!Music.isOn()); paintMusic(); };
  if (musicBtn) musicBtn.addEventListener('click', toggleMusic);
  if (musicMobile) musicMobile.addEventListener('click', toggleMusic);
  paintMusic();

  var sfxBtn = $('#sfx'), sfxText = $('#sfxText'), sfxMobile = $('#sfxMobile');
  var paintSfx = function () {
    var v = SFX.isOn();
    if (sfxBtn) { sfxBtn.setAttribute('aria-pressed', String(v)); }
    if (sfxText) sfxText.textContent = v ? 'Sound on' : 'Sound off';
    if (sfxMobile) { sfxMobile.setAttribute('aria-pressed', String(v)); sfxMobile.textContent = v ? 'Sound on' : 'Sound off'; }
  };
  var toggleSfx = function () {
    SFX.set(!SFX.isOn());
    paintSfx();
    if (SFX.isOn()) SFX.confirm();
  };
  if (sfxBtn) sfxBtn.addEventListener('click', toggleSfx);
  if (sfxMobile) sfxMobile.addEventListener('click', toggleSfx);
  paintSfx();

  /* ---------------- Mobile drawer ---------------- */
  var menuBtn = $('#menuBtn'), drawer = $('#drawer');
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menuBtn.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      drawer.classList.toggle('open', !open);
      if (!open) { var first = drawer.querySelector('a'); if (first) first.focus(); }
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
        drawer.classList.remove('open');
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
        menuBtn.focus();
      }
    });
  }

  /* ---------------- Contact form (opens the visitor's email app) ---------------- */
  var form = $('#form'), formErr = $('#formErr');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var message = form.message.value.trim();
      var type = form.type.value;
      var valid = name.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && message.length > 0;
      if (!valid) {
        formErr.hidden = false;
        if (!name) form.name.focus();
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) form.email.focus();
        else form.message.focus();
        SFX.click();
        return;
      }
      formErr.hidden = true;
      var okEl = $('#formOk');
      if (okEl) okEl.hidden = false;
      var subject = 'Project inquiry: ' + type;
      var mailBody = 'Name: ' + name + '\nEmail: ' + email + '\nProject: ' + type + '\n\n' + message;
      SFX.confirm();
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(mailBody);
    });
  }

  $$('a[href="#top"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
