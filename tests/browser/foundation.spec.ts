import { test, expect } from "@playwright/test";
test("English states, dialog dismissal and retry", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByLabel("Retries")).toHaveText("1");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open dialog" })).toBeFocused();
});
test("privacy choices are equally accessible and never default to acceptance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const reject = dialog.getByRole("button", { name: "Cancel", exact: true });
  const accept = dialog.getByRole("button", { name: "Confirm", exact: true });
  await expect(reject).toBeEnabled();
  await expect(accept).toBeEnabled();
  const a = await reject.boundingBox();
  const b = await accept.boundingBox();
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
  await reject.focus();
  await expect(reject).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
});
for (const width of [390, 1440])
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
test("shared states render without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
