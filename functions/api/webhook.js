// POST /api/webhook —— 供飞书多维表格「自动化」调用，触发从飞书拉取最新数据
// 飞书自动化：当记录变更/新增时，调用此 webhook -> 立即同步 KV
import { syncFromFeishu } from '../lib/sync.mjs';

export async function onRequestPost({ env, request }) {
  // 可选鉴权：若设置了 WEBHOOK_TOKEN 环境变量，则要求 URL 带 ?token=xxx
  if (env.WEBHOOK_TOKEN) {
    const url = new URL(request.url);
    if (url.searchParams.get('token') !== env.WEBHOOK_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  }
  try {
    const result = await syncFromFeishu(env);
    if (env.DATA) {
      await env.DATA.put('real-data.js', result.js);
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'KV 未绑定' }), {
        status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return new Response(JSON.stringify({ ok: true, stats: result.stats }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e && e.message) || e) }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

// 飞书自动化可能先发 OPTIONS 预检（某些版本），直接放行
export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
