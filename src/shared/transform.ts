import { sanitize } from "./markup.ts";
import { loosen, normalize } from "./normalize.ts";
import type { RawAbility, RawAsset, RawHero, RawShopItem } from "./raw.ts";
import type {
  Entry,
  EntryKind,
  NameIndex,
  Snapshot,
  Upgrade,
} from "./schema.ts";
import { changesFor, sectionsFor } from "./stats.ts";

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

/** Use the ability upgrade tier's own text when the game ships one, otherwise list what changed */
function upgradesFor(raw: RawAbility): Upgrade[] {
  const out: Upgrade[] = [];

  for (const [i, upgrade] of (raw.upgrades ?? []).entries()) {
    const tier = i + 1;

    const text = sanitize(raw.description?.[`t${tier}_desc`]);
    if (text) {
      out.push({ tier, text });
      continue;
    }

    // doesn't ship with text
    const changes = changesFor(raw, upgrade.property_upgrades ?? []);
    if (changes.length) out.push({ tier, changes });
  }

  return out;
}

/** The fields every entry has, whatever the kind (item/ability) */
function baseEntry(raw: RawAsset, kind: EntryKind): Entry {
  return {
    id: raw.class_name,
    kind,
    name: raw.name,
    sections: sectionsFor(raw),
  };
}

export function transform(
  items: RawAsset[],
  heroes: RawHero[],
  meta: TransformMeta,
): Snapshot {
  const shopItems = items.filter(
    (i): i is RawShopItem =>
      i.type === "upgrade" &&
      i.shopable === true &&
      i.disabled !== true &&
      isNamed(i),
  );

  const liveHeroes = heroes.filter(
    (h) => h.player_selectable === true && h.disabled !== true,
  );

  // map: ability class_name -> hero that owns it, which slot
  const owner = new Map<string, { hero: string; slot: number }>();
  for (const hero of liveHeroes) {
    ABILITIES.forEach((ability, slot) => {
      const className = hero.items?.[ability];
      if (className) owner.set(className, { hero: hero.name, slot: slot + 1 });
    });
  }

  const abilities = items.filter(
    (i): i is RawAbility =>
      i.type === "ability" && owner.has(i.class_name) && isNamed(i),
  );

  const entries: Record<string, Entry> = {};

  for (const raw of shopItems) {
    entries[raw.class_name] = {
      ...baseEntry(raw, "item"),
      cost: raw.cost,
      tier: raw.item_tier,
      slot: raw.item_slot_type,
      activation: raw.activation,
      components: raw.component_items,
      legendary: raw.item_tier === 5 || undefined,
    };
  }

  for (const raw of abilities) {
    const own = owner.get(raw.class_name);
    const upgrades = upgradesFor(raw);
    entries[raw.class_name] = {
      ...baseEntry(raw, "ability"),
      hero: own?.hero,
      abilitySlot: own?.slot,
      upgrades: upgrades.length ? upgrades : undefined,
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
    meta: { build: meta.build, syncedAt: meta.syncedAt, source: "hosted-api" },
    entries,
    index,
  };
}
