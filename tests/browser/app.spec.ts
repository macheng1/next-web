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
  await page.route("**/api/catalog/**", (route) =>
    route.fulfill({
      json: {
        code: 200,
        data: route.request().url().includes("/home") ? {hero:{},imageUrl:null,industries:[],products:[]} : route.request().url().includes("/options")
          ? { categories: [], industries: [] }
          : { items: [], total: 0, page: 1, pageSize: 12 },
      },
    }),
  );
  const response = await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const csp = response!.headers()["content-security-policy"];
  expect(csp).toContain("'nonce-");
  expect(csp).not.toContain("unsafe-eval");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/production-foundation.png",
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

test("retired pages and portal endpoints return 404 without legacy redirects", async ({
  request,
}) => {
  for (const path of [
    "/portal/acme/zh",
    "/login",
    "/register",
    "/api/portal/acme/inquiry",
    "/api/upload/fileList",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});
