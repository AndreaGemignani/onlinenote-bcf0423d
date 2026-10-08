import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Users } from "lucide-react";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { useTheme } from "@/hooks/useTheme";
import { useSharedSync, applyRemoteContent, type SharedDoc } from "@/hooks/useSharedSync";
import { downloadNoteFile } from "@/lib/noteExport";

const SharedNote = () => {
  const { token = "" } = useParams();
  const { theme, toggle } = useTheme();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState("");
  const [initial, setInitial] = useState<unknown>(null);

  const onRemote = useCallback(
    (doc: SharedDoc) => {
      setTitle(doc.title);
      if (initial === null) setInitial(doc.content);
      else applyRemoteContent(editor, doc.content);
    },
    [editor, initial]
  );

  const { status, markDirty } = useSharedSync({ token, editor, title, onRemote });

  const statusLabel = {
    loading: "Caricamento…", synced: "Salvato", saving: "Salvataggio…",
    error: "Errore di connessione", missing: "",
  }[status];

  if (status === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-2xl font-bold">Nota non disponibile</h1>
        <p className="text-muted-foreground">Il link non è valido oppure la condivisione è stata disattivata.</p>
        <Button asChild><Link to="/">Vai alle tue note</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 h-12">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Users className="h-4 w-4" /> Condivisa
          </span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          {editor && (
            <EditorToolbar
              editor={editor}
              onDownload={() =>
                downloadNoteFile(
                  { id: token, title, contentJSON: editor.getJSON(), preview: "", createdAt: Date.now(), updatedAt: Date.now() },
                  editor.getHTML()
                )
              }
              onClear={() => {
                if (!confirm("Cancellare il contenuto per tutti?")) return;
                editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
              }}
            />
          )}
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo della nota..."
            className="w-full bg-transparent border-none outline-none text-3xl font-bold mb-6 placeholder:text-muted-foreground"
          />
          {initial !== null && (
            <NoteEditor
              noteId={token}
              initialContent={initial}
              onChange={markDirty}
              onEditorReady={setEditor}
            />
          )}
          <p className="text-center text-xs text-muted-foreground mt-6">
            {statusLabel} · Chiunque abbia il link può modificare questa nota
          </p>
        </div>
      </main>
    </div>
  );
};

export default SharedNote;
