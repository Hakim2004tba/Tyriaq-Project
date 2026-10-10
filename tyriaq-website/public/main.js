/* TYRIAQ CLUB — motion layer. Organic, fast, restrained. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- hero entrance ----
     Everything hangs off body.is-ready. requestAnimationFrame alone is not
     enough: it never fires while the tab is in the background, which would
     leave the hero blank. The timeout is the guarantee. ---- */
  const ready = () => document.body.classList.add('is-ready');
  requestAnimationFrame(ready);
  setTimeout(ready, 60);

  /* ---- ambient starfield: a slow drift behind the hero ---- */
  const sky = $('#stars');
  if (sky && !reduce) {
    const ctx = sky.getContext('2d');
    let stars = [], raf = 0, w = 0, h = 0;

    const seed = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = sky.getBoundingClientRect();
      w = sky.width = Math.round(r.width * dpr);
      h = sky.height = Math.round(r.height * dpr);
      const count = Math.min(150, Math.round((r.width * r.height) / 11000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.3 + 0.35) * dpr,
        a: Math.random() * 0.55 + 0.12,
        tw: Math.random() * 0.02 + 0.004,
        vy: (Math.random() * 0.12 + 0.03) * dpr,
        warm: Math.random() > 0.72,        // a few carry the brand pink
      }));
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.a += s.tw;
        if (s.a > 0.75 || s.a < 0.1) s.tw *= -1;
        s.y -= s.vy;
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm ? `rgba(255,154,166,${s.a})` : `rgba(244,242,241,${s.a * 0.8})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    seed();
    frame();
    addEventListener('resize', () => { cancelAnimationFrame(raf); seed(); frame(); }, { passive: true });

    /* stop drawing once the hero has scrolled away */
    new IntersectionObserver(en => {
      if (en[0].isIntersecting) { if (!raf) frame(); }
      else { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 }).observe(sky);
  }

  /* ---- scroll reveals, staggered inside each section ---- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });

  $$('.sec').forEach(sec => {
    $$('.rev', sec).forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, 7));
      io.observe(el);
    });
  });

  /* ---- nav: sticky, scrollspy, mobile menu ---- */
  const nav = $('#nav'), menu = $('#menu'), burger = $('#burger');
  const links = $$('#menu a');

  const stick = () => nav.classList.toggle('is-stuck', scrollY > 30);
  stick();
  addEventListener('scroll', stick, { passive: true });

  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => spy.observe(s));

  const closeMenu = () => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  };
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); burger.focus(); }
  });

  /* ---- programme rails: drag, buttons, depth, progress ---- */
  const initRail = rail => {
    const track = $('[data-track]', rail);
    const bar   = $('[data-bar]', rail);
    const prev  = $('[data-prev]', rail);
    const next  = $('[data-next]', rail);
    const cards = $$('[data-card]', track);
    if (!track || !cards.length) return;

    const rtl = getComputedStyle(track).direction === 'rtl';

    const max = () => Math.max(1, track.scrollWidth - track.clientWidth);
    const pos = () => Math.abs(track.scrollLeft);      // sign of scrollLeft in RTL varies by browser

    /* which card currently sits nearest the middle of the rail */
    const current = () => {
      const r = track.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      let best = 0, bestD = Infinity;
      cards.forEach((c, i) => {
        const b = c.getBoundingClientRect();
        const d = Math.abs(b.left + b.width / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    };

    /* cards nearest the centre stand forward; the rest sit back a little */
    const depth = () => {
      if (reduce) return;
      const r = track.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      cards.forEach(card => {
        const b = card.getBoundingClientRect();
        const d = Math.min(1, Math.abs(b.left + b.width / 2 - mid) / (r.width / 2 + b.width / 2));
        card.style.setProperty('--s',  (1 - d * 0.07).toFixed(3));
        card.style.setProperty('--ty', (d * 14).toFixed(1) + 'px');
        card.style.setProperty('--o',  (1 - d * 0.35).toFixed(3));
      });
    };

    const sync = () => {
      const p = Math.min(1, pos() / max());
      if (bar) {
        const w = Math.max(14, (track.clientWidth / track.scrollWidth) * 100);
        bar.style.width = w + '%';
        bar.style.marginInlineStart = (p * (100 - w)).toFixed(2) + '%';
      }
      if (prev) prev.disabled = pos() < 6;
      if (next) next.disabled = pos() > max() - 6;
      depth();
    };

    let raf = 0;
    track.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; sync(); });
    }, { passive: true });

    /* Browsers disagree on the sign of scrollLeft in RTL (0…max here, -max…0
       there), and a mandatory snap container quietly undoes a test scroll —
       so probe the axis once with snapping switched off. */
    const probeAxis = () => {
      track.classList.add('is-glide');
      const at = track.scrollLeft;
      track.scrollLeft = at + 10;
      const positive = Math.abs(track.scrollLeft - at) > 1;
      track.scrollLeft = at;
      track.classList.remove('is-glide');
      return positive ? 1 : -1;
    };
    const axis = probeAxis();
    const lo = () => Math.min(0, axis * max());
    const hi = () => Math.max(0, axis * max());

    /* scrollIntoView({behavior:'smooth'}) is ignored on this container, so
       drive the glide ourselves — it also gives the easing we want. */
    let anim = 0;
    const glide = to => {
      cancelAnimationFrame(anim);
      to = Math.max(lo(), Math.min(hi(), to));
      if (reduce) { track.scrollLeft = to; sync(); return; }
      const from = track.scrollLeft, d = to - from, t0 = performance.now(), dur = 620;
      const ease = x => 1 - Math.pow(1 - x, 3);
      track.classList.add('is-glide');
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur);
        track.scrollLeft = from + d * ease(k);
        if (k < 1) { anim = requestAnimationFrame(tick); }
        else { track.classList.remove('is-glide'); sync(); }
      };
      anim = requestAnimationFrame(tick);
    };

    /* centre the card one step along from the one nearest the middle */
    const go = fwd => {
      const i = Math.max(0, Math.min(cards.length - 1, current() + fwd));
      const r = track.getBoundingClientRect();
      const b = cards[i].getBoundingClientRect();
      glide(track.scrollLeft + (b.left + b.width / 2) - (r.left + r.width / 2));
    };
    next && next.addEventListener('click', () => go(1));
    prev && prev.addEventListener('click', () => go(-1));

    /* pointer drag — the content follows the pointer */
    let down = false, startX = 0, startScroll = 0, moved = 0;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;           // native touch scrolling is better
      cancelAnimationFrame(anim);
      down = true; moved = 0;
      track.classList.add('is-drag');
      startX = e.clientX; startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startScroll + axis * (rtl ? dx : -dx);
    });
    const release = () => {
      if (!down) return;
      down = false;
      track.classList.remove('is-drag');
      sync();
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    /* a drag must not fire the click underneath it */
    track.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    /* keyboard: arrows follow reading order */
    track.tabIndex = 0;
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(rtl ? 1 : -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(rtl ? -1 : 1); }
    });

    addEventListener('resize', sync, { passive: true });
    sync();
    new IntersectionObserver((en, obs) => {
      if (!en[0].isIntersecting) return;
      sync(); obs.disconnect();
    }, { threshold: .2 }).observe(rail);
  };

  /* ---- content: the admin panel is the source of truth when the server is up.
         Served as plain static files (or opened from disk) the page keeps the
         markup that is already in index.html, so nothing ever looks broken. ---- */
  const card = item => {
    const art = document.createElement('article');
    art.className = 'prog';
    art.dataset.card = '';

    const fig = document.createElement('figure');
    fig.className = 'prog__fig';
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image; img.alt = ''; img.loading = 'lazy';
      fig.append(img);
    }
    const ph = document.createElement('span');
    ph.className = 'prog__ph';
    ph.textContent = item.image ? '' : 'قريبًا';
    if (!item.image) fig.append(ph);

    const meta = document.createElement('div');
    meta.className = 'prog__meta';
    if (item.tag) {
      const tag = document.createElement('span');
      tag.className = 'tag'; tag.textContent = item.tag;
      meta.append(tag);
    }
    const h3 = document.createElement('h3');
    h3.textContent = item.title;
    meta.append(h3);
    if (item.desc) {
      const p = document.createElement('p');
      p.textContent = item.desc;
      meta.append(p);
    }
    art.append(fig, meta);
    return art;
  };

  const paint = branches => {
    branches.forEach(b => {
      const host = document.getElementById('branch-' + b.key);
      if (!host) return;

      const t = $('.branch__t', host); if (t && b.title) t.textContent = b.title;
      const l = $('.branch__lat', host); if (l && b.lat) l.textContent = b.lat;
      const d = $('.branch__lead', host); if (d && b.lead) d.textContent = b.lead;
      const chips = $('.chips', host);
      if (chips && Array.isArray(b.chips) && b.chips.length) {
        chips.textContent = '';
        b.chips.forEach(c => {
          const li = document.createElement('li');
          li.textContent = c;
          chips.append(li);
        });
      }

      const track = $('[data-track]', host);
      if (!track) return;
      const items = b.programs?.length
        ? b.programs
        : [{ title: 'قريبًا', desc: 'نشاطات هذا الفرع تُنشر هنا.', tag: '', image: '' }];
      track.textContent = '';
      items.forEach(it => track.append(card(it)));
    });
  };

  const mountRails = () => $$('[data-rail]').forEach(initRail);

  fetch('api/content', { credentials: 'same-origin' })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(data => {
      if (Array.isArray(data?.branches) && data.branches.length) paint(data.branches);
      return data?.logos || {};
    })
    .catch(() => ({}))          /* static hosting — keep what index.html shows */
    .then(logos => {
      $$('[data-logo]').forEach(img => showLogo(img, img.dataset.logo, logos[img.dataset.logo]));
      mountRails();
      wirePlaceholders();
    });

  /* ---- join form ---- */
  const jform = $('#joinForm');
  if (jform) {
    const msg = $('#joinMsg'), btn = $('#joinBtn'), done = $('#joinDone');
    const fail = text => { msg.textContent = text; msg.hidden = false; };

    $('#joinAgain')?.addEventListener('click', () => {
      done.hidden = true; jform.hidden = false; jform.first.focus();
    });

    jform.addEventListener('submit', async e => {
      e.preventDefault();
      msg.hidden = true;
      $$('.is-bad', jform).forEach(el => el.classList.remove('is-bad'));

      const teams = $$('input[name="teams"]:checked', jform).map(i => i.value);
      const mark = el => { el.classList.add('is-bad'); el.focus(); };

      if (!jform.first.value.trim()) return mark(jform.first), fail('الاسم مطلوب.');
      if (!jform.last.value.trim())  return mark(jform.last),  fail('اللقب مطلوب.');
      if (!/^[+\d][\d\s()-]{5,}$/.test(jform.phone.value.trim())) {
        return mark(jform.phone), fail('اكتب رقم هاتف صحيحًا.');
      }
      if (!teams.length) return fail('اختر فرعًا أو فريقًا واحدًا على الأقل.');

      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'جارٍ الإرسال…';
      try {
        const res = await fetch('api/join', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            first: jform.first.value,
            last: jform.last.value,
            phone: jform.phone.value,
            talents: jform.talents.value,
            teams,
            website: jform.website.value,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'تعذّر الإرسال، حاول مرة أخرى.');
        jform.reset();
        jform.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      } catch (ex) {
        fail(ex.message === 'Failed to fetch'
          ? 'الخادم غير متاح — شغّل الموقع عبر node server.mjs.'
          : ex.message);
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  /* ---- logo ----
     On the server the uploaded logo lives in storage and /api/content carries
     its URL. Served as plain static files it may instead sit in assets/img/
     as logo.<ext>, so fall back to those, then to the text lockup. ---- */
  const LOGO_EXT = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
  const showLogo = (img, base, url) => {
    const holder = img.parentElement;
    const queue = url ? [url, ...LOGO_EXT.map(e => `assets/img/${base}.${e}`)]
                      : LOGO_EXT.map(e => `assets/img/${base}.${e}`);
    let i = 0;
    const tryNext = () => {
      if (i >= queue.length) { holder.classList.add('no-img'); return; }
      img.src = queue[i++];
    };
    img.addEventListener('error', tryNext);
    img.addEventListener('load', () => {
      if (!img.naturalWidth) return tryNext();
      holder.classList.remove('no-img');
    });
    tryNext();
  };

  /* ---- placeholders: drop a broken <img>, keep the red frame + label ---- */
  function wirePlaceholders() {
    $$('.prog__fig img').forEach(img => {
      if (img.dataset.wired) return;
      img.dataset.wired = '1';
      const hide = () => { img.style.display = 'none'; };
      img.addEventListener('error', hide, { once: true });
      img.addEventListener('load', () => {
        if (img.naturalWidth === 0) return hide();
        const ph = img.parentElement.querySelector('.prog__ph');
        if (ph) ph.remove();
      }, { once: true });
      if (img.complete && img.naturalWidth === 0) hide();
    });
  }

  $('#yr').textContent = new Date().getFullYear();
})();
