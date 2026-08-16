# Gasthaus Brückner — Website

Statische Website. Drei HTML-Seiten, eine CSS-Datei, eine JS-Datei, ein
Bilderordner. **Kein Framework, kein Build-Schritt, keine Abhängigkeiten** —
die Dateien lassen sich so wie sie sind auf jeden Webspace legen.

**Live:** https://laurenzcopywriting-stack.github.io/gasthaus-brueckner/

```bash
# Örtlich ansehen — ein beliebiger statischer Server reicht
npx --yes vite --port 5176
```

## Veröffentlichen

Die Seite liegt auf GitHub Pages, Zweig `main`, Wurzelverzeichnis. Ein
`git push` genügt, um Änderungen live zu bringen — der Build dauert etwa
20 Sekunden.

```bash
git add -A && git commit -m "..." && git push
```

**Sie steht bewusst auf `noindex`.** Über den Link ist sie normal erreichbar
und lässt sich herzeigen — sie taucht nur nicht in der Google-Suche auf.

Der einzige verbliebene Grund dafür ist das **fehlende Impressum**. Eine
gewerbliche Seite ohne vollständige Angaben nach § 5 DDG in den Index zu
lassen, ist die klassische Abmahnfalle. Sobald in `impressum.html` der
Inhabername steht, sind es zwei Handgriffe: das `<meta name="robots">` in
`index.html` löschen **und** die `Disallow`-Zeile in `robots.txt` entfernen.
Beides — eines allein reicht nicht.

Eine eigene Domain lässt sich später ohne Umzug davorhängen: eine Datei
`CNAME` mit der Domain ins Repo, beim Anbieter einen `CNAME`-Eintrag auf
`laurenzcopywriting-stack.github.io` setzen.

## Warum ohne Framework

Ein Wirtshaus braucht eine Seite, die in fünf Jahren noch läuft und die
jemand anders ohne Einarbeitung ändern kann. Ein Build-Schritt wäre eine
Abhängigkeit, die irgendwann bricht, ohne dafür etwas zu liefern: die Seite
hat kein Formular, keinen Login, keinen Warenkorb. Ein neues Gericht ist
eine Zeile HTML.

Nebeneffekt: Betriebskosten null. Netlify, Cloudflare Pages oder GitHub
Pages hosten das im Gratis-Kontingent.

## Aufbau

| Datei | Inhalt |
|-------|--------|
| `index.html` | die ganze Seite |
| `impressum.html` | Pflichtangaben — **noch auszufüllen** |
| `datenschutz.html` | Entwurf, beschreibt den tatsächlichen Stand |
| `styles.css` | ein Stylesheet, nach Abschnitten sortiert |
| `script.js` | vier kleine Funktionen (siehe unten) |
| `scroll.js` | die Scroll-Choreografie |
| `bilder/` | 15 Fotos des Hauses |

Reihenfolge der Startseite: Aufmacher → Schnellinfo (Zeiten / Telefon /
Adresse) → Das Haus → Mittagstisch → Bier zum Mitnehmen → Bilder → Kontakt.
Die Antwort auf „habt ihr heute auf und wie ruf ich an" steht damit im
ersten Bildschirm und nochmal direkt darunter.

## Die Scroll-Choreografie (`scroll.js`)

Dieselben Effekte wie in der Cinema-Scroll-Fassung, aber ohne GSAP — eine
CDN-Einbindung wäre eine dritte Partei mehr in der Datenschutzerklärung und
ein fremder Server, von dem die Seite abhängt.

1. **Fortschrittsleiste** am oberen Rand
2. **Wortmasken**: Überschriften mit `data-worte` werden in Wörter zerlegt,
   jedes fährt aus einem Kasten mit `overflow: hidden` herauf. Das `aria-label`
   trägt den Satz am Stück, damit ein Screenreader nicht Wort für Wort liest.
3. **Aufsteigende Blöcke** (`data-auf`, `data-staffel="80"` für Gruppen)
4. **Parallaxe** auf den Fotos (`data-parallax="8"` = Stärke in Prozent)
5. **Waagerechte Passage** beim Mittagstisch: der Rahmen ist so hoch, wie die
   Spur breit ist, die Bühne darin klebt, die Spur wird seitwärts geschoben

Drei Entscheidungen, die dahinter stecken:

- **Ein einziger rAF-Durchlauf** für alle Effekte statt je eines
  Scroll-Listeners. Sonst rechnet jeder für sich und das Bild ruckelt.
- **Die Startzustände setzt das Skript**, nicht das Stylesheet — über die
  Klasse `js-anim` am `<html>`. Stünden sie fest im CSS, wäre die Seite leer,
  wenn das Skript nicht lädt.
- **Notbremse**: schlägt irgendetwas fehl, fällt `js-anim` wieder weg und die
  Seite steht statisch da. Der schlimmste denkbare Fehler wäre nicht eine
  ausbleibende Animation, sondern eine ausbleibende Animation *nach* dem
  Setzen der Startzustände — dann wären Text, Preise und Telefonnummer
  unsichtbar.

Unter 54 rem gibt es keine Passage: die Karten stehen untereinander. Seitwärts
scrollen ist auf dem Handy die schlechtere Bedienung, und die feste Rufleiste
käme der klebenden Bühne in die Quere. Der Haltepunkt steht doppelt — in
`styles.css` und als `matchMedia` in `scroll.js`; weichen die beiden ab,
rechnet das Skript eine Passage, die das CSS gar nicht anzeigt.

Bei `prefers-reduced-motion: reduce` steigt `scroll.js` sofort aus.

## Was JavaScript sonst macht

Vier Dinge, alle als Zugabe — **ohne JavaScript bleibt die Seite vollständig
lesbar und jeder Knopf funktioniert**:

1. **Menü** auf schmalen Bildschirmen (Klasse `nav--offen`, nicht das
   `hidden`-Attribut — das wirkt nur mit der Stärke des Browser-Stylesheets
   und würde von der `display`-Regel überstimmt; das Menü wäre „hidden" und
   trotzdem sichtbar)
2. **„Jetzt geöffnet"**-Anzeige im Aufmacher, aus `ZEITEN` in `script.js`
3. **heutiger Tag** in der Zeitentabelle hervorgehoben
4. **große Bildansicht** in der Galerie, mit Escape schließbar und Fokus-
   Rückgabe an das angeklickte Bild

Die Uhrzeit für den Öffnungsstatus kommt vom Gerät des Besuchers. Steht dessen
Uhr falsch, stimmt die Anzeige nicht — deshalb ersetzt sie die Tabelle nicht,
sondern ergänzt sie.

## Handlungsaufforderungen

Ein Wirtshaus verkauft keine Formulare, die Reservierung läuft übers Telefon.
Der Anrufknopf trägt deshalb Aufforderung und Nummer zugleich und steht an
sieben Stellen: Kopfzeile, Aufmacher, Schnellinfo, Kartenfuß, Bier-Banner,
Kontaktblock — und als feste Leiste am unteren Rand auf dem Handy, wo der
Daumen ist.

## Inhalte

- **Mittagstisch und Preise**: abgetippt vom Aushang, Stand 31.07.
- **Fotos**: vom Haus. Nicht eingebunden sind das Stockbild (Bierkrug mit
  Brezn) und ein zu kleines Schnitzel-Thumbnail.
- **Bewusst nicht behauptet**: Gründungsjahr und Familiengeschichte. Die
  „1887" auf den Sonnenschirmen ist das Gründungsjahr der Brauerei Leikeim,
  nicht das des Hauses.

## Vor dem Livegang

1. ~~Telefonnummer~~ — steht: **09574 653482**.
   ~~Adresse~~ — steht: **Burg 2, 96272 Hochstadt am Main-Obersdorf**,
   samt Koordinaten (50.1339765, 11.156229) in Karte und strukturierten Daten.
   **Offen: E-Mail-Adresse und der Facebook-Link.** Suchen nach
   `post@gasthaus-brueckner.de` und `facebook.com/` findet die Stellen.
2. **Öffnungszeiten prüfen** — sie sind geraten. Sie stehen in `index.html`
   (Schnellinfo, Tabelle, JSON-LD) und in `script.js` (`ZEITEN`).
3. **Impressum ausfüllen.** Für eine gewerbliche Seite ist es Pflicht (§ 5
   DDG); die auszufüllenden Stellen sind in den Rechtstexten farbig
   hervorgehoben.
4. **Schriften lokal einbinden** statt von Google Fonts. Dann wird keine
   IP-Adresse an Google übertragen und der entsprechende Abschnitt der
   Datenschutzerklärung entfällt.
5. ~~Bilder verkleinern.~~ **Geprüft und verworfen.** Die Dateien sind
   Facebook-Downloads und damit bereits komprimiert. Ein erneutes
   JPEG-Encoding bei Qualität 82 machte sie in Summe **größer** (4,60 → 4,88 MB),
   WebP bei Qualität 80 sparte ganze **1 %** — bei einzelnen Bildern
   (`eiche-tag`, `blumen-terrasse`) war WebP sogar 10–14 % schlechter, weil
   feines Laub sich schlecht komprimieren lässt. Der Aufwand lohnt hier nicht.
   Wenn Ladezeit wirklich zum Thema wird, ist der Hebel eine niedrigere
   Qualitätsstufe — mit sichtbarem Verlust — oder weniger Bilder, nicht ein
   anderes Format.
