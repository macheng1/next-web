/**
 * 认证页路由组 `(auth)`（URL 里不出现括号段）。
 *
 * 放在根级而不是 `/portal/{domain}/{lang}` 下，原因有两个：
 * 1. 登录态属于「平台账号」，不属于某个租户门户 —— 换域名不该要求重新登录；
 * 2. `src/proxy.ts` 会把 `/portal/{x}` 这类两段路径补成 `/portal/{x}/zh`，
 *    认证页若挂在那下面会被误重定向。
 *
 * **这里刻意不渲染 `AuthShell`**：表单卡的宽度是按页定的（登录 / 重置 = 420，
 * 企业注册的两列栅格 = 680），而 layout 拿不到当前路径 —— 与其让布局猜路由，
 * 不如由各页面自己 `<AuthShell brand={dict.auth.brand}>` 包一层：宽窄写在页面上，
 * 一眼可见。副作用是每个认证页都要自带品牌文案（dict 本来就在页面里取，无额外成本）。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
