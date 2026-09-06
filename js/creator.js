/* ================================================================
   Dlooda TKBD CRM — Creator CRM Logic (v2)
   基于真实飞书数据：1746个达人
   字段：达人名称/官方等级/星级/达人类型/身材/年龄/履约率/品类/寄样数/视频数
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var currentFilter = 'all';
  var currentKeyword = '';
  // 启动时尝试恢复筛选缓存（5 分钟内有效）
  (function () {
    var saved = App.loadFilterState('creator');
    if (saved) {
      if (typeof saved.tab === 'string') currentFilter = saved.tab;
      if (typeof saved.search === 'string') currentKeyword = saved.search;
    }
  })();

  /* ---------- 筛选 tabs ---------- */
  var FILTERS = [
    { id: 'all',     label: '全部' },
    { id: 'core',    label: '核心达人' },
    { id: 'potential', label: '潜力达人' },
    { id: 'hasVideo', label: '有视频' },
    { id: 'noVideo',  label: '待跟进' },
  ];

  /* ---------- 获取筛选后列表 ---------- */
  function getFilteredCreators() {
    var list = Data.getCreators();

    if (currentKeyword) {
      list = Data.searchCreators(currentKeyword);
    }

    if (currentFilter !== 'all') {
      list = list.filter(function (c) {
        if (currentFilter === 'core') return c.creatorType && c.creatorType.indexOf('核心') >= 0;
        if (currentFilter === 'potential') return c.creatorType && c.creatorType.indexOf('潜力') >= 0;
        if (currentFilter === 'hasVideo') return c.videoCount > 0;
        if (currentFilter === 'noVideo') return c.videoCount === 0;
        return true;
      });
    }

    return list;
  }

  /* ---------- 官方等级 badge 颜色 ---------- */
  function officialBadge(official) {
    if (!official) return '';
    var cls = 'badge--gray';
    if (official === 'L5' || official === 'L6') cls = 'badge--pink';
    else if (official === 'L4') cls = 'badge--blue';
    else if (official === 'L3') cls = 'badge--green';
    else if (official === 'L2') cls = 'badge--sand';
    return '<span class="badge ' + cls + '">' + App.escapeHtml(official) + '</span>';
  }

  /* ---------- 履约率 badge ---------- */
  function fulfillmentBadge(f) {
    if (!f) return '';
    var cls = f === '诚信' ? 'badge--green' : 'badge--sand';
    return '<span class="badge ' + cls + '">' + App.escapeHtml(f) + '</span>';
  }

  /* ---------- 达人价值分析：帕累托 + LTV 榜 ---------- */
  var valueExpanded = true;

  function renderValueAnalysis() {
    var container = document.getElementById('creator-value');
    if (!container) return;
    var va = Data.getCreatorValueAnalysis();
    if (!va || !va.totalCreators) { container.innerHTML = ''; return; }

    var html = ''
      + '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header" style="display:flex;align-items:center;justify-content:space-between;">'
      +   '<h3 class="card__title">🎀 达人价值分析 · 帕累托 & LTV</h3>'
      +   '<button class="btn btn--ghost btn--sm" id="btn-value-toggle" style="font-size:11px;">' + (valueExpanded ? '收起' : '展开') + '</button>'
      + '</div>';

    if (valueExpanded) {
      // 概览 stat
      html += '<div class="stat-grid" style="margin-bottom:12px;">'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(va.totalOrders) + '</div><div class="stat-card__label">累计出单件数</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + va.orderedCreators + '/' + va.totalCreators + '</div><div class="stat-card__label">出单达人 (' + va.orderedCreatorRate + '%)</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-warning);">' + va.pareto[0].share + '%</div><div class="stat-card__label">Top 10% 达人出单贡献</div></div>'
        + '</div>';

      // 帕累托条
      html += '<div style="margin-bottom:14px;">';
      va.pareto.forEach(function (p) {
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
          + '<span style="width:70px;font-size:12px;font-weight:600;color:var(--text-2);">Top ' + p.pct + '%</span>'
          + '<div style="flex:1;height:20px;background:var(--bg-pink-soft);border-radius:10px;overflow:hidden;">'
          + '<div style="height:100%;width:' + Math.min(p.share, 100) + '%;background:var(--pink-400, #ED93B1);border-radius:10px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;">'
          + '<span style="font-size:11px;font-weight:700;color:#fff;">' + p.share + '%</span>'
          + '</div></div>'
          + '<span style="width:110px;font-size:11px;color:var(--text-3);">' + p.creators + '人 · ' + App.formatNumber(p.orders) + '件</span>'
          + '</div>';
      });
      html += '</div>';

      // 结论
      html += '<div style="font-size:12px;color:var(--text-3);background:var(--bg-pink-soft);border-radius:8px;padding:8px 12px;margin-bottom:14px;">'
        + '💡 出单高度集中在头部：Top 10% 达人贡献了 ' + va.pareto[0].share + '% 的出单件数，'
        + '而 ' + (100 - va.orderedCreatorRate) + '% 的达人从未出过单。寄样预算优先保头部达人，尾部减少非必要寄样。'
        + '</div>';

      // LTV 榜
      html += '<div style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-3);">#</th>'
        + '<th style="padding:8px 6px;text-align:left;font-weight:600;color:var(--text-2);">达人</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-2);">等级</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--pink-500);">累计出单</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-2);">出单次数</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-2);">寄样</th>'
        + '<th style="padding:8px 6px;text-align:center;font-weight:600;color:var(--text-2);">视频</th>'
        + '<th style="padding:8px 6px;text-align:left;font-weight:600;color:var(--text-3);">最近寄样</th>'
        + '</tr></thead><tbody>';
      va.topCreators.slice(0, 20).forEach(function (c, i) {
        var orderVal = c.orders > 0
          ? '<span style="color:var(--pink-500);font-weight:700;">' + App.formatNumber(c.orders) + '</span>'
          : '<span style="color:var(--text-3);">0</span>';
        html += '<tr style="border-bottom:1px solid var(--border-1);">'
          + '<td style="padding:6px;text-align:center;color:var(--text-3);">' + (i + 1) + '</td>'
          + '<td style="padding:6px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(c.name) + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--text-3);">' + App.escapeHtml((c.official || '') + ' ' + (c.stars || '')) + '</td>'
          + '<td style="padding:6px;text-align:center;">' + orderVal + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--text-2);">' + c.orderedSamples + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--text-2);">' + c.sampleCount + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--text-2);">' + c.videoCount + '</td>'
          + '<td style="padding:6px;color:var(--text-3);">' + (c.lastSampleTime ? App.escapeHtml(c.lastSampleTime.split(' ')[0]) : '') + '</td>'
          + '</tr>';
      });
      html += '</tbody></table>'
        + '<div style="text-align:center;padding:8px;color:var(--text-3);font-size:12px;">按累计出单件数排序 · 显示 Top 20（全部达人 ' + va.totalCreators + ' 位）</div>'
        + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    var toggleBtn = document.getElementById('btn-value-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        valueExpanded = !valueExpanded;
        renderValueAnalysis();
      });
    }
  }

  /* ---------- 渲染筛选 tabs ---------- */
  function renderFilterTabs() {
    var container = document.getElementById('filter-tabs');
    if (!container) return;

    var all = Data.getCreators();
    var counts = {
      all: all.length,
      core: all.filter(function (c) { return c.creatorType && c.creatorType.indexOf('核心') >= 0; }).length,
      potential: all.filter(function (c) { return c.creatorType && c.creatorType.indexOf('潜力') >= 0; }).length,
      hasVideo: all.filter(function (c) { return c.videoCount > 0; }).length,
      noVideo: all.filter(function (c) { return c.videoCount === 0; }).length,
    };

    container.innerHTML = FILTERS.map(function (f) {
      var isActive = f.id === currentFilter;
      return ''
        + '<button class="filter-tab' + (isActive ? ' active' : '') + '" data-filter="' + f.id + '">'
        +   f.label
        +   '<span class="count">' + (counts[f.id] || 0) + '</span>'
        + '</button>';
    }).join('');

    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentFilter = this.getAttribute('data-filter');
        App.saveFilterState('creator', { tab: currentFilter, search: currentKeyword });
        renderFilterTabs();
        renderCreatorList();
      });
    });
  }

  /* ---------- 渲染达人卡片 ---------- */
  function renderCreatorCard(creator) {
    var initials = App.getInitials(creator.name);
    var stars = creator.stars || '—';
    var tiktokLink = '@' + creator.name;

    // 达人类型 badge
    var typeBadge = '';
    if (creator.creatorType) {
      var typeCls = 'badge--gray';
      if (creator.creatorType.indexOf('核心') >= 0) typeCls = 'badge--pink';
      else if (creator.creatorType.indexOf('潜力') >= 0) typeCls = 'badge--blue';
      else if (creator.creatorType.indexOf('黑名单') >= 0) typeCls = 'badge--gray';
      else if (creator.creatorType.indexOf('低效') >= 0) typeCls = 'badge--sand';
      typeBadge = '<span class="badge ' + typeCls + '">' + App.escapeHtml(creator.creatorType.split(',')[0]) + '</span>';
    }

    // SKU 标签
    var skuText = creator.skus && creator.skus.length > 0
      ? 'SKU: ' + creator.skus.slice(0, 3).join(', ') + (creator.skus.length > 3 ? '...' : '')
      : '无寄样记录';

    // 寄样/视频统计
    var statsHtml = ''
      + '<span class="creator-card__meta-item">📦 ' + creator.sampleCount + '次寄样</span>'
      + '<span class="creator-card__meta-item">🎬 ' + creator.videoCount + '个视频</span>';

    if (creator.lastSampleTime) {
      statsHtml += '<span class="creator-card__meta-item">📅 ' + creator.lastSampleTime.split(' ')[0] + '</span>';
    }

    return ''
      + '<div class="creator-card" data-creator-name="' + App.escapeHtml(creator.name) + '">'
      +   '<div class="creator-card__avatar">' + initials + '</div>'
      +   '<div class="creator-card__body">'
      +     '<div class="creator-card__name">'
      +       App.escapeHtml(creator.name)
      +       '<span class="creator-card__link">' + App.escapeHtml(tiktokLink) + '</span>'
      +     '</div>'
      +     '<div class="creator-card__meta">'
      +       officialBadge(creator.official)
      +       '<span class="creator-card__meta-item">⭐ ' + App.escapeHtml(stars) + '</span>'
      +       typeBadge
      +       fulfillmentBadge(creator.fulfillment)
      +       (creator.category ? '<span class="creator-card__meta-item">' + App.escapeHtml(creator.category) + '</span>' : '')
      +     '</div>'
      +     '<div class="creator-card__meta">'
      +       statsHtml
      +     '</div>'
      +     (creator.note ? '<div class="creator-card__meta"><span class="creator-card__meta-item" style="color:var(--text-tertiary)">📝 ' + App.escapeHtml(creator.note) + '</span></div>' : '')
      +   '</div>'
      +   '<div class="creator-card__score">'
      +     '<div class="creator-card__score-stars">' + App.escapeHtml(stars) + '</div>'
      +     '<div class="creator-card__score-value">' + creator.sampleCount + '<span>寄样</span></div>'
      +   '</div>'
      + '</div>';
  }

  /* ---------- 渲染列表 ---------- */
  function renderCreatorList() {
    var container = document.getElementById('creator-list');
    if (!container) return;

    var list = getFilteredCreators();

    var countEl = document.getElementById('creator-count');
    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = ''
        + '<div class="empty-state">'
        +   '<div class="empty-state__icon">' + App.svg.paw + '</div>'
        +   '<div class="empty-state__text">没有找到匹配的达人</div>'
        + '</div>';
      return;
    }

    // 限制渲染数量（性能：1746个达人）
    var displayList = list.slice(0, 100);
    var html = displayList.map(renderCreatorCard).join('');

    if (list.length > 100) {
      html += '<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:13px;">'
        + '显示前 100 条，共 ' + list.length + ' 条结果。请用搜索缩小范围 🔍'
        + '</div>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.creator-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var name = this.getAttribute('data-creator-name');
        global.location.href = 'ai-assistant.html?creator=' + encodeURIComponent(name);
      });
    });
  }

  /* ---------- 搜索 ---------- */
  function bindSearch() {
    var searchInput = document.getElementById('creator-search');
    if (!searchInput) return;

    var debounceTimer;
    searchInput.addEventListener('change', function () {
      // change 触发时把 input 的初始值（DOM 默认）同步给 currentKeyword
      currentKeyword = searchInput.value;
    });
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        currentKeyword = searchInput.value;
        App.saveFilterState('creator', { tab: currentFilter, search: currentKeyword });
        renderCreatorList();
      }, 300);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    var searchInput = document.getElementById('creator-search');
    if (searchInput && currentKeyword) searchInput.value = currentKeyword;
    renderValueAnalysis();
    renderFilterTabs();
    renderCreatorList();
    bindSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DloodaCreator = { init: init };

})(window);
