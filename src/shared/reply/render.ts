import type { Entry, Section, SnapshotMeta, Stat } from "../schema.ts";

const WIKI = "https://deadlock.wiki/";

/**
 * Reddit needs two trailing spaces to break a line and an indent to stay inside the list item.
 * A blank line would end a bullet list
 */
const BREAK = "  \n  ";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function link(name: string): string {
  return `[${name}](${WIKI}${encodeURI(name.replace(/ /g, "_"))})`;
}

/**
 * Scaling multiplier beside a value, superscripted beside the original value.
 */
function badge(stat: Stat): string {
  if (!stat.scale) return "";
  const factor = Number(stat.scale.factor.toFixed(4));
  const sign = factor < 0 ? "" : "+";
  return ` ^(${sign}${factor}×${stat.scale.source})`;
}

/**
 * "**+17%** Bullet Resists, **35m** Radius", introducing a heading whever the game groups the numbers
 * that follow it: "Cost of Stay: **75** Damage"
 */
function statLine(stats: Stat[]): string {
  // ungrouped first
  const ordered = [
    ...stats.filter((s) => !s.group),
    ...stats.filter((s) => s.group),
  ];

  const parts: string[] = [];
  let group: string | undefined;

  for (const stat of ordered) {
    const text = `**${stat.value}**${badge(stat)} ${stat.label}`;
    if (stat.group === group) {
      parts.push(text);
      continue;
    }
    group = stat.group;
    // headings are inconsistent about carrying their own colon
    parts.push(group ? `*${group.replace(/:$/, "")}:* ${text}` : text);
  }

  return parts.join(", ");
}

/** Upgrades read as one line, so the source's own breaks become separators */
function inline(text: string): string {
  return text
    .split("\n")
    .reduce((a, b) => (/[.!?]$/.test(a) ? `${a} ${b}` : `${a}, ${b}`));
}

function header(entry: Entry): string {
  if (entry.kind === "ability") {
    const hero = entry.hero ? ` ${entry.hero} ${entry.abilitySlot}` : "";
    return `${link(entry.name)} | **[Ability]**${hero}`;
  }

  const slot = entry.slot ? `${capitalize(entry.slot)} Item` : "Item";
  const cost = entry.legendary
    ? "Street Brawl Legendary"
    : `Tier ${entry.tier}, ${entry.cost} Souls`;
  return `${link(entry.name)} | **[${slot}]** ${cost}`;
}

/**
 * A labelled section (passive, active) leads with its kind, and its cooldown moves up beside it
 */
function renderSection(section: Section): string[] {
  const kind = section.kind === "innate" ? undefined : section.kind;

  const cooldown = kind
    ? section.stats.find((s) => s.label === "Cooldown")
    : undefined;
  const stats = cooldown
    ? section.stats.filter((s) => s !== cooldown)
    : section.stats;

  const label = kind
    ? `**[${capitalize(kind)}${cooldown ? ` (${cooldown.value})` : ""}]** `
    : "";

  const lines: string[] = [];
  if (label || section.desc) lines.push(`${label}${section.desc ?? ""}`.trim());
  if (stats.length) lines.push(statLine(stats));
  return lines;
}

function renderUpgrades(entry: Entry): string {
  return (entry.upgrades ?? [])
    .map((upgrade) => {
      const body =
        upgrade.text ??
        (upgrade.changes ?? []).map((c) => `${c.value} ${c.label}`).join(", ");
      return `**[Tier ${upgrade.tier}]** ${inline(body)}`;
    })
    .join(" ");
}

/** Render one bullet per entry */
export function renderEntry(entry: Entry): string {
  const lines = [header(entry)];

  for (const section of entry.sections) lines.push(...renderSection(section));

  const upgrades = renderUpgrades(entry);
  if (upgrades) lines.push(upgrades);

  const flat = lines.flatMap((line) => line.split("\n")).filter(Boolean);
  return `- ${flat.join(BREAK)}`;
}

/**
 * The whole comment. Includes build number in footer
 */
export function renderReply(entries: Entry[], meta: SnapshotMeta): string {
  const bullets = entries.map(renderEntry).join("\n");
  const contact =
    "https://www.reddit.com/message/compose/?to=-porkdumpling&subject=Scanlock%20Inquiry";
  const footer = `^(Call me with up to 5 [[ name ]]) ^| ^(Deadlock build ${meta.build}, as of ${meta.syncedAt.slice(0, 10)}) ^| ^(data from deadlock-api.com) ^| ^([Questions?](${contact}))`;

  return `${bullets}\n\n---\n\n${footer}`;
}
