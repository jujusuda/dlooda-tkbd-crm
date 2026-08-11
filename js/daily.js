/* ================================================================
   Dlooda TKBD CRM — 日报生成 (v5)
   今日工作完成 6 项支持手动覆盖（按日期 localStorage 持久化）
   补充说明改为可增删改的条目列表，自动进入日报预览
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  // null = 今天；否则为 YYYY-MM-DD
  var currentDailyDate = null;
  // 正在编辑的补充说明条目索引（-1 表示无）
  var editingNoteIndex = -1;

  var STORAGE_OVERRIDES = 'dlooda.daily.overrides'; // { 'YYYY-MM-DD': { key: n } }
  var STORAGE_NOTES = 'dlooda.daily.notes';          // { 'YYYY-MM-DD': [str, ...] }

  // 今日工作完成 6 项定义（顺序与日报预览一致）
  var STAT_DEFS = [
    { key: 'sample',     label: '今日寄样',     autoKey: 'todaySampleCount',     unit: '条' },
    { key: 'video',      label: '今日登记视频', autoKey: 'todayVideoCreatorCount', unit: '位达人', subKey: 'todayVideoCount', subUnit: '条视频', hint: 'video' },
    { key: 'newCreator', label: '今日开发达人', autoKey: 'todayNewCreatorCount', unit: '位' },
    { key: 'auto',       label: '今日自动通过', autoKey: 'todayAutoCount',       unit: '位' },
    { key: 'ordered',    label: '今日出单',     autoKey: 'todayOrderedCount',    unit: '条' },
    { key: 'invite',     label: '今日邀约达人数', autoKey: 'todayInviteReach',    unit: '人', subKey: 'todayInviteCount', subUnit: '个计划' }
  ];

  function getDailyData() {
    return Data.getDailyReportData(currentDailyDate);
  }

  function shiftDate(str, delta) {
    var d = new Date(str + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* ---------- localStorage 读写 ---------- */
  function getOverrides(dateStr) {
    var all = App.loadStorage(STORAGE_OVERRIDES, {});
    return all[dateStr] || null;
  }
  function setOverride(dateStr, key, value) {
    var all = App.loadStorage(STORAGE_OVERRIDES, {});
    if (!all[dateStr]) all[dateStr] = {};
    if (value == null || value === '' || isNaN(parseInt(value, 10))) {
      delete all[dateStr][key];
    } else {
      all[dateStr][key] = parseInt(value, 10);
    }
    if (Object.keys(all[dateStr]).length === 0) delete all[dateStr];
    App.saveStorage(STORAGE_OVERRIDES, all);
  }
  function resetOverrides(dateStr) {
    var all = App.loadStorage(STORAGE_OVERRIDES, {});
    delete all[dateStr];
    App.saveStorage(STORAGE_OVERRIDES, all);
  }

  function getNotesArr(dateStr) {
    var all = App.loadStorage(STORAGE_NOTES, {});
    return all[dateStr] || [];
  }
  function setNotesArr(dateStr, arr) {
    var all = App.loadStorage(STORAGE_NOTES, {});
    if (!arr || arr.length === 0) delete all[dateStr];
    else all[dateStr] = arr;
    App.saveStorage(STORAGE_NOTES, all);
  }

  // 计算某指标的有效展示值（手动覆盖优先，否则系统统计）
  function getStatView(def, d, overrides) {
    var autoVal = d[def.autoKey] || 0;
    var overridden = overrides && overrides[def.key] != null;
    var value = overridden ? overrides[def.key] : autoVal;
    var subText = '';
    if (def.subKey) {
      var subAuto = d[def.subKey] || 0;
      subText = overridden ? '（手动调整）' : '（' + subAuto + ' ' + def.subUnit + '）';
    }
    return { autoVal: autoVal, value: value, overridden: overridden, subText: subText };
  }

  /* ---------- 今日工作完成（可编辑） ---------- */
  function renderTodayStats() {
    var d = getDailyData();
    var container = document.getElementById('today-stats');
    if (!container) return;

    var subtitle = document.getElementById('daily-date-subtitle');
    if (subtitle) subtitle.textContent = d.date + ' 工作汇总';

    var dateStr = d.todayStr;
    var overrides = getOverrides(dateStr) || {};

    var rows = STAT_DEFS.map(function (def) {
      var v = getStatView(def, d, overrides);
      var badge = v.overridden
        ? '<span class="badge badge--pink" style="font-size:10px;margin-left:4px;">手动</span>'
        : '<span style="font-size:10px;color:var(--text-3);margin-left:4px;">自动</span>';
      // 视频统计口径说明：视频时间比登记日早 2 天（美国时区 -1 天 + 系统抓取延迟 1 天）
      var hintHtml = '';
      if (def.hint === 'video' && d.videoStatDate) {
        var anchorNote = d.todayAnchored
          ? ' <span style="color:var(--c-warning);">（数据最新日 ' + d.todayStr + '，实时今天 ' + Data.getTodayStr() + ' 暂无数据）</span>'
          : '';
        var fallbackNote = d.videoDateFallback
          ? ' <span style="color:var(--c-warning);">（' + d.videoStatDate + ' 为最新视频日期）</span>'
          : '';
        hintHtml = '<div style="font-size:10px;color:var(--text-3);margin-top:2px;">'
          + '统计「更新时间=' + d.todayStr + '」且视频时间=' + d.videoStatDate + ' 的记录（登记日 -' + (d.videoLagDays || 2) + '天）' + anchorNote + fallbackNote
          + '</div>';
      }
      return ''
        + '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border-1);">'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-size:13px;font-weight:600;color:var(--text-1);">' + def.label + badge + '</div>'
        +     hintHtml
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-3);width:72px;text-align:right;">系统 ' + v.autoVal + '</div>'
        +   '<input type="number" min="0" step="1" data-stat="' + def.key + '" value="' + v.value + '" style="width:70px;text-align:center;padding:6px 4px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;font-weight:600;color:var(--text-1);background:#fff;">'
        +   '<span style="font-size:11px;color:var(--text-3);width:28px;">' + def.unit + '</span>'
        +   (def.subKey ? '<span style="font-size:11px;color:var(--c-info);width:104px;">' + v.subText + '</span>' : '<span style="width:104px;"></span>')
        + '</div>';
    }).join('');

    container.innerHTML = rows;

    Array.prototype.forEach.call(container.querySelectorAll('input[data-stat]'), function (inp) {
      inp.addEventListener('change', function () {
        var key = inp.getAttribute('data-stat');
        setOverride(dateStr, key, inp.value);
        renderTodayStats();
        renderPreview();
      });
    });
  }

  /* ---------- 补充说明条目列表（增删改） ---------- */
  function renderNotesList() {
    var d = getDailyData();
    var dateStr = d.todayStr;
    var notes = getNotesArr(dateStr);
    var container = document.getElementById('daily-notes-list');
    if (!container) return;

    if (notes.length === 0) {
      container.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:6px 0;">暂无补充说明，在上方输入并点「添加」</div>';
      return;
    }

    container.innerHTML = notes.map(function (n, i) {
      if (i === editingNoteIndex) {
        return ''
          + '<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-1);">'
          +   '<input type="text" id="note-edit-input" value="' + App.escapeHtml(n) + '" style="flex:1;padding:6px 8px;border:1px solid var(--pink-500);border-radius:6px;font-size:13px;color:var(--text-1);">'
          +   '<button class="filter-btn" data-act="save-note" data-idx="' + i + '">保存</button>'
          +   '<button class="filter-btn" data-act="cancel-note">取消</button>'
          + '</div>';
      }
      return ''
        + '<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-1);">'
        +   '<span style="flex:1;font-size:13px;color:var(--text-1);">' + App.escapeHtml(n) + '</span>'
        +   '<button class="filter-btn" data-act="edit-note" data-idx="' + i + '">编辑</button>'
        +   '<button class="filter-btn" data-act="del-note" data-idx="' + i + '">删除</button>'
        + '</div>';
    }).join('');

    Array.prototype.forEach.call(container.querySelectorAll('[data-act]'), function (btn) {
      var act = btn.getAttribute('data-act');
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (act === 'edit-note') {
        btn.addEventListener('click', function () {
          editingNoteIndex = idx;
          renderNotesList();
          var inp = document.getElementById('note-edit-input');
          if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        });
      } else if (act === 'del-note') {
        btn.addEventListener('click', function () {
          var arr = getNotesArr(dateStr);
          arr.splice(idx, 1);
          setNotesArr(dateStr, arr);
          renderNotesList();
          renderPreview();
          App.showToast('已删除补充说明');
        });
      } else if (act === 'save-note') {
        btn.addEventListener('click', function () { commitNoteEdit(dateStr, idx); });
      } else if (act === 'cancel-note') {
        btn.addEventListener('click', function () {
          editingNoteIndex = -1;
          renderNotesList();
        });
      }
    });

    var editInp = document.getElementById('note-edit-input');
    if (editInp) {
      editInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitNoteEdit(dateStr, editingNoteIndex); }
        else if (e.key === 'Escape') { editingNoteIndex = -1; renderNotesList(); }
      });
    }
  }

  function commitNoteEdit(dateStr, idx) {
    var inp = document.getElementById('note-edit-input');
    var val = inp ? inp.value.trim() : '';
    if (!val) { App.showToast('内容不能为空'); return; }
    var arr = getNotesArr(dateStr);
    if (idx >= 0 && idx < arr.length) arr[idx] = val;
    setNotesArr(dateStr, arr);
    editingNoteIndex = -1;
    renderNotesList();
    renderPreview();
    App.showToast('已保存');
  }

  function addNote() {
    var d = getDailyData();
    var dateStr = d.todayStr;
    var inp = document.getElementById('daily-note-input');
    if (!inp) return;
    var val = inp.value.trim();
    if (!val) { App.showToast('请输入补充说明内容'); return; }
    var arr = getNotesArr(dateStr);
    arr.push(val);
    setNotesArr(dateStr, arr);
    inp.value = '';
    renderNotesList();
    renderPreview();
    App.showToast('已添加');
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
  function generateReportText() {
    var d = getDailyData();
    var dateStr = d.todayStr;
    var overrides = getOverrides(dateStr) || {};
    var lines = [];

    // 动态章节编号：插入/删除章节时序号自动连续，不用手工改
    var CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    var secIdx = 0;
    function section(title) {
      lines.push('━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push((CN_NUM[secIdx++] || (secIdx)) + '、' + title);
    }

    lines.push('【Dlooda TKBD 日报】' + d.date);
    lines.push('');
    section('今日工作完成');
    STAT_DEFS.forEach(function (def) {
      var v = getStatView(def, d, overrides);
      var line = '  - ' + def.label + '：' + v.value + ' ' + def.unit;
      if (def.subKey) line += v.subText;
      lines.push(line);
    });
    lines.push('');

    // 今日寄样明细（按当天寄样量逐条列出）
    if (d.todaySamplesList && d.todaySamplesList.length > 0) {
      section('今日寄样明细（共 ' + d.todaySamplesList.length + ' 条）');
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

    // 今日登记视频明细（视频时间 = 登记日 -2 天）
    if (d.todayVideosList && d.todayVideosList.length > 0) {
      section('今日登记视频（共 ' + d.todayVideoCreatorCount + ' 位达人 · ' + d.todayVideosList.length + ' 条视频 · 视频时间 ' + d.videoStatDate + '）');
      d.todayVideosList.forEach(function (v, i) {
        var detail = Data.getSKUDetail(v.sku) || {};
        lines.push('  ' + (i + 1) + '. ' + v.creator + ' — SKU ' + v.sku + (detail.productName ? ' ' + detail.productName : ''));
      });
      lines.push('');
    }

    // 今日寄样SKU分布
    if (d.todaySKURanking.length > 0) {
      section('今日寄样 SKU 分布');
      d.todaySKURanking.forEach(function (s, i) {
        lines.push('  ' + (i + 1) + '. SKU ' + s.sku + ' - ' + s.count + ' 条');
      });
      lines.push('');
    }

    // 今日开发达人
    if (d.todayNewCreators.length > 0) {
      section('今日开发达人');
      d.todayNewCreators.forEach(function (name, i) {
        lines.push('  ' + (i + 1) + '. ' + name);
      });
      lines.push('');
    }

    // 整体数据
    section('整体数据');
    lines.push('  - 达人总数：' + d.totalCreators + ' 位');
    lines.push('  - 寄样总数：' + d.totalSamples + ' 条');
    lines.push('  - 视频总数：' + d.totalVideos + ' 个');
    lines.push('  - 邀约总数：' + d.totalInvites + ' 条');
    lines.push('  - 任务完成率：' + d.taskCompletionRate + '%');
    lines.push('');

    // TOP 排名
    if (d.creatorRanking.length > 0) {
      section('TOP 达人（按视频数）');
      d.creatorRanking.forEach(function (c, i) {
        lines.push('  ' + (i + 1) + '. ' + c.name + ' (' + (c.official || '') + ' ' + (c.stars || '') + ') - ' + c.videoCount + '个视频');
      });
      lines.push('');
    }

    if (d.skuRanking.length > 0) {
      section('TOP SKU（按寄样量）');
      d.skuRanking.forEach(function (s, i) {
        lines.push('  ' + (i + 1) + '. SKU ' + s.sku + ' (' + (s.positioning || '') + ') - ' + s.sampleCount + '次寄样');
      });
      lines.push('');
    }

    // 补充说明（条目列表）
    var notes = getNotesArr(dateStr);
    if (notes && notes.length > 0) {
      section('补充说明');
      notes.forEach(function (n, i) {
        lines.push('  ' + (i + 1) + '. ' + n);
      });
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('— Dlooda TKBD CRM 自动生成');

    return lines.join('\n');
  }

  function renderPreview() {
    var text = generateReportText();
    var preview = document.getElementById('daily-preview');
    if (preview) preview.textContent = text;
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
    var btnReset = document.getElementById('btn-reset-stats');
    var btnAddNote = document.getElementById('btn-add-note');
    var noteInput = document.getElementById('daily-note-input');

    function rerender() {
      editingNoteIndex = -1;
      renderTodayStats();
      renderTodaySKUDist();
      renderTodaySamplesList();
      renderTodayNewCreators();
      renderOverallStats();
      renderNotesList();
      renderPreview();
    }

    if (dateInput) {
      dateInput.max = Data.getTodayStr();
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
      // 不能选今天以后：若已在今天（或之后），不再后翻
      var base = currentDailyDate || Data.getTodayStr();
      if (base >= Data.getTodayStr()) return;
      currentDailyDate = shiftDate(base, 1);
      if (dateInput) dateInput.value = currentDailyDate;
      rerender();
    });
    if (btnReset) btnReset.addEventListener('click', function () {
      var ds = getDailyData().todayStr;
      resetOverrides(ds);
      renderTodayStats();
      renderPreview();
      App.showToast('已重置为系统统计');
    });
    if (btnAddNote) btnAddNote.addEventListener('click', addNote);
    if (noteInput) {
      noteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addNote(); }
      });
    }
  }

  function init() {
    renderTodayStats();
    renderTodaySKUDist();
    renderTodaySamplesList();
    renderTodayNewCreators();
    renderOverallStats();
    renderNotesList();
    renderPreview();
    bindDateControls();

    var copyBtn = document.getElementById('btn-copy-daily');
    if (copyBtn) copyBtn.addEventListener('click', copyReport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
