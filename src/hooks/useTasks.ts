import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DailyTask, TaskOwnerInfo } from "@/types/task";
import { monthRange } from "@/lib/dateKey";

const OWNER_KEY = "geminote.taskOwnerId";

async function callApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tasks-api", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

export function useTasks(monthCursor: Date, enabled: boolean) {
  const [owner, setOwner] = useState<TaskOwnerInfo | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  // Bootstrap owner (anonymous local id)
  useEffect(() => {
    if (!enabled || bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const stored = localStorage.getItem(OWNER_KEY);
        const info = await callApi<TaskOwnerInfo>({
          action: "register",
          ownerId: stored ?? undefined,
        });
        localStorage.setItem(OWNER_KEY, info.ownerId);
        setOwner(info);
      } catch (e) {
        bootstrapped.current = false;
        setError(e instanceof Error ? e.message : "Errore di connessione");
      }
    })();
  }, [enabled]);

  const refresh = useCallback(async () => {
    if (!owner) return;
    const { from, to } = monthRange(monthCursor);
    setLoading(true);
    try {
      const res = await callApi<{ tasks: DailyTask[] }>({
        action: "list",
        ownerId: owner.ownerId,
        from,
        to,
      });
      setTasks(res.tasks ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [owner, monthCursor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep in sync with answers coming from Telegram
  useEffect(() => {
    if (!enabled || !owner) return;
    const t = setInterval(() => void refresh(), 20000);
    return () => clearInterval(t);
  }, [enabled, owner, refresh]);

  const refreshOwner = useCallback(async () => {
    const stored = localStorage.getItem(OWNER_KEY);
    if (!stored) return;
    try {
      const info = await callApi<TaskOwnerInfo>({ action: "register", ownerId: stored });
      setOwner(info);
    } catch {
      /* ignore */
    }
  }, []);

  const createTask = useCallback(
    async (date: string, title: string, dueTime: string | null) => {
      if (!owner) return;
      const res = await callApi<{ task: DailyTask }>({
        action: "create",
        ownerId: owner.ownerId,
        date,
        title,
        dueTime: dueTime || null,
      });
      setTasks((prev) => [...prev, res.task]);
    },
    [owner]
  );

  const setCompleted = useCallback(
    async (id: string, completed: boolean) => {
      if (!owner) return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
      try {
        await callApi({ action: "update", ownerId: owner.ownerId, id, completed });
      } catch {
        void refresh();
      }
    },
    [owner, refresh]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!owner) return;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await callApi({ action: "delete", ownerId: owner.ownerId, id });
      } catch {
        void refresh();
      }
    },
    [owner, refresh]
  );

  const sendRecap = useCallback(
    async (date: string) => {
      if (!owner) throw new Error("Spazio non pronto");
      await callApi({ action: "recap", ownerId: owner.ownerId, date });
    },
    [owner]
  );

  const unlinkTelegram = useCallback(async () => {
    if (!owner) return;
    await callApi({ action: "unlink", ownerId: owner.ownerId });
    await refreshOwner();
  }, [owner, refreshOwner]);

  return {
    owner,
    tasks,
    loading,
    error,
    refresh,
    refreshOwner,
    createTask,
    setCompleted,
    deleteTask,
    sendRecap,
    unlinkTelegram,
  };
}
