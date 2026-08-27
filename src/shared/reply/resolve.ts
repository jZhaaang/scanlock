import { loosen, normalize } from "../normalize.ts";
import type { NameIndex } from "../schema.ts";

/** Which stage matched, or that none did */
export type MatchKind = "exact" | "loose" | "none";

export type Resolution = {
  token: string;
  ids: string[];
  via: MatchKind;
};

/**
 * The index is a plain object, so a token like "constructor" would otherwise
 * find something on Object.prototype instead of missing
 */
function lookup(
  table: Record<string, string[]>,
  key: string,
): string[] | undefined {
  if (!Object.hasOwn(table, key)) return undefined;
  const ids = table[key];
  return ids?.length ? ids : undefined;
}

/**
 * Look one bracketed token up in the name index, stopping at the first instance it hits.
 * Takes index alone so the handler can fetch the entries it needs.
 */
export function resolve(token: string, index: NameIndex): Resolution {
  const exact = lookup(index.exact, normalize(token));
  if (exact) return { token, ids: exact, via: "exact" };

  const loose = lookup(index.loose, loosen(token));
  if (loose) return { token, ids: loose, via: "loose" };

  return { token, ids: [], via: "none" };
}

/**
 * Resolve all tokens in a comment/text post. extractTokens dedupes the text people
 * type but two spellings of one name still survive, so drop repeats once they have
 * landed on the same entry
 */
export function resolveAll(tokens: string[], index: NameIndex): Resolution[] {
  const out: Resolution[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const found = resolve(token, index);
    const key = found.ids[0] ?? `miss:${normalize(token)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(found);
  }

  return out;
}
