import { test, expect, type Page } from "@playwright/test";
import { memberId, enterpriseId, inquiryId, quoteId } from "./buyer-test-data";
const productId = "55555555-5555-4555-8555-555555555555",
  variantId = "66666666-6666-4666-8666-666666666666";
const item = {
  enterpriseId,
  productId,
  variantId,
  name: "Tube fitting",
  specification: "6 mm",
  quantity: "100",
  unit: "piece",
};
const inquiry = {
  id: inquiryId,
  number: "RFQ-TEST",
  version: 1,
  enterpriseId,
  enterpriseName: "Sample supplier",
  buyerMemberId: memberId,
  subject: "Tube fittings",
  description: "304 stainless steel",
  contactName: "Alex",
  contactPhone: "+49 12345678",
  orderKind: "standard",
  status: "negotiating",
  unreadCount: 1,
  createdAt: "2026-10-09T01:00:00Z",
  updatedAt: "2026-10-09T02:00:00Z",
  items: [{ id: "item", product: { ...item }, quantity: "100" }],
  attachments: [],
  actions: [{ code: "close", enabled: true }],
};
async function setup(
  page: Page,
  options: { guest?: boolean; lostInquiry?: boolean } = {},
) {
  let sent = 0;
  let inquiriesSent = 0;
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.addInitScript(
    ({ memberId, enterpriseId, item, guest }) => {
      document.cookie = "manulink_cookie_consent=v1:necessary; Path=/";
      if (guest) {
        localStorage.removeItem(`buyer-draft-v1:${memberId}:${enterpriseId}`);
        localStorage.setItem(
          `buyer-draft-v1:guest:${enterpriseId}`,
          JSON.stringify([item]),
        );
        sessionStorage.setItem("buyer-claim-guest", "1");
      } else {
        localStorage.setItem(
          `buyer-draft-v1:${memberId}:${enterpriseId}`,
          JSON.stringify([item]),
        );
      }
    },
    { memberId, enterpriseId, item, guest: !!options.guest },
  );
  await page.route("**/api/buyer/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(
      "/api/buyer/".length,
    );
    let data: unknown = {};
    if (path === "summary")
      data = {
        pendingInquiries: 1,
        unreadMessages: 1,
        unreadNotifications: 1,
        savedProducts: 1,
        savedEnterprises: 0,
      };
    else if (path === "inquiries" && route.request().method() === "POST") {
      inquiriesSent++;
      if (options.lostInquiry && inquiriesSent === 1) {
        await route.fulfill({
          status: 503,
          json: { code: 503, message: "response lost" },
        });
        return;
      }
      data = inquiry;
    } else if (path === "inquiries")
      data = { items: [inquiry], total: 1, page: 1, pageSize: 20 };
    else if (path === `inquiries/${inquiryId}`) data = inquiry;
    else if (path.startsWith(`inquiries/${inquiryId}/message-receipts`))
      data = { items: [], hasMore: false, nextAfterSequence: 0 };
    else if (path === `inquiries/${inquiryId}/read`)
      data = { readThroughSequence: 1 };
    else if (path === `inquiries/${inquiryId}/messages`) {
      if (route.request().method() === "POST") {
        sent++;
        if (sent === 1) {
          await route.fulfill({
            status: 503,
            json: { code: 503, message: "offline" },
          });
          return;
        }
        data = {
          id: "mine",
          sequence: 2,
          sender: {
            actorType: "member",
            actorId: memberId,
            displayName: "Alex",
          },
          kind: "text",
          text: JSON.parse(route.request().postData()!).text,
          attachments: [],
          createdAt: "2026-10-09T02:00:00Z",
        };
      } else
        data = {
          items: [
            {
              id: "message",
              sequence: 1,
              sender: {
                actorType: "enterprise_account",
                actorId: "staff",
                displayName: "Supplier",
              },
              kind: "text",
              text: "Please review quotation",
              attachments: [],
              createdAt: "2026-10-09T02:00:00Z",
              quote: {
                id: quoteId,
                totalAmount: "70000",
                currency: "CNY",
                status: "sent",
              },
            },
          ],
          hasMoreBefore: false,
          nextAfterSequence: 1,
          readThroughSequence: 0,
        };
    } else if (path === `products/${productId}`)
      data = {
        id: productId,
        enterpriseId,
        name: "Tube fitting",
        canInquire: true,
        variants: [{ id: variantId, specification: "6 mm", unit: "piece" }],
      };
    else if (path === "favorites")
      data = {
        items: [
          {
            targetType: "product",
            targetId: productId,
            payload: {
              id: productId,
              name: "Tube fitting",
              images: [],
              category: "Fittings",
              description: "304 SS",
              unit: "piece",
              enterprise: { id: enterpriseId, name: "Supplier" },
              variants: [{ id: variantId, value: "6 mm" }],
            },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    else if (path === "notifications")
      data = {
        items: [
          {
            id: "note",
            title: "Account update",
            body: "Your account is ready.",
            read: false,
            createdAt: "2026-10-09T01:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    else if (path === `inquiries/${inquiryId}/quotes`)
      data = {
        items: [
          {
            id: quoteId,
            number: "Q1",
            revision: 1,
            status: "sent",
            currency: "CNY",
            totalAmount: "70000",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
    else if (path === `quotes/${quoteId}`)
      data = {
        id: quoteId,
        inquiryId,
        number: "Q1",
        revision: 1,
        status: "sent",
        currency: "CNY",
        totalAmount: "70000",
        freightAmount: "0",
        taxAmount: "0",
        createdAt: "2026-10-09T01:00:00Z",
        items: [
          {
            id: "line",
            product: {
              name: "Tube fitting",
              specification: "6 mm",
              unit: "piece",
            },
            quantity: "100",
            unitPrice: "700",
            subtotal: "70000",
          },
        ],
        terms: { paymentMode: "offline" },
      };
    await route.fulfill({ json: { code: 200, data } });
  });
  return failures;
}
for (const lang of ["en", "zh"])
  for (const screen of [
    "overview",
    "inquiries",
    "list",
    "saved",
    "new",
    "detail",
    "messages",
    "quote",
    "settings",
  ])
    test(`${lang} ${screen} responsive design`, async ({ page }) => {
      const errors = await setup(page);
      await page.goto(`/?buyer=${screen}&lang=${lang}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(
        page.getByText(lang === "en" ? "Loading…" : "加载中…", { exact: true }),
      ).toHaveCount(0);
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .map((el) => ({
              tag: el.tagName,
              cls: el.className,
              right: el.getBoundingClientRect().right,
            }))
            .slice(0, 12),
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          JSON.stringify(overflow),
        ).toBe(false);
        await page.screenshot({
          path: `/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/buyer-workspace-verification/${lang}-${screen}-${width}.png`,
          fullPage: true,
        });
      }
      expect(errors).toEqual([]);
    });
test("failed message retry preserves text and client message id", async ({
  page,
}) => {
  await setup(page);
  const ids: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/messages"))
      ids.push(JSON.parse(req.postData()!).clientMessageId);
  });
  await page.goto("/?buyer=detail");
  await page
    .getByRole("textbox", { name: "Write a message to the supplier…" })
    .fill("Please confirm <delivery>");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.locator("article").filter({ hasText: "Please confirm <delivery>" }),
  ).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
test("submitted inquiry includes required contacts and clears only submitted draft", async ({
  page,
}) => {
  await setup(page);
  let body: Record<string, unknown> = {};
  page.on("request", (req) => {
    if (
      req.method() === "POST" &&
      new URL(req.url()).pathname === "/api/buyer/inquiries"
    )
      body = JSON.parse(req.postData()!);
  });
  await page.goto("/?buyer=new");
  await page
    .getByRole("textbox", { name: "Inquiry", exact: true })
    .fill("Tube fittings order");
  await page.getByLabel("Your requirements").fill("Use 304 SS");
  await page.getByLabel("Phone / country code").fill("+49 12345678");
  await page
    .getByRole("button", { name: "Submit inquiry", exact: true })
    .click();
  await expect.poll(() => body.contactPhone).toBe("+49 12345678");
  await expect
    .poll(() =>
      page.evaluate(
        ({ memberId, enterpriseId }) =>
          JSON.parse(
            localStorage.getItem(
              `buyer-draft-v1:${memberId}:${enterpriseId}`,
            ) || "[]",
          ).length,
        { memberId, enterpriseId },
      ),
    )
    .toBe(0);
});
test("removal cancel retains sourcing item", async ({ page }) => {
  await setup(page);
  await page.goto("/?buyer=list");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Tube fitting", { exact: true })).toBeVisible();
});
test("overview shows actual recent favorites and notifications", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/?buyer=overview");
  await expect(page.getByText("Account update", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tube fitting", exact: true }),
  ).toBeVisible();
});
test("anonymous product selections are migrated before the inquiry form mounts", async ({
  page,
}) => {
  await setup(page, { guest: true });
  await page.goto("/?buyer=new");
  await expect(page.getByText("Tube fitting", { exact: true })).toBeVisible();
  await expect(
    page.getByText("6 mm · 100 pcs", { exact: false }),
  ).toBeVisible();
});
test("lost inquiry response reuses the key after page reload", async ({
  page,
}) => {
  await setup(page, { lostInquiry: true });
  const keys: string[] = [];
  page.on("request", (req) => {
    if (
      req.method() === "POST" &&
      new URL(req.url()).pathname === "/api/buyer/inquiries"
    )
      keys.push(req.headers()["idempotency-key"]);
  });
  await page.goto("/?buyer=new");
  await page
    .getByRole("textbox", { name: "Inquiry", exact: true })
    .fill("Tube fittings retry");
  await page.getByLabel("Your requirements").fill("304 SS");
  await page.getByLabel("Phone / country code").fill("+49 12345678");
  await page
    .getByRole("button", { name: "Submit inquiry", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "The operation failed" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Submit inquiry", exact: true })
    .click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});
test('account and security remains in the buyer workspace',async({page})=>{await setup(page);await page.goto('/?buyer=settings');await expect(page.getByRole('link',{name:'Account & security',exact:true})).toHaveAttribute('href','/buyer/settings');await expect(page.locator('main h1')).toHaveText('Account & security');await expect(page.getByLabel('Name',{exact:true})).toBeVisible();await expect(page.getByLabel('Current password',{exact:true})).toBeVisible();await expect(page.locator('main a[href="/account"]')).toHaveCount(0);});
test('workspace profile saves through the existing auth API and logout can be cancelled',async({page})=>{await setup(page);let saved='',signOuts=0;await page.route('**/api/auth/profile',route=>{saved=JSON.parse(route.request().postData()!).nickname;return route.fulfill({json:{code:200,data:{id:memberId,nickname:saved}}});});await page.route('**/api/auth/logout',route=>{signOuts++;return route.fulfill({json:{code:200,data:null}});});await page.goto('/?buyer=settings');await page.getByLabel('Name',{exact:true}).fill('Alex Updated');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect.poll(()=>saved).toBe('Alex Updated');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(signOuts).toBe(0);await expect(page.locator('main h1')).toHaveText('Account & security');});
test('workspace password mismatch keeps entered values and sends no request',async({page})=>{await setup(page);let writes=0;await page.route('**/api/auth/change-password',route=>{writes++;return route.fulfill({json:{code:200,data:{}}});});await page.goto('/?buyer=settings');await page.getByLabel('Current password',{exact:true}).fill('Current123');await page.getByLabel('Password',{exact:true}).fill('NewPass123');await page.getByLabel('Confirm password',{exact:true}).fill('WrongPass123');await page.getByRole('button',{name:'Save new password',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();expect(writes).toBe(0);await expect(page.getByLabel('Password',{exact:true})).toHaveValue('NewPass123');});

test("inquiry form uses Semi controls and keeps required validation", async ({ page }) => {
  await setup(page);
  await page.goto("/?buyer=new");
  await expect(page.locator(".semi-datepicker")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Inquiry", exact: true })).toHaveClass(/semi-input/);
  await expect(page.getByLabel("Your requirements")).toHaveClass(/semi-input-textarea/);
  await expect(page.locator(".semi-select").first()).toBeVisible();
  await expect(page.locator(".semi-upload")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Inquiry", exact: true })).toHaveAttribute("required", "");
  let writes = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/buyer/inquiries") writes++; });
  await page.getByRole("button", {name: "Submit inquiry", exact: true}).click();
  expect(writes).toBe(0);
});


test("Semi date picker saves and clears the date without timezone conversion", async ({page}) => {
  await setup(page);
  await page.goto("/?buyer=new");
  const date = page.locator(".semi-datepicker input");
  await date.fill("2026-11-20");
  await date.press("Enter");
  await page.getByRole("button", {name: "Save draft", exact: true}).click();
  const saved = () => page.evaluate(({memberId, enterpriseId}) => JSON.parse(localStorage.getItem(`buyer-form-v1:${memberId}:${enterpriseId}`) || "{}").expectedDate, {memberId, enterpriseId});
  await expect.poll(saved).toBe("2026-11-20");
  await page.reload();
  await expect(date).toHaveValue("2026-11-20");
  await date.hover();
  await page.locator(".semi-datepicker .semi-input-clearbtn").click();
  await page.getByRole("button", {name: "Save draft", exact: true}).click();
  await expect.poll(saved).toBe("");
});

test("Semi upload retains the shared upload API and attachment limit", async ({page}) => {
  await setup(page);
  let uploads = 0;
  await page.route("**/api/buyer/files", async route => {
    uploads++;
    expect(route.request().headers()["x-expected-member-id"]).toBe(memberId);
    await route.fulfill({json: {code: 200, data: {id: "uploaded-" + uploads, name: "drawing.pdf"}}});
  });
  await page.goto("/?buyer=new");
  const file = page.locator('.semi-upload .semi-upload-hidden-input');
  await file.setInputFiles({name: "drawing.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nsample drawing")});
  await expect.poll(() => uploads).toBe(1);
  await expect(page.getByText("drawing.pdf", {exact: true})).toBeVisible();
  await page.getByRole("button", {name: "Remove", exact: true}).click();
  await file.setInputFiles(Array.from({length: 6}, (_, i) => ({name: `drawing-${i}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nsample drawing")})));
  await expect(page.getByRole("alert")).toBeVisible();
  expect(uploads).toBe(1);
});

test("message content is locked while a send is pending", async ({page}) => {
 await setup(page);
 let release: (() => void) | undefined;
 await page.route('**/api/buyer/inquiries/*/messages', async route => {
  if (route.request().method() !== 'POST') return route.fallback();
  await new Promise<void>(resolve => {release = resolve;});
  await route.fulfill({json: {code: 200, data: {id: 'sent', sequence: 2, kind:'text', text: 'A', sender:{actorType:'member',actorId:memberId,displayName:'Alex'},attachments:[],createdAt:'2026-10-11T00:00:00Z'}}});
 });
 await page.goto('/?buyer=detail');
 const text = page.getByRole('textbox',{name:'Write a message to the supplier…'});
 await text.fill('A');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(text).toBeDisabled();
 release?.();
 await expect(text).toBeEnabled();
});
