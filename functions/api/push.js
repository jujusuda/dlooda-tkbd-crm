// POST /api/push —— 把 CRM 里的修改写回飞书（双向联通）
import { getTenantToken, updateRecord } from '../lib/feishu.mjs';
import cfg from '../../server/config.json';

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const f = {
      appId: env.FEISHU_APP_ID,
      appSecret: env.FEISHU_APP_SECRET,
      baseAppToken: env.FEISHU_BASE_TOKEN,
    };
    if (!f.appId || !f.appSecret || !f.baseAppToken) return json({ ok: false, error: '飞书凭据未配置' }, 400);
    if (!body.table || !body.recordId || !body.fields) return json({ ok: false, error: '需要 table / recordId / fields' }, 400);
    const tid = cfg.feishu.tables[body.table] && cfg.feishu.tables[body.table].tableId;
    if (!tid) return json({ ok: false, error: '未配置该表: ' + body.table }, 400);
    const token = await getTenantToken(f.appId, f.appSecret);
    const data = await updateRecord(token, f.baseAppToken, tid, body.recordId, body.fields);
    return json({ ok: true, data });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}
