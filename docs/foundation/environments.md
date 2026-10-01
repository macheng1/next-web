# 本地、开发、生产环境

新网站以后端 wx-backend 为准。三个环境都通过网站 BFF 调用会员接口，地址仅在服务端使用；后端地址不进入浏览器构建。

| 环境 | wx-backend API | 网站地址 | 构建目录 |
| --- | --- | --- | --- |
| local | http://localhost:4000/api/v1 | http://localhost:3000 | .next-local |
| development | https://dev.api.shopai.org.cn/api/v1 | 默认本机预览；部署 dev 时改为真实开发网站域名 | .next-development |
| production | https://prd.api.shopai.org.cn/api/v1 | 必须填实际 HTTPS 网站域名 | .next-production |

## 使用

- 本地启动：npm run dev（等同 dev:local）。本机 wx-backend 另行运行 npm run start:dev，默认 4000；未启动时会员功能和就绪检查不可用。
- 本地网站连接开发后端：npm run dev:development。
- 开发环境正式构建与运行：npm run build:development、npm run start:development。
- 生产构建与运行：npm run build、npm run start（等同 build:production、start:production）。
- 只核对配置：npm run check:env:local、check:env:development、check:env:production。
- 完整自动验收仍用 npm run check，独立 .next-verify 和 mock 后端，不操作生产。

复制 config/environments/对应环境.env.example 为同目录 对应环境.env，然后填写实际配置。私有配置文件已忽略。没有私有文件时使用对应模板；生产模板没有网站域名，不会自动猜域名或回退 localhost。

命令将所选配置注入进程；明确的 shell/流水线环境变量优先于模板和私有文件。三个环境固定 DEPLOYMENT_ENV 和独立构建目录，避免使用另一环境的构建产物。NODE_ENV 留给 Next 管理，不写 local、dev 等非标准值。

开发模板默认网站地址为 localhost，方便本机调试开发 API。部署到开发服务器时，必须改 NEXT_PUBLIC_SITE_URL；它决定同源提交、邮件入口和 SEO，不能保留本机地址。开发与本地禁止搜索索引，生产才允许公开页面索引。

## 后端配套

wx-backend 使用 NODE_ENV 加载其已有 .env.development/.env.production；服务器 dev/prd 的数据库、OSS、Redis 等由对应流水线变量组控制。网站不复制后端密钥或数据库配置，不更改服务端现有部署脚本。

各后端环境的 WEB_LOGIN_URL 与 WEB_RESET_PASSWORD_URL 要填写相应网站的 /login 和 /reset-password。检查发现仓库生产参考配置仍是 localhost，这次不猜测生产网站域名、不改线上变量；确定网站域名后在对应变量组更新并重新部署后端，否则邮件链接会指向本机。

就绪检查只检查 wx-backend；配置、运行时和代理均不再提供第二套后端。

生产构建与启动继续执行共享限流核验：RATE_LIMIT_MODE 及 RATE_LIMIT_VERIFICATION_FILE 有效、站点和后端 HTTPS。未完成部署保护不放行；详见 release-checklist.md。此配置检查不请求生产接口，也不代表部署或线上联调成功。
