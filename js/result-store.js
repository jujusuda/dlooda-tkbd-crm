/* ================================================================
   Dlooda TKBD CRM — 上传结果跨页共享
   ----------------------------------------------------------------
   出单转化卡片在浏览器内算完上传表后，把「汇总口径」存到本机，
   首页工作台 / 看板测款专区 / 达人页都读这一份，不另算一套、不拿现有库凑数。
   ⚠️ 只存汇总结果，不存原始表格；没传表时 load() 返回 null，指标显示「暂无数据」。
   数据始终留在本机浏览器，不上传服务器。
   ================================================================ */
(function (global) {
  'use strict';

  var KEY = 'dlooda_upload_results_v1';

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      return (d && d.totals) ? d : null;
    } catch (e) { return null; }
  }

  function save(summary) {
    try {
      if (!summary || !summary.totals) return false;
      global.localStorage.setItem(KEY, JSON.stringify(summary));
      return true;
    } catch (e) { return false; }
  }

  function clear() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
  }

  /* 环比：与出单转化卡片同格式「较上月 ↑ x%」/「较上月 ↓ x%」/「较上月 -」 */
  function delta(m) {
    if (!m || m.value === null || m.value === undefined ||
        m.prev === null || m.prev === undefined || m.prev === 0) {
      return { text: '较上月 -', cls: 'none' };
    }
    var d = (m.value - m.prev) / Math.abs(m.prev) * 100;
    if (Math.abs(d) < 0.05) return { text: '较上月 0.0%', cls: 'none' };
    return { text: '较上月 ' + (d > 0 ? '↑' : '↓') + ' ' + Math.abs(d).toFixed(1) + '%',
             cls: d > 0 ? 'up' : 'down' };
  }

  function fmt(v, kind) {
    if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return '暂无数据';
    switch (kind) {
      case 'money': return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
      case 'int':   return Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
      case 'pct':   return (v * 100).toFixed(1) + '%';
      default:      return String(v);
    }
  }

  global.DloodaResults = {
    KEY: KEY,
    load: load,
    save: save,
    clear: clear,
    delta: delta,
    fmt: fmt
  };
})(window);
