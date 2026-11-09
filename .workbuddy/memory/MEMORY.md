# Dlooda TKBD CRM — 项目长期记忆（精简版，细节见同目录日期日志）

## 概况
- Dlooda：TikTok Shop 美国女装；CRM = 飞书多维表格 → Web CRM（GitHub `jujusuda/dlooda-tkbd-crm`，Cloudflare Pages，PWA）。淡粉治愈风 + Hello Kitty 点缀。详细日志见各日期 md。

## 硬性规则（勿改）
- **评分**：总100 = 月销售40 + 女装垂度20 + 均播15 + 口播15 + 女粉10；不用粉丝数/国家；只显示 ★★★★★ + 95/100。
- **佣金**（data.js SKU_DETAILS）：2178=15+10、2190=16+10、2722=11+8、2757=15+8、2789=12+8、2189=13+8、28173=15+10。**SKU 排序**：爆品→销售→测品→撤退。
- **复投口径**：声明=「已推XXXX」；成功=声明后同SKU再寄样且「通过」非空；观察期30天；双口径（按SKU/按达人）切换。
- 🚨 **两率最终定稿（11-08 晚第三次纠正，已用 4 个 SKU 精确复现 PPT，覆盖之前所有版本）**：
  - 全部按**寄样「行数」**，不是去重达人数（去重会算出 2190 90.5%/37.5%，与 PPT 不符）。
  - **履约率 = 履约行数(视频/直播) ÷ 寄样行数**。2190: 21/23 = **91.3%**；2178: 20/26 = **76.9%**；2189: 34/44 = 77.3%。
  - **出单率 = 出单行数 ÷ 视频行数（履约方式=「视频」，不含直播行）**。2190: 8/18 = **44.4%**；2178: 7/17 = **41.2%**；2189: 8/30 = **26.7%**；2722: 2/8 = 25%。
  - 用「行」而非「人」的原因：同一达人可有多行寄样（颜色/多次寄样），PPT 就是按行统计。分子出单行不限履约方式（直播约的达人出单也计入）。
  - 全站计算点已统一（getProductAnalysis / getVideoAnalytics skuRanking+整体 / getSKUTrendAnalysis / getAttribution dim / getSKUOrderRateInRange / getFulfillmentRate），SW v48。返回字段：`videoRows`/`orderedRows`（产品表另有 approved/fulfilled/ordered）。
  - 🔑 **区间左闭右开（11-08 定）**：业务月按 15 号切，**结束日选 15 号时当天归下月**（9/15~10/15 ≡ 9/15~10/14）。实现 = data.js `isCycleStartDay()` + `withinEnd()`，所有率的聚合走它（列表过滤除外）。
  - 2757 目前在 9/15~10/14 窗口只有 0~1 行（PPT 曾是 47 行），属数据缺失，不是口径问题。
- **PPT**：权威数据源 `scripts/_authoritative_data.json`（用户文字表）；月度窗口非自然月（8月=7/15~8/15）。

## 飞书「全量视频」表（第7张表）
- wiki 链接须先 `GET /open-apis/wiki/v2/spaces/get_node?token=...` 拿 `obj_token`；本例与 FEISHU_BASE_TOKEN 同 base，`videos.appToken` 留空。tableId=`tblfc3sDKek2SV7H`，真实列名：达人名称/视频链接/**发布时间**/SKU/颜色/寄样时间。
- 授权坑：`1254302`=缺多维表格高级权限（文档应用给「可管理」才行）；`1254041`=id 不存在；无权限时 /tables 会过滤该表造成「表不存在」假象。
- 表目前仅 26 条非全量 → `fullVideoTableReady()` 守卫（需 ≥max(100, 内嵌×0.2)）未达标自动回退寄样内嵌视频；`getVideoSource()` 供注脚。
- ⚠️ 绝不改 `getVideos()` 回退分支 `postTime` 语义（脏日期清空会扩大分母导致口径回归）；仅全量表分支用 `normVideoDate()`。
- videos 是可选增强表：同步抛错只降级+warnings，不拖垮主表；`/api/sync` 响应带 `warnings`。
- 全量视频表**唯一用途** = 素材看板按发布时间统计素材量，绝不参与任何率的分母。

## 部署 & 数据坑
- git：大批量 add 会 mmap failed（分批）；命令行 push 不可用 → **用户在 GitHub Desktop 点 Push origin**。
- **主数据 KV 优先（v37）**：data.js 同步 XHR 拉 `/api/data`（KV）覆盖静态 real-data.js（localhost 跳过）+150s 轮询自动 reload。同步飞书按钮=写 KV 真正生效。localStorage `dlooda_uploaded_data` 会掩盖 KV 更新。
- ⚠️ 同步逻辑**两份必须同步改**：`functions/lib/sync.mjs`（线上主路径）+ `server/sync.js`（本地兜底）。占位 tableId 自动跳过；`tables[k].appToken` 单表覆盖。`node server/sync.js` 不会同步，用 `_run_sync_once.js` 或 POST /api/sync。
- normSku 两端归一（sku 可能数字/数组/{text}）；时间戳 UTC+8；orderCount 字符串、fulfillMethod 数组，判断前归一化。
- ⚠️ 日期范围比较只比前 10 位（`slice(0,10)`），否则结束日当天被吞（曾致复盘页与 Dashboard 对不上）。
- 改前端必递增 sw.js CACHE_VERSION（当前 v44）。核对线上数字用 `/api/data`，仓库静态 real-data.js 是旧快照。

## CRM 名单库 roster.html（铁律）
- 跨设备云同步 KV（`functions/api/roster.js` + `js/store.js`，防抖 2s 上推，`_updatedAt` 大者胜，断网降级本地）。
- 三模块：①自动达人名单（大「达人池」不按SKU存，poolSeedFromAuto 灌 2375，剔除规则：黑名单→低效→合作3款未出单→已合作；导入弹窗确认才入池）②竞品+复投建联名单（outreach.batches 图片分组卡片+下钻 touches；obSeedFromReinvest 灌 45组/911人/932条）③指定达人名单（designated-data.js）。
- 接口 `window.DloodaRoster`；池逻辑在 js/roster.js 内部，store API 全导出。

## 功能
- 提醒（todo.html）：弹窗+邮件（Resend），规则可删可自建（deleteRule 已去 builtin 守卫）；履约（tracking.html）：未履约=updateTime 空且 fulfillMethod 空，目标窗=上月15~本月15。
- 达人层级划分（creator.html 顶部，`js/creator-levels.js`，v54）：等级 chips **按实际分布动态生成**（含「未填」）+ 时间区间（含近7/30天）+ SKU/等级下限/出单/素材/昵称筛选，按出单量排序；计数默认**按寄样行（不去重）**，可切「按达人」。
- 看板「达人层级」tab（v50/v54）：`Data.getLevelAnalysis()` 聚合双率+出单量占比；达人/寄样行列合一、随「按寄样行/按达人」切换（同渲染器）。
- ⚠️ 计数桶坑：空等级若直接用 `''` 当 key 会撞「全部」桶导致重复累加，必须映射成 `__none`。
- 看板「视频质量分析」尾部三块（v55~v59）：①新老视频 ②新老达人 ③多品合作。三块**全部走真实订单**：`js/order-data.js`（`scripts/build_order_data.py` 从「D店总订单.xlsx」生成，内容ID→视频ID 96% 可匹配）+ `Data.getOrderFreshness()`；订单日期用**创建时间**（文件名"截至10月22"不可信，实际含到 11/5）、按视频发布日期分新老；**退款单列**（毛额/退款单/退款额/净额）。缺文件时回退估算。
- **回归自检**：`node scripts/audit_data.js` 校验 15 号切月等价、产品表/区间率/趋势/履约率/层级/素材量/视频总数/订单分项/边界，改动数据口径后必跑。
- 看板「达人层级」tab（v50）：`Data.getLevelAnalysis()` 按等级聚合双率+出单量占比（renderLevelAnalysis，加 tab 需同时改 dashboard.html、SECTION_RENDERERS、initAnalysisTabs 的 sections 数组）。
- **等级取值规则（v52）**：同一达人多条寄样等级不同 → 一律取**最新寄样记录（sampleTime 最大）的 official**，其余行沿用；最新行为空则沿用最近一次有值的。看板 tab 与达人页区块都要遵守。
- 素材量口径：层级表必须用 `getVideos()` + 发布时间（同素材看板），不能用寄样行内嵌 videos 长度，否则 61 vs 41 对不上。
- 侧边栏底部（v50）：SW 版本号 + 「强制更新」按钮（注销 SW/清 caches/localStorage 上传数据后重载），治「页面还是旧的」。curl 查线上必须带 `-L`（不带得 308 空体，会误判没部署）。
- 话术：Hook→品牌+产品→佣金→Feel free to apply；translator.js 须在 invite/message.js 前加载。

## 通用坑
- **`window.DloodaApp` 不是 `window.App`**：app.js 导出的是 `DloodaApp`，各页面自己 `var App = window.DloodaApp`。新写独立脚本照做，否则 `App.escapeHtml` 报 TypeError、区块静默空白（creator-levels.js 踩过）。
- 排查线上前端错误：本机 Chrome 无头 `--headless=new --enable-logging=stderr --dump-dom` + grep "Uncaught"，比反复猜快得多。
- 不加评分字段/不手写 Sidebar/不做假数据/列表限100+搜索/不重复实现 copyToClipboard、populateSkuSelect。
- JS 多行拼接 `?`/`:` 与 return 行不能带行首 `+`。
- **PWA 页面绝不能用同步 XHR 拉实时数据**（SW 异步 respondWith 无法满足→静默旧数据）；测线上不能只 curl（绕过 SW 会误判正常）。
- python-pptx：双轴做 plotArea OOXML 手术；dLblPos 只许 t/b/ctr/l/r；轴 title 在 numFmt 前；保存会污染未改动页；逐点柱色用 dPt。详见 2026-10-13/14/15.md。
