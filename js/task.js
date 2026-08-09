/* ================================================================
   Dlooda TKBD CRM — 寄样任务 (v1)
   按月分组 · 优先级排序 · 产品定位 · 实际完成量
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var monthNames = {
    '01': '一月', '02': '二月', '03': '三月', '04': '四月',
    '05': '五月', '06': '六月', '07': '七月', '08': '八月',
    '09': '九月', '10': '十月', '11': '十一月', '12': '十二月'
  };

  function render() {
    var container = document.getElementById('task-list');
    if (!container) return;

    var months = Data.getTasksByMonth();
    if (months.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">暂无寄样任务</div></div>';
      return;
    }

    var html = '';
    var now = new Date();
    var currentMonth = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);

    months.forEach(function (monthData, monthIdx) {
      var month = monthData.month;
      var tasks = monthData.tasks;
      var isCurrentMonth = month === currentMonth;
      var monthLabel = monthNames[month.substring(5, 7)] || month.substring(5, 7);

      // 月份标题
      html += ''
        + '<div class="section' + (monthIdx > 0 ? ' task-month-divider' : '') + '">'
        +   '<div class="section__header">'
        +     '<h2 class="section__title">' + month.substring(0, 4) + '年' + monthLabel + '寄样任务</h2>'
        +     (isCurrentMonth ? '<span class="badge badge--pink">本月</span>' : '')
        +     '<span class="section__hint">' + tasks.length + ' 个任务</span>'
        +   '</div>'
        +   '<div class="card" style="overflow-x:auto;">'
        +     '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
        +       '<thead><tr style="border-bottom:2px solid var(--pink-100);">'
        +         '<th style="padding:10px 8px;text-align:left;font-weight:600;color:var(--text-3);">优先级</th>'
        +         '<th style="padding:10px 8px;text-align:left;font-weight:600;color:var(--text-3);">SKU</th>'
        +         '<th style="padding:10px 8px;text-align:left;font-weight:600;color:var(--text-3);">定位</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">要求量</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">已完成</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--pink-500);">今日已完成</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">剩余平均寄样量</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">通过率</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">差距</th>'
        +         '<th style="padding:10px 8px;text-align:center;font-weight:600;color:var(--text-3);">进度</th>'
        +       '</tr></thead><tbody>';

      // 按产品定位排序：爆品 → 销售 → 测品 → 撤退；同档位内按优先级 P0→P1→P2
      var priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
      var sortedTasks = tasks.slice().sort(function (a, b) {
        var ta = Data.getSKUPositionTier ? Data.getSKUPositionTier(a.sku) : 99;
        var tb = Data.getSKUPositionTier ? Data.getSKUPositionTier(b.sku) : 99;
        if (ta !== tb) return ta - tb;
        var pa = priorityOrder[a.priority] != null ? priorityOrder[a.priority] : 99;
        var pb = priorityOrder[b.priority] != null ? priorityOrder[b.priority] : 99;
        if (pa !== pb) return pa - pb;
        return String(a.sku).localeCompare(String(b.sku));
      });

      // 该产品/该月的通过率（寄样量 ÷ 邀约条数）
      var monthStart = month + '-01';
      var monthEnd = month + '-' + new Date(parseInt(month.substring(0,4),10), parseInt(month.substring(5,7),10), 0).getDate();
      var passRateMap = {};
      try {
        Data.getInvitePassRate(monthStart, monthEnd).forEach(function (r) {
          passRateMap[r.sku] = r;
        });
      } catch (e) {}

      sortedTasks.forEach(function (t, i) {
        var actualSamples = Data.getTaskActualSamples(t.sku, month);
        // 已完成：飞书填写值优先，否则取实际寄样数据（寄样数据即已完成）
        var completed = (t.completed && t.completed > 0) ? t.completed : actualSamples;
        var gap = (t.target || 0) - completed;
        var gapPct = t.target > 0 ? Math.round(completed / t.target * 100) : 0;
        var gapColor = gap > 0 ? (gapPct < 30 ? 'var(--c-danger)' : gapPct < 60 ? 'var(--c-warning)' : 'var(--pink-500)') : 'var(--c-success)';
        var gapText = gap > 0 ? '-' + gap : '✓';
        // 剩余平均寄样量 = (要求量 - 已完成) ÷ 本月剩余工作日天数（剔除周末）
        var workdaysLeft = Data.getRemainingWorkdays(month);
        var remaining = Math.max(0, (t.target || 0) - completed);
        var avgDaily = workdaysLeft > 0 ? (remaining / workdaysLeft) : null;
        var priorityBg = t.priority === 'P0' ? 'var(--c-danger)' : t.priority === 'P1' ? 'var(--c-warning)' : 'var(--c-info)';
        var posColor = t.positioning === '爆品' ? 'var(--pink-500)' :
                       t.positioning === '销售' ? 'var(--c-success)' :
                       t.positioning === '测品' ? 'var(--c-info)' :
                       t.positioning === '撤退' ? 'var(--text-3)' : 'var(--border-2)';
        var isUrgent = gap > 0 && (t.priority === 'P0' || t.priority === 'P1');
        var rowHighlight = isUrgent ? 'background:var(--bg-pink-soft);' : '';

        html += ''
          + '<tr style="border-bottom:1px solid var(--border-1);' + rowHighlight + '">'
          +   '<td style="padding:10px 8px;"><span style="font-size:10px;padding:3px 8px;background:' + priorityBg + ';color:#fff;border-radius:4px;font-weight:700;">' + App.escapeHtml(t.priority || '—') + '</span></td>'
          +   '<td style="padding:10px 8px;">'
          +     '<div style="font-weight:700;color:var(--text-1);">SKU ' + App.escapeHtml(t.sku) + '</div>'
          +     (t.productName ? '<div style="font-size:11px;color:var(--text-3);">' + App.escapeHtml(t.productName) + '</div>' : '')
          +   '</td>'
          +   '<td style="padding:10px 8px;">' + (t.positioning ? '<span style="font-size:10px;padding:2px 6px;background:' + posColor + ';color:#fff;border-radius:3px;font-weight:600;">' + App.escapeHtml(t.positioning) + '</span>' : '—') + '</td>'
          +   '<td style="padding:10px 8px;text-align:center;color:var(--text-2);font-weight:600;">' + (t.target || 0) + '</td>'
          +   '<td style="padding:10px 8px;text-align:center;color:var(--text-2);font-weight:600;">' + completed + '</td>'
          +   (function () {
                var todayDone = Data.getTaskTodaySamples(t.sku);
                var todayColor = todayDone > 0 ? 'var(--pink-500)' : 'var(--text-3)';
                return '<td style="padding:10px 8px;text-align:center;font-weight:700;color:' + todayColor + ';" title="今日(含前1天)该 SKU 已寄样条数">' + todayDone + '</td>';
              })()
          +   (function () {
                var txt;
                if (remaining <= 0) txt = '✓';
                else if (avgDaily == null) txt = '—';
                else txt = avgDaily.toFixed(1);
                var avgColor = remaining <= 0 ? 'var(--c-success)'
                  : (avgDaily != null && avgDaily >= 6) ? 'var(--c-danger)'
                  : (avgDaily != null && avgDaily >= 3) ? 'var(--c-warning)'
                  : 'var(--c-info)';
                return '<td style="padding:10px 8px;text-align:center;color:' + avgColor + ';font-weight:600;" title="剩余 ' + remaining + ' 件 ÷ 剩余 ' + workdaysLeft + ' 个工作日 = ' + (avgDaily != null ? avgDaily.toFixed(1) : '—') + ' 件/天">' + txt + '</td>';
              })()
          +   (function () {
              var pr = passRateMap[t.sku];
              var rate = pr && pr.passRate != null ? pr.passRate : null;
              var rateColor = rate == null ? 'var(--text-3)' : rate >= 80 ? 'var(--c-success)' : rate >= 50 ? 'var(--c-warning)' : 'var(--c-danger)';
              var rateText = rate == null ? '—' : rate + '%';
              return '<td style="padding:10px 8px;text-align:center;font-weight:700;color:' + rateColor + ';">' + rateText + '</td>';
            })()
          +   '<td style="padding:10px 8px;text-align:center;font-weight:700;color:' + gapColor + ';">' + gapText + '</td>'
          +   '<td style="padding:10px 8px;text-align:center;">'
          +     '<div style="display:flex;align-items:center;gap:4px;justify-content:center;">'
          +       '<div style="width:50px;height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
          +         '<div style="height:100%;width:' + Math.min(gapPct, 100) + '%;background:' + gapColor + ';border-radius:4px;transition:width .6s ease;"></div>'
          +       '</div>'
          +       '<span style="font-size:11px;font-weight:600;color:' + gapColor + ';min-width:32px;">' + gapPct + '%</span>'
          +     '</div>'
          +   '</td>'
          + '</tr>';
      });

      html += '</tbody></table></div></div>';
    });

    container.innerHTML = html;
  }

  function init() {
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
