/* ================================================================
   Dlooda TKBD CRM — 统一数据层 (store.js)
   本地持久化：名单库 / 提醒规则 / 履约追踪状态
   全部存 localStorage（换设备不同步）；回填飞书走 App.pushToFeishu
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var KEY = 'dlooda_crm_v1';

  /* ---------- 默认数据 ---------- */

  // 默认提醒规则：每月 3 号统计出单 + 准备 PPT；每月 25 号催达人视频
  var DEFAULT_RULES = [
    {
      id: 'rule_stats',
      title: '统计达人出单转化数据，准备月度 PPT',
      type: 'monthly',
      day: 3,
      date: '',
      leadDays: 3,
      repeatInterval: 2,
      email: false,
      emailTo: '',
      done: [],
      builtin: true,
    },
    {
      id: 'rule_urge',
      title: '催寄样未履约的达人发视频',
      type: 'monthly',
      day: 25,
      date: '',
      leadDays: 3,
      repeatInterval: 2,
      email: false,
      emailTo: '',
      done: [],
      builtin: true,
    },
  ];

  var DEFAULT_SETTINGS = {
    // 履约追踪：每月 25-30 号之间的工作日执行催办
    urgeWindowStart: 25,
    urgeWindowEnd: 30,
    // 目标寄样时间窗：上月 15 号 ~ 本月 15 号
    sampleFromDay: 15,
    sampleToDay: 15,
    // 邮件提醒（需后端配置；未配置时自动降级为仅界面提醒）
    emailEnabled: false,
    emailTo: '',
    // 弹窗：每次打开界面都弹（未完成的今日待办）
    popupOnLoad: true,
    // 未完成事项的重复提醒间隔（天）—— 默认每 2 天提醒一次，直到标记完成
    repeatIntervalDays: 2,
    // 已弹窗 / 已读记录：{ '2026-10-25': <时间戳> }
    dismissed: {},
    // 邮件发送日志：{ '<ruleId>:<目标日>': <时间戳> } —— 同一天同一规则只发一次
    mailLog: {},
    // 名单库一键复制的格式：line（一行一个）/ comma（逗号分隔）/ at（带 @）
    rosterCopyFormat: 'line',
  };

  function defaults() {
    return {
      version: 1,
      roster: [],
      groups: [],
      rules: JSON.parse(JSON.stringify(DEFAULT_RULES)),
      tracking: {},
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    };
  }

  /* ---------- 读写 ---------- */

  var cache = null;

  function load() {
    if (cache) return cache;
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (e) {}
    if (!raw) { cache = defaults(); persist(); return cache; }
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') { cache = defaults(); persist(); return cache; }
    // 补齐缺失字段（向后兼容）
    var base = defaults();
    ['roster', 'groups', 'rules', 'tracking', 'settings'].forEach(function (k) {
      if (data[k] === undefined || data[k] === null) data[k] = base[k];
    });
    Object.keys(base.settings).forEach(function (k) {
      if (data.settings[k] === undefined) data.settings[k] = base.settings[k];
    });
    if (!Array.isArray(data.rules) || !data.rules.length) data.rules = base.rules;
    cache = data;
    return cache;
  }

  function persist() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      if (App && App.showToast) App.showToast('本地存储写入失败（数据可能过大）');
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- 名单库 roster ---------- */

  function getRoster() { return load().roster; }

  function getRosterItem(id) {
    return getRoster().filter(function (r) { return r.id === id; })[0] || null;
  }

  function addRosterItems(items) {
    var db = load();
    var existing = {};
    db.roster.forEach(function (r) { existing[r.handle] = r; });
    var added = 0, skipped = 0;
    items.forEach(function (it) {
      if (existing[it.handle]) { skipped++; return; }
      var entry = {
        id: uid('r'),
        handle: it.handle,
        raw: it.raw,
        groups: it.groups || [],
        status: it.status || 'ok',
        reason: it.reason || '',
        feishu: it.feishu || null,
        createdAt: new Date().toISOString(),
      };
      db.roster.push(entry);
      existing[it.handle] = entry;
      added++;
    });
    persist();
    return { added: added, skipped: skipped };
  }

  function updateRosterItem(id, patch) {
    var db = load();
    var item = db.roster.filter(function (r) { return r.id === id; })[0];
    if (!item) return false;
    Object.keys(patch).forEach(function (k) { item[k] = patch[k]; });
    persist();
    return true;
  }

  function deleteRosterItem(id) {
    var db = load();
    var before = db.roster.length;
    db.roster = db.roster.filter(function (r) { return r.id !== id; });
    persist();
    return db.roster.length < before;
  }

  /* ---------- 发送标记 sent ----------
   * roster[i].sent = { '<sku>': '2026-10-24' } —— 每个 SKU 独立记录发送日期
   * ⚠️ 只能用下面这两个方法修改，不要整体赋值 item.sent
   *   （整体赋值会抹掉同一达人在其他 SKU 组里的发送记录）
   */

  function markSent(id, sku, date) {
    var db = load();
    var item = db.roster.filter(function (r) { return r.id === id; })[0];
    if (!item) return false;
    if (!item.sent || typeof item.sent !== 'object') item.sent = {};
    item.sent[sku] = date || toDateStr(new Date());
    persist();
    return true;
  }

  function unmarkSent(id, sku) {
    var db = load();
    var item = db.roster.filter(function (r) { return r.id === id; })[0];
    if (!item || !item.sent) return false;
    delete item.sent[sku];
    persist();
    return true;
  }

  function clearRoster() {
    var db = load();
    db.roster = [];
    persist();
  }

  /* ---------- 分组 groups ---------- */
  // group: { sku: '2190', name: '', scheduledDate: '2026-10-24', note: '' }

  function getGroups() { return load().groups; }

  function upsertGroup(group) {
    var db = load();
    var found = db.groups.filter(function (g) { return g.sku === group.sku; })[0];
    if (found) {
      Object.keys(group).forEach(function (k) {
        if (k !== 'sku') found[k] = group[k];
      });
    } else {
      db.groups.push(group);
    }
    persist();
  }

  function deleteGroup(sku) {
    var db = load();
    db.groups = db.groups.filter(function (g) { return g.sku !== sku; });
    db.roster.forEach(function (r) {
      r.groups = (r.groups || []).filter(function (g) { return g !== sku; });
    });
    persist();
  }

  /* ---------- 提醒规则 rules ---------- */

  function getRules() { return load().rules; }
  function getRule(id) { return getRules().filter(function (r) { return r.id === id; })[0] || null; }

  function addRule(rule) {
    var db = load();
    rule.id = rule.id || uid('rule');
    db.rules.push(rule);
    persist();
    return rule;
  }

  function updateRule(id, patch) {
    var db = load();
    var r = db.rules.filter(function (x) { return x.id === id; })[0];
    if (!r) return false;
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    persist();
    return true;
  }

  function deleteRule(id) {
    var db = load();
    var r = db.rules.filter(function (x) { return x.id === id; })[0];
    if (r && r.builtin) return false;   // 内置规则不允许删除
    db.rules = db.rules.filter(function (x) { return x.id !== id; });
    persist();
    return true;
  }

  // 标记某条规则在指定日期完成（YYYY-MM-DD），传 null 表示今天
  function markRuleDone(id, dateStr) {
    var r = getRule(id);
    if (!r) return false;
    dateStr = dateStr || todayStr();
    if (r.done.indexOf(dateStr) === -1) r.done.push(dateStr);
    persist();
    return true;
  }

  function unmarkRuleDone(id, dateStr) {
    var r = getRule(id);
    if (!r) return false;
    dateStr = dateStr || todayStr();
    r.done = r.done.filter(function (d) { return d !== dateStr; });
    persist();
    return true;
  }

  function isRuleDone(rule, dateStr) {
    return rule.done && rule.done.indexOf(dateStr) !== -1;
  }

  /* ---------- 履约追踪 tracking ---------- */
  // tracking: { '<sampleRecordId>': { status: '已催', at: '...', note: '' } }

  function getTracking() { return load().tracking; }
  function getTrackingItem(rid) { return getTracking()[rid] || null; }

  function setTrackingStatus(rid, status, note) {
    var db = load();
    db.tracking[rid] = {
      status: status || '',
      at: new Date().toISOString(),
      note: note || '',
    };
    persist();
  }

  function clearTrackingStatus(rid) {
    var db = load();
    delete db.tracking[rid];
    persist();
  }

  /* ---------- 设置 settings ---------- */

  function getSettings() { return load().settings; }

  function updateSettings(patch) {
    var s = getSettings();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    persist();
  }

  /* ---------- 弹窗已读 ---------- */

  // dismissed[date] 存时间戳；距离上次关闭未满 intervalDays 天 → 本次不再弹
  function isDismissed(dateStr, intervalDays) {
    var ts = getSettings().dismissed[dateStr];
    if (!ts) return false;
    var hours = (Date.now() - ts) / 3600000;
    return hours < 24 * (intervalDays || 2);
  }
  function setDismissed(dateStr) {
    var s = getSettings();
    s.dismissed[dateStr] = Date.now();
    // 只保留最近 60 天的记录，避免无限增长
    var keys = Object.keys(s.dismissed).sort();
    while (keys.length > 60) { delete s.dismissed[keys.shift()]; }
    persist();
  }
  function clearDismissed(dateStr) {
    var s = getSettings();
    delete s.dismissed[dateStr];
    persist();
  }

  /* ---------- 导入导出 ---------- */

  function exportAll() {
    return JSON.stringify(load(), null, 2);
  }

  function importAll(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') throw new Error('不是有效的 JSON 对象');
    cache = null;
    var base = defaults();
    ['roster', 'groups', 'rules', 'tracking', 'settings'].forEach(function (k) {
      base[k] = data[k] !== undefined ? data[k] : base[k];
    });
    cache = base;
    persist();
    return true;
  }

  function resetAll() {
    cache = defaults();
    persist();
  }

  /* ---------- 工具：日期 ---------- */

  function pad(n) { return (n < 10 ? '0' + n : '' + n); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
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

  global.DloodaStore = {
    KEY: KEY,
    load: load,
    persist: persist,
    uid: uid,
    // roster
    getRoster: getRoster,
    getRosterItem: getRosterItem,
    addRosterItems: addRosterItems,
    updateRosterItem: updateRosterItem,
    deleteRosterItem: deleteRosterItem,
    markSent: markSent,
    unmarkSent: unmarkSent,
    clearRoster: clearRoster,
    // groups
    getGroups: getGroups,
    upsertGroup: upsertGroup,
    deleteGroup: deleteGroup,
    // rules
    getRules: getRules,
    getRule: getRule,
    addRule: addRule,
    updateRule: updateRule,
    deleteRule: deleteRule,
    markRuleDone: markRuleDone,
    unmarkRuleDone: unmarkRuleDone,
    isRuleDone: isRuleDone,
    // tracking
    getTracking: getTracking,
    getTrackingItem: getTrackingItem,
    setTrackingStatus: setTrackingStatus,
    clearTrackingStatus: clearTrackingStatus,
    // settings
    getSettings: getSettings,
    updateSettings: updateSettings,
    isDismissed: isDismissed,
    setDismissed: setDismissed,
    clearDismissed: clearDismissed,
    // io
    exportAll: exportAll,
    importAll: importAll,
    resetAll: resetAll,
    // date utils
    todayStr: todayStr,
    toDateStr: toDateStr,
    daysBetween: daysBetween,
    isWorkday: isWorkday,
  };

})(window);
