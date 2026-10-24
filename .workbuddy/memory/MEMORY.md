# Dlooda TKBD CRM — 项目长期记忆

## 概况
- Dlooda：TikTok Shop 美国女装；CRM 把飞书人工流程数字化为网页端 BD 工作台。
- 架构：飞书多维表格 → Dlooda TKBD Web CRM（GitHub `jujusuda/dlooda-tkbd-crm`，Cloudflare Pages 部署，PWA 可加手机桌面）。
- 视觉：淡粉治愈风 + Hello Kitty 极简点缀（蝴蝶结/小猫），无广告弹窗。

## 不可违反的硬性规则
- **评分体系**：总分100 = 月销售40 + 女装垂度20 + 均播15 + 口播推广感15 + 女粉占比10；不用粉丝数/国家/账号规模；不显示 S/A 级，只显示 ★★★★★ + 95/100。
- **佣金默认**（SKU_DETAILS, data.js）：2178=15+10、2190=16+10、2722=11+8、2757=15+8、2789=12+8、2189=13+8、28173=15+10。
- **SKU 下拉排序**：爆品→销售→测品→撤退（getAvailableSKUs / getSKUPositionTier）。
- **复投口径（2026-08-09 定，不可擅改）**：声明=飞书「已推XXXX」字段；成功=声明后同 SKU 再寄样且「通过」非空（只看系统通过，不要求发视频）；观察期=30 天（WATCH_DAYS）；双口径并存——口径A 按 SKU 拆分（默认）/ 口径B 按达人整体，dashboard 顶部切换。
- **出单率口径（2026-09-10 定，不可擅改）**：出单率 = 出单达人 ÷ 有视频达人；「有视频达人」= videos 里存在 `url` 非空的达人（**不是** videos.length>0，后者会多算「只有视频时间无链接」的达人）；「出单达人」= orderCount>0。28173 由此 = 25/74 = 33.78%。三端（小程序 data.js / dashboard.js / PPT _correct_sku_data.json）必须一致。

## 数据 & 部署坑
- 飞书个人账号可建「企业自建应用」拿 AppID/Secret + 多维表格权限 → 双向同步可行（不需企业号）。
- 凭据：GitHub public 仓库，`server/config.json` 永不填密钥（只留 tableId + 映射）；唯一密钥源 `.env`（FEISHU_APP_ID/SECRET/BASE_APP_TOKEN）。
- 线上 `/js/real-data.js` 路由（`functions/[[path]].js`，2026-10-13 确认）：**仓库静态文件优先，KV 仅缺失兜底**（旧记忆「KV 优先」已过时）。因此页面上的「同步飞书」按钮（POST /api/sync 写 KV）**不改变线上数据**；线上更新唯一路径 = 本地 `server/_run_sync_once.js` 重新生成 js/real-data.js → commit+push → Cloudflare Pages 自动构建 → 递增 sw.js CACHE_VERSION。飞书时间戳按 UTC+8 解析（`new Date(ts+8h).getUTC*()`），`server/sync.js` 与 `functions/lib/sync.mjs` 时区逻辑须一致。
- PWA 缓存：改前端后 `sw.js` CACHE_VERSION 递增 + 入口加 `?v=` 强刷，否则用户看到旧版。
- 字段类型坑：飞书导出 `orderCount` 是**字符串**（求和会拼接）、`fulfillMethod` 是**数组**（`["视频"]`，不能 `=== '视频'`）、`category/creatorType` 是数组（用 normFieldToStr 转）。判断出单/履约前先归一化。
- 同步入口：`node server/sync.js` 直接跑**不会**同步（主模块只处理 `--demo`）；真正同步用 `server/_run_sync_once.js`（复用 .env 加载 + `sync.syncFromFeishu`）或线上 HTTP `POST /api/sync`（functions/api/sync.js → functions/lib/sync.mjs 写 KV）。
- PPT 月报日期窗口：`_correct_sku_data.json` 的「7月」= 6/15-7/15、「8月」= 7/15-8/15（**非自然月**，是 30 天筛选窗）。
- **PPT 月报权威数据源（2026-09-13 定，铁律）**：`scripts/_authoritative_data.json` = 用户文字提供的寄样端/视频端/自然单占比明细表（7常卖6款+8常卖6款+2757测款）。**绝不可**用 `js/real-data.js` 或旧 `_correct_sku_data.json` 给 PPT 填数——它们口径错、已害出多次假数据。**模型看不到图片里的数字**，用户给图时必须让用户贴文字表，否则一律不填数。
- 8月 PPT 重算口径：月度出单=「月度达人总出单」；覆盖效应(件)=(8月出单人−7月出单人)×7月人均；单产效应(件)=8月出单人×(8月人均−7月人均)；恒等式 覆盖+单产=订单环比变化（已逐项校验 ✅）。7月基数以用户 9-13 文字表为准（2722=1763/2178=1455/2190=1696/2189=176/2789=100/28173=321）。

## 话术风格
- 邀约：Hook(首句/主题) → Dlooda 品牌+产品 → 佣金 → Feel free to apply；产品信息严格匹配所选 SKU。
- 私信：简短热情像真人，中/英/西三语；邀约/私信页可直生成，支持 AI 生成或手动。
- `translator.js`：意图+词典+模板（无外部 API），须在 invite.js / message.js 前加载。

## 已踩的坑
1. 不加评分字段(粉丝数/国家) 2. 只维护 creator.html 单版本 3. 不手写 Sidebar(用 app.js 注入) 4. 不先做假数据 Dashboard 5. AI 页要全链路 6. 达人列表限 100 条+搜索 7. AI 分析 renderResult 不引用未定义变量 8. 不重复实现 copyToClipboard/populateSkuSelect(提取到 app.js) 9. translator.js 加载顺序。

## 8 月 PPT 月报（v7 最终, 2026-09-10）
- 19 页：封面/目录/Part01 总览(核心4项+12SKU汇总+一页结论增长拆解)/Part02 六 SKU 页/Part03 达人洞察(亮点流失+效率榜+接力矩阵)/Part04 复投(双口径)+下月 7 项。
- **六 SKU 差异化视角（v7 核心，用户要"不要千篇一律"）**：2178+2190=增长质量诊断(头部依赖)、2722=产品生命周期(衰退收割)、28173=内容驱动增长(自然成交)、2189=达人资产流失召回、2789=风险预警止损、2757=新品测款接力。每个回答不同问题，不再"出单率涨跌"套模板。
- 数据全部硬编码自用户确认版（`余慧玲8月月度汇报.pptx`），不动；脚本 `scripts/build_ppt_v7.py`；产物 `Dlooda_8月月度汇报_v7.pptx`。
- 两易混模块：①**全 SKU 达人效率榜** = 综合效率分(出单率Z + 单达人产出Z)；②**SKU 接力 & 机会矩阵** = BCG 四象限(明星28173/现金牛2178+2190/机会2189/瘦狗2789，2722 夏款交棒 2757)。
- 演讲稿 `演讲稿_8月月度汇报.md`（v6 版，数字已随出单率口径更新需同步刷新）。

## 9 月 PPT 月报（2026-10-08 初稿）
- 风格切换：用户要求**简约小众 / 留白充足 / 专业**（与 8 月艳粉版不同）。配色=白底 + 暗玫强调 `#A6446B` + 灰阶 + 极浅暖灰卡 `#F7F4F5`；字体微软雅黑。每页统一叙事：结论→指标→变化→为什么→最大因素→策略。
- 12 页结构：P1-2 店铺整体(PART01) / P3-9 各款SKU总分总(PART02) / P10-11 达人端(PART03) / P12 下月行动(PART04)。
- 图表用 python-pptx 原生：折线(趋势)=LINE、柱状(对比)=COLUMN_CLUSTERED。⚠️python-pptx 高层 API `Series.secondary_axis` 不可靠（setter 后 getter 返回 bool）→ **不要用它做双轴**。
- ✅**组合图 / 左右双轴的正解（2026-10-14 打通，双轴不必拆两张图）**：不用 `secondary_axis` API，直接对 `plotArea` 做 OOXML 手术——①用 python-pptx 建 `LINE_MARKERS` 全系列（顺势拿到合规 lineChart + 内嵌 xlsx 引用）；②把要转柱的 `<c:ser>` 从 lineChart 移进手工 `<c:barChart>`（子元素顺序照抄 python-pptx 自生成的 barChart：barDir,grouping,varyColors,ser*,gapWidth,axId,axId；柱 ser 内要删 `<c:smooth>`）；③深拷贝主 valAx → 改 axId/axPos=r/删 majorGridlines/在 majorTickMark 前插 numFmt/crossAx=catAxId → `valAx.addnext(sec)` 成右轴；④**绑定**：柱 plot 的第二个 axId 指向左轴、折线 plot 的第二个 axId 指向右轴（`plot.findall(qn('c:axId'))[1].set('val', secId)`；漏了会把线留在左轴）。脚本 `scripts/_build_p9_combo.py`、`_build_p9_native.py`，序列校验器 `scripts/_check_order_p9b.py`（按 ECMA-376 允许序列升序检查 plot/valAx/catAx/ser/title，防"文件损坏"）。
  - 变体：**柱在左轴、线在右轴**（v9_1(9) P9）= 柱 plot 绑主 valAx(l)、线 plot 绑次 valAx(r)，主 valAx 保留 majorGridlines 供背景网格。
  - ⚠️**轴标题顺序坑**：CT_ValAx 序列是 …majorGridlines, **title**, **numFmt**, majorTickMark…，轴 `<c:title>` 必须排在 `<c:numFmt>` **之前**；先 addprevious(numFmt) 再 addprevious(title) 会得到 numFmt→title 的**非法顺序**。正解：对 `majorTickMark` 先 addprevious(title) 再 addprevious(numFmt)。（valAx 允许序列还含 crossBetween/majorUnit/minorUnit/dispUnits。）
  - 数据标签白底：把 dLbls `<c:spPr>` 的 `<a:noFill/>` 换成 `<a:solidFill><a:srgbClr val="FFFFFF"/>`，标签压柱体上仍清晰。
  - **贴图转原生**：若某页是 PNG 截图（用户要"可编辑"），先用 `shape.image.blob` 导出图片、用 Read 多模态看清设计，再 1:1 复刻为原生图表/形状；卡片因果链 = 底板圆角矩形 + N 行小圆角块 + (N-1) 个倒三角(ISOSCELES_TRIANGLE rot=180) + 标题文本框。
- 牢记 dLblPos 铁律（2026-10-13 踩坑，v9_2 损坏事故）**：lineChart 的 `dLblPos` 只允许 `t/b/ctr/l/r`；`outEnd`/`inEnd` 是柱图/饼图专用，写进折线图 → PowerPoint 报「文件损坏需修复」并剥掉内容。必须用 `XL_LABEL_POSITION.ABOVE/BELOW`。且逐点显示数值必须**逐系列** `series.data_labels.show_value=True`（仅设 plot 级不继承到 per-series dLbls）。排障脚本 `scripts/_diag_full.py`（包结构校验）、`_check_line_outend.py`。
- **python-pptx 保存会污染未改动页（2026-10-14 定）**：`<a:t>` 里的 `&#10;` 被写成字面换行，XML 声明引号改单引号、`\r\n`→`\n` → 全篇 slide XML 与源不等。改单页交付时**保存后按部件还原**：除 `[Content_Types].xml`、目标 slideN.xml 及其 rels、新增部件外，其余写回源字节（脚本思路见 `2026-10-14.md`）。
- **`CT_PlotArea` 轴顺序（校验器易误报）**：valAx/catAx/dateAx/serAx 在同一 `xsd:choice maxOccurs=unbounded` 组，**可任意顺序**（python-pptx 输出 catAx 在 valAx 前合法）。序列校验器要把四轴归为同一档位，否则误判「文件损坏」。
- **逐点柱色**：`series.points[i].format.fill.solid()` + `fore_color.rgb` → 生成 `<c:dPt>`，可在单系列内给不同柱上不同色（8月/9月双色），比拆两个系列（留空位、柱变窄）干净。
- **用户口头给的页码不可照搬**：改页前先扫全篇标题确认（v9_1(11) 的「达人素材供给」是 P14，用户说「第13页」时 P13 是章节分隔页）。
- 脚本 `scripts/build_sep_report.py`；产物 `Desktop/Dlooda_9月月度汇报_初稿.pptx`。
- **达人建联页口径（2026-10-15 定，勿改）**：成功建联 **27**（2190=13；旧表写 12/合计 26 是错的，已统一为 27）；漏斗 27→20(74.1%)→17(85.0%)；分品表 2178 9/7/7、2190 13/9/6、28173 3/2/2、2189 2/2/2、合计 27/20/17，新增列「发视频→出单率」= 已出单÷已发视频（2178 100%★ 玫红高亮、2190 67%、28173 100%、2189 100%、合计 85%）。**「建联」= 向已出单老达人发起二次合作并成功同意的人数，不是新拓达人**（这句必须留在页上）。判断横幅：老达人二次合作出单确定性高（发视频→出单 85%），2178 达 100%，是稳定出单的高效路径。落点策略三块：扩大二次合作覆盖面 / 未合作过的达人付费合作补充 / 巩固 2178 等高确定款老达人池。用户禁止「流失」类措辞。
- **python-pptx 1.0.2 圆角坑**：`shape.adjustments = x` 抛 AttributeError → 用 `shape.adjustments[0] = x`，或不设（默认 roundRect 弧度够用）。
- **rels 校验路径规则**：`dir/_rels/x.rels` 的解析基准是 `dir`，不是 `dir/_rels`；否则 `_rels/.rels`、`ppt/_rels/presentation.xml.rels` 会全部误报失效。
- 已知占位/估算：①P11 复投页为【数据待补充】占位（用户明确待统计）；②P5 的 28173 **8月寄样=81 为 67→95 线性估算**（用户只给首尾 67/95 没给 8 月单值），页面已标注"约81为估算"，交付时需提醒用户核实真实 8 月寄样。

## CRM 三大联动功能（2026-10-23 定，铁律）

### 功能① 日程提醒（落地在 todo.html，未单独建页）
- 渠道 = **界面弹窗 + 邮件**，两者都要
- 打开**任意页面**自动弹出未完成的今日待办；关闭弹窗后仍**常驻待办清单**
- 重复节奏：每 **2 天**提醒一次（settings.repeatIntervalDays=2）直到标记完成
- 规则结构 `{id,title,type:'monthly'|'once',day,date,leadDays,repeatInterval,email,emailTo,done[],builtin,enabled}`
- 内置两条：每月 3 号「统计达人出单转化数据，准备月度 PPT」；每月 25 号「催寄样未履约的达人发视频」，leadDays=3
- 内置规则**不可删除**（deleteRule 对 builtin 返回 false）
- 邮件通道 = POST `./api/notify` `{to,subject,text}`，后端 `functions/api/notify.js` 走 Resend HTTP API（Workers 不支持 SMTP 直连）；未配 `RESEND_API_KEY` 时前端自动降级为界面提醒

### 功能② 达人名单库（roster.html）
- **handle 归一化**：trim → 去 @ 前缀 → 转小写 → 去掉所有非 `[a-z0-9._]` 符号 → 去尾部点
- **粘贴解析分隔符**：换行 / 逗号（中英文）/ 分号 / 制表符 / **空格**；URL 用 `/@([A-Za-z0-9._-]+)/` 抽 handle
- **三道规则（优先级固定，勿调序）**：
  1. `creatorType` 含「**黑名单**」→ 拒绝录入
  2. `creatorType` 含「**低效**」→ 拒绝录入
  3. 历史累计合作 SKU 数 ≥ **3** → 锁定，不再发新 SKU 自动邀约
  4. 已合作过目标 SKU → 标记「已合作该款」，默认不导入（可手动放行）
  5. 其余 = ok（飞书查不到 = 新达人）
- creatorType 可能是数组或「A,B」字符串 → 必须用 `Matcher.normField()` 统一
- 分组 = SKU；**同一达人可进多个组**（今天发 2190、明天发 2189，新达人可同时进两款组）
- **（2026-10-24 用户澄清，铁律）名单库 = 纯本地工具**：
  - **不同步飞书、不回写飞书**，只存在本机浏览器 localStorage；页面顶部已写明这条，勿再加同步逻辑
  - 比对数据源 = 飞书**每日寄样表**（`REAL_DATA.creators` + `samples` 并集，两者同源无需二选一）
  - 主视图 = **「按 SKU 看名单」卡片**：每个 SKU 一张卡，卡内 chip 列出可发送达人，卡片顺序与 SKU 下拉定位一致（爆品→销售→测品→撤退）
  - **重复导入同批 handle 到新 SKU = 追加分组，不重复录入库**（旧的 addRosterItems 会跳过，已改为 updateRosterItem 追加 groups）
  - 分组卡片内**针对该 SKU 单独再判一次**（飞书数据更新后原 ok 可能失效）→ 失效的进「需复核」区，灰色删除线，不进可发送名单

### 「自动邀约」的真实口径（2026-10-24 用户澄清，铁律）
- **系统不代发邀约**。自动邀约 = ① 整理好名单库 ② 用户按当天要发的 SKU 点「复制全部 N 个」③ 用户自己粘贴去发
- 因此一键复制是名单库的**核心出口**，复制格式三选一（存 `settings.rosterCopyFormat`）：
  `line` 一行一个 / `comma` 逗号分隔 / `at` 带 @ 前缀
- 名单库对外接口 `window.DloodaRoster`：`refresh / renderGroups / groupMembers / formatHandles / copyHandles / copyGroup(sku) / setFormat / getFormat / markGroupSent(sku) / resetGroupSent(sku)`

### 「标记已发送」（2026-10-24 加，铁律）
- **复制只取「待发」（未标记）成员**，已发送的不进复制内容 —— 这是这功能存在的唯一目的
- 数据结构 `roster[i].sent = { '<sku>': '2026-10-24' }`，**按 SKU 独立**：同一达人 2190 已发不影响 2189
- ⚠️ **只能用 `Store.markSent(id, sku, date)` / `Store.unmarkSent(id, sku)` 改**
  —— 若用 `updateRosterItem(id, {sent:{...}})` 整体赋值，会**抹掉该达人在其他 SKU 的发送记录**（真踩过，测试暴露）
- 组内三分：`ok` 待发 / `sent` 已发（灰删除线）/ `review` 失效需复核；**review 优先级最高**，先判失效再判已发
- 卡片按钮：`复制待发 N 个` / `✓ 标记已发`（整组）/ `↩ 重置 N 条`；chip 上 `✓` 单个标记、`↩` 取消、`×` 移出组
- 导出 CSV 已加「已发送SKU」列；明细表分组 tag 已发会带 ✓

### 功能③ 履约追踪（tracking.html）
- **未履约判定**：`updateTime` 为空 **且** `fulfillMethod` 为空
- **执行窗口**：每月 **25–30 号之间的工作日**
- **目标寄样时间窗**：**上月 15 号** ~ **本月 15 号**
  - 例：10/26–30 执行 → 催寄样时间在 9/15–10/15 未履约的达人
- **不分级**
- 状态回填飞书：`App.pushToFeishu('daily', rid, { '履约方式': [值] })`；值为飞书现有取值
  视频 / 直播 / 已催 / 已发邮件 / 已私信 / 待发邮件 / 未履约 / 已取消

### 数据现状
- REAL_DATA: creators 2254 / samples 4861 / pending 282 / invites 621 / tasks 49 / skus 26 / offline 0
- 黑名单达人 122 条寄样（38 人）／低效达人 207 条（39 人）
- 未履约寄样 314 条；累计合作≥3款的达人 308 人
- creators 字段：`_rid, name, official, stars, creatorType, bodyType, age, fulfillment, category, note, sampleCount, videoCount, skus, lastSampleTime`
- samples 字段比 creators 更全（含 sampleTime/updateTime/fulfillMethod/orderCount/reinvest/approval/videos）

