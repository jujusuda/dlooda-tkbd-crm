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
     DEFAULT_PRODUCT_MAP, state, fmtVal };\n  global.DloodaConversion = { render: render, exportCsv: exportCsv, state: state };`
);

const store = {};
const sandbox = {
  console,
  Promise, Date, Math, Number, String, Object, Array, JSON, RegExp, Error, isNaN, setTimeout,
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

console.log('\n----------------------------------------');
console.log(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
