/* ================================================================
   Dlooda TKBD CRM — 样品追踪 (v3)
   SKU筛选 · 时间范围 · 数据看板 · 月报支撑
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var currentFilter = 'all';
  var currentSku = '';
  var currentKeyword = '';
  var startDate = '';
  var endDate = '';
  var viewMode = 'list'; // 'list' or 'dashboard'

  var FILTERS = [
    { id: 'all',         label: '全部' },
    { id: 'video',       label: '已出视频' },
    { id: 'live',        label: '直播' },
    { id: 'pushed',      label: '已催' },
    { id: 'cancelled',   label: '已取消' },
    { id: 'unfulfilled', label: '未履约' },
    { id: 'ordered',     label: '已出单' },
  ];

  function matchFilter(s) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'video') return s.fulfillMethod === '视频';
    if (currentFilter === 'live') return s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0;
    if (currentFilter === 'pushed') return s.fulfillMethod && s.fulfillMethod.indexOf('已催') >= 0;
    if (currentFilter === 'cancelled') return s.fulfillMethod === '已取消';
    if (currentFilter === 'unfulfilled') return s.fulfillMethod === '未履约' || !s.fulfillMethod;
    if (currentFilter === 'ordered') return s.orderCount && s.orderCount > 0;
    return true;
  }

  function matchSku(s) {
    if (!currentSku) return true;
    return s.sku === currentSku;
  }

  function matchDate(s) {
    if (!s.sampleTime) return !startDate && !endDate;
    if (startDate && s.sampleTime < startDate) return false;
    if (endDate && s.sampleTime > endDate + ' 23:59') return false;
    return true;
  }

  /* ---------- 渲染 SKU 筛选条 ---------- */
  function renderSkuTabs() {
    var container = document.getElementById('sku-tabs');
    if (!container) return;
    var stats = Data.getSampleStats();
    var topSKUs = Object.entries(stats.bySKU)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 8)
      .map(function (e) { return e[0]; });

    var tabs = '<button class="filter-tab' + (!currentSku ? ' active' : '') + '" data-sku="">全部 SKU<span class="count">' + stats.total + '</span></button>';
    topSKUs.forEach(function (sku) {
      tabs += '<button class="filter-tab' + (currentSku === sku ? ' active' : '') + '" data-sku="' + App.escapeHtml(sku) + '">SKU ' + App.escapeHtml(sku) + '<span class="count">' + stats.bySKU[sku] + '</span></button>';
    });
    container.innerHTML = tabs;
    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentSku = tab.getAttribute('data-sku');
        renderSkuTabs();
        if (viewMode === 'dashboard') renderDashboard();
        else renderList();
      });
    });
  }

  /* ---------- 渲染状态统计 ---------- */
  function renderStats() {
    var stats = Data.getSampleDashboard(currentSku, startDate, endDate);
    var container = document.getElementById('sample-stats');
    if (!container) return;

    container.innerHTML = ''
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(stats.total) + '</div><div class="stat-card__label">总寄样</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + App.formatNumber(stats.fulfilled) + '</div><div class="stat-card__label">已履约</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-danger);">' + App.formatNumber(stats.unfulfilled + stats.cancelled) + '</div><div class="stat-card__label">未履约/取消</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(stats.ordered) + '</div><div class="stat-card__label">已出单</div></div>';
  }

  /* ---------- 渲染筛选条 ---------- */
  function renderTabs() {
    var container = document.getElementById('filter-tabs');
    if (!container) return;
    var all = Data.getSamples().filter(matchSku).filter(matchDate);
    var counts = {
      all: all.length,
      video: all.filter(function(s) { return s.fulfillMethod === '视频'; }).length,
      live: all.filter(function(s) { return s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0; }).length,
      pushed: all.filter(function(s) { return s.fulfillMethod && s.fulfillMethod.indexOf('已催') >= 0; }).length,
      cancelled: all.filter(function(s) { return s.fulfillMethod === '已取消'; }).length,
      unfulfilled: all.filter(function(s) { return s.fulfillMethod === '未履约' || !s.fulfillMethod; }).length,
      ordered: all.filter(function(s) { return s.orderCount && s.orderCount > 0; }).length,
    };

    container.innerHTML = FILTERS.map(function (f) {
      return '<button class="filter-tab' + (f.id === currentFilter ? ' active' : '') + '" data-filter="' + f.id + '">'
        + f.label + '<span class="count">' + (counts[f.id] || 0) + '</span></button>';
    }).join('');
    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentFilter = this.getAttribute('data-filter');
        renderTabs();
        renderList();
      });
    });
  }

  /* ---------- 渲染看板 ---------- */
  function renderDashboard() {
    var container = document.getElementById('sample-dashboard');
    if (!container) return;
    var stats = Data.getSampleDashboard(currentSku, startDate, endDate);

    var total = stats.total || 1;
    var fulfillPct = Math.round(stats.fulfilled / total * 100);
    var orderPct = Math.round(stats.ordered / total * 100);
    var unfulfillPct = Math.round((stats.unfulfilled + stats.cancelled) / total * 100);

    var html = ''
      + '<div class="stat-grid" style="margin-bottom:16px;">'
      +   '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + stats.total + '</div><div class="stat-card__label">总寄样</div></div>'
      +   '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + stats.fulfilled + '</div><div class="stat-card__label">已履约 (' + fulfillPct + '%)</div></div>'
      +   '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-danger);">' + (stats.unfulfilled + stats.cancelled) + '</div><div class="stat-card__label">未履约/取消 (' + unfulfillPct + '%)</div></div>'
      +   '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + stats.ordered + '</div><div class="stat-card__label">已出单 (' + orderPct + '%)</div></div>'
      + '</div>';

    // 履约漏斗
    html += '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header"><h3 class="card__title">履约漏斗</h3></div>'
      + '<div style="padding:8px 0;">';
    var funnel = [
      { label: '寄样总数', count: stats.total, color: 'var(--c-primary)', pct: 100 },
      { label: '已履约', count: stats.fulfilled, color: 'var(--c-success)', pct: fulfillPct },
      { label: '已出视频', count: stats.withVideo, color: 'var(--c-info)', pct: Math.round(stats.withVideo / total * 100) },
      { label: '已出单', count: stats.ordered, color: 'var(--pink-500)', pct: orderPct },
    ];
    funnel.forEach(function (f) {
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
        + '<span style="width:80px;font-size:12px;font-weight:600;color:var(--text-2);">' + f.label + '</span>'
        + '<div style="flex:1;height:24px;background:var(--bg-pink-soft);border-radius:12px;overflow:hidden;">'
        + '<div style="height:100%;width:' + f.pct + '%;background:' + f.color + ';border-radius:12px;transition:width .6s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;">'
        + '<span style="font-size:11px;font-weight:700;color:#fff;">' + f.count + '</span>'
        + '</div></div>'
        + '<span style="width:40px;text-align:right;font-size:12px;color:var(--text-3);">' + f.pct + '%</span>'
        + '</div>';
    });
    html += '</div></div>';

    // 达人合作情况表
    if (stats.creators.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">达人合作情况 (' + stats.uniqueCreatorCount + ' 人)</h3></div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:8px 6px;text-align:left;font-weight:600;color:var(--text-2);">达人</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-2);">寄样</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--c-success);">履约</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--c-danger);">未履约</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--pink-500);">出单</th>'
        + '<th style="padding:8px 6px;text-align:left;font-weight:600;color:var(--text-3);">等级</th>'
        + '</tr></thead><tbody>';
      stats.creators.slice(0, 50).forEach(function (c) {
        var orderBadge = c.ordered > 0 ? '<span style="color:var(--pink-500);font-weight:700;">' + c.ordered + '</span>' : '<span style="color:var(--text-3);">0</span>';
        html += '<tr style="border-bottom:1px solid var(--border-1);">'
          + '<td style="padding:6px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(c.name) + '</td>'
          + '<td style="padding:6px;text-align:center;">' + c.sampleCount + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--c-success);">' + c.fulfilled + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--c-danger);">' + c.unfulfilled + '</td>'
          + '<td style="padding:6px;text-align:center;">' + orderBadge + '</td>'
          + '<td style="padding:6px;color:var(--text-3);">' + App.escapeHtml(c.official || '') + ' ' + App.escapeHtml(c.stars || '') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>';
      if (stats.creators.length > 50) {
        html += '<div style="text-align:center;padding:8px;color:var(--text-3);font-size:12px;">显示前 50 位，共 ' + stats.creators.length + ' 位达人</div>';
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }

  /* ---------- 渲染列表 ---------- */
  function renderList() {
    var container = document.getElementById('sample-list');
    if (!container) return;

    var list = Data.getSamples().filter(matchSku).filter(matchDate).filter(matchFilter);

    if (currentKeyword) {
      var kw = currentKeyword.toLowerCase();
      list = list.filter(function (s) {
        return s.creator.toLowerCase().includes(kw) ||
               (s.sku && s.sku.toLowerCase().includes(kw)) ||
               (s.note && s.note.toLowerCase().includes(kw)) ||
               (s.category && s.category.toLowerCase().includes(kw));
      });
    }

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">没有匹配的寄样记录</div></div>';
      return;
    }

    var displayList = list.slice(0, 100);
    var html = displayList.map(function (s) {
      var methodBadge = '';
      if (s.fulfillMethod) {
        var cls = 'badge--gray';
        if (s.fulfillMethod === '视频') cls = 'badge--green';
        else if (s.fulfillMethod.indexOf('直播') >= 0) cls = 'badge--blue';
        else if (s.fulfillMethod.indexOf('已催') >= 0) cls = 'badge--sand';
        else if (s.fulfillMethod === '已取消') cls = 'badge--red';
        else if (s.fulfillMethod === '未履约') cls = 'badge--red';
        methodBadge = '<span class="badge ' + cls + '">' + App.escapeHtml(s.fulfillMethod) + '</span>';
      } else {
        methodBadge = '<span class="badge badge--gray">待确认</span>';
      }

      var orderBadge = (s.orderCount && s.orderCount > 0) ? '<span class="badge badge--pink">出单 ' + s.orderCount + '</span>' : '';
      var skuInfo = s.sku ? 'SKU ' + App.escapeHtml(s.sku) : '无SKU';
      var colorInfo = s.color ? ' · ' + App.escapeHtml(s.color) : '';
      var timeInfo = s.sampleTime ? ' · ' + s.sampleTime.split(' ')[0] : '';
      var videoInfo = s.videoCount > 0 ? ' · 🎬 ' + s.videoCount + '个视频' : '';
      var reinvestInfo = s.reinvest ? '<span class="badge badge--pink">' + App.escapeHtml(s.reinvest) + '</span>' : '';

      return ''
        + '<div class="creator-card">'
        +   '<div class="creator-card__avatar">' + App.getInitials(s.creator) + '</div>'
        +   '<div class="creator-card__body">'
        +     '<div class="creator-card__name">'
        +       App.escapeHtml(s.creator)
        +       '<span class="creator-card__link">' + (s.official || '') + ' ' + App.escapeHtml(s.stars || '') + '</span>'
        +     '</div>'
        +     '<div class="creator-card__meta">'
        +       methodBadge
        +       '<span class="creator-card__meta-item">' + skuInfo + colorInfo + '</span>'
        +       reinvestInfo
        +       orderBadge
        +     '</div>'
        +     '<div class="creator-card__meta">'
        +       '<span class="creator-card__meta-item" style="color:var(--text-tertiary);font-size:11px;">' + App.escapeHtml(s.category || '') + timeInfo + videoInfo + '</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="creator-card__score">'
        +     '<div class="creator-card__score-value">' + s.videoCount + '<span>视频</span></div>'
        +   '</div>'
        + '</div>';
    }).join('');

    if (list.length > 100) {
      html += '<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:13px;">'
        + '显示前 100 条，共 ' + list.length + ' 条。请用搜索缩小范围 🔍'
        + '</div>';
    }

    container.innerHTML = html;
  }

  /* ---------- 视图切换 ---------- */
  function switchView(mode) {
    viewMode = mode;
    var listEl = document.getElementById('sample-list');
    var dashEl = document.getElementById('sample-dashboard');
    var listBtn = document.getElementById('btn-view-list');
    var dashBtn = document.getElementById('btn-view-dashboard');

    if (mode === 'dashboard') {
      if (listEl) listEl.style.display = 'none';
      if (dashEl) dashEl.style.display = 'block';
      if (listBtn) listBtn.classList.remove('active');
      if (dashBtn) dashBtn.classList.add('active');
      renderDashboard();
    } else {
      if (listEl) listEl.style.display = 'block';
      if (dashEl) dashEl.style.display = 'none';
      if (listBtn) listBtn.classList.add('active');
      if (dashBtn) dashBtn.classList.remove('active');
      renderList();
    }
  }

  /* ---------- 日期筛选 ---------- */
  function handleDateChange() {
    var startEl = document.getElementById('date-start');
    var endEl = document.getElementById('date-end');
    startDate = startEl ? startEl.value : '';
    endDate = endEl ? endEl.value : '';
    renderStats();
    renderTabs();
    if (viewMode === 'dashboard') renderDashboard();
    else renderList();
  }

  function setQuickRange(months) {
    var now = new Date();
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    var startEl = document.getElementById('date-start');
    var endEl = document.getElementById('date-end');
    if (startEl) startEl.value = start.toISOString().split('T')[0];
    if (endEl) endEl.value = end.toISOString().split('T')[0];
    handleDateChange();
  }

  function clearDate() {
    var startEl = document.getElementById('date-start');
    var endEl = document.getElementById('date-end');
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
    handleDateChange();
  }

  function bindSearch() {
    var searchInput = document.getElementById('sample-search');
    if (!searchInput) return;
    var debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        currentKeyword = searchInput.value;
        renderList();
      }, 300);
    });
  }

  function init() {
    renderStats();
    renderSkuTabs();
    renderTabs();
    renderList();
    bindSearch();

    var listBtn = document.getElementById('btn-view-list');
    if (listBtn) listBtn.addEventListener('click', function () { switchView('list'); });
    var dashBtn = document.getElementById('btn-view-dashboard');
    if (dashBtn) dashBtn.addEventListener('click', function () { switchView('dashboard'); });

    var startEl = document.getElementById('date-start');
    if (startEl) startEl.addEventListener('change', handleDateChange);
    var endEl = document.getElementById('date-end');
    if (endEl) endEl.addEventListener('change', handleDateChange);

    var btnMonth = document.getElementById('btn-quick-month');
    if (btnMonth) btnMonth.addEventListener('click', function () { setQuickRange(1); });
    var btnClear = document.getElementById('btn-clear-date');
    if (btnClear) btnClear.addEventListener('click', clearDate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
