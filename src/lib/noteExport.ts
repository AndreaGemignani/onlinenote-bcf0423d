import type { Note } from "@/types/note";

export function buildNoteHTML(note: Note, contentHTML: string): string {
  const safeTitle = (note.title || "Nota").replace(/</g, "&lt;");
  const json = JSON.stringify({
    title: note.title,
    contentJSON: note.contentJSON,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} — GemiNote</title>
<style>
  :root { --grid: 28px; --paper:#f6efdc; --grid-line:#d6c9a8; --margin:#d05a5a; --ink:#1d2a44; --muted:#6b6f7d; --accent:#e08a3c; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#efe7d0; color:var(--ink); font-family: 'Caveat','Patrick Hand', system-ui, sans-serif; }
  .wrap { max-width: 880px; margin: 32px auto; padding: 0 16px; }
  header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 16px; font-family: system-ui, sans-serif; font-size: 13px; color: var(--muted); }
  .brand { font-weight:600; color: var(--ink); }
  .paper {
    background-color: var(--paper);
    background-image:
      linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
    background-size: var(--grid) var(--grid);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,.12);
    padding: calc(var(--grid)*2) calc(var(--grid)*2);
    position: relative;
  }
  .paper::before { content:""; position:absolute; top:0; bottom:0; left: calc(var(--grid)*3 - 1px); width:1px; background: var(--margin); opacity:.45; }
  h1.title { font-size: 32px; font-weight:700; margin: 0 0 var(--grid) 0; line-height: calc(var(--grid)*2); min-height: calc(var(--grid)*2); }
  .content { font-size: 20px; line-height: var(--grid); }
  .content p { margin:0; min-height: var(--grid); }
  .content h1 { font-size: 28px; line-height: calc(var(--grid)*2); margin:0; }
  .content h2 { font-size: 24px; line-height: calc(var(--grid)*1.5); margin:0; }
  .content ul, .content ol { padding-left: calc(var(--grid)*1.2); margin:0; }
  .content ul[data-type="taskList"] { list-style:none; padding-left:0; }
  .content ul[data-type="taskList"] li { display:flex; align-items:flex-start; gap:8px; min-height:var(--grid); }
  .content ul[data-type="taskList"] li > label { display:flex; align-items:center; height:var(--grid); }
  .content ul[data-type="taskList"] input[type="checkbox"] { width:16px; height:16px; accent-color: var(--accent); cursor:pointer; }
  .content ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; opacity:.55; }
  .content mark { background: rgba(255,210,90,.7); padding:0 2px; border-radius:2px; }
  .content [data-font-size="small"] { font-size: 16px; }
  .content [data-font-size="medium"] { font-size: 20px; }
  .content [data-font-size="large"] { font-size: 26px; }
  footer { margin-top: 16px; font-family: system-ui, sans-serif; font-size: 12px; color: var(--muted); text-align:center; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <span class="brand">📓 GemiNote</span>
      <span>🔒 File salvato localmente · ${new Date(note.updatedAt).toLocaleString()}</span>
    </header>
    <article class="paper">
      <h1 class="title">${safeTitle}</h1>
      <div class="content">${contentHTML}</div>
    </article>
    <footer>Apri di nuovo questo file su GemiNote per modificarlo.</footer>
  </div>
  <script type="application/json" id="geminote-doc">${json}</script>
  <script>
    // Allow checkbox toggling in the standalone file
    document.querySelectorAll('ul[data-type="taskList"] input[type="checkbox"]').forEach(function(cb){
      cb.addEventListener('change', function(){
        var li = cb.closest('li');
        if (li) li.setAttribute('data-checked', cb.checked ? 'true' : 'false');
      });
    });
  </script>
</body>
</html>`;
}

export function downloadNoteFile(note: Note, contentHTML: string) {
  const html = buildNoteHTML(note, contentHTML);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = (note.title || "nota")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase() || "nota";
  a.download = `${base}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}