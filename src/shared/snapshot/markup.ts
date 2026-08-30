const SVG = /<svg[\s\S]*?<\/svg>/gi;
const TAG = /<(\/?)\s*([a-zA-Z][\w-]*)((?:"[^"]*"|[^>"])*)>/g;

/**
 * Stand-ins for things that have to survive the whitespace collapsing.
 * Can't be confused with a line break or asterisk the description itself
 * contains.
 */
const NEWLINE = "\uE000";
const BOLD = "\uE001";
const ITALIC = "\uE002";
const STAND_IN = /[\uE000-\uE002]/g;

/** Which of the client's span classes asks for which emphasis */
const STYLES: [RegExp, string][] = [
  [/class="[^"]*\bhighlight/i, BOLD],
  [/class="[^"]*\binline-attribute-label/i, BOLD],
  [/class="[^"]*\bdiminish/i, ITALIC],
];

/** What each stand-in becomes once the text has settled */
const MARKDOWN: [string, string][] = [
  [BOLD, "**"],
  [ITALIC, "*"],
];

const PLACEHOLDER = /\{s:\w+\}/g;
const ENTITY = /&(#\d+|#x[0-9a-f]+|\w+);/gi;

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
 * Swap each pair of stand-ins for the asterisks it stood for.
 * Reddit drops formatting that spans a line, so wrap each line.
 */
function emphasize(text: string): string {
  let out = text;

  for (const [standIn, asterisks] of MARKDOWN) {
    const pair = new RegExp(`${standIn}([^${standIn}]*)${standIn}`, "g");

    out = out.replace(pair, (_whole, body: string) =>
      body
        .split("\n")
        .map((line) => {
          const core = line.trim();
          if (!core) return line;
          const lead = line.slice(0, line.length - line.trimStart().length);
          const tail = line.slice(line.trimEnd().length);
          return `${lead}${asterisks}${core}${asterisks}${tail}`;
        })
        .join("\n"),
    );
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
  let open = "";
  let cursor = 0;

  for (const match of src.matchAll(TAG)) {
    out += src.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    if (match[2]?.toLowerCase() === "br") {
      out += NEWLINE;
    } else if (match[1] === "/") {
      // Valve ships unclosed <span>s and typos like </spawn>
      // any closing tag ends an open emphasis rather than only a matching tag
      if (open) {
        out += open;
        open = "";
      }
    } else if (!open) {
      const mark = STYLES.find(([re]) => re.test(match[3] ?? ""))?.[1];
      if (mark) {
        out += mark;
        open = mark;
      }
    }
  }

  out += src.slice(cursor);
  if (open) out += open;

  const text = decode(out).replace(PLACEHOLDER, (token) => {
    onPlaceholder(token);
    return "";
  });

  return emphasize(
    text
      .replace(/\s+/g, " ")
      .replace(NEWLINE_RUN, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  )
    .replace(STAND_IN, "")
    .replace(SPACE_RUN, " ")
    .replace(AROUND_NEWLINE, "\n")
    .trim();
}
