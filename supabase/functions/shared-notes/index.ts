import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/;
const MAX_BYTES = 1_000_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function validContent(c: unknown) {
  return c && typeof c === "object" && JSON.stringify(c).length <= MAX_BYTES;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body ?? {};
    const title = typeof body.title === "string" ? body.title.slice(0, 300) : "";

    if (action === "create") {
      if (!validContent(body.content)) return json({ error: "Contenuto non valido" }, 400);
      const token = randomToken();
      const ownerSecret = randomToken();
      const { data, error } = await supabase.from("shared_notes").insert({
        token_hash: await sha(token),
        owner_secret_hash: await sha(ownerSecret),
        title,
        content_json: body.content,
      }).select("version, updated_at").single();
      if (error) throw error;
      return json({ token, ownerSecret, version: data.version, updatedAt: data.updated_at });
    }

    if (typeof body.token !== "string" || !TOKEN_RE.test(body.token)) {
      return json({ error: "Link non valido" }, 404);
    }
    const tokenHash = await sha(body.token);

    if (action === "get") {
      const { data } = await supabase.from("shared_notes")
        .select("title, content_json, version, updated_at").eq("token_hash", tokenHash).maybeSingle();
      if (!data) return json({ error: "Nota non trovata o condivisione disattivata" }, 404);
      return json({ title: data.title, content: data.content_json, version: data.version, updatedAt: data.updated_at });
    }

    if (action === "update") {
      if (!validContent(body.content)) return json({ error: "Contenuto non valido" }, 400);
      const { data: cur } = await supabase.from("shared_notes")
        .select("id, version").eq("token_hash", tokenHash).maybeSingle();
      if (!cur) return json({ error: "Nota non trovata o condivisione disattivata" }, 404);
      const version = cur.version + 1;
      const { data, error } = await supabase.from("shared_notes")
        .update({ title, content_json: body.content, version, updated_at: new Date().toISOString() })
        .eq("id", cur.id).select("version, updated_at").single();
      if (error) throw error;
      return json({ version: data.version, updatedAt: data.updated_at });
    }

    if (action === "revoke") {
      if (typeof body.ownerSecret !== "string") return json({ error: "Non autorizzato" }, 403);
      const { data } = await supabase.from("shared_notes").delete()
        .eq("token_hash", tokenHash).eq("owner_secret_hash", await sha(body.ownerSecret)).select("id");
      if (!data?.length) return json({ error: "Non autorizzato" }, 403);
      return json({ ok: true });
    }

    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Errore del server" }, 500);
  }
});
