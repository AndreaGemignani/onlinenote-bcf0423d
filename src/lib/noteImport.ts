export interface ImportedNote {
  title: string;
  contentJSON: unknown;
  createdAt?: number;
  updatedAt?: number;
}

export async function importNoteFromFile(file: File): Promise<ImportedNote> {
  const text = await file.text();

  // JSON file
  if (file.name.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    return {
      title: parsed.title ?? "",
      contentJSON: parsed.contentJSON ?? parsed,
    };
  }

  // HTML file with embedded GemiNote payload
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const payloadEl = doc.getElementById("geminote-doc");
  if (payloadEl?.textContent) {
    try {
      const parsed = JSON.parse(payloadEl.textContent);
      return {
        title: parsed.title ?? "",
        contentJSON: parsed.contentJSON,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      // fall through
    }
  }

  // Fallback: take title + best-effort body text as paragraphs
  const title =
    doc.querySelector("h1.title")?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.replace(/—.*$/, "").trim() ||
    "";
  const bodyText =
    doc.querySelector(".content")?.textContent ??
    doc.body?.textContent ??
    "";
  const paragraphs = bodyText
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));
  return {
    title,
    contentJSON: {
      type: "doc",
      content: paragraphs.length ? paragraphs : [{ type: "paragraph" }],
    },
  };
}