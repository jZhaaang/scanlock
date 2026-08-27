import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NameIndex } from "../schema.ts";
import { resolve, resolveAll } from "./resolve.ts";

const INDEX: NameIndex = {
  exact: {
    "monster rounds": ["upgrade_non_player_bonus"],
    "hunters aura": ["upgrade_bullet_armor_reduction_aura"],
    // two assets really carry these names
    "sticky bomb": ["citadel_ability_sticky_bomb", "ability_bebop_stickybomb2"],
  },
  loose: {
    monsterrounds: ["upgrade_non_player_bonus"],
    huntersaura: ["upgrade_bullet_armor_reduction_aura"],
    stickybomb: ["citadel_ability_sticky_bomb", "ability_bebop_stickybomb2"],
  },
};

describe("resolve", () => {
  it("matches a name as typed", () => {
    assert.deepEqual(resolve("Monster Rounds", INDEX), {
      token: "Monster Rounds",
      ids: ["upgrade_non_player_bonus"],
      via: "exact",
    });
  });

  it("matches a name whose apostrophe was typed or omitted", () => {
    assert.equal(resolve("Hunter's Aura", INDEX).via, "exact");
    assert.equal(resolve("Hunters Aura", INDEX).via, "exact");
    assert.equal(resolve("Hunter’s Aura", INDEX).via, "exact"); // curly quote
  });

  it("falls back to the loose key when spacing is dropped", () => {
    assert.deepEqual(resolve("monsterrounds", INDEX), {
      token: "monsterrounds",
      ids: ["upgrade_non_player_bonus"],
      via: "loose",
    });
  });

  it("returns every id sharing a name", () => {
    assert.deepEqual(resolve("Sticky Bomb", INDEX).ids, [
      "citadel_ability_sticky_bomb",
      "ability_bebop_stickybomb2",
    ]);
  });

  it("misses on inherited object keys, which are not entries", () => {
    for (const token of ["constructor", "toString", "valueOf", "__proto__"]) {
      assert.deepEqual(resolve(token, INDEX), { token, ids: [], via: "none" });
    }
  });
});

describe("resolveAll", () => {
  it("resolves each token in order", () => {
    const out = resolveAll(["Monster Rounds", "Hunter's Aura"], INDEX);
    assert.deepEqual(
      out.map((r) => r.ids[0]),
      ["upgrade_non_player_bonus", "upgrade_bullet_armor_reduction_aura"],
    );
  });

  it("collapses multiple spellings that land on one entry", () => {
    const out = resolveAll(
      ["Hunter's Aura", "huntersaura", "HUNTERS AURA"],
      INDEX,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]?.token, "Hunter's Aura");
  });

  it("keeps distinct misses apart", () => {
    const out = resolveAll(["nonsense one", "nonsense two"], INDEX);
    assert.equal(out.length, 2);
  });

  it("collapses repeated spellings of one miss", () => {
    const out = resolveAll(["No Such Item", "no such item"], INDEX);
    assert.equal(out.length, 1);
  });

  it("keeps a miss alongside a hit", () => {
    const out = resolveAll(["Monster Rounds", "nonsense"], INDEX);
    assert.deepEqual(
      out.map((r) => r.via),
      ["exact", "none"],
    );
  });

  it("returns nothing for no tokens", () => {
    assert.deepEqual(resolveAll([], INDEX), []);
  });
});
