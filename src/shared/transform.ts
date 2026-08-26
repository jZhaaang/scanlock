import { loosen, normalize } from "./normalize.ts";
import type { RawHero, RawItem } from "./raw.ts";
import type { Entry, NameIndex, Snapshot, Stat } from "./schema.ts";

const ABILITIES = [
  "signature1",
  "signature2",
  "signature3",
  "signature4",
] as const;

export type TransformMeta = {
  build: number;
  syncedAt: string;
};

function isNamed(raw: { name: string; class_name: string }): boolean {
  return raw.name !== "" && raw.name !== raw.class_name;
}

function statsFor(_raw: RawItem): Stat[] {
  return [];
}

export function transform(
  items: RawItem[],
  heroes: RawHero[],
  meta: TransformMeta,
): Snapshot {
  const shopItems = items.filter(
    (i) =>
      i.type === "upgrade" &&
      i.shopable === true &&
      i.disabled !== true &&
      isNamed(i),
  );

  const liveHeroes = heroes.filter(
    (h) =>
      h.player_selectable === true &&
      h.disabled !== true &&
      h.in_development !== true,
  );

  const owner = new Map<string, { hero: string; slot: number }>();
  for (const hero of liveHeroes) {
    ABILITIES.forEach((ability, slot) => {
      const className = hero.items?.[ability];
      if (className) owner.set(className, { hero: hero.name, slot: slot + 1 });
    });
  }

  const abilities = items.filter((i) => owner.has(i.class_name) && isNamed(i));

  const entries: Record<string, Entry> = {};

  for (const raw of shopItems) {
    entries[raw.class_name] = {
      id: raw.class_name,
      kind: "item",
      name: raw.name,
      stats: statsFor(raw),
      ...(raw.cost !== undefined ? { cost: raw.cost } : {}),
      ...(raw.item_tier !== undefined ? { tier: raw.item_tier } : {}),
      ...(raw.item_slot_type !== undefined ? { slot: raw.item_slot_type } : {}),
      ...(raw.activation !== undefined ? { activation: raw.activation } : {}),
      ...(raw.component_items !== undefined
        ? { components: raw.component_items }
        : {}),
    };
  }

  for (const raw of abilities) {
    const own = owner.get(raw.class_name);
    entries[raw.class_name] = {
      id: raw.class_name,
      kind: "ability",
      name: raw.name,
      stats: statsFor(raw),
      ...(own ? { hero: own.hero, abilitySlot: own.slot } : {}),
    };
  }

  const index: NameIndex = { exact: {}, loose: {} };
  for (const entry of Object.values(entries)) {
    const exactKey = normalize(entry.name);
    const looseKey = loosen(entry.name);
    index.exact[exactKey] = [...(index.exact[exactKey] ?? []), entry.id];
    index.loose[looseKey] = [...(index.loose[looseKey] ?? []), entry.id];
  }

  return {
    meta: {
      build: meta.build,
      syncedAt: meta.syncedAt,
      source: "hosted-api",
    },
    entries,
    index,
  };
}
