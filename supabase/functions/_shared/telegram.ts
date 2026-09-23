const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

function api(method: string) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return `https://api.telegram.org/bot${TOKEN}/${method}`;
}

export async function tg<T = unknown>(method: string, payload: unknown): Promise<T> {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Telegram ${method} failed [${res.status}]: ${text}`);
    throw new Error(`[${res.status}]: ${text}`);
  }
  const json = JSON.parse(text);
  if (json.ok === false) {
    console.error(`Telegram ${method} returned error: ${text}`);
    throw new Error(`[telegram]: ${json.description ?? text}`);
  }
  return json.result as T;
}

export async function getBotUsername(): Promise<string | null> {
  try {
    const me = await tg<{ username: string }>("getMe", {});
    return me?.username ?? null;
  } catch (e) {
    console.error("getMe failed", e);
    return null;
  }
}

export async function webhookSecret(): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${TOKEN}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface TaskRow {
  id: string;
  title: string;
  due_time: string | null;
  completed: boolean;
}

export function formatRecap(dateLabel: string, tasks: TaskRow[]): string {
  if (tasks.length === 0) {
    return `📅 <b>${escapeHtml(dateLabel)}</b>\n\nNessuna attività per questo giorno.`;
  }
  const lines = tasks.map((t) => {
    const icon = t.completed ? "✅" : "❌";
    const time = t.due_time ? ` <i>(${t.due_time.slice(0, 5)})</i>` : "";
    return `${icon} ${escapeHtml(t.title)}${time}`;
  });
  const done = tasks.filter((t) => t.completed).length;
  const left = tasks.length - done;
  return [
    `📅 <b>${escapeHtml(dateLabel)}</b>`,
    "",
    ...lines,
    "",
    left === 0
      ? `🎉 Tutto completato (${done}/${tasks.length})`
      : `Rimanenti: <b>${left}</b> su ${tasks.length}`,
  ].join("\n");
}
