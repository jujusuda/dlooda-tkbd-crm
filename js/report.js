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
    ['trend', 'attribution', 'passrate'].forEach(function (v) {
      var el = document.getElementById('view-' + v);
      if (el) el.style.display = v === view ? '' : 'none';
    });
    if (view === 'attribution') renderAttributionView();
    if (view === 'passrate') renderPassRateView();
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
     默认对比最近两个月；支持任意选择两个时间段对比（环比/同比/季度环比）
     ================================================================ */
  var attrState = { rangeA: null, rangeB: null };  // null = 默认近两月

  // 把年份+月份(1-12)转成一个整月范围
  function monthRange(y, m) {
    var mm = ('0' + m).slice(-2);
    var last = new Date(y, m, 0).getDate();
    return { start: y + '-' + mm + '-01', end: y + '-' + mm + '-' + ('0' + last).slice(-2) };
  }
  // 当前标准月（不含年月，直接用 Date）
  function nowYM() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }
  function monthLabel(r) {
    if (!r) return '';
    function f(v) { return v ? v.slice(0, 7) : ''; }
    var s = f(r.start), e = f(r.end);
    if (s && s === e) return s;
    if (s && e) return s + '~' + e;
    return s || e || '';
  }

  // 预设：mom 环比 / yoy 同比 / qoq 季度环比
  function applyAttrPreset(kind) {
    var t = nowYM();
    if (kind === 'mom') {
      var pm = t.m === 1 ? { y: t.y - 1, m: 12 } : { y: t.y, m: t.m - 1 };
      attrState.rangeA = monthRange(pm.y, pm.m);
      attrState.rangeB = monthRange(t.y, t.m);
    } else if (kind === 'yoy') {
      attrState.rangeA = monthRange(t.y - 1, t.m);
      attrState.rangeB = monthRange(t.y, t.m);
    } else if (kind === 'qoq') {
      // 本季度 = 按 (季度-1)*3+1 起算；上季度再往前推 3 个月
      var qStart = Math.floor((t.m - 1) / 3) * 3 + 1;
      var aStartM = qStart - 3 > 0 ? qStart - 3 : qStart + 9;
      var aStartY = qStart - 3 > 0 ? t.y : t.y - 1;
      attrState.rangeA = monthRange(aStartY, aStartM);
      attrState.rangeB = monthRange(t.y, qStart);
    }
    syncAttrInputs();
    renderAttributionDetail(attrSkuValue());
  }

  function attrSkuValue() {
    var select = document.getElementById('attr-sku-select');
    return select ? select.value : '';
  }

  // 把 attrState 同步到输入框 + 缓存
  function syncAttrInputs() {
    var ranges = document.querySelectorAll('#view-attribution .attr-range');
    ranges.forEach(function (box) {
      var key = box.getAttribute('data-range') === 'A' ? 'rangeA' : 'rangeB';
      var val = attrState[key];
      var s = box.querySelector('.attr-start'), e = box.querySelector('.attr-end');
      if (s) s.value = val && val.start || '';
      if (e) e.value = val && val.end || '';
    });
    // 持久化到筛选缓存
    App.saveFilterState('attribution', { rangeA: attrState.rangeA, rangeB: attrState.rangeB });
  }

  function renderAttributionView() {
    var select = document.getElementById('attr-sku-select');
    if (!select) return;

    // 恢复上次的对比区间缓存
    if (attrState.rangeA === null && attrState.rangeB === null) {
      var saved = App.loadFilterState('attribution');
      if (saved && (saved.rangeA || saved.rangeB)) {
        attrState.rangeA = saved.rangeA || null;
        attrState.rangeB = saved.rangeB || null;
      }
    }

    // 初始化下拉：所有有出单率变化的 SKU（含自定义区间时的候选）
    var changes = Data.getSKUAttributionAnalysis(filterState.sku || null);
    var skus = changes.map(function (c) { return c.sku; });
    if (filterState.sku && skus.indexOf(filterState.sku) < 0) skus.unshift(filterState.sku);
    // 兜底：无变化时列出所有有数据的 SKU
    if (skus.length === 0) skus = Data.getAvailableSKUs();

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
    select.value = prevVal && skus.indexOf(prevVal) >= 0 ? prevVal : (filterState.sku && skus.indexOf(filterState.sku) >= 0 ? filterState.sku : skus[0]);
    if (!select._changeBound) {
      select.addEventListener('change', function () { renderAttributionDetail(select.value); });
      select._changeBound = true;
    }

    // 绑定日期范围 + 预设按钮（只绑一次）
    if (!select._compareBound) {
      select._compareBound = true;
      var ranges = document.querySelectorAll('#view-attribution .attr-range');
      ranges.forEach(function (box) {
        var key = box.getAttribute('data-range') === 'A' ? 'rangeA' : 'rangeB';
        box.querySelectorAll('input').forEach(function (inp) {
          inp.addEventListener('change', function () {
            var start = box.querySelector('.attr-start').value;
            var end = box.querySelector('.attr-end').value;
            attrState[key] = (start || end) ? { start: start, end: end } : null;
            syncAttrInputs();
            renderAttributionDetail(select.value);
          });
        });
      });
      var applyBtn = document.getElementById('attr-apply');
      if (applyBtn) applyBtn.addEventListener('click', function () { renderAttributionDetail(select.value); });
      var resetBtn = document.getElementById('attr-reset');
      if (resetBtn) resetBtn.addEventListener('click', function () {
        attrState.rangeA = null; attrState.rangeB = null;
        syncAttrInputs();
        renderAttributionDetail(select.value);
      });
      document.querySelectorAll('#view-attribution [data-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () { applyAttrPreset(btn.getAttribute('data-preset')); });
      });
    }

    // 首次进入同步默认区间到输入框（默认显示近两月占位）
    syncAttrInputs();
    renderAttributionDetail(select.value);
  }

  function renderAttributionDetail(sku) {
    var container = document.getElementById('attribution-content');
    if (!container || !sku) { if (container) container.innerHTML = '<div class="card" style="padding:16px;color:var(--text-3);text-align:center;">请选择 SKU</div>'; return; }
    var detail = Data.getSKUAttributionDetail(sku, attrState.rangeA, attrState.rangeB);
    if (!detail) { container.innerHTML = '<div class="card" style="padding:16px;color:var(--text-3);text-align:center;">该 SKU 在所选时间段内数据不足，请换时间段或 SKU</div>'; return; }

    var prevLabel = detail.prevMonth || '前一区间';
    var currLabel = detail.currMonth || '当前区间';
    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + detail.curr.orderRate + '%</div><div class="stat-card__label">' + currLabel + ' 出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--text-2);">' + detail.prev.orderRate + '%</div><div class="stat-card__label">' + prevLabel + ' 出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:' + (detail.curr.orderRate >= detail.prev.orderRate ? 'var(--c-success)' : 'var(--c-danger)') + ';">' + (detail.curr.orderRate - detail.prev.orderRate >= 0 ? '+' : '') + (Math.round((detail.curr.orderRate - detail.prev.orderRate) * 10) / 10) + '%</div><div class="stat-card__label">变化</div></div>'
      + '</div>';

    html += '<div class="attribution-grid">';
    html += renderDimCard('官方等级', detail.prev.official, detail.curr.official, prevLabel, currLabel);
    html += renderDimCard('年龄分布', detail.prev.age, detail.curr.age, prevLabel, currLabel);
    html += renderDimCard('身材分布', detail.prev.body, detail.curr.body, prevLabel, currLabel);
    html += renderDimCard('品类分布', detail.prev.category, detail.curr.category, prevLabel, currLabel);
    html += renderDimCard('颜色分布', detail.prev.color, detail.curr.color, prevLabel, currLabel);
    html += renderDimCard('语言分布', detail.prev.language, detail.curr.language, prevLabel, currLabel);
    html += renderDimCard('通过方式', detail.prev.approval, detail.curr.approval, prevLabel, currLabel);
    html += '</div>';

    container.innerHTML = html;
  }

  function renderDimCard(title, prevArr, currArr, prevLabel, currLabel) {
    prevLabel = prevLabel || '前一区间';
    currLabel = currLabel || '当前区间';
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
        + '<span style="font-size:11px;color:var(--text-3);">' + prevLabel + ' ' + p.pct + '% → ' + currLabel + ' ' + c.pct + '% <b style="color:' + diffColor + ';">(' + (diff >= 0 ? '+' : '') + diff + '%)</b></span>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + pW + '%;background:var(--border-2);border-radius:4px;"></div></div>'
        + '<div style="flex:1;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + cW + '%;background:var(--pink-400);border-radius:4px;"></div></div>'
        + '</div>'
        + '</div>';
    }).join('');

    return '<div class="dim-card">'
      + '<div class="dim-title">' + App.escapeHtml(title) + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:8px;"><span>▬ ' + prevLabel + '</span><span>▬ ' + currLabel + '</span></div>'
      + rows
      + '</div>';
  }

  /* ================================================================
     视图3: 通过率（通过率 = 寄样量 ÷ 邀约实际数量/达成量）
     支持筛选时间（默认当月），或 SKU+时间组合
     ================================================================ */
  function renderPassRateView() {
    renderPassRateMetrics();
    renderPassRateTrend();
    renderPassRateSKU();
  }

  function getPassRateData() {
    return Data.getPassRateAnalysis(filterState.startDate || null, filterState.endDate || null, filterState.sku || null);
  }

  function renderPassRateMetrics() {
    var container = document.getElementById('passrate-metrics');
    if (!container) return;
    var p = getPassRateData();
    var rateText = p.overallPassRate === null ? '—' : p.overallPassRate + '%';
    var rangeText = '';
    if (filterState.sku) rangeText += 'SKU ' + filterState.sku + ' · ';
    if (filterState.startDate && filterState.endDate) rangeText += filterState.startDate + ' ~ ' + filterState.endDate;
    else if (filterState.startDate) rangeText += filterState.startDate + ' ~ …';
    else if (filterState.endDate) rangeText += '… ~ ' + filterState.endDate;
    else rangeText += '全部时间';
    // 趋势方向：对比最近两个有邀约的月份
    var valid = p.monthly.filter(function (m) { return m.inviteReached > 0; });
    var trendHtml = '—';
    if (valid.length >= 2) {
      var prev = valid[valid.length - 2], curr = valid[valid.length - 1];
      if (curr.passRate !== null && prev.passRate !== null) {
        var diff = Math.round((curr.passRate - prev.passRate) * 100) / 100;
        var color = diff > 0 ? 'var(--c-success)' : diff < 0 ? 'var(--c-danger)' : 'var(--text-2)';
        trendHtml = '<span style="color:' + color + ';">' + (diff > 0 ? '+' : '') + diff + '%</span>'
          + '<div style="font-size:10px;color:var(--text-3);font-weight:400;">' + prev.month + '→' + curr.month + '</div>';
      }
    }
    container.innerHTML = ''
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + rateText + '</div><div class="stat-card__label">整体通过率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(p.totalSampleCount) + '</div><div class="stat-card__label">寄样量</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(p.totalInviteReached) + '</div><div class="stat-card__label">邀约实际数量</div></div>'
      + '<div class="stat-card"><div class="stat-card__value">' + trendHtml + '</div><div class="stat-card__label">通过率环比</div></div>'
      + '<div style="grid-column:1/-1;font-size:11px;color:var(--text-3);padding:0 4px 4px;">当前筛选：' + App.escapeHtml(rangeText) + ' · ' + p.totalPlanCount + ' 个邀约计划 · 通过率 = 寄样量 ÷ 邀约达成量</div>';
  }

  function renderPassRateTrend() {
    var container = document.getElementById('passrate-trend-chart');
    if (!container) return;
    var p = getPassRateData();
    var pts = p.monthly.filter(function (m) { return m.inviteReached > 0 || m.sampleCount > 0; });
    if (pts.length === 0) { container.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无月度数据</div>'; return; }

    var W = 680, H = 220, padL = 44, padB = 32, padT = 20, padR = 24;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxR = Math.max.apply(null, pts.map(function (m) { return m.passRate || 0; }).concat([0.1]));
    var n = pts.length;
    var step = n > 1 ? plotW / (n - 1) : 0;
    var coords = pts.map(function (m, i) {
      return {
        x: n > 1 ? padL + i * step : padL + plotW / 2,
        y: padT + plotH - ((m.passRate || 0) / maxR * plotH),
        m: m,
      };
    });
    var line = coords.map(function (c) { return c.x + ',' + c.y; }).join(' ');
    var dots = coords.map(function (c, i) {
      var anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      return '<circle cx="' + c.x + '" cy="' + c.y + '" r="4" fill="var(--pink-500)" stroke="#fff" stroke-width="2">'
        + '<title>' + c.m.month + ' 通过率 ' + (c.m.passRate === null ? '—' : c.m.passRate + '%') + '（寄样 ' + c.m.sampleCount + ' / 邀约 ' + App.formatNumber(c.m.inviteReached) + '）</title></circle>'
        + '<text x="' + c.x + '" y="' + (H - 10) + '" font-size="10" fill="#9b8e8e" text-anchor="' + anchor + '">' + c.m.month.slice(2) + '</text>'
        + '<text x="' + c.x + '" y="' + (c.y - 8) + '" font-size="9" fill="var(--pink-600)" text-anchor="' + anchor + '">' + (c.m.passRate === null ? '' : c.m.passRate + '%') + '</text>';
    }).join('');
    var yTicks = [0, maxR / 2, maxR].map(function (v) {
      var y = padT + plotH - (v / maxR * plotH);
      return '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" font-size="9" fill="#9b8e8e" text-anchor="end">' + (Math.round(v * 100) / 100) + '%</text>';
    }).join('');
    container.innerHTML = '<div style="padding:8px 4px;">'
      + '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;">'
      + '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="#efe6e6"/>'
      + '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="#efe6e6"/>'
      + yTicks
      + '<polyline points="' + line + '" fill="none" stroke="var(--pink-500)" stroke-width="2" stroke-linejoin="round"/>'
      + dots
      + '</svg>'
      + '<div style="font-size:11px;color:var(--text-3);margin-top:6px;">月度通过率 = 当月寄样量 ÷ 当月邀约达成量（悬停查看各月明细）</div></div>';
  }

  function renderPassRateSKU() {
    var container = document.getElementById('passrate-sku-table');
    if (!container) return;
    var p = getPassRateData();
    if (p.skuRanking.length === 0) { container.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div>'; return; }
    // 只展示有寄样或有邀约的 SKU，最多 15 行
    var rows = p.skuRanking.slice(0, 15);
    var html = '<div style="padding:4px 0;">'
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);padding:0 4px 8px;border-bottom:1px solid var(--border-1);font-weight:600;">'
      + '<span style="flex:1;">SKU</span><span style="width:80px;text-align:right;">寄样量</span><span style="width:90px;text-align:right;">邀约达成</span><span style="width:70px;text-align:right;">通过率</span>'
      + '</div>';
    var maxRate = Math.max.apply(null, rows.map(function (r) { return r.passRate || 0; }).concat([0.1]));
    rows.forEach(function (r) {
      var rateText = r.passRate === null ? '—' : r.passRate + '%';
      var barW = Math.round((r.passRate || 0) / maxRate * 100);
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 4px;border-bottom:1px solid var(--border-1);">'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(r.sku)
        + (r.productName ? ' <span style="font-size:11px;color:var(--text-3);font-weight:400;">' + App.escapeHtml(r.productName) + '</span>' : '') + '</div>'
        + '<div style="height:5px;background:var(--bg-pink-soft);border-radius:3px;overflow:hidden;margin-top:4px;max-width:200px;">'
        + '<div style="height:100%;width:' + barW + '%;background:var(--pink-400);border-radius:3px;"></div></div>'
        + '</div>'
        + '<span style="width:80px;text-align:right;font-size:12px;color:var(--text-2);font-weight:600;">' + r.sampleCount + '</span>'
        + '<span style="width:90px;text-align:right;font-size:12px;color:var(--text-2);">' + App.formatNumber(r.inviteReached) + '</span>'
        + '<span style="width:70px;text-align:right;font-size:13px;font-weight:700;color:' + (r.passRate === null ? 'var(--text-3)' : 'var(--pink-600)') + ';">' + rateText + '</span>'
        + '</div>';
    });
    html += '</div>'
      + '<div style="font-size:11px;color:var(--text-3);margin-top:8px;">某 SKU 通过率 = 该 SKU 寄样量 ÷ 该 SKU 邀约达成量（受当前时间筛选影响）</div>';
    container.innerHTML = html;
  }

  /* ================================================================
     主渲染
     ================================================================ */
  function render() {
    renderTrendView();
    renderAttributionView();
    renderPassRateView();
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
    }, { pageId: 'report' });
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
