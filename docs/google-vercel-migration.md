# Google 登录迁移到 Vercel 服务端

## 已实现边界

网站回调先检查 state、PKCE 上下文、nonce 和会话指纹，再通过固定 Google HTTPS 接口换码，官方 SDK 验签并验证 aud/iss/exp/nonce/email_verified/sub。Google Token 不返回浏览器。两次网络请求各有 8 秒超时、禁止重定向、不缓存，不输出密钥或原始错误。

Next.js 用专用 Ed25519 私钥签发 60 秒凭据（固定 issuer/audience/algorithm，带 client ID、请求上下文 SHA256 和随机 jti）。上下文包含 code/verifier/nonce/redirectUri/bindingGrant，防止替换登录或绑定对象。通过 HTTPS 将凭据提交给原 google/exchange 接口。

NestJS 在 vercel 模式只接受已验签凭据，用预配置公钥离线验证，再以 Redis SET NX EX 原子消费 jti；重复提交、过期、伪造、上下文不同、Redis 不可用均拒绝。仍由原有 SiteGoogleService 处理会员、绑定、协议、验证码和网站 JWT。vercel 模式没有 direct 回退。

## 新配置

两端：GOOGLE_AUTH_MODE=vercel。默认 direct 仅为兼容分步部署，配置后不会自动探测网络或自动切换。

Vercel 服务端：GOOGLE_CLIENT_SECRET、GOOGLE_ASSERTION_PRIVATE_KEY。继续保留 GOOGLE_CLIENT_ID、NEXT_PUBLIC_SITE_URL、GOOGLE_REDIRECT_URI、MEMBER_API_URL。不得加 NEXT_PUBLIC_ 前缀。

NestJS：GOOGLE_ASSERTION_PUBLIC_KEY、GOOGLE_CLIENT_ID、GOOGLE_REDIRECT_URI、PUBLIC_WEB_URL。保留现有 PUBLIC_WEB_JWT_SECRET、Redis、邮件和数据库配置。deploy.sh 的 GOOGLE_* 白名单已包含新增配置。

## 生成专用密钥（在可信电脑执行）

```sh
umask 077
openssl genpkey -algorithm ED25519 -out google-assertion-private.pem
openssl pkey -in google-assertion-private.pem -pubout -out google-assertion-public.pem
```

私钥 PEM 全文复制到 Vercel GOOGLE_ASSERTION_PRIVATE_KEY（包含 BEGIN/END）；公钥 PEM 全文复制到后端 GOOGLE_ASSERTION_PUBLIC_KEY。两端都支持真实换行或字面量反斜杠 n。不要写入 Git，不复用 PUBLIC_WEB_JWT_SECRET，也不要把私钥传给国内后端或浏览器。

## 发布顺序

1. 更新两端依赖（pnpm install --frozen-lockfile），后端先部署新代码，保持 direct 不影响旧网站。
2. 配置 Vercel 私钥/Google 密钥、后端公钥，核对两端相同 client ID 和 callback。
3. 在维护窗口将后端 GOOGLE_AUTH_MODE 改为 vercel 并重建容器，再部署 GOOGLE_AUTH_MODE=vercel 的网站；两端切换窗口 Google 登录会暂不可用，邮箱登录不受影响。不能一端切换后长期保持另一端 direct。
4. Google 回调保持 https://www.pinmalink.com/api/auth/google/callback；不需新增回调域名。检查 Vercel 实际函数地域与 Google、国内后端的连通性。
5. 实测首次注册、老会员关联、再次登录、已登录绑定、解绑、首个密码、取消/超时、跨标签页账号切换；核对会员数据归属和日志脱敏。
6. 验收后删除国内后端 GOOGLE_CLIENT_SECRET。回滚需两端一起切回 direct 并恢复国内 Google 密钥及可用网络；不要降低验签或防重放要求。

无数据库结构迁移。本次本地验证不代表线上 Google 已联调成功。私钥泄露时更换专用密钥对，并同步重新部署两端。
