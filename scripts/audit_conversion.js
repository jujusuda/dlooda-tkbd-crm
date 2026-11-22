/* 出单转化卡片：口径回归测试（不改源码，注入导出钩子后在 vm 中运行） */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const path0 = require('path');
const ROOT = path0.resolve(__dirname, '..');
let src = fs.readFileSync(path.join(ROOT, 'js/conversion.js'), 'utf8');
src = src.replace(
  'global.DloodaConversion = { render: render, exportCsv: exportCsv, state: state };',
  `global.__TEST__ = { computeVideo, computeOrder, detectHeaderRow, autoMapping, toDateStr,
     firstProductId, getRanges, buildResult, VIDEO_FIELDS, ORDER_FIELDS,
     DEFAULT_PRODUCT_MAP, state, fmtVal, decodeCsvBuffer, cnHitCount, looksMojibake,
     METRIC_DEFS_TOP, METRIC_DEFS_BOTTOM, METRIC_DEFS_DETAIL, deltaHtml, metricHtml, cardHtml };\n  global.DloodaConversion = { render: render, exportCsv: exportCsv, state: state };`
);

const store = {};
const sandbox = {
  console,
  Promise, Date, Math, Number, String, Object, Array, JSON, RegExp, Error, isNaN, setTimeout,
  TextDecoder, Uint8Array, ArrayBuffer,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  location: { pathname: '/dashboard.html', search: '', hash: '', replace: () => {} },
  document: {
    readyState: 'complete',
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
    createElement: () => ({ style: {}, appendChild: () => {} }),
    head: { appendChild: () => {} }
  },
  navigator: {},
  DloodaApp: { showToast: () => {} },
  DloodaApp_unused: null,
  DloodaData: {
    getReportData: () => ({ skuRanking: [{ sku: '2190', sampleCount: 23 }] }),
    getProductAnalysis: () => ([{ sku: '2190', orderRate: 44.4 }]),
    getSKUDetail: sku => ({ productName: 'Work Pants (Upgraded)' }),
    getSKUPositionTier: () => 0
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const T = sandbox.__TEST__;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
function eq(name, a, b) { ok(name, a === b, { got: a, want: b }); }

console.log('\n=== 1. 表头自动探测（第 1 行 / 第 3 行） ===');
const aoa3 = [
  ['某平台导出', '', '', ''],
  ['统计周期：2026-10', '', '', ''],
  ['发布时间', '商品', '播放量', '商品点击次数'],
  ['2026-10-05', 'xx1731643102010446195yy', '120', '8']
];
eq('表头在第 3 行', T.detectHeaderRow(aoa3).row, 2);
const aoa1 = [['发布时间', '商品', '播放量'], ['2026-10-05', 'x', '99']];
eq('表头在第 1 行', T.detectHeaderRow(aoa1).row, 0);

console.log('\n=== 2. 列名自动映射 + 认不出留空 ===');
const heads = ['发布时间', '商品', '播放量', '商品点击次数', '视频归因成交件数', '视频商品成交件数'];
const mp = T.autoMapping(heads, T.VIDEO_FIELDS);
eq('发布时间', mp.publishTime, 0);
eq('商品', mp.product, 1);
eq('播放量', mp.vv, 2);
eq('点击次数', mp.clicks, 3);
eq('归因成交件数', mp.attrOrders, 4);
eq('商品成交件数', mp.prodOrders, 5);
const mp2 = T.autoMapping(['A列', 'B列', 'C列'], T.VIDEO_FIELDS);
eq('认不出的留空（不默认套列）', mp2.vv, '');
eq('认不出的留空 2', mp2.publishTime, '');

console.log('\n=== 3. 日期归一（创建时间/发布时间） ===');
eq('YYYY-MM-DD', T.toDateStr('2026-10-05 12:30'), '2026-10-05');
eq('DD/MM/YYYY', T.toDateStr('05/10/2026'), '2026-10-05');
eq('YYYY/MM/DD', T.toDateStr('2026/10/05'), '2026-10-05');
eq('Excel 序列号', T.toDateStr('46300'), '2026-10-05');
eq('空值', T.toDateStr(''), '');

console.log('\n=== 4. 只认第一个商品 ID ===');
eq('首个 ID', T.firstProductId('1731643102010446195,1731640825019273587'), '1731643102010446195');
eq('长文本内嵌 ID', T.firstProductId('商品名 Work Pants ID:1731643102010446195 颜色 Black 1732356649258946931'), '1731643102010446195');

console.log('\n=== 5. VV 门槛：月度 <=50 剔（含50）；新品全量 <50 剔（=50 保留） ===');
const PID2190 = '1731643102010446195';
function videoSlot() {
  return {
    type: 'video', headerRow: 0,
    headers: heads,
    mapping: { publishTime: 0, product: 1, vv: 2, clicks: 3, attrOrders: 4, prodOrders: 5 },
    aoa: [
      ['发布时间', '商品', '播放量', '商品点击次数', '视频归因成交件数', '视频商品成交件数'],
      ['2026-10-05', PID2190, '49', '5', '1', '0'],
      ['2026-10-06', PID2190, '50', '6', '2', '0'],
      ['2026-10-07', PID2190, '51', '7', '3', '0'],
      ['2026-10-08', PID2190, '100', '8', '4', '0']
    ]
  };
}
const R = { start: '2026-10-01', end: '2026-10-31' };
const monthly = T.computeVideo(videoSlot(), R, 'monthly');
eq('月度口径视频数（49/50 剔除，51/100 保留）', monthly.data['2190'].videos, 2);
eq('月度口径 VV 合计', monthly.data['2190'].vv, 151);
const full = T.computeVideo(videoSlot(), R, 'full');
eq('新品全量视频数（49 剔，50/51/100 保留）', full.data['2190'].videos, 3);
eq('新品全量 VV 合计', full.data['2190'].vv, 201);

console.log('\n=== 6. 转化单数：两列取「合计更大」的一列 ===');
// attrOrders 合计 = 1+2+3+4 = 10；prodOrders 合计造大值 50
const dual = videoSlot();
dual.aoa[1][5] = '20'; dual.aoa[2][5] = '20'; dual.aoa[3][5] = '20'; dual.aoa[4][5] = '20';
const chosen = T.computeVideo(dual, R, 'full');
eq('选列 = prodOrders', chosen.orderKey, 'prodOrders');
eq('视频成交件数取大列', chosen.data['2190'].orderUnits, 60);
eq('出单视频数（转化单数>0）', chosen.data['2190'].orderedVideos, 3);

console.log('\n=== 7. 数字列是文本也要正确求和 ===');
eq('文本数字求和', monthly.data['2190'].clicks, 15);

console.log('\n=== 8. 订单表：按创建时间、状态白名单、自然单占比按条数 ===');
const orderHeads = ['创建时间', '商品 ID', '支付金额', '下单件数', '订单状态', '店铺广告佣金率'];
function orderSlot() {
  return {
    type: 'order', headerRow: 0, headers: orderHeads,
    mapping: { createdTime: 0, product: 1, gmv: 2, units: 3, status: 4, adRate: 5 },
    aoa: [
      orderHeads,
      ['2026-10-05', PID2190, '100.5', '2', '待确认', ''],        // 自然单
      ['2026-10-06', PID2190, '200', '3', '已结算', '5%'],          // 广告单
      ['2026-10-07', PID2190, '300', '4', '不符合条件', ''],        // 白名单外，剔除
      ['2026-09-30', PID2190, '999', '9', '待确认', ''],             // 区间外，剔除
      ['2026-10-08', '1731643102010446195,1732356649258946931', '50', '1', '待确认', '']  // 首 ID 命中
    ]
  };
}
const o = T.computeOrder(orderSlot(), R);
eq('计入记录条数', o.data['2190'].rows, 3);
eq('GMV 合计', o.data['2190'].gmv, 350.5);
eq('成交件数合计', o.data['2190'].units, 6);
eq('自然单条数（按条数，不按件）', o.data['2190'].naturalRows, 2);

console.log('\n=== 9. 未上传表时指标为 null（显示「暂无数据」而非 0） ===');
T.state.map = Object.assign({}, T.DEFAULT_PRODUCT_MAP);
T.state.range = 'custom'; T.state.customStart = '2026-10-01'; T.state.customEnd = '2026-10-31';
T.state.videoMode = 'monthly'; T.state.statusWhite = '待确认,已结算';
T.state.slots = {};
const emptyRes = T.buildResult();
eq('未上传任何表时不生成空卡片', emptyRes.rows.length, 0);
ok('未上传时给出警告', emptyRes.warnings.some(w => w.indexOf('未上传本期视频登记表') >= 0));
// 只上传订单表：仅展示表里出现的 SKU，寄样数/达人出单率从现有库补
T.state.slots = { order: {
  type:'order', headerRow:0, headers:['创建时间','商品 ID','支付金额','下单件数','订单状态','店铺广告佣金率'],
  mapping:{createdTime:0,product:1,gmv:2,units:3,status:4,adRate:5},
  aoa:[['创建时间','商品 ID','支付金额','下单件数','订单状态','店铺广告佣金率'],
    ['2026-10-05','1731643102010446195','100','2','待确认','']]
} };
const onlyOrder = T.buildResult();
eq('只上传订单表 → 1 张卡片', onlyOrder.rows.length, 1);
const only = onlyOrder.rows[0];
eq('卡片 SKU = 2190', only.sku, '2190');
eq('现有库寄样数补进卡片', only.m.samples.value, 23);
eq('现有库达人出单率补进卡片', only.m.orderRate.value, 44.4);
// 兼容带 skuRanking 的对象形式
const paBackup = sandbox.DloodaData.getProductAnalysis;
sandbox.DloodaData.getProductAnalysis = () => ({ skuRanking: [{ sku: '2190', orderRate: 42.0 }] });
eq('对象形式也能取到出单率', T.buildResult().rows.length, 1);
sandbox.DloodaData.getProductAnalysis = paBackup;
eq('未上传视频表 → 视频数暂无数据', only.m.videos.value, null);
T.state.slots = {};

console.log('\n=== 10. 上传后：口径与环比 ===');
T.state.slots = {
  video: videoSlot(),
  order: orderSlot(),
  prevVideo: (function () { const s = videoSlot(); s.aoa[1][2] = '200'; s.aoa[2][2] = '200'; s.aoa[3][2] = '200'; s.aoa[4][2] = '200'; return s; })(),
  prevOrder: (function () { const s = orderSlot(); s.aoa[1][2] = '50'; return s; })()
};
const res = T.buildResult();
const r = res.rows.filter(x => x.sku === '2190')[0];
eq('GMV', r.m.gmv.value, 350.5);
eq('成交件数', r.m.units.value, 6);
ok('自然单占比 = 2/3', Math.abs(r.m.natural.value - 2 / 3) < 1e-9, r.m.natural.value);
eq('视频数', r.m.videos.value, 2);
eq('出单视频数', r.m.orderedVideos.value, 2);
eq('视频成交件数', r.m.videoUnits.value, 7);
ok('视频出单率 = 100%', Math.abs(r.m.videoRate.value - 1) < 1e-9, r.m.videoRate.value);
ok('点击率 = 15/151', Math.abs(r.m.ctr.value - 15 / 151) < 1e-9, r.m.ctr.value);
eq('总播放量', r.m.vv.value, 151);
eq('总点击次数', r.m.clicks.value, 15);
ok('有上月表时环比基准存在', r.m.gmv.prev !== null && r.m.gmv.prev !== undefined);

console.log('\n=== 11. 格式（上升绿/下降红由 CSS 类控制） ===');
eq('GMV 格式', T.fmtVal(350.5, 'money'), '$351');
eq('自然单占比格式', T.fmtVal(2 / 3, 'pct'), '66.7%');
eq('暂无数据', T.fmtVal(null, 'int'), '暂无数据');

console.log('\n=== 12. CSV 编码：UTF-8 / UTF-8 BOM / GBK-GB18030（3.2） ===');
const CSV_TEXT = '发布时间,商品,播放量,商品点击次数,视频归因成交件数\n2026-10-05,xx1731643102010446195yy,120,8,2\n';
const GBK_B64 = 't6KyvMqxvOQsyczGtyyypbfFwb8syczGt7Xju/e0zsr9LMrTxrW56dLys8m9u7z+yv0KMjAyNi0xMC0wNSx4eDE3MzE2NDMxMDIwMTA0NDYxOTV5eSwxMjAsOCwyCg==';
const bytes = b => Array.from(b);
const dUtf8 = T.decodeCsvBuffer(bytes(Buffer.from(CSV_TEXT, 'utf8')));
eq('UTF-8 识别', dUtf8.encoding, 'UTF-8');
ok('UTF-8 中文表头正常', dUtf8.text.indexOf('发布时间') >= 0 && dUtf8.text.indexOf('å') < 0);
const dBom = T.decodeCsvBuffer(bytes(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(CSV_TEXT, 'utf8')])));
eq('UTF-8 BOM 识别', dBom.encoding, 'UTF-8 (BOM)');
ok('BOM 已剥离', dBom.text.charAt(0) === '发' && dBom.text.indexOf('\uFEFF') < 0);
const dGbk = T.decodeCsvBuffer(bytes(Buffer.from(GBK_B64, 'base64')));
eq('GBK 识别', dGbk.encoding, 'GBK / GB18030');
ok('GBK 中文表头正常显示', dGbk.text.indexOf('发布时间') >= 0 && dGbk.text.indexOf('商品点击次数') >= 0);
ok('GBK 解码后不再是乱码', !T.looksMojibake(dGbk.text));
ok('乱码串能被识别', T.looksMojibake('å\x8f\x91å¸\x83æ\x97¶é\x97´,å\x95\x86å\x93\x81'));
ok('中文表头命中数 > 0', T.cnHitCount(dGbk.text) >= 5);

console.log('\n=== 13. 主网格严格 2×5 = 10 指标，3 过程量收进详情（3.4） ===');
eq('上排 5 格', T.METRIC_DEFS_TOP.length, 5);
eq('下排 5 格', T.METRIC_DEFS_BOTTOM.length, 5);
eq('详情 3 格（不在主网格）', T.METRIC_DEFS_DETAIL.length, 3);
eq('上排第 1 格 GMV', T.METRIC_DEFS_TOP[0].label, 'GMV');
eq('下排第 5 格 新视频点击率', T.METRIC_DEFS_BOTTOM[4].label, '新视频点击率');
const fakeRow = { sku: '2190', name: 'Work Pants (Upgraded)', tag: '爆品', m: {} };
['gmv','units','natural','samples','orderRate','videos','orderedVideos','videoUnits','videoRate','ctr','vv','clicks','cvr']
  .forEach(k => { fakeRow.m[k] = { value: 1, prev: null }; });
const card = T.cardHtml(fakeRow);
eq('主网格恰好 2 行', card.split('<div class="cv-metric-row">').length - 1, 2);
eq('共 13 个指标格（10 主 + 3 详情）', (card.match(/class="cv-metric"/g) || []).length, 13);
ok('详情默认折叠', card.indexOf('data-detail="2190" hidden') >= 0);
ok('过程量只在详情区', card.indexOf('总播放量（VV）') > card.indexOf('cv-metric-row--detail'));
ok('不再有 extra 第三行', card.indexOf('cv-metric-row--extra') < 0);
ok('左侧无商品图 / 环形图', card.indexOf('<img') < 0 && card.indexOf('conic-gradient') < 0);

console.log('\n=== 14. 环比格式「较上月 ↑/↓ x%」+ 红绿箭头（3.4 / 3.7） ===');
const up = T.deltaHtml({ value: 142.9, prev: 100 });
ok('上升格式', up.indexOf('较上月 ↑ 42.9%') >= 0);
ok('上升绿色类', up.indexOf('cv-delta--up') >= 0);
const down = T.deltaHtml({ value: 59.3, prev: 100 });
ok('下降格式', down.indexOf('较上月 ↓ 40.7%') >= 0);
ok('下降红色类', down.indexOf('cv-delta--down') >= 0);
const none = T.deltaHtml({ value: 10, prev: null });
ok('缺上月数据 = 较上月 -', none.indexOf('较上月 -') >= 0);
ok('不再显示「环比 -」', none.indexOf('环比 -') < 0);

console.log('\n=== 15. 3.2 标准中文列名关键词覆盖 ===');
const mv = T.autoMapping(['投稿时间','商品链接','播放次数','点击','视频归因成交件数','视频商品成交件数'], T.VIDEO_FIELDS);
['publishTime','product','vv','clicks','attrOrders','prodOrders'].forEach(k => ok('视频字段 ' + k + ' 能自动识别', mv[k] !== ''));
const mo = T.autoMapping(['下单时间','商品ID','成交金额','成交件数','状态','佣金'], T.ORDER_FIELDS);
['createdTime','product','gmv','units','status','adRate'].forEach(k => ok('订单字段 ' + k + ' 能自动识别', mo[k] !== ''));

console.log('\n----------------------------------------');
console.log(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
