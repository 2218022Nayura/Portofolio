/* ==========================================================================
   Nayura Arsineda — Portfolio
   Vanilla JS + Angular-style Reactive Signal Store · Monochrome Apple Edition
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width: 1020px)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ======================================================================
     REACTIVE SIGNAL STORE (Angular Signals Pattern)
     ====================================================================== */
  function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();
    return {
      get: () => value,
      set: (next) => {
        if (Object.is(value, next)) return;
        value = next;
        subscribers.forEach((fn) => fn(value));
      },
      subscribe: (fn) => {
        subscribers.add(fn);
        fn(value);
        return () => subscribers.delete(fn);
      }
    };
  }

  /* ======================================================================
     NAVBAR DINAMIS
     ====================================================================== */
  const wrap = $('#navWrap');
  const nav = $('#nav');
  const full = $('#navFull');
  const island = $('#navIsland');
  const burger = $('#burger');
  const sheet = $('#navSheet');

  const FULL_H = 56;
  const ISLAND_H = 42;
  const ISLAND_W = 128;
  const MAX_W = 980;
  const SHRINK_DIST = 170;
  const GROW_DIST = 520;
  const TOP_ZONE = 120;
  const UNFORCE_DIST = 70;
  const OMEGA = 12;

  let fullW = MAX_W;
  let lastY = 0;
  let pScroll = 0;
  let pTarget = 0;
  let p = 0;
  let v = 0;
  let forced = false;
  let forcedDown = 0;
  let sheetOpen = false;
  let raf = 0;
  let lastT = 0;

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  function render() {
    const pc = clamp(p, 0, 1);
    const e = smooth(pc);

    const w = fullW + (ISLAND_W - fullW) * e;
    const h = FULL_H + (ISLAND_H - FULL_H) * e;
    nav.style.width = w.toFixed(2) + 'px';
    nav.style.height = h.toFixed(2) + 'px';

    const m = smooth((pc - 0.28) / 0.55);
    const c = Math.round(255 + (29 - 255) * m);
    const a = 0.84 + (0.95 - 0.84) * m;
    nav.style.backgroundColor = `rgba(${c}, ${c}, ${c + Math.round(m * 2)}, ${a.toFixed(3)})`;

    const fa = 1 - smooth(pc / 0.42);
    const ia = smooth((pc - 0.55) / 0.4);
    full.style.opacity = fa.toFixed(3);
    full.style.visibility = fa < 0.01 ? 'hidden' : 'visible';
    full.style.pointerEvents = fa > 0.6 ? 'auto' : 'none';
    island.style.opacity = ia.toFixed(3);
    island.style.visibility = ia < 0.01 ? 'hidden' : 'visible';
    island.style.pointerEvents = ia > 0.6 ? 'auto' : 'none';
    island.style.transform = `scale(${(0.9 + 0.1 * ia).toFixed(3)})`;
  }

  function tick(t) {
    const dt = Math.min((t - lastT) / 1000, 1 / 30);
    lastT = t;
    const x = p - pTarget;
    v += (-2 * OMEGA * v - OMEGA * OMEGA * x) * dt;
    p += v * dt;
    render();
    if (Math.abs(p - pTarget) < 0.0004 && Math.abs(v) < 0.002) {
      p = pTarget; v = 0; render(); raf = 0; return;
    }
    raf = requestAnimationFrame(tick);
  }

  function kick() {
    if (reduceMotion) { p = pTarget; v = 0; render(); return; }
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function setSheet(open) {
    sheetOpen = open;
    wrap.classList.toggle('sheet-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    }
  }

  function retarget() {
    pTarget = forced ? 0 : pScroll;
    kick();
  }

  function release() {
    if (!forced) return;
    forced = false;
    forcedDown = 0;
    island.setAttribute('aria-expanded', 'false');
    setSheet(false);
    retarget();
  }

  function onScroll() {
    const y = clamp(window.scrollY, 0, maxScroll());
    const d = y - lastY;
    lastY = y;

    if (d > 0) {
      pScroll += d / SHRINK_DIST;
      if (forced) {
        forcedDown += d;
        if (forcedDown > UNFORCE_DIST) release();
      }
    } else if (d < 0) {
      pScroll += d / GROW_DIST;
      forcedDown = 0;
    }
    pScroll = Math.min(clamp(pScroll, 0, 1), clamp(y / TOP_ZONE, 0, 1));
    retarget();
  }

  function measure() {
    fullW = Math.min(MAX_W, window.innerWidth - 24);
    nav.style.setProperty('--full-w', fullW + 'px');
    wrap.style.setProperty('--sheet-w', fullW + 'px');
    render();
  }

  island.addEventListener('click', () => {
    forced = true;
    forcedDown = 0;
    island.setAttribute('aria-expanded', 'true');
    if (isMobile()) setSheet(true);
    retarget();
  });

  if (burger) burger.addEventListener('click', () => setSheet(!sheetOpen));
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => setSheet(false)));
  $$('.nav-links a, .brand', nav).forEach((a) => a.addEventListener('click', () => setSheet(false)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setSheet(false); release(); }
  });
  document.addEventListener('click', (e) => {
    if (sheetOpen && !e.target.closest('.nav-wrap')) setSheet(false);
  });

  function initNav() {
    lastY = clamp(window.scrollY, 0, maxScroll());
    pScroll = clamp(lastY / TOP_ZONE, 0, 1);
    pTarget = p = pScroll;
    v = 0;
    measure();
  }
  initNav();

  let scrollTick = false;
  window.addEventListener('scroll', () => {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(() => { onScroll(); updateProgress(); scrollTick = false; });
    }
  }, { passive: true });
  window.addEventListener('resize', () => { measure(); if (!isMobile()) setSheet(false); });
  window.addEventListener('pageshow', initNav);

  const progressBar = $('.progress span');
  function updateProgress() {
    const max = maxScroll();
    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
  }
  updateProgress();

  const linkGroups = {};
  $$('[data-link]').forEach((a) => { (linkGroups[a.dataset.link] = linkGroups[a.dataset.link] || []).push(a); });
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        Object.values(linkGroups).flat().forEach((a) => a.classList.remove('active'));
        (linkGroups[en.target.id] || []).forEach((a) => a.classList.add('active'));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ======================================================================
     ANIMASI MASUK SMOOTH
     ====================================================================== */
  const revealEls = $$('.reveal');
  const groups = new Map();
  revealEls.forEach((el) => {
    if (el.closest('#home')) return;
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach((items) => {
    items.forEach((el, idx) => {
      if (el.style.getPropertyValue('--d')) return;
      const stepMs = el.classList.contains('section-head') ? 0 : Math.min(idx * 60, 260);
      el.style.setProperty('--d', `${stepMs}ms`);
    });
  });

  const showElement = (el) => {
    if (!el.classList.contains('in')) requestAnimationFrame(() => el.classList.add('in'));
  };

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.filter((en) => en.isIntersecting).forEach((en) => {
        showElement(en.target);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });

    revealEls.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) showElement(el);
      else io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  if (finePointer) {
    $$('.glass').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  /* ======================================================================
     TOMBOL SAPA
     ====================================================================== */
  const hello = $('#hello');
  const helloText = $('#helloText');
  const helloLive = $('#helloLive');
  const GREETINGS = [
    'Halo, selamat datang',
    'Nayura Arsineda · S.Kom',
    'Software Engineer · Data · Pelaporan',
    'Silakan eksplorasi portofolio'
  ];
  const DOT_W = 42;
  let greeting = false;

  const buildLine = (text) => {
    helloText.textContent = '';
    helloText.className = 'hello-text';
    Array.from(text).forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      helloText.appendChild(s);
    });
    return helloText.getBoundingClientRect().width;
  };

  async function sayHello() {
    if (greeting || !hello) return;
    greeting = true;
    hello.classList.add('is-open');
    helloLive.textContent = GREETINGS.join('. ');
    const maxW = Math.max(DOT_W, hello.parentElement.clientWidth - 24);

    for (const line of GREETINGS) {
      const w = buildLine(line);
      hello.style.width = Math.min(Math.ceil(w) + 40, maxW) + 'px';
      await sleep(reduceMotion ? 0 : 280);
      void helloText.offsetWidth;
      helloText.classList.add('in');
      await sleep(reduceMotion ? 800 : 380 + line.length * 20 + 600);
      helloText.classList.remove('in');
      helloText.classList.add('out');
      await sleep(reduceMotion ? 0 : 220 + line.length * 10);
    }

    helloText.textContent = '';
    helloText.className = 'hello-text';
    hello.style.width = DOT_W + 'px';
    await sleep(reduceMotion ? 0 : 500);
    hello.classList.remove('is-open');
    hello.style.width = '';
    helloLive.textContent = '';
    greeting = false;
  }
  if (hello) hello.addEventListener('click', sayHello);

  /* ======================================================================
     UTILITAS DEMO
     ====================================================================== */
  const E = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const p2 = (n) => String(n).padStart(2, '0');
  const hms = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  const wib = () => new Date(Date.now() + 7 * 3600e3);
  const wibHms = () => { const d = wib(); return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const idn = (n) => Math.round(n).toLocaleString('id-ID');
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hl = (c) => esc(c).replace(/(#[^\n]*|\/\/[^\n]*)|("[^"]*")|\b(def|return|if|const|async|await|export|function|raise|throw|new|for|in|not|and)\b|\b([a-zA-Z_]+)(?=\()/g,
    (m, c1, s, k, f) => c1 ? `<span class="c">${c1}</span>` : s ? `<span class="s">${s}</span>` : k ? `<span class="k">${k}</span>` : `<span class="f">${f}</span>`);
  const todayIso = () => { const d = new Date(); if (d.getDay() === 0) d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const download = (name, rows) => {
    const csv = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const countTo = (el, to, ms = 850, fmtFn = idn) => {
    const from = parseFloat(el.dataset.v || 0); el.dataset.v = to; const t0 = performance.now();
    (function f(t) { const k = smooth((t - t0) / ms); el.textContent = fmtFn(from + (to - from) * k); if (k < 1) requestAnimationFrame(f); })(t0);
  };

  /* ======================================================================
     1. DEMO PERANGKAT LENGKAP (4 MODUL PER PLATFORM)
     ====================================================================== */
  const dev = $('#devSim');
  if (dev) {
    const wrapEl = $('#devViewportWrap');
    const screens = { desktop: $('[data-sim-screen="desktop"]'), mobile: $('[data-sim-screen="mobile"]'), web: $('[data-sim-screen="web"]') };
    const tabs = $$('.dev-tab');
    const hint = $('#devHint');
    let plat = 'desktop', step = 0, runId = 0, visible = false, manual = reduceMotion, idleT = 0, paused = reduceMotion;
    const pauseBtn = $('#devPause');

    const makeCursor = (scr) => {
      const c = E('<i class="vcur"></i>');
      c.style.transform = `translate3d(${scr.clientWidth * 0.5}px,${scr.clientHeight * 0.95}px,0)`;
      scr.appendChild(c);
      const to = async (el, ok) => {
        if (!el || !ok()) return false;
        const s = scr.getBoundingClientRect(), r = el.getBoundingClientRect();
        const k = s.width / scr.offsetWidth || 1;
        c.style.transform = `translate3d(${(r.left - s.left + r.width * 0.55) / k}px,${(r.top - s.top + r.height * 0.6) / k}px,0)`;
        c.classList.add('on'); await sleep(680); return ok();
      };
      const tap = async (el, ok) => {
        if (!(await to(el, ok))) return false;
        c.classList.add('tap'); el.classList.add('press'); await sleep(140);
        c.classList.remove('tap'); el.classList.remove('press'); el.click(); await sleep(260); return ok();
      };
      return { to, tap, hide: () => c.classList.remove('on') };
    };
    const typeIn = async (inp, text, ok, sp = 55) => {
      const box = inp.closest('.fld'); box && box.classList.add('focus');
      for (const ch of text) { if (!ok()) break; inp.value += ch; inp.dispatchEvent(new Event('input')); await sleep(sp + Math.random() * 45); }
      box && box.classList.remove('focus');
    };
    const advance = () => { if (manual) setTimeout(() => { if (manual) go(plat, step + 1, false); }, 1100); };

    const CAT = { 'PRT-8821': 'Shaft Assy', 'PRT-4092': 'Bearing Kit', 'PRT-1104': 'Housing Cap', 'PRT-2250': 'Gasket Set' };
    const MIN_STOK = { 'PRT-8821': 100, 'PRT-4092': 80, 'PRT-1104': 50, 'PRT-2250': 40 };
    const seed = () => [
      { part: 'PRT-8821', date: todayIso(), type: 'IN', qty: 180, note: 'Supplier A' },
      { part: 'PRT-4092', date: todayIso(), type: 'IN', qty: 120, note: 'Batch #12' },
      { part: 'PRT-4092', date: todayIso(), type: 'OUT', qty: 65, note: 'Line 2' },
      { part: 'PRT-2250', date: todayIso(), type: 'IN', qty: 25, note: 'Buffer' }
    ];
    const DESK = { items: seed(), sess: null, role: 'Operator' };
    const stock = (part) => DESK.items.filter((i) => i.part === part).reduce((a, i) => a + (i.type === 'IN' ? i.qty : -i.qty), 0);
    const sums = () => DESK.items.reduce((a, i) => { a[i.type] += i.qty; return a; }, { IN: 0, OUT: 0 });
    const MOB = {
      reqs: [{ id: 20, type: 'Lembur', h: 2, note: 'Rilis Modul', st: 'Disetujui' }],
      logs: [{ day: 'Kemarin', in: '07:54', out: '17:05', st: 'Tepat Waktu' }],
      n: 21, base: 12
    };
    const WEB = {
      checks: [false, false, false, false], route: 0, audit: [], locked: false,
      contracts: [
        { code: 'PKS-2026-014', mitra: 'PT Teknologi Nusantara', exp: '18 hari lagi', status: 'Perlu Perpanjangan' },
        { code: 'MOU-2025-089', mitra: 'Politeknik Negeri Malang', exp: '142 hari lagi', status: 'Aktif' },
        { code: 'PKS-2026-003', mitra: 'CV Mitra Solusi Digital', exp: '24 hari lagi', status: 'Perlu Perpanjangan' }
      ]
    };
    const audit = (msg) => { const prev = WEB.audit.length ? WEB.audit[WEB.audit.length - 1].h : '00000000'; const t = hms(); WEB.audit.push({ t, msg, h: hash(prev + msg + t) }); };

    const SCENES = {
      /* ===================== DESKTOP · FORECAST (4 MODUL) ===================== */
      desktop: [
        {
          label: '1. Login & hak akses role', file: 'auth_role.py', tag: 'Role Access',
          code: `def login(user, password, role):\n    if len(user) < 3 or len(password) < 4:\n        raise ValueError("kredensial tidak valid")\n    perms = ["READ", "WRITE", "APPROVE"] if role == "Leader" else ["READ", "WRITE"]\n    return Session(user, role, perms, sha256(user + now())[:8])`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>Forecast Monitor · Autentikasi</span></div>
              <div class="pad center"><div class="logo">FM</div><h4>Forecast Monitor</h4><small>PT. Contoh Industri · RBAC Operator &amp; Leader</small>
              <label class="fld"><span>Username</span><input id="dUser" autocomplete="off" placeholder="mis. nayura"></label>
              <label class="fld"><span>Password</span><input id="dPass" type="password" autocomplete="off"></label>
              <div class="seg" id="dRole"><button class="on" data-r="Operator">Operator</button><button data-r="Leader">Leader</button></div>
              <button class="ub primary" id="dLogin" style="width:100%">Masuk Sistem</button><p class="msg" id="dMsg"></p></div></div>`;
            const m = $('#dMsg', s);
            $$('#dRole button', s).forEach((b) => b.onclick = () => { DESK.role = b.dataset.r; $$('#dRole button', s).forEach((x) => x.classList.toggle('on', x === b)); });
            $('#dLogin', s).onclick = async () => {
              const u = $('#dUser', s).value.trim(), pw = $('#dPass', s).value;
              if (u.length < 3 || pw.length < 4) { m.className = 'msg err'; m.textContent = 'Username min. 3 & password min. 4 karakter'; $('#dLogin', s).classList.remove('shake'); void $('#dLogin', s).offsetWidth; $('#dLogin', s).classList.add('shake'); return; }
              m.className = 'msg'; m.innerHTML = '<i class="spin"></i>Memverifikasi kredensial…'; await sleep(700);
              DESK.sess = { u, token: hash(u + Date.now()).slice(0, 8) };
              m.className = 'msg good'; m.textContent = `Login berhasil · Token ${DESK.sess.token} · Role ${DESK.role}`; advance();
            };
            return async (ok, cur) => {
              await cur.to($('#dUser', s), ok); await typeIn($('#dUser', s), 'nayura', ok);
              await cur.to($('#dPass', s), ok); await typeIn($('#dPass', s), 'rahasia1', ok);
              await cur.tap($$('#dRole button', s)[1], ok); await sleep(300);
              await cur.tap($$('#dRole button', s)[0], ok);
              await cur.tap($('#dLogin', s), ok); await sleep(1300);
            };
          }
        },
        {
          label: 'Ringkasan KPI & grafik', file: 'dashboard.py', tag: 'KPI Harian',
          code: `def daily_kpi(day):\n    rows = db.movements(day)\n    return {"in": total_in(rows), "out": total_out(rows), "turnover": ratio(rows)}`,
          mount(s) {
            const D = [42, 58, 36, 71, 64, 88, 52], N = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Hari ini'];
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>Forecast Monitor · Ringkasan</span></div><div class="pad">
              <div class="stats3"><div class="mini"><small>Total Part</small><b id="kP">0</b></div><div class="mini"><small>Perputaran</small><b id="kT">0%</b></div><div class="mini"><small>Stok Menipis</small><b id="kL">0</b></div></div>
              <div class="mini"><small>Mutasi barang 7 hari terakhir</small><div class="spark" id="kS">${D.map((v, i) => `<i class="${i < 6 ? 'dim' : ''}" style="height:${v}%"></i>`).join('')}</div><div class="spark-x">${N.map((n) => `<span>${n}</span>`).join('')}</div></div></div></div>`;
            countTo($('#kP', s), Object.keys(CAT).length, 700); countTo($('#kT', s), 86, 900, (v) => Math.round(v) + '%'); countTo($('#kL', s), Object.keys(CAT).filter((p) => stock(p) < MIN_STOK[p]).length, 700);
            setTimeout(() => $$('#kS i', s).forEach((b, i) => setTimeout(() => { b.style.transform = 'scaleY(1)'; }, i * 80)), 120);
            return async (ok, cur) => { await sleep(1200); await cur.to($('#kS', s), ok); await sleep(2200); };
          }
        },
        {
          label: '2. Dashboard stok & peringatan', file: 'stock_monitor.py', tag: 'Inventory Alert',
          code: `def get_stock_alerts(catalog, min_stock):\n    alerts = []\n    for part, name in catalog.items():\n        qty = current_stock(part)\n        alerts.append({"part": part, "qty": qty, "low": qty < min_stock[part]})\n    return alerts`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>Monitoring Stok &amp; Filter Part</span></div>
              <div class="pad">
                <div style="display:flex;gap:6px;align-items:center">
                  <label class="fld" style="flex:1"><input id="dSearch" placeholder="Cari part number / nama barang…" autocomplete="off"></label>
                  <button class="ub" id="dFilterLow">Stok Menipis</button>
                </div>
                <div class="tblwrap"><table class="tbl"><thead><tr><th>Part No</th><th>Nama Barang</th><th>Sisa Stok</th><th>Min</th><th>Status</th></tr></thead><tbody id="dStockBody"></tbody></table></div>
                <p class="msg" id="dStockMsg"></p>
              </div></div>`;
            let onlyLow = false;
            const draw = () => {
              const q = $('#dSearch', s).value.trim().toLowerCase();
              const rows = Object.entries(CAT).map(([part, name]) => {
                const qty = stock(part), min = MIN_STOK[part];
                return { part, name, qty, min, low: qty < min };
              }).filter((r) => (!q || r.part.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) && (!onlyLow || r.low));
              $('#dStockBody', s).innerHTML = rows.map((r) => `<tr><td><b>${r.part}</b></td><td>${r.name}</td><td>${r.qty} pcs</td><td>${r.min}</td><td><span class="tag ${r.low ? '' : 'out'}">${r.low ? 'Restock' : 'Aman'}</span></td></tr>`).join('');
              const lowCount = Object.keys(CAT).filter((p) => stock(p) < MIN_STOK[p]).length;
              $('#dStockMsg', s).textContent = `${lowCount} item di bawah batas minimum stok · Klik baris atau filter untuk cek detail`;
            };
            $('#dSearch', s).oninput = draw;
            $('#dFilterLow', s).onclick = () => { onlyLow = !onlyLow; $('#dFilterLow', s).classList.toggle('primary', onlyLow); draw(); };
            draw();
            return async (ok, cur) => {
              await cur.tap($('#dFilterLow', s), ok); await sleep(1100);
              await cur.tap($('#dFilterLow', s), ok); await sleep(400);
              await cur.to($('#dSearch', s), ok); await typeIn($('#dSearch', s), 'PRT-40', ok); await sleep(1000);
            };
          }
        },
        {
          label: '3. Input barang masuk / keluar', file: 'validate_inout.py', tag: 'Validasi Stok',
          code: `def save_movement(part, qty, date, kind):\n    if date.weekday() == 6:\n        raise ValueError("Minggu bukan hari kerja")\n    if kind == "OUT" and qty > stock_of(part):\n        raise ValueError("stok tidak cukup")\n    return db.insert(part, qty, date, kind)`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>${DESK.sess ? DESK.sess.u : 'nayura'} · ${DESK.role} · Mutasi Barang</span></div>
              <div class="pad"><div class="row3"><label class="fld"><span>Part No</span><input id="fPart" autocomplete="off" placeholder="PRT-…"></label>
              <label class="fld"><span>Barang</span><input id="fName" readonly placeholder="otomatis"></label>
              <label class="fld"><span>Qty</span><input id="fQty" inputmode="numeric" autocomplete="off"></label></div>
              <div class="row3" style="grid-template-columns:.9fr 1.1fr auto;align-items:end"><div class="seg" id="fType" style="height:24px"><button class="on" data-t="IN">IN</button><button data-t="OUT">OUT</button></div>
              <label class="fld"><span>Tanggal</span><input id="fDate" value="${todayIso()}" autocomplete="off"></label><button class="ub primary" id="fSave">Simpan</button></div>
              <p class="msg" id="fMsg"></p>
              <div class="stats3"><div class="mini"><small>Total IN</small><b id="sIn">0</b></div><div class="mini"><small>Total OUT</small><b id="sOut">0</b></div><div class="mini"><small>Stok Total</small><b id="sStok">0</b></div></div>
              <div class="tblwrap"><table class="tbl"><thead><tr><th>Part</th><th>Barang</th><th>Hari</th><th>Tipe</th><th>Qty</th></tr></thead><tbody id="fBody"></tbody></table></div></div></div>`;
            let kind = 'IN'; const fm = $('#fMsg', s);
            const draw = (fresh) => {
              $('#fBody', s).innerHTML = DESK.items.slice(0, 3).map((i, n) => `<tr class="${fresh && n === 0 ? 'new' : ''}"><td>${i.part}</td><td>${CAT[i.part]}</td><td>${HARI[new Date(i.date + 'T00:00:00').getDay()].slice(0, 3)}</td><td><span class="tag ${i.type === 'OUT' ? 'out' : ''}">${i.type}</span></td><td>${i.qty}</td></tr>`).join('');
              const t = sums(); countTo($('#sIn', s), t.IN, 650); countTo($('#sOut', s), t.OUT, 650); countTo($('#sStok', s), t.IN - t.OUT, 650);
            };
            const bad = (t) => { fm.className = 'msg err'; fm.textContent = t; const b = $('#fSave', s); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); };
            $('#fPart', s).oninput = (e) => { $('#fName', s).value = CAT[e.target.value.trim().toUpperCase()] || ''; };
            $$('#fType button', s).forEach((b) => b.onclick = () => { kind = b.dataset.t; $$('#fType button', s).forEach((x) => x.classList.toggle('on', x === b)); });
            $('#fSave', s).onclick = () => {
              const part = $('#fPart', s).value.trim().toUpperCase(), qty = parseInt($('#fQty', s).value, 10), ds = $('#fDate', s).value.trim(), d = new Date(ds + 'T00:00:00');
              if (!CAT[part]) return bad('Part tidak ada di katalog');
              if (!(qty > 0)) return bad('Qty harus lebih dari 0');
              if (isNaN(d)) return bad('Format tanggal: YYYY-MM-DD');
              if (d.getDay() === 0) return bad(`${ds} jatuh hari Minggu, bukan hari kerja`);
              if (kind === 'OUT' && qty > stock(part)) return bad(`Stok ${part} hanya ${stock(part)} pcs`);
              DESK.items.unshift({ part, date: ds, type: kind, qty, note: DESK.role }); draw(true);
              fm.className = 'msg good'; fm.textContent = `${kind} ${qty} pcs ${CAT[part]} tersimpan`; $('#fQty', s).value = ''; advance();
            };
            draw(false);
            return async (ok, cur) => {
              DESK.items = seed(); draw(false);
              const P = $('#fPart', s), Q = $('#fQty', s);
              await cur.to(P, ok); await typeIn(P, 'PRT-1104', ok); await cur.to(Q, ok); await typeIn(Q, '75', ok); await cur.tap($('#fSave', s), ok); await sleep(850);
              await cur.tap($$('#fType button', s)[1], ok); await cur.to(P, ok); P.value = ''; await typeIn(P, 'PRT-4092', ok);
              await cur.to(Q, ok); await typeIn(Q, '9999', ok); await cur.tap($('#fSave', s), ok); await sleep(950);
              Q.value = ''; await typeIn(Q, '40', ok); await cur.tap($('#fSave', s), ok); await sleep(850);
            };
          }
        },
        {
          label: '4. Tanda tangan & cetak laporan', file: 'export_report.py', tag: 'Rekap PDF',
          code: `def build_recap(day, signed_by):\n    rows = db.movements(day)\n    totals = summarize(rows)\n    return render_pdf("recap.html", rows, totals, signed_by)`,
          mount(s) {
            const t = sums(), name = `REKAP_${todayIso().replace(/-/g, '')}.pdf`;
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>${name}</span></div><div class="pad">
              <div class="paper"><div class="paper-h"><b>Laporan Rekap Forecast</b><small>${todayIso()}</small></div>
              <table class="tbl"><tbody>${DESK.items.slice(0, 4).map((i) => `<tr><td>${i.part}</td><td>${CAT[i.part]}</td><td><span class="tag ${i.type === 'OUT' ? 'out' : ''}">${i.type}</span></td><td>${i.qty}</td></tr>`).join('')}</tbody></table>
              <small>Total IN <b>${t.IN}</b> · OUT <b>${t.OUT}</b> · Stok <b>${t.IN - t.OUT}</b> pcs</small>
              <svg class="sig" id="pSig" viewBox="0 0 120 34"><path d="M4 24c10-22 14-22 10-4s8 8 14-6 6 14 14 2 8-10 14-4 10 4 20-6"/></svg><small>Operator ${DESK.sess ? DESK.sess.u : 'nayura'} · Diverifikasi Leader</small></div>
              <div style="display:flex;gap:8px;align-items:center"><div class="bar" style="flex:1"><i id="pBar"></i></div><small id="pTxt" style="min-width:86px">Menyusun…</small><button class="ub primary" id="pBtn">Ekspor CSV</button></div></div></div>`;
            $('#pBtn', s).onclick = (e) => {
              if (e.isTrusted) download(`rekap_forecast_${todayIso()}.csv`, [['part', 'barang', 'tanggal', 'tipe', 'qty'], ...DESK.items.map((i) => [i.part, CAT[i.part], i.date, i.type, i.qty])]);
              $('#pTxt', s).textContent = 'Diekspor ✓';
            };
            return async (ok, cur) => {
              const bar = $('#pBar', s), tx = $('#pTxt', s);
              bar.style.transform = 'scaleX(.35)'; await sleep(650); bar.style.transform = 'scaleX(.8)'; tx.textContent = 'Render halaman 1/1'; await sleep(650);
              bar.style.transform = 'scaleX(1)'; $('#pSig', s).classList.add('draw'); await sleep(1300); tx.textContent = 'PDF siap ✓';
              await cur.tap($('#pBtn', s), ok); await sleep(1100);
            };
          }
        },
        {
          label: 'Riwayat mutasi & filter', file: 'history.py', tag: 'Audit Mutasi',
          code: `def history(kind=None, q=""):\n    rows = db.movements().order_by("-date")\n    if kind:\n        rows = rows.filter(type=kind)\n    return rows.search(q)`,
          mount(s) {
            let k = '';
            s.innerHTML = `<div class="app"><div class="tb"><i class="tl"><b></b><b></b><b></b></i><span>Riwayat Mutasi Barang</span></div><div class="pad">
              <div class="seg" id="hSeg"><button class="on" data-k="">Semua</button><button data-k="IN">IN</button><button data-k="OUT">OUT</button></div>
              <div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Part</th><th>Tipe</th><th>Qty</th><th>Catatan</th></tr></thead><tbody id="hB"></tbody></table></div><p class="msg" id="hM"></p></div></div>`;
            const draw = () => {
              const r = DESK.items.filter((i) => !k || i.type === k);
              $('#hB', s).innerHTML = r.slice(0, 5).map((i, n) => `<tr class="${n === 0 ? 'new' : ''}"><td>${i.date}</td><td>${i.part}</td><td><span class="tag ${i.type === 'OUT' ? 'out' : ''}">${i.type}</span></td><td>${i.qty}</td><td>${i.note}</td></tr>`).join('');
              $('#hM', s).textContent = `${r.length} transaksi ditemukan`;
            };
            $$('#hSeg button', s).forEach((b) => (b.onclick = () => { k = b.dataset.k; $$('#hSeg button', s).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
            draw();
            return async (ok, cur) => { await sleep(900); for (const i of [1, 2, 0]) { await cur.tap($$('#hSeg button', s)[i], ok); await sleep(1100); } };
          }
        }
      ],

      /* ===================== MOBILE · KARYAWAN (4 MODUL) ===================== */
      mobile: [
        {
          label: '1. Check-in GPS & geofence', file: 'checkin.ts', tag: 'Absensi GPS',
          code: `export async function checkIn(pos: GeoPoint) {\n  if (distance(pos, PLANT) > 50) {\n    throw new Error("di luar radius");\n  }\n  return api.post("/attendance", { at: new Date() });\n}`,
          mount(s) {
            const d = new Date();
            s.innerHTML = `<div class="app"><div class="pad"><div><small>${HARI[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}</small><h4>Halo, Nayura</h4></div>
              <div class="card" style="text-align:center"><div class="big" id="mClock">${hms()}</div><small>Shift Pagi · 08:00–17:00 WIB</small></div>
              <div class="map"><span class="ring"></span><span class="pin"></span></div><small style="text-align:center">GPS Terkunci · Radius 18 m dari Plant</small>
              <div class="slide" id="mSlide"><span id="mSlideTxt">Geser untuk Check-In</span><div class="thumb" id="mThumb">›</div></div></div></div>`;
            const sl = $('#mSlide', s), th = $('#mThumb', s), mx = () => sl.clientWidth - th.clientWidth - 6;
            const tick = setInterval(() => { const c = $('#mClock', s); if (c) c.textContent = hms(); else clearInterval(tick); }, 1000);
            const finish = () => {
              const t = hms().slice(0, 5);
              sl.classList.add('done'); th.style.display = 'none'; $('#mSlideTxt', s).textContent = `✓ Tercatat ${t} WIB`;
              if (!MOB.logs.some((l) => l.day === 'Hari ini')) MOB.logs.unshift({ day: 'Hari ini', in: t, out: '—', st: 'Hadir' });
              advance();
            };
            th.addEventListener('pointerdown', (e) => {
              th.setPointerCapture(e.pointerId); const x0 = e.clientX; th.style.transition = 'none';
              const mv = (ev) => { th.style.transform = `translateX(${clamp(ev.clientX - x0, 0, mx())}px)`; };
              const up = (ev) => {
                th.removeEventListener('pointermove', mv); th.removeEventListener('pointerup', up); th.style.transition = 'transform .5s var(--apple-ease)';
                if (ev.clientX - x0 > mx() * 0.85) { th.style.transform = `translateX(${mx()}px)`; finish(); } else th.style.transform = 'none';
              };
              th.addEventListener('pointermove', mv); th.addEventListener('pointerup', up);
            });
            return async (ok, cur) => {
              await cur.to(th, ok); th.style.transition = 'transform 1s var(--apple-ease)'; th.style.transform = `translateX(${mx()}px)`;
              await cur.to(sl, ok); finish(); await sleep(1400);
            };
          }
        },
        {
          label: '2. Log kehadiran & jadwal shift', file: 'attendance_log.ts', tag: 'Riwayat Shift',
          code: `export function getMonthlySummary(logs: Log[]) {\n  const present = logs.filter(l => l.status === "Hadir").length;\n  return { present, onTimeRate: "98%", shift: "Shift Pagi" };\n}`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="pad"><h4>Riwayat Kehadiran</h4>
              <div class="stats3" style="grid-template-columns:1fr 1fr"><div class="mini" style="background:#fff"><small>Kehadiran</small><b>21 / 22 hr</b></div><div class="mini" style="background:#fff"><small>Ketepatan</small><b>98%</b></div></div>
              <div class="card list-i" id="mLogList"></div>
              <div class="card"><small>Jadwal Besok</small><div style="font-weight:600;font-size:11px;margin-top:2px">Shift Pagi · 08:00 – 17:00</div><small>Lokasi: Plant Cakung · Line A</small></div>
            </div></div>`;
            $('#mLogList', s).innerHTML = MOB.logs.slice(0, 3).map((l) => `<div><span><b>${l.day}</b> · ${l.in}–${l.out}</span><span class="tag">${l.st}</span></div>`).join('');
            return async (ok) => { await sleep(2200); };
          }
        },
        {
          label: '3. Pengajuan lembur & cuti', file: 'overtime.ts', tag: 'Pengajuan',
          code: `export async function submitRequest(type: string, hours: number, note: string) {\n  if (hours < 1 || hours > 4) throw new Error("maks. 4 jam");\n  return api.post("/requests", { type, hours, note });\n}`,
          mount(s) {
            let h = 2, note = 'Rilis Modul', reqType = 'Lembur';
            s.innerHTML = `<div class="app"><div class="pad"><h4>Pengajuan Kerja</h4>
              <div class="seg" id="mReqType"><button class="on" data-rt="Lembur">Lembur</button><button data-rt="Izin / Cuti">Izin / Cuti</button></div>
              <div class="card"><small id="mDurLbl">Durasi Lembur</small><div class="step"><button id="mMin">−</button><span><b id="mHrs">2</b> <em id="mUnit" style="font-style:normal">jam</em></span><button id="mPlus">+</button></div></div>
              <div class="chips-i" id="mNote"><button class="on">Rilis Modul</button><button>Maintenance</button><button>Rekap Data</button></div>
              <button class="ub primary" id="mSubmit" style="height:30px;border-radius:99px">Kirim Pengajuan</button><p class="msg" id="mMsg" style="text-align:center"></p></div></div>`;
            const draw = () => {
              $('#mHrs', s).textContent = h;
              $('#mDurLbl', s).textContent = reqType === 'Lembur' ? 'Durasi Lembur' : 'Durasi Hari';
              $('#mUnit', s).textContent = reqType === 'Lembur' ? 'jam' : 'hari';
            };
            $$('#mReqType button', s).forEach((b) => b.onclick = () => { reqType = b.dataset.rt; $$('#mReqType button', s).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
            $('#mMin', s).onclick = () => { h = Math.max(1, h - 1); draw(); };
            $('#mPlus', s).onclick = () => { h = Math.min(4, h + 1); draw(); };
            $$('#mNote button', s).forEach((b) => b.onclick = () => { note = b.textContent; $$('#mNote button', s).forEach((x) => x.classList.toggle('on', x === b)); });
            $('#mSubmit', s).onclick = () => { MOB.reqs.unshift({ id: MOB.n++, type: reqType, h, note, st: 'Menunggu' }); const m = $('#mMsg', s); m.className = 'msg good'; m.textContent = `${reqType} #${MOB.n - 1} terkirim ke supervisor`; advance(); };
            draw();
            return async (ok, cur) => {
              await cur.tap($('#mPlus', s), ok); await cur.tap($$('#mNote button', s)[1], ok);
              await cur.tap($('#mSubmit', s), ok); await sleep(1300);
            };
          }
        },
        {
          label: '4. Approval & rekap jam kerja', file: 'approval.ts', tag: 'Approval',
          code: `export async function approve(id: string) {\n  await db.update(id, { status: "APPROVED" });\n  await push.send(id, "Pengajuan disetujui");\n  return recap.refresh(monthOf(id));\n}`,
          mount(s) {
            s.innerHTML = `<div class="notif" id="mNotif"><b>Supervisor · Approval</b><span id="mNotifTxt"></span></div>
              <div class="app"><div class="pad"><h4>Status &amp; Rekap</h4><div class="card list-i" id="mList2"></div>
              <button class="ub ok" id="mApprove" style="height:28px;border-radius:99px">Setujui Semua (Supervisor)</button>
              <div class="card" style="display:flex;gap:12px;align-items:center"><svg class="donut" viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="fg" id="mDon" cx="18" cy="18" r="15.9" stroke-dasharray="100" stroke-dashoffset="100"/></svg>
              <div><small>Lembur bulan ini</small><div class="big" id="mTot">0</div><small>dari kuota 20 jam</small></div></div></div></div>`;
            const total = () => MOB.base + MOB.reqs.filter((r) => r.st === 'Disetujui' && r.type === 'Lembur').reduce((a, r) => a + r.h, 0);
            const draw = () => {
              $('#mList2', s).innerHTML = MOB.reqs.slice(0, 3).map((r) => `<div><span>#${r.id} · ${r.note} (${r.h}j)</span><span class="tag ${r.st === 'Menunggu' ? 'wait' : ''}">${r.st}</span></div>`).join('');
              countTo($('#mTot', s), total(), 850, (v) => Math.round(v) + ' jam'); $('#mDon', s).style.strokeDashoffset = 100 - Math.min(100, (total() / 20) * 100);
            };
            $('#mApprove', s).onclick = async () => {
              const pend = MOB.reqs.filter((r) => r.st === 'Menunggu'); if (!pend.length) return;
              $('#mNotifTxt', s).textContent = ` #${pend[0].id} disetujui · ${pend[0].note}`; $('#mNotif', s).classList.add('show');
              pend.forEach((r) => { r.st = 'Disetujui'; }); draw(); advance();
              setTimeout(() => $('#mNotif', s) && $('#mNotif', s).classList.remove('show'), 2400);
            };
            draw();
            return async (ok, cur) => {
              if (!MOB.reqs.some((r) => r.st === 'Menunggu')) { MOB.reqs.unshift({ id: MOB.n++, type: 'Lembur', h: 3, note: 'Maintenance', st: 'Menunggu' }); draw(); }
              await sleep(450); await cur.tap($('#mApprove', s), ok); await sleep(2400);
            };
          }
        },
        {
          label: 'Saldo cuti & slip gaji', file: 'payroll.ts', tag: 'Payroll',
          code: `export function leaveBalance(emp: Employee) {\n  const used = emp.leaves.reduce((a, l) => a + l.days, 0);\n  return { quota: 12, used, left: 12 - used };\n}`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="pad"><h4>Cuti &amp; Slip Gaji</h4>
              <div class="stats3" style="grid-template-columns:1fr 1fr"><div class="mini" style="background:#fff"><small>Sisa Cuti</small><b id="lL">0</b></div><div class="mini" style="background:#fff"><small>Terpakai</small><b>4 hari</b></div></div>
              <div class="bar"><i id="lBar"></i></div>
              <div class="card list-i" id="lSlip"><div><span><b>Slip Oktober 2026</b></span><span class="tag">Tersedia</span></div><div><span>Slip September 2026</span><span class="tag out">Terunduh</span></div></div>
              <button class="ub primary" id="lOpen" style="height:30px;border-radius:99px">Buka Slip Oktober</button></div></div>`;
            countTo($('#lL', s), 8, 900, (v) => Math.round(v) + ' hari'); setTimeout(() => { const b = $('#lBar', s); if (b) b.style.transform = 'scaleX(.33)'; }, 80);
            $('#lOpen', s).onclick = () => { $('#lSlip', s).innerHTML = [['Gaji pokok', 'Rp 5.200.000'], ['Lembur', 'Rp 340.000'], ['Potongan', '− Rp 180.000'], ['Diterima', 'Rp 5.360.000']].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join(''); $('#lOpen', s).textContent = 'Slip terbuka'; };
            return async (ok, cur) => { await sleep(1200); await cur.tap($('#lOpen', s), ok); await sleep(2200); };
          }
        },
        {
          label: 'Notifikasi & inbox', file: 'notify.ts', tag: 'Push',
          code: `export async function pushInbox(userId: string) {\n  const list = await db.notifs(userId);\n  return list.map((n) => ({ ...n, unread: !n.readAt }));\n}`,
          mount(s) {
            const N = [['Lembur #20 disetujui', 'Supervisor · 2 mnt lalu'], ['Jadwal shift besok diperbarui', 'HRD · 1 jam lalu'], ['Slip Oktober tersedia', 'Payroll · Kemarin']], read = [false, false, false];
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Notifikasi</h4><span class="tag" id="nBadge">3 baru</span></div><div class="card list-i" id="nList"></div><small>Ketuk notifikasi untuk menandai sudah dibaca</small></div></div>`;
            const draw = () => { $('#nList', s).innerHTML = N.map((n, i) => `<div data-i="${i}" style="cursor:pointer"><span><b>${n[0]}</b><br><small>${n[1]}</small></span><span class="tag ${read[i] ? 'out' : ''}">${read[i] ? 'Dibaca' : 'Baru'}</span></div>`).join(''); const u = read.filter((x) => !x).length; $('#nBadge', s).textContent = u ? u + ' baru' : 'Semua dibaca'; };
            $('#nList', s).onclick = (e) => { const d = e.target.closest('[data-i]'); if (!d) return; read[+d.dataset.i] = true; draw(); };
            draw();
            return async (ok, cur) => { for (let i = 0; i < 3; i++) { await cur.tap($(`[data-i="${i}"]`, s), ok); await sleep(420); } await sleep(1300); };
          }
        }
      ],

      /* ===================== WEB · ADMINISTRASI (4 MODUL) ===================== */
      web: [
        {
          label: '1. Dashboard monitoring MoU/PKS', file: 'monitoring.py', tag: 'Dashboard', url: 'admin.portal.local/dashboard',
          code: `def check_expiring_contracts(days_threshold=30):\n    due = Contract.objects.filter(days_left__lte=days_threshold)\n    for c in due:\n        notify_pic(c.code, c.mitra, c.days_left)\n    return due`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Monitoring Kerja Sama (MoU / PKS)</h4><span class="tag">3 Mitra Aktif</span></div>
              <div class="stats3"><div class="mini"><small>Total Dokumen</small><b>48</b></div><div class="mini"><small>Aktif</small><b>42</b></div><div class="mini"><small>Segera Berakhir</small><b>2</b></div></div>
              <div class="tblwrap"><table class="tbl"><thead><tr><th>No. Dokumen</th><th>Mitra Instansi</th><th>Masa Berlaku</th><th>Status</th></tr></thead><tbody id="wMonBody"></tbody></table></div>
              <div style="display:flex;justify-content:space-between;align-items:center"><small id="wMonMsg">Notifikasi otomatis H-30 aktif</small><button class="ub primary" id="wRemindBtn">Kirim Pengingat H-30</button></div></div></div>`;
            $('#wMonBody', s).innerHTML = WEB.contracts.map((c) => `<tr><td><b>${c.code}</b></td><td>${c.mitra}</td><td>${c.exp}</td><td><span class="tag ${c.status === 'Aktif' ? 'out' : ''}">${c.status}</span></td></tr>`).join('');
            $('#wRemindBtn', s).onclick = () => {
              $('#wMonMsg', s).textContent = '✓ Pengingat email terkirim ke 2 PIC mitra';
              audit('NOTIFY EXPIRING PKS-2026-014 & PKS-2026-003');
              advance();
            };
            return async (ok, cur) => { await sleep(900); await cur.tap($('#wRemindBtn', s), ok); await sleep(1500); };
          }
        },
        {
          label: '2. Intake & validasi kelengkapan', file: 'intake.py', tag: 'Intake', url: 'admin.portal.local/intake',
          code: `def submit_intake(doc, required):\n    missing = [f for f in required if not doc.has(f)]\n    if missing:\n        raise ValueError(missing)\n    return doc.set_stage("ROUTING")`,
          mount(s) {
            const L = ['Surat pengantar resmi', 'Draft adendum kerja sama (PDF)', 'Identitas penandatangan sah', 'Lampiran RAB & ruang lingkup'];
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Intake Berkas · ADM-088</h4><span class="tag wait" id="wTag">Draft</span></div><small>Adendum kerja sama mitra · diajukan oleh Unit</small>
              ${L.map((t, i) => `<div class="chk" data-i="${i}"><i>✓</i>${t}</div>`).join('')}
              <div style="display:flex;gap:8px;align-items:center"><div class="bar" style="flex:1"><i id="wBar"></i></div><b id="wPct">0%</b></div>
              <button class="ub primary" id="wSend" disabled>Kirim ke Routing Persetujuan</button></div></div>`;
            const draw = () => {
              $$('.chk', s).forEach((c, i) => c.classList.toggle('on', WEB.checks[i]));
              const n = WEB.checks.filter(Boolean).length; $('#wBar', s).style.transform = `scaleX(${n / 4})`; $('#wPct', s).textContent = n * 25 + '%'; $('#wSend', s).disabled = n < 4;
            };
            $$('.chk', s).forEach((c) => c.onclick = () => { const i = +c.dataset.i; WEB.checks[i] = !WEB.checks[i]; audit(`${WEB.checks[i] ? 'CHECK' : 'UNCHECK'} ${L[i]}`); draw(); });
            $('#wSend', s).onclick = () => { audit('SUBMIT ADM-088 → routing'); $('#wTag', s).textContent = 'Terkirim'; WEB.route = 0; advance(); };
            draw();
            return async (ok, cur) => {
              WEB.checks.fill(false); WEB.route = 0; WEB.locked = false; WEB.audit = []; audit('OPEN ADM-088'); draw();
              for (const c of $$('.chk', s)) { if (!(await cur.tap(c, ok))) return; await sleep(160); }
              await cur.tap($('#wSend', s), ok); await sleep(1100);
            };
          }
        },
        {
          label: '3. Routing persetujuan berjenjang', file: 'routing.py', tag: 'Workflow', url: 'admin.portal.local/routing',
          code: `def approve(doc, actor):\n    require_role(actor, doc.next_role())\n    audit.append(doc.code, actor, "APPROVE")\n    notify(doc.next_role())\n    return doc.advance()`,
          mount(s) {
            const N = ['Unit', 'Legal', 'Kadiv', 'Arsip'];
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Routing Persetujuan</h4><small>ADM-088</small></div><div class="flow" id="rFlow"></div>
              <div class="mini"><small>Tahap persetujuan saat ini</small><b id="rWho"></b></div><button class="ub primary" id="rApprove"></button></div></div>`;
            const draw = () => {
              $('#rFlow', s).innerHTML = N.map((n, i) => `<div class="nd ${i < WEB.route ? 'done' : i === WEB.route ? 'cur' : ''}"><i>${i < WEB.route ? '✓' : i + 1}</i><small>${n}</small></div>${i < 3 ? `<div class="ln ${i < WEB.route ? 'done' : ''}"></div>` : ''}`).join('');
              const fin = WEB.route >= 3; $('#rWho', s).textContent = fin ? 'Siap diarsipkan ke repositori' : `Menunggu persetujuan ${N[WEB.route]}`;
              const b = $('#rApprove', s); b.textContent = fin ? 'Semua tahap disetujui ✓' : `Setujui sebagai ${N[WEB.route]}`; b.disabled = fin;
            };
            $('#rApprove', s).onclick = () => { if (WEB.route >= 3) return; audit(`APPROVE ${N[WEB.route]} · ADM-088`); WEB.route++; draw(); if (WEB.route >= 3) advance(); };
            draw();
            return async (ok, cur) => {
              while (WEB.route < 3 && ok()) { await cur.tap($('#rApprove', s), ok); await sleep(650); }
              await sleep(850);
            };
          }
        },
        {
          label: '4. Arsip digital & audit trail', file: 'archive.py', tag: 'Audit SHA-256', url: 'admin.portal.local/archive',
          code: `def archive(doc, actor):\n    prev = audit.last_hash(doc.code)\n    entry = Entry(doc.code, actor, prev)\n    audit.append(entry)\n    return doc.lock()`,
          mount(s) {
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Repositori &amp; Audit Trail</h4><span class="tag wait" id="aTag">Terbuka</span></div>
              <div class="audit" id="aLog"></div><button class="ub primary" id="aLock">Arsipkan &amp; Kunci Dokumen</button></div></div>`;
            const draw = () => {
              $('#aLog', s).innerHTML = WEB.audit.slice(-8).map((a) => `<div><u>${a.t}</u> <em>${a.h}</em> ${a.msg}</div>`).join('');
              $('#aTag', s).textContent = WEB.locked ? 'Terkunci' : 'Terbuka'; $('#aLock', s).disabled = WEB.locked;
            };
            $('#aLock', s).onclick = () => { if (WEB.locked) return; audit('ARCHIVE AR-2026-088 · LOCKED'); WEB.locked = true; draw(); advance(); };
            if (!WEB.audit.length) audit('OPEN ADM-088');
            draw();
            return async (ok, cur) => { await sleep(800); await cur.tap($('#aLock', s), ok); await sleep(2200); };
          }
        },
        {
          label: 'Analitik kemitraan & grafik', file: 'analytics.py', tag: 'Analitik', url: 'admin.portal.local/analytics',
          code: `def monthly_throughput(year, semester):\n    qs = Document.objects.filter(year=year, semester=semester)\n    return qs.values("month").annotate(total=Count("id"))`,
          mount(s) {
            const Q = { S1: [38, 52, 61, 47, 70, 83], S2: [55, 64, 58, 79, 88, 95] }, M = { S1: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'], S2: ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
            let k = 'S1';
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Analitik Kemitraan</h4><div class="seg" id="aSeg" style="width:140px"><button class="on" data-k="S1">Sem. 1</button><button data-k="S2">Sem. 2</button></div></div>
              <div class="stats3"><div class="mini"><small>Mitra Baru</small><b id="aN">0</b></div><div class="mini"><small>Perpanjangan</small><b id="aR">0</b></div><div class="mini"><small>Rasio Aktif</small><b id="aP">0%</b></div></div>
              <div class="mini"><small>Dokumen diproses per bulan</small><div class="spark" id="aS"></div><div class="spark-x" id="aX"></div></div></div></div>`;
            const draw = () => {
              const d = Q[k], sum = d.reduce((a, b) => a + b, 0);
              $('#aS', s).innerHTML = d.map((v, i) => `<i class="${i < 5 ? 'dim' : ''}" style="height:${v}%"></i>`).join(''); $('#aX', s).innerHTML = M[k].map((m) => `<span>${m}</span>`).join('');
              setTimeout(() => $$('#aS i', s).forEach((b, i) => setTimeout(() => { b.style.transform = 'scaleY(1)'; }, i * 70)), 40);
              countTo($('#aN', s), Math.round(sum / 12), 700); countTo($('#aR', s), Math.round(sum / 30), 700); countTo($('#aP', s), k === 'S1' ? 87 : 92, 700, (v) => Math.round(v) + '%');
            };
            $$('#aSeg button', s).forEach((b) => (b.onclick = () => { k = b.dataset.k; $$('#aSeg button', s).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
            draw();
            return async (ok, cur) => { await sleep(1800); await cur.tap($$('#aSeg button', s)[1], ok); await sleep(2200); };
          }
        },
        {
          label: 'Pengguna & hak akses (RBAC)', file: 'rbac.py', tag: 'RBAC', url: 'admin.portal.local/users',
          code: `def change_role(actor, target, role):\n    require_role(actor, "Admin")\n    target.role = role\n    audit.append(target.id, actor, "ROLE_CHANGE")\n    return target.save()`,
          mount(s) {
            const R = ['Staff', 'Legal', 'Admin'], U = [{ n: 'Rina W.', r: 0 }, { n: 'Dimas P.', r: 1 }, { n: 'Sari A.', r: 0 }];
            s.innerHTML = `<div class="app"><div class="pad"><div class="web-h"><h4>Pengguna &amp; Hak Akses</h4><span class="tag">RBAC</span></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Nama</th><th>Role</th><th>Aksi</th></tr></thead><tbody id="uB"></tbody></table></div><small id="uM">Perubahan role tercatat otomatis di audit trail</small></div></div>`;
            const draw = () => { $('#uB', s).innerHTML = U.map((u, i) => `<tr><td><b>${u.n}</b></td><td><span class="tag ${u.r ? '' : 'out'}">${R[u.r]}</span></td><td><button class="ub" data-i="${i}">Naikkan role</button></td></tr>`).join(''); };
            $('#uB', s).onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const u = U[+b.dataset.i]; u.r = (u.r + 1) % 3; audit(`ROLE ${u.n} → ${R[u.r]}`); $('#uM', s).textContent = `✓ ${u.n} kini ${R[u.r]} · tercatat di audit trail`; draw(); };
            draw();
            return async (ok, cur) => { await sleep(900); await cur.tap($('[data-i="0"]', s), ok); await sleep(900); await cur.tap($('[data-i="2"]', s), ok); await sleep(1800); };
          }
        }
      ]
    };

    const DESIGN_W = 540;
    const KIND = { desktop: '.dv-mac', mobile: '.dv-phone', web: '.dv-safari' };
    function fit() {
      const cs = getComputedStyle(wrapEl);
      const cw = wrapEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const pv = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const s = Math.min(1, cw / DESIGN_W);
      $$('.dv-mac, .dv-safari', wrapEl).forEach((el) => {
        el.style.scale = s < 1 ? String(s) : '';
        el.style.translate = `${((cw - DESIGN_W * s) / 2).toFixed(1)}px 0px`;
      });
      const cur = $(KIND[wrapEl.dataset.platform] || '.dv-mac', wrapEl);
      if (cur && cur.offsetHeight) {
        const hh = Math.round(cur.offsetHeight * (cur.matches('.dv-phone') ? 1 : s) + pv);
        if (wrapEl.style.height !== hh + 'px') wrapEl.style.height = hh + 'px';
      }
    }
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrapEl); else window.addEventListener('resize', fit);

    function go(p = plat, st = step, auto = true) {
      const totalSteps = SCENES[p].length;
      plat = p; step = ((st % totalSteps) + totalSteps) % totalSteps; const id = ++runId, sc = SCENES[p][step], scr = screens[p];
      wrapEl.dataset.platform = p; fit();
      tabs.forEach((b) => { const on = b.dataset.platform === p; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
      $('#devStepCounter').textContent = `${step + 1} / ${totalSteps}`;
      $('#devCodeFile').textContent = sc.file; $('#devCodeTag').textContent = sc.tag; $('#devCodeBody').innerHTML = hl(sc.code);
      $('#sfUrl').textContent = sc.url || 'admin.portal.local/dashboard';
      $('#devPipeline').innerHTML = SCENES[p].map((x, i) => `<li class="${i < step ? 'is-done' : i === step ? 'is-active' : ''}" data-s="${i}"><span>${i < step ? '✓' : i + 1}</span>${x.label.replace(/^\d+\.\s*/, '')}</li>`).join('');
      scr.innerHTML = ''; const play = sc.mount(scr);
      if (!auto || manual) return;
      const cur = makeCursor(scr), ok = () => id === runId && visible && !document.hidden;
      (async () => {
        await sleep(600); if (!ok()) return;
        try { await play(ok, cur); } catch (e) {}
        cur.hide(); if (!ok()) return; await sleep(1100); if (ok() && !manual) go(plat, step + 1);
      })();
    }

    const takeOver = () => {
      if (!manual) { runId++; $$('.vcur', wrapEl).forEach((c) => c.classList.remove('on')); }
      manual = true; hint.textContent = 'Kamu yang pegang kendali. Autopilot lanjut jika didiamkan 12 detik.';
      clearTimeout(idleT); if (!paused) idleT = setTimeout(() => { manual = false; hint.textContent = 'Autopilot jalan. Klik apa saja di layar untuk ambil alih.'; go(plat, step + 1); }, 12000);
    };
    Object.values(screens).forEach((sc) => { sc.addEventListener('pointerdown', takeOver); sc.addEventListener('keydown', takeOver); });
    const resume = () => { manual = paused; clearTimeout(idleT); hint.textContent = 'Autopilot jalan. Klik apa saja di layar untuk ambil alih.'; };
    tabs.forEach((b) => b.addEventListener('click', () => { resume(); go(b.dataset.platform, 0); }));
    $('#devPipeline').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) { resume(); go(plat, +li.dataset.s); } });

    pauseBtn.addEventListener('click', () => {
      paused = !paused; pauseBtn.textContent = paused ? 'Putar' : 'Jeda'; pauseBtn.setAttribute('aria-pressed', paused); clearTimeout(idleT);
      if (paused) { runId++; manual = true; $$('.vcur', wrapEl).forEach((c) => c.classList.remove('on')); hint.textContent = 'Autopilot dijeda. Layar tetap bisa kamu coba sendiri.'; }
      else { manual = false; hint.textContent = 'Autopilot jalan. Klik apa saja di layar untuk ambil alih.'; go(plat, step); }
    });
    if (paused) { pauseBtn.textContent = 'Putar'; pauseBtn.setAttribute('aria-pressed', 'true'); hint.textContent = 'Animasi otomatis dimatikan. Layar tetap bisa dicoba manual.'; }
    go('desktop', 0, false);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible && !manual) go(plat, step); else if (!visible) runId++;
      }, { threshold: 0.3 }).observe(dev);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !manual) go(plat, step); });
    const iosClock = $('#iosClock'); setInterval(() => { if (iosClock) iosClock.textContent = hms().slice(0, 5); }, 15000);
    if (iosClock) iosClock.textContent = hms().slice(0, 5);
  }

  /* ======================================================================
     2. STUDIO FULL-STACK — Database, UI/UX, Deploy, QA, Laporan Data (Diperdalam)
     ====================================================================== */
  const fxBody = $('#fxBody');
  if (fxBody) {
    const tabs = $$('[data-fx]'), cap = $('#fxCap'), bar = $('#fxBar'), ttl = $('#fxTitle');
    let key = 'db', rid = 0, vis = false, paused = reduceMotion, ended = false;
    const fxPause = $('#fxPause');
    const say = (t, p) => { cap.textContent = t; bar.style.transform = `scaleX(${p})`; };
    const typeTo = async (el, text, ok, sp, render) => {
      let b = '';
      for (const ch of text) { if (!ok()) break; b += ch; el.innerHTML = render(b) + '<i class="caret"></i>'; await sleep(sp + Math.random() * sp * 0.5); }
      return b;
    };
    const sqlHl = (c) => esc(c).replace(/(--[^\n]*)|('[^']*')|\b(CREATE|TABLE|PRIMARY|KEY|REFERENCES|NOT|NULL|VARCHAR|INT|SERIAL|TIMESTAMP|TEXT|DEFAULT|ALTER|ADD|FOREIGN|UNIQUE|NOW|INDEX|ON)\b/g,
      (m, c1, s, k) => c1 ? `<span class="c">${c1}</span>` : s ? `<span class="s">${s}</span>` : `<span class="k">${k}</span>`);
    const mkCur = (root) => {
      const c = E('<i class="vcur"></i>'); root.appendChild(c); c.style.transform = 'translate3d(30px,260px,0)';
      const to = async (el, ok) => {
        if (!el || !ok()) return false;
        const s = root.getBoundingClientRect(), r = el.getBoundingClientRect();
        c.style.transform = `translate3d(${r.left - s.left + r.width * 0.5}px,${r.top - s.top + r.height * 0.5}px,0)`; c.classList.add('on'); await sleep(720); return ok();
      };
      const tap = async (el, ok) => { if (!(await to(el, ok))) return false; c.classList.add('tap'); await sleep(160); c.classList.remove('tap'); await sleep(240); return ok(); };
      return { to, tap };
    };
    const svgNS = 'http://www.w3.org/2000/svg';

    const SC = {
      /* ---------- DATABASE: Skema, Relasi FK & Indexing ---------- */
      db: {
        title: 'schema_migration.sql · PostgreSQL 16',
        mount(b) {
          b.innerHTML = '<div class="fx-2"><pre class="fx-code"><code id="dbSql"></code></pre><div class="erd" id="erd"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div></div>';
          const T = [
            { id: 'users', x: 5, y: 7, c: ['id · SERIAL PK', 'nama · VARCHAR(80)', 'email · UNIQUE', 'role · VARCHAR(20)'], q: "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  nama VARCHAR(80) NOT NULL,\n  email VARCHAR(120) UNIQUE,\n  role VARCHAR(20) NOT NULL\n);\n\n" },
            { id: 'partnerships', x: 54, y: 7, c: ['id · SERIAL PK', 'user_id · INT FK', 'nomor_mou · UNIQUE', 'expired_at · DATE'], q: "CREATE TABLE partnerships (\n  id SERIAL PRIMARY KEY,\n  user_id INT NOT NULL,\n  nomor_mou VARCHAR(40) UNIQUE,\n  expired_at DATE NOT NULL\n);\n\n" },
            { id: 'documents', x: 54, y: 55, c: ['id · SERIAL PK', 'partner_id · INT FK', 'sha256_hash · CHAR(64)', 'created_at · TIMESTAMPTZ'], q: "CREATE TABLE documents (\n  id SERIAL PRIMARY KEY,\n  partner_id INT NOT NULL,\n  sha256_hash CHAR(64),\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\n" },
            { id: 'audit_logs', x: 5, y: 55, c: ['id · SERIAL PK', 'user_id · INT FK', 'doc_id · INT FK', 'action · VARCHAR(30)'], q: "CREATE TABLE audit_logs (\n  id SERIAL PRIMARY KEY,\n  user_id INT,\n  doc_id INT,\n  action VARCHAR(30) NOT NULL\n);\n\n" }
          ];
          const R = [
            ['users', 'partnerships', "-- Relasi & Index Performa\nALTER TABLE partnerships ADD FOREIGN KEY (user_id) REFERENCES users(id);\n"],
            ['partnerships', 'documents', "ALTER TABLE documents ADD FOREIGN KEY (partner_id) REFERENCES partnerships(id);\n"],
            ['documents', 'audit_logs', "ALTER TABLE audit_logs ADD FOREIGN KEY (doc_id) REFERENCES documents(id);\n"],
            ['audit_logs', 'users', "CREATE INDEX idx_partnerships_exp ON partnerships(expired_at);\n"]
          ];
          return async (ok) => {
            const sq = $('#dbSql', b), er = $('#erd', b), svg = $('svg', er), els = {}; let buf = '', n = 0; const tot = T.length + R.length;
            const type = async (txt) => { const pre = buf; const got = await typeTo(sq, txt, ok, 13, (s) => sqlHl(pre + s)); buf = pre + got; sq.innerHTML = sqlHl(buf); };
            const mid = (el) => { const r = el.getBoundingClientRect(), e = er.getBoundingClientRect(); return [(r.left + r.width / 2 - e.left) / e.width * 100, (r.top + r.height / 2 - e.top) / e.height * 100]; };
            for (const t of T) {
              if (!ok()) return; say(`DDL: Membuat tabel ${t.id}`, n++ / tot); await type(t.q);
              const el = E(`<div class="erd-t" style="left:${t.x}%;top:${t.y}%"><b>${t.id}</b>${t.c.map((x) => `<span>${x}</span>`).join('')}</div>`);
              er.appendChild(el); els[t.id] = el; await sleep(40); el.classList.add('in'); await sleep(460);
            }
            for (const [a, c, q] of R) {
              if (!ok()) return; say(`Constraint & Index: ${a} ↔ ${c}`, n++ / tot); await type(q);
              const [x1, y1] = mid(els[a]), [x2, y2] = mid(els[c]), ln = document.createElementNS(svgNS, 'line');
              [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2]].forEach(([k, v]) => ln.setAttribute(k, v)); svg.appendChild(ln); await sleep(40); ln.classList.add('on'); await sleep(800);
            }
            const okb = E('<span class="erd-ok">✓ 4 Tabel · 4 Relasi FK · B-Tree Index</span>'); er.appendChild(okb); await sleep(40); okb.classList.add('in');
            say('Skema tervalidasi & siap migrasi produksi', 1); await sleep(1600);
          };
        }
      },

      /* ---------- UI / UX: Wireframe, Design Tokens, Contrast & Dark Mode ---------- */
      ui: {
        title: 'Apple HIG Design System · Component Token',
        mount(b) {
          b.innerHTML = `<div class="fx-3"><aside class="ui-layers" id="uiL"></aside><div class="ui-canvas" id="uiC"><div class="ui-frame wf" id="uiF">
            <div class="uf uf-nav" data-n="Navbar Glass"><b>Nayura<span>.dev</span></b><i></i><i></i></div>
            <div class="uf uf-hero" data-n="Hero Section"><h5>Presisi dalam kode &amp; data.</h5><p>Arsitektur bersih, cepat, aksesibel.</p><span class="uf-btn">Eksplorasi</span></div>
            <div class="uf-row"><div class="uf uf-card" data-n="Card · 60fps"><i></i>60fps</div><div class="uf uf-card" data-n="Card · WCAG"><i></i>AAA</div><div class="uf uf-card" data-n="Card · Token"><i></i>Token</div></div>
            <span class="gd" style="top:3px;left:3px">12</span><span class="gd" style="top:44px;left:48%">8</span><span class="gd" style="top:102px;right:14px">16</span></div><div class="ui-sel" id="uiS"></div></div>
            <aside class="ui-props"><div class="pr"><small>Component</small><b id="p1">Frame</b></div><div class="pr"><small>Surface Token</small><b id="p2">#FFFFFF</b></div><div class="pr"><small>Contrast Ratio</small><b id="p3">16.1 : 1</b></div><div class="pr"><small>Typography</small><b id="p4">SF Pro · -0.03em</b></div></aside></div>`;
          return async (ok) => {
            const F = $('#uiF', b), L = $('#uiL', b), C = $('#uiC', b), S = $('#uiS', b), cur = mkCur(C), els = $$('.uf', F);
            const P = (...v) => v.forEach((t, i) => { $('#p' + (i + 1), b).textContent = t; });
            const sel = (el, ...p) => { const r = el.getBoundingClientRect(), c = C.getBoundingClientRect(); Object.assign(S.style, { opacity: 1, left: r.left - c.left - 3 + 'px', top: r.top - c.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' }); P(...p); };
            const lay = async (t) => { const l = E(`<div>${t}</div>`); L.appendChild(l); await sleep(40); l.classList.add('in'); return l; };
            await lay('▢ Root Frame'); say('Tahap 1: Wireframe struktur & hierarki', 0.1);
            for (const el of els) { if (!ok()) return; el.classList.add('show'); await lay('▢ ' + el.dataset.n); await sleep(340); }
            const hero = $('.uf-hero', F), lh = $$('div', L);
            say('Tahap 2: Menerapkan token monokrom & tipografi', 0.35); await cur.tap(hero, ok); lh[2].classList.add('sel'); sel(hero, 'Hero Section', 'Obsidian #1D1D1F', '16.1 : 1 (AAA)', 'SF Pro Display');
            await sleep(450); F.classList.remove('wf'); F.classList.add('hi'); await sleep(1000);
            const card = $('.uf-card', F); await cur.tap(card, ok); lh[2].classList.remove('sel'); lh[4].classList.add('sel'); sel(card, 'Metric Card', 'Glass #FFFFFF', '14.8 : 1 (AAA)', 'Tabular Nums'); await sleep(850);
            say('Tahap 3: Validasi grid 8pt & spacing sistem', 0.65); S.style.opacity = 0; F.classList.add('guides'); P('Grid System', '8pt / 12pt / 16pt', '100% Konsisten', 'Auto Layout'); await sleep(1500); F.classList.remove('guides');
            say('Tahap 4: Uji tema kontras tinggi (Dark Surface)', 0.85); await cur.tap($('.uf-btn', F), ok); F.classList.add('dark'); P('Dark Surface', '#141416', '15.4 : 1 (AAA)', 'Semantic Token'); await sleep(1600);
            say('Design system siap handoff ke produksi ✓', 1); await lay('✓ CSS Tokens Exported'); await sleep(1400);
          };
        }
      },

      /* ---------- REST API: request, status, response ---------- */
      api: {
        title: 'api_test.http · REST Client',
        mount(b) {
          b.innerHTML = '<div class="fx-2"><div class="term2" id="apT"></div><div class="qa-side"><div class="qa-sum"><div class="mini"><small>Status</small><b id="apS">—</b></div><div class="mini"><small>Waktu</small><b id="apM">—</b></div><div class="mini"><small>Ukuran</small><b id="apZ">—</b></div></div><pre class="fx-code" style="border-radius:12px;flex:1"><code id="apJ"></code></pre></div></div>';
          const R = [
            ['POST /api/v1/auth/login', '200 OK', '42 ms', '128 B', '{\n  "token": "eyJhbGciOi…",\n  "role": "Leader",\n  "expires_in": 3600\n}'],
            ['GET /api/v1/partnerships?status=aktif', '200 OK', '31 ms', '2.1 KB', '{\n  "total": 42,\n  "page": 1,\n  "data": [ … ]\n}'],
            ['POST /api/v1/documents  (tanpa token)', '401', '9 ms', '64 B', '{\n  "error": "Unauthorized",\n  "hint": "Sertakan Bearer token"\n}'],
            ['POST /api/v1/documents  (role Staff)', '403', '12 ms', '71 B', '{\n  "error": "Forbidden",\n  "need": "Legal"\n}'],
            ['GET /api/v1/reports/rekap.pdf', '200 OK', '187 ms', '86 KB', '%PDF-1.7\n% rekap_operasional.pdf\n… 1 halaman · ditandatangani']
          ];
          return async (ok) => {
            const T = $('#apT', b);
            for (let i = 0; i < R.length; i++) {
              if (!ok()) return; const [req, st, ms, sz, js] = R[i]; say(`REST · ${req}`, i / R.length);
              const row = E('<div></div>'); T.appendChild(row);
              await typeTo(row, req, ok, 20, (s) => `<span class="p">→</span> ${esc(s)}`); row.innerHTML = `<span class="p">→</span> ${esc(req)}`; await sleep(280);
              T.appendChild(E(`<div class="d">${st} · ${ms} · ${sz}</div>`)); while (T.children.length > 9) T.firstChild.remove();
              $('#apS', b).textContent = st; $('#apM', b).textContent = ms; $('#apZ', b).textContent = sz; $('#apJ', b).innerHTML = esc(js);
              await sleep(1100);
            }
            say('Semua endpoint & guard akses terverifikasi ✓', 1); await sleep(1600);
          };
        }
      },

      /* ---------- DEPLOY: CI/CD, Health Check, SSL & Zero-Downtime ---------- */
      deploy: {
        title: 'ci_cd_pipeline.sh · Linux Production Server',
        mount(b) {
          const CH = ['Git Push', 'Test & Build', 'DB Migrate', 'Zero-Downtime', 'TLS/SSL', 'Health 200'];
          b.innerHTML = `<div class="fx-2"><div class="term2" id="dpT"></div><div class="dp-side"><div class="dp-chips" id="dpC">${CH.map((x) => `<span>${x}</span>`).join('')}</div>
            <div class="dp-browser"><div class="dp-url" id="dpU"><i>🔒</i><span>https://sistem-mou.instansi.ac.id</span></div><div class="dp-page" id="dpP"><span>Menunggu pipeline CI/CD…</span></div></div><div class="dp-meta" id="dpM"></div></div></div>`;
          const ST = [
            ['git push origin main --tags', '→ tag v2.4.1 diterima · webhook CI aktif'],
            ['pytest -q && npm run build', '✔ 24 unit test lulus · bundle 142 KB (gzip)'],
            ['python manage.py migrate --check', '✔ 3 migrasi skema diterapkan aman'],
            ['systemctl reload gunicorn.service', '✔ worker reload · 0 dropped requests'],
            ['certbot renew --dry-run', '✔ TLS 1.3 aktif · sertifikat valid 89 hari'],
            ['curl -sI https://sistem-mou.instansi.ac.id/health', 'HTTP/2 200 OK · TTFB 48 ms · DB Connected']
          ];
          return async (ok) => {
            const T = $('#dpT', b), chips = $$('#dpC span', b);
            for (let i = 0; i < ST.length; i++) {
              if (!ok()) return; chips.forEach((c, k) => { c.className = k < i ? 'done' : k === i ? 'cur' : ''; }); say(`CI/CD · ${CH[i]}`, i / ST.length);
              if (i === 3) $('#dpP', b).innerHTML = '<span><i class="spin"></i>Rolling reload v2.4.1…</span>';
              const row = E('<div></div>'); T.appendChild(row);
              await typeTo(row, ST[i][0], ok, 24, (s) => `<span class="p">$</span> ${esc(s)}`); row.innerHTML = `<span class="p">$</span> ${esc(ST[i][0])}`; await sleep(340);
              T.appendChild(E(`<div class="d">${esc(ST[i][1])}</div>`)); while (T.children.length > 9) T.firstChild.remove(); await sleep(560);
            }
            chips.forEach((c) => { c.className = 'done'; }); chips[5].className = 'cur done'; $('#dpU', b).classList.add('ok');
            $('#dpP', b).innerHTML = '<div class="dp-live"><strong>Sistem Manajemen MoU / PKS</strong><small>Portal · Dashboard · Repositori · Notifikasi</small><div><span class="tag">● PRODUCTION LIVE</span></div></div>';
            $('#dpM', b).innerHTML = '<div>TTFB<b>48 ms</b></div><div>Uptime<b>99.98%</b></div><div>Release<b>v2.4.1</b></div>';
            say('Deployment selesai · Health check 200 OK ✓', 1); await sleep(1800);
          };
        }
      },

      /* ---------- QA: Automated Test Suite & Bug Patching ---------- */
      qa: {
        title: 'pytest --cov=app · UAT & Edge-Case Matrix',
        mount(b) {
          const TS = [
            'Auth: Brute-force & kredensial salah ditolak (401)',
            'RBAC: Operator diblokir akses approval Leader (403)',
            'Stok: Mutasi OUT > sisa stok ditolak otomatis',
            'Kalender: Input transaksi hari Minggu ditolak',
            'Integrity: Hash SHA-256 dokumen arsip terverifikasi',
            'Scheduler: Notifikasi H-30 masa berlaku MoU terkirim',
            'Upload: File > 5 MB atau non-PDF ditolak',
            'Report: Total rekap PDF cocok 100% dengan SQL'
          ];
          b.innerHTML = `<div class="fx-2"><div class="qa-list">${TS.map((t) => `<div class="qa-t"><i></i>${t}<em></em></div>`).join('')}</div><div class="qa-side">
            <div class="qa-sum"><div class="mini"><small>Lulus</small><b id="qP">0</b></div><div class="mini"><small>Gagal</small><b id="qF">0</b></div><div class="mini"><small>Coverage</small><b id="qC">0%</b></div></div>
            <div class="qa-bug" id="qB"><h6>BUG-218 · Edge case hari Minggu lolos</h6><div class="m">- if date.weekday() &gt; 6:</div><div class="a" id="qFix"></div><div class="d" id="qNote"></div></div></div></div>`;
          return async (ok) => {
            const rows = $$('.qa-t', b); let pass = 0, fail = 0;
            const upd = () => { countTo($('#qP', b), pass, 380); countTo($('#qF', b), fail, 380); };
            const mark = (r, cls, ic, txt) => { r.className = 'qa-t ' + cls; $('i', r).textContent = ic; $('em', r).textContent = txt; };
            for (let i = 0; i < rows.length; i++) {
              if (!ok()) return; say(`Menguji: ${TS[i]}`, i / 8); rows[i].className = 'qa-t run'; await sleep(500);
              if (i === 3) { mark(rows[i], 'fail', '✕', '400 != 200'); fail++; upd(); $('#qB', b).classList.add('in'); await sleep(850); }
              else { mark(rows[i], 'pass', '✓', Math.round(rnd(11, 78)) + ' ms'); pass++; upd(); }
            }
            say('Patching validasi weekday() == 6…', 0.88); await sleep(450);
            await typeTo($('#qFix', b), '+ if date.weekday() == 6:', ok, 35, (s) => esc(s)); await sleep(550);
            $('#qNote', b).textContent = 'Re-running regression test #4…'; rows[3].className = 'qa-t run'; await sleep(900);
            mark(rows[3], 'pass', '✓', '34 ms'); fail = 0; pass = 8; upd(); countTo($('#qC', b), 92, 1000, (v) => Math.round(v) + '%');
            $('#qNote', b).textContent = '✓ 8/8 Passed · Coverage 92% · Siap Rilis'; say('Semua skenario QA & UAT lulus ✓', 1); await sleep(1800);
          };
        }
      },

      /* ---------- LAPORAN DATA: Formula, KPI & Multi-Format Export ---------- */
      report: {
        title: 'rekap_operasional_q3.xlsx · Data & Pelaporan',
        mount(b) {
          const D = [['Produksi A', 120, 114], ['Produksi B', 95, 102], ['Gudang Utama', 140, 126], ['QC & Kalibrasi', 80, 86], ['Logistik', 110, 105]];
          b.innerHTML = `<div class="fx-2"><div class="xl"><div class="xl-bar"><em>fx</em><span id="xF"></span></div>
            <table class="xl-t"><thead><tr><th></th><th>Divisi</th><th>Target</th><th>Realisasi</th><th>Capaian</th></tr></thead><tbody>${D.map((r, i) => `<tr><td>${i + 2}</td><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="pc">–</td></tr>`).join('')}<tr class="tot"><td>7</td><td>Total KPI</td><td id="xT">–</td><td id="xR">–</td><td id="xP">–</td></tr></tbody></table>
            <p class="xl-note">Rekap otomatis · Validasi silang SQL → Excel/Sheets</p></div>
            <div class="xr"><small class="xr-h">Visualisasi Capaian Divisi</small><div class="xl-bars">${D.map((r) => `<div><i></i><small>${r[0].slice(0, 4)}</small></div>`).join('')}</div>
            <div class="xl-out"><span>Excel · Rekap.xlsx</span><span>Word · BeritaAcara.docx</span><span>PPT · Eksekutif.pptx</span></div></div></div>`;
          return async (ok) => {
            const F = $('#xF', b), rows = $$('tbody tr:not(.tot)', b), bars = $$('.xl-bars i', b), outs = $$('.xl-out span', b);
            say('Menghitung rasio capaian per divisi', 0.08); await typeTo(F, '=ROUND((D2/C2)*100, 1)', ok, 50, (s) => esc(s)); await sleep(280);
            for (let i = 0; i < D.length; i++) {
              if (!ok()) return; const pc = Math.round(D[i][2] / D[i][1] * 100);
              F.textContent = `=ROUND((D${i + 2}/C${i + 2})*100, 1)`; $('.pc', rows[i]).innerHTML = `<span class="tag ${pc >= 100 ? '' : 'out'}">${pc}%</span>`;
              bars[i].style.height = Math.min(pc, 130) / 130 * 100 + '%'; bars[i].style.transform = 'scaleY(1)'; say(`Divisi ${D[i][0]}: ${pc}% dari target`, 0.14 + i * 0.1); await sleep(500);
            }
            const tT = D.reduce((a, r) => a + r[1], 0), tR = D.reduce((a, r) => a + r[2], 0);
            say('Agregasi total KPI & penyusunan dokumen', 0.72); F.innerHTML = ''; await typeTo(F, '=SUM(D2:D6)/SUM(C2:C6)', ok, 36, (s) => esc(s));
            $('#xT', b).textContent = tT; $('#xR', b).textContent = tR; $('#xP', b).innerHTML = `<span class="tag">${Math.round(tR / tT * 100)}%</span>`; await sleep(650);
            for (const o of outs) { if (!ok()) return; o.classList.add('run'); say(`Menyusun ${o.textContent.split(' · ')[0]}…`, 0.86); await sleep(580); o.classList.remove('run'); o.classList.add('on'); o.textContent = '✓ ' + o.textContent; }
            say('Paket laporan manajemen siap didistribusikan ✓', 1); await sleep(1800);
          };
        }
      }
    };

    const NEXT = { db: 'ui', ui: 'api', api: 'deploy', deploy: 'qa', qa: 'report', report: 'db' };
    async function start(k) {
      key = k; ended = false; const id = ++rid;
      tabs.forEach((t) => { const on = t.dataset.fx === k; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
      ttl.textContent = SC[k].title; say('Menyiapkan…', 0);
      fxBody.innerHTML = ''; fxBody.style.animation = 'none'; void fxBody.offsetWidth; fxBody.style.animation = '';
      const play = SC[k].mount(fxBody), ok = () => id === rid && vis && !document.hidden;
      await sleep(450); if (!ok()) return;
      try { await play(ok); } catch (e) {}
      if (!ok()) return; await sleep(1400); if (!ok()) return; if (paused) { ended = true; return; } start(NEXT[k]);
    }
    tabs.forEach((t) => t.addEventListener('click', () => start(t.dataset.fx)));
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => {
      vis = en.isIntersecting;
      if (vis) { if (reduceMotion) { if (!fxBody.firstChild) fxBody.innerHTML = '<p class="fx-idle">Animasi otomatis dimatikan. Pilih tab untuk memutarnya.</p>'; } else start(key); } else rid++;
    }, { threshold: 0.25 }).observe($('#fxSim'));
    fxPause.addEventListener('click', () => {
      paused = !paused; fxPause.textContent = paused ? 'Putar' : 'Jeda'; fxPause.setAttribute('aria-pressed', paused);
      if (!paused && ended && vis) start(NEXT[key]);
    });
    if (paused) { fxPause.textContent = 'Putar'; fxPause.setAttribute('aria-pressed', 'true'); }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !reduceMotion) start(key); });
  }

  /* ======================================================================
     3. AI AUTOMATION LITE — Tidak jalan otomatis (Manual Trigger oleh User)
     Normalisasi slang/typo, pahami konteks ketersediaan vs tawaran rekrutmen,
     arahkan kontak hanya lewat email (tanpa nomor WA), sapa balik dinamis,
     jelaskan alasan desain web, dan batasi tegas topik di luar cakupan.
     ====================================================================== */
  const aiSim = $('#aiSim');
  if (aiSim) {
    const A = {
      text: $('#aiText'), view: $('#aiView'), src: $('#aiSrc'), rail: $('#aiStages'),
      st: $$('#aiStages .ai-st'), json: $('#aiJson'), act: $('#aiAct'), reply: $('#aiReply'),
      rtxt: $('#aiReplyTxt'), cap: $('#aiCap'), bar: $('#aiBar'), run: $('#aiRun'),
      time: $('#aiTime'), route: $('#aiRoute'), chips: $$('[data-ai]')
    };
    const MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const IDLE = ['Menunggu perintah user…', 'Membaca maksud & konteks', 'Mengambil entitas penting', 'Mengecek batas pengetahuan', 'Menyusun respons'];
    const fmtDate = (d) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
    const longDate = (d) => `${HARI[d.getDay()]}, ${fmtDate(d)}`;
    const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const plus = (n) => { const d = today(); d.setDate(d.getDate() + n); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return d; };

    const SAMPLES = {
      pembuat: { src: 'Contoh · Profil Pembuat', text: 'Halo! Sistem portofolio ini keren banget, siapa pembuatnya dan lulusan mana?' },
      skill: { src: 'Contoh · Keahlian', text: 'Nayura menguasai bahasa pemrograman, framework, dan tools pelaporan apa saja?' },
      proyek: { src: 'Contoh · Proyek & Skripsi', text: 'Boleh ceritakan soal skripsi dan proyek yang pernah dikerjakan Nayura?' },
      web: { src: 'Contoh · Tentang Web', text: 'Web ini dibangun pakai apa aja, dan kok tampilannya dibuat begini aja?' },
      tawaran: { src: 'Contoh · Ketersediaan', text: 'Apakah Nayura masih terbuka untuk peluang kerja di perusahaan?' },
      lembur: { src: 'Contoh · Otomasi Kerja', text: `Halo Pak, saya Rina Wulandari dari tim Produksi. Mohon izin lembur 3 jam pada ${fmtDate(plus(2))} untuk rekap stok.` },
      diluar: { src: 'Contoh · Di Luar Topik', text: 'Tolong buatkan resep nasi goreng spesial dan prediksi cuaca besok di Tokyo.' }
    };

    const grab = (re, t) => { const m = re.exec(t); if (!m) return null; const g = m[1], s = m.index + m[0].indexOf(g); return { v: g.trim(), s, e: s + g.length }; };
    const parseDates = (t) => {
      const out = [], re = new RegExp(`(\\d{1,2})\\s+(${MON.join('|')})\\s+(\\d{4})`, 'gi'); let m;
      while ((m = re.exec(t))) out.push({ s: m.index, e: m.index + m[0].length, d: new Date(+m[3], MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase()), +m[1]) });
      const rel = /\b(hari ini|besok|lusa)\b/i.exec(t);
      if (rel) out.push({ s: rel.index, e: rel.index + rel[0].length, d: plus({ 'hari ini': 0, besok: 1, lusa: 2 }[rel[1].toLowerCase()]) });
      return out.sort((a, b) => a.s - b.s);
    };

    const BAD = ['anjing', 'anjir', 'bangsat', 'bajingan', 'brengsek', 'sialan', 'kampret', 'tolol', 'goblok', 'bodoh', 'bego', 'idiot', 'babi', 'tai', 'asu', 'kontol', 'memek', 'jancok', 'fuck', 'shit', 'bitch', 'stupid'];
    const BADRE = new RegExp('\\b(' + BAD.map((w) => w.split('').map((c) => c + '+').join('')).join('|') + ')\\b', 'i');

    // Normalisasi bahasa gaul, singkatan, dan typo umum agar pemahaman intent lebih akurat
    const SLANG = [
      [/\b(ga|gak|ngga|nggak|gk|tdk|bkn)\b/g, 'tidak'],
      [/\b(udh|ud|udah|sdh)\b/g, 'sudah'],
      [/\b(blm|blom)\b/g, 'belum'],
      [/\b(bgt|bngt)\b/g, 'banget'],
      [/\b(gmn|gmna|gimana|bgmn)\b/g, 'bagaimana'],
      [/\b(knp|napa|kenpa)\b/g, 'kenapa'],
      [/\b(bkin|bikinin|bikin)\b/g, 'buat'],
      [/\b(pake|pk)\b/g, 'pakai'],
      [/\b(dgn|dg)\b/g, 'dengan'],
      [/\b(utk|u\/)\b/g, 'untuk'],
      [/\b(yg)\b/g, 'yang'],
      [/\b(dr)\b/g, 'dari'],
      [/\b(krn|karena)\b/g, 'karena'],
      [/\b(skrg|skg)\b/g, 'sekarang'],
      [/\b(org|orng)\b/g, 'orang'],
      [/\b(bgs|bagus)\b/g, 'bagus'],
      [/\b(pinter|pinteran|pintar)\b/g, 'cerdas'],
      [/\b(kyk|kayak|kek)\b/g, 'seperti']
    ];

    function normalizeText(low) {
      let s = ' ' + low.replace(/[^a-z0-9@.\s-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
      for (const [re, rep] of SLANG) s = s.replace(re, ' ' + rep + ' ');
      return ' ' + s.replace(/\s+/g, ' ').trim() + ' ';
    }

    function buildGreetingPrefix(low) {
      if (/\bselamat pagi\b/.test(low)) return 'Selamat pagi! ';
      if (/\bselamat siang\b/.test(low)) return 'Selamat siang! ';
      if (/\bselamat sore\b/.test(low)) return 'Selamat sore! ';
      if (/\bselamat malam\b/.test(low)) return 'Selamat malam! ';
      if (/\bassalamualaikum\b/.test(low)) return 'Waalaikumsalam! ';
      if (/\b(halo|hai|hi|hello|hey|hallo|permisi)\b/.test(low)) {
        const h = wib().getUTCHours();
        if (h >= 4 && h < 11) return 'Halo, selamat pagi! ';
        if (h >= 11 && h < 15) return 'Halo, selamat siang! ';
        if (h >= 15 && h < 18) return 'Halo, selamat sore! ';
        return 'Halo, selamat malam! ';
      }
      return '';
    }

    function checkRoleFit(low) {
      const offRole = /\b(chef|koki|masak|barista|kasir|akuntan|akuntansi|pajak|desainer grafis|illustrator|video editor|fotografer|dokter|perawat|apoteker|guru|dosen|pengacara|hukum|sales|marketing|telemarketing|kurir|driver|sopir|satpam|security|cleaning|gudang|operator mesin|produksi)\b/i;
      const inRole = /\b(software|engineer|developer|programmer|web|backend|frontend|fullstack|full-stack|full stack|data|analyst|analytics|reporting|report|bi|business intelligence|sql|python|django|laravel|it |staff it|qa|quality assurance|system)\b/i;
      const hitOff = offRole.exec(low);
      const hitIn = inRole.exec(low);
      if (hitOff && !hitIn) return { fit: 'mismatch', roleName: hitOff[0] };
      if (!hitIn && /\b(posisi|role|lowongan|rekrut|tawar|nawarin|menawarkan|bergabung|melamar|kandidat)\b/i.test(low)) {
        return { fit: 'check_scope' };
      }
      return { fit: 'aligned' };
    }

    const KB = [
      { id: 'tawaran_kerja', label: 'Ketersediaan & Peluang Kerja',
        kw: ['nganggur', 'terbuka', 'open to work', 'nyari kerja', 'cari kerja', 'available', 'peluang kerja', 'tawar', 'nawarin', 'menawarkan', 'posisi', 'lowongan', 'rekrut', 'hiring', 'vacancy', 'karir', 'karier', 'bergabung', 'wawancara', 'interview', 'kandidat', 'bersedia', 'recruit', 'join tim', 'terbuka untuk', 'cocok untuk', 'sibuk apa'],
        reply: (co, low, greet) => {
          const inst = co ? ` dari ${co.v}` : '';
          const fit = checkRoleFit(low);
          const isIdleQuery = /\bnganggur\b/i.test(low);
          const isRecruiterPitch = /\b(kami\s+dari|saya\s+dari|menawarkan|nawarin|ngajak|mengundang|invite|wawancara|interview)\b/i.test(low) || Boolean(co);

          if (isIdleQuery) {
            return `${greet}Nayura tetap aktif berkarya dan mengasah kemampuannya—baik lewat proyek maupun pengembangan diri—dan beliau masih terbuka untuk peluang kerja di perusahaan (full-time, hybrid, maupun remote) di bidang software engineering (web & aplikasi desktop), pengolahan/analisis data, serta pelaporan/dokumentasi. Kalau ada peluang atau ingin berdiskusi, kamu bisa hubungi lewat email ke arsinedanayura@gmail.com.`;
          }
          if (fit.fit === 'mismatch') {
            return `${greet}Kalau untuk peran ${fit.roleName}${inst}, sepertinya kurang sesuai dengan jalur utama Nayura—fokusnya ada di pengembangan software (web & aplikasi desktop), pengolahan/analisis data, serta pelaporan/dokumentasi. Kalau ada peluang yang nyambung ke area tersebut, Nayura terbuka untuk berdiskusi (full-time, hybrid, maupun remote). Kamu bisa hubungi lewat email ke arsinedanayura@gmail.com.`;
          }
          if (!isRecruiterPitch) {
            return `${greet}Ya, Nayura masih terbuka untuk peluang kerja di perusahaan—baik full-time, hybrid, maupun remote—terutama di bidang yang sesuai fokusnya: software engineering (web & aplikasi desktop), pengolahan/analisis data, serta pelaporan/dokumentasi. Jika tertarik berdiskusi lebih lanjut, kamu bisa hubungi lewat email ke arsinedanayura@gmail.com.`;
          }
          if (fit.fit === 'check_scope') {
            return `${greet}Nayura terbuka untuk peluang kerja di perusahaan${inst} (full-time, hybrid, maupun remote), khususnya di area software engineering, pengolahan/analisis data, dan pelaporan/dokumentasi. Jika perannya sesuai dengan fokus tersebut, kamu bisa hubungi langsung lewat email ke arsinedanayura@gmail.com.`;
          }
          return `${greet}Posisi tersebut sejalan dengan fokus Nayura di software engineering (web & aplikasi desktop), data, serta pelaporan/dokumentasi, dan beliau terbuka untuk peluang full-time, hybrid, maupun remote${inst}. Untuk diskusi lebih lanjut, kamu bisa hubungi lewat email ke arsinedanayura@gmail.com.`;
        },
        sug: ['Apa saja keahlian Nayura?', 'Ceritakan proyek yang pernah dikerjakan', 'Bagaimana cara menghubungi Nayura?'] },
      { id: 'tanya_pembuat', label: 'Tentang Pembuat (Nayura)',
        kw: ['siapa pembuat', 'siapa yang buat', 'siapa yang bikin', 'siapa yang bangun', 'siapa nayura', 'tentang nayura', 'pembuat', 'pencipta', 'developer', 'programmer', 'dibuat oleh', 'dibikin', 'profil', 'biodata', 'pemilik', 'latar belakang'],
        reply: (_co, _low, greet) => `${greet}Web portofolio ini dibuat sendiri oleh Nayura Arsineda, S.Kom, lulusan S1 Teknik Informatika ITN Malang (2026) dengan IPK 3,50, berdomisili di Cakung Timur, Jakarta Timur. Fokus utamanya di pengembangan software (web & desktop), pengolahan/analisis data, serta penyusunan laporan & dokumentasi kerja yang terstruktur.`,
        sug: ['Apa saja keahlian Nayura?', 'Ceritakan proyek yang pernah dikerjakan', 'Apakah Nayura masih terbuka untuk perusahaan?'] },
      { id: 'tanya_skill', label: 'Keahlian & Tech Stack',
        kw: ['skill', 'keahlian', 'kemampuan', 'bisa apa', 'tech stack', 'teknologi apa', 'bahasa pemrograman', 'framework', 'django', 'laravel', 'excel', 'sql', 'python', 'javascript', 'typescript', 'angular', 'database', 'postgres', 'mysql', 'git ', 'menguasai', 'jago', 'melenceng', 'fokus', 'koding', 'coding'],
        reply: (_co, _low, greet) => `${greet}Fokus kemampuan Nayura mencakup software, data, dan pelaporan: HTML5, CSS3, JavaScript (ES6+), TypeScript (pola komponen Angular), Python, Django, dan Laravel, dengan database PostgreSQL & MySQL. Di sisi data & operasional, beliau terbiasa mengolah data, analisis/Decision Tree, rekap rutin, serta menyusun laporan di Excel, Google Sheets, Word, Google Docs, dan PowerPoint.`,
        sug: ['Ceritakan proyek yang pernah dikerjakan', 'Apakah Nayura masih terbuka untuk perusahaan?', 'Web ini dibangun pakai apa aja?'] },
      { id: 'tanya_proyek', label: 'Proyek & Pengalaman',
        kw: ['pengalaman', 'proyek', 'project', 'portofolio', 'portfolio', 'pernah kerja', 'kerja dimana', 'karya', 'asahi', 'lpku', 'mou', 'pks', 'forecast', 'company profile', 'magang', 'skripsi', 'decision tree', 'tugas akhir', 'analisis risiko', 'spk', 'riwayat kerja'],
        reply: (_co, _low, greet) => `${greet}Proyek & pengalaman utama Nayura meliputi: (1) Skripsi SPK analisis risiko kerja sama & kemitraan perguruan tinggi berbasis Decision Tree di LPKU ITN Malang, (2) Sistem Manajemen Kerja Sama MoU/PKS (portal, dashboard, notifikasi masa berlaku, repositori, UAT & deployment), (3) Website Company Profile LPKU ITN Malang, (4) Aplikasi Desktop Monitoring Forecast Barang di PT. Asahi Best Base Indonesia (login Operator/Leader, CRUD IN/OUT, validasi, tanda tangan & cetak PDF), dan (5) Optimasi frontend company profile.`,
        sug: ['Apa saja keahlian Nayura?', 'Apakah Nayura masih terbuka untuk perusahaan?', 'Web ini dibangun pakai apa aja?'] },
      { id: 'tanya_pendidikan', label: 'Pendidikan & Sertifikasi',
        kw: ['kuliah', 'kampus', 'ipk', 'lulusan', 'pendidikan', 'universitas', 'itn', 'malang', 'msib', 'dicoding', 'sertifikat', 'sertifikasi', 'sma ', 'pelatihan', 'sekolah', 'wisuda', 'gelar'],
        reply: (_co, _low, greet) => `${greet}Nayura menempuh pendidikan di SMAN 115 Jakarta Utara (IPA) lalu lulus S1 Teknik Informatika ITN Malang tahun 2026 dengan IPK 3,50. Beliau juga mengikuti Studi Independen MSIB Batch 7 (International Software Engineer Diploma — Python Web Developer: Django, PostgreSQL & MySQL), kursus Dicoding (Basic Website & JavaScript), serta memiliki 12 sertifikat yang dapat dilihat langsung di bagian Sertifikasi.`,
        sug: ['Apa saja keahlian Nayura?', 'Ceritakan proyek yang pernah dikerjakan', 'Bagaimana cara menghubungi Nayura?'] },
      { id: 'tanya_kontak', label: 'Kontak & Domisili',
        kw: ['kontak', 'hubungi', 'menghubungi', 'email', 'nomor telepon', 'nomor kontak', 'linkedin', 'instagram', 'ig ', 'domisili', 'tinggal', 'lokasi', 'alamat', 'jakarta', 'cakung', 'cv'],
        reply: (_co, _low, greet) => `${greet}Nayura berdomisili di Cakung Timur, Jakarta Timur. Kamu bisa hubungi lewat email ke arsinedanayura@gmail.com, atau lihat profilnya di LinkedIn (nayuraarsineda) dan Instagram (@n.arssineda). Di bagian atas halaman juga tersedia tombol Unduh CV.`,
        sug: ['Apakah Nayura masih terbuka untuk perusahaan?', 'Apa saja keahlian Nayura?'] },
      { id: 'tanya_web', label: 'Tentang Web Portofolio Ini',
        kw: ['web ini', 'website ini', 'situs ini', 'fitur', 'demo', 'animasi', 'cara kerja', 'dibangun', 'dibuat pakai', 'pake apa', 'pakai apa', 'kok gitu', 'kok gtu', 'kenapa begini', 'kenapa gini', 'monokrom', 'polos', 'sederhana', 'vanilla', 'responsif', 'teknologi web', 'tampilan'],
        reply: (_co, _low, greet) => `${greet}Web portofolio ini dibangun menggunakan HTML5, CSS3, dan JavaScript murni (dengan pola reactive signal ala Angular Signals), tanpa framework berat. Tampilannya sengaja dibuat bersih dan monokrom agar tenang, rapi, dan fokus ke isi serta interaksi nyata—seperti 3 demo perangkat (Desktop Forecast, Mobile Karyawan, Web Administrasi), simulasi alur Full-Stack dari database sampai laporan, galeri 12 sertifikat PDF, dan AI Automation Lite ini.`,
        sug: ['Kamu itu siapa dan bagaimana cara kerjamu?', 'Siapa pembuat web ini?', 'Ceritakan proyek yang pernah dikerjakan'] },
      { id: 'tanya_ai', label: 'Tentang AI Automation Lite',
        kw: ['kamu siapa', 'siapa kamu', 'lo siapa', 'kamu itu', 'ai automation', 'chatbot', 'asisten', 'chatgpt', 'pakai ai', 'pinter', 'pintar', 'cerdas', 'automation', 'kok jawab', 'kenapa jawab', 'tes dulu'],
        reply: (_co, _low, greet) => `${greet}Aku AI Automation Lite di web portofolio Nayura. Aku jalan langsung di browser saat tombol Jalankan ditekan, dan dirancang khusus untuk menjawab seputar profil Nayura, keahlian, proyek/skripsi, ketersediaan kerja, serta isi & desain web ini. Jika ada pertanyaan di luar cakupan tersebut, aku akan terus terang menyampaikan batasan pengetahuanku.`,
        sug: ['Apakah Nayura masih terbuka untuk perusahaan?', 'Siapa pembuat web ini?', 'Web ini dibangun pakai apa aja?'] },
      { id: 'sapaan', label: 'Sapaan Ramah', short: true,
        kw: ['halo', 'hai ', 'hi ', 'hello', 'hey', 'hallo', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'permisi', 'pagi', 'siang', 'sore', 'malam'],
        reply: (_co, _low, greet) => `${greet || 'Halo! '}Ada yang ingin ditanyakan? Kamu bisa tanya soal Nayura, apakah masih terbuka untuk perusahaan, keahliannya, proyek/skripsinya, hingga alasan desain web portofolio ini.`,
        sug: ['Apakah Nayura masih terbuka untuk perusahaan?', 'Siapa pembuat web ini?', 'Web ini dibangun pakai apa aja?'] },
      { id: 'terima_kasih', label: 'Ucapan Terima Kasih', short: true,
        kw: ['terima kasih', 'makasih', 'thanks', 'thx', 'mantap', 'keren', 'sip', 'oke'],
        reply: (_co, _low, greet) => `${greet}Sama-sama! Jika masih ada yang ingin ditanyakan seputar Nayura atau web portofolio ini, silakan tanyakan saja.`,
        sug: ['Bagaimana cara menghubungi Nayura?', 'Ceritakan proyek yang pernah dikerjakan'] }
    ];

    const OUT_OF_SCOPE_REPLY = 'Maaf, pengetahuan saya terbatas pada profil Nayura Arsineda, keahliannya (software engineering, pengolahan/analisis data, dan pelaporan), proyek/skripsinya, ketersediaan kerja, serta isi dan fitur web portofolio ini saja. Untuk topik di luar itu saya belum bisa menjawab—silakan tanyakan hal seputar Nayura atau web ini.';

    function analyze(text) {
      const low = text.toLowerCase();
      const norm = normalizeText(low);
      const greet = buildGreetingPrefix(low);
      const bad = BADRE.exec(text);
      if (bad) {
        return {
          cat: 'moderasi', label: 'Teguran Ramah', conf: 0.98, pct: 98,
          fields: [{ key: 'intent', v: 'Bahasa kurang sopan', j: '"moderasi"' }],
          rules: [[true, 'Maksud terdeteksi'], [false, 'Bahasa kurang sopan — gunakan bahasa ramah']],
          route: 'review',
          acts: ['Tahan pemrosesan pesan', 'Kirim pengingat sopan ke pengguna'],
          reply: `${greet}Santai dulu yuk—lebih enak diskusi pakai bahasa yang sopan ya. Kalau ingin bertanya seputar Nayura atau web portofolio ini, silakan!`,
          len: text.length
        };
      }

      // Cek apakah pesan adalah input operasional (contoh lembur)
      if (/\blembur\b/i.test(norm) && /\b\d{1,2}\s*jam\b/i.test(norm)) {
        const nm = grab(/\b[Ss]aya\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/, text);
        const un = grab(/\bdari\s+(?:tim\s+|bagian\s+|divisi\s+)?([A-Z][a-z]+)/, text);
        const dur = grab(/(?:^|[^\d])(\d{1,2})\s*jam\b/i, text);
        const dates = parseDates(text);
        const fields = [];
        const addF = (key, g, val, disp) => { if (g) fields.push({ key, v: disp || g.v, j: JSON.stringify(val != null ? val : g.v) }); };
        addF('nama', nm);
        addF('unit', un);
        if (dates[0]) addF('tanggal', { v: iso(dates[0].d) }, iso(dates[0].d), longDate(dates[0].d));
        if (dur) addF('durasi_jam', dur, +dur.v, dur.v + ' jam');
        const ref = hash(text).slice(0, 4).toUpperCase();
        return {
          cat: 'operasional_lembur', label: 'Otomasi · Pengajuan Lembur', conf: 0.95, pct: 95, fields,
          rules: [[true, 'Format pesan operasional dikenali'], [true, 'Entitas nama & durasi valid'], [true, 'Siap diteruskan ke rekap']],
          route: 'auto',
          acts: [`Catat ke Rekap Lembur: ${nm ? nm.v : 'Karyawan'} (${dur ? dur.v + ' jam' : '-'})`, `Buat tiket approval #LB-${ref}`],
          reply: `${greet}Pengajuan lembur${nm ? ' atas nama ' + nm.v : ''}${dur ? ' selama ' + dur.v + ' jam' : ''} sudah berhasil diekstrak menjadi data terstruktur (#LB-${ref}).`,
          len: text.length
        };
      }

      // Scoring intent setelah normalisasi slang & typo
      const words = norm.trim().split(' ').length;
      const hits = KB.map((k) => {
        let sc = 0;
        k.kw.forEach((w) => {
          const nw = normalizeText(w).trim();
          if (norm.includes(' ' + nw)) sc += nw.includes(' ') ? 3.5 : nw.length > 3 ? 2 : 1.2;
        });
        if (k.short && words > 8) sc = 0;
        return { k, sc };
      }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc);

      if (hits.length) {
        const top = hits[0], k = top.k, sec = hits.find((x) => x !== top && x.sc >= 2 && !x.k.short && !k.short);
        const co = grab(/\b((?:PT|CV)\.?\s+[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)/, text);
        const fields = [{ key: 'topik', v: k.label, j: JSON.stringify(k.id) }];
        if (co) fields.push({ key: 'instansi', v: co.v, j: JSON.stringify(co.v) });
        if (sec) fields.push({ key: 'topik_tambahan', v: sec.k.label, j: JSON.stringify(sec.k.id) });
        const conf = Math.min(0.99, 0.65 + top.sc * 0.06);
        return {
          cat: k.id, label: k.label, conf, pct: Math.round(conf * 100), fields,
          rules: [[true, 'Topik terdeteksi dalam cakupan portofolio'], [true, 'Data terverifikasi dari profil Nayura Arsineda'], [true, 'Respons siap ditampilkan']],
          route: 'auto',
          acts: [`Ambil konteks dari basis pengetahuan: ${k.label}`, sec ? `Catat topik tambahan: ${sec.k.label}` : 'Susun jawaban sesuai konteks'],
          reply: k.reply(co, norm, greet) + (sec ? ` Jika ingin membahas juga soal ${sec.k.label.toLowerCase()}, silakan tanyakan saja.` : ''),
          sug: k.sug, len: text.length
        };
      }

      // Di luar cakupan pembuat & web ini -> sapa balik jika ada sapaan, lalu batasi dengan jelas
      return {
        cat: 'out_of_scope', label: 'Di Luar Cakupan Pengetahuan', conf: 0.35, pct: 35,
        fields: [],
        rules: [
          [true, 'Pesan berhasil dibaca'],
          [false, 'Topik berada di luar profil Nayura & isi web ini'],
          [true, 'Aktifkan guardrail batasan pengetahuan']
        ],
        route: 'review',
        acts: ['Deteksi pertanyaan di luar pengetahuan sistem', 'Kirim jawaban pembatasan pengetahuan yang jelas'],
        reply: `${greet}${OUT_OF_SCOPE_REPLY}`,
        sug: ['Apakah Nayura masih terbuka untuk perusahaan?', 'Siapa pembuat web ini?', 'Web ini dibangun pakai apa aja?'],
        len: text.length
      };
    }

    let rid = 0;
    const say = (t, p) => { A.cap.textContent = t; A.bar.style.transform = `scaleX(${p})`; };
    const stage = (i, state, html) => {
      const li = A.st[i]; li.className = 'ai-st ' + state;
      $('.ai-ic', li).textContent = state === 'done' ? '✓' : state === 'warn' ? '!' : '';
      if (html != null) $('small', li).innerHTML = html;
      A.rail.style.setProperty('--p', ((i + (state === 'run' ? 0.5 : 1)) / 5).toFixed(2));
    };
    const jl = (k, j, last) => `  <span class="k">"${k}"</span>: <span class="${j[0] === '"' ? 's' : 'n'}">${esc(j)}</span>${last ? '' : ','}`;
    const addJ = (html) => { const d = document.createElement('div'); d.innerHTML = html; A.json.appendChild(d); };
    const typeInto = async (el, text, ok, ms, setter) => {
      let b = '';
      for (const ch of text) { if (!ok()) return false; b += ch; setter(b); await sleep(ms + Math.random() * ms * 0.4); }
      return true;
    };

    const sugEl = document.createElement('div'); sugEl.className = 'ai-sug'; A.reply.appendChild(sugEl);
    function renderSug(list) {
      sugEl.innerHTML = '';
      (list || []).forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.animationDelay = (i * 70) + 'ms';
        b.addEventListener('click', () => { rid++; resetUI(); setChip(''); A.src.textContent = 'Saran lanjutan'; A.text.value = t; say('Prompt siap. Tekan “Jalankan automation” untuk melihat hasilnya.', 0); A.text.focus(); });
        sugEl.appendChild(b);
      });
    }
    function resetUI() {
      sugEl.innerHTML = '';
      A.st.forEach((li, i) => { li.className = 'ai-st'; $('.ai-ic', li).textContent = ''; $('small', li).textContent = IDLE[i]; });
      $('.ai-rules', A.st[3]).innerHTML = '';
      A.rail.style.setProperty('--p', 0); A.json.innerHTML = ''; A.act.innerHTML = ''; A.act.className = 'ai-ax';
      A.reply.classList.remove('on'); A.rtxt.textContent = ''; A.time.textContent = '—';
      A.route.textContent = ''; A.route.className = '';
      if (A.view) { A.view.hidden = true; A.view.innerHTML = ''; }
      A.text.hidden = false; A.run.disabled = false;
    }

    const setChip = (k) => A.chips.forEach((c) => { const on = c.dataset.ai === k; c.classList.toggle('is-active', on); c.setAttribute('aria-selected', on); });

    async function runPipe() {
      const id = ++rid;
      const ok = () => id === rid;
      const text = A.text.value.trim();
      if (!text) { say('Ketik pertanyaanmu dulu ya 🙂', 0); return; }

      resetUI(); A.run.disabled = true;
      const t0 = performance.now(), R = analyze(text), ms = performance.now() - t0;

      say('Membaca prompt dari user…', 0.1); stage(0, 'run', 'Memproses teks input'); await sleep(320); if (!ok()) return;
      stage(0, 'done', `${R.len} karakter diterima`); addJ('{'); await sleep(200);

      say('Mendeteksi maksud & konteks…', 0.3); stage(1, 'run', 'Analisis intent'); await sleep(520); if (!ok()) return;
      stage(1, R.cat === 'out_of_scope' ? 'warn' : 'done', `${R.label} · ${R.pct}%<span class="ai-meter"><i></i></span>`);
      requestAnimationFrame(() => { const i = $('.ai-meter i', A.st[1]); if (i) i.style.transform = `scaleX(${R.conf})`; });
      addJ(jl('intent', JSON.stringify(R.cat), false)); addJ(jl('confidence', R.conf.toFixed(2), false)); await sleep(350); if (!ok()) return;

      say('Mengekstrak informasi…', 0.5); stage(2, 'run', 'Mencocokkan entitas');
      for (let i = 0; i < R.fields.length; i++) {
        await sleep(240); if (!ok()) return;
        const f = R.fields[i];
        addJ(jl(f.key, f.j, false));
      }
      stage(2, R.fields.length ? 'done' : 'warn', R.fields.length ? `${R.fields.length} entitas ditemukan` : 'Tidak ada entitas spesifik');

      say('Memeriksa batasan pengetahuan…', 0.72); stage(3, 'run', 'Validasi cakupan');
      const ul = $('.ai-rules', A.st[3]);
      for (const [pass, t] of R.rules) {
        await sleep(260); if (!ok()) return;
        const li = document.createElement('li'); li.textContent = t; if (!pass) li.className = 'bad'; ul.appendChild(li);
      }
      stage(3, R.route === 'auto' ? 'done' : 'warn', R.route === 'auto' ? 'Dalam cakupan pengetahuan' : 'Di luar cakupan / perlu perhatian');
      addJ(jl('status', JSON.stringify(R.route === 'auto' ? 'terjawab' : 'dibatasi_ramah'), true)); addJ('}');
      A.route.textContent = R.route === 'auto' ? '✓ dalam cakupan' : '! di luar cakupan';
      A.route.className = R.route; await sleep(320); if (!ok()) return;

      say('Menyusun jawaban…', 0.88); stage(4, 'run', 'Menyiapkan respons');
      if (R.route === 'review') A.act.classList.add('rev');
      for (const a of R.acts) {
        await sleep(300); if (!ok()) return;
        const d = document.createElement('div'); d.innerHTML = `<i>${R.route === 'auto' ? '✓' : '!'}</i><span>${esc(a)}</span>`; A.act.appendChild(d);
      }
      stage(4, R.route === 'auto' ? 'done' : 'warn', 'Respons siap');
      A.reply.classList.add('on');
      await typeInto(A.rtxt, R.reply, ok, 7, (s) => { A.rtxt.textContent = s; }); if (!ok()) return;
      renderSug(R.sug);

      A.time.textContent = `selesai dalam ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms`;
      say('Selesai! Ketik pertanyaan lain atau pilih saran di bawah jawaban.', 1);
      A.run.disabled = false;
    }

    function loadPrompt(k) {
      rid++;
      setChip(k);
      resetUI();
      const S = SAMPLES[k];
      if (!S) return;
      A.src.textContent = S.src;
      A.text.value = S.text;
      say('Prompt siap. Tekan “Jalankan automation” untuk melihat hasilnya.', 0);
    }

    A.chips.forEach((c) => c.addEventListener('click', () => loadPrompt(c.dataset.ai)));
    A.run.addEventListener('click', () => runPipe());
    A.text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runPipe(); }
    });
    A.text.addEventListener('input', () => {
      rid++;
      say('Siap dijalankan. Klik “Jalankan automation” atau tekan Enter.', 0);
    });

    const codeEl = $('#aiCode');
    if (codeEl) codeEl.innerHTML = hl(`SCOPE = ["profil_nayura", "keahlian", "proyek", "kontak", "web_ini", "tawaran_kerja"]\n\ndef handle_prompt(prompt_user):\n    norm = normalize_slang(prompt_user)\n    greeting = greet_back(prompt_user, wib_now())\n    intent = detect_intent(norm)\n    if intent not in SCOPE:\n        return greeting + "Pengetahuan saya terbatas pada Nayura & web ini."\n    return greeting + answer_from_kb(intent, check_role_fit(norm))`);

    say('Tanya aja dulu, lalu tekan “Enter atau Jalankan ”.', 0);
  }

  /* ======================================================================
     4. KONTAK
     ====================================================================== */
  const ctClock = $('#ctClock');
  if (ctClock) {
    const ctStatus = $('#ctStatus');
    const upd = () => {
      const h = wib().getUTCHours(); ctClock.textContent = wibHms().slice(0, 5) + ' WIB';
      ctStatus.textContent = h >= 8 && h < 21 ? '' : '';
    };
    upd(); setInterval(upd, 20000);
  }

  /* ======================================================================
     5. MOTION PACK (Parallax, 3D Tilt, Magnetic Buttons, Count-Up)
     ====================================================================== */
  if (!reduceMotion) {
    const html = document.documentElement; html.classList.add('motion');
    const raf = requestAnimationFrame, H = () => window.innerHeight;
    const heroCopy = $('.hero-copy'), portrait = $('.portrait'), portImg = $('.portrait-frame img'), chips = $$('.hero-visual .chip'), tlEl = $('.timeline');
    let sy = -1;

    function frame() {
      const y = window.scrollY;
      if (y !== sy) {
        sy = y; const k = clamp(y / (H() * 0.9), 0, 1);
        if (y < H() * 1.3) {
          if (heroCopy) { heroCopy.style.translate = `0 ${-k * 42}px`; heroCopy.style.opacity = String(1 - k * 0.55); }
          if (portrait) portrait.style.translate = `0 ${-k * 24}px`;
          if (portImg) portImg.style.translate = `0 ${k * 20}px`;
          chips.forEach((c, i) => { c.style.translate = `0 ${-k * (i ? 54 : 82)}px`; });
        }
        if (tlEl) { const r = tlEl.getBoundingClientRect(); tlEl.style.setProperty('--p', clamp((H() * 0.62 - r.top) / r.height, 0, 1).toFixed(4)); }
      }
    }
    window.addEventListener('scroll', () => raf(frame), { passive: true });
    window.addEventListener('resize', () => { sy = -1; raf(frame); });
    frame();

    if (finePointer) {
      $$('.skill, .project, .edu, .ct-tile, .portrait').forEach((el) => {
        el.classList.add('tilt');
        el.addEventListener('pointerenter', () => { el.classList.add('ready', 'tilting'); }, { passive: true });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect(), amp = r.width > 520 ? 2.0 : 4.5;
          el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * amp * 2).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * amp * 2).toFixed(2) + 'deg');
        }, { passive: true });
        el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }, { passive: true });
      });

      $$('.btn, .icon-btn').filter((el) => !el.closest('#navWrap')).forEach((el) => {
        let cx = 0, cy = 0, tx = 0, ty = 0, on = false;
        const loop = () => {
          cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; el.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
          if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 || tx || ty) raf(loop); else { on = false; el.style.translate = ''; }
        };
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); tx = (e.clientX - r.left - r.width / 2) * 0.2; ty = (e.clientY - r.top - r.height / 2) * 0.28; if (!on) { on = true; raf(loop); } }, { passive: true });
        el.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { passive: true });
      });
    }

    const counters = [];
    $$('.metric-val').forEach((el) => { const t = el.textContent.trim(); if (/^\d{4}$/.test(t)) counters.push({ el, to: +t, from: +t - 9, dec: 0 }); });
    $$('.gpa b').forEach((el) => { const t = el.textContent.trim(); if (/^\d[.,]\d+$/.test(t)) counters.push({ el, to: parseFloat(t.replace(',', '.')), from: 0, dec: t.split(/[.,]/)[1].length, sep: t.includes(',') ? ',' : '.' }); });
    if (counters.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting) return; io.unobserve(en.target); const c = counters.find((x) => x.el === en.target), t0 = performance.now(), dur = 1300;
        (function f(t) { const k = 1 - Math.pow(1 - clamp((t - t0) / dur, 0, 1), 4), v = c.from + (c.to - c.from) * k; c.el.textContent = c.dec ? v.toFixed(c.dec).replace('.', c.sep) : String(Math.round(v)); if (k < 1) raf(f); })(t0);
      }), { threshold: 0.6 });
      counters.forEach((c) => io.observe(c.el));
    }
  }

/* ======================================================================
     6. SERTIFIKASI (Carousel PDF.js + Lightbox)
     ====================================================================== */
  const CERTS = [
    { title: 'Dicoding Basic Website Programming', issuer: 'Dicoding · 2024', pdf: 'asset/sertifikat/11.pdf' },
    { title: 'Basic JavaScript Programming', issuer: 'Dicoding · 2024', pdf: 'asset/sertifikat/12.pdf' },
    { title: 'HTML & CSS — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/1.pdf' },
    { title: 'JS Front End — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/2.pdf' },
    { title: 'PostgreSQL — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/3.pdf' },
    { title: 'Programming Basics with Python — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/4.pdf' },
    { title: 'Programming Fundamentals with Python — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/5.pdf' },
    { title: 'Python Advanced — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/6.pdf' },
    { title: 'Python OOP — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/7.pdf' },
    { title: 'Python ORM — MSIB 7', issuer: 'SoftUni Indonesia · 2024', pdf: 'asset/sertifikat/8.pdf' },
    { title: 'Sertifikat Kepesertaan Studi Independen MSIB 7', issuer: 'Kampus Merdeka · 2024', pdf: 'asset/sertifikat/9.pdf' },
    { title: 'MSIB 7 — International Software Engineering Diploma (Python Web Developer)', issuer: 'SoftUni Indonesia / Kampus Merdeka · 2024', pdf: 'asset/sertifikat/10.pdf' }
  ];

  const PDFJS_SOURCES = [
    {
      lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    },
    {
      lib: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
      worker: 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    }
  ];

  const track = $('#certTrack');
  if (track) {
    const pad = (n) => String(n).padStart(2, '0');
    const total = CERTS.length;
    const prevBtn = $('#certPrev');
    const nextBtn = $('#certNext');
    const idxEl = $('#certIndex');
    const countEl = $('#certCount');
    const certBar = $('#certBar');
    const barWrap = certBar.parentElement;
    if (countEl) countEl.textContent = total + ' sertifikat';

    const SEAL = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="5.5"/><path d="m8.8 13.6-1.6 7 4.8-2.6 4.8 2.6-1.6-7"/></svg>';
    const ZOOM = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

    const renderedPdfs = new WeakSet();
    let pdfjsLibPromise = null;

    function loadScriptFromUrl(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => (window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error('pdfjsLib missing')));
        script.onerror = () => reject(new Error('script load failed: ' + url));
        document.head.appendChild(script);
      });
    }

    async function loadPdfJs() {
      if (window.pdfjsLib) return window.pdfjsLib;
      if (pdfjsLibPromise) return pdfjsLibPromise;
      pdfjsLibPromise = (async () => {
        for (const src of PDFJS_SOURCES) {
          try {
            const lib = await loadScriptFromUrl(src.lib);
            lib.GlobalWorkerOptions.workerSrc = src.worker;
            return lib;
          } catch (_) {}
        }
        throw new Error('All PDF.js CDNs failed');
      })();
      return pdfjsLibPromise;
    }

    function applyEmbedFallback(card, item) {
      const media = $('.cert-media', card);
      if (!media || $('.cert-embed', media)) return;
      const embed = document.createElement('embed');
      embed.className = 'cert-embed';
      embed.type = 'application/pdf';
      embed.src = `${item.pdf}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      embed.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;pointer-events:none;';
      const zoomEl = $('.cert-zoom', media);
      media.insertBefore(embed, zoomEl);
      card.classList.add('has-img');
    }

    async function renderPdfThumb(card, item) {
      if (!item.pdf || renderedPdfs.has(card)) return;
      renderedPdfs.add(card);
      try {
        const pdfjsLib = await loadPdfJs();
        const loadingTask = pdfjsLib.getDocument({ url: item.pdf, verbosity: 0 });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = 560;
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.setAttribute('aria-hidden', 'true');

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const media = $('.cert-media', card);
        const zoomEl = $('.cert-zoom', media);
        media.insertBefore(canvas, zoomEl);
        card.classList.add('has-img');
      } catch (_) {
        applyEmbedFallback(card, item);
      }
    }

    const cards = CERTS.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cert glass';
      b.setAttribute('aria-label', `${c.title}, ${c.issuer} (PDF). Klik untuk melihat dokumen`);
      b.innerHTML =
        '<span class="cert-media">' +
          `<span class="cert-num">${pad(i + 1)}</span>` +
          `<span class="cert-ph">${SEAL}<span>Dokumen Sertifikat</span><small>${i + 1}.pdf</small></span>` +
          '<img alt="" loading="lazy" decoding="async" />' +
          `<span class="cert-zoom">${ZOOM}</span>` +
        '</span>' +
        '<span class="cert-cap"><span class="cert-title"></span><span class="cert-sub"></span></span>';
      $('.cert-title', b).textContent = c.title;
      $('.cert-sub', b).textContent = c.issuer;

      const img = $('img', b);
      if (c.img) {
        img.alt = c.title;
        img.addEventListener('load', () => b.classList.add('has-img'));
        img.addEventListener('error', () => img.remove());
        img.src = c.img;
      } else {
        img.remove();
      }

      b.addEventListener('click', () => openLb(i));
      track.appendChild(b);
      return { el: b, data: c };
    });

    function renderVisibleThumbs() {
      const trackRect = track.getBoundingClientRect();
      cards.forEach(({ el, data }) => {
        if (!data.pdf || el.classList.contains('has-img')) return;
        const r = el.getBoundingClientRect();
        if (r.right >= trackRect.left - 320 && r.left <= trackRect.right + 320) {
          renderPdfThumb(el, data);
        }
      });
    }

    const gap = () => parseFloat(getComputedStyle(track).columnGap) || 14;
    const step = () => cards[0].el.getBoundingClientRect().width + gap();
    const visible = () => Math.max(1, Math.floor((track.clientWidth + gap()) / step() + 0.05));
    const behavior = () => (reduceMotion ? 'auto' : 'smooth');

    function updateCarousel() {
      const max = track.scrollWidth - track.clientWidth;
      const v = visible();
      let first = Math.round(track.scrollLeft / step());
      first = clamp(first, 0, Math.max(0, total - v));
      const last = Math.min(first + v, total);
      idxEl.textContent = v === 1 ? `${pad(first + 1)} / ${total}` : `${pad(first + 1)}–${pad(last)} / ${total}`;
      prevBtn.disabled = track.scrollLeft <= 2;
      nextBtn.disabled = track.scrollLeft >= max - 2;

      const ratio = clamp(track.clientWidth / track.scrollWidth, 0.1, 1);
      certBar.style.width = (ratio * 100).toFixed(2) + '%';
      const travel = barWrap.clientWidth * (1 - ratio);
      certBar.style.transform = `translate3d(${(max > 0 ? (track.scrollLeft / max) * travel : 0).toFixed(1)}px,0,0)`;

      renderVisibleThumbs();
    }

    renderVisibleThumbs();

    if ('IntersectionObserver' in window) {
      const certSectionObs = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) renderVisibleThumbs();
      }, { rootMargin: '300px 0px' });
      certSectionObs.observe(track);
    }

    let carTick = false;
    track.addEventListener('scroll', () => {
      if (!carTick) { carTick = true; requestAnimationFrame(() => { updateCarousel(); carTick = false; }); }
    }, { passive: true });
    window.addEventListener('resize', updateCarousel);

    prevBtn.addEventListener('click', () => track.scrollBy({ left: -step() * visible(), behavior: behavior() }));
    nextBtn.addEventListener('click', () => track.scrollBy({ left: step() * visible(), behavior: behavior() }));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: behavior() }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: behavior() }); }
    });

    let down = false, moved = false, startX = 0, startScroll = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      const target = clamp(Math.round(track.scrollLeft / step()), 0, total - 1) * step();
      track.scrollTo({ left: target, behavior: behavior() });
      setTimeout(() => { track.classList.remove('dragging'); moved = false; }, 450);
    });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    const lb = $('#lightbox');
    const lbImg = $('#lbImg');
    const lbPdf = $('#lbPdf');
    const lbTitle = $('#lbTitle');
    const lbSub = $('#lbSub');
    const lbOpen = $('#lbOpen');
    const lbClose = $('.lb-close', lb);
    const lbPrev = $('#lbPrev');
    const lbNext = $('#lbNext');
    let lbIndex = -1;
    let lastFocus = null;

    function openLb(i) {
      const item = CERTS[i];
      if (!item || (!item.pdf && !item.img)) return;
      if (lb.hidden) lastFocus = document.activeElement;
      lbIndex = i;
      lbTitle.textContent = item.title;
      lbSub.textContent = `${pad(i + 1)} / ${total} · ${item.issuer}`;

      if (item.pdf) {
        lbImg.hidden = true;
        lbImg.removeAttribute('src');
        lbPdf.hidden = false;
        lbPdf.src = item.pdf;
        lbOpen.href = item.pdf;
        lbOpen.hidden = false;
      } else {
        lbPdf.hidden = true;
        lbPdf.removeAttribute('src');
        lbImg.hidden = false;
        lbImg.src = item.img;
        lbImg.alt = item.title;
        lbOpen.hidden = true;
      }

      lb.hidden = false;
      document.documentElement.classList.add('lb-open');
      track.scrollTo({ left: clamp(i, 0, total - 1) * step(), behavior: 'auto' });
      lbClose.focus();
    }
    function closeLb() {
      if (lb.hidden) return;
      lb.hidden = true;
      lbPdf.src = '';
      document.documentElement.classList.remove('lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function stepLb(dir) {
      openLb((lbIndex + dir + total) % total);
    }
    lb.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeLb(); });
    lbPrev.addEventListener('click', () => stepLb(-1));
    lbNext.addEventListener('click', () => stepLb(1));
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') stepLb(-1);
      else if (e.key === 'ArrowRight') stepLb(1);
      else if (e.key === 'Tab') {
        const f = [lbClose, lbPrev, lbNext, ...(lbOpen.hidden ? [] : [lbOpen])];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });

    updateCarousel();
  }

  /* ======================================================================
     7. TOAST & SALIN EMAIL
     ====================================================================== */
  const toast = $('#toast');
  let toastTimer;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  };
  const copyBtn = $('#copyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const email = 'arsinedanayura@gmail.com';
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
        } else {
          const ta = document.createElement('textarea');
          ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        showToast('Email berhasil disalin');
      } catch (err) {
        showToast(email);
      }
    });
  }
})();