/* 提取各SKU新老达人/等级/星级/核心类型/出单贡献等质量指标，供PPT v4使用 */
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

var D = global.DloodaData._getRawData ? global.DloodaData._getRawData() : global.REAL_DATA;
var samples = D.samples || [];

var SKUS = ['2178','2190','2722','2189','28173','2789','2757','28193','2A19'];
var periods = [
  { key: '7月常卖', start: '2026-06-15', end: '2026-07-15' },
  { key: '8月常卖', start: '2026-07-15', end: '2026-08-15' },
  { key: '7月测款', start: '2026-06-15', end: '2026-07-15' },
  { key: '8月测款', start: '2026-07-15', end: '2026-08-15' }
];

function between(t, start, end) {
  if (!t) return false;
  var d = t.slice(0, 10);
  return (!start || d >= start) && (!end || d <= end);
}

function normStar(s) {
  if (!s) return '未标注';
  var m = String(s).match(/(\d)★/);
  return m ? m[1] + '★' : String(s);
}

function normOfficial(o) {
  if (!o) return '未标注';
  return String(o).toUpperCase();
}

var out = {};

periods.forEach(function (p) {
  out[p.key] = {};
  SKUS.forEach(function (sku) {
    var skuSamples = samples.filter(function (s) { return s.sku === sku; }).sort(function (a, b) {
      return (a.sampleTime || '') > (b.sampleTime || '') ? 1 : -1;
    });
    var periodSamples = skuSamples.filter(function (s) { return between(s.sampleTime, p.start, p.end); });
    if (periodSamples.length === 0) { out[p.key][sku] = null; return; }

    var creators = {};
    periodSamples.forEach(function (s) {
      var name = String(s.creator || '').trim();
      if (!creators[name]) {
        creators[name] = { name: name, samples: 0, orders: 0, videos: 0, ordered: false, priorSamples: [], provenOld: false, isOld: false };
      }
      creators[name].samples++;
      creators[name].orders += (s.orderCount || 0);
      creators[name].videos += (Array.isArray(s.videos) ? s.videos.length : 0);
      if (s.orderCount && s.orderCount > 0) creators[name].ordered = true;
    });

    Object.keys(creators).forEach(function (name) {
      var prior = skuSamples.filter(function (s) {
        return String(s.creator || '').trim() === name && between(s.sampleTime, null, p.start) && s.sampleTime.slice(0, 10) < p.start;
      });
      var c = creators[name];
      c.isOld = prior.length > 0;
      c.provenOld = prior.some(function (s) { return s.orderCount && s.orderCount > 0; });
      c.priorSamples = prior.length;
      // attach profile from creators list
      var profile = D.creators ? D.creators.find(function (cr) { return String(cr.name || '').trim().toLowerCase() === name.toLowerCase(); }) : null;
      if (profile) {
        c.official = normOfficial(profile.official);
        c.stars = normStar(profile.stars);
        c.creatorType = profile.creatorType || '未标注';
      } else {
        c.official = '未标注';
        c.stars = '未标注';
        c.creatorType = '未标注';
      }
    });

    var list = Object.values(creators);
    var newList = list.filter(function (c) { return !c.isOld; });
    var oldList = list.filter(function (c) { return c.isOld; });
    var provenOldList = list.filter(function (c) { return c.provenOld; });

    function agg(arr) {
      return {
        count: arr.length,
        orderedCount: arr.filter(function (c) { return c.ordered; }).length,
        totalOrders: arr.reduce(function (sum, c) { return sum + c.orders; }, 0),
        orderRate: arr.length ? Math.round(arr.filter(function (c) { return c.ordered; }).length / arr.length * 1000) / 10 : 0,
        samples: arr.reduce(function (sum, c) { return sum + c.samples; }, 0),
      };
    }

    function dist(arr, key) {
      var map = {};
      arr.forEach(function (c) { var v = c[key] || '未标注'; map[v] = (map[v] || 0) + 1; });
      return map;
    }

    out[p.key][sku] = {
      total: agg(list),
      newCreators: agg(newList),
      oldCreators: agg(oldList),
      provenOldCreators: agg(provenOldList),
      officialDist: dist(list, 'official'),
      starsDist: dist(list, 'stars'),
      typeDist: dist(list, 'creatorType'),
      newOfficialDist: dist(newList, 'official'),
      oldOfficialDist: dist(oldList, 'official'),
      provenOfficialDist: dist(provenOldList, 'official'),
    };
  });
});

fs.writeFileSync(path.join(ROOT, 'scripts/_creator_quality_data.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('saved scripts/_creator_quality_data.json');
