'use strict';
// 飞书开放平台 OpenAPI 客户端（Node 内置 https，无外部依赖）
const https = require('https');

const BASE = 'https://open.feishu.cn';

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      method: method,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (e) { json = { raw: data }; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// 获取 tenant_access_token（企业内部自建应用）
async function getTenantToken(appId, appSecret) {
  const r = await request('POST', BASE + '/open-apis/auth/v3/tenant_access_token/internal', {}, { app_id: appId, app_secret: appSecret });
  if (!r.body || r.body.code !== 0) throw new Error('获取 tenant_access_token 失败: ' + JSON.stringify(r.body));
  return r.body.tenant_access_token;
}

// 分页拉取某张表全部记录
async function listRecords(token, appToken, tableId) {
  const out = [];
  let pageToken = '';
  do {
    const qs = 'page_size=500' + (pageToken ? '&page_token=' + encodeURIComponent(pageToken) : '');
    const url = BASE + '/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records?' + qs;
    const r = await request('GET', url, { Authorization: 'Bearer ' + token });
    if (!r.body || r.body.code !== 0) throw new Error('读取记录失败(' + tableId + '): ' + JSON.stringify(r.body));
    const items = (r.body.data && r.body.data.items) ? r.body.data.items : [];
    items.forEach((it) => out.push(it));
    pageToken = (r.body.data && r.body.data.has_more) ? r.body.data.page_token : '';
  } while (pageToken);
  return out;
}

// 更新一条记录
async function updateRecord(token, appToken, tableId, recordId, fields) {
  const url = BASE + '/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records/' + recordId;
  const r = await request('PUT', url, { Authorization: 'Bearer ' + token }, { fields: fields });
  if (!r.body || r.body.code !== 0) throw new Error('更新记录失败(' + tableId + '/' + recordId + '): ' + JSON.stringify(r.body));
  return r.body.data;
}

// 新建一条记录
async function createRecord(token, appToken, tableId, fields) {
  const url = BASE + '/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records';
  const r = await request('POST', url, { Authorization: 'Bearer ' + token }, { fields: fields });
  if (!r.body || r.body.code !== 0) throw new Error('创建记录失败(' + tableId + '): ' + JSON.stringify(r.body));
  return r.body.data;
}

module.exports = { getTenantToken, listRecords, updateRecord, createRecord, BASE };
