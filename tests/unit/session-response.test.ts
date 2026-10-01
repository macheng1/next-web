import { it, expect, vi } from "vitest";
vi.mock("../../src/lib/server/session", () => ({ getSession: vi.fn() }));
import { getSession } from "../../src/lib/server/session";
import { GET } from "../../src/app/api/auth/me/route";
it("session errors use the requested language and trace ID without losing cookie behavior", async () => {
  const trace = "b1aeb321-99b7-4879-b5ed-300a565822b1";
  for (const status of ["anonymous", "unavailable"] as const) {
    vi.mocked(getSession).mockResolvedValue(
      status === "anonymous" ? { status, invalidated: true } : { status },
    );
    const res = await Reflect.apply(GET, undefined, [
      new Request("http://local/api/auth/me", {
        headers: { "x-ui-locale": "zh", "x-trace-id": trace },
      }),
    ]);
    const body = await res.json();
    expect(body.message).toMatch(/[\u4e00-\u9fff]/);
    expect(res.headers.get("x-trace-id")).toBe(trace);
    expect(res.headers.has("set-cookie")).toBe(status === "anonymous");
  }
});
