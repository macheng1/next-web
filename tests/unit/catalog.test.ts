import { describe, it, expect } from "vitest";
import { catalogQuery, safeCatalogImage } from "@/src/lib/catalog/model";
import { catalogCopy } from "@/src/lib/catalog/copy";
describe("public catalog boundaries", () => {
  it("retains catalog query state without forwarding unknown parameters", () => {
    expect(
      catalogQuery(
        new URLSearchParams(
          "q=A%26B&industry=metal&token=private&page=2&sort=name",
        ),
      ),
    ).toBe("q=A%26B&industry=metal&sort=name&page=2");
  });
  it("only permits existing trusted HTTPS image host", () => {
    expect(
      safeCatalogImage(
        "https://macheng123.oss-cn-hangzhou.aliyuncs.com/product/a.png",
      ),
    ).toContain("/product/a.png");
    for (const value of [
      "javascript:alert(1)",
      "https://untrusted.test/x",
      "https://user:pass@macheng123.oss-cn-hangzhou.aliyuncs.com/x",
      "//untrusted.test/x",
    ])
      expect(safeCatalogImage(value)).toBeNull();
  });
  it("maintains matching translated interface keys", () =>
    expect(Object.keys(catalogCopy("zh")).sort()).toEqual(
      Object.keys(catalogCopy("en")).sort(),
    ));
});
