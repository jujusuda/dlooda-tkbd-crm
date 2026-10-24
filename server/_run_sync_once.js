'use strict';
// 一次性同步：加载 .env 凭据 + config.json 映射，直接调用 syncFromFeishu 覆盖 js/real-data.js
const fs = require('fs');
const path = require('path');
const sync = require('./sync');

const ROOT = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function loadEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  text.split(/\r?\n/).forEach(function (line) {
    line = line.trim();
    if (!line || line[0] === '#') return;
    const i = line.indexOf('=');
    if (i < 0) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) {
      v = v.slice(1, -1);
    }
    if (k && !(k in process.env)) process.env[k] = v;
  });
}
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(ROOT, '.env'));

const E = process.env;
cfg.feishu.appId = E.FEISHU_APP_ID || cfg.feishu.appId;
cfg.feishu.appSecret = E.FEISHU_APP_SECRET || cfg.feishu.appSecret;
cfg.feishu.baseAppToken = E.FEISHU_BASE_APP_TOKEN || cfg.feishu.baseAppToken;

(async function () {
  const r = await sync.syncFromFeishu(cfg, ROOT);
  console.log('SYNC OK ->', r.out);
  console.log('stats:', JSON.stringify(r.stats));
  console.log('counts:', JSON.stringify(r.counts));
})().catch(function (e) {
  console.error('SYNC FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
