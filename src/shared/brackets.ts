export const MAX_LOOKUPS = 5;

const BRACKET = /\[\[([^[\]]*)\]\]/g;
const ESCAPED = /\\([^a-zA-Z0-9\s])/g;

function unescapeMarkdown(body: string): string {
  return body.replace(ESCAPED, "$1");
}

export function extractTokens(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of unescapeMarkdown(body).matchAll(BRACKET)) {
    const name = (match[1] ?? "").trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_LOOKUPS) break;
  }
  return out;
}
