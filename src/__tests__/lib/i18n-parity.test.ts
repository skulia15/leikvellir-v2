// __tests__/lib/i18n-parity.test.ts
import { beforeAll, describe, it, expect } from "vitest";
import is from "~/locales/is.json";
import en from "~/locales/en.json";
import pl from "~/locales/pl.json";
import { getPluralKey, getTranslation, loadTranslations } from "~/lib/i18n/translations";
import {
  formatIcelandicLocation,
  getMunicipalityDative,
  getMunicipalityPreposition,
} from "~/lib/icelandic-declension";

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function leafKeys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => leafKeys(v, `${prefix}${i}.`));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => leafKeys(v, `${prefix}${k}.`));
  }
  return [prefix.slice(0, -1)];
}

// Plural variants differ per locale (pl has _few/_many), so compare base keys
const normalized = (obj: unknown) =>
  new Set(leafKeys(obj).map((k) => k.replace(PLURAL_SUFFIX, "")));

describe("translation key parity", () => {
  const sets = { is: normalized(is), en: normalized(en), pl: normalized(pl) };

  it.each([
    ["is", "en"],
    ["is", "pl"],
    ["en", "pl"],
  ] as const)("%s and %s have identical leaf keys", (a, b) => {
    const onlyA = [...sets[a]].filter((k) => !sets[b].has(k));
    const onlyB = [...sets[b]].filter((k) => !sets[a].has(k));
    expect({ [`only_${a}`]: onlyA, [`only_${b}`]: onlyB }).toEqual({
      [`only_${a}`]: [],
      [`only_${b}`]: [],
    });
  });

  it("every plural key provides the forms its locale needs", () => {
    const required = { is: ["one", "other"], en: ["one", "other"], pl: ["one", "few", "many"] };
    for (const [locale, data] of Object.entries({ is, en, pl }) as [keyof typeof required, unknown][]) {
      const keys = new Set(leafKeys(data));
      const bases = new Set([...keys].filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, "")));
      for (const base of bases) {
        for (const form of required[locale]) {
          expect(keys.has(`${base}_${form}`), `${locale}: ${base}_${form}`).toBe(true);
        }
      }
    }
  });
});

describe("Polish CLDR pluralization", () => {
  beforeAll(async () => {
    await loadTranslations("pl");
  });

  it.each([
    [1, "one"],
    [2, "few"],
    [4, "few"],
    [5, "many"],
    [12, "many"],
    [14, "many"],
    [22, "few"],
    [24, "few"],
    [25, "many"],
    [102, "few"],
  ])("%i → %s", (count, form) => {
    expect(getPluralKey("x", count, "pl")).toBe(`x_${form}`);
  });

  it("renders the correct Polish form", () => {
    expect(getTranslation("pl", "playground.playgroundsCount", { count: 22 })).toBe("22 place zabaw");
    expect(getTranslation("pl", "playground.playgroundsCount", { count: 12 })).toBe("12 placów zabaw");
  });
});

describe("Icelandic pluralization", () => {
  it.each([
    [1, "one"],
    [11, "other"],
    [21, "one"],
    [5, "other"],
  ])("%i → %s", (count, form) => {
    expect(getPluralKey("x", count, "is")).toBe(`x_${form}`);
  });
});

describe("Icelandic municipality formatting", () => {
  it("uses í + dative for most municipalities", () => {
    expect(formatIcelandicLocation("Kópavogur")).toBe("í Kópavogi");
    expect(formatIcelandicLocation("Hafnarfjörður")).toBe("í Hafnarfirði");
  });

  it("uses á for municipalities that take á", () => {
    expect(formatIcelandicLocation("Akureyri")).toBe("á Akureyri");
    expect(formatIcelandicLocation("Akranes")).toBe("á Akranesi");
    expect(formatIcelandicLocation("Seltjarnarnes")).toBe("á Seltjarnarnesi");
    expect(getMunicipalityPreposition("Reykjavík")).toBe("í");
  });

  it("falls back to á Íslandi when municipality is missing", () => {
    expect(formatIcelandicLocation(null)).toBe("á Íslandi");
    expect(formatIcelandicLocation(undefined)).toBe("á Íslandi");
    expect(formatIcelandicLocation("  ")).toBe("á Íslandi");
    expect(formatIcelandicLocation("Ísland")).toBe("á Íslandi");
  });

  it("returns nominative for unknown names", () => {
    expect(getMunicipalityDative("Óþekktbær")).toBe("Óþekktbær");
  });
});
