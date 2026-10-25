/* ================================================================
   Dlooda TKBD CRM — 任务清单 (v1)
   每日固定任务 + 自定义任务 · 打勾完成 · 日期筛选
   数据存储在 localStorage
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Store = global.DloodaStore;

  // 每日固定任务：默认取自「每日工作.xlsx · 每日工作」表的真实任务清单，可自己编辑
  var DEFAULT_FIXED_TASKS = [
    { id: 'f1', name: '出单复投', icon: '\u{1F504}' },
    { id: 'f2', name: '跑达人', icon: '\u{1F3C3}' },
    { id: 'f3', name: '审核达人', icon: '✅' },
    { id: 'f4', name: '官号私信', icon: '\u{1F4AC}' },
    { id: 'f5', name: '处理达人消息', icon: '\u{1F4E8}' },
    { id: 'f6', name: '登记寄样（ID、sku、时间、L几、星级）', icon: '\u{1F4E6}' },
    { id: 'f7', name: '登记每日视频（达人画像、品类、备注）', icon: '\u{1F3AC}' },
    { id: 'f8', name: '找新达人', icon: '\u{1F50D}' },
    { id: 'f9', name: 'fastmoss 找达人', icon: '\u{1F9F2}' },
  ];
  var FIXED_STORAGE_KEY = 'dlooda_todo_fixed_tasks';

  var FIXED_TASKS = (function () {
    try {
      var raw = global.localStorage.getItem(FIXED_STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_FIXED_TASKS));
  })();

  // 用文本行覆盖固定任务（每行一条，行首可带 emoji 当图标）
  function setFixedTasksFromText(text) {
    var lines = String(text || '').split(/[\n\r]+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
    if (!lines.length) { App.showToast('至少要有一条任务'); return 0; }
    var list = lines.map(function (line, i) {
      var m = line.match(/^(\S+)\s+(.+)$/);
      var icon = '•';
      var name = line;
      if (m && /\p{Extended_Pictographic}/u.test(m[1])) { icon = m[1]; name = m[2]; }
      return { id: 'ft' + (i + 1) + '_' + Date.now().toString(36), name: name, icon: icon };
    });
    saveFixedTasks(list);
    return list.length;
  }

  function saveFixedTasks(list) {
    while (FIXED_TASKS.length) FIXED_TASKS.pop();
    list.forEach(function (t) { FIXED_TASKS.push(t); });
    try { global.localStorage.setItem(FIXED_STORAGE_KEY, JSON.stringify(FIXED_TASKS)); } catch (e) {}
  }

  function restoreDefaultFixed() {
    saveFixedTasks(JSON.parse(JSON.stringify(DEFAULT_FIXED_TASKS)));
  }

  var STORAGE_KEY = 'dlooda_todo_data';
  var currentDate = '';
  // 启动时尝试恢复筛选缓存（5 分钟内有效）
  (function () {
    var saved = App.loadFilterState('todo');
    if (saved && typeof saved.date === 'string') currentDate = saved.date;
  })();

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

  /* ---------- 固定任务编辑 ---------- */

  function openFixedModal() {
    var ta = document.getElementById('fixed-text');
    if (ta) {
      ta.value = FIXED_TASKS.map(function (t) {
        return (t.icon && t.icon !== '•' ? t.icon + ' ' : '') + t.name;
      }).join('\n');
    }
    App.openModal('fixed-modal');
  }

  function closeFixedModal() { App.closeModal('fixed-modal'); }

  function saveFixedModal() {
    var ta = document.getElementById('fixed-text');
    var n = setFixedTasksFromText(ta ? ta.value : '');
    if (!n) return;
    renderFixedTasks();
    renderProgress();
    closeFixedModal();
    App.showToast('固定任务已更新（' + n + ' 条）');
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

  /* ---------- 自动待办（提醒规则 + 履约追踪） ---------- */

  function getReminder() {
    return global.DloodaReminder || null;
  }

  function stateLabel(state) {
    if (state === 'overdue') return { txt: '逾期', cls: 'badge--red' };
    if (state === 'today') return { txt: '今日', cls: 'badge--pink' };
    return { txt: '即将', cls: 'badge--sand' };
  }

  function renderAutoTasks() {
    var container = document.getElementById('auto-tasks');
    if (!container) return;
    var R = getReminder();
    if (!R) {
      container.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:13px;">提醒引擎未加载</div>';
      return;
    }

    var items = R.getTodayItems();

    if (!items.length) {
      container.innerHTML = ''
        + '<div class="empty-state" style="padding:26px 16px;">'
        +   '<div class="empty-state__icon">(=^･ω･^=)</div>'
        +   '<div class="empty-state__text">今天没有到期或即将到期的提醒</div>'
        + '</div>';
      return;
    }

    container.innerHTML = items.map(function (it) {
      var st = stateLabel(it.state);
      return ''
        + '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;'
        +   'border-bottom:1px solid var(--border-1);">'
        +   '<input type="checkbox" data-auto-key="' + App.escapeHtml(it.key) + '"'
        +     ' style="width:20px;height:20px;margin-top:2px;accent-color:var(--pink-500);cursor:pointer;">'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
        +       '<span style="font-size:14px;font-weight:600;color:var(--text-1);">'
        +         App.escapeHtml(it.title) + '</span>'
        +       '<span class="badge ' + st.cls + '">' + st.txt + '</span>'
        +     '</div>'
        +     '<div style="font-size:12px;color:var(--text-3);margin-top:3px;">'
        +       App.escapeHtml(it.desc) + '</div>'
        +   '</div>'
        + '</div>';
    }).join('');

    container.querySelectorAll('[data-auto-key]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-auto-key');
        if (key === 'urge:batch') {
          if (cb.checked) global.location.href = 'tracking.html';
          return;
        }
        var parts = key.split(':');
        if (parts[0] !== 'rule') return;
        if (cb.checked) Store.markRuleDone(parts[1], parts[2]);
        else Store.unmarkRuleDone(parts[1], parts[2]);
        renderAutoTasks();
        if (cb.checked) App.showToast('已完成 ✓');
      });
    });
  }

  /* ---------- 提醒规则管理 ---------- */

  var editingId = null;   // 当前编辑的规则 id（⚠️ 必须声明：严格模式下未声明的赋值会抛错，导致编辑弹窗打不开）

  function ruleTriggerText(rule) {
    if (rule.type === 'once') return '一次性 · ' + (rule.date || '未设置');
    return '每月 ' + rule.day + ' 号';
  }

  function renderRules() {
    var container = document.getElementById('rule-list');
    if (!container) return;
    var rules = Store.getRules();

    if (!rules.length) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;">'
        + '还没有提醒规则，点击「新增规则」添加</div>';
      return;
    }

    container.innerHTML = rules.map(function (r) {
      return ''
        + '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;'
        +   'border-bottom:1px solid var(--border-1);">'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-size:14px;font-weight:600;color:var(--text-1);">'
        +       App.escapeHtml(r.title) + (r.builtin ? ' <span class="badge badge--gray">内置</span>' : '')
        +     '</div>'
        +     '<div style="font-size:12px;color:var(--text-3);margin-top:3px;">'
        +       App.escapeHtml(ruleTriggerText(r))
        +       ' · 提前 ' + (r.leadDays || 0) + ' 天'
        +       (r.email ? ' · 邮件' : '')
        +     '</div>'
        +   '</div>'
        +   '<button class="btn btn--ghost btn--sm" data-rule-edit="' + App.escapeHtml(r.id) + '"'
        +     ' style="font-size:11px;padding:3px 8px;">编辑</button>'
        +   '<button class="btn btn--ghost btn--sm" data-rule-del="' + App.escapeHtml(r.id) + '"'
        +     ' style="font-size:11px;padding:3px 8px;color:var(--c-danger);">删除</button>'
        + '</div>';
    }).join('');

    container.querySelectorAll('[data-rule-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openRuleModal(btn.getAttribute('data-rule-edit'));
      });
    });

    container.querySelectorAll('[data-rule-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!global.confirm('确定删除这条提醒规则？')) return;
        if (Store.deleteRule(btn.getAttribute('data-rule-del'))) {
          renderRules(); renderAutoTasks();
          App.showToast('规则已删除');
        } else {
          App.showToast('删除失败，请重试');
        }
      });
    });
  }

  function openRuleModal(ruleId) {
    var modal = document.getElementById('rule-modal');
    if (!modal) return;
    editingId = ruleId || null;

    var titleEl = document.getElementById('rule-modal-title');
    var tEl = document.getElementById('rule-title');
    var typeEl = document.getElementById('rule-type');
    var dayEl = document.getElementById('rule-day');
    var dateEl = document.getElementById('rule-date');
    var leadEl = document.getElementById('rule-lead');
    var emailEl = document.getElementById('rule-email');
    var emailToEl = document.getElementById('rule-email-to');

    var r = ruleId ? Store.getRule(ruleId) : null;

    if (titleEl) titleEl.textContent = r ? '编辑提醒规则' : '新增提醒规则';
    if (tEl) tEl.value = r ? r.title : '';
    if (typeEl) typeEl.value = r ? r.type : 'monthly';
    if (dayEl) dayEl.value = r ? r.day : 25;
    if (dateEl) dateEl.value = r ? (r.date || '') : '';
    if (leadEl) leadEl.value = r ? r.leadDays : 3;
    if (emailEl) emailEl.checked = r ? !!r.email : false;
    if (emailToEl) emailToEl.value = r ? (r.emailTo || '') : (Store.getSettings().emailTo || '');

    syncRuleTypeUI();
    modal.style.display = 'flex';
    setTimeout(function () { if (tEl) tEl.focus(); }, 100);
  }

  function closeRuleModal() {
    var modal = document.getElementById('rule-modal');
    if (modal) modal.style.display = 'none';
    editingId = null;
  }

  function syncRuleTypeUI() {
    var typeEl = document.getElementById('rule-type');
    var dayG = document.getElementById('rule-day-group');
    var dateG = document.getElementById('rule-date-group');
    var emailEl = document.getElementById('rule-email');
    var emailG = document.getElementById('rule-email-group');
    if (!typeEl) return;
    var isOnce = typeEl.value === 'once';
    if (dayG) dayG.style.display = isOnce ? 'none' : '';
    if (dateG) dateG.style.display = isOnce ? '' : 'none';
    if (emailG && emailEl) emailG.style.display = emailEl.checked ? '' : 'none';
  }

  function saveRule() {
    var tEl = document.getElementById('rule-title');
    var title = tEl ? tEl.value.trim() : '';
    if (!title) { App.showToast('请输入任务名称'); return; }

    var typeEl = document.getElementById('rule-type');
    var dayEl = document.getElementById('rule-day');
    var dateEl = document.getElementById('rule-date');
    var leadEl = document.getElementById('rule-lead');
    var emailEl = document.getElementById('rule-email');
    var emailToEl = document.getElementById('rule-email-to');

    var payload = {
      title: title,
      type: typeEl ? typeEl.value : 'monthly',
      day: parseInt(dayEl && dayEl.value, 10) || 25,
      date: dateEl ? dateEl.value : '',
      leadDays: parseInt(leadEl && leadEl.value, 10) || 0,
      email: emailEl ? emailEl.checked : false,
      emailTo: emailToEl ? emailToEl.value.trim() : '',
    };

    if (payload.type === 'once' && !payload.date) {
      App.showToast('请选择执行日期');
      return;
    }

    if (editingId) Store.updateRule(editingId, payload);
    else Store.addRule(payload);

    closeRuleModal();
    renderRules();
    renderAutoTasks();
    App.showToast('规则已保存');
  }

  /* ---------- 日期更新 ---------- */
  function setDate(dateStr) {
    currentDate = dateStr;
    App.saveFilterState('todo', { date: currentDate });
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
    // 优先用缓存日期，否则默认今天
    currentDate = currentDate || getTodayStr();
    setDate(currentDate);
    renderAutoTasks();
    renderRules();

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

    var modalAdd = document.getElementById('add-task-modal');
    if (modalAdd) {
      modalAdd.addEventListener('click', function (e) {
        if (e.target === modalAdd) closeAddTaskModal();
      });
    }

    // ---- 提醒规则弹窗 ----
    var btnAddRule = document.getElementById('btn-add-rule');
    if (btnAddRule) btnAddRule.addEventListener('click', function () { openRuleModal(null); });

    var btnCloseRule = document.getElementById('btn-close-rule');
    if (btnCloseRule) btnCloseRule.addEventListener('click', closeRuleModal);

    var btnCancelRule = document.getElementById('btn-cancel-rule');
    if (btnCancelRule) btnCancelRule.addEventListener('click', closeRuleModal);

    var btnSaveRule = document.getElementById('btn-save-rule');
    if (btnSaveRule) btnSaveRule.addEventListener('click', saveRule);

    var typeSel = document.getElementById('rule-type');
    if (typeSel) typeSel.addEventListener('change', syncRuleTypeUI);

    var emailCb = document.getElementById('rule-email');
    if (emailCb) emailCb.addEventListener('change', syncRuleTypeUI);

    var modalRule = document.getElementById('rule-modal');
    if (modalRule) {
      modalRule.addEventListener('click', function (e) {
        if (e.target === modalRule) closeRuleModal();
      });
    }

    // ---- 固定任务编辑弹窗 ----
    var btnEditFixed = document.getElementById('btn-edit-fixed');
    if (btnEditFixed) btnEditFixed.addEventListener('click', openFixedModal);

    var btnCloseFixed = document.getElementById('btn-close-fixed');
    if (btnCloseFixed) btnCloseFixed.addEventListener('click', closeFixedModal);

    var btnCancelFixed = document.getElementById('btn-cancel-fixed');
    if (btnCancelFixed) btnCancelFixed.addEventListener('click', closeFixedModal);

    var btnSaveFixed = document.getElementById('btn-save-fixed');
    if (btnSaveFixed) btnSaveFixed.addEventListener('click', saveFixedModal);

    var btnDefaultFixed = document.getElementById('btn-fixed-default');
    if (btnDefaultFixed) btnDefaultFixed.addEventListener('click', function () {
      restoreDefaultFixed();
      renderFixedTasks();
      renderProgress();
      closeFixedModal();
      App.showToast('已恢复为默认任务清单');
    });

    var modalFixed = document.getElementById('fixed-modal');
    if (modalFixed) {
      modalFixed.addEventListener('click', function (e) {
        if (e.target === modalFixed) closeFixedModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
