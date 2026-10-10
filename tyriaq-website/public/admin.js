/* TYRIAQ CLUB — admin panel */
(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const gate = $('#gate'), app = $('#app');
  let content = { branches: [] };

  /* ---------- api ---------- */
  const api = async (url, opts = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', ...opts });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `خطأ ${res.status}`);
    return body;
  };
  const send = (url, method, data) =>
    api(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

  const toast = (msg, bad = false) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('is-bad', bad);
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 3200);
  };

  /* ---------- login ---------- */
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, err = $('#loginErr');
    const btn = f.querySelector('button');
    err.hidden = true; btn.disabled = true;
    try {
      await send('/api/login', 'POST', { user: f.user.value, pass: f.pass.value });
      f.reset();
      await start();
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false;
    } finally { btn.disabled = false; }
  });

  $('#outBtn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' }).catch(() => {});
    app.hidden = true; gate.hidden = false;
  });

  $('#pwBtn').addEventListener('click', async () => {
    const current = prompt('كلمة السر الحالية:');
    if (current === null) return;
    const next = prompt('كلمة السر الجديدة (8 محارف على الأقل):');
    if (next === null) return;
    try { await send('/api/password', 'POST', { current, next }); toast('تم تغيير كلمة السر.'); }
    catch (ex) { toast(ex.message, true); }
  });

  /* ---------- logo slots ---------- */
  const LOGO_EXT = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
  const showLogo = (img, base, fallbackText) => {
    const url = content?.logos?.[base];
    const queue = (url ? [url] : []).concat(LOGO_EXT.map(e => `assets/img/${base}.${e}?v=${Date.now()}`));
    let i = 0;
    const tryNext = () => {
      if (i >= queue.length) { img.hidden = true; if (fallbackText) fallbackText.hidden = false; return; }
      img.src = queue[i++];
    };
    img.onerror = tryNext;
    img.onload = () => { img.hidden = false; if (fallbackText) fallbackText.hidden = true; };
    tryNext();
  };
  const refreshLogos = () => {
    $$('.logoslot').forEach(sl => showLogo($('[data-prev]', sl), sl.dataset.slot, $('.logoslot__prev span', sl)));
    const top = $('.top__logo');
    if (top) showLogo(top, 'logo', null);
  };

  const uploadFile = async (file, slot) => {
    const fd = new FormData();
    fd.append('file', file);
    if (slot) fd.append('slot', slot);
    return api('/api/upload', { method: 'POST', body: fd });
  };

  $$('.logoslot').forEach(slotEl => {
    const slot = slotEl.dataset.slot;
    $('[data-file]', slotEl).addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await uploadFile(file, slot);
        content = await api('/api/content');     /* pick up the new logo url */
        refreshLogos();
        toast('تم رفع الشعار.');
      } catch (ex) { toast(ex.message, true); }
      e.target.value = '';
    });
  });

  /* ---------- programme editor ---------- */
  const form = $('#progForm'), drop = $('#drop'), fileInput = $('#imgFile');
  const dropPrev = $('#dropPrev'), dropCta = $('#dropCta'), clearImg = $('#clearImg');

  const setImage = url => {
    form.image.value = url || '';
    if (url) { dropPrev.src = url; dropPrev.hidden = false; dropCta.hidden = true; clearImg.hidden = false; }
    else     { dropPrev.removeAttribute('src'); dropPrev.hidden = true; dropCta.hidden = false; clearImg.hidden = true; }
  };
  clearImg.addEventListener('click', () => setImage(''));

  const takeFile = async file => {
    if (!file) return;
    drop.classList.add('is-busy');
    try { const r = await uploadFile(file); setImage(r.url); toast('تم رفع الصورة.'); }
    catch (ex) { toast(ex.message, true); }
    finally { drop.classList.remove('is-busy'); }
  };
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => { takeFile(e.target.files[0]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => {
    e.preventDefault(); drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => {
    e.preventDefault(); drop.classList.remove('is-over');
  }));
  drop.addEventListener('drop', e => takeFile(e.dataTransfer?.files?.[0]));

  const resetForm = () => {
    form.reset(); form.id.value = ''; setImage('');
    $('#editorTitle').textContent = 'إضافة نشاط أو برنامج';
    $('#saveBtn').textContent = 'حفظ';
    $('#cancelEdit').hidden = true;
    $('#formErr').hidden = true;
  };
  $('#cancelEdit').addEventListener('click', resetForm);

  const editProgram = (branchKey, item) => {
    form.id.value = item.id;
    form.branch.value = branchKey;
    form.title.value = item.title || '';
    form.desc.value = item.desc || '';
    form.tag.value = item.tag || '';
    setImage(item.image || '');
    $('#editorTitle').textContent = 'تعديل نشاط';
    $('#saveBtn').textContent = 'حفظ التعديل';
    $('#cancelEdit').hidden = false;
    $('#editorCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#formErr'), btn = $('#saveBtn');
    err.hidden = true; btn.disabled = true;
    const data = {
      branch: form.branch.value,
      title:  form.title.value,
      desc:   form.desc.value,
      tag:    form.tag.value,
      image:  form.image.value,
    };
    try {
      if (form.id.value) await send(`/api/programs/${form.id.value}`, 'PUT', data);
      else               await send('/api/programs', 'POST', data);
      resetForm();
      await load();
      toast('تم الحفظ.');
    } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    finally { btn.disabled = false; }
  });

  /* ---------- rendering ---------- */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const renderBranch = b => {
    const wrap = el('article', 'branch');

    const top = el('div', 'branch__top');
    const name = el('div', 'branch__name');
    name.append(el('span', 'branch__n', b.num));
    const nm = el('div');
    nm.append(el('b', null, b.title), el('span', null, b.lat));
    name.append(nm);
    top.append(name, el('span', 'count', `${b.programs.length} نشاط`));
    wrap.append(top);

    const items = el('div', 'items');
    if (!b.programs.length) {
      items.append(el('p', 'empty', 'لا نشاطات بعد — أضف واحدًا من النموذج أعلاه.'));
    }
    b.programs.forEach((it, i) => {
      const row = el('div', 'item');
      if (it.image) {
        const img = el('img', 'item__img');
        img.src = it.image; img.alt = '';
        img.addEventListener('error', () => img.replaceWith(el('div', 'item__ph', 'بلا صورة')), { once: true });
        row.append(img);
      } else {
        row.append(el('div', 'item__ph', 'بلا صورة'));
      }

      const tx = el('div', 'item__tx');
      if (it.tag) tx.append(el('span', 'item__tag', it.tag));
      tx.append(el('b', null, it.title), el('span', null, it.desc || '—'));
      row.append(tx);

      const act = el('div', 'item__act');
      const mk = (cls, label, title, fn) => {
        const btn = el('button', `iact ${cls}`, label);
        btn.type = 'button'; btn.title = title; btn.setAttribute('aria-label', title);
        btn.addEventListener('click', fn);
        return btn;
      };
      const move = async dir => {
        const ids = b.programs.map(x => x.id);
        const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await send('/api/reorder', 'POST', { branch: b.key, ids });
        await load();
      };
      act.append(
        mk('iact--up', '↑', 'إلى الأعلى', () => move(-1)),
        mk('iact--dn', '↓', 'إلى الأسفل', () => move(1)),
        mk('', '✎', 'تعديل', () => editProgram(b.key, it)),
        mk('', '🗑', 'حذف', async () => {
          if (!confirm(`حذف «${it.title}» نهائيًا؟`)) return;
          try { await api(`/api/programs/${it.id}`, { method: 'DELETE' }); await load(); toast('تم الحذف.'); }
          catch (ex) { toast(ex.message, true); }
        }),
      );
      row.append(act);
      items.append(row);
    });
    wrap.append(items);

    /* branch intro text */
    const det = el('details', 'intro');
    det.append(el('summary', null, 'تعديل تعريف الفرع'));
    const body = el('div', 'intro__body');
    const f = document.createElement('form');
    f.innerHTML = `
      <div class="row">
        <label class="f"><span>اسم الفرع</span><input name="title" type="text" maxlength="80"></label>
        <label class="f"><span>الاسم اللاتيني</span><input name="lat" type="text" maxlength="80"></label>
      </div>
      <label class="f"><span>التعريف</span><textarea name="lead" rows="3" maxlength="600"></textarea></label>
      <label class="f"><span>الكلمات المفتاحية <i>(افصل بينها بفاصلة)</i></span><input name="chips" type="text"></label>
      <div class="row row--end"><button class="btn" type="submit">حفظ التعريف</button></div>`;
    f.title.value = b.title; f.lat.value = b.lat; f.lead.value = b.lead;
    f.chips.value = (b.chips || []).join('، ');
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      try {
        await send(`/api/branches/${b.key}`, 'PUT', {
          title: f.title.value, lat: f.lat.value, lead: f.lead.value,
          chips: f.chips.value.split(/[،,]/).map(x => x.trim()).filter(Boolean),
        });
        await load();
        toast('تم حفظ تعريف الفرع.');
      } catch (ex) { toast(ex.message, true); }
    });
    body.append(f); det.append(body); wrap.append(det);
    return wrap;
  };

  const render = () => {
    const sel = $('#branchSel'), keep = sel.value;
    sel.textContent = '';
    content.branches.forEach(b => {
      const o = document.createElement('option');
      o.value = b.key; o.textContent = b.title;
      sel.append(o);
    });
    if (keep) sel.value = keep;

    const host = $('#branches');
    host.textContent = '';
    content.branches.forEach(b => host.append(renderBranch(b)));
  };

  /* ---------- join requests ---------- */
  const fmtDate = iso => {
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const renderJoins = data => {
    const n = data.entries.length;
    $('#joinsCount').textContent = n;
    $('#joinsHint').textContent = n
      ? 'مرتّبة من الأحدث إلى الأقدم.'
      : 'ما يرسله الطلبة من استمارة أسفل الموقع — لا طلبات بعد.';
    $('#xlsxBtn').classList.toggle('is-off', !n);
    $('#csvBtn').classList.toggle('is-off', !n);

    const t = $('#joinsTable');
    t.textContent = '';
    if (!n) { t.closest('.tablewrap').hidden = true; return; }
    t.closest('.tablewrap').hidden = false;

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    ['التاريخ', 'الاسم واللقب', 'رقم الهاتف', 'المواهب', 'الفروع والفرق', ''].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hr.append(th);
    });
    thead.append(hr);

    const tbody = document.createElement('tbody');
    data.entries.forEach(e => {
      const tr = document.createElement('tr');
      const td = (cls, text) => {
        const c = document.createElement('td');
        if (cls) c.className = cls;
        if (text != null) c.textContent = text;
        return c;
      };
      tr.append(td('dt', fmtDate(e.at)), td('nm', `${e.first} ${e.last}`));

      const ph = td('ph');
      const tel = document.createElement('a');
      tel.href = `tel:${e.phone.replace(/[^+\d]/g, '')}`;
      tel.textContent = e.phone;
      ph.append(tel);
      tr.append(ph, td('tl', e.talents || '—'));

      const teams = td();
      const pills = el('div', 'pills');
      (e.teams || []).forEach(x => pills.append(el('span', 'pill', x)));
      teams.append(pills);
      tr.append(teams);

      const act = td();
      const del = el('button', 'del', '🗑');
      del.type = 'button';
      del.title = 'حذف الطلب';
      del.setAttribute('aria-label', `حذف طلب ${e.first} ${e.last}`);
      del.addEventListener('click', async () => {
        if (!confirm(`حذف طلب «${e.first} ${e.last}» نهائيًا؟`)) return;
        try { await api(`/api/joins/${e.id}`, { method: 'DELETE' }); await loadJoins(); toast('تم الحذف.'); }
        catch (ex) { toast(ex.message, true); }
      });
      act.append(del);
      tr.append(act);
      tbody.append(tr);
    });
    t.append(thead, tbody);
  };

  const loadJoins = async () => renderJoins(await api('/api/joins'));

  const load = async () => {
    content = await api('/api/content');
    render();
    refreshLogos();
    await loadJoins();
  };

  /* ---------- boot ---------- */
  const start = async () => {
    gate.hidden = true; app.hidden = false;
    await load();
  };

  (async () => {
    try {
      const me = await api('/api/me');
      if (me.user) return start();
    } catch { /* server not reachable — fall through to the login screen */ }
    gate.hidden = false;
  })();
})();
