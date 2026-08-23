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
 * Quelle: Visitenkarte des Hauses. Die drei Ruhetage liegen mitten in der
 * Woche (Di/Mi/Do) — ungewöhnlich genug, dass es sich lohnt, sie überall
 * deutlich zu zeigen.
 *
 * Wird hier etwas geändert, muss es auch in index.html an drei Stellen
 * nachgezogen werden: Schnellinfo, Tabelle im Kontakt und JSON-LD.
 */
const ZEITEN = {
  0: { von: '11:00', bis: '21:00' }, // Sonntag
  1: { von: '16:00', bis: '21:00' }, // Montag
  2: null, // Dienstag — Ruhetag
  3: null, // Mittwoch — Ruhetag
  4: null, // Donnerstag — Ruhetag
  5: { von: '16:00', bis: '21:00' }, // Freitag
  6: { von: '16:00', bis: '21:00' }, // Samstag
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
/**
 * Der Betriebsurlaub, aus dem Band in der Kopfzeile gelesen.
 *
 * Bewusst NICHT hier im Skript hinterlegt: die Daten stehen im Markup, wo
 * sie auch ohne JavaScript sichtbar sind. Zwei Quellen für dasselbe Datum
 * laufen sonst früher oder später auseinander.
 */
function urlaubszeitraum() {
  const band = document.querySelector('.urlaubsband[data-von][data-bis]')
  if (!band) return null

  // Ende auf 23:59:59 setzen — sonst gilt der letzte Urlaubstag ab 00:00
  // schon als vorbei und die Seite meldet mitten im Urlaub „geöffnet".
  const von = new Date(band.dataset.von + 'T00:00:00')
  const bis = new Date(band.dataset.bis + 'T23:59:59')
  if (isNaN(von) || isNaN(bis)) return null

  return { von, bis }
}

function zustand(jetzt = new Date()) {
  /* Der Urlaub schlägt jede Wochentagsregel. Ohne diese Abfrage würde die
     Seite am Sonntag im Urlaub fröhlich „Jetzt geöffnet" melden und Gäste
     umsonst herfahren lassen. */
  const urlaub = urlaubszeitraum()
  if (urlaub && jetzt >= urlaub.von && jetzt <= urlaub.bis) {
    const zurueck = new Date(urlaub.bis.getTime() + 1000)
    return {
      offen: false,
      text:
        'Betriebsurlaub · wieder ab ' +
        zurueck.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }),
    }
  }

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

/**
 * Das Urlaubsband: nach dem letzten Urlaubstag entfernen, und die Kopfhöhe
 * neu vermessen.
 *
 * Warum die Messung: `scroll-padding-top` sorgt dafür, dass Sprungmarken
 * nicht unter der klebenden Kopfzeile landen. Der Wert stand fest im CSS —
 * mit dem zusätzlichen Band stimmt er nicht mehr, und je nach Schriftgröße
 * und Fensterbreite sowieso nur ungefähr. Gemessen stimmt er immer.
 */
function urlaubsband() {
  const band = document.querySelector('.urlaubsband')
  const kopf = document.querySelector('.kopf')

  if (band) {
    const zeit = urlaubszeitraum()
    if (zeit && new Date() > zeit.bis) {
      band.remove()
      // Der Hinweis im Kontaktbereich nennt dasselbe Datum und muss
      // mitverschwinden, sonst widerspricht die Seite sich selbst.
      document.querySelector('.zeiten__urlaub')?.remove()
    }
  }

  if (!kopf) return

  /* Schreibt in `--kopf-ist`, NICHT in `--kopfhoehe`.
     `--kopfhoehe` ist die Mindesthöhe aus dem Entwurf und steuert
     `.kopf__innen { min-height }`. Würde die Messung dorthin schreiben,
     entstünde eine Rückkopplung: messen → Kopf wird höher → Observer meldet
     → messen. Der Kopf wächst dann bei jedem Frame weiter. */
  const messen = () => {
    document.documentElement.style.setProperty(
      '--kopf-ist',
      kopf.getBoundingClientRect().height + 'px'
    )
  }

  /* Einmal messen reicht nicht: die Kopfzeile wächst, nachdem die Schriften
     geladen sind, sie schrumpft, wenn das Urlaubsband verfällt, und sie
     ändert sich beim Umbruch auf schmalen Fenstern. Ein ResizeObserver
     meldet jede dieser Änderungen — im Gegensatz zu einer Messung zum
     Ladezeitpunkt, die genau einen Moment erwischt und danach falsch ist. */
  if ('ResizeObserver' in window) {
    new ResizeObserver(messen).observe(kopf)
  } else {
    messen()
    window.addEventListener('resize', messen)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(messen)
  }
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

/** 5. Slideshow: die Pfeile schieben die Spur um genau eine Kachel weiter. */
function schau() {
  const spur = document.querySelector('.schau .galerie')
  if (!spur) return

  const sanft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  document.querySelectorAll('.schau__pfeil').forEach((pfeil) => {
    pfeil.addEventListener('click', () => {
      const kachel = spur.querySelector('li')
      if (!kachel) return

      // Breite einer Kachel samt Abstand — so springt die Spur genau um ein
      // Bild und nicht um einen willkürlichen Pixelwert.
      const abstand = parseFloat(getComputedStyle(spur).columnGap) || 0
      const schritt = kachel.getBoundingClientRect().width + abstand
      const grenze = spur.scrollWidth - spur.clientWidth
      const ziel = Math.max(
        0,
        Math.min(grenze, spur.scrollLeft + schritt * Number(pfeil.dataset.richtung))
      )

      spur.scrollTo({ left: ziel, behavior: sanft ? 'smooth' : 'auto' })
    })
  })
}

/**
 * 6. Karte erst auf Klick laden.
 *
 * Das <iframe> entsteht erst hier — stünde es im Markup, ginge die
 * IP-Adresse des Besuchers bei jedem Seitenaufruf an Google.
 */
function karte() {
  const knopf = document.getElementById('karte-laden')
  const platz = document.getElementById('karte-platz')
  if (!knopf || !platz) return

  knopf.addEventListener('click', () => {
    const rahmen = document.createElement('iframe')
    rahmen.className = 'karte-block__rahmen'
    rahmen.src =
      'https://www.google.com/maps?q=50.1339765,11.156229&hl=de&z=17&output=embed'
    rahmen.title = 'Karte: Lage des Gasthaus Brückner'
    rahmen.loading = 'lazy'
    rahmen.referrerPolicy = 'no-referrer-when-downgrade'
    rahmen.allowFullscreen = true
    platz.replaceWith(rahmen)
  })
}

/**
 * 7. Die feste Rufleiste erst zeigen, wenn der Aufmacher durch ist.
 *
 * Auf einem kleinen Handy nehmen Kopfzeile und Leiste zusammen über ein
 * Viertel des Bildschirms weg. Solange der große Anrufknopf im Aufmacher
 * sichtbar ist, ist die Leiste doppelt gemoppelt — sie kostet nur Platz.
 *
 * Die Leiste wird VERSTECKT, nicht eingeblendet — sichtbar ist der
 * Grundzustand. Ohne IntersectionObserver, ohne JavaScript oder wenn der
 * Beobachter nie auslöst, bleibt sie damit einfach dauerhaft stehen. Lieber
 * eine Leiste zu viel als ein Betrieb ohne Anrufknopf.
 */
function rufleiste() {
  const leiste = document.querySelector('.rufleiste')
  const buehne = document.querySelector('.buehne')
  if (!leiste || !buehne || !('IntersectionObserver' in window)) return

  // Erst jetzt darf das CSS die Leiste überhaupt verstecken — ab hier ist
  // sichergestellt, dass sie auch wieder hereingefahren wird.
  document.documentElement.classList.add('js-leiste')

  const beobachter = new IntersectionObserver(
    (eintraege) => {
      eintraege.forEach((e) => {
        leiste.classList.toggle('rufleiste--versteckt', e.isIntersecting)
      })
    },
    // Erst umschalten, wenn der Aufmacher fast ganz draußen ist — sonst
    // flackert die Leiste bei jedem kleinen Wischen.
    { threshold: 0, rootMargin: '-70% 0px 0px 0px' }
  )

  beobachter.observe(buehne)
}

/** Jahreszahl im Fuß, damit sie nicht jedes Jahr veraltet. */
function jahr() {
  const el = document.getElementById('jahr')
  if (el) el.textContent = String(new Date().getFullYear())
}

// Zuerst: das Band kann verschwinden, und danach stimmt die Kopfhöhe. Erst
// dann hat die Öffnungsanzeige den richtigen Urlaubszeitraum vorliegen.
urlaubsband()
menue()
oeffnung()
lupe()
schau()
karte()
rufleiste()
jahr()

// Prüfhaken für die Entwicklung: erlaubt, den Öffnungsstatus für einen
// beliebigen Zeitpunkt zu prüfen, ohne die Systemuhr zu stellen.
window.__gasthaus = { zustand, ZEITEN }
