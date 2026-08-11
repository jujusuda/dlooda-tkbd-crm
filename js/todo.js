/* ================================================================
   Dlooda TKBD CRM — 任务清单 (v1)
   每日固定任务 + 自定义任务 · 打勾完成 · 日期筛选
   数据存储在 localStorage
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  var FIXED_TASKS = [
    { id: 'f1', name: '创建自动邀请模板', icon: '📝' },
    { id: 'f2', name: '跑达人', icon: '🏃' },
    { id: 'f3', name: '复投', icon: '🔄' },
    { id: 'f4', name: '发送自动邀请', icon: '📤' },
    { id: 'f5', name: '审核寄样达人', icon: '✅' },
    { id: 'f6', name: '登记每天寄样', icon: '📦' },
    { id: 'f7', name: '登记每日视频', icon: '🎬' },
  ];

  var STORAGE_KEY = 'dlooda_todo_data';
  var currentDate = '';

  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function loadData() {
    try {
      return JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function saveData(data) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getDayData(dateStr) {
    var data = loadData();
    if (!data[dateStr]) {
      data[dateStr] = { fixed: {}, custom: [] };
      saveData(data);
    }
    return data[dateStr];
  }

  function setDayData(dateStr, dayData) {
    var data = loadData();
    data[dateStr] = dayData;
    saveData(data);
  }

  /* ---------- 渲染进度概览 ---------- */
  function renderProgress() {
    var container = document.getElementById('todo-progress');
    if (!container) return;
    var dayData = getDayData(currentDate);
    var fixedDone = FIXED_TASKS.filter(function (t) { return dayData.fixed[t.id]; }).length;
    var customDone = dayData.custom.filter(function (t) { return t.done; }).length;
    var totalTasks = FIXED_TASKS.length + dayData.custom.length;
    var totalDone = fixedDone + customDone;
    var pct = totalTasks > 0 ? Math.round(totalDone / totalTasks * 100) : 0;

    container.innerHTML = ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-success);">' + totalDone + '/' + totalTasks + '</div>'
      +   '<div class="stat-card__label">已完成任务</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--pink-500);">' + fixedDone + '/' + FIXED_TASKS.length + '</div>'
      +   '<div class="stat-card__label">固定任务</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-info);">' + customDone + '/' + dayData.custom.length + '</div>'
      +   '<div class="stat-card__label">自定义任务</div>'
      + '</div>'
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:var(--c-warning);">' + pct + '%</div>'
      +   '<div class="stat-card__label">完成率</div>'
      + '</div>';
  }

  /* ---------- 渲染固定任务 ---------- */
  function renderFixedTasks() {
    var container = document.getElementById('fixed-tasks');
    if (!container) return;
    var dayData = getDayData(currentDate);

    container.innerHTML = FIXED_TASKS.map(function (t) {
      var done = !!dayData.fixed[t.id];
      return ''
        + '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-1);">'
        +   '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;">'
        +     '<input type="checkbox" data-fixed-id="' + t.id + '" ' + (done ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--pink-500);cursor:pointer;">'
        +     '<span style="font-size:18px;">' + t.icon + '</span>'
        +     '<span style="font-size:14px;font-weight:' + (done ? '400' : '600') + ';color:' + (done ? 'var(--text-3)' : 'var(--text-1)') + ';text-decoration:' + (done ? 'line-through' : 'none') + ';">' + App.escapeHtml(t.name) + '</span>'
        +   '</label>'
        +   (done ? '<span style="font-size:11px;padding:2px 8px;background:var(--c-success);color:#fff;border-radius:4px;font-weight:600;">完成</span>' : '<span style="font-size:11px;padding:2px 8px;background:var(--bg-pink-soft);color:var(--text-3);border-radius:4px;">待完成</span>')
        + '</div>';
    }).join('');

    container.querySelectorAll('[data-fixed-id]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var id = cb.getAttribute('data-fixed-id');
        var dd = getDayData(currentDate);
        dd.fixed[id] = cb.checked;
        setDayData(currentDate, dd);
        renderFixedTasks();
        renderProgress();
        if (cb.checked) App.showToast('任务完成！');
      });
    });
  }

  /* ---------- 渲染自定义任务 ---------- */
  function renderCustomTasks() {
    var container = document.getElementById('custom-tasks');
    if (!container) return;
    var dayData = getDayData(currentDate);

    if (dayData.custom.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">还没有自定义任务，点击「新增任务」添加</div>';
      return;
    }

    container.innerHTML = dayData.custom.map(function (t, i) {
      return ''
        + '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-1);">'
        +   '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;">'
        +     '<input type="checkbox" data-custom-idx="' + i + '" ' + (t.done ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--pink-500);cursor:pointer;">'
        +     '<span style="font-size:14px;font-weight:' + (t.done ? '400' : '600') + ';color:' + (t.done ? 'var(--text-3)' : 'var(--text-1)') + ';text-decoration:' + (t.done ? 'line-through' : 'none') + ';">' + App.escapeHtml(t.name) + '</span>'
        +   '</label>'
        +   '<button class="btn btn--ghost btn--sm" data-del-idx="' + i + '" style="font-size:11px;padding:2px 8px;color:var(--c-danger);">删除</button>'
        + '</div>';
    }).join('');

    container.querySelectorAll('[data-custom-idx]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var idx = parseInt(cb.getAttribute('data-custom-idx'), 10);
        var dd = getDayData(currentDate);
        dd.custom[idx].done = cb.checked;
        setDayData(currentDate, dd);
        renderCustomTasks();
        renderProgress();
        if (cb.checked) App.showToast('任务完成！');
      });
    });

    container.querySelectorAll('[data-del-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-del-idx'), 10);
        var dd = getDayData(currentDate);
        dd.custom.splice(idx, 1);
        setDayData(currentDate, dd);
        renderCustomTasks();
        renderProgress();
        App.showToast('任务已删除');
      });
    });
  }

  /* ---------- 日期更新 ---------- */
  function setDate(dateStr) {
    currentDate = dateStr;
    var dateInput = document.getElementById('todo-date-input');
    if (dateInput) dateInput.value = dateStr;

    var label = document.getElementById('todo-date-label');
    var today = getTodayStr();
    if (dateStr === today) {
      if (label) label.textContent = '今日任务';
    } else {
      if (label) label.textContent = dateStr + ' 任务';
    }

    // 确保有当天数据
    getDayData(dateStr);
    renderProgress();
    renderFixedTasks();
    renderCustomTasks();
  }

  function shiftDate(days) {
    var d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    setDate(y + '-' + m + '-' + day);
  }

  /* ---------- 新增任务弹窗 ---------- */
  function openAddTaskModal() {
    var modal = document.getElementById('add-task-modal');
    if (modal) modal.style.display = 'flex';
    var input = document.getElementById('new-task-name');
    if (input) {
      input.value = '';
      setTimeout(function () { input.focus(); }, 100);
    }
  }

  function closeAddTaskModal() {
    var modal = document.getElementById('add-task-modal');
    if (modal) modal.style.display = 'none';
  }

  function saveNewTask() {
    var input = document.getElementById('new-task-name');
    if (!input || !input.value.trim()) {
      App.showToast('请输入任务名称');
      return;
    }
    var dd = getDayData(currentDate);
    dd.custom.push({ name: input.value.trim(), done: false });
    setDayData(currentDate, dd);
    closeAddTaskModal();
    renderCustomTasks();
    renderProgress();
    App.showToast('任务已添加');
  }

  /* ---------- 初始化 ---------- */
  function init() {
    currentDate = getTodayStr();
    setDate(currentDate);

    var dateInput = document.getElementById('todo-date-input');
    if (dateInput) {
      dateInput.max = getTodayStr();
      dateInput.addEventListener('change', function () {
        // 不能选今天以后
        if (dateInput.value && dateInput.value > getTodayStr()) dateInput.value = getTodayStr();
        if (dateInput.value) setDate(dateInput.value);
      });
    }

    var btnToday = document.getElementById('btn-today');
    if (btnToday) btnToday.addEventListener('click', function () { setDate(getTodayStr()); });

    var btnPrev = document.getElementById('btn-prev-day');
    if (btnPrev) btnPrev.addEventListener('click', function () { shiftDate(-1); });

    var btnNext = document.getElementById('btn-next-day');
    if (btnNext) btnNext.addEventListener('click', function () {
      // 不能选今天以后
      if (currentDate >= getTodayStr()) return;
      shiftDate(1);
    });

    var btnAdd = document.getElementById('btn-add-task');
    if (btnAdd) btnAdd.addEventListener('click', openAddTaskModal);

    var btnClose = document.getElementById('btn-close-add-task');
    if (btnClose) btnClose.addEventListener('click', closeAddTaskModal);

    var btnCancel = document.getElementById('btn-cancel-add-task');
    if (btnCancel) btnCancel.addEventListener('click', closeAddTaskModal);

    var btnSave = document.getElementById('btn-save-task');
    if (btnSave) btnSave.addEventListener('click', saveNewTask);

    var newTaskInput = document.getElementById('new-task-name');
    if (newTaskInput) {
      newTaskInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveNewTask();
      });
    }

    var modal = document.getElementById('add-task-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeAddTaskModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
