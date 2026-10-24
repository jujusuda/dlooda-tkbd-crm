/* ================================================================
   Dlooda TKBD CRM — 提醒引擎 (reminder.js)
   ① 日程提醒规则求值（每月固定日 / 一次性 / 提前 N 天预提醒）
   ② 履约追踪待催名单（寄样窗口 + 未履约判定）
   ③ 打开任意界面自动弹窗 + 待办清单常驻
   邮件通道：POST ./api/notify（后端未配置时自动降级为界面提醒）
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Store = global.DloodaStore;
  var Matcher = global.DloodaMatcher;

  /* ---------- 取数据源 ---------- */

  function getData() {
    var uploaded = null;
    try { uploaded = JSON.parse(global.localStorage.getItem('dlooda_uploaded_data')); } catch (e) {}
    var d = (uploaded && uploaded.creators && uploaded.creators.length) ? uploaded : (global.REAL_DATA || null);
    return d;
  }

  function getSamples() {
    var d = getData();
    return (d && d.samples) ? d.samples : [];
  }

  /* ---------- 日期工具 ---------- */

  function pad(n) { return (n < 10 ? '0' + n : '' + n); }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  // 解析飞书时间："2026-10-12 16:24" / "2026-10-12"
  function parseDT(s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s).trim());
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }

  function daysBetween(aStr, bStr) {
    var a = new Date(aStr + 'T00:00:00');
    var b = new Date(bStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  function isWorkday(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var w = d.getDay();
    return w >= 1 && w <= 5;
  }

  function fmtCN(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + w;
  }

  /* ================================================================
     一、履约追踪 —— 待催达人计算
     规则（用户 2026-10-23 确认）：
       · 执行窗口：每月 25–30 号之间的工作日
       · 目标：寄样时间在「上月 15 号」~「本月 15 号」之间
       · 未履约 = 更新时间为空 且 履约方式为空
       · 不分级
     ================================================================ */

  function getUrgeContext() {
    var s = Store.getSettings();
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    var today = toDateStr(now);

    var inWindow = d >= s.urgeWindowStart && d <= s.urgeWindowEnd && isWorkday(today);

    // 寄样时间窗：上月 15 号 00:00 ~ 本月 15 号 23:59
    var from = new Date(y, m - 1, s.sampleFromDay, 0, 0, 0);
    var to = new Date(y, m, s.sampleToDay, 23, 59, 59);

    // 下一个工作日（用于提示）
    var next = new Date(now.getTime());
    do { next.setDate(next.getDate() + 1); } while (!isWorkday(toDateStr(next)));

    return {
      today: today,
      todayCN: fmtCN(today),
      inWindow: inWindow,
      from: from,
      to: to,
      fromStr: toDateStr(from),
      toStr: toDateStr(to),
      nextWorkday: toDateStr(next),
      settings: s,
    };
  }

  // 返回未履约的寄样记录
  function getUrgeList() {
    var ctx = getUrgeContext();
    var samples = getSamples();

    var list = samples.filter(function (s) {
      // 已履约：更新时间或履约方式任一非空 → 不算未履约
      if (s.updateTime) return false;
      if (s.fulfillMethod && String(s.fulfillMethod).trim()) return false;
      var st = parseDT(s.sampleTime);
      if (!st) return false;
      return st >= ctx.from && st <= ctx.to;
    }).map(function (s) {
      var t = Store.getTrackingItem(s._rid);
      var days = null;
      var st = parseDT(s.sampleTime);
      if (st) days = Math.floor((Date.now() - st.getTime()) / 86400000);
      return {
        rid: s._rid,
        creator: s.creator,
        handle: Matcher.normalize(s.creator),
        sku: s.sku,
        color: s.color || '',
        sampleTime: s.sampleTime || '',
        waitedDays: days,
        status: t ? t.status : '',
        note: t ? t.note : '',
        updatedAt: t ? t.at : '',
      };
    });

    // 未处理的排前面，等待久的优先
    list.sort(function (a, b) {
      if (!!a.status !== !!b.status) return a.status ? 1 : -1;
      return (b.waitedDays || 0) - (a.waitedDays || 0);
    });

    return { ctx: ctx, list: list };
  }

  /* ================================================================
     二、日程提醒规则
     rule = { id, title, type:'monthly'|'once', day, date, leadDays,
              repeatInterval, email, emailTo, done:[dateStr], builtin }
     ================================================================ */

  // 计算某规则在「本周期」的目标日（YYYY-MM-DD）
  function ruleTargetDate(rule, refDate) {
    refDate = refDate || new Date();
    if (rule.type === 'once') return rule.date || '';
    var y = refDate.getFullYear(), m = refDate.getMonth() + 1;
    var lastDay = new Date(y, m, 0).getDate();
    var day = Math.min(rule.day || 1, lastDay);
    return y + '-' + pad(m) + '-' + pad(day);
  }

  // 求值：返回 null（不在提醒范围）或 { state, target, daysLeft|overdueDays, done }
  function evaluateRule(rule, refDate) {
    refDate = refDate || new Date();
    var today = toDateStr(refDate);
    var target = ruleTargetDate(rule, refDate);
    if (!target) return null;

    var diff = daysBetween(today, target);   // >0 未到，=0 当天，<0 已过
    var done = Store.isRuleDone(rule, target);

    if (diff === 0) {
      return { state: 'today', target: target, done: done, daysLeft: 0, overdueDays: 0 };
    }
    if (diff > 0 && diff <= (rule.leadDays || 0)) {
      return { state: 'upcoming', target: target, done: done, daysLeft: diff, overdueDays: 0 };
    }
    if (diff < 0 && !done) {
      return { state: 'overdue', target: target, done: false, daysLeft: 0, overdueDays: -diff };
    }
    return null;
  }

  /* ---------- 今日待办汇总 ---------- */

  function getTodayItems() {
    var items = [];
    var now = new Date();

    /* --- 来自提醒规则 --- */
    Store.getRules().forEach(function (rule) {
      if (!rule || rule.enabled === false) return;
      var ev = evaluateRule(rule, now);
      if (!ev || ev.done) return;
      items.push({
        key: 'rule:' + rule.id + ':' + ev.target,
        source: 'rule',
        ruleId: rule.id,
        title: rule.title,
        desc: buildRuleDesc(rule, ev),
        state: ev.state,
        target: ev.target,
        daysLeft: ev.daysLeft,
        overdueDays: ev.overdueDays,
        done: false,
      });
    });

    /* --- 来自履约追踪 --- */
    var urge = getUrgeList();
    var pending = urge.list.filter(function (x) { return !x.status; });

    if (pending.length) {
      var oldest = pending[0];
      items.push({
        key: 'urge:batch',
        source: 'urge',
        title: '催 ' + pending.length + ' 位未履约达人发视频',
        desc: '寄样时间 ' + urge.ctx.fromStr + ' ~ ' + urge.ctx.toStr
          + '，最久已等 ' + (oldest.waitedDays || 0) + ' 天'
          + (urge.ctx.inWindow ? '（当前在执行窗口内）' : '（尚未到执行窗口）'),
        state: urge.ctx.inWindow ? 'today' : 'upcoming',
        target: urge.ctx.today,
        daysLeft: 0,
        overdueDays: 0,
        done: false,
        count: pending.length,
        link: 'tracking.html',
      });
    }

    return items;
  }

  function buildRuleDesc(rule, ev) {
    var prefix = rule.type === 'once' ? '一次性任务' : ('每月 ' + rule.day + ' 号');
    if (ev.state === 'today') return prefix + ' · 今日到期';
    if (ev.state === 'upcoming') return prefix + ' · 还有 ' + ev.daysLeft + ' 天（提前 ' + rule.leadDays + ' 天提醒）';
    if (ev.state === 'overdue') return prefix + ' · 已逾期 ' + ev.overdueDays + ' 天';
    return prefix;
  }

  /* ---------- 规则 CRUD ---------- */

  function getRules() { return Store.getRules(); }
  function getRule(id) { return Store.getRule(id); }

  function addRule(input) {
    var rule = {
      id: Store.uid('rule'),
      title: String(input.title || '').trim(),
      type: input.type === 'once' ? 'once' : 'monthly',
      day: Math.max(1, Math.min(31, parseInt(input.day, 10) || 1)),
      date: input.date || '',
      leadDays: Math.max(0, parseInt(input.leadDays, 10) || 0),
      repeatInterval: Math.max(1, parseInt(input.repeatInterval, 10) || 2),
      email: !!input.email,
      emailTo: String(input.emailTo || '').trim(),
      note: String(input.note || '').trim(),
      done: [],
      builtin: false,
      enabled: true,
    };
    return Store.addRule(rule);
  }

  function updateRule(id, patch) {
    return Store.updateRule(id, patch);
  }

  function deleteRule(id) {
    return Store.deleteRule(id);
  }

  function toggleRuleDone(ruleId, target, done) {
    if (done) Store.markRuleDone(ruleId, target);
    else Store.unmarkRuleDone(ruleId, target);
  }

  /* ---------- 邮件通道 ---------- */

  function sendReminderEmail(rule, items) {
    var to = rule.emailTo || Store.getSettings().emailTo || '';
    if (!to) return Promise.resolve({ ok: false, reason: '未填写收件邮箱' });

    var subject = '【Dlooda TKBD 提醒】' + rule.title;
    var lines = items.map(function (it) { return '· ' + it.title + '（' + it.desc + '）'; });

    return fetch('./api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: to, subject: subject, text: lines.join('\n') })
    }).then(function (r) { return r.json(); }).then(function (j) {
      return { ok: !!(j && j.ok), reason: (j && j.error) || '' };
    }).catch(function () {
      return { ok: false, reason: '邮件通道未配置（已保留为界面提醒）' };
    });
  }

  /* ================================================================
     三、弹窗
     ================================================================ */

  var POPUP_ID = 'dlooda-reminder-popup';

  // 距离上次关闭是否已满 intervalDays 天
  function popupDue(intervalDays) {
    var s = Store.getSettings();
    if (!s.popupOnLoad) return false;
    var today = todayStr();
    var ts = s.dismissed[today];
    if (!ts) return true;
    var hours = (Date.now() - ts) / 3600000;
    return hours >= 24 * (intervalDays || 2);
  }

  function closePopup() {
    var el = document.getElementById(POPUP_ID);
    if (el) el.remove();
  }

  function renderPopup(items) {
    closePopup();
    if (!items || !items.length) return;

    var mask = document.createElement('div');
    mask.id = POPUP_ID;
    mask.style.cssText = ''
      + 'position:fixed;inset:0;background:rgba(92,74,74,.34);z-index:10000;'
      + 'display:flex;align-items:center;justify-content:center;padding:20px;'
      + 'backdrop-filter:blur(4px);';

    var rows = items.map(function (it) {
      var color = it.state === 'overdue' ? 'var(--c-danger)'
        : it.state === 'today' ? 'var(--pink-500)' : 'var(--c-warning)';
      var tag = it.state === 'overdue' ? '逾期' : it.state === 'today' ? '今日' : '即将';
      return ''
        + '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;'
        +     'border-bottom:1px solid var(--border-1);">'
        +   '<input type="checkbox" data-reminder-key="' + App.escapeHtml(it.key) + '"'
        +     ' style="width:20px;height:20px;margin-top:2px;accent-color:var(--pink-500);cursor:pointer;">'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-size:14px;font-weight:600;color:var(--text-1);">'
        +       App.escapeHtml(it.title) + '</div>'
        +     '<div style="font-size:12px;color:var(--text-3);margin-top:2px;">'
        +       App.escapeHtml(it.desc) + '</div>'
        +   '</div>';
    }).join('');

    mask.innerHTML = ''
      + '<div style="background:var(--bg-surface);border-radius:var(--r-xl);'
      +   'max-width:460px;width:100%;padding:22px;'
      +   'box-shadow:0 12px 40px rgba(120,90,100,.22);'
      +   'max-height:82vh;display:flex;flex-direction:column;">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      +     '<h3 style="margin:0;font-size:17px;color:var(--text-1);font-weight:600;">今日待办</h3>'
      +     '<button id="dlooda-reminder-close" style="border:none;background:none;'
      +       'font-size:22px;line-height:1;cursor:pointer;color:var(--text-3);">&times;</button>'
      +   '</div>'
      +   '<p id="dlooda-reminder-date" style="font-size:12px;color:var(--text-3);margin:0 0 10px;"></p>'
      +   '<div style="overflow-y:auto;flex:1;min-height:0;">' + rows + '</div>'
      +   '<div style="display:flex;gap:8px;margin-top:16px;">'
      +     '<button id="dlooda-reminder-ok" class="btn btn--primary" '
      +       'style="flex:1;justify-content:center;">知道了</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(mask);

    var dateEl = mask.querySelector('#dlooda-reminder-date');
    if (dateEl) dateEl.textContent = fmtCN(todayStr());

    var closeBtn = mask.querySelector('#dlooda-reminder-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      dismiss();
      closePopup();
    });

    var okBtn = mask.querySelector('#dlooda-reminder-ok');
    if (okBtn) okBtn.addEventListener('click', function () {
      dismiss();
      closePopup();
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask) { dismiss(); closePopup(); }
    });

    mask.querySelectorAll('[data-reminder-key]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-reminder-key');
        applyDone(key, cb.checked);
        setTimeout(function () {
          var left = getTodayItems();
          if (!left.length) { dismiss(); closePopup(); }
          else { renderPopup(left); }
        }, 260);
      });
    });
  }

  function dismiss() {
    var s = Store.getSettings();
    s.dismissed[todayStr()] = Date.now();
    var keys = Object.keys(s.dismissed).sort();
    while (keys.length > 60) { delete s.dismissed[keys.shift()]; }
    Store.persist();
  }

  // key 形如 'rule:<ruleId>:<target>' 或 'urge:batch'
  function applyDone(key, done) {
    if (key.indexOf('rule:') === 0) {
      var parts = key.split(':');
      var ruleId = parts[1];
      var target = parts[2];
      toggleRuleDone(ruleId, target, done);
    } else if (key === 'urge:batch') {
      // 批量催办：跳到追踪页处理，这里不直接改状态
      if (done) global.location.href = 'tracking.html';
    }
  }

  /* ---------- 自动初始化 ---------- */

  // 对开了邮件提醒的规则，在提醒日当天发一次邮件（同一天不重复）
  function sendPendingEmails(items) {
    var s = Store.getSettings();
    if (!s.mailLog) s.mailLog = {};
    var today = todayStr();

    items.forEach(function (it) {
      if (it.source !== 'rule') return;
      var rule = Store.getRule(it.ruleId);
      if (!rule || !rule.email) return;

      var key = rule.id + ':' + (it.target || today);
      if (s.mailLog[key]) return;       // 已发过
      s.mailLog[key] = Date.now();
      Store.persist();

      sendReminderEmail(rule, [it]);
    });
  }

  function autoInit() {
    var items = getTodayItems();
    if (!items.length) return;
    sendPendingEmails(items);
    if (!popupDue(Store.getSettings().repeatIntervalDays || 2)) return;
    renderPopup(items);
  }

  global.DloodaReminder = {
    getUrgeContext: getUrgeContext,
    getUrgeList: getUrgeList,
    getTodayItems: getTodayItems,
    evaluateRule: evaluateRule,
    ruleTargetDate: ruleTargetDate,
    getRules: getRules,
    getRule: getRule,
    addRule: addRule,
    updateRule: updateRule,
    deleteRule: deleteRule,
    toggleRuleDone: toggleRuleDone,
    markRuleDone: Store.markRuleDone,
    unmarkRuleDone: Store.unmarkRuleDone,
    sendReminderEmail: sendReminderEmail,
    renderPopup: renderPopup,
    closePopup: closePopup,
    autoInit: autoInit,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})(window);
