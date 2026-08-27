const SVG = /<svg[\s\S]*?<\/svg>/gi;
const TAG = /<(\/?)\s*([a-zA-Z][\w-]*)((?:"[^"]*"|[^>"])*)>/g;
const HIGHLIGHT = /class="highlight[\w-]*"/i;
const PLACEHOLDER = /\{s:\w+\}/g;
const ENTITY = /&(#\d+|#x[0-9a-f]+|\w+);/gi;

/** Stands in for <br> while every other whitespace run is collapsed */
const NEWLINE = "\uE000";
const NEWLINE_RUN = /[^\S\n]*\uE000[^\S\n]*/g;
const SPACE_RUN = /[^\S\n]{2,}/g;
const AROUND_NEWLINE = /[^\S\n]*\n[^\S\n]*/g;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string): string {
  return text.replace(ENTITY, (whole, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * Markers arrive balanced from the walk, so odd segments are the emphasised
 * ones. Whitespace has to sit outside them or Reddit prints the asterisks.
 */
function tightenEmphasis(text: string): string {
  const parts = text.split("**");
  let out = "";

  for (const [i, part] of parts.entries()) {
    if (i % 2 === 0) {
      out += part;
      continue;
    }
    const lead = /^\s*/.exec(part)?.[0] ?? "";
    const tail = /\s*$/.exec(part)?.[0] ?? "";
    const core = part.slice(lead.length, part.length - tail.length);
    out += core ? `${lead}**${core}**${tail}` : lead + tail;
  }

  return out;
}

/** Strip the client's presentation markup to plain text */
export function sanitize(
  html: string | undefined,
  onPlaceholder: (token: string) => void = () => {},
): string {
  if (!html) return "";

  const src = html.replace(SVG, "");
  let out = "";
  let bold = false;
  let cursor = 0;

  for (const match of src.matchAll(TAG)) {
    out += src.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    if (match[2]?.toLowerCase() === "br") {
      out += NEWLINE;
    } else if (match[1] === "/") {
      // Valve ships unclosed <span>s and typos like </spawn>
      // any closing tag ends an open emphasis rather than only a matching tag
      if (bold) {
        out += "**";
        bold = false;
      }
    } else if (!bold && HIGHLIGHT.test(match[3] ?? "")) {
      out += "**";
      bold = true;
    }
  }

  out += src.slice(cursor);
  if (bold) out += "**";

  const text = decode(out).replace(PLACEHOLDER, (token) => {
    onPlaceholder(token);
    return "";
  });

  return tightenEmphasis(
    text
      .replace(/\s+/g, " ")
      .replace(NEWLINE_RUN, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  )
    .replace(SPACE_RUN, " ")
    .replace(AROUND_NEWLINE, "\n")
    .trim();
}
