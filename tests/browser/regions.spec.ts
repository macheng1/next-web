import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });
const node = (
  code: string,
  name: string,
  level: string,
  children: unknown[] = [],
) => ({ code, name, level, children });
const items = [
  node("320000", "江苏省", "province", [
    node("320200", "无锡市", "city", [node("320211", "滨湖区", "district")]),
  ]),
  node("440000", "广东省", "province", [node("441900", "东莞市", "city")]),
];
for (const width of [1280, 390])
  test(`region selection stores canonical codes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page
      .context()
      .addCookies([
        { name: "NEXT_LOCALE", value: "zh", url: "http://127.0.0.1:4176" },
      ]);
    await page.route("**/api/enterprise/applications/options", (r) =>
      r.fulfill({ json: { code: 200, data: { industries: [], scales: [] } } }),
    );
    await page.route("**/api/regions", (r) =>
      r.fulfill({ json: { code: 200, data: { items } } }),
    );
    await page.goto("/enterprise/apply?entry=miniapp");
    await page
      .getByTestId("cookie-consent")
      .getByRole("button", { name: "仅必要 Cookie", exact: true })
      .click();
    await page.locator("#region-0").click();
    await page.getByRole("option", { name: /江苏省$/ }).click();
    await page.locator("#region-1").click();
    await page.getByRole("option", { name: /无锡市$/ }).click();
    await page.locator("#region-2").click();
    await page.getByRole("option", { name: /滨湖区$/ }).click();
    await expect(page.locator("#region-2")).toContainText("滨湖区");
    await page.getByRole("button", { name: "保存草稿" }).click();
    const values = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.includes("enterprise"),
      );
      return key ? JSON.parse(localStorage.getItem(key)!) : null;
    });
    expect(values.values).toMatchObject({
      cityCode: "320200",
      adcode: "320211",
      cityName: "无锡市",
    });
    await page.locator("#region-0").click();
    await page.getByRole("option", { name: /广东省$/ }).click();
    await page.locator("#region-1").click();
    await page.getByRole("option", { name: /东莞市$/ }).click();
    await expect(page.locator("#region-1")).toContainText("东莞市");
    await expect(page.locator("#region-2")).toBeDisabled();
    await page.getByRole("button", { name: "保存草稿" }).click();
    const next = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.includes("enterprise"),
      );
      return key ? JSON.parse(localStorage.getItem(key)!) : null;
    });
    expect(next.values).toMatchObject({
      cityCode: "441900",
      adcode: "",
      cityName: "东莞市",
    });
    await page.reload();
    await page.getByRole("button", { name: "恢复草稿" }).click();
    await expect(page.locator("#region-1")).toContainText("东莞市");
    await page.screenshot({
      path: `test-results/regions-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
