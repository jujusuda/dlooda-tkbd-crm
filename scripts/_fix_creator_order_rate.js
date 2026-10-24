'use strict';
// 用最新 real-data.js + 正确口径（出单达人 ÷ 有视频链接达人）更新 _correct_sku_data.json
// 窗口：7月 = 6/15-7/15，8月 = 7/15-8/15（与 PPT 现有 samples 对齐，已验证）
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/LENOVO/WorkBuddy/2026-08-02-13-13-32';

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'js/real-data.js'), 'utf8'));
const data = global.window.REAL_DATA;

const WINDOWS = {
  '7月常卖': ['2026-06-15', '2026-07-15 23:59'],
  '8月常卖': ['2026-07-15', '2026-08-15 23:59'],
  '8月测款': ['2026-07-15', '2026-08-15 23:59'],
  '7月测款': ['2026-06-15', '2026-07-15 23:59'],
};

function calc(sku, start, end) {
  const sm = data.samples.filter(function (x) {
    return x.sku === sku && x.sampleTime >= start && x.sampleTime <= end;
  });
  const urlCr = new Set();
  const oc = new Set();
  sm.forEach(function (x) {
    if (x.videos && x.videos.some(function (v) { return v && v.url && String(v.url).trim(); })) urlCr.add(x.creator);
    if (parseInt(x.orderCount, 10) > 0) oc.add(x.creator);
  });
  return { orderCreators: oc.size, videoCreators: urlCr.size, creatorOrderRate: urlCr.size > 0 ? oc.size / urlCr.size : 0 };
}

const jsonPath = path.join(ROOT, 'scripts/_correct_sku_data.json');
const d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let changed = 0;
for (const group of Object.keys(WINDOWS)) {
  const [s, e] = WINDOWS[group];
  const skus = d.data[group] ? Object.keys(d.data[group]) : [];
  for (const sku of skus) {
    const r = calc(sku, s, e);
    const old = d.data[group][sku];
    const oldOc = old.orderCreators;
    const oldRate = old.creatorOrderRate;
    d.data[group][sku].orderCreators = r.orderCreators;
    d.data[group][sku].creatorOrderRate = r.creatorOrderRate;
    const ocChanged = oldOc !== r.orderCreators;
    const rateChanged = Math.abs(oldRate - r.creatorOrderRate) > 0.0001;
    if (ocChanged || rateChanged) {
      changed++;
      console.log(group, sku,
        '| orderCreators', oldOc, '->', r.orderCreators,
        '| creatorOrderRate', (oldRate * 100).toFixed(2) + '%', '->', (r.creatorOrderRate * 100).toFixed(2) + '%',
        '| 有视频链接达人', r.videoCreators);
    }
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(d, null, 2), 'utf8');
console.log('--- 更新完成，共修改', changed, '条 ---');
