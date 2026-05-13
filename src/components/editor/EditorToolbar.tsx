import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Highlighter,
  ListChecks,
  List,
  ListOrdered,
  Type,
  Download,
  Upload,
  Trash2,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  editor: Editor | null;
  onOpen: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export function EditorToolbar({ editor, onOpen, onDownload, onClear }: Props) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    cn("h-8 w-8 p-0", active && "bg-accent/20 text-accent-foreground");

  return (
    <div className="flex items-center gap-1 flex-wrap w-full">
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annulla (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Ripeti (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2" title="Dimensione testo">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover z-50">
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize("small").run()}>
            <span className="text-sm">Piccolo</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize("medium").run()}>
            <span className="text-base">Medio</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontSize("large").run()}>
            <span className="text-lg">Grande</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
            <span className="text-sm text-muted-foreground">Default</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Titolo grande"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Sottotitolo"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Grassetto (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Corsivo (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btn(editor.isActive("highlight"))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Evidenzia"
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={btn(
              editor.isActive("bulletList") ||
                editor.isActive("orderedList") ||
                editor.isActive("taskList")
            )}
            title="Elenchi"
          >
            <List className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover z-50">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4 mr-2" />
            Elenco puntato
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4 mr-2" />
            Elenco numerato
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks className="h-4 w-4 mr-2" />
            Checklist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onOpen} title="Apri file">
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 hover:bg-destructive/10"
        onClick={onClear}
        title="Pulisci nota"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Button
        size="sm"
        className="h-8 px-3 bg-accent hover:bg-accent/90 text-accent-foreground"
        onClick={onDownload}
        title="Scarica nota"
      >
        <Download className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline text-sm">Scarica</span>
      </Button>
    </div>
  );
}