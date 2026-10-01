import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });
test("production build loads without CSP or hydration errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  const response = await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("textbox").first()).toBeVisible();
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toContain("'nonce-");
  expect(csp).not.toContain("unsafe-eval");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/production-login.png",
    fullPage: true,
  });
});
test("health and mutation origin checks on real routes", async ({
  request,
}) => {
  const live = await request.get("/api/health/live");
  expect(live.status()).toBe(200);
  expect(live.headers()["cache-control"]).toBe("no-store");
  const me = await request.get("/api/auth/me");
  expect(me.status()).toBe(401);
  expect(me.headers()["cache-control"]).toBe("no-store");
  const bad = await request.post("/api/auth/login", {
    data: { email: "person@test.com", password: "password" },
    headers: { origin: "https://untrusted.test" },
  });
  expect(bad.status()).toBe(403);
});

test("client language navigation updates document and API locale", async ({
  page,
}) => {
  await page.goto("/portal/review/zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await page.locator("nav button").filter({ hasText: "ZH" }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/portal\/review\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const body = await page.evaluate(async () =>
    (
      await fetch("/api/auth/me", {
        headers: { "x-ui-locale": document.documentElement.lang },
      })
    ).json(),
  );
  expect(body.message).toMatch(/session|sign in/i);
});
test("portal child pages have distinct canonical and language links", async ({
  request,
}) => {
  for (const suffix of [
    "products",
    "products/part-1",
    "contact",
    "aboutus",
    "jobs",
  ]) {
    const response = await request.get(`/portal/review/en/${suffix}`);
    const html = await response.text();
    expect(html).toContain(
      `rel="canonical" href="http://127.0.0.1:4176/portal/review/en/${suffix}"`,
    );
    expect(html).toContain(
      `hrefLang="zh" href="http://127.0.0.1:4176/portal/review/zh/${suffix}"`,
    );
  }
});
test("existing OSS hero media is allowed by CSP", async ({ page }) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      if (e.violatedDirective === "media-src")
        document.body.dataset.mediaViolation = e.blockedURI;
    });
  });
  await page.route(
    "https://macheng123.oss-cn-hangzhou.aliyuncs.com/review.mp4",
    (route) =>
      route.fulfill({ status: 200, body: "fixture", contentType: "video/mp4" }),
  );
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /Content Security Policy.*media|media.*Content Security Policy/i.test(
        m.text(),
      )
    )
      violations.push(m.text());
  });
  const mediaRequest = page.waitForRequest(
    "https://macheng123.oss-cn-hangzhou.aliyuncs.com/review.mp4",
  );
  const response = await page.goto("/portal/review/en");
  expect(response!.headers()["content-security-policy"]).toContain(
    "media-src 'self' https://macheng123.oss-cn-hangzhou.aliyuncs.com",
  );
  await mediaRequest;
  expect(
    await page.locator("body").getAttribute("data-media-violation"),
  ).toBeNull();
  expect(violations).toEqual([]);
});
