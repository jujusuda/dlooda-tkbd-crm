# Dlooda TKBD CRM — 项目长期记忆

## 项目概况
- 品牌方：Dlooda，做 TikTok Shop 美国市场女装
- 系统：Dlooda TKBD CRM — BD 工作台，将飞书人工管理流程数字化为网页端 CRM
- 最终架构：飞书多维表格（Creator/SKU/Sample/Video/Report/Daily）→ Dlooda TKBD Web CRM

## 视觉方向（已确认）
- **淡粉治愈风 + Hello Kitty 极简点缀**（原"深色商务风"已废弃）
- 低饱和淡粉色主色调，治愈简洁、干净护眼
- 仅用蝴蝶结、小猫轮廓做极简点缀
- 可添加到手机桌面，效果类似小程序，PWA
- 无广告、无弹窗、无外部跳转、无付费入口

## 评分体系（严格遵守，不可更改）
- 总分 100：月销售件数 40 + 女装垂度 20 + 均播 15 + 口播推广感 15 + 女粉占比 10
- **不使用**：粉丝数、国家、账号规模
- **不显示**：S级/A级，只显示 ★★★★★ + 95/100

## 佣金规则
- SKU 默认佣金来自真实飞书邀约数据（见 js/data.js 中 SKU_DETAILS 映射），常见：2178=15+10、2190=16+10、2722=11+8、2757=15+8、2789=12+8 等
- 历史兜底：SKU2757 = 15% + 8%
- 高分达人 bonus 可上浮，但当前优先使用 SKU 默认佣金

## 话术风格（用户确认）
- **邀约邮件**：第一句是 Hook（主题/标题），接着介绍 Dlooda 品牌 + 产品卖点，最后说佣金；有时可无 Hook
- **私信版本**：简短、热情、像真人、不像客服；需支持 **中 / 英 / 西（西班牙）** 三语
- 私信示例语气："Hi Elieen~ Your work pants video did sooo well before 😍 ... Already auto-approved for you~"
- 生成入口：AI 分析页「AI 邀约话术」+「AI 私信版本」三语标签页

## 真实飞书数据结构（2026-08-02 已接入）
- 数据来源：hhhh.xlsx 导出，6个工作表
- **每日寄样**（2820条，1746独立达人）：达人名称/官方(L0-1~L6)/星级(1★~5★)/达人类型(核心/潜力/低效/黑名单/高曝光)/出单量/是否复投/通过(自动/手动)/身材(瘦/丰满/大码)/年龄(中年/青年/老)/履约率(诚信/谨慎)/品类/颜色/SKU/寄样时间/履约方式(视频/直播/已催/已取消/未履约)/视频1-27+时间
- **暂定寄样达人**（214条）：待审达人+未通过原因
- **邀约达人**（383条，343条含话术）：日期/SKU/品类/佣金/有效期/计划/达成/话术
- **本月寄样任务**（28条）：SKU/优先级(P0/P1/P2)/定位(爆品/销售/测品)/寄样量/已完成
- **产品定位**（26个SKU）：SKU/定位(爆品/销售/测品/撤退)/商品ID

## 评分体系 vs 飞书字段差异（重要）
- 评分5维度（月销售/女装垂度/均播/推广感/女粉占比）**不在飞书数据中**
- 飞书达人字段是：官方等级/星级/达人类型/身材/年龄/履约率/品类
- 处理方式：评分维度保持BD手动输入，AI页面基于飞书数据提供推断建议值（getScoringSuggestion）
- 飞书达人资料在AI分析页显示为独立卡片

## 已踩的坑（不要重复）
1. 不要增加评分字段（不加粉丝数/国家）
2. 不要做多个 Creator 页面版本（只维护 creator.html）
3. 不要每页手写 Sidebar（已用 app.js 统一注入解决）
4. 不要先做假数据 Dashboard（已接入真实飞书数据）
5. AI Assistant 不要只是文本生成器（已实现全链路）
6. 达人列表1746条需限制渲染数量（100条+搜索提示），否则卡顿

## 数据对接
- 已完成：飞书Excel导出 → real-data.js（3.2MB，自动生成）
- 转换脚本：scripts/convert_excel.py
- **账号与 API 权限（2026-08-08 更正）**：用户是飞书**个人账号（非企业）**，但个人账号可在 open.feishu.cn 创建「自建应用」获取 App ID/App Secret 并开通多维表格读写权限（"企业自建应用"只是分类名词，个人账号同样可建，自发布无需管理员审核）。→ **双向同步 API 路径可行，无需企业账号**
- 痛点：用户嫌每次导出 Excel 太麻烦且文件占磁盘空间（"内存不够"）；API 同步可彻底免导出
- 下一步：用户提供 自建应用凭据(appId/appSecret) + base app_token + 6张表 table_id，运行 server/ 后端实现双向同步（后端已写好，方案A）

## 产品定位体系（用户确认，2026-08-02）
8个主推SKU的完整定位表：
- 2178 Work Pants(Micro Flare) — 秋季第一主推爆款（预算最大） 15+10
- 2190 Work Pants(升级版) — 升级版通勤爆款 16+10
- 2189 Work Pants(经典款) — 经典爆款补货款 13+8
- 28173 Wide Leg Work Pants — 高级感阔腿爆款 15+10
- 28193 Work Pants(新款) — 新款潜力款 13+9
- 2722 Crossover Skort — 夏季清仓爆款 11+8
- 2757 Lace Skort — 秋季新品爆款（重点推） 15+8
- 2789 Four-Pocket Skort — 日常基础Skort（辅助推广） 12+8
- SKU_DETAILS 存于 data.js，产品页编辑后存 localStorage 覆盖
- 用户可在 product.html 新增 SKU，AI话术基于产品信息生成

## 话术风格（用户确认）
- **邀约**：Hook(第一句/主题) → Dlooda品牌+产品介绍 → 佣金 → Feel free to apply
  - 支持有Hook和无Hook两种变体
  - 产品信息严格匹配用户选择的SKU（不能选2722给2178的话术）
- **私信**：简短热情像真人，中英西三语
  - EN: "Hi Elieen~ Your work pants video did sooo well before 😍 Already auto-approved for you~"
  - 中文: "Hi Elieen~ 你之前拍的work pants视频数据超好😍 已经帮你自动通过啦～"
  - Español: "Hola Elieen~ Tu video del work pants funcionó súper bien 😍 Ya te lo aprobé automáticamente~"
- 话术可在邀约页和私信页直接生成，不必每次跳转AI分析
- 邀约/私信页「新建」按钮支持两种模式：AI生成 或 手动输入
- **AI 润色翻译**（translator.js）：用户输入中文草稿→AI润色→多语言翻译
  - 邀约默认英文，可手动切换中文/西语/法语/葡语
  - 私信默认英文+西语，可切换其他语言
  - 基于意图检测+短语字典+模板组装（无外部API依赖）

## 共享工具函数（app.js）
- copyToClipboard / populateSkuSelect / openModal / closeModal
- bindLanguageTabs / loadStorage / saveStorage / createFilterBar
- 所有页面统一使用 App.* 调用，消除重复代码

## 已踩的坑（追加）
6. 达人列表1746条需限制渲染数量（100条+搜索提示），否则卡顿
7. AI分析页 renderResult 不能引用未定义变量（followUpHtml/saveHtml缺失导致loading永不消失）
8. 不要在各页面重复实现 copyToClipboard / populateSkuSelect（已提取到 app.js）
9. translator.js 需在 invite.js / message.js 之前加载（依赖关系）

## 飞书双向同步后端（2026-08-08 新增，方案A）
- 新增 `server/`：Node16 无外部依赖后端（内置 https），托管前端 + 飞书同步
  - `server/config.json`：飞书凭据(appId/appSecret/baseAppToken) + 6张表 tableId + 字段名映射
  - `server/feishu.js`：tenant_access_token / listRecords(分页) / updateRecord / createRecord
  - `server/sync.js`：飞书6表记录 → real-data.js（对齐 convert_excel.py），每条数据嵌入 `_rid`(飞书记录ID)支持写回
  - `server/index.js`：静态托管 + `/api/status` `/api/sync`(拉取飞书→重生成real-data.js) `/api/push`(写回飞书)
  - 启动：`cd server && node index.js`（默认 3000 端口，不占用原 8090 python 静态服）
- 前端接线：`App.pushToFeishu(table,recordId,fields)`（app.js）；邀约页保存话术时若匹配飞书邀约记录则写回"话术"列；全局浮动「🔄 同步飞书」按钮（仅配置后出现）+ 每5分钟自动同步
- **前置依赖（用户需提供）**：飞书自建应用 + 多维表格读写权限 + 把应用添加为该 base 的文档应用；还需 base app_token 与 6 张表 table_id
- **关键约束**：纯前端无法直连飞书，必须走后端代理（飞书不允许浏览器跨域直调 + 需保密 appSecret）
- **凭据管理（2026-08-09 定案，不可违反）**：GitHub 仓库是 **public**，且 `server/config.json` 被 git 追踪 → **该文件永远不填任何密钥**（appId/appSecret/baseAppToken 全部留空，只保留 tableId + 字段映射）。
  - 唯一密钥来源：项目根 `.env`（已 gitignore），字段 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` / `FEISHU_BASE_APP_TOKEN`
  - `server/index.js` 内置零依赖 `.env` 加载器（Node16 无 dotenv），优先级：真实环境变量 > `server/.env` > 根 `.env`；变量名兼容 `FEISHU_*`/`LARK_*` 与 `BASE_TOKEN`/`BASE_APP_TOKEN`
  - 启动 `node server/index.js` 会打印掩码凭据 + 「同步状态：已就绪/凭据不全」
  - 换凭据只改 `.env`，不动代码；提交前用 `.env` 真实值扫描待提交文件确认无泄露
- **凭据有效性（2026-08-09 实测）**：用户决定**不重置** secret，现有凭据有效，tenant_token 获取 + 读表（每日寄样 2845 条）均成功 → 双向同步可用
- 验证：demo 映射管线通过（_rid/视频/聚合/定位均正确）；无凭据时 /api/status 返回 configured:false、/api/sync|push 优雅报错

## 复投分析业务规则（2026-08-09 用户最终确认，不可擅改）
- **复投声明**：以飞书「是否复投」字段为准（**不再用结构推断**）。字段是多选，真实取值 `已推XXXX`（如 已推2178 / 已推2190 / 已推2A19），共 11 种 SKU。
  - 另有 `待合作XXXX`（仅参考，不算声明）和 `已问（颜色` / `已寄（颜色`（脏数据，需跳过）
- **复投成功**：声明之后，该达人再寄样该目标 SKU 且「通过」非空（手动/自动/官方自动）= 成功。
  - **只看系统通过，不要求发视频**（用户明确：「只需要系统通过，不管是否发视频」）
  - 时间必须晚于声明所在的那条寄样记录（按达人时间线索引 j > declIdx 判定）
- **同一达人×同一目标SKU 去重**，取最早一次声明
- **三态拆分**（避免低估）：成功 / 未成功（超 30 天观察期仍没合作）/ 观察中（声明不满 30 天）
  - **观察期 = 30 天（2026-08-09 用户明确确认「可以的，30天观察期」，除非用户再次要求否则不要改）**
  - 常量位置：`js/data.js` 内 `getReinvestAnalysis` 的 `var WATCH_DAYS = 30;`
  - 观察期基准日 = 数据最大 sampleTime（比系统时间稳健）；实测与系统当天仅差 1 天，不影响结果
  - 主口径 `overallRate` = 成功 ÷ (成功+未成功)，观察中不进分母；`rawRate` = 成功 ÷ 全部声明
- **转化耗时统计**（2026-08-09 新增）：成功案例记录 `costDays`（声明→合作上），返回 `medianDays`（中位数）+ `withinWatchRate`（观察期内完成占比）
  - 实测：中位数 26 天，仅 59% 的成功在 30 天内完成，24% 超 60 天（最长 324 天）
  - 含义：30 天略高于中位数，作为阈值合理；但「未成功」里仍有一部分会更晚翻盘，看板已注明
- 真实结果（2026-08-08 数据）：声明 1145、成功 82、未成功 993、观察中 70 → 成功率 8%（rawRate 7%）
  - 转化率天然很低是业务现状：BD 推了很多品，真正接单复投的少
  - 各 SKU 成功率：2776/2701 最高 19%，2178 仅 4%，2190 仅 3%
- **字段格式坑**：`reinvest` 在不同管线格式不一 —— 飞书API/regen 是数组 `["已推2178"]`；`convert_excel.py` 用 `str(row[5])` 会变成字符串/Python字面量。
  - 解决：`parseTaggedSKUs(value, prefix)` 统一 join 成文本后用全局正则 `已推\s*([A-Za-z0-9]+)` 提取，三种格式通吃，且天然跳过 `已推（颜色`（（非字母数字）
- 达人名需 `trim().toLowerCase()` 规范化后再分组（数据里有 4 个前导空格变体，否则时间线被拆断漏判）
