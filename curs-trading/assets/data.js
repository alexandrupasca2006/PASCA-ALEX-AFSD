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
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else global.CURS_DATA = data;
})(typeof window !== 'undefined' ? window : this);
