import { test, expect, type Page } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });
const enterpriseId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const product = {
  id,
  name: "Precision steel union / 精密钢制活接",
  images: [],
  category: "Pipe fittings",
  enterprise: {
    id: enterpriseId,
    name: "Example Precision",
    city: "Suzhou",
    logoUrl: null,
  },
  description: "Manufactured stainless component.",
  unit: "pcs",
  brand: null,
  attributes: [{ name: "Material", value: "Stainless steel 304" }],
  variantName: "Size",
  variants: [
    {
      id: "v1",
      value: "DN15",
      imageUrl: null,
      price: "USD 10 / pcs",
      minOrder: "100 pcs",
    },
    {
      id: "v2",
      value: "DN20",
      imageUrl: null,
      price: "Negotiable",
      minOrder: "200 pcs",
    },
  ],
};
const enterprise = {
  ...product.enterprise,
  description: "Precision manufacturing",
  address: "Suzhou Industrial Park",
  foundedYear: 2010,
  capabilities: [{code:"cnc",name:"CNC machining"}],
  categories: [{id:"22222222-2222-4222-8222-222222222222",name:"Fittings",count:25}],
  albums: [],
  products: [product],
};
async function mockCatalog(page: Page) {
  await page.route("**/api/catalog/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/catalog/", "");
    let data: unknown;
    if (path === "footer") data = {};
    else if (path === "home")
      data = {
        hero: {},
        imageUrl: null,
        industries: [{ code: "manufacturing", name: "Manufacturing" }],
        products: [product],
      };
    else if (path === "options")
      data = {
        categories: ["Pipe fittings", "Precision parts"],
        categoryCounts: { "Pipe fittings": 1 },
        facets: {
          material: [{ value: "Stainless steel 304", count: 1 }],
          connection: [{ value: "Threaded", count: 1 }],
          size: [{ value: "DN15", count: 1 }],
        },
        industries: [{ code: "manufacturing", name: "Manufacturing" }],
      };
    else if (path === `products/${id}`) data = product;
    else if (path === `enterprises/${enterpriseId}`) data = enterprise;
    else if (
      path === "products" ||
      path === "enterprises" ||
      path === `enterprises/${enterpriseId}/products`
    )
      data = {
        items:
          url.searchParams.get("q") === "missing"
            ? []
            : [path === "enterprises" ? enterprise : product],
        total: url.searchParams.get("q") === "missing" ? 0 : 25,
        page: Number(url.searchParams.get("page") || 1),
        pageSize: 12,
      };
    else
      return route.fulfill({
        status: 404,
        json: { code: 404, message: "Unavailable" },
      });
    await route.fulfill({ json: { code: 200, data } });
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("four-page desktop journey, URL filters, variants and language dropdown", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  await mockCatalog(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Find reliable manufacturing products and suppliers",
  );
  await page.getByRole("search").getByRole("textbox").fill("steel");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/products\?q=steel/);
  await expect(page.getByText("25 results")).toBeVisible();
  await page
    .getByRole("button", { name: "Pipe fittings 1", exact: true })
    .click();
  await expect(page).toHaveURL(/category=Pipe/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page
    .getByRole("link", { name: "View details →", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    product.name,
  );
  await page.getByRole("button", { name: "DN20", exact: true }).click();
  await expect(page.getByText("Negotiable", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "View supplier homepage →", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Example Precision",
  );
  await page
    .getByRole("button", { name: "Company profile", exact: true })
    .click();
  await expect(page.getByText("Suzhou Industrial Park")).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "Language", exact: true })
    .click();
  await page.getByText("简体中文", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(
    page.getByRole("button", { name: "企业资料", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});
test("mobile navigation, filter sheet, all four layouts and empty search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .context()
    .addCookies([
      { name: "NEXT_LOCALE", value: "zh", url: "http://127.0.0.1:4176" },
    ]);
  await mockCatalog(page);
  await page.goto("/");
  await noOverflow(page);
  await page.getByRole("button", { name: "菜单", exact: true }).click();
  await page
    .locator("#catalog-mobile-menu")
    .getByRole("link", { name: "产品", exact: true })
    .click();
  await expect(page).toHaveURL(/products/);
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Pipe fittings 1", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("link", { name: "查看详情 →", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    product.name,
  );
  await noOverflow(page);
  await page
    .getByRole("link", { name: "查看企业主页 →", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    enterprise.name,
  );
  await noOverflow(page);
  await page.goto("/products?q=missing");
  await expect(
    page.getByRole("heading", { name: "暂无搜索结果" }),
  ).toBeVisible();
  await noOverflow(page);
});
test("failure retry, absent record, invalid route and no exposed private endpoint", async ({
  page,
  request,
}) => {
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  await mockCatalog(page);
  let failed = true;
  await page.route("**/api/catalog/products?*", (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { code: 503 } }
        : {
            json: {
              code: 200,
              data: { items: [product], total: 1, page: 1, pageSize: 12 },
            },
          },
    ),
  );
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "Unable to load this content" }),
  ).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(product.name, { exact: true })).toBeVisible();
  await page.goto("/products/33333333-3333-4333-8333-333333333333");
  await expect(
    page.getByRole("heading", { name: "This page is unavailable" }),
  ).toBeVisible();
  const response = await request.get("/products/not-a-uuid");
  expect(response.status()).toBe(404);
  const bad = await request.get("/api/catalog/admin/users");
  expect(bad.status()).toBe(404);
});
for (const width of [320, 768, 1440]) {
  for (const locale of ["zh", "en"]) {
    test(`four responsive pages ${locale} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page
        .context()
        .addCookies([
          { name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176" },
        ]);
      await mockCatalog(page);
      for (const path of [
        "/",
        "/products",
        `/products/${id}`,
        `/suppliers/${enterpriseId}`,
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await noOverflow(page);
      }
      if (width === 320)
        await expect(
          page.locator("header").getByRole("link", {
            name: locale === "zh" ? "企业入驻" : "Join as supplier",
            exact: true,
          }),
        ).not.toBeVisible();
    });
  }
}
test("supplier search uses enterprise API and language menu supports keyboard", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/");
  await page
    .locator("header")
    .getByRole("button", { name: "Language", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "简体中文", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/suppliers?q=Example");
  await expect(
    page.getByRole("heading", { name: "Example Precision" }),
  ).toBeVisible();
});

test("approved design regions and parameter filters stay usable", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  await mockCatalog(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "How it works", exact:true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Featured products", exact:true }),
  ).toBeVisible();
  await expect(page.locator('a[href="/enterprise/apply"]')).toHaveCount(0);
  await page.goto("/products");
  await page.getByRole("checkbox", { name: "Stainless steel 304" }).focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/material=Stainless/);
  await page.getByText("Threaded", { exact: true }).click();
  await expect(page).toHaveURL(/connection=Threaded/);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page).not.toHaveURL(/material=/);
  await page.goto(`/products/${id}`);
  await expect(
    page.getByRole("spinbutton", { name: "Quantity", exact: true }),
  ).toHaveValue("100");
  await page
    .getByRole("button", { name: "Increase quantity", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Quantity", exact: true }),
  ).toHaveValue("101");
  await page
    .getByRole("button", { name: "Decrease quantity", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Quantity", exact: true }),
  ).toHaveValue("100");
  await expect(page.getByText("Main products", { exact: true })).toBeVisible();
  await page.goto(`/suppliers/${enterpriseId}`);
  await expect(
    page.getByRole("heading", { name: "Manufacturing capabilities" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Contact supplier" }),
  ).toBeVisible();
});

test("supplier products paginate and dimensions always resolve to a real variant", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  await mockCatalog(page);
  await page.route(`**/api/catalog/products/${id}*`, (r) =>
    r.fulfill({
      json: {
        code: 200,
        data: {
          ...product,
          dimensionNames: ["Size", "Thread"],
          variants: product.variants.map((v, i) => ({
            ...v,
            dimensionValues: [v.value, i ? "G3/4" : "G1/2"],
          })),
        },
      },
    }),
  );
  await page.goto(`/products/${id}`);
  await page
    .getByRole("group", { name: "Size", exact: true })
    .getByRole("button", { name: "DN20", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Thread", exact: true })
      .getByRole("button", { name: "G3/4", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Negotiable", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Thread", exact: true })
      .getByRole("button", { name: "G1/2", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("group", { name: "Size", exact: true })
      .getByRole("button", { name: "DN20", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(`/suppliers/${enterpriseId}`);
  await page.getByRole("button", { name: "Products", exact: true }).click();
  const request = page.waitForRequest(
    (r) =>
      r.url().includes(`/enterprises/${enterpriseId}/products`) &&
      new URL(r.url()).searchParams.get("page") === "2",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await request;
  await noOverflow(page);
});

for (const locale of ["zh", "en"] as const) {
  test(`dependent dimensions preserve parent choices and compatible values (${locale})`, async ({ page }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176" }]);
    await page.setExtraHTTPHeaders({ "accept-language": locale });
    await mockCatalog(page);
    await page.route(`**/api/catalog/products/${id}*`, (r) => r.fulfill({
      json: { code: 200, data: {
        ...product,
        dimensionNames: ["Size", "Thread", "Material"],
        variants: [
          { ...product.variants[0], dimensionValues: ["6 mm", "G1/8", "Steel"] },
          { ...product.variants[0], id: "v2", dimensionValues: ["6 mm", "G1/4", "Brass"], price: "Price B" },
          { ...product.variants[0], id: "v3", dimensionValues: ["8 mm", "G1/4", "Brass"], price: "Price C" },
          { ...product.variants[0], id: "v4", dimensionValues: ["8 mm", "G3/8", "Steel"], price: "Price D" },
        ],
      } },
    }));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/products/${id}`);
      const option = (group: string, name: string) => page.getByRole("group", { name: group, exact: true }).getByRole("button", { name, exact: true });
      await expect(option("Thread", "G3/8")).toBeDisabled();
      await option("Thread", "G1/4").click();
      await expect(option("Size", "6 mm")).toHaveAttribute("aria-pressed", "true");
      await expect(option("Material", "Brass")).toHaveAttribute("aria-pressed", "true");
      await expect(option("Material", "Steel")).toBeDisabled();
      await expect(page.getByText("Price B", { exact: true })).toBeVisible();
      await option("Size", "8 mm").click();
      await expect(option("Thread", "G1/4")).toHaveAttribute("aria-pressed", "true");
      await expect(option("Material", "Brass")).toHaveAttribute("aria-pressed", "true");
      await expect(option("Thread", "G1/8")).toBeDisabled();
      await expect(page.getByText("Price C", { exact: true })).toBeVisible();
      await option("Thread", "G3/8").click();
      await expect(option("Size", "8 mm")).toHaveAttribute("aria-pressed", "true");
      await expect(option("Material", "Steel")).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("Price D", { exact: true })).toBeVisible();
      await noOverflow(page);
    }
  });
}

for (const locale of ["zh","en"] as const) {
  test(`shared footer navigation and mobile layout (${locale})`, async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([
        { name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176" },
      ]);
    await page.setExtraHTTPHeaders({ "accept-language": locale });
    await mockCatalog(page);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const footer = page.getByRole("contentinfo");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer.locator('a[href="/enterprise/apply"]')).toHaveCount(0);
      await expect(footer.locator('a[href="/enterprise/apply"]')).toHaveCount(0);
      await expect(footer.locator('a[href="/products"]')).toBeVisible();
      await expect(footer.locator('a[href="/suppliers"]')).toBeVisible();
      await expect(footer).toContainText("©");
      await noOverflow(page);
      if (width === 320 || width === 1440)
        await footer.screenshot({
          path: test.info().outputPath(`footer-${locale}-${width}.png`),
        });
    }
    await page.getByRole("contentinfo").locator('a[href="/products"]').click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("contentinfo").locator('a[href="/enterprise/apply"]')).toHaveCount(0);
  });
}

test("footer consumes published localized configuration and renders social links", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.route("**/api/catalog/footer*", (route) => {
    const en =
      new URL(route.request().url()).searchParams.get("locale") === "en";
    return route.fulfill({
      json: {
        code: 200,
        data: {
          tagline: en ? "Configured tagline" : "配置标语",
          description: en ? "Configured description" : "配置介绍",
          companyName: en ? "Configured Company" : "配置公司",
          year: 2026,
          groups: [
            {
              title: en ? "Custom navigation" : "自定义导航",
              links: [
                { label: en ? "Catalog" : "产品目录", href: "/products" },
              ],
            },
          ],
          socialLinks: {
            x: "https://x.com/example",
            instagram: "https://www.instagram.com/example",
          },
        },
      },
    });
  });
  await page
    .context()
    .addCookies([
      { name: "NEXT_LOCALE", value: "en", url: "http://127.0.0.1:4176" },
    ]);
  await page.goto("/");
  await page
    .getByTestId("cookie-consent")
    .getByRole("button", { name: "Necessary only", exact: true })
    .click();
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Configured Company");
  await expect(footer).toContainText("Configured tagline");
  await expect(
    footer.getByRole("link", { name: "X", exact: true }),
  ).toHaveAttribute("href", "https://x.com/example");
  await expect(
    footer.getByRole("link", { name: "Instagram", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    footer.getByRole("img", { name: "ManuLink", exact: true }),
  ).toHaveAttribute("src", "/brand/logo-en-white.svg");
  await footer.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("menuitem", { name: "简体中文", exact: true }).click();
  await expect(footer).toContainText("配置公司");
  await expect(
    footer.getByRole("img", { name: "制造帮", exact: true }),
  ).toHaveAttribute("src", "/brand/logo-zh-white.svg");
});

// Browser translation can wrap menu text outside React's ownership.
// Changing the selected icon must not insert nodes next to a replaced text node.
test("language selection tolerates translated menu text and closes the menu", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setExtraHTTPHeaders({ "accept-language": "zh" });
  await mockCatalog(page);
  await page
    .context()
    .addCookies([
      { name: "NEXT_LOCALE", value: "zh", url: "http://127.0.0.1:4176" },
    ]);
  await page.goto("/");
  await page
    .locator("header")
    .getByRole("button", { name: "语言", exact: true })
    .click();
  const english = page.getByRole("menuitem", { name: "English", exact: true });
  await english.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      if (!node.textContent?.trim()) continue;
      const translated = document.createElement("font");
      translated.textContent = node.textContent;
      node.replaceWith(translated);
    }
  });
  await english.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Find reliable manufacturing products and suppliers",
  );
  await expect(page.getByRole("menu")).toBeHidden();
  expect(errors).toEqual([]);
  await page
    .locator("header")
    .getByRole("button", { name: "Language", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "简体中文", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "发现优质工业产品，连接专业制造企业",
  );
  await expect(page.getByRole("menu")).toBeHidden();
  expect(errors).toEqual([]);
});

test("catalog height fills tall viewports and long content scrolls naturally", async ({
  page,
}) => {
  await mockCatalog(page);
  for (const height of [900, 1352]) {
    await page.setViewportSize({ width: 1440, height });
    await page.goto("/products?category=missing&q=missing");
    await expect(
      page.getByRole("heading", { name: /No results found|暂无搜索结果/ }),
    ).toBeVisible();
    const footer = await page.getByRole("contentinfo").boundingBox();
    expect(footer).not.toBeNull();
    const documentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(footer!.y + footer!.height).toBeGreaterThanOrEqual(height - 1);
    expect(
      Math.abs(footer!.y + footer!.height - documentHeight),
    ).toBeLessThanOrEqual(1);
    if (height === 1352)
      expect(Math.abs(footer!.y + footer!.height - height)).toBeLessThanOrEqual(
        1,
      );
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const footer = await page.getByRole("contentinfo").boundingBox();
  expect(footer!.y + footer!.height).toBeGreaterThan(667);
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await noOverflow(page);
});

test("navigation loading survives browser translation and repeated header navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockCatalog(page);
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/catalog/products?**", async (route) => {
    await responseGate;
    await route.fulfill({
      json: {
        code: 200,
        data: { items: [product], total: 1, page: 1, pageSize: 12 },
      },
    });
  });
  await page.goto("/products");
  await expect(page.locator("html")).toHaveAttribute("translate", "no");
  await expect(page.locator('meta[name="google"]')).toHaveAttribute(
    "content",
    "notranslate",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Loading|正在加载/ })
      .first(),
  ).toBeVisible();
  // Model translation extensions replacing text nodes, honoring the HTML translate policy.
  await page.evaluate(() => {
    for (const element of document.querySelectorAll('[role="status"]')) {
      if (element.closest('[translate="no"]')) continue;
      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim())
          continue;
        const font = document.createElement("font");
        font.textContent = node.textContent;
        node.replaceWith(font);
      }
    }
  });
  release();
  await expect(
    page.getByRole("link", { name: product.name, exact: true }),
  ).toBeVisible();
  for (const href of [
    "/suppliers",
    "/#how",
    "/products",
    "/suppliers",
    "/#how",
  ]) {
    await page.locator(`header a[href="${href}"]`).click();
    if (href.includes("#"))
      await expect(page.locator("#how")).toBeVisible();
    else await expect(page.locator("main h1")).toBeAttached();
  }
  expect(errors).toEqual([]);
});

test("homepage renders the industry icon configured by operations", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  await mockCatalog(page);
  await page.route("**/api/catalog/home*", (route) =>
    route.fulfill({
      json: {
        code: 200,
        data: {
          hero: {},
          industries: [
            {
              code: "machinery",
              name: "Machinery & Equipment",
              badge: "机",
              badgeImage: "https://img.shopai.org.cn/test-industry.png",
            },
          ],
          products: [],
        },
      },
    }),
  );
  await page.route("https://img.shopai.org.cn/test-industry.png", (route) =>
    route.fulfill({
      path: "public/catalog/industrial-hero.webp",
      contentType: "image/webp",
    }),
  );
  await page.goto("/");
  const industry = page.getByRole("link", { name: "Machinery & Equipment" });
  await expect(industry).toBeVisible();
  await expect(industry.locator("img")).toHaveAttribute("alt", "");
  await expect
    .poll(() =>
      industry
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
});
test("homepage falls back to the industry badge when its uploaded image fails", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.route("**/api/catalog/home*", (route) =>
    route.fulfill({
      json: {
        code: 200,
        data: {
          hero: {},
          industries: [
            {
              code: "manufacturing",
              name: "Manufacturing",
              badge: "制",
              badgeImage: "https://img.shopai.org.cn/missing-industry.png",
            },
          ],
          products: [],
        },
      },
    }),
  );
  await page.route("https://img.shopai.org.cn/missing-industry.png", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/");
  const industry = page.getByRole("link", {
    name: "Manufacturing",
    exact: true,
  });
  await expect(industry.getByText("制", { exact: true })).toBeVisible();
  await expect(industry.locator("img")).toHaveCount(0);
});

for (const width of [1280, 390]) {
  test(`supplier rows show public company metadata and paginate at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setExtraHTTPHeaders({ "accept-language": "en" });
    await mockCatalog(page);
    await page.route("**/api/catalog/enterprises?**", async (route) => {
      const url = new URL(route.request().url());
      const current = Number(url.searchParams.get("page") || 1);
      const row = {
        ...enterprise,
        industryName: "Manufacturing",
        scaleCode: "lt50",
        foundedYear: 2010,
      };
      await route.fulfill({
        json: {
          code: 200,
          data: {
            items:
              current === 1
                ? [
                    row,
                    {
                      ...row,
                      id: "33333333-3333-4333-8333-333333333333",
                      name: "Second manufacturer",
                    },
                  ]
                : [{ ...row, name: "Page two manufacturer" }],
            total: 25,
            page: current,
            pageSize: 12,
          },
        },
      });
    });
    await page.goto("/suppliers?industry=manufacturing&q=steel");
    await expect(
      page.getByRole("heading", { name: "Second manufacturer" }),
    ).toBeVisible();
    const rows = page.locator("main article");
    const first = await rows.nth(0).boundingBox();
    const second = await rows.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
    expect(Math.abs(second!.x - first!.x)).toBeLessThan(1);
    expect(first!.width).toBeGreaterThan(width === 1280 ? 650 : 300);
    await expect(
      rows.first().getByText("Under 50", { exact: true }),
    ).toBeVisible();
    await expect(rows.first().getByText("2010", { exact: true })).toBeVisible();
    await expect(
      rows.first().getByText("Manufacturing", { exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page
      .getByRole("navigation", { name: "Page", exact: true })
      .getByRole("button", { name: "2", exact: true })
      .click();
    await expect(page).toHaveURL(/page=2/);
    expect(new URL(page.url()).searchParams.get("industry")).toBe(
      "manufacturing",
    );
    expect(new URL(page.url()).searchParams.get("q")).toBe("steel");
    await expect(
      page.getByRole("heading", { name: "Page two manufacturer" }),
    ).toBeVisible();
    await page.getByRole("search").getByRole("textbox").fill("new query");
    await page
      .getByRole("search")
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(page).not.toHaveURL(/page=2/);
    await expect(
      page.getByRole("heading", { name: "Second manufacturer" }),
    ).toBeVisible();
    await noOverflow(page);
  });
}

test("supplier category resets pagination and company profile shows the full introduction",async({page})=>{
 await page.setExtraHTTPHeaders({"accept-language":"en"}); await mockCatalog(page);
 await page.goto(`/suppliers/${enterpriseId}`);
 await page.getByRole('button',{name:'Products',exact:true}).click();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 const request=page.waitForRequest(r=>new URL(r.url()).searchParams.has('enterpriseCategoryId'));
 await page.getByRole('button',{name:'Fittings (25)',exact:true}).click();
 const url=new URL((await request).url());expect(url.searchParams.get('page')).toBe('1');
 await page.getByRole('button',{name:'Company profile',exact:true}).click();
 await expect(page.getByRole('heading',{name:'About the company',exact:true})).toBeVisible();
 await expect(page.getByText('Precision manufacturing',{exact:true}).last()).toBeVisible();
 await noOverflow(page);
});
test("empty supplier sections are hidden while the products tab remains available",async({page})=>{
 await page.setExtraHTTPHeaders({"accept-language":"en"}); await mockCatalog(page);
 await page.route(`**/api/catalog/enterprises/${enterpriseId}?**`,r=>r.fulfill({json:{code:200,data:{...enterprise,products:[],capabilities:[],categories:[],description:null}}}));
 await page.goto(`/suppliers/${enterpriseId}`);
 await expect(page.getByRole('heading',{name:'Manufacturing capabilities',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Main products',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Products',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Products from this supplier',exact:true})).toBeVisible();
});

test("public product cards have no pricing placeholder and supplier inquiry entries are live", async ({page}) => {
  await page.setExtraHTTPHeaders({"accept-language": "en"});
  await mockCatalog(page);
  await page.goto("/");
  await expect(page.getByText("Request pricing", {exact: true})).toHaveCount(0);
  await page.goto(`/suppliers/${enterpriseId}`);
  await expect(page.getByText("Coming soon", {exact: true})).toHaveCount(0);
  await expect(page.locator(`a[href="/buyer/inquiries/new?enterpriseId=${enterpriseId}"]`).first()).toBeVisible();
});

test("medium desktop widths keep sign-in navigation visible", async ({page}) => {
 await page.setExtraHTTPHeaders({"accept-language":"en"});await mockCatalog(page);
 for (const width of [1024, 1152, 1279]) {
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.locator('header a[href="/login"]')).toBeVisible();
  await noOverflow(page);
 }
});
for (const unit of ['公斤', 'Kilograms']) {
 test(`quantity accepts fractions for normalized kg despite display unit ${unit}`, async ({page}) => {
  await page.setExtraHTTPHeaders({"accept-language":"en"});await mockCatalog(page);
  await page.route(`**/api/catalog/products/${id}*`, route => route.fulfill({json:{code:200,data:{...product,unit,variants:product.variants.map(v=>({...v,unit:'kg'}))}}}));
  await page.goto(`/products/${id}`);
  const input=page.getByLabel('Quantity',{exact:true});await input.fill('0.5');await input.blur();
  await expect.poll(async () => Number(await input.inputValue())).toBe(0.5);
  await expect(input).toHaveAttribute('aria-valuenow','0.5');
 });
}
