/* TYRIAQ CLUB — motion & interaction layer */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---- hero entrance ---- */
  $$('.r').forEach(el => el.style.setProperty('--d', el.dataset.d || 0));
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  if (!reduce) {
    $$('.line__i').forEach((el, i) => {
      el.animate(
        [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }],
        { duration: 1100, delay: 180 + i * 130, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
      );
    });
  } else {
    $$('.line__i').forEach(el => (el.style.transform = 'none'));
  }

  /* ---- scroll reveals (staggered per section) ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

  $$('.sec').forEach(sec => {
    $$('.reveal', sec).forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, 6));
      io.observe(el);
    });
  });

  /* ---- nav: sticky state + active link + mobile ---- */
  const nav = $('#nav');
  const links = $$('#navLinks a');
  const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 40);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => spy.observe(s));

  const burger = $('#burger'), menu = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.focus();
    }
  });
  links.forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---- ecosystem nodes ---- */
  const nodes = $$('.eco__n'), cards = $$('.ecoc');
  const pick = (key) => {
    nodes.forEach(n => n.classList.toggle('is-on', n.dataset.eco === key));
    cards.forEach(c => c.classList.toggle('is-on', c.dataset.eco === key));
  };
  nodes.forEach(n => {
    n.addEventListener('click', () => pick(n.dataset.eco));
    n.addEventListener('mouseenter', () => pick(n.dataset.eco));
  });
  pick('med');

  /* ---- branch panels ---- */
  const panels = $$('.bp');
  const open = (p) => panels.forEach(x => {
    const on = x === p;
    x.classList.toggle('is-open', on);
    $('.bp__hit', x).setAttribute('aria-expanded', String(on));
  });
  panels.forEach(p => {
    const hit = $('.bp__hit', p);
    hit.addEventListener('click', () => open(p));
    p.addEventListener('mouseenter', () => { if (matchMedia('(min-width:900px)').matches) open(p); });
  });

  /* ---- subtle parallax on activity images ---- */
  if (!reduce && matchMedia('(min-width:861px)').matches) {
    const items = $$('[data-parallax]').map(el => ({ el, img: $('img', el) || $('.act__fig', el) }));
    let ticking = false;
    const frame = () => {
      const vh = innerHeight;
      items.forEach(({ el, img }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1
        img.style.transform = `translate3d(0, ${(-p * 22).toFixed(2)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ---- placeholder images: hide broken <img>, keep the organic red frame ---- */
  $$('.act__fig img').forEach(img => {
    img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
    if (img.complete && img.naturalWidth === 0) img.style.display = 'none';
  });

  $('#yr').textContent = new Date().getFullYear();
})();
