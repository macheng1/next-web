import { CatalogShell, PageContainer } from "@/src/components/catalog/CatalogShell";
import { resolveLocale } from "@/src/lib/locale";
import { buildMetadata } from "@/src/lib/seo/metadata";
export async function generateMetadata() {
  const locale = await resolveLocale();
  return buildMetadata({ title: locale === "zh" ? "Cookie 政策" : "Cookie policy", description: locale === "zh" ? "了解制造帮的 Cookie 用途、保存期限和您的选择。" : "Learn how ManuLink uses cookies and manages your choices.", path: "/cookies", locale });
}
export default async function CookiePolicyPage() {
  const locale = await resolveLocale();
  const zh = locale === "zh";
  return <CatalogShell><PageContainer><article className="mx-auto max-w-3xl text-ink-700">
    <h1 className="text-3xl font-semibold text-ink-900">{zh ? "Cookie 政策" : "Cookie policy"}</h1>
    <p className="mt-6 leading-7">{zh ? "Cookie 是浏览器保存的小型数据记录。制造帮 / ManuLink 目前仅使用必要 Cookie，尚未接入可选统计或营销追踪工具。" : "Cookies are small records stored by your browser. ManuLink currently uses only necessary cookies; no optional analytics or marketing trackers are integrated."}</p>
    <h2 className="mt-8 text-xl font-semibold text-ink-900">{zh ? "必要 Cookie" : "Necessary cookies"}</h2>
    <p className="mt-3 leading-7">{zh ? "必要 Cookie 用于登录会话、安全校验、语言偏好，以及保存您的 Cookie 选择。选择“仅必要 Cookie”不会阻止登录或使用询盘功能。Cookie 选择记录与登录凭证独立，退出登录不会删除该选择。" : "Necessary cookies support sign-in sessions, security, language preferences and your cookie choice. Choosing “Necessary only” does not prevent sign-in or inquiries. Your cookie choice is separate from your login credentials and is retained when you sign out."}</p>
    <h2 className="mt-8 text-xl font-semibold text-ink-900">{zh ? "可选 Cookie 与您的选择" : "Optional cookies and your choice"}</h2>
    <p className="mt-3 leading-7">{zh ? "可选 Cookie 默认关闭。“全部接受”保存允许使用可选 Cookie 的偏好；“仅必要 Cookie”保存拒绝可选 Cookie 的偏好。若未来增加新的用途，我们会更新政策并重新征求适用的同意。" : "Optional cookies are off by default. “Accept all” saves a preference allowing optional cookies; “Necessary only” saves a preference refusing them. If new purposes are introduced, we will update this policy and request the relevant consent again."}</p>
    <h2 className="mt-8 text-xl font-semibold text-ink-900">{zh ? "保存期限" : "Retention"}</h2>
    <p className="mt-3 leading-7">{zh ? "选择记录最多保存 180 天。清除浏览器 Cookie、记录到期或使用其他设备后，会再次显示提示。如果浏览器禁止保存 Cookie，选择仅对当前页面访问有效。" : "Your choice is stored for up to 180 days. The notice returns if cookies are cleared, the record expires or you use another device. If cookie storage is blocked, your choice lasts only for the current page visit."}</p>
  </article></PageContainer></CatalogShell>;
}
