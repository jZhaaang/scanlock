export type EntryKind = "item" | "ability";
export type ItemSlot = "weapon" | "spirit" | "vitality";

export type Stat = {
  label: string;
  value: string;
  prefix?: string;
  postfix?: string;
  elevated: boolean;
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

  // for abilities
  hero?: string;
  abilitySlot?: number;
  upgrades?: { tier: number; text: string }[];

  desc?: string;
  stats: Stat[];
};

export type SnapshotMeta = {
  dataBuild: number;
  liveBuild: number;
  stale: boolean;
  source: "hosted-api";
  generatedAt: string;
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
