'use strict';
// 验证改后公式：加载 real-data.js + data.js，调用 getSKUOrderRateInRange
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/LENOVO/WorkBuddy/2026-08-02-13-13-32';

global.window = {};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.document = undefined;

eval(fs.readFileSync(path.join(ROOT, 'js/real-data.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'));

const Data = global.window.DloodaData;
if (!Data) { console.error('DloodaData 未暴露'); process.exit(1); }

const skus = ['28173', '2178', '2190', '2722', '2757', '2789', '2189'];
console.log('=== getSKUOrderRateInRange (7/15-8/15) ===');
console.log('SKU     | 有视频链接达人 | 出单达人 | 出单率%');
for (const sku of skus) {
  const r = Data.getSKUOrderRateInRange(sku, '2026-07-15', '2026-08-15 23:59');
  console.log(sku, '|', r.fulfilledCreators, '|', r.orderedCreators, '|', r.orderRate + '%');
}
