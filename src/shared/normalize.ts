export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['\u2018\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function loosen(name: string): string {
  return normalize(name)
    .replace(/\band\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}
