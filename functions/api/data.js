// GET /api/data —— 从 Cloudflare KV 读取最新 real-data.js（飞书同步后写入的内容）
// 前端 data.js 在加载时优先取这里的数据，覆盖仓库静态兜底文件，
// 这样「点同步飞书」后刷新页面即可看到最新数据，无需重新部署。
export async function onRequestGet({ env }) {
  if (!env.DATA) {
    return new Response('/* KV 命名空间 DATA 未绑定 */', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }
  const data = await env.DATA.get('real-data.js', 'text');
  if (!data) {
    // KV 里还没有同步过数据 → 返回空，前端回退到仓库静态 real-data.js
    return new Response('/* no real-data in KV yet */', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response(data, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
