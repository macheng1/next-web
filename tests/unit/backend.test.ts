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
it("allows the homepage and paginated supplier products through the same catalog whitelist",async()=>{
 vi.stubEnv("MEMBER_API_URL","http://localhost:4000/api/v1");vi.stubEnv("DEPLOYMENT_ENV","test");
 const fake=vi.fn(async()=>Response.json({code:200,data:{}}));vi.stubGlobal("fetch",fake);
 await backendFetch("/web/catalog/home?locale=en");
 await backendFetch("/web/catalog/footer?locale=en");
 await backendFetch("/web/catalog/enterprises/11111111-1111-4111-8111-111111111111/products?page=2");
 expect(fake).toHaveBeenCalledTimes(3);
 await expect(backendFetch("/web/catalog/products/11111111-1111-4111-8111-111111111111/products" as never)).rejects.toThrow();
});
