/* 登录模块回归测试 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const path0 = require('path');
const ROOT = path0.resolve(__dirname, '..');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n, e === undefined ? '' : JSON.stringify(e)); } }
function eq(n, a, b) { ok(n, a === b, { got: a, want: b }); }

function makeSandbox(file, store, opts) {
  opts = opts || {};
  const redirects = [];
  const hopStore = opts.sessionStore || {};
  const mkStore = o => ({
    getItem: k => (k in o ? o[k] : null),
    setItem: (k, v) => { o[k] = String(v); },
    removeItem: k => { delete o[k]; }
  });
  const sb = {
    console, Promise, Date, Math, Number, String, Object, Array, JSON, RegExp, Error, isNaN, setTimeout, parseInt,
    localStorage: mkStore(store),
    sessionStorage: mkStore(hopStore),
    location: { pathname: '/' + file, search: opts.search || '', hash: opts.hash || '', replace: u => redirects.push(u) },
    document: {
      readyState: 'loading',
      documentElement: { getAttribute: a => (a === 'data-auth-page' ? (opts.authPage || null) : null) },
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
  if (opts.loginFlag) sb.__DLOODA_LOGIN_PAGE__ = true;
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

  console.log('\n=== 8. Cloudflare pretty URLs：/login.html 308 → /login 不得死循环 ===');
  [['login', ''], ['login', '?redirect=index.html'],
   ['login', '?redirect=login%3Fredirect%3Dindex.html'],
   ['login.html', ''], ['LOGIN', '']].forEach(([f, q]) => {
    const sb = makeSandbox(f, {}, { search: q });
    eq('未登录访问 /' + f + q + ' 不再跳转', sb.__redirects.length, 0);
  });
  const sbFlag = makeSandbox('some-page', {}, { loginFlag: true });
  eq('全局标记 __DLOODA_LOGIN_PAGE__ 生效', sbFlag.__redirects.length, 0);
  const sbAttr = makeSandbox('some-page', {}, { authPage: 'login' });
  eq('<html data-auth-page=login> 生效', sbAttr.__redirects.length, 0);

  console.log('\n=== 9. 回跳目标清洗（杜绝嵌套 redirect） ===');
  const sbNest = makeSandbox('dashboard.html', {}, { search: '?redirect=login%3Fredirect%3Dindex.html' });
  eq('嵌套 redirect 清洗为首页', sbNest.__redirects[0],
     'login.html?redirect=' + encodeURIComponent('index.html'));
  const sbSelf = makeSandbox('login', {}, { search: '?redirect=whatever', authPage: null });
  eq('登录页本身不参与回跳清洗', sbSelf.__redirects.length, 0);
  eq('safeRedirect 保留普通带参页面', s1.DloodaAuth.safeRedirect('/report.html?view=trend'), 'report.html?view=trend');
  eq('safeRedirect 拦截 login 目标', s1.DloodaAuth.safeRedirect('/login?redirect=x'), 'index.html');

  console.log('\n=== 10. 熔断：连续跳转超过 3 次强制停止 ===');
  const sharedHop = {};
  for (let i = 1; i <= 5; i++) {
    const sb = makeSandbox('dashboard.html', {}, { sessionStore: sharedHop });
    if (i <= 3) ok('第 ' + i + ' 次仍正常跳转', sb.__redirects.length === 1);
    else eq('第 ' + i + ' 次熔断（不再跳）', sb.__redirects.length, 0);
  }

  console.log('\n=== 11. 回跳地址不得出现 ".html?" 拼接错误（?reset=1 入口） ===');
  eq('safeRedirect 纯查询串补首页', s1.DloodaAuth.safeRedirect('/?reset=1'), 'index.html?reset=1');
  eq('safeRedirect 根路径', s1.DloodaAuth.safeRedirect('/'), 'index.html');

  // 从 login.html 里抽出 redirectTarget() 独立执行，覆盖真实内联逻辑
  const loginHtml = fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8');
  const fnStart = loginHtml.indexOf('function redirectTarget()');
  const brace = loginHtml.indexOf('{', fnStart);
  let depth = 0, fnEnd = -1;
  for (let i = brace; i < loginHtml.length; i++) {
    if (loginHtml[i] === '{') depth++;
    else if (loginHtml[i] === '}' && --depth === 0) { fnEnd = i + 1; break; }
  }
  const fnSrc = loginHtml.slice(fnStart, fnEnd);
  const runRT = raw => {
    const sb = { location: { search: raw === null ? '' : '?redirect=' + encodeURIComponent(raw) } };
    vm.createContext(sb);
    return vm.runInContext(fnSrc + '\nredirectTarget();', sb);
  };
  ok('成功抽取 redirectTarget', fnEnd > fnStart);
  [['index.html?reset=1', 'index.html?reset=1'], ['?reset=1', 'index.html?reset=1'],
   ['dashboard', 'dashboard.html'], ['dashboard?view=x', 'dashboard.html?view=x'],
   ['report.html?view=trend', 'report.html?view=trend'],
   ['login?redirect=x', 'index.html'], ['', 'index.html'],
   ['https://evil.com', 'index.html']].forEach(([raw, want]) => {
    eq('redirectTarget(' + JSON.stringify(raw) + ')', runRT(raw), want);
  });

  console.log('\n----------------------------------------');
  console.log(`PASS ${pass} / FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
})();
