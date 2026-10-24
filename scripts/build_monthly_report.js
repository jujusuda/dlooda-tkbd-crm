/* Dlooda TKBD 月报 v9 —— 汇报式 + 权威月度数据 + 全模块结论
   统计区间：2026-07-15~08-15（8月）vs 2026-06-15~07-15（7月），月中到月中。
   6 个常卖 SKU（2178/2190/2722/2189/28173/2789）的订单/视频/自然单数据采用用户手算权威表（scripts/authority_table.js）。
   其他分析（语言、画像、通过率、新老达人等）使用飞书最新同步数据。
   注意：本文件不能用 'use strict'（eval 内的 var 需泄漏到外层作用域）。 */
global.window = global;
global.location = { href: '' };
var _store = {};
global.localStorage = { getItem: function (k) { return _store[k] || null; }, setItem: function (k, v) { _store[k] = String(v); }, removeItem: function (k) { delete _store[k]; } };
global.document = { readyState: 'complete', addEventListener: function () {}, getElementById: function () { return null; }, querySelectorAll: function () { return []; } };
try { global.navigator = global.navigator || { userAgent: 'node' }; } catch (e) { /* Node22 navigator 只读 */ }

var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
eval(fs.readFileSync(path.join(ROOT, 'js/real-data.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'scripts/authority_table.js'), 'utf8'));
var AUTH = AUTHORITY;

var ALL_SAMPLES = DloodaData.getSamples();
var SKU_LIST = DloodaData.getSKUs();

var P7_START = '2026-06-15', P7_END = '2026-07-15';
var P8_START = '2026-07-15', P8_END = '2026-08-15';

// SKU 定位/品类
var tierMap = {}, typeMap = {}, nameMap = {};
SKU_LIST.forEach(function (s) {
  if (s.sku) {
    if (s.positioning) tierMap[s.sku] = s.positioning;
    if (s.productType) typeMap[s.sku] = s.productType;
    if (s.productName) nameMap[s.sku] = s.productName;
  }
});
var tierOrder = { '爆品': 0, '销售': 1, '测品': 2, '撤退': 3 };

function isOrdered(s) { return s.orderCount && Number(s.orderCount) > 0; }
function isFulfilled(s) { return s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0); }

/* ---- 语言（飞书「国家」字段：英语/黑人/西语/其他） ---- */
var LANG_BY_KEY = {};
REAL_DATA.samples.forEach(function (s) {
  var l = String(s.language || '').trim();
  if (l) LANG_BY_KEY[(s.creator || '').trim().toLowerCase() + '|' + (s.sampleTime || '')] = l;
});
function langOf(s) { return LANG_BY_KEY[(s.creator || '').trim().toLowerCase() + '|' + (s.sampleTime || '')] || '未标记'; }
var LANGS = ['英语', '黑人', '西语', '其他'];

// 全部历史达人名（新达人判定：8月前从未寄样）
var pre8 = {};
ALL_SAMPLES.forEach(function (s) { if (s.sampleTime && s.sampleTime < P8_START && s.creator) pre8[s.creator.trim().toLowerCase()] = true; });

/* ---- 样本筛选 ---- */
function samplesIn(start, end, sku) {
  return ALL_SAMPLES.filter(function (s) {
    if (!s.sampleTime || s.sampleTime < start || s.sampleTime > end + ' 23:59') return false;
    if (s.sku && tierMap[s.sku] === '撤退') return false;
    if (sku && s.sku !== sku) return false;
    return true;
  });
}
function allSamplesOf(sku) { return ALL_SAMPLES.filter(function (s) { return s.sku === sku && tierMap[s.sku] !== '撤退'; }); }

/* ---- 统计口径 ---- */
function periodStats(samples) {
  var total = samples.length, fulfilled = 0, ordered = 0, totalPieces = 0, newCreators = 0;
  var creators = {}, orderedCreators = [];
  samples.forEach(function (s) {
    var key = (s.creator || '').trim().toLowerCase();
    if (!creators[key]) creators[key] = { name: s.creator, samples: 0, ordered: 0, pieces: 0 };
    creators[key].samples++;
    if (isOrdered(s)) { ordered++; var p = Number(s.orderCount) || 0; totalPieces += p; creators[key].ordered++; creators[key].pieces += p; }
    if (isFulfilled(s)) fulfilled++;
    if (!pre8[key]) newCreators++;
  });
  var cList = Object.keys(creators).map(function (k) { return creators[k]; });
  cList.forEach(function (c) { if (c.pieces > 0) orderedCreators.push(c); });
  orderedCreators.sort(function (a, b) { return b.pieces - a.pieces; });
  return {
    total: total, creatorCount: cList.length, newCreators: newCreators,
    fulfilled: fulfilled, fulfillRate: total ? +(fulfilled / total * 100).toFixed(1) : null,
    ordered: ordered, orderRate: total ? +(ordered / total * 100).toFixed(1) : null,
    totalPieces: totalPieces, topOrdered: orderedCreators.slice(0, 5),
  };
}

function creatorMetrics(samples) {
  var coop = {}, fulfilled = 0, total = samples.length, totalPieces = 0;
  samples.forEach(function (s) {
    var k = (s.creator || '').trim().toLowerCase();
    if (!coop[k]) coop[k] = { name: s.creator, pieces: 0, video: false, ordered: false };
    if (isFulfilled(s)) fulfilled++;
    if (s.videos && s.videos.length) coop[k].video = true;
    if (isOrdered(s)) { coop[k].ordered = true; var p = Number(s.orderCount) || 0; coop[k].pieces += p; totalPieces += p; }
  });
  var coopN = Object.keys(coop).length, videoN = 0, orderedN = 0;
  Object.keys(coop).forEach(function (k) { if (coop[k].video) videoN++; if (coop[k].ordered) orderedN++; });
  return {
    coop: coopN, video: videoN, ordered: orderedN, pieces: totalPieces,
    fulfillRate: total ? +(fulfilled / total * 100).toFixed(1) : null,
    orderRate: coopN ? +(orderedN / coopN * 100).toFixed(1) : null,
    perCreator: orderedN ? +(totalPieces / orderedN).toFixed(1) : null,
  };
}

function overallFulfillOrder(samples) {
  var fulfilled = {}, ordered = {};
  samples.forEach(function (s) {
    var k = (s.creator || '').trim().toLowerCase();
    if (isFulfilled(s)) fulfilled[k] = true;
    if (isOrdered(s)) ordered[k] = true;
  });
  return { fulfill: Object.keys(fulfilled).length, order: Object.keys(ordered).length };
}

/* ---- 报告期有寄样的 SKU ---- */
var skuSet = {};
samplesIn(P8_START, P8_END, null).forEach(function (s) { if (s.sku) skuSet[s.sku] = true; });
var rows = [];
Object.keys(skuSet).forEach(function (sku) {
  var p7S = samplesIn(P7_START, P7_END, sku), p8S = samplesIn(P8_START, P8_END, sku);
  rows.push({
    sku: sku, tier: tierMap[sku] || '未标记', type: typeMap[sku] || '未分类',
    P7: periodStats(p7S), P8: periodStats(p8S),
    P7m: creatorMetrics(p7S), P8m: creatorMetrics(p8S)
  });
});
rows.sort(function (x, y) {
  var tx = tierOrder[x.tier] !== undefined ? tierOrder[x.tier] : 9;
  var ty = tierOrder[y.tier] !== undefined ? tierOrder[y.tier] : 9;
  if (tx !== ty) return tx - ty;
  return y.P8.total - x.P8.total;
});

var overall = {
  P7: periodStats(samplesIn(P7_START, P7_END, null)),
  P8: periodStats(samplesIn(P8_START, P8_END, null)),
  P7m: creatorMetrics(samplesIn(P7_START, P7_END, null)),
  P8m: creatorMetrics(samplesIn(P8_START, P8_END, null))
};
var overallP7fo = overallFulfillOrder(samplesIn(P7_START, P7_END, null));
var overallP8fo = overallFulfillOrder(samplesIn(P8_START, P8_END, null));
overall.P7.orderRateFo = overallP7fo.fulfill ? +(overallP7fo.order / overallP7fo.fulfill * 100).toFixed(1) : null;
overall.P8.orderRateFo = overallP8fo.fulfill ? +(overallP8fo.order / overallP8fo.fulfill * 100).toFixed(1) : null;

/* ---- 权威月度汇总（6 个常卖 SKU） ---- */
var FOCUS = ['2178', '2190', '2722', '2189', '28173', '2789'];
var authSummary = { P7: { samples: 0, fulfillCreators: 0, orderCreators: 0, monthlyOrders: 0 }, P8: { samples: 0, fulfillCreators: 0, orderCreators: 0, monthlyOrders: 0 } };
FOCUS.forEach(function (sku) {
  var r7 = AUTH.get('2026-07', sku), r8 = AUTH.get('2026-08', sku);
  if (!r7 || !r8) return;
  ['P7', 'P8'].forEach(function (p) {
    var r = p === 'P7' ? r7 : r8;
    var s = authSummary[p];
    s.samples += r.samples; s.fulfillCreators += r.fulfillCreators;
    s.orderCreators += r.orderCreators; s.monthlyOrders += r.monthlyOrders;
  });
});
authSummary.P7.orderRate = authSummary.P7.fulfillCreators ? +(authSummary.P7.orderCreators / authSummary.P7.fulfillCreators * 100).toFixed(1) : null;
authSummary.P8.orderRate = authSummary.P8.fulfillCreators ? +(authSummary.P8.orderCreators / authSummary.P8.fulfillCreators * 100).toFixed(1) : null;

/* ---- 瀑布图 ---- */
var waterfall = [];
FOCUS.forEach(function (sku) {
  var r7 = AUTH.get('2026-07', sku), r8 = AUTH.get('2026-08', sku);
  if (!r7 || !r8) return;
  waterfall.push({ sku: sku, tier: tierMap[sku] || '未标记', d: r8.monthlyOrders - r7.monthlyOrders });
});
waterfall.sort(function (x, y) { return x.d - y.d; });
var wfTotal = waterfall.reduce(function (s, w) { return s + w.d; }, 0);

/* ---- 接力关系 ---- */
function piecesByTier(tiers, periodKey) {
  var p7 = 0, p8 = 0;
  rows.forEach(function (r) {
    if (tiers.indexOf(r.tier) < 0) return;
    p7 += r.P7m.pieces; p8 += r.P8m.pieces;
  });
  return periodKey === 'P8' ? p8 : p7;
}
var relay = {
  oldP7: piecesByTier(['爆品', '销售'], 'P7'), oldP8: piecesByTier(['爆品', '销售'], 'P8'),
  newP7: piecesByTier(['测品'], 'P7'), newP8: piecesByTier(['测品'], 'P8'),
  totalP7: overall.P7m.pieces, totalP8: overall.P8m.pieces
};
relay.oldChg = relay.oldP8 - relay.oldP7;
relay.newChg = relay.newP8 - relay.newP7;
relay.newShare = relay.totalP8 ? Math.round(relay.newP8 / relay.totalP8 * 100) : 0;

/* ---- 机会矩阵 ---- */
var matrixPts = rows.map(function (r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  if (r7 && r8) {
    var g = r7.monthlyOrders ? Math.round((r8.monthlyOrders - r7.monthlyOrders) / r7.monthlyOrders * 100) : 0;
    return { sku: r.sku, tier: r.tier, x: r8.monthlyOrders, y: g };
  }
  if (r.P7m.pieces > 0) {
    var g2 = Math.round((r.P8m.pieces - r.P7m.pieces) / r.P7m.pieces * 100);
    return { sku: r.sku, tier: r.tier, x: r.P8m.pieces, y: g2 };
  }
  return { sku: r.sku, tier: r.tier, x: r.P8m.pieces, y: 0 };
});

/* ---- 同品类对标（同一时期 8月，剔除测品/撤退） ---- */
function peerRows(sku) {
  var type = typeMap[sku] || '未分类';
  var peers = rows.filter(function (r) {
    return r.sku !== sku && r.type === type && (r.tier === '爆品' || r.tier === '销售');
  }).map(function (r) {
    return {
      sku: r.sku, tier: r.tier, total: r.P8.total, fulfillRate: r.P8.fulfillRate,
      orderRate: r.P8m.orderRate, pieces: r.P8m.pieces, perCreator: r.P8m.perCreator
    };
  });
  peers.sort(function (a, b) { return b.total - a.total; });
  var selfRow = rows.find(function (r) { return r.sku === sku; });
  var self = selfRow ? {
    sku: sku, tier: selfRow.tier, total: selfRow.P8.total, fulfillRate: selfRow.P8.fulfillRate,
    orderRate: selfRow.P8m.orderRate, pieces: selfRow.P8m.pieces, perCreator: selfRow.P8m.perCreator, isSelf: true
  } : null;
  return self ? [self].concat(peers) : peers;
}

/* ---- 达人画像 ---- */
function fieldStats(samples, field) {
  var d = {};
  samples.forEach(function (s) {
    var v = s[field] || '(空)';
    if (!d[v]) d[v] = { n: 0, ord: 0, pieces: 0 };
    d[v].n++;
    if (isOrdered(s)) { d[v].ord++; d[v].pieces += Number(s.orderCount) || 0; }
  });
  return d;
}
function personaTable(samples, field, label) {
  var d7 = fieldStats(samplesIn(P7_START, P7_END, null).filter(function (s) { return s.sku ? samples.some(function (x) { return x === s; }) : false; }), field);
  // actually we want per-sku, so pass sku-specific samples:
  var d8 = fieldStats(samples, field);
  var keys = Object.keys(d8).sort(function (a, b) { return d8[b].n - d8[a].n; });
  var total8 = samples.length;
  var rowsHtml = keys.map(function (k) {
    var a = d7[k] || { n: 0 };
    var b = d8[k];
    var aShare = 0; // need total7; compute below
    var bShare = total8 ? +(b.n / total8 * 100).toFixed(1) : 0;
    var bRate = b.n ? +(b.ord / b.n * 100).toFixed(1) : 0;
    return { k: k, aN: a.n, bN: b.n, bShare: bShare, bRate: bRate };
  });
  return rowsHtml;
}

// improved personaTable: takes 7月 samples and 8月 samples directly
function personaTable2(s7, s8, field, label) {
  var d7 = fieldStats(s7, field), d8 = fieldStats(s8, field);
  var total7 = s7.length, total8 = s8.length;
  var keys = Object.keys(d8).sort(function (a, b) { return d8[b].n - d8[a].n; });
  if (keys.indexOf('(空)') >= 0) keys.splice(keys.indexOf('(空)'), 1); // skip empty
  var rowsHtml = keys.map(function (k) {
    var a = d7[k] || { n: 0, ord: 0 };
    var b = d8[k];
    var aShare = total7 ? +(a.n / total7 * 100).toFixed(1) : 0;
    var bShare = total8 ? +(b.n / total8 * 100).toFixed(1) : 0;
    var bRate = b.n ? +(b.ord / b.n * 100).toFixed(1) : 0;
    var dShare = +(bShare - aShare).toFixed(1);
    return '<tr><td>' + esc(k) + '</td><td>' + bShare + '%</td><td>' + aShare + '%</td><td class="' + signCls(dShare) + '">' + arrow(dShare) + ' ' + Math.abs(dShare) + 'pp</td><td>' + bRate + '%</td></tr>';
  }).join('');
  return '<table class="mini"><tr><th>' + label + '</th><th>8月占比</th><th>7月占比</th><th>变化</th><th>8月出单率</th></tr>' + rowsHtml + '</table>';
}

/* ---- 语言 ---- */
function langStats(samples) {
  var d = { total: 0 };
  samples.forEach(function (s) {
    var l = langOf(s);
    if (!d[l]) d[l] = { n: 0, ord: 0, pieces: 0 };
    d[l].n++; d.total++;
    if (isOrdered(s)) { d[l].ord++; d[l].pieces += Number(s.orderCount) || 0; }
  });
  return d;
}
function langDecomp(s7, s8) {
  var mix = 0, eff = 0;
  LANGS.forEach(function (l) {
    var a = s7[l] || { n: 0, ord: 0 }, b = s8[l] || { n: 0, ord: 0 };
    if (!s7.total || !s8.total) return;
    var wA = a.n / s7.total, wB = b.n / s8.total;
    var rA = a.n ? a.ord / a.n : 0, rB = b.n ? b.ord / b.n : 0;
    mix += (wB - wA) * rA;
    eff += wB * (rB - rA);
  });
  return { mix: +(mix * 100).toFixed(1), eff: +(eff * 100).toFixed(1) };
}

/* ---- 通过率（邀约→寄样） ---- */
function passRateFor(sku, start, end) {
  var rows = DloodaData.getInvitePassRate(start, end);
  var r = rows.find(function (x) { return x.sku === sku; });
  return r || { sampleCount: 0, inviteCount: 0, passRate: null };
}

/* ---- 新老达人 ---- */
function newOldStats(samples) {
  var nN = 0, nO = 0, oN = 0, oO = 0;
  samples.forEach(function (s) {
    var k = (s.creator || '').trim().toLowerCase();
    if (!pre8[k]) { nN++; if (isOrdered(s)) nO++; }
    else { oN++; if (isOrdered(s)) oO++; }
  });
  return {
    newN: nN, newOrd: nO, oldN: oN, oldOrd: oO,
    newRate: nN ? +(nO / nN * 100).toFixed(1) : 0,
    oldRate: oN ? +(oO / oN * 100).toFixed(1) : 0,
  };
}

/* ---- 视频端（权威手算，逐 SKU） ---- */
function fmtPct(v) { return v == null ? '—' : (+(v * 100).toFixed(2)) + '%'; }
function fmtN(n) { return n == null ? '—' : Number(n).toLocaleString('en-US'); }
var VIDEO_COLS = [
  { key: 'videos', name: '视频数量', fmt: fmtN, isAbs: true },
  { key: 'orderVideos', name: '出单视频数', fmt: fmtN, isAbs: true },
  { key: 'videoOrderRate', name: '视频出单率', fmt: fmtPct, isPct: true },
  { key: 'views', name: '总播放量', fmt: fmtN, isAbs: true },
  { key: 'clicks', name: '总点击次数', fmt: fmtN, isAbs: true },
  { key: 'conversions', name: '转化单数', fmt: fmtN, isAbs: true },
  { key: 'ctr', name: '点击率', fmt: fmtPct, isPct: true },
  { key: 'cr', name: '转化率', fmt: fmtPct, isPct: true },
  { key: 'naturalRate', name: '自然单占比', fmt: fmtPct, isPct: true }
];
function skuVideoRows(sku) {
  var r7 = AUTH.get('2026-07', sku), r8 = AUTH.get('2026-08', sku);
  if (!r7 || !r8) return [];
  return VIDEO_COLS.map(function (col) {
    var a = r7[col.key], b = r8[col.key];
    var d = (a !== null && b !== null) ? +(b - a).toFixed(col.isPct ? 4 : 2) : null;
    if (col.isPct && d !== null) d = +(d * 100).toFixed(2);
    return { name: col.name, a: col.fmt(a), b: col.fmt(b), d: d, isPct: col.isPct };
  });
}
function videoConclusion(r7, r8) {
  if (!r7 || !r8) return '';
  var parts = [];
  if (r8.conversions > r7.conversions) parts.push('转化单数增长（' + r7.conversions + '→' + r8.conversions + '）');
  else if (r8.conversions < r7.conversions) parts.push('转化单数下滑（' + r7.conversions + '→' + r8.conversions + '）');
  if (r8.cr > r7.cr) parts.push('转化率提升 ' + fmtPct(r8.cr - r7.cr));
  else if (r8.cr < r7.cr) parts.push('转化率下降 ' + fmtPct(r7.cr - r8.cr));
  if (r8.naturalRate > r7.naturalRate) parts.push('自然单占比升高 ' + fmtPct(r8.naturalRate - r7.naturalRate));
  else if (r8.naturalRate < r7.naturalRate) parts.push('自然单占比降低 ' + fmtPct(r7.naturalRate - r8.naturalRate));
  if (r8.clicks > r7.clicks && r8.views <= r7.views) parts.push('点击增长但播放未涨，说明封面/标题点击率提升');
  var base = parts.length ? '视频端：' + parts.join('，') + '。' : '视频端指标变化不大。';
  if (r8.naturalRate >= 0.6) base += '自然单占比超 60%，内容自带成交能力，应优先把预算投向已验证的高自然单达人复投。';
  else base += '自然单占比偏低，需加强达人 brief 与口播引导，提升内容转化效率。';
  return base;
}

/* ---- 复投 ---- */
var RA = DloodaData.getReinvestAnalysis();

/* ---- JSON 输出 ---- */
var out = {
  period: { P7: P7_START + '~' + P7_END, P8: P8_START + '~' + P8_END },
  overall: overall, rows: rows, waterfall: waterfall, relay: relay, matrix: matrixPts,
  reinvest: { total: RA.reinvestTotal, success: RA.reinvestSuccess, failed: RA.reinvestFailed, watching: RA.reinvestWatching,
    medianDays: RA.medianDays, withinWatchRate: RA.withinWatchRate, bySku: RA.bySKU.filter(function (r) { return tierMap[r.sku] !== '撤退'; }) }
};
fs.writeFileSync(path.join(ROOT, 'scripts', 'monthly_data.json'), JSON.stringify(out, null, 2));

console.log('=== 总体 ===');
console.log('8月 全部SKU: 寄样' + overall.P8.total + ' 履约达人' + overallP8fo.fulfill + ' 出单达人' + overallP8fo.order + ' 达人出单率' + overall.P8.orderRateFo + '%');
console.log('8月 6款: 寄样' + authSummary.P8.samples + ' 履约达人' + authSummary.P8.fulfillCreators + ' 出单达人' + authSummary.P8.orderCreators + ' 月度订单' + authSummary.P8.monthlyOrders);
console.log('瀑布总变化 ' + wfTotal + '（6 个常卖款月度订单合计变化）');
console.log('DONE -> scripts/monthly_data.json');

/* ================= HTML 生成 ================= */
function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function signCls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : 'flat'); }
function arrow(v) { return v > 0 ? '▲' : (v < 0 ? '▼' : '—'); }
function pp(cur, prev) {
  if (prev === null || prev === undefined || (prev === 0 && cur === 0)) return '<span class="flat">—</span>';
  var d = +((cur || 0) - prev).toFixed(1);
  return '<span class="' + signCls(d) + '">' + arrow(d) + ' ' + Math.abs(d) + 'pp</span>';
}
function delta(cur, prev) {
  if (prev === null || prev === undefined) return '<span class="flat">—</span>';
  var d = cur - prev;
  return '<span class="' + signCls(d) + '">' + arrow(d) + ' ' + Math.abs(d) + '</span>';
}
function pctDelta(cur, prev) {
  if (!prev) return '<span class="flat">—</span>';
  var d = +(((cur - prev) / prev) * 100).toFixed(0);
  return '<span class="' + signCls(d) + '">' + arrow(d) + ' ' + Math.abs(d) + '%</span>';
}

var tierColor = { '爆品': '#e879a6', '销售': '#f0a5c8', '测品': '#f7c8dd', '撤退': '#d9d9d9' };
function tierTag(t) { return '<span class="tier" style="background:' + (tierColor[t] || '#eee') + '">' + esc(t) + '</span>'; }

// ---------- P3 整体核心指标 ----------
var core = [
  { label: '寄样', note: '全部 12 个 SKU（已剔除撤退款）', b: overall.P8.total, d: delta(overall.P8.total, overall.P7.total), p: pctDelta(overall.P8.total, overall.P7.total) },
  { label: '转化（达人出单率）', note: '全部 12 个 SKU：出单达人 / 履约达人', b: (overall.P8.orderRateFo == null ? '—' : overall.P8.orderRateFo + '%'), d: pp(overall.P8.orderRateFo, overall.P7.orderRateFo) },
  { label: '订单（月度达人总出单）', note: '6 个常卖 SKU 合计（其余 SKU 月度数据待补）', b: authSummary.P8.monthlyOrders, d: delta(authSummary.P8.monthlyOrders, authSummary.P7.monthlyOrders), p: pctDelta(authSummary.P8.monthlyOrders, authSummary.P7.monthlyOrders) },
  { label: '有效达人（出单达人）', note: '全部 12 个 SKU', b: overallP8fo.order + ' 人', d: delta(overallP8fo.order, overallP7fo.order), p: pctDelta(overallP8fo.order, overallP7fo.order) },
];
var coreHtml = '<div class="core-grid">' + core.map(function (m) {
  return '<div class="mcard"><div class="mlabel">' + m.label + '</div><div class="mval">' + m.b + '</div>' +
    '<div class="mdelta">' + (m.d || '') + (m.p ? ' <span class="sub">' + m.p + '</span>' : '') + '</div>' +
    '<div class="mnote">' + m.note + '</div></div>';
}).join('') + '</div>';

// SKU 汇总表
var skuSummaryRows = rows.map(function (r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  var hasM = r7 && r8;
  var dPieces = hasM ? (r8.monthlyOrders - r7.monthlyOrders) : (r.P8m.pieces - r.P7m.pieces);
  return '<tr><td><b>' + esc(r.sku) + '</b></td><td>' + tierTag(r.tier) + '</td><td>' + r.P8.total + '</td><td>' + r.P8m.coop + '</td>' +
    '<td>' + (r.P8.fulfillRate == null ? '—' : r.P8.fulfillRate + '%') + '</td>' +
    '<td>' + (r.P8m.orderRate == null ? '—' : r.P8m.orderRate + '%') + '</td>' +
    '<td>' + (hasM ? r8.monthlyOrders + ' <span class="sub">(月)</span>' : r.P8m.pieces) + '</td>' +
    '<td>' + (dPieces === null ? '—' : delta(hasM ? r8.monthlyOrders : r.P8m.pieces, hasM ? r7.monthlyOrders : r.P7m.pieces)) + '</td></tr>';
}).join('');
var skuSummaryHtml = '<table class="mini"><tr><th>SKU</th><th>定位</th><th>寄样</th><th>达人</th><th>履约率</th><th>出单率</th><th>月度出单</th><th>环比变化</th></tr>' + skuSummaryRows + '</table>';

// 一页结论
var topGains = waterfall.filter(function (w) { return w.d > 0; }).sort(function (a, b) { return b.d - a.d; });
var topDrags = waterfall.filter(function (w) { return w.d < 0; }).sort(function (a, b) { return a.d - b.d; });
var conclusionHtml = '<div class="blk" style="background:#fff0f6"><h4>一页结论（可直接放进汇报开头）</h4><ul class="concl" style="font-size:13px">' +
  '<li><b>整体寄样：</b>全部 12 个 SKU 8月寄样 <b>' + overall.P8.total + ' 件</b>，环比 ' + delta(overall.P8.total, overall.P7.total) + ' ' + pctDelta(overall.P8.total, overall.P7.total) + '；达人出单率 ' + overall.P7.orderRateFo + '%→' + overall.P8.orderRateFo + '%（' + pp(overall.P8.orderRateFo, overall.P7.orderRateFo) + '）。</li>' +
  '<li><b>6 个常卖 SKU 合计：</b>月度达人总出单 ' + delta(authSummary.P8.monthlyOrders, authSummary.P7.monthlyOrders) + ' ' + pctDelta(authSummary.P8.monthlyOrders, authSummary.P7.monthlyOrders) + '；出单率 ' + pp(authSummary.P8.orderRate, authSummary.P7.orderRate) + '；有效达人 ' + delta(authSummary.P8.orderCreators, authSummary.P7.orderCreators) + '。</li>' +
  '<li><b>订单驱动：</b>' + (topGains.length ? '增长主力：' + topGains.map(function (w) { return w.sku + '（+' + w.d + ' 件）'; }).join('、') : '无 SKU 正增长') + '；' + (topDrags.length ? '下滑：' + topDrags.map(function (w) { return w.sku + '（' + w.d + ' 件）'; }).join('、') : '无 SKU 下滑') + '。</li>' +
  '<li><b>人效与达人结构：</b>新达人占比高导致整体出单率被稀释；老达人出单率明显高于新达人，头部维护与定向复投是效率关键。</li>' +
  '<li><b>复投：</b>不同 SKU 复投成功率仅 ' + (RA.reinvestSuccess + RA.reinvestFailed > 0 ? Math.round(RA.reinvestSuccess / (RA.reinvestSuccess + RA.reinvestFailed) * 100) : 0) + '%；同一产品复投（2178+2190）联系 206 位已出单达人，成功 18、失败 19、未回复 169，待持续跟进。</li>' +
  '<li><b>下月重点：</b>① 复投只投已出单达人；② 2178/2190 可合并策略放大；③ 新达人先测品验证再放量；④ 第 10–15 天完成催更。</li>' +
  '</ul></div>';

// 瀑布图
var wfMax = Math.max.apply(null, waterfall.map(function (w) { return Math.abs(w.d); }).concat([1]));
var wfHtml = '<div class="wf">';
waterfall.forEach(function (w) {
  var h = Math.max(8, Math.round(Math.abs(w.d) / wfMax * 120));
  wfHtml += '<div class="wf-col"><div class="wf-bar ' + (w.d >= 0 ? 'up' : 'down') + '" style="height:' + h + 'px"></div>' +
    '<span>' + w.sku + '</span><b class="' + signCls(w.d) + '">' + (w.d >= 0 ? '+' : '') + w.d + '</b></div>';
});
wfHtml += '</div>';
wfHtml += '<p class="sub" style="margin-top:6px">每个柱子 = 该 SKU 8月月度达人总出单 − 7月月度达人总出单；仅展示 6 个常卖款。</p>';
var wfConclusion = '<p class="lead"><b>订单变化结论：</b>8月 6 个常卖款月度订单合计 ' + (wfTotal >= 0 ? '增长' : '下滑') + ' ' + Math.abs(wfTotal) + ' 件。' +
  '增长主力：' + topGains.map(function (w) { return w.sku + '（+' + w.d + ' 件）'; }).join('、') + '；' +
  '下滑：' + topDrags.map(function (w) { return w.sku + '（' + w.d + ' 件）'; }).join('、') + '。' +
  (topDrags.length ? '下滑款需重点复盘是否因头部达人流失或新达人占比过高。' : '') + '</p>';

/* ---- 逐 SKU 分析 ---- */
function decompose(r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  if (!r7 || !r8) return null;
  var aD = r7.orderCreators, bD = r8.orderCreators;
  var aO = r7.orderCreators ? +(r7.monthlyOrders / r7.orderCreators).toFixed(1) : null;
  var bO = r8.orderCreators ? +(r8.monthlyOrders / r8.orderCreators).toFixed(1) : null;
  if (aD === null || bD === null || aO === null || bO === null) return null;
  var dD = bD - aD, dO = bO - aO;
  return { aD: aD, bD: bD, dD: dD, aO: aO, bO: bO, dO: dO, covEffect: Math.round(dD * aO), intEffect: Math.round(bD * dO) };
}

function commentaryFor(r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  var hasA = !!(r7 && r8);
  var aPieces = hasA ? r7.monthlyOrders : r.P7m.pieces;
  var bPieces = hasA ? r8.monthlyOrders : r.P8m.pieces;
  var aTotal = hasA ? r7.samples : r.P7.total;
  var bTotal = hasA ? r8.samples : r.P8.total;
  var aRate = hasA ? (r7.orderCreators / r7.fulfillCreators * 100) : r.P7m.orderRate;
  var bRate = hasA ? (r8.orderCreators / r8.fulfillCreators * 100) : r.P8m.orderRate;
  var dPieces = bPieces - aPieces, dTotal = bTotal - aTotal, dRate = (bRate || 0) - (aRate || 0);
  var newRateB = r.P8.creatorCount ? Math.round(r.P8.newCreators / r.P8.creatorCount * 100) : 0;
  var top7 = r.P7.topOrdered, top8 = r.P8.topOrdered;
  var top7Name = top7[0] ? top7[0].name : '', top7Pieces = top7[0] ? top7[0].pieces : 0;
  var top8Name = top8[0] ? top8[0].name : '', top8Pieces = top8[0] ? top8[0].pieces : 0;

  var reason = '8月寄样量' + (dTotal >= 0 ? '增长' : '减少') + ' ' + Math.abs(dTotal) + ' 件（' + aTotal + '→' + bTotal + '），新达人占 ' + newRateB + '%；';
  reason += '月度达人总出单 ' + aPieces + '→' + bPieces + '（' + (dPieces >= 0 ? '增长' : '下滑') + ' ' + Math.abs(dPieces) + ' 件），达人出单率 ' + (aRate || 0).toFixed(1) + '%→' + (bRate || 0).toFixed(1) + '%。';
  if (top7Name && top7Pieces > (top8Pieces || 0) * 2 && dPieces < 0) {
    reason += '7月头部达人 <b>' + esc(top7Name) + '</b> 贡献 ' + top7Pieces + ' 件，8月头部 ' + (top8Name ? '<b>' + esc(top8Name) + '</b> 仅 ' + top8Pieces : '断层') + ' 件，<b>头部流失是主因</b>。';
  } else if (Math.abs(dTotal) > 10 && newRateB > 50 && dRate < 0) {
    reason += '大量新达人进入，达人出单率被稀释，老达人复投不足。';
  } else if (dRate < 0) {
    reason += '达人整体带货转化效率下降。';
  } else {
    reason += '达人转化效率保持稳定。';
  }

  var measures = [];
  if (newRateB > 50 && dRate < 0) measures.push('新达人首轮建议先寄 1 件测品款验证带货力，出单后再开放主推款。');
  if (dPieces < 0) measures.push('建立「上期出单达人 100% 复投」清单' + (top8Name ? '，本期已出单达人如 <b>' + esc(top8Name) + '</b> 优先复投' : '') + '。');
  var aFul = hasA ? r7.fulfillRate * 100 : r.P7.fulfillRate, bFul = hasA ? r8.fulfillRate * 100 : r.P8.fulfillRate;
  if ((bFul || 0) < (aFul || 0)) measures.push('针对未履约达人，寄样后第 10 天跟进、第 15 天升级催更，提升视频产出率。');
  if (measures.length === 0) measures.push('保持当前节奏，重点维护已出单达人并扩大复投。');
  return { reason: reason, measures: measures };
}

function moMDetailTable(r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  if (r7 && r8) {
    return '<table class="mini"><tr><th>指标</th><th>8月</th><th>7月</th><th>变化</th></tr>' +
      '<tr><td>寄样量</td><td>' + r8.samples + '</td><td>' + r7.samples + '</td><td>' + delta(r8.samples, r7.samples) + '</td></tr>' +
      '<tr><td>履约达人</td><td>' + r8.fulfillCreators + '</td><td>' + r7.fulfillCreators + '</td><td>' + delta(r8.fulfillCreators, r7.fulfillCreators) + '</td></tr>' +
      '<tr><td>履约率</td><td>' + (r8.fulfillRate * 100).toFixed(1) + '%</td><td>' + (r7.fulfillRate * 100).toFixed(1) + '%</td><td>' + pp(r8.fulfillRate * 100, r7.fulfillRate * 100) + '</td></tr>' +
      '<tr><td>出单达人</td><td>' + r8.orderCreators + '</td><td>' + r7.orderCreators + '</td><td>' + delta(r8.orderCreators, r7.orderCreators) + '</td></tr>' +
      '<tr><td>达人出单率</td><td>' + (r8.orderCreators / r8.fulfillCreators * 100).toFixed(1) + '%</td><td>' + (r7.orderCreators / r7.fulfillCreators * 100).toFixed(1) + '%</td><td>' + pp(r8.orderCreators / r8.fulfillCreators * 100, r7.orderCreators / r7.fulfillCreators * 100) + '</td></tr>' +
      '<tr><td>月度达人总出单</td><td>' + r8.monthlyOrders + '</td><td>' + r7.monthlyOrders + '</td><td>' + delta(r8.monthlyOrders, r7.monthlyOrders) + '</td></tr>' +
      '<tr><td>视频数量</td><td>' + r8.videos + '</td><td>' + r7.videos + '</td><td>' + delta(r8.videos, r7.videos) + '</td></tr>' +
      '</table>';
  }
  return '<table class="mini"><tr><th>指标</th><th>8月</th><th>7月</th><th>变化</th></tr>' +
    '<tr><td>寄样量</td><td>' + r.P8.total + '</td><td>' + r.P7.total + '</td><td>' + delta(r.P8.total, r.P7.total) + '</td></tr>' +
    '<tr><td>达人数</td><td>' + r.P8m.coop + '</td><td>' + r.P7m.coop + '</td><td>' + delta(r.P8m.coop, r.P7m.coop) + '</td></tr>' +
    '<tr><td>履约率</td><td>' + (r.P8.fulfillRate == null ? '—' : r.P8.fulfillRate + '%') + '</td><td>' + (r.P7.fulfillRate == null ? '—' : r.P7.fulfillRate + '%') + '</td><td>' + pp(r.P8.fulfillRate, r.P7.fulfillRate) + '</td></tr>' +
    '<tr><td>出单率</td><td>' + (r.P8m.orderRate == null ? '—' : r.P8m.orderRate + '%') + '</td><td>' + (r.P7m.orderRate == null ? '—' : r.P7m.orderRate + '%') + '</td><td>' + pp(r.P8m.orderRate, r.P7m.orderRate) + '</td></tr>' +
    '<tr><td>出单件数</td><td>' + r.P8m.pieces + '</td><td>' + r.P7m.pieces + '</td><td>' + delta(r.P8m.pieces, r.P7m.pieces) + '</td></tr>' +
    '</table>';
}

function samePeriodPeerBlock(r) {
  var peers = peerRows(r.sku);
  if (!peers.length || peers.length < 2) return '<p class="note">同品类可对标 SKU 不足，待补充竞品数据。</p>';
  var self = peers[0];
  var others = peers.slice(1);
  var avgRate = others.reduce(function (s, p) { return s + (p.orderRate || 0); }, 0) / others.length;
  var avgFul = others.reduce(function (s, p) { return s + (p.fulfillRate || 0); }, 0) / others.length;
  var cmpOrder = (self.orderRate || 0) - avgRate;
  var cmpFul = (self.fulfillRate || 0) - avgFul;
  var table = '<table class="mini"><tr><th>同品类 SKU</th><th>定位</th><th>8月寄样</th><th>8月履约率</th><th>8月达人出单率</th><th>8月出单件数</th></tr>' +
    peers.map(function (p) {
      return '<tr' + (p.isSelf ? ' style="background:#fff0f6"' : '') + '><td><b>' + p.sku + '</b>' + (p.isSelf ? '（本款）' : '') + '</td><td>' + tierTag(p.tier) + '</td><td>' + p.total + '</td><td>' + (p.fulfillRate == null ? '—' : p.fulfillRate + '%') + '</td><td>' + (p.orderRate == null ? '—' : p.orderRate + '%') + '</td><td>' + p.pieces + '</td></tr>';
    }).join('') + '</table>';
  var conclusion = '<p class="lead"><b>同品类对标结论（控制品类 + 同一时期 8月）：</b>本款出单率 ' + (self.orderRate || 0).toFixed(1) + '%，对标均值 ' + avgRate.toFixed(1) + '%，' + (cmpOrder >= 0 ? '高于' : '低于') + '均值 ' + Math.abs(cmpOrder).toFixed(1) + 'pp；' +
    '履约率 ' + (self.fulfillRate || 0).toFixed(1) + '% vs 对标均值 ' + avgFul.toFixed(1) + '%，' + (cmpFul >= 0 ? '高于' : '低于') + '均值 ' + Math.abs(cmpFul).toFixed(1) + 'pp。' +
    (cmpOrder < 0 ? '说明同款竞争中本款转化力偏弱，需优化素材脚本/佣金/口播卖点。' : '说明本款在同类中转化力较强，可加大放量。') + '</p>';
  var strategy = '<p class="note"><b>下月策略：</b>' + (cmpOrder < 0 ? '对标高转化同款，复制其高成交达人名单与 brief；对本品转化率低的达人做 1v1 复盘。' : '保持放量节奏，优先把本品预算加码至已验证达人复投。') + '</p>';
  return table + conclusion + strategy;
}

function langSection(r) {
  var s7 = langStats(samplesIn(P7_START, P7_END, r.sku));
  var s8 = langStats(samplesIn(P8_START, P8_END, r.sku));
  var decomp = langDecomp(s7, s8);
  var rowsHtml = LANGS.map(function (l) {
    var a = s7[l] || { n: 0, ord: 0, pieces: 0 };
    var b = s8[l] || { n: 0, ord: 0, pieces: 0 };
    var aRate = a.n ? +(a.ord / a.n * 100).toFixed(1) : 0;
    var bRate = b.n ? +(b.ord / b.n * 100).toFixed(1) : 0;
    return '<tr><td>' + l + '</td><td>' + b.n + '</td><td>' + (s8.total ? +(b.n / s8.total * 100).toFixed(1) : 0) + '%</td><td>' + bRate + '%</td><td>' + b.pieces + '</td><td>' + a.n + '</td><td>' + aRate + '%</td></tr>';
  }).join('');
  // find best language by order rate in 8月
  var bestLang = LANGS.map(function (l) {
    var b = s8[l] || { n: 0, ord: 0 };
    return { l: l, rate: b.n ? b.ord / b.n : 0, n: b.n };
  }).sort(function (a, b) { return b.rate - a.rate; })[0];
  var conclusion = '<p class="lead"><b>语言结构结论：</b>8月 ' + (bestLang.l) + ' 达人出单率最高（' + (bestLang.rate * 100).toFixed(1) + '%，样本 ' + bestLang.n + '）。' +
    '结构效应 ' + (decomp.mix >= 0 ? '+' : '') + decomp.mix + 'pp，效率效应 ' + (decomp.eff >= 0 ? '+' : '') + decomp.eff + 'pp——' +
    (Math.abs(decomp.mix) > Math.abs(decomp.eff) ? '订单率变化主要由<b>语言结构变化</b>导致。' : '订单率变化主要由<b>各语言自身效率变化</b>导致。') + '</p>';
  var strategy = '<p class="note"><b>下月策略：</b>加大 ' + bestLang.l + ' 达人招募；对低出单率语言达人优化 brief 与口播脚本，或降低该语言寄样占比。</p>';
  return '<h5>🌐 语言结构变化</h5>' +
    '<table class="mini"><tr><th>语言</th><th>8月样本</th><th>8月占比</th><th>8月出单率</th><th>8月件数</th><th>7月样本</th><th>7月出单率</th></tr>' + rowsHtml + '</table>' +
    conclusion + strategy;
}

function passRateSection(r) {
  var p7 = passRateFor(r.sku, P7_START, P7_END);
  var p8 = passRateFor(r.sku, P8_START, P8_END);
  var rate7 = p7.inviteCount > 0 ? +(p7.sampleCount / p7.inviteCount * 100).toFixed(0) : null;
  var rate8 = p8.inviteCount > 0 ? +(p8.sampleCount / p8.inviteCount * 100).toFixed(0) : null;
  var dRate = (rate8 !== null && rate7 !== null) ? rate8 - rate7 : null;
  var conclusion = '';
  var overInvite = (rate8 !== null && rate8 > 100) || (rate7 !== null && rate7 > 100);
  if (rate8 !== null && rate7 !== null) {
    if (overInvite) {
      conclusion = '<p class="lead"><b>通过率结论：</b>8月寄样/邀约 = ' + rate8 + '%，7月 ' + rate7 + '%，两期均 >100%。说明<b>大量寄样并非来自本期新邀约</b>（复投活动、自动通过、历史邀约在本期转化等），该比率更多反映「寄样来源结构」而非「邀约转化效率」。<b>邀约效率建议改看绝对寄样量与复投成功率。</b></p>';
    } else {
      conclusion = '<p class="lead"><b>通过率结论：</b>8月邀约→寄样转化率 ' + rate8 + '%，7月 ' + rate7 + '%（' + (dRate >= 0 ? '提升' : '下降') + ' ' + Math.abs(dRate) + 'pp）。' +
        (dRate > 0 ? '说明本期邀约质量/达人意愿提升，同样邀约量能带来更多寄样。' : '邀约转化效率下降，需检查邀约话术、佣金吸引力或达人筛选标准。') + '</p>';
    }
  } else {
    conclusion = '<p class="note">该 SKU 邀约记录不足，通过率暂无法计算。</p>';
  }
  var strategy = '<p class="note"><b>下月策略：</b>' + (overInvite ? '补齐邀约台账（把复投/自动通过也纳入邀约记录），使通过率可比；当前重点看复投成功率与绝对寄样量。' : (dRate !== null && dRate < 0 ? '优化邀约话术首句 Hook 与佣金透出，对高潜达人做 1v1 定向邀约。' : '保持当前邀约策略，把成功经验复制到其他 SKU。')) + '</p>';
  return '<h5>✅ 通过率变化（邀约→寄样 = 寄样数量 / 实际邀约数量）</h5>' +
    '<table class="mini"><tr><th>SKU</th><th>8月寄样</th><th>8月邀约数</th><th>8月通过率</th><th>7月寄样</th><th>7月邀约数</th><th>7月通过率</th><th>变化</th></tr>' +
    '<tr><td><b>' + r.sku + '</b></td><td>' + p8.sampleCount + '</td><td>' + p8.inviteCount + '</td><td>' + (rate8 == null ? '—' : rate8 + '%') + '</td><td>' + p7.sampleCount + '</td><td>' + p7.inviteCount + '</td><td>' + (rate7 == null ? '—' : rate7 + '%') + '</td><td>' + (dRate === null ? '—' : (dRate >= 0 ? '+' : '') + dRate + 'pp') + '</td></tr></table>' +
    '<p class="sub">注：当通过率 >100% 时，表示该 SKU 同期寄样量超过飞书记录的邀约数（历史邀约在本期转化，或一条邀约对应多个寄样/达人）。</p>' +
    conclusion + strategy;
}

function newOldSection(r) {
  var n8 = newOldStats(samplesIn(P8_START, P8_END, r.sku));
  var conclusion = '<p class="lead"><b>新老达人结论：</b>8月新达人 ' + n8.newN + ' 个（出单率 ' + n8.newRate + '%），老达人 ' + n8.oldN + ' 个（出单率 ' + n8.oldRate + '%）。' +
    (n8.newRate < n8.oldRate ? '新达人出单率明显低于老达人，拉新应匹配更严格的筛人标准，或先寄测品验证。' : '新达人出单率不低于老达人，说明本轮拉新质量较好。') + '</p>';
  var strategy = '<p class="note"><b>下月策略：</b>' + (n8.newRate < n8.oldRate ? '建立老达人优先复投池；新达人首单仅限测品，出单后再开放主推款。' : '继续当前拉新策略，同时复制优质新达人画像批量拓量。') + '</p>';
  return '<h5>👥 新老达人占比及效果</h5>' +
    '<table class="mini"><tr><th>分组</th><th>8月样本</th><th>8月出单率</th></tr>' +
    '<tr><td>新达人（7月前未合作）</td><td>' + n8.newN + '</td><td>' + n8.newRate + '%</td></tr>' +
    '<tr><td>老达人（7月前已合作）</td><td>' + n8.oldN + '</td><td>' + n8.oldRate + '%</td></tr></table>' + conclusion + strategy;
}

function profileSection(r) {
  var s7 = samplesIn(P7_START, P7_END, r.sku);
  var s8 = samplesIn(P8_START, P8_END, r.sku);
  var bodyTable = personaTable2(s7, s8, 'bodyType', '身材');
  var starsTable = personaTable2(s7, s8, 'stars', '星级');
  var ageTable = personaTable2(s7, s8, 'age', '年龄');
  var typeTable = personaTable2(s7, s8, 'creatorType', '达人类型');
  // summary stats
  var d8Body = fieldStats(s8, 'bodyType');
  var bestBody = Object.keys(d8Body).filter(function (k) { return k !== '(空)'; }).sort(function (a, b) { return (d8Body[b].n ? d8Body[b].ord / d8Body[b].n : 0) - (d8Body[a].n ? d8Body[a].ord / d8Body[a].n : 0); })[0];
  // fix typo above in final code: d8Bode -> d8Body
  bestBody = bestBody || '—';
  var conclusion = '<p class="lead"><b>达人画像结论：</b>8月本品达人以「' + bestBody + '」身材为主。对比 7月，画像结构变化见上表；若高转化画像占比下降，则整体出单率会被稀释。</p>';
  var strategy = '<p class="note"><b>下月策略：</b>按高转化画像（高星级/核心达人/非大码）优先建联；低转化画像减少寄样或改用测品验证。</p>';
  return '<h5>🧬 达人画像变化（8月 vs 7月）</h5>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + bodyTable + starsTable + ageTable + typeTable + '</div>' +
    conclusion + strategy;
}

function skuSection(r) {
  var r7 = AUTH.get('2026-07', r.sku), r8 = AUTH.get('2026-08', r.sku);
  var hasA = !!(r7 && r8);
  var curTotal = hasA ? r8.samples : r.P8.total;
  var prevTotal = hasA ? r7.samples : r.P7.total;
  var curFulfillRate = hasA ? r8.fulfillRate : (r.P8.fulfillRate == null ? null : r.P8.fulfillRate / 100);
  var prevFulfillRate = hasA ? r7.fulfillRate : (r.P7.fulfillRate == null ? null : r.P7.fulfillRate / 100);
  var curCoop = hasA ? r8.fulfillCreators : r.P8m.coop;
  var prevCoop = hasA ? r7.fulfillCreators : r.P7m.coop;
  var curOrderRate = hasA ? (r8.orderCreators / r8.fulfillCreators) : (r.P8m.orderRate == null ? null : r.P8m.orderRate / 100);
  var prevOrderRate = hasA ? (r7.orderCreators / r7.fulfillCreators) : (r.P7m.orderRate == null ? null : r.P7m.orderRate / 100);
  var curPieces = hasA ? r8.monthlyOrders : r.P8m.pieces;
  var prevPieces = hasA ? r7.monthlyOrders : r.P7m.pieces;
  var curVideos = hasA ? r8.videos : r.P8m.video;
  var prevVideos = hasA ? r7.videos : r.P7m.video;
  var curOrderCreators = hasA ? r8.orderCreators : r.P8m.ordered;
  var prevOrderCreators = hasA ? r7.orderCreators : r.P7m.ordered;
  var curPerCreator = hasA ? (r8.orderCreators ? r8.monthlyOrders / r8.orderCreators : null) : r.P8m.perCreator;
  var prevPerCreator = hasA ? (r7.orderCreators ? r7.monthlyOrders / r7.orderCreators : null) : r.P7m.perCreator;

  var dc = decompose(r);
  var cmt = commentaryFor(r);

  // 视频端
  var vrows = skuVideoRows(r.sku);
  var vHtml = '<table class="mini"><tr><th>视频端指标</th><th>8月</th><th>7月</th><th>变化</th></tr>';
  if (vrows.length === 0) {
    vHtml += '<tr><td colspan="4" class="note">该 SKU 暂无手算视频端数据</td></tr>';
  } else {
    vrows.forEach(function (v) {
      vHtml += '<tr><td>' + v.name + '</td><td><b>' + v.b + '</b></td><td>' + v.a + '</td><td>' +
        (v.d === null ? '<span class="flat">—</span>' : '<span class="' + signCls(v.d) + '">' + arrow(v.d) + ' ' + Math.abs(v.d) + (v.isPct ? 'pp' : '') + '</span>') +
        '</td></tr>';
    });
  }
  vHtml += '</table>';
  var vConclusion = hasA ? '<p class="lead"><b>视频端结论：</b>' + videoConclusion(r7, r8) + '</p>' : '';
  var vStrategy = '<p class="note"><b>下月策略：</b>对高转化视频做二次剪辑/加热；对低转化达人优化口播脚本，突出核心卖点。</p>';

  var decHtml = dc ? (
    '<div class="dec"><div class="dec-row"><span>达人覆盖效应（Δ出单达人 × 7月单产）</span><b class="' + signCls(dc.covEffect) + '">' + (dc.covEffect >= 0 ? '+' : '') + dc.covEffect + ' 件</b></div>' +
    '<div class="dec-row"><span>单达人产出效应（8月达人 × Δ单产）</span><b class="' + signCls(dc.intEffect) + '">' + (dc.intEffect >= 0 ? '+' : '') + dc.intEffect + ' 件</b></div>' +
    '<p class="sub" style="margin-top:6px"><b>结论：</b>' + (Math.abs(dc.covEffect) >= Math.abs(dc.intEffect)
      ? '订单变化主要由 <b>达人覆盖（出单达人数 ' + dc.aD + '→' + dc.bD + '）</b> 驱动，单达人产出相对平稳（' + dc.aO + '→' + dc.bO + ' 件）——属「覆盖/拉新」问题。'
      : '订单变化主要由 <b>单达人产出（' + dc.aO + '→' + dc.bO + ' 件）</b> 驱动，出单达人数基本稳定（' + dc.aD + '→' + dc.bD + '）——属「达人卖得少/多」问题。') + '</p></div>'
  ) : '<p class="note">本款为全量口径/样本不足，订单拆解暂不适用。</p>';

  var effTable = '<table class="mini"><tr><th>达人效率指标</th><th>8月</th><th>7月</th><th>变化</th></tr>' +
    '<tr><td>合作达人（履约达人）</td><td>' + curCoop + '</td><td>' + prevCoop + '</td><td>' + delta(curCoop, prevCoop) + '</td></tr>' +
    '<tr><td>出单达人</td><td>' + curOrderCreators + '</td><td>' + prevOrderCreators + '</td><td>' + delta(curOrderCreators, prevOrderCreators) + '</td></tr>' +
    '<tr><td>达人出单率</td><td>' + (curOrderRate == null ? '—' : (curOrderRate * 100).toFixed(1) + '%') + '</td><td>' + (prevOrderRate == null ? '—' : (prevOrderRate * 100).toFixed(1) + '%') + '</td><td>' + pp(curOrderRate == null ? null : curOrderRate * 100, prevOrderRate == null ? null : prevOrderRate * 100) + '</td></tr>' +
    '<tr><td>单达人产出(件)</td><td>' + (curPerCreator == null ? '—' : curPerCreator.toFixed(1)) + '</td><td>' + (prevPerCreator == null ? '—' : prevPerCreator.toFixed(1)) + '</td><td>' + (curPerCreator != null && prevPerCreator != null ? delta(curPerCreator, prevPerCreator) : '<span class="flat">—</span>') + '</td></tr>' +
    '</table>';

  var metricRow = '<div class="mrow">' +
    '<div class="mcard"><div class="mlabel">寄样</div><div class="mval">' + curTotal + '</div><div class="mdelta">' + delta(curTotal, prevTotal) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">履约达人</div><div class="mval">' + curCoop + '</div><div class="mdelta">' + delta(curCoop, prevCoop) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">履约率</div><div class="mval">' + (curFulfillRate == null ? '—' : (curFulfillRate * 100).toFixed(1) + '%') + '</div><div class="mdelta">' + pp(curFulfillRate == null ? null : curFulfillRate * 100, prevFulfillRate == null ? null : prevFulfillRate * 100) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">达人出单率</div><div class="mval">' + (curOrderRate == null ? '—' : (curOrderRate * 100).toFixed(1) + '%') + '</div><div class="mdelta">' + pp(curOrderRate == null ? null : curOrderRate * 100, prevOrderRate == null ? null : prevOrderRate * 100) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">月度达人总出单</div><div class="mval">' + curPieces + '</div><div class="mdelta">' + delta(curPieces, prevPieces) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">视频数量</div><div class="mval">' + (curVideos || '—') + '</div><div class="mdelta">' + (curVideos != null && prevVideos != null ? delta(curVideos, prevVideos) : '<span class="flat">—</span>') + '</div></div>' +
    '</div>';

  return '<section class="slide sku-sec">' +
    '<div class="sku-head">' + tierTag(r.tier) + '<h3>SKU ' + esc(r.sku) + '</h3>' +
    '<span class="sub">8月：寄样 ' + curTotal + ' · 月度达人总出单 ' + curPieces + ' · 达人出单率 ' + (curOrderRate == null ? '—' : (curOrderRate * 100).toFixed(1) + '%') + '</span></div>' +
    metricRow +

    '<div class="blk"><h4>📊 变化原因</h4><p class="lead">' + cmt.reason + '</p></div>' +
    '<div class="blk"><h4>🎯 下月措施</h4><ul class="concl" style="font-size:13px">' + cmt.measures.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul></div>' +

    '<details class="fold"><summary><b>查看对比数据（环比明细 / 同品类对标 / 达人画像 / 语言 / 通过率 / 新老达人）</b></summary><div class="fold-body">' +
    '<h5>① 环比上月明细（8月 vs 7月）</h5>' + moMDetailTable(r) +
    '<h5>② 同品类对标（同 ' + esc(r.type) + '，同一时期 8月，剔除测品/撤退）</h5>' + samePeriodPeerBlock(r) +
    langSection(r) + passRateSection(r) + newOldSection(r) + profileSection(r) +
    '</div></details>' +

    '<details class="fold"><summary><b>深度分析 · 订单拆解 · 达人效率 · 视频端 · 同产品复投</b></summary><div class="fold-body">' +
    '<h5>一、产品多维度分析 · 订单变化由哪些 SKU 造成</h5>' +
    '<p class="lead">本款对总订单变化的贡献：<span class="' + signCls(curPieces - prevPieces) + '">' + arrow(curPieces - prevPieces) + ' ' + Math.abs(curPieces - prevPieces) + ' 件</span></p>' +
    '<p class="q">是「达人覆盖问题」还是「达人卖得少」？—— Orders = 出单达人 × 单达人产出</p>' + decHtml +
    '<h5>三、订单变化进一步拆解</h5>' +
    '<table class="mini"><tr><th>因子</th><th>8月</th><th>7月</th><th>变化</th></tr>' +
    '<tr><td>出单达人数量</td><td><b>' + curOrderCreators + '</b></td><td>' + prevOrderCreators + '</td><td>' + delta(curOrderCreators, prevOrderCreators) + '</td></tr>' +
    '<tr><td>单达人产出（件）</td><td><b>' + (curPerCreator == null ? '—' : curPerCreator.toFixed(1)) + '</b></td><td>' + (prevPerCreator == null ? '—' : prevPerCreator.toFixed(1)) + '</td><td>' + (curPerCreator != null && prevPerCreator != null ? delta(curPerCreator, prevPerCreator) : '<span class="flat">—</span>') + '</td></tr>' +
    '</table>' +
    '<p class="lead"><b>结论：</b>' + (dc ? (Math.abs(dc.dD) >= Math.abs(dc.dO) ? '本期 <b>出单达人数变化（' + (dc.dD >= 0 ? '+' : '') + dc.dD + '）</b> 是主因，订单问题以「达人覆盖增减」为主。' : '本期 <b>单达人产出变化（' + (dc.dO >= 0 ? '+' : '') + dc.dO + ' 件）</b> 是主因，订单问题以「达人卖得少/多」为主。') : '（待拆解）') + '</p>' +
    '<h5>四、SKU × 达人效率</h5>' + effTable +
    '<h5>📺 视频端转化分析（逐 SKU，不汇总）</h5>' + vHtml + vConclusion + vStrategy +
    '<h5>🔁 同产品复投（合作过 ' + esc(r.sku) + ' 再复投 ' + esc(r.sku) + '）</h5>' +
    '<p class="note">同产品复投数据正在手动整理中，本版 <b>留白</b>。</p>' +
    '<div class="blank-box">⬜ ' + esc(r.sku) + '：复投达人名单 / 成功 / 失败 —— 待负责人补充</div>' +
    '</div></details>' +

    '</section>';
}

/* ---- 2178 + 2190 合并分析 ---- */
var r2178_7 = AUTH.get('2026-07', '2178'), r2178_8 = AUTH.get('2026-08', '2178');
var r2190_7 = AUTH.get('2026-07', '2190'), r2190_8 = AUTH.get('2026-08', '2190');
var combinedHtml = '';
if (r2178_7 && r2178_8 && r2190_7 && r2190_8) {
  var c7s = r2178_7.samples + r2190_7.samples, c8s = r2178_8.samples + r2190_8.samples;
  var c7o = r2178_7.orderCreators + r2190_7.orderCreators, c8o = r2178_8.orderCreators + r2190_8.orderCreators;
  var c7f = r2178_7.fulfillCreators + r2190_7.fulfillCreators, c8f = r2178_8.fulfillCreators + r2190_8.fulfillCreators;
  var c7rate = c7f ? c7o / c7f * 100 : 0, c8rate = c8f ? c8o / c8f * 100 : 0;
  var c7pieces = r2178_7.monthlyOrders + r2190_7.monthlyOrders, c8pieces = r2178_8.monthlyOrders + r2190_8.monthlyOrders;
  combinedHtml = '<section class="slide"><span class="pno">合并</span><h2>2178 + 2190 合并分析（Work Pants 双爆款）</h2>' +
    '<div class="mrow">' +
    '<div class="mcard"><div class="mlabel">8月寄样</div><div class="mval">' + c8s + '</div><div class="mdelta">' + delta(c8s, c7s) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">8月月度达人总出单</div><div class="mval">' + c8pieces + '</div><div class="mdelta">' + delta(c8pieces, c7pieces) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">8月达人出单率</div><div class="mval">' + c8rate.toFixed(1) + '%</div><div class="mdelta">' + pp(c8rate, c7rate) + '</div></div>' +
    '<div class="mcard"><div class="mlabel">8月出单达人</div><div class="mval">' + c8o + '</div><div class="mdelta">' + delta(c8o, c7o) + '</div></div>' +
    '</div>' +
    '<div class="blk"><h4>📊 共同变化原因</h4>' +
    '<p class="lead">2178 与 2190 同属 Work Pants 品类、同属爆品定位，8月寄样量合计 ' + c8s + ' 件（' + delta(c8s, c7s) + '），月度达人总出单 ' + c8pieces + ' 件（' + delta(c8pieces, c7pieces) + '）。' +
    '两者达人出单率均处于高位（2178 ' + (r2178_8.orderCreators / r2178_8.fulfillCreators * 100).toFixed(1) + '%，2190 ' + (r2190_8.orderCreators / r2190_8.fulfillCreators * 100).toFixed(1) + '%），说明 Work Pants 产品线整体需求旺盛、达人带货意愿强。' +
    '共同增长主要来自：① 爆款势能延续；② 视频端自然单占比高（2178 79%，2190 82%），内容自带成交；③ 复投与头部达人维护见效。</p></div>' +
    '<div class="blk"><h4>🎯 合并下月策略</h4><ul class="concl" style="font-size:13px">' +
    '<li>把 2178/2190 作为 Work Pants 组合款统一招募：同一批达人可两版都推，提升单达人产出。</li>' +
    '<li>优先复投两款均已出单的达人，用专属 bonus 锁定头部。</li>' +
    '<li>新达人首单建议 2178（经典）+ 2190（升级）二选一测品，出单后开放另一款。</li>' +
    '</ul></div>' +
    '</section>';
}

/* ---- 达人亮点与流失预警（旧样式） ---- */
var p8Creators = {}, p7Creators = {};
function collectCreators(samples, target) {
  samples.forEach(function (s) {
    var k = (s.creator || '').trim().toLowerCase();
    if (!k) return;
    if (!target[k]) target[k] = { name: s.creator, pieces: 0, samples: 0, skus: {} };
    target[k].samples++;
    target[k].skus[s.sku] = true;
    if (isOrdered(s)) target[k].pieces += Number(s.orderCount) || 0;
  });
}
collectCreators(samplesIn(P8_START, P8_END, null), p8Creators);
collectCreators(samplesIn(P7_START, P7_END, null), p7Creators);
var p8Top = Object.keys(p8Creators).map(function (k) { return p8Creators[k]; }).sort(function (a, b) { return b.pieces - a.pieces; }).slice(0, 5);
var p7Top = Object.keys(p7Creators).map(function (k) { return p7Creators[k]; }).sort(function (a, b) { return b.pieces - a.pieces; }).slice(0, 5);
var churnList = p7Top.filter(function (c) {
  var k = c.name.trim().toLowerCase();
  return !p8Creators[k] || p8Creators[k].pieces === 0;
}).slice(0, 5);

var highlightsHtml = '<section class="slide"><span class="pno">达人</span><h2>达人亮点与流失预警</h2>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
  '<div class="blk"><h4>🌟 8月出单 Top 5</h4>' +
  '<table class="mini"><tr><th>达人</th><th>出单件数</th><th>寄样次数</th></tr>' +
  p8Top.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td>' + c.pieces + '</td><td>' + c.samples + '</td></tr>'; }).join('') + '</table></div>' +
  '<div class="blk"><h4>⚠️ 7月出单 Top 5（对比是否流失）</h4>' +
  '<table class="mini"><tr><th>达人</th><th>7月出单件数</th><th>8月出单件数</th></tr>' +
  p7Top.map(function (c) {
    var k = c.name.trim().toLowerCase();
    var p8 = p8Creators[k] || { pieces: 0 };
    return '<tr><td>' + esc(c.name) + '</td><td>' + c.pieces + '</td><td class="' + (p8.pieces > 0 ? 'up' : 'down') + '">' + (p8.pieces > 0 ? p8.pieces : '流失/未出单') + '</td></tr>';
  }).join('') + '</table></div>' +
  '</div>' +
  '<div class="blk" style="margin-top:10px"><h4>📉 重点流失达人</h4>' +
  (churnList.length ? '<table class="mini"><tr><th>达人</th><th>7月出单件数</th><th>8月状态</th></tr>' +
    churnList.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td>' + c.pieces + '</td><td>8月未出单</td></tr>'; }).join('') + '</table>' :
    '<p class="note">无明显重点流失达人。</p>') +
  '<p class="lead"><b>结论：</b>' + (churnList.length ? churnList.map(function (c) { return c.name; }).join('、') + ' 等 7月头部达人 8月未出单，建议逐个复盘流失原因并做挽回邀约。' : '7月头部达人基本在 8月延续出单，头部稳定性较好。') + '</p>' +
  '<p class="note"><b>下月策略：</b>建立「上期出单达人 100% 复投」清单；对流失头部定向发放 bonus/样品包，第 10 天未回复升级 BD 负责人 1v1 跟进。</p></div>' +
  '</section>';

/* ---- 全 SKU 汇总分析 ---- */
var effRank = rows.filter(function (r) { return FOCUS.indexOf(r.sku) >= 0; }).map(function (r) {
  var r8 = AUTH.get('2026-08', r.sku);
  if (r8) return { sku: r.sku, tier: r.tier, orderRate: +(r8.orderCreators / r8.fulfillCreators * 100).toFixed(1), perCreator: r8.orderCreators ? +(r8.monthlyOrders / r8.orderCreators).toFixed(1) : null, pieces: r8.monthlyOrders };
  return { sku: r.sku, tier: r.tier, orderRate: r.P8m.orderRate, perCreator: r.P8m.perCreator, pieces: r.P8m.pieces };
}).sort(function (a, b) { return (b.orderRate || 0) - (a.orderRate || 0); });
var effRankHtml = '<table class="mini"><tr><th>SKU</th><th>定位</th><th>达人出单率</th><th>单达人产出(件)</th><th>月度出单</th></tr>' +
  effRank.map(function (e) {
    return '<tr><td><b>' + e.sku + '</b></td><td>' + tierTag(e.tier) + '</td><td>' + (e.orderRate == null ? '—' : e.orderRate + '%') + '</td><td>' + (e.perCreator == null ? '—' : e.perCreator) + '</td><td>' + e.pieces + '</td></tr>';
  }).join('') + '</table>';

var focusAgg = FOCUS.map(function (sku) {
  var r7 = AUTH.get('2026-07', sku), r8 = AUTH.get('2026-08', sku);
  var dc = decompose(rows.find(function (x) { return x.sku === sku; }));
  return { sku: sku, tier: tierMap[sku] || '未标记', aPieces: r7.monthlyOrders, bPieces: r8.monthlyOrders, dPieces: r8.monthlyOrders - r7.monthlyOrders, cov: dc ? dc.covEffect : null, int: dc ? dc.intEffect : null, aD: dc ? dc.aD : null, bD: dc ? dc.bD : null, aO: dc ? dc.aO : null, bO: dc ? dc.bO : null };
});
var aggCov = focusAgg.reduce(function (s, x) { return s + (x.cov || 0); }, 0);
var aggInt = focusAgg.reduce(function (s, x) { return s + (x.int || 0); }, 0);
var aggContribHtml = '<table class="mini"><tr><th>SKU</th><th>定位</th><th>7月件</th><th>8月件</th><th>变化</th><th>覆盖效应</th><th>单产效应</th></tr>' +
  focusAgg.map(function (x) {
    return '<tr><td><b>' + x.sku + '</b></td><td>' + tierTag(x.tier) + '</td><td>' + x.aPieces + '</td><td>' + x.bPieces + '</td><td>' + delta(x.bPieces, x.aPieces) + '</td><td>' + (x.cov === null ? '—' : (x.cov >= 0 ? '+' : '') + x.cov) + '</td><td>' + (x.int === null ? '—' : (x.int >= 0 ? '+' : '') + x.int) + '</td></tr>';
  }).join('') +
  '<tr style="font-weight:700;background:#fff0f6"><td>6 个常卖款合计</td><td></td><td>' + focusAgg.reduce(function (s, x) { return s + x.aPieces; }, 0) + '</td><td>' + focusAgg.reduce(function (s, x) { return s + x.bPieces; }, 0) + '</td><td>' + delta(focusAgg.reduce(function (s, x) { return s + x.bPieces; }, 0), focusAgg.reduce(function (s, x) { return s + x.aPieces; }, 0)) + '</td><td>' + (aggCov >= 0 ? '+' : '') + aggCov + '</td><td>' + (aggInt >= 0 ? '+' : '') + aggInt + '</td></tr>' +
  '</table>';
var aggDecompHtml = '<table class="mini"><tr><th>因子</th><th>8月</th><th>7月</th><th>变化</th></tr>' +
  '<tr><td>出单达人数量（6 个常卖款合计）</td><td>' + focusAgg.reduce(function (s, x) { return s + (x.bD || 0); }, 0) + '</td><td>' + focusAgg.reduce(function (s, x) { return s + (x.aD || 0); }, 0) + '</td><td>' + delta(focusAgg.reduce(function (s, x) { return s + (x.bD || 0); }, 0), focusAgg.reduce(function (s, x) { return s + (x.aD || 0); }, 0)) + '</td></tr>' +
  '<tr><td>单达人产出（6 个常卖款平均件）</td><td>' + (focusAgg.reduce(function (s, x) { return s + (x.bO || 0); }, 0) / focusAgg.length).toFixed(1) + '</td><td>' + (focusAgg.reduce(function (s, x) { return s + (x.aO || 0); }, 0) / focusAgg.length).toFixed(1) + '</td><td>' + delta((focusAgg.reduce(function (s, x) { return s + (x.bO || 0); }, 0) / focusAgg.length), (focusAgg.reduce(function (s, x) { return s + (x.aO || 0); }, 0) / focusAgg.length)) + '</td></tr>' +
  '</table>';

/* ---- 接力关系 HTML ---- */
var relayHtml = '<div class="blk"><h4>五、SKU 接力关系（老爆款 ↓ → 新 SKU 有没有补上？）</h4>' +
  '<table class="mini"><tr><th>分组</th><th>7月件</th><th>8月件</th><th>变化</th><th>占8月总盘</th></tr>' +
  '<tr><td>老 SKU（爆品+销售）</td><td>' + relay.oldP7 + '</td><td>' + relay.oldP8 + '</td><td>' + delta(relay.oldP8, relay.oldP7) + '</td><td>' + (relay.totalP8 ? Math.round(relay.oldP8 / relay.totalP8 * 100) : 0) + '%</td></tr>' +
  '<tr><td>新 SKU（测品）</td><td>' + relay.newP7 + '</td><td>' + relay.newP8 + '</td><td>' + delta(relay.newP8, relay.newP7) + '</td><td>' + relay.newShare + '%</td></tr>' +
  '<tr><td><b>合计</b></td><td>' + relay.totalP7 + '</td><td>' + relay.totalP8 + '</td><td>' + delta(relay.totalP8, relay.totalP7) + '</td><td>100%</td></tr>' +
  '</table>' +
  '<p class="lead"><b>结论：</b>新 SKU（测品）8月贡献 <b>' + relay.newP8 + ' 件</b>，占当月总盘 <b>' + relay.newShare + '%</b>；老 SKU ' + (relay.oldChg >= 0 ? '增长' : '下滑') + ' ' + Math.abs(relay.oldChg) + ' 件。' +
  (relay.newP8 >= Math.abs(relay.oldChg) || relay.oldChg >= 0
    ? '新 SKU 增量<b>足以承接/抵消</b>老款波动，产品增长有新承接。'
    : '新 SKU 增量<b>尚未完全承接</b>老款波动，接力仍存在缺口，需加快测品转爆品节奏。') + '</p>' +
  '<p class="note"><b>下月策略：</b>对测品中出单率 >15% 的 SKU 提高寄样优先级；对持续低产出的测品及时撤退，避免占用 BD 精力。</p></div>';

/* ---- 机会矩阵 HTML ---- */
var mx = matrixPts.map(function (p) { return p.x; }), my = matrixPts.filter(function (p) { return p.y !== null; }).map(function (p) { return p.y; });
var xMax = Math.max.apply(null, mx.concat([1])), xMin = 0;
var yMax = Math.max.apply(null, my.concat([50])), yMin = Math.min.apply(null, my.concat([-50]));
var W = 640, H = 420, padL = 56, padB = 48, padT = 20, padR = 20;
function sx(x) { return padL + (x - xMin) / (xMax - xMin) * (W - padL - padR); }
function sy(y) { return padT + (yMax - y) / (yMax - yMin) * (H - padT - padB); }
var midX = (xMin + xMax) / 2, midY = (yMin + yMax) / 2;
var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="matrix">';
svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fffafd"/>';
svg += '<rect x="' + padL + '" y="' + padT + '" width="' + (sx(midX) - padL) + '" height="' + (sy(midY) - padT) + '" fill="#fde8f0" opacity="0.5"/>';
svg += '<rect x="' + sx(midX) + '" y="' + padT + '" width="' + (W - padR - sx(midX)) + '" height="' + (sy(midY) - padT) + '" fill="#eafaf0" opacity="0.5"/>';
svg += '<rect x="' + padL + '" y="' + sy(midY) + '" width="' + (sx(midX) - padL) + '" height="' + (H - padB - sy(midY)) + '" fill="#eaf0fd" opacity="0.5"/>';
svg += '<rect x="' + sx(midX) + '" y="' + sy(midY) + '" width="' + (W - padR - sx(midX)) + '" height="' + (H - padB - sy(midY)) + '" fill="#fff5e6" opacity="0.5"/>';
svg += '<line x1="' + sx(midX) + '" y1="' + padT + '" x2="' + sx(midX) + '" y2="' + (H - padB) + '" stroke="#d9b3c4" stroke-dasharray="4"/>';
svg += '<line x1="' + padL + '" y1="' + sy(midY) + '" x2="' + (W - padR) + '" y2="' + sy(midY) + '" stroke="#d9b3c4" stroke-dasharray="4"/>';
svg += '<text x="' + (padL + 6) + '" y="' + (padT + 14) + '" font-size="11" fill="#b25b7e">高GMV·高增长</text>';
svg += '<text x="' + (sx(midX) + 6) + '" y="' + (padT + 14) + '" font-size="11" fill="#b25b7e">低GMV·高增长</text>';
svg += '<text x="' + (padL + 6) + '" y="' + (H - padB - 6) + '" font-size="11" fill="#b25b7e">高GMV·低增长</text>';
svg += '<text x="' + (sx(midX) + 6) + '" y="' + (H - padB - 6) + '" font-size="11" fill="#b25b7e">低GMV·低增长</text>';
svg += '<text x="' + (W - padR - 4) + '" y="' + (H - padB + 16) + '" font-size="11" fill="#a08590" text-anchor="end">→ GMV（8月月度出单）</text>';
svg += '<text x="' + (padL - 8) + '" y="' + (padT + 4) + '" font-size="11" fill="#a08590" text-anchor="end">增长率% ↑</text>';
matrixPts.forEach(function (p) {
  var px = sx(p.x), py = p.y === null ? sy(midY) - 10 : sy(p.y);
  var col = tierColor[p.tier] || '#ccc';
  svg += '<circle cx="' + px + '" cy="' + py + '" r="13" fill="' + col + '" opacity="0.85" stroke="#fff" stroke-width="1.5"/>';
  svg += '<text x="' + px + '" y="' + (py + 4) + '" font-size="10" fill="#fff" text-anchor="middle" font-weight="700">' + p.sku + '</text>';
});
svg += '</svg>';
var highGmvHighGrowth = matrixPts.filter(function (p) { return p.x >= midX && p.y >= midY; }).map(function (p) { return p.sku; });
var lowGmvHighGrowth = matrixPts.filter(function (p) { return p.x < midX && p.y >= midY; }).map(function (p) { return p.sku; });
var highGmvLowGrowth = matrixPts.filter(function (p) { return p.x >= midX && p.y < midY; }).map(function (p) { return p.sku; });
var lowGmvLowGrowth = matrixPts.filter(function (p) { return p.x < midX && p.y < midY; }).map(function (p) { return p.sku; });
var matrixHtml = '<div class="blk"><h4>六、SKU 机会矩阵（四象限：GMV × 增长率）</h4>' + svg +
  '<p class="lead"><b>矩阵结论：</b>高GMV·高增长（' + (highGmvHighGrowth.join('/') || '—') + '）是核心放量款；高GMV·低增长（' + (highGmvLowGrowth.join('/') || '—') + '）需防头部流失；低GMV·高增长（' + (lowGmvHighGrowth.join('/') || '—') + '）是潜力测品，可加大寄样；低GMV·低增长（' + (lowGmvLowGrowth.join('/') || '—') + '）建议撤退或仅做测品。</p>' +
  '<p class="note"><b>下月策略：</b>预算 60% 投向高GMV·高增长款；30% 投向低GMV·高增长测品；10% 用于挽回流失头部。</p></div>';

/* ---- 复投汇总 ---- */
var raRows = out.reinvest.bySku.slice(0, 12).map(function (r) {
  return '<tr><td><b>' + esc(r.sku) + '</b></td><td>' + r.reinvest + '</td><td>' + r.success + '</td><td>' + r.failed + '</td><td>' + r.watching + '</td><td><b>' + r.rate + '%</b></td></tr>';
}).join('');
var raRate = RA.reinvestSuccess + RA.reinvestFailed > 0 ? Math.round(RA.reinvestSuccess / (RA.reinvestSuccess + RA.reinvestFailed) * 100) : 0;
var sr = AUTH.sameSkuReinvest;
var reinvestHtml = '<section class="slide"><h2>SKU 复投关系汇总（不同产品复投 + 同一产品复投）</h2>' +
  '<div class="mrow" style="margin-bottom:10px">' +
  '<div class="mcard"><div class="mlabel">不同 SKU 复投声明</div><div class="mval">' + RA.reinvestTotal + '</div></div>' +
  '<div class="mcard"><div class="mlabel">不同 SKU 复投成功率</div><div class="mval">' + raRate + '%</div><div class="msub">' + RA.reinvestSuccess + ' 成功 / ' + RA.reinvestFailed + ' 未成</div></div>' +
  '<div class="mcard"><div class="mlabel">同一产品复投联系</div><div class="mval">' + sr.contacted + '</div><div class="msub">2178+2190 已出单达人</div></div>' +
  '<div class="mcard"><div class="mlabel">同一产品复投结果</div><div class="mval">' + sr.success + '/' + sr.failed + '/' + sr.noReply + '</div><div class="msub">成功/失败/未回复</div></div>' +
  '</div>' +
  '<h4>① 不同产品复投（合作过 A 再推 B）</h4>' +
  '<table><tr><th>SKU</th><th>复投声明</th><th>成功</th><th>未成功</th><th>观察中</th><th>成功率</th></tr>' + raRows + '</table>' +
  '<p class="lead"><b>结论：</b>普通复投（广撒网声明）成功率仅 <b>' + raRate + '%</b>，是最大效率黑洞；建议改为「只对上期出单达人定向复投」。</p>' +
  '<p class="note"><b>下月策略：</b>把复投名单从「所有合作过达人」收紧为「上期出单达人」，并配置专属佣金/bonus。</p>' +
  '<h4>② 同一产品复投（合作过 X 再复投 X，目前仅 2178+2190）</h4>' +
  '<div class="mrow" style="margin-top:10px">' +
  '<div class="mcard"><div class="mlabel">联系达人</div><div class="mval">' + sr.contacted + '</div></div>' +
  '<div class="mcard"><div class="mlabel">成功</div><div class="mval">' + sr.success + '</div></div>' +
  '<div class="mcard"><div class="mlabel">失败</div><div class="mval">' + sr.failed + '</div></div>' +
  '<div class="mcard"><div class="mlabel">未回复</div><div class="mval">' + sr.noReply + '</div></div>' +
  '</div>' +
  '<p class="lead"><b>结论：</b>2178+2190 同一产品复投联系了 ' + sr.contacted + ' 位已出单达人，当前成功 ' + sr.success + '、失败 ' + sr.failed + '、未回复 ' + sr.noReply + '。未回复占比 ' + (sr.contacted ? Math.round(sr.noReply / sr.contacted * 100) : 0) + '%，说明跟进节奏和触达方式仍有优化空间。</p>' +
  '<p class="note"><b>下月策略：</b>对未回复达人做第二轮 1v1 触达（换话术/换 BD/加 bonus）；把成功经验沉淀为同款复投 SOP。</p>' +
  '</section>';

/* ---- P4 下月行动 ---- */
var actions = [
  ['复投从「广撒网」改为「定向复投」', '普通复投成功率仅 ' + raRate + '%，建议只复投「上期已出单达人」并配专属 bonus；2178+2190 同款复投需二次跟进未回复达人。'],
  ['2178/2190 合并放量', 'Work Pants 双爆款可统一招募、组合推荐，提升单达人产出；优先复投两款均已出单的头部达人。'],
  ['头部达人维护', '对 imaniiibrooks、ljac888、yetsika_homedecor、nairireyes 等流失大客逐一挽回，建立「上期出单达人 100% 复投」清单。'],
  ['新达人 SOP', '新达人首轮只寄 1 件测品款验证带货力，出单后再开放 2178/2190/28173 主推款；第 10 天未发跟进、第 15 天升级催更。'],
  ['寄样名单按画像筛人', '优先核心达人、星级 ≥3★、非大码身材；对低转化画像减少寄样或改用测品验证。'],
  ['视频端乘势加投', '自然单占比高，内容自带成交能力；预算从广撒网新拉转向复投已验证的高自然单达人，ROI 更高。'],
  ['机会矩阵指导预算分配', '60% 预算给高GMV·高增长款，30% 给低GMV·高增长测品，10% 用于头部挽回。'],
];
var actionsHtml = actions.map(function (a, i) { return '<li><b>' + (i + 1) + '. ' + a[0] + '：</b>' + a[1] + '</li>'; }).join('');

/* ---- 组装 HTML ---- */
var skuSectionsHtml = rows.filter(function (r) { return FOCUS.indexOf(r.sku) >= 0; }).map(skuSection).join('');

var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Dlooda TKBD 8月月度汇报</title><style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#fdf3f6;color:#4a3a41;line-height:1.7}' +
'.wrap{max-width:1000px;margin:0 auto;padding:24px}' +
'.slide{background:#fff;border-radius:16px;padding:26px 30px;box-shadow:0 2px 12px rgba(232,121,166,.10);margin-bottom:22px;page-break-inside:avoid}' +
'h1{color:#d16a92;font-size:30px;text-align:center;margin-bottom:6px}' +
'h2{color:#d16a92;font-size:20px;margin:0 0 16px;display:flex;align-items:center;gap:8px}' +
'h2::before{content:"🎀";font-size:17px}' +
'h3{font-size:18px;color:#d16a92;display:inline}' +
'h4{font-size:15px;color:#b25b7e;margin:14px 0 8px;border-left:4px solid #f0a5c8;padding-left:10px}' +
'h5{font-size:13px;color:#b25b7e;margin:12px 0 6px;font-weight:600}' +
'.period{text-align:center;color:#a08590;font-size:13px;margin-bottom:26px}' +
'.pno{float:right;font-size:11px;color:#c0a8b2;font-weight:400}' +
'.mrow{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}' +
'.mcard{flex:1;min-width:130px;background:#fff;border-radius:14px;padding:16px 14px;box-shadow:0 2px 10px rgba(232,121,166,.08);text-align:center;border:1px solid #f7e3ec}' +
'.mlabel{font-size:12px;color:#a08590}.mval{font-size:24px;font-weight:700;color:#d16a92;margin:4px 0}.mdelta{font-size:12px}.msub{font-size:11px;color:#a08590;margin-top:4px}.mnote{font-size:10px;color:#c0a8b2;margin-top:6px;line-height:1.4}' +
'.up{color:#d6336c}.down{color:#2b8a3e}.flat{color:#adb5bd}.sub{color:#a08590;font-size:11px}' +
'table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0}' +
'th{background:#fbe4ee;color:#b25b7e;padding:8px 10px;text-align:left;font-weight:600}' +
'td{padding:8px 10px;border-bottom:1px solid #f7e3ec;vertical-align:top}' +
'tr:hover td{background:#fff8fb}' +
'.tier{display:inline-block;font-size:11px;color:#fff;border-radius:8px;padding:1px 8px;margin-right:4px}' +
'.mini th{padding:6px 8px;font-size:12px}.mini td{padding:6px 8px;font-size:12px}' +
'.sku-sec{border:1px solid #f0d6e2}' +
'.sku-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}' +
'.blk{margin:10px 0;padding:10px 14px;background:#fffafd;border-radius:10px;border:1px solid #f7e3ec}' +
'.lead{font-size:13px;color:#5c4a52;margin:6px 0}' +
'.q{font-size:13px;color:#b25b7e;font-weight:600;margin:4px 0}' +
'.dec{background:#fdf3f6;border-radius:10px;padding:10px 12px;margin:8px 0}' +
'.dec-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}' +
'.note{font-size:11px;color:#c98ab0;background:#fff0f6;border-radius:6px;padding:4px 8px;display:inline-block;margin-top:4px}' +
'.blank{border:1px dashed #e0a8c4;background:#fff8fb}' +
'.blank-box{font-size:12px;color:#a08590;border:1px dashed #e0a8c4;border-radius:8px;padding:8px 12px;margin:6px 0;background:#fff}' +
'.fold{margin:10px 0;border:1px solid #f0d6e2;border-radius:10px;background:#fff}' +
'.fold summary{cursor:pointer;padding:10px 14px;font-size:14px;color:#b25b7e;background:#fff0f6;border-radius:10px}' +
'.fold-body{padding:10px 14px 14px}' +
'.wf{display:flex;align-items:flex-end;gap:6px;height:200px;padding:10px;background:#fffafd;border-radius:10px;overflow-x:auto}' +
'.wf-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:46px;height:100%}' +
'.wf-bar{width:30px;border-radius:5px 5px 0 0;margin-bottom:4px}' +
'.wf-bar.up{background:linear-gradient(180deg,#f0a5c8,#e879a6)}.wf-bar.down{background:linear-gradient(180deg,#9ad3b0,#5cb27e)}' +
'.wf-bar.base{background:#d9b3c4}.wf-bar.focus{outline:2px solid #d16a92;outline-offset:1px}' +
'.wf-col span{font-size:11px;color:#a08590}.wf-col b{font-size:12px}' +
'.matrix{width:100%;max-width:640px;border:1px solid #f0d6e2;border-radius:10px;display:block;margin:8px 0}' +
'.concl li{margin-bottom:10px;font-size:14px}' +
'.concl li::marker{color:#d16a92}' +
'@media print{body{background:#fff;padding:0}.slide{box-shadow:none;border:1px solid #f0d6e2;page-break-inside:avoid}.wf,.matrix{max-width:none}}' +
'.print-note{text-align:center;color:#c0a8b2;font-size:11px;margin-top:14px}' +
'</style></head><body><div class="wrap">' +

'<section class="slide" style="text-align:center;padding:60px 30px">' +
'<h1 style="font-size:38px;margin-bottom:18px">🎀 Dlooda TKBD</h1>' +
'<h1 style="font-size:30px">8月月度汇报</h1>' +
'<div class="period" style="margin-top:24px;font-size:15px">汇报人：<b>余慧玲</b><br>统计区间：2026-07-15 ~ 2026-08-15（8月）　|　环比基期：2026-06-15 ~ 2026-07-15（7月）<br>口径：月中到月中，已剔除撤退款；订单以月度达人总出单统计</div>' +
'</section>' +

'<section class="slide"><h2>目录</h2><ol style="font-size:15px;padding-left:24px;line-height:2.2">' +
'<li><b>整体数据变化</b>（核心 4 项 + SKU 汇总表 + 一页结论 + 逐 SKU 瀑布图）</li>' +
'<li><b>逐 SKU 现象分析</b>：2178 · 2190 · 2722 · 2189 · 28173 · 2789（每款含变化原因、下月措施、折叠对比）</li>' +
'<li><b>2178 + 2190 合并分析</b>（Work Pants 双爆款）</li>' +
'<li><b>达人亮点与流失预警</b></li>' +
'<li><b>全 SKU 汇总分析</b>（达人效率榜 + 订单贡献/拆解）</li>' +
'<li><b>SKU 接力关系</b>（老爆款 ↓ → 新 SKU 有没有补上）</li>' +
'<li><b>SKU 机会矩阵</b>（四象限：GMV × 增长率）</li>' +
'<li><b>SKU 复投关系汇总</b>（不同产品复投 + 同一产品复投）</li>' +
'<li><b>下月行动</b></li>' +
'</ol></section>' +

'<section class="slide"><span class="pno">P3</span><h2>整体数据变化（核心 4 项）</h2>' +
'<div class="mrow">' + coreHtml + '</div>' +
'<div class="blk"><h4>报告期 12 个寄样 SKU 汇总（已剔除撤退款；焦点 SKU 加粗月度出单）</h4>' + skuSummaryHtml + '</div>' +
conclusionHtml +
'<div class="blk"><h4>订单变化瀑布图（谁把订单拉下来 / 谁在增长）</h4>' + wfHtml + wfConclusion + '</div>' +
'</section>' +

skuSectionsHtml +

combinedHtml +

highlightsHtml +

'<section class="slide"><span class="pno">汇总</span><h2>全 SKU 汇总分析 · 达人效率榜 & 订单拆解</h2>' +
'<div class="blk"><h4>全 SKU 达人效率榜（哪些 SKU 更容易被卖起来）</h4>' + effRankHtml +
'<p class="lead"><b>结论：</b>「更容易被达人卖起来」= 达人出单率高且单达人产出高。' + effRank.slice(0, 3).map(function (e) { return e.sku; }).join('/') + ' 居前，可作资源倾斜参考。</p>' +
'<p class="note"><b>下月策略：</b>把 BD 精力向效率榜 Top3 倾斜；效率低的 SKU 减少新达人广撒网，改为老达人复投。</p></div>' +
'<div class="blk"><h4>产品多维度分析 · 6 个常卖款订单贡献拆解</h4>' + aggContribHtml +
'<p class="lead"><b>结论：</b>6 个常卖款合计：覆盖效应 ' + (aggCov >= 0 ? '+' : '') + aggCov + ' 件，单产效应 ' + (aggInt >= 0 ? '+' : '') + aggInt + ' 件。' + (Math.abs(aggCov) > Math.abs(aggInt) ? '订单变化以达人覆盖增减为主。' : '订单变化以单达人产出变化为主。') + '</p>' +
'<p class="note"><b>下月策略：</b>' + (Math.abs(aggCov) > Math.abs(aggInt) ? '重点提升出单达人数（拉新+复投）。' : '重点提升单达人产出（组合款/加投/优质 brief）。') + '</p></div>' +
'<div class="blk"><h4>订单变化进一步拆解（6 个常卖款合计）</h4>' + aggDecompHtml + '</div>' +
'</section>' +

'<section class="slide"><span class="pno">五</span><h2>SKU 接力关系</h2>' + relayHtml + '</section>' +

'<section class="slide"><span class="pno">六</span><h2>SKU 机会矩阵</h2>' + matrixHtml + '</section>' +

reinvestHtml +

'<section class="slide"><span class="pno">P4</span><h2>下月行动</h2><ul class="concl">' + actionsHtml + '</ul></section>' +

'<div class="print-note">数据来源：飞书「每日寄样」表（最新同步至 ' + new Date().toLocaleString('zh-CN') + '）+ TikTok 后台手算视频端/自然单数据（scripts/authority_table.js） · 由 Dlooda TKBD CRM 自动生成 · 可 Ctrl+P 导出 PDF</div>' +
'</div></body></html>';

var reportPath = path.join(ROOT, 'monthly-report-2026-07-15_08-15.html');
fs.writeFileSync(reportPath, html);
console.log('\nHTML report -> ' + reportPath + ' (' + Buffer.byteLength(html) + ' bytes)');
process.exit(0);
