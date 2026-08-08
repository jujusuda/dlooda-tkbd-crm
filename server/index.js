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

// 允许用环境变量注入密钥（PaaS 部署时避免把 App Secret 写进仓库）
if (process.env.FEISHU_APP_ID) cfg.feishu.appId = process.env.FEISHU_APP_ID;
if (process.env.FEISHU_APP_SECRET) cfg.feishu.appSecret = process.env.FEISHU_APP_SECRET;
if (process.env.FEISHU_BASE_TOKEN) cfg.feishu.baseAppToken = process.env.FEISHU_BASE_TOKEN;

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

server.listen(PORT, HOST, () => {
  console.log('Dlooda TKBD sync server -> http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT);
});
