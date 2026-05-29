import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Accessibility (a11y) tests", () => {
  // Common paths to test
  const testPaths = [
    "/dashboard",
    "/dashboard/market",
    "/dashboard/dsfm",
    "/dashboard/watchlist",
  ];

  for (const path of testPaths) {
    test(`should not have any automatically detectable accessibility issues on ${path}`, async ({
      page,
    }) => {
      // Navigate to the page
      await page.goto(path);

      // Wait for page to finish loading animations/data fetching
      await page.waitForLoadState("networkidle");

      // Analyze page with AxeBuilder
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(["aria-hidden-focus", "color-contrast"])
        .analyze();

      // Assert that there are no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
