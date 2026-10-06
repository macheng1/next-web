import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:4176" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog/**", route => route.fulfill({json:{code:200,data:{}}}));
});
test("first visit, reject, persistence, accept and login token isolation", async ({page, context}) => {
  await context.addCookies([{name:"member_web_token",httpOnly:true,value:"keep",url:"http://127.0.0.1:4176"},{name:"NEXT_LOCALE",value:"en",url:"http://127.0.0.1:4176"}]);
  await page.goto("/cookies");
  const banner = page.getByTestId("cookie-consent");
  await expect(banner).toBeVisible();
  await banner.getByRole("button",{name:"Necessary only", exact:true}).click();
  await expect(banner).toBeHidden();
  expect((await context.cookies()).find(c=>c.name==="member_web_token")?.value).toBe("keep");
  expect((await context.cookies()).find(c=>c.name==="manulink_cookie_consent")?.value).toBe("v1:necessary");
  await page.reload();
  await expect(page.getByRole("button",{name:"Cookie choices"})).toHaveCount(0);
  await expect(banner).toBeHidden();
  await context.clearCookies({name:"manulink_cookie_consent"});
  await page.reload();
  await expect(banner).toBeVisible();
  await banner.getByRole("button",{name:"Accept all",exact:true}).focus();
  await page.keyboard.press("Enter");
  await expect(banner).toBeHidden();
  expect((await context.cookies()).find(c=>c.name==="manulink_cookie_consent")?.value).toBe("v1:all");
});
test("Chinese mobile banner fits viewport and policy link works", async ({page, context}) => {
  await page.setViewportSize({width:375,height:812});
  await context.addCookies([{name:"NEXT_LOCALE",value:"zh",url:"http://127.0.0.1:4176"}]);
  await page.goto("/cookies");
  const banner=page.getByTestId("cookie-consent");
  await expect(banner.getByRole("button",{name:"全部接受",exact:true})).toBeVisible();
  await expect(banner.getByRole("button",{name:"仅必要 Cookie",exact:true})).toBeVisible();
  await page.screenshot({path:"test-results/cookie-consent-mobile.png",fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const box=await banner.boundingBox();
  expect(box!.y+box!.height).toBeLessThanOrEqual(813);
  await banner.getByRole("link",{name:"Cookie 政策",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Cookie 政策",exact:true})).toBeVisible();
});
