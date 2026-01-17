import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GreenLeaf/);
  });

  test("should display strain catalog link", async ({ page }) => {
    await page.goto("/");
    const catalogLink = page.getByRole("link", { name: /catalog|shop|strains/i });
    await expect(catalogLink).toBeVisible();
  });
});

test.describe("Catalog", () => {
  test("should display strain cards or empty state", async ({ page }) => {
    await page.goto("/catalog");
    // Wait for either strain cards or empty state
    const strainCard = page.locator("[data-testid='strain-card']").first();
    const emptyState = page.getByText(/no strains|empty|no results/i);

    await expect(strainCard.or(emptyState)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Cart", () => {
  test("should show empty cart initially", async ({ page }) => {
    await page.goto("/cart");
    const emptyText = page.getByText(/empty|no items/i);
    await expect(emptyText).toBeVisible();
  });
});
