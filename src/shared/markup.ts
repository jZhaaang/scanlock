const SVG = /<svg[\s\S]*?<\/svg>/gi;
const BREAK = /<br\s*\/?>/gi;
const TAG = /<[^>]+>/g;

/** Strip the client's presentation markup to plain text */
export function sanitize(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(SVG, "")
    .replace(BREAK, " ")
    .replace(TAG, "")
    .replace(/\s+/g, " ")
    .trim();
}
