import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { FontSizeMark } from "./FontSizeMark";

interface Props {
  noteId: string;
  initialContent: unknown;
  onChange: (json: unknown, html: string, text: string) => void;
  onEditorReady: (editor: Editor) => void;
}

export function NoteEditor({ noteId, initialContent, onChange, onEditorReady }: Props) {
  const lastNoteId = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      FontSizeMark,
      Placeholder.configure({ placeholder: "Inizia a scrivere..." }),
    ],
    content: (initialContent as any) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class: "prose-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(json, html, text);
    },
  });

  // Notify parent when editor is ready / changes
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // When switching note, replace content without firing onUpdate
  useEffect(() => {
    if (!editor) return;
    if (lastNoteId.current === noteId) return;
    lastNoteId.current = noteId;
    editor.commands.setContent(
      (initialContent as any) ?? { type: "doc", content: [{ type: "paragraph" }] },
      { emitUpdate: false }
    );
  }, [noteId, initialContent, editor]);

  return (
    <div className="notebook-paper notebook-margin rounded-lg shadow-[0_10px_30px_-12px_hsl(220_30%_20%/0.25)]">
      <div
        className="px-[calc(var(--grid)*2)] py-[calc(var(--grid))]"
        style={{ minHeight: "calc(100vh - 220px)" }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}