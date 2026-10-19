# Public Web Buyer Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task if native execution is selected. Use superpowers:subagent-driven-development only if the user explicitly selects delegation. Steps use checkbox syntax for tracking.

**Goal:** 接通确认的买家网站设计，复用共享询盘 / 报价 / 收藏 / 通知业务，记录请求渠道，移除网站入驻入口。

**Architecture:** Next.js 买家页面通过 Cookie 认证的服务端接口访问 NestJS Web 买家薄控制器，再调用现有共享服务。共享数据继续按 memberId 隔离；请求渠道由认证入口校验和规范化，写入对应业务事务。清单和草稿第一批使用按会员隔离的本地存储。

**Tech Stack:** Next.js App Router、React、TypeScript、Semi UI、NestJS、TypeORM、PostgreSQL、Vitest、Playwright；沿用各仓库 pnpm 锁文件。

**Spec:** `../specs/2026-10-09-public-web-buyer-workspace-design.md`（用户已确认）。

## Global Constraints

- 保留已有邮箱认证代码及所有工作区未提交内容，不提交、推送、部署或迁移生产数据库，不主动重启现有开发服务。
- 网站不展示企业入驻入口，Google、会员自动合并、订单、付款及售后不在本批新增范围。
- 使用确认的白色 / 浅绿 / 深绿设计，中文和英文同步，不连接翻译 API。
- Web 使用独立 SiteAuthGuard；来源只用于记录，不影响权限。
- 每家清单最多 50 条规格，数量 >0 且 <=999999999；piece/set 为整数，kg/meter 最多三位小数。
- 前端附件最多 5 个，每个 10 MB，仅 JPEG/PNG/WebP/PDF；服务端执行已有真实文件验证及归属检查。头像沿用 2 MB 认证接口。
- 新业务页面放在 /buyer，现有 /account 不覆盖。来源旧记录为 NULL，不按注册来源补猜。

## Review Focus

1. Header 和身份渠道不一致应拒绝，已发布旧客户端缺 Header 仍可由认证入口确认；Task 1 测试。
2. 企业回复更新询盘时不能覆盖买家创建来源；Task 2 测试。
3. Web 邮箱会员没有微信绑定电话仍可填写国际联系电话提交；Task 6 测试。
4. 登录过期 / 切换会员不应暴露上一会员草稿或丢失当前未发送文本；Task 5、7 测试。
5. 重试及并发新消息不能造成重复询盘、重复消息或错误“全部已读”；Task 4、6、7 测试。

## Repository roots

- W: `/Users/aldrich/Documents/next-web`
- B: `/Users/aldrich/Documents/wx-backend`
- M: `/Users/aldrich/Documents/my-miniprogram`
- E: `/Users/aldrich/Documents/wx-enterprise-console`
- A: `/Users/aldrich/Documents/wx-backend-console`

下列文件路径以对应仓库根目录为基准。执行前读取其适用 AGENTS.md。沿当前工作区实现，先记录 diff 基线，不搬动已有认证改动。用户未授权提交，因此各任务仅保留可审阅 diff。

### Task 1: 规范化请求渠道

**Files:** Create B `src/common/utils/request-source.ts`、`request-source.spec.ts`; modify B `src/domains/shared/trade/core/trade-policy.ts`、`trade-core.service.ts`; modify M `src/utils/request.ts`、`src/services/trade/index.ts`; modify E/A `src/services/trade.ts`.

**Interfaces:** `RequestChannel = 'web'|'miniapp'|'enterprise'|'admin'|'system'`; `requestChannel(header: unknown, authenticatedChannel: Exclude<RequestChannel,'system'>): RequestChannel`。缺失返回已认证渠道；Header 允许 portal-web/miniapp/enterprise-console/admin-console 且必须匹配入口。TradeActor 增加 `source: RequestChannel`；Web actor 从 `req.siteMember` 构造 member 身份。

- [ ] 写失败测试：portal-web + Web 得 web；未知值和错配抛错误；缺失 + miniapp 得 miniapp；来源不改变 actorId / 权限。
- [ ] B `pnpm exec vitest run src/common/utils/request-source.spec.ts`，确认新行为失败。
- [ ] 实现函数及 actor 的 Web 分支；其余 actor 读取现有身份并统一解析渠道。各客户端补 Header，Taro 原生上传单独补同名 Header。
- [ ] 运行函数测试、现有 trade-core 和守卫测试，均通过且不接受其他端 Token。

### Task 2: 数据迁移及事务来源

**Files:** Create B `src/database/migrations/1710000042400-buyer-request-source.ts`；modify B `src/database/data-source.ts`、`src/domains/shared/trade/core/trade-core.service.ts`、`src/domains/shared/trade/transactions/trade-transactions.service.ts`、`src/domains/shared/notification/notification.entity.ts`、`notification.service.ts`、`src/domains/shared/interaction/favorite.entity.ts`、`favorite.service.ts`; extend对应 service specs; create B `src/database/migrations/buyer-request-source.spec.ts`.

**Interfaces:** 可变询盘 / 报价 / 收藏响应含 `createdSource: RequestChannel|null`、`updatedSource: RequestChannel|null`；消息 / 附件 / 审计含 `createdSource`；通知含创建来源、触发来源与阅读来源。SQL 列采用 snake_case，可空并限制合法枚举。来源随原业务事务一起持久化，响应映射不泄漏 Token 或完整 Header。

- [ ] 写失败测试：历史列 NULL；Web 创建询盘、企业回复后 createdSource=web 且 updatedSource=enterprise；取消恢复收藏只更新修改来源；后台通知创建来源 system、阅读来源 web。
- [ ] 跑针对性 Vitest，记录失败原因是来源能力未实现。
- [ ] 添加可逆迁移和入口注册，更新所有本链创建 / 修改 SQL，包括报价、消息、附件、审计及触发通知；保留历史 NULL，保持原事务幂等语义。
- [ ] 在隔离 PostgreSQL 测试库验证 up/down 和业务来源；不可用时保留迁移并报告未验证，不能使用生产代替。跑对应共享服务回归。

### Task 3: 产品收藏与 Web 买家控制器

**Files:** Modify B `src/domains/shared/interaction/favorite.entity.ts`、`favorite.service.ts`、`src/domains/shared/content/my-favorites.service.ts`、miniapp收藏DTO枚举；Create B `src/domains/web/buyer/buyer.module.ts`、`buyer.controller.ts`、`buyer.dto.ts`、`buyer.service.ts`、`buyer.controller.spec.ts`、`buyer.service.spec.ts`; modify B `src/domains/web/web.module.ts`.

**Interfaces:** Spec 列出的 `/web/buyer/*` 接口；BuyerService 只适配共享服务与响应。收藏扩展 targetType=product，沿现有 enterprise.product_categories 产品 UUID 查可见性；列表下架 payload=null。GET dashboard 返回待回复、聊天未读、通知未读和收藏统计。报价仅 list/detail，不开放 accept。

- [ ] 写失败测试：Web 身份成功；小程序 / 企业 Token 不可访问；member A 不可读 B 询盘或附件；不可见报价草稿不返回；产品取消收藏重复调用幂等；下架仍占位。
- [ ] B `pnpm exec vitest run src/domains/web/buyer`，确认未实现失败。
- [ ] 注册模块并复用 SiteAuthModule、TradeCoreModule、TradeTransactionsModule、InteractionModule、NotificationModule；保持依赖单向，不卡片服务引入循环。
- [ ] 跑新控制器、服务、共享收藏与交易测试；验证没有复制一套询盘 / 消息状态机。

### Task 4: Next.js 买家服务端接口

**Files:** Create W `src/lib/buyer/types.ts`、`api.ts`、`errors.ts`、`src/lib/server/buyer-proxy.ts`、`buyer-path.ts`、`src/app/api/buyer/[...path]/route.ts`; modify W `src/lib/server/backend.ts`; create W `tests/unit/buyer-proxy.test.ts`、`buyer-path.test.ts`、`buyer-source.test.ts`.

**Interfaces:** `BuyerBackendPath` 严格枚举 spec 的方法 / 路径组合；`buyerProxy(request: NextRequest, segments: string[]): Promise<Response>`；客户端 buyerApi 只访问本站 /api/buyer。出站固定 x-source-type=portal-web，允许 Idempotency-Key，不透传客户端 Authorization 或任意 Header。

- [ ] 写失败测试：任意 URL / 路径穿越 / 未开放订单动作被拒；无 Cookie 401；变更跨来源403；Token 不出现在响应；客户端伪造来源不能覆盖固定 portal-web；限额 body 拒绝；稳定重试键透传。
- [ ] W `pnpm exec vitest run tests/unit/buyer-proxy.test.ts tests/unit/buyer-path.test.ts tests/unit/buyer-source.test.ts`，确认失败。
- [ ] 基于 session、mutation、api-response、backend 现有原语实现 JSON / multipart 代理和明确白名单，失败保留机器错误码及追踪标识；no-store。
- [ ] 跑新单元测试及既有认证 / HTTP 测试；401与服务暂不可用分开处理。

### Task 5: 买家布局、导航、首页及清单

**Files:** Create W `src/app/buyer/layout.tsx`、`page.tsx`、`list/page.tsx`、`saved/page.tsx`; create W `src/components/buyer/BuyerShell.tsx`、`Overview.tsx`、`SourcingList.tsx`、`SavedItems.tsx`、`buyer.module.css`; create W `src/lib/buyer/draft.ts`、`draft-storage.ts`、`copy.ts`; modify W catalog `CatalogShell.tsx`、`CatalogFooter.tsx`、`Home.tsx`、`ProductDetail.tsx`、`EnterpriseDetail.tsx`、`VariantPicker.tsx`、`src/app/enterprise/apply/page.tsx`; create W `tests/unit/buyer-draft.test.ts`、`buyer-navigation.test.ts`.

**Interfaces:** `DraftItem` 含 productId/variantId/enterpriseId/name/specification/unit/quantity 字符串；`mergeDraftItems`、`validateDraftItems`、`removeSubmittedItems` 保持小程序规则。Storage key `buyer-draft-v1:<memberId|guest>:<enterpriseId>`；完整表单草稿独立保存。匿名草稿迁入会员只发生在当前登录衔接，不能读其他会员键。

- [ ] 写失败测试：件/套整数与kg/meter小数、50条限额、合并上限、企业隔离、提交清理只删未改变数量行、会员切换隔离、登录返回保持已选规格。
- [ ] 跑上述两个单元测试，确认失败。
- [ ] 实现清单 / 收藏 / 概览和产品企业入口，导航含真实角标；缺后端不填示例数据。首页按确认布局接真实目录。移除各处入驻链接，旧页面明确重定向 /products，保留后端入驻能力。
- [ ] 单元测试通过；浏览器检查桌面 / 手机 / 键盘 / zh/en、收藏下架占位、失效规格提示及无入驻入口。

### Task 6: 询盘列表、草稿及提交

**Files:** Create W `src/app/buyer/inquiries/page.tsx`、`new/page.tsx`、`[id]/page.tsx`; create W `src/components/buyer/InquiryList.tsx`、`InquiryForm.tsx`、`AttachmentPicker.tsx`、`src/lib/buyer/inquiry.ts`; create W `tests/unit/buyer-inquiry.test.ts`、`tests/browser/buyer-inquiries.spec.ts`.

**Interfaces:** `InquiryDraft` 含 subject/description/contactName/contactPhone/buyerCompanyName?/orderKind/expectedDate?/items/attachment metadata；`inquiryPayload(draft)` 输出共享 DTO 字段。支持企业直接 standard/custom 需求与目录规格需求。失败重试保持已上传附件ID、请求body和幂等键；成功保存快照并移除提交清单。

- [ ] 写失败测试：邮箱会员无需微信绑定可填写国际电话；必填空白拒绝；手动需求可提交；失效产品 / 规格和错企业拒绝；上传中不可提交；同请求重试只有一条询盘。
- [ ] 跑单元及隔离页面浏览器测试，确认失败点属于缺能力。
- [ ] 实现列表、组合筛选、无结果、草稿编辑 / 删除、完整表单、成功后进入同一询盘；“再次采购”只创建新草稿。
- [ ] 验证匿名点击 → 登录返回 → 提交成功 / 失败重试，企业端能读取同一询盘字段及来源；未实际联调时标记该项待验证。

### Task 7: 聊天、报价和消息中心

**Files:** Create W `src/components/buyer/InquiryConversation.tsx`、`MessageComposer.tsx`、`QuoteHistory.tsx`、`QuoteDetail.tsx`、`MessageCenter.tsx`; create W `src/app/buyer/messages/page.tsx`、`quotes/[id]/page.tsx`; create W `src/lib/buyer/read-position.ts`、`chat.ts`; create W `tests/unit/buyer-chat.test.ts`、`buyer-read-position.test.ts`、`tests/browser/buyer-chat.spec.ts`.

**Interfaces:** 消息按 sequence 前后游标读取；ReadPositionQueue 使用可见消息最高序号，并在切换询盘时失效。两种通知记录各自来源和已读口径，不制造重复统一通知。关闭询盘无输入框；报价仅可见版本和细项查看。

- [ ] 写失败测试：页面隐藏不盲目标已读；切换会话未完成回执不能影响新会话；消息重试ID不变；新消息到达不能被旧“全部已读”吞掉；登录过期不丢输入；关闭禁发；他人文件拒绝；报价草稿隐藏、总额对应真实数据。
- [ ] 跑针对性单元和隔离浏览器测试，确认失败。
- [ ] 实现聊天分页、附件预览 / 上传、错误重试、上下文报价卡片 / 历史弹窗和两个消息视图；复用小程序纯算法逻辑，移除Taro依赖，文案移入 zh/en。
- [ ] 浏览器验证企业回复 → Web 读取 → 双端已读一致；运行 React best-practices 检查新增 TSX，修正键盘 / 移动 / 错误恢复问题。

### Task 8: 控制台来源展示、整体回归及交付

**Files:** Modify E/A `src/components/trade/types.ts`、`BusinessData.tsx`、`presentation.ts`、`Workspace.tsx`；modify E `src/components/trade/InquiryConversation.tsx`、`src/pages/enterprise/inquiries/index.tsx`；modify A `src/pages/admin/transactions/index.tsx`、`transaction-audits/index.tsx`；modify M `src/services/trade/types.ts`；create W `tests/browser/buyer-workspace.spec.ts` and `docs/superpowers/plans/2026-10-09-public-web-buyer-workspace-verification.md`.

**Interfaces:** 来源标签共享显示语义：web=网站、miniapp=小程序、enterprise=企业端、admin=运营端、system=系统、null=历史来源未知。运营 createdSource 查询参数只开放认证授权范围，不扩张数据权限。

- [ ] 写失败测试：来源筛选不能越权；历史 NULL 可显示；创建 / 修改来源分开；来源与现有 manual/ugc/crawl 内容字段不混淆。
- [ ] 跑针对性展示 / 查询测试，确认失败。
- [ ] 实现来源展示与运营筛选，更新响应类型；小程序兼容新增字段与原接口，不修改现有订单行为。
- [ ] W `pnpm run typecheck`、`pnpm run lint`、`pnpm test`、`pnpm run build:verify`、`pnpm run test:browser`；B `pnpm test`、`pnpm run lint`、`pnpm run build`。先读取 M/E/A package.json 并执行仓库现有对应检查，不自行猜命令或改变锁文件。
- [ ] 对比基线 diff，明确改动归属；记录迁移是否仅生成 / 隔离验证、哪些实际服务联调完成、哪些未验证。不用测试模拟成功替代实际运行证据。

## Self-review and handoff

任务覆盖 spec 的页面、来源落库、跨端复用、账号衔接、限制与验证；不含生产部署、自动会员合并或新订单功能。已有账号页继续负责头像和密码；工作台链接过去，不复制一套认证表单。各任务先定向测试，最终只执行一次整体回归，除非出现新失败。

执行方法建议：本会话直接执行，按上述任务顺序推进。当前仅完成规范和计划，任务复选框均未开始；需用户核对实施计划并确认执行方法后进入代码实现。
