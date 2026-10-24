// -*- coding: utf-8 -*-
// 用「新公式」独立复算：出单率 = 出单达人(有视频且出单) / 有视频达人(窗口内发视频)
const fs = require('fs');
global.window = {};
eval(fs.readFileSync('C:/Users/LENOVO/WorkBuddy/2026-08-02-13-13-32/js/real-data.js', 'utf8'));
const data = global.window.REAL_DATA;
const START = '2026-07-15', END = '2026-08-16';
const skus = ['2178','2190','2722','2757','2789','28173','2189'];
console.log('SKU | 有视频达人(新分母) | 出单达人(有视频+出单) | 出单率(新公式·旧数据)');
skus.forEach(sku => {
  const samples = data.samples.filter(s => s.sku === sku && s.sampleTime >= START && s.sampleTime < END);
  const vid = new Set(), ord = new Set();
  samples.forEach(s => {
    if (s.videos && s.videos.length > 0) {
      vid.add(s.creator);
      if (s.orderCount && s.orderCount > 0) ord.add(s.creator);
    }
  });
  const rate = vid.size ? Math.round(ord.size / vid.size * 1000) / 10 : 0;
  console.log(`${sku} | ${vid.size} | ${ord.size} | ${rate}%`);
});
