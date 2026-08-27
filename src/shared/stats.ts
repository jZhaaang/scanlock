import { sanitize } from "./markup.ts";
import type {
  RawAbility,
  RawAsset,
  RawPropertyUpgrade,
  RawShopItem,
  RawTooltipSection,
} from "./raw.ts";
import type { Section, SectionKind, Stat } from "./schema.ts";

/** Ability header pills */
const HEADER = [
  "AbilityCooldown",
  "AbilityCharges",
  "AbilityCooldownBetweenCharge",
];

/** A property key and whether the game gives it visual weight, we use it for ordering stats */
type Pick = [key: string, elevated: boolean];
/** One section before its keys have been resolved against `properties` */
type Draft = { kind?: SectionKind; desc: string; picks: Pick[] };

/** Determine type for tooltip. Missing `section_type` and descriptive text means it's innate bonuses */
function kindFor(section: RawTooltipSection): SectionKind {
  const type = section.section_type;
  if (type === "innate" || type === "passive" || type === "active") return type;
  const hasText = (section.section_attributes ?? []).some((a) => a.loc_string);
  return hasText ? "passive" : "innate";
}

function itemDrafts(raw: RawShopItem): Draft[] {
  const drafts: Draft[] = [];

  for (const section of raw.tooltip_sections ?? []) {
    const picks: Pick[] = [];
    let desc = "";

    for (const attr of section.section_attributes ?? []) {
      for (const key of attr.elevated_properties ?? []) picks.push([key, true]);
      for (const key of attr.important_properties ?? [])
        picks.push([key, true]);
      for (const key of attr.properties ?? []) picks.push([key, false]);
      if (!desc) desc = sanitize(attr.loc_string);
    }

    drafts.push({ kind: kindFor(section), desc, picks });
  }

  return drafts;
}

function abilityDrafts(raw: RawAbility): Draft[] {
  const drafts: Draft[] = [];

  for (const section of raw.tooltip_details?.info_sections ?? []) {
    const picks: Pick[] = [];

    for (const block of section.properties_block ?? []) {
      for (const prop of block.properties ?? []) {
        if (prop.important_property)
          picks.push([prop.important_property, true]);
      }
    }
    for (const key of section.basic_properties ?? []) picks.push([key, false]);

    drafts.push({ desc: sanitize(section.loc_string), picks });
  }

  return drafts;
}

/**
 * Format a value for printing. Values can be inconsistent:
 *  > values with unit ("4m"), postfixes with padding (" m")
 * Reduces to numeric part then apply sign and unit once.
 * "{s:sign}" asks for an explicit +, but the value may already be negative
 */
function display(value: string, prefix = "", postfix = ""): string {
  const sign =
    prefix === "{s:sign}" ? (value.startsWith("-") ? "" : "+") : prefix;
  const numeric = /^[-+]?[\d.]+/.exec(value)?.[0] ?? value;
  return `${sign}${numeric}${postfix.trim()}`;
}

function toStat(raw: RawAsset, key: string, elevated: boolean): Stat | null {
  const prop = raw.properties?.[key];
  if (!prop?.label || prop.value === undefined) return null;

  // 0 means it's granted by a later upgrade
  // < 0 is usually for the 'charges' in the header, also granted more by an upgrade
  // in both cases, hide stat
  const value = String(prop.value);
  const numeric = Number.parseFloat(value);
  if (numeric === 0) return null;
  if (numeric < 0 && HEADER.includes(key)) return null;

  return {
    label: prop.label,
    value: display(value, prop.prefix, prop.postfix),
    elevated,
  };
}

export function sectionsFor(raw: RawAsset): Section[] {
  const drafts = raw.type === "ability" ? abilityDrafts(raw) : itemDrafts(raw);

  if (raw.type === "ability") {
    if (drafts.length === 0) drafts.push({ desc: "", picks: [] });
    const first = drafts[0];
    if (first) {
      first.picks.unshift(...HEADER.map((key): Pick => [key, false]));
    }
  }

  // Leech and Golden Goose Egg carry their only description here
  if (!drafts.some((d) => d.desc)) {
    const fallback = sanitize(raw.description?.desc);
    const first = drafts[0];
    if (fallback && first) first.desc = fallback;
  }

  const sections: Section[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    const stats: Stat[] = [];

    for (const [key, elevated] of draft.picks) {
      if (seen.has(key)) continue;
      seen.add(key);
      const stat = toStat(raw, key, elevated);
      if (stat) stats.push(stat);
    }

    if (stats.length === 0 && !draft.desc) continue;

    const section: Section = { stats };
    if (draft.kind) section.kind = draft.kind;
    if (draft.desc) section.desc = draft.desc;
    sections.push(section);
  }

  return sections;
}

/** Render an ability's upgrades, for when they don't come with text */
export function changesFor(
  raw: RawAbility,
  upgrades: RawPropertyUpgrade[],
): Stat[] {
  const stats: Stat[] = [];

  for (const upgrade of upgrades) {
    const prop = raw.properties?.[upgrade.name];
    if (!prop?.label) continue;

    stats.push({
      label: prop.label,
      value: display(String(upgrade.bonus), "{s:sign}", prop.postfix),
      elevated: false,
    });
  }

  return stats;
}
