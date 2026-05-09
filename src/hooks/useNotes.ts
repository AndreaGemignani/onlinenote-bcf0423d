import { useCallback, useEffect, useMemo, useState } from "react";
import type { Note } from "@/types/note";

const NOTES_KEY = "geminote.notes";
const ACTIVE_KEY = "geminote.activeId";

function uid() {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function load(): { notes: Note[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const notes: Note[] = raw ? JSON.parse(raw) : [];
    const activeId = localStorage.getItem(ACTIVE_KEY);
    return { notes, activeId };
  } catch {
    return { notes: [], activeId: null };
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Initial load + bootstrap one note if empty
  useEffect(() => {
    const { notes: loaded, activeId: storedActive } = load();
    if (loaded.length === 0) {
      const first: Note = {
        id: uid(),
        title: "",
        contentJSON: emptyDoc(),
        preview: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes([first]);
      setActiveId(first.id);
    } else {
      setNotes(loaded);
      setActiveId(
        storedActive && loaded.some((n) => n.id === storedActive)
          ? storedActive
          : loaded[0].id
      );
    }
  }, []);

  // Persist
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId]
  );

  const createNote = useCallback((seed?: Partial<Note>) => {
    const note: Note = {
      id: uid(),
      title: "",
      contentJSON: emptyDoc(),
      preview: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...seed,
    };
    setNotes((arr) => [note, ...arr]);
    setActiveId(note.id);
    return note;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setNotes((arr) =>
        arr.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        )
      );
    },
    []
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((arr) => {
        const next = arr.filter((n) => n.id !== id);
        if (next.length === 0) {
          const fresh: Note = {
            id: uid(),
            title: "",
            contentJSON: emptyDoc(),
            preview: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setActiveId(fresh.id);
          localStorage.setItem(NOTES_KEY, JSON.stringify([fresh]));
          return [fresh];
        }
        if (id === activeId) setActiveId(next[0].id);
        localStorage.setItem(NOTES_KEY, JSON.stringify(next));
        return next;
      });
    },
    [activeId]
  );

  const clearActive = useCallback(() => {
    if (!activeId) return;
    updateNote(activeId, { title: "", contentJSON: emptyDoc(), preview: "" });
  }, [activeId, updateNote]);

  return {
    notes,
    activeNote,
    activeId,
    setActiveId,
    createNote,
    updateNote,
    deleteNote,
    clearActive,
  };
}