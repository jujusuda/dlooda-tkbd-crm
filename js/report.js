/* ================================================================
   Dlooda TKBD CRM — 数据复盘 (v3)
   新增：出单达人排行TOP10(可展开SKU明细)
        寄样任务差距分析(高亮提醒)
        复投分析
        视图切换(整体概览/出单分析/寄样任务)
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var expandedCreators = {};  // 记录展开状态
  var filterState = { sku: '', startDate: '', endDate: '' };

  /* ================================================================
     视图切换
     ================================================================ */
  function switchView(view) {
    var tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === view);
    });
    document.getElementById('view-overview').style.display = view === 'overview' ? '' : 'none';
    document.getElementById('view-orders').style.display = view === 'orders' ? '' : 'none';
    document.getElementById('view-tasks').style.display = view === 'tasks' ? '' : 'none';
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
     主渲染
     ================================================================ */
  function render() {
    var data = Data.getReportData(filterState.startDate, filterState.endDate, filterState.sku);

    // 概览视图
    renderMetrics(data);
    renderCreatorRanking(data.creatorRanking);
    renderSKURanking(data.skuRanking);
    renderOverview(data);
    renderOfficialDist(data.creatorStats);
    renderMethodDist(data.sampleStats);

    // 出单分析视图
    renderOrderCreatorRanking();
    renderReinvestAnalysis();

    // 寄样任务视图
    renderTaskGap();
    renderUrgentSamples();
  }

  /* ================================================================
     关键指标
     ================================================================ */
  function renderMetrics(data) {
    var container = document.getElementById('report-metrics');
    if (!container) return;

    // 出单达人统计
    var orderCreators = Data.getOrderCreatorRanking(9999, filterState.startDate, filterState.endDate, filterState.sku);
    var totalOrderedCreators = orderCreators.length;
    var totalOrderedSamples = orderCreators.reduce(function (sum, c) { return sum + c.ordered; }, 0);

    container.innerHTML = ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(data.totalCreators) + '</div>'
      +   '<div class="stat-card__label">达人总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-success);">' + App.formatNumber(data.totalSamples) + '</div>'
      +   '<div class="stat-card__label">寄样总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(data.totalVideos) + '</div>'
      +   '<div class="stat-card__label">视频总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-warning);">' + totalOrderedCreators + '</div>'
      +   '<div class="stat-card__label">出单达人</div>'
      + '</div>';
  }

  /* ================================================================
     达人视频排名 TOP 20 (可点击展开SKU明细)
     ================================================================ */
  function renderCreatorRanking(ranking) {
    var container = document.getElementById('creator-ranking');
    if (!container || ranking.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__text">暂无达人数据</div></div>';
      return;
    }

    var maxVideos = ranking[0].videoCount || 1;
    var colors = ['var(--pink-500)', 'var(--pink-400)', 'var(--pink-300)', 'var(--c-info)', 'var(--c-warning)'];

    container.innerHTML = ranking.map(function (c, i) {
      var pct = (c.videoCount / maxVideos) * 100;
      var color = colors[i] || 'var(--border-2)';
      var isExpanded = expandedCreators['v_' + c.name];
      return ''
        + '<div style="margin-bottom:14px;">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;cursor:pointer;" data-creator-video="' + App.escapeHtml(c.name) + '">'
        +     '<div style="display:flex;align-items:center;gap:6px;">'
        +       '<span style="width:20px;height:20px;border-radius:50%;background:' + color + ';color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">' + (i + 1) + '</span>'
        +       '<span style="font-size:13px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(c.name) + '</span>'
        +       '<span style="font-size:11px;color:var(--text-3);">' + (c.official || '') + ' ' + (c.stars || '') + '</span>'
        +       '<span style="font-size:10px;color:var(--pink-400);">' + (isExpanded ? '▼' : '▶') + '</span>'
        +     '</div>'
        +     '<span style="font-size:14px;font-weight:700;color:var(--pink-600);">' + c.videoCount + ' 视频</span>'
        +   '</div>'
        +   '<div style="height:10px;background:var(--bg-pink-soft);border-radius:5px;overflow:hidden;">'
        +     '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:5px;transition:width .6s ease;"></div>'
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-3);margin-top:3px;">' + (c.category || '—') + ' · ' + c.sampleCount + '次寄样' + (c.creatorType ? ' · ' + c.creatorType.split(',')[0] : '') + '</div>'
        +   (isExpanded ? renderCreatorVideoDetail(c.name) : '')
        + '</div>';
    }).join('');

    // 绑定点击展开
    container.querySelectorAll('[data-creator-video]').forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-creator-video');
        var key = 'v_' + name;
        expandedCreators[key] = !expandedCreators[key];
        renderCreatorRanking(ranking);
      });
    });
  }

  // 达人视频维度展开：该达人带了哪些SKU、拍了几个视频、出了几单
  function renderCreatorVideoDetail(name) {
    var breakdown = Data.getCreatorSKUBreakdown(name, filterState.startDate, filterState.endDate, filterState.sku);
    if (breakdown.length === 0) {
      return '<div style="padding:10px;margin-top:8px;background:var(--bg-pink-soft);border-radius:8px;font-size:12px;color:var(--text-3);">暂无SKU数据</div>';
    }

    var totalVideos = breakdown.reduce(function (s, b) { return s + b.videoCount; }, 0);
    var totalOrders = breakdown.filter(function (b) { return b.ordered > 0; }).length;
    var totalOrderCount = breakdown.reduce(function (s, b) { return s + b.orderCount; }, 0);

    var html = ''
      + '<div style="margin-top:8px;padding:12px;background:var(--bg-pink-soft);border-radius:10px;border:1px solid var(--border-1);">'
      +   '<div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap;">'
      +     '<span style="font-size:11px;color:var(--text-2);">SKU数: <b style="color:var(--pink-600);">' + breakdown.length + '</b></span>'
      +     '<span style="font-size:11px;color:var(--text-2);">视频总数: <b style="color:var(--c-info);">' + totalVideos + '</b></span>'
      +     '<span style="font-size:11px;color:var(--text-2);">出单SKU: <b style="color:var(--c-success);">' + totalOrders + '</b></span>'
      +     (totalOrderCount > 0 ? '<span style="font-size:11px;color:var(--text-2);">出单总量: <b style="color:var(--c-warning);">' + totalOrderCount + '</b></span>' : '')
      +   '</div>'
      +   '<div style="display:flex;flex-direction:column;gap:6px;">';

    breakdown.forEach(function (b) {
      var orderedBadge = b.ordered > 0
        ? '<span style="font-size:10px;padding:2px 6px;background:var(--c-success);color:#fff;border-radius:4px;">出单 ' + b.orderCount + '</span>'
        : '<span style="font-size:10px;padding:2px 6px;background:var(--text-3);color:#fff;border-radius:4px;opacity:0.5;">未出单</span>';
      var posTag = b.positioning
        ? '<span style="font-size:10px;color:var(--text-3);">[' + App.escapeHtml(b.positioning) + ']</span>'
        : '';
      html += ''
        + '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#fff;border-radius:6px;">'
        +   '<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">'
        +     '<span style="font-size:12px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(b.sku) + '</span>'
        +     posTag
        +     (b.productName ? '<span style="font-size:10px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(b.productName) + '</span>' : '')
        +   '</div>'
        +   '<div style="display:flex;align-items:center;gap:6px;">'
        +     '<span style="font-size:11px;color:var(--text-3);">寄' + b.sampleCount + '</span>'
        +     '<span style="font-size:11px;color:var(--c-info);">视' + b.videoCount + '</span>'
        +     orderedBadge
        +   '</div>'
        + '</div>';
    });

    html += '</div></div>';
    return html;
  }

  /* ================================================================
     出单达人排行 TOP 10 (可展开SKU明细)
     ================================================================ */
  function renderOrderCreatorRanking() {
    var container = document.getElementById('order-creator-ranking');
    if (!container) return;

    var ranking = Data.getOrderCreatorRanking(10, filterState.startDate, filterState.endDate, filterState.sku);
    if (ranking.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__text">暂无出单数据</div></div>';
      return;
    }

    var maxOrdered = ranking[0].ordered || 1;
    var medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = ranking.map(function (c, i) {
      var pct = (c.ordered / maxOrdered) * 100;
      var rankIcon = medals[i] || ('#' + (i + 1));
      var isExpanded = expandedCreators['o_' + c.name];
      var orderedSkuCount = c.skuList.filter(function (s) { return s.ordered; }).length;

      return ''
        + '<div style="margin-bottom:16px;padding:12px;background:' + (i < 3 ? 'var(--bg-pink-soft)' : '#fff') + ';border-radius:12px;border:1px solid var(--border-1);">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" data-creator-order="' + App.escapeHtml(c.name) + '">'
        +     '<div style="display:flex;align-items:center;gap:8px;">'
        +       '<span style="font-size:18px;">' + rankIcon + '</span>'
        +       '<div>'
        +         '<div style="font-size:14px;font-weight:700;color:var(--text-1);">' + App.escapeHtml(c.name) + '</div>'
        +         '<div style="font-size:11px;color:var(--text-3);">'
        +           (c.official || '') + ' ' + (c.stars || '')
        +           (c.category ? ' · ' + c.category : '')
        +         '</div>'
        +       '</div>'
        +     '</div>'
        +     '<div style="text-align:right;">'
        +       '<div style="font-size:18px;font-weight:800;color:var(--c-success);">' + c.ordered + '<span style="font-size:11px;color:var(--text-3);font-weight:400;"> 单</span></div>'
        +       '<div style="font-size:10px;color:var(--text-3);">' + orderedSkuCount + '/' + c.skuList.length + ' SKU出单</div>'
        +     '</div>'
        +   '</div>'
        +   '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;margin-top:8px;">'
        +     '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--c-success),var(--pink-400));border-radius:4px;transition:width .6s ease;"></div>'
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-3);margin-top:4px;">'
        +     c.sampleCount + '次寄样 · ' + c.videoCount + '个视频'
        +     ' <span style="color:var(--pink-400);">' + (isExpanded ? '▼ 展开SKU明细' : '▶ 展开SKU明细') + '</span>'
        +   '</div>'
        +   (isExpanded ? renderOrderCreatorDetail(c) : '')
        + '</div>';
    }).join('');

    // 绑定点击展开
    container.querySelectorAll('[data-creator-order]').forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-creator-order');
        var key = 'o_' + name;
        expandedCreators[key] = !expandedCreators[key];
        renderOrderCreatorRanking();
      });
    });
  }

  // 出单达人展开：SKU明细 + 出单标记
  function renderOrderCreatorDetail(creator) {
    var skuList = creator.skuList;
    if (!skuList || skuList.length === 0) {
      return '<div style="padding:10px;margin-top:8px;background:#fff;border-radius:8px;font-size:12px;color:var(--text-3);">暂无SKU明细</div>';
    }

    var html = ''
      + '<div style="margin-top:10px;padding:12px;background:#fff;border-radius:10px;border:1px solid var(--border-1);">'
      +   '<div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px;">SKU 出单明细</div>'
      +   '<div style="display:flex;flex-direction:column;gap:6px;">';

    skuList.forEach(function (s) {
      var detail = Data.getSKUDetail(s.sku) || {};
      var orderedBadge = s.ordered
        ? '<span style="font-size:10px;padding:2px 8px;background:var(--c-success);color:#fff;border-radius:4px;font-weight:600;">✓ 出单 ' + s.orderCount + '</span>'
        : '<span style="font-size:10px;padding:2px 8px;background:var(--bg-pink-soft);color:var(--text-3);border-radius:4px;">未出单</span>';
      var posColor = detail.positioning === '爆品' ? 'var(--pink-500)' :
                     detail.positioning === '销售' ? 'var(--c-success)' :
                     detail.positioning === '测品' ? 'var(--c-info)' : 'var(--text-3)';

      html += ''
        + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:' + (s.ordered ? 'var(--c-success-bg)' : 'var(--bg-pink-soft)') + ';border-radius:8px;">'
        +   '<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">'
        +     '<span style="font-size:12px;font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(s.sku) + '</span>'
        +     (detail.positioning ? '<span style="font-size:9px;padding:1px 5px;background:' + posColor + ';color:#fff;border-radius:3px;">' + App.escapeHtml(detail.positioning) + '</span>' : '')
        +     (detail.productName ? '<span style="font-size:10px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(detail.productName) + '</span>' : '')
        +   '</div>'
        +   orderedBadge
        + '</div>';
    });

    html += '</div></div>';
    return html;
  }

  /* ================================================================
     复投分析
     ================================================================ */
  function renderReinvestAnalysis() {
    var container = document.getElementById('reinvest-analysis');
    if (!container) return;

    var data = Data.getReinvestAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    var html = ''
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">'
      +   '<div style="padding:16px;background:var(--bg-pink-soft);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:28px;font-weight:800;color:var(--pink-600);">' + data.reinvestTotal + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">复投寄样</div>'
      +   '</div>'
      +   '<div style="padding:16px;background:var(--c-success-bg);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:28px;font-weight:800;color:var(--c-success);">' + data.reinvestSuccess + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">复投出单</div>'
      +   '</div>'
      +   '<div style="padding:16px;background:var(--c-warning-bg);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:28px;font-weight:800;color:var(--c-warning);">' + data.overallRate + '%</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">复投成功率</div>'
      +   '</div>'
      + '</div>';

    if (data.bySKU.length > 0) {
      html += '<div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:10px;">各SKU复投率</div>';
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';

      data.bySKU.slice(0, 10).forEach(function (r) {
        var rateColor = r.rate >= 50 ? 'var(--c-success)' : r.rate >= 25 ? 'var(--c-warning)' : 'var(--c-danger)';
        var barPct = Math.min(r.rate, 100);
        html += ''
          + '<div style="padding:10px;background:var(--bg-pink-soft);border-radius:8px;">'
          +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
          +     '<div style="display:flex;align-items:center;gap:6px;">'
          +       '<span style="font-size:12px;font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(r.sku) + '</span>'
          +       (r.productName ? '<span style="font-size:10px;color:var(--text-3);">' + App.escapeHtml(r.productName) + '</span>' : '')
          +     '</div>'
          +     '<div style="display:flex;align-items:center;gap:8px;">'
          +       '<span style="font-size:11px;color:var(--text-3);">' + r.reinvest + '复投 → ' + r.success + '出单</span>'
          +       '<span style="font-size:14px;font-weight:800;color:' + rateColor + ';">' + r.rate + '%</span>'
          +     '</div>'
          +   '</div>'
          +   '<div style="height:6px;background:#fff;border-radius:3px;overflow:hidden;">'
          +     '<div style="height:100%;width:' + barPct + '%;background:' + rateColor + ';border-radius:3px;transition:width .6s ease;"></div>'
          +   '</div>'
          + '</div>';
      });

      html += '</div>';
    } else {
      html += '<div class="empty-state"><div class="empty-state__text">暂无复投数据</div></div>';
    }

    container.innerHTML = html;
  }

  /* ================================================================
     优先寄样提醒 (紧急任务)
     ================================================================ */
  function renderUrgentSamples() {
    var container = document.getElementById('urgent-samples');
    if (!container) return;

    var tasks = Data.getTaskGapAnalysis();
    var urgent = tasks.filter(function (t) { return t.isUrgent; });

    if (urgent.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__text">暂无紧急寄样任务 🎉</div></div>';
      return;
    }

    var html = '<div style="display:flex;flex-direction:column;gap:10px;">';

    urgent.forEach(function (t) {
      var gapPct = t.gapPct;
      var gapColor = gapPct < 30 ? 'var(--c-danger)' : gapPct < 60 ? 'var(--c-warning)' : 'var(--pink-500)';
      var priorityBg = t.priority === 'P0' ? 'var(--c-danger)' : 'var(--c-warning)';

      html += ''
        + '<div style="padding:14px;background:linear-gradient(135deg,var(--bg-pink-soft),#fff);border-radius:12px;border:2px solid ' + gapColor + ';">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        +     '<div style="display:flex;align-items:center;gap:8px;">'
        +       '<span style="font-size:10px;padding:2px 8px;background:' + priorityBg + ';color:#fff;border-radius:4px;font-weight:700;">' + t.priority + '</span>'
        +       '<span style="font-size:14px;font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(t.sku) + '</span>'
        +       (t.positioning ? '<span style="font-size:10px;padding:1px 5px;background:var(--pink-300);color:#fff;border-radius:3px;">' + App.escapeHtml(t.positioning) + '</span>' : '')
        +     '</div>'
        +     '<div style="text-align:right;">'
        +       '<span style="font-size:20px;font-weight:800;color:' + gapColor + ';">' + t.gap + '</span>'
        +       '<span style="font-size:11px;color:var(--text-3);"> 差距</span>'
        +     '</div>'
        +   '</div>'
        +   (t.productName ? '<div style="font-size:11px;color:var(--text-3);margin-bottom:6px;">' + App.escapeHtml(t.productName) + '</div>' : '')
        +   '<div style="display:flex;align-items:center;gap:8px;">'
        +     '<span style="font-size:11px;color:var(--text-2);">要求: <b>' + t.target + '</b></span>'
        +     '<span style="font-size:11px;color:var(--text-3);">→</span>'
        +     '<span style="font-size:11px;color:var(--text-2);">实际: <b>' + t.actualSamples + '</b></span>'
        +     '<span style="font-size:11px;color:var(--text-3);">→</span>'
        +     '<span style="font-size:11px;font-weight:700;color:' + gapColor + ';">完成 ' + gapPct + '%</span>'
        +   '</div>'
        +   '<div style="height:8px;background:#fff;border-radius:4px;overflow:hidden;margin-top:8px;">'
        +     '<div style="height:100%;width:' + Math.min(gapPct, 100) + '%;background:' + gapColor + ';border-radius:4px;transition:width .6s ease;"></div>'
        +   '</div>'
        + '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
  }

  /* ================================================================
     寄样任务差距分析 (全部任务)
     ================================================================ */
  function renderTaskGap() {
    var container = document.getElementById('task-gap-analysis');
    if (!container) return;

    var tasks = Data.getTaskGapAnalysis();
    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__text">暂无寄样任务</div></div>';
      return;
    }

    var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">'
      + '<thead><tr style="border-bottom:2px solid var(--border-1);">'
      +   '<th style="padding:8px;text-align:left;color:var(--text-3);font-weight:600;">优先级</th>'
      +   '<th style="padding:8px;text-align:left;color:var(--text-3);font-weight:600;">SKU</th>'
      +   '<th style="padding:8px;text-align:left;color:var(--text-3);font-weight:600;">定位</th>'
      +   '<th style="padding:8px;text-align:center;color:var(--text-3);font-weight:600;">要求量</th>'
      +   '<th style="padding:8px;text-align:center;color:var(--text-3);font-weight:600;">实际量</th>'
      +   '<th style="padding:8px;text-align:center;color:var(--text-3);font-weight:600;">差距</th>'
      +   '<th style="padding:8px;text-align:center;color:var(--text-3);font-weight:600;">完成率</th>'
      + '</tr></thead><tbody>';

    tasks.forEach(function (t) {
      var gapColor = t.gap > 0 ? (t.gapPct < 30 ? 'var(--c-danger)' : t.gapPct < 60 ? 'var(--c-warning)' : 'var(--pink-500)') : 'var(--c-success)';
      var gapText = t.gap > 0 ? '-' + t.gap : '✓';
      var priorityBg = t.priority === 'P0' ? 'var(--c-danger)' : t.priority === 'P1' ? 'var(--c-warning)' : 'var(--c-info)';
      var rowHighlight = t.isUrgent ? 'background:var(--bg-pink-soft);' : '';

      html += ''
        + '<tr style="border-bottom:1px solid var(--border-1);' + rowHighlight + '">'
        +   '<td style="padding:8px;"><span style="font-size:10px;padding:2px 6px;background:' + priorityBg + ';color:#fff;border-radius:4px;font-weight:600;">' + App.escapeHtml(t.priority || '—') + '</span></td>'
        +   '<td style="padding:8px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(t.sku) + (t.productName ? '<br><span style="font-size:10px;color:var(--text-3);font-weight:400;">' + App.escapeHtml(t.productName) + '</span>' : '') + '</td>'
        +   '<td style="padding:8px;">' + (t.positioning ? '<span style="font-size:10px;padding:1px 5px;background:var(--pink-300);color:#fff;border-radius:3px;">' + App.escapeHtml(t.positioning) + '</span>' : '—') + '</td>'
        +   '<td style="padding:8px;text-align:center;color:var(--text-2);">' + t.target + '</td>'
        +   '<td style="padding:8px;text-align:center;color:var(--text-2);">' + t.actualSamples + '</td>'
        +   '<td style="padding:8px;text-align:center;font-weight:700;color:' + gapColor + ';">' + gapText + '</td>'
        +   '<td style="padding:8px;text-align:center;">'
        +     '<div style="display:flex;align-items:center;gap:4px;justify-content:center;">'
        +       '<div style="width:50px;height:6px;background:var(--bg-pink-soft);border-radius:3px;overflow:hidden;">'
        +         '<div style="height:100%;width:' + Math.min(t.gapPct, 100) + '%;background:' + gapColor + ';border-radius:3px;"></div>'
        +       '</div>'
        +       '<span style="font-size:11px;font-weight:600;color:' + gapColor + ';min-width:30px;">' + t.gapPct + '%</span>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  /* ================================================================
     SKU 排名（按寄样量）
     ================================================================ */
  function renderSKURanking(ranking) {
    var container = document.getElementById('sku-ranking');
    if (!container || ranking.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__text">暂无 SKU 数据</div></div>';
      return;
    }

    var maxCount = ranking[0].sampleCount || 1;

    container.innerHTML = ranking.slice(0, 15).map(function (s, i) {
      var pct = (s.sampleCount / maxCount) * 100;
      var posColor = s.positioning === '爆品' ? 'var(--pink-500)' :
                     s.positioning === '销售' ? 'var(--c-success)' :
                     s.positioning === '测品' ? 'var(--c-info)' :
                     s.positioning === '撤退' ? 'var(--text-3)' : 'var(--border-2)';
      return ''
        + '<div style="margin-bottom:12px;">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        +     '<div style="display:flex;align-items:center;gap:6px;">'
        +       '<span style="font-size:12px;font-weight:700;color:var(--pink-600);">#' + (i + 1) + '</span>'
        +       '<span style="font-size:13px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(s.sku) + '</span>'
        +       '<span class="tag" style="font-size:10px;background:' + posColor + ';color:#fff;">' + App.escapeHtml(s.positioning || '—') + '</span>'
        +     '</div>'
        +     '<span style="font-size:14px;font-weight:700;color:var(--c-success);">' + s.sampleCount + ' 寄样</span>'
        +   '</div>'
        +   '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
        +     '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--pink-300),var(--pink-400));border-radius:4px;transition:width .6s ease;"></div>'
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-3);margin-top:3px;">' + s.videoCount + '个视频</div>'
        + '</div>';
    }).join('');
  }

  /* ================================================================
     官方等级分布
     ================================================================ */
  function renderOfficialDist(creatorStats) {
    var container = document.getElementById('official-dist');
    if (!container) return;

    var byOfficial = creatorStats.byOfficial;
    var total = creatorStats.total || 1;
    var levels = ['L0-1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    var colors = ['var(--text-3)', 'var(--c-warning)', 'var(--c-success)', 'var(--c-info)', 'var(--pink-400)', 'var(--pink-500)'];

    var html = levels.map(function (level, i) {
      var count = byOfficial[level] || 0;
      var pct = Math.round(count / total * 100);
      return ''
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        +   '<span style="width:32px;font-size:12px;font-weight:600;color:var(--text-2);">' + level + '</span>'
        +   '<div style="flex:1;height:16px;background:var(--bg-pink-soft);border-radius:8px;overflow:hidden;">'
        +     '<div style="height:100%;width:' + pct + '%;background:' + colors[i] + ';border-radius:8px;min-width:2px;transition:width .6s ease;"></div>'
        +   '</div>'
        +   '<span style="width:50px;text-align:right;font-size:12px;color:var(--text-2);">' + count + ' (' + pct + '%)</span>'
        + '</div>';
    }).join('');

    container.innerHTML = html;
  }

  /* ================================================================
     履约方式分布
     ================================================================ */
  function renderMethodDist(sampleStats) {
    var container = document.getElementById('method-dist');
    if (!container) return;

    var byMethod = sampleStats.byMethod;
    var total = sampleStats.total || 1;
    var sorted = Object.entries(byMethod).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var colors = ['var(--c-success)', 'var(--c-info)', 'var(--c-warning)', 'var(--pink-400)', 'var(--text-3)', 'var(--c-danger)', 'var(--pink-300)', 'var(--border-2)'];

    var html = sorted.map(function (entry, i) {
      var method = entry[0];
      var count = entry[1];
      var pct = Math.round(count / total * 100);
      return ''
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        +   '<span style="width:60px;font-size:12px;font-weight:600;color:var(--text-2);">' + App.escapeHtml(method) + '</span>'
        +   '<div style="flex:1;height:16px;background:var(--bg-pink-soft);border-radius:8px;overflow:hidden;">'
        +     '<div style="height:100%;width:' + pct + '%;background:' + colors[i] + ';border-radius:8px;min-width:2px;transition:width .6s ease;"></div>'
        +   '</div>'
        +   '<span style="width:60px;text-align:right;font-size:12px;color:var(--text-2);">' + count + ' (' + pct + '%)</span>'
        + '</div>';
    }).join('');

    container.innerHTML = html;
  }

  /* ================================================================
     概览
     ================================================================ */
  function renderOverview(data) {
    var container = document.getElementById('report-overview');
    if (!container) return;

    var ss = data.sampleStats;
    var vs = data.videoStats;
    var is = data.inviteStats;

    // 出单统计
    var orderCreators = Data.getOrderCreatorRanking(9999);
    var totalOrderedSamples = orderCreators.reduce(function (sum, c) { return sum + c.ordered; }, 0);

    container.innerHTML = ''
      + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">'
      +   '<div style="padding:14px;background:var(--bg-pink-soft);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:24px;font-weight:700;color:var(--pink-600);">' + App.formatNumber(data.totalCreators) + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">达人总数</div>'
      +   '</div>'
      +   '<div style="padding:14px;background:var(--c-success-bg);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:24px;font-weight:700;color:var(--c-success);">' + ss.withVideo + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">已出视频寄样</div>'
      +   '</div>'
      +   '<div style="padding:14px;background:var(--c-info-bg);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:24px;font-weight:700;color:var(--c-info);">' + is.withScript + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">有话术邀约</div>'
      +   '</div>'
      +   '<div style="padding:14px;background:var(--c-warning-bg);border-radius:12px;text-align:center;">'
      +     '<div style="font-size:24px;font-weight:700;color:var(--c-warning);">' + totalOrderedSamples + '</div>'
      +     '<div style="font-size:12px;color:var(--text-2);">出单寄样数</div>'
      +   '</div>'
      + '</div>';
  }

  /* ================================================================
     初始化
     ================================================================ */
  function init() {
    initViewTabs();
    // 初始化筛选栏
    App.createFilterBar('report-filter-bar', function (sku, startDate, endDate) {
      filterState.sku = sku;
      filterState.startDate = startDate;
      filterState.endDate = endDate;
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
