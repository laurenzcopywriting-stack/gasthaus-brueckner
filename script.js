/**
 * Gasthaus Brückner — das bisschen Verhalten, das die Seite braucht.
 *
 * Kein Framework. Vier Dinge:
 *   1. Menü auf schmalen Bildschirmen
 *   2. "Heute geöffnet"-Anzeige
 *   3. heutigen Tag in der Zeitentabelle hervorheben
 *   4. große Bildansicht
 *
 * Alles läuft nur als Zugabe: ohne JavaScript bleibt die Seite vollständig
 * lesbar und jeder Knopf funktioniert.
 */

/**
 * Die Öffnungszeiten, nach Wochentag (0 = Sonntag, wie Date.getDay()).
 * `null` heißt Ruhetag.
 *
 * ACHTUNG — PLATZHALTER: Diese Zeiten sind geraten. Vor dem Livegang hier,
 * in index.html (Tabelle, Schnellinfo und JSON-LD) ersetzen.
 */
const ZEITEN = {
  0: { von: '11:30', bis: '20:00' }, // Sonntag
  1: null, // Montag — Ruhetag
  2: null, // Dienstag — Ruhetag
  3: { von: '11:30', bis: '23:00' },
  4: { von: '11:30', bis: '23:00' },
  5: { von: '11:30', bis: '23:00' },
  6: { von: '11:30', bis: '23:00' },
}

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

/** "11:30" → Minuten seit Mitternacht. */
function inMinuten(uhrzeit) {
  const [std, min] = uhrzeit.split(':').map(Number)
  return std * 60 + min
}

/**
 * Ermittelt den aktuellen Zustand.
 *
 * Die Uhrzeit kommt vom Gerät des Besuchers, nicht vom Server — steht dessen
 * Uhr falsch oder sitzt jemand in einer anderen Zeitzone, stimmt die Anzeige
 * nicht. Deshalb ist sie eine Ergänzung und ersetzt die Tabelle nicht.
 */
function zustand(jetzt = new Date()) {
  const heute = ZEITEN[jetzt.getDay()]
  const minutenJetzt = jetzt.getHours() * 60 + jetzt.getMinutes()

  if (heute) {
    const auf = inMinuten(heute.von)
    const zu = inMinuten(heute.bis)

    if (minutenJetzt < auf) {
      return { offen: false, text: `Heute ab ${heute.von} Uhr geöffnet` }
    }
    if (minutenJetzt < zu) {
      return { offen: true, text: `Jetzt geöffnet · bis ${heute.bis} Uhr` }
    }
  }

  // Geschlossen: den nächsten Öffnungstag suchen. Höchstens sieben Schritte,
  // damit die Schleife auch dann endet, wenn versehentlich alle Tage auf
  // Ruhetag stehen.
  for (let i = 1; i <= 7; i++) {
    const tag = (jetzt.getDay() + i) % 7
    const zeit = ZEITEN[tag]
    if (zeit) {
      const name = i === 1 ? 'morgen' : TAGE[tag]
      return { offen: false, text: `Geschlossen · ${name} ab ${zeit.von} Uhr` }
    }
  }

  return null
}

/** 1. Menü auf schmalen Bildschirmen. */
function menue() {
  const schalter = document.querySelector('.nav-schalter')
  const nav = document.getElementById('hauptnav')
  if (!schalter || !nav) return

  const schmal = window.matchMedia('(max-width: 54rem)')

  /* Sichtbarkeit steuert allein das CSS: unter 54 rem ist .nav ausgeblendet
     und wird erst durch .nav--offen eingeblendet, darüber ist sie immer da.
     JavaScript setzt nur die Klasse und den Zustand für Screenreader.
     Das hidden-Attribut wäre hier die naheliegende, aber falsche Wahl — es
     wirkt nur mit der Stärke des Browser-Stylesheets und würde von der
     display-Regel überstimmt. */
  const setzen = (offen) => {
    nav.classList.toggle('nav--offen', offen)
    schalter.setAttribute('aria-expanded', String(offen))
  }

  schalter.addEventListener('click', () => {
    setzen(!nav.classList.contains('nav--offen'))
  })

  // Nach dem Antippen eines Links schließen, sonst verdeckt das offene Menü
  // genau den Abschnitt, zu dem es gesprungen ist.
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setzen(false)
  })

  // Escape schließt, wie überall sonst auch.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav--offen')) {
      setzen(false)
      schalter.focus()
    }
  })

  // Beim Wechsel auf einen breiten Schirm den offenen Zustand zurücknehmen:
  // dort ist die Navigation ohnehin sichtbar, und ein hängengebliebenes
  // aria-expanded="true" würde Screenreadern etwas Falsches ansagen.
  schmal.addEventListener('change', () => setzen(false))
  setzen(false)
}

/** 2. + 3. Öffnungsstatus und heutiger Tag. */
function oeffnung() {
  const kasten = document.getElementById('status')
  const z = zustand()

  if (kasten && z) {
    kasten.querySelector('.status__text').textContent = z.text
    kasten.classList.toggle('status--zu', !z.offen)
    kasten.hidden = false
  }

  const heute = String(new Date().getDay())
  document.querySelectorAll('.zeiten__zeile').forEach((zeile) => {
    zeile.classList.toggle('zeiten__zeile--heute', zeile.dataset.tag === heute)
  })
}

/** 4. Große Bildansicht. */
function lupe() {
  const lupe = document.getElementById('lupe')
  if (!lupe) return

  const bild = lupe.querySelector('.lupe__bild')
  const zu = lupe.querySelector('.lupe__zu')
  // Merkt sich, wer geöffnet hat — dorthin geht der Fokus beim Schließen
  // zurück, sonst steht er nach dem Zumachen am Seitenanfang.
  let ausloeser = null

  const oeffnen = (knopf) => {
    ausloeser = knopf
    bild.src = knopf.dataset.gross
    bild.alt = knopf.querySelector('img')?.alt || ''
    lupe.hidden = false
    document.body.style.overflow = 'hidden'
    zu.focus()
  }

  const schliessen = () => {
    lupe.hidden = true
    bild.src = ''
    document.body.style.overflow = ''
    ausloeser?.focus()
  }

  document.querySelectorAll('.galerie__knopf').forEach((knopf) => {
    knopf.addEventListener('click', () => oeffnen(knopf))
  })

  zu.addEventListener('click', schliessen)

  // Klick auf den Hintergrund schließt ebenfalls — aber nur dort, nicht auf
  // dem Bild selbst.
  lupe.addEventListener('click', (e) => {
    if (e.target === lupe) schliessen()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lupe.hidden) schliessen()
  })
}

/** Jahreszahl im Fuß, damit sie nicht jedes Jahr veraltet. */
function jahr() {
  const el = document.getElementById('jahr')
  if (el) el.textContent = String(new Date().getFullYear())
}

menue()
oeffnung()
lupe()
jahr()

// Prüfhaken für die Entwicklung: erlaubt, den Öffnungsstatus für einen
// beliebigen Zeitpunkt zu prüfen, ohne die Systemuhr zu stellen.
window.__gasthaus = { zustand, ZEITEN }
