import { expect, test } from "@playwright/test";
test.beforeEach(async ({page}) => {
  await page.route("**/api/catalog/policies*", route => {
    const en = new URL(route.request().url()).searchParams.get("locale") === "en";
    return route.fulfill({json: {code: 200, data: {version: "web-account-2026-10-08", terms: {title: en ? "Terms of Service" : "用户协议", body: "Published terms"}, privacy: {title: en ? "Privacy policy" : "隐私政策", body: "Published privacy"}}}});
  });
});
test.use({ baseURL: "http://127.0.0.1:4176" });
for (const locale of ["en", "zh"] as const) {
  test(`actual ${locale} auth pages match the layout and contain no third-party entry`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", message => {if(message.type() === "error") errors.push(message.text());});
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176" },
    ]);
    await page.goto("/login");
    await page
      .getByRole("button", {
        name: locale === "en" ? "Necessary only" : "仅必要 Cookie",
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: locale === "en" ? "Welcome back" : "欢迎回来",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Google|Microsoft/ }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator("footer")).toContainText("© ManuLink");
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/web-auth-implementation/login-${locale}-desktop.png`,
      fullPage: true,
    });
    await page.goto("/register");
    await expect(
      page.getByRole("heading", {
        name: locale === "en" ? "Create your account" : "创建你的账号",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/web-auth-implementation/register-${locale}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/web-auth-implementation/register-${locale}-mobile.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
  });
}
test("actual reset and account routes have the correct states and response headers", async ({
  page,
}) => {
  const response = await page.goto("/reset-password");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    page.getByRole("heading", { name: /This link has expired|重置链接已失效/ }),
  ).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?reason=expired/);
});

for (const lang of ["zh", "en"] as const) {
 test(`reset email link sets ${lang} once and leaves later language selection usable`, async ({page}) => {
  await page.goto(`/reset-password?token=invalid&lang=${lang}`);
  await expect(page.locator("html")).toHaveAttribute("lang",lang);
  await expect(page).not.toHaveURL(/lang=/);
  await expect(page).toHaveURL(/token=invalid/);
  await page.locator("header").getByRole("button", {name: /Language|语言/}).click();
  await page.getByText(lang === "en" ? "简体中文" : "English", {exact: true}).last().click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang === "en" ? "zh" : "en");
 });
}

for (const locale of ["zh", "en"] as const) {
 test(`published policies have complete public pages (${locale})`, async ({page, context}) => {
  await context.addCookies([{name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176"}]);
  for (const [path, title, body] of [["terms", locale === "en" ? "Terms of Service" : "用户协议", "Published terms"], ["privacy", locale === "en" ? "Privacy policy" : "隐私政策", "Published privacy"]]) {
   await page.goto("/" + path);
   await expect(page.getByRole("heading", {name: title, exact: true})).toBeVisible();
   await expect(page.getByText(body, {exact: true})).toBeVisible();
   await expect(page.getByText(/web-account-2026-10-08/)).toBeVisible();
  }
 });
}

test("published policy HTML renders headings and lists rather than raw tags", async ({page}) => {
  await page.route("**/api/catalog/policies*", route => route.fulfill({json: {code: 200, data: {version: "web-rich-v1", terms: {title: "Terms of Service", format: "html", body: '<h2>Account use</h2><p>Keep your account secure.</p><ul><li>Verify your email</li><li>Protect your password</li></ul>'}, privacy: {title: "Privacy policy", format: "html", body: '<h2>Data use</h2><p>Your selected supplier receives the inquiry.</p>'}}}}));
  await page.goto("/terms");
  await expect(page.getByRole("heading", {name: "Account use", exact: true})).toBeVisible();
  await expect(page.locator("article li")).toHaveCount(2);
  await expect(page.locator(".policy-rich-text")).toBeVisible();
  await page.screenshot({path: '/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/policy-drafts/rich-text-verification.png', fullPage: true});
});
