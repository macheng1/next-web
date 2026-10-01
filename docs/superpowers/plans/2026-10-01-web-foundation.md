# 网站通用底座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可复用、可验证的网站基础能力，避免后续页面重复实现接口、安全、会话和多语言。

**Architecture:** 保留 Next.js、Semi UI 和现有目录，先建立纯函数及服务端边界，再让原接口走兼容适配。共享组件以 Semi 为底层，不更换业务模型；安全与会话最终校验仍由后端承担。

**Tech Stack:** Next.js App Router、React 19、TypeScript、Tailwind 4、Semi UI 19；单元测试使用 Vitest，交互验证使用 Playwright。

**Spec:** [已确认设计](../specs/2026-10-01-web-foundation-design.md)

## Global Constraints

- “沿用 Next.js App Router、React、TypeScript、Tailwind 和 Semi UI。”
- “业务 API 通过共享底座适配，不另建第二套请求体系。”
- “公共买家注册与企业审核申请分开。”本轮不接第三方登录，不展示不能使用的按钮。
- “服务端模块使用 server-only，防止被客户端导入。”
- “禁止遗留中文默认文案直接进入英文页面。”新增文案同步维护 zh/en。
- “后端仍负责最终授权与数据隔离。”内存限流不算生产多实例保护完成。
- 仅在 dev 实施，不发布、不改生产配置、不提交密钥，不删除旧业务路由；中文提交。
- 每项先写安全/行为测试并验证失败，再实现、通过测试、提交。已有无关 lint 错误独立记录，不大面积格式化。

## Review Focus

1. 配置带路径前缀或尾斜杠：保留 /api 与 /api/v1，避免地址拼错（任务 1、2）。
2. Headers 实例、FormData、取消信号：共享请求层保持实际请求语义（任务 2）。
3. 后端暂时不可用：保留登录 Cookie，区别凭证失效（任务 4）。
4. URL 英文与中文 Cookie 冲突：页面、文档语言和 Semi 文案都使用 URL 英文（任务 5、6）。
5. 上传扩展名正确但内容错误，提交失败后重试：前者拒绝，后者不误报重复（任务 3）。

## 文件与接口约定

纯模块放在 src/lib/config、http、security、i18n、seo；带密钥或 Cookie 的模块放 src/lib/server。测试放 tests/unit、tests/browser。保留现有 auth-api、upload-api、sms-api、portal-api 导出，内部迁移到共享底座。src/lib/server/backend.ts 是服务端出站唯一通道。

类型由所属模块导出，跨任务使用同一类型。所有配置读取按调用延迟执行，不在纯模块导入时读 Cookie；没有使用会员功能时不强制要求会员后端在线。生产部署检查单独验证完整配置。

### Task 1：配置验证和测试入口

**Files:** 新增 src/lib/config/schema.ts、src/lib/server/config.ts、vitest.config.ts、tests/unit/config.test.ts；修改 package.json、package-lock.json、eslint.config.mjs、.gitignore、.env.example。

**Interfaces:** `parseServerConfig(env: Record<string, string | undefined>): ServerConfig`；`ServerConfig` 包含可选 portalApiUrl/memberApiUrl、siteUrl、deploymentEnv（development/test/production）、trustedOrigins:string[]。服务端 `getServerConfig(): ServerConfig`。地址解析保留路径前缀，移除尾斜杠；生产使用的后端地址必须 HTTPS，两个后端不互相回退。siteUrl 允许本地回落 http://localhost:3000，生产缺失即失败。

- [ ] 写 config.test.ts：`保留接口前缀` 断言 memberApiUrl 末尾为 /api/v1；`生产缺失站点失败` 断言抛配置错误且无变量值；`禁止后端混用` 断言缺 memberApiUrl 时不会返回 portalApiUrl。
- [ ] 安装测试工具并锁定依赖，添加 test/test:watch/typecheck 命令；运行 `npm run test -- tests/unit/config.test.ts`，确认实现前失败。
- [ ] 实现配置接口和公开/服务端边界，更新环境变量示例；忽略 .next-verify、测试产物。
- [ ] 运行配置测试和 typecheck，检查无敏感配置进入客户端导出。
- [ ] 中文提交此项配置与测试入口。

### Task 2：统一请求及服务端代理

**Files:** 新增 src/lib/http/{types,request}.ts、src/lib/server/backend.ts、tests/unit/http.test.ts、tests/unit/backend.test.ts；修改 src/lib/{api-envelope,auth-api,sms-api,upload-api,portal-api}.ts 及现有 src/app/api 下代理。

**Interfaces:** `HttpError` 提供 kind（network/timeout/aborted/http/business）、status?、bizCode?、traceId；`requestJson<T>(url: string, options?: RequestOptions): Promise<T>`，RequestOptions 基于 RequestInit 加 timeoutMs、retries；默认超时 10 秒、重试 0，只允许 GET 显式重试一次。`backendRequest<T>(backend: 'portal'|'member', path: BackendPath, options?: RequestOptions): Promise<T>`，BackendPath 是现有接口的白名单联合类型，不接受完整 URL；兼容文件上传和原始响应通过单独 `backendFetch(...): Promise<Response>` 复用同一运输层。

- [ ] 写测试：HTTP 200/code 非 200 抛 business；取消抛 aborted；超时抛 timeout；Headers 自定义值保留；FormData 不新增 Content-Type；POST 不重试；GET 显式一次重试；路径前缀保留；任意 URL 拒绝。
- [ ] 运行上述测试确认失败。
- [ ] 实现共享请求和后端接口映射，统一 traceId 与 portal-web 来源；错误响应不泄露上游正文或凭证。保留现有导出和调用方数据形状。
- [ ] 运行 http/backend 测试、typecheck；验证会员请求走 member、门户请求走 portal；迁移后的客户端代码不读取后端环境变量。
- [ ] 中文提交请求底座及兼容适配。

### Task 3：修改请求、上传与生产安全策略

**Files:** 新增 src/lib/security/{origin,upload,links,rate-limit,headers}.ts、src/lib/server/mutation.ts、tests/unit/security.test.ts、tests/unit/upload.test.ts；修改 next.config.ts、vercel.json、src/app/api 下修改接口、src/components/Uploader/index.tsx。

**Interfaces:** `assertTrustedOrigin(request: Request, origins: readonly string[]): void`；`validateUpload(file: File, policy: UploadPolicy): Promise<void>`；`validateExternalUrl(value: string, allowedHosts?: readonly string[]): URL`；`RateLimiter.check(key: string): Promise<{allowed:boolean; retryAfterSeconds:number}>`；`buildSecurityHeaders(options: SecurityHeaderOptions): Array<{key:string; value:string}>`。共享默认上传大小 10 MiB、数量 5，类型默认 JPEG/PNG/WebP/PDF；具体接口只允许取更严格子集，现有必要业务类型核实后单独配置。

- [ ] 写测试：修改请求缺 Origin/外站 Origin 拒绝，同源接受；伪装 PNG 拒绝；超限拒绝；javascript/data 链接拒绝；提交失败不登记重复成功；生产 CSP 不含通配脚本来源或 unsafe-eval。
- [ ] 运行测试确认失败。
- [ ] 实现统一修改请求守卫并接入各代理；限制请求体大小，检测文件签名。提供开发内存限流适配、生产外部限流配置状态，不虚构 Redis 接口。询盘重复标记只在后端业务成功后写入。
- [ ] 将安全头移入共享配置，Vercel 避免重复冲突。生产脚本 CSP 使用与 Next 渲染匹配的每请求 nonce，经 proxy 注入；开发允许调试所需 eval。所需地图/OSS 来源显式列出，生产 HSTS 由 HTTPS 部署配置控制。
- [ ] 运行安全测试及生产构建浏览器烟测，确认 Next/Semi/地图没有被策略误拦截；记录后端上传最终校验与共享限流待配置项。
- [ ] 中文提交安全策略。

### Task 4：会话验证、退出和保护入口

**Files:** 新增 src/lib/server/session.ts、src/app/api/auth/me/route.ts、src/app/api/auth/logout/route.ts、tests/unit/session.test.ts；修改 src/lib/auth-token.ts、src/lib/auth-api.ts、src/app/api/auth/[action]/route.ts。

**Interfaces:** `getSession(): Promise<SessionResult>`，结果为 authenticated/member、anonymous 或 unavailable；`requireSession(): Promise<WebMember>`；WebMember 使用后端 me 的安全字段；`logout(): Promise<void>` 客户端调用同源退出。getSession 只在单请求内去重，不能跨请求缓存成员。

- [ ] 写测试：无 Cookie 为 anonymous；后端 401 清 Cookie；后端 503 为 unavailable 不清 Cookie；A/B 两个请求不共享会员；登录响应不含 token；Cookie 寿命不超过 28800 秒或有效后端期限；退出清 Cookie 且受来源守卫保护。
- [ ] 运行测试确认失败。
- [ ] 实现以上接口；me 与保护入口调用后端 /web/members/me，默认 no-store。后端权限未知时不授予权限。改密、重置成功沿用失效会话约定。
- [ ] 运行会话测试和 typecheck；不增加全设备退出、公共买家注册或第三方登录的虚假实现。
- [ ] 中文提交会话模块。

### Task 5：统一语言、词典和格式化

**Files:** 新增 src/lib/i18n/{locale,format}.ts、tests/unit/i18n.test.ts；修改 src/lib/locale.ts、src/dictionaries/index.ts、src/dictionaries/{zh,en}.json、src/proxy.ts、src/app/layout.tsx。

**Interfaces:** `resolveLanguage(input: {pathLocale?:string; cookieLocale?:string; acceptLanguage?:string}): Locale`，Locale 为 zh/en；`formatMoney(value:number, currency:string, locale:Locale): string`、`formatNumber(value:number, locale:Locale): string`、`formatDate(value:Date, locale:Locale, timeZone:string): string`。解析 Accept-Language 的质量权重和地区变体，URL→有效 Cookie→头→zh；路径语言只从受控 portal 路由识别。

- [ ] 写测试：URL en 覆盖 Cookie zh；en-US 回落 en；q=0 不选；非法 Cookie 不生成非法跳转；字典键递归一致；金额需显式币种；日期输出不依赖服务器默认时区。
- [ ] 运行测试确认失败。
- [ ] 实现共享匹配与格式化；proxy 使用相同解析器，向根布局传递经过覆盖的内部语言头，外来同名头不可信；html lang 使用该语言。补齐基础错误/状态翻译。
- [ ] 运行 i18n 测试、typecheck，浏览器验证英文路径与中文 Cookie 冲突。
- [ ] 中文提交多语言底座。

### Task 6：Semi 复用、状态与错误边界

**Files:** 新增 src/components/Providers/index.tsx、src/components/StatusState/index.tsx、src/components/FormError/index.tsx、src/components/PrivacyNotice/index.tsx、src/app/error.tsx、src/app/global-error.tsx、src/app/not-found.tsx、src/app/loading.tsx、tests/browser/foundation.spec.ts；修改 src/components/Modal/index.tsx、src/components/index.ts、src/app/layout.tsx、src/styles/semi-theme.css 中必要样式。

**Interfaces:** `Providers({locale,children})` 接 Semi LocaleProvider；`StatusState({kind,locale,onRetry?})`，kind 为 loading/empty/error/forbidden/session-expired；`FormError({message,id?})`；通用 Modal 透传 closable、maskClosable、closeOnEsc 并默认可关闭。PrivacyNotice 组合单独保留拒绝/同意等权规则。保留旧 Modal 调用兼容，不擅自给授权动作默认同意回调。

- [ ] 写浏览器用例：英文状态不出现中文按钮；通用 Modal 按 Esc 关闭并回到触发按钮；PrivacyNotice 拒绝与同意均能键盘访问；错误状态重试调用一次；390px 和 1440px 无横向溢出。
- [ ] 设置 Playwright 使用独立测试展示夹具，夹具不成为生产页面；运行用例确认失败。
- [ ] 实现 Semi 组合组件和基础边界，复用 Button/主题；global-error 自含 html/body，不依赖已失败布局。不新造 Form/Input/Select 原语，不重做业务视觉页面。
- [ ] 运行浏览器用例、lint/typecheck，检查键盘焦点和减少动画偏好。
- [ ] 中文提交组件和错误边界。

### Task 7：元信息与索引边界

**Files:** 新增 src/lib/seo/metadata.ts、src/app/sitemap.ts、tests/unit/seo.test.ts；修改 src/app/robots.ts、src/app/layout.tsx、src/app/(auth)/layout.tsx、src/app/portal/[domain]/[lang]/layout.tsx。

**Interfaces:** `buildMetadata(input: {title:string; description:string; path:string; locale:Locale; alternates?:Partial<Record<Locale,string>>; private?:boolean}): Metadata`；sitemap 只收录真实已知公共路由，不猜测租户或对私有 API 做枚举。

- [ ] 写测试：测试环境 robots 禁止索引；私有页 noindex；生产 URL 没有示例域名；canonical 使用站点地址；无已知租户时不输出虚假租户路径；语言替代链接指向有效语言路径。
- [ ] 运行测试确认失败。
- [ ] 实现共享 metadata 与 robots/sitemap，移除假域名回落；保留真实门户允许索引的规则。
- [ ] 运行 SEO 测试和构建，检查实际响应 metadata、robots、sitemap。
- [ ] 中文提交 SEO 底座。

### Task 8：脱敏日志、健康检查及交付验证

**Files:** 新增 src/lib/server/logger.ts、src/app/api/health/live/route.ts、src/app/api/health/ready/route.ts、scripts/check-production-config.ts、tests/unit/operations.test.ts、.github/workflows/check.yml、docs/foundation/{usage,release-checklist}.md；修改 package.json、package-lock.json、.env.example。

**Interfaces:** `logEvent(event: {level:'info'|'warn'|'error'; name:string; traceId?:string; durationMs?:number; status?:number; errorKind?:string}): void`，只接收白名单字段；live 返回最小存活状态，ready 通过带超时的配置后端检查并在依赖失败时返回 503，均 no-store、不回传地址。外部收集通过可选适配器接入，无配置时不自动上传日志。

- [ ] 写测试：日志不接收密码/Token/正文；依赖失败 ready 为 503；live 不因后端不可用失败；生产配置检查发现缺站点或限流部署说明，返回非零退出状态，不输出变量值。
- [ ] 运行测试确认失败。
- [ ] 实现运行模块和生产检查。共享限流由实际网关/后端执行，发布清单要求验证并提供负责人；不能仅设置一个布尔变量就算上线保护完成。
- [ ] 核实官方框架安全公告及依赖审计；必要时仅升级同版本线补丁并重验。CI 使用 npm ci，执行 typecheck、lint、单元测试、无生产秘密的测试配置构建和浏览器验证；build:verify 保持隔离本地开发目录。
- [ ] 写模块使用、组件选择、配置、限流/日志/备份责任、生产自测及回滚说明；明确未接第三方登录和未完成后端撤销接口。
- [ ] 运行全部检查，核查浏览器包无服务端配置；对全分支做独立最终审查，修复实质问题后再重复相关检查。
- [ ] 中文提交交付文件；报告实测结果和外部配置项，不自动合并 main 或发布。

## 执行方式与评审

推荐本会话顺序实施：8 项共享接口紧密依赖，保持单一实施上下文更容易控制兼容性，最终独立审查整分支。另一方式为每项分别交给实施和审查子代理，检查频率更高但耗时和上下文成本更高。用户确认计划并选择方式后开始代码实施。

自检：设计 1–4 节对应任务 1、2、6；第 5 节对应任务 2、4；第 6 节对应任务 3、8；第 7 节对应任务 5、6；第 8 节对应任务 7、8；第 9 节对应各项测试及任务 8。五项 Review Focus 均已落到对应测试。外部依赖通过明确配置与发布核验交付，不算本仓库已经完成外部部署。
