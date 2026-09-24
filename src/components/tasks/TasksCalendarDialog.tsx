import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Trash2,
  Link2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { DailyTask, TaskOwnerInfo } from "@/types/task";
import { dateKey, longDate, monthGrid, hhmm } from "@/lib/dateKey";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  owner: TaskOwnerInfo | null;
  tasks: DailyTask[];
  createTask: (date: string, title: string, dueTime: string | null) => Promise<void>;
  setCompleted: (id: string, completed: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  sendRecap: (date: string) => Promise<void>;
  refreshOwner: () => Promise<void>;
  unlinkTelegram: () => Promise<void>;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function TasksCalendarDialog({
  open,
  onOpenChange,
  monthCursor,
  setMonthCursor,
  selectedDate,
  setSelectedDate,
  owner,
  tasks,
  createTask,
  setCompleted,
  deleteTask,
  sendRecap,
  refreshOwner,
  unlinkTelegram,
}: Props) {
  const [title, setTitle] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [busy, setBusy] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyTask[]>();
    for (const t of tasks) {
      const arr = map.get(t.task_date) ?? [];
      arr.push(t);
      map.set(t.task_date, arr);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => monthGrid(monthCursor), [monthCursor]);
  const dayTasks = byDate.get(selectedDate) ?? [];
  const todayKey = dateKey(new Date());

  const monthLabel = monthCursor.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));

  const handleAdd = async () => {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    try {
      await createTask(selectedDate, t, dueTime || null);
      setTitle("");
      setDueTime("");
    } catch (e) {
      toast({
        title: "Errore",
        description: e instanceof Error ? e.message : "Impossibile aggiungere",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRecap = async () => {
    setBusy(true);
    try {
      await sendRecap(selectedDate);
      toast({ title: "Riepilogo inviato", description: "Controlla Telegram" });
    } catch (e) {
      toast({
        title: "Invio non riuscito",
        description: e instanceof Error ? e.message : "Riprova",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attività giornaliere</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium capitalize">{monthLabel}</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const key = dateKey(d);
                const inMonth = d.getMonth() === monthCursor.getMonth();
                const list = byDate.get(key) ?? [];
                const done = list.filter((t) => t.completed).length;
                const allDone = list.length > 0 && done === list.length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "aspect-square rounded-md text-xs flex flex-col items-center justify-center gap-0.5 border border-transparent transition-colors",
                      inMonth ? "text-foreground" : "text-muted-foreground/40",
                      key === todayKey && "border-accent",
                      key === selectedDate && "bg-accent/20 border-accent"
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {list.length > 0 && (
                      <span
                        className={cn(
                          "text-[9px] leading-none px-1 rounded-full",
                          allDone
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {done}/{list.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold capitalize">{longDate(selectedDate)}</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={busy || !owner?.telegramLinked || dayTasks.length === 0}
                onClick={handleRecap}
                title={
                  owner?.telegramLinked
                    ? "Invia il riepilogo su Telegram"
                    : "Collega prima Telegram"
                }
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Riepilogo
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
                placeholder="Nuova attività..."
                className="h-9"
              />
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-9 w-[110px]"
              />
              <Button size="sm" className="h-9" disabled={busy || !title.trim()} onClick={handleAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-1 min-h-[120px]">
              {dayTasks.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nessuna attività per questo giorno.
                </p>
              )}
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 group"
                >
                  <Checkbox
                    checked={t.completed}
                    onCheckedChange={(v) => void setCompleted(t.id, v === true)}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm truncate",
                      t.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {t.title}
                  </span>
                  {t.due_time && (
                    <Badge variant="secondary" className="text-[10px]">
                      {hhmm(t.due_time)}
                    </Badge>
                  )}
                  <button
                    onClick={() => void deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    title="Elimina"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Telegram pairing */}
            <div className="border-t pt-3 text-xs">
              {owner?.telegramLinked ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Telegram collegato
                    {owner.telegramUsername ? ` (@${owner.telegramUsername})` : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => void unlinkTelegram()}
                  >
                    Scollega
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">
                    Collega Telegram per ricevere i promemoria all'orario di scadenza e
                    rispondere sì/no direttamente in chat.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={!owner?.deepLink}
                      onClick={() => {
                        if (owner?.deepLink) window.open(owner.deepLink, "_blank");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Collega Telegram
                    </Button>
                    {owner?.pairCode && (
                      <span className="text-muted-foreground">
                        oppure invia al bot: <code>/start {owner.pairCode}</code>
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => void refreshOwner()}
                    >
                      Aggiorna
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
