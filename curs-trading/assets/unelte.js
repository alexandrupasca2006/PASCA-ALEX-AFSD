/* Unelte: constructorul TPO și calculatorul de Value Area din volum. */
(function () {
  'use strict';

  const { TPO, UI, CURS_DATA } = window;
  const $ = (id) => document.getElementById(id);

  function showErrors(el, errors) {
    el.innerHTML = errors.length ? '<ul>' + errors.map((e) => '<li>' + UI.esc(e) + '</li>').join('') + '</ul>' : '';
  }

  function readPct(id) {
    const v = Number($(id).value);
    return v >= 50 && v <= 95 ? v / 100 : 0.7;
  }

  /* ---------- Constructor TPO ---------- */

  const tpoState = UI.store.get('unelte-tpo', null);
  $('tpo-bars').value = tpoState && tpoState.bars ? tpoState.bars : CURS_DATA.demoDay1;
  if (tpoState && tpoState.row) $('tpo-row').value = tpoState.row;

  function buildTpo() {
    const text = $('tpo-bars').value;
    const size = Number($('tpo-row').value);
    UI.store.set('unelte-tpo', { bars: text, row: $('tpo-row').value });
    const r = TPO.parseBars(text);
    const errors = r.errors.slice();
    if (!r.bars.length && !errors.length) errors.push('Nu am găsit nicio bară. Lipește câte un rând pentru fiecare perioadă de 30 de minute.');
    showErrors($('tpo-errors'), errors);
    if (errors.length) return;
    const p = TPO.buildProfile(r.bars, { rowSize: size, vaPct: readPct('tpo-pct'), method: $('tpo-method').value });
    const f = (x) => TPO.formatRow(x, size);
    $('tpo-summary').innerHTML =
      '<div class="stat-row">' +
        '<div class="stat"><div class="stat-label">POC</div><div class="stat-value">' + f(p.poc) + '</div></div>' +
        '<div class="stat"><div class="stat-label">VAH</div><div class="stat-value">' + f(p.va.high) + '</div></div>' +
        '<div class="stat"><div class="stat-label">VAL</div><div class="stat-value">' + f(p.va.low) + '</div></div>' +
      '</div>' + UI.profileSummary(p);
    $('tpo-profile-card').hidden = false;
    UI.renderProfile($('tpo-profile'), p);
    $('tpo-steps').innerHTML = UI.stepsTable(p.va, f);
    if (p.rows.length > 120) {
      $('tpo-errors').innerHTML = '<ul><li>Profilul are ' + p.rows.length + ' rânduri. Alege o mărime de rând mai mare ca să-l citești mai ușor.</li></ul>';
    }
  }

  $('tpo-form').addEventListener('submit', (e) => { e.preventDefault(); buildTpo(); });
  $('tpo-demo').addEventListener('click', () => {
    $('tpo-bars').value = CURS_DATA.demoDay1;
    $('tpo-row').value = String(CURS_DATA.demoRowSize);
    buildTpo();
  });

  /* ---------- Value Area din volum ---------- */

  const volState = UI.store.get('unelte-vol', null);
  $('vol-rows').value = volState && volState.rows ? volState.rows : CURS_DATA.volumeExample;

  function buildVol() {
    const text = $('vol-rows').value;
    UI.store.set('unelte-vol', { rows: text });
    const r = TPO.parseVolumeRows(text);
    const errors = r.errors.slice();
    if (!r.rows.length && !errors.length) errors.push('Nu am găsit niciun rând „preț volum”.');
    if (r.rows.length && r.rows.every((x) => x.count === 0)) errors.push('Volumul total e zero.');
    showErrors($('vol-errors'), errors);
    if (errors.length) return;
    const poc = TPO.findPoc(r.rows);
    const va = TPO.computeValueArea(r.rows, poc, readPct('vol-pct'), $('vol-method').value);
    const host = $('vol-out');
    host.innerHTML =
      '<div class="stat-row">' +
        '<div class="stat"><div class="stat-label">POC</div><div class="stat-value">' + TPO.formatPrice(r.rows[poc].price) + '</div></div>' +
        '<div class="stat"><div class="stat-label">VAH</div><div class="stat-value">' + TPO.formatPrice(va.high) + '</div></div>' +
        '<div class="stat"><div class="stat-label">VAL</div><div class="stat-value">' + TPO.formatPrice(va.low) + '</div></div>' +
      '</div><div id="vol-chart"></div>';
    UI.renderVolume($('vol-chart'), r.rows, poc, va);
    $('vol-steps-card').hidden = false;
    $('vol-steps').innerHTML = UI.stepsTable(va, TPO.formatPrice);
  }

  $('vol-form').addEventListener('submit', (e) => { e.preventDefault(); buildVol(); });
  $('vol-demo').addEventListener('click', () => {
    $('vol-rows').value = CURS_DATA.volumeExample;
    buildVol();
  });

  buildTpo();
  buildVol();
})();
