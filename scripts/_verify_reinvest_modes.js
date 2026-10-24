/* 验证复投两种口径：口径A(按SKU拆分) vs 口径B(按达人整体) */
global.window = global;
global.location = { href: '' };
var _store = {};
global.localStorage = { getItem: function (k) { return _store[k] || null; }, setItem: function (k, v) { _store[k] = String(v); }, removeItem: function (k) { delete _store[k]; } };
global.document = { readyState: 'complete', addEventListener: function () {}, getElementById: function () { return null; }, querySelectorAll: function () { return []; } };
try { global.navigator = global.navigator || { userAgent: 'node' }; } catch (e) {}

var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
eval(fs.readFileSync(path.join(ROOT, 'js/real-data.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'));

function show(title, d) {
  console.log('=== ' + title + ' ===');
  console.log('  [口径A 按SKU] 声明=' + d.reinvestTotal + ' 成功=' + d.reinvestSuccess
    + ' 未成功=' + d.reinvestFailed + ' 观察中=' + d.reinvestWatching
    + ' 成功率=' + d.overallRate + '% (占全部声明 ' + d.rawRate + '%)');
  console.log('  [口径B 按达人] 声明达人数=' + d.creatorTotal + ' 成功达人=' + d.creatorSuccess
    + ' 未成功=' + d.creatorFailed + ' 观察中=' + d.creatorWatching
    + ' 命中SKU总数=' + d.successSkuCount + ' 成功率(按达人)=' + d.creatorRate + '% 人均命中=' + d.avgHit);
}

show('全量(无筛选)', DloodaData.getReinvestAnalysis());
show('月报区间 7/15-8/15', DloodaData.getReinvestAnalysis('2026-07-15', '2026-08-15'));
