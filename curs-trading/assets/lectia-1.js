/* Lecția 1: exemplul de volum, exercițiul interactiv și quiz-ul. */
(function () {
  'use strict';

  const { TPO, UI, CURS_DATA } = window;
  const $ = (id) => document.getElementById(id);

  /* ---------- Exemplul lucrat de Value Area ---------- */

  const vol = TPO.parseVolumeRows(CURS_DATA.volumeExample);
  const volPoc = TPO.findPoc(vol.rows);
  const volVA = TPO.computeValueArea(vol.rows, volPoc, 0.7, 'single');
  UI.renderVolume($('volume-example'), vol.rows, volPoc, volVA);
  $('volume-steps').innerHTML = UI.stepsTable(volVA, TPO.formatPrice);

  /* ---------- Exercițiul 1 ---------- */

  const ex = TPO.buildProfile(TPO.parseBars(CURS_DATA.exercise1Bars).bars, { rowSize: 1, method: 'single' });
  UI.renderProfile($('ex1-profile'), ex, { hideAnswers: true });

  const extOf = (ib) => (ib.extUp && ib.extDown ? 'ambele' : ib.extUp ? 'sus' : ib.extDown ? 'jos' : 'nu');
  const answers = {
    ibHigh: { value: ex.ib.high, hint: 'IB = perioadele A și B. Caută cel mai sus preț atins de A sau de B.' },
    ibLow: { value: ex.ib.low, hint: 'Cel mai jos preț atins de A sau de B.' },
    ibExt: { value: extOf(ex.ib), hint: 'A ieșit vreo literă de după B (C … M) peste maximul sau sub minimul IB-ului?' },
    poc: { value: ex.poc, hint: 'POC = rândul cu cele mai multe litere.' },
    total: { value: ex.total, hint: 'Numără literele de pe fiecare rând și adună-le.' },
    vah: { value: ex.va.high, hint: 'Pornește de la POC și compară mereu rândul de deasupra cu cel de dedesubt; adaugă-l pe cel mai mare până treci de 70% din total.' },
    val: { value: ex.va.low, hint: 'Aceeași metodă ca la VAH: te oprești când ai cel puțin 70% din TPO-uri.' },
    high: { value: ex.extremes.high.kind === 'weak' ? 'none' : ex.extremes.high.kind, hint: 'Câte rânduri cu o singură literă sunt la maxim?' },
    low: { value: ex.extremes.low.kind === 'weak' ? 'none' : ex.extremes.low.kind, hint: 'Câte litere sunt pe rândul cel mai de jos? Există o coadă?' },
  };

  const form = $('ex1-form');
  const STORE_KEY = 'l1-ex1';

  function saveForm() {
    const s = {};
    new FormData(form).forEach((v, k) => { s[k] = v; });
    UI.store.set(STORE_KEY, s);
  }

  function loadForm() {
    const s = UI.store.get(STORE_KEY, null);
    if (!s) return;
    Object.keys(s).forEach((k) => { if (form.elements[k]) form.elements[k].value = s[k]; });
  }

  function check() {
    let ok = 0;
    let answered = 0;
    Object.keys(answers).forEach((key) => {
      const label = form.querySelector('[data-q="' + key + '"]');
      const input = form.elements[key];
      const hint = label.querySelector('.hint');
      label.classList.remove('is-ok', 'is-ko');
      hint.textContent = '';
      const raw = input.value.trim();
      if (!raw) return;
      answered++;
      const a = answers[key];
      const correct = typeof a.value === 'number' ? Math.abs(TPO.parseNumber(raw) - a.value) < 1e-6 : raw === a.value;
      if (correct) {
        ok++;
        label.classList.add('is-ok');
        hint.textContent = '✓ Corect';
      } else {
        label.classList.add('is-ko');
        hint.textContent = a.hint;
      }
    });
    const total = Object.keys(answers).length;
    const res = $('ex1-result');
    if (!answered) {
      res.className = 'result ko';
      res.textContent = 'Completează măcar un răspuns înainte să verifici.';
      return;
    }
    res.className = 'result ' + (ok === total ? 'ok' : 'ko');
    res.textContent = ok === total
      ? 'Excelent: ' + ok + ' din ' + total + ' corecte! Deschide soluția și compară-ți răspunsul la bonus.'
      : ok + ' din ' + total + ' corecte' + (answered < total ? ' (' + (total - answered) + ' necompletate)' : '') + '. Citește indiciile de sub câmpurile roșii și mai încearcă.';
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); check(); });
  form.addEventListener('input', saveForm);
  form.addEventListener('change', saveForm);
  loadForm();

  $('ex1-reset').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('.field').forEach((l) => l.classList.remove('is-ok', 'is-ko'));
    form.querySelectorAll('.hint').forEach((h) => { h.textContent = ''; });
    $('ex1-result').textContent = '';
    $('ex1-solution').hidden = true;
    $('ex1-solution-btn').textContent = 'Arată soluția';
    UI.store.set(STORE_KEY, null);
  });

  function solutionHtml() {
    const f = (x) => TPO.formatRow(x, 1);
    return [
      '<ul>',
      '<li><b>a)</b> IB = A + B = <b>' + f(ex.ib.low) + ' – ' + f(ex.ib.high) + '</b>. IB-ul <b>nu a fost extins</b>: nicio perioadă de după B nu a ieșit din el. Tot range-ul zilei e chiar IB-ul.</li>',
      '<li><b>b)</b> POC = <b>' + f(ex.poc) + '</b> (11 litere, cel mai lung rând).</li>',
      '<li><b>c)</b> Total = <b>' + ex.total + '</b> TPO-uri, iar 70% din ' + ex.total + ' = 39,2. Pașii sunt în tabelul de mai jos. VA = <b>' + f(ex.va.low) + ' – ' + f(ex.va.high) + '</b> (' + ex.va.tpos + ' TPO-uri, ' + Math.round(ex.va.pct * 100) + '%). Observă că POC-ul <b>nu</b> e la mijlocul VA.</li>',
      '<li><b>d)</b> La maxim, 5011–5012 au doar litera B: <b>coadă de vânzare (excess)</b>. Vânzătorii OTF au respins agresiv prețurile mari, deci licitația în sus s-a terminat. Zona e rezistență puternică.</li>',
      '<li><b>e)</b> La minim, 5002 are două litere (A și K) și nu există coadă: <b>poor low</b>, adică licitație neterminată. Prețul tinde să revină sub 5002 ca s-o „termine”.</li>',
      '<li><b>f) Bonus:</b> deschiderea la 5003 e <b>sub VAL (5004), dar în range-ul de ieri</b> (5002–5012), deci un dezechilibru moderat în jos. Urmărești: dacă prețul revine în VA și stă acolo 2 perioade TPO, regula de 80% indică traversarea spre <b>VAH 5008</b>. Dacă VAL-ul ține ca rezistență, ținta probabilă e <b>poor low-ul de la 5002</b> (și sub el). Alte niveluri: POC 5005 (magnet) și coada 5011–5012 (rezistență puternică).</li>',
      '<li><b>Tipul zilei:</b> range-ul zilei e chiar IB-ul (fără extensie), deci o zi <b>Normal</b>. Detaliile vin în Lecția 3.</li>',
      '</ul>',
      '<h4>Calculul VA, pas cu pas</h4>',
      UI.stepsTable(ex.va, f),
      '<div class="callout">Cu metoda clasică „câte două rânduri” ai obține 5003–5007. De aceea VA poate diferi puțin între platforme.</div>',
    ].join('');
  }

  $('ex1-solution-btn').addEventListener('click', () => {
    const box = $('ex1-solution');
    box.hidden = !box.hidden;
    $('ex1-solution-btn').textContent = box.hidden ? 'Arată soluția' : 'Ascunde soluția';
    if (!box.hidden) {
      UI.renderProfile($('ex1-solution-profile'), ex);
      $('ex1-solution-text').innerHTML = solutionHtml();
    }
  });

  /* ---------- Quiz ---------- */

  const QUIZ = [
    {
      q: 'ES deschide sub VAL-ul de ieri, iar cumpărătorii urcă agresiv prețul înapoi în valoare. Ce fel de activitate e?',
      options: ['Initiative buying', 'Responsive buying', 'Initiative selling', 'Responsive selling'],
      correct: 1,
      explain: 'Cumpărare <b>sub</b> valoare = <b>responsive</b>: participanții văd prețul ca „ieftin” și îl împing înapoi spre valoare. Cumpărarea peste valoare ar fi fost initiative.',
    },
    {
      q: 'Prețul iese peste VAH-ul unui range de 3 zile și stă acolo 5 perioade TPO, cu volum în creștere. Ce îți spune asta?',
      options: [
        'Respingere: vinzi short, ca să prinzi revenirea în range',
        'Acceptare: valoarea se mută în sus; nu vinde contra mișcării',
        'Nimic: volumul nu contează în AMT',
        'Echilibru: cumperi la VAL-ul range-ului',
      ],
      correct: 1,
      explain: 'Prețul face reclamă (iese din range), <b>timpul</b> o validează (5 perioade) și <b>volumul</b> confirmă. E acceptare și dezechilibru în sus: cauți tranzacții initiative în direcția mișcării, nu fade.',
    },
    {
      q: 'De ce e considerat un poor high o licitație neterminată?',
      options: [
        'Pentru că la maxim s-a tranzacționat volum foarte mare',
        'Pentru că nu există excess: piața s-a oprit „plat”, fără respingere agresivă, și tinde să revină ca să termine licitația',
        'Pentru că un poor high e mereu sub POC',
        'Pentru că apare doar în sesiunea overnight',
      ],
      correct: 1,
      explain: 'O licitație se termină când partea opusă intră agresiv (coadă / excess). La un poor high mai multe perioade s-au oprit la același preț fără respingere puternică, deci interesul de cumpărare nu a fost „epuizat”. Piața revine de obicei să încerce din nou.',
    },
    {
      q: 'Adevărat sau fals: POC-ul e întotdeauna la mijlocul Value Area.',
      options: ['Adevărat', 'Fals'],
      correct: 1,
      explain: '<b>Fals.</b> VA se extinde la fiecare pas spre partea cu mai mult volum sau mai multe TPO-uri, așa că poate fi asimetrică. POC-ul poate fi foarte aproape de VAH sau de VAL.',
    },
    {
      q: 'Completează: în echilibru cauți tranzacții ___, în dezechilibru cauți tranzacții ___.',
      options: ['responsive / initiative', 'initiative / responsive', 'breakout / fade', 'orice / niciuna'],
      correct: 0,
      explain: 'În echilibru prețul oscilează între margini, deci cumperi jos și vinzi sus (<b>responsive</b>). În dezechilibru piața caută valoare nouă, deci mergi cu mișcarea (<b>initiative</b>).',
    },
  ];

  const quizEl = $('quiz-box');
  const scoreEl = $('quiz-score');
  const state = QUIZ.map(() => null);

  function updateScore() {
    const answered = state.filter((s) => s !== null).length;
    if (!answered) { scoreEl.textContent = ''; return; }
    const ok = state.filter((s, i) => s === QUIZ[i].correct).length;
    scoreEl.className = 'result ' + (ok === QUIZ.length ? 'ok' : 'ko');
    scoreEl.textContent = 'Scor: ' + ok + ' / ' + QUIZ.length + (answered < QUIZ.length ? ' (mai ai ' + (QUIZ.length - answered) + ' întrebări)' : ok === QUIZ.length ? '. Perfect!' : '. Recitește explicațiile la cele greșite.');
  }

  quizEl.innerHTML = QUIZ.map((item, qi) =>
    '<div class="quiz-q" data-qi="' + qi + '"><h3>' + (qi + 1) + '. ' + UI.esc(item.q) + '</h3><div class="quiz-options">' +
    item.options.map((o, oi) => '<button type="button" class="quiz-option" data-oi="' + oi + '">' + UI.esc(o) + '</button>').join('') +
    '</div><div class="quiz-explain" hidden></div></div>'
  ).join('') + '<div class="btn-row"><button type="button" class="btn btn-ghost" id="quiz-reset">Reia quiz-ul</button></div>';

  quizEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    const wrap = btn.closest('.quiz-q');
    const qi = Number(wrap.dataset.qi);
    if (state[qi] !== null) return;
    const oi = Number(btn.dataset.oi);
    state[qi] = oi;
    const item = QUIZ[qi];
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

  quizEl.addEventListener('click', (e) => {
    if (e.target.id !== 'quiz-reset') return;
    state.fill(null);
    quizEl.querySelectorAll('.quiz-option').forEach((b) => { b.disabled = false; b.classList.remove('is-correct', 'is-wrong'); });
    quizEl.querySelectorAll('.quiz-explain').forEach((x) => { x.hidden = true; x.innerHTML = ''; });
    updateScore();
  });
})();
