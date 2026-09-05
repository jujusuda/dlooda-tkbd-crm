/* ================================================================
   Dlooda TKBD CRM — 视频管理 (v3)
   深度分析：出单视频 · SKU维度 · 颜色维度 · 达人画像 · 特征分析
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var currentFilter = 'all';
  var currentSort = 'date';
  var currentKeyword = '';
  var viewMode = 'list';
  var filterState = { sku: '', startDate: '', endDate: '' };

  function getFilteredAndSorted() {
    var list = Data.getVideos();
    // SKU筛选（兼容tab选择和filter bar）
    var activeSku = filterState.sku || currentFilter;
    if (activeSku !== 'all' && activeSku) {
      list = list.filter(function (v) { return v.sku === activeSku; });
    }
    // 日期筛选（按视频发布时间）
    if (filterState.startDate) {
      list = list.filter(function (v) { return v.postTime && v.postTime >= filterState.startDate; });
    }
    if (filterState.endDate) {
      list = list.filter(function (v) { return v.postTime && v.postTime <= filterState.endDate + ' 23:59'; });
    }
    if (currentKeyword) {
      var kw = currentKeyword.toLowerCase();
      list = list.filter(function (v) {
        return v.creator.toLowerCase().includes(kw) ||
               (v.sku && v.sku.toLowerCase().includes(kw)) ||
               (v.category && v.category.toLowerCase().includes(kw));
      });
    }
    list.sort(function (a, b) {
      if (currentSort === 'date') return (b.postTime || '') > (a.postTime || '') ? 1 : -1;
      if (currentSort === 'creator') return a.creator.localeCompare(b.creator);
      if (currentSort === 'sku') return (a.sku || '').localeCompare(b.sku || '');
      return 0;
    });
    return list;
  }

  function renderTabs() {
    var container = document.getElementById('filter-tabs');
    if (!container) return;
    var stats = Data.getVideoStats();
    var topSKUs = Object.entries(stats.bySKU)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 6)
      .map(function (e) { return e[0]; });
    var tabs = [{ id: 'all', label: '全部', count: stats.total }];
    topSKUs.forEach(function (sku) {
      tabs.push({ id: sku, label: 'SKU ' + sku, count: stats.bySKU[sku] });
    });
    container.innerHTML = tabs.map(function (t) {
      return '<button class="filter-tab' + (t.id === currentFilter ? ' active' : '') + '" data-filter="' + App.escapeHtml(t.id) + '">'
        + App.escapeHtml(t.label) + '<span class="count">' + t.count + '</span></button>';
    }).join('');
    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentFilter = this.getAttribute('data-filter');
        renderTabs();
        if (viewMode === 'analysis') renderAnalysis();
        else renderList();
      });
    });
  }

  function renderSortButtons() {
    var container = document.getElementById('sort-buttons');
    if (!container) return;
    var sorts = [
      { id: 'date', label: '时间' },
      { id: 'creator', label: '达人' },
      { id: 'sku', label: 'SKU' },
    ];
    container.innerHTML = sorts.map(function (s) {
      return '<button class="filter-tab' + (s.id === currentSort ? ' active' : '') + '" data-sort="' + s.id + '" style="font-size:12px;padding:4px 10px;">' + s.label + '</button>';
    }).join('');
    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentSort = this.getAttribute('data-sort');
        renderSortButtons();
        renderList();
      });
    });
  }

  /* ---------- 深度分析视图 ---------- */
  function renderAnalysis() {
    var container = document.getElementById('video-analysis-content');
    if (!container) return;
    var analytics = Data.getVideoAnalytics(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '';

    // 关键指标
    html += '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(analytics.total) + '</div><div class="stat-card__label">视频总数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(analytics.orderedVideos) + '</div><div class="stat-card__label">出单视频</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + analytics.orderRate + '%</div><div class="stat-card__label">出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(analytics.uniqueCreators) + '</div><div class="stat-card__label">有视频达人数</div></div>'
      + '</div>';

    // SKU 视频排名
    if (analytics.skuRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">SKU 视频排名 & 出单率</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxVid = analytics.skuRanking[0].videoCount || 1;
      analytics.skuRanking.slice(0, 10).forEach(function (s, i) {
        var pct = Math.round(s.videoCount / maxVid * 100);
        var posColor = s.positioning.indexOf('爆品') >= 0 ? 'var(--pink-500)' :
                       s.positioning.indexOf('销售') >= 0 ? 'var(--c-success)' : 'var(--c-info)';
        html += '<div style="margin-bottom:12px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
          + '<div style="display:flex;align-items:center;gap:6px;">'
          + '<span style="font-size:12px;font-weight:700;color:var(--pink-600);">#' + (i + 1) + '</span>'
          + '<span style="font-size:13px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(s.sku) + '</span>'
          + (s.productName ? '<span style="font-size:11px;color:var(--text-3);">' + App.escapeHtml(s.productName) + '</span>' : '')
          + '</div>'
          + '<div style="display:flex;gap:8px;font-size:12px;">'
          + '<span style="color:var(--c-info);font-weight:600;">' + s.videoCount + ' 视频</span>'
          + '<span style="color:var(--pink-500);font-weight:600;">' + s.orderedCount + ' 出单</span>'
          + '<span style="color:var(--c-success);font-weight:600;">' + s.orderRate + '%</span>'
          + '</div>'
          + '</div>'
          + '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:' + posColor + ';border-radius:4px;transition:width .6s ease;"></div>'
          + '</div>'
          + '</div>';
      });
      html += '</div></div>';
    }

    // 最受欢迎 SKU（未筛选SKU时显示）或最受欢迎颜色（筛选了SKU时显示）
    if (analytics.filteredSKU && analytics.topColor) {
      html += '<div class="card" style="margin-bottom:16px;background:var(--bg-pink-soft);">'
        + '<div style="font-size:12px;color:var(--pink-600);font-weight:600;margin-bottom:6px;">最受欢迎颜色（SKU ' + App.escapeHtml(analytics.filteredSKU) + '）</div>'
        + '<div style="font-size:16px;font-weight:700;color:var(--text-1);">' + App.escapeHtml(analytics.topColor.color) + '</div>'
        + '<div style="font-size:12px;color:var(--text-2);margin-top:4px;">' + analytics.topColor.count + ' 个视频</div>'
        + '</div>';
    } else if (!analytics.filteredSKU && analytics.topSKU) {
      html += '<div class="card" style="margin-bottom:16px;background:var(--bg-pink-soft);">'
        + '<div style="font-size:12px;color:var(--pink-600);font-weight:600;margin-bottom:6px;">最受欢迎 SKU</div>'
        + '<div style="font-size:16px;font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(analytics.topSKU.sku) + ' — ' + App.escapeHtml(analytics.topSKU.productName) + '</div>'
        + '<div style="font-size:12px;color:var(--text-2);margin-top:4px;">' + analytics.topSKU.videoCount + ' 个视频 · ' + analytics.topSKU.orderedCount + ' 个出单 · 出单率 ' + analytics.topSKU.orderRate + '%</div>'
        + '</div>';
    }

    // 颜色分析
    if (analytics.colorRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">颜色分布</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxColor = analytics.colorRanking[0].count || 1;
      var colorMap = { '黑': '#333', '白': '#eee', '灰': '#999', '蓝': '#4A90D9', '淡蓝': '#B0D4E8', '粉': '#F5B0BC', '绿': '#7EC850', '棕': '#8B6F47', '卡其': '#C3B091', '杏': '#D4A574' };
      analytics.colorRanking.slice(0, 8).forEach(function (c, i) {
        var pct = Math.round(c.count / maxColor * 100);
        var bgColor = colorMap[c.color] || 'var(--pink-300)';
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
          + '<span style="width:40px;font-size:12px;font-weight:600;color:var(--text-2);">' + App.escapeHtml(c.color) + '</span>'
          + '<div style="flex:1;height:16px;background:var(--bg-pink-soft);border-radius:8px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:' + bgColor + ';border-radius:8px;transition:width .6s ease;"></div>'
          + '</div>'
          + '<span style="width:50px;text-align:right;font-size:12px;color:var(--text-2);">' + c.count + ' (' + pct + '%)</span>'
          + '</div>';
      });
      // 最容易出单颜色
      if (analytics.topColor) {
        html += '<div style="margin-top:8px;padding:8px;background:var(--bg-pink-soft);border-radius:8px;font-size:12px;color:var(--pink-600);">'
          + '最容易出单颜色：' + App.escapeHtml(analytics.topColor.color) + ' (' + analytics.topColor.count + ' 个视频)'
          + '</div>';
      }
      html += '</div></div>';
    }

    // 达人画像分析
    if (analytics.creatorRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">达人视频排名 TOP 15</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxCreator = analytics.creatorRanking[0].videoCount || 1;
      var colors = ['var(--pink-500)', 'var(--pink-400)', 'var(--pink-300)', 'var(--c-info)', 'var(--c-warning)'];
      analytics.creatorRanking.slice(0, 15).forEach(function (c, i) {
        var pct = Math.round(c.videoCount / maxCreator * 100);
        var color = colors[i] || 'var(--border-2)';
        var skuTags = c.skus.slice(0, 4).map(function (sku) { return '<span class="badge badge--pink" style="font-size:10px;">SKU ' + App.escapeHtml(sku) + '</span>'; }).join(' ');
        html += '<div style="margin-bottom:12px;cursor:pointer;" data-creator="' + App.escapeHtml(c.name) + '">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
          + '<div style="display:flex;align-items:center;gap:6px;">'
          + '<span style="width:20px;height:20px;border-radius:50%;background:' + color + ';color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">' + (i + 1) + '</span>'
          + '<span style="font-size:13px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(c.name) + '</span>'
          + '<span style="font-size:11px;color:var(--text-3);">' + (c.official || '') + ' ' + (c.stars || '') + '</span>'
          + '</div>'
          + '<span style="font-size:14px;font-weight:700;color:var(--pink-600);">' + c.videoCount + ' 视频</span>'
          + '</div>'
          + '<div style="height:6px;background:var(--bg-pink-soft);border-radius:3px;overflow:hidden;margin-bottom:4px;">'
          + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px;transition:width .6s ease;"></div>'
          + '</div>'
          + '<div style="font-size:11px;color:var(--text-3);">' + App.escapeHtml(c.category || '—') + ' · ' + App.escapeHtml(c.bodyType || '') + ' · ' + App.escapeHtml(c.age || '') + '</div>'
          + '<div style="margin-top:3px;">' + skuTags + '</div>'
          + '</div>';
      });
      html += '</div></div>';

      // AI特征分析
      var topCreators = analytics.creatorRanking.slice(0, 10);
      var bodyTypes = {};
      var ages = {};
      var categories = {};
      topCreators.forEach(function (c) {
        if (c.bodyType) bodyTypes[c.bodyType] = (bodyTypes[c.bodyType] || 0) + 1;
        if (c.age) ages[c.age] = (ages[c.age] || 0) + 1;
        if (c.category) c.category.split(',').forEach(function (cat) { cat = cat.trim(); if (cat) categories[cat] = (categories[cat] || 0) + 1; });
      });
      var topBody = Object.entries(bodyTypes).sort(function (a, b) { return b[1] - a[1]; })[0];
      var topAge = Object.entries(ages).sort(function (a, b) { return b[1] - a[1]; })[0];
      var topCat = Object.entries(categories).sort(function (a, b) { return b[1] - a[1]; })[0];

      html += '<div class="card" style="margin-bottom:16px;background:var(--bg-pink-soft);">'
        + '<div style="font-size:12px;color:var(--pink-600);font-weight:600;margin-bottom:8px;">AI 出单视频特征分析</div>'
        + '<div style="font-size:13px;color:var(--text-1);line-height:1.8;">';
      if (topBody) html += '身材特征：' + topBody[0] + ' 达人出单最多 (' + topBody[1] + '/10)<br>';
      if (topAge) html += '年龄特征：' + topAge[0] + ' 达人视频效果最好<br>';
      if (topCat) html += '品类特征：' + topCat[0] + ' 类目达人出单率高<br>';
      if (analytics.topSKU) html += '产品特征：SKU ' + analytics.topSKU.sku + ' 是最受欢迎的产品<br>';
      if (analytics.topColor) html += '颜色特征：' + analytics.topColor.color + ' 色最容易出单<br>';
      html += '</div></div>';
    }

    // 品类分析
    if (analytics.categoryRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">达人品类分布 TOP 10</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxCat = analytics.categoryRanking[0].count || 1;
      analytics.categoryRanking.forEach(function (c) {
        var pct = Math.round(c.count / maxCat * 100);
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
          + '<span style="width:80px;font-size:11px;font-weight:600;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(c.category) + '</span>'
          + '<div style="flex:1;height:14px;background:var(--bg-pink-soft);border-radius:7px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:var(--pink-400);border-radius:7px;transition:width .6s ease;"></div>'
          + '</div>'
          + '<span style="width:30px;text-align:right;font-size:11px;color:var(--text-3);">' + c.count + '</span>'
          + '</div>';
      });
      html += '</div></div>';
    }

    container.innerHTML = html;

    // 绑定达人点击
    container.querySelectorAll('[data-creator]').forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-creator');
        global.location.href = 'report.html?creator=' + encodeURIComponent(name);
      });
    });
  }

  function renderList() {
    var container = document.getElementById('video-list');
    if (!container) return;
    var list = getFilteredAndSorted();

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">没有匹配的视频记录</div></div>';
      return;
    }

    var displayList = list.slice(0, 100);
    var html = displayList.map(function (v) {
      var timeText = v.postTime ? v.postTime.split(' ')[0] : '无时间';
      var skuText = v.sku ? 'SKU ' + App.escapeHtml(v.sku) : '';
      var colorText = v.color ? ' · ' + App.escapeHtml(v.color) : '';
      var catText = v.category ? App.escapeHtml(v.category) : '';
      var officialText = v.official ? App.escapeHtml(v.official) + ' ' : '';
      var starsText = v.stars ? App.escapeHtml(v.stars) : '';
      var linkHtml = '';
      if (v.url && v.url.startsWith('http')) {
        linkHtml = '<a href="' + App.escapeHtml(v.url) + '" target="_blank" style="font-size:12px;color:var(--c-primary);text-decoration:none;word-break:break-all;">' + App.escapeHtml(v.url.substring(0, 60)) + '...</a>';
      } else if (v.url) {
        linkHtml = '<span style="font-size:12px;color:var(--text-tertiary);word-break:break-all;">' + App.escapeHtml(v.url.substring(0, 60)) + '</span>';
      }
      return ''
        + '<div class="card" style="margin-bottom:10px;">'
        +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
        +     '<div style="display:flex;align-items:center;gap:8px;">'
        +       '<div class="creator-card__avatar" style="width:32px;height:32px;font-size:12px;">' + App.getInitials(v.creator) + '</div>'
        +       '<div>'
        +         '<div style="font-weight:600;font-size:14px;color:var(--text-1);">' + App.escapeHtml(v.creator) + '</div>'
        +         '<div style="font-size:11px;color:var(--text-3);">' + officialText + starsText + ' · ' + App.escapeHtml(catText) + '</div>'
        +       '</div>'
        +     '</div>'
        +     '<div style="text-align:right;">'
        +       '<span class="badge badge--pink">' + skuText + '</span>'
        +       '<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">' + timeText + '</div>'
        +     '</div>'
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-3);margin-bottom:4px;">寄样: ' + (v.sampleTime ? v.sampleTime.split(' ')[0] : '—') + colorText + '</div>'
        +   linkHtml
        + '</div>';
    }).join('');

    if (list.length > 100) {
      html += '<div style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:13px;">显示前 100 条，共 ' + list.length + ' 条 🔍</div>';
    }
    container.innerHTML = html;
  }

  /* ---------- 素材看板视图 ---------- */
  function renderMaterialLineChart(points, labelKey, valueKey, color, unit) {
    // 通用 SVG 折线图（与数据复盘页同风格）
    if (!points || points.length === 0) return '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div>';
    var W = 680, H = 200, padL = 40, padB = 30, padT = 16, padR = 20;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxV = Math.max.apply(null, points.map(function (p) { return p[valueKey]; }).concat([1]));
    var n = points.length;
    // 点太多（如整月逐日）时抽稀标签
    var labelEvery = Math.ceil(n / 12);
    var step = n > 1 ? plotW / (n - 1) : 0;
    var coords = points.map(function (p, i) {
      return {
        x: n > 1 ? padL + i * step : padL + plotW / 2,
        y: padT + plotH - (p[valueKey] / maxV * plotH),
        p: p, i: i,
      };
    });
    var line = coords.map(function (c) { return c.x + ',' + c.y; }).join(' ');
    var area = line + ' ' + (padL + plotW) + ',' + (padT + plotH) + ' ' + padL + ',' + (padT + plotH);
    var dots = coords.map(function (c) {
      var showLabel = (c.i % labelEvery === 0) || c.i === n - 1;
      return '<circle cx="' + c.x + '" cy="' + c.y + '" r="3.5" fill="' + color + '" stroke="#fff" stroke-width="1.5">'
        + '<title>' + c.p[labelKey] + ' · ' + c.p[valueKey] + (unit || '') + '</title></circle>'
        + (showLabel ? '<text x="' + c.x + '" y="' + (H - 10) + '" font-size="9" fill="#9b8e8e" text-anchor="' + (c.i === 0 ? 'start' : c.i === n - 1 ? 'end' : 'middle') + '">' + c.p[labelKey].slice(5) + '</text>' : '');
    }).join('');
    var yTicks = [0, Math.round(maxV / 2), maxV].map(function (v) {
      var y = padT + plotH - (v / maxV * plotH);
      return '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" font-size="9" fill="#9b8e8e" text-anchor="end">' + v + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;">'
      + '<polygon points="' + area + '" fill="' + color + '" opacity="0.08"/>'
      + '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="#efe6e6"/>'
      + '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="#efe6e6"/>'
      + yTicks
      + '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>'
      + dots
      + '</svg>';
  }

  function renderMaterial() {
    var container = document.getElementById('video-material-content');
    if (!container) return;
    var m = Data.getMaterialDashboard(filterState.startDate || null, filterState.endDate || null, filterState.sku || null);

    var rangeText = '';
    if (m.filter.startDate || m.filter.endDate) {
      rangeText = (m.filter.startDate || '…') + ' ~ ' + (m.filter.endDate || '…');
      if (m.filter.sku) rangeText += ' · SKU ' + m.filter.sku;
    } else if (m.filter.sku) {
      rangeText = '全部时间 · SKU ' + m.filter.sku;
    } else {
      rangeText = '全部时间 · 全部 SKU';
    }

    var html = '';

    // 关键指标
    html += '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(m.total) + '</div><div class="stat-card__label">素材总量</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + m.avgPerDay + '</div><div class="stat-card__label">日均素材</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + m.peakDayCount + '</div><div class="stat-card__label">单日峰值（' + (m.peakDay || '—') + '）</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(m.monthly.length) + '</div><div class="stat-card__label">覆盖月份数</div></div>'
      + '</div>';

    // 月度素材量折线图
    html += '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header"><h3 class="card__title">月度素材量趋势</h3></div>'
      + '<div style="padding:8px 4px;">' + renderMaterialLineChart(m.monthly, 'month', 'count', 'var(--pink-500)', ' 条素材')
      + '<div style="font-size:11px;color:var(--text-3);margin-top:6px;">筛选：' + App.escapeHtml(rangeText) + '</div></div>'
      + '</div>';

    // 每日素材量折线图（默认最近30个有素材的日子）
    var dailySlice = m.daily.slice(-30);
    html += '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header"><h3 class="card__title">每日素材量' + (m.daily.length > 30 ? '（最近 30 天有素材日）' : '') + '</h3></div>'
      + '<div style="padding:8px 4px;">' + renderMaterialLineChart(dailySlice, 'date', 'count', 'var(--c-info)', ' 条素材')
      + '<div style="font-size:11px;color:var(--text-3);margin-top:6px;">按视频发布时间统计；达人数（寄样行数）口径与日报一致</div></div>'
      + '</div>';

    // SKU 素材量排行
    if (m.skuRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:16px;">'
        + '<div class="card__header"><h3 class="card__title">SKU 素材量排行</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxCnt = m.skuRanking[0].count || 1;
      m.skuRanking.slice(0, 12).forEach(function (s, i) {
        var pct = Math.round(s.count / maxCnt * 100);
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
          + '<span style="width:70px;font-size:12px;font-weight:600;color:var(--text-2);">SKU ' + App.escapeHtml(s.sku) + '</span>'
          + '<div style="flex:1;height:14px;background:var(--bg-pink-soft);border-radius:7px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:var(--pink-400);border-radius:7px;transition:width .6s ease;"></div>'
          + '</div>'
          + '<span style="width:90px;text-align:right;font-size:12px;color:var(--text-2);">' + s.count + ' 素材 / ' + s.rows + ' 行</span>'
          + '</div>';
      });
      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  function switchView(mode) {
    viewMode = mode;
    var listEl = document.getElementById('video-list');
    var analysisEl = document.getElementById('video-analysis');
    var materialEl = document.getElementById('video-material');
    var sortEl = document.getElementById('sort-section');
    var searchEl = document.querySelector('.search-bar');
    var filterTabsEl = document.getElementById('filter-tabs');
    var listBtn = document.getElementById('btn-view-list');
    var analysisBtn = document.getElementById('btn-view-analysis');
    var materialBtn = document.getElementById('btn-view-material');
    if (mode === 'analysis') {
      if (listEl) listEl.style.display = 'none';
      if (analysisEl) analysisEl.style.display = 'block';
      if (materialEl) materialEl.style.display = 'none';
      if (sortEl) sortEl.style.display = 'none';
      if (searchEl) searchEl.style.display = 'none';
      if (filterTabsEl) filterTabsEl.style.display = 'none';
      if (listBtn) listBtn.classList.remove('active');
      if (analysisBtn) analysisBtn.classList.add('active');
      if (materialBtn) materialBtn.classList.remove('active');
      renderAnalysis();
    } else if (mode === 'material') {
      if (listEl) listEl.style.display = 'none';
      if (analysisEl) analysisEl.style.display = 'none';
      if (materialEl) materialEl.style.display = 'block';
      if (sortEl) sortEl.style.display = 'none';
      if (searchEl) searchEl.style.display = 'none';
      if (filterTabsEl) filterTabsEl.style.display = 'none';
      if (listBtn) listBtn.classList.remove('active');
      if (analysisBtn) analysisBtn.classList.remove('active');
      if (materialBtn) materialBtn.classList.add('active');
      renderMaterial();
    } else {
      if (listEl) listEl.style.display = 'block';
      if (analysisEl) analysisEl.style.display = 'none';
      if (materialEl) materialEl.style.display = 'none';
      if (sortEl) sortEl.style.display = 'flex';
      if (searchEl) searchEl.style.display = '';
      if (filterTabsEl) filterTabsEl.style.display = '';
      if (listBtn) listBtn.classList.add('active');
      if (analysisBtn) analysisBtn.classList.remove('active');
      if (materialBtn) materialBtn.classList.remove('active');
      renderList();
    }
  }

  function bindSearch() {
    var input = document.getElementById('video-search');
    if (!input) return;
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        currentKeyword = input.value;
        renderList();
      }, 300);
    });
  }

  function init() {
    renderTabs();
    renderSortButtons();
    renderList();
    bindSearch();

    // 初始化列表筛选栏（日期+SKU，列表和分析视图共用）
    var listFilterBar = document.getElementById('video-list-filter-bar');
    if (listFilterBar && !listFilterBar._initialized) {
      listFilterBar._initialized = true;
      App.createFilterBar('video-list-filter-bar', function (sku, startDate, endDate) {
        filterState.sku = sku;
        filterState.startDate = startDate;
        filterState.endDate = endDate;
        // 同步tab选择
        if (sku) currentFilter = sku; else currentFilter = 'all';
        renderTabs();
        if (viewMode === 'analysis') renderAnalysis();
        else if (viewMode === 'material') renderMaterial();
        else renderList();
      });
    }

    var listBtn = document.getElementById('btn-view-list');
    if (listBtn) listBtn.addEventListener('click', function () { switchView('list'); });
    var analysisBtn = document.getElementById('btn-view-analysis');
    if (analysisBtn) analysisBtn.addEventListener('click', function () { switchView('analysis'); });
    var materialBtn = document.getElementById('btn-view-material');
    if (materialBtn) materialBtn.addEventListener('click', function () { switchView('material'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
