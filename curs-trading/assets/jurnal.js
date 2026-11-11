/* Jurnalul deschiderilor: notezi zilnic deschiderea și IB-ul, iar jurnalul îți calculează statisticile. */
(function () {
  'use strict';

  const { TPO, UI } = window;
  const $ = (id) => document.getElementById(id);
  const esc = UI.esc;
  const KEY = 'jurnal';

  const LOC = { 'above-range': 'Peste range', 'above-va': 'Peste VA', 'in-va': 'În VA', 'below-va': 'Sub VA', 'below-range': 'Sub range' };
  const TYPES = { OD: 'Open Drive', OTD: 'Open Test Drive', ORR: 'Open Rejection Reverse', OA: 'Open Auction' };
  const EXT = { nu: 'Nu', sus: 'Sus', jos: 'Jos', ambele: 'Ambele' };

  let rows = UI.store.get(KEY, []);
  if (!Array.isArray(rows)) rows = [];

  const save = () => UI.store.set(KEY, rows);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const fmtMean = (xs) => { const m = mean(xs); return m === null ? '—' : TPO.formatPrice(Math.round(m * 10) / 10); };

  function stats() {
    if (!rows.length) return '<p class="muted">Adaugă câteva zile ca să apară statisticile.</p>';
    const ibs = rows.map((r) => r.ib).filter(UI.isNum);
    const withExt = rows.filter((r) => r.ext);
    const extended = withExt.filter((r) => r.ext !== 'nu');
    const last10 = ibs.slice(-10);
    let html = '<div class="stat-row">' +
      '<div class="stat"><div class="stat-label">Zile notate</div><div class="stat-value">' + rows.length + '</div></div>' +
      '<div class="stat"><div class="stat-label">IB mediu</div><div class="stat-value">' + fmtMean(ibs) + '</div></div>' +
      '<div class="stat"><div class="stat-label">IB mediu, ultimele 10</div><div class="stat-value">' + fmtMean(last10) + '</div></div>' +
      '<div class="stat"><div class="stat-label">Zile cu IB extins</div><div class="stat-value">' + pct(extended.length, withExt.length) + '</div></div>' +
      '</div>';
    const byType = Object.keys(TYPES).map((t) => {
      const rs = rows.filter((r) => r.type === t);
      const re = rs.filter((r) => r.ext);
      return '<tr><td>' + TYPES[t] + '</td><td class="num">' + rs.length + '</td><td class="num">' + fmtMean(rs.map((r) => r.ib).filter(UI.isNum)) +
        '</td><td class="num">' + pct(re.filter((r) => r.ext !== 'nu').length, re.length) + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table><thead><tr><th>Tipul deschiderii</th><th class="num">Zile</th><th class="num">IB mediu</th><th class="num">IB extins</th></tr></thead><tbody>' + byType + '</tbody></table></div>';
    if (rows.length < 20) html += '<p class="muted small">Cu mai puțin de 20 de zile, procentele sunt doar orientative. Continuă să notezi.</p>';
    return html;
  }

  function csvCell(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function render() {
    $('j-stats').innerHTML = stats();
    if (!rows.length) {
      $('j-table').innerHTML = '<p class="muted">Încă nu ai notat nicio zi.</p>';
    } else {
      $('j-table').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Data</th><th>Locație</th><th>Deschidere</th><th class="num">IB</th><th>Extins</th><th>Tip zi</th><th>Notă</th><th></th></tr></thead><tbody>' +
        rows.map((r, i) => '<tr><td class="nowrap">' + esc(r.date || '—') + '</td><td>' + (LOC[r.loc] || '—') + '</td><td>' + (TYPES[r.type] || '—') + '</td><td class="num">' +
          (UI.isNum(r.ib) ? TPO.formatPrice(r.ib) : '—') + '</td><td>' + (EXT[r.ext] || '—') + '</td><td>' + esc(r.day || '—') + '</td><td>' + esc(r.note || '') +
          '</td><td><button class="btn btn-ghost btn-sm" type="button" data-del="' + i + '" aria-label="Șterge ziua ' + esc(r.date || i + 1) + '">✕</button></td></tr>').join('') +
        '</tbody></table></div>';
    }
    $('j-csv').value = ['data,locatie,deschidere,ib,ib_extins,tip_zi,nota'].concat(rows.map((r) => [
      r.date, LOC[r.loc] || '', TYPES[r.type] || '', UI.isNum(r.ib) ? r.ib : '', EXT[r.ext] || '', r.day || '', r.note || '',
    ].map(csvCell).join(','))).join('\n');
  }

  $('j-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = [];
    const ibRaw = $('j-ib').value.trim();
    const ib = ibRaw ? TPO.parseNumber(ibRaw) : null;
    if (ibRaw && (Number.isNaN(ib) || ib <= 0)) errors.push('IB-ul trebuie să fie un număr pozitiv de puncte.');
    if (!$('j-loc').value && !$('j-type').value && !ibRaw) errors.push('Completează măcar locația, tipul deschiderii sau IB-ul.');
    $('j-errors').innerHTML = errors.length ? '<ul>' + errors.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '';
    if (errors.length) return;
    rows.push({
      date: $('j-date').value.trim(),
      loc: $('j-loc').value,
      type: $('j-type').value,
      ib,
      ext: $('j-ext').value,
      day: $('j-day').value,
      note: $('j-note').value.trim(),
    });
    save();
    ['j-date', 'j-ib', 'j-note'].forEach((id) => { $(id).value = ''; });
    ['j-loc', 'j-type', 'j-ext', 'j-day'].forEach((id) => { $(id).value = ''; });
    render();
  });

  $('j-table').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const i = Number(btn.getAttribute('data-del'));
    if (!confirmSafe('Ștergi ziua ' + (rows[i].date || i + 1) + ' din jurnal?')) return;
    rows.splice(i, 1);
    save();
    render();
  });

  function confirmSafe(msg) {
    try { return window.confirm(msg); } catch (err) { return true; }
  }

  $('j-copy').addEventListener('click', () => {
    const ta = $('j-csv');
    const status = $('j-copy-status');
    const done = () => { status.textContent = 'Copiat. Lipește-l în chat.'; };
    const fallback = () => {
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); done(); } catch (err) { status.textContent = 'Selectează textul și copiază-l manual (Ctrl+C).'; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
    else fallback();
  });

  render();
})();
