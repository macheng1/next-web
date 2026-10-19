# Public Web Email Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline implementation, or superpowers:subagent-driven-development only if the user chooses delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现共用 members 表的公共网站邮箱注册、登录、找回密码和个人账号页面。

**Architecture:** 新增后端 SiteAuthModule，复用会员仓储、密码工具、邮件与 Redis。网站专用 JWT 和守卫隔离其他端。Next.js 通过受限代理调用后端，使用 HttpOnly Cookie，并按已确认设计稿渲染。

**Tech Stack:** NestJS、TypeORM/PostgreSQL、Redis、nodemailer、Next.js App Router、React、Semi UI、Vitest、Playwright；使用各仓库既有 pnpm 与锁文件。

**Spec:** `/Users/aldrich/Documents/next-web/docs/superpowers/specs/2026-10-08-public-web-email-auth-design.md`

## Global Constraints

- 共用 members；新注册 source=web、platform=web、memberType=personal、status=active。
- 不实现 Google/Microsoft、第三方身份表、既存会员合并、企业审核重构；旧认证不放宽。
- 密码使用现有 scrypt，8–128 字符，不 trim；昵称最大 32 字符。
- JWT type=public-web-member、aud=manulink-public-web、iss=manulink、8 小时；Cookie public_web_token、HttpOnly、SameSite=Lax、生产 Secure。
- 验证码 6 位、10 分钟、5 次失败；注册凭证 256 bit、10 分钟；重置凭证 256 bit、30 分钟。一次性数据通过 Redis 原子操作消费，不记录明文。
- 发信间隔 60 秒、邮箱 5 次/小时、IP 10 次/小时；登录邮箱 10 次/15 分钟、IP 30 次/15 分钟。
- 不假装邮件成功。生产 PUBLIC_WEB_URL 必须 HTTPS；生产认证密钥不能使用开发默认值。
- 数据变更只生成迁移，生产迁移、提交、合并、推送、部署均不在本次授权范围。
- 请求复用 http、guardMutation、backendFetch 白名单；zh/en 键一致，安全回跳默认 /account。
- 页面对应已批准设计目录 outputs/web-auth-flow-design；桌面 50/50 双栏、400 px 表单、48 px 输入按钮、8 px 圆角，850 px 以下隐藏介绍栏。

## Review Focus

- 注册/改密事务完成但响应中断：重试不创建重复会员，页面提供登录或重新验证出口。
- 发信失败或 Redis 暂时不可用：不产生成功假象，错误不泄露验证码或重置凭证。
- 历史邮箱大小写冲突：迁移中止而非合并；未知历史验证状态不标记为已验证。
- 改密与禁用并发：条件更新核对 tokenVersion/status，旧会话不能恢复有效。
- 多标签页、语言切换、认证页回跳：中间状态失效时能重新验证，不能开放跳转或丢失合理的错误反馈。

## Execution constraints

两个仓库在计划生成时均无产品代码未提交改动。执行前重新检查；隔离工作区按 using-git-worktrees 技能决定。用户未要求提交，覆盖技能默认提交步骤：每任务记录文件与测试结果，不自行提交。

后端路径以 `/Users/aldrich/Documents/wx-backend` 为根，网页路径以 `/Users/aldrich/Documents/next-web` 为根。所有长日志保存到本次执行工作区，逐一读取结果。

### Task 1: 邮箱规范与数据迁移

**Files:**
- Create (backend): `src/domains/web/site-auth/site-auth.model.ts`
- Create (backend): `src/domains/web/site-auth/site-auth.model.spec.ts`
- Modify (backend): `src/domains/shared/member/member.entity.ts`
- Create (backend): `src/database/migrations/<next-timestamp>-public-web-member-email.ts`，时间戳必须大于现有全部迁移
- Create (backend): `src/domains/web/site-auth/email-migration.spec.ts`

**Interfaces:**
- Produces: `normalizeSiteEmail(value: string): string`；`SiteLocale = 'zh' | 'en'`；`SafeSiteMember` 和 `SiteSessionResult` 与规格完全一致。
- Produces: `Member.emailVerifiedAt?: Date`；数据库表达式唯一索引 `lower(btrim(email)) WHERE email IS NOT NULL`。

- [ ] RED：测试邮箱 trim/lowercase、不做点号或加号变换；迁移发现归一化重复时抛错且不执行 DDL。
- [ ] Run: `pnpm exec vitest run src/domains/web/site-auth/site-auth.model.spec.ts src/domains/web/site-auth/email-migration.spec.ts`。Expected: 缺失实现导致失败。
- [ ] 实现模型；迁移 up 先预检，再加 nullable email_verified_at 和表达式唯一索引；down 只撤销新增对象，不删除会员数据。
- [ ] GREEN：同一测试命令通过；在可用的隔离 PostgreSQL 数据库验证真实索引拒绝大小写重复。没有隔离数据库时明确记录该项未验证。
- [ ] 更新 ledger，保留迁移未执行状态。

### Task 2: 邮件、共享限流和一次性验证状态

**Files:**
- Modify (backend): `src/common/mail/mail.service.ts`
- Create (backend): `src/common/mail/site-auth-mail.spec.ts`
- Create (backend): `src/domains/web/site-auth/site-auth-state.service.ts`
- Create (backend): `src/domains/web/site-auth/email-verification.service.ts`
- Create (backend): 对应 `.spec.ts`

**Interfaces:**
- Consumes: Task 1 normalizeSiteEmail、SiteLocale；RedisService.getClient()、MailService 已有 transporter。
- Produces: `MailService.sendSiteVerificationCode(to, code, locale): Promise<void>` 和 `sendSiteResetLink(to, url, locale): Promise<void>`，未配置/失败时抛错，不打印正文。
- Produces: `SiteAuthStateService.rateLimit(key: string, limit: number, ttlSeconds: number): Promise<void>`；`put(key, payload, ttlSeconds)`；`consume<T>(key): Promise<T | null>`。计数和消费用原子 Redis 操作。
- Produces: `EmailVerificationService.sendCode(email, acceptedTerms: true, locale, ip): Promise<{retryAfter: 60}>`；`verify(email, code): Promise<{registrationToken: string; expiresIn: 600}>`；`consumeRegistration(token): Promise<{email, privacyVersion, privacyAgreedAt}>`。

- [ ] RED：验证码过期、5 次错误后锁定、重发使旧码失效、并发验证只有一次成功、协议未同意不发信、发送失败不返回成功、注册凭证不能重放。
- [ ] Run: `pnpm exec vitest run src/common/mail/site-auth-mail.spec.ts src/domains/web/site-auth/email-verification.spec.ts src/domains/web/site-auth/site-auth-state.spec.ts`。Expected: 缺失功能导致失败。
- [ ] 实现严格邮件方法、双语模板、独立 site-auth Redis key 命名空间、频控及原子验证码判定。
- [ ] 验证码摘要使用配置密钥的 HMAC，避免 6 位码在 Redis 泄漏后被离线枚举；验证码明文只用于发送。
- [ ] GREEN：全部命名测试通过；模拟未配置 SMTP 与发送异常，无明文验证码日志。
- [ ] 更新 ledger。

### Task 3: 网站注册、登录、会话和守卫

**Files:**
- Create (backend): `src/domains/web/site-auth/site-auth.service.ts`
- Create (backend): `src/domains/web/site-auth/site-session.service.ts`
- Create (backend): `src/domains/web/site-auth/site-auth.guard.ts`
- Create (backend): 对应 `.spec.ts`

**Interfaces:**
- Consumes: Task 1 模型、Task 2 state/verification、Member 仓储、JwtService、ConfigService、现有 hashPassword/verifyPassword。
- Produces: `SiteAuthService.register(registrationToken, password): Promise<SiteSessionResult>`；`login(email, password, ip): Promise<SiteSessionResult>`。
- Produces: `SiteSessionService.issue(member: Member): Promise<SiteSessionResult>`；`verify(token: string): Promise<Member>`；`toSafeMember(member: Member): SafeSiteMember`。
- Produces: `SiteAuthGuard` 写入 `req.siteMember`，仅允许网站会话；强制改密仅开放 GET me 与 POST me/change-password。

- [ ] RED：普通会员成功登录；miniapp/admin/enterprise-account/member-web token 均拒绝；aud/iss/type 错误拒绝；disabled 与旧版本 token 拒绝；source 不影响正确密码登录。
- [ ] RED：无凭证不能注册、唯一约束竞争只产生一会员、客户端不能设置企业类型、强制改密受限、safe member 不含私有字段。
- [ ] Run: `pnpm exec vitest run src/domains/web/site-auth/site-auth.service.spec.ts src/domains/web/site-auth/site-session.spec.ts src/domains/web/site-auth/site-auth.guard.spec.ts`。Expected: 缺失实现导致失败。
- [ ] 实现邮箱归一化查询，验证凭证后事务创建 Web 占位 openid 会员；捕获唯一约束映射 email_in_use；专用配置密钥签发和验证网站 JWT。
- [ ] 对无账号密码校验采用固定 dummy hash，降低用户名枚举时序差异；登录频控使用 Task 2 原子计数。
- [ ] 登录记录更新失败捕获并安全记录，不产生未处理 Promise；无法连接数据库返回 service_unavailable。
- [ ] GREEN：命名测试通过，现有企业/小程序 guard 测试仍通过。
- [ ] 更新 ledger。

### Task 4: 找回、改密、资料接口与模块接线

**Files:**
- Create (backend): `src/domains/web/site-auth/site-password-reset.service.ts`
- Create (backend): `src/domains/web/site-auth/site-member.service.ts`
- Create (backend): `src/domains/web/site-auth/site-auth.dto.ts`
- Create (backend): `src/domains/web/site-auth/site-auth.controller.ts`
- Create (backend): `src/domains/web/site-auth/site-auth.module.ts`
- Create (backend): 对应服务和 HTTP 合约 `.spec.ts`
- Modify (backend): `src/domains/web/web.module.ts`；按现有 config 结构登记专用配置与环境示例。

**Interfaces:**
- Consumes: Task 2 严格邮件和 state、Task 3 会话/guard。
- Produces: `/web/site-auth` 下规格列出的全部接口，保持现有 envelope，BusinessException data 携带 errorKey；所有失败保持真实 HTTP 状态。
- Produces: `SitePasswordResetService.requestReset(email, locale, ip)`；`resetPassword(token, newPassword)`。
- Produces: `SiteMemberService.profile(memberId, nickname)`；`avatar(memberId, file)`；`changePassword(memberId, tokenVersion, currentPassword, newPassword)`。

- [ ] RED：找回未知/禁用/无密码账号响应一致；最新 reset token 生效；并发重置一次成功；过期和旧版本拒绝；改密新旧相同拒绝；禁用并发不能绕过。
- [ ] RED：PUT profile 只能更新本人昵称；上传只接受有效 jpeg/png/webp 且 ≤2 MB；DTO 拒绝写入 memberType/avatarUrl；手机号或企业信息不进入新接口。
- [ ] Run: `pnpm exec vitest run src/domains/web/site-auth`。Expected: 新接口/服务测试失败。
- [ ] 实现 reset token 与 latest 映射的原子更新/消费；密码更新事务锁定会员行并核对 status/tokenVersion，复用 scrypt 工具和现有密码更新语义，不改旧路径行为。
- [ ] 通过 ConfigService 读取 PUBLIC_WEB_URL，URL 构造重置链接，生产校验 HTTPS；缺失配置时安全失败。
- [ ] 模块导入 MemberModule，不重复创建 Redis/邮件/Jwt 基础连接；Controller 使用严格 DTO 和网站 guard。
- [ ] GREEN：`pnpm test`、`pnpm run lint`、`pnpm exec tsc --noEmit -p tsconfig.build.json`。Expected: 全部通过；数据库可选跳过明确记录。
- [ ] 更新 ledger。

### Task 5: Next.js 代理、会话和客户端契约

**Files:**
- Modify (web): `src/lib/auth-api.ts`、`src/lib/auth-token.ts`、`src/lib/server/session.ts`、`src/lib/server/backend.ts`
- Modify (web): `src/app/api/auth/[action]/route.ts`、`src/app/api/auth/me/route.ts`、`src/app/api/auth/logout/route.ts`
- Create (web): `src/app/api/auth/register/send-code/route.ts`、`src/app/api/auth/register/verify-email/route.ts`、`src/app/api/auth/register/route.ts`
- Create (web): `src/app/api/auth/profile/route.ts`、`src/app/api/auth/avatar/route.ts`
- Create (web): `src/lib/auth/return-to.ts`；新增 `tests/unit/site-auth*.test.ts`；按契约更新 session/backend 既有测试。

**Interfaces:**
- Consumes: Task 4 `/web/site-auth` API。浏览器接口保留 `/api/auth/login` 等名称，后端目标全部切换新网站认证。
- Produces: `sendRegistrationCode(email, locale)`、`verifyRegistrationEmail(email, code)`、`register({registrationToken,password})`；现有 login/reset/change/logout/currentMember 名称保留。
- Produces: `updateProfile(nickname)`、`uploadAvatar(file)`；`safeReturnTo(value: string | null): string` 默认 /account。
- Produces: 浏览器 LoginResult 不含 accessToken；WebMember 增加 emailVerified/hasPassword，session 使用 GET /web/site-auth/me。

- [ ] RED：代理剥除 token；注册和登录 Cookie 属性正确；改密/重置清 cookie；logout 保留偏好；后端 200+业务错误不能被当成功。
- [ ] RED：不可信 Origin 拒绝、体积超限拒绝、出站白名单拒绝通配路径、上传超限/格式错误拒绝、安全回跳拒绝 //host、反斜线、编码绕过、认证循环。
- [ ] Run: `pnpm exec vitest run tests/unit/site-auth.test.ts tests/unit/site-auth-return-to.test.ts tests/unit/session.test.ts tests/unit/backend.test.ts`。Expected: 新契约测试失败。
- [ ] 实现薄代理，guardMutation/readJsonBody/backendFetch 复用；转译 errorKey 给双语页面，保留追踪 ID；新增注册代理不是不受限万能转发。
- [ ] Cookie 名切 public_web_token，旧 Cookie 不作为已登录；认证响应 no-store。
- [ ] GREEN：`pnpm test`、`pnpm run typecheck`。Expected: 全部通过。
- [ ] 更新 ledger。

### Task 6: 严格对应设计稿的页面和浏览器验收

**Files:**
- Create (web): `src/components/auth/AuthShell.tsx`、`AuthField.tsx`、`LoginForm.tsx`、`RegisterForm.tsx`、`PasswordResetForm.tsx`、`AccountView.tsx`、`AccountProfileForm.tsx`、`ChangePasswordForm.tsx`、`auth.module.css`
- Create (web): `src/lib/auth/copy.ts`
- Create (web): `src/app/(site-auth)/layout.tsx`、`login/page.tsx`、`register/page.tsx`、`forgot-password/page.tsx`、`reset-password/page.tsx`、`account/page.tsx`、`account/profile/page.tsx`、`account/password/page.tsx`
- Modify (web): `src/components/catalog/CatalogShell.tsx`
- Create (web): `tests/browser/auth.spec.ts`；修改 `tests/browser/fixture/main.tsx` 接入隔离测试表单；新增文案一致性测试。
- 根据站点现有政策组件确认条款/隐私入口；若真实内容没有提供，使用清晰展示实际收集和用途的政策页面，不虚构法律主体、联系地址或合规承诺；上线前核验文案。

**Interfaces:**
- Consumes: Task 5 auth-api/returnTo、现有 Button/Providers/BrandLogo/LanguageSelect。
- Produces: 规格列出的全部路由和状态，注册由 email→verify→password 三步组成，敏感中间凭证仅组件内存保留。
- Produces: `authCopy(locale)` 完整 zh/en 同结构文案；加载和错误保持输入，按钮 loading 防重复。

- [ ] RED：浏览器组件测试覆盖注册三步、验证码重发、密码不一致、找回泛化成功、过期重置、登录错误、强制改密、退出、资料上传失败；请求用隔离 mock，不误称真实联调。
- [ ] RED：语言切换保留同一表单状态；返回修改邮箱废弃原凭证；reset URL 缺 token 立即展示失效；HTTP 503 不当成匿名。
- [ ] 实现 AuthShell 原设计双栏介绍与三步卡片；只移除第三方按钮和演示控件，复用现有组件做局部覆盖。
- [ ] 登录/注册完成检查 mustChangePassword，按安全 returnTo 返回；账号页不展示假业务状态与不可用入口。
- [ ] Auth 页 metadata noindex；reset no-referrer/no-store，token 不流入分析日志；表单标签、错误关联、密码显示按钮具备双语无障碍标签。
- [ ] GREEN：`pnpm run typecheck`、`pnpm run lint`、`pnpm test`、`pnpm run build:verify`，之后浏览器测试。
- [ ] 浏览器在 1440 px 与 390 px，zh/en 截图逐一对照 screens；检查键盘、焦点、按钮和输入高度、无横向溢出。
- [ ] 对服务启动的旧偏好采用安全裁决：不重启已有 3000 服务；新增隔离验证进程仅用于测试，完成后关闭。此前自动审批拒绝的地址不绕过访问。
- [ ] 可用隔离数据库/Redis/SMTP 时执行真实注册→再次登录→资料修改→改密→找回→旧 token 失效；不存在这些条件时将真实联调标记未完成，不改生产数据。
- [ ] 最终审查权限、凭证泄漏、并发、视觉与文案；记录确切通过项和外部配置缺口。用户选择自主执行时不主动派发子代理。

## Handoff

建议由当前会话自主执行：后端和前端接口依赖紧密，统一实现更容易保持契约和设计一致。需用户确认这份计划并选择自主执行或分工执行后，才进入产品实现。

计划自查：会员模型、页面映射、接口、限流、邮件失败、一次性消费、归属、会话失效、密码与语言、迁移和验证均对应任务；所有测试先红后绿。数据库/邮件真实验证与自动化 mock 测试分别报告。没有 Google 任务。
