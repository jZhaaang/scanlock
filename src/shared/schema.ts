export type EntryKind = "item" | "ability";
export type ItemSlot = "weapon" | "spirit" | "vitality";
export type SectionKind = "innate" | "passive" | "active";

export type Stat = {
  label: string;
  value: string;
  elevated: boolean;
};

export type Section = {
  kind?: SectionKind;
  desc?: string;
  stats: Stat[];
};

export type Entry = {
  id: string;
  kind: EntryKind;
  name: string;

  // for items
  cost?: number;
  tier?: number;
  slot?: ItemSlot;
  activation?: string;
  components?: string[];
  legendary?: boolean;

  // for abilities
  hero?: string;
  abilitySlot?: number;
  upgrades?: Upgrade[];

  sections: Section[];
};

export type Upgrade = {
  /** 1-3, abilities only */
  tier: number;
  text?: string;
  changes?: Stat[];
};

export type SnapshotMeta = {
  build: number;
  syncedAt: string;
  source: "deadlock-api";
};

export type NameIndex = {
  exact: Record<string, string[]>;
  loose: Record<string, string[]>;
};

export type Snapshot = {
  meta: SnapshotMeta;
  entries: Record<string, Entry>;
  index: NameIndex;
};
