/*
 * Interfață comună: temă, navigare, progres, stocare locală
 * și desenarea profilelor (TPO, volum, comparație, harta nivelurilor).
 * Necesită tpo.js încărcat înainte.
 */
(function (global) {
  'use strict';

  const TPO = global.TPO;

  /* ---------- Stocare locală (poate lipsi: fereastră privată, file:// etc.) ---------- */

  const PREFIX = 'cursAMT:';
  const store = {
    get(key, fallback) {
      try {
        const v = global.localStorage.getItem(PREFIX + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        global.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        /* stocare indisponibilă: pagina merge și fără ea */
      }
    },
  };

  /* ---------- Temă ---------- */

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(store.get('theme', null));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function isNum(x) {
    return typeof x === 'number' && !Number.isNaN(x);
  }

  /* ---------- Progres lecții ---------- */

  function getProgress() {
    return store.get('progress', {});
  }

  function refreshProgress() {
    const prog = getProgress();
    document.querySelectorAll('[data-progress-for]').forEach((el) => {
      el.classList.toggle('is-done', !!prog[el.getAttribute('data-progress-for')]);
    });
    document.querySelectorAll('[data-complete]').forEach((btn) => {
      const done = !!prog[btn.getAttribute('data-complete')];
      btn.textContent = done ? '✓ Lecție terminată (apasă ca să anulezi)' : 'Marchează lecția ca terminată';
      btn.classList.toggle('btn-secondary', done);
    });
  }

  function initChrome() {
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const isDark = cur ? cur === 'dark' : global.matchMedia('(prefers-color-scheme: dark)').matches;
        const next = isDark ? 'light' : 'dark';
        applyTheme(next);
        store.set('theme', next);
      });
    }
    const here = global.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach((a) => {
      const match = a.getAttribute('data-match');
      if (a.getAttribute('href') === here || (match && here.indexOf(match) === 0)) a.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('[data-complete]').forEach((b) => {
      b.addEventListener('click', () => {
        const prog = getProgress();
        const key = b.getAttribute('data-complete');
        prog[key] = !prog[key];
        store.set('progress', prog);
        refreshProgress();
      });
    });
    refreshProgress();
  }
  document.addEventListener('DOMContentLoaded', initChrome);

  /* ---------- Texte comune ---------- */

  function extremeText(e, which) {
    if (e.kind === 'tail') {
      return 'Coadă de ' + e.length + ' single prints → <b>excess</b>, licitație terminată (' +
        (which === 'high' ? 'vânzătorii au respins agresiv prețul' : 'cumpărătorii au respins agresiv prețul') + ').';
    }
    if (e.kind === 'poor') {
      return '<b>' + (which === 'high' ? 'Poor high' : 'Poor low') + '</b> (' + e.tpos + ' TPO la extremă, fără coadă) → licitație neterminată, prețul tinde să revină.';
    }
    return 'Un singur single print → excess minim, nu e o coadă completă.';
  }

  function extensionText(ib) {
    if (ib.extUp && ib.extDown) return 'în ambele direcții (sus din perioada ' + ib.extUp + ', jos din perioada ' + ib.extDown + ')';
    if (ib.extUp) return 'în sus, din perioada ' + ib.extUp;
    if (ib.extDown) return 'în jos, din perioada ' + ib.extDown;
    return 'nu a fost extins';
  }

  function tagHtml(text, kind) {
    return '<span class="tag tag-' + kind + '">' + esc(text) + '</span>';
  }

  function lettersHtml(row, profile, plain) {
    const ibLetters = TPO.LETTERS.slice(0, profile.ibPeriods);
    return row.letters.map((L) => (!plain && ibLetters.indexOf(L) >= 0 ? '<span class="l-ib">' + L + '</span>' : L)).join('');
  }

  /* ---------- Profil TPO ---------- */

  /**
   * opts.hideAnswers: ascunde VA, POC, IB, numărătorile și etichetele (pentru exerciții).
   */
  function renderProfile(el, p, opts) {
    opts = opts || {};
    const hide = !!opts.hideAnswers;
    const size = p.rowSize;
    const ibLo = TPO.rowIndex(p.ib.low, size);
    const ibHi = TPO.rowIndex(p.ib.high, size);
    const openI = isNum(p.open) ? TPO.rowIndex(p.open, size) : null;
    const closeI = isNum(p.close) ? TPO.rowIndex(p.close, size) : null;
    const n = p.rows.length;
    const hi = p.extremes.high;
    const lo = p.extremes.low;
    const maxLetters = Math.max(2, ...p.rows.map((r) => r.letters.length));
    const lw = (maxLetters * 1.08 + 0.4).toFixed(1) + 'ch';
    const out = ['<div class="tpo" role="img" aria-label="Profil TPO" style="--lw:' + lw + '">'];
    out.push('<div class="tpo-row tpo-head"><span class="tpo-price">Preț</span><span class="tpo-ib-label" title="Initial Balance">' + (hide ? '' : 'IB') +
      '</span><span>TPO</span><span class="tpo-count">' + (hide ? '' : '#') + '</span><span></span></div>');
    for (let i = n - 1; i >= 0; i--) {
      const r = p.rows[i];
      const cls = ['tpo-row'];
      const tags = [];
      if (!hide) {
        if (i >= p.va.loIndex && i <= p.va.hiIndex) cls.push('is-va');
        if (i === p.pocIndex) { cls.push('is-poc'); tags.push(tagHtml('POC', 'poc')); }
        if (i === p.va.hiIndex) tags.push(tagHtml('VAH', 'va'));
        if (i === p.va.loIndex) tags.push(tagHtml('VAL', 'va'));
        if (hi.kind === 'tail' && i >= n - hi.length) {
          cls.push('is-tail');
          if (i === n - 1) tags.push(tagHtml('coadă · excess', 'tail'));
        }
        if (hi.kind === 'poor' && i === n - 1) tags.push(tagHtml('poor high', 'poor'));
        if (lo.kind === 'tail' && i < lo.length) {
          cls.push('is-tail');
          if (i === 0) tags.push(tagHtml('coadă · excess', 'tail'));
        }
        if (lo.kind === 'poor' && i === 0) tags.push(tagHtml('poor low', 'poor'));
        p.extremes.midSingles.forEach((g) => {
          if (i >= g.fromIndex && i <= g.toIndex) {
            cls.push('is-single');
            if (i === g.toIndex) tags.push(tagHtml('single prints', 'single'));
          }
        });
      }
      if (openI === r.idx) tags.push(tagHtml('◀ open', 'open'));
      if (closeI === r.idx) tags.push(tagHtml('◀ close', 'close'));
      const ib = !hide && r.idx >= ibLo && r.idx <= ibHi ? '<span class="ib-on"></span>' : '';
      out.push(
        '<div class="' + cls.join(' ') + '">' +
          '<span class="tpo-price">' + TPO.formatRow(r.price, size) + '</span>' +
          '<span class="tpo-ib">' + ib + '</span>' +
          '<span class="tpo-letters">' + lettersHtml(r, p, hide) + '</span>' +
          '<span class="tpo-count">' + (hide ? '' : r.count || '') + '</span>' +
          '<span class="tpo-tags">' + tags.join('') + '</span>' +
        '</div>'
      );
    }
    out.push('</div>');
    const legend = hide
      ? '<p class="legend">Fiecare literă = o perioadă de 30 de minute (A = 16:30 RO, B = 17:00 … M = 22:30). Rânduri de ' + esc(TPO.formatRow(size, size)) + ' punct(e).</p>'
      : '<p class="legend"><span><i class="sw sw-va"></i>Value Area</span><span><i class="sw sw-poc"></i>POC</span>' +
        '<span><i class="sw sw-ib"></i>Initial Balance (A + B, litere albastre)</span><span><i class="sw sw-tail"></i>single prints / coadă</span>' +
        '<span>Rânduri de ' + esc(TPO.formatRow(size, size)) + ' punct(e)</span></p>';
    el.innerHTML = '<div class="scroll-x">' + out.join('') + '</div>' + legend;
  }

  /** Rezumatul unui profil, ca listă cheie-valoare. */
  function profileSummary(p) {
    const f = (x) => TPO.formatRow(x, p.rowSize);
    const mids = p.extremes.midSingles.length
      ? p.extremes.midSingles.map((g) => (g.low === g.high ? f(g.low) : f(g.low) + '–' + f(g.high))).join(', ') + ': zone de mișcare rapidă, importante la revenire'
      : 'nu';
    const items = [
      ['POC', f(p.poc)],
      ['Value Area', f(p.va.low) + ' – ' + f(p.va.high) + ' <span class="muted">(' + Math.round(p.va.pct * 100) + '% din ' + p.total + ' TPO)</span>'],
      ['Range', TPO.formatPrice(p.low) + ' – ' + TPO.formatPrice(p.high) + ' <span class="muted">(' + TPO.formatPrice(p.high - p.low) + ' puncte)</span>'],
      ['Initial Balance', TPO.formatPrice(p.ib.low) + ' – ' + TPO.formatPrice(p.ib.high) + ' <span class="muted">(' + TPO.formatPrice(p.ib.high - p.ib.low) + ' puncte)</span>'],
      ['Extensie IB', extensionText(p.ib)],
      ['Maxim', extremeText(p.extremes.high, 'high')],
      ['Minim', extremeText(p.extremes.low, 'low')],
      ['Single prints în interior', mids],
    ];
    if (isNum(p.open)) items.push(['Open / Close', TPO.formatPrice(p.open) + ' / ' + (isNum(p.close) ? TPO.formatPrice(p.close) : '—')]);
    items.push(['Tip de zi <span class="badge badge-accent">estimare</span>', '<b>' + esc(p.dayType.name) + '</b>: ' + esc(p.dayType.note) + ' <span class="muted small">(Tipurile de zile le învățăm în Lecția 3; verifică întotdeauna și cu ochiul.)</span>']);
    return '<dl class="kv">' + items.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl>';
  }

  /** Tabelul pașilor de calcul al Value Area. */
  function stepsTable(va, fmt) {
    const pct = (x) => (va.total ? Math.round((x / va.total) * 1000) / 10 + '%' : '—');
    const side = (list, sum, taken) => {
      if (!list.length) return '<span class="muted">—</span>';
      const txt = list.map((x) => fmt(x.price) + ' (' + x.count + ')').join(' + ') + (list.length > 1 ? ' = ' + sum : '');
      return taken ? '<b class="ok">' + txt + ' ✓</b>' : txt;
    };
    const rows = va.steps.map((s, k) => {
      const lastMark = k === va.steps.length - 1 ? ' ✅' : '';
      if (s.kind === 'start') {
        return '<tr><td>Start</td><td colspan="2">Pornești de la POC ' + fmt(s.rows[0]) + '</td><td class="num">+' + s.added + '</td><td class="num">' + s.acc + ' (' + pct(s.acc) + ')' + lastMark + '</td></tr>';
      }
      const note = s.take === 'both' ? ' <span class="muted small">(egalitate: le adaugi pe amândouă)</span>' : '';
      return '<tr><td>' + k + '</td><td>' + side(s.up, s.upSum, s.take !== 'down') + '</td><td>' + side(s.down, s.downSum, s.take !== 'up') + note +
        '</td><td class="num">+' + s.added + '</td><td class="num">' + s.acc + ' (' + pct(s.acc) + ')' + lastMark + '</td></tr>';
    });
    const method = va.method === 'dual' ? 'câte două rânduri odată' : 'rând cu rând';
    return '<div class="table-wrap"><table><thead><tr><th>Pas</th><th>Deasupra</th><th>Dedesubt</th><th class="num">Adaugi</th><th class="num">Total</th></tr></thead><tbody>' +
      rows.join('') + '</tbody><caption>Metoda: ' + method + '. Ținta: ' + Math.round(va.target * 10) / 10 + ' (' + Math.round((va.target / va.total) * 100) +
      '% din ' + va.total + '). Te oprești când totalul trece de țintă. Rezultat: VA = ' + fmt(va.low) + ' – ' + fmt(va.high) + '.</caption></table></div>';
  }

  /* ---------- Profil de volum ---------- */

  function renderVolume(el, rows, pocIndex, va) {
    const max = Math.max(...rows.map((r) => r.count)) || 1;
    const out = ['<div class="vol" role="img" aria-label="Profil de volum">'];
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const inVA = i >= va.loIndex && i <= va.hiIndex;
      const cls = ['vol-row'];
      const tags = [];
      if (inVA) cls.push('is-va');
      if (i === pocIndex) { cls.push('is-poc'); tags.push(tagHtml('POC', 'poc')); }
      if (i === va.hiIndex) tags.push(tagHtml('VAH', 'va'));
      if (i === va.loIndex) tags.push(tagHtml('VAL', 'va'));
      out.push('<div class="' + cls.join(' ') + '"><span class="tpo-price">' + TPO.formatPrice(r.price) + '</span><span class="vol-bar"><span style="width:' +
        ((r.count / max) * 100).toFixed(1) + '%"></span></span><span class="tpo-count">' + TPO.formatPrice(r.count) + '</span><span class="tpo-tags">' + tags.join('') + '</span></div>');
    }
    out.push('</div>');
    el.innerHTML = '<div class="scroll-x">' + out.join('') + '</div><p class="legend"><span><i class="sw sw-va"></i>Value Area</span><span><i class="sw sw-poc"></i>POC</span></p>';
  }

  /* ---------- Două zile pe aceeași axă ---------- */

  function renderCompare(el, p1, p2, labels) {
    const size = p1.rowSize;
    const idx1 = new Map(p1.rows.map((r, i) => [r.idx, i]));
    const idx2 = new Map(p2.rows.map((r, i) => [r.idx, i]));
    const maxI = Math.max(p1.rows[p1.rows.length - 1].idx, p2.rows[p2.rows.length - 1].idx);
    const minI = Math.min(p1.rows[0].idx, p2.rows[0].idx);
    const openI = isNum(p2.open) ? TPO.rowIndex(p2.open, size) : null;
    function cell(p, i, extra) {
      if (i === undefined) return '<span class="cmp-cell">' + (extra || '') + '</span>';
      const r = p.rows[i];
      const cls = ['cmp-cell'];
      const tags = [];
      if (i >= p.va.loIndex && i <= p.va.hiIndex) cls.push('is-va');
      if (i === p.pocIndex) { cls.push('is-poc'); tags.push(tagHtml('POC', 'poc')); }
      if (i === p.va.hiIndex) tags.push(tagHtml('VAH', 'va'));
      if (i === p.va.loIndex) tags.push(tagHtml('VAL', 'va'));
      return '<span class="' + cls.join(' ') + '"><span class="tpo-letters">' + lettersHtml(r, p) + '</span>' + tags.join('') + (extra || '') + '</span>';
    }
    const out = ['<div class="cmp" role="img" aria-label="Două profile pe aceeași axă de preț">'];
    out.push('<div class="cmp-row cmp-head"><span class="tpo-price">Preț</span><span>' + esc(labels[0]) + '</span><span>' + esc(labels[1]) + '</span></div>');
    for (let i = maxI; i >= minI; i--) {
      const openTag = openI === i ? tagHtml('◀ open', 'open') : '';
      out.push('<div class="cmp-row"><span class="tpo-price">' + TPO.formatRow(i * size, size) + '</span>' + cell(p1, idx1.get(i)) + cell(p2, idx2.get(i), openTag) + '</div>');
    }
    out.push('</div>');
    el.innerHTML = '<div class="scroll-x">' + out.join('') + '</div><p class="legend"><span><i class="sw sw-va"></i>Value Area din fiecare zi</span><span><i class="sw sw-poc"></i>POC</span><span>Literele albastre = IB</span></p>';
  }

  /* ---------- Harta nivelurilor (fără bare, doar cu niveluri) ---------- */

  function renderLevelsChart(el, d1, d2, labels) {
    const vals = [d1.high, d1.low, d1.vah, d1.val, d1.poc, d2.onh, d2.onl, d2.open, d2.high, d2.low, d2.vah, d2.val, d2.poc].filter(isNum);
    if (vals.length < 2) { el.innerHTML = ''; return; }
    let max = Math.max(...vals);
    let min = Math.min(...vals);
    const pad = (max - min) * 0.07 || 1;
    max += pad;
    min -= pad;
    const y = (p) => ((max - p) / (max - min)) * 100;
    const range = (lo, hi, cls) => (isNum(lo) && isNum(hi) && hi >= lo ? '<div class="lv-range ' + cls + '" style="top:' + y(hi) + '%;height:' + (y(lo) - y(hi)) + '%"></div>' : '');
    const box = (lo, hi) => (isNum(lo) && isNum(hi) && hi >= lo ? '<div class="lv-box" style="top:' + y(hi) + '%;height:' + Math.max(y(lo) - y(hi), 0.6) + '%"></div>' : '');
    const line = (p, cls, label) => (isNum(p) ? '<div class="lv-line ' + cls + '" style="top:' + y(p) + '%"><span>' + esc(label) + ' ' + TPO.formatPrice(p) + '</span></div>' : '');
    const guides = [d1.vah, d1.val].filter(isNum).map((p) => '<div class="lv-guide" style="top:' + y(p) + '%"></div>').join('');
    const col1 = range(d1.low, d1.high, '') + box(d1.val, d1.vah) +
      line(d1.high, 'lv-edge', 'H') + line(d1.low, 'lv-edge', 'L') + line(d1.vah, 'lv-edge lv-left', 'VAH') + line(d1.val, 'lv-edge lv-left', 'VAL') + line(d1.poc, 'lv-poc', 'POC');
    const col2 = range(d2.onl, d2.onh, 'lv-on') + line(d2.onh, 'lv-edge', 'ONH') + line(d2.onl, 'lv-edge', 'ONL');
    const col3 = range(d2.low, d2.high, '') + box(d2.val, d2.vah) +
      line(d2.high, 'lv-edge', 'H') + line(d2.low, 'lv-edge', 'L') + line(d2.vah, 'lv-edge lv-left', 'VAH') + line(d2.val, 'lv-edge lv-left', 'VAL') + line(d2.poc, 'lv-poc', 'POC') + line(d2.open, 'lv-open lv-left', 'Open');
    el.innerHTML =
      '<div class="lv" role="img" aria-label="Harta nivelurilor pentru cele două zile">' +
        '<div class="lv-titles"><span>' + esc(labels[0]) + '</span><span>Overnight</span><span>' + esc(labels[1]) + '</span></div>' +
        '<div class="lv-plots"><div class="lv-cols"><div class="lv-col">' + guides + col1 + '</div><div class="lv-col">' + guides + col2 + '</div><div class="lv-col">' + guides + col3 + '</div></div></div>' +
      '</div>' +
      '<p class="legend"><span><i class="sw sw-va"></i>Value Area (liniile punctate = VA de ieri, prelungită)</span><span><i class="sw" style="background:var(--muted);opacity:.55;width:6px"></i>range</span><span><i class="sw" style="background:var(--on);width:6px"></i>range overnight</span></p>';
  }

  /* ---------- Graficul primelor 60 de minute (Lecția 2) ---------- */

  /**
   * sc: { levels: {high, vah, poc, val, low}, path: [prețuri la fiecare 5 minute, primul = deschiderea] }
   */
  function renderOpenChart(el, sc, opts) {
    opts = opts || {};
    const W = 520;
    const H = 250;
    const x0 = 24;
    const x1 = 398;
    const y0 = 30;
    const y1 = 212;
    const lv = sc.levels;
    const path = sc.path;
    const n = path.length;
    const keys = [['high', 'H ieri'], ['vah', 'VAH'], ['poc', 'POC'], ['val', 'VAL'], ['low', 'L ieri']];
    const vals = path.concat(keys.map(([k]) => lv[k]).filter(isNum));
    let max = Math.max(...vals);
    let min = Math.min(...vals);
    const pad = (max - min) * 0.06 || 1;
    max += pad;
    min -= pad;
    const y = (p) => y0 + ((max - p) / (max - min)) * (y1 - y0);
    const x = (i) => x0 + (i / (n - 1)) * (x1 - x0);
    const half = Math.round((n - 1) / 2);
    const parts = [];
    parts.push('<rect class="ch-band" x="' + x0 + '" y="' + y0 + '" width="' + (x(half) - x0) + '" height="' + (y1 - y0) + '"/>');
    parts.push('<text class="ch-period" x="' + (x0 + x(half)) / 2 + '" y="' + (y0 - 10) + '" text-anchor="middle">A · 16:30–17:00</text>');
    parts.push('<text class="ch-period" x="' + (x(half) + x1) / 2 + '" y="' + (y0 - 10) + '" text-anchor="middle">B · 17:00–17:30</text>');
    if (isNum(lv.vah) && isNum(lv.val)) {
      parts.push('<rect class="ch-va" x="' + x0 + '" y="' + y(lv.vah) + '" width="' + (x1 - x0) + '" height="' + (y(lv.val) - y(lv.vah)) + '"/>');
    }
    const labels = [];
    keys.forEach(([k, name]) => {
      if (!isNum(lv[k])) return;
      parts.push('<line class="ch-level' + (k === 'poc' ? ' ch-poc' : '') + '" x1="' + x0 + '" x2="' + x1 + '" y1="' + y(lv[k]) + '" y2="' + y(lv[k]) + '"/>');
      labels.push({ y: y(lv[k]), text: name + ' ' + TPO.formatPrice(lv[k]), cls: k === 'poc' ? 'ch-label ch-label-poc' : 'ch-label' });
    });
    const open = path[0];
    parts.push('<line class="ch-open" x1="' + x0 + '" x2="' + x1 + '" y1="' + y(open) + '" y2="' + y(open) + '"/>');
    labels.push({ y: y(open), text: 'Open ' + TPO.formatPrice(open), cls: 'ch-label ch-label-open' });
    parts.push('<polyline class="ch-path" points="' + path.map((p, i) => x(i).toFixed(1) + ',' + y(p).toFixed(1)).join(' ') + '"/>');
    parts.push('<circle class="ch-open-dot" cx="' + x(0) + '" cy="' + y(open) + '" r="5"/>');
    // Etichetele din dreapta nu au voie să se suprapună.
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y < labels[i - 1].y + 17) labels[i].y = labels[i - 1].y + 17;
    }
    const over = labels.length ? labels[labels.length - 1].y - (H - 34) : 0;
    if (over > 0) labels.forEach((l) => { l.y -= over; });
    labels.forEach((l) => parts.push('<text class="' + l.cls + '" x="' + (x1 + 8) + '" y="' + (l.y + 5).toFixed(1) + '">' + esc(l.text) + '</text>'));
    [[0, '16:30'], [Math.round((n - 1) / 4), '16:45'], [half, '17:00'], [Math.round((3 * (n - 1)) / 4), '17:15'], [n - 1, '17:30']].forEach(([i, t]) => {
      parts.push('<text class="ch-tick" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + t + '</text>');
    });
    el.innerHTML = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Primele 60 de minute după deschidere') + '">' + parts.join('') + '</svg>';
  }

  /* ---------- Quiz ---------- */

  /** items: [{ q, options: [...], correct: index, explain: html }] */
  function renderQuiz(el, scoreEl, items) {
    const state = items.map(() => null);
    function updateScore() {
      const answered = state.filter((s) => s !== null).length;
      if (!answered) { scoreEl.textContent = ''; scoreEl.className = 'result'; return; }
      const ok = state.filter((s, i) => s === items[i].correct).length;
      scoreEl.className = 'result ' + (ok === items.length ? 'ok' : 'ko');
      scoreEl.textContent = 'Scor: ' + ok + ' / ' + items.length +
        (answered < items.length ? ' (mai ai ' + (items.length - answered) + ' întrebări)' : ok === items.length ? '. Perfect!' : '. Recitește explicațiile la cele greșite.');
    }
    el.innerHTML = items.map((item, qi) =>
      '<div class="quiz-q" data-qi="' + qi + '"><h3>' + (qi + 1) + '. ' + esc(item.q) + '</h3><div class="quiz-options">' +
      item.options.map((o, oi) => '<button type="button" class="quiz-option" data-oi="' + oi + '">' + esc(o) + '</button>').join('') +
      '</div><div class="quiz-explain" hidden></div></div>'
    ).join('') + '<div class="btn-row"><button type="button" class="btn btn-ghost" data-quiz-reset>Reia quiz-ul</button></div>';

    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-quiz-reset]')) {
        state.fill(null);
        el.querySelectorAll('.quiz-option').forEach((b) => { b.disabled = false; b.classList.remove('is-correct', 'is-wrong'); });
        el.querySelectorAll('.quiz-explain').forEach((x) => { x.hidden = true; x.innerHTML = ''; });
        updateScore();
        return;
      }
      const btn = e.target.closest('.quiz-option');
      if (!btn) return;
      const wrap = btn.closest('.quiz-q');
      const qi = Number(wrap.dataset.qi);
      if (state[qi] !== null) return;
      const oi = Number(btn.dataset.oi);
      state[qi] = oi;
      const item = items[qi];
      wrap.querySelectorAll('.quiz-option').forEach((b, i) => {
        b.disabled = true;
        if (i === item.correct) b.classList.add('is-correct');
        else if (i === oi) b.classList.add('is-wrong');
      });
      const ex = wrap.querySelector('.quiz-explain');
      ex.innerHTML = (oi === item.correct ? '✅ <b>Corect.</b> ' : '❌ <b>Nu chiar.</b> ') + item.explain;
      ex.hidden = false;
      updateScore();
    });
  }

  global.UI = {
    renderOpenChart,
    renderQuiz,
    store,
    esc,
    isNum,
    tagHtml,
    extremeText,
    extensionText,
    renderProfile,
    profileSummary,
    stepsTable,
    renderVolume,
    renderCompare,
    renderLevelsChart,
  };
})(window);
