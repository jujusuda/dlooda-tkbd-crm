// 飞书开放平台 OpenAPI 客户端（Cloudflare Workers / Pages Functions 版，使用 fetch，无外部依赖）
const BASE = 'https://open.feishu.cn';

export async function getTenantToken(appId, appSecret) {
  const r = await fetch(BASE + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const body = await r.json();
  if (!body || body.code !== 0) throw new Error('获取 tenant_access_token 失败: ' + JSON.stringify(body));
  return body.tenant_access_token;
}

// 分页拉取某张表全部记录
export async function listRecords(token, appToken, tableId) {
  const out = [];
  let pageToken = '';
  do {
    const qs = 'page_size=500' + (pageToken ? '&page_token=' + encodeURIComponent(pageToken) : '');
    const url = BASE + '/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records?' + qs;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const body = await r.json();
    if (!body || body.code !== 0) throw new Error('读取记录失败(' + tableId + '): ' + JSON.stringify(body));
    const items = (body.data && body.data.items) || [];
    items.forEach((it) => out.push(it));
    pageToken = (body.data && body.data.has_more) ? body.data.page_token : '';
  } while (pageToken);
  return out;
}

// 更新一条记录（CRM -> 飞书写回）
export async function updateRecord(token, appToken, tableId, recordId, fields) {
  const url = BASE + '/open-apis/bitable/v1/apps/' + appToken + '/tables/' + tableId + '/records/' + recordId;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ fields }),
  });
  const body = await r.json();
  if (!body || body.code !== 0) throw new Error('更新记录失败(' + tableId + '/' + recordId + '): ' + JSON.stringify(body));
  return body.data;
}
