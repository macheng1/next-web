# 网站基础能力使用说明

## 开发和验证

使用 Node.js 22.12 及以上版本，npm ci 安装锁定依赖。npm run dev 启动开发；npm run check 依次检查类型、规范、单元测试、独立构建与浏览器交互。浏览器测试使用 Chrome，首次运行可执行 npx playwright install chrome。测试夹具在 tests/browser/fixture，由 Vite 临时服务，不是线上页面。

开发配置复制 .env.example，按需要填写两套后端。API_URL 对接门户（带 /api），MEMBER_API_URL 对接会员（带 /api/v1），没有互相回退。DEPLOYMENT_ENV=development/test/production 表示部署环境，NODE_ENV 由 Next 管理。生产必须使用 HTTPS 站点和后端。NEXT_PUBLIC_ 变量会进入浏览器构建，不能放密钥。

## 请求复用

浏览器调用 src/lib/http/request.ts 的 requestJson<T>(相对路径, options)，得到已解包 data；fetchResponse 用于保留完整信封。默认 10 秒超时、不重试；GET 可明确 retries:1，修改请求不自动重试。signal 支持取消。FormData 不写 Content-Type。HttpError 区分 network、timeout、aborted、http、business，附带状态、业务码和追踪编号。

服务端使用 src/lib/server/backend.ts 的 backendRequest/backendFetch，目标必须选择 portal/member，路径经过白名单，默认 no-store，不跟随重定向。新的后端路径先补契约和测试再加入白名单。门户读取在 server/portal.ts，浏览器提交在 portal-api.ts，禁止客户端导入服务端读取模块。

业务码非 200 即失败，即使 HTTP 是 200。不要在页面各自重新封装解析逻辑。错误提示使用词典提供的兜底文案，不显示任意上游错误正文。

## 会话和安全

currentMember() 获取当前会员，logout() 只退出当前网站。服务端 getSession/requireSession 使用后端 me 验证身份。anonymous、unavailable、authenticated 分开；后端 401 时 me 响应清 Cookie，后端 503 时保留 Cookie。Token 不返回浏览器，不在 localStorage 存储；会员数据不得跨请求共享缓存。

每个修改路由先 guardMutation(request)，再 readJsonBody/readFormBody 限制真实请求体大小。浏览器请求必须携带有效同源 Origin。TRUSTED_ORIGINS 只允许明确的额外网站来源；不使用请求 Host 自动扩大来源名单。只有可信反向代理覆盖转发头时才能开 TRUST_PROXY。

开发内存限流供本地反馈。生产必须由 gateway/backend 执行共享限流，并明确设置 RATE_LIMIT_MODE；未配置时修改接口返回 503。这一变量只表示部署选择，不能证明外部规则已经生效，发布检查还需要实际规则及测试证据。

上传统一校验大小、MIME、扩展名和文件签名。默认支持 JPEG/PNG/WebP/PDF，10 MiB；现有询盘附件单独兼容 6 个、5 MiB 和 GIF/ZIP/DWG。文件签名不是病毒扫描，ZIP 不在网站解压，后端负责存储权限、最终验证和恶意内容处理。safeExternalUrl 校验外部链接协议；禁止直接渲染未经清理的 HTML。本轮没有富文本输入，若增加富文本，先接入可信 HTML 清理器和对应 XSS 测试。

## 多语言和组件

语言统一为 zh/en：受控 URL 语言、有效 Cookie、Accept-Language、默认 zh。proxy 覆盖内部语言头，根布局同步 html lang；不要信任客户端传来的内部语言头。resolveLanguage 可用于纯匹配；日期必须指定时区，金额必须指定币种，不自动换汇。

Providers 集中提供 Semi LocaleProvider。优先直接使用 Semi Input/Form/Select/Checkbox/Upload/Toast/Notification/Skeleton 等。已有 Button/Field/Sheet 等只提供主题和组合，避免再创建同类基础控件。StatusState 处理 loading/empty/error/forbidden/session-expired/not-found，FormError 用于字段提示。通用 Modal 默认可关闭；PrivacyNotice 单独保证拒绝/同意均可操作且无默认同意回调。

新增文案同步更新 zh.json/en.json，测试检查键一致。业务页面仍有旧文案，不代表本轮已完成旧业务全量翻译。网站公开买家注册和企业审核申请必须分开，现有 register 仍是企业申请，不展示未经接入的第三方登录。

## SEO 和监控

buildMetadata 统一 title、description、canonical、语言链接和分享元信息。私有页不索引，测试环境 robots 禁止索引。sitemap 只发布已知真实路由，不枚举未知租户。

/api/health/live 检查网站存活；/api/health/ready 检查两套配置后端的 /health，依赖异常为 503。这不代替后端数据库就绪检测；数据库是否健康以后端健康接口实际内容为准。两接口 no-store，不暴露地址和配置。

logEvent 只记录白名单事件、状态、耗时、有效 UUID 追踪编号和错误分类。密码、Token、正文不进入日志；不自动向外部服务传数据。外部日志收集器可接进程 JSON 输出，告警由部署平台配置。本仓库不承诺已经配置线上告警或数据备份。
