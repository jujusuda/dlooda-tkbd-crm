// 兜底路由：/js/real-data.js 优先用仓库最新静态文件（随代码一起提交、由本地 server/sync.js 生成并验证的正确数据），KV 仅作缺失兜底
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === '/js/real-data.js') {
    // 优先仓库静态文件——这是本地用 server/sync.js（UTC+8 时区）生成并已验证的正确数据，
    // 避免被 KV 里时区错位/滞后的版本覆盖。
    try {
      const staticRes = await env.ASSETS.fetch(request);
      if (staticRes && staticRes.status === 200) {
        const buf = await staticRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
    } catch (e) { /* 静态文件缺失时回落到 KV */ }
    // 静态缺失时回退 KV
    try {
      const kv = await env.DATA.get('real-data.js');
      if (kv) {
        return new Response(kv, {
          headers: {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
    } catch (e) { /* KV 未绑定时回落到静态资源 */ }
  }
  // 其他所有请求（HTML/JS/CSS/sw.js 等）走 Pages 静态资源
  return env.ASSETS.fetch(request);
}
