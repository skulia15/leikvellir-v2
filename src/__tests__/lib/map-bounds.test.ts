// __tests__/lib/map-bounds.test.ts
import { describe, it, expect } from "vitest";
import {
  boundsFromScreenRect,
  getListBounds,
  getMarkerBounds,
  isWithinBounds,
  type MapBounds,
  type Unproject,
} from "~/lib/map-utils";
import { type Playground } from "~/types";

/**
 * A stand-in for mapbox-gl's `map.unproject` with a fixed, linear projection:
 * the 390x700 canvas spans 0.01 degrees in each direction, north-up, centred on
 * Hafnarfjörður. Screen y grows downward, latitude grows upward.
 */
const WIDTH = 390;
const HEIGHT = 700;
const WEST = -21.959;
const NORTH = 64.076;
const DEG_PER_PX_X = 0.01 / WIDTH;
const DEG_PER_PX_Y = 0.01 / HEIGHT;

const unproject: Unproject = ([x, y]) => ({
  lng: WEST + x * DEG_PER_PX_X,
  lat: NORTH - y * DEG_PER_PX_Y,
});

/** Screen position -> a playground sitting at that spot on the canvas. */
function playgroundAt(x: number, y: number): Playground {
  const { lng, lat } = unproject([x, y]);
  return { id: 1, title: "Leikvöllur", latitude: lat, longitude: lng } as Playground;
}

const spanOf = ([west, south, east, north]: MapBounds) => ({
  lng: east - west,
  lat: north - south,
});

describe("boundsFromScreenRect", () => {
  it("maps a screen rectangle to [west, south, east, north]", () => {
    const bounds = boundsFromScreenRect(unproject, 0, 0, WIDTH, HEIGHT);
    expect(bounds[0]).toBeCloseTo(WEST, 10);
    expect(bounds[3]).toBeCloseTo(NORTH, 10);
    expect(bounds[2]).toBeCloseTo(WEST + 0.01, 10);
    expect(bounds[1]).toBeCloseTo(NORTH - 0.01, 10);
  });

  it("orders the tuple regardless of which corner is north or west", () => {
    // A projection where both axes run the other way still has to yield a
    // tuple with west < east and south < north.
    const flipped: Unproject = ([x, y]) => ({ lng: -x, lat: y });
    const [west, south, east, north] = boundsFromScreenRect(flipped, 0, 0, 10, 20);
    expect(west).toBeLessThan(east);
    expect(south).toBeLessThan(north);
  });
});

describe("getMarkerBounds", () => {
  it("covers the whole canvas", () => {
    const bounds = getMarkerBounds(unproject, WIDTH, HEIGHT);

    // A pin in each corner of the canvas, and one dead centre.
    for (const [x, y] of [
      [0, 0],
      [WIDTH, 0],
      [0, HEIGHT],
      [WIDTH, HEIGHT],
      [WIDTH / 2, HEIGHT / 2],
    ]) {
      expect(isWithinBounds(playgroundAt(x!, y!), bounds)).toBe(true);
    }
  });

  it("extends past the canvas so pins exist before a drag settles", () => {
    const bounds = getMarkerBounds(unproject, WIDTH, HEIGHT);
    const span = spanOf(bounds);
    const canvasSpan = spanOf(boundsFromScreenRect(unproject, 0, 0, WIDTH, HEIGHT));

    expect(span.lng).toBeGreaterThan(canvasSpan.lng);
    expect(span.lat).toBeGreaterThan(canvasSpan.lat);
    // A pin just off the bottom edge is already rendered when the user starts
    // dragging it into view.
    expect(isWithinBounds(playgroundAt(WIDTH / 2, HEIGHT + 100), bounds)).toBe(true);
  });

  it("ignores the bottom sheet entirely", () => {
    // Regression: the marker bounds were once derived from the unoccluded
    // rectangle, which culled every pin below the sheet's top edge — including
    // the ones in plain view — so dragging a pin down the screen made it vanish.
    // Marker bounds take no occlusion argument at all now; this pins that down
    // by checking a pin low on the canvas is present whatever the sheet does.
    const bounds = getMarkerBounds(unproject, WIDTH, HEIGHT);
    const lowOnScreen = playgroundAt(WIDTH / 2, HEIGHT * 0.9);

    expect(isWithinBounds(lowOnScreen, bounds)).toBe(true);

    // ...whereas the list, correctly, drops it once the sheet covers it.
    const listBounds = getListBounds(unproject, WIDTH, HEIGHT, HEIGHT * 0.6);
    expect(isWithinBounds(lowOnScreen, listBounds)).toBe(false);
  });
});

describe("getListBounds", () => {
  it("matches the canvas when nothing is covering it", () => {
    const bounds = getListBounds(unproject, WIDTH, HEIGHT, 0);
    expect(bounds).toEqual(boundsFromScreenRect(unproject, 0, 0, WIDTH, HEIGHT));
  });

  it("excludes playgrounds hidden underneath the sheet", () => {
    const bounds = getListBounds(unproject, WIDTH, HEIGHT, HEIGHT * 0.5);

    expect(isWithinBounds(playgroundAt(WIDTH / 2, HEIGHT * 0.25), bounds)).toBe(true);
    expect(isWithinBounds(playgroundAt(WIDTH / 2, HEIGHT * 0.75), bounds)).toBe(false);
  });

  it("keeps a quarter of the map even when the sheet covers nearly all of it", () => {
    const bounds = getListBounds(unproject, WIDTH, HEIGHT, HEIGHT);
    const shallow = getListBounds(unproject, WIDTH, HEIGHT, HEIGHT * 0.9);

    // Both clamp to the same floor, so the list never reports an empty map
    // just because the user pulled the sheet all the way up.
    expect(bounds).toEqual(shallow);
    expect(isWithinBounds(playgroundAt(WIDTH / 2, HEIGHT * 0.2), bounds)).toBe(true);
    expect(isWithinBounds(playgroundAt(WIDTH / 2, HEIGHT * 0.3), bounds)).toBe(false);
  });

  it("treats a negative occlusion as none", () => {
    expect(getListBounds(unproject, WIDTH, HEIGHT, -50)).toEqual(
      getListBounds(unproject, WIDTH, HEIGHT, 0),
    );
  });
});
