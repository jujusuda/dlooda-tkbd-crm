/* ================================================================
   Dlooda TKBD CRM — 数据看板 (v1)
   6大分析维度：达人画像/开发效果/产品/视频质量/ROI/复投
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var filterState = { sku: '', startDate: '', endDate: '' };

  function renderRankingBar(items, labelKey, color) {
    color = color || 'var(--pink-400)';
    if (!items || items.length === 0) return '<div style="padding:12px;color:var(--text-3);font-size:13px;">暂无数据</div>';
    var max = items[0].total || 1;
    return items.map(function (item) {
      var pct = Math.round(item.total / max * 100);
      var fulfillPct = item.fulfillRate || 0;
      var orderPct = item.orderRate || 0;
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
        + '<span style="width:60px;font-size:11px;font-weight:600;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(item[labelKey] || item.label || '') + '</span>'
        + '<div style="flex:1;height:16px;background:var(--bg-pink-soft);border-radius:8px;overflow:hidden;position:relative;">'
        + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:8px;transition:width .6s ease;"></div>'
        + '</div>'
        + '<span style="width:90px;text-align:right;font-size:11px;color:var(--text-3);">' + item.total + ' · 履' + fulfillPct + '% · 单' + orderPct + '%</span>'
        + '</div>';
    }).join('');
  }

  function renderPersona() {
    var container = document.getElementById('persona-analysis');
    if (!container) return;
    var data = Data.getCreatorPersonaAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '<div class="card"><div style="padding:12px 0;">';

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin-bottom:8px;">按年龄</div>';
    html += renderRankingBar(data.byAge, 'label', 'var(--pink-400)');

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 8px;">按身材</div>';
    html += renderRankingBar(data.byBodyType, 'label', 'var(--c-info)');

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 8px;">按品类 TOP 10</div>';
    html += renderRankingBar(data.byCategory, 'label', 'var(--c-success)');

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 8px;">按官方等级</div>';
    html += renderRankingBar(data.byOfficial, 'label', 'var(--c-warning)');

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 8px;">按星级</div>';
    html += renderRankingBar(data.byStars, 'label', 'var(--pink-500)');

    html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 8px;">按履约率</div>';
    html += renderRankingBar(data.byFulfillment, 'label', 'var(--c-success)');

    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderDevEffect() {
    var container = document.getElementById('dev-effect');
    if (!container) return;
    var d = Data.getDevEffectAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + d.autoApproved + '</div><div class="stat-card__label">自动通过</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-warning);">' + d.manualApproved + '</div><div class="stat-card__label">手动通过</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + d.autoFulfillRate + '%</div><div class="stat-card__label">自动履约率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + d.manualFulfillRate + '%</div><div class="stat-card__label">手动履约率</div></div>'
      + '</div>';

    html += '<div class="card"><div style="padding:12px 0;">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
      + '<span style="width:80px;font-size:12px;font-weight:600;color:var(--text-2);">自动通过</span>'
      + '<div style="flex:1;height:20px;background:var(--bg-pink-soft);border-radius:10px;overflow:hidden;">'
      + '<div style="height:100%;width:' + (d.autoApproved + d.manualApproved > 0 ? Math.round(d.autoApproved / (d.autoApproved + d.manualApproved) * 100) : 0) + '%;background:var(--c-info);border-radius:10px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;"><span style="font-size:10px;font-weight:700;color:#fff;">' + d.autoApproved + '</span></div>'
      + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
      + '<span style="width:80px;font-size:12px;font-weight:600;color:var(--text-2);">手动通过</span>'
      + '<div style="flex:1;height:20px;background:var(--bg-pink-soft);border-radius:10px;overflow:hidden;">'
      + '<div style="height:100%;width:' + (d.autoApproved + d.manualApproved > 0 ? Math.round(d.manualApproved / (d.autoApproved + d.manualApproved) * 100) : 0) + '%;background:var(--c-warning);border-radius:10px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;"><span style="font-size:10px;font-weight:700;color:#fff;">' + d.manualApproved + '</span></div>'
      + '</div></div>'
      + '<div style="margin-top:12px;padding:10px;background:var(--bg-pink-soft);border-radius:8px;font-size:12px;color:var(--text-2);line-height:1.7;">'
      + '自动通过 ' + d.autoApproved + ' 人 → 履约 ' + d.autoFulfilled + ' (' + d.autoFulfillRate + '%) → 出单 ' + d.autoOrdered + ' (' + d.autoOrderRate + '%)<br>'
      + '手动通过 ' + d.manualApproved + ' 人 → 履约 ' + d.manualFulfilled + ' (' + d.manualFulfillRate + '%) → 出单 ' + d.manualOrdered + ' (' + d.manualOrderRate + '%)<br>'
      + '总邀约 ' + d.totalInvites + ' 条 → 寄样 ' + d.totalSamples + ' 次'
      + '</div>'
      + '</div></div>';

    container.innerHTML = html;
  }

  function renderProductAnalysis() {
    var container = document.getElementById('product-analysis');
    if (!container) return;
    var products = Data.getProductAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    if (products.length === 0) {
      container.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>';
      return;
    }

    var html = '<div class="card" style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-2);">SKU</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-2);">邀请</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--c-info);">通过</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--c-success);">履约</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--pink-500);">出单</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">履约率</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">出单率</th>'
      + '</tr></thead><tbody>';

    products.slice(0, 20).forEach(function (p) {
      html += '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:6px 4px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(p.sku) + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + p.invited + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-info);">' + p.approved + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-success);">' + p.fulfilled + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--pink-500);font-weight:700;">' + p.ordered + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-3);">' + p.fulfillRate + '%</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-3);">' + p.orderRate + '%</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
  }

  function renderVideoQuality() {
    var container = document.getElementById('video-quality');
    if (!container) return;
    var analytics = Data.getVideoAnalytics(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(analytics.total) + '</div><div class="stat-card__label">视频总数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(analytics.orderedVideos) + '</div><div class="stat-card__label">出单视频</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + analytics.orderRate + '%</div><div class="stat-card__label">出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(analytics.uniqueCreators) + '</div><div class="stat-card__label">有视频达人</div></div>'
      + '</div>';

    // SKU 视频排行
    if (analytics.skuRanking.length > 0) {
      html += '<div class="card" style="margin-bottom:12px;">'
        + '<div class="card__header"><h3 class="card__title">SKU 视频排名 TOP 8</h3></div>'
        + '<div style="padding:8px 0;">';
      // 按产品定位排序：爆品 → 销售 → 测品 → 撤退，同档按视频数降序
      var skuRank = (analytics.skuRanking || []).slice().sort(function (a, b) {
        var ta = Data.getSKUPositionTier(a.sku), tb = Data.getSKUPositionTier(b.sku);
        if (ta !== tb) return ta - tb;
        return b.videoCount - a.videoCount;
      });
      var maxV = skuRank[0] ? (skuRank[0].videoCount || 1) : 1;
      skuRank.slice(0, 8).forEach(function (s, i) {
        var pct = Math.round(s.videoCount / maxV * 100);
        html += '<div style="margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">'
          + '<span style="font-weight:600;color:var(--text-1);">#' + (i+1) + ' SKU ' + App.escapeHtml(s.sku) + '</span>'
          + '<span><span style="color:var(--c-info);">' + s.videoCount + '视频</span> · <span style="color:var(--pink-500);">' + s.orderedCount + '出单</span> · <span style="color:var(--c-success);">' + s.orderRate + '%</span></span>'
          + '</div>'
          + '<div style="height:6px;background:var(--bg-pink-soft);border-radius:3px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:var(--pink-400);border-radius:3px;transition:width .6s ease;"></div>'
          + '</div></div>';
      });
      html += '</div></div>';
    }

    // 颜色排行
    if (analytics.colorRanking.length > 0) {
      html += '<div class="card">'
        + '<div class="card__header"><h3 class="card__title">颜色分布 TOP 8</h3></div>'
        + '<div style="padding:8px 0;">';
      var maxC = analytics.colorRanking[0].count || 1;
      var colorMap = { '黑': '#333', '白': '#eee', '灰': '#999', '蓝': '#4A90D9', '淡蓝': '#B0D4E8', '粉': '#F5B0BC', '绿': '#7EC850', '棕': '#8B6F47', '卡其': '#C3B091', '杏': '#D4A574' };
      analytics.colorRanking.slice(0, 8).forEach(function (c) {
        var pct = Math.round(c.count / maxC * 100);
        var bg = colorMap[c.color] || 'var(--pink-300)';
        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
          + '<span style="width:40px;font-size:12px;font-weight:600;color:var(--text-2);">' + App.escapeHtml(c.color) + '</span>'
          + '<div style="flex:1;height:14px;background:var(--bg-pink-soft);border-radius:7px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:' + bg + ';border-radius:7px;transition:width .6s ease;"></div>'
          + '</div>'
          + '<span style="width:40px;text-align:right;font-size:12px;color:var(--text-3);">' + c.count + '</span>'
          + '</div>';
      });
      if (analytics.topColor) {
        html += '<div style="margin-top:8px;padding:8px;background:var(--bg-pink-soft);border-radius:8px;font-size:12px;color:var(--pink-600);">最容易出单颜色：' + App.escapeHtml(analytics.topColor.color) + '</div>';
      }
      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  function renderReinvest() {
    var container = document.getElementById('reinvest-analysis');
    if (!container) return;
    var data = Data.getReinvestAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + data.reinvestTotal + '</div><div class="stat-card__label">复投人数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + data.reinvestSuccess + '</div><div class="stat-card__label">成功人数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + data.overallRate + '%</div><div class="stat-card__label">整体复投率</div></div>'
      + '</div>';

    if (data.bySKU.length > 0) {
      // 按产品定位排序：爆品 → 销售 → 测品 → 撤退，同档按复投数降序
      var reinvestList = data.bySKU.slice().sort(function (a, b) {
        var ta = Data.getSKUPositionTier(a.sku), tb = Data.getSKUPositionTier(b.sku);
        if (ta !== tb) return ta - tb;
        return b.reinvest - a.reinvest;
      });
      html += '<div class="card"><div class="card__header"><h3 class="card__title">各 SKU 复投率</h3></div><div style="padding:8px 0;">';
      reinvestList.forEach(function (r) {
        var pct = r.rate;
        var color = pct >= 50 ? 'var(--c-success)' : pct >= 30 ? 'var(--c-warning)' : 'var(--c-danger)';
        html += '<div style="margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">'
          + '<span style="font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(r.sku) + ' · ' + App.escapeHtml(r.productName) + '</span>'
          + '<span><span style="color:var(--text-2);">' + r.reinvest + '复投</span> · <span style="color:var(--c-success);">' + r.success + '成功</span> · <span style="color:' + color + ';font-weight:700;">' + pct + '%</span></span>'
          + '</div>'
          + '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
          + '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:4px;transition:width .6s ease;"></div>'
          + '</div></div>';
      });
      html += '</div></div>';
    } else {
      html += '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无复投数据</div></div>';
    }

    container.innerHTML = html;
  }

  function renderTrend() {
    var c = document.getElementById('trend-analysis');
    if (!c) return;
    var data = Data.getTrendAnalysis(filterState.startDate, filterState.endDate, filterState.sku);
    if (!data || data.length === 0) { c.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>'; return; }
    var pts = data.slice(-30);
    var W = 680, H = 210, padL = 30, padB = 26, padT = 14, padR = 12;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxS = Math.max.apply(null, pts.map(function (p) { return p.sampleCount; }).concat([1]));
    var maxO = Math.max.apply(null, pts.map(function (p) { return p.orderCount || 0; }).concat([1]));
    var n = pts.length, step = plotW / n;
    var barW = Math.min(18, step * 0.55);
    var bars = '', linePts = [], dots = '';
    pts.forEach(function (p, i) {
      var x = padL + i * step + step / 2;
      var sh = Math.round(p.sampleCount / maxS * plotH);
      var y = padT + plotH - sh;
      bars += '<rect x="' + (x - barW / 2) + '" y="' + y + '" width="' + barW + '" height="' + sh + '" rx="2" fill="url(#barGrad)"><title>' + p.date + ' 寄样 ' + p.sampleCount + ' 出单 ' + (p.orderCount || 0) + ' 通过率 ' + p.passRate + '%</title></rect>';
      var oy = padT + plotH - Math.round((p.orderCount || 0) / maxO * plotH);
      linePts.push(x + ',' + oy);
      dots += '<circle cx="' + x + '" cy="' + oy + '" r="2.5" fill="#4caf87"><title>' + p.date + ' 出单 ' + (p.orderCount || 0) + '</title></circle>';
    });
    var line = '<polyline points="' + linePts.join(' ') + '" fill="none" stroke="#4caf87" stroke-width="2" stroke-linejoin="round"/>';
    var labels = '';
    var gap = Math.ceil(n / 6);
    pts.forEach(function (p, i) {
      if (i % gap === 0 || i === n - 1) {
        var x = padL + i * step + step / 2;
        labels += '<text x="' + x + '" y="' + (H - 8) + '" font-size="9" fill="#9b8e8e" text-anchor="middle">' + p.date.slice(5) + '</text>';
      }
    });
    var yTicks = '<text x="2" y="' + (padT + 6) + '" font-size="8" fill="#9b8e8e">' + maxS + '</text><text x="2" y="' + (padT + plotH) + '" font-size="8" fill="#9b8e8e">0</text>';
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;">' +
      '<defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff9ec4"/><stop offset="100%" stop-color="#ffd6e6"/></linearGradient></defs>' +
      yTicks + bars + line + dots + labels +
      '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="#efe6e6" stroke-width="1"/></svg>';
    var legend = '<div style="display:flex;gap:16px;font-size:11px;color:var(--text-2);margin:8px 0 4px;padding:0 4px;">' +
      '<span><span style="display:inline-block;width:10px;height:10px;background:#ff9ec4;border-radius:2px;margin-right:4px;"></span>每日寄样量</span>' +
      '<span><span style="display:inline-block;width:12px;height:3px;background:#4caf87;margin-right:4px;vertical-align:middle;"></span>每日出单量</span></div>';
    c.innerHTML = '<div class="card" style="overflow-x:auto;"><div style="padding:8px 4px;">' + legend + svg +
      '<div style="font-size:11px;color:var(--text-3);margin-top:6px;padding:0 4px;">共 ' + data.length + ' 个有数据的日期 · 柱=寄样量，绿线=出单量，悬停看通过率</div></div></div>';
  }

  function renderFulfillMethod() {
    var c = document.getElementById('fulfill-method');
    if (!c) return;
    var dist = Data.getFulfillMethodDistribution(filterState.startDate, filterState.endDate, filterState.sku);
    if (!dist || dist.length === 0) { c.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>'; return; }
    var max = dist[0].count || 1;
    var colors = { '视频': 'var(--c-info)', '直播': 'var(--c-success)', '已催': 'var(--c-warning)', '已取消': 'var(--c-danger)', '未履约': '#b0a0a0', '未填': 'var(--text-3)' };
    var html = '<div class="card" style="padding:8px 4px;">' + dist.map(function (d) {
      var pct = Math.round(d.count / max * 100);
      var col = colors[d.method] || 'var(--pink-400)';
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
        '<span style="width:54px;font-size:12px;color:var(--text-2);">' + App.escapeHtml(d.method) + '</span>' +
        '<div style="flex:1;height:16px;background:var(--bg-pink-soft);border-radius:8px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + col + ';border-radius:8px;"></div></div>' +
        '<span style="width:42px;text-align:right;font-size:12px;color:var(--text-3);">' + d.count + '</span></div>';
    }).join('') + '</div>';
    c.innerHTML = html;
  }

  function renderLanguage() {
    var c = document.getElementById('language-distribution');
    if (!c) return;
    var d = Data.getLanguageDistribution(filterState.startDate, filterState.endDate, filterState.sku);
    if (!d || !d.total) { c.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>'; return; }
    var langColors = { '英语': '#4A90D9', '黑人': '#7E5BEF', '西语': '#F5A623', '其他': '#9b8e8e' };
    function barBlock(title, arr, totalNote) {
      var max = Math.max.apply(null, arr.map(function (x) { return x.count; }).concat([1]));
      var rows = arr.map(function (x) {
        var pct = Math.round(x.count / max * 100);
        return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
          '<span style="width:42px;font-size:12px;color:var(--text-2);">' + App.escapeHtml(x.lang) + '</span>' +
          '<div style="flex:1;height:14px;background:var(--bg-pink-soft);border-radius:7px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + (langColors[x.lang] || 'var(--pink-400)') + ';border-radius:7px;"></div></div>' +
          '<span style="width:36px;text-align:right;font-size:12px;color:var(--text-3);">' + x.count + '</span></div>';
      }).join('');
      return '<div class="card" style="margin-bottom:12px;"><div class="card__header"><h3 class="card__title">' + title + '</h3></div><div style="padding:8px 4px;">' + rows + '<div style="font-size:11px;color:var(--text-3);margin-top:4px;">' + totalNote + '</div></div></div>';
    }
    var skuHtml = '<div class="card"><div class="card__header"><h3 class="card__title">各 SKU 语言构成</h3></div><div style="padding:8px 4px;">';
    d.bySku.forEach(function (item) {
      var total = item.langs.reduce(function (s, x) { return s + x.count; }, 0);
      if (total === 0) return;
      var segs = '';
      item.langs.forEach(function (x) {
        if (x.count > 0) { var w = Math.round(x.count / total * 100); segs += '<div style="width:' + w + '%;background:' + (langColors[x.lang] || 'var(--pink-400)') + ';height:100%;" title="' + App.escapeHtml(x.lang) + ' ' + x.count + '"></div>'; }
      });
      skuHtml += '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span style="font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(item.sku) + '</span><span style="color:var(--text-3);">' + total + ' 寄样</span></div>' +
        '<div style="display:flex;height:16px;border-radius:8px;overflow:hidden;background:var(--bg-pink-soft);">' + segs + '</div></div>';
    });
    skuHtml += '</div></div>';
    var totalCount = d.total.reduce(function (s, x) { return s + x.count; }, 0);
    var orderCount = d.orderByLang.reduce(function (s, x) { return s + x.count; }, 0);
    c.innerHTML = barBlock('整体语言分布', d.total, '总计 ' + totalCount + ' 条寄样') +
      barBlock('出单语言分布', d.orderByLang, '有出单的寄样 ' + orderCount + ' 条') + skuHtml;
  }

  function renderAll() {
    renderPersona();
    renderDevEffect();
    renderProductAnalysis();
    renderVideoQuality();
    renderReinvest();
    renderTrend();
    renderFulfillMethod();
    renderLanguage();
  }

  function init() {
    // 初始化筛选栏
    App.createFilterBar('dashboard-filter-bar', function (sku, startDate, endDate) {
      filterState.sku = sku;
      filterState.startDate = startDate;
      filterState.endDate = endDate;
      renderAll();
    });
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
