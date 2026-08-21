import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("should navigate to contact page", async ({ page }) => {
    await page.goto("/");

    const contactLink = page.getByRole("link", { name: /contact|hafa samband/i });
    
    if (await contactLink.isVisible().catch(() => false)) {
      await contactLink.click();
      await expect(page).toHaveURL(/contact/);
      
      // Should have back button on contact page
      const backButton = page.locator("a, button").filter({ hasText: /back|til baka/i });
      await expect(backButton.first()).toBeVisible();
    }
  });

  test("should navigate to privacy page", async ({ page }) => {
    await page.goto("/privacy");
    
    // Page should load
    await expect(page.locator("h1, h2").first()).toBeVisible();
    
    // Should have back navigation
    const backLink = page.locator("a[href='/'], button").filter({ hasText: /back|til baka/i });
    if (await backLink.first().isVisible().catch(() => false)) {
      await backLink.first().click();
      await expect(page).toHaveURL("/");
    }
  });

  test("should navigate to cookies page", async ({ page }) => {
    await page.goto("/cookies");
    
    // Page should load
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
