/* 侧边栏分组与快捷入口一致性检查 */
const fs = require('fs'), vm = require('vm');
const path0 = require('path');
const ROOT = path0.resolve(__dirname, '..');
const src = fs.readFileSync(ROOT + '/js/app.js', 'utf8');

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n, e === undefined ? '' : JSON.stringify(e)); } }
function eq(n, a, b) { ok(n, a === b, { got: a, want: b }); }

// 从源码里抓 NAV_GROUPS / NAV_ITEMS 定义并 eval
const g = src.match(/var NAV_GROUPS = \[[\s\S]*?\n  \];/)[0];
const n = src.match(/var NAV_ITEMS = \[[\s\S]*?\n  \];/)[0];
const ctx = { ICONS: new Proxy({}, { get: () => 'ICON' }) };
vm.createContext(ctx);
vm.runInContext(g + '\n' + n, ctx);
const groups = ctx.NAV_GROUPS, items = ctx.NAV_ITEMS;

console.log('\n=== 1. 分组与顺序（指令 2.1） ===');
eq('分组数', groups.length, 7);
eq('分组顺序', groups.map(x => x.label).join(' / '), '工作台 / 日常执行 / 达人 / 内容 / 产品配置 / 数据分析 / 工具');
const expected = {
  workbench: ['首页'],
  execution: ['寄样任务', '任务清单', '邀约', '私信话术库', '样品', '履约追踪'],
  creator: ['达人', '名单库'],
  content: ['视频'],
  product: ['产品定位'],
  analysis: ['看板', '复盘', '日报'],
  tools: ['AI分析']
};
Object.keys(expected).forEach(k => {
  const got = items.filter(i => i.group === k).map(i => i.label);
  eq('分组 ' + groups.filter(x => x.id === k)[0].label, got.join(','), expected[k].join(','));
});

console.log('\n=== 2. 路由文件名不变、15 个菜单全在 ===');
eq('菜单总数', items.length, 15);
const routes = items.map(i => i.href).sort();
const want = ['index.html','task.html','todo.html','invite.html','message.html','sample.html','tracking.html',
  'creator.html','roster.html','video.html','product.html','dashboard.html','report.html','daily.html','ai-assistant.html'].sort();
eq('路由集合完全一致', routes.join(','), want.join(','));
ok('每个菜单都有 group', items.every(i => !!i.group));
ok('无重复路由', new Set(routes).size === routes.length);
ok('全部 enabled', items.every(i => i.enabled));

console.log('\n=== 3. 首页快捷入口名称 == 菜单名 ===');
const idx = fs.readFileSync(ROOT + '/index.html', 'utf8');
const labels = [...idx.matchAll(/<div class="quick-action__label">([^<]+)<\/div>/g)].map(m => m[1].trim());
eq('快捷入口数', labels.length, 4);
labels.forEach(l => ok('快捷入口「' + l + '」与菜单一致', items.some(i => i.label === l)));
const headerBtn = idx.match(/btn--primary btn--sm">([^<]+)</);
ok('页头按钮也是菜单名', headerBtn && items.some(i => i.label === headerBtn[1]), headerBtn && headerBtn[1]);

console.log('\n=== 4. SW 版本与新增文件 ===');
const sw = fs.readFileSync(ROOT + '/sw.js', 'utf8');
const _ver = (sw.match(/CACHE_VERSION = 'dlooda-tkbd-v(\d+)'/) || [])[1];
ok('CACHE_VERSION 已升级（≥ v60）', Number(_ver) >= 60, _ver);
['./login.html','./js/auth.js','./js/auth-config.js','./js/conversion.js','./css/conversion.css'].forEach(f => {
  ok('APP_SHELL 含 ' + f, sw.includes("'" + f + "'"));
});

console.log('\n=== 5. 看板 tab 注册一致 ===');
const dash = fs.readFileSync(ROOT + '/dashboard.html', 'utf8');
const dashjs = fs.readFileSync(ROOT + '/js/dashboard.js', 'utf8');
ok('dashboard.html 有出单转化 tab', dash.includes('data-target="section-conversion"'));
ok('dashboard.html 有 section 容器', dash.includes('id="section-conversion"'));
ok('dashboard.html 引入 conversion.js', dash.includes('js/conversion.js'));
ok('dashboard.html 引入 conversion.css', dash.includes('css/conversion.css'));
ok('dashboard.js sections 含 section-conversion', /var sections = \[[^\]]*'section-conversion'/.test(dashjs));
const sections = dashjs.match(/var sections = \[([^\]]+)\]/)[1].split(',').map(s => s.trim().replace(/'/g, ''));
const tabs = [...dash.matchAll(/data-target="(section-[^"]+)"/g)].map(m => m[1]);
eq('tab 数与 sections 数一致', tabs.length, sections.length);
ok('每个 tab 都有对应 section 元素', tabs.every(t => dash.includes('id="' + t + '"')));

console.log('\n=== 6. 本轮新增：改名 / 侧边栏退出 / 全局搜索 / 无注册入口 ===');
const authSrc = fs.readFileSync(ROOT + '/js/auth.js', 'utf8');
const msgHtml = fs.readFileSync(ROOT + '/message.html', 'utf8');
const prodHtml = fs.readFileSync(ROOT + '/product.html', 'utf8');
ok('侧边栏底部含退出登录按钮', src.indexOf('id="dlooda-logout"') >= 0);
ok('侧边栏显示当前登录用户', src.indexOf('当前登录：') >= 0);
ok('退出登录不再注入顶部右上角', authSrc.indexOf('dlooda-logout-top') < 0);
ok('auth.js 不再后置 append sidebar（避免被覆盖）', authSrc.indexOf('injectUserEntry') < 0);
ok('全局搜索入口在侧边栏', src.indexOf('id="dlooda-global-search"') >= 0);
ok('全局搜索支持达人/SKU/视频', /gsSearch/.test(src) && /getCreators/.test(src) && /getAvailableSKUs/.test(src) && /getVideos/.test(src));
ok('私信页标题已改名', msgHtml.indexOf('私信话术库') >= 0 && msgHtml.indexOf('私信管理') < 0);
ok('产品页标题保持新名', prodHtml.indexOf('产品定位') >= 0);
const htmls = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const regPages = htmls.filter(f => /立即注册|注册账号|申请开通|创建账号/.test(fs.readFileSync(ROOT + '/' + f, 'utf8')));
eq('全站无注册 / 申请开通入口', regPages.length, 0);

console.log('\n----------------------------------------');
console.log(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
