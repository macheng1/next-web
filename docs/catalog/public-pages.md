# 官网公开目录（V2 四页）

## 页面
- `/`：工业品主视觉、产品/企业搜索、四行业入口、精选产品与右侧实用工具区。
- `/products`：产品关键词、分类数量、材质/连接方式/尺寸多选、排序、分页与清除；状态保存在 URL。
- `/products/:id`：纵向图库、参数与企业摘要分栏、带图规格、参考价与起订量、数量加减与预留询盘。
- `/suppliers/:id`：相册封面、主营产品/制造能力/联系区、横向产品卡，概览/产品/企业资料切换。
- `/suppliers`：企业名搜索与行业筛选，为首页企业搜索提供真实落地页。

## 复用
`src/components/catalog` 包含 CatalogShell、LanguageSelect、SearchBar、CatalogImage、ProductCard、EnterpriseCard、ProductGrid、CatalogState，SupplierSummary、ComingSoon、Chips、UsefulTools、ContactCard，以及页面组合组件。
样式使用 Tailwind；表单、按钮、下拉与手机筛选面板使用现有 Semi 包装。
语言沿用 NEXT_LOCALE 和 Providers。界面中英双语；企业提交的资料保持原文，不编造英文产品资料。

## 请求与部署
浏览器只调用同源 `/api/catalog/*`；服务端经现有 `backendRequest` 转发至 `MEMBER_API_URL`。
需同时发布 wx-backend 新增 `/api/v1/web/catalog/*`：options、products、products/:id、enterprises、enterprises/:id。
无新表、无结构迁移；复用 enterprises.product_categories，只读。未上架/软删企业、下架/平台限制产品不可公开。
不返回账号、信用代码、手机号、执照或监管字段。图片只加载既有 OSS HTTPS 主机或本地缺省图。
搜索匹配产品名、分类、简介、企业名。分类是企业自定义名称；材质/连接方式来自公开产品字段及参数，尺寸来自规格行。筛选同维度多选使用 OR，不同维度使用 AND。统计不包含下架、限制或非公开企业产品。
四行业入口使用关键词检索落地，现有行业字典尚未提供对应精细行业映射。制造能力暂无后端字段，显示缺省说明；一组规格之外不能生成虚构螺纹尺寸。
按用户确认，登录/企业平台、收藏、分享、询盘和工具等保留稿中位置并标注“即将开放”，不以企业会员认证替代采购用户账户。

## 验证
Web：typecheck、lint、54 项单元测试、隔离构建、31 项浏览器测试通过。
浏览器覆盖 320/375/768/1440px、中英、四页跳转、URL 筛选/分页、规格切换、语言下拉、失败重试、404 和空状态。
后端：5 项新接口测试、build、lint（既有无关警告），开发数据库只读列表/详情查询通过。
本地只读预览完整走过 BFF → 新目录服务 → 开发数据库，浏览器无运行时错误。
本地验证不代表部署完成。本轮未提交、推送或部署。
