import { apiJson } from "@/src/lib/server/api-response";
import { SuccessfulSubmissions, MemoryRateLimiter } from "@/src/lib/security/rate-limit";
import { readBizCode } from "@/src/lib/api-envelope";
import { createHash } from "node:crypto";
import { clientIp, guardMutation, readJsonBody, mutationFailure } from "@/src/lib/server/mutation";
import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const MIN_SUBMIT_SECONDS = 3;
const DUPLICATE_WINDOW = 10 * 60 * 1000;

const rateLimitStore = new MemoryRateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
const recentSubmissionStore = new SuccessfulSubmissions(DUPLICATE_WINDOW);

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getDuplicateKey(
  ip: string,
  domain: string,
  body: Record<string, unknown>,
) {
  return createHash("sha256").update(JSON.stringify([domain, ip, normalizeText(body.phone), normalizeText(body.message)])).digest("hex");
}

function isDuplicateSubmission(key: string, now: number) {
  return recentSubmissionStore.has(key, now);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    await guardMutation(request);
    // 获取客户端真实 IP
    const headersList = request.headers;
    const clientIP = clientIp(request);
    const userAgent = headersList.get("user-agent") || "";

    const { domain } = await params;
    const now = Date.now();
    const body = await readJsonBody(request);

    if (!body) return apiJson(request, {error:"Invalid body"},{status:400});

    if (!(await rateLimitStore.check(`${domain}:${clientIP}`, now)).allowed) {
      return apiJson(request, { error: "提交过于频繁，请稍后再试" }, { status: 429 });
    }

    if (normalizeText(body.website)) {
      return apiJson(request, { error: "提交失败，请稍后重试" }, { status: 400 });
    }

    const formStartedAt = Number(body.formStartedAt || 0);
    if (!formStartedAt || now - formStartedAt < MIN_SUBMIT_SECONDS * 1000) {
      return apiJson(request, { error: "提交过快，请稍后再试" }, { status: 400 });
    }

    // 基础验证，字段需要和前台询价表单及后端 CreateInquiryDto 对齐。
    if (!body.name || !body.phone || !body.message) {
      return apiJson(request, 
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    if (String(body.name).length > 20) {
      return apiJson(request, 
        { error: "姓名不能超过20字" },
        { status: 400 }
      );
    }

    if (String(body.message).length > 500) {
      return apiJson(request, 
        { error: "内容不能超过500字" },
        { status: 400 }
      );
    }

    if (isDuplicateSubmission(getDuplicateKey(clientIP, domain, body), now)) {
      return apiJson(request, 
        { error: "请勿重复提交相同需求" },
        { status: 409 }
      );
    }

    // 转发到真实后端 API
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      return apiJson(request, 
        { error: "服务器配置错误" },
        { status: 500 }
      );
    }

    const submitBody: Record<string, unknown> = {};
    for (const key of ["name", "phone", "message", "email", "companyName", "attachments", "productId"]) if (key in body) submitBody[key] = body[key];
    delete submitBody.website;
    delete submitBody.formStartedAt;
    const response = await backendFetch("portal", `/portal/${domain}/inquiry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIP,
        "User-Agent": userAgent,
        "x-source-type": "portal-web",
      },
      body: JSON.stringify(submitBody),
    });

    if (!response.ok) {
      return apiJson(request, 
        { error: "提交失败，请稍后重试" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const code = readBizCode(data);
    if (code !== null && code !== 200) return apiJson(request, {code, message: "Submit failed"}, {status:400});
    recentSubmissionStore.mark(getDuplicateKey(clientIP, domain, body), now);
    return apiJson(request, data);
  } catch (error) {
    return mutationFailure(error, request);
  }
}
