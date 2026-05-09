
# Ricostruzione GemiNote

Riscrittura completa dell'app mantenendo le feature core (download, open, clear, formattazione, checkbox) e aggiungendo: editor Tiptap, multi-nota locale con sidebar, tema light/dark, sfondo "quaderno a quadretti" perfettamente allineato col testo.

## Esperienza utente

### Layout
- **Sidebar sinistra collassabile** (shadcn `Sidebar`) con:
  - Pulsante "Nuova nota"
  - Lista note salvate localmente (titolo + anteprima + data)
  - Click per aprire, hover per cancellare
  - Toggle light/dark in fondo
- **Area principale**:
  - Toolbar fissa in alto: a sinistra logo "GemiNote" + nome file corrente; al centro tools di formattazione; a destra Open / Save / Download / Clear
  - Campo titolo grande sotto la toolbar
  - Editor a tutta larghezza (max-width contenuta) con sfondo a quadretti

### Sfondo quaderno a quadretti (allineato)
Punto chiave: la griglia DEVE coincidere con la riga di testo.
- Definiamo una costante `--grid: 28px` (CSS var)
- `line-height: var(--grid)` su tutti i blocchi dell'editor (paragrafi, checklist, headings adattati)
- `font-size` scelto per leggersi bene a 28px di altezza (es. 16px)
- Sfondo: `background-image: linear-gradient(...)` con due gradient (verticale + orizzontale) di passo `var(--grid)`, partenza calcolata col padding-top dell'editor in modo che la baseline del testo cada esattamente sulla riga
- Margine sinistro rosso/rosa stile quaderno (linea verticale) opzionale ma carino
- In dark mode: sfondo scuro tipo blueprint, quadretti più chiari, testo chiaro

### Tema
- Toggle manuale (icona sole/luna nella sidebar)
- Persistenza in `localStorage` (`theme: light|dark`)
- Token semantici in `index.css` per entrambi i temi (paper bg, ink, grid line, accent)

## Funzionalità

### Editor (Tiptap)
- StarterKit (paragraph, bold, italic, history, lists)
- TaskList + TaskItem (checkbox interattive native, niente più hack su contentEditable)
- Highlight extension (giallo)
- TextStyle + FontSize custom (small/medium/large)
- Placeholder extension ("Inizia a scrivere...")
- Shortcut Ctrl+B / Ctrl+I / Ctrl+S (save), Ctrl+Shift+L (checkbox)

### Multi-nota locale
- Tipo `Note { id, title, contentJSON, contentHTML, updatedAt, createdAt }`
- Storage: `localStorage` chiave `geminote.notes` (array) + `geminote.activeId`
- Hook `useNotes()` con: `notes`, `activeNote`, `createNote`, `updateNote`, `deleteNote`, `setActive`
- Auto-save debounced (500ms) della nota attiva
- Sidebar mostra note ordinate per `updatedAt` desc

### Toolbar azioni
- **Nuova**: crea nota vuota e la apre
- **Apri**: file picker `.html`/`.json` → importa come nuova nota (parse del JSON Tiptap embeddato)
- **Salva (Download)**: esporta nota attiva come `.html` autonomo (vedi sotto). Nome = titolo sanitizzato.
- **Pulisci**: svuota contenuto della nota attiva (con conferma)
- **Elimina nota**: dalla sidebar

### File HTML esportato
HTML self-contained che:
- Mostra titolo e contenuto formattato (read-only di default, bello da leggere)
- Embedda il documento Tiptap in JSON dentro `<script type="application/json" id="geminote-doc">` per re-import lossless
- Stile coerente (quaderno a quadretti) inline
- Checkbox cliccabili anche nel file aperto stand-alone (mini script JS inline che toggla `data-checked`)

## Struttura tecnica

### File nuovi
```
src/
  pages/Index.tsx                 (riscritto: layout + provider notes)
  components/
    AppSidebar.tsx                (sidebar note + toggle tema)
    EditorToolbar.tsx             (toolbar formattazione + azioni)
    NoteEditor.tsx                (Tiptap editor con sfondo quadretti)
    ThemeToggle.tsx
  hooks/
    useNotes.ts                   (CRUD su localStorage)
    useTheme.ts                   (light/dark)
  lib/
    noteExport.ts                 (genera HTML self-contained)
    noteImport.ts                 (parse HTML → JSON Tiptap)
    sanitize.ts                   (filename helper)
  types/note.ts
index.css                         (token paper/ink/grid + var --grid)
tailwind.config.ts                (eventuali colori custom paper/ink)
```

### Dipendenze da aggiungere
```
@tiptap/react @tiptap/pm @tiptap/starter-kit
@tiptap/extension-task-list @tiptap/extension-task-item
@tiptap/extension-highlight @tiptap/extension-placeholder
@tiptap/extension-text-style
```

### Design tokens (index.css)
- `--paper`, `--paper-grid`, `--ink`, `--ink-muted`, `--margin-line`, `--accent` (entrambi i temi)
- `--grid: 28px`
- Tutti i colori HSL come da regole del progetto

### Allineamento griglia (dettaglio critico)
- Editor wrapper: `padding: var(--grid) calc(var(--grid)*2);`
- Background-position: `0 0` così la prima linea coincide col bordo superiore del padding
- ProseMirror node `p, li, .task-item`: `min-height: var(--grid); line-height: var(--grid); margin: 0;`
- Headings disabilitati o normalizzati a multipli di `--grid` (es. h1 = 2× grid)

## Cosa viene rimosso
- Vecchio `FormattingToolbar.tsx` e logica `contentEditable`/`execCommand` in `Index.tsx`
- Hack manuali su checkbox (sostituiti da TaskList di Tiptap)
- File handle / FS Access API (semplificato: salva sempre come download; le note vivono in sidebar locale)

## Out of scope
- Cloud sync / autenticazione
- Collaborazione realtime
- Export PDF / formati extra oltre HTML
