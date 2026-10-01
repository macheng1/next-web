import { describe, it, expect, vi, afterEach } from "vitest";
import {
  emptyEnterprise,
  validateEnterpriseDetails,
  parseEnterpriseDraft,
} from "../../src/lib/enterprise-onboarding/model";
import { POST } from "../../src/app/api/enterprise/applications/route";
import { NextRequest } from "next/server";
import { enterpriseClientHeaders } from "../../src/lib/server/enterprise-client-ip";
const details = {
  ...emptyEnterprise,
  companyName: "测试制造有限公司",
  creditCode: "91310000MA1FL8YQ1X",
  industryCode: "manufacturing",
  scaleCode: "lt50",
  contactName: "张三",
  contactPhone: "13800138000",
  email: "test@example.com",
  registeredAddress: "上海市测试路1号",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("企业入驻表单和接口边界", () => {
  it("校验资料并识别空白、联系方式及必填选项", () => {
    expect(validateEnterpriseDetails(details)).toEqual({});
    expect(
      validateEnterpriseDetails({
        ...details,
        companyName: " ",
        email: "invalid",
        contactPhone: "123",
      }),
    ).toMatchObject({
      companyName: "required",
      email: "email",
      contactPhone: "phone",
    });
  });
  it("恢复草稿时仅接受已知文本和有效上传文件，不恢复验证码或任意属性", () => {
    const draft = parseEnterpriseDraft(
      JSON.stringify({
        version: 1,
        values: { ...details, smsCode: "123456", account: {} },
        file: { url: "javascript:alert(1)" },
      }),
    );
    expect(draft?.values).not.toHaveProperty("smsCode");
    expect(draft?.values).not.toHaveProperty("account");
    expect(draft?.file).toBeNull();
    expect(parseEnterpriseDraft("bad json")).toBeNull();
  });
  it("拒绝权限字段和错误来源，不向后端发送请求", async () => {
    vi.stubEnv("DEPLOYMENT_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const bad = new NextRequest(
      "http://localhost:3000/api/enterprise/applications",
      {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...details, isListed: true }),
      },
    );
    expect((await POST(bad)).status).toBe(400);
    const external = new NextRequest(
      "http://localhost:3000/api/enterprise/applications",
      { method: "POST", headers: { origin: "https://evil.test" }, body: "{}" },
    );
    expect((await POST(external)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("只向新增企业申请接口转发，保留后端冲突状态并提供双语错误", async () => {
    vi.stubEnv("DEPLOYMENT_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("MEMBER_API_URL", "http://backend.test/api/v1");
    const fetch = vi.fn(async (url: string) => {
      expect(url).toBe(
        "http://backend.test/api/v1/web/enterprise-applications",
      );
      return Response.json(
        { code: 409, message: "该企业已有申请或企业记录" },
        { status: 409 },
      );
    });
    vi.stubGlobal("fetch", fetch);
    const req = new NextRequest(
      "http://localhost:3000/api/enterprise/applications",
      {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
          "x-ui-locale": "en",
        },
        body: JSON.stringify({
          ...details,
          requestId: "00000000-0000-4000-8000-000000000001",
          countryCode: "CN",
          smsCode: "123456",
          businessLicenseUrl: "https://cdn.example.com/license.png",
          agreementAccepted: true,
        }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect((await res.json()).message).toMatch(/application|company/i);
  });
});

it("only forwards a validated single IP from an explicitly trusted gateway", () => {
  const request = new Request("http://localhost", {
    headers: { "x-real-ip": "203.0.113.5" },
  });
  vi.stubEnv("TRUST_PROXY", "false");
  expect(enterpriseClientHeaders(request)).toEqual({});
  vi.stubEnv("TRUST_PROXY", "true");
  expect(enterpriseClientHeaders(request)).toEqual({
    "x-real-ip": "203.0.113.5",
  });
  expect(
    enterpriseClientHeaders(
      new Request("http://localhost", {
        headers: { "x-real-ip": "203.0.113.5, 1.2.3.4" },
      }),
    ),
  ).toEqual({});
});
