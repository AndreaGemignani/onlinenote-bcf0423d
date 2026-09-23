import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { tg, getBotUsername, formatRecap } from "../_shared/telegram.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makePairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function dateLabel(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const ownerId = body?.ownerId ? String(body.ownerId) : null;

    // --- register / bootstrap -------------------------------------------
    if (action === "register") {
      let owner = null;
      if (ownerId && UUID_RE.test(ownerId)) {
        const { data } = await supabase
          .from("task_owners")
          .select("*")
          .eq("id", ownerId)
          .maybeSingle();
        owner = data;
      }
      if (!owner) {
        const { data, error } = await supabase
          .from("task_owners")
          .insert({ pair_code: makePairCode() })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);
        owner = data;
      }
      const username = await getBotUsername();
      return json({
        ownerId: owner.id,
        pairCode: owner.pair_code,
        telegramLinked: !!owner.telegram_chat_id,
        telegramUsername: owner.telegram_username,
        botUsername: username,
        deepLink: username ? `https://t.me/${username}?start=${owner.pair_code}` : null,
      });
    }

    if (!ownerId || !UUID_RE.test(ownerId)) return json({ error: "ownerId non valido" }, 400);

    const { data: owner } = await supabase
      .from("task_owners")
      .select("*")
      .eq("id", ownerId)
      .maybeSingle();
    if (!owner) return json({ error: "Spazio non trovato" }, 404);

    // --- list -------------------------------------------------------------
    if (action === "list") {
      const from = String(body.from ?? "");
      const to = String(body.to ?? "");
      if (!DATE_RE.test(from) || !DATE_RE.test(to)) return json({ error: "Date non valide" }, 400);
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("id, task_date, title, due_time, completed, completed_at")
        .eq("owner_id", ownerId)
        .gte("task_date", from)
        .lte("task_date", to)
        .order("task_date")
        .order("due_time", { nullsFirst: false })
        .order("created_at");
      if (error) return json({ error: error.message }, 500);
      return json({ tasks: data });
    }

    // --- create -----------------------------------------------------------
    if (action === "create") {
      const title = String(body.title ?? "").trim();
      const date = String(body.date ?? "");
      const dueTime = body.dueTime ? String(body.dueTime) : null;
      if (!title || title.length > 300) return json({ error: "Titolo non valido" }, 400);
      if (!DATE_RE.test(date)) return json({ error: "Data non valida" }, 400);
      if (dueTime && !TIME_RE.test(dueTime)) return json({ error: "Orario non valido" }, 400);
      const { data, error } = await supabase
        .from("daily_tasks")
        .insert({ owner_id: ownerId, task_date: date, title, due_time: dueTime })
        .select("id, task_date, title, due_time, completed, completed_at")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ task: data });
    }

    // --- update -----------------------------------------------------------
    if (action === "update") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return json({ error: "id non valido" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.title === "string") {
        const title = body.title.trim();
        if (!title || title.length > 300) return json({ error: "Titolo non valido" }, 400);
        patch.title = title;
      }
      if (body.dueTime !== undefined) {
        const dueTime = body.dueTime ? String(body.dueTime) : null;
        if (dueTime && !TIME_RE.test(dueTime)) return json({ error: "Orario non valido" }, 400);
        patch.due_time = dueTime;
        patch.reminded_at = null;
      }
      if (typeof body.completed === "boolean") {
        patch.completed = body.completed;
        patch.completed_at = body.completed ? new Date().toISOString() : null;
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nessuna modifica" }, 400);
      const { data, error } = await supabase
        .from("daily_tasks")
        .update(patch)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select("id, task_date, title, due_time, completed, completed_at")
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Attività non trovata" }, 404);
      return json({ task: data });
    }

    // --- delete -----------------------------------------------------------
    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return json({ error: "id non valido" }, 400);
      const { error } = await supabase
        .from("daily_tasks")
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // --- send recap to Telegram -------------------------------------------
    if (action === "recap") {
      const date = String(body.date ?? "");
      if (!DATE_RE.test(date)) return json({ error: "Data non valida" }, 400);
      if (!owner.telegram_chat_id) return json({ error: "Telegram non collegato" }, 400);
      const { data: tasks, error } = await supabase
        .from("daily_tasks")
        .select("id, title, due_time, completed")
        .eq("owner_id", ownerId)
        .eq("task_date", date)
        .order("due_time", { nullsFirst: false })
        .order("created_at");
      if (error) return json({ error: error.message }, 500);
      await tg("sendMessage", {
        chat_id: owner.telegram_chat_id,
        text: formatRecap(dateLabel(date), tasks ?? []),
        parse_mode: "HTML",
      });
      return json({ ok: true, sent: tasks?.length ?? 0 });
    }

    // --- unlink telegram ---------------------------------------------------
    if (action === "unlink") {
      const { error } = await supabase
        .from("task_owners")
        .update({ telegram_chat_id: null, telegram_username: null })
        .eq("id", ownerId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    console.error("tasks-api error", e);
    return json({ error: e instanceof Error ? e.message : "Errore interno" }, 500);
  }
});
