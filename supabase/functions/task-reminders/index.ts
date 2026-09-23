import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { tg, escapeHtml } from "../_shared/telegram.ts";

function localParts(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let sent = 0;
  try {
    const { data: owners, error } = await supabase
      .from("task_owners")
      .select("id, telegram_chat_id, timezone")
      .not("telegram_chat_id", "is", null);
    if (error) throw new Error(error.message);

    for (const owner of owners ?? []) {
      const tz = owner.timezone ?? "Europe/Rome";
      const { date, time } = localParts(tz);

      const { data: tasks } = await supabase
        .from("daily_tasks")
        .select("id, title, due_time")
        .eq("owner_id", owner.id)
        .eq("task_date", date)
        .eq("completed", false)
        .is("reminded_at", null)
        .not("due_time", "is", null)
        .lte("due_time", `${time}:59`);

      for (const task of tasks ?? []) {
        try {
          await tg("sendMessage", {
            chat_id: owner.telegram_chat_id,
            text:
              `⏰ <b>Scadenza attività</b>\n\n<b>${escapeHtml(task.title)}</b>` +
              (task.due_time ? ` — ore ${task.due_time.slice(0, 5)}` : "") +
              `\n\nL'hai completata?`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ Sì", callback_data: `done:${task.id}` },
                { text: "❌ No", callback_data: `todo:${task.id}` },
              ]],
            },
          });
          await supabase
            .from("daily_tasks")
            .update({ reminded_at: new Date().toISOString() })
            .eq("id", task.id);
          await supabase
            .from("telegram_prompts")
            .insert({ chat_id: owner.telegram_chat_id, task_id: task.id });
          sent++;
        } catch (e) {
          console.error("reminder send failed", task.id, e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("task-reminders error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
