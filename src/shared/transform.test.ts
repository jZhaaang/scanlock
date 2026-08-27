import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  RawAbility,
  RawAsset,
  RawHero,
  RawProperty,
  RawShopItem,
} from "./raw.ts";
import type { Entry, Snapshot } from "./schema.ts";
import { transform } from "./transform.ts";

const META = { build: 1, syncedAt: "2026-01-01T00:00:00.000Z" };

function item(over: Partial<RawShopItem> = {}): RawShopItem {
  return {
    class_name: "upgrade_test",
    name: "Test Item",
    type: "upgrade",
    shopable: true,
    cost: 800,
    item_tier: 1,
    item_slot_type: "weapon",
    activation: "passive",
    properties: {},
    ...over,
  };
}

function ability(over: Partial<RawAbility> = {}): RawAbility {
  return {
    class_name: "ability_test",
    name: "Test Ability",
    type: "ability",
    properties: {},
    ...over,
  };
}

function hero(over: Partial<RawHero> = {}): RawHero {
  return {
    class_name: "hero_test",
    name: "Test Hero",
    player_selectable: true,
    items: { signature1: "ability_test" },
    ...over,
  };
}

function build(items: RawAsset[], heroes: RawHero[] = []): Snapshot {
  return transform(items, heroes, META);
}

/** The single entry a one-asset snapshot produced */
function one(items: RawAsset[], heroes: RawHero[] = []): Entry {
  const entries = Object.values(build(items, heroes).entries);
  assert.equal(entries.length, 1, "expected exactly one entry");
  return entries[0] as Entry;
}

describe("transform filters", () => {
  it("drops items that are not shopable", () => {
    assert.deepEqual(build([item({ shopable: false })]).entries, {});
  });

  it("drops disabled items", () => {
    assert.deepEqual(build([item({ disabled: true })]).entries, {});
  });

  it("drops assets whose name is still the class name", () => {
    assert.deepEqual(build([item({ name: "upgrade_test" })]).entries, {});
  });

  it("drops abilities no live hero owns", () => {
    assert.deepEqual(build([ability()], []).entries, {});
  });

  it("drops abilities of disabled heroes", () => {
    assert.deepEqual(
      build([ability()], [hero({ disabled: true })]).entries,
      {},
    );
  });

  it("attributes an ability to its hero and slot", () => {
    const entry = one(
      [ability()],
      [hero({ items: { signature4: "ability_test" } })],
    );
    assert.equal(entry.hero, "Test Hero");
    assert.equal(entry.abilitySlot, 4);
  });
});

describe("stat formatting", () => {
  const printed = (prop: RawProperty): string => {
    const entry = one([
      item({
        properties: { P: prop },
        tooltip_sections: [{ section_attributes: [{ properties: ["P"] }] }],
      }),
    ]);
    return entry.sections[0]?.stats[0]?.value ?? "";
  };

  it("expands {s:sign} to a leading plus", () => {
    assert.equal(
      printed({ value: "25", label: "L", prefix: "{s:sign}" }),
      "+25",
    );
  });

  it("does not double-sign an already negative value", () => {
    assert.equal(
      printed({ value: "-9", label: "L", prefix: "{s:sign}", postfix: "%" }),
      "-9%",
    );
  });

  it("appends the postfix when the value carries no unit", () => {
    assert.equal(printed({ value: "5", label: "L", postfix: "s" }), "5s");
  });

  it("does not repeat a unit already baked into the value", () => {
    assert.equal(
      printed({ value: "4.25m", label: "L", postfix: "m" }),
      "4.25m",
    );
  });

  it("prefers the postfix over the value's own unit", () => {
    assert.equal(printed({ value: "4m", label: "L", postfix: "m/s" }), "4m/s");
  });

  it("trims a padded postfix", () => {
    assert.equal(
      printed({ value: "-0.5m", label: "L", postfix: " m" }),
      "-0.5m",
    );
  });

  it("accepts a numeric value", () => {
    assert.equal(printed({ value: 75, label: "L" }), "75");
  });
});

describe("stat filtering", () => {
  const statsOf = (props: Record<string, RawProperty>, keys: string[]) =>
    one([
      item({
        properties: props,
        tooltip_sections: [{ section_attributes: [{ properties: keys }] }],
      }),
    ]).sections[0]?.stats ?? [];

  it("drops zero-valued properties, which upgrades grant later", () => {
    assert.deepEqual(statsOf({ P: { value: "0", label: "Slow" } }, ["P"]), []);
  });

  it("drops unlabelled properties", () => {
    assert.deepEqual(statsOf({ P: { value: "5" } }, ["P"]), []);
  });

  it("drops a property named twice", () => {
    assert.equal(
      statsOf({ P: { value: "5", label: "L" } }, ["P", "P"]).length,
      1,
    );
  });

  it("marks elevated properties, plain ones not", () => {
    const entry = one([
      item({
        properties: {
          E: { value: "1", label: "E" },
          P: { value: "2", label: "P" },
        },
        tooltip_sections: [
          {
            section_attributes: [
              { elevated_properties: ["E"], properties: ["P"] },
            ],
          },
        ],
      }),
    ]);
    assert.deepEqual(
      entry.sections[0]?.stats.map((s) => [s.label, s.elevated]),
      [
        ["E", true],
        ["P", false],
      ],
    );
  });
});

describe("ability header", () => {
  const headerOf = (props: Record<string, RawProperty>) =>
    one([ability({ properties: props })], [hero()]).sections[0]?.stats ?? [];

  it("leads with the pills no selector names", () => {
    const stats = headerOf({
      AbilityCooldown: { value: "26", label: "Cooldown", postfix: "s" },
      AbilityCharges: { value: "1", label: "Charges" },
      AbilityCooldownBetweenCharge: {
        value: "6",
        label: "Charge Delay",
        postfix: "s",
      },
    });
    assert.deepEqual(
      stats.map((s) => `${s.label} ${s.value}`),
      ["Cooldown 26s", "Charges 1", "Charge Delay 6s"],
    );
  });

  it("drops the negative value that means 'no charges'", () => {
    assert.deepEqual(
      headerOf({
        AbilityCooldownBetweenCharge: {
          value: "-1.0",
          label: "Charge Delay",
          postfix: "s",
        },
      }),
      [],
    );
  });
});

describe("sections", () => {
  it("labels item sections from section_type", () => {
    const entry = one([
      item({
        properties: { P: { value: "1", label: "L" } },
        tooltip_sections: [
          {
            section_type: "innate",
            section_attributes: [{ properties: ["P"] }],
          },
          {
            section_type: "active",
            section_attributes: [{ loc_string: "Boom" }],
          },
        ],
      }),
    ]);
    assert.deepEqual(
      entry.sections.map((s) => s.kind),
      ["innate", "active"],
    );
  });

  it("treats an untyped section with text as a passive effect", () => {
    const entry = one([
      item({
        tooltip_sections: [
          { section_attributes: [{ loc_string: "Does a thing" }] },
        ],
      }),
    ]);
    assert.equal(entry.sections[0]?.kind, "passive");
  });

  it("treats an untyped section without text as innate", () => {
    const entry = one([
      item({
        properties: { P: { value: "1", label: "L" } },
        tooltip_sections: [{ section_attributes: [{ properties: ["P"] }] }],
      }),
    ]);
    assert.equal(entry.sections[0]?.kind, "innate");
  });

  it("falls back to description.desc when no section carries text", () => {
    const entry = one([
      item({
        description: { desc: "Only text lives here" },
        properties: { P: { value: "1", label: "L" } },
        tooltip_sections: [{ section_attributes: [{ properties: ["P"] }] }],
      }),
    ]);
    assert.equal(entry.sections[0]?.desc, "Only text lives here");
  });

  it("drops a section with neither stats nor text", () => {
    const entry = one([
      item({
        tooltip_sections: [
          { section_attributes: [{ loc_string: "kept" }] },
          { section_attributes: [{ properties: ["missing"] }] },
        ],
      }),
    ]);
    assert.equal(entry.sections.length, 1);
  });
});

describe("markup", () => {
  it("strips inline svg and tags out of descriptions", () => {
    const entry = one([
      item({
        tooltip_sections: [
          {
            section_attributes: [
              {
                loc_string:
                  'Deals <span class="highlight">50</span> <svg width="9"><path d="M1 2Z"/></svg> spirit damage.<br>Then stops.',
              },
            ],
          },
        ],
      }),
    ]);
    assert.equal(
      entry.sections[0]?.desc,
      "Deals **50** spirit damage.\nThen stops.",
    );
  });
});

describe("upgrades", () => {
  const upgradesOf = (over: Partial<RawAbility>) =>
    one([ability(over)], [hero()]).upgrades ?? [];

  it("uses the upgrades's own text when the game ships one", () => {
    const ups = upgradesOf({
      description: { t1_desc: "+1s Lifetime" },
      upgrades: [{ property_upgrades: [{ name: "X", bonus: "1" }] }],
    });
    assert.deepEqual(ups, [{ tier: 1, text: "+1s Lifetime" }]);
  });

  it("synthesises from property_upgrades when there is no text", () => {
    const ups = upgradesOf({
      properties: { AbilityCharges: { value: "1", label: "Charges" } },
      upgrades: [
        { property_upgrades: [{ name: "AbilityCharges", bonus: "1" }] },
      ],
    });
    assert.deepEqual(ups, [
      {
        tier: 1,
        changes: [{ label: "Charges", value: "+1", elevated: false }],
      },
    ]);
  });

  it("signs a negative bonus once", () => {
    const ups = upgradesOf({
      properties: {
        AbilityCooldown: { value: "26", label: "Cooldown", postfix: "s" },
      },
      upgrades: [
        { property_upgrades: [{ name: "AbilityCooldown", bonus: "-20" }] },
      ],
    });
    assert.equal(ups[0]?.changes?.[0]?.value, "-20s");
  });

  it("numbers tiers from one", () => {
    const ups = upgradesOf({
      description: { t1_desc: "a", t2_desc: "b", t3_desc: "c" },
      upgrades: [{}, {}, {}],
    });
    assert.deepEqual(
      ups.map((u) => u.tier),
      [1, 2, 3],
    );
  });
});

describe("legendary", () => {
  it("flags tier 5, which only exists in street brawl", () => {
    assert.equal(one([item({ item_tier: 5, cost: 9999 })]).legendary, true);
  });

  it("leaves the flag off shop items", () => {
    assert.equal(one([item({ item_tier: 4 })]).legendary, undefined);
  });
});

describe("name index", () => {
  it("keys entries by normalised and loosened name", () => {
    const snap = build([item({ name: "Mo & Krill" })]);
    assert.deepEqual(snap.index.exact["mo and krill"], ["upgrade_test"]);
    assert.deepEqual(snap.index.loose.mokrill, ["upgrade_test"]);
  });

  it("collects every id that shares a key", () => {
    const snap = build([
      item({ class_name: "a", name: "Sticky Bomb" }),
      item({ class_name: "b", name: "sticky bomb" }),
    ]);
    assert.deepEqual(snap.index.exact["sticky bomb"], ["a", "b"]);
  });
});

describe("snapshot meta", () => {
  it("records the build it was made from", () => {
    assert.deepEqual(build([]).meta, {
      build: 1,
      syncedAt: "2026-01-01T00:00:00.000Z",
      source: "deadlock-api",
    });
  });
});
