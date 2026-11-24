import { describe, it, expect } from "vitest";
import {
  getTranslation,
  hasTranslation,
  isLocaleLoaded,
  isValidTranslation,
  loadTranslations,
} from "~/lib/i18n/translations";
import isRaw from "~/locales/is.json";
import enRaw from "~/locales/en.json";
import plRaw from "~/locales/pl.json";

describe("i18n translations", () => {
  it("validates all locale JSON files have valid structure", () => {
    expect(isValidTranslation(isRaw)).toBe(true);
    expect(isValidTranslation(enRaw)).toBe(true);
    expect(isValidTranslation(plRaw)).toBe(true);
  });

  it("rejects invalid translation structures", () => {
    expect(isValidTranslation(null)).toBe(false);
    expect(isValidTranslation("string")).toBe(false);
    expect(isValidTranslation({ nested: { bad: 123 } })).toBe(false);
  });

  it("has default Icelandic locale loaded synchronously", () => {
    expect(isLocaleLoaded("is")).toBe(true);
    expect(hasTranslation("is", "common.back")).toBe(true);
    expect(getTranslation("is", "common.back")).not.toBe("common.back");
  });

  it("loads English and Polish translations dynamically on demand", async () => {
    await loadTranslations("en");
    expect(isLocaleLoaded("en")).toBe(true);
    expect(hasTranslation("en", "common.back")).toBe(true);

    await loadTranslations("pl");
    expect(isLocaleLoaded("pl")).toBe(true);
    expect(hasTranslation("pl", "common.back")).toBe(true);
    expect(getTranslation("pl", "common.back")).not.toBe("common.back");
  });

  it("supports parameter interpolation and pluralization", async () => {
    await loadTranslations("en");
    await loadTranslations("pl");

    const oneEn = getTranslation("en", "playground.playgroundsCount", { count: 1 });
    const manyEn = getTranslation("en", "playground.playgroundsCount", { count: 5 });
    expect(oneEn).toContain("1");
    expect(manyEn).toContain("5");
    expect(oneEn).not.toBe(manyEn);

    const fewPl = getTranslation("pl", "playground.playgroundsCount", { count: 3 });
    expect(fewPl).toContain("3");
  });

  it("falls back to key when translation is missing everywhere", () => {
    expect(getTranslation("is", "nonexistent.translation.key")).toBe(
      "nonexistent.translation.key",
    );
  });
});
