# Dlooda TKBD CRM — 项目长期记忆（精简版，细节见同目录日期日志）

## 概况
- Dlooda：TikTok Shop 美国女装；CRM = 飞书多维表格 → Web CRM（GitHub `jujusuda/dlooda-tkbd-crm`，Cloudflare Pages，PWA）。淡粉治愈风 + Hello Kitty 点缀。
- 详细日志：2026-08~10 各日 md；PPT OOXML 坑见 2026-10-13/14.md；名单库见 2026-10-23/24.md。

## 硬性规则（勿改）
- **评分**：总100 = 月销售40 + 女装垂度20 + 均播15 + 口播15 + 女粉10；不用粉丝数/国家；只显示 ★★★★★ + 95/100。
- **佣金**（data.js SKU_DETAILS）：2178=15+10、2190=16+10、2722=11+8、2757=15+8、2789=12+8、2189=13+8、28173=15+10。
- **SKU 排序**：爆品→销售→测品→撤退。
- **复投口径（8-09 定）**：声明=「已推XXXX」；成功=声明后同SKU再寄样且「通过」非空；观察期30天；双口径（按SKU默认/按达人）dashboard 顶部切换。
- **出单率口径（9-10 定）**：出单达人÷有视频达人；有视频 = videos 里 `url` 非空（非 videos.length>0）；出单=orderCount>0。三端必须一致。
- **PPT 权威数据源（9-13 定）**：`scripts/_authoritative_data.json`（用户文字表）；绝不用 real-data.js/_correct_sku_data.json 填 PPT；看不到图片数字，必须用户贴文字。
- **PPT 月度窗口非自然月**：如「8月」= 7/15-8/15。

## 部署 & 数据坑（高频）
- **git**：大批量 add 会 mmap failed → 分 2-3 批提交；命令行 push 不可用（GCM 无凭据）→ **用户在 GitHub Desktop 点 Push origin**。gitignore 含 *.pptx/_preview*/docx_media/nul/work/。
- **线上更新唯一路径**：本地 `server/_run_sync_once.js` 生成 js/real-data.js → commit+push → CF Pages 构建 → 递增 sw.js CACHE_VERSION。`/js/real-data.js` 仓库静态优先，KV 兜底；「同步飞书」按钮写 KV 不影响线上。
- 飞书时间戳按 UTC+8 解析；orderCount 是字符串、fulfillMethod/category/creatorType 是数组，判断前先归一化。
- `node server/sync.js` 不会同步；用 `_run_sync_once.js` 或线上 POST /api/sync。
- 改前端必递增 sw.js CACHE_VERSION。

## CRM 名单库 roster.html（2026-10-25 重构版，铁律）
- **跨设备云同步（Cloudflare KV）**：所有名单库数据（roster/auto/outreach/designated/reinvest/rules/tracking/settings + 达人池）经 KV 同步。`functions/api/roster.js`（GET 读 `roster-v1` / POST 覆盖带 `_updatedAt`）+ `js/store.js` 云端引擎（persist 后防抖 2s 上推；打开页面 `cloudPull` 按 `_updatedAt` 大者覆盖本地）。断网/无 Functions 静默降级纯本地。改前端必递增 sw.js CACHE_VERSION（已 v33）。
- **三模块**（页面不用"模块1/2/3"字样）：①「自动达人名单」(tab-sample) ②「竞品达人+爆单达人复投名单」(tab-outreach) ③「指定达人名单」(tab-designated)。
- **模块1 达人池（不按 SKU 存）**：所有达人放一个大「达人池」`auto.pool=[handle]`；选中某 SKU 时 `poolCompute()` 动态拆分 可发送/已发送/被剔除。剔除规则：黑名单→低效→合作3款以上未出单(skuLimit, **仅当无出单才锁**；已出单老达人允许复投)→已合作该款(进「已发送/飞书已寄样」)。**导入弹窗**逐条列出被剔除达人+原因，点「确认导入达人池」才入池（dedup 去重）。已发送 = `sent[handle][sku]={date,note}`；标记后从可发送移到已发送（飞书已寄样的按 cooperated 自动进已发送）。分组增删查改（静态组改名走 `groupNames` 覆盖、删除走 `groupDeleted` 名单）+ 达人增删。
- **模块2 建联名单（图片分组 + 下钻）**：`outreach.batches`(图片分组卡片) + `outreach.members`；点击分组→已建联/未建联计数→下钻具体达人+建联记录 `touches=[{date,channel,result,script,note}]`（渠道 TK私信/邮件/官号/抖音私信/WhatsApp/其他；无邮箱填"无"）。批次/成员 CRUD + 记录增删 + 图片上传(canvas 压 360px dataURL)。
- **模块3 指定达人名单**：同 10-24 版（静态 designated-data.js + 本机改动）。
- **自动邀约 = 复制名单用户自己发**；复制格式 line/comma/at（settings.rosterCopyFormat）。
- 接口 `window.DloodaRoster`：refresh/renderGroups/copyGroup/markGroupSent/resetGroupSent/renderOutreach/renderDesignated/openDesignatedCard/switchTab/renderAuto/renderReinvest 等；池/模块2 相关逻辑在 `js/roster.js` 内部（poolCompute/renderPool/poolImportFlow/openObDrill 等，store API 全导出）。

## 功能：日程提醒 & 履约追踪
- 提醒（todo.html）：弹窗+邮件（POST ./api/notify → Resend，无 RESEND_API_KEY 降级）；每 2 天重复；**规则完全自助增删查改——内置规则(rule_stats/rule_urge)现在也可删**（`Store.deleteRule` 已去掉 builtin 守卫，renderRules 也去掉删除按钮守卫）；用户可自定默认任务+提醒范围，到点弹窗。⚠️ 曾因严格模式下 `editingId` 未声明导致编辑弹窗打不开，已补 `var editingId=null`（js/todo.js）。
- 履约（tracking.html）：未履约=updateTime 空 且 fulfillMethod 空；窗口每月 25-30 工作日；目标寄样窗=上月15~本月15；回飞书 `App.pushToFeishu`。

## 话术
- 邀约：Hook → 品牌+产品 → 佣金 → Feel free to apply，产品匹配 SKU；私信简短热情，中/英/西；translator.js 须在 invite/message.js 前加载。

## 通用坑清单
不加评分字段 / 只维护 creator.html 单版本 / 不手写 Sidebar(app.js 注入) / 不做假数据 Dashboard / AI 页全链路 / 列表限100+搜索 / 不重复实现 copyToClipboard/populateSkuSelect / JS 多行拼接：`?`/`:` 与 return 行不能带行首 `+`（roster.js 踩过两次，2026-10-24）。

## PPT 已交付
- 8月 v7（19页，六 SKU 差异化视角，`scripts/build_ppt_v7.py`）；9月简约版 12 页（`build_sep_report.py`，暗玫 #A6446B）。python-pptx 关键坑：双轴不用 secondary_axis API，做 plotArea OOXML 手术；lineChart dLblPos 只许 t/b/ctr/l/r；轴 title 必须在 numFmt 前；保存会污染未改动页（按部件还原）；逐点柱色用 dPt。详见 2026-10-13/14/15.md。
