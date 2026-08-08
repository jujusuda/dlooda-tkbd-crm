// GET /api/status —— 返回后端是否配置好、KV 里是否已有同步数据
export async function onRequestGet({ env }) {
  const configured = !!(env.FEISHU_APP_ID && env.FEISHU_APP_SECRET && env.FEISHU_BASE_TOKEN);
  let synced = false;
  try {
    const v = await env.DATA.get('real-data.js');
    synced = !!v;
  } catch (e) { /* KV 未绑定时不报错 */ }
  return new Response(JSON.stringify({ configured, synced }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
