import { it, expect, vi, afterEach } from "vitest";
import { backendFetch } from "../../src/lib/server/backend";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("keeps member prefix and refuses arbitrary paths and redirects", async () => {
  vi.stubEnv("MEMBER_API_URL", "http://localhost:4000/api/v1/");
  vi.stubEnv("DEPLOYMENT_ENV", "test");
  const fake = vi.fn(async (url, init) => {
    expect(url).toBe("http://localhost:4000/api/v1/web/members/me");
    expect(init.redirect).toBe("error");
    return Response.json({ code: 200, data: { id: "one" } });
  });
  vi.stubGlobal("fetch", fake);
  await backendFetch("/web/members/me");
  await expect(backendFetch("https://evil.test" as never)).rejects.toThrow();
  await expect(backendFetch("/portal/acme/init" as never)).rejects.toThrow();
});
