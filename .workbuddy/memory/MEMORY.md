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

## CRM 名单库 roster.html（2026-10-24 版，铁律）
- **三模块**（页面不用"模块1/2/3"字样）：①「自动达人名单」(tab-sample) ②「竞品达人+爆单达人复投名单」(tab-outreach，建联批次：老达人出单/爆单/竞品，TK/邮件/官号，touches 状态跟踪) ③「指定达人名单」(tab-designated)。
- **纯本地**：不同步/不回写飞书；比对源=飞书每日寄样表（REAL_DATA.creators+samples）。
- **三道规则**：黑名单→低效→合作SKU≥3锁定；已合作该款默认不导入可放行；同达人可进多组；组内对该 SKU 重判，失效进「需复核」。
- **自动邀约 = 复制名单用户自己发**；复制格式 line/comma/at（settings.rosterCopyFormat）。
- **标记已发送**：`sent={sku:date}` 按 SKU 独立；只能用 `Store.markSent/unmarkSent`（updateRosterItem 整体赋值会抹掉其他 SKU 记录，踩过）；复制只取待发。
- **指定达人名单（模块3）**：静态数据 `js/designated-data.js`（`DloodaDesignated.cats`，来源 每日工作.xlsx 裙子/裤子-指定达人定向名单，生成脚本 `scripts/build_designated_data.py`，图片 `images/designated/`）；同店铺内去重、跨店铺允许重复；本机只存改动：`designated={marks(已发记录{date,product}),overrides,deleted,added,handleAdds,handleRems}`；卡片=图+店铺+产品，点击弹 handle 名单一键复制+已发标注+增删改；编辑弹窗支持传图（canvas 压 360px dataURL）。
- ⚠️ 提取坑：Excel 最左「序号+handle」标签列会混成假卡（store='店铺'，4208人），脚本已过滤；这批无店铺 handle 存档在 `scripts/_designated_phantom_handles.txt`，用户未定是否要用。
- 接口 `window.DloodaRoster`：refresh/renderGroups/copyGroup/markGroupSent/resetGroupSent/renderOutreach/renderDesignated/openDesignatedCard/switchTab 等。

## 功能：日程提醒 & 履约追踪
- 提醒（todo.html）：弹窗+邮件（POST ./api/notify → Resend，无 RESEND_API_KEY 降级）；每 2 天重复；内置 2 条不可删；固定任务 9 条可编辑。
- 履约（tracking.html）：未履约=updateTime 空 且 fulfillMethod 空；窗口每月 25-30 工作日；目标寄样窗=上月15~本月15；回飞书 `App.pushToFeishu`。

## 话术
- 邀约：Hook → 品牌+产品 → 佣金 → Feel free to apply，产品匹配 SKU；私信简短热情，中/英/西；translator.js 须在 invite/message.js 前加载。

## 通用坑清单
不加评分字段 / 只维护 creator.html 单版本 / 不手写 Sidebar(app.js 注入) / 不做假数据 Dashboard / AI 页全链路 / 列表限100+搜索 / 不重复实现 copyToClipboard/populateSkuSelect / JS 多行拼接：`?`/`:` 与 return 行不能带行首 `+`（roster.js 踩过两次，2026-10-24）。

## PPT 已交付
- 8月 v7（19页，六 SKU 差异化视角，`scripts/build_ppt_v7.py`）；9月简约版 12 页（`build_sep_report.py`，暗玫 #A6446B）。python-pptx 关键坑：双轴不用 secondary_axis API，做 plotArea OOXML 手术；lineChart dLblPos 只许 t/b/ctr/l/r；轴 title 必须在 numFmt 前；保存会污染未改动页（按部件还原）；逐点柱色用 dPt。详见 2026-10-13/14/15.md。
