# Dlooda TKBD CRM — 项目长期记忆（精简版，细节见同目录日期日志）

## 概况
- Dlooda：TikTok Shop 美国女装；CRM = 飞书多维表格 → Web CRM（GitHub `jujusuda/dlooda-tkbd-crm`，Cloudflare Pages，PWA）。淡粉治愈风 + Hello Kitty 点缀。
- 详细日志：2026-08~10 各日 md；PPT OOXML 坑见 2026-10-13/14.md；名单库见 2026-10-23/24.md。

## 硬性规则（勿改）
- **评分**：总100 = 月销售40 + 女装垂度20 + 均播15 + 口播15 + 女粉10；不用粉丝数/国家；只显示 ★★★★★ + 95/100。
- **佣金**（data.js SKU_DETAILS）：2178=15+10、2190=16+10、2722=11+8、2757=15+8、2789=12+8、2189=13+8、28173=15+10。
- **SKU 排序**：爆品→销售→测品→撤退。
- **复投口径（8-09 定）**：声明=「已推XXXX」；成功=声明后同SKU再寄样且「通过」非空；观察期30天；双口径（按SKU默认/按达人）dashboard 顶部切换。
- **两个率口径（11-08 重定，勿混）**：**履约率 = 出单达人 ÷ 履约达人**（履约方式=视频/直播，fulfillMethod 判断）；**出单率 = 出单达人 ÷ 有视频链接达人**。出单=orderCount>0，达人去重。产品分析表两列并存（`orderRate`=履约率、`videoOrderRate`=出单率）；出单达人须与分母取交集，保证 ≤100%。
- **「有视频达人」分母 & 素材量 = 飞书「全量视频」表（11-08 新增第7张表）**：`REAL_DATA.videos=[{creator,sku,url,date}]`，`getVideos()` 优先用它、无则回退 samples 内嵌 videos。素材看板按 `date` 统计、达人去重。旧口径（videos url 非空）因寄样表内嵌视频几乎为空导致出单率 >100%，已废弃。⚠️ `server/config.json` 的 `videos.tableId` 仍是占位符 `REPLACE_WITH_全量视频_TABLE_ID`，**必须填真实 id 才生效**；占位时 sync 会跳过该表（含 REPLACE 即跳过）不破坏整次同步。
- **PPT 权威数据源（9-13 定）**：`scripts/_authoritative_data.json`（用户文字表）；绝不用 real-data.js/_correct_sku_data.json 填 PPT；看不到图片数字，必须用户贴文字。
- **PPT 月度窗口非自然月**：如「8月」= 7/15-8/15。

## 部署 & 数据坑（高频）
- **git**：大批量 add 会 mmap failed → 分 2-3 批提交；命令行 push 不可用（GCM 无凭据）→ **用户在 GitHub Desktop 点 Push origin**。gitignore 含 *.pptx/_preview*/docx_media/nul/work/。
- **主数据(REAL_DATA)加载 = KV 优先 + 静态兜底（2026-11-08 落地，v37）**：`js/data.js` 在读取 `window.REAL_DATA` 之前，用**同步 XHR** 从 `functions/api/data.js`(GET，env.DATA 读 `real-data.js`) 拉最新数据并间接 eval 覆盖（本地 localhost 跳过，避免阻塞）；SW 已网络优先，`/api/data` 每次取最新不被缓存。→ **「同步飞书」按钮(POST /api/sync 写 KV) 现在真的能让网页更新**：按钮成功后 `location.reload()`，重载时 data.js 拉 KV 最新。另加 150s 轮询：检测 KV 数据指纹变化且无输入框聚焦时自动 `location.reload()`（飞书同步后最多 2~3 分钟自动刷新）。旧「本地生成 real-data.js→commit+push→构建」路径仍可作为兜底。
- ⚠️ 旧路径误区（已修正）：之前以为 `/js/real-data.js` 仓库静态优先、KV 兜底、「同步飞书」按钮不影响线上——错。现在 KV 优先覆盖静态。若用户曾用页面「上传 Excel」(localStorage `dlooda_uploaded_data`) 该数据仍优先于 KV/静态，可能掩盖飞书更新，需清 localStorage 才能还原。
- 飞书时间戳按 UTC+8 解析；orderCount 是字符串、fulfillMethod/category/creatorType 是数组，判断前先归一化。**SKU 也可能是数字/文本/单选/多选（数组或 {text}）**：`sync.mjs` 与 `data.js` 各有 `normSku()` 统一成去空格字符串；下游用严格 `!==` 比 sku，两侧都要归一化，否则该 SKU 的视频被静默全过滤（出单率恒 0）。实测仓库 real-data.js 的 sku 是字符串，混数字(2178)与字母数字(2F08)。
- `node server/sync.js` 不会同步；用 `_run_sync_once.js` 或线上 POST /api/sync。
- ⚠️ **同步逻辑有两份，改必须同时改**：线上主路径 `functions/lib/sync.mjs`（Cloudflare Functions `/api/sync`）+ 本地兜底 `server/sync.js`（`_run_sync_once.js` 调它，生成 `js/real-data.js`）。2026-11-08 接入「全量视频」时曾只改线上那份，兜底仍拉 6 张表导致生成的 real-data.js 缺 videos。两份都要有：keys 列表、占位 tableId 跳过、单表 appToken 覆盖、normSku、data.videos。**占位 tableId（含 REPLACE）自动跳过该表不破坏整次同步**；`tables[k].appToken` 可让某张表来自另一个多维表格（留空回退 `FEISHU_BASE_TOKEN`）。
- 改前端必递增 sw.js CACHE_VERSION。

## CRM 名单库 roster.html（2026-10-25 重构版，铁律）
- **跨设备云同步（Cloudflare KV）**：所有名单库数据（roster/auto/outreach/designated/reinvest/rules/tracking/settings + 达人池）经 KV 同步。`functions/api/roster.js`（GET 读 `roster-v1` / POST 覆盖带 `_updatedAt`）+ `js/store.js` 云端引擎（persist 后防抖 2s 上推；打开页面 `cloudPull` 按 `_updatedAt` 大者覆盖本地）。断网/无 Functions 静默降级纯本地。改前端必递增 sw.js CACHE_VERSION（已 v35）。
- **三模块**（页面不用"模块1/2/3"字样）：①「自动达人名单」(tab-sample) ②「竞品达人+爆单达人复投名单」(tab-outreach) ③「指定达人名单」(tab-designated)。
- **模块1 达人池（不按 SKU 存）**：所有达人放一个大「达人池」`auto.pool=[handle]`；**首次打开 `poolSeedFromAuto()` 自动把 DloodaAuto 静态名单库灌进池**（poolSeeded 守卫，init+cloudPull 后各一次；灌入时剔黑名单/低效/skuLimit，实测 2375 入池）；选中某 SKU 时 `poolCompute()` 动态拆分 可发送/已发送/被剔除。剔除规则：黑名单→低效→合作3款以上未出单(skuLimit, **仅当无出单才锁**；已出单老达人允许复投)→已合作该款(进「已发送/飞书已寄样」)。**导入弹窗**逐条列出被剔除达人+原因，点「确认导入达人池」才入池（dedup 去重）。已发送 = `sent[handle][sku]={date,note}`；标记后从可发送移到已发送（飞书已寄样的按 cooperated 自动进已发送）。分组增删查改（静态组改名走 `groupNames` 覆盖、删除走 `groupDeleted` 名单）+ 达人增删。
- **模块2 建联名单（图片分组 + 下钻，2026-10-25 晚定稿）**：`outreach.batches`(图片分组卡片) + `outreach.members`；tab-outreach 顶部就是分组卡片网格（旧「复投记录」平铺列表已删除），`switchTab('outreach')→renderObAll()`。点击分组→已建联/未建联计数→下钻具体达人+建联记录 `touches=[{date,channel,result,script,note}]`（渠道 TK私信/邮件/官号/抖音私信/WhatsApp/其他；无邮箱填"无"）。批次/成员 CRUD + 记录增删改（已有 touch 内联可编辑：date/channel/result/script，`Store.updateMemberRecord`）+ 图片上传(canvas 压 360px dataURL)。首次打开 `obSeedFromReinvest()` 按 Excel 原分组自动灌 45 组/911 人/932 条记录（obSeeded 守卫；同组重复达人追加为多条 touch；合并保护手填批次）。
- **模块2 数据自动迁移 `obSeedFromReinvest()`**（init 一次性，`settings.obSeeded` 守卫）：把 `js/reinvest-data.js` 932 条按 Excel「类型」列原分组归类 → **45 组/911 人**（同义组名合并走 `OB_NAME_MAP`；同组重复达人追加第二条 touch 不丢数据；合并式不覆盖手填批次）。渠道从 method 解析、状态 ✅/❌/回复 映射。迁移组卡片暂无图（粉色首字占位），点「编辑」可传图。
- **模块3 指定达人名单**：同 10-24 版（静态 designated-data.js + 本机改动）。
- **自动邀约 = 复制名单用户自己发**；复制格式 line/comma/at（settings.rosterCopyFormat）。
- 接口 `window.DloodaRoster`：refresh/renderGroups/copyGroup/markGroupSent/resetGroupSent/renderOutreach/renderDesignated/openDesignatedCard/switchTab/renderAuto/renderReinvest 等；池/模块2 相关逻辑在 `js/roster.js` 内部（poolCompute/renderPool/poolImportFlow/openObDrill 等，store API 全导出）。

## 功能：日程提醒 & 履约追踪
- 提醒（todo.html）：弹窗+邮件（POST ./api/notify → Resend，无 RESEND_API_KEY 降级）；每 2 天重复；**规则完全自助增删查改——内置规则(rule_stats/rule_urge)现在也可删**（`Store.deleteRule` 已去掉 builtin 守卫，renderRules 也去掉删除按钮守卫）；用户可自定默认任务+提醒范围，到点弹窗。⚠️ 曾因严格模式下 `editingId` 未声明导致编辑弹窗打不开，已补 `var editingId=null`（js/todo.js）。
- 履约（tracking.html）：未履约=updateTime 空 且 fulfillMethod 空；窗口每月 25-30 工作日；目标寄样窗=上月15~本月15；回飞书 `App.pushToFeishu`。

## 话术
- 邀约：Hook → 品牌+产品 → 佣金 → Feel free to apply，产品匹配 SKU；私信简短热情，中/英/西；translator.js 须在 invite/message.js 前加载。

## 通用坑清单
不加评分字段 / 只维护 creator.html 单版本 / 不手写 Sidebar(app.js 注入) / 不做假数据 Dashboard / AI 页全链路 / 列表限100+搜索 / 不重复实现 copyToClipboard/populateSkuSelect / JS 多行拼接：`?`/`:` 与 return 行不能带行首 `+`（roster.js 踩过两次，2026-10-24） / **PWA 受 SW 控制的页面绝不能用同步 XHR 拉实时数据**（SW 的异步 respondWith 无法满足同步请求→请求被丢弃→静默回退旧数据；2026-11-08 因此「飞书更新网页仍是10月数据」），实时数据应交给 SW 拦截对应请求用异步 fetch 提供，或页面用异步 fetch+重载。**测线上功能不能只 curl：curl 绕过 SW，会误判「接口正常」**（同上）。

## PPT 已交付
- 8月 v7（19页，六 SKU 差异化视角，`scripts/build_ppt_v7.py`）；9月简约版 12 页（`build_sep_report.py`，暗玫 #A6446B）。python-pptx 关键坑：双轴不用 secondary_axis API，做 plotArea OOXML 手术；lineChart dLblPos 只许 t/b/ctr/l/r；轴 title 必须在 numFmt 前；保存会污染未改动页（按部件还原）；逐点柱色用 dPt。详见 2026-10-13/14/15.md。
