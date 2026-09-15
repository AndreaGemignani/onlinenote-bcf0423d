import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { NotesMenu } from "@/components/NotesMenu";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { useNotes } from "@/hooks/useNotes";
import { useTheme } from "@/hooks/useTheme";
import { downloadNoteFile } from "@/lib/noteExport";
import { importNoteFromFile } from "@/lib/noteImport";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const {
    notes,
    activeNote,
    activeId,
    setActiveId,
    createNote,
    updateNote,
    deleteNote,
    clearActive,
    togglePin,
  } = useNotes();
  const { theme, toggle } = useTheme();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestHTML = useRef<string>("");

  // Sync title input when active note changes
  useEffect(() => {
    setTitleDraft(activeNote?.title ?? "");
  }, [activeNote?.id]);

  // Debounced title save
  useEffect(() => {
    if (!activeNote) return;
    if (titleDraft === activeNote.title) return;
    const t = setTimeout(() => {
      updateNote(activeNote.id, { title: titleDraft });
    }, 400);
    return () => clearTimeout(t);
  }, [titleDraft, activeNote, updateNote]);

  const handleEditorChange = useCallback(
    (json: unknown, html: string, text: string) => {
      if (!activeId) return;
      latestHTML.current = html;
      updateNote(activeId, {
        contentJSON: json,
        preview: text.slice(0, 120),
      });
    },
    [activeId, updateNote]
  );

  const handleDownload = useCallback(() => {
    if (!activeNote || !editor) return;
    const html = editor.getHTML();
    downloadNoteFile({ ...activeNote, title: titleDraft }, html);
    toast({ title: "Nota scaricata", description: "File .html salvato sul tuo dispositivo" });
  }, [activeNote, editor, titleDraft]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const imported = await importNoteFromFile(file);
        const note = createNote({
          title: imported.title || file.name.replace(/\.(html|json)$/i, ""),
          contentJSON: imported.contentJSON,
        });
        toast({ title: "Nota importata", description: note.title || "Senza titolo" });
      } catch (err) {
        console.error(err);
        toast({
          title: "Errore",
          description: "Impossibile leggere il file",
          variant: "destructive",
        });
      }
    },
    [createNote]
  );

  const handleClear = useCallback(() => {
    if (!activeNote) return;
    if (!confirm("Vuoi davvero cancellare il contenuto di questa nota?")) return;
    clearActive();
    setTitleDraft("");
    editor?.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
  }, [activeNote, clearActive, editor]);

  // Ctrl/Cmd+S => download
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDownload]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 h-12">
            <NotesMenu
              notes={notes}
              activeId={activeId}
              onSelect={setActiveId}
              onCreate={() => createNote()}
              onDelete={deleteNote}
              onTogglePin={togglePin}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggle}
              title={theme === "dark" ? "Passa a chiaro" : "Passa a scuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            {activeNote && editor && (
              <EditorToolbar
                editor={editor}
                onOpen={handleOpen}
                onDownload={handleDownload}
                onClear={handleClear}
              />
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Titolo della nota..."
              className="w-full bg-transparent border-none outline-none text-3xl font-bold mb-6 placeholder:text-muted-foreground"
            />
            {activeNote && (
              <NoteEditor
                noteId={activeNote.id}
                initialContent={activeNote.contentJSON}
                onChange={handleEditorChange}
                onEditorReady={setEditor}
              />
            )}
            <p className="text-center text-xs text-muted-foreground mt-6">
              🔒 Tutte le note sono salvate localmente sul tuo dispositivo
            </p>
          </div>
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default Index;