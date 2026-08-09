/* ================================================================
   Dlooda TKBD CRM — 数据复盘 (v5)
   聚焦：SKU 出单率趋势 / 升降归因
   （寄样任务已迁出，见独立模块 task.html）
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var filterState = { sku: '', startDate: '', endDate: '' };
  var currentView = 'trend';

  /* ================================================================
     视图切换
     ================================================================ */
  function switchView(view) {
    currentView = view;
    var tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === view);
    });
    ['trend', 'attribution'].forEach(function (v) {
      var el = document.getElementById('view-' + v);
      if (el) el.style.display = v === view ? '' : 'none';
    });
    if (view === 'attribution') renderAttributionView();
  }

  function initViewTabs() {
    var tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        switchView(t.getAttribute('data-view'));
      });
    });
  }

  /* ================================================================
     视图1: SKU 出单率趋势
     ================================================================ */
  function renderTrendView() {
    var trend = Data.getSKUTrendAnalysis(filterState.sku || null);
    var changes = Data.getSKUAttributionAnalysis(filterState.sku || null);
    renderTrendMetrics(trend, changes);
    renderSKUTrendChart(trend);
    renderSKUChangeRanking(changes);
  }

  function renderTrendMetrics(trend, changes) {
    var container = document.getElementById('trend-metrics');
    if (!container) return;
    var skuSet = {};
    trend.forEach(function (r) { skuSet[r.sku] = true; });
    var up = changes.filter(function (c) { return c.direction === 'up'; }).length;
    var down = changes.filter(function (c) { return c.direction === 'down'; }).length;
    var avgRate = trend.length > 0 ? Math.round(trend.reduce(function (s, r) { return s + r.orderRate; }, 0) / trend.length * 10) / 10 : 0;
    container.innerHTML = ''
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + Object.keys(skuSet).length + '</div><div class="stat-card__label">统计 SKU</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + avgRate + '%</div><div class="stat-card__label">月均出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value change-up">' + up + '</div><div class="stat-card__label">上升 SKU</div></div>'
      + '<div class="stat-card"><div class="stat-card__value change-down">' + down + '</div><div class="stat-card__label">下降 SKU</div></div>';
  }

  function renderSKUTrendChart(trend) {
    var container = document.getElementById('sku-trend-chart');
    if (!container) return;
    if (trend.length === 0) { container.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无月度数据</div>'; return; }

    // 按月份聚合整体出单率
    var byMonth = {};
    trend.forEach(function (r) {
      if (!byMonth[r.month]) byMonth[r.month] = { month: r.month, sampleCount: 0, fulfilled: 0, ordered: 0 };
      byMonth[r.month].sampleCount += r.sampleCount;
      byMonth[r.month].fulfilled += r.fulfilledCreators;
      byMonth[r.month].ordered += r.orderedCreators;
    });
    var months = Object.keys(byMonth).sort();
    var pts = months.map(function (m) {
      var o = byMonth[m];
      return { month: m, rate: o.fulfilled > 0 ? Math.round(o.ordered / o.fulfilled * 1000) / 10 : 0 };
    });

    var W = 680, H = 220, padL = 34, padB = 32, padT = 20, padR = 24;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxR = Math.max.apply(null, pts.map(function (p) { return p.rate; }).concat([1]));
    var n = pts.length;
    var step = n > 1 ? plotW / (n - 1) : plotW;
    var coords = pts.map(function (p, i) {
      var x = padL + i * step;
      var y = padT + plotH - (p.rate / maxR * plotH);
      return { x: x, y: y, p: p };
    });

    var linePts = coords.map(function (c) { return c.x + ',' + c.y; }).join(' ');
    var dots = coords.map(function (c) {
      return '<circle cx="' + c.x + '" cy="' + c.y + '" r="4" fill="var(--pink-500)" stroke="#fff" stroke-width="2"><title>' + c.p.month + ' 出单率 ' + c.p.rate + '%</title></circle>';
    }).join('');
    var labels = coords.map(function (c, i) {
      return '<text x="' + c.x + '" y="' + (H - 10) + '" font-size="10" fill="#9b8e8e" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + c.p.month + '</text>';
    }).join('');
    var yTicks = [0, maxR / 2, maxR].map(function (v) {
      var y = padT + plotH - (v / maxR * plotH);
      return '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" font-size="9" fill="#9b8e8e" text-anchor="end">' + Math.round(v) + '%</text>';
    }).join('');

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;">'
      + '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="#efe6e6" stroke-width="1"/>'
      + '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="#efe6e6" stroke-width="1"/>'
      + yTicks
      + '<polyline points="' + linePts + '" class="trend-line" stroke="var(--pink-500)"/>'
      + dots
      + labels
      + '</svg>';

    container.innerHTML = '<div style="padding:8px 4px;">' + svg
      + '<div style="font-size:11px;color:var(--text-3);margin-top:6px;">整体月度出单率趋势（出单达人 ÷ 履约达人）</div></div>';
  }

  function renderSKUChangeRanking(changes) {
    var container = document.getElementById('sku-change-ranking');
    if (!container) return;
    if (changes.length === 0) { container.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">至少需要两个月数据才能计算变化</div>'; return; }

    var html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    changes.forEach(function (c) {
      var icon = c.direction === 'up' ? '↗' : c.direction === 'down' ? '↘' : '→';
      var color = c.direction === 'up' ? 'var(--c-success)' : c.direction === 'down' ? 'var(--c-danger)' : 'var(--text-3)';
      var bg = c.direction === 'up' ? 'var(--c-success-bg)' : c.direction === 'down' ? 'var(--c-danger-bg)' : 'var(--bg-pink-soft)';
      html += '<div style="padding:12px;background:' + bg + ';border-radius:10px;border:1px solid var(--border-1);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span style="font-size:16px;font-weight:800;color:' + color + ';">' + icon + '</span>'
        + '<span style="font-size:14px;font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(c.sku) + '</span>'
        + '</div>'
        + '<span style="font-size:18px;font-weight:800;color:' + color + ';">' + (c.diff > 0 ? '+' : '') + c.diff + '%</span>'
        + '</div>'
        + '<div style="display:flex;gap:16px;font-size:12px;color:var(--text-2);">'
        + '<span>' + c.prevMonth + ': <b>' + c.prevRate + '%</b></span>'
        + '<span>→</span>'
        + '<span>' + c.currMonth + ': <b>' + c.currRate + '%</b></span>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* ================================================================
     视图2: 升降归因
     ================================================================ */
  function renderAttributionView() {
    var select = document.getElementById('attr-sku-select');
    if (!select) return;

    // 初始化下拉：所有有出单率变化的 SKU
    var changes = Data.getSKUAttributionAnalysis(filterState.sku || null);
    var skus = changes.map(function (c) { return c.sku; });
    if (filterState.sku && skus.indexOf(filterState.sku) < 0) skus.unshift(filterState.sku);

    // 去重重建下拉
    var prevVal = select.value;
    select.innerHTML = '';
    if (skus.length === 0) {
      var emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '无足够数据 SKU';
      select.appendChild(emptyOpt);
      renderAttributionDetail('');
      return;
    }
    skus.forEach(function (sku) {
      var opt = document.createElement('option');
      opt.value = sku;
      opt.textContent = 'SKU ' + sku;
      select.appendChild(opt);
    });
    select.value = prevVal && skus.indexOf(prevVal) >= 0 ? prevVal : skus[0];
    if (!select._changeBound) {
      select.addEventListener('change', function () { renderAttributionDetail(select.value); });
      select._changeBound = true;
    }
    renderAttributionDetail(select.value);
  }

  function renderAttributionDetail(sku) {
    var container = document.getElementById('attribution-content');
    if (!container || !sku) { if (container) container.innerHTML = '<div class="card" style="padding:16px;color:var(--text-3);text-align:center;">请选择 SKU</div>'; return; }
    var detail = Data.getSKUAttributionDetail(sku);
    if (!detail) { container.innerHTML = '<div class="card" style="padding:16px;color:var(--text-3);text-align:center;">该 SKU 至少需要两个月数据</div>'; return; }

    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + detail.curr.orderRate + '%</div><div class="stat-card__label">' + detail.currMonth + ' 出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--text-2);">' + detail.prev.orderRate + '%</div><div class="stat-card__label">' + detail.prevMonth + ' 出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:' + (detail.curr.orderRate >= detail.prev.orderRate ? 'var(--c-success)' : 'var(--c-danger)') + ';">' + (detail.curr.orderRate - detail.prev.orderRate >= 0 ? '+' : '') + (Math.round((detail.curr.orderRate - detail.prev.orderRate) * 10) / 10) + '%</div><div class="stat-card__label">变化</div></div>'
      + '</div>';

    html += '<div class="attribution-grid">';
    html += renderDimCard('官方等级', detail.prev.official, detail.curr.official);
    html += renderDimCard('年龄分布', detail.prev.age, detail.curr.age);
    html += renderDimCard('身材分布', detail.prev.body, detail.curr.body);
    html += renderDimCard('品类分布', detail.prev.category, detail.curr.category);
    html += renderDimCard('颜色分布', detail.prev.color, detail.curr.color);
    html += renderDimCard('语言分布', detail.prev.language, detail.curr.language);
    html += renderDimCard('通过方式', detail.prev.approval, detail.curr.approval);
    html += '</div>';

    container.innerHTML = html;
  }

  function renderDimCard(title, prevArr, currArr) {
    var keys = {};
    prevArr.forEach(function (x) { keys[x.key] = true; });
    currArr.forEach(function (x) { keys[x.key] = true; });
    var allKeys = Object.keys(keys);
    var max = 1;
    allKeys.forEach(function (k) {
      var p = prevArr.find(function (x) { return x.key === k; }) || { count: 0, pct: 0 };
      var c = currArr.find(function (x) { return x.key === k; }) || { count: 0, pct: 0 };
      max = Math.max(max, p.count, c.count);
    });

    var rows = allKeys.map(function (k) {
      var p = prevArr.find(function (x) { return x.key === k; }) || { count: 0, pct: 0 };
      var c = currArr.find(function (x) { return x.key === k; }) || { count: 0, pct: 0 };
      var diff = Math.round((c.pct - p.pct) * 10) / 10;
      var diffColor = diff > 0 ? 'var(--c-success)' : diff < 0 ? 'var(--c-danger)' : 'var(--text-3)';
      var pW = Math.round(p.count / max * 100);
      var cW = Math.round(c.count / max * 100);
      return '<div style="margin-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
        + '<span style="font-weight:600;color:var(--text-1);">' + App.escapeHtml(k) + '</span>'
        + '<span style="font-size:11px;color:var(--text-3);">上月 ' + p.pct + '% → 本月 ' + c.pct + '% <b style="color:' + diffColor + ';">(' + (diff >= 0 ? '+' : '') + diff + '%)</b></span>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + pW + '%;background:var(--border-2);border-radius:4px;"></div></div>'
        + '<div style="flex:1;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + cW + '%;background:var(--pink-400);border-radius:4px;"></div></div>'
        + '</div>'
        + '</div>';
    }).join('');

    return '<div class="dim-card">'
      + '<div class="dim-title">' + App.escapeHtml(title) + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:8px;"><span>▬ 上月</span><span>▬ 本月</span></div>'
      + rows
      + '</div>';
  }

  /* ================================================================
     主渲染
     ================================================================ */
  function render() {
    renderTrendView();
    renderAttributionView();
  }

  function init() {
    initViewTabs();
    App.createFilterBar('report-filter-bar', function (sku, startDate, endDate) {
      filterState.sku = sku;
      filterState.startDate = startDate;
      filterState.endDate = endDate;
      // 切换 SKU 后重置归因下拉
      var select = document.getElementById('attr-sku-select');
      if (select) select.innerHTML = '';
      render();
    });
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
