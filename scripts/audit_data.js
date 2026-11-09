/* 数据口径回归自检 —— 用法：node scripts/audit_data.js
   优先读 work/_live.js（线上 /api/data 快照），没有则退回仓库里的 js/real-data.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIVE = path.join(ROOT, 'work', '_live.js');
const STATIC = path.join(ROOT, 'js', 'real-data.js');
const ORDER = path.join(ROOT, 'js', 'order-data.js');

global.window = {};
require(fs.existsSync(LIVE) ? LIVE : STATIC);
if (fs.existsSync(ORDER)) require(ORDER);

eval(fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8')
  .replace(/^const /gm, 'var ').replace(/^let /gm, 'var '));
const D = window.DloodaData;

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ✅', name, detail || '');
  else { console.log('  ❌', name, detail || ''); fails++; }
}

const S15 = '2026-09-15', S14 = '2026-10-14', S16 = '2026-10-15';
const SKUS = ['2178', '2190', '2722', '2189'];

console.log('[A] 15 号切月：9/15~10/15 应等于 9/15~10/14');
SKUS.forEach(k => {
  const a = D.getProductAnalysis(S15, S16).find(x => x.sku === k);
  const b = D.getProductAnalysis(S15, S14).find(x => x.sku === k);
  check('产品分析 ' + k, a && b && a.ordered === b.ordered && a.videoRows === b.videoRows,
    a && b ? `出单行 ${a.ordered}/${b.ordered} 视频行 ${a.videoRows}/${b.videoRows}` : '缺数据');
});

console.log('[B] 产品分析表 vs 区间率函数');
SKUS.forEach(k => {
  const p = D.getProductAnalysis(S15, S16).find(x => x.sku === k);
  const r = D.getSKUOrderRateInRange(k, S15, S16);
  check('出单率 ' + k, p.orderRate === r.orderRate && p.ordered === r.orderedRows && p.videoRows === r.videoRows,
    `${p.orderRate}% vs ${r.orderRate}%`);
});

console.log('[C] 履约率：产品表 vs getFulfillmentRate');
SKUS.forEach(k => {
  const p = D.getProductAnalysis(S15, S16).find(x => x.sku === k);
  const f = D.getFulfillmentRate(S15, S16, k);
  check('履约率 ' + k, p.fulfillRate === f.fulfillmentRate, `${p.fulfillRate}% vs ${f.fulfillmentRate}%`);
});

console.log('[D] 月度桶 2026-10 与区间率一致');
SKUS.forEach(k => {
  const t = D.getSKUTrendAnalysis(k).find(x => x.month === '2026-10');
  const r = D.getSKUOrderRateInRange(k, S15, S16);
  check('趋势 ' + k, t && t.orderRate === r.orderRate, t ? `${t.orderRate}% vs ${r.orderRate}%` : '缺月份');
});

console.log('[E] 达人层级聚合 vs 产品分析（寄样/视频/出单行 汇总）');
{
  const lv = D.getLevelAnalysis(S15, S16, '');
  const pa = D.getProductAnalysis(S15, S16);
  check('寄样行', lv.reduce((s, r) => s + r.rows, 0) === pa.reduce((s, r) => s + r.approved, 0));
  check('视频行', lv.reduce((s, r) => s + r.video, 0) === pa.reduce((s, r) => s + r.videoRows, 0));
  check('出单行', lv.reduce((s, r) => s + r.ordered, 0) === pa.reduce((s, r) => s + r.ordered, 0));
}

console.log('[F] 层级表素材量 vs 素材看板（2178）');
{
  const mat = D.getLevelAnalysis(S15, S16, '2178').reduce((s, r) => s + r.materials, 0);
  check('素材合计', mat === D.getMaterialDashboard(S15, S16, '2178').total, `${mat} vs ${D.getMaterialDashboard(S15, S16, '2178').total}`);
}

console.log('[G] 视频分析「视频总数」= 素材看板（全 SKU）');
{
  check('视频总数', D.getVideoAnalytics(S15, S16, '').total === D.getMaterialDashboard(S15, S16, '').total,
    `${D.getVideoAnalytics(S15, S16, '').total} vs ${D.getMaterialDashboard(S15, S16, '').total}`);
}

if (window.ORDER_DATA) {
  console.log('[H] 订单级：分项合计 = 总计；占比 ≤ 100%');
  const r = D.getOrderFreshness(S15, S16, '');
  const sum = r.g.news.orders + r.g.olds.orders + r.g.unknown.orders;
  check('订单合计', sum === r.total.orders, `${sum} vs ${r.total.orders}`);
  const co = r.creatorOrder;
  check('达人订单合计', co.news.orders + co.olds.orders + co.unknown.orders === r.total.orders);
  check('新老达人出单率 ≤100%', co.newOrderRate <= 100 && co.oldOrderRate <= 100, `${co.newOrderRate}% / ${co.oldOrderRate}%`);
  const m = r.multi.groups.reduce((s, g) => s + g.orders, 0);
  check('多品订单合计 = 分组合计', m === r.multi.totalOrders, `${m} vs ${r.multi.totalOrders}`);
} else {
  console.log('[H] 跳过（未加载 order-data.js）');
}

console.log('[I] 边界：不存在的 SKU / 无区间');
check('无区间不报错', !!D.getOrderFreshness('', '', '9999'));
check('空 SKU 出单率 0', D.getSKUOrderRateInRange('9999', S15, S16).orderRate === 0);
check('空 SKU 层级为空', D.getLevelAnalysis(S15, S16, '9999').length === 0);

console.log('\n结果：' + (fails === 0 ? '全部通过 ✅' : fails + ' 项失败 ❌'));
process.exit(fails === 0 ? 0 : 1);
