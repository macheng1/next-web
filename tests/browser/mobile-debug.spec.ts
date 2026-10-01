import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });

test("mobile console is opt-in and captures upload request failures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/enterprise/apply?entry=miniapp");
  await expect(page.locator("#__vconsole")).toHaveCount(0);
  await page.goto("/enterprise/apply?entry=miniapp&debug=1");
  await expect(page.locator("#__vconsole .vc-switch")).toBeVisible();
  await page.route("**/api/upload/web-file", (r) =>
    r.fulfill({ status: 413, body: "FUNCTION_PAYLOAD_TOO_LARGE" }),
  );
  await page.evaluate(async () => {
    console.error("mobile-debug-test-error");
    const response = await fetch("/api/upload/web-file", {
      method: "POST",
      body: "test",
    });
    console.log("mobile-debug-test-upload", response.status);
  });
  await page.locator("#__vconsole .vc-switch").click();
  await expect(page.locator("#__vconsole")).toContainText(
    "mobile-debug-test-error",
  );
  await expect(page.locator("#__vconsole")).toContainText("413");
  await page.goto("/enterprise/apply?entry=miniapp");
  await expect(page.locator("#__vconsole")).toHaveCount(0);
});
