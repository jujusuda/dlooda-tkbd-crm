// 校验新 real-data.js 的任务月份分布（模拟 window 环境直接 eval）
const fs = require('fs');
const path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'real-data.js'), 'utf8'));
const d = global.window.REAL_DATA;
const tasks = d.tasks || [];
const months = {};
tasks.forEach(t => {
  const k = String(t.startTime || t.month || t.date || '').slice(0, 7);
  months[k] = (months[k] || 0) + 1;
});
console.log('total tasks:', tasks.length);
console.log('tasks by startTime month:', JSON.stringify(months, null, 0));
const oct = tasks.filter(t => String(t.startTime || '').startsWith('2026-10'));
console.log('october tasks:', JSON.stringify(oct.map(t => ({ sku: t.sku, startTime: t.startTime, required: t.required })), null, 0));
// 最近寄样时间
const times = (d.daily || d.samples || []).map(r => r.time || r.sampleTime || r.date).filter(Boolean).sort();
console.log('latest sample time:', times[times.length - 1]);
