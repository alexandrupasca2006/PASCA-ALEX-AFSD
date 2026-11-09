/* Analiza zilei: compară ziua 2 cu ziua 1 după AMT. */
(function () {
  'use strict';

  const { TPO, UI, CURS_DATA } = window;
  const $ = (id) => document.getElementById(id);
  const isNum = UI.isNum;
  const esc = UI.esc;
  const fp = TPO.formatPrice;

  const F1 = ['high', 'low', 'close', 'poc', 'vah', 'val'];
  const F2 = ['onh', 'onl', 'open', 'high', 'low', 'close', 'poc', 'vah', 'val'];
  const IDS = ['label1', 'label2', 'bars1', 'bars2', 'rowSize', 'method'].concat(F1.map((f) => 'd1-' + f), F2.map((f) => 'd2-' + f));
  const STORE_KEY = 'analiza';

  /* ---------- Stare salvată ---------- */

  function save() {
    const s = {};
    IDS.forEach((id) => { s[id] = $(id).value; });
    UI.store.set(STORE_KEY, s);
  }

  function load() {
    const s = UI.store.get(STORE_KEY, null);
    if (!s) return false;
    IDS.forEach((id) => { if (typeof s[id] === 'string') $(id).value = s[id]; });
    return IDS.some((id) => id !== 'rowSize' && id !== 'method' && s[id]);
  }

  /* ---------- Citire ---------- */

  function readNum(id, errors, label) {
    const raw = $(id).value.trim();
    if (!raw) return null;
    const n = TPO.parseNumber(raw);
    if (Number.isNaN(n)) {
      errors.push(label + ': „' + raw + '” nu e un număr.');
      return null;
    }
    return n;
  }

  function setNum(id, v) {
    $(id).value = isNum(v) ? fp(v) : '';
  }

  function profileFrom(text, label, size, method, errors) {
    const r = TPO.parseBars(text);
    r.errors.forEach((e) => errors.push(label + ', ' + e.charAt(0).toLowerCase() + e.slice(1)));
    if (r.errors.length || !r.bars.length) return null;
    return TPO.buildProfile(r.bars, { rowSize: size, method });
  }

  const hasVA = (d) => isNum(d.vah) && isNum(d.val) && d.vah >= d.val;
  const vaTop = (d) => (d.bucket ? d.vah + d.bucket : d.vah);

  /* ---------- Texte ---------- */

  const OPEN_TEXT = {
    'in-va': (d1) => ({
      title: 'Deschidere în Value Area de ieri',
      meaning: 'Echilibru: piața acceptă, deocamdată, valoarea de ieri.',
      expect: [
        'Rotații în interiorul VA; POC-ul de ieri (' + fp(d1.poc) + ') atrage prețul.',
        'Tranzacții responsive la marginile VA: vinzi aproape de VAH (' + fp(d1.vah) + '), cumperi aproape de VAL (' + fp(d1.val) + '), doar cu confirmare din orderflow.',
        'O zi de trend e puțin probabilă până când prețul nu iese din VA și nu e acceptat afară (≥ 2 perioade TPO).',
      ],
    }),
    'above-va': (d1) => ({
      title: 'Deschidere peste VA, dar în range-ul de ieri',
      meaning: 'Dezechilibru moderat în sus: cumpărătorii testează prețuri peste valoarea de ieri.',
      expect: [
        'Dacă prețul revine în VA și stă acolo 2 perioade TPO consecutive, regula de 80% indică traversarea până la VAL (' + fp(d1.val) + ').',
        'Dacă VAH-ul (' + fp(d1.vah) + ') ține ca suport (respingere a valorii vechi), piața poate continua spre maximul de ieri (' + fp(d1.high) + ') și peste.',
      ],
    }),
    'below-va': (d1) => ({
      title: 'Deschidere sub VA, dar în range-ul de ieri',
      meaning: 'Dezechilibru moderat în jos: vânzătorii testează prețuri sub valoarea de ieri.',
      expect: [
        'Dacă prețul revine în VA și stă acolo 2 perioade TPO consecutive, regula de 80% indică traversarea până la VAH (' + fp(d1.vah) + ').',
        'Dacă VAL-ul (' + fp(d1.val) + ') ține ca rezistență, piața poate continua spre minimul de ieri (' + fp(d1.low) + ') și sub.',
      ],
    }),
    'above-range': (d1) => ({
      title: 'Deschidere peste range-ul de ieri (gap în sus)',
      meaning: 'Dezechilibru puternic posibil: piața deschide peste tot ce s-a tranzacționat ieri.',
      expect: [
        'Dacă prețul nu revine în range-ul de ieri (sub ' + fp(d1.high) + ') în prima oră, crește probabilitatea unei zile de trend în sus. Nu merge contra mișcării.',
        'Dacă revine în range și apoi în VA, gap-ul e respins: VAH (' + fp(d1.vah) + ') și POC (' + fp(d1.poc) + ') devin ținte.',
      ],
    }),
    'below-range': (d1) => ({
      title: 'Deschidere sub range-ul de ieri (gap în jos)',
      meaning: 'Dezechilibru puternic posibil: piața deschide sub tot ce s-a tranzacționat ieri.',
      expect: [
        'Dacă prețul nu revine în range-ul de ieri (peste ' + fp(d1.low) + ') în prima oră, crește probabilitatea unei zile de trend în jos. Nu merge contra mișcării.',
        'Dacă revine în range și apoi în VA, gap-ul e respins: VAL (' + fp(d1.val) + ') și POC (' + fp(d1.poc) + ') devin ținte.',
      ],
    }),
  };

  const VALUE_TEXT = {
    higher: ['Valoare mai sus (Higher value)', 'Toată Value Area de azi e peste cea de ieri: cumpărătorii OTF controlează și mută valoarea în sus.'],
    'overlap-higher': ['Valoare suprapusă, mai sus (Overlapping higher)', 'Valoarea s-a mutat puțin în sus, dar se suprapune cu cea de ieri: tendință slabă în sus, convingere mică.'],
    inside: ['Valoare în interior (Inside)', 'VA de azi e în interiorul celei de ieri: echilibru. Piața se comprimă și așteaptă, de multe ori înaintea unei ieșiri din range.'],
    outside: ['Valoare în exterior (Outside)', 'VA de azi o cuprinde pe cea de ieri: piața a explorat ambele direcții. Contează unde a închis și unde e POC-ul.'],
    'overlap-lower': ['Valoare suprapusă, mai jos (Overlapping lower)', 'Valoarea s-a mutat puțin în jos, dar se suprapune cu cea de ieri: tendință slabă în jos, convingere mică.'],
    lower: ['Valoare mai jos (Lower value)', 'Toată Value Area de azi e sub cea de ieri: vânzătorii OTF controlează și mută valoarea în jos.'],
  };

  function card(title, body, id) {
    return '<section class="card"' + (id ? ' id="' + id + '"' : '') + '><h3>' + title + '</h3>' + body + '</section>';
  }

  function extremeNote(e) {
    if (e.kind === 'tail') return 'coadă (excess): referință puternică';
    if (e.kind === 'poor') return 'poor: licitație neterminată, probabil revizitat';
    return '';
  }

  function closeText(d, label) {
    if (!isNum(d.close) || !hasVA(d)) return '';
    if (TPO.isAboveVA(d.close, d)) return 'Închiderea ' + esc(label) + ' (' + fp(d.close) + ') e <b>peste VAH</b>: putere, cumpărătorii au închis ziua în control.';
    if (TPO.isBelowVA(d.close, d)) return 'Închiderea ' + esc(label) + ' (' + fp(d.close) + ') e <b>sub VAL</b>: slăbiciune, vânzătorii au închis ziua în control.';
    return 'Închiderea ' + esc(label) + ' (' + fp(d.close) + ') e <b>în VA</b>: echilibru la final de zi.';
  }

  /* ---------- Secțiuni ---------- */

  function levelList(d1, d2, p1, label1) {
    const L = [];
    const add = (v, name, note) => { if (isNum(v)) L.push({ v, name, note: note || '' }); };
    add(d1.high, 'High ' + label1, p1 ? extremeNote(p1.extremes.high) : '');
    add(d1.vah, 'VAH ' + label1);
    add(d1.poc, 'POC ' + label1, 'magnet în echilibru');
    add(d1.val, 'VAL ' + label1);
    add(d1.low, 'Low ' + label1, p1 ? extremeNote(p1.extremes.low) : '');
    add(d2.onh, 'ONH', 'maximul din overnight');
    add(d2.onl, 'ONL', 'minimul din overnight');
    if (p1) {
      p1.extremes.midSingles.forEach((g) => add(g.high, 'Single prints ' + label1, 'zona ' + fp(g.low) + '–' + fp(g.high) + ': mișcare rapidă'));
    }
    return L.sort((a, b) => b.v - a.v);
  }

  function levelsSection(d1, d2, p1, label1, label2) {
    const L = levelList(d1, d2, p1, label1);
    if (!L.length) return '';
    const open = d2.open;
    const rows = [];
    let openPlaced = !isNum(open);
    const openRow = () => '<tr style="background:var(--accent-soft)"><td><b>◀ Open ' + esc(label2) + '</b></td><td class="num"><b>' + fp(open) + '</b></td><td class="num">0</td><td></td></tr>';
    L.forEach((x) => {
      if (!openPlaced && x.v < open) { rows.push(openRow()); openPlaced = true; }
      const dist = isNum(open) ? x.v - open : null;
      rows.push('<tr><td>' + esc(x.name) + '</td><td class="num">' + fp(x.v) + '</td><td class="num">' +
        (dist === null ? '—' : (dist > 0 ? '+' : '') + fp(dist)) + '</td><td class="muted small">' + esc(x.note) + '</td></tr>');
    });
    if (!openPlaced) rows.push(openRow());
    return card('Harta nivelurilor',
      '<div id="lv-chart"></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Nivel</th><th class="num">Preț</th><th class="num">Față de open</th><th>Notă</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>');
  }

  function day1Section(d1, p1, label1, showProfile) {
    let body = '';
    if (p1) {
      body += UI.profileSummary(p1);
      if (showProfile) body += '<div id="p1-profile" style="margin-top:14px"></div>';
    } else {
      const items = [];
      if (isNum(d1.high) && isNum(d1.low)) items.push('<li>Range: <b>' + fp(d1.low) + ' – ' + fp(d1.high) + '</b> (' + fp(d1.high - d1.low) + ' puncte).</li>');
      if (hasVA(d1)) items.push('<li>Value Area: <b>' + fp(d1.val) + ' – ' + fp(d1.vah) + '</b>' + (isNum(d1.poc) ? ', POC <b>' + fp(d1.poc) + '</b>' : '') + '.</li>');
      body += '<ul>' + items.join('') + '</ul><p class="muted small">Lipește și barele de 30 de minute ca să vezi IB-ul, extremele (coadă / poor) și tipul zilei.</p>';
    }
    const ct = closeText(d1, label1);
    if (ct) body += '<p>' + ct + '</p>';
    return card('1 · ' + esc(label1) + ': harta zilei de referință', body);
  }

  function overnightSection(d1, d2) {
    if (!isNum(d2.onh) || !isNum(d2.onl)) {
      return card('2 · Overnight', '<p class="muted">Completează ONH și ONL ca să vezi unde a tranzacționat overnight-ul (01:00–16:30 RO).</p>');
    }
    const notes = [];
    if (hasVA(d1)) {
      if (TPO.isAboveVA(d2.onl, d1)) notes.push('Overnight-ul a tranzacționat <b>complet peste VA</b> de ieri: peste noapte s-au acceptat deja prețuri mai mari.');
      else if (TPO.isBelowVA(d2.onh, d1)) notes.push('Overnight-ul a tranzacționat <b>complet sub VA</b> de ieri: peste noapte s-au acceptat deja prețuri mai mici.');
      else if (!TPO.isAboveVA(d2.onh, d1) && !TPO.isBelowVA(d2.onl, d1)) notes.push('Overnight-ul a stat <b>în interiorul VA</b> de ieri: echilibru, fără convingere peste noapte.');
      else notes.push('Overnight-ul a tranzacționat <b>și în VA, și în afara ei</b>: direcția nu e încă clară.');
    }
    if (isNum(d1.high) && d2.onh > d1.high) notes.push('A urcat peste <b>maximul de ieri</b> (' + fp(d1.high) + ').');
    if (isNum(d1.low) && d2.onl < d1.low) notes.push('A coborât sub <b>minimul de ieri</b> (' + fp(d1.low) + ').');
    notes.push('Range overnight: ' + fp(d2.onl) + ' – ' + fp(d2.onh) + ' (' + fp(d2.onh - d2.onl) + ' puncte).');
    if (isNum(d2.open) && d2.onh > d2.onl) {
      const pos = (d2.open - d2.onl) / (d2.onh - d2.onl);
      if (pos >= 0.8) notes.push('La 16:30 prețul e în <b>partea de sus</b> a range-ului overnight: inventarul overnight e probabil <b>long</b>. Atenție la o corecție (pullback) la deschidere, înainte de direcția reală.');
      else if (pos <= 0.2) notes.push('La 16:30 prețul e în <b>partea de jos</b> a range-ului overnight: inventarul overnight e probabil <b>short</b>. E posibil un rebound la deschidere.');
      else notes.push('La 16:30 prețul e la mijlocul range-ului overnight: inventar echilibrat.');
    }
    return card('2 · Overnight',
      '<ul>' + notes.map((n) => '<li>' + n + '</li>').join('') + '</ul>' +
      '<div class="callout callout-warn">În zilele cu date macro la <b>15:30 RO</b> (CPI, NFP), reacția de la 15:30–16:30 face des ONH sau ONL. Întrebarea-cheie: a dus știrea prețul în afara valorii de ieri?</div>');
  }

  function openSection(d1, d2, p1, label1) {
    if (!isNum(d2.open)) return card('3 · Deschiderea', '<p class="muted">Completează prețul de deschidere (16:30 RO) ca să vezi scenariul.</p>');
    if (!hasVA(d1)) return card('3 · Deschiderea', '<p class="muted">Am nevoie de VAH și VAL din ziua 1.</p>');
    const code = TPO.classifyOpen(d2.open, d1);
    const t = OPEN_TEXT[code](d1);
    const L = levelList(d1, d2, p1, label1);
    const above = L.filter((x) => x.v > d2.open).pop();
    const below = L.find((x) => x.v < d2.open);
    const near = [];
    if (above) near.push('Cel mai apropiat nivel <b>deasupra</b>: ' + esc(above.name) + ' ' + fp(above.v) + ' (+' + fp(above.v - d2.open) + ')');
    if (below) near.push('Cel mai apropiat nivel <b>dedesubt</b>: ' + esc(below.name) + ' ' + fp(below.v) + ' (−' + fp(d2.open - below.v) + ')');
    return card('3 · ' + t.title,
      '<p>Open ' + fp(d2.open) + '. <b>' + t.meaning + '</b></p>' +
      '<ul>' + t.expect.map((x) => '<li>' + x + '</li>').join('') + '</ul>' +
      (near.length ? '<p class="small">' + near.join('<br>') + '</p>' : ''));
  }

  function rule80Section(d1, d2, p2) {
    if (!p2 || !isNum(d2.open) || !hasVA(d1)) return '';
    const r = TPO.rule80(p2.bars, d1, d2.open);
    let body;
    if (!r.applicable) {
      body = '<p>Deschiderea a fost <b>în VA</b> de ieri, deci regula de 80% nu se aplică azi.</p>';
    } else if (!r.triggered) {
      body = '<p>Prețul a deschis ' + (r.side === 'above' ? 'peste' : 'sub') + ' VA de ieri și <b>nu a tranzacționat în VA două perioade consecutive</b>. Regula nu s-a declanșat: piața a respins valoarea de ieri.</p>';
    } else {
      const edge = r.side === 'above' ? 'VAL ' + fp(d1.val) : 'VAH ' + fp(d1.vah);
      body = '<p>S-a declanșat în perioada <b>' + r.triggerLetter + '</b> (a doua perioadă consecutivă în VA de ieri). ' +
        (r.reached
          ? 'Prețul a atins marginea opusă (<b>' + edge + '</b>) în perioada <b>' + r.reachedLetter + '</b>: regula a funcționat.'
          : 'Prețul <b>nu</b> a ajuns la marginea opusă (' + edge + '): de data asta regula a eșuat. Nu e garantată.') + '</p>';
    }
    body += '<p class="muted small">Regula: deschidere în afara VA de ieri, apoi 2 perioade TPO consecutive în VA → probabilitate mare de traversare până la marginea opusă. E o regulă clasică; verific-o pe datele tale.</p>';
    return card('4 · Regula de 80%', body);
  }

  function day2Section(p2, d2, label2) {
    if (!p2) return '';
    let body = UI.profileSummary(p2);
    const ct = closeText(d2, label2);
    if (ct) body += '<p>' + ct + '</p>';
    return card('5 · ' + esc(label2) + ': cum s-a desfășurat ziua', body);
  }

  function valueSection(d1, d2, label1, label2) {
    if (!hasVA(d1) || !hasVA(d2)) {
      return card('6 · Unde s-a mutat valoarea', '<p class="muted">După închidere, completează VAH și VAL pentru ziua 2 (sau lipește barele) ca să vezi relația dintre valori.</p>');
    }
    const rel = TPO.valueRelation(d1, d2);
    const [title, text] = VALUE_TEXT[rel];
    let poc = '';
    if (isNum(d1.poc) && isNum(d2.poc)) {
      poc = d2.poc > d1.poc ? 'POC-ul a urcat de la ' + fp(d1.poc) + ' la ' + fp(d2.poc) + '.'
        : d2.poc < d1.poc ? 'POC-ul a coborât de la ' + fp(d1.poc) + ' la ' + fp(d2.poc) + '.'
        : 'POC-ul a rămas la ' + fp(d2.poc) + '.';
    }
    return card('6 · ' + title,
      '<p>' + text + '</p>' +
      '<p class="small">VA ' + esc(label1) + ': ' + fp(d1.val) + ' – ' + fp(d1.vah) + ' · VA ' + esc(label2) + ': ' + fp(d2.val) + ' – ' + fp(d2.vah) + '. ' + poc + '</p>');
  }

  function nextDaySection(d1, d2, p1, p2, label1, label2) {
    if (!hasVA(d2) && !p2) return '';
    const items = [];
    if (hasVA(d2)) items.push('<b>VAH / POC / VAL ' + esc(label2) + '</b>: ' + fp(d2.vah) + ' / ' + (isNum(d2.poc) ? fp(d2.poc) : '—') + ' / ' + fp(d2.val) + ': referințele principale pentru deschiderea următoare.');
    if (isNum(d2.high)) items.push('<b>High ' + fp(d2.high) + '</b>' + (p2 && extremeNote(p2.extremes.high) ? ': ' + extremeNote(p2.extremes.high) : '') + '.');
    if (isNum(d2.low)) items.push('<b>Low ' + fp(d2.low) + '</b>' + (p2 && extremeNote(p2.extremes.low) ? ': ' + extremeNote(p2.extremes.low) : '') + '.');
    if (p2 && p2.extremes.high.kind === 'weak') items.push('Maximul are un singur single print (fără coadă clară): în zilele de trend asta sugerează că mișcarea poate continua.');
    if (p2 && p2.extremes.low.kind === 'weak') items.push('Minimul are un singur single print (fără coadă clară): mișcarea în jos poate continua.');
    if (p2) p2.extremes.midSingles.forEach((g) => items.push('<b>Single prints ' + fp(g.low) + '–' + fp(g.high) + '</b>: mișcare rapidă, zonă importantă la revenire.'));
    if (isNum(d1.poc) && isNum(d2.high) && isNum(d2.low) && (d1.poc > d2.high || d1.poc < d2.low)) {
      items.push('<b>POC-ul din ' + esc(label1) + ' (' + fp(d1.poc) + ') a rămas netestat</b> (naked POC): magnet pentru zilele următoare.');
    }
    if (p1 && isNum(d2.high) && p1.extremes.high.kind === 'poor') {
      items.push(d2.high > p1.high
        ? 'Poor high-ul din ' + esc(label1) + ' (' + fp(p1.high) + ') a fost <b>„reparat”</b>: piața a terminat licitația de acolo.'
        : 'Poor high-ul din ' + esc(label1) + ' (' + fp(p1.high) + ') e <b>încă neterminat</b>: țintă probabilă.');
    }
    if (p1 && isNum(d2.low) && p1.extremes.low.kind === 'poor') {
      items.push(d2.low < p1.low
        ? 'Poor low-ul din ' + esc(label1) + ' (' + fp(p1.low) + ') a fost <b>„reparat”</b>.'
        : 'Poor low-ul din ' + esc(label1) + ' (' + fp(p1.low) + ') e <b>încă neterminat</b>: țintă probabilă.');
    }
    return card('7 · Referințe pentru ziua următoare', '<ul>' + items.map((x) => '<li>' + x + '</li>').join('') + '</ul>' +
      '<p class="muted small">Adaugă și nivelurile de gamma (QuantWheel) și calendarul economic, apoi fă-ți ipotezele pentru deschidere.</p>');
  }

  /* ---------- Analiză ---------- */

  function analyze() {
    const errors = [];
    const size = Number($('rowSize').value);
    const method = $('method').value;
    const label1 = $('label1').value.trim() || 'Ziua 1';
    const label2 = $('label2').value.trim() || 'Ziua 2';

    const t1 = $('bars1').value.trim();
    const t2 = $('bars2').value.trim();
    const p1 = t1 ? profileFrom(t1, label1, size, method, errors) : null;
    const p2 = t2 ? profileFrom(t2, label2, size, method, errors) : null;

    if (p1) {
      setNum('d1-high', p1.high); setNum('d1-low', p1.low); setNum('d1-close', p1.close);
      setNum('d1-poc', p1.poc); setNum('d1-vah', p1.va.high); setNum('d1-val', p1.va.low);
    }
    if (p2) {
      setNum('d2-high', p2.high); setNum('d2-low', p2.low); setNum('d2-close', p2.close);
      setNum('d2-poc', p2.poc); setNum('d2-vah', p2.va.high); setNum('d2-val', p2.va.low);
      if (!$('d2-open').value.trim() && isNum(p2.open)) setNum('d2-open', p2.open);
    }

    const d1 = {};
    F1.forEach((f) => { d1[f] = readNum('d1-' + f, errors, label1 + ', ' + f.toUpperCase()); });
    const d2 = {};
    F2.forEach((f) => { d2[f] = readNum('d2-' + f, errors, label2 + ', ' + f.toUpperCase()); });
    d1.bucket = p1 ? size : 0;
    d2.bucket = p2 ? size : 0;

    [[d1, label1], [d2, label2]].forEach(([d, label]) => {
      if (isNum(d.vah) && isNum(d.val) && d.vah < d.val) errors.push(label + ': VAH trebuie să fie mai mare decât VAL.');
      if (isNum(d.high) && isNum(d.low) && d.high < d.low) errors.push(label + ': High trebuie să fie mai mare decât Low.');
      if (isNum(d.poc) && hasVA(d) && (d.poc < d.val || d.poc > vaTop(d))) errors.push(label + ': POC-ul ar trebui să fie în interiorul Value Area.');
    });
    if (isNum(d2.onh) && isNum(d2.onl) && d2.onh < d2.onl) errors.push('ONH trebuie să fie mai mare decât ONL.');

    const errBox = $('an-errors');
    errBox.innerHTML = errors.length ? '<ul>' + errors.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '';
    save();

    const out = $('out');
    if (!hasVA(d1)) {
      out.innerHTML = '<div class="card"><p class="muted" style="margin:0">Completează cel puțin VAH și VAL pentru ziua 1 (sau lipește barele de 30 de minute), ca să pot începe analiza.</p></div>';
      return;
    }

    const showCompare = !!(p1 && p2);
    out.innerHTML = [
      '<h2 style="margin-top:1.2em">Rezultatul analizei</h2>',
      levelsSection(d1, d2, p1, label1, label2),
      showCompare ? card('Profilele pe aceeași axă', '<div id="cmp-profile"></div>') : '',
      day1Section(d1, p1, label1, !showCompare),
      overnightSection(d1, d2),
      openSection(d1, d2, p1, label1),
      rule80Section(d1, d2, p2),
      day2Section(p2, d2, label2),
      p2 && !showCompare ? card('Profilul ' + esc(label2), '<div id="p2-profile"></div>') : '',
      valueSection(d1, d2, label1, label2),
      nextDaySection(d1, d2, p1, p2, label1, label2),
    ].join('');

    const lv = $('lv-chart');
    if (lv) UI.renderLevelsChart(lv, d1, d2, [label1, label2]);
    if (showCompare) UI.renderCompare($('cmp-profile'), p1, p2, [label1, label2]);
    if ($('p1-profile')) UI.renderProfile($('p1-profile'), p1);
    if ($('p2-profile')) UI.renderProfile($('p2-profile'), p2);
  }

  /* ---------- Evenimente ---------- */

  $('an-form').addEventListener('submit', (e) => {
    e.preventDefault();
    analyze();
    $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('an-form').addEventListener('input', save);
  $('an-form').addEventListener('change', save);

  $('demo-btn').addEventListener('click', () => {
    IDS.forEach((id) => { if ($(id).tagName !== 'SELECT') $(id).value = ''; });
    $('rowSize').value = String(CURS_DATA.demoRowSize);
    $('method').value = 'single';
    $('label1').value = 'Zi demo 1';
    $('label2').value = 'Zi demo 2';
    $('bars1').value = CURS_DATA.demoDay1;
    $('bars2').value = CURS_DATA.demoDay2;
    $('d2-onh').value = String(CURS_DATA.demoDay2Overnight.onh);
    $('d2-onl').value = String(CURS_DATA.demoDay2Overnight.onl);
    analyze();
    $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('clear-btn').addEventListener('click', () => {
    IDS.forEach((id) => { if ($(id).tagName !== 'SELECT') $(id).value = ''; });
    $('rowSize').value = '2';
    $('method').value = 'single';
    $('out').innerHTML = '';
    $('an-errors').innerHTML = '';
    UI.store.set(STORE_KEY, null);
  });

  if (load()) analyze();
})();
