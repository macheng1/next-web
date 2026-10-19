# 公共网站邮箱认证设计

日期：2026-10-08。状态：用户已确认书面规格；产品代码已实现并完成自动化验证，真实邮件和完整后端联调待验证。

## 目标与依据

实现制造帮 / ManuLink 公共网站的邮箱注册、登录、找回密码和个人账号页。Web 主动注册与小程序静默登录都进入现有 members 表，注册来源不同。网站认证独立，企业管理和运营认证不改。

用户已确认功能范围、会员模型和页面设计；页面严格对应 `/Users/aldrich/Documents/Codex/2026-09-15/jie/outputs/web-auth-flow-design/index.html` 及同目录 screens 截图。仅删除本次不启用的第三方按钮与设计预览控件，不改变布局、品牌色、字体、表单尺寸和响应式规则。

本次不实现 Google / Microsoft、第三方身份表、跨端会员合并、企业审核重构、询盘订单新入口。不可用的功能不展示可点击入口。

## 当前源码事实

- next-web 有认证代理、HttpOnly Cookie、session、http 请求封装，但登录入口仍是 ComingSoon。
- wx-backend 现有 `/web/auth/login` 和 MemberWebAuthGuard 限制 enterprise 会员，不能作为新买家认证入口。
- `/web/members` 混合基础资料、历史企业注册和企业资料修改；不能整体替换认证守卫。
- EnterpriseAccountGuard 已独立；继续保留企业管理边界。
- Member 邮箱具有非空部分唯一索引，但该索引未统一邮箱大小写。
- 密码使用现有 password.utils.ts 的 scrypt；不引入 bcrypt 或另一套哈希。
- MailService 现有业务发送方法吞掉发送失败；注册验证邮件必须能识别发送失败，且不能把验证码打印到日志。
- RedisService 和 MailService 是全局模块，可以复用基础连接。
- members.openid 必填，Web 会员使用内部随机占位值；Google 身份不得塞进该字段。

## 账号和数据边界

- 会员主键与会员业务数据共用。新 Web 注册：source=web、platform=web、memberType=personal、status=active。
- source 保留首次来源，登录不修改；记录 lastLoginSource=web。
- 已有 active 会员具备邮箱和密码时，可使用网站登录，不按 source/memberType 拦截。
- 没有密码的历史会员不能被普通密码登录冒用。本次不提供两个既存账号的合并；忘记密码只适用于已有密码的 active 会员。
- 邮箱冲突不会覆盖、删除或新建重复会员；提示使用已有账号。
- 不授予企业管理账号或运营权限。不调用历史企业注册接口。

## 网站会话

- 新 JWT type=`public-web-member`，aud=`manulink-public-web`，iss=`manulink`；默认有效期 8 小时。
- sub=memberId，tokenVersion=数据库版本；不把 token 的 memberType 当授权真源。
- 网站守卫检查签名、type、aud、iss、过期时间、active 状态、数据库 tokenVersion；允许 personal/enterprise。
- 强制改密会员仅允许当前会员查询、改密及退出；登录后进入改密页。
- 使用网站专用 HttpOnly Cookie `public_web_token`，SameSite=Lax，生产 Secure，path=/，不暴露 accessToken 给浏览器 JS。
- 旧 member_web_token 不作为新网站会话；升级后旧网页用户重新登录。
- 普通退出仅清除当前网站 Cookie，不递增共用 tokenVersion；语言与 Cookie 偏好不清除。
- 改密/重置通过现有统一密码写入口递增 tokenVersion，因此同一会员的 Web、小程序和历史会员凭证失效；页面明确告知。这不是 enterprise-account 的密码操作。
- 返回地址仅接受单斜线开头、无反斜线/控制字符、同站路径；拒绝协议相对地址和认证页循环。默认 /account。

## 邮箱和数据库

- 新输入邮箱 trim + lowercase；不做 Gmail 点号、加号等供应商特定变换。密码不 trim。
- 添加 email_verified_at（nullable timestamptz）。新注册成功写入，历史会员不擅自标记已验证。
- 新增 lower(btrim(email)) 的非空唯一索引；保留现有索引。迁移先检查归一化重复，发现冲突直接中止并输出需处理提示，不自动合并历史会员。
- 新注册使用事务和唯一约束处理竞争；email/openid 创建与协议记录一起提交。
- 验证码、注册凭证和重置凭证使用 Redis，不新增临时验证码数据库表。
- 本次只生成迁移，未经明确授权不执行生产迁移。

## 注册状态机

1. 输入邮箱并明确同意协议；服务条款与隐私入口使用站点真实政策内容，不链接 #。
2. 发送 6 位密码学随机验证码，有效期 10 分钟；验证码摘要存储，不记录明文日志。
3. 同邮箱重发间隔 60 秒；IP 发送上限 10 次/小时，邮箱上限 5 次/小时。验证码最多失败 5 次后作废。
4. 验证成功原子消费验证码，生成随机一次性 registrationToken（256 bit），有效期 10 分钟；Redis 以摘要为键，保存归一化邮箱、协议版本与同意时间。
5. 设置至少 8、至多 128 字符密码；确认密码仅在表单比较，不传给后端。
6. 后端原子取得注册凭证，事务创建会员并签发会话；不能通过前端 verified 布尔值创建会员。
7. 失败时保留表单；注册凭证过期引导重新验证。数据库已成功但响应丢失时，重试不能重复创建，提示登录或恢复登录。
8. 回退修改邮箱时清除验证码和注册凭证，不能把邮箱 A 的凭证用于邮箱 B。

## 邮箱登录

- 格式校验后统一查询归一化邮箱，密码错误/账号不存在使用相同外部错误。
- 每 IP 最多 30 次/15 分钟，每邮箱最多 10 次/15 分钟；共享 Redis 限流，不依赖 Next.js 进程内 Map。
- 禁用会员不能登录；密码正确后按状态拒绝。
- 登录成功签发公共网站会话，更新登录记录；记录失败不暴露内部异常或密码。
- 服务不可用显示可重试错误，不能当作密码错误或自动注册。

## 找回和修改密码

- 找回请求对不存在、无密码、禁用会员统一返回“如果该邮箱符合条件，将收到重置邮件”，不泄露账号情况。
- 重置令牌 256 bit、摘要存 Redis、30 分钟有效；同会员仅最新令牌可用。申请频控与注册相同。
- 邮件链接使用明确的 PUBLIC_WEB_URL 构造 `/reset-password?token=...`，不从用户提交地址或 Host 拼接。正式环境要求 HTTPS。
- 邮件语言由受限的 zh/en 参数选择；无需泄露凭据到前端。
- 重置提交原子消费令牌，重新检查会员状态与令牌对应的 tokenVersion，写入新密码并递增 tokenVersion；同时提交仅一个成功。
- 改密必须验证当前密码，拒绝新旧相同；成功清除网站 Cookie，引导重新登录。
- token 不进入日志、分析事件或外链 Referer；重置页 noindex、no-store、Referrer-Policy=no-referrer。
- 邮件 SMTP 不可用不伪装已发送注册验证码。找回接口保持泛化响应，发送失败记录不含令牌的运维错误。

## 后端接口契约（新增）

前缀 `/web/site-auth`，沿用现有业务响应 envelope。成功 code=200；失败保留机器可识别 errorKey 和正确 HTTP 状态。每个接口严格 DTO，禁止客户端写入 source/memberType/status/tokenVersion。

| 方法与路径 | 请求 | 成功 data |
| --- | --- | --- |
| POST /register/send-code | email, acceptedTerms=true, locale=zh/en | retryAfter=60 |
| POST /register/verify-email | email, code | registrationToken, expiresIn=600 |
| POST /register | registrationToken, password | SessionResult |
| POST /login | email, password | SessionResult |
| POST /forgot-password | email, locale | 通用 message |
| POST /reset-password | token, newPassword | message |
| GET /me | Bearer 网站凭证 | SafeMember |
| PUT /me/profile | nickname | SafeMember |
| POST /me/avatar | multipart file | SafeMember |
| POST /me/change-password | currentPassword, newPassword | message |

SessionResult={accessToken,expiresIn,mustChangePassword,member:SafeMember}。Next.js 剥掉 accessToken，浏览器仅收到安全字段。

SafeMember={id,email,nickname,avatarUrl,memberType,mustChangePassword,emailVerified,hasPassword}。不返回 passwordHash、sessionKey、openid、内部企业资料、营业执照或权限凭据。

头像上传沿用现有内容/大小检查与 OssService；只允许 jpeg/png/webp，最大 2 MB；不能让客户端直接提交任意 avatarUrl 绕过上传校验。昵称限制 32 字符。提交者只能更新自己的 memberId。

常见 errorKey：invalid_credentials、email_in_use、code_invalid、code_expired、registration_expired、reset_invalid、rate_limited、mail_unavailable、session_expired、account_disabled、password_unchanged、service_unavailable。

## 前端页面与设计映射

| 路由/状态 | 已确认截图 | 行为 |
| --- | --- | --- |
| /login | 01-登录.png | 邮箱密码、显示密码、找回密码、注册入口 |
| /register | 02-注册.png | 邮箱与协议，不显示第三方按钮和第三方分隔线 |
| 注册验证步骤 | 03-邮箱验证.png | 邮箱提示、验证码、重发倒计时、回退 |
| 注册设置密码步骤 | 04-设置密码.png | 双密码输入，成功跳安全返回地址 |
| /forgot-password | 07-找回密码.png | 发送重置邮件 |
| 邮件请求完成 | 08-邮件发送.png | 泛化提示、换邮箱、返回登录；删除“预览重置链接”演示按钮 |
| /reset-password | 09-重置密码.png | token 来自邮件；双密码输入 |
| 无效重置链接 | 10-链接失效.png | 重新申请入口 |
| 会话失效 | 11-登录过期.png | 登录入口及安全返回地址 |
| /account | 12-我的账号.png | 基础资料、邮箱状态、邮箱登录方式、资料编辑、改密、退出、现有入驻链接 |

账号页不显示假的企业申请状态，也不显示尚未实现的收藏/询盘/订单按钮。不将 memberType 直接标成审核通过。头像编辑、昵称编辑和密码子页面沿用同一窄表单壳与视觉规范。

视觉：桌面头部 90 px，双栏 50/50；左侧 #f0f7f4 介绍与三步合作卡片；右侧 400 px 表单，输入及主按钮 48 px、8 px 圆角。主色 #0e7566、边框 #dce7e5，系统字体。850 px 以下隐藏左栏、头部 72 px、表单左右 26 px。不使用外部字体。

优先复用 Semi UI 与已有 Button；通过局部样式达到设计稿尺寸，不修改全站按钮默认风格。复用 BrandLogo、LanguageSelect、Providers、请求封装、错误体系和语言配置。中文英文键一致，包含错误和无障碍标签。

## 代码改动位置

后端新增 `src/domains/web/site-auth/`：module、controller、dto、service、session.service、email-verification.service、password-reset.service、guard 及测试。在 WebModule 导入新模块；现有 MemberModule 导出的仓储/JwtModule 继续复用，不复制基础设施连接。

修改 MailService：新增认证专用严格发送方法和 zh/en 模板；不改变企业审核邮件既有行为。修改 Member 实体并新增数据库迁移；密码写入复用现有工具和原子 tokenVersion 更新。

前端新增 `src/components/auth/`（AuthShell、表单、账号页）、`src/lib/auth/copy.ts`、安全 returnTo 工具与测试；新增上述页面。修改 auth-api、API 代理、backend 白名单、session 查询路径和 auth-token cookie。

拆分注册/邮箱验证代理与个人资料上传代理，避免把现有 [action] 变为不校验的万能代理；仍全部调用统一 backendFetch 和 guardMutation。

CatalogShell 的登录入口接真实页面，已登录显示账号入口；不把服务不可用显示为已退出。导航保持已确认站点风格。

## 验证和完成标准

- 后端测试先覆盖验证码过期/次数/重放、注册凭证一次性、并发邮箱冲突、个人会员登录、禁用、错误 token 类型/aud/iss、旧版本凭证、改密与重置竞争、资料归属。
- 前端测试覆盖 token 不返回 JS、Cookie 属性、POST 来源检查、上传大小、安全回跳、错误 envelope、语言键一致。
- 按仓库执行 typecheck、lint、全部单元测试、隔离构建；不重启用户已有服务、不污染当前构建。
- 浏览器验证桌面/手机/中文/英文/键盘，与设计截图对照。登录注册联调应使用隔离测试数据，不能创建或修改生产账号。
- 真实邮件送达、实际 API 注册/再次登录/找回密码和数据库结果分别验证；单元测试通过不称为上线完成。
- 不提交、不合并、不推送、不部署，不执行生产迁移，除非用户另行要求。

## 外部配置与上线条件

后台：SMTP 发件人及凭据、Redis、公共网站专用 JWT 配置、PUBLIC_WEB_URL。网页：MEMBER_API_URL（含 /api/v1）、NEXT_PUBLIC_SITE_URL、可信来源和共享限流模式。

生产 JWT 不使用开发默认密钥。无需 Google 配置或第三方依赖。上线前先执行邮箱冲突预检、迁移，再部署后端与网页；旧网站 Cookie 不自动迁移，用户重新登录。
