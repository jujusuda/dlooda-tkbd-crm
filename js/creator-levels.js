/* ============================================================
   达人层级划分（达人页顶部区块）
   - 官方等级：L0-1 / L2 / L3 / L4 / L5 / L6 / L7（实际出现的档位动态生成，含「未填」）
   - 多维筛选：时间区间、SKU、等级（下限 or 精确）、出单/未出单、素材量、达人昵称搜索
   - 排序：出单量（订单数）降序 → 素材量 → 寄样行
   - 结果汇总：出单率 = 出单行 ÷ 视频行；履约率 = 履约行 ÷ 寄样行（与 PPT 同口径，按行数）
   ============================================================ */
(function (global) {
  'use strict';

  var Data = global.DloodaData;
  var App = global.DloodaApp || global.App;   // ⚠️ app.js 导出的是 window.DloodaApp，不是 App
  var host = document.getElementById('creator-levels');
  if (!Data || !App || !host) return;

  var KNOWN_LEVELS = ['L0-1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  var ORD = { 'L0-1': 0, 'L2': 1, 'L3': 2, 'L4': 3, 'L5': 4, 'L6': 5, 'L7': 6 };
  var PAGE = 100;

  var state = { startDate: '', endDate: '', sku: '', level: '', minLevel: '', order: '', mat: '', kw: '', mode: 'rows', expanded: false };

  /* ---------- 数据归一化（与 data.js 保持一致） ---------- */
  function normSku(v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.map(function (x) { return (x && x.text) || x || ''; }).join(',').replace(/\s/g, '');
    return String((v && v.text) || v).replace(/\s/g, '');
  }
  function method(s) {
    var v = s.fulfillMethod;
    if (Array.isArray(v)) return v.map(function (x) { return (x && x.text) || x || ''; }).join('');
    return String((v && v.text) || v || '');
  }
  function orders(s) { return parseInt(s.orderCount, 10) || 0; }

  /* 时间区间判定：结束日选 15 号时当天归下月（与全站「15 号切月」一致） */
  function inRange(t) {
    if (!state.startDate && !state.endDate) return true;
    var d = String(t || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (state.startDate && d < state.startDate) return false;
    if (state.endDate) {
      var e = state.endDate;
      if (e.slice(8, 10) === '15') { if (d >= e) return false; }
      else if (d > e) return false;
    }
    return true;
  }

  /* ---------- 聚合：按达人汇总寄样行/履约行/视频行/出单行/订单数/素材数 ---------- */
  function aggregate() {
    var meta = {};
    Data.getCreators().forEach(function (c) { meta[c.name] = c; });

    // 等级取值（2026-11-08 用户定）：同一达人多条寄样的官方等级可能不同，
    // 一律以【最新寄样记录】的官方等级为准，其余寄样行也按这个等级计。
    var allSamples = Data.getSamples();
    var latest = {};
    allSamples.forEach(function (s) {
      if (!s.creator) return;
      var t = String(s.sampleTime || '');
      if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return;
      var cur = latest[s.creator];
      if (!cur) { latest[s.creator] = { t: t, level: s.official || '' }; return; }
      if (t > cur.t) latest[s.creator] = { t: t, level: s.official || cur.level };
      else if (!cur.level && s.official) cur.level = s.official;
    });

    var map = {};
    allSamples.forEach(function (s) {
      if (!s.creator) return;
      if (state.sku && normSku(s.sku) !== state.sku) return;
      if (!inRange(s.sampleTime)) return;
      var a = map[s.creator] || (map[s.creator] = {
        name: s.creator, rows: 0, fulfilled: 0, video: 0, orderedRows: 0, orders: 0, materials: 0,
        level: '', stars: ''
      });
      var m = method(s);
      a.rows++;
      if (m === '视频' || m.indexOf('直播') >= 0) a.fulfilled++;
      if (m === '视频') a.video++;
      if (orders(s) > 0) { a.orderedRows++; a.orders += orders(s); }
    });

    // 素材量：与「视频管理 · 素材看板」同源——按【发布时间】统计视频记录条数（不去重），
    // 而不是寄样行内嵌视频数（否则两处对不上：素材看板 64 vs 层级表 41）。
    Data.getVideos().forEach(function (v) {
      var a = map[v.creator];
      if (!a) return;
      var day = String(v.postTime || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      if (state.sku && normSku(v.sku) !== state.sku) return;
      if (!inRange(day)) return;
      a.materials++;
    });

    return Object.keys(map).map(function (k) {
      var a = map[k], c = meta[k] || {};
      a.level = (latest[k] && latest[k].level) || c.official || '';
      a.stars = c.stars || '';
      a.fulfillRate = a.rows > 0 ? Math.round(a.fulfilled / a.rows * 1000) / 10 : 0;
      a.orderRate = a.video > 0 ? Math.round(a.orderedRows / a.video * 1000) / 10 : 0;
      return a;
    });
  }

  /* ---------- 逐层过滤（等级滤镜最后处理，以便 chips 显示前置条件下的分布） ---------- */
  function passesBase(a) {
    if (state.order === 'yes' && a.orders <= 0) return false;
    if (state.order === 'no' && a.orders > 0) return false;
    if (state.mat === 'yes' && a.materials <= 0) return false;
    if (state.mat === 'no' && a.materials > 0) return false;
    if (state.mat && state.mat.indexOf('>=') === 0 && a.materials < parseInt(state.mat.slice(2), 10)) return false;
    if (state.kw && a.name.toLowerCase().indexOf(state.kw) < 0) return false;
    return true;
  }
  function passesLevel(a) {
    if (state.level === '__none') { if (a.level) return false; }
    else if (state.level && a.level !== state.level) return false;
    if (state.minLevel && (ORD[a.level] == null || ORD[a.level] < ORD[state.minLevel])) return false;
    return true;
  }

  function fmtPct(v, hasBase) { return hasBase ? (v + '%') : '—'; }

  /* ---------- 控件 ---------- */
  function renderShell() {
    var skus = (Data.getAvailableSKUs ? Data.getAvailableSKUs() : []).map(function (s) {
      return typeof s === 'string' ? s : (s.sku || s.name || '');
    }).filter(Boolean);
    var skuOpts = '<option value="">全部 SKU</option>' + skus.map(function (s) {
      return '<option value="' + App.escapeHtml(normSku(s)) + '">SKU ' + App.escapeHtml(normSku(s)) + '</option>';
    }).join('');

    host.innerHTML = ''
      + '<div class="card" style="margin-bottom:16px;">'
      +   '<div class="card__header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      +     '<h3 class="card__title">达人层级划分</h3>'
      +     '<span style="font-size:11px;color:var(--text-3);">按出单量排序 · 出单率=出单行÷视频行 · 履约率=履约行÷寄样行</span>'
      +   '</div>'
      +   '<div id="cl-tiers" style="display:flex;gap:8px;flex-wrap:wrap;padding:4px 0 12px;"></div>'
      +   '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">'
      +     '<span style="display:inline-flex;border:1px solid var(--border-1);border-radius:var(--r-full);overflow:hidden;">'
      +       '<button class="filter-btn" data-mode="rows" style="border:0;border-radius:0;">按寄样行</button>'
      +       '<button class="filter-btn" data-mode="creators" style="border:0;border-radius:0;">按达人</button>'
      +     '</span>'
      +     '<input class="input" id="cl-start" type="date" style="width:auto;" title="寄样起始日">'
      +     '<span style="color:var(--text-3);font-size:12px;">~</span>'
      +     '<input class="input" id="cl-end" type="date" style="width:auto;" title="寄样结束日（选 15 号时当天归下月）">'
      +     '<button class="filter-btn" data-quick="7">近7天</button>'
      +     '<button class="filter-btn" data-quick="30">近30天</button>'
      +     '<select class="select" id="cl-sku" style="width:auto;min-width:130px;">' + skuOpts + '</select>'
      +     '<select class="select" id="cl-min" style="width:auto;min-width:120px;">'
      +       '<option value="">等级下限不限</option>'
      +       '<option value="L2">≥ L2</option><option value="L3">≥ L3</option>'
      +       '<option value="L4">≥ L4</option><option value="L5">≥ L5</option><option value="L6">≥ L6</option>'
      +     '</select>'
      +     '<select class="select" id="cl-order" style="width:auto;min-width:110px;">'
      +       '<option value="">出单不限</option><option value="yes">只看出单</option><option value="no">只看未出单</option>'
      +     '</select>'
      +     '<select class="select" id="cl-mat" style="width:auto;min-width:110px;">'
      +       '<option value="">素材不限</option><option value="yes">有素材</option><option value="no">无素材</option>'
      +       '<option value=">=3">素材 ≥3</option><option value=">=5">素材 ≥5</option><option value=">=10">素材 ≥10</option>'
      +     '</select>'
      +     '<input class="input" id="cl-kw" type="text" placeholder="搜索达人昵称" style="width:auto;min-width:150px;flex:1;max-width:220px;">'
      +     '<button class="filter-btn" id="cl-reset">重置</button>'
      +   '</div>'
      +   '<div id="cl-summary" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>'
      +   '<div id="cl-table" style="overflow-x:auto;"></div>'
      + '</div>';

    host.querySelectorAll('[data-mode]').forEach(function (btn) {
      if (btn.getAttribute('data-mode') === state.mode) btn.classList.add('active');
      btn.addEventListener('click', function () {
        state.mode = this.getAttribute('data-mode');
        state.expanded = false;
        host.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        render();
      });
    });
    function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    host.querySelectorAll('[data-quick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var days = parseInt(this.getAttribute('data-quick'), 10);
        var now = new Date();
        var from = new Date(now.getTime() - (days - 1) * 86400000);
        state.startDate = ymd(from);
        state.endDate = ymd(now);
        document.getElementById('cl-start').value = state.startDate;
        document.getElementById('cl-end').value = state.endDate;
        state.expanded = false;
        render();
      });
    });
    document.getElementById('cl-start').addEventListener('change', function () { state.startDate = this.value; state.expanded = false; render(); });
    document.getElementById('cl-end').addEventListener('change', function () { state.endDate = this.value; state.expanded = false; render(); });
    document.getElementById('cl-sku').addEventListener('change', function () { state.sku = this.value; state.expanded = false; render(); });
    document.getElementById('cl-min').addEventListener('change', function () { state.minLevel = this.value; state.expanded = false; render(); });
    document.getElementById('cl-order').addEventListener('change', function () { state.order = this.value; state.expanded = false; render(); });
    document.getElementById('cl-mat').addEventListener('change', function () { state.mat = this.value; state.expanded = false; render(); });
    document.getElementById('cl-reset').addEventListener('click', function () {
      state = { startDate: '', endDate: '', sku: '', level: '', minLevel: '', order: '', mat: '', kw: '', mode: 'rows', expanded: false };
      renderShell(); render();
    });

    var timer = null;
    document.getElementById('cl-kw').addEventListener('input', function () {
      var v = this.value.toLowerCase().trim();
      clearTimeout(timer);
      timer = setTimeout(function () { state.kw = v; state.expanded = false; render(); }, 220);
    });
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var all = aggregate();
    var base = all.filter(passesBase);

    // 等级 chips（含人数）
    // 等级 chips：按「实际出现的档位」动态生成，未填等级单独一档，保证加总 = 命中达人数
    // 计数口径：'rows' = 寄样行数（不去重，默认）；'creators' = 达人去重人数
    var byRows = state.mode === 'rows';
    var counts = { '': 0 };
    var others = [];
    base.forEach(function (a) {
      var lv = a.level || '';
      var inc = byRows ? a.rows : 1;
      var key = lv || '__none';          // ⚠️ 空等级不能直接用 ''，会撞到「全部」这个桶
      counts[key] = (counts[key] || 0) + inc;
      counts[''] += inc;
      if (lv && KNOWN_LEVELS.indexOf(lv) < 0 && others.indexOf(lv) < 0) others.push(lv);
    });
    others.sort();
    var chipList = [{ id: '', label: '全部' }]
      .concat(KNOWN_LEVELS.map(function (lv) { return { id: lv, label: lv }; }))
      .concat(others.map(function (lv) { return { id: lv, label: lv }; }))
      .concat([{ id: '__none', label: '未填' }])
      .filter(function (t) { return t.id === '' || (counts[t.id] || 0) > 0; });
    var tierHtml = chipList.map(function (t) {
      var active = state.level === t.id || (t.id === '__none' && state.level === '__none');
      return '<button class="filter-tab' + (active ? ' active' : '') + '" data-level="' + t.id + '">'
        + t.label + '<span class="count">' + (counts[t.id] || 0) + '</span></button>';
    }).join('');
    var tierBox = document.getElementById('cl-tiers');
    tierBox.innerHTML = tierHtml;
    tierBox.querySelectorAll('.filter-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        var lv = this.getAttribute('data-level');
        state.level = (state.level === lv) ? '' : lv;   // 再点一次取消
        state.expanded = false;
        render();
      });
    });

    // 结果集
    var rows = base.filter(passesLevel);
    var sum = { n: rows.length, rows: 0, fulfilled: 0, video: 0, orderedRows: 0, orders: 0, materials: 0 };
    rows.forEach(function (a) {
      sum.rows += a.rows; sum.fulfilled += a.fulfilled; sum.video += a.video;
      sum.orderedRows += a.orderedRows; sum.orders += a.orders; sum.materials += a.materials;
    });
    var fulfillRate = sum.rows > 0 ? Math.round(sum.fulfilled / sum.rows * 1000) / 10 : 0;
    var orderRate = sum.video > 0 ? Math.round(sum.orderedRows / sum.video * 1000) / 10 : 0;

    var card = function (label, value, sub, color) {
      return '<div style="flex:1;min-width:104px;background:var(--bg-pink-soft);border-radius:10px;padding:10px 12px;">'
        + '<div style="font-size:18px;font-weight:700;color:' + (color || 'var(--text-1)') + ';">' + value + '</div>'
        + '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">' + label + (sub ? ' · ' + sub : '') + '</div>'
        + '</div>';
    };
    document.getElementById('cl-summary').innerHTML = ''
      + (state.mode === 'rows'
          ? card('命中寄样行', sum.rows + ' 行', '共 ' + sum.n + ' 位达人', 'var(--pink-500)')
          : card('命中达人', sum.n + ' 位', '共 ' + sum.rows + ' 行寄样', 'var(--pink-500)'))
      + card('寄样行', sum.rows, '')
      + card('履约率', fmtPct(fulfillRate, sum.rows > 0), sum.fulfilled + '÷' + sum.rows, 'var(--c-info)')
      + card('出单率', fmtPct(orderRate, sum.video > 0), sum.orderedRows + '÷' + sum.video, 'var(--c-success)')
      + card('出单量', sum.orders, sum.orderedRows + ' 行')
      + card('素材量', sum.materials, '');

    // 排序：出单量 → 素材量 → 寄样行 → 名字
    rows.sort(function (a, b) {
      if (b.orders !== a.orders) return b.orders - a.orders;
      if (b.materials !== a.materials) return b.materials - a.materials;
      if (b.rows !== a.rows) return b.rows - a.rows;
      return a.name.localeCompare(b.name);
    });

    if (rows.length === 0) {
      document.getElementById('cl-table').innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">没有符合条件的达人</div>';
      return;
    }

    var show = state.expanded ? rows : rows.slice(0, PAGE);
    var html = '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
      + '<th style="padding:8px 4px;text-align:left;color:var(--text-3);font-weight:600;">#</th>'
      + '<th style="padding:8px 4px;text-align:left;color:var(--text-2);font-weight:600;">达人</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">等级</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">星级</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">寄样</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--pink-500);font-weight:600;">出单量</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">出单率</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">履约率</th>'
      + '<th style="padding:8px 4px;text-align:center;color:var(--text-3);font-weight:600;">素材</th>'
      + '</tr></thead><tbody>';

    show.forEach(function (a, i) {
      var lvColor = a.level === 'L5' || a.level === 'L6' || a.level === 'L7' ? 'var(--pink-500)'
        : a.level === 'L4' ? 'var(--c-info)'
        : a.level === 'L3' ? 'var(--c-success)' : 'var(--text-3)';
      html += '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:6px 4px;color:var(--text-3);">' + (i + 1) + '</td>'
        + '<td style="padding:6px 4px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(a.name) + '</td>'
        + '<td style="padding:6px 4px;text-align:center;"><span style="font-size:11px;font-weight:700;color:' + lvColor + ';">' + (a.level || '—') + '</span></td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + (a.stars || '—') + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + a.rows + '</td>'
        + '<td style="padding:6px 4px;text-align:center;font-weight:700;color:var(--pink-500);">' + a.orders + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-success);">' + fmtPct(a.orderRate, a.video > 0) + '<span style="color:var(--text-3);font-size:10px;"> ' + a.orderedRows + '÷' + a.video + '</span></td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-info);">' + a.fulfillRate + '%<span style="color:var(--text-3);font-size:10px;"> ' + a.fulfilled + '÷' + a.rows + '</span></td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + a.materials + '</td>'
        + '</tr>';
    });
    html += '</tbody></table>';

    if (!state.expanded && rows.length > PAGE) {
      html += '<button class="filter-btn" id="cl-more" style="margin:10px auto 0;display:block;">显示全部 ' + rows.length + ' 位达人</button>';
    }
    var tableBox = document.getElementById('cl-table');
    tableBox.innerHTML = html;
    var more = document.getElementById('cl-more');
    if (more) more.addEventListener('click', function () { state.expanded = true; render(); });
  }

  function init() {
    renderShell();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
