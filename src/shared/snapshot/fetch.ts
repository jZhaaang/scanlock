import type { Snapshot } from "../schema.ts";
import type { RawAsset, RawHero } from "./raw.ts";
import { transform } from "./transform.ts";

const BASE = "https://api.deadlock-api.com/v1/assets";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Latest build as seen by the API */
export async function latestBuild(): Promise<number> {
  const versions = await get<number[]>("/client-versions");
  const build = versions.at(-1);
  if (build === undefined) throw new Error("client-versions was empty");
  return build;
}

/** Gets assets, transforms to compact snapshot */
export async function buildSnapshot(build: number): Promise<Snapshot> {
  const query = `?language=english&client_version=${build}`;
  const [items, heroes] = await Promise.all([
    get<RawAsset[]>(`/items${query}`),
    get<RawHero[]>(`/heroes${query}`),
  ]);

  return transform(items, heroes, {
    build,
    syncedAt: new Date().toISOString(),
  });
}
