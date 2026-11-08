// POST /api/sync —— 从飞书拉取 7 张表（含可选「全量视频」），生成 real-data.js 并存入 KV
import { syncFromFeishu } from '../lib/sync.mjs';

export async function onRequestPost({ env }) {
  try {
    const result = await syncFromFeishu(env);
    if (env.DATA) {
      await env.DATA.put('real-data.js', result.js);
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'KV 命名空间 DATA 未绑定' }), {
        status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      stats: result.stats,
      counts: result.counts,
      warnings: result.warnings || [],
    }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e && e.message) || e) }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
