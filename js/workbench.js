/* ================================================================
   Dlooda TKBD CRM — 首页工作台（指令模块 A）
   A1 结果指标卡 / A2 TOP 达人排序 / A3 待办聚合 / A4 月度目标线
   数据来源严格分两类：现有库直接算；上传表口径没传表一律「暂无数据」。
   样式自包含注入，沿用现有商务风 token，不引入新色系/渐变。
   ================================================================ */
(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Results = global.DloodaResults;
  var GOAL_KEY = 'dlooda_monthly_goals';
  var SORT_KEY = 'dlooda_top_sort';

  var CSS = [
    '.wb-block{background:var(--bg-card);border:1px solid var(--border-1);border-radius:var(--r-md);padding:14px 16px;margin:0 0 16px;}',
    '.wb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;}',
    '.wb-title{font-size:14px;font-weight:700;color:var(--text-1);margin:0;}',
    '.wb-sub{font-size:10px;color:var(--text-3);}',
    '.wb-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}',
    '@media(max-width:900px){.wb-metrics{grid-template-columns:repeat(3,minmax(0,1fr));}}',
    '@media(max-width:560px){.wb-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}',
    '.wb-metric{background:var(--bg-2);border:1px solid var(--border-1);border-radius:var(--r-sm);padding:10px 11px;min-width:0;}',
    '.wb-metric__label{font-size:10px;color:var(--text-2);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.wb-metric__src{font-size:9px;color:var(--text-3);font-weight:400;margin-left:4px;}',
    '.wb-metric__value{font-size:20px;font-weight:700;color:var(--text-1);margin:5px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.wb-metric--empty .wb-metric__value{font-size:13px;color:var(--text-3);}',
    '.wb-delta{font-size:10px;font-weight:600;}',
    '.wb-delta--up{color:var(--c-success);}.wb-delta--down{color:var(--c-danger);}.wb-delta--none{color:var(--text-3);font-weight:400;}',
    '.wb-goalbar{height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden;margin-top:8px;}',
    '.wb-goalbar__fill{height:100%;background:var(--c-primary);border-radius:3px;}',
    '.wb-goaltext{font-size:9px;color:var(--text-3);margin-top:4px;}',
    '.wb-goals{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 14px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border-1);}',
    '.wb-goals label{display:flex;flex-direction:column;gap:4px;font-size:10px;font-weight:600;color:var(--text-2);}',
    '.wb-goals input{padding:6px 9px;border:1px solid var(--border-2);border-radius:var(--r-sm);background:#fff;color:var(--text-1);font-size:11px;font-family:inherit;min-width:130px;}',
    '.wb-todos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px;}',
    '@media(max-width:760px){.wb-todos{grid-template-columns:1fr;}}',
    '.wb-todo{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border:1px solid var(--border-1);border-radius:var(--r-sm);background:var(--bg-2);text-decoration:none;color:var(--text-1);}',
    '.wb-todo:hover{border-color:var(--pink-400);}',
    '.wb-todo__label{font-size:11px;font-weight:600;}',
    '.wb-todo__hint{font-size:9px;color:var(--text-3);margin-top:2px;}',
    '.wb-todo__num{font-size:19px;font-weight:700;color:var(--pink-600);}',
    '.wb-sort{border:1px solid var(--border-2);border-radius:var(--r-sm);background:#fff;color:var(--text-1);font-size:11px;font-family:inherit;padding:5px 8px;}',
    '.wb-note{padding:18px;text-align:center;color:var(--text-3);font-size:11px;}'
  ].join('');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function loadGoals() {
    try {
      var g = App && App.loadStorage ? App.loadStorage(GOAL_KEY, {}) : {};
      return { gmv: Number(g.gmv) || 0, units: Number(g.units) || 0 };
    } catch (e) { return { gmv: 0, units: 0 }; }
  }
  function saveGoals(g) {
    try { if (App && App.saveStorage) App.saveStorage(GOAL_KEY, g); } catch (e) {}
  }
  function injectCss() {
    if (document.getElementById('wb-style')) return;
    var st = document.createElement('style');
    st.id = 'wb-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* 整体出单率：现有库按「出单行 ÷ 视频行」口径，兼容百分数/小数两种返回 */
  function overallOrderRate() {
    try {
      var va = Data.getVideoAnalytics();
      var r = va && va.orderRate;
      if (r === null || r === undefined) return null;
      return r > 1 ? r / 100 : r;
    } catch (e) { return null; }
  }
  function orderedCreators() {
    try { var c = Data.getCreatorValueAnalysis(); return c ? c.orderedCreators : null; }
    catch (e) { return null; }
  }

  function metricDefs() {
    var s = Results ? Results.load() : null;
    var t = s && s.totals;
    function up(k) { return t ? t[k] : { value: null, prev: null }; }
    return [
      { key: 'gmv',    label: '本月 GMV',   src: '上传表', fmt: 'money', m: up('gmv') },
      { key: 'units',  label: '成交件数',   src: '上传表', fmt: 'int',   m: up('units') },
      { key: 'ordc',   label: '出单达人数', src: '现有库', fmt: 'int',   m: { value: orderedCreators(), prev: null } },
      { key: 'rate',   label: '整体出单率', src: '现有库', fmt: 'pct',   m: { value: overallOrderRate(), prev: null } },
      { key: 'nature', label: '自然单占比', src: '上传表', fmt: 'pct',   m: up('natural') }
    ];
  }

  function todoItems() {
    var out = [];
    try {
      var u = global.DloodaReminder && global.DloodaReminder.getUrgeList && global.DloodaReminder.getUrgeList();
      var list = (u && u.list) || [];
      out.push({ label: '待催办达人', hint: '履约追踪', href: 'tracking.html',
                 num: list.filter(function (x) { return !x.status; }).length });
    } catch (e) { out.push({ label: '待催办达人', hint: '履约追踪', href: 'tracking.html', num: '—' }); }
    try {
      var ms = (global.DloodaStore && global.DloodaStore.getMembers && global.DloodaStore.getMembers()) || [];
      var n = ms.filter(function (m) {
        if (m.status !== 'contacted') return false;
        return !(m.touches || []).some(function (t) { return /repl|回|success/i.test(String(t.result || '')); });
      }).length;
      out.push({ label: '待跟进未回私信', hint: '私信话术库', href: 'message.html', num: n });
    } catch (e) { out.push({ label: '待跟进未回私信', hint: '私信话术库', href: 'message.html', num: '—' }); }
    try {
      var sm = Data.getSamples() || [];
      var cnt = sm.filter(function (s) {
        return !String(s.fulfillMethod || '').trim() && !String(s.updateTime || '').trim();
      }).length;
      out.push({ label: '待确认寄样', hint: '寄样任务 / 样品', href: 'task.html', num: cnt });
    } catch (e) { out.push({ label: '待确认寄样', hint: '寄样任务 / 样品', href: 'task.html', num: '—' }); }
    return out;
  }

  function renderBlock() {
    var grid = document.getElementById('stat-grid');
    if (!grid) return;
    var old = document.getElementById('wb-block');
    if (old) old.parentNode.removeChild(old);

    var goals = loadGoals();
    var defs = metricDefs();
    var s = Results ? Results.load() : null;
    var period = s ? (s.period.start + ' ~ ' + s.period.end) : '未上传当月表';

    var cards = defs.map(function (d) {
      var v = d.m.value;
      var empty = v === null || v === undefined || (typeof v === 'number' && !isFinite(v));
      var dl = Results ? Results.delta(d.m) : { text: '较上月 -', cls: 'none' };
      var goalHtml = '';
      if ((d.key === 'gmv' || d.key === 'units') && !empty) {
        var g = d.key === 'gmv' ? goals.gmv : goals.units;
        if (g > 0) {
          var pct = Math.min(100, Math.max(0, v / g * 100));
          goalHtml = '<div class="wb-goalbar"><div class="wb-goalbar__fill" style="width:' + pct.toFixed(1) + '%"></div></div>'
            + '<div class="wb-goaltext">月度目标达成 ' + (v / g * 100).toFixed(1) + '%（目标 '
            + (d.key === 'gmv' ? '$' + g.toLocaleString('en-US') : g.toLocaleString('en-US')) + '）</div>';
        } else {
          goalHtml = '<div class="wb-goaltext">未设月度目标</div>';
        }
      }
      return '<div class="wb-metric' + (empty ? ' wb-metric--empty' : '') + '">'
        + '<div class="wb-metric__label">' + esc(d.label) + '<span class="wb-metric__src">' + esc(d.src) + '</span></div>'
        + '<div class="wb-metric__value">' + esc(Results ? Results.fmt(v, d.fmt) : (empty ? '暂无数据' : v)) + '</div>'
        + '<div class="wb-delta wb-delta--' + dl.cls + '">' + esc(dl.text) + '</div>'
        + goalHtml + '</div>';
    }).join('');

    var todos = todoItems().map(function (x) {
      return '<a class="wb-todo" href="' + esc(x.href) + '">'
        + '<div><div class="wb-todo__label">' + esc(x.label) + '</div>'
        + '<div class="wb-todo__hint">' + esc(x.hint) + ' →</div></div>'
        + '<div class="wb-todo__num">' + esc(x.num) + '</div></a>';
    }).join('');

    var html = '<div class="wb-block" id="wb-block">'
      + '<div class="wb-head"><h3 class="wb-title">本月结果 · 工作台</h3>'
      +   '<span class="wb-sub">统计区间 ' + esc(period) + '　|　上传表口径的指标未传表显示「暂无数据」</span></div>'
      + '<div class="wb-metrics">' + cards + '</div>'
      + '<div class="wb-goals">'
      +   '<label>GMV 月度目标（$）<input type="number" id="wb-goal-gmv" min="0" step="1000" value="' + esc(goals.gmv || '') + '" placeholder="例如 180000"></label>'
      +   '<label>出单件数月度目标<input type="number" id="wb-goal-units" min="0" step="100" value="' + esc(goals.units || '') + '" placeholder="例如 7000"></label>'
      +   '<button type="button" class="btn btn--sm" id="wb-goal-save">保存目标</button>'
      +   '<span class="wb-sub">目标仅存本机浏览器，不上传服务器</span>'
      + '</div>'
      + '<div class="wb-head" style="margin:14px 0 0;"><h3 class="wb-title">今天要处理</h3>'
      +   '<span class="wb-sub">数量取自各页现有口径，点击直达</span></div>'
      + '<div class="wb-todos">' + todos + '</div>'
      + '</div>';
    grid.insertAdjacentHTML('afterend', html);

    var btn = document.getElementById('wb-goal-save');
    if (btn) btn.addEventListener('click', function () {
      var g = document.getElementById('wb-goal-gmv'), u = document.getElementById('wb-goal-units');
      saveGoals({ gmv: Number(g && g.value) || 0, units: Number(u && u.value) || 0 });
      renderBlock();
      if (App && App.showToast) App.showToast('月度目标已保存到本机');
    });
  }

  /* ---------- A2 TOP 达人排序切换 ---------- */
  function topData(mode) {
    if (mode === 'gmv') {
      var s = Results ? Results.load() : null;
      if (!s || !s.hasCreator || !Object.keys(s.byCreator || {}).length) return null;
      return Object.keys(s.byCreator).map(function (n) {
        var x = s.byCreator[n];
        return { name: n, value: x.gmv, sub: '$' + Math.round(x.gmv).toLocaleString('en-US'), meta: '累计 GMV（上传表）' };
      }).sort(function (a, b) { return b.value - a.value; }).slice(0, 5);
    }
    if (mode === 'units') {
      try {
        var r = Data.getOrderCreatorRanking(5) || [];
        return r.map(function (x) { return { name: x.name, value: x.ordered, sub: x.ordered + ' 单', meta: '出单件数（现有库）' }; });
      } catch (e) { return null; }
    }
    try {
      var rep = Data.getReportData();
      return (rep.creatorRanking || []).slice(0, 5).map(function (x) {
        return { name: x.name, value: x.videoCount, sub: x.videoCount + ' 条视频', meta: '视频数（现有库）',
                 official: x.official, stars: x.stars };
      });
    } catch (e) { return null; }
  }

  function renderTop(mode) {
    var box = document.getElementById('recent-creators');
    if (!box) return;
    var list = topData(mode);
    var title = { video: '按视频数', gmv: '按 GMV', units: '按出单件数' }[mode] || '按视频数';
    var h3 = document.querySelector('#dashboard-grid .card__title');
    if (h3) h3.textContent = 'TOP 达人（' + title + '）';
    if (!list || !list.length) {
      box.innerHTML = '<div class="wb-note">暂无数据：切换到「看板 → 出单转化」上传含「达人昵称」列的订单表后，这里才会出现 GMV 排名（不拿现有库硬凑）。</div>';
      return;
    }
    box.innerHTML = list.map(function (x, i) {
      return '<div class="creator-card" onclick="location.href=\'ai-assistant.html?creator=' + encodeURIComponent(x.name) + '\'">'
        + '<div class="creator-card__avatar">' + esc(String(x.name).slice(0, 2).toUpperCase()) + '</div>'
        + '<div class="creator-card__body">'
        +   '<div class="creator-card__name">' + (i + 1) + '. ' + esc(x.name) + '</div>'
        +   '<div class="creator-card__meta">' + esc(x.meta) + (x.official ? ' · ' + esc(x.official) : '') + '</div>'
        + '</div>'
        + '<div class="creator-card__score">' + esc(x.sub) + '</div>'
        + '</div>';
    }).join('');
  }

  function initTop() {
    var header = document.querySelector('#dashboard-grid .card__header');
    if (!header || document.getElementById('wb-sort')) return;
    var sel = document.createElement('select');
    sel.id = 'wb-sort'; sel.className = 'wb-sort';
    sel.innerHTML = '<option value="video">按视频数</option><option value="gmv">按 GMV</option><option value="units">按出单件数</option>';
    try { sel.value = localStorage.getItem(SORT_KEY) || 'video'; } catch (e) {}
    sel.addEventListener('change', function () {
      try { localStorage.setItem(SORT_KEY, sel.value); } catch (e) {}
      renderTop(sel.value);
    });
    header.appendChild(sel);
    renderTop(sel.value);
  }

  function init() {
    injectCss();
    renderBlock();
    initTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  global.DloodaWorkbench = { refresh: renderBlock, refreshTop: renderTop };
})(window);
