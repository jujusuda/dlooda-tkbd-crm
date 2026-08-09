'use strict';
// Dlooda TKBD 同步后端：托管前端静态文件 + 飞书同步/写回接口
const http = require('http');
const fs = require('fs');
const path = require('path');
const sync = require('./sync');
const feishu = require('./feishu');

const ROOT = path.join(__dirname, '..');
const cfgPath = path.join(__dirname, 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

// ---- 零依赖 .env 加载器 ----
// 密钥只放在被 .gitignore 忽略的 .env 里，永远不写进 config.json（仓库是 public）
// 优先级：真实环境变量 > server/.env > 项目根 .env
function loadEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return false; }
  text.split(/\r?\n/).forEach(function (line) {
    line = line.trim();
    if (!line || line.charAt(0) === '#') return;
    const i = line.indexOf('=');
    if (i < 0) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    // 去掉可能包裹的引号
    if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) {
      v = v.slice(1, -1);
    }
    if (k && !(k in process.env)) process.env[k] = v;
  });
  return true;
}
const envLoaded = [];
if (loadEnvFile(path.join(__dirname, '.env'))) envLoaded.push('server/.env');
if (loadEnvFile(path.join(ROOT, '.env'))) envLoaded.push('.env');

// 允许用环境变量注入密钥（PaaS 部署时避免把 App Secret 写进仓库）
// 同时兼容 FEISHU_* 与 LARK_* 两套命名，以及 BASE_TOKEN / BASE_APP_TOKEN 两种写法
const E = process.env;
const envAppId = E.FEISHU_APP_ID || E.LARK_APP_ID;
const envSecret = E.FEISHU_APP_SECRET || E.LARK_APP_SECRET;
const envBase = E.FEISHU_BASE_APP_TOKEN || E.FEISHU_BASE_TOKEN || E.LARK_BASE_APP_TOKEN || E.LARK_BASE_TOKEN;
if (envAppId) cfg.feishu.appId = envAppId;
if (envSecret) cfg.feishu.appSecret = envSecret;
if (envBase) cfg.feishu.baseAppToken = envBase;

const PORT = process.env.PORT || (cfg.server && cfg.server.port) || 3000;
const HOST = (cfg.server && cfg.server.host) || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.manifest': 'application/manifest+json',
};

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = req.url;
  try {
    if (u.startsWith('/api/')) {
      if (u === '/api/status' && req.method === 'GET') {
        const f = cfg.feishu || {};
        sendJSON(res, 200, {
          configured: !!(f.appId && f.appSecret && f.baseAppToken),
          hasAppId: !!f.appId, hasSecret: !!f.appSecret, hasBase: !!f.baseAppToken,
          tables: Object.keys((f.tables) || {}).map((k) => ({ name: k, tableId: (f.tables[k] && f.tables[k].tableId) || '' })),
        });
        return;
      }
      if (u === '/api/sync' && req.method === 'POST') {
        const r = await sync.syncFromFeishu(cfg, ROOT);
        sendJSON(res, 200, { ok: true, file: r.out, stats: r.stats, counts: r.counts });
        return;
      }
      if (u === '/api/push' && req.method === 'POST') {
        const body = await readBody(req);
        const f = cfg.feishu;
        if (!f.appId || !f.appSecret || !f.baseAppToken) { sendJSON(res, 400, { ok: false, error: '飞书凭据未配置' }); return; }
        if (!body.table || !body.recordId || !body.fields) { sendJSON(res, 400, { ok: false, error: '需要 table / recordId / fields' }); return; }
        const tid = (f.tables[body.table] && f.tables[body.table].tableId);
        if (!tid) { sendJSON(res, 400, { ok: false, error: '未配置该表: ' + body.table }); return; }
        const token = await feishu.getTenantToken(f.appId, f.appSecret);
        const data = await feishu.updateRecord(token, f.baseAppToken, tid, body.recordId, body.fields);
        sendJSON(res, 200, { ok: true, data });
        return;
      }
      sendJSON(res, 404, { ok: false, error: 'unknown api' });
      return;
    }
    serveStatic(req, res, u);
  } catch (e) {
    sendJSON(res, 500, { ok: false, error: String((e && e.message) || e) });
  }
});

function mask(v) {
  if (!v) return '\x1b[31m(未配置)\x1b[0m';
  return '\x1b[32m' + String(v).slice(0, 4) + '****(len ' + String(v).length + ')\x1b[0m';
}

server.listen(PORT, HOST, () => {
  const f = cfg.feishu || {};
  console.log('Dlooda TKBD sync server -> http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT);
  console.log('  .env 已加载: ' + (envLoaded.length ? envLoaded.join(' + ') : '(无 .env 文件，仅用系统环境变量)'));
  console.log('  appId        : ' + mask(f.appId));
  console.log('  appSecret    : ' + mask(f.appSecret));
  console.log('  baseAppToken : ' + mask(f.baseAppToken));
  const ok = !!(f.appId && f.appSecret && f.baseAppToken);
  console.log('  同步状态     : ' + (ok ? '\x1b[32m已就绪，可拉取/写回飞书\x1b[0m' : '\x1b[33m凭据不全，/api/sync 与 /api/push 会报错\x1b[0m'));
});
