/* ================================================================
   Dlooda TKBD CRM — 登录账号配置（独立可维护文件）
   ----------------------------------------------------------------
   ⚠️ 安全说明（务必保留）：
   1. 当前站点是纯静态 pages.dev，纯前端登录只能当「基础门禁」，
      任何人都可绕过。若达人 / 订单数据需要严格保密，必须接后端鉴权
      或飞书账号登录。
   2. 因此这里只存「密码哈希」，不存明文；哈希与 salt 仍会随前端代码
      下发，不能视为安全凭证。
   3. backendUrl 留空 = 使用本地账号清单；填入后端校验接口地址后，
      login.html 会优先走后端校验（预留位置，接口约定见文件末尾）。
   4. 修改账号后无需改其它代码；加盐哈希可用 DloodaAuth.hash('新密码')
      在控制台生成后填回此处。
   ================================================================ */
(function (global) {
  'use strict';

  global.DLOODA_AUTH_CONFIG = {
    /* 会话存储的 key 与有效期（小时）；刷新不掉线，到期或点退出才失效 */
    storageKey: 'dlooda_auth_session',
    sessionHours: 24 * 7,

    /* 加盐前缀：改这里会让所有旧密码失效，需同步重算哈希 */
    salt: 'dlooda-tkbd-crm-2026',

    /* 后端鉴权接口（预留）。填了就走后端，例如 '/api/auth/login' */
    backendUrl: '',

    /* 账号清单：username 登录名 / display 显示名 / passwordHash = SHA-256(salt + 密码) */
    accounts: [
      { username: 'admin', display: '管理员',   passwordHash: '1adfa299068ec1d747c0c769ab5a9444629feb5516831c7a710c4ae8fddd9c36' },
      { username: 'bd',    display: 'BD 团队',  passwordHash: '7d92df7c030d3b3d0f88b422283eabb2dc43645adc30c3c2b1f8f5ec0a819179' }
    ]
  };

  /* 后端接口约定（预留，未启用）：
     POST backendUrl  { username, password }
     成功 200 -> { ok: true, display: '显示名' }
     失败 401 -> { ok: false, message: '账号或密码错误' }
     login.html 只在 backendUrl 非空时调用，否则用上面的本地清单校验。 */
})(window);
