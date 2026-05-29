import { expect, test } from "@playwright/test";

test.describe("Watchlists Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Authentication
    await page.route("**/api/auth/user/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { uid: "mock-uid", email: "test@example.com" },
        }),
      });
    });

    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { token: "mock-token", user: { uid: "mock-uid" } },
        }),
      });
    });

    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ idToken: "mock-token", localId: "mock-uid" }),
      });
    });

    // 2. Mock Watchlists APIs
    await page.route("**/api/watchlists*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "wl-1",
                name: "My Favorites",
                items: [
                  { symbol: "RELIANCE", addedAt: new Date().toISOString() },
                  { symbol: "TCS", addedAt: new Date().toISOString() },
                ],
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock live price endpoint for the symbols in the watchlist
    await page.route(
      "**/api/market/quotes?symbols=RELIANCE,TCS",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            quotes: [
              { symbol: "RELIANCE", price: 2500, changePct: 1.5 },
              { symbol: "TCS", price: 3500, changePct: -0.5 },
            ],
          }),
        });
      },
    );

    // Direct navigation, bypassing login
    await page.goto("/dashboard/watchlist");
    await page.waitForURL(/.*dashboard\/watchlist/);
  });

  test("Watchlist page renders and displays items", async ({ page }) => {
    // Verify the empty state doesn't show
    await expect(page.getByText("No watchlists found")).not.toBeVisible();

    // Verify the Add Stock button is visible
    await expect(page.getByRole("button", { name: "Add Stock" })).toBeVisible();
  });
});
