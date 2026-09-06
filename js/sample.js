/* ================================================================
   Dlooda TKBD CRM — 样品追踪 (v3)
   SKU筛选 · 时间范围 · 数据看板 · 月报支撑
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var currentFilter = 'all';
  // 启动时尝试恢复筛选缓存（5 分钟内有效）
  (function () {
    var saved = App.loadFilterState('sample');
    if (saved && typeof saved.tab === 'string') currentFilter = saved.tab;
  })();
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

  /* ---------- 渲染 SKU 下拉筛选 ---------- */
  // getAvailableSKUs 已按定位档位排序：爆品 → 销售 → 测品 → 撤退
  function renderSkuSelect() {
    var container = document.getElementById('sku-select');
    if (!container) return;
    var skus = Data.getAvailableSKUs();
    var html = '<option value="">全部 SKU</option>' + skus.map(function (sku) {
      return '<option value="' + App.escapeHtml(sku) + '">SKU ' + App.escapeHtml(sku) + '</option>';
    }).join('');
    container.innerHTML = html;
    if (currentSku) container.value = currentSku;
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
        App.saveFilterState('sample', { tab: currentFilter });
        renderTabs();
        renderList();
      });
    });
  }

  /* ---------- 全链路漏斗卡片 ---------- */
  function renderFunnelCard() {
    var f = Data.getSampleFunnel(currentSku, startDate, endDate);
    var total = f.total || 1;
    function pct(n) { return Math.round(n / total * 100); }

    var stages = [
      { label: '暂定达人(待审)', count: f.pendingCount, color: 'var(--c-warning)', note: '待审池，未进入寄样' },
      { label: '寄样总数', count: f.total, color: 'var(--c-primary)', note: '' },
      { label: '已标记通过', count: f.approved, color: 'var(--c-info)', note: f.unmarked > 0 ? '另有 ' + f.unmarked + ' 条未标记' : '' },
      { label: '已发视频', count: f.withVideo, color: 'var(--c-success)', note: '' },
      { label: '已出单', count: f.ordered, color: 'var(--pink-500)', note: '' },
    ];

    var html = '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header"><h3 class="card__title">寄样全链路漏斗</h3></div>'
      + '<div style="padding:8px 0;">';
    stages.forEach(function (s) {
      var p = pct(s.count);
      html += '<div style="margin-bottom:10px;">'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<span style="width:95px;font-size:12px;font-weight:600;color:var(--text-2);">' + s.label + '</span>'
        + '<div style="flex:1;height:24px;background:var(--bg-pink-soft);border-radius:12px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.min(p, 100) + '%;background:' + s.color + ';border-radius:12px;transition:width .6s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;">'
        + '<span style="font-size:11px;font-weight:700;color:#fff;">' + App.formatNumber(s.count) + '</span>'
        + '</div></div>'
        + '<span style="width:40px;text-align:right;font-size:12px;color:var(--text-3);">' + p + '%</span>'
        + '</div>'
        + (s.note ? '<div style="font-size:11px;color:var(--text-3);padding-left:105px;">' + s.note + '</div>' : '')
        + '</div>';
    });
    html += '</div>';

    // 通过方式质量对比
    if (f.approvalQuality.length > 0) {
      html += '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin:10px 0 6px;">通过方式质量对比</div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:6px;text-align:left;font-weight:600;color:var(--text-2);">通过方式</th>'
        + '<th style="padding:6px;text-align:center;font-weight:600;color:var(--text-2);">寄样</th>'
        + '<th style="padding:6px;text-align:center;font-weight:600;color:var(--c-success);">发视频率</th>'
        + '<th style="padding:6px;text-align:center;font-weight:600;color:var(--pink-500);">出单率</th>'
        + '</tr></thead><tbody>';
      f.approvalQuality.forEach(function (q) {
        html += '<tr style="border-bottom:1px solid var(--border-1);">'
          + '<td style="padding:6px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(q.label) + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--text-2);">' + App.formatNumber(q.total) + '</td>'
          + '<td style="padding:6px;text-align:center;color:var(--c-success);">' + q.videoRate + '%</td>'
          + '<td style="padding:6px;text-align:center;color:var(--pink-500);font-weight:600;">' + q.orderRate + '%</td>'
          + '</tr>';
      });
      html += '</tbody></table></div>'
        + '<div style="font-size:11px;color:var(--text-3);padding:6px 0 0;">💡 自动通过的发视频率/出单率不低于手动通过，可放心扩大自动通过范围。</div>';
    }

    // 任务 P0/P1/P2 执行率
    if (f.taskExec && f.taskExec.length > 0) {
      html += '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin:12px 0 6px;">' + f.taskMonth + ' 寄样任务执行率</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
      f.taskExec.forEach(function (e) {
        var rateColor = e.rate >= 80 ? 'var(--c-success)' : (e.rate >= 40 ? 'var(--c-warning)' : 'var(--c-danger)');
        html += '<div style="flex:1;min-width:110px;background:var(--bg-pink-soft);border-radius:8px;padding:8px;text-align:center;">'
          + '<div style="font-size:11px;color:var(--text-3);">' + e.priority + ' · ' + e.count + '个任务</div>'
          + '<div style="font-size:16px;font-weight:700;color:' + rateColor + ';">' + e.rate + '%</div>'
          + '<div style="font-size:11px;color:var(--text-3);">' + App.formatNumber(e.actual) + ' / ' + App.formatNumber(e.target) + ' 件</div>'
          + '</div>';
      });
      html += '</div>'
        + '<div style="font-size:11px;color:var(--text-3);padding:6px 0 0;">口径：该月实际寄样量 ÷ 目标寄样量（未区分任务起始日，仅按 SKU×月聚合）</div>';
    }

    html += '</div>';
    return html;
  }

  /* ---------- 寄样→首视频周期 + 催更效果卡片 ---------- */
  function renderLatencyCard() {
    var la = Data.getVideoLatencyAnalysis(currentSku, startDate, endDate);
    if (!la.sampleCount) return '';

    var html = '<div class="card" style="margin-bottom:16px;">'
      + '<div class="card__header"><h3 class="card__title">寄样 → 首条视频 周期与催更效果</h3></div>'
      + '<div style="padding:8px 0;">';

    // 关键指标
    html += '<div class="stat-grid" style="margin-bottom:12px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + la.median + '<span style="font-size:12px;">天</span></div><div class="stat-card__label">周期中位数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--text-2);">' + la.p25 + '~' + la.p75 + '<span style="font-size:12px;">天</span></div><div class="stat-card__label">P25 ~ P75 区间</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + la.within15Rate + '%</div><div class="stat-card__label">15天内发布占比</div></div>'
      + '</div>';

    // 周期分布
    var maxBucket = Math.max.apply(null, la.buckets.map(function (b) { return b.count; })) || 1;
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:6px;">首视频周期分布（' + App.formatNumber(la.sampleCount) + ' 条已发视频样品' + (la.negativeCount > 0 ? '，' + la.negativeCount + ' 条视频早于寄样日已剔除' : '') + '）</div>';
    la.buckets.forEach(function (b) {
      var p = Math.round(b.count / la.sampleCount * 100);
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
        + '<span style="width:60px;font-size:12px;color:var(--text-2);">' + b.label + '</span>'
        + '<div style="flex:1;height:18px;background:var(--bg-pink-soft);border-radius:9px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.round(b.count / maxBucket * 100) + '%;background:var(--pink-400);border-radius:9px;"></div>'
        + '</div>'
        + '<span style="width:80px;text-align:right;font-size:11px;color:var(--text-3);">' + b.count + ' 条 · ' + p + '%</span>'
        + '</div>';
    });

    // 催更效果对比
    var u = la.urging;
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin:12px 0 6px;">催更效果对比</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      +   '<div style="flex:1;min-width:150px;background:var(--bg-pink-soft);border-radius:8px;padding:10px;text-align:center;">'
      +     '<div style="font-size:12px;color:var(--text-2);font-weight:600;">未催更（自然窗口内）</div>'
      +     '<div style="font-size:11px;color:var(--text-3);margin:2px 0;">' + App.formatNumber(u.notUrged.total) + ' 条寄样</div>'
      +     '<div style="font-size:14px;font-weight:700;color:var(--c-success);">发视频率 ' + u.notUrged.videoRate + '%</div>'
      +     '<div style="font-size:12px;color:var(--pink-500);font-weight:600;">出单率 ' + u.notUrged.orderRate + '%</div>'
      +   '</div>'
      +   '<div style="flex:1;min-width:150px;background:var(--bg-pink-soft);border-radius:8px;padding:10px;text-align:center;">'
      +     '<div style="font-size:12px;color:var(--text-2);font-weight:600;">被催更（履约方式含"已催"）</div>'
      +     '<div style="font-size:11px;color:var(--text-3);margin:2px 0;">' + App.formatNumber(u.urged.total) + ' 条寄样</div>'
      +     '<div style="font-size:14px;font-weight:700;color:var(--c-danger);">发视频率 ' + u.urged.videoRate + '%</div>'
      +     '<div style="font-size:12px;color:var(--pink-500);font-weight:600;">出单率 ' + u.urged.orderRate + '%</div>'
      +   '</div>'
      + '</div>';

    html += '<div style="font-size:12px;color:var(--text-3);background:var(--bg-pink-soft);border-radius:8px;padding:8px 12px;margin-top:12px;">'
      + '💡 跟进节奏建议：' + la.within15Rate + '% 的首视频在寄样 15 天内发布（中位数 ' + la.median + ' 天）。'
      + '被催更的样品最终发视频率仅 ' + u.urged.videoRate + '%——一旦走到"已催"基本翻不了盘，'
      + '建议把跟进精力前置到寄样后 ' + la.median + '~15 天的自然窗口内，而非事后催更。'
      + '</div>';

    html += '</div></div>';
    return html;
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

    // 寄样全链路漏斗（暂定 → 寄样 → 通过 → 视频 → 出单 + 通过方式质量 + 任务执行率）
    html += renderFunnelCard();

    // 寄样→首视频周期 + 催更效果
    html += renderLatencyCard();

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
    renderSkuSelect();
    renderTabs();
    renderList();
    bindSearch();

    var skuSel = document.getElementById('sku-select');
    if (skuSel) {
      skuSel.addEventListener('change', function () {
        currentSku = skuSel.value;
        renderStats();
        renderTabs();
        if (viewMode === 'dashboard') renderDashboard();
        else renderList();
      });
    }

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
