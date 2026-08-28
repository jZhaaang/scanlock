import { redis } from "@devvit/web/server";
import type {
  Entry,
  NameIndex,
  Snapshot,
  SnapshotMeta,
} from "../shared/schema.ts";

/** Redis cannot enumerate keys, so every read starts from this pointer */
const CURRENT = "snapshot:current";

const metaKey = (build: number) => `snapshot:${build}:meta`;
const indexKey = (build: number) => `snapshot:${build}:index`;
const entriesKey = (build: number) => `snapshot:${build}:entries`;

/** What every lookup needs before it can resolve a token */
export type Head = { meta: SnapshotMeta; index: NameIndex };

export async function readCurrent(): Promise<string | undefined> {
  return redis.get(CURRENT);
}

/**
 * A sync writes a build under its own keys and flips the pointer last, so the build named
 * here is always complete
 */
export async function readHead(): Promise<Head | undefined> {
  const current = await readCurrent();
  if (!current) return undefined;

  const build = Number(current);
  const [meta, index] = await Promise.all([
    redis.get(metaKey(build)),
    redis.get(indexKey(build)),
  ]);
  if (!meta || !index) return undefined;

  return {
    meta: JSON.parse(meta) as SnapshotMeta,
    index: JSON.parse(index) as NameIndex,
  };
}

export async function readEntries(
  build: number,
  ids: string[],
): Promise<Entry[]> {
  const key = entriesKey(build);
  const raw = await Promise.all(ids.map((id) => redis.hGet(key, id)));
  return raw.filter((v) => v !== undefined).map((v) => JSON.parse(v) as Entry);
}

/** One hSet carries the whole hash */
function entryFields(snapshot: Snapshot): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [id, entry] of Object.entries(snapshot.entries)) {
    fields[id] = JSON.stringify(entry);
  }
  return fields;
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  const { build } = snapshot.meta;
  const previous = await readCurrent();

  await redis.set(metaKey(build), JSON.stringify(snapshot.meta));
  await redis.set(indexKey(build), JSON.stringify(snapshot.index));
  await redis.hSet(entriesKey(build), entryFields(snapshot));

  // update current build
  await redis.set(CURRENT, String(build));

  if (previous && previous !== String(build)) {
    const old = Number(previous);
    await redis.del(metaKey(old), indexKey(old), entriesKey(old));
  }
}
