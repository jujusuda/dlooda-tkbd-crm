/* ================================================================
   Dlooda TKBD CRM — 登录守卫 / 会话 / 退出登录
   ----------------------------------------------------------------
   ⚠️ 纯前端门禁，可被绕过，仅用于内部小团队基础访问控制。
      账号清单见 js/auth-config.js（独立文件，本文件不含任何密码）。
   用法：所有页面 <head> 内、其它脚本之前同步引入本文件：
      <script src="js/auth-config.js"></script>
      <script src="js/auth.js"></script>
   ================================================================ */
(function (global) {
  'use strict';

  var CFG = global.DLOODA_AUTH_CONFIG || {};
  var KEY = CFG.storageKey || 'dlooda_auth_session';
  var HOURS = CFG.sessionHours || (24 * 7);
  var LOGIN_PAGE = 'login.html';

  function currentFile() {
    var p = (global.location.pathname || '').split('/').pop() || 'index.html';
    return p.toLowerCase();
  }

  /* ---------- 同步 SHA-256（不依赖 crypto.subtle，http/file 环境也能用） ---------- */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function utf8Bytes(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    return out;
  }

  function sha256(msg) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = utf8Bytes(msg);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // 长度按 64bit 大端写入（这里只用低 32bit，足够覆盖输入规模）
    bytes.push(0, 0, 0, 0,
      (bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

    var w = new Array(64), a, b, c, d, e, f, g, h, i, t1, t2, s0, s1, ch, maj;
    for (var off = 0; off < bytes.length; off += 64) {
      for (i = 0; i < 16; i++) {
        w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
               (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
        w[i] = w[i] >>> 0;
      }
      for (i = 16; i < 64; i++) {
        s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
      for (i = 0; i < 64; i++) {
        s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        ch = (e & f) ^ (~e & g);
        t1 = (h + s1 + ch + K[i] + w[i]) >>> 0;
        s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        maj = (a & b) ^ (a & c) ^ (b & c);
        t2 = (s0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  /* ---------- 会话 ---------- */
  function readSession() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.username || !s.exp || Date.now() > s.exp) {
        global.localStorage.removeItem(KEY);
        return null;
      }
      return s;
    } catch (e) { return null; }
  }

  function writeSession(username, display) {
    var s = { username: username, display: display || username, exp: Date.now() + HOURS * 3600 * 1000 };
    global.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }

  function clearSession() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ---------- 校验 ---------- */
  function localVerify(username, password) {
    var accounts = CFG.accounts || [];
    var hash = sha256((CFG.salt || '') + password);
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].username === username && accounts[i].passwordHash === hash) {
        return { ok: true, display: accounts[i].display || username };
      }
    }
    return { ok: false, message: '账号或密码错误' };
  }

  function backendVerify(username, password) {
    return fetch(CFG.backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
      if (r.ok && j.ok) return { ok: true, display: j.display || username };
      return { ok: false, message: j.message || '账号或密码错误' };
    }); }).catch(function () { return { ok: false, message: '登录服务不可用，请稍后再试' }; });
  }

  function verify(username, password) {
    if (CFG.backendUrl) return backendVerify(username, password);
    return Promise.resolve(localVerify(username, password));
  }

  /* ---------- 退出登录 ---------- */
  function logout() {
    clearSession();
    global.location.replace(LOGIN_PAGE);
  }

  /* ---------- 页面内的「用户 / 退出登录」入口 ---------- */
  function injectUserEntry() {
    var s = readSession();
    if (!s) return;

    // 侧边栏：当前用户 + 退出按钮
    var sidebar = document.querySelector('.sidebar');
    if (sidebar && !document.getElementById('dlooda-logout')) {
      var wrap = document.createElement('div');
      wrap.className = 'sidebar__footer';
      wrap.innerHTML = '<div class="sidebar__user" title="' + escapeAttr(s.display) + '">当前登录：' + escapeAttr(s.display) + '</div>'
        + '<button type="button" class="sidebar__logout" id="dlooda-logout">退出登录</button>';
      sidebar.appendChild(wrap);
      var btn = document.getElementById('dlooda-logout');
      if (btn) btn.addEventListener('click', logout);
    }

    // 顶部右侧：移动端也能退出
    var actions = document.querySelector('.page-header__actions');
    if (actions && !document.getElementById('dlooda-logout-top')) {
      var top = document.createElement('button');
      top.type = 'button';
      top.id = 'dlooda-logout-top';
      top.className = 'btn btn--ghost btn--sm';
      top.textContent = '退出登录';
      top.style.marginLeft = '8px';
      top.addEventListener('click', logout);
      actions.appendChild(top);
    }
  }

  function escapeAttr(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 守卫（同步执行，避免先闪一下页面） ---------- */
  function guard() {
    if (currentFile() === LOGIN_PAGE) return;          // 登录页自身不拦截
    if (readSession()) return;
    var here = global.location.pathname + global.location.search + global.location.hash;
    // 只保留相对路径，避免把域名带进 redirect
    var rel = here.replace(/^.*\//, '');
    if (!rel || rel.indexOf('login.html') === 0) rel = 'index.html';
    global.location.replace(LOGIN_PAGE + '?redirect=' + encodeURIComponent(rel));
  }

  guard();

  global.DloodaAuth = {
    hash: function (plain) { return sha256((CFG.salt || '') + plain); },
    verify: verify,
    login: function (username, display) { return writeSession(username, display); },
    logout: logout,
    getSession: readSession,
    isLoggedIn: function () { return !!readSession(); },
    config: CFG
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUserEntry);
  } else {
    injectUserEntry();
  }
})(window);
