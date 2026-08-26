import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loosen, normalize } from "./normalize.ts";

describe("normalize", () => {
  test("casefolds and collapses whitespace", () => {
    assert.equal(normalize("  Monster   Rounds "), "monster rounds");
  });

  test("expands & to 'and'", () => {
    assert.equal(normalize("Mo & Krill"), "mo and krill");
    assert.equal(normalize("mo and krill"), "mo and krill");
  });

  test("strips straight and curly apostrophes without splitting word", () => {
    assert.equal(normalize("apostrophe's"), "apostrophes");
    assert.equal(normalize("apostrophe\u2019s"), "apostrophes");
    assert.equal(normalize("apostrophe\u2018s"), "apostrophes");
  });

  test("reduces punctuation to spaces", () => {
    assert.equal(
      normalize('punctuation!@#$%^*()_+=-`~[]{}|;:",.<>?/'),
      "punctuation",
    );
  });
});

describe("loosen", () => {
  test("collapses spacing and drops the standalone word 'and'", () => {
    assert.equal(loosen("  Monster   Rounds "), "monsterrounds");
    assert.equal(loosen("mo and krill"), "mokrill");
  });

  test("does not eat 'and' inside a word", () => {
    assert.equal(loosen("sandstorm"), "sandstorm");
  });
});
