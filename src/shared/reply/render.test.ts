import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Entry, Section, SnapshotMeta } from "../schema.ts";
import { renderEntry, renderReply } from "./render.ts";

const META: SnapshotMeta = {
  build: 6684,
  syncedAt: "2026-01-01T00:00:00.000Z",
  source: "deadlock-api",
};

function item(over: Partial<Entry> = {}): Entry {
  return {
    id: "upgrade_test",
    kind: "item",
    name: "Test Item",
    cost: 800,
    tier: 1,
    slot: "weapon",
    sections: [],
    ...over,
  };
}

function ability(over: Partial<Entry> = {}): Entry {
  return {
    id: "ability_test",
    kind: "ability",
    name: "Test Ability",
    hero: "Test Hero",
    abilitySlot: 2,
    sections: [],
    ...over,
  };
}

function section(over: Partial<Section> = {}): Section {
  return { stats: [], ...over };
}

const stat = (label: string, value: string, over = {}) => ({
  label,
  value,
  elevated: false,
  ...over,
});

/** The bullet's lines, with the list marker and indent stripped */
function lines(entry: Entry): string[] {
  return renderEntry(entry)
    .split("\n")
    .map((l) => l.replace(/^- |^ {2}/, "").trimEnd());
}

describe("header", () => {
  it("names an item with its slot, tier, and cost", () => {
    assert.equal(
      lines(item({ name: "Monster Rounds", cost: 800, tier: 1 }))[0],
      "[Monster Rounds](https://deadlock.wiki/Monster_Rounds) | **[Weapon Item]** Tier 1, 800 Souls",
    );
  });

  it("links a multi-word name with underscores", () => {
    assert.match(
      lines(item({ name: "Heroic Aura" }))[0] ?? "",
      /Heroic_Aura\)/,
    );
  });

  it("escapes a name that is not url safe", () => {
    assert.match(lines(item({ name: "Mo & Krill" }))[0] ?? "", /Mo_&_Krill\)/);
  });

  it("says street brawl instead of a price for a legendary", () => {
    const head = lines(item({ tier: 5, cost: 9999, legendary: true }))[0] ?? "";
    assert.match(head, /\*\*\[Weapon Item\]\*\* Street Brawl Legendary$/);
  });

  it("names an ability with its hero and slot", () => {
    assert.equal(
      lines(
        ability({ name: "Hotel Guest", hero: "The Doorman", abilitySlot: 4 }),
      )[0],
      "[Hotel Guest](https://deadlock.wiki/Hotel_Guest) | **[Ability]** The Doorman 4",
    );
  });
});

describe("sections", () => {
  it("prints innate stats without a label", () => {
    const entry = item({
      sections: [
        section({ kind: "innate", stats: [stat("Sprint Speed", "+1.5")] }),
      ],
    });
    assert.deepEqual(lines(entry).slice(1), ["**+1.5** Sprint Speed"]);
  });

  it("labels a passive and keeps its description", () => {
    const entry = item({
      sections: [
        section({
          kind: "passive",
          desc: "Provides **Bullet Resist** nearby.",
          stats: [stat("Bullet Resist", "+17%")],
        }),
      ],
    });
    assert.deepEqual(lines(entry).slice(1), [
      "**[Passive]** Provides **Bullet Resist** nearby.",
      "**+17%** Bullet Resist",
    ]);
  });

  it("lifts an active's cooldown into its label", () => {
    const entry = item({
      sections: [
        section({
          kind: "active",
          desc: "Boom.",
          stats: [stat("Damage", "100"), stat("Cooldown", "22s")],
        }),
      ],
    });
    assert.deepEqual(lines(entry).slice(1), [
      "**[Active (22s)]** Boom.",
      "**100** Damage",
    ]);
  });

  it("keeps an ability's cooldown as a stat, having no label to lift it into", () => {
    const entry = ability({
      sections: [
        section({ stats: [stat("Cooldown", "26s"), stat("Charges", "1")] }),
      ],
    });
    assert.deepEqual(lines(entry).slice(1), [
      "**26s** Cooldown, **1** Charges",
    ]);
  });

  it("breaks a description's own paragraphs onto their own lines", () => {
    const entry = ability({ sections: [section({ desc: "One.\n\nTwo." })] });
    assert.deepEqual(lines(entry).slice(1), ["One.", "Two."]);
  });

  it("never emits a blank line, which would end the bullet", () => {
    const entry = ability({
      sections: [
        section({ desc: "One.\n\nTwo.", stats: [stat("Damage", "5")] }),
      ],
    });
    assert.ok(!/\n[ \t]*\n/.test(renderEntry(entry)));
  });

  it("indents every line after the first", () => {
    const entry = item({
      sections: [section({ kind: "innate", stats: [stat("A", "1")] })],
    });
    const raw = renderEntry(entry).split("\n");
    assert.ok(raw.slice(1).every((l) => l.startsWith("  ")));
  });
});

describe("stat groups", () => {
  it("introduces a heading the game grouped stats under", () => {
    const entry = ability({
      sections: [
        section({
          stats: [
            stat("Damage", "75", { group: "Cost of Stay" }),
            stat("Damage", "125", { group: "Failure to Check-Out" }),
          ],
        }),
      ],
    });
    assert.equal(
      lines(entry)[1],
      "*Cost of Stay:* **75** Damage, *Failure to Check-Out:* **125** Damage",
    );
  });

  it("does not repeat a heading across the stats it covers", () => {
    const entry = ability({
      sections: [
        section({
          stats: [
            stat("Stun", "1s", { group: "On Wall Hit:" }),
            stat("Slow", "40%", { group: "On Wall Hit:" }),
          ],
        }),
      ],
    });
    assert.equal(lines(entry)[1], "*On Wall Hit:* **1s** Stun, **40%** Slow");
  });

  it("does not double a colon the heading already carries", () => {
    const entry = ability({
      sections: [
        section({ stats: [stat("Damage", "30", { group: "On Hit:" })] }),
      ],
    });
    assert.equal(lines(entry)[1], "*On Hit:* **30** Damage");
  });

  it("puts ungrouped stats first, so a heading cannot appear to cover them", () => {
    const entry = ability({
      sections: [
        section({
          stats: [
            stat("Damage", "30", { group: "On Hit:" }),
            stat("Range", "5m"),
          ],
        }),
      ],
    });
    assert.equal(lines(entry)[1], "**5m** Range, *On Hit:* **30** Damage");
  });

  it("keeps a group together when another follows it", () => {
    const entry = ability({
      sections: [
        section({
          stats: [
            stat("Damage", "1", { group: "A" }),
            stat("Slow", "2", { group: "A" }),
            stat("Stun", "3", { group: "B" }),
          ],
        }),
      ],
    });
    assert.equal(
      lines(entry)[1],
      "*A:* **1** Damage, **2** Slow, *B:* **3** Stun",
    );
  });
});

describe("upgrades", () => {
  it("puts every tier on one line", () => {
    const entry = ability({
      upgrades: [
        { tier: 1, text: "-8s Cooldown" },
        { tier: 2, text: "+85 Damage" },
      ],
    });
    assert.equal(
      lines(entry)[1],
      "**[Tier 1]** -8s Cooldown **[Tier 2]** +85 Damage",
    );
  });

  it("joins a tier's own line break with a comma", () => {
    const entry = ability({
      upgrades: [{ tier: 2, text: "+150 Damage\n+1.5s Stun" }],
    });
    assert.equal(lines(entry)[1], "**[Tier 2]** +150 Damage, +1.5s Stun");
  });

  it("joins with a space when the first half already ended a sentence", () => {
    const entry = ability({
      upgrades: [{ tier: 3, text: "Unstoppable.\n15s Cooldown." }],
    });
    assert.equal(lines(entry)[1], "**[Tier 3]** Unstoppable. 15s Cooldown.");
  });

  it("renders synthesised changes plainly, matching the tiers that ship text", () => {
    const entry = ability({
      upgrades: [{ tier: 1, changes: [stat("Charges", "+1")] }],
    });
    assert.equal(lines(entry)[1], "**[Tier 1]** +1 Charges");
  });

  it("says nothing when an entry has no upgrades", () => {
    assert.equal(lines(item()).length, 1);
  });
});

describe("renderReply", () => {
  it("puts each entry on its own bullet", () => {
    const out = renderReply([item({ name: "A" }), item({ name: "B" })], META);
    assert.equal(out.split("\n").filter((l) => l.startsWith("- ")).length, 2);
  });

  it("footers the build the answer came from", () => {
    assert.match(renderReply([item()], META), /Deadlock build 6684/);
  });

  it("separates the footer with a rule", () => {
    const parts = renderReply([item()], META).split("\n\n---\n\n");
    assert.equal(parts.length, 2);
    assert.ok(parts[0]?.startsWith("- "));
  });

  it("renders an empty lookup as just the footer", () => {
    assert.equal(renderReply([], META).startsWith("\n\n---"), true);
  });
});
