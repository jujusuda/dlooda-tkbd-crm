/* ================================================================
   Dlooda TKBD CRM — 履约追踪 (tracking.js)
   规则（2026-10-23 用户确认）：
     · 执行窗口：每月 25–30 号之间的工作日
     · 目标：寄样时间在「上月 15 号」~「本月 15 号」之间
     · 未履约 = 更新时间为空 且 履约方式为空
     · 不分级；状态回填飞书「履约方式」字段
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Store = global.DloodaStore;
  var Matcher = global.DloodaMatcher;
  var Reminder = global.DloodaReminder;

  /* 履约状态选项 —— 取自飞书「履约方式」字段现有取值 */
  var STATUS_OPTIONS = [
    '已催', '已发邮件', '已私信', '待发邮件',
    '视频', '直播', '未履约', '已取消'
  ];

  var currentSku = '';
  var currentStatus = '';

  /* ---------- 窗口状态卡 ---------- */

  function renderContext(ctx) {
    var box = document.getElementById('urge-context');
    if (!box) return;

    var s = ctx.settings;
    var badgeCls = ctx.inWindow ? 'badge--green' : 'badge--sand';
    var badgeTxt = ctx.inWindow ? '催办窗口进行中' : '尚未进入催办窗口';

    var tip = ctx.inWindow
      ? '今天是执行日，处理下方未履约达人即可。'
      : ('下一个执行日：' + nextWindowStart(ctx) + '（每月 ' + s.urgeWindowStart + '–' + s.urgeWindowEnd + ' 号之间的工作日）');

    box.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;'
      +   'gap:12px;flex-wrap:wrap;margin-bottom:8px;">'
      +   '<div style="font-size:15px;font-weight:600;color:var(--text-1);">'
      +     '履约催办 · ' + App.escapeHtml(ctx.todayCN) + '</div>'
      +   '<span class="badge ' + badgeCls + '">' + badgeTxt + '</span>'
      + '</div>'
      + '<div style="font-size:13px;color:var(--text-2);line-height:1.7;">'
      +   '寄样时间窗：<b style="color:var(--pink-600);">' + App.escapeHtml(ctx.fromStr)
      +   ' ~ ' + App.escapeHtml(ctx.toStr) + '</b><br>'
      +   '判定条件：更新时间为空 且 履约方式为空<br>'
      +   '<span style="color:var(--text-3);">' + App.escapeHtml(tip) + '</span>'
      + '</div>';
  }

  function nextWindowStart(ctx) {
    var s = ctx.settings;
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    for (var d = s.urgeWindowStart; d <= s.urgeWindowEnd; d++) {
      var ds = y + '-' + pad(m + 1) + '-' + pad(d);
      if (ds >= ctx.today && Store.isWorkday(ds)) return ds;
    }
    // 本月已过完窗口 → 下月
    var nm = m + 1, ny = y + (nm > 11 ? 1 : 0); nm = nm % 12;
    for (var d2 = s.urgeWindowStart; d2 <= s.urgeWindowEnd; d2++) {
      var ds2 = ny + '-' + pad(nm + 1) + '-' + pad(d2);
      if (Store.isWorkday(ds2)) return ds2;
    }
    return '—';
  }

  function pad(n) { return (n < 10 ? '0' + n : '' + n); }

  /* ---------- 统计 ---------- */

  function renderStats(list) {
    var box = document.getElementById('urge-stats');
    if (!box) return;

    var pending = list.filter(function (x) { return !x.status; });
    var done = list.filter(function (x) { return !!x.status; });
    var waited = list.filter(function (x) { return (x.waitedDays || 0) >= 30; });
    var maxWait = list.reduce(function (m, x) { return Math.max(m, x.waitedDays || 0); }, 0);

    box.innerHTML = ''
      + statCard(pending.length, '待催办', 'var(--c-danger)')
      + statCard(done.length, '已处理', 'var(--c-success)')
      + statCard(waited.length, '等待超30天', 'var(--c-warning)')
      + statCard(maxWait + '天', '最久等待', 'var(--text-2)');
  }

  function statCard(value, label, color) {
    return ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:' + color + ';">' + value + '</div>'
      +   '<div class="stat-card__label">' + label + '</div>'
      + '</div>';
  }

  /* ---------- 表格 ---------- */

  function currentRows() {
    var res = Reminder.getUrgeList();
    return res.list;
  }

  function filteredRows() {
    var rows = currentRows();
    return rows.filter(function (r) {
      if (currentSku && String(r.sku || '') !== currentSku) return false;
      if (currentStatus === '__pending') return !r.status;
      if (currentStatus && r.status !== currentStatus) return false;
      return true;
    });
  }

  function renderTable() {
    var tbody = document.getElementById('urge-tbody');
    if (!tbody) return;
    var rows = filteredRows();

    var hint = document.getElementById('urge-shown');

    if (!rows.length) {
      tbody.innerHTML = ''
        + '<tr><td colspan="7">'
        +   '<div class="empty-state" style="padding:32px 16px;">'
        +     '<div class="empty-state__icon">(´･ω･`)</div>'
        +     '<div class="empty-state__text">这个窗口没有待催达人</div>'
        +   '</div>'
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      var waited = r.waitedDays || 0;
      var waitColor = waited >= 30 ? 'var(--c-danger)'
        : waited >= 21 ? 'var(--c-warning)' : 'var(--text-2)';

      var statusCell = r.status
        ? '<span class="badge badge--pink">' + App.escapeHtml(r.status) + '</span>'
        : '<span class="badge badge--gray">未处理</span>';

      var options = '<option value="">未处理</option>'
        + STATUS_OPTIONS.map(function (s) {
            return '<option value="' + App.escapeHtml(s) + '"'
              + (r.status === s ? ' selected' : '') + '>' + App.escapeHtml(s) + '</option>';
          }).join('');

      var c = r.creator;
      var profile = c
        ? [c.official, c.stars, (c.creatorType || []).join('·')].filter(Boolean).join(' · ')
        : '';

      return ''
        + '<tr>'
        +   '<td>'
        +     '<span style="font-weight:600;color:var(--text-1);">'
        +       App.escapeHtml(r.creator) + '</span>'
        +     (profile ? '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">'
        +       App.escapeHtml(profile) + '</div>' : '')
        +   '</td>'
        +   '<td><span class="sku-tag">' + App.escapeHtml(r.sku || '—') + '</span></td>'
        +   '<td>' + App.escapeHtml(r.color || '—') + '</td>'
        +   '<td><span style="font-size:12px;color:var(--text-2);">'
        +     App.escapeHtml(r.sampleTime || '—') + '</span></td>'
        +   '<td style="text-align:right;"><b style="color:' + waitColor + ';">'
        +     waited + '</b> 天</td>'
        +   '<td>' + statusCell + '</td>'
        +   '<td style="text-align:center;white-space:nowrap;">'
        +     '<select class="select" data-rid="' + App.escapeHtml(r.rid || '') + '"'
        +       ' style="min-width:96px;padding:4px 6px;font-size:12px;">' + options + '</select>'
        +     '<button class="btn btn--secondary btn--sm" data-sync="' + App.escapeHtml(r.rid || '') + '"'
        +       ' style="margin-left:6px;font-size:11px;padding:3px 8px;">回填</button>'
        +   '</td>'
        + '</tr>';
    }).join('');

    bindTable();
  }

  function bindTable() {
    var tbody = document.getElementById('urge-tbody');
    if (!tbody) return;

    tbody.querySelectorAll('[data-rid]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var rid = sel.getAttribute('data-rid');
        var val = sel.value;
        if (!rid) return;
        if (!val) { Store.clearTrackingStatus(rid); App.showToast('已重置为未处理'); }
        else { Store.setTrackingStatus(rid, val); App.showToast('本地已标记：' + val); }
        renderStats(currentRows());
      });
    });

    tbody.querySelectorAll('[data-sync]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rid = btn.getAttribute('data-rid') || btn.getAttribute('data-sync');
        var sel = tbody.querySelector('select[data-rid="' + rid + '"]');
        var val = sel ? sel.value : '';
        if (!val) { App.showToast('请先选择状态'); return; }
        Store.setTrackingStatus(rid, val);
        btn.disabled = true;
        var old = btn.textContent;
        btn.textContent = '同步中';
        App.pushToFeishu('daily', rid, { '履约方式': [val] }).then(function (ok) {
          btn.textContent = ok ? '已同步' : '失败';
          setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 1200);
        });
      });
    });
  }

  /* ---------- 导出 ---------- */

  function exportUrge() {
    var rows = currentRows();
    if (!rows.length) { App.showToast('没有待催达人'); return; }
    var head = ['达人handle', 'SKU', '颜色', '寄样时间', '已等待天数', '履约状态'];
    var lines = [head.join(',')];
    rows.forEach(function (r) {
      lines.push([
        r.creator, r.sku || '', r.color || '', r.sampleTime || '',
        r.waitedDays || 0, r.status || '未处理'
      ].map(function (v) {
        var s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Dlooda_催办名单_' + Store.todayStr() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    App.showToast('催办名单已导出');
  }

  /* ---------- 初始化 ---------- */

  function init() {
    var res = Reminder.getUrgeList();
    renderContext(res.ctx);
    renderStats(res.list);
    renderTable();

    var fsku = document.getElementById('urge-filter-sku');
    if (fsku) {
      var skus = Data ? Data.getAvailableSKUs() : [];
      fsku.innerHTML = '<option value="">全部 SKU</option>'
        + skus.map(function (s) {
            return '<option value="' + App.escapeHtml(s) + '">' + App.escapeHtml(s) + '</option>';
          }).join('');
      fsku.addEventListener('change', function () { currentSku = fsku.value; renderTable(); });
    }

    var fst = document.getElementById('urge-filter-status');
    if (fst) {
      fst.addEventListener('change', function () { currentStatus = fst.value; renderTable(); });
    }

    var be = document.getElementById('btn-export-urge');
    if (be) be.addEventListener('click', exportUrge);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
