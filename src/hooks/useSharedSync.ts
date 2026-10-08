import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";

export async function callShared<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("shared-notes", { body });
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  if (error) throw new Error(error.message);
  return data as T;
}

export interface SharedDoc {
  title: string;
  content: unknown;
  version: number;
}

export type SyncStatus = "loading" | "synced" | "saving" | "error" | "missing";

interface Opts {
  token: string | null;
  editor: Editor | null;
  title: string;
  onRemote: (doc: SharedDoc) => void;
}

/** Keeps a note in sync with its shared copy: debounced push + 3s polling (last write wins). */
export function useSharedSync({ token, editor, title, onRemote }: Opts) {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const version = useRef(0);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const syncedTitle = useRef<string | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;
  const editorRef = useRef(editor);
  editorRef.current = editor;

  const push = useCallback(async () => {
    const ed = editorRef.current;
    if (!token || !ed) return;
    setStatus("saving");
    try {
      const t = titleRef.current;
      const res = await callShared<{ version: number }>({
        action: "update", token, title: t, content: ed.getJSON(),
      });
      version.current = res.version;
      syncedTitle.current = t;
      dirty.current = false;
      setStatus("synced");
    } catch (e) {
      setStatus(String(e).includes("non trovata") ? "missing" : "error");
    }
  }, [token]);

  const markDirty = useCallback(() => {
    if (!token) return;
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(push, 700);
  }, [token, push]);

  const pull = useCallback(async () => {
    if (!token || dirty.current) return;
    try {
      const doc = await callShared<SharedDoc>({ action: "get", token });
      if (dirty.current) return;
      if (doc.version > version.current) {
        version.current = doc.version;
        syncedTitle.current = doc.title;
        onRemoteRef.current(doc);
      }
      setStatus((s) => (s === "saving" ? s : "synced"));
    } catch (e) {
      setStatus(String(e).includes("non trovata") ? "missing" : "error");
    }
  }, [token]);

  // Reset when token changes, then poll
  useEffect(() => {
    version.current = 0;
    dirty.current = false;
    syncedTitle.current = null;
    if (!token) return;
    setStatus("loading");
    pull();
    const id = setInterval(pull, 3000);
    return () => {
      clearInterval(id);
      clearTimeout(timer.current);
    };
  }, [token, pull]);

  // Title edits
  useEffect(() => {
    if (syncedTitle.current === null || title === syncedTitle.current) return;
    markDirty();
  }, [title, markDirty]);

  return { status, markDirty };
}

export function applyRemoteContent(editor: Editor | null, content: unknown) {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  editor.commands.setContent(content as any, { emitUpdate: false });
  const max = editor.state.doc.content.size;
  try {
    editor.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) });
  } catch { /* ignore */ }
}
