import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tg, webhookSecret, escapeHtml, formatRecap } from "../_shared/telegram.ts";

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function todayIn(tz: string, offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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
const DEL = /^(elimina|cancella|delete|rimuovi|🗑️?)$/i;
const SNOOZE_MS = 10 * 60 * 1000;

const HELP =
  "📝 <b>Comandi</b>\n\n" +
  "/promemoria [oggi|domani|GG/MM|AAAA-MM-GG] [HH:MM] testo\n" +
  "  es. <code>/promemoria 15:30 Comprare il pane</code>\n" +
  "  es. <code>/promemoria domani 9:00 Chiamare Marco</code>\n" +
  "/oggi — riepilogo delle attività di oggi\n\n" +
  "Ai promemoria rispondi con i pulsanti o scrivendo «sì», «no» o «elimina».\n" +
  "Per rimandare: «ricordamelo tra 20 minuti», «tra 1 ora» o «alle 18:30».";

function zonedToUtc(date: string, time: string, tz: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(guess).map((x) => [x.type, x.value]),
  );
  const asLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess.getTime() - (asLocal - guess.getTime()));
}

type Snooze = { until: Date } | { error: string } | null;

function parseSnooze(raw: string, tz: string): Snooze {
  const t = raw.toLowerCase().replace(/^\/(snooze|rimanda|ricorda)(@\w+)?\s*/, "").trim();
  const isSnooze = /^(ricordamelo|ricordami|rimanda|rimandalo|posticipa|tra|fra|alle|ore|\d)/.test(t) ||
    /^\/(snooze|rimanda|ricorda)/i.test(raw);
  if (!isSnooze) return null;
  let m = t.match(/(?:tra|fra)\s+(\d{1,4}|un|una|mezz)\s*('?ora|ore|h|minuti|minuto|min|m)?/);
  if (m) {
    const n = m[1] === "un" || m[1] === "una" ? 1 : m[1] === "mezz" ? 30 : Number(m[1]);
    const unit = m[2] ?? (m[1] === "mezz" ? "min" : "min");
    const mins = m[1] === "mezz" ? 30 : /ora|ore|h/.test(unit) ? n * 60 : n;
    if (!mins || mins > 7 * 24 * 60) return { error: "Durata non valida." };
    return { until: new Date(Date.now() + mins * 60000) };
  }
  m = t.match(/(?:alle|ore)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*$/);
  if (m && /alle|ore|[:.]/.test(t)) {
    const h = Number(m[1]), mi = Number(m[2] ?? 0);
    if (h > 23 || mi > 59) return { error: "Orario non valido." };
    const hhmm = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    let until = zonedToUtc(todayIn(tz), hhmm, tz);
    if (until.getTime() <= Date.now()) until = zonedToUtc(todayIn(tz, 1), hhmm, tz);
    return { until };
  }
  return null;
}

type Parsed = { date: string; time: string | null; title: string } | { error: string };

function parseReminder(raw: string, tz: string): Parsed {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  let date = todayIn(tz);
  let time: string | null = null;
  const rest: string[] = [];
  const year = Number(todayIn(tz).slice(0, 4));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase();
    if (rest.length === 0 || i === tokens.length - 1 || /^(alle|ore)$/i.test(tokens[i - 1] ?? "")) {
      // date/time tokens may appear at start, or after "alle"/"ore"
    }
    if (low === "oggi") { date = todayIn(tz); continue; }
    if (low === "domani") { date = todayIn(tz, 1); continue; }
    if (low === "dopodomani") { date = todayIn(tz, 2); continue; }
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) { date = `${m[1]}-${m[2]}-${m[3]}`; continue; }
    m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (m) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year;
      date = `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      continue;
    }
    m = t.match(/^(\d{1,2})[:.](\d{2})$/);
    if (m && Number(m[1]) < 24 && Number(m[2]) < 60) {
      time = `${m[1].padStart(2, "0")}:${m[2]}`;
      if (/^(alle|ore)$/i.test(rest[rest.length - 1] ?? "")) rest.pop();
      continue;
    }
    rest.push(t);
  }
  const title = rest.join(" ").trim();
  if (!title) return { error: "Scrivi anche il testo del promemoria." };
  if (title.length > 300) return { error: "Testo troppo lungo (max 300 caratteri)." };
  if (isNaN(new Date(`${date}T12:00:00Z`).getTime())) return { error: "Data non valida." };
  return { date, time, title };
}

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

  const stripButtons = (chatId: number, messageId?: number | null) =>
    messageId
      ? tg("editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        }).catch(() => {})
      : Promise.resolve();

  // Apply an answer to a task; returns confirmation text or null if not found.
  async function applyAnswer(
    taskId: string,
    ownerId: string,
    chatId: number,
    verb: "done" | "todo" | "del",
  ): Promise<string | null> {
    const { data: task } = await supabase
      .from("daily_tasks")
      .select("id, title")
      .eq("id", taskId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!task) return null;

    // close all open prompts for this task and remove their buttons
    const { data: prompts } = await supabase
      .from("telegram_prompts")
      .select("id, message_id")
      .eq("task_id", taskId)
      .eq("answered", false);
    for (const p of prompts ?? []) await stripButtons(chatId, p.message_id);
    await supabase.from("telegram_prompts").update({ answered: true }).eq("task_id", taskId);

    const title = escapeHtml(task.title);
    if (verb === "del") {
      await supabase.from("daily_tasks").delete().eq("id", taskId);
      return `🗑️ <b>${title}</b> eliminata.`;
    }
    if (verb === "done") {
      await supabase
        .from("daily_tasks")
        .update({ completed: true, completed_at: new Date().toISOString(), snoozed_until: null })
        .eq("id", taskId);
      return `✅ <b>${title}</b> segnata come completata.`;
    }
    await supabase
      .from("daily_tasks")
      .update({
        completed: false,
        completed_at: null,
        snoozed_until: new Date(Date.now() + SNOOZE_MS).toISOString(),
      })
      .eq("id", taskId);
    return `❌ <b>${title}</b> resta da completare. Te la ricordo tra 10 minuti ⏳`;
  }

  try {
    const update = await req.json();
    if (typeof update?.update_id !== "number") return ok();

    const { error: dupErr } = await supabase
      .from("telegram_updates")
      .insert({ update_id: update.update_id });
    if (dupErr) return ok();

    const cb = update.callback_query;
    const msg = update.message ?? update.edited_message;

    // ---- inline button answers -------------------------------------------
    if (cb) {
      const chatId = cb.message?.chat?.id;
      const [verb, taskId] = String(cb.data ?? "").split(":");
      // Always remove the buttons from the pressed message
      if (chatId) await stripButtons(chatId, cb.message?.message_id);
      if (chatId && taskId && (verb === "done" || verb === "todo" || verb === "del")) {
        const { data: owner } = await supabase
          .from("task_owners")
          .select("id")
          .eq("telegram_chat_id", chatId)
          .maybeSingle();
        const reply = owner ? await applyAnswer(taskId, owner.id, chatId, verb) : null;
        await tg("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: reply ? "Fatto" : "Promemoria non più disponibile",
        });
        if (reply) await tg("sendMessage", { chat_id: chatId, text: reply, parse_mode: "HTML" });
        return ok();
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
            .update({ telegram_chat_id: chatId, telegram_username: msg?.from?.username ?? null })
            .eq("id", owner.id);
          await tg("sendMessage", {
            chat_id: chatId,
            text: "🔗 <b>Collegamento riuscito!</b>\n\n" + HELP,
            parse_mode: "HTML",
          });
          return ok();
        }
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text: "👋 Ciao! Per collegarti, apri le tue attività nell'app e premi <b>Collega Telegram</b>.",
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
    const tz = owner.timezone ?? "Europe/Rome";

    // ---- /promemoria ------------------------------------------------------
    const addMatch = text.match(/^\/(promemoria|task|nuovo|add|reminder)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
    if (addMatch) {
      const args = (addMatch[2] ?? "").trim();
      if (!args) {
        await tg("sendMessage", { chat_id: chatId, text: HELP, parse_mode: "HTML" });
        return ok();
      }
      const parsed = parseReminder(args, tz);
      if ("error" in parsed) {
        await tg("sendMessage", { chat_id: chatId, text: `⚠️ ${parsed.error}\n\n${HELP}`, parse_mode: "HTML" });
        return ok();
      }
      const { error } = await supabase.from("daily_tasks").insert({
        owner_id: owner.id,
        task_date: parsed.date,
        title: parsed.title,
        due_time: parsed.time,
      });
      if (error) {
        console.error("insert task failed", error);
        await tg("sendMessage", { chat_id: chatId, text: "⚠️ Non sono riuscito a salvare il promemoria, riprova." });
        return ok();
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `📌 Promemoria aggiunto\n\n<b>${escapeHtml(parsed.title)}</b>\n🗓️ ${escapeHtml(labelFor(parsed.date))}` +
          (parsed.time ? `\n⏰ ore ${parsed.time} — ti scrivo a quell'ora` : "\n(senza orario: nessun avviso automatico)"),
        parse_mode: "HTML",
      });
      return ok();
    }

    // ---- /oggi ------------------------------------------------------------
    if (/^\/(oggi|today|recap)/i.test(text)) {
      const date = todayIn(tz);
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

    // ---- "ricordamelo tra X minuti" / "alle HH:MM" ------------------------
    const snooze = parseSnooze(text, tz);
    if (snooze) {
      let taskId: string | null = null;
      const { data: prompt } = await supabase
        .from("telegram_prompts")
        .select("task_id")
        .eq("chat_id", chatId)
        .eq("answered", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      taskId = prompt?.task_id ?? null;
      if (!taskId) {
        const { data: last } = await supabase
          .from("daily_tasks")
          .select("id")
          .eq("owner_id", owner.id)
          .eq("completed", false)
          .not("reminded_at", "is", null)
          .order("reminded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        taskId = last?.id ?? null;
      }
      let reply = "Non ho promemoria a cui riferire questa richiesta.";
      if ("error" in snooze) reply = `⚠️ ${snooze.error}`;
      else if (taskId) {
        const { data: task } = await supabase
          .from("daily_tasks")
          .select("id, title")
          .eq("id", taskId)
          .eq("owner_id", owner.id)
          .maybeSingle();
        if (task) {
          const { data: prompts } = await supabase
            .from("telegram_prompts")
            .select("id, message_id")
            .eq("task_id", taskId)
            .eq("answered", false);
          for (const p of prompts ?? []) await stripButtons(chatId, p.message_id);
          await supabase.from("telegram_prompts").update({ answered: true }).eq("task_id", taskId);
          await supabase
            .from("daily_tasks")
            .update({ completed: false, completed_at: null, snoozed_until: snooze.until.toISOString() })
            .eq("id", taskId);
          const hhmm = new Intl.DateTimeFormat("it-IT", {
            timeZone: tz, hour: "2-digit", minute: "2-digit",
          }).format(snooze.until);
          reply = `⏰ Ok! Ti ricordo <b>${escapeHtml(task.title)}</b> alle ${hhmm}.`;
        }
      }
      await tg("sendMessage", { chat_id: chatId, text: reply, parse_mode: "HTML" });
      return ok();
    }

    // ---- plain yes / no / delete reply to last prompt ---------------------
    const verb = YES.test(text) ? "done" : NO.test(text) ? "todo" : DEL.test(text) ? "del" : null;
    if (verb) {
      const { data: prompt } = await supabase
        .from("telegram_prompts")
        .select("id, task_id")
        .eq("chat_id", chatId)
        .eq("answered", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const reply = prompt ? await applyAnswer(prompt.task_id, owner.id, chatId, verb) : null;
      await tg("sendMessage", {
        chat_id: chatId,
        text: reply ?? "Non ho promemoria in sospeso a cui riferire questa risposta.",
        parse_mode: "HTML",
      });
      return ok();
    }

    await tg("sendMessage", { chat_id: chatId, text: HELP, parse_mode: "HTML" });
    return ok();
  } catch (e) {
    console.error("telegram-webhook error", e);
    return ok();
  }
});
