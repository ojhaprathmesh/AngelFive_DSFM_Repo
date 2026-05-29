import { expect, test } from "@playwright/test";

// Before each test in this suite, we'll setup a mocked authenticated session
// Since our app checks localStorage and Firebase auth state, we'll mock the necessary APIs.
test.describe("Dashboard Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock the user profile API call to return a valid user profile
    await page.route("**/api/auth/user/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            uid: "mock-uid",
            email: "test@example.com",
            fullName: "Test User",
          },
        }),
      });
    });

    // 2. Mock market discovery API to prevent loading spinners forever
    await page.route("**/api/market/discovery", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mostBought: [
            { symbol: "RELIANCE", price: 2500, change: 10, changePercent: 0.4 },
          ],
          topGainers: [
            { symbol: "TCS", price: 3500, change: 50, changePercent: 1.4 },
          ],
          topLosers: [
            { symbol: "INFY", price: 1500, change: -20, changePercent: -1.3 },
          ],
          pocketFriendly: {
            under50: [
              { symbol: "IDEA", price: 12, change: 0.5, changePercent: 4.3 },
            ],
            under100: [
              { symbol: "SUZLON", price: 40, change: 1, changePercent: 2.5 },
            ],
            under200: [
              { symbol: "ZOMATO", price: 150, change: 5, changePercent: 3.4 },
            ],
          },
        }),
      });
    });

    // Mock performers API
    await page.route("**/api/market/performers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          performers: [{ symbol: "TATAMOTORS", price: 900, changePct: 5.5 }],
        }),
      });
    });

    // 3. Inject mock auth state into local storage so the client thinks we're logged in
    // Note: To fully bypass Firebase auth in a strict smoke test without a real login,
    // we would ideally dispatch a fake auth state. But since `useAuth` checks Firebase,
    // we just use the login page to establish state, or mock the context.
    // For this smoke test, we'll actually just run through the login flow quickly!

    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            token: "mock-jwt-token",
            user: {
              uid: "mock-uid",
              email: "test@example.com",
              fullName: "Test User",
            },
          },
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

    // Direct navigation, bypassing login due to NEXT_PUBLIC_E2E_TEST=true
    await page.goto("/dashboard/market");
  });

  test("Market Dashboard renders key sections", async ({ page }) => {
    // Check Navigation Bar
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByText("Market")).toBeVisible(); // The current tab
    await expect(page.getByRole("button", { name: "DSFM" })).toBeVisible();

    // Check Market Discovery Component Headers
    await expect(
      page.getByRole("heading", { name: "Most Bought Stocks" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Top Movers and Sectorwise Movements",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Top Performers" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pocket Friendly Stocks" }),
    ).toBeVisible();

    // Check that our mocked data rendered
    await expect(page.getByText("RELIANCE")).toBeVisible();
    await expect(page.getByText("TCS")).toBeVisible();
    await expect(page.getByText("IDEA")).toBeVisible();
  });
});
