import { expect, test } from "@playwright/test";
test.beforeEach(async ({page}) => {
  await page.route("**/api/catalog/policies*", route => {
    const en = new URL(route.request().url()).searchParams.get("locale") === "en";
    return route.fulfill({json: {code: 200, data: {version: "web-account-2026-10-08", terms: {title: en ? "Terms of Service" : "用户协议", body: "Published terms"}, privacy: {title: en ? "Privacy policy" : "隐私政策", body: "Published privacy"}}}});
  });
});
test("email registration preserves the design and completes verification before creating an account", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path.endsWith("send-code")) expect(JSON.parse(route.request().postData()!).policyVersion).toBe("web-account-2026-10-08");
    await route.fulfill({
      json: {
        code: 200,
        data: path.endsWith("send-code")
          ? { retryAfter: 60 }
          : path.endsWith("verify-email")
            ? { registrationToken: "a".repeat(43), expiresIn: 600 }
            : {
                expiresIn: 28800,
                mustChangePassword: false,
                member: { id: "buyer" },
              },
      },
    });
  });
  await page.goto("/?auth=register");
  await expect(
    page.getByRole("heading", { name: "Create your account", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("buyer@test.com");
  await page.locator(".semi-checkbox").click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox" }),
  ).toBeVisible();
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Set your password" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("StrongPass123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("MismatchPass123!");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("alert")).toContainText("Passwords do not match");
  expect(requests).not.toContain("/api/auth/register");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("StrongPass123!");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect.poll(() => requests.includes("/api/auth/register")).toBe(true);
});
test("failed login retains form input and shows the backend error", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: {
        code: 40001,
        errorKey: "invalid_credentials",
        message: "The email or password is incorrect.",
      },
    }),
  );
  await page.goto("/?auth=login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("buyer@test.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue(
    "buyer@test.com",
  );
});
test("password recovery uses generic confirmation and has no demo reset button", async ({
  page,
}) => {
  await page.route("**/api/auth/forgot-password", (route) =>
    route.fulfill({
      json: { code: 200, data: { message: "reset_requested" } },
    }),
  );
  await page.goto("/?auth=forgot");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("unknown@test.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(
      "If this email is eligible, you will receive a password reset link. Check your spam folder too.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview the reset link" }),
  ).toHaveCount(0);
});
test("invalid reset tokens show an actionable expired state", async ({
  page,
}) => {
  await page.goto("/?auth=reset");
  await expect(
    page.getByRole("heading", { name: "This link has expired" }),
  ).toBeVisible();
});
test("mobile form fits and keeps 48px controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?auth=login");
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  expect(
    (await page.locator(".semi-input-wrapper").first().boundingBox())
      ?.height,
  ).toBe(48);
  expect(
    (
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .boundingBox()
    )?.height,
  ).toBe(48);
});
test("registration has a sign-in recovery exit after a lost successful response", async ({
  page,
}) => {
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/register")) {
      await route.abort("failed");
      return;
    }
    await route.fulfill({
      json: {
        code: 200,
        data: path.endsWith("send-code")
          ? { retryAfter: 60 }
          : { registrationToken: "a".repeat(43) },
      },
    });
  });
  await page.goto("/?auth=register");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("buyer@test.com");
  await page.locator(".semi-checkbox").click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("Verification code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.getByLabel("Password", { exact: true }).fill("StrongPass123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("StrongPass123!");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});


test("registration requires agreement before sending a code with Semi checkbox", async ({ page }) => {
  let sent = 0;
  await page.route("**/api/auth/register/send-code", r => { sent++; return r.fulfill({json: {code: 200, data: {retryAfter: 60}}}); });
  await page.goto("/?auth=register");
  await page.getByLabel("Email address", {exact: true}).fill("buyer@test.com");
  await page.getByRole("button", {name: "Continue with email"}).click();
  await expect(page.getByRole("alert")).toContainText("Read and accept");
  expect(sent).toBe(0);
  await page.getByRole("checkbox").focus();
  await page.getByRole("checkbox").press("Space");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", {name: "Continue with email"}).click();
  await expect.poll(() => sent).toBe(1);
});

for (const lang of ["zh", "en"] as const) {
  test(`authentication emails use the selected language (${lang})`, async ({page}) => {
    const sent: {locale?: string}[] = [];
    await page.route("**/api/auth/**", route => {
      sent.push(JSON.parse(route.request().postData() || "{}"));
      return route.fulfill({json: {code: 200, data: {retryAfter: 60}}});
    });
    await page.goto("/?auth=forgot&lang=" + (lang === "en" ? "zh" : "en"));
    await page.locator("header").getByRole("button", {name: /Language|语言/}).click();
    await page.getByText(lang === "en" ? "English" : "简体中文", {exact: true}).last().click();
    // A stale document attribute must not change the language selected in the UI.
    await page.evaluate(() => { document.documentElement.lang = "other"; });
    await page.locator('input[type="email"]').fill("buyer@test.com");
    await page.locator('button[type="submit"]').click();
    await expect.poll(() => sent[0]?.locale).toBe(lang);
  });
}
