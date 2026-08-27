import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitize } from "./markup.ts";

describe("sanitize", () => {
  it("returns empty for a missing description", () => {
    assert.equal(sanitize(undefined), "");
    assert.equal(sanitize(""), "");
  });

  it("passes plain text through", () => {
    assert.equal(sanitize("Deals damage."), "Deals damage.");
  });
});

describe("sanitize strips", () => {
  it("inline svg, which some descriptions embed whole", () => {
    assert.equal(
      sanitize('Costs <svg width="9"><path d="M1 2Z"/></svg> spirit.'),
      "Costs spirit.",
    );
  });

  it("icons and panel elements", () => {
    assert.equal(
      sanitize('Press <img src="x.png"> or <Panel class="Icon"></Panel> now.'),
      "Press or now.",
    );
  });

  it("attribute labels, keeping their text", () => {
    assert.equal(
      sanitize(
        'Applies <span class="inline-attribute-label Slow">Slow</span>.',
      ),
      "Applies Slow.",
    );
  });

  it("diminished text without emphasising it", () => {
    assert.equal(
      sanitize('Deals <span class="diminish">less</span> damage.'),
      "Deals less damage.",
    );
  });
});

describe("sanitize emphasis", () => {
  it("bolds highlighted text", () => {
    assert.equal(
      sanitize('Deals <span class="highlight">50</span> damage.'),
      "Deals **50** damage.",
    );
  });

  it("bolds every highlight variant", () => {
    for (const cls of [
      "highlight_spirit",
      "highlight_courage",
      "highlight_special",
    ]) {
      assert.equal(sanitize(`<span class="${cls}">x</span>`), "**x**");
    }
  });

  it("keeps whitespace outside the markers", () => {
    assert.equal(
      sanitize('a <span class="highlight"> b </span> c'),
      "a **b** c",
    );
  });

  it("emits nothing for a highlight holding only an icon", () => {
    assert.equal(
      sanitize('<span class="highlight"><svg><path d="M1Z"/></svg></span>: go'),
      ": go",
    );
  });

  it("closes an emphasis the source left open", () => {
    assert.equal(
      sanitize('Gain <span class="highlight">30% Move Speed'),
      "Gain **30% Move Speed**",
    );
  });

  it("accepts </spawn>, a typo the payload really ships", () => {
    assert.equal(
      sanitize('<span class="highlight">-30%</spawn> Move Speed'),
      "**-30%** Move Speed",
    );
  });
});

describe("sanitize line breaks", () => {
  it("turns <br> into a line break", () => {
    assert.equal(
      sanitize("+150 Damage<br>+1.5s Stun"),
      "+150 Damage\n+1.5s Stun",
    );
  });

  it("turns a doubled <br> into a blank line", () => {
    assert.equal(sanitize("One.<br><br>Two."), "One.\n\nTwo.");
  });

  it("collapses the source's own indentation, which is not meaningful", () => {
    assert.equal(sanitize("Deals\n   damage\n   now."), "Deals damage now.");
  });

  it("does not leave whitespace hugging a break", () => {
    assert.equal(sanitize("One. <br> Two."), "One.\nTwo.");
  });
});

describe("sanitize entities", () => {
  it("decodes named entities", () => {
    assert.equal(sanitize("Bullet &amp; Spirit"), "Bullet & Spirit");
  });

  it("decodes numeric entities", () => {
    assert.equal(sanitize("&#65;&#x42;"), "AB");
  });

  it("leaves an unrecognised entity alone", () => {
    assert.equal(sanitize("&notreal; here"), "&notreal; here");
  });
});

describe("sanitize placeholders", () => {
  it("drops a placeholder and reports it", () => {
    const seen: string[] = [];
    const out = sanitize("Damaged by {s:hero_name} recently.", (t) =>
      seen.push(t),
    );
    assert.equal(out, "Damaged by recently.");
    assert.deepEqual(seen, ["{s:hero_name}"]);
  });

  it("reports a placeholder nobody has seen before", () => {
    const seen: string[] = [];
    sanitize("{s:brand_new_token}", (t) => seen.push(t));
    assert.deepEqual(seen, ["{s:brand_new_token}"]);
  });
});
