import { backendFetch } from "@/src/lib/server/backend";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const MIN_SUBMIT_SECONDS = 3;
const DUPLICATE_WINDOW = 10 * 60 * 1000;

const rateLimitStore = new Map<string, number[]>();
const recentSubmissionStore = new Map<string, number>();

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getRateLimitKey(ip: string, domain: string, userAgent: string) {
  return `${domain}:${ip}:${userAgent.slice(0, 80)}`;
}

function isRateLimited(key: string, now: number) {
  const recent = (rateLimitStore.get(key) || []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(key, recent);
    return true;
  }
  rateLimitStore.set(key, [...recent, now]);
  return false;
}

function getDuplicateKey(
  ip: string,
  domain: string,
  body: Record<string, unknown>,
) {
  return [
    domain,
    ip,
    normalizeText(body.phone).toLowerCase(),
    normalizeText(body.message).toLowerCase(),
  ].join(":");
}

function isDuplicateSubmission(key: string, now: number) {
  const lastSubmitAt = recentSubmissionStore.get(key);
  if (lastSubmitAt && now - lastSubmitAt < DUPLICATE_WINDOW) return true;

  recentSubmissionStore.set(key, now);
  for (const [storeKey, time] of recentSubmissionStore.entries()) {
    if (now - time > DUPLICATE_WINDOW) recentSubmissionStore.delete(storeKey);
  }
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    // 获取客户端真实 IP
    const headersList = await headers();
    const clientIP = headersList.get("x-forwarded-for")?.split(",")[0] ||
                     headersList.get("x-real-ip") ||
                     "unknown";
    const userAgent = headersList.get("user-agent") || "";

    const { domain } = await params;
    const now = Date.now();
    const body = await request.json();

    if (isRateLimited(getRateLimitKey(clientIP, domain, userAgent), now)) {
      return NextResponse.json({ error: "提交过于频繁，请稍后再试" }, { status: 429 });
    }

    if (normalizeText(body.website)) {
      return NextResponse.json({ error: "提交失败，请稍后重试" }, { status: 400 });
    }

    const formStartedAt = Number(body.formStartedAt || 0);
    if (!formStartedAt || now - formStartedAt < MIN_SUBMIT_SECONDS * 1000) {
      return NextResponse.json({ error: "提交过快，请稍后再试" }, { status: 400 });
    }

    // 基础验证，字段需要和前台询价表单及后端 CreateInquiryDto 对齐。
    if (!body.name || !body.phone || !body.message) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    if (String(body.name).length > 20) {
      return NextResponse.json(
        { error: "姓名不能超过20字" },
        { status: 400 }
      );
    }

    if (String(body.message).length > 500) {
      return NextResponse.json(
        { error: "内容不能超过500字" },
        { status: 400 }
      );
    }

    if (isDuplicateSubmission(getDuplicateKey(clientIP, domain, body), now)) {
      return NextResponse.json(
        { error: "请勿重复提交相同需求" },
        { status: 409 }
      );
    }

    // 转发到真实后端 API
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { error: "服务器配置错误" },
        { status: 500 }
      );
    }

    const submitBody = { ...body };
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
      return NextResponse.json(
        { error: "提交失败，请稍后重试" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    console.error("Inquiry route failed");
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
