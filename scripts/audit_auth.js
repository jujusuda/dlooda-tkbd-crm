/* 登录模块回归测试 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const path0 = require('path');
const ROOT = path0.resolve(__dirname, '..');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n, e === undefined ? '' : JSON.stringify(e)); } }
function eq(n, a, b) { ok(n, a === b, { got: a, want: b }); }

function makeSandbox(file, store) {
  const redirects = [];
  const sb = {
    console, Promise, Date, Math, Number, String, Object, Array, JSON, RegExp, Error, isNaN, setTimeout,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    location: { pathname: '/' + file, search: '', hash: '', replace: u => redirects.push(u) },
    document: {
      readyState: 'loading',
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      createElement: () => ({ style: {}, appendChild: () => {}, addEventListener: () => {} })
    },
    fetch: () => Promise.reject(new Error('no network')),
    __redirects: redirects
  };
  sb.window = sb; sb.global = sb; sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/auth-config.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/auth.js'), 'utf8'), sb);
  return sb;
}

console.log('\n=== 1. SHA-256 与配置里的哈希一致 ===');
let s1 = makeSandbox('login.html', {});
eq('admin 密码哈希', s1.DloodaAuth.hash('dlooda2026'), s1.DLOODA_AUTH_CONFIG.accounts[0].passwordHash);
eq('bd 密码哈希', s1.DloodaAuth.hash('bd2026'), s1.DLOODA_AUTH_CONFIG.accounts[1].passwordHash);
ok('错误密码哈希不同', s1.DloodaAuth.hash('wrong') !== s1.DLOODA_AUTH_CONFIG.accounts[0].passwordHash);

console.log('\n=== 2. 未登录访问任意页面 → 跳登录并带回原页 ===');
[['index.html', 'index.html'], ['dashboard.html', 'dashboard.html'],
 ['report.html?view=trend', 'report.html?view=trend'], ['video.html#top', 'video.html#top']].forEach(([f, want]) => {
  const sb = makeSandbox(f, {});
  eq('跳转 ' + f, sb.__redirects[0], 'login.html?redirect=' + encodeURIComponent(want));
});
const sbLogin = makeSandbox('login.html', {});
eq('登录页自身不跳转', sbLogin.__redirects.length, 0);

console.log('\n=== 3. 已登录不跳转（刷新不掉线） ===');
const store = {};
const sbA = makeSandbox('dashboard.html', store);
sbA.DloodaAuth.login('admin', '管理员');
const sbB = makeSandbox('report.html', store);
eq('带会话访问不跳转', sbB.__redirects.length, 0);
eq('会话用户名', sbB.DloodaAuth.getSession().username, 'admin');
eq('isLoggedIn', sbB.DloodaAuth.isLoggedIn(), true);

console.log('\n=== 4. 退出登录清会话 ===');
sbB.DloodaAuth.logout();
eq('会话已清', sbB.DloodaAuth.isLoggedIn(), false);
eq('退出跳登录页', sbB.__redirects[0], 'login.html');
const sbC = makeSandbox('index.html', store);
eq('退出后访问被拦截', sbC.__redirects[0], 'login.html?redirect=' + encodeURIComponent('index.html'));

console.log('\n=== 5. 会话过期失效 ===');
const store2 = {};
const sbD = makeSandbox('index.html', store2);
sbD.DloodaAuth.login('bd', 'BD 团队');
const raw = JSON.parse(store2['dlooda_auth_session']);
raw.exp = Date.now() - 1000;
store2['dlooda_auth_session'] = JSON.stringify(raw);
const sbE = makeSandbox('index.html', store2);
eq('过期会话视为未登录', sbE.DloodaAuth.isLoggedIn(), false);
eq('过期后跳转', sbE.__redirects[0], 'login.html?redirect=' + encodeURIComponent('index.html'));

console.log('\n=== 6. 账号校验（正确/错误/不存在） ===');
(async () => {
  const sb = makeSandbox('login.html', {});
  const a = await sb.DloodaAuth.verify('admin', 'dlooda2026');
  eq('正确账号 ok', a.ok, true);
  eq('正确账号显示名', a.display, '管理员');
  const b = await sb.DloodaAuth.verify('admin', 'wrong');
  eq('错误密码 ok', b.ok, false);
  eq('错误密码提示', b.message, '账号或密码错误');
  const c = await sb.DloodaAuth.verify('nobody', 'x');
  eq('不存在账号 ok', c.ok, false);

  console.log('\n=== 7. 后端接口预留位置 ===');
  const sb2 = makeSandbox('login.html', {});
  sb2.DLOODA_AUTH_CONFIG.backendUrl = '/api/auth/login';
  let posted = null;
  sb2.fetch = (url, opt) => { posted = { url, body: JSON.parse(opt.body) }; return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, display: '后端用户' }) }); };
  const d = await sb2.DloodaAuth.verify('someone', 'pw');
  eq('走后端校验', posted && posted.url, '/api/auth/login');
  eq('后端返回显示名', d.display, '后端用户');

  console.log('\n----------------------------------------');
  console.log(`PASS ${pass} / FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
})();
