/* ================================================================
   Dlooda TKBD CRM — 看板新增区块（指令模块 B）
   B1 邀约→寄样→履约→出单 全链路漏斗
   B2 测款专区（新品全量口径，与爆品分开排）
   口径沿用现有库 / 出单转化上传结果，不另算一套。
   ================================================================ */
(function (global) {
  'use strict';

  var Data = global.DloodaData;
  var Results = global.DloodaResults;

  var CSS = [
    '.dbx-wrap{background:var(--bg-card);border:1px solid var(--border-1);border-radius:var(--r-md);padding:16px;margin-bottom:14px;}',
    '.dbx-title{font-size:13px;font-weight:700;color:var(--text-1);margin:0 0 4px;}',
    '.dbx-sub{font-size:10px;color:var(--text-3);line-height:1.6;}',
    '.dbx-funnel{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 6px;}',
    '@media(max-width:820px){.dbx-funnel{grid-template-columns:repeat(2,minmax(0,1fr));}}',
    '.dbx-stage{background:var(--bg-2);border:1px solid var(--border-1);border-radius:var(--r-sm);padding:12px;text-align:center;}',
    '.dbx-stage__name{font-size:11px;color:var(--text-2);font-weight:600;}',
    '.dbx-stage__num{font-size:24px;font-weight:700;color:var(--text-1);margin:5px 0 2px;}',
    '.dbx-stage__unit{font-size:9px;color:var(--text-3);}',
    '.dbx-rates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}',
    '@media(max-width:820px){.dbx-rates{grid-template-columns:1fr;}}',
    '.dbx-rate{border:1px dashed var(--border-2);border-radius:var(--r-sm);padding:9px 11px;font-size:11px;color:var(--text-2);}',
    '.dbx-rate b{font-size:14px;color:var(--text-1);margin-left:6px;}',
    '.dbx-rate__hint{font-size:9px;color:var(--text-3);margin-top:3px;}',
    '.dbx-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;}',
    '.dbx-table th{text-align:left;color:var(--text-3);font-weight:600;padding:7px 8px;border-bottom:1px solid var(--border-1);white-space:nowrap;}',
    '.dbx-table td{padding:8px;border-bottom:1px solid var(--border-1);color:var(--text-1);white-space:nowrap;}',
    '.dbx-tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 9px;border-radius:var(--r-full);}',
    '.dbx-tag--ok{background:var(--c-info-bg);color:var(--c-info);}',
    '.dbx-tag--wait{background:var(--bg-2);color:var(--text-3);}',
    '.dbx-empty{padding:22px;text-align:center;color:var(--text-3);font-size:11px;}'
  ].join('');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function injectCss() {
    if (document.getElementById('dbx-style')) return;
    var st = document.createElement('style');
    st.id = 'dbx-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function fmtInt(v) {
    return (v === null || v === undefined) ? '暂无数据' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function fmtPct(v) { return (v === null || v === undefined) ? '暂无数据' : (v * 100).toFixed(1) + '%'; }

  /* ---------- B1 全链路漏斗 ---------- */
  function funnelStages() {
    var s = [];
    try { s.push({ name: '邀约', value: Data.getInviteStats().total, unit: '条邀约记录' }); }
    catch (e) { s.push({ name: '邀约', value: null, unit: '暂无数据' }); }
    try { s.push({ name: '寄样', value: Data.getSampleStats().total, unit: '条寄样记录' }); }
    catch (e) { s.push({ name: '寄样', value: null, unit: '暂无数据' }); }
    try { s.push({ name: '履约', value: Data.getFulfillmentRate().fulfilled, unit: '条履约记录' }); }
    catch (e) { s.push({ name: '履约', value: null, unit: '暂无数据' }); }
    try {
      // 出单环节与出单转化一致：按出单行统计，不去重达人
      var va = Data.getVideoAnalytics();
      s.push({ name: '出单', value: va.orderedRows, unit: '条出单行（现有库）' });
    } catch (e) { s.push({ name: '出单', value: null, unit: '暂无数据' }); }
    return s;
  }

  function renderFunnel() {
    var box = document.getElementById('funnel-analysis');
    if (!box) return;
    var st = funnelStages();
    var stages = st.map(function (x) {
      return '<div class="dbx-stage"><div class="dbx-stage__name">' + esc(x.name) + '</div>'
        + '<div class="dbx-stage__num">' + esc(fmtInt(x.value)) + '</div>'
        + '<div class="dbx-stage__unit">' + esc(x.unit) + '</div></div>';
    }).join('');
    var rates = '';
    for (var i = 0; i < st.length - 1; i++) {
      var a = st[i].value, b = st[i + 1].value;
      var num = (a && b !== null && b !== undefined) ? b / a * 100 : null;
      var v = num === null ? '暂无数据' : num.toFixed(1) + '%';
      // 邀约记录与寄样记录不是同一批对象，比值会 >100%，标为参考值避免误读成漏斗转化率
      var ref = i === 0 && num !== null && num > 100;
      var hint = ref
        ? '邀约记录与寄样记录不是同一批达人，比值 >100% 属正常，仅作量级参考；看卡点请读后三段'
        : '相邻环节量之比，用于定位卡点；各环节按现有库口径，出单按出单行（不去重达人）';
      rates += '<div class="dbx-rate"' + (ref ? ' style="opacity:.72;"' : '') + '>'
        + esc(st[i].name) + ' → ' + esc(st[i + 1].name)
        + (ref ? ' 量级比（参考） ' : ' 转化率 ') + '<b>' + esc(v) + '</b>'
        + '<div class="dbx-rate__hint">' + esc(hint) + '</div></div>';
    }
    box.innerHTML = '<div class="dbx-wrap">'
      + '<h3 class="dbx-title">全链路漏斗</h3>'
      + '<div class="dbx-sub">各环节量取自现有库（邀约 / 寄样 / 履约 / 出单），出单环节口径与出单转化卡片一致（按行统计、不去重达人）。'
      + '前三段为同一寄样链路，可直接看卡点；邀约记录与寄样记录不是同一批达人，首段比值仅作量级参考。</div>'
      + '<div class="dbx-funnel">' + stages + '</div>'
      + '<div class="dbx-rates">' + rates + '</div>'
      + '</div>';
  }

  /* ---------- B2 测款专区（新品全量口径） ---------- */
  function renderTestSku() {
    var box = document.getElementById('testsku-analysis');
    if (!box) return;
    var res = Results ? Results.load() : null;
    // ⚠️ getSKUsByPositioning(2) 是拿数字去比中文定位串，永远返回空；
    //    测款 SKU 必须用 getSKUPositionTier(sku) === 2 过滤（爆品/主推不会混进来）。
    var codes = [];
    try {
      codes = (Data.getSKUs() || [])
        .filter(function (x) { return x.sku && Data.getSKUPositionTier(x.sku) === 2; })
        .map(function (x) { return x.sku; });
    } catch (e) {}
    if (!codes.length) {
      // 兜底：从上传结果里按 tier=2 过滤
      Object.keys(res ? res.bySku : {}).forEach(function (sku) {
        if (res.bySku[sku].tier === 2) codes.push(sku);
      });
    }

    var full = res ? (res.bySkuFull || {}) : {};
    // 判定基准：爆品/主推 SKU 在新品全量口径下的平均视频出单率（相对判定，不自造绝对阈值）
    var sum = 0, n = 0;
    Object.keys(full).forEach(function (sku) {
      var tier = 99;
      try { tier = Data.getSKUPositionTier(sku); } catch (e) {}
      if (tier <= 1 && full[sku].orderRate !== null && full[sku].orderRate !== undefined) {
        sum += full[sku].orderRate; n++;
      }
    });
    var bench = n ? sum / n : null;

    var rows = codes.map(function (sku) {
      var meta = (res && res.bySku && res.bySku[sku]) || {};
      var f = full[sku] || null;
      var name = meta.name || '';
      try { var d = Data.getSKUDetail(sku); if (d && d.productName) name = d.productName; } catch (e) {}
      var verdict = '—', cls = 'wait';
      if (!f) verdict = '暂无数据';
      else if (bench === null) verdict = '暂无基准';
      else if (f.orderRate !== null && f.orderRate >= bench && f.videos >= 3) { verdict = '已达标可转主推'; cls = 'ok'; }
      else verdict = '仍低效待观察';
      return '<tr><td><b>' + esc(sku) + '</b></td><td>' + esc(name || '—') + '</td>'
        + '<td>' + esc(f ? fmtInt(f.videos) : '暂无数据') + '</td>'
        + '<td>' + esc(f ? fmtInt(f.orderedVideos) : '暂无数据') + '</td>'
        + '<td>' + esc(f ? fmtPct(f.orderRate) : '暂无数据') + '</td>'
        + '<td>' + esc(f && f.vv ? fmtPct(f.clicks / f.vv) : '暂无数据') + '</td>'
        + '<td><span class="dbx-tag dbx-tag--' + cls + '">' + esc(verdict) + '</span></td></tr>';
    }).join('');

    var period = res ? (res.period.start + ' ~ ' + res.period.end) : '未上传表';
    var note = bench === null
      ? '未上传视频登记表，暂无新品全量口径数据；请在「看板 → 出单转化」上传。'
      : '判定基准 = 爆品 / 主推 SKU 同期平均视频出单率 ' + (bench * 100).toFixed(1) + '%（相对对比，不设主观绝对阈值）；需新视频数 ≥ 3 且达到基准才标「可转主推」。';
    box.innerHTML = '<div class="dbx-wrap">'
      + '<h3 class="dbx-title">测款专区 · 新品全量口径</h3>'
      + '<div class="dbx-sub">统计区间 ' + esc(period)
      + '　|　VV &lt; 50 剔除、= 50 保留；同一视频在不同窗口按行累加（不去重），与月度口径分开计算。</div>'
      + (rows ? '<table class="dbx-table"><thead><tr><th>SKU</th><th>款式名</th><th>新视频数</th><th>出单视频数</th><th>视频出单率</th><th>点击率</th><th>判定</th></tr></thead><tbody>'
          + rows + '</tbody></table>'
          : '<div class="dbx-empty">暂无测款 SKU</div>')
      + '<div class="dbx-sub" style="margin-top:10px;">' + esc(note) + '</div>'
      + '</div>';
  }

  function init() {
    injectCss();
    try { renderFunnel(); } catch (e) { console.warn('funnel', e); }
    try { renderTestSku(); } catch (e) { console.warn('testsku', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  global.DloodaDashboardExtra = { refresh: init };
})(window);
