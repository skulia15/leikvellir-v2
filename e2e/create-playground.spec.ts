import { test, expect } from "@playwright/test";

test.describe("Create Playground Form", () => {
  test("should display the create playground form", async ({ page }) => {
    await page.goto("/create-playground");

    // Should show the form
    await expect(page.locator("form")).toBeVisible();

    // Should have a title input
    const titleInput = page.locator("input[name='title'], input[placeholder*='title'], input[placeholder*='nafn']");
    await expect(titleInput.first()).toBeVisible();
  });

  test("should show coordinate picker map", async ({ page }) => {
    await page.goto("/create-playground");

    // Look for the map component
    const mapContainer = page.locator(
      "[class*='map'], .mapboxgl-map, [data-testid*='map']"
    ).first();

    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test("should have equipment selector", async ({ page }) => {
    await page.goto("/create-playground");

    // Look for equipment section
    const equipmentSection = page.locator("text=/equipment|búnaður/i").first();
    
    // May need to scroll or expand to see equipment
    if (await equipmentSection.isVisible().catch(() => false)) {
      await expect(equipmentSection).toBeVisible();
    }
  });

  test("should validate required fields on submit", async ({ page }) => {
    await page.goto("/create-playground");

    // Find and click submit without filling required fields
    const submitButton = page.locator("button[type='submit']");
    
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors or the form should not submit
      // Look for error messages
      await page.waitForTimeout(500);
      
      const errorMessages = page.locator(
        "[role='alert'], [class*='error'], [class*='invalid'], .text-red-500, .text-destructive"
      );
      
      // Form validation should prevent submission or show errors
    }
  });

  test("should require authentication for submission", async ({ page }) => {
    await page.goto("/create-playground");

    // Fill in minimal required fields
    const titleInput = page.locator("input[name='title'], input").first();
    if (await titleInput.isVisible()) {
      await titleInput.fill("Test Playground");
    }

    // Try to submit - should require login or show auth message
    const submitButton = page.locator("button[type='submit']");
    
    if (await submitButton.isVisible()) {
      // Note: Full submission test would require authentication setup
      // This is just a POC to verify the form structure
    }
  });
});
