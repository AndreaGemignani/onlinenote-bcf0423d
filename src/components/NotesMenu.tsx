import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Pin, PinOff, Plus, Trash2, NotebookPen } from "lucide-react";
import type { Note } from "@/types/note";
import { cn } from "@/lib/utils";

interface Props {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function NotesMenu({
  notes,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
}: Props) {
  const active = notes.find((n) => n.id === activeId);
  const activeTitle = active?.title.trim() || "Senza titolo";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 max-w-[220px]">
          <NotebookPen className="h-4 w-4 mr-1.5 text-accent shrink-0" />
          <span className="truncate text-sm font-medium">{activeTitle}</span>
          <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover z-50 w-80">
        <DropdownMenuItem onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova nota
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Le tue note
        </DropdownMenuLabel>
        <div className="max-h-80 overflow-y-auto">
          {notes.map((note) => {
            const title = note.title.trim() || "Senza titolo";
            return (
              <DropdownMenuItem
                key={note.id}
                onSelect={() => onSelect(note.id)}
                className={cn(
                  "flex items-start gap-2 py-2",
                  note.id === activeId && "bg-accent/15"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {note.pinned && <Pin className="h-3 w-3 text-accent shrink-0" />}
                    <span className="truncate text-sm font-medium">{title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {note.preview?.trim() || "Vuota"}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  title={note.pinned ? "Rimuovi dai fissati" : "Fissa in alto"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  className="p-1 hover:text-accent"
                >
                  {note.pinned ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </span>
                {notes.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Elimina"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Eliminare "${title}"?`)) onDelete(note.id);
                    }}
                    className="p-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
