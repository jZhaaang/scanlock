import { mkdir, writeFile } from "node:fs/promises";
import { buildSnapshot, latestBuild } from "../shared/snapshot/fetch.ts";

const OUT = "data/snapshot.json";

const snapshot = await buildSnapshot(await latestBuild());

await mkdir("data", { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot, null, 2));

const kinds: Record<string, number> = {};
for (const entry of Object.values(snapshot.entries)) {
  kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
}

console.log(`build ${snapshot.meta.build} -> ${OUT}`);
console.log(`entries=${Object.keys(snapshot.entries).length}`, kinds);
console.log(
  `index ${Object.keys(snapshot.index.exact).length} exact, ${Object.keys(snapshot.index.loose).length} loose`,
);
for (const [key, ids] of Object.entries(snapshot.index.exact)) {
  if (ids.length > 1) console.warn(`collision: ${key} -> ${ids.join(", ")}`);
}
