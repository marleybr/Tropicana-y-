# 🌴 TROPICANA

Et enkelt 3D-spill i nettleseren med Three.js. Utforsk en tropisk øy!

## Funksjoner

- **Tropisk øy** med palmetrær, strand og hav
- **WASD-kontroller** for å bevege deg rundt
- **Kassettspiller** som spiller musikk når du trykker E
- **Avatar** med Brasil-drakt, svart hår og jeans

## Slik kjører du spillet

### Alternativ 1: Python (enklest)

```bash
# Naviger til prosjektmappen
cd "/Users/francisco/Tropicana spill"

# Start en lokal server
python3 -m http.server 8000
```

Åpne deretter **http://localhost:8000** i nettleseren.

### Alternativ 2: Node.js

```bash
# Installer en enkel server
npm install -g serve

# Kjør serveren
cd "/Users/francisco/Tropicana spill"
serve .
```

### Alternativ 3: VS Code Live Server

1. Installer "Live Server" extension i VS Code
2. Høyreklikk på `index.html`
3. Velg "Open with Live Server"

## Legge til musikk

1. Opprett mappen `public/audio/` (allerede gjort)
2. Legg til en MP3-fil med navnet `track1.mp3`
3. Full sti: `public/audio/track1.mp3`

## Kontroller

| Tast | Handling |
|------|----------|
| W | Gå fremover |
| A | Gå til venstre |
| S | Gå bakover |
| D | Gå til høyre |
| E | Spill/stopp musikk (nær kassettspilleren) |

## Teknologi

- **Three.js** - 3D-grafikk
- **Web Audio API** - Lydavspilling
- **Vanilla JavaScript** - Ingen rammeverk

---

Ha det gøy på øya! 🏝️




