import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tg, webhookSecret, escapeHtml, formatRecap } from "../_shared/telegram.ts";

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function labelFor(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

const YES = /^(s[iì]+|yes|y|ok|fatto|completata|completato|done|✅|👍)$/i;
const NO = /^(no|n|nope|non ancora|not yet|❌|👎)$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const expected = await webhookSecret();
  if (!safeEqual(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ok = () => new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });

  try {
    const update = await req.json();
    if (typeof update?.update_id !== "number") return ok();

    // idempotency
    const { error: dupErr } = await supabase
      .from("telegram_updates")
      .insert({ update_id: update.update_id });
    if (dupErr) return ok(); // already processed

    const cb = update.callback_query;
    const msg = update.message ?? update.edited_message;

    // ---- inline button answers -------------------------------------------
    if (cb) {
      const chatId = cb.message?.chat?.id;
      const data = String(cb.data ?? "");
      const [verb, taskId] = data.split(":");
      if (chatId && taskId && (verb === "done" || verb === "todo")) {
        const completed = verb === "done";
        const { data: task } = await supabase
          .from("daily_tasks")
          .select("id, title, owner_id")
          .eq("id", taskId)
          .maybeSingle();
        const { data: owner } = task
          ? await supabase
              .from("task_owners")
              .select("id, telegram_chat_id")
              .eq("id", task.owner_id)
              .maybeSingle()
          : { data: null };
        if (task && owner && Number(owner.telegram_chat_id) === Number(chatId)) {
          await supabase
            .from("daily_tasks")
            .update({
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            })
            .eq("id", taskId);
          await supabase
            .from("telegram_prompts")
            .update({ answered: true })
            .eq("task_id", taskId)
            .eq("chat_id", chatId);
          await tg("answerCallbackQuery", {
            callback_query_id: cb.id,
            text: completed ? "Segnata come completata" : "Resta da fare",
          });
          await tg("sendMessage", {
            chat_id: chatId,
            text: completed
              ? `✅ <b>${escapeHtml(task.title)}</b> segnata come completata.`
              : `❌ <b>${escapeHtml(task.title)}</b> resta da completare.`,
            parse_mode: "HTML",
          });
          return ok();
        }
      }
      await tg("answerCallbackQuery", { callback_query_id: cb.id });
      return ok();
    }

    const chatId = msg?.chat?.id;
    const text = String(msg?.text ?? "").trim();
    if (!chatId) return ok();

    // ---- /start <pair code> ----------------------------------------------
    if (text.startsWith("/start")) {
      const code = text.split(/\s+/)[1]?.toUpperCase();
      if (code) {
        const { data: owner } = await supabase
          .from("task_owners")
          .select("id")
          .eq("pair_code", code)
          .maybeSingle();
        if (owner) {
          await supabase
            .from("task_owners")
            .update({
              telegram_chat_id: chatId,
              telegram_username: msg?.from?.username ?? null,
            })
            .eq("id", owner.id);
          await tg("sendMessage", {
            chat_id: chatId,
            text:
              "🔗 <b>Collegamento riuscito!</b>\n\nDa ora riceverai qui il riepilogo delle tue attività e i promemoria alla scadenza.\n\nScrivi /oggi per il riepilogo di oggi.",
            parse_mode: "HTML",
          });
          return ok();
        }
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "👋 Ciao! Per collegarti, apri le tue attività nell'app e premi <b>Collega Telegram</b>.",
        parse_mode: "HTML",
      });
      return ok();
    }

    const { data: owner } = await supabase
      .from("task_owners")
      .select("id, timezone")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (!owner) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Questo account non è ancora collegato. Apri l'app e premi «Collega Telegram».",
      });
      return ok();
    }

    // ---- /oggi ------------------------------------------------------------
    if (/^\/(oggi|today|recap)/i.test(text)) {
      const date = todayIn(owner.timezone ?? "Europe/Rome");
      const { data: tasks } = await supabase
        .from("daily_tasks")
        .select("id, title, due_time, completed")
        .eq("owner_id", owner.id)
        .eq("task_date", date)
        .order("due_time", { nullsFirst: false })
        .order("created_at");
      await tg("sendMessage", {
        chat_id: chatId,
        text: formatRecap(labelFor(date), tasks ?? []),
        parse_mode: "HTML",
      });
      return ok();
    }

    // ---- plain yes / no reply to last prompt -------------------------------
    const isYes = YES.test(text);
    const isNo = NO.test(text);
    if (isYes || isNo) {
      const { data: prompt } = await supabase
        .from("telegram_prompts")
        .select("id, task_id")
        .eq("chat_id", chatId)
        .eq("answered", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!prompt) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Non ho promemoria in sospeso a cui riferire questa risposta.",
        });
        return ok();
      }
      const { data: task } = await supabase
        .from("daily_tasks")
        .update({
          completed: isYes,
          completed_at: isYes ? new Date().toISOString() : null,
        })
        .eq("id", prompt.task_id)
        .eq("owner_id", owner.id)
        .select("title")
        .maybeSingle();
      await supabase.from("telegram_prompts").update({ answered: true }).eq("id", prompt.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text: isYes
          ? `✅ Ottimo! <b>${escapeHtml(task?.title ?? "")}</b> è segnata come completata.`
          : `❌ Ok, <b>${escapeHtml(task?.title ?? "")}</b> resta da completare.`,
        parse_mode: "HTML",
      });
      return ok();
    }

    await tg("sendMessage", {
      chat_id: chatId,
      text: "Comandi disponibili:\n/oggi — riepilogo delle attività di oggi\nRispondi «sì» o «no» ai promemoria per aggiornare un'attività.",
    });
    return ok();
  } catch (e) {
    console.error("telegram-webhook error", e);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
