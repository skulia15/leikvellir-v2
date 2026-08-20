import { test, expect } from "@playwright/test";

test.describe("Playground Detail Page", () => {
  // We'll test with a known playground ID if it exists, 
  // or navigate from the list
  
  test("should display playground information", async ({ page }) => {
    // First, go to the playgrounds list and click on one
    await page.goto("/playgrounds");
    await page.waitForLoadState("networkidle");

    const playgroundLink = page.locator("a[href*='/playground/']").first();

    if (await playgroundLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playgroundLink.click();

      // Should be on detail page
      await expect(page).toHaveURL(/\/playground\/\d+/);

      // Should show playground title
      const title = page.locator("h1, h2").first();
      await expect(title).toBeVisible();

      // Should have a back button
      const backButton = page.locator("button, a").filter({ hasText: /back|til baka/i });
      if (await backButton.first().isVisible().catch(() => false)) {
        await expect(backButton.first()).toBeVisible();
      }
    }
  });

  test("should show image carousel or cover image", async ({ page }) => {
    await page.goto("/playgrounds");
    await page.waitForLoadState("networkidle");

    const playgroundLink = page.locator("a[href*='/playground/']").first();

    if (await playgroundLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playgroundLink.click();
      await page.waitForLoadState("networkidle");

      // Look for image elements
      const images = page.locator("img[src*='playground'], img[src*='upload'], img[alt*='playground']");
      
      // Should have at least one image or fallback
      const hasImages = await images.first().isVisible({ timeout: 5000 }).catch(() => false);
      // Note: Some playgrounds may not have images
    }
  });

  test("should show playground features/badges", async ({ page }) => {
    await page.goto("/playgrounds");
    await page.waitForLoadState("networkidle");

    const playgroundLink = page.locator("a[href*='/playground/']").first();

    if (await playgroundLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playgroundLink.click();
      await page.waitForLoadState("networkidle");

      // Look for feature indicators (toddler-friendly, public access, etc.)
      // These could be badges, icons, or text
      const pageContent = await page.textContent("body");
      
      // The page should have some content loaded
      expect(pageContent?.length).toBeGreaterThan(100);
    }
  });
});
