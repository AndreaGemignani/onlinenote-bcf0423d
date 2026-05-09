import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Sun, Moon, NotebookPen } from "lucide-react";
import type { Note } from "@/types/note";
import { cn } from "@/lib/utils";

interface Props {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function AppSidebar({
  notes,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  theme,
  onToggleTheme,
}: Props) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={cn("flex items-center gap-2 px-2 py-1", collapsed && "justify-center")}>
          <NotebookPen className="h-5 w-5 text-accent" />
          {!collapsed && <span className="font-semibold">GemiNote</span>}
        </div>
        <div className="px-2">
          <Button
            onClick={onCreate}
            size="sm"
            className={cn(
              "w-full bg-accent hover:bg-accent/90 text-accent-foreground",
              collapsed && "px-0"
            )}
            title="Nuova nota"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-1.5">Nuova nota</span>}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Le tue note</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {notes.map((note) => {
                const title = note.title.trim() || "Senza titolo";
                const preview = note.preview?.trim() || "Vuota";
                return (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={note.id === activeId}
                      className="h-auto py-2"
                    >
                      <button
                        onClick={() => onSelect(note.id)}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-sm">{title}</span>
                            {!collapsed && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDate(note.updatedAt)}
                              </span>
                            )}
                          </div>
                          {!collapsed && (
                            <div className="text-xs text-muted-foreground truncate">
                              {preview}
                            </div>
                          )}
                        </div>
                        {!collapsed && notes.length > 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Eliminare "${title}"?`)) onDelete(note.id);
                            }}
                            className="opacity-0 group-hover/menu-item:opacity-100 hover:text-destructive p-1"
                            title="Elimina"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          className={cn("w-full justify-start", collapsed && "justify-center px-0")}
          title={theme === "dark" ? "Passa a chiaro" : "Passa a scuro"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">{theme === "dark" ? "Chiaro" : "Scuro"}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}