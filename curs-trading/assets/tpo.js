/*
 * Motor TPO (Market Profile), fără dependențe.
 *
 * Construiește profilul unei sesiuni din bare de 30 de minute și calculează:
 * POC, Value Area, Initial Balance, extensia de range, extremele (coadă / poor),
 * single prints din interior și o estimare a tipului de zi.
 * Conține și utilitarele pentru compararea a două zile (deschidere, valoare, regula de 80%).
 *
 * Funcționează în browser (window.TPO) și în Node (require('./tpo.js')).
 */
(function (global) {
  'use strict';

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const EPS = 1e-9;

  function decimalsFor(size) {
    const s = String(size);
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }

  /** Indexul rândului din profil în care cade un preț (rândul acoperă [idx*size, (idx+1)*size)). */
  function rowIndex(price, size) {
    return Math.floor(price / size + EPS);
  }

  function roundPrice(p) {
    return Math.round(p * 1e6) / 1e6;
  }

  /** Formatează prețul unui rând (multiplu de rowSize). */
  function formatRow(price, size) {
    return Number(price).toFixed(decimalsFor(size));
  }

  /** Formatează un preț brut (ex: 7602.25), fără zerouri inutile. */
  function formatPrice(price) {
    if (price === null || price === undefined || Number.isNaN(price)) return '—';
    return String(Math.round(price * 100) / 100);
  }

  /** Acceptă și virgula ca separator zecimal (ex: „7602,25”). */
  function parseNumber(token) {
    let t = String(token).trim();
    if (t.indexOf(',') >= 0 && t.indexOf('.') < 0) t = t.replace(',', '.');
    if (!/^[-+]?\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }

  /**
   * Împarte un rând în valori. Virgula e tratată ca separator zecimal dacă rândul folosește „;” / tab
   * sau dacă apare doar în numere de forma „7602,25”; altfel e separator de coloane (CSV).
   */
  function splitLine(line) {
    let tokens = line.split(/[\s;]+/).filter(Boolean);
    const decimalComma = /[;\t]/.test(line) || tokens.every((t) => t.indexOf(',') < 0 || /^[-+]?\d+,\d+$/.test(t));
    if (!decimalComma) tokens = tokens.flatMap((t) => t.split(','));
    return tokens.map((t) => t.replace(/^,+|,+$/g, '')).filter(Boolean);
  }

  const DATE_RE = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/;
  const TIME_RE = /^\d{1,2}[:.h]\d{2}([:.]\d{2})?$/;

  /**
   * Citește barele de 30 de minute dintr-un text.
   * Formate acceptate pe fiecare rând (ora și data sunt opționale):
   *   16:30 7610 7596                 → high low
   *   16:30 7600 7610 7596 7606       → open high low close
   *   2026-11-06 16:30,7600,7610,7596,7606[,volum]
   */
  function parseBars(text) {
    const bars = [];
    const errors = [];
    String(text || '').split(/\r?\n/).forEach((raw, n) => {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      const tokens = splitLine(line);
      while (tokens.length && DATE_RE.test(tokens[0])) tokens.shift();
      let time = null;
      if (tokens.length >= 3 && TIME_RE.test(tokens[0])) {
        const t = tokens.shift().replace(/[.h]/g, ':').split(':');
        time = t[0].padStart(2, '0') + ':' + t[1];
      }
      const nums = tokens.map(parseNumber);
      const where = 'Rândul ' + (n + 1);
      if (!nums.length || nums.every(Number.isNaN)) {
        // Antet sau text fără cifre: îl ignorăm. Dacă are cifre, nu-l ignorăm pe tăcute.
        if (/\d/.test(line)) errors.push(where + ': nu am putut citi rândul („' + line + '”).');
        return;
      }
      if (nums.some(Number.isNaN)) {
        errors.push(where + ': am găsit o valoare care nu e număr („' + line + '”).');
        return;
      }
      let bar;
      if (nums.length === 2) {
        bar = { open: null, high: Math.max(nums[0], nums[1]), low: Math.min(nums[0], nums[1]), close: null };
      } else if (nums.length === 4 || nums.length === 5) {
        const [o, h, l, c] = nums;
        if (h < l || o > h || o < l || c > h || c < l) {
          errors.push(where + ': valorile nu formează o bară validă. Ordinea trebuie să fie open, high, low, close („' + line + '”).');
          return;
        }
        bar = { open: o, high: h, low: l, close: c };
      } else {
        errors.push(where + ': am găsit ' + nums.length + ' numere. Folosește 2 valori (high low) sau 4 (open high low close) („' + line + '”).');
        return;
      }
      bar.time = time;
      bars.push(bar);
    });
    if (bars.length > LETTERS.length) {
      errors.push('Ai introdus ' + bars.length + ' bare; maximul este ' + LETTERS.length + ' (o literă pentru fiecare perioadă de 30 de minute).');
    }
    return { bars, errors };
  }

  /** Citește un profil de volum: un rând „preț volum” pe linie. */
  function parseVolumeRows(text) {
    const map = new Map();
    const errors = [];
    String(text || '').split(/\r?\n/).forEach((raw, n) => {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) return;
      const nums = splitLine(line).map(parseNumber);
      if (!nums.length || (nums.every(Number.isNaN) && !/\d/.test(line))) return;
      if (nums.length !== 2 || nums.some(Number.isNaN) || nums[1] < 0) {
        errors.push('Rândul ' + (n + 1) + ': folosește formatul „preț volum” („' + line + '”).');
        return;
      }
      const key = roundPrice(nums[0]);
      map.set(key, (map.get(key) || 0) + nums[1]);
    });
    const rows = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([price, count]) => ({ price, count }));
    return { rows, errors };
  }

  /** POC = rândul cu cele mai multe TPO/volum; la egalitate, cel mai apropiat de mijlocul profilului. */
  function findPoc(rows) {
    if (!rows.length) return -1;
    const mid = (rows.length - 1) / 2;
    let best = 0;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i];
      const b = rows[best];
      if (a.count > b.count || (a.count === b.count && Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    }
    return best;
  }

  /**
   * Value Area pornind de la POC.
   * method 'single': compară câte un rând deasupra cu câte unul dedesubt.
   * method 'dual':   compară câte două rânduri (metoda clasică CBOT).
   * La egalitate se adaugă ambele părți. rows trebuie să fie ordonate crescător după preț.
   */
  function computeValueArea(rows, pocIndex, pct, method) {
    const total = rows.reduce((s, r) => s + r.count, 0);
    const target = total * pct;
    const step = method === 'dual' ? 2 : 1;
    let lo = pocIndex;
    let hi = pocIndex;
    let acc = rows[pocIndex].count;
    const steps = [{ kind: 'start', rows: [rows[pocIndex].price], added: acc, acc }];
    while (acc < target - EPS && (lo > 0 || hi < rows.length - 1)) {
      const up = [];
      const down = [];
      for (let k = 1; k <= step; k++) {
        if (hi + k < rows.length) up.push(hi + k);
        if (lo - k >= 0) down.push(lo - k);
      }
      const upSum = up.reduce((s, i) => s + rows[i].count, 0);
      const downSum = down.reduce((s, i) => s + rows[i].count, 0);
      let take;
      if (!up.length) take = 'down';
      else if (!down.length) take = 'up';
      else if (upSum > downSum) take = 'up';
      else if (downSum > upSum) take = 'down';
      else take = 'both';
      let added = 0;
      if (take !== 'down') { hi = up[up.length - 1]; added += upSum; }
      if (take !== 'up') { lo = down[down.length - 1]; added += downSum; }
      acc += added;
      steps.push({
        kind: 'step',
        up: up.map((i) => ({ price: rows[i].price, count: rows[i].count })),
        upSum,
        down: down.map((i) => ({ price: rows[i].price, count: rows[i].count })),
        downSum,
        take,
        added,
        acc,
      });
    }
    return {
      loIndex: lo,
      hiIndex: hi,
      low: rows[lo].price,
      high: rows[hi].price,
      tpos: acc,
      total,
      target,
      pct: total ? acc / total : 0,
      steps,
      method: step === 2 ? 'dual' : 'single',
    };
  }

  function extremeInfo(singles, edgeCount) {
    if (singles >= 2) return { kind: 'tail', length: singles };
    if (edgeCount >= 2) return { kind: 'poor', length: 0, tpos: edgeCount };
    return { kind: 'weak', length: singles };
  }

  function estimateDayType(p) {
    const ibW = p.ib.high - p.ib.low;
    const range = p.high - p.low;
    const up = !!p.ib.extUp;
    const down = !!p.ib.extDown;
    const c = p.closeRef;
    if (!up && !down) {
      return {
        code: 'normal',
        name: 'Normal',
        note: 'IB-ul nu a fost extins: participanții OTF au stat deoparte după prima oră. Dacă IB-ul e foarte îngust, ziua e mai degrabă Non-Trend.',
      };
    }
    if (up && down) {
      const pos = range ? (c - p.low) / range : 0.5;
      if (pos > 1 / 3 && pos < 2 / 3) {
        return { code: 'neutral-center', name: 'Neutral Center', note: 'IB-ul a fost extins în ambele direcții, iar închiderea e la mijloc: echilibru, niciun grup OTF nu a câștigat ziua.' };
      }
      return { code: 'neutral-extreme', name: 'Neutral Extreme', note: 'IB-ul a fost extins în ambele direcții, iar închiderea e la o extremă: partea care a închis ziua a câștigat și de multe ori continuă a doua zi.' };
    }
    const ratio = ibW > 0 ? range / ibW : Infinity;
    const nearExtreme = up ? p.high - c <= 0.25 * range : c - p.low <= 0.25 * range;
    const dir = up ? 'în sus' : 'în jos';
    if (ratio >= 2 && nearExtreme) {
      if (p.extremes.midSingles.length) {
        return { code: 'double-distribution', name: 'Double Distribution Trend', note: 'Range de cel puțin 2× IB, închidere aproape de extremă și single prints care separă două zone de valoare: o mișcare initiative ' + dir + ' între două echilibre.' };
      }
      return { code: 'trend', name: 'Trend', note: 'Range de cel puțin 2× IB și închidere aproape de extremă: OTF-ul a controlat ziua ' + dir + '.' };
    }
    return { code: 'normal-variation', name: 'Normal Variation', note: 'IB-ul a fost extins ' + dir + ', dar fără o tendință care să domine toată ziua.' };
  }

  /**
   * Construiește profilul TPO al unei sesiuni.
   * options: { rowSize: 1, vaPct: 0.7, method: 'single' | 'dual', ibPeriods: 2 }
   */
  function buildProfile(bars, options) {
    const o = Object.assign({ rowSize: 1, vaPct: 0.7, method: 'single', ibPeriods: 2 }, options || {});
    if (!bars || !bars.length) throw new Error('Nu există bare.');
    const size = Number(o.rowSize);
    if (!(size > 0)) throw new Error('Mărimea rândului trebuie să fie pozitivă.');

    const map = {};
    let minI = Infinity;
    let maxI = -Infinity;
    bars.forEach((b, i) => {
      const letter = LETTERS.charAt(i) || '?';
      const lo = rowIndex(b.low, size);
      const hi = rowIndex(b.high, size);
      for (let r = lo; r <= hi; r++) (map[r] = map[r] || []).push(letter);
      if (lo < minI) minI = lo;
      if (hi > maxI) maxI = hi;
    });

    const rows = [];
    for (let r = minI; r <= maxI; r++) {
      const letters = map[r] || [];
      rows.push({ idx: r, price: roundPrice(r * size), letters, count: letters.length });
    }
    const n = rows.length;
    const pocIndex = findPoc(rows);
    const va = computeValueArea(rows, pocIndex, o.vaPct, o.method);

    const ibBars = bars.slice(0, Math.min(o.ibPeriods, bars.length));
    const ibHigh = Math.max(...ibBars.map((b) => b.high));
    const ibLow = Math.min(...ibBars.map((b) => b.low));
    let extUp = null;
    let extDown = null;
    for (let k = o.ibPeriods; k < bars.length; k++) {
      const b = bars[k];
      if (!extUp && b.high > ibHigh) extUp = LETTERS.charAt(k);
      if (!extDown && b.low < ibLow) extDown = LETTERS.charAt(k);
    }

    let topSingles = 0;
    while (topSingles < n && rows[n - 1 - topSingles].count === 1) topSingles++;
    let botSingles = 0;
    while (botSingles < n && rows[botSingles].count === 1) botSingles++;
    const highInfo = extremeInfo(topSingles, rows[n - 1].count);
    const lowInfo = extremeInfo(botSingles, rows[0].count);

    const midSingles = [];
    let cur = null;
    for (let i = botSingles; i < n - topSingles; i++) {
      if (rows[i].count <= 1) {
        if (cur && cur.toIndex === i - 1) cur.toIndex = i;
        else { cur = { fromIndex: i, toIndex: i }; midSingles.push(cur); }
      }
    }
    midSingles.forEach((g) => {
      g.low = rows[g.fromIndex].price;
      g.high = rows[g.toIndex].price;
      g.rows = g.toIndex - g.fromIndex + 1;
    });

    const last = bars[bars.length - 1];
    const profile = {
      rowSize: size,
      ibPeriods: o.ibPeriods,
      rows,
      total: va.total,
      pocIndex,
      poc: rows[pocIndex].price,
      va,
      ib: { high: ibHigh, low: ibLow, periods: ibBars.length, extUp, extDown },
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      open: bars[0].open,
      close: last.close,
      closeRef: last.close !== null && last.close !== undefined ? last.close : (last.high + last.low) / 2,
      extremes: { high: highInfo, low: lowInfo, midSingles },
      bars,
    };
    profile.dayType = estimateDayType(profile);
    return profile;
  }

  /* ---------- Compararea a două zile ---------- */

  /** d: { vah, val, bucket } — bucket = mărimea rândului dacă VA vine dintr-un profil construit aici, altfel 0. */
  function isAboveVA(price, d) {
    return d.bucket ? price >= d.vah + d.bucket : price > d.vah;
  }

  function isBelowVA(price, d) {
    return price < d.val;
  }

  /** Unde deschide ziua 2 față de ziua 1: 'above-range' | 'above-va' | 'in-va' | 'below-va' | 'below-range'. */
  function classifyOpen(open, d1) {
    if (d1.high !== null && d1.high !== undefined && open > d1.high) return 'above-range';
    if (d1.low !== null && d1.low !== undefined && open < d1.low) return 'below-range';
    if (isAboveVA(open, d1)) return 'above-va';
    if (isBelowVA(open, d1)) return 'below-va';
    return 'in-va';
  }

  /** Relația dintre Value Area din ziua 2 și cea din ziua 1. */
  function valueRelation(d1, d2) {
    if (d2.val > d1.vah) return 'higher';
    if (d2.vah < d1.val) return 'lower';
    if (d2.vah <= d1.vah && d2.val >= d1.val) return 'inside';
    if (d2.vah >= d1.vah && d2.val <= d1.val) return 'outside';
    if (d2.vah > d1.vah) return 'overlap-higher';
    return 'overlap-lower';
  }

  /**
   * Regula de 80%: deschidere în afara VA de ieri, apoi două perioade consecutive care tranzacționează
   * în VA → probabilitate mare de traversare până la marginea opusă.
   */
  function rule80(bars, d1, open) {
    const loc = classifyOpen(open, d1);
    if (loc === 'in-va') return { applicable: false, location: loc };
    const side = loc === 'above-va' || loc === 'above-range' ? 'above' : 'below';
    const top = d1.bucket ? d1.vah + d1.bucket : d1.vah;
    const inside = (b) => b.high >= d1.val && (d1.bucket ? b.low < top : b.low <= top);
    let trig = -1;
    for (let i = 0; i + 1 < bars.length; i++) {
      if (inside(bars[i]) && inside(bars[i + 1])) { trig = i + 1; break; }
    }
    if (trig < 0) return { applicable: true, location: loc, side, triggered: false };
    let reached = -1;
    for (let j = trig - 1; j < bars.length; j++) {
      const b = bars[j];
      if (side === 'above' ? b.low <= d1.val : b.high >= d1.vah) { reached = j; break; }
    }
    return {
      applicable: true,
      location: loc,
      side,
      triggered: true,
      triggerLetter: LETTERS.charAt(trig),
      reached: reached >= 0,
      reachedLetter: reached >= 0 ? LETTERS.charAt(reached) : null,
    };
  }

  const api = {
    LETTERS,
    rowIndex,
    formatRow,
    formatPrice,
    parseNumber,
    parseBars,
    parseVolumeRows,
    findPoc,
    computeValueArea,
    buildProfile,
    isAboveVA,
    isBelowVA,
    classifyOpen,
    valueRelation,
    rule80,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TPO = api;
})(typeof window !== 'undefined' ? window : this);
