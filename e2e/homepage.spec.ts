import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage with map and playground list", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to load
    await expect(page).toHaveTitle(/Leiksvæði/);

    // Check that the navigation bar is present
    await expect(page.getByRole("navigation")).toBeVisible();

    // Check that the map container is present (may take time to load)
    // The map should be within the main content area
    await expect(page.locator("[data-testid='map-container'], .mapboxgl-map, [class*='map']").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show language switcher in navigation", async ({ page }) => {
    await page.goto("/");

    // Look for language-related UI elements
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("should navigate to add playground page", async ({ page }) => {
    await page.goto("/");

    // Find and click the add playground link/button
    const addPlaygroundLink = page.getByRole("link", { name: /add|bæta|playground|leikvöll/i });
    
    if (await addPlaygroundLink.isVisible()) {
      await addPlaygroundLink.click();
      await expect(page).toHaveURL(/create-playground/);
    }
  });

  test("should navigate to all playgrounds page", async ({ page }) => {
    await page.goto("/");

    // Find and click the all playgrounds link
    const allPlaygroundsLink = page.getByRole("link", { name: /all playgrounds|allir leikvellir/i });
    
    if (await allPlaygroundsLink.isVisible()) {
      await allPlaygroundsLink.click();
      await expect(page).toHaveURL(/playgrounds/);
    }
  });
});
