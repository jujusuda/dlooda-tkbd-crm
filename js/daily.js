/* ================================================================
   Dlooda TKBD CRM — 日报生成 (v4)
   基于当日实际完成情况：寄样/视频/开发达人/自动通过
   日报预览按当天寄样量逐条生成明细
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  // null = 今天；否则为 YYYY-MM-DD
  var currentDailyDate = null;

  function getDailyData() {
    return Data.getDailyReportData(currentDailyDate);
  }

  function shiftDate(str, delta) {
    var d = new Date(str + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- 今日工作概览 ---------- */
  function renderTodayStats() {
    var d = getDailyData();
    var container = document.getElementById('today-stats');
    if (!container) return;

    var subtitle = document.getElementById('daily-date-subtitle');
    if (subtitle) subtitle.textContent = d.date + ' 工作汇总';

    container.innerHTML = ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--pink-500);">' + d.todaySampleCount + '</div>'
      +   '<div class="stat-card__label">今日寄样</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-info);">' + d.todayVideoCount + '</div>'
      +   '<div class="stat-card__label">今日登记视频</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-warning);">' + d.todayNewCreatorCount + '</div>'
      +   '<div class="stat-card__label">今日开发达人</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-success);">' + d.todayAutoCount + '</div>'
      +   '<div class="stat-card__label">今日自动通过</div>'
      + '</div>';
  }

  /* ---------- 今日寄样SKU分布 ---------- */
  function renderTodaySKUDist() {
    var d = getDailyData();
    var container = document.getElementById('today-sku-dist');
    var section = document.getElementById('today-sku-section');
    if (!container) return;

    if (d.todaySKURanking.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    var maxCount = d.todaySKURanking[0].count || 1;
    container.innerHTML = d.todaySKURanking.map(function (s) {
      var detail = Data.getSKUDetail(s.sku) || {};
      var pct = Math.round(s.count / maxCount * 100);
      var posColor = detail.positioning && detail.positioning.indexOf('爆品') >= 0 ? 'var(--pink-500)' :
                     detail.positioning && detail.positioning.indexOf('销售') >= 0 ? 'var(--c-success)' :
                     'var(--c-info)';
      return ''
        + '<div style="margin-bottom:10px;">'
        +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
        +     '<div style="display:flex;align-items:center;gap:6px;">'
        +       '<span style="font-size:13px;font-weight:600;color:var(--text-1);">SKU ' + App.escapeHtml(s.sku) + '</span>'
        +       (detail.productName ? '<span style="font-size:11px;color:var(--text-3);">' + App.escapeHtml(detail.productName) + '</span>' : '')
        +     '</div>'
        +     '<span style="font-size:14px;font-weight:700;color:' + posColor + ';">' + s.count + ' 寄样</span>'
        +   '</div>'
        +   '<div style="height:8px;background:var(--bg-pink-soft);border-radius:4px;overflow:hidden;">'
        +     '<div style="height:100%;width:' + pct + '%;background:' + posColor + ';border-radius:4px;transition:width .6s ease;"></div>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  /* ---------- 今日寄样明细（按当天寄样量逐条生成） ---------- */
  function renderTodaySamplesList() {
    var d = getDailyData();
    var container = document.getElementById('today-samples-list');
    var section = document.getElementById('today-samples-section');
    if (!container) return;

    if (!d.todaySamplesList || d.todaySamplesList.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    container.innerHTML = d.todaySamplesList.map(function (s, i) {
      var detail = Data.getSKUDetail(s.sku) || {};
      var meta = [];
      if (s.official) meta.push(s.official);
      if (s.stars) meta.push(s.stars);
      if (s.color) meta.push(s.color);
      var orderTag = (s.orderCount && s.orderCount > 0) ? '<span class="badge badge--pink" style="margin-left:6px;">已出单</span>' : '';
      return ''
        + '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-1);">'
        +   '<span style="font-size:12px;color:var(--text-3);width:18px;flex-shrink:0;text-align:center;">' + (i + 1) + '</span>'
        +   '<div class="creator-card__avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0;">' + App.getInitials(s.creator) + '</div>'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-size:13px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(s.creator) + orderTag + '</div>'
        +     '<div style="font-size:11px;color:var(--text-3);">SKU ' + App.escapeHtml(s.sku) + (detail.productName ? ' · ' + App.escapeHtml(detail.productName) : '') + (meta.length ? ' · ' + App.escapeHtml(meta.join(' ')) : '') + '</div>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  /* ---------- 今日开发达人 ---------- */
  function renderTodayNewCreators() {
    var d = getDailyData();
    var container = document.getElementById('today-new-creators');
    var section = document.getElementById('today-new-creators-section');
    if (!container) return;

    if (d.todayNewCreators.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    container.innerHTML = d.todayNewCreators.map(function (name) {
      var creator = Data.getCreatorByName(name);
      return ''
        + '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-1);">'
        +   '<div class="creator-card__avatar" style="width:32px;height:32px;font-size:12px;">' + App.getInitials(name) + '</div>'
        +   '<div style="flex:1;">'
        +     '<div style="font-size:13px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(name) + '</div>'
        +     '<div style="font-size:11px;color:var(--text-3);">'
        +       (creator ? (creator.official || '') + ' ' + (creator.stars || '') + ' · ' + (creator.category || '—') : '新达人')
        +     '</div>'
        +   '</div>'
        +   '<span style="font-size:10px;padding:2px 8px;background:var(--c-success);color:#fff;border-radius:4px;font-weight:600;">NEW</span>'
        + '</div>';
    }).join('');
  }

  /* ---------- 整体数据对比 ---------- */
  function renderOverallStats() {
    var d = getDailyData();
    var container = document.getElementById('overall-stats');
    if (!container) return;

    container.innerHTML = ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--pink-500);">' + App.formatNumber(d.totalCreators) + '</div>'
      +   '<div class="stat-card__label">达人总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-info);">' + App.formatNumber(d.totalSamples) + '</div>'
      +   '<div class="stat-card__label">寄样总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-warning);">' + App.formatNumber(d.totalVideos) + '</div>'
      +   '<div class="stat-card__label">视频总数</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-success);">' + App.formatNumber(d.totalInvites) + '</div>'
      +   '<div class="stat-card__label">邀约总数</div>'
      + '</div>';
  }

  /* ---------- 日报文本生成 ---------- */
  function generateReportText(notes) {
    var d = getDailyData();
    var lines = [];

    lines.push('【Dlooda TKBD 日报】' + d.date);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('一、今日工作完成');
    lines.push('  - 今日寄样：' + d.todaySampleCount + ' 条');
    lines.push('  - 今日登记视频：' + d.todayVideoCount + ' 个（' + d.todayVideoCreatorCount + ' 位达人）');
    lines.push('  - 今日开发达人：' + d.todayNewCreatorCount + ' 位');
    lines.push('  - 今日自动通过：' + d.todayAutoCount + ' 位');
    lines.push('  - 今日出单：' + d.todayOrderedCount + ' 条');
    lines.push('  - 今日邀约：' + d.todayInviteCount + ' 条');
    lines.push('');

    // 今日寄样明细（按当天寄样量逐条列出）
    if (d.todaySamplesList && d.todaySamplesList.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('二、今日寄样明细（共 ' + d.todaySamplesList.length + ' 条）');
      d.todaySamplesList.forEach(function (s, i) {
        var detail = Data.getSKUDetail(s.sku) || {};
        var meta = [];
        if (s.color) meta.push(s.color);
        if (s.official) meta.push(s.official);
        if (s.orderCount && s.orderCount > 0) meta.push('已出单');
        var metaStr = meta.length ? '（' + meta.join(' · ') + '）' : '';
        lines.push('  ' + (i + 1) + '. ' + s.creator + ' — SKU ' + s.sku + (detail.productName ? ' ' + detail.productName : '') + metaStr);
      });
      lines.push('');
    }

    // 今日寄样SKU分布
    if (d.todaySKURanking.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('三、今日寄样 SKU 分布');
      d.todaySKURanking.forEach(function (s, i) {
        lines.push('  ' + (i + 1) + '. SKU ' + s.sku + ' - ' + s.count + ' 条');
      });
      lines.push('');
    }

    // 今日开发达人
    if (d.todayNewCreators.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('四、今日开发达人');
      d.todayNewCreators.forEach(function (name, i) {
        lines.push('  ' + (i + 1) + '. ' + name);
      });
      lines.push('');
    }

    // 整体数据
    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('五、整体数据');
    lines.push('  - 达人总数：' + d.totalCreators + ' 位');
    lines.push('  - 寄样总数：' + d.totalSamples + ' 条');
    lines.push('  - 视频总数：' + d.totalVideos + ' 个');
    lines.push('  - 邀约总数：' + d.totalInvites + ' 条');
    lines.push('  - 任务完成率：' + d.taskCompletionRate + '%');
    lines.push('');

    // TOP 排名
    if (d.creatorRanking.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('六、TOP 达人（按视频数）');
      d.creatorRanking.forEach(function (c, i) {
        lines.push('  ' + (i + 1) + '. ' + c.name + ' (' + (c.official || '') + ' ' + (c.stars || '') + ') - ' + c.videoCount + '个视频');
      });
      lines.push('');
    }

    if (d.skuRanking.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('七、TOP SKU（按寄样量）');
      d.skuRanking.forEach(function (s, i) {
        lines.push('  ' + (i + 1) + '. SKU ' + s.sku + ' (' + (s.positioning || '') + ') - ' + s.sampleCount + '次寄样');
      });
      lines.push('');
    }

    if (notes && notes.trim()) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('八、补充说明');
      lines.push('  ' + notes.trim());
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('— Dlooda TKBD CRM 自动生成');

    return lines.join('\n');
  }

  function renderPreview() {
    var notesInput = document.getElementById('daily-notes');
    var notes = notesInput ? notesInput.value : '';
    var text = generateReportText(notes);

    var preview = document.getElementById('daily-preview');
    if (preview) {
      preview.textContent = text;
    }
  }

  function copyReport() {
    var preview = document.getElementById('daily-preview');
    if (!preview) return;
    var text = preview.textContent;

    if (global.navigator.clipboard) {
      global.navigator.clipboard.writeText(text).then(function () {
        App.showToast('日报已复制到剪贴板');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      App.showToast('日报已复制到剪贴板');
    }
  }

  /* ---------- 日期切换 ---------- */
  function bindDateControls() {
    var dateInput = document.getElementById('daily-date-input');
    var btnToday = document.getElementById('btn-daily-today');
    var btnPrev = document.getElementById('btn-daily-prev');
    var btnNext = document.getElementById('btn-daily-next');

    function rerender() {
      renderTodayStats();
      renderTodaySKUDist();
      renderTodaySamplesList();
      renderTodayNewCreators();
      renderOverallStats();
      renderPreview();
    }

    if (dateInput) {
      if (!currentDailyDate) dateInput.value = Data.getTodayStr();
      dateInput.addEventListener('change', function () {
        currentDailyDate = dateInput.value || null;
        rerender();
      });
    }
    if (btnToday) btnToday.addEventListener('click', function () {
      currentDailyDate = null;
      if (dateInput) dateInput.value = Data.getTodayStr();
      rerender();
    });
    if (btnPrev) btnPrev.addEventListener('click', function () {
      currentDailyDate = shiftDate(currentDailyDate || Data.getTodayStr(), -1);
      if (dateInput) dateInput.value = currentDailyDate;
      rerender();
    });
    if (btnNext) btnNext.addEventListener('click', function () {
      currentDailyDate = shiftDate(currentDailyDate || Data.getTodayStr(), 1);
      if (dateInput) dateInput.value = currentDailyDate;
      rerender();
    });
  }

  function init() {
    renderTodayStats();
    renderTodaySKUDist();
    renderTodaySamplesList();
    renderTodayNewCreators();
    renderOverallStats();
    renderPreview();
    bindDateControls();

    var notesInput = document.getElementById('daily-notes');
    if (notesInput) {
      notesInput.addEventListener('input', renderPreview);
    }

    var copyBtn = document.getElementById('btn-copy-daily');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyReport);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
