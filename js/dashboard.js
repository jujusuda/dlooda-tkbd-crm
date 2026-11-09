/* ================================================================
   Dlooda TKBD CRM — 数据看板 (v1)
   6大分析维度：达人画像/开发效果/产品/视频质量/ROI/复投
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var filterState = { sku: '', startDate: '', endDate: '' };
  var reinvestMode = 'sku'; // 复投口径：'sku'=按SKU拆分, 'creator'=按达人整体

  /* ---------- 安全渲染：单个模块报错不影响其它模块 ---------- */
  function safeRender(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[dashboard] 渲染失败:', name, err);
      var container = document.getElementById(name);
      if (container) {
        container.innerHTML = '<div class="card"><div style="padding:16px;color:var(--c-danger);font-size:12px;text-align:center;">'
          + '<div>「' + App.escapeHtml(name) + '」加载失败</div>'
          + '<div style="font-size:11px;color:var(--text-3);margin-top:4px;">请按 Ctrl+F5 强制刷新，或打开控制台截图给开发</div>'
          + '</div></div>';
      }
    }
  }

  /* ---------- 顶部分析标签页（点击切换，一次显示一个区块） ---------- */
  function initAnalysisTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.analysis-tab'));
    var sections = ['section-persona','section-language','section-dev','section-trend','section-product','section-levels','section-fulfill','section-video','section-reinvest'];
    function showTab(targetId) {
      sections.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('tab-hidden', id !== targetId);
      });
      tabs.forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-target') === targetId);
      });
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {}
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        showTab(tab.getAttribute('data-target'));
      });
    });
    showTab(sections[0]); // 默认显示第一个标签页
  }

  function renderRankingBar(items, labelKey, color) {
    color = color || 'var(--pink-400)';
    if (!items || items.length === 0) return '<div style="padding:12px;color:var(--text-3);font-size:13px;">暂无数据</div>';
    var total = items.reduce(function (s, x) { return s + (x.total || 0); }, 0) || 1;
    return items.map(function (item) {
      var pct = total > 0 ? Math.round(item.total / total * 100) : 0;
      var fulfillPct = item.fulfillRate || 0;
      var orderPct = item.orderRate || 0;
      return '<div class="bar-row">'
        + '<span class="bar-label">' + App.escapeHtml(item[labelKey] || item.label || '') + '</span>'
        + '<div class="bar-track">'
        + '<div class="bar-fill" style="width:' + pct + '%;background:' + color + ';">' + (pct >= 12 ? '<span class="bar-pct">' + pct + '%</span>' : '') + '</div>'
        + '</div>'
        + '<span class="bar-count">' + item.total + '<span style="margin:0 2px;">·</span>履' + fulfillPct + '%<span style="margin:0 2px;">·</span>单' + orderPct + '%</span>'
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

    // 按产品定位档位排序，同档按出单率（出单达人 ÷ 视频达人）降序
    products.sort(function (a, b) {
      var ta = Data.getSKUPositionTier(a.sku), tb = Data.getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      return b.orderRate - a.orderRate;
    });

    // 口径（与 PPT 产品分析表一致，2026-11-08 终版 —— 按寄样「行数」，不是去重人数）：
    //   履约率 = 履约行数(视频/直播) ÷ 寄样行数  → p.fulfillRate（例 2190: 21/23 = 91.3%）
    //   出单率 = 出单行数 ÷ 视频行数(履约方式=「视频」，不含直播行) → p.orderRate（例 2190: 8/18 = 44.4%）
    // ⚠️ 用去重人数会算成 90.5%/37.5%（2190），与 PPT 不符。
    var html = '<div class="card" style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-2);">SKU</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-2);">寄样</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--c-info);">履约</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--pink-500);">出单</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">履约率<br><span style="font-weight:400;font-size:10px;">(履约÷寄样)</span></th>'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-3);">出单率<br><span style="font-weight:400;font-size:10px;">(出单÷视频)</span></th>'
      + '</tr></thead><tbody>';

    products.slice(0, 20).forEach(function (p) {
      var rate = p.orderRate || 0;
      var fulfillRate = p.fulfillRate || 0;
      var barColor = rate >= 50 ? 'var(--c-success)' : rate >= 25 ? 'var(--c-warning)' : 'var(--pink-400)';
      html += '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:6px 4px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(p.sku) + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + p.approved + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-info);">' + p.fulfilled + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--pink-500);font-weight:700;">' + p.ordered + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + fulfillRate + '%</td>'
        + '<td style="padding:6px 4px;">'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;min-width:60px;height:12px;background:var(--bg-pink-soft);border-radius:6px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.min(rate, 100) + '%;background:' + barColor + ';border-radius:6px;"></div>'
        + '</div>'
        + '<span style="font-size:11px;font-weight:700;color:' + barColor + ';min-width:34px;">' + rate + '%</span>'
        + '</div>'
        + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
  }

  // 把分布对象渲染成带占比数字的条形
  function qualityBars(title, dist) {    var entries = Object.keys(dist || {}).map(function (k) { return [k, dist[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    if (entries.length === 0) return '';
    var total = entries.reduce(function (s, e) { return s + e[1]; }, 0) || 1;
    var rows = entries.map(function (e) {
      var pct = Math.round(e[1] / total * 100);
      return '<div class="bar-row">'
        + '<span class="bar-label">' + App.escapeHtml(e[0]) + '</span>'
        + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:var(--pink-400);">' + (pct >= 12 ? '<span class="bar-pct">' + pct + '%</span>' : '') + '</div></div>'
        + '<span class="bar-count">' + e[1] + ' · ' + pct + '%</span>'
        + '</div>';
    }).join('');
    return '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 6px;">' + title + '</div>' + rows;
  }

  function safeUrl(u) {
    return String(u || '').replace(/[<>"']/g, function (m) { return { '<': '%3C', '>': '%3E', '"': '%22', "'": '%27' }[m]; });
  }

  function renderVideoQuality() {
    var container = document.getElementById('video-quality');
    if (!container) return;
    var analytics = Data.getVideoAnalytics(filterState.startDate, filterState.endDate, filterState.sku);
    var topCreators = Data.getTopVideoCreators(filterState.startDate, filterState.endDate, filterState.sku);
    var profile = Data.getVideoQualityProfile(filterState.startDate, filterState.endDate, filterState.sku);

    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + App.formatNumber(analytics.total) + '</div><div class="stat-card__label">视频总数</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(analytics.orderedRows) + '</div><div class="stat-card__label">出单行<span style="display:block;font-size:10px;font-weight:400;color:var(--text-3);">出单 ÷ 视频行</span></div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + analytics.orderRate + '%</div><div class="stat-card__label">出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(analytics.videoRows) + '</div><div class="stat-card__label">视频行数<span style="display:block;font-size:10px;font-weight:400;color:var(--text-3);">履约方式=视频的寄样行</span></div></div>'
      + '</div>';

    // 达人出单视频 TOP 20（含视频链接）
    html += '<div class="card" style="margin-bottom:12px;">'
      + '<div class="card__header"><h3 class="card__title">达人出单视频 TOP 20 🔥</h3></div>'
      + '<div style="padding:10px 12px;">';
    if (topCreators.length === 0) {
      html += '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无出单视频数据<br><span style="font-size:11px;">（视频链接已在飞书同步中修复，重新同步后即可显示）</span></div>';
    } else {
      topCreators.forEach(function (c, i) {
        var badge = c.official ? '<span style="font-size:10px;color:var(--pink-600);background:var(--bg-pink-soft);padding:1px 6px;border-radius:8px;margin-right:4px;">' + App.escapeHtml(c.official) + '</span>' : '';
        var stars = c.stars ? '<span style="font-size:10px;color:var(--c-warning);margin-right:4px;">' + App.escapeHtml(c.stars) + '</span>' : '';
        var skuTags = (c.skuList || []).slice(0, 4).map(function (sk) {
          return '<span style="font-size:10px;color:var(--text-2);background:var(--bg-2);padding:1px 5px;border-radius:6px;margin-right:3px;">SKU ' + App.escapeHtml(sk) + '</span>';
        }).join('');
        var links = (c.videoUrls || []).map(function (v, idx) {
          return '<a href="' + safeUrl(v.url) + '" target="_blank" rel="noopener" style="display:inline-block;font-size:11px;color:#fff;background:var(--pink-500);padding:2px 8px;border-radius:8px;text-decoration:none;margin:3px 4px 0 0;">🔗 视频' + (idx + 1) + '</a>';
        }).join('');
        html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-1);">'
          + '<div style="width:24px;flex:0 0 24px;text-align:center;font-weight:700;color:var(--pink-500);font-size:14px;">#' + (i + 1) + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:3px;">' + badge + stars + App.escapeHtml(c.creator) + '</div>'
          + '<div style="margin-bottom:4px;">' + skuTags + '</div>'
          + '<div>' + links + '</div>'
          + '</div>'
          + '<div style="flex:0 0 auto;text-align:right;">'
          + '<div style="font-size:16px;font-weight:700;color:var(--c-success);">' + c.orderCount + '</div>'
          + '<div style="font-size:10px;color:var(--text-3);">出单</div>'
          + '</div>'
          + '</div>';
      });
    }
    html += '</div></div>';

    // 视频拍摄质量分析（基于出单视频的达人画像）
    html += '<div class="card">'
      + '<div class="card__header"><h3 class="card__title">视频拍摄质量分析 🎬</h3></div>'
      + '<div style="padding:10px 12px;">';
    if (profile.total === 0) {
      html += '<div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无出单视频数据</div>';
    } else {
      html += '<div style="display:flex;gap:10px;margin-bottom:4px;">'
        + '<div style="flex:1;background:var(--bg-pink-soft);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--pink-600);">' + profile.highStarsRate + '%</div><div style="font-size:11px;color:var(--text-2);">高星级(4-5★)占比</div></div>'
        + '<div style="flex:1;background:var(--bg-pink-soft);border-radius:10px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:var(--pink-600);">' + profile.highOfficialRate + '%</div><div style="font-size:11px;color:var(--text-2);">高等级(L4+)占比</div></div>'
        + '</div>';
      html += qualityBars('按星级', profile.starsDist);
      html += qualityBars('按官方等级', profile.officialDist);
      html += qualityBars('按身材', profile.bodyDist);
      html += qualityBars('按品类', profile.categoryDist);
      html += qualityBars('按语言', profile.languageDist);
      html += '<div style="margin-top:10px;padding:8px 10px;background:var(--bg-pink-soft);border-radius:8px;font-size:12px;color:var(--pink-600);line-height:1.6;">'
        + '📌 说明：数据暂无视频质量评分字段，以上用「出单视频对应达人的官方等级 / 星级 / 身材 / 品类 / 语言」作为拍摄质量的代理指标——高等级、高星级达人通常拍摄更专业、转化更好。BD 可点开上方 TOP 20 视频直观判断风格。'
        + '</div>';
    }
    html += '</div></div>';

    // 新老视频 / 新老达人 / 多品合作（2026-11-08）
    html += renderFreshnessBlocks();

    container.innerHTML = html;
  }

  /* 新老视频 & 新老达人 & 多品合作（视频质量分析页内） */
  function renderFreshnessBlocks() {
    var f = Data.getFreshnessAnalysis(filterState.startDate, filterState.endDate, filterState.sku);
    if (!f) return '';
    var v = f.video, c = f.creator, m = f.multi;

    // 支持任意数量的单元格（label 之后的所有参数按顺序拼进同一行）
    function row(label) {
      var cells = Array.prototype.slice.call(arguments, 1).join('');
      return '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:7px 4px;font-weight:600;color:var(--text-1);">' + label + '</td>'
        + cells + '</tr>';
    }
    function td(val, color, bold) {
      return '<td style="padding:7px 4px;text-align:center;color:' + (color || 'var(--text-2)') + ';' + (bold ? 'font-weight:700;' : '') + '">' + val + '</td>';
    }
    function pctBar(p, color) {
      return '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;min-width:40px;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.min(p, 100) + '%;background:' + color + ';border-radius:4px;"></div></div>'
        + '<span style="font-size:11px;font-weight:700;min-width:34px;text-align:right;">' + p + '%</span></div>';
    }

    var html = '';

    // ① 新老视频（订单级精确口径：订单内容ID → 视频发布日期）
    var of = Data.getOrderFreshness ? Data.getOrderFreshness(filterState.startDate, filterState.endDate, filterState.sku) : null;
    html += '<div class="card" style="margin-bottom:12px;">'
      + '<div class="card__header" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      + '<h3 class="card__title">新老视频 · 出单与订单占比 🆕</h3>'
      + '<span style="font-size:11px;color:var(--text-3);">订单按内容ID反查视频发布日期：区间内=新视频，区间前=老视频</span>'
      + '</div>'
      + '<div style="padding:10px 12px;">';

    if (!f.hasRange) {
      html += '<div style="padding:14px;color:var(--text-3);font-size:12px;text-align:center;">请先在顶部选择时间区间，才能区分新老视频 / 新老达人</div>';
    } else if (of) {
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">类型</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">视频</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">订单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">成交额</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-danger);font-weight:600;">退款单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-danger);font-weight:600;">退款额</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">净额</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">订单占比</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">净额占比</th>'
        + '</tr></thead><tbody>'
        + row('新视频', td(of.videos.news), td(App.formatNumber(of.g.news.orders)),
              td('$' + App.formatNumber(Math.round(of.g.news.amount))),
              td(App.formatNumber(of.g.news.refundOrders)), td('$' + App.formatNumber(Math.round(of.g.news.refundAmount))),
              td('$' + App.formatNumber(Math.round(of.g.news.net)), 'var(--c-success)', true),
              td(pctBar(of.newsShare, 'var(--pink-400)')), td(of.newsAmountShare + '%', 'var(--pink-500)', true))
        + row('老视频', td(of.videos.olds), td(App.formatNumber(of.g.olds.orders)),
              td('$' + App.formatNumber(Math.round(of.g.olds.amount))),
              td(App.formatNumber(of.g.olds.refundOrders)), td('$' + App.formatNumber(Math.round(of.g.olds.refundAmount))),
              td('$' + App.formatNumber(Math.round(of.g.olds.net)), 'var(--c-info)', true),
              td(pctBar(of.oldsShare, 'var(--c-info)')), td(of.oldsAmountShare + '%', 'var(--c-info)', true))
        + (of.g.unknown.orders ? row('未知视频', td(of.videos.unknown), td(App.formatNumber(of.g.unknown.orders)),
              td('$' + App.formatNumber(Math.round(of.g.unknown.amount))),
              td(App.formatNumber(of.g.unknown.refundOrders)), td('$' + App.formatNumber(Math.round(of.g.unknown.refundAmount))),
              td('$' + App.formatNumber(Math.round(of.g.unknown.net))),
              td(pctBar(of.unknownShare, 'var(--text-3)')), td(of.unknownAmountShare + '%', 'var(--text-3)')) : '')
        + '</tbody></table>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--text-3);line-height:1.7;">'
        +   '<span>本期合计：' + App.formatNumber(of.total.orders) + ' 单 · 成交 $' + App.formatNumber(Math.round(of.total.amount))
        +   ' · 退款 ' + App.formatNumber(of.total.refundOrders) + ' 单/$' + App.formatNumber(Math.round(of.total.refundAmount))
        +   '（退款率 ' + of.total.refundRate + '%）· 净额 $' + App.formatNumber(Math.round(of.total.net)) + '</span>'
        + '</div>'
        + '<div style="margin-top:6px;font-size:11px;color:var(--text-3);line-height:1.6;">'
        +   '数据源：D 店总订单表（' + App.formatNumber(of.meta.orders || 0) + ' 单，内容ID 匹配率约 96%）。'
        +   '订单按【创建时间】与【视频发布日期】比较：发布日期落在本期 = 新视频，早于本期 = 老视频；成交额未扣退款，净额 = 成交额 − 退款额。'
        +   '未知视频 = 订单内容ID在视频表里找不到（商品橱窗、外部流量、直播等非视频订单）。'
        + '</div>';
    } else {
      // 没接入订单表时的兜底（按达人×SKU 估算）
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">类型</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">视频条数</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">条数占比</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">达人×SKU</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">其中出单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">出单占比</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">带来订单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">订单占比</th>'
        + '</tr></thead><tbody>'
        + row('新视频', td(v.newVideos), td(v.newVideosShare + '%'), td(v.newCombos), td(v.newOrderedCombos),
              td(pctBar(v.newOrderRate, 'var(--pink-400)')), td(App.formatNumber(v.newOrders)), td(v.newOrdersShare + '%', 'var(--pink-500)', true))
        + row('老视频', td(v.oldVideos), td(v.oldVideosShare + '%'), td(v.oldCombos), td(v.oldOrderedCombos),
              td(pctBar(v.oldOrderRate, 'var(--c-info)')), td(App.formatNumber(v.oldOrders)), td(v.oldOrdersShare + '%', 'var(--c-info)', true))
        + '</tbody></table>'
        + '<div style="margin-top:8px;font-size:11px;color:var(--text-3);line-height:1.6;">'
        +   '总订单表（js/order-data.js）未加载（离线或未生成），以下为按「达人×SKU」的估算口径；联网刷新可恢复精确数据。'
        + '</div>';
    }
    html += '</div></div>';

    // ② 新老达人（订单级：首次寄样早于区间起点 = 老达人）
    html += '<div class="card" style="margin-bottom:12px;">'
      + '<div class="card__header" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      + '<h3 class="card__title">新老达人 · 出单与订单占比 👥</h3>'
      + '<span style="font-size:11px;color:var(--text-3);">首次寄样早于区间起点=老达人，否则新达人</span>'
      + '</div>'
      + '<div style="padding:10px 12px;">';
    if (!f.hasRange) {
      html += '<div style="padding:14px;color:var(--text-3);font-size:12px;text-align:center;">选择时间区间后可区分新老达人</div>';
    } else if (of && of.creatorOrder) {
      var co = of.creatorOrder;
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">类型</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">本期寄样达人</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">出单达人</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">出单率</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">订单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">净额</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">订单占比</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">净额占比</th>'
        + '</tr></thead><tbody>'
        + row('新达人', td(co.newCreators, 'var(--pink-500)', true), td(co.newOrderedCreators),
              td(pctBar(co.newOrderRate, 'var(--pink-400)')), td(App.formatNumber(co.news.orders)),
              td('$' + App.formatNumber(Math.round(co.news.net)), 'var(--c-success)', true),
              td(co.newOrdersShare + '%', 'var(--c-success)', true), td(co.newNetShare + '%', 'var(--pink-500)', true))
        + row('老达人', td(co.oldCreators, 'var(--c-info)', true), td(co.oldOrderedCreators),
              td(pctBar(co.oldOrderRate, 'var(--c-info)')), td(App.formatNumber(co.olds.orders)),
              td('$' + App.formatNumber(Math.round(co.olds.net)), 'var(--c-info)', true),
              td(co.oldOrdersShare + '%', 'var(--c-info)', true), td(co.oldNetShare + '%', 'var(--c-info)', true))
        + '</tbody></table>'
        + '<div style="margin-top:8px;font-size:11px;color:var(--text-3);line-height:1.6;">'
        +   '达人数/出单率只算「本期有寄样记录」的达人；订单与净额是该组全部达人（含很久以前寄样、仍在本期出单的老达人）。'
        +   '新达人净额 $' + App.formatNumber(Math.round(co.news.net)) + '，老达人净额 $' + App.formatNumber(Math.round(co.olds.net)) + '。'
        + '</div>';
    } else {
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">类型</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">达人数</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">寄样行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">视频行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">出单行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">出单率</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">订单占比</th>'
        + '</tr></thead><tbody>'
        + row('新达人', td(c.newCreators, 'var(--pink-500)', true), td(c.newRows), td(c.newVideoRows), td(c.newOrderedRows),
              td(pctBar(c.newOrderRate, 'var(--pink-400)')), td(c.newOrdersShare + '%', 'var(--pink-500)', true))
        + row('老达人', td(c.oldCreators, 'var(--c-info)', true), td(c.oldRows), td(c.oldVideoRows), td(c.oldOrderedRows),
              td(pctBar(c.oldOrderRate, 'var(--c-info)')), td(c.oldOrdersShare + '%', 'var(--c-info)', true))
        + '</tbody></table>'
        + '<div style="margin-top:8px;font-size:11px;color:var(--text-3);">新达人占比 ' + c.newCreatorsShare + '%（' + c.newCreators + '/' + (c.newCreators + c.oldCreators) + '）· 订单 ' + c.newOrders + ' / ' + (c.newOrders + c.oldOrders) + '</div>';
    }
    html += '</div></div>';

    // ③ 多品合作（真实订单口径）
    var mu = (of && of.multi) ? of.multi : null;
    html += '<div class="card">'
      + '<div class="card__header" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      + '<h3 class="card__title">多品合作达人 🧩</h3>'
      + '<span style="font-size:11px;color:var(--text-3);">'
      + (mu ? '区间内同一达人合作的 SKU 数（' + mu.multiCreatorCount + ' 位达人合作 ≥2 款）' : '区间内同一达人合作的 SKU 数')
      + '</span>'
      + '</div>'
      + '<div style="padding:10px 12px;">';

    if (mu) {
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">合作款数</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">达人</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">寄样行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">订单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">净额</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">净额占比</th>'
        + '</tr></thead><tbody>'
        + mu.groups.map(function (g) {
            return row(g.label, td(g.creators), td(g.rows), td(App.formatNumber(g.orders)),
                       td('$' + App.formatNumber(g.net), 'var(--c-success)', true),
                       td(g.netShare + '%', 'var(--pink-500)', true));
          }).join('')
        + '</tbody></table>';

      if (mu.top.length) {
        html += '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin:12px 0 6px;">多品达人 TOP ' + mu.top.length + '（按净额）</div>';
        html += '<div style="display:flex;flex-direction:column;gap:6px;">';
        mu.top.forEach(function (t, i) {
          html += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;background:var(--bg-pink-soft);border-radius:8px;">'
            + '<span style="flex:0 0 20px;font-weight:700;color:var(--pink-500);">#' + (i + 1) + '</span>'
            + '<span style="flex:1;min-width:0;font-weight:600;color:var(--text-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(t.creator) + '</span>'
            + '<span style="flex:0 0 auto;color:var(--text-3);">' + t.skuCount + ' 款</span>'
            + '<span style="flex:0 0 auto;color:var(--text-3);">' + App.formatNumber(t.orders) + ' 单</span>'
            + '<span style="flex:0 0 auto;color:var(--pink-500);font-weight:700;min-width:64px;text-align:right;">$' + App.formatNumber(t.net) + '</span>'
            + '</div>';
        });
        html += '</div>';
      }
      html += '<div style="margin-top:10px;font-size:11px;color:var(--text-3);line-height:1.6;">'
        + '📌 多品 = 同一达人在所选区间内合作 ≥2 个 SKU（按寄样行统计）；订单/净额取总订单表里该达人的真实订单，所以各组合计 = 本期有寄样达人的订单，不含长期只看不寄样的老达人。'
        + '</div>';
    } else {
      html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        + '<th style="padding:7px 4px;text-align:left;color:var(--text-3);font-weight:600;">合作款数</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">达人</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">寄样行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">视频行</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--c-success);font-weight:600;">出单率</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--text-3);font-weight:600;">订单</th>'
        + '<th style="padding:7px 4px;text-align:center;color:var(--pink-500);font-weight:600;">订单占比</th>'
        + '</tr></thead><tbody>'
        + m.groups.map(function (g) {
            return row(g.label, td(g.creators), td(g.rows), td(g.videoRows),
                       td(pctBar(g.orderRate, 'var(--pink-400)')), td(App.formatNumber(g.orders)),
                       td(g.ordersShare + '%', 'var(--pink-500)', true));
          }).join('')
        + '</tbody></table>'
        + '<div style="margin-top:10px;font-size:11px;color:var(--text-3);">未接入总订单表，以上为寄样行 orderCount 口径。</div>';
    }
    html += '</div></div>';

    return html;
  }

  function renderReinvest() {
    var container = document.getElementById('reinvest-analysis');
    if (!container) return;
    var data = Data.getReinvestAnalysis(filterState.startDate, filterState.endDate, filterState.sku);

    var tabSku = 'border:1px solid ' + (reinvestMode === 'sku' ? 'var(--pink-500)' : 'var(--border-1)') + ';background:' + (reinvestMode === 'sku' ? 'var(--pink-500)' : '#fff') + ';color:' + (reinvestMode === 'sku' ? '#fff' : 'var(--text-2)');
    var tabCreator = 'border:1px solid ' + (reinvestMode === 'creator' ? 'var(--pink-500)' : 'var(--border-1)') + ';background:' + (reinvestMode === 'creator' ? 'var(--pink-500)' : '#fff') + ';color:' + (reinvestMode === 'creator' ? '#fff' : 'var(--text-2)');
    var html = '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">'
      + '<button onclick="setReinvestMode(\'sku\')" style="' + tabSku + ';padding:6px 14px;border-radius:18px;font-size:13px;cursor:pointer;font-weight:600;">按 SKU 拆分</button>'
      + '<button onclick="setReinvestMode(\'creator\')" style="' + tabCreator + ';padding:6px 14px;border-radius:18px;font-size:13px;cursor:pointer;font-weight:600;">按达人整体</button>'
      + '</div>';

    if (reinvestMode === 'sku') {
      html += '<div class="stat-grid" style="margin-bottom:12px;">'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + data.reinvestTotal + '</div><div class="stat-card__label">复投声明数</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + data.reinvestSuccess + '</div><div class="stat-card__label">复投成功</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-danger);">' + data.reinvestFailed + '</div><div class="stat-card__label">未成功</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-warning);">' + data.reinvestWatching + '</div><div class="stat-card__label">观察中(' + data.watchDays + '天内)</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + data.overallRate + '%</div><div class="stat-card__label">复投成功率</div></div>'
        + '</div>';

      // 口径说明
      html += '<div class="card" style="margin-bottom:12px;"><div style="padding:10px 14px;font-size:12px;color:var(--text-2);line-height:1.7;">'
      + '<b style="color:var(--text-1);">判定规则</b>：以飞书「是否复投」字段的 <b>已推XXXX</b> 为复投声明 → '
      + '该达人<b>之后</b>再寄样该 SKU 且<b>系统通过</b>（手动/自动）＝ 复投成功（不要求发视频）。<br>'
      + '声明后不满 ' + data.watchDays + ' 天且尚未合作的记为「观察中」，不计入成功率分母；'
      + '成功率 = 成功 ÷ (成功 + 未成功) = ' + data.reinvestSuccess + ' ÷ ' + data.settledTotal + '。'
      + '<span style="color:var(--text-3);">（占全部声明为 ' + data.rawRate + '%，数据基准日 ' + App.escapeHtml(data.dataMaxDate) + '）</span>'
      + (data.medianDays ? '<br><b style="color:var(--text-1);">转化节奏</b>：成功复投从声明到合作上，'
          + '中位数 <b style="color:var(--pink-600);">' + data.medianDays + ' 天</b>，'
          + '其中 <b>' + data.withinWatchRate + '%</b> 在 ' + data.watchDays + ' 天观察期内完成 —— '
          + '<span style="color:var(--text-3);">剩余部分是更晚才转化的，所以「未成功」里仍可能有后续翻盘。</span>' : '')
      + '</div></div>';
    } else {
      html += '<div class="stat-grid" style="margin-bottom:12px;">'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-primary);">' + data.creatorTotal + '</div><div class="stat-card__label">复投声明达人数</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + data.creatorSuccess + '</div><div class="stat-card__label">复投成功达人数</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-danger);">' + data.creatorFailed + '</div><div class="stat-card__label">未成功</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-warning);">' + data.creatorWatching + '</div><div class="stat-card__label">观察中(' + data.watchDays + '天内)</div></div>'
        + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + data.creatorRate + '%</div><div class="stat-card__label">成功率(按达人)</div></div>'
        + '</div>';
      html += '<div class="card" style="margin-bottom:12px;"><div style="display:flex;gap:14px;padding:10px 14px;flex-wrap:wrap;">'
        + '<div style="flex:1;min-width:150px;"><div style="font-size:22px;font-weight:800;color:var(--c-success);">' + data.successSkuCount + '</div><div style="font-size:11px;color:var(--text-2);">复投命中 SKU 总数（一个达人命中几个算几个，可 &gt; 声明达人数）</div></div>'
        + '<div style="flex:1;min-width:150px;"><div style="font-size:22px;font-weight:800;color:var(--pink-600);">' + data.avgHit + '</div><div style="font-size:11px;color:var(--text-2);">人均命中 SKU 数（命中总数 ÷ 声明达人数）</div></div>'
        + '</div></div>';
      html += '<div class="card" style="margin-bottom:12px;"><div style="padding:10px 14px;font-size:12px;color:var(--text-2);line-height:1.7;">'
        + '<b style="color:var(--text-1);">判定规则（按达人整体）</b>：把复投拆成「达人」维度——<br>'
        + '· <b>分母</b>＝去重后复投声明<b>达人数</b>：一个达人推了 2178+2190 也只算 1 个声明达人；<br>'
        + '· <b>分子</b>＝该达人复投<b>实际命中</b>的 SKU 总数：推了 2178+2190，通过了几个就算几个（可 &gt; 声明达人数）；<br>'
        + '· 成功率(按达人) ＝ 成功达人数 ÷ 声明达人数 ＝ ' + data.creatorSuccess + ' ÷ ' + data.creatorTotal + ' ＝ ' + data.creatorRate + '%。'
        + '<span style="color:var(--text-3);">（人均命中 ' + data.avgHit + ' 个 SKU，反映复投的产出强度）</span>'
        + '</div></div>';
    }

    if (data.bySKU.length > 0) {
      // 按产品定位排序：爆品 → 销售 → 测品 → 撤退，同档按复投数降序
      var reinvestList = data.bySKU.slice().sort(function (a, b) {
        var ta = Data.getSKUPositionTier(a.sku), tb = Data.getSKUPositionTier(b.sku);
        if (ta !== tb) return ta - tb;
        return b.reinvest - a.reinvest;
      });
      html += '<div class="card" style="margin-bottom:12px;"><div class="card__header"><h3 class="card__title">各 SKU 复投转化</h3>'
        + '<span style="font-size:11px;color:var(--text-3);">'
        + '<span style="color:var(--c-success);">■</span>成功 '
        + '<span style="color:var(--c-danger);">■</span>未成功 '
        + '<span style="color:var(--c-warning);">■</span>观察中</span>'
        + '</div><div style="padding:8px 0;">';
      reinvestList.forEach(function (r) {
        var pct = r.rate;
        var color = pct >= 20 ? 'var(--c-success)' : pct >= 10 ? 'var(--c-warning)' : 'var(--c-danger)';
        var tot = r.reinvest || 1;
        var wS = (r.success / tot * 100), wF = (r.failed / tot * 100), wW = (r.watching / tot * 100);
        html += '<div style="margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
          + '<span style="font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(r.sku) + (r.productName ? ' · ' + App.escapeHtml(r.productName) : '') + '</span>'
          + '<span><span style="color:var(--text-2);">' + r.reinvest + '声明</span> · '
          + '<span style="color:var(--c-success);">' + r.success + '成功</span> · '
          + '<span style="color:' + color + ';font-weight:700;">' + pct + '%</span></span>'
          + '</div>'
          + '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;display:flex;">'
          + '<div style="height:100%;width:' + wS + '%;background:var(--c-success);transition:width .6s ease;"></div>'
          + '<div style="height:100%;width:' + wF + '%;background:var(--c-danger);opacity:.55;transition:width .6s ease;"></div>'
          + '<div style="height:100%;width:' + wW + '%;background:var(--c-warning);opacity:.7;transition:width .6s ease;"></div>'
          + '</div></div>';
      });
      html += '</div></div>';

      // 复投成功明细
      var wins = data.details.filter(function (d) { return d.success; });
      html += '<div class="card"><div class="card__header"><h3 class="card__title">复投成功明细</h3>'
        + '<span style="font-size:11px;color:var(--text-3);">共 ' + wins.length + ' 条，显示最近 30 条</span></div>'
        + '<div style="padding:4px 0;">';
      if (wins.length === 0) {
        html += '<div style="padding:14px;color:var(--text-3);font-size:13px;text-align:center;">当前筛选下暂无复投成功记录</div>';
      } else {
        wins.slice(0, 30).forEach(function (d) {
          html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:1px solid var(--border-1);font-size:12px;flex-wrap:wrap;">'
            + '<span style="font-weight:600;color:var(--text-1);min-width:130px;">' + App.escapeHtml(d.creator) + '</span>'
            + '<span style="color:var(--text-3);">' + App.escapeHtml(d.fromSKU) + ' 时标注</span>'
            + '<span style="background:var(--bg-pink-soft);color:var(--pink-600);padding:1px 7px;border-radius:8px;font-weight:600;">已推 ' + App.escapeHtml(d.targetSKU) + '</span>'
            + '<span style="color:var(--text-3);">' + App.escapeHtml((d.declareTime || '').slice(0, 10)) + '</span>'
            + '<span style="color:var(--c-success);font-weight:600;">→ ' + App.escapeHtml((d.successTime || '').slice(0, 10)) + ' 合作</span>'
            + (d.costDays != null ? '<span style="background:var(--bg-pink-soft);color:var(--text-2);padding:1px 6px;border-radius:8px;">耗时 ' + d.costDays + ' 天</span>' : '')
            + '<span style="color:var(--text-3);">(' + App.escapeHtml(String(d.approval || '')) + '通过)</span>'
            + '</div>';
        });
      }
      html += '</div></div>';
    } else {
      html += '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无复投数据</div></div>';
    }

    container.innerHTML = html;
  }

  global.setReinvestMode = function (m) {
    if (m !== 'sku' && m !== 'creator') return;
    reinvestMode = m;
    safeRender('reinvest-analysis', renderReinvest);
  };

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
    // 寄样ROI汇总
    var totalSamples = data.reduce(function (s, p) { return s + p.sampleCount; }, 0);
    var totalOrders = data.reduce(function (s, p) { return s + (p.orderCount || 0); }, 0);
    var roi = totalSamples > 0 ? Math.round(totalOrders / totalSamples * 1000) / 10 : 0;

    var legend = '<div style="display:flex;gap:16px;font-size:11px;color:var(--text-2);margin:8px 0 4px;padding:0 4px;">' +
      '<span><span style="display:inline-block;width:10px;height:10px;background:#ff9ec4;border-radius:2px;margin-right:4px;"></span>每日寄样量</span>' +
      '<span><span style="display:inline-block;width:12px;height:3px;background:#4caf87;margin-right:4px;vertical-align:middle;"></span>每日出单量</span></div>';
    var summary = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;">'
      + '<div style="padding:10px;background:var(--bg-pink-soft);border-radius:8px;text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--pink-600);">' + totalSamples + '</div><div style="font-size:11px;color:var(--text-2);">总寄样</div></div>'
      + '<div style="padding:10px;background:var(--c-success-bg);border-radius:8px;text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--c-success);">' + totalOrders + '</div><div style="font-size:11px;color:var(--text-2);">总出单</div></div>'
      + '<div style="padding:10px;background:var(--c-info-bg);border-radius:8px;text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--c-info);">' + roi + '%</div><div style="font-size:11px;color:var(--text-2);">寄样ROI</div></div>'
      + '</div>';
    c.innerHTML = '<div class="card" style="overflow-x:auto;"><div style="padding:8px 4px;">' + legend + svg + summary +
      '<div style="font-size:11px;color:var(--text-3);margin-top:8px;padding:0 4px;">共 ' + data.length + ' 个有数据的日期 · 柱=寄样量，绿线=出单量，悬停看通过率</div></div></div>';
  }

  function renderFulfillMethod() {
    var c = document.getElementById('fulfill-method');
    if (!c) return;
    var data = Data.getFulfillmentRate(filterState.startDate, filterState.endDate, filterState.sku);
    if (!data || data.total === 0) { c.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>'; return; }

    var colors = { '视频': 'var(--c-info)', '直播': 'var(--c-success)', '已催': 'var(--c-warning)', '已取消': 'var(--c-danger)', '未履约': '#b0a0a0', '未填': 'var(--text-3)' };
    var total = data.total || 1;
    var html = '<div class="stat-grid" style="margin-bottom:16px;">'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + data.fulfillmentRate + '%</div><div class="stat-card__label">整体履约率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + data.fulfilled + '</div><div class="stat-card__label">履约达人</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + data.total + '</div><div class="stat-card__label">寄样总数</div></div>'
      + '</div>';

    html += '<div class="card" style="padding:8px 4px;">' + data.byMethod.map(function (d) {
      var share = Math.round(d.count / total * 100);
      var col = colors[d.method] || 'var(--pink-400)';
      return '<div class="bar-row">'
        + '<span class="bar-label">' + App.escapeHtml(d.method) + '</span>'
        + '<div class="bar-track"><div class="bar-fill" style="width:' + share + '%;background:' + col + ';">' + (share >= 12 ? '<span class="bar-pct">' + share + '%</span>' : '') + '</div></div>'
        + '<span class="bar-count">' + d.count + ' · ' + share + '%</span>'
        + '</div>';
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
    var skuHtml = '<div class="card"><div class="card__header"><h3 class="card__title">各 SKU 出单语言占比</h3></div><div style="padding:8px 4px;">';
    d.bySku.forEach(function (item) {
      var total = item.orderTotal || 0;
      if (total === 0) {
        skuHtml += '<div style="margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span style="font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(item.sku) + '</span><span style="color:var(--text-3);">暂无出单</span></div>'
          + '<div style="height:16px;border-radius:8px;background:var(--bg-pink-soft);"></div></div>';
        return;
      }
      var segs = '';
      item.orderLangs.forEach(function (x) {
        if (x.count > 0) { var w = Math.round(x.count / total * 100); segs += '<div style="width:' + w + '%;background:' + (langColors[x.lang] || 'var(--pink-400)') + ';height:100%;display:flex;align-items:center;justify-content:center;" title="' + App.escapeHtml(x.lang) + ' ' + x.count + ' (' + w + '%)">' + (w >= 14 ? '<span style="font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.15);">' + w + '%</span>' : '') + '</div>'; }
      });
      skuHtml += '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span style="font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(item.sku) + '</span><span style="color:var(--text-3);">' + total + ' 出单</span></div>' +
        '<div style="display:flex;height:16px;border-radius:8px;overflow:hidden;background:var(--bg-pink-soft);">' + segs + '</div></div>';
    });
    skuHtml += '</div></div>';
    var totalCount = d.total.reduce(function (s, x) { return s + x.count; }, 0);
    var orderCount = d.orderByLang.reduce(function (s, x) { return s + x.count; }, 0);
    c.innerHTML = barBlock('整体语言分布', d.total, '总计 ' + totalCount + ' 条寄样') +
      barBlock('出单语言分布', d.orderByLang, '有出单的寄样 ' + orderCount + ' 条') + skuHtml;
  }

  /* ========== 达人层级 × 出单率（2026-11-08 新增） ==========
     按官方等级（L0-1/L2/.../L7）聚合，行数口径：
       出单率 = 出单行 ÷ 视频行；履约率 = 履约行 ÷ 寄样行 */
  var levelMode = 'rows';   // 'rows' = 寄样行（不去重，默认）；'creators' = 达人去重

  function renderLevelAnalysis() {
    var container = document.getElementById('level-analysis');
    if (!container) return;
    var rows = Data.getLevelAnalysis(filterState.startDate, filterState.endDate, filterState.sku);
    if (!rows || rows.length === 0) {
      container.innerHTML = '<div class="card"><div style="padding:16px;color:var(--text-3);font-size:13px;text-align:center;">暂无数据</div></div>';
      return;
    }

    var byRows = levelMode === 'rows';
    var total = { creators: 0, rows: 0, fulfilled: 0, video: 0, ordered: 0, orders: 0, materials: 0 };
    rows.forEach(function (r) {
      total.creators += r.creatorCount; total.rows += r.rows;
      total.fulfilled += r.fulfilled; total.video += r.video;
      total.ordered += r.ordered; total.orders += r.orders;
      total.materials += r.materials;
    });
    var totalOrderRate = total.video > 0 ? Math.round(total.ordered / total.video * 1000) / 10 : 0;
    var totalFulfillRate = total.rows > 0 ? Math.round(total.fulfilled / total.rows * 1000) / 10 : 0;
    var best = rows.filter(function (r) { return r.video >= 5; })
      .sort(function (a, b) { return b.orderRate - a.orderRate; })[0];

    var cardHtml = function (label, value, sub, color) {
      return '<div class="stat-card"><div class="stat-card__value" style="color:' + (color || 'var(--text-1)') + ';">' + value + '</div>'
        + '<div class="stat-card__label">' + label + (sub ? '<span style="display:block;font-size:10px;font-weight:400;color:var(--text-3);margin-top:2px;">' + sub + '</span>' : '') + '</div></div>';
    };
    var html = '<div class="stat-grid" style="margin-bottom:14px;">'
      + cardHtml('等级档位', rows.length + ' 档',
          byRows ? '共 ' + total.rows + ' 行寄样' : '共 ' + total.creators + ' 位达人', 'var(--pink-500)')
      + cardHtml('整体出单率', totalOrderRate + '%', total.ordered + '÷' + total.video, 'var(--c-success)')
      + cardHtml('整体履约率', totalFulfillRate + '%', total.fulfilled + '÷' + total.rows, 'var(--c-info)')
      + cardHtml('出单量最高等级', best ? best.level : '—', best ? best.orderRate + '% · ' + best.orders + ' 单' : '视频行不足', 'var(--pink-500)')
      + '</div>';

    function bar(pct, color) {
      return '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;min-width:44px;height:9px;background:var(--bg-pink-soft);border-radius:5px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + color + ';border-radius:5px;"></div></div>'
        + '<span style="font-size:11px;font-weight:700;min-width:36px;text-align:right;color:var(--text-2);">' + pct + '%</span></div>';
    }

    html += '<div class="card" style="overflow-x:auto;">'
      + '<div class="card__header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">'
      + '<h3 class="card__title">各等级出单率 / 履约率对比</h3>'
      + '<span style="display:inline-flex;gap:6px;align-items:center;">'
      +   '<span style="display:inline-flex;border:1px solid var(--border-1);border-radius:var(--r-full);overflow:hidden;">'
      +     '<button class="filter-btn' + (byRows ? ' active' : '') + '" data-level-mode="rows" style="border:0;border-radius:0;">按寄样行</button>'
      +     '<button class="filter-btn' + (byRows ? '' : ' active') + '" data-level-mode="creators" style="border:0;border-radius:0;">按达人</button>'
      +   '</span>'
      +   '<span style="font-size:11px;color:var(--text-3);">出单率 = 出单行 ÷ 视频行 · 履约率 = 履约行 ÷ 寄样行</span>'
      + '</span>'
      + '</div>'
      + '<table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-2);">等级</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">' + (byRows ? '寄样行' : '达人') + '</th>'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--c-info);">履约率</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">视频行</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">出单行</th>'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--c-success);">出单率</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--pink-500);">出单量</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-3);">素材</th>'
      + '</tr></thead><tbody>';

    rows.forEach(function (r) {
      var lvColor = (r.level === 'L5' || r.level === 'L6' || r.level === 'L7') ? 'var(--pink-500)'
        : r.level === 'L4' ? 'var(--c-info)' : r.level === 'L3' ? 'var(--c-success)' : 'var(--text-3)';
      var ordersPct = total.orders > 0 ? Math.round(r.orders / total.orders * 100) : 0;
      html += '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:8px 4px;font-weight:700;color:' + lvColor + ';">' + App.escapeHtml(r.level) + '</td>'
        + '<td style="padding:8px 4px;text-align:center;color:var(--text-2);">' + (byRows ? r.rows : r.creatorCount) + '</td>'
        + '<td style="padding:8px 4px;min-width:110px;">' + bar(r.fulfillRate, 'var(--c-info)') + '</td>'
        + '<td style="padding:8px 4px;text-align:center;color:var(--text-2);">' + r.video + '</td>'
        + '<td style="padding:8px 4px;text-align:center;color:var(--text-2);">' + r.ordered + '</td>'
        + '<td style="padding:8px 4px;min-width:110px;">' + bar(r.orderRate, 'var(--pink-400)') + '</td>'
        + '<td style="padding:8px 4px;text-align:center;font-weight:700;color:var(--pink-500);">' + App.formatNumber(r.orders)
        + ' <span style="font-size:10px;font-weight:400;color:var(--text-3);">' + ordersPct + '%</span></td>'
        + '<td style="padding:8px 4px;text-align:center;color:var(--text-2);">' + r.materials + '</td>'
        + '</tr>';
    });

    html += '<tr style="background:var(--bg-pink-soft);font-weight:700;">'
      + '<td style="padding:8px 4px;color:var(--text-1);">合计</td>'
      + '<td style="padding:8px 4px;text-align:center;">' + (byRows ? total.rows : total.creators) + '</td>'
      + '<td style="padding:8px 4px;">' + bar(totalFulfillRate, 'var(--c-info)') + '</td>'
      + '<td style="padding:8px 4px;text-align:center;">' + total.video + '</td>'
      + '<td style="padding:8px 4px;text-align:center;">' + total.ordered + '</td>'
      + '<td style="padding:8px 4px;">' + bar(totalOrderRate, 'var(--pink-400)') + '</td>'
      + '<td style="padding:8px 4px;text-align:center;color:var(--pink-500);">' + App.formatNumber(total.orders) + '</td>'
      + '<td style="padding:8px 4px;text-align:center;">' + total.materials + '</td>'
      + '</tr>';

    html += '</tbody></table>'
      + '<div style="padding:8px 4px 2px;font-size:11px;color:var(--text-3);">等级来自飞书「官方等级」字段；未填等级的达人归入「未填」。出单量 = 寄样行 orderCount 合计，括号内为占全部出单量比例。</div>'
      + '</div>';

    container.innerHTML = html;
    container.querySelectorAll('[data-level-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        levelMode = this.getAttribute('data-level-mode');
        renderLevelAnalysis();
      });
    });
  }

  // 各区块与渲染函数的映射，便于按需渲染
  var SECTION_RENDERERS = {
    'section-persona': function () { safeRender('persona-analysis', renderPersona); },
    'section-language': function () { safeRender('language-distribution', renderLanguage); },
    'section-dev': function () { safeRender('dev-effect', renderDevEffect); },
    'section-trend': function () { safeRender('trend-analysis', renderTrend); },
    'section-product': function () { safeRender('product-analysis', renderProductAnalysis); },
    'section-levels': function () { safeRender('level-analysis', renderLevelAnalysis); },
    'section-fulfill': function () { safeRender('fulfill-method', renderFulfillMethod); },
    'section-video': function () { safeRender('video-quality', renderVideoQuality); },
    'section-reinvest': function () { safeRender('reinvest-analysis', renderReinvest); },
  };

  // 只渲染当前可见区块（其它区块在空闲时后台预渲染，点击切换即瞬间完成）
  function getActiveSection() {
    var active = document.querySelector('.analysis-tab.active');
    return active ? active.getAttribute('data-target') : 'section-persona';
  }

  function renderActiveOnly() {
    var target = getActiveSection();
    if (SECTION_RENDERERS[target]) SECTION_RENDERERS[target]();
  }

  function renderSection(id) {
    if (SECTION_RENDERERS[id]) SECTION_RENDERERS[id]();
  }

  function renderAll() {
    // 1) 立即渲染当前区块，保证首屏秒开
    renderActiveOnly();
    // 2) 后台空闲预渲染其余区块，之后切换标签无需再计算
    var active = getActiveSection();
    Object.keys(SECTION_RENDERERS).forEach(function (id) {
      if (id === active) return;
      if (typeof requestIdleCallback === 'function') {
        try { requestIdleCallback(function () { renderSection(id); }, { timeout: 1500 }); return; } catch (e) {}
      }
      setTimeout(function () { renderSection(id); }, 0);
    });
  }

  function init() {
    // 初始化筛选栏
    App.createFilterBar('dashboard-filter-bar', function (sku, startDate, endDate) {
      filterState.sku = sku;
      filterState.startDate = startDate;
      filterState.endDate = endDate;
      renderAll();
    }, { pageId: 'dashboard' });
    // 切换标签时只渲染目标区块（已由后台预渲染的会瞬间显示）
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.analysis-tab'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        renderSection(tab.getAttribute('data-target'));
      });
    });
    initAnalysisTabs();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
