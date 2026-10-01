import { it, expect, vi, afterEach } from "vitest";
afterEach(() => vi.unstubAllEnvs());
import { apiJson } from "../../src/lib/server/api-response";
it("returns localized validation errors without leaking raw upstream text", async () => {
  const res = apiJson(
    new Request("http://localhost/api", {
      headers: { "accept-language": "en" },
    }),
    { error: "请输入邮箱" },
    { status: 400 },
  );
  expect(await res.json()).toMatchObject({
    message: "Please check your input",
    errorKey: "invalid_input",
  });
});
it("returns 400 for empty uploads instead of failing inside validation", async () => {
  vi.stubEnv("MEMBER_API_URL", "http://localhost:4000/api/v1");
  const { POST } = await import("../../src/app/api/upload/web-file/route");
  const { NextRequest } = await import("next/server");
  const form = new FormData();
  form.append("module", "enterprise");
  const response = await POST(
    new NextRequest("http://localhost:3000/api/upload/web-file", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: form,
    }),
  );
  expect(response.status).toBe(400);
});
it("uses explicit UI language ahead of a conflicting cookie", async () => {
  const res = apiJson(
    new Request("http://localhost/api", {
      headers: { cookie: "NEXT_LOCALE=zh", "x-ui-locale": "en" },
    }),
    { error: "wrong" },
    { status: 400 },
  );
  expect((await res.json()).message).toBe("Please check your input");
});
it('returns a trace header matching the request correlation id',async()=>{
 const id='b1aeb321-99b7-4879-b5ed-300a565822b1';
 const response=apiJson(new Request('http://localhost/api',{headers:{'x-trace-id':id}}),{code:200,data:null});
 expect(response.headers.get('x-trace-id')).toBe(id);
});
