# 底座交付验证

2026-10-01，本地 dev 分支。未合并 main、未推送或部署。

## 实测结果

- npm run check：类型、规范、38 项单元测试、独立生产构建、10 项 Chrome 测试全部通过。
- npm audit：没有报告的依赖漏洞。
- 本地开发服务 localhost:3000 可访问，首页和登录页无浏览器运行错误。
- 最终独立审查发现三项重要问题；已修正客户端语言切换、门户子页 canonical/hreflang 和现有 OSS 视频 CSP，失败回归用例修正后通过。
- 会话错误缺少本地化提示按直接用户影响升级为重要问题，已修正，并验证失效清 Cookie、服务不可用保留 Cookie。
- 视频验证证明受信任媒体请求不被 CSP 拦截；测试附件不含真实视频，不代表某个线上视频本身可播放。

## 未完成的外部核验

远程 CI、真实网关多实例限流、真实后端上传与恶意内容处理、AMap 厂商脚本链、线上告警和备份恢复需按发布清单实际执行；本地测试不能代替这些核验。

## 暂缓的小问题

询盘和附件批量上传的出站追踪编号没有与浏览器响应保持一致；功能可以执行，但跨后端查日志不够便利。待后续诊断增强统一。

## 实施取舍记录

- Ruling: Work in user-requested dev checkout — user specifically requested dev and local preview, avoid extra checkout; cost: edits appear in running local preview.
- Ruling: Portal reader is server-only in practice but portal-api also exports browser mutation helpers; split readers into server module and retain compatibility exports only where safe. Cost: callers require targeted import migration.
- Task 3: Ruling: Preserve inquiry upload 6 files/5 MiB and existing GIF/ZIP/DWG types with signature checks — current UI supports drawings, no business regression; cost: signature checks do not replace malware scanning.
- Task 3: Ruling: Production mutations fail closed without RATE_LIMIT_MODE gateway/backend — no configured shared limiting service exists; deployment checklist must verify actual protection. Cost: production writes unavailable until configured.
- Task 1: Ruling: Pin Vitest 4.0.18 — latest incompatible with existing Node typings and npm peer resolver crashed on 4.1.11; cost: test tooling upgrade deferred.
- Task 6: Ruling: Browser fixtures served by Vite outside app routes, use installed Chrome — no production test page or extra browser binary requirement. Cost: CI must install Chrome or set Playwright channel.
- Task 8: Ruling: Upgrade Next 16.1.1 → 16.3.8, React 19.2.6 and matching ESLint — official security fixes unavailable on old minor; cost: same-major framework regression risk mitigated by full production/browser checks.
- Task 8: Ruling: Upgrade Vitest to 5.0.3 and Node typings 22 — removes critical test-tool advisory and solves initial peer conflict; cost: minimum Node 22.12 now documented/CI pinned.
- Final: Ruling: Re-grade missing localized session error as Important — newly provided currentMember produces English fallback in Chinese user flow, a direct foundation error UX defect; fix in this pass — cost if wrong: one small route integration and regression test.
- Final: minor (deferred): Inquiry and fileList upstream trace IDs differ from BFF response ID; diagnostics cannot yet follow those two full chains.
- Final: Ruling: Remote CI unverified — local full check is delivery evidence, remote workflow needs push/run — cost if wrong: runner-specific failure remains possible.
- Final: Ruling: Real shared gateway limits unverified — retain fail-closed production config and require deployment evidence — cost if wrong: submissions unavailable until configured.
- Final: Ruling: Backend malware/upload storage unverified — web signature/size checks stand; backend owner validates storage and malware — cost if wrong: signature-valid malicious uploads need additional backend protection.
- Final: Ruling: AMap vendor script chain unverified — retain explicit sources and require deployed map check — cost if wrong: map integrations may need a narrowly scoped policy adjustment.
