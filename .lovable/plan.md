## Modifiche

**1. Rimuovere la riga rossa a sinistra**
- In `src/index.css`: eliminare la regola `.notebook-margin::before` (e rimuovere la classe `notebook-margin` dal wrapper in `NoteEditor.tsx`).
- Rimuovere anche il token `--margin-line` dato che non serve più.

**2. Far funzionare elenco puntato e numerato**
- Attualmente in `index.css` le regole `.ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }` sono ok, ma le `ul`/`ol` normali hanno solo `padding-left` e nessun `list-style`. Aggiungere:
  - `.ProseMirror ul:not([data-type="taskList"]) { list-style: disc; }`
  - `.ProseMirror ol { list-style: decimal; }`
  - `.ProseMirror li { line-height: var(--grid); }` per mantenere allineamento alla griglia.

**3. Raggruppare le tre liste in un dropdown**
- In `src/components/editor/EditorToolbar.tsx`:
  - Rimuovere i tre `Button` separati (List, ListOrdered, ListChecks).
  - Sostituirli con un singolo `DropdownMenu` con trigger icona `List` (attivo se uno dei tre è attivo) e tre `DropdownMenuItem`:
    - Elenco puntato → `toggleBulletList`
    - Elenco numerato → `toggleOrderedList`
    - Checklist → `toggleTaskList`
  - Mantenere coerenza visiva con gli altri dropdown della toolbar (es. dimensione testo).

## File toccati
- `src/index.css` — rimozione margin line, fix list-style
- `src/components/editor/NoteEditor.tsx` — rimozione classe `notebook-margin`
- `src/components/editor/EditorToolbar.tsx` — dropdown unico per le liste

Nessuna modifica a logica dati o storage.