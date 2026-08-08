// 兜底路由：优先用 KV 里的 real-data.js 覆盖静态文件，其余直接由 Pages 静态资源提供
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === '/js/real-data.js') {
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
    } catch (e) { /* KV 未绑定时回落到静态文件 */ }
  }
  // 其他所有请求（HTML/JS/CSS/sw.js 等）走 Pages 静态资源
  return env.ASSETS.fetch(request);
}
