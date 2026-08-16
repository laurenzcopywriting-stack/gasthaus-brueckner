/**
 * Gasthaus Brückner — die Scroll-Choreografie.
 *
 * Dieselben Effekte wie in der Cinema-Scroll-Fassung, aber ohne GSAP:
 *
 *   1. Fortschrittsleiste am oberen Rand
 *   2. Wörter, die maskiert von unten hereinfahren
 *   3. Blöcke, die beim Eintreten aufsteigen (gestaffelt)
 *   4. Parallaxe auf den Fotos
 *   5. Die waagerechte Passage des Mittagstischs
 *
 * Warum ohne Bibliothek: die Seite hat keinen Build-Schritt. Eine
 * CDN-Einbindung wäre eine dritte Partei mehr in der Datenschutzerklärung
 * und ein fremder Server, von dem die Seite abhängt. Alles hier steht in
 * gut 150 Zeilen.
 *
 * Zwei Grundsätze:
 *
 * - Es ist eine Zugabe. Ohne JavaScript und bei `prefers-reduced-motion`
 *   steht alles sofort sichtbar da. Die Startwerte setzt deshalb NICHT das
 *   CSS, sondern diese Datei über die Klasse `js-anim` am <html>-Element —
 *   sonst bliebe die Seite leer, wenn das Skript nicht lädt.
 * - Gelesen wird pro Frame nur einmal. Alle Effekte hängen an einem
 *   gemeinsamen rAF-Durchlauf statt an je einem eigenen Scroll-Listener,
 *   sonst rechnet jeder für sich und das Bild ruckelt.
 */

;(function () {
  const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (ruhig.matches) return

  // Ohne IntersectionObserver würde nichts je eingeblendet — und weil die
  // Startzustände auf opacity:0 stehen, wäre die halbe Seite unsichtbar.
  // Dann lieber gar keine Choreografie.
  if (!('IntersectionObserver' in window)) return

  // Ab hier gilt: die Startzustände sind aktiv (Wörter unter der Kante,
  // Blöcke auf Deckkraft 0). Erst jetzt, damit ein Abbruch weiter oben
  // nichts Unsichtbares hinterlässt.
  document.documentElement.classList.add('js-anim')

  /* Notbremse. Der schlimmste denkbare Fehler dieser Datei ist nicht, dass
     eine Animation ausbleibt — sondern dass sie ausbleibt, NACHDEM die
     Startzustände gesetzt sind. Dann stünde die Seite leer da: kein Text,
     keine Preise, keine Telefonnummer. Scheitert irgendetwas, fällt die
     Klasse wieder weg und die Seite steht schlicht da wie ohne Skript. */
  window.addEventListener('error', () => {
    document.documentElement.classList.remove('js-anim')
  })

  try {
    starten()
  } catch (fehler) {
    document.documentElement.classList.remove('js-anim')
    console.error('Scroll-Choreografie abgebrochen, Seite steht statisch:', fehler)
  }

  function starten() {
  /* ---------------------------------------------------------------
     Wörter in Masken
     Jede so ausgezeichnete Überschrift wird in Wörter zerlegt, jedes in
     einen Kasten mit overflow:hidden. Das aria-label trägt den Satz am
     Stück, damit ein Screenreader nicht Wort für Wort vorliest.
     --------------------------------------------------------------- */
  document.querySelectorAll('[data-worte]').forEach((el) => {
    const text = el.textContent.trim()
    el.setAttribute('aria-label', text)

    const huelle = document.createElement('span')
    huelle.setAttribute('aria-hidden', 'true')

    text.split(/\s+/).forEach((wort, i) => {
      const maske = document.createElement('span')
      maske.className = 'maske'
      const innen = document.createElement('span')
      innen.className = 'maske__wort'
      // Verzögerung pro Wort: der Satz baut sich auf, statt auf einmal
      // dazustehen. 45 ms sind der Bereich, in dem es als eine Bewegung
      // gelesen wird und nicht als Aufzählung.
      innen.style.transitionDelay = i * 45 + 'ms'
      innen.textContent = wort
      maske.appendChild(innen)
      huelle.appendChild(maske)
    })

    el.textContent = ''
    el.appendChild(huelle)
  })

  /* ---------------------------------------------------------------
     Eintreten
     `once: true` gibt es beim IntersectionObserver nicht — deshalb wird
     jedes Ziel nach dem ersten Auslösen selbst abgemeldet. Ohne das
     würde die Animation bei jedem Hoch- und Runterscrollen neu starten.
     --------------------------------------------------------------- */
  const eintritt = new IntersectionObserver(
    (eintraege, beobachter) => {
      eintraege.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('ist-da')
        beobachter.unobserve(e.target)
      })
    },
    // Erst auslösen, wenn das Element ein Stück im Bild ist: sonst ist die
    // Bewegung vorbei, bevor man hinsieht.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  )

  document.querySelectorAll('[data-worte], [data-auf]').forEach((el) => eintritt.observe(el))

  // Gestaffelte Gruppen: die Kinder erben eine wachsende Verzögerung.
  document.querySelectorAll('[data-staffel]').forEach((gruppe) => {
    const schritt = Number(gruppe.dataset.staffel) || 80
    Array.from(gruppe.children).forEach((kind, i) => {
      kind.classList.add('auf')
      kind.style.transitionDelay = i * schritt + 'ms'
      eintritt.observe(kind)
    })
  })

  /* Der Aufmacher steht beim Laden schon im Bild. Seine Staffelung läuft
     deshalb über transition-delay und nicht über Timer: ein Timer (oder ein
     requestAnimationFrame) läuft in einem Hintergrund-Tab nicht an, und die
     Überschrift bliebe unsichtbar, bis jemand hinschaut. Die Klasse wird
     sofort gesetzt, die Verzögerung macht das CSS. */
  document.querySelectorAll('.buehne [data-worte], .buehne [data-auf]').forEach((el, i) => {
    if (!el.querySelector('.maske__wort')) el.style.transitionDelay = 120 + i * 90 + 'ms'
    el.classList.add('ist-da')
  })

  /* ---------------------------------------------------------------
     Der gemeinsame Frame
     --------------------------------------------------------------- */
  const leiste = document.querySelector('.fortschritt__fuellung')
  const parallaxen = Array.from(document.querySelectorAll('[data-parallax]'))
  const passage = document.querySelector('.passage')
  const spur = document.querySelector('.passage__spur')
  // Muss zum Haltepunkt in styles.css passen (54 rem). Weichen die beiden
  // ab, rechnet das Skript eine Passage, die das CSS gar nicht anzeigt.
  const schmal = window.matchMedia('(max-width: 54rem)')

  let angefordert = false

  /** Wie weit `el` durchs Fenster gewandert ist: 0 = tritt unten ein, 1 = oben raus. */
  function durchlauf(el) {
    const k = el.getBoundingClientRect()
    const gesamt = window.innerHeight + k.height
    return Math.min(1, Math.max(0, (window.innerHeight - k.top) / gesamt))
  }

  function zeichnen() {
    angefordert = false

    if (leiste) {
      const hoehe = document.documentElement.scrollHeight - window.innerHeight
      leiste.style.transform = `scaleX(${hoehe > 0 ? window.scrollY / hoehe : 0})`
    }

    parallaxen.forEach((el) => {
      // Nur rechnen, was im Bild ist — sonst kostet jede Kachel der Galerie
      // dauerhaft Rechenzeit, auch weit außerhalb des Sichtfelds.
      const k = el.getBoundingClientRect()
      if (k.bottom < -200 || k.top > window.innerHeight + 200) return

      const staerke = Number(el.dataset.parallax) || 12
      el.style.transform = `translate3d(0, ${(durchlauf(el) - 0.5) * 2 * staerke}%, 0)`
    })

    /* Die waagerechte Passage.
       Der Rahmen ist so hoch wie die Spur breit ist; solange man an ihm
       vorbeiscrollt, klebt die Bühne (position: sticky) und die Spur wird
       seitwärts geschoben. Die Strecke wird bei jedem Frame frisch gelesen,
       damit sie nach einer Größenänderung stimmt. */
    if (passage && spur && !schmal.matches) {
      const rahmen = passage.getBoundingClientRect()
      const strecke = Math.max(0, spur.scrollWidth - window.innerWidth)
      const fahrweg = rahmen.height - window.innerHeight
      // Ohne die Division-durch-Null-Sperre wird `weg` zu NaN und die Spur
      // verschwindet — das passiert, sobald die Strecke null ist, etwa auf
      // einem sehr breiten Bildschirm, auf dem alle Karten nebeneinander
      // passen.
      const weg = fahrweg > 0 ? Math.min(1, Math.max(0, -rahmen.top / fahrweg)) : 0
      spur.style.transform = `translate3d(${-weg * strecke}px, 0, 0)`
    }
  }

  function anstossen() {
    if (angefordert) return
    angefordert = true
    requestAnimationFrame(zeichnen)
  }

  /* Die Höhe des Passagen-Rahmens ergibt sich aus der Breite der Spur:
     so weit, wie seitwärts zu fahren ist, so weit muss man scrollen.
     Steht sie im CSS fest, passt sie nach jedem Textänderung nicht mehr. */
  function passageMessen() {
    if (!passage || !spur) return

    // Auf schmalen Bildschirmen gibt es keine Passage — die Karten stehen
    // untereinander. Die Inline-Höhe muss dann weg, sonst bliebe unter der
    // letzten Karte ein bildschirmhohes Loch stehen.
    if (schmal.matches) {
      passage.style.height = ''
      spur.style.transform = ''
      return
    }

    const strecke = Math.max(0, spur.scrollWidth - window.innerWidth)
    passage.style.height = window.innerHeight + strecke + 'px'
  }

  window.addEventListener('scroll', anstossen, { passive: true })
  window.addEventListener('resize', () => {
    passageMessen()
    anstossen()
  })
  schmal.addEventListener('change', () => {
    passageMessen()
    anstossen()
  })

  passageMessen()
  anstossen()

  // Nach dem Laden der Bilder stimmen die Höhen erst wirklich.
  window.addEventListener('load', () => {
    passageMessen()
    anstossen()
  })

    /* Rettungsleine.
     Unsichtbarer Text ist der teuerste Fehler, den diese Seite machen kann:
     Wer die Speisekarte nicht sieht, ruft nicht an. Sollte der Beobachter aus
     irgendeinem Grund nicht auslösen — verschachtelte Container, ein Browser
     mit eigenen Vorstellungen — wird nach sechs Sekunden alles freigegeben,
     was dann noch versteckt ist. */
  window.setTimeout(function () {
    document.querySelectorAll('[data-worte]:not(.ist-da), [data-auf]:not(.ist-da), .auf:not(.ist-da)').forEach(function (el) {
      const k = el.getBoundingClientRect()
      // Nur was im oder über dem Sichtfeld liegt — weiter unten soll die
      // Bewegung ja noch stattfinden.
      if (k.top < window.innerHeight) el.classList.add('ist-da')
    })
  }, 6000)

  window.__scroll = { durchlauf, passageMessen, zeichnen }
  }
})()
