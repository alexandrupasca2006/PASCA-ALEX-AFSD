# Curs AMT & Orderflow (site local)

Site static, fără server și fără dependențe, pentru învățarea Auction Market Theory, orderflow, time și gamma pe futures (ES/MES).

## Cum îl deschizi

1. Descarcă repo-ul (branch-ul `claude/laughing-euler-jy1kpa`): fie cu `git clone`, fie de pe GitHub → **Code → Download ZIP**.
2. Deschide `curs-trading/index.html` cu dublu-click. Merge în orice browser modern, inclusiv offline.

Progresul și ce scrii în formulare se salvează doar în browserul tău (localStorage).

## Ce conține

| Pagina | Ce face |
|---|---|
| `index.html` | Planul cursului și progresul |
| `lectia-1.html` | Lecția 1: licitația, valoarea, profilul, cu exercițiu interactiv și quiz |
| `lectia-2.html` | Lecția 2: deschiderea (locație, cele 4 tipuri, Initial Balance), cu grafice, exerciții și quiz |
| `analiza-zilei.html` | Compară o zi cu ziua precedentă: deschidere, overnight, regula de 80%, migrarea valorii, niveluri pentru mâine |
| `unelte.html` | Constructor de profil TPO, calculator de Value Area din volum și jurnalul deschiderilor |
| `resurse.html` | Ore cheie în ora României, calendar, platforme, cărți, glosar, checklist |

Codul e în `assets/`: `tpo.js` (motorul de calcul), `ui.js` (desenarea profilelor), câte un script pentru fiecare pagină și `style.css`.

## Teste

```bash
node curs-trading/tests/tpo.test.js
```

Testele verifică motorul TPO (POC, Value Area, IB, extreme, tipul zilei, regula de 80%) pe exemplele din lecții.

> Zilele „demo” din unelte sunt inventate, doar pentru demonstrație. Material educațional, nu recomandare de investiții.
