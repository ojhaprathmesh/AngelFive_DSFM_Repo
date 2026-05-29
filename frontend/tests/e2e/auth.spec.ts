import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("Login page renders correctly and handles validation", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();

    // Check HTML5 validation (clicking submit empty)
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // The browser will prevent submission because of `required`,
    // so we just verify we remain on the login page
    await expect(page).toHaveURL(/.*login/);
  });

  test("Login form submission with mocked backend API", async ({ page }) => {
    // Mock the backend login endpoint
    await page.route("**/api/auth/login", async (route) => {
      // Return a successful response simulating our backend structure
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Invalid credentials",
        }),
      });
    });

    // We also mock Firebase's identitytoolkit to prevent it from failing
    // when it tries to consume our fake token, allowing the component to render its success state.
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          idToken: "mock-token",
          refreshToken: "mock-refresh-token",
          expiresIn: "3600",
          localId: "mock-uid",
        }),
      });
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");

    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // After failed login, it should stay on the page and show an error toast
    await expect(page).toHaveURL(/.*login/);

    // Wait for the error toast
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });

  test("Signup page renders and validates mismatched passwords", async ({
    page,
  }) => {
    await page.goto("/signup");

    // Check elements
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await page.getByLabel("Full Name").fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    // Deliberately mismatch password
    await page.getByLabel("Confirm Password").fill("password456");

    await page.getByRole("button", { name: "Create Account" }).click();

    // UI should handle validation error and prevent redirect
    await expect(page).toHaveURL(/.*signup/);
  });
});
