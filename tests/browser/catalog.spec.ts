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
  albums: [],
  products: [product],
};
async function mockCatalog(page: Page) {
  await page.route("**/api/catalog/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/catalog/", "");
    let data: unknown;
    if(path === "home") data={hero:{},imageUrl:null,industries:[{code:"manufacturing",name:"Manufacturing"}],products:[product]};
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
    else if (path === "products" || path === "enterprises" || path === `enterprises/${enterpriseId}/products`)
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
  await page.getByRole("button", { name: "Language", exact: true }).click();
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
  await page.getByRole("button", { name: "Language", exact: true }).focus();
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
    page.getByRole("heading", { name: "Useful tools" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weight calculator" }),
  ).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
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

test("supplier products paginate and dimensions always resolve to a real variant",async({page})=>{
 await page.setExtraHTTPHeaders({"accept-language":"en"});await mockCatalog(page);
 await page.route(`**/api/catalog/products/${id}*`,r=>r.fulfill({json:{code:200,data:{...product,dimensionNames:["Size","Thread"],variants:product.variants.map((v,i)=>({...v,dimensionValues:[v.value,i?"G3/4":"G1/2"]}))}}}));
 await page.goto(`/products/${id}`);
 await page.getByRole("group",{name:"Size",exact:true}).getByRole("button",{name:"DN20",exact:true}).click();
 await expect(page.getByRole("group",{name:"Thread",exact:true}).getByRole("button",{name:"G3/4",exact:true})).toHaveAttribute("aria-pressed","true");
 await expect(page.getByText("Negotiable",{exact:true})).toBeVisible();
 await page.goto(`/suppliers/${enterpriseId}`);
 await page.getByRole("button",{name:"Products",exact:true}).click();
 const request=page.waitForRequest(r=>r.url().includes(`/enterprises/${enterpriseId}/products`)&&new URL(r.url()).searchParams.get("page")==="2");
 await page.getByRole("button",{name:"Next",exact:true}).click();await request;
 await noOverflow(page);
});
