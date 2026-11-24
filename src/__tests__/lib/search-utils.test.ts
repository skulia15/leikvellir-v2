import { describe, it, expect } from "vitest";
import {
  compareIcelandic,
  countSecondaryMapFilters,
  foldIcelandic,
  hasActiveMapFilters,
  hasEquipmentByName,
  matchesIcelandicText,
  matchesMapFilters,
  matchesPlaygroundSearch,
  sortPlaygroundsByName,
  type MapPlaygroundFilters,
} from "~/lib/search-utils";
import { type Playground } from "~/types";

function makePlayground(overrides: Partial<Playground> = {}): Playground {
  return {
    id: 1,
    title: "Test Playground",
    latitude: 64.1466,
    longitude: -21.9426,
    municipality: "Reykjavík",
    publiclyAccessible: true,
    toddlerFriendly: false,
    isSchoolGround: false,
    schoolType: null,
    hasSeating: false,
    hasPicnicTable: false,
    hasGarbageCan: false,
    hasBathroomNearby: false,
    hasFencing: false,
    hasSoftPlayArea: false,
    coverImage: null,
    images: [],
    status: "approved",
    submitAnonymously: false,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    createdById: null,
    playgroundEquipment: [],
    ...overrides,
  };
}

describe("foldIcelandic", () => {
  it("folds accented Icelandic vowels via NFD normalization", () => {
    expect(foldIcelandic("Áá Éé Íí Óó Úú Ýý")).toBe("aa ee ii oo uu yy");
  });

  it("maps special non-decomposing Icelandic characters", () => {
    expect(foldIcelandic("Ðð Þþ Ææ Öö")).toBe("dd thth aeae oo");
  });

  it("folds real Icelandic municipalities and playground names", () => {
    expect(foldIcelandic("Kópavogur")).toBe("kopavogur");
    expect(foldIcelandic("Hafnarfjörður")).toBe("hafnarfjordur");
    expect(foldIcelandic("Garðabær")).toBe("gardabaer");
    expect(foldIcelandic("Þorlákshöfn")).toBe("thorlakshofn");
    expect(foldIcelandic("Ísafjörður")).toBe("isafjordur");
    expect(foldIcelandic("Ærslabelgur")).toBe("aerslabelgur");
    expect(foldIcelandic("Árbær")).toBe("arbaer");
    expect(foldIcelandic("Ölfus")).toBe("olfus");
  });
});

describe("matchesIcelandicText", () => {
  it("matches municipalities without Icelandic diacritics", () => {
    expect(matchesIcelandicText("Kópavogur", "Kopavogur")).toBe(true);
    expect(matchesIcelandicText("Hafnarfjörður", "Hafnarfjordur")).toBe(true);
    expect(matchesIcelandicText("Garðabær", "Gardabaer")).toBe(true);
    expect(matchesIcelandicText("Þorlákshöfn", "Thorlakshofn")).toBe(true);
    expect(matchesIcelandicText("Mosfellsbær", "mosfellsbaer")).toBe(true);
  });

  it("matches queries containing diacritics against accented targets", () => {
    expect(matchesIcelandicText("Hafnarfjörður", "fjörður")).toBe(true);
    expect(matchesIcelandicText("Kópavogur", "Kóp")).toBe(true);
  });

  it("returns true for empty or whitespace queries", () => {
    expect(matchesIcelandicText("Kópavogur", "")).toBe(true);
    expect(matchesIcelandicText("Kópavogur", "   ")).toBe(true);
  });

  it("returns false for non-matching queries", () => {
    expect(matchesIcelandicText("Kópavogur", "Akureyri")).toBe(false);
  });
});

describe("matchesPlaygroundSearch", () => {
  const playground = makePlayground({
    title: "Árbæjarleikvöllur við Elliðaárdal",
    municipality: "Reykjavík",
  });

  it("matches by title without diacritics", () => {
    expect(matchesPlaygroundSearch(playground, "Arbaejarleikvollur")).toBe(true);
    expect(matchesPlaygroundSearch(playground, "ellidaardal")).toBe(true);
  });

  it("matches by municipality without diacritics", () => {
    expect(matchesPlaygroundSearch(playground, "Reykjavik")).toBe(true);
  });

  it("supports multi-word queries across title and municipality", () => {
    expect(matchesPlaygroundSearch(playground, "arbaer")).toBe(false);
    expect(matchesPlaygroundSearch(playground, "ellidaardal reykjavik")).toBe(true);
    expect(matchesPlaygroundSearch(playground, "reykjavik arbaejar")).toBe(true);
  });

  it("handles missing municipality gracefully", () => {
    const noMuni = makePlayground({
      title: "Þórsgata",
      municipality: null,
    });
    expect(matchesPlaygroundSearch(noMuni, "thorsgata")).toBe(true);
    expect(matchesPlaygroundSearch(noMuni, "kopavogur")).toBe(false);
  });
});

describe("compareIcelandic & sortPlaygroundsByName", () => {
  it("orders Icelandic letters according to Icelandic collation ('is')", () => {
    // In Icelandic alphabetical order:
    // A < Á < B ... < D < Ð < E < É ... < I < Í ... < O < Ó ... < U < Ú ... < Y < Ý < Z < Þ < Æ < Ö
    const unsorted = [
      "Ölfus",
      "Þorlákshöfn",
      "Ægir",
      "Árbær",
      "Akureyri",
      "Borgarnes",
      "Ð-völlur",
      "Dalvík",
      "Ísafjörður",
      "Innri-Njarðvík",
    ];

    const sorted = [...unsorted].sort(compareIcelandic);

    expect(sorted.indexOf("Akureyri")).toBeLessThan(sorted.indexOf("Árbær"));
    expect(sorted.indexOf("Árbær")).toBeLessThan(sorted.indexOf("Borgarnes"));
    expect(sorted.indexOf("Dalvík")).toBeLessThan(sorted.indexOf("Ð-völlur"));
    expect(sorted.indexOf("Innri-Njarðvík")).toBeLessThan(
      sorted.indexOf("Ísafjörður"),
    );
    expect(sorted.indexOf("Þorlákshöfn")).toBeLessThan(sorted.indexOf("Ægir"));
    expect(sorted.indexOf("Ægir")).toBeLessThan(sorted.indexOf("Ölfus"));
    expect(sorted.indexOf("Ísafjörður")).toBeLessThan(
      sorted.indexOf("Þorlákshöfn"),
    );
  });

  it("sorts playground objects without mutating the input array", () => {
    const items = [
      { id: 1, title: "Öskjuhlíð" },
      { id: 2, title: "Ártún" },
      { id: 3, title: "Þingholt" },
      { id: 4, title: "Akranes" },
      { id: 5, title: "Ægisíða" },
    ];

    const sorted = sortPlaygroundsByName(items);

    expect(sorted.map((p) => p.title)).toEqual([
      "Akranes",
      "Ártún",
      "Þingholt",
      "Ægisíða",
      "Öskjuhlíð",
    ]);
    // Ensure input was not mutated
    expect(items[0]?.title).toBe("Öskjuhlíð");
  });
});

describe("hasEquipmentByName", () => {
  it("matches multilingual equipment names diacritic-insensitively", () => {
    const playground = makePlayground({
      playgroundEquipment: [
        {
          id: 1,
          playgroundId: 1,
          equipmentId: 10,
          quantity: 1,
          equipment: {
            id: 10,
            name: { is: "Ærslabelgur", en: "Bouncy pillow" },
            category: "additional_common_equipment",
            description: null,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    });

    expect(hasEquipmentByName(playground, "Ærslabelgur")).toBe(true);
    expect(hasEquipmentByName(playground, "aerslabelgur")).toBe(true);
    expect(hasEquipmentByName(playground, "Fótboltavöllur")).toBe(false);
  });
});

describe("matchesMapFilters, hasActiveMapFilters, and countSecondaryMapFilters", () => {
  const richPlayground = makePlayground({
    title: "Klambratún",
    municipality: "Reykjavík",
    toddlerFriendly: true,
    publiclyAccessible: true,
    hasFencing: true,
    hasBathroomNearby: true,
    hasPicnicTable: false,
    hasSeating: true,
    hasSoftPlayArea: false,
    playgroundEquipment: [
      {
        id: 1,
        playgroundId: 1,
        equipmentId: 1,
        quantity: 1,
        equipment: {
          id: 1,
          name: { is: "Ærslabelgur", en: "Bouncy pillow" },
          category: "climbing_and_movement",
          description: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
  });

  it("matches search, primary flags, equipment categories, special equipment, and amenities", () => {
    const filters: MapPlaygroundFilters = {
      search: "klambratun",
      toddlerFriendly: true,
      publiclyAccessible: true,
      categories: ["climbing_and_movement", "imaginative_and_themed"],
      bouncyPillow: true,
      hasFencing: true,
      hasBathroomNearby: true,
      hasSeating: true,
    };

    expect(matchesMapFilters(richPlayground, filters)).toBe(true);
    expect(hasActiveMapFilters(filters)).toBe(true);
    expect(countSecondaryMapFilters(filters)).toBe(6); // 2 categories + bouncyPillow + 3 amenities
  });

  it("rejects playground missing a requested amenity or equipment category", () => {
    expect(
      matchesMapFilters(richPlayground, { hasPicnicTable: true }),
    ).toBe(false);
    expect(
      matchesMapFilters(richPlayground, { categories: ["spinning_and_motion"] }),
    ).toBe(false);
    expect(
      matchesMapFilters(richPlayground, { footballField: true }),
    ).toBe(false);
  });

  it("reports no active filters for an empty filter object", () => {
    expect(hasActiveMapFilters({})).toBe(false);
    expect(hasActiveMapFilters({ search: "   " })).toBe(false);
    expect(countSecondaryMapFilters({})).toBe(0);
  });

  it("resolves equipment categories and names via catalog lookup when equipment is not embedded", () => {
    const trimmedPlayground = makePlayground({
      title: "Hljómskálagarður",
      municipality: "Reykjavík",
      playgroundEquipment: [
        {
          id: 1,
          playgroundId: 1,
          equipmentId: 42,
          quantity: 1,
        },
      ],
    });

    const catalog = new Map([
      [
        42,
        {
          name: { is: "Fótboltavöllur", en: "Football field" },
          category: "fitness_and_obstacle" as const,
        },
      ],
    ]);

    expect(hasEquipmentByName(trimmedPlayground, "Fotboltavollur", catalog)).toBe(
      true,
    );
    expect(
      matchesMapFilters(
        trimmedPlayground,
        { footballField: true, categories: ["fitness_and_obstacle"] },
        catalog,
      ),
    ).toBe(true);
    expect(
      matchesMapFilters(
        trimmedPlayground,
        { categories: ["spinning_and_motion"] },
        catalog,
      ),
    ).toBe(false);
  });
});
