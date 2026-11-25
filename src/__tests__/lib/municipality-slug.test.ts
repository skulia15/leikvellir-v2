import { describe, expect, it } from "vitest";
import { municipalityPath, municipalitySlug } from "~/lib/municipality-slug";
import { toAsciiOrigin } from "~/lib/seo/base-url";

describe("municipalitySlug", () => {
  it.each([
    ["Hafnarfjörður", "hafnarfjordur"],
    ["Reykjavík", "reykjavik"],
    ["Garðabær", "gardabaer"],
    ["Kópavogur", "kopavogur"],
    ["Þingeyjarsveit", "thingeyjarsveit"],
    ["Höfuðborgarsvæðið", "hofudborgarsvaedid"],
    ["Sveitarfélagið Hornafjörður", "sveitarfelagid-hornafjordur"],
    ["Grímsnes- og Grafningshreppur", "grimsnes-og-grafningshreppur"],
    ["Grímsnes-og Grafningshreppur", "grimsnes-og-grafningshreppur"],
    ["  Akureyri ", "akureyri"],
  ])("%s → %s", (name, slug) => {
    expect(municipalitySlug(name)).toBe(slug);
  });

  it("builds the landing page path", () => {
    expect(municipalityPath("Hafnarfjörður")).toBe("/leiksvaedi/hafnarfjordur");
  });
});

describe("toAsciiOrigin", () => {
  it("converts an internationalized host to punycode", () => {
    expect(toAsciiOrigin("https://leiksvæði.is")).toBe("https://xn--leiksvi-rxa4g.is");
  });

  it("drops trailing slashes and paths", () => {
    expect(toAsciiOrigin("https://leiksvæði.is/")).toBe("https://xn--leiksvi-rxa4g.is");
    expect(toAsciiOrigin("http://localhost:3000/foo")).toBe("http://localhost:3000");
  });
});
