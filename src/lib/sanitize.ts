export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
  return cleaned || "nota";
}