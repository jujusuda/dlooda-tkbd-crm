// ================================================================
// Dlooda TKBD CRM — 名单库云端同步 (functions/api/roster.js)
// Cloudflare Pages Functions，KV 命名空间 env.DATA（与飞书同步共用）
// GET  /api/roster  → 读取整份名单库 JSON（无数据返回 null）
// POST /api/roster  → 整份覆盖保存（含 _updatedAt 时间戳）
// ================================================================

export async function onRequestGet({ env }) {
  try {
    const data = await env.DATA.get('roster-v1', 'json');
    return new Response(JSON.stringify(data || null), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'bad json' }), { status: 400 });
  }
  if (!body || typeof body !== 'object' || !body.settings) {
    return new Response(JSON.stringify({ ok: false, error: 'bad body' }), { status: 400 });
  }
  try {
    body._updatedAt = Date.now();
    await env.DATA.put('roster-v1', JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, _updatedAt: body._updatedAt }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
