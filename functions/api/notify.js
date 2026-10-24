// POST /api/notify —— 提醒邮件推送（可选通道）
// 使用 Resend HTTP API（Cloudflare Workers 不支持 SMTP 直连）
// 需在 Cloudflare Pages 环境变量里配置：
//   RESEND_API_KEY  必填，Resend 的 API Key
//   MAIL_FROM      选填，发件人，默认 "Dlooda TKBD <onboarding@resend.dev>"
//   MAIL_TO        选填，默认收件人（前端未指定 to 时使用）
// 未配置时返回 ok:false，前端自动降级为「仅界面提醒」，不影响其他功能

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: '请求体不是合法 JSON' }, 400);
  }

  const to = (body.to || env.MAIL_TO || '').trim();
  const subject = (body.subject || 'Dlooda TKBD 提醒').trim();
  const text = body.text || '';

  if (!to) return json({ ok: false, error: '缺少收件邮箱' }, 400);

  const key = env.RESEND_API_KEY;
  if (!key) {
    return json({
      ok: false,
      error: '邮件通道未配置：请在 Cloudflare Pages 环境变量中设置 RESEND_API_KEY',
    }, 200);
  }

  const from = (env.MAIL_FROM || 'Dlooda TKBD <onboarding@resend.dev>').trim();

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({ from: from, to: [to], subject: subject, text: text }),
    });

    const j = await r.json().catch(function () { return {}; });

    if (!r.ok) {
      return json({
        ok: false,
        error: '邮件发送失败：' + ((j && (j.message || j.name)) || ('HTTP ' + r.status)),
      }, 200);
    }
    return json({ ok: true, id: (j && j.id) || null });
  } catch (e) {
    return json({ ok: false, error: '邮件发送异常：' + String((e && e.message) || e) }, 200);
  }
}
