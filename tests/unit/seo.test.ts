import { it, expect, vi, afterEach } from "vitest";
import { buildMetadata } from "../../src/lib/seo/metadata";
import robots from "../../src/app/robots";
import sitemap from "../../src/app/sitemap";
afterEach(() => vi.unstubAllEnvs());
it("keeps private pages out of indexing and uses real site canonical", () => {
  vi.stubEnv("DEPLOYMENT_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://directory.test");
  const meta = buildMetadata({
    title: "Sign in",
    description: "Account",
    path: "/login",
    locale: "en",
    private: true,
  });
  expect(meta.robots).toMatchObject({ index: false, follow: false });
  expect(meta.alternates?.canonical).toBe("https://directory.test/login");
});
it("blocks test indexing and does not invent tenant URLs", () => {
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  expect(sitemap()).toEqual([]);
  vi.stubEnv("DEPLOYMENT_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://directory.test");
  expect(sitemap().map((v) => v.url)).toEqual([
    "https://directory.test/",
    "https://directory.test/products",
    "https://directory.test/suppliers",
  ]);
});
it("keeps language links to explicit paths and refuses absolute path injection", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://directory.test");
  const meta = buildMetadata({
    title: "Directory",
    description: "Details",
    path: "/en",
    locale: "en",
    alternates: { zh: "/zh", en: "/en" },
  });
  expect(meta.alternates?.languages).toMatchObject({
    en: "https://directory.test/en",
  });
  expect(() =>
    buildMetadata({
      title: "Bad",
      description: "Bad",
      path: "//evil.test",
      locale: "en",
    }),
  ).toThrow();
});
