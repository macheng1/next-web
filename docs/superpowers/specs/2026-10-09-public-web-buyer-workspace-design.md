# Web 买家工作台与共享业务接入

日期：2026-10-09。状态：实施前规范，待用户核对。本文件将已确认的交互稿与实际接口约束合并；不是已完成实现报告。

## 目标与批准范围

按 `outputs/home-international-design/index.html`、`buyer.html` 和 `design-map.html` 的中英文、桌面及手机设计接入真实买家业务。优先复用小程序已有共享服务。登录会员进入买家工作台，完整走通浏览产品 / 企业、收藏、清单、提交询盘、企业回复、消息已读和报价查看。

移除本网站顶部、移动导航、首页和页脚的企业入驻入口；本批网站 `/enterprise/apply` 不再提供申请表，访问该 URL 返回产品浏览页。后端及其他端已存在的入驻能力保留。谷歌登录、会员合并、接受报价转订单、付款、发货、售后不在此批新增范围。

已有邮箱认证代码及所有工作区未提交内容保留。不提交、推送、部署或迁移生产数据库，不主动重启现有开发服务。所有新增变更可单独审阅。

## 已查明的代码事实

- 后端 miniapp/trade 控制器调用 TradeCoreService 和 TradeTransactionsService；企业、运营使用同一业务服务。
- SiteAuthGuard 将独立 Web 会话验证为 req.siteMember。TradeCoreService.actor 当前读取 req.member / req.enterpriseAccount / req.user，需要增加 Web 身份适配；不能借用小程序令牌或放宽原守卫。
- 企业收藏共用 member_favorites，目前只支持 content/enterprise/opportunity/activity，没有产品类型。
- 小程序采购清单在 Taro 本地存储中，键含会员和企业 ID；提交成功后移除提交的规格。
- 小程序询盘要求主题、需求说明、联系人及联系电话；支持 standard/custom 和产品目录以外的手动需求。单位 piece/set 为整数，kg/meter 最多三位小数；每家最多 50 条规格。
- Web request 已带 x-source-type: portal-web，但 Next.js backend.ts 出站 Header 白名单尚不保留它。当前查到的小程序和控制台源码尚没有同名 Header。
- 通知表与询盘聊天未读位置是不同业务；不能简单相加后再重复展示同一条事件。

## 身份与接口

新增后端 `/api/v1/web/buyer/*` 薄控制器：SiteAuthGuard 验证 Web 会员，明确构造 actorType=member、actorId=siteMember.id，然后调用共享服务。查询范围仍按 buyer_member_id 限定，同企业不同会员不能互看。会员禁用、会话失效和强制改密维持既有规则。

Next.js 新增 `/api/buyer/*` 服务端接口，使用 HttpOnly Cookie 读取会话、现有来源校验和请求体限制、server-only backend 出站及明确路径白名单；不将令牌返回浏览器。仅开放询盘创建 / 查看 / 关闭、消息 / 回执 / 已读、附件、报价只读、收藏、通知和概览；不得转发接受报价或订单变更。

### 主要后端接口

- GET /web/buyer/dashboard：当前会员待回复询盘、聊天未读、通知未读、收藏统计。
- GET/POST /web/buyer/inquiries；GET /web/buyer/inquiries/:id。
- GET/POST /web/buyer/inquiries/:id/messages；GET message-receipts；POST read / close。
- GET /web/buyer/inquiries/:id/quotes；GET /web/buyer/quotes/:id，排除企业报价草稿。
- POST /web/buyer/files；GET /web/buyer/files/:id/access。重用私有附件服务。
- GET/PUT /web/buyer/favorites：enterprise/product；显式 favorited 布尔值，不用盲目翻转。
- GET /web/buyer/notifications、unread-count；PUT 单条 read / read-all。

变更请求传稳定 Idempotency-Key；聊天传稳定 clientMessageId。相同内容失败重试保留标识；用户改变内容重新生成。不允许通用任意路径代理。

## 请求来源落库

沿用 x-source-type Header。Web 固定发送 portal-web，小程序 miniapp，企业端 enterprise-console，运营端 admin-console；后端规范化为 web/miniapp/enterprise/admin。业务不使用来源判定权限。

Web BFF 固定出站 portal-web，不透传浏览器自定义值。其他端 Header 与对应认证入口校验：缺失时由已验证入口确定渠道，非法或矛盾值拒绝；不使已发布旧小程序因缺 Header 立即不可用。

TradeActor 增加 source；创建 / 修改业务时在同一事务落来源：

- trade_inquiries、trade_quotes 等本链涉及的可变业务行：created_source / updated_source，原始来源不覆盖。
- trade_messages、trade_files、trade_audits：创建来源；消息、审计分别记录当次操作渠道。
- member_favorites：created_source / updated_source；取消 / 恢复更新修改来源。
- 通知：系统生成使用 system，触发操作来源独立保存；read_source 记录阅读动作，不将阅读来源误当通知创建来源。
- 草稿本地记录 source=web，并按 memberId 隔离，不声称已落数据库或跨设备同步。

来源属于本次采购链路，不覆盖目录已有 manual/ugc/crawl 内容来源，也不对无关表整体重构。历史列允许 NULL，展示“历史来源未知”，不根据最近登录或注册来源回填推测。企业 / 运营详情和审计显示来源，运营列表按 createdSource 筛选；来源字段同步进入响应类型。

## 页面与交互

- 网站首页采用确认的搜索主导设计，白色 / 浅绿 / 深绿；真实目录内容替代示例，缺图片如实占位，不伪造企业认证或产品规模。
- 顶部买家菜单：概览、询盘、清单、收藏、消息、账号。登录前入口进入登录页并保留站内 returnTo；已选规格与草稿按匿名 / 会员分区，登录完成明确迁入当前会员，退出后不显示上一会员数据。
- /account 保留现有认证页用途；买家工作台使用 /buyer，避免覆盖已验证账号行为。
- /buyer、/buyer/saved、/buyer/list、/buyer/inquiries、/buyer/inquiries/new、/buyer/inquiries/[id]、/buyer/messages、/buyer/quotes/[id]。
- 产品详情原有收藏与询盘占位入口变成真实操作。企业详情支持企业收藏及不选目录产品直接询盘；关闭询盘入口时展示原因。
- 清单每家最多 50 条规格，同 productId/variantId 合并数量。piece/set 正整数，kg/meter 最多三位小数，上限 999999999；重新读取产品校验企业归属、规格有效性和可询盘状态。
- 提交询盘表单补采购类型 standard/custom、联系人、联系电话、采购公司选填、必填需求说明。电话支持国际格式，沿用共享后端至少六位数字校验；不要求微信手机号绑定。
- 提交成功只移除实际提交且数量未变的清单行；询盘保留产品快照。再次采购由旧询盘准备新草稿，不直接重复发送。
- 草稿本地按会员 / 企业存储完整表单和规格；文件保存已上传 ID 与显示信息，重开时重新验证访问和有效性。不声称跨端同步。
- 聊天是主界面，询盘信息、产品快照、报价为上下文；按消息序号分页，显示区域观察后更新已读位置，不在打开页面时盲目标记所有消息。
- 聊天附件和询盘附件使用共享上传验证。前端最多 5 个文件，每个 10 MB，支持 JPEG/PNG/WebP/PDF；服务端继续检查真实内容及资源归属。上传成功且绑定后方可提交。头像仍走现有 2 MB 认证接口。
- 报价只展示已向会员可见的版本，包含单价、数量、小计、合计、币种、税费、运费、交期和有效期。历史弹窗按版本查看；不接受报价或生成订单。
- 消息中心分别提供询盘消息与系统通知视图；询盘列表基于现有 read position，系统通知基于通知服务。角标说明其统计对象；全部已读只标记本次已确认范围，不能吞掉随后到达的消息。
- 英文产品 / 企业使用现有手动英文字段，缺失回退中文；不接翻译 API。后端 reasonCode 映射 zh/en 文案。

## 验收

前后端单元测试覆盖身份隔离、不能读取他人记录、Header 伪造 / 缺失兼容、事务来源、创建来源不被更新覆盖、产品收藏取消恢复、旧 NULL 数据、下架产品占位、幂等重试。

页面验证完整浏览至询盘与报价链路，中文 / 英文、桌面 / 手机 / 键盘，登录返回、切换账号、本地草稿、数量单位、重复提交、上传失败、登录过期、关闭询盘、未读同步及企业端同记录显示。

执行 Web typecheck/lint/test/unit/隔离 build 与浏览器检查；后端测试、lint、build；受影响小程序和控制台做类型 / 构建及来源显示验证。数据库迁移先在隔离测试库验证，生产不执行。无真实邮件、真实企业会话或实际数据库联调证据时明确标记未验证。
