// -*- coding: utf-8 -*-
// 按用户定义重算各 SKU 出单率：出单率 = 出单达人 / 有视频达人
// 窗口：2026-07-15 ~ 2026-08-15（含两端）
const fs = require('fs');
const content = fs.readFileSync('C:/Users/LENOVO/WorkBuddy/2026-08-02-13-13-32/js/real-data.js', 'utf8');
global.window = {};
eval(content);
const data = global.window.REAL_DATA;

const START = '2026-07-15';
const END = '2026-08-16'; // 开区间上界，含 8/15 全天

function norm(v){ if(v==null) return ''; if(Array.isArray(v)) return v.join(','); return String(v); }

const SKUS = ['2178','2190','2722','2757','2789','28173','2189'];

function analyze(sku) {
  const samples = data.samples.filter(s => s.sku === sku).map(s => Object.assign({}, s, { fulfillMethod: norm(s.fulfillMethod) }));

  // A) 有视频达人 = 该 SKU 窗口内「寄样且发了视频」的去重达人（sampleTime 在窗 + 有 video 字段）
  const videoCreatorsA = new Set();
  // B) 有视频达人 = 该 SKU 窗口内「视频发布时间」在窗的去重达人
  const videoCreatorsB = new Set();
  // 出单达人(窗口内 sample 有 orderCount>0)
  const orderCreators = new Set();

  const videosAll = [];
  samples.forEach(s => {
    const sampleInWindow = s.sampleTime >= START && s.sampleTime < END;
    (s.videos || []).forEach(v => {
      videosAll.push({ creator: s.creator, postTime: v.time, sampleInWindow });
    });
    if (sampleInWindow) {
      if (s.videos && s.videos.length > 0) videoCreatorsA.add(s.creator);
      if (s.orderCount && s.orderCount > 0) orderCreators.add(s.creator);
    }
  });
  videosAll.forEach(v => {
    if (v.postTime >= START && v.postTime < END) videoCreatorsB.add(v.creator);
  });

  const orderedInA = [...orderCreators].filter(c => videoCreatorsA.has(c)).length;
  const orderedInB = [...orderCreators].filter(c => videoCreatorsB.has(c)).length;

  return {
    sku,
    samples: samples.length,
    videoCreatorsA: videoCreatorsA.size,
    videoCreatorsB: videoCreatorsB.size,
    orderCreators: orderCreators.size,
    rateA: videoCreatorsA.size ? (orderedInA/videoCreatorsA.size*100).toFixed(2) : 'NA',
    rateB: videoCreatorsB.size ? (orderedInB/videoCreatorsB.size*100).toFixed(2) : 'NA',
    totalVideos: videosAll.length,
    videosInWindow: videosAll.filter(v=>v.postTime>=START && v.postTime<END).length,
  };
}

console.log('SKU | 样品 | 有视频达人(A:寄样+视频) | 有视频达人(B:视频发布在窗) | 出单达人 | 出单率A | 出单率B | 总视频 | 窗内视频');
SKUS.forEach(sku => {
  const r = analyze(sku);
  console.log(`${r.sku} | ${r.samples} | ${r.videoCreatorsA} | ${r.videoCreatorsB} | ${r.orderCreators} | ${r.rateA}% | ${r.rateB}% | ${r.totalVideos} | ${r.videosInWindow}`);
});

console.log('\n--- 28173 有视频达人(B) 明细 ---');
const s281 = data.samples.filter(s => s.sku === '28173');
const vcB = new Set();
s281.forEach(s => (s.videos||[]).forEach(v => { if (v.time>=START && v.time<END) vcB.add(s.creator); }));
const ord281 = new Set(s281.filter(s=>s.sampleTime>=START && s.sampleTime<END && s.orderCount>0).map(s=>s.creator));
console.log('有视频达人(B)数量:', vcB.size);
console.log('出单达人(窗内)数量:', ord281.size);
console.log('有视频且出单:', [...vcB].filter(c=>ord281.has(c)).length);
