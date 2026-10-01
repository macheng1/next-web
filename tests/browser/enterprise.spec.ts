import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });
const options = {
  countries: [{ code: "CN", name: "中国大陆" }],
  industries: [{ code: "manufacturing", name: "制造业" }],
  scales: [{ code: "lt50", name: "50人以下" }],
};
for (const viewport of [
  { name: "web", width: 1280, height: 900 },
  { name: "h5", width: 390, height: 844 },
]) {
  test(`${viewport.name}: enterprise application validates, saves a safe draft and retries the same application`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page
      .context()
      .addCookies([
        { name: "NEXT_LOCALE", value: "zh", url: "http://127.0.0.1:4176" },
      ]);
    await page.route("**/api/enterprise/applications/options", (r) =>
      r.fulfill({ json: { code: 200, data: options } }),
    );
    await page.route("**/api/upload/web-file", (r) =>
      r.fulfill({
        json: {
          code: 200,
          data: {
            originalName: "license.pdf",
            objectKey: "dev/license.pdf",
            url: "https://files.example.com/license.pdf",
            size: 100,
          },
        },
      }),
    );
    await page.route("**/api/enterprise/applications/sms", (r) =>
      r.fulfill({ json: { code: 200, data: { success: true } } }),
    );
    const submitted: Record<string, unknown>[] = [];
    await page.route("**/api/enterprise/applications", async (r) => {
      submitted.push(r.request().postDataJSON());
      await r.fulfill(
        submitted.length === 1
          ? { status: 503, json: { code: 503, message: "暂时不可用" } }
          : {
              json: {
                code: 200,
                data: {
                  applicationId: "application-test-001",
                  status: "pending",
                },
              },
            },
      );
    });
    await page.goto(
      viewport.name === "h5"
        ? "/enterprise/apply?entry=miniapp"
        : "/enterprise/apply",
    );
    if (viewport.name === "h5")
      await expect(page.getByRole("link", { name: "返回首页" })).toHaveCount(0);
    await expect(page.locator("aside")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/enterprise-public-${viewport.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("请检查");
    for (const [id, value] of Object.entries({
      companyName: "测试企业",
      creditCode: "91320000123456789A",
      contactName: "测试联系人",
      contactPhone: "13800138000",
      email: "review@example.com",
      registeredAddress: "测试注册地址",
    }))
      await page.locator(`#${id}`).fill(value);
    await page.locator("#industryCode").click();
    await page.getByRole("option", { name: "制造业" }).click();
    await page.locator("#scaleCode").click();
    await page.getByRole("option", { name: "50人以下" }).click();
    await expect(page.locator("#scaleCode")).toContainText("50人以下");
    await page.getByRole("button", { name: "保存草稿" }).click();
    await page.reload();
    await page.getByRole("button", { name: "恢复草稿" }).click();
    await expect(page.locator("#companyName")).toHaveValue("测试企业");
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("营业执照");
    await page.locator('input[type="file"]').setInputFiles({
      name: "license.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    await expect(page.getByText("license.pdf", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "获取验证码" }).click();
    await page.locator("#smsCode").fill("984572");
    await page.getByText("我确认有权代表本企业", { exact: false }).click();
    await expect(page.getByRole("checkbox")).toBeChecked();
    await page.getByRole("button", { name: "保存草稿" }).click();
    const draft = await page.evaluate(() =>
      localStorage.getItem("enterprise-application-draft-v1"),
    );
    expect(draft).not.toContain("smsCode");
    expect(draft).not.toContain("984572");
    await page.getByRole("button", { name: "提交入驻申请" }).click();
    await expect(page.locator("main [role=alert]")).toBeVisible();
    await page.getByRole("button", { name: "提交入驻申请" }).click();
    await expect(
      page.getByRole("heading", { name: "申请已提交" }),
    ).toBeVisible();
    await expect(
      page.getByText("草稿已保存在此浏览器", { exact: false }),
    ).not.toBeVisible();
    expect(submitted.length).toBe(2);
    expect(submitted[0].requestId).toBe(submitted[1].requestId);
    expect(submitted[1].countryCode).toBe("CN");
    if (viewport.name === "h5")
      await expect(page.getByRole("link", { name: "返回首页" })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("enterprise-application-draft-v1"),
      ),
    ).toBeNull();
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/enterprise-success-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
test("mobile English form has no overflow and options failure can recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setExtraHTTPHeaders({ "accept-language": "en" });
  let calls = 0;
  await page.route("**/api/enterprise/applications/options", (r) =>
    r.fulfill(
      ++calls === 1
        ? { status: 503, json: { code: 503, message: "Unavailable" } }
        : { json: { code: 200, data: options } },
    ),
  );
  await page.goto("/enterprise/apply");
  await expect(
    page.getByRole("button", { name: "Reload options" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload options" }).click();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "企业入驻", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await page.screenshot({
    path: "test-results/enterprise-mobile.png",
    fullPage: true,
  });
});

for (const width of [320, 390, 768, 1280]) {
  for (const locale of ["zh", "en"]) {
    test(`enterprise responsive layout: ${locale} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page
        .context()
        .addCookies([
          { name: "NEXT_LOCALE", value: locale, url: "http://127.0.0.1:4176" },
        ]);
      await page.route("**/api/enterprise/applications/options", (r) =>
        r.fulfill({ json: { code: 200, data: options } }),
      );
      await page.goto("/enterprise/apply?entry=miniapp");
      const save = page.getByRole("button", {
        name: locale === "zh" ? "保存草稿" : "Save draft",
        exact: true,
      });
      const next = page.getByRole("button", {
        name: locale === "zh" ? "下一步" : "Next",
        exact: true,
      });
      await expect(next).toBeEnabled();
      const a = await save.boundingBox();
      const b = await next.boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
      expect(b!.x).toBeGreaterThanOrEqual(a!.x + a!.width);
      expect(a!.height).toBeGreaterThanOrEqual(44);
      expect(b!.height).toBeGreaterThanOrEqual(44);
      const name = await page.locator("#contactName").boundingBox();
      const phone = await page.locator("#contactPhone").boundingBox();
      if (width < 640) expect(phone!.y).toBeGreaterThan(name!.y);
      else expect(Math.abs(name!.y - phone!.y)).toBeLessThan(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/enterprise-tailwind-${locale}-${width}.png`,
        fullPage: true,
      });
    });
  }
}
