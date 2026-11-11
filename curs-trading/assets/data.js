/*
 * Date folosite în lecții și unelte.
 * ATENȚIE: zilele „demo” sunt INVENTATE, doar pentru a arăta cum funcționează uneltele.
 * Nu sunt prețuri reale ale ES.
 */
(function (global) {
  'use strict';

  const data = {
    /* Lecția 1, Exercițiul 1: profil simplificat (doar high și low pe perioadă), rânduri de 1 punct. */
    exercise1Bars: [
      '16:30 5009 5002',
      '17:00 5012 5008',
      '17:30 5010 5007',
      '18:00 5009 5005',
      '18:30 5008 5004',
      '19:00 5008 5004',
      '19:30 5007 5003',
      '20:00 5007 5004',
      '20:30 5007 5005',
      '21:00 5006 5003',
      '21:30 5005 5002',
      '22:00 5006 5005',
      '22:30 5006 5005',
    ].join('\n'),

    /* Lecția 1, exemplul lucrat de Value Area (profil de volum, total 100 de contracte). */
    volumeExample: [
      '5006 2',
      '5005 5',
      '5004 9',
      '5003 15',
      '5002 22',
      '5001 18',
      '5000 12',
      '4999 8',
      '4998 6',
      '4997 3',
    ].join('\n'),

    /* Zi demo 1 (inventată): Normal Variation în sus, coadă de cumpărare jos, poor high sus. */
    demoDay1: [
      '# ora  open  high  low   close   (zi DEMO, inventată)',
      '16:30 7600 7610 7596 7606',
      '17:00 7606 7612 7601 7604',
      '17:30 7604 7608 7601 7603',
      '18:00 7603 7609 7602 7607',
      '18:30 7607 7620 7606 7616',
      '19:00 7616 7620 7611 7613',
      '19:30 7613 7616 7608 7611',
      '20:00 7611 7615 7607 7613',
      '20:30 7613 7617 7610 7614',
      '21:00 7614 7616 7609 7610',
      '21:30 7610 7614 7606 7612',
      '22:00 7612 7615 7608 7613',
      '22:30 7613 7616 7610 7614',
    ].join('\n'),

    /* Zi demo 2 (inventată): zi de date macro, gap peste range, Open Test Drive, zi de trend în sus. */
    demoDay2: [
      '# ora  open  high  low   close   (zi DEMO, inventată)',
      '16:30 7624 7629 7619 7627',
      '17:00 7627 7633 7625 7631',
      '17:30 7631 7638 7630 7636',
      '18:00 7636 7641 7633 7639',
      '18:30 7639 7642 7635 7637',
      '19:00 7637 7640 7634 7638',
      '19:30 7638 7644 7637 7643',
      '20:00 7643 7647 7641 7645',
      '20:30 7645 7648 7642 7644',
      '21:00 7644 7646 7640 7642',
      '21:30 7642 7647 7641 7646',
      '22:00 7646 7650 7644 7649',
      '22:30 7649 7652 7646 7651',
    ].join('\n'),
    demoDay2Overnight: { onh: 7628, onl: 7604 },
    demoRowSize: 2,

    /*
     * Lecția 2: primele 60 de minute după deschidere (un punct la fiecare 5 minute, 16:30 → 17:30 RO).
     * Toate scenariile au aceleași niveluri din ziua precedentă. Prețuri inventate.
     */
    openLevels: { high: 5020, vah: 5012, poc: 5008, val: 5004, low: 4996 },

    /* Ilustrații din lecție (în direcții opuse față de exercițiu, ca să vezi simetria). */
    openIllustrations: {
      OD: [4992, 4990, 4987, 4988, 4984, 4982, 4983, 4979, 4977, 4978, 4974, 4972, 4970],
      OTD: [5002, 5004, 5005, 5004, 5001, 4998, 4995, 4993, 4994, 4990, 4988, 4989, 4986],
      ORR: [5007, 5004, 5001, 5000, 5002, 5005, 5008, 5010, 5011, 5009, 5010, 5008, 5009],
      OA: [5010, 5012, 5009, 5011, 5008, 5010, 5012, 5009, 5011, 5010, 5013, 5009, 5011],
    },

    /* Exercițiul 1 din Lecția 2: recunoaște locația și tipul deschiderii. */
    openScenarios: [
      {
        path: [5024, 5026, 5028, 5027, 5031, 5033, 5032, 5036, 5038, 5037, 5040, 5042, 5044],
        type: 'OD',
        explain: 'Deschiderea (5024) e <b>peste maximul de ieri</b> (5020), adică gap în sus. Prețul pleacă imediat în sus și <b>nu se mai întoarce niciodată la deschidere</b>: <b>Open Drive</b>, convingere maximă. Deschiderea devine probabil minimul zilei. Nu vinzi contra mișcării; cauți cumpărări pe pullback-uri, iar o revenire sub deschidere ar invalida drive-ul.',
      },
      {
        path: [5014, 5012, 5011, 5012, 5015, 5018, 5021, 5023, 5022, 5026, 5028, 5027, 5030],
        type: 'OTD',
        explain: 'Deschiderea (5014) e <b>peste VAH (5012), dar în range-ul de ieri</b>. Prețul coboară întâi să testeze VAH-ul, intră o clipă în VA (5011), nu găsește vânzători, apoi trece prin deschidere și urcă peste maximul de ieri: <b>Open Test Drive</b>. Testul a confirmat că nu există interes în jos; minimul testului (5011) devine o referință importantă.',
      },
      {
        path: [5009, 5012, 5015, 5016, 5014, 5011, 5008, 5006, 5005, 5007, 5006, 5008, 5007],
        type: 'ORR',
        explain: 'Deschiderea (5009) e <b>în VA de ieri</b>. Prețul urcă spre maximul de ieri, e respins la 5016, revine prin deschidere, dar coborârea nu e la fel de convingătoare: piața ajunge să tranzacționeze în ambele direcții în jurul POC-ului. Asta e <b>Open Rejection Reverse</b>, cu convingere medie. Maximul inițial (5016) e un candidat pentru extrema zilei.',
      },
      {
        path: [4999, 5001, 4998, 5000, 4997, 4999, 5001, 4998, 5000, 4999, 5002, 4998, 5000],
        type: 'OA',
        explain: 'Deschiderea (4999) e <b>sub VAL (5004), dar în range-ul de ieri</b>. Prețul oscilează în ambele direcții în jurul deschiderii, fără să plece: <b>Open Auction</b>, convingere mică. Aștepți IB-ul și urmărești dacă piața revine în VA (regula de 80% spre VAH) sau iese sub minimul de ieri (4996).',
      },
    ],

    /* Exercițiul 2 din Lecția 2: lățimea IB-ului în ultimele 10 zile (puncte ES) și IB-ul de azi. */
    ibHistory: [18, 22, 15, 25, 20, 17, 23, 19, 21, 20],
    ibToday: 11,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else global.CURS_DATA = data;
})(typeof window !== 'undefined' ? window : this);
