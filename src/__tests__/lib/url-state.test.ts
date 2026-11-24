// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  isSameOriginReferrer,
  parseHomeMapParams,
  parsePlaygroundsListParams,
  serializeHomeMapParams,
  serializePlaygroundsListParams,
  shouldUseHistoryBack,
} from "~/lib/url-state";

describe("playgrounds list URL state", () => {
  it("round-trips all /playgrounds filters, search, and sort params cleanly", () => {
    const original = {
      search: "Kopavogur",
      municipality: "Kópavogur",
      sortBy: "name" as const,
      activeCategories: [
        "climbing_and_movement" as const,
        "imaginative_and_themed" as const,
      ],
      bouncyPillow: true,
      footballField: true,
      openNow: true,
    };

    const serialized = serializePlaygroundsListParams(original);
    expect(serialized.get("search")).toBe("Kopavogur");
    expect(serialized.get("municipality")).toBe("Kópavogur");
    expect(serialized.get("sort")).toBe("name");
    expect(serialized.get("categories")).toBe(
      "climbing_and_movement,imaginative_and_themed",
    );
    expect(serialized.get("bouncy")).toBe("1");
    expect(serialized.get("football")).toBe("1");
    expect(serialized.get("open")).toBe("1");

    const parsed = parsePlaygroundsListParams(serialized);
    expect(parsed).toEqual(original);
  });

  it("omits default/empty values when serializing", () => {
    const serialized = serializePlaygroundsListParams({
      search: "   ",
      municipality: "__all__",
      sortBy: null,
      activeCategories: [],
      bouncyPillow: false,
      footballField: false,
      openNow: false,
    });

    expect(serialized.toString()).toBe("");
  });

  it("ignores invalid sort options and unknown equipment categories", () => {
    const params = new URLSearchParams(
      "sort=popularity&categories=invalid_cat,climbing_and_movement,climbing_and_movement",
    );
    const parsed = parsePlaygroundsListParams(params);

    expect(parsed.sortBy).toBeNull();
    expect(parsed.activeCategories).toEqual(["climbing_and_movement"]);
  });
});

describe("home map URL state", () => {
  it("round-trips filters, amenities, selected playground, and map viewport", () => {
    const serialized = serializeHomeMapParams({
      filters: {
        search: "Hafnarfjordur",
        accessibleNow: true,
        toddlerFriendly: true,
        publiclyAccessible: true,
        bouncyPillow: true,
        footballField: true,
        categories: ["climbing_and_movement", "spinning_and_motion"],
        hasFencing: true,
        hasBathroomNearby: true,
      },
      selectedPlaygroundId: 42,
      viewport: { lat: 64.0712345, lng: -21.9543219, zoom: 14.567 },
    });

    const parsed = parseHomeMapParams(serialized);

    expect(parsed.filters).toEqual({
      search: "Hafnarfjordur",
      accessibleNow: true,
      toddlerFriendly: true,
      publiclyAccessible: true,
      bouncyPillow: true,
      footballField: true,
      categories: ["climbing_and_movement", "spinning_and_motion"],
      hasFencing: true,
      hasBathroomNearby: true,
    });
    expect(parsed.selectedPlaygroundId).toBe(42);
    expect(parsed.viewport).toEqual({
      lat: 64.07123,
      lng: -21.95432,
      zoom: 14.57,
    });
  });

  it("ignores malformed coordinates, zoom values, and playground IDs", () => {
    const params = new URLSearchParams(
      "lat=999&lng=-21.9&z=50&playground=-5&amenities=unknown,fencing",
    );
    const parsed = parseHomeMapParams(params);

    expect(parsed.viewport).toBeNull();
    expect(parsed.selectedPlaygroundId).toBeNull();
    expect(parsed.filters).toEqual({ hasFencing: true });
  });
});

describe("smart Back navigation detection", () => {
  it("detects same-origin referrers safely", () => {
    expect(
      isSameOriginReferrer("https://leiksvaedi.is/playgrounds", "https://leiksvaedi.is"),
    ).toBe(true);
    expect(
      isSameOriginReferrer("https://www.google.com/search?q=leikvollur", "https://leiksvaedi.is"),
    ).toBe(false);
    expect(isSameOriginReferrer("", "https://leiksvaedi.is")).toBe(false);
    expect(isSameOriginReferrer("not-a-url", "https://leiksvaedi.is")).toBe(false);
  });

  it("returns false for fresh tabs or external landings without in-app history", () => {
    expect(
      shouldUseHistoryBack({
        referrer: "",
        currentOrigin: "https://leiksvaedi.is",
        historyLength: 1,
        hasInAppReferrer: false,
      }),
    ).toBe(false);

    expect(
      shouldUseHistoryBack({
        referrer: "https://www.google.com/",
        currentOrigin: "https://leiksvaedi.is",
        historyLength: 3,
        hasInAppReferrer: false,
      }),
    ).toBe(false);
  });

  it("returns true when user navigated from an in-app page or same-origin referrer", () => {
    expect(
      shouldUseHistoryBack({
        referrer: "https://www.google.com/",
        currentOrigin: "https://leiksvaedi.is",
        historyLength: 3,
        hasInAppReferrer: true,
      }),
    ).toBe(true);

    expect(
      shouldUseHistoryBack({
        referrer: "https://leiksvaedi.is/?open=1",
        currentOrigin: "https://leiksvaedi.is",
        historyLength: 2,
        hasInAppReferrer: false,
      }),
    ).toBe(true);
  });
});
