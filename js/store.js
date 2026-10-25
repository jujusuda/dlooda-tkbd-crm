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
      version: 2,
      roster: [],
      groups: [],
      // 建联名单（模块二）：批次 + 成员
      outreach: { batches: [], members: [] },
      // 指定达人名单（模块三）：只存本机改动+标记，静态数据在 js/designated-data.js
      // marks: {cardId: [{id,date,product,note}]}  已发记录
      // overrides: {cardId: {store,product,title,note,img}}  卡片信息修改
      // deleted: [cardId]  已删除的卡片
      // added: [card]  用户新增的卡片（img 为 dataURL）
      // handleAdds / handleRems: {cardId: [handle]}  卡片内增删的达人
      designated: { marks: {}, overrides: {}, deleted: [], added: [], handleAdds: {}, handleRems: {} },
      // 自动达人名单（模块一 Excel 导入）：只存本机改动+标记，静态数据在 js/auto-data.js
      // marks:    { groupId: { handle: {date, note} } }  已发/标记
      // removed:  { groupId: [handle] }  组内移除的达人
      // added:    { groupId: [handle] }  组内追加的达人
      // custom:   [{ id, name, handles: [] }]  手动新增分组
      // groupNames: { groupId: 新名称 }  静态分组改名覆盖
      // groupDeleted: [groupId]  删除的静态分组
      // pool:     [handle]  达人池（不按 SKU 存，发某 SKU 时动态算可发/已发）
      // sent:     { handle: { sku: {date, note} } }  按 SKU 的本机已发标记
      auto: { marks: {}, removed: {}, added: {}, custom: [], groupNames: {}, groupDeleted: [], pool: [], sent: {} },
      // 复投名单（模块二 Excel 导入）：只存本机标记，静态数据在 js/reinvest-data.js
      // marks: { id: { status, note, date } }  id = handle
      reinvest: { marks: {} },
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
    cache = normalize(data);
    return cache;
  }

  // 补齐缺失字段（向后兼容）——本地读取与云端拉取共用
  function normalize(data) {
    var base = defaults();
    ['roster', 'groups', 'outreach', 'designated', 'auto', 'reinvest', 'rules', 'tracking', 'settings'].forEach(function (k) {
      if (data[k] === undefined || data[k] === null) data[k] = base[k];
    });
    if (!data.designated || typeof data.designated !== 'object') data.designated = base.designated;
    ['marks', 'overrides', 'handleAdds', 'handleRems'].forEach(function (k) {
      if (!data.designated[k] || typeof data.designated[k] !== 'object') data.designated[k] = {};
    });
    ['deleted', 'added'].forEach(function (k) {
      if (!Array.isArray(data.designated[k])) data.designated[k] = [];
    });
    if (!data.auto || typeof data.auto !== 'object') data.auto = base.auto;
    ['marks', 'removed', 'added', 'groupNames', 'sent'].forEach(function (k) {
      if (!data.auto[k] || typeof data.auto[k] !== 'object') data.auto[k] = {};
    });
    if (!Array.isArray(data.auto.custom)) data.auto.custom = [];
    if (!Array.isArray(data.auto.pool)) data.auto.pool = [];
    if (!Array.isArray(data.auto.groupDeleted)) data.auto.groupDeleted = [];
    if (!data.reinvest || typeof data.reinvest !== 'object') data.reinvest = base.reinvest;
    if (!data.reinvest.marks || typeof data.reinvest.marks !== 'object') data.reinvest.marks = {};
    if (!data.outreach || !Array.isArray(data.outreach.batches)) data.outreach = base.outreach;
    if (!Array.isArray(data.outreach.members)) data.outreach.members = [];
    Object.keys(base.settings).forEach(function (k) {
      if (data.settings[k] === undefined) data.settings[k] = base.settings[k];
    });
    if (!Array.isArray(data.rules) || !data.rules.length) data.rules = base.rules;
    return data;
  }

  function persist(skipCloud) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      if (App && App.showToast) App.showToast('本地存储写入失败（数据可能过大）');
    }
    if (!skipCloud) scheduleCloudPush();
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

  /* ---------- 建联名单 outreach（名单库模块二）----------
     批次 batch:
       { id, date:'2026-10-20', type:'old'|'hot'|'competitor'|'other',
         source:'halara us', sku:'2178', note:'', createdAt }
     成员 member:
       { id, batchId, handle, raw, email, sku, level, note, type,
         status:'pending'|'contacted'|'replied'|'success'|'fail'|'invalid',
         failReason, updatedAt, touches:[{date, channel, note}] }
     type / status 常量见 js/roster.js 的 OUTREACH_* 定义
     ⚠️ 与 roster（寄样名单）完全独立：不写飞书，只存本机
  ------------------------------------------------------------ */

  function getOutreach() {
    var db = load();
    if (!db.outreach) db.outreach = { batches: [], members: [] };
    return db.outreach;
  }

  function getBatches() { return getOutreach().batches; }
  function getBatch(id) { return getBatches().filter(function (b) { return b.id === id; })[0] || null; }

  function addBatch(batch) {
    var db = getOutreach();
    batch.id = batch.id || uid('batch');
    batch.createdAt = batch.createdAt || Date.now();
    db.batches.unshift(batch);
    persist();
    return batch;
  }

  function updateBatch(id, patch) {
    var b = getBatch(id);
    if (!b) return null;
    Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
    persist();
    return b;
  }

  function deleteBatch(id) {
    var db = getOutreach();
    db.batches = db.batches.filter(function (b) { return b.id !== id; });
    db.members = db.members.filter(function (m) { return m.batchId !== id; });
    persist();
  }

  function getMembers(batchId) {
    var ms = getOutreach().members;
    return batchId ? ms.filter(function (m) { return m.batchId === batchId; }) : ms;
  }

  function getMember(id) {
    return getOutreach().members.filter(function (m) { return m.id === id; })[0] || null;
  }

  // 批量加人：handle 已存在于同批次则跳过（跨批次允许重复）
  function addMembers(batchId, list) {
    var db = getOutreach();
    var exist = {};
    db.members.forEach(function (m) {
      if (m.batchId === batchId) exist[m.handle] = true;
    });
    var added = 0;
    list.forEach(function (m) {
      if (!m.handle || exist[m.handle]) return;
      exist[m.handle] = true;
      m.id = m.id || uid('om');
      m.batchId = batchId;
      m.status = m.status || 'pending';
      m.touches = m.touches || [];
      db.members.push(m);
      added++;
    });
    persist();
    return added;
  }

  function updateMember(id, patch) {
    var m = getMember(id);
    if (!m) return null;
    Object.keys(patch).forEach(function (k) { m[k] = patch[k]; });
    persist();
    return m;
  }

  function deleteMember(id) {
    var db = getOutreach();
    db.members = db.members.filter(function (m) { return m.id !== id; });
    persist();
  }

  // 记一次建联动作（渠道：TK私信 / 邮件 / 官号 / 抖音私信 / WhatsApp / 其他）
  function addTouch(id, channel, note) {
    var m = getMember(id);
    if (!m) return null;
    m.touches = m.touches || [];
    m.touches.push({ date: todayStr(), channel: channel, note: note || '' });
    if (m.status === 'pending') m.status = 'contacted';
    m.updatedAt = todayStr();
    persist();
    return m;
  }

  function setMemberStatus(id, status, failReason) {
    var m = getMember(id);
    if (!m) return null;
    m.status = status;
    m.failReason = (status === 'fail') ? (failReason || m.failReason || '') : '';
    m.updatedAt = todayStr();
    persist();
    return m;
  }

  // 添加一条建联记录（含结果/话术）：rec = {date, channel, result, script, note}
  function addMemberRecord(id, rec) {
    var m = getMember(id);
    if (!m) return null;
    m.touches = m.touches || [];
    m.touches.push({
      date: rec.date || todayStr(),
      channel: rec.channel || '其他',
      result: rec.result || '',
      script: rec.script || '',
      note: rec.note || '',
    });
    if (m.status === 'pending') m.status = 'contacted';
    m.updatedAt = todayStr();
    persist();
    return m;
  }

  function deleteMemberRecord(id, idx) {
    var m = getMember(id);
    if (!m || !m.touches || !m.touches[idx]) return false;
    m.touches.splice(idx, 1);
    persist();
    return true;
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
    // 全部规则（含内置）都可删——用户要求完全自助增删查改
    var db = load();
    var before = db.rules.length;
    db.rules = db.rules.filter(function (x) { return x.id !== id; });
    persist();
    return db.rules.length < before;
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

  /* ---------- 指定达人名单（模块三） ---------- */

  function getDesignated() { return load().designated; }

  function desMarks(cardId) {
    return getDesignated().marks[cardId] || [];
  }

  function desAddMark(cardId, date, product, note) {
    var db = load();
    if (!db.designated.marks[cardId]) db.designated.marks[cardId] = [];
    var m = { id: uid('dmark'), date: date || todayStr(), product: product || '', note: note || '' };
    db.designated.marks[cardId].push(m);
    persist();
    return m;
  }

  function desDeleteMark(cardId, markId) {
    var db = load();
    db.designated.marks[cardId] = (db.designated.marks[cardId] || [])
      .filter(function (m) { return m.id !== markId; });
    persist();
  }

  function desUpdateCard(cardId, patch) {
    var db = load();
    var o = db.designated.overrides[cardId] || {};
    Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
    db.designated.overrides[cardId] = o;
    persist();
  }

  function desDeleteCard(cardId) {
    var db = load();
    if (db.designated.deleted.indexOf(cardId) === -1) db.designated.deleted.push(cardId);
    persist();
  }

  function desRestoreCard(cardId) {
    var db = load();
    db.designated.deleted = db.designated.deleted.filter(function (x) { return x !== cardId; });
    persist();
  }

  function desAddCard(card) {
    var db = load();
    var c = {
      id: uid('dcard'),
      cat: card.cat || 'custom',
      catName: card.catName || '',
      store: card.store || '',
      title: card.title || '',
      product: card.product || '',
      note: card.note || '',
      img: card.img || '',
      handles: (card.handles || []).slice(),
    };
    db.designated.added.push(c);
    persist();
    return c;
  }

  function desAddHandles(cardId, handles) {
    var db = load();
    var a = db.designated.handleAdds[cardId] || [];
    handles.forEach(function (h) {
      if (h && a.indexOf(h) === -1) a.push(h);
    });
    db.designated.handleAdds[cardId] = a;
    persist();
  }

  function desRemoveHandle(cardId, handle) {
    var db = load();
    var r = db.designated.handleRems[cardId] || [];
    if (r.indexOf(handle) === -1) r.push(handle);
    db.designated.handleRems[cardId] = r;
    // 如果是本机新增的，直接从 handleAdds 里删掉
    db.designated.handleAdds[cardId] = (db.designated.handleAdds[cardId] || [])
      .filter(function (h) { return h !== handle; });
    persist();
  }

  /* ---------- 自动达人名单（模块一 Excel 导入） ---------- */
  function getAuto() { return load().auto; }

  // 某组已发标记: { handle: {date, note} }
  function autoMarks(groupId) { return (load().auto.marks[groupId] || {}); }

  function autoMark(groupId, handle, date, note) {
    var db = load();
    if (!db.auto.marks[groupId]) db.auto.marks[groupId] = {};
    db.auto.marks[groupId][handle] = { date: date || todayStr(), note: note || '' };
    persist();
  }

  function autoUnmark(groupId, handle) {
    var db = load();
    if (db.auto.marks[groupId]) {
      delete db.auto.marks[groupId][handle];
      if (Object.keys(db.auto.marks[groupId]).length === 0) delete db.auto.marks[groupId];
    }
    persist();
  }

  function autoRemoveHandle(groupId, handle) {
    var db = load();
    var r = db.auto.removed[groupId] || [];
    if (r.indexOf(handle) === -1) r.push(handle);
    db.auto.removed[groupId] = r;
    // 若本机新增过，一并清掉
    db.auto.added[groupId] = (db.auto.added[groupId] || []).filter(function (h) { return h !== handle; });
    persist();
  }

  function autoAddHandle(groupId, handle) {
    var db = load();
    var a = db.auto.added[groupId] || [];
    if (handle && a.indexOf(handle) === -1) a.push(handle);
    db.auto.added[groupId] = a;
    // 撤销移除
    db.auto.removed[groupId] = (db.auto.removed[groupId] || []).filter(function (h) { return h !== handle; });
    persist();
  }

  function autoAddGroup(name, handles) {
    var db = load();
    var id = 'c' + uid();
    db.auto.custom.push({ id: id, name: name, handles: handles || [] });
    persist();
    return id;
  }

  function autoDeleteGroup(id) {
    var db = load();
    db.auto.custom = db.auto.custom.filter(function (g) { return g.id !== id; });
    persist();
  }

  function autoGroupName(id) {
    var db = load();
    for (var i = 0; i < db.auto.custom.length; i++) {
      if (db.auto.custom[i].id === id) return db.auto.custom[i].name;
    }
    return '';
  }

  /* ---------- 达人池（模块一，不按 SKU 存） ---------- */

  function poolList() { return load().auto.pool || []; }

  function poolAdd(handles) {
    var db = load();
    var p = db.auto.pool || [];
    var set = {};
    p.forEach(function (h) { set[h] = true; });
    var n = 0;
    (handles || []).forEach(function (h) {
      h = String(h || '').trim().toLowerCase();
      if (h && !set[h]) { p.push(h); set[h] = true; n++; }
    });
    db.auto.pool = p;
    persist();
    return n;
  }

  function poolRemove(handle) {
    var db = load();
    db.auto.pool = (db.auto.pool || []).filter(function (h) { return h !== handle; });
    persist();
  }

  function poolClear() {
    var db = load();
    db.auto.pool = [];
    persist();
  }

  // 按 SKU 标记已发：sent[handle][sku] = {date, note}
  function poolSentMark(handle, sku, date, note) {
    var db = load();
    if (!db.auto.sent[handle]) db.auto.sent[handle] = {};
    db.auto.sent[handle][sku] = { date: date || todayStr(), note: note || '' };
    persist();
  }

  function poolSentUnmark(handle, sku) {
    var db = load();
    if (db.auto.sent[handle]) {
      delete db.auto.sent[handle][sku];
      if (!Object.keys(db.auto.sent[handle]).length) delete db.auto.sent[handle];
    }
    persist();
  }

  // 分组改名（静态分组存覆盖，自建分组直接改）
  function autoRenameGroup(id, name) {
    var db = load();
    var g = (db.auto.custom || []).filter(function (x) { return x.id === id; })[0];
    if (g) { g.name = name; } else { db.auto.groupNames[id] = name; }
    persist();
  }

  // 删除任意分组（含静态）：静态走 groupDeleted 名单
  function autoDeleteGroupAny(id) {
    var db = load();
    db.auto.custom = (db.auto.custom || []).filter(function (x) { return x.id !== id; });
    if (db.auto.groupDeleted.indexOf(id) === -1) db.auto.groupDeleted.push(id);
    delete db.auto.marks[id];
    delete db.auto.removed[id];
    delete db.auto.added[id];
    persist();
  }

  /* ---------- 复投名单（模块二 Excel 导入） ---------- */
  function getReinvest() { return load().reinvest; }

  // 某记录标记: { status, note, date }
  function reinvestMark(id, status, note, date) {
    var db = load();
    db.reinvest.marks[id] = { status: status || 'contacted', note: note || '', date: date || todayStr() };
    persist();
  }

  function reinvestUnmark(id) {
    var db = load();
    delete db.reinvest.marks[id];
    persist();
  }

  /* ---------- 云同步（Cloudflare KV · /api/roster） ----------
   * 所有改动 persist 后自动防抖上云；打开页面时拉取云端，
   * 云端更新（_updatedAt 更大）则覆盖本地，否则把本地推上去。
   * 断网 / 本地预览（无 Functions）时静默降级为纯本地。
   * ------------------------------------------------------------- */
  var cloudTimer = null;
  var cloudBusy = false;   // 拉取覆盖写盘时不再触发推送
  var cloudState = 'init'; // init | offline | syncing | synced | error

  function scheduleCloudPush() {
    if (cloudTimer) clearTimeout(cloudTimer);
    cloudTimer = setTimeout(cloudPush, 2000);
  }

  function cloudPush() {
    if (!global.fetch || cloudBusy) return;
    var payload;
    try { cache._updatedAt = Date.now(); payload = JSON.stringify(load()); } catch (e) { return; }
    cloudState = 'syncing';
    notifyCloud();
    global.fetch('./api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cloudState = 'synced';
      notifyCloud();
    }).catch(function () {
      cloudState = 'offline';
      notifyCloud();
    });
  }

  function cloudPull(cb) {
    if (!global.fetch) { if (cb) cb('nofetch'); return; }
    cloudState = 'syncing';
    notifyCloud();
    global.fetch('./api/roster?_=' + Date.now(), { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cloud) {
        if (!cloud || typeof cloud !== 'object' || !cloud.settings) {
          // 云端为空 → 把本地推上去
          scheduleCloudPush();
          if (cb) cb('pushed');
          return;
        }
        var local = load();
        var cu = cloud._updatedAt || 0;
        var lu = local._updatedAt || 0;
        if (cu > lu) {
          cloudBusy = true;
          cache = normalize(cloud);
          persist(true);
          cloudBusy = false;
          cloudState = 'synced';
          notifyCloud();
          if (cb) cb('applied');
        } else {
          scheduleCloudPush();
          if (cb) cb('local-newer');
        }
      })
      .catch(function () {
        cloudState = 'offline';
        notifyCloud();
        if (cb) cb('offline');
      });
  }

  // 通知各页面同步状态（可选监听）
  var cloudListeners = [];
  function onCloudChange(fn) { cloudListeners.push(fn); }
  function notifyCloud() {
    cloudListeners.forEach(function (fn) {
      try { fn(cloudState); } catch (e) {}
    });
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
    ['roster', 'groups', 'outreach', 'designated', 'auto', 'reinvest', 'rules', 'tracking', 'settings'].forEach(function (k) {
      base[k] = data[k] !== undefined ? data[k] : base[k];
    });
    if (!base.designated || typeof base.designated !== 'object') base.designated = defaults().designated;
    if (!base.outreach || !Array.isArray(base.outreach.batches)) base.outreach = defaults().outreach;
    if (!base.auto || typeof base.auto !== 'object') base.auto = defaults().auto;
    if (!base.reinvest || typeof base.reinvest !== 'object') base.reinvest = defaults().reinvest;
    cache = normalize(base);
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
    // outreach（建联名单）
    getOutreach: getOutreach,
    getBatches: getBatches,
    getBatch: getBatch,
    addBatch: addBatch,
    updateBatch: updateBatch,
    deleteBatch: deleteBatch,
    getMembers: getMembers,
    getMember: getMember,
    addMembers: addMembers,
    updateMember: updateMember,
    deleteMember: deleteMember,
    addTouch: addTouch,
    setMemberStatus: setMemberStatus,
    addMemberRecord: addMemberRecord,
    deleteMemberRecord: deleteMemberRecord,
    // designated（指定达人名单）
    getDesignated: getDesignated,
    desMarks: desMarks,
    desAddMark: desAddMark,
    desDeleteMark: desDeleteMark,
    desUpdateCard: desUpdateCard,
    desDeleteCard: desDeleteCard,
    desRestoreCard: desRestoreCard,
    desAddCard: desAddCard,
    desAddHandles: desAddHandles,
    desRemoveHandle: desRemoveHandle,
    // auto（自动达人名单）
    getAuto: getAuto,
    autoMarks: autoMarks,
    autoMark: autoMark,
    autoUnmark: autoUnmark,
    autoRemoveHandle: autoRemoveHandle,
    autoAddHandle: autoAddHandle,
    autoAddGroup: autoAddGroup,
    autoDeleteGroup: autoDeleteGroup,
    autoGroupName: autoGroupName,
    autoRenameGroup: autoRenameGroup,
    autoDeleteGroupAny: autoDeleteGroupAny,
    // pool（达人池）
    poolList: poolList,
    poolAdd: poolAdd,
    poolRemove: poolRemove,
    poolClear: poolClear,
    poolSentMark: poolSentMark,
    poolSentUnmark: poolSentUnmark,
    // 云同步
    cloudPull: cloudPull,
    cloudPush: cloudPush,
    onCloudChange: onCloudChange,
    getCloudState: function () { return cloudState; },
    // reinvest（复投名单）
    getReinvest: getReinvest,
    reinvestMark: reinvestMark,
    reinvestUnmark: reinvestUnmark,
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
