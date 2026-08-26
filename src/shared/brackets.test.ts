import assert from "node:assert/strict";
import { test } from "node:test";
import { extractTokens, MAX_LOOKUPS } from "./brackets.ts";

test("handles Reddit's escaped bracket syntax", () => {
  assert.deepEqual(extractTokens("Test comment \\[\\[Test\\]\\]"), ["Test"]);
});

test("handles escaped and unescaped in the same body", () => {
  assert.deepEqual(extractTokens("\\[\\[Test\\]\\] and [[Test2]]"), [
    "Test",
    "Test2",
  ]);
});

test("unescapes punctuation Reddit's editor may escape", () => {
  assert.deepEqual(extractTokens("\\[\\[Mo \\& Krill\\]\\]"), ["Mo & Krill"]);
});

test("extract a single token", () => {
  assert.deepEqual(extractTokens("Testing [[Monster Rounds]]?"), [
    "Monster Rounds",
  ]);
});

test("dedupes case-insensitively, keeping the first spelling", () => {
  assert.deepEqual(
    extractTokens("[[Monster Rounds]] then [[monster rounds]]"),
    ["Monster Rounds"],
  );
});

test("ignores empty and whitespace-only brackets", () => {
  assert.deepEqual(extractTokens("[[]] [[   ]] [[Monster Rounds]]"), [
    "Monster Rounds",
  ]);
});

test("collapses internal whitespace", () => {
  assert.deepEqual(extractTokens("[[Mo  &    Krill]]"), ["Mo & Krill"]);
});

test("caps at MAX_LOOKUPS", () => {
  const tokens = Array.from(
    { length: MAX_LOOKUPS + 1 },
    (_, i) => `[[Token ${i}]]`,
  ).join(" ");
  assert.deepEqual(extractTokens(tokens).length, MAX_LOOKUPS);
});

test("handles nested brackets without matching greedily", () => {
  assert.deepEqual(extractTokens("[[Outer [[Inner]]]]"), ["Inner"]);
});

test("ignores unbalanced brackets", () => {
  assert.deepEqual(extractTokens("[[Unclosed and ]stray"), []);
});

test("extracts from doubled brackets with no inner text", () => {
  assert.deepEqual(extractTokens("[[[[Abrams]]]]"), ["Abrams"]);
});
