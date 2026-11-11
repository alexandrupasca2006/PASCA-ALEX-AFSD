/* Teste pentru motorul TPO. Rulează cu: node curs-trading/tests/tpo.test.js */
'use strict';

const assert = require('assert');
const path = require('path');
const TPO = require(path.join(__dirname, '..', 'assets', 'tpo.js'));
const DATA = require(path.join(__dirname, '..', 'assets', 'data.js'));

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    console.error('  ✗ ' + name);
    throw e;
  }
}

console.log('Motor TPO');

test('parseBars: formate diferite', () => {
  const r = TPO.parseBars([
    'Time,Open,High,Low,Close',
    '16:30 7600 7610 7596 7606',
    '17:00;7606;7612;7601;7604',
    '2026-11-06 17:30,7604,7608,7601,7603',
    '18.00 7609 7602',
    '18:30 7607,25 7620,5 7606 7616',
    '# comentariu',
  ].join('\n'));
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.bars.length, 5);
  assert.strictEqual(r.bars[0].time, '16:30');
  assert.strictEqual(r.bars[3].time, '18:00');
  assert.strictEqual(r.bars[3].high, 7609);
  assert.strictEqual(r.bars[3].low, 7602);
  assert.strictEqual(r.bars[3].open, null);
  assert.strictEqual(r.bars[4].open, 7607.25);
  assert.strictEqual(r.bars[4].high, 7620.5);
});

test('parseBars: semnalează bare invalide', () => {
  const r = TPO.parseBars('16:30 7600 7590 7596 7606\n17:00 7600 7610 7596');
  assert.strictEqual(r.bars.length, 0);
  assert.strictEqual(r.errors.length, 2);
});

test('Lecția 1, Exercițiul 1: POC, VA, IB, extreme, tip de zi', () => {
  const { bars, errors } = TPO.parseBars(DATA.exercise1Bars);
  assert.deepStrictEqual(errors, []);
  const p = TPO.buildProfile(bars, { rowSize: 1 });
  const byPrice = Object.fromEntries(p.rows.map((r) => [r.price, r.letters.join('')]));
  assert.strictEqual(byPrice[5012], 'B');
  assert.strictEqual(byPrice[5010], 'BC');
  assert.strictEqual(byPrice[5007], 'ACDEFGHI');
  assert.strictEqual(byPrice[5006], 'ADEFGHIJLM');
  assert.strictEqual(byPrice[5005], 'ADEFGHIJKLM');
  assert.strictEqual(byPrice[5004], 'AEFGHJK');
  assert.strictEqual(byPrice[5003], 'AGJK');
  assert.strictEqual(byPrice[5002], 'AK');
  assert.strictEqual(p.total, 56);
  assert.strictEqual(p.poc, 5005);
  assert.strictEqual(p.va.low, 5004);
  assert.strictEqual(p.va.high, 5008);
  assert.strictEqual(p.va.tpos, 42);
  assert.strictEqual(p.ib.high, 5012);
  assert.strictEqual(p.ib.low, 5002);
  assert.strictEqual(p.ib.extUp, null);
  assert.strictEqual(p.ib.extDown, null);
  assert.deepStrictEqual(p.extremes.high, { kind: 'tail', length: 2 });
  assert.strictEqual(p.extremes.low.kind, 'poor');
  assert.strictEqual(p.extremes.midSingles.length, 0);
  assert.strictEqual(p.dayType.code, 'normal');
});

test('Lecția 1: exemplul de Value Area din volum', () => {
  const { rows, errors } = TPO.parseVolumeRows(DATA.volumeExample);
  assert.deepStrictEqual(errors, []);
  const poc = TPO.findPoc(rows);
  assert.strictEqual(rows[poc].price, 5002);
  const va = TPO.computeValueArea(rows, poc, 0.7, 'single');
  assert.strictEqual(va.low, 5000);
  assert.strictEqual(va.high, 5004);
  assert.strictEqual(va.tpos, 76);
  assert.deepStrictEqual(va.steps.slice(1).map((s) => s.acc), [40, 55, 67, 76]);
});

test('Metoda cu două rânduri dă alt rezultat pe exercițiu', () => {
  const { bars } = TPO.parseBars(DATA.exercise1Bars);
  const p = TPO.buildProfile(bars, { rowSize: 1, method: 'dual' });
  assert.strictEqual(p.va.low, 5003);
  assert.strictEqual(p.va.high, 5007);
});

const day1 = TPO.buildProfile(TPO.parseBars(DATA.demoDay1).bars, { rowSize: DATA.demoRowSize });
const day2 = TPO.buildProfile(TPO.parseBars(DATA.demoDay2).bars, { rowSize: DATA.demoRowSize });

test('Zi demo 1: Normal Variation în sus, coadă jos, poor high', () => {
  assert.strictEqual(day1.total, 70);
  assert.strictEqual(day1.poc, 7610);
  assert.strictEqual(day1.va.low, 7606);
  assert.strictEqual(day1.va.high, 7616);
  assert.strictEqual(day1.ib.high, 7612);
  assert.strictEqual(day1.ib.low, 7596);
  assert.strictEqual(day1.ib.extUp, 'E');
  assert.strictEqual(day1.ib.extDown, null);
  assert.deepStrictEqual(day1.extremes.low, { kind: 'tail', length: 2 });
  assert.strictEqual(day1.extremes.high.kind, 'poor');
  assert.strictEqual(day1.dayType.code, 'normal-variation');
  assert.strictEqual(day1.open, 7600);
  assert.strictEqual(day1.close, 7614);
});

test('Zi demo 2: trend în sus, valoare mai sus, gap peste range', () => {
  assert.strictEqual(day2.total, 59);
  assert.strictEqual(day2.poc, 7640);
  assert.strictEqual(day2.va.low, 7632);
  assert.strictEqual(day2.va.high, 7648);
  assert.deepStrictEqual(day2.extremes.low, { kind: 'tail', length: 3 });
  assert.strictEqual(day2.extremes.high.kind, 'weak');
  assert.strictEqual(day2.dayType.code, 'trend');

  const d1 = { high: day1.high, low: day1.low, vah: day1.va.high, val: day1.va.low, bucket: DATA.demoRowSize };
  const d2 = { vah: day2.va.high, val: day2.va.low };
  assert.strictEqual(TPO.classifyOpen(day2.open, d1), 'above-range');
  assert.strictEqual(TPO.valueRelation(d1, d2), 'higher');
  const r = TPO.rule80(day2.bars, d1, day2.open);
  assert.strictEqual(r.applicable, true);
  assert.strictEqual(r.triggered, false);
});

test('classifyOpen: toate cele 5 scenarii (niveluri introduse manual)', () => {
  const d1 = { high: 7620, low: 7596, vah: 7616, val: 7606, bucket: 0 };
  assert.strictEqual(TPO.classifyOpen(7625, d1), 'above-range');
  assert.strictEqual(TPO.classifyOpen(7618, d1), 'above-va');
  assert.strictEqual(TPO.classifyOpen(7616, d1), 'in-va');
  assert.strictEqual(TPO.classifyOpen(7610, d1), 'in-va');
  assert.strictEqual(TPO.classifyOpen(7600, d1), 'below-va');
  assert.strictEqual(TPO.classifyOpen(7590, d1), 'below-range');
});

test('valueRelation: toate relațiile', () => {
  const d1 = { vah: 7616, val: 7606 };
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7630, val: 7620 }), 'higher');
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7620, val: 7610 }), 'overlap-higher');
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7614, val: 7608 }), 'inside');
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7620, val: 7600 }), 'outside');
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7612, val: 7600 }), 'overlap-lower');
  assert.strictEqual(TPO.valueRelation(d1, { vah: 7604, val: 7596 }), 'lower');
});

test('Regula de 80%: declanșată și atinsă', () => {
  const d1 = { high: 7620, low: 7596, vah: 7616, val: 7606, bucket: 0 };
  const bars = TPO.parseBars([
    '16:30 7618 7619 7614 7615',
    '17:00 7615 7616 7611 7612',
    '17:30 7612 7613 7608 7609',
    '18:00 7609 7610 7605 7606',
  ].join('\n')).bars;
  const r = TPO.rule80(bars, d1, 7618);
  assert.strictEqual(r.side, 'above');
  assert.strictEqual(r.triggered, true);
  assert.strictEqual(r.triggerLetter, 'B');
  assert.strictEqual(r.reached, true);
  assert.strictEqual(r.reachedLetter, 'D');
});

test('Lecția 2: locațiile scenariilor de deschidere', () => {
  const L = DATA.openLevels;
  const d1 = { high: L.high, low: L.low, vah: L.vah, val: L.val, bucket: 0 };
  const locs = DATA.openScenarios.map((s) => TPO.classifyOpen(s.path[0], d1));
  assert.deepStrictEqual(locs, ['above-range', 'above-va', 'in-va', 'below-va']);
  assert.deepStrictEqual(DATA.openScenarios.map((s) => s.type), ['OD', 'OTD', 'ORR', 'OA']);
  DATA.openScenarios.concat(Object.values(DATA.openIllustrations).map((path) => ({ path }))).forEach((s) => {
    assert.strictEqual(s.path.length, 13, 'fiecare scenariu are 13 puncte (16:30 → 17:30, din 5 în 5 minute)');
  });
});

test('Lecția 2: Open Drive nu revine la deschidere, Open Auction rămâne în jurul ei', () => {
  const od = DATA.openScenarios[0].path;
  assert.ok(od.slice(1).every((p) => p > od[0]));
  const odIll = DATA.openIllustrations.OD;
  assert.ok(odIll.slice(1).every((p) => p < odIll[0]));
  const oa = DATA.openScenarios[3].path;
  assert.ok(oa.every((p) => Math.abs(p - oa[0]) <= 3));
});

test('Lecția 2: IB-ul de azi e îngust față de medie', () => {
  const avg = DATA.ibHistory.reduce((s, x) => s + x, 0) / DATA.ibHistory.length;
  assert.strictEqual(avg, 20);
  assert.ok(DATA.ibToday / avg < 0.75);
});

console.log('\n' + passed + ' teste trecute.');
