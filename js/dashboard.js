/* ================================================================
   Dlooda TKBD CRM — 数据看板 (v1)
   6大分析维度：达人画像/开发效果/产品/视频质量/ROI/复投
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var filterState = { sku: '', startDate: '', endDate: '' };

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
    var sections = ['section-persona','section-language','section-dev','section-trend','section-product','section-fulfill','section-video','section-reinvest'];
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

    // 按产品定位档位排序，同档按出单率降序
    products.sort(function (a, b) {
      var ta = Data.getSKUPositionTier(a.sku), tb = Data.getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      return b.orderRate - a.orderRate;
    });

    var html = '<div class="card" style="overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;">'
      + '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-2);">SKU</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--text-2);">寄样</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--c-info);">履约达人</th>'
      + '<th style="padding:8px 4px;text-align:center;font-weight:600;color:var(--pink-500);">出单达人</th>'
      + '<th style="padding:8px 4px;text-align:left;font-weight:600;color:var(--text-3);">出单率</th>'
      + '</tr></thead><tbody>';

    products.slice(0, 20).forEach(function (p) {
      var barColor = p.orderRate >= 50 ? 'var(--c-success)' : p.orderRate >= 25 ? 'var(--c-warning)' : 'var(--pink-400)';
      html += '<tr style="border-bottom:1px solid var(--border-1);">'
        + '<td style="padding:6px 4px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(p.sku) + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--text-2);">' + p.approved + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--c-info);">' + p.fulfilledCreators + '</td>'
        + '<td style="padding:6px 4px;text-align:center;color:var(--pink-500);font-weight:700;">' + p.orderedCreators + '</td>'
        + '<td style="padding:6px 4px;">'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<div style="flex:1;min-width:60px;height:12px;background:var(--bg-pink-soft);border-radius:6px;overflow:hidden;">'
        + '<div style="height:100%;width:' + Math.min(p.orderRate, 100) + '%;background:' + barColor + ';border-radius:6px;"></div>'
        + '</div>'
        + '<span style="font-size:11px;font-weight:700;color:' + barColor + ';min-width:34px;">' + p.orderRate + '%</span>'
        + '</div>'
        + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
  }

  // 把分布对象渲染成带占比数字的条形
  function qualityBars(title, dist) {
    var entries = Object.keys(dist || {}).map(function (k) { return [k, dist[k]]; })
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
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(analytics.orderedVideos) + '</div><div class="stat-card__label">出单视频</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-success);">' + analytics.orderRate + '%</div><div class="stat-card__label">出单率</div></div>'
      + '<div class="stat-card"><div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(analytics.uniqueCreators) + '</div><div class="stat-card__label">有视频达人</div></div>'
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

  function renderAll() {
    safeRender('persona-analysis', renderPersona);
    safeRender('language-distribution', renderLanguage);
    safeRender('dev-effect', renderDevEffect);
    safeRender('trend-analysis', renderTrend);
    safeRender('product-analysis', renderProductAnalysis);
    safeRender('fulfill-method', renderFulfillMethod);
    safeRender('video-quality', renderVideoQuality);
    safeRender('reinvest-analysis', renderReinvest);
  }

  function init() {
    // 初始化筛选栏
    App.createFilterBar('dashboard-filter-bar', function (sku, startDate, endDate) {
      filterState.sku = sku;
      filterState.startDate = startDate;
      filterState.endDate = endDate;
      renderAll();
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
