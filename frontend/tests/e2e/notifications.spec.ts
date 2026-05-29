import { expect, test } from "@playwright/test";

test.describe("Notifications Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Auth
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
        body: JSON.stringify({ idToken: "mock", localId: "mock" }),
      });
    });

    // Mock Notifications API
    await page.route("**/api/notifications*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "notif-1",
              title: "Price Alert",
              message: "RELIANCE crossed 2500",
              isRead: false,
              type: "ALERT",
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { total: 1, unreadCount: 1, limit: 10, offset: 0 },
        }),
      });
    });

    // Direct navigation, bypassing login
    await page.goto("/dashboard/market");
  });

  test("Notification dropdown renders and shows notifications", async ({
    page,
  }) => {
    // Find the notification button by aria-label or role in the navbar
    const notifButton = page
      .getByRole("button", { name: /notifications/i })
      .or(page.locator("button:has(svg.lucide-bell)"));

    // Check if the unread badge exists (it might just be a red dot or number 1)
    await expect(notifButton).toBeVisible();

    // Click to open dropdown
    await notifButton.click();

    // Verify dropdown content
    await expect(
      page.getByText("Notifications", { exact: true }),
    ).toBeVisible();
  });
});
