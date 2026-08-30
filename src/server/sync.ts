import { redis } from "@devvit/web/server";
import { buildSnapshot, latestBuild } from "../shared/snapshot/fetch.ts";
import { readCurrent, writeSnapshot } from "./store.ts";

const LOCK = "snapshot:sync";
const LOCK_TTL_MS = 600_000;

/**
 * `set` is typed as returning a string whether or not nx took the key,
 * so read it back to find out who actually holds the lock
 */
async function acquire(token: string): Promise<boolean> {
  await redis.set(LOCK, token, {
    nx: true,
    expiration: new Date(Date.now() + LOCK_TTL_MS),
  });
  return (await redis.get(LOCK)) === token;
}

/**
 * How the snapshot reaches Redis
 * A sync that throws keeps the lock until TTL runs out (10 mins)
 */
export async function sync(): Promise<boolean> {
  const token = `${Date.now()}`;
  if (!(await acquire(token))) {
    console.warn("sync skipped; another run holds the lock");
    return false;
  }

  const build = await latestBuild();
  if (String(build) === (await readCurrent())) {
    await redis.del(LOCK);
    return false;
  }

  console.log(`syncing build ${build}`);
  await writeSnapshot(await buildSnapshot(build));
  await redis.del(LOCK);
  return true;
}
