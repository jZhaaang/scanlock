import { mkdir, writeFile } from "node:fs/promises";
import type { RawAsset, RawHero } from "../shared/raw.ts";
import { transform } from "../shared/transform.ts";

const BASE = "https://api.deadlock-api.com/v1/assets";
const OUT = "data/snapshot.json";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

const versions = await get<number[]>("/client-versions");
const build = versions.at(-1);
if (build === undefined) throw new Error("client-versions was empty");

const query = `?language=english&client_version=${build}`;

const [items, heroes] = await Promise.all([
  get<RawAsset[]>(`/items${query}`),
  get<RawHero[]>(`/heroes${query}`),
]);

const snapshot = transform(items, heroes, {
  build,
  syncedAt: new Date().toISOString(),
});

await mkdir("data", { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot, null, 2));

const kinds: Record<string, number> = {};
for (const entry of Object.values(snapshot.entries)) {
  kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
}

console.log(`build ${build} -> ${OUT}`);
console.log(`entries=${Object.keys(snapshot.entries).length}`, kinds);
console.log(
  `index ${Object.keys(snapshot.index.exact).length} exact, ${Object.keys(snapshot.index.loose).length} loose`,
);
for (const [key, ids] of Object.entries(snapshot.index.exact)) {
  if (ids.length > 1) console.warn(`collision: ${key} -> ${ids.join(", ")}`);
}
