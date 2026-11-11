/* Lecția 2: ilustrațiile deschiderilor, exercițiile și quiz-ul. */
(function () {
  'use strict';

  const { TPO, UI, CURS_DATA } = window;
  const $ = (id) => document.getElementById(id);
  const levels = CURS_DATA.openLevels;

  const TYPE_NAMES = { OD: 'Open Drive', OTD: 'Open Test Drive', ORR: 'Open Rejection Reverse', OA: 'Open Auction' };
  const LOC_NAMES = {
    'above-range': 'Peste range-ul de ieri (gap în sus)',
    'above-va': 'Peste VA, dar în range',
    'in-va': 'În VA de ieri',
    'below-va': 'Sub VA, dar în range',
    'below-range': 'Sub range-ul de ieri (gap în jos)',
  };

  /* ---------- Ilustrațiile celor 4 tipuri ---------- */

  document.querySelectorAll('[data-illustration]').forEach((el) => {
    const type = el.getAttribute('data-illustration');
    UI.renderOpenChart(el, { levels, path: CURS_DATA.openIllustrations[type] }, { label: 'Exemplu de ' + TYPE_NAMES[type] });
  });

  /* ---------- Exercițiul 1: recunoaște deschiderea ---------- */

  const d1 = { high: levels.high, low: levels.low, vah: levels.vah, val: levels.val, bucket: 0 };
  const scenarios = CURS_DATA.openScenarios.map((s) => Object.assign({}, s, { location: TPO.classifyOpen(s.path[0], d1) }));

  const opt = (map) => '<option value="">alege…</option>' + Object.keys(map).map((k) => '<option value="' + k + '">' + UI.esc(map[k]) + '</option>').join('');
  $('scenarios').innerHTML = scenarios.map((s, i) =>
    '<div class="card exercise scenario" data-i="' + i + '">' +
      '<h3>Scenariul ' + (i + 1) + '</h3>' +
      '<div class="chart" data-chart="' + i + '"></div>' +
      '<div class="fields">' +
        '<label class="field" data-q="loc">Locația deschiderii<select name="loc-' + i + '">' + opt(LOC_NAMES) + '</select><span class="hint"></span></label>' +
        '<label class="field" data-q="type">Tipul deschiderii<select name="type-' + i + '">' + opt(TYPE_NAMES) + '</select><span class="hint"></span></label>' +
      '</div>' +
      '<div class="explain" hidden>' + s.explain + '</div>' +
    '</div>'
  ).join('');
  scenarios.forEach((s, i) => {
    UI.renderOpenChart(document.querySelector('[data-chart="' + i + '"]'), { levels, path: s.path }, { label: 'Scenariul ' + (i + 1) });
  });

  const exForm = $('ex-open');
  const EX_KEY = 'l2-ex1';

  function saveEx() {
    const s = {};
    new FormData(exForm).forEach((v, k) => { s[k] = v; });
    UI.store.set(EX_KEY, s);
  }
  (function loadEx() {
    const s = UI.store.get(EX_KEY, null);
    if (s) Object.keys(s).forEach((k) => { if (exForm.elements[k]) exForm.elements[k].value = s[k]; });
  })();
  exForm.addEventListener('change', saveEx);

  function mark(label, ok, hint) {
    label.classList.remove('is-ok', 'is-ko');
    label.classList.add(ok ? 'is-ok' : 'is-ko');
    label.querySelector('.hint').textContent = ok ? '✓ Corect' : hint;
  }

  exForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = 0;
    let answered = 0;
    scenarios.forEach((s, i) => {
      const card = exForm.querySelector('[data-i="' + i + '"]');
      const loc = exForm.elements['loc-' + i].value;
      const type = exForm.elements['type-' + i].value;
      const locLabel = card.querySelector('[data-q="loc"]');
      const typeLabel = card.querySelector('[data-q="type"]');
      [locLabel, typeLabel].forEach((l) => { l.classList.remove('is-ok', 'is-ko'); l.querySelector('.hint').textContent = ''; });
      if (loc) {
        answered++;
        if (loc === s.location) ok++;
        mark(locLabel, loc === s.location, 'Compară deschiderea (linia albastră) cu VAH/VAL (zona galbenă) și cu maximul/minimul de ieri.');
      }
      if (type) {
        answered++;
        if (type === s.type) ok++;
        mark(typeLabel, type === s.type, 'Se întoarce prețul la deschidere? Dacă da: după un test scurt urmat de un drive, sau după o respingere urmată de mișcare în ambele direcții?');
      }
    });
    const total = scenarios.length * 2;
    const res = $('ex-open-result');
    if (!answered) {
      res.className = 'result ko';
      res.textContent = 'Alege măcar un răspuns înainte să verifici.';
      return;
    }
    res.className = 'result ' + (ok === total ? 'ok' : 'ko');
    res.textContent = ok === total
      ? 'Excelent: ' + ok + ' din ' + total + ' corecte! Citește și explicațiile, ca să vezi raționamentul complet.'
      : ok + ' din ' + total + ' corecte' + (answered < total ? ' (' + (total - answered) + ' necompletate)' : '') + '. Citește indiciile și mai încearcă înainte să deschizi explicațiile.';
  });

  $('ex-open-explain').addEventListener('click', () => {
    const boxes = exForm.querySelectorAll('.explain');
    const show = boxes[0].hidden;
    boxes.forEach((b) => { b.hidden = !show; });
    $('ex-open-explain').textContent = show ? 'Ascunde explicațiile' : 'Arată explicațiile';
  });

  $('ex-open-reset').addEventListener('click', () => {
    exForm.reset();
    exForm.querySelectorAll('.field').forEach((l) => l.classList.remove('is-ok', 'is-ko'));
    exForm.querySelectorAll('.hint').forEach((h) => { h.textContent = ''; });
    exForm.querySelectorAll('.explain').forEach((b) => { b.hidden = true; });
    $('ex-open-explain').textContent = 'Arată explicațiile';
    $('ex-open-result').textContent = '';
    UI.store.set(EX_KEY, null);
  });

  /* ---------- Exercițiul 2: IB îngust sau larg ---------- */

  const hist = CURS_DATA.ibHistory;
  const today = CURS_DATA.ibToday;
  const avg = hist.reduce((s, x) => s + x, 0) / hist.length;
  const ratio = today / avg;
  const width = ratio < 0.75 ? 'ingust' : ratio > 1.25 ? 'larg' : 'normal';
  const expect = width === 'ingust' ? 'ext' : width === 'larg' ? 'inside' : 'none';

  $('ib-history').innerHTML = '<thead><tr>' + hist.map((_, i) => '<th class="num">Ziua ' + (i + 1) + '</th>').join('') + '</tr></thead><tbody><tr>' +
    hist.map((x) => '<td class="num">' + x + '</td>').join('') + '</tr></tbody>';
  $('ib-today').textContent = String(today);

  const ibForm = $('ex-ib');
  ibForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const checks = {
      avg: { ok: (v) => Math.abs(TPO.parseNumber(v) - avg) < 0.051, hint: 'Adună cele 10 valori și împarte la 10.' },
      width: { ok: (v) => v === width, hint: 'Împarte IB-ul de azi la medie: sub ~75% e îngust, peste ~125% e larg.' },
      expect: { ok: (v) => v === expect, hint: 'Un IB îngust înseamnă un echilibru strâns la început. Ce se întâmplă de obicei după un echilibru strâns?' },
    };
    let ok = 0;
    let answered = 0;
    Object.keys(checks).forEach((k) => {
      const label = ibForm.querySelector('[data-q="' + k + '"]');
      const v = ibForm.elements[k].value.trim();
      label.classList.remove('is-ok', 'is-ko');
      label.querySelector('.hint').textContent = '';
      if (!v) return;
      answered++;
      const good = checks[k].ok(v);
      if (good) ok++;
      mark(label, good, checks[k].hint);
    });
    const res = $('ex-ib-result');
    if (!answered) {
      res.className = 'result ko';
      res.textContent = 'Completează măcar un răspuns.';
      return;
    }
    res.className = 'result ' + (ok === 3 ? 'ok' : 'ko');
    res.textContent = ok === 3
      ? 'Corect! Media e ' + TPO.formatPrice(avg) + ', iar ' + today + ' înseamnă doar ' + Math.round(ratio * 100) + '% din medie: IB îngust, deci range extension e mai probabil. Urmărești ieșirea din IB și direcția ei.'
      : ok + ' din 3 corecte. Citește indiciile.';
  });

  /* ---------- Quiz ---------- */

  UI.renderQuiz($('quiz-box'), $('quiz-score'), [
    {
      q: 'Ce tip de deschidere arată cea mai mare convingere?',
      options: ['Open Auction', 'Open Rejection Reverse', 'Open Test Drive', 'Open Drive'],
      correct: 3,
      explain: '<b>Open Drive</b>: prețul pleacă imediat și nu se mai întoarce la deschidere. E activitate initiative a OTF-ului; deschiderea devine des extrema zilei.',
    },
    {
      q: 'Piața deschide peste VAH, coboară în primele minute până la VAH, e respinsă și urcă puternic prin prețul de deschidere spre maximul de ieri. Ce tip de deschidere e?',
      options: ['Open Drive', 'Open Test Drive', 'Open Rejection Reverse', 'Open Auction'],
      correct: 1,
      explain: 'A testat o referință clară (VAH), n-a găsit vânzători, apoi a plecat puternic în direcția opusă testului, prin deschidere: <b>Open Test Drive</b>.',
    },
    {
      q: 'IB-ul de azi are 9 puncte, iar media ultimelor 10 zile e 20. Ce e mai probabil?',
      options: ['Ziua rămâne în IB', 'Range extension (ieșire din IB)', 'Piața închide exact la POC', 'Lățimea IB-ului nu contează'],
      correct: 1,
      explain: '9 / 20 = 45% din medie: un IB <b>îngust</b>, adică un echilibru strâns la început. După un echilibru strâns urmează de obicei o ieșire, deci range extension e mai probabil.',
    },
    {
      q: 'Piața deschide în VA de ieri și face un Open Auction. Care e abordarea potrivită?',
      options: [
        'Intri imediat în direcția primei lumânări',
        'Aștepți IB-ul și cauți tranzacții responsive la marginile range-ului de la început / VA',
        'Cumperi breakout-ul maximului de ieri înainte să apară',
        'Faci fade la orice mișcare, oricât de puternică',
      ],
      correct: 1,
      explain: 'Locație în valoare + deschidere fără convingere = echilibru probabil. Nu anticipezi un breakout; aștepți IB-ul și lucrezi responsive la margini.',
    },
    {
      q: 'De ce e periculos să faci fade la un Open Drive?',
      options: [
        'Pentru că volumul e mereu mic dimineața',
        'Pentru că OTF-ul intră cu activitate initiative și deschiderea devine des extrema zilei, deci mergi contra participanților celor mai puternici',
        'Pentru că Open Drive apare doar în zilele de FOMC',
        'Nu e periculos, e cea mai bună tranzacție a zilei',
      ],
      correct: 1,
      explain: 'Un Open Drive arată convingere maximă. Dacă faci fade, stai în fața participanților care mută valoarea. Semnalul de invalidare al drive-ului e revenirea prețului prin deschidere, nu „a urcat prea mult”.',
    },
    {
      q: 'Între ce ore se formează Initial Balance pentru ES, în ora României (iarna)?',
      options: ['01:00–02:00', '15:30–16:30', '16:30–17:30', '22:00–23:00'],
      correct: 2,
      explain: 'IB = perioadele A + B ale sesiunii RTH: <b>16:30–17:30 RO</b> (9:30–10:30 NY). În săptămânile cu decalaj de oră de vară (martie, sfârșit de octombrie) e cu o oră mai devreme.',
    },
  ]);
})();
