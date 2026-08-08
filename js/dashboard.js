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

  function renderAll() {
    renderPersona();
    renderDevEffect();
    renderProductAnalysis();
    renderVideoQuality();
    renderReinvest();
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
