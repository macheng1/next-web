# 新网站底座使用说明

## 架构与范围

只对接 wx-backend，服务端 MEMBER_API_URL 带 /api/v1。三套环境见 [环境说明](environments.md)。本地 Node.js 22.12 以上，使用 pnpm install --frozen-lockfile 和锁文件。

旧租户门户、旧产品/招聘/询价页面、旧登录注册表单、旧企业申请与短信注册流程、双后端配置及错误兼容层均已删除。旧路径返回 404，无旧地址跳转。保留首页基础状态，业务页面按照新设计另行开发。

## 请求与认证

浏览器使用 http/request.ts 的 requestJson/fetchResponse，统一 HttpError。默认超时 10 秒，支持取消；GET 可显式重试一次，修改请求不自动重试。FormData 不写 Content-Type。

服务端统一 backendRequest/backendFetch(白名单路径, options)，只访问 wx-backend，禁止任意 URL、重定向及私有数据缓存。认证 API 保留登录、找回/重置/修改密码、当前会话及退出；客户端接口直接复用共享请求层，没有 AuthError 或 legacyRequest 转换。

getSession/requireSession 以后端 me 为身份依据。Cookie 为 HttpOnly，Token 不返回浏览器；401 清无效 Cookie，临时不可用保留 Cookie。退出仅清当前网站 Cookie，不宣称全设备撤销。

旧企业申请接口不能作为公开买家注册。新注册、第三方登录、企业入驻及其 UI 等待新业务设计，不提供旧入口。

## 安全与上传

修改请求复用 guardMutation 和有大小限制的请求体读取。来源仅接受配置的可信 origin；只有可信代理覆盖转发头才启用 TRUST_PROXY。

开发使用内存限流，生产要求真实网关/后端共享限流及核验记录；缺失时拒绝提交。上传只使用标准 JPEG/PNG/WebP/PDF 策略，不保留旧询价 GIF/ZIP/DWG 扩展兼容。大小、数量、文件名、MIME、实际签名均需检查，后端执行最终权限、存储与恶意内容校验。

外部链接复用 safeExternalUrl，禁止未经清理的 HTML；CSP、Cookie 和请求白名单不能替代后端授权。

## 多语言与组件

中文/英文词典仅保留新底座文案。语言选择复用 resolveLanguage，支持 URL 语言、Cookie、Accept-Language、中文回落；根文档和 Semi 使用相同语言。日期显式传时区，金额显式传币种。

优先使用 Semi 原组件。Providers、StatusState、FormError、PrivacyNotice 和通用 Button/Field/Modal/Sheet/Uploader 等可以复用。通用弹窗可关闭，隐私同意/拒绝等权，不默认接受。

## SEO、运行与验证

元信息统一 buildMetadata；测试环境禁止索引，生产使用真实站点域名，sitemap 仅列实际公共路由。新私有页面必须设置 noindex。

/api/health/live 检查网站存活；/api/health/ready 仅检查 wx-backend /health，依赖失败返回 503。结果 no-store，不公开地址配置。

logEvent 只输出白名单脱敏字段。线上日志、告警和备份由部署平台配置。pnpm run check 执行类型、规范、单元测试、独立生产构建和 Chrome 测试；不调用真实生产业务。
