/* ================================================================
   Dlooda TKBD CRM — Data Layer (v2)
   基于真实飞书导出数据 (real-data.js)
   ================================================================
   数据来源：飞书多维表格导出 hhhh.xlsx
   - 每日寄样 → creators + samples (1746达人, 2820条寄样)
   - 暂定寄样达人 → pending (214条)
   - 邀约达人 → invites (383条, 含真实话术)
   - 本月寄样任务完成情况 → tasks (28条)
   - 产品定位 → skus (26个SKU)
   ================================================================
   飞书API接入时：替换 REAL_DATA 来源即可
   ================================================================ */

(function (global) {
  'use strict';

  // 优先使用「从飞书 Excel 上传」的数据（localStorage 持久化，刷新后仍在）
  var D = (global.REAL_DATA) || { creators: [], samples: [], pending: [], invites: [], tasks: [], skus: [] };
  try {
    var _up = global.localStorage && global.localStorage.getItem('dlooda_uploaded_data');
    if (_up) { var _parsed = JSON.parse(_up); if (_parsed && _parsed.samples) D = _parsed; }
  } catch (e) {}
  var STATS = global.REAL_DATA_STATS || {};
  try {
    var _ups = global.localStorage && global.localStorage.getItem('dlooda_uploaded_stats');
    if (_ups) { var _ps = JSON.parse(_ups); if (_ps && typeof _ps === 'object') STATS = _ps; }
  } catch (e) {}

  /* ---------- 数据规范化：飞书导出的 category / creatorType 是数组，
     统一转成逗号分隔字符串，避免各页面 .toLowerCase() / .split() 调用报错 ---------- */
  function normFieldToStr(v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.join(',');
    return String(v);
  }
  ['creators', 'samples', 'invites', 'pending', 'skus'].forEach(function (key) {
    if (D[key] && D[key].length) {
      D[key].forEach(function (rec) {
        if (rec.category !== undefined && rec.category !== null) rec.category = normFieldToStr(rec.category);
        if (rec.creatorType !== undefined && rec.creatorType !== null) rec.creatorType = normFieldToStr(rec.creatorType);
        if (rec.fulfillMethod !== undefined && rec.fulfillMethod !== null) rec.fulfillMethod = normFieldToStr(rec.fulfillMethod);
      });
    }
  });

  /* ---------- SKU 产品信息（话术生成 + 产品管理页用） ---------- */
  // 用户确认的产品定位表，BD 统一话术参考
  // 可在 products.html 页面编辑，编辑后存 localStorage 覆盖默认值
  var SKU_DETAILS = {
    '2178': {
      productName: 'Work Pants (Micro Flare)',
      productType: '长裤',
      positioning: '秋季主推爆款 / 高转化款',
      internalLabel: '秋季第一主推爆款（预算最大）',
      productDesc: '高腰微喇版型，修饰腿型，版型利落，舒适有弹力，适合通勤、日常穿搭，秋冬非常百搭。',
      productDescEn: 'signature high-waisted micro-flare fit, flattering leg shape, clean silhouette, soft stretchy fabric, perfect for commute and everyday fall styling',
      targetCreators: 'Office, Daily Outfit, Petite, Try-on',
      sellingPoints: '高腰微喇修饰腿型；舒适有弹力；秋冬百搭；高转化',
      painPoints: '',
      defaultCommission: '15% + 10%',
      priority: 'high',
    },
    '2190': {
      productName: 'Work Pants (Upgraded)',
      productType: '长裤',
      positioning: '秋冬升级爆款',
      internalLabel: '升级版通勤爆款',
      productDesc: '2178升级版，版型更挺括，面料更顺滑，上身更高级，适合打造精致通勤穿搭。',
      productDescEn: 'upgraded version of our best-seller, smoother fabric, more structured fit, elevated look for refined commute styling',
      targetCreators: 'Office, Fashion, Lifestyle',
      sellingPoints: '2178升级版；版型更挺括；面料更顺滑；上身更高级',
      painPoints: '',
      defaultCommission: '16% + 10%',
      priority: 'high',
    },
    '2189': {
      productName: 'Work Pants (Classic)',
      productType: '长裤',
      positioning: '经典热卖 / 补货回归',
      internalLabel: '经典爆款补货款',
      productDesc: '长期热卖，版型稳定，高腰修身，上身显腿长，适合各种日常穿搭。',
      productDescEn: 'long-time best-seller, stable fit, high-waisted slim cut, leg-lengthening effect, perfect for everyday outfits',
      targetCreators: 'Office, Daily, Capsule Wardrobe',
      sellingPoints: '经典热卖；版型稳定；高腰修身显腿长；适合第一次合作',
      painPoints: '',
      defaultCommission: '13% + 8%',
      priority: 'medium',
    },
    '28173': {
      productName: 'Wide Leg Work Pants',
      productType: '长裤',
      positioning: '高级感阔腿裤',
      internalLabel: '高级感阔腿爆款',
      productDesc: '垂坠感很好，宽腿版型显高级，轻松打造慵懒又有质感的穿搭，秋冬很好搭配。',
      productDescEn: 'relaxed silhouette, beautiful flowy drape, wide-leg cut for an elevated look, effortless and refined, easy to style for fall',
      targetCreators: 'Fashion, Lifestyle, Curvy, Petite',
      sellingPoints: '垂坠感好；宽腿显高级；慵懒有质感；秋冬好搭',
      painPoints: '',
      defaultCommission: '15% + 10%',
      priority: 'high',
    },
    '28193': {
      productName: 'Work Pants (New)',
      productType: '长裤',
      positioning: '新品测试款 / 高客单',
      internalLabel: '新款潜力款',
      productDesc: '版型更时尚，适合喜欢尝试新品和高级感穿搭的达人。',
      productDescEn: 'fashion-forward cut, perfect for creators who love trying new styles and elevated aesthetics',
      targetCreators: 'Fashion Creator',
      sellingPoints: '版型更时尚；适合高质量达人；高客单',
      painPoints: '',
      defaultCommission: '13% + 9%',
      priority: 'medium',
    },
    '2722': {
      productName: 'Crossover Skort',
      productType: 'Skort',
      positioning: '夏季热卖爆款 / 清仓主推',
      internalLabel: '夏季清仓爆款',
      productDesc: '高腰交叉腰设计，内置安全裤+口袋，上身显瘦，旅行、日常、网球、Golf都很好搭。点击率、转化一直不错。',
      productDescEn: 'flattering high-waisted crossover design, built-in shorts and side pockets, slimming fit, great for travel, daily, tennis and golf, consistently high CTR and conversion',
      targetCreators: 'Try-on, Travel, Lifestyle, Tennis',
      sellingPoints: '高腰交叉显瘦；内置安全裤+口袋；旅行/网球/Golf好搭；高点击高转化；适合第一次合作',
      painPoints: '',
      defaultCommission: '11% + 8%',
      priority: 'high',
    },
    '2757': {
      productName: 'Lace Skort',
      productType: 'Skort',
      positioning: '秋季新品爆款 / 高佣活动',
      internalLabel: '秋季新品爆款（重点推）',
      productDesc: '蕾丝拼接设计，比普通Skort更有设计感，甜酷风，拍照、约会、日常都很好看，秋季重点推广。',
      productDescEn: 'layered lace design, more stylish than a basic skort, sweet-cool vibe, great for photos, dates and daily wear, key push for fall',
      targetCreators: 'Fashion, Girly, Lifestyle',
      sellingPoints: '蕾丝拼接有设计感；甜酷风；拍照约会日常都好看；秋季重点推广',
      painPoints: '',
      defaultCommission: '15% + 8%',
      priority: 'high',
    },
    '2789': {
      productName: 'Four-Pocket Skort',
      productType: 'Skort',
      positioning: '实用日常款',
      internalLabel: '日常基础Skort（辅助推广）',
      productDesc: '高腰、四口袋、内置安全裤，舒适百搭，偏日常休闲，适合旅行、遛街、日常OOTD。',
      productDescEn: 'high-waisted, four functional pockets, built-in shorts, comfortable and versatile, great for travel, casual outings and daily OOTD',
      targetCreators: 'Daily, Mom, Lifestyle',
      sellingPoints: '高腰四口袋；内置安全裤；舒适百搭；偏日常休闲',
      painPoints: '不建议作为第一推荐SKU',
      defaultCommission: '12% + 8%',
      priority: 'low',
    },
  };

  function enrichSKU(sku) {
    if (!sku) return sku;
    var detail = getSKUDetail(sku.sku);
    var fallbackName = sku.positioning === '爆品' ? 'Best-Selling Style' :
                       sku.positioning === '销售' ? 'Customer Favorite' :
                       sku.positioning === '测品' ? 'New Test Style' : 'Selected Style';
    sku.productName = detail.productName || fallbackName;
    sku.productDesc = detail.productDesc || 'flattering fit, soft fabric, easy to style';
    sku.defaultCommission = detail.defaultCommission || '12% + 8%';
    // 附加完整产品信息（供 products 页面和 AI 使用）
    sku.productType = detail.productType || '';
    sku.positioningLabel = detail.positioning || '';
    sku.internalLabel = detail.internalLabel || '';
    sku.productDescCn = detail.productDesc || '';
    sku.productDescEn = detail.productDescEn || sku.productDesc;
    sku.targetCreators = detail.targetCreators || '';
    sku.sellingPoints = detail.sellingPoints || '';
    sku.painPoints = detail.painPoints || '';
    sku.priority = detail.priority || 'medium';
    return sku;
  }

  /* ---------- localStorage 覆盖层（产品页编辑） ---------- */
  function getSKUOverrides() {
    try {
      return JSON.parse(global.localStorage.getItem('dlooda_sku_overrides') || '{}');
    } catch (e) { return {}; }
  }

  function getSKUDetail(skuCode) {
    var overrides = getSKUOverrides();
    var base = SKU_DETAILS[skuCode] || {};
    var override = overrides[skuCode] || {};
    return Object.assign({}, base, override);
  }

  function saveSKUOverride(skuCode, detail) {
    var overrides = getSKUOverrides();
    overrides[skuCode] = detail;
    try {
      global.localStorage.setItem('dlooda_sku_overrides', JSON.stringify(overrides));
    } catch (e) {}
    // SKU 信息变了，依赖它的分析结果缓存必须作废，否则产品页改完仍显示旧名称/定位
    clearCache();
  }

  function getAllSKUDetails() {
    // 合并飞书 SKU 列表 + SKU_DETAILS + localStorage 覆盖
    var result = {};
    // 先放飞书导出的 SKU
    D.skus.forEach(function (s) {
      result[s.sku] = getSKUDetail(s.sku);
      result[s.sku].sku = s.sku;
      if (s.positioning) result[s.sku].feishuPositioning = s.positioning;
      if (s.productId) result[s.sku].productId = s.productId;
    });
    // 再放 SKU_DETAILS 里的（可能飞书没有但用户定义了）
    Object.keys(SKU_DETAILS).forEach(function (code) {
      if (!result[code]) {
        result[code] = getSKUDetail(code);
        result[code].sku = code;
      }
    });
    // 再放 localStorage 里用户新增的
    var overrides = getSKUOverrides();
    Object.keys(overrides).forEach(function (code) {
      if (!result[code]) {
        result[code] = Object.assign({ sku: code }, overrides[code]);
      }
    });
    return Object.values(result);
  }

  /* ========== 达人数据 ========== */

  function getCreators() {
    return D.creators.map(function (c) { return Object.assign({}, c); });
  }

  function getCreatorByName(name) {
    var found = D.creators.find(function (c) { return c.name === name; });
    return found ? Object.assign({}, found) : null;
  }

  function searchCreators(keyword) {
    if (!keyword) return getCreators();
    var kw = keyword.toLowerCase().trim();
    function fieldStr(v) { return Array.isArray(v) ? v.join(' ') : (v == null ? '' : String(v)); }
    return getCreators().filter(function (c) {
      return c.name.toLowerCase().includes(kw) ||
             fieldStr(c.category).toLowerCase().includes(kw) ||
             (c.note && c.note.toLowerCase().includes(kw)) ||
             fieldStr(c.creatorType).toLowerCase().includes(kw) ||
             (c.official && c.official.toLowerCase().includes(kw));
    });
  }

  function getCreatorsByFilter(filters) {
    return getCreators().filter(function (c) {
      if (filters.official && c.official !== filters.official) return false;
      if (filters.stars && c.stars !== filters.stars) return false;
      if (filters.creatorType && c.creatorType !== filters.creatorType) return false;
      if (filters.bodyType && c.bodyType !== filters.bodyType) return false;
      if (filters.fulfillment && c.fulfillment !== filters.fulfillment) return false;
      if (filters.category && c.category !== filters.category) return false;
      return true;
    });
  }

  function getCreatorStats() {
    var creators = D.creators;
    var byOfficial = {};
    var byStars = {};
    var byType = {};
    creators.forEach(function (c) {
      if (c.official) byOfficial[c.official] = (byOfficial[c.official] || 0) + 1;
      if (c.stars) byStars[c.stars] = (byStars[c.stars] || 0) + 1;
      if (c.creatorType) byType[c.creatorType] = (byType[c.creatorType] || 0) + 1;
    });
    return {
      total: creators.length,
      byOfficial: byOfficial,
      byStars: byStars,
      byType: byType,
    };
  }

  /* ========== SKU数据 ========== */

  function getSKUs() {
    return D.skus.map(function (s) { return enrichSKU(Object.assign({}, s)); });
  }

  function getSKUByCode(sku) {
    var found = D.skus.find(function (s) { return s.sku === sku; });
    return found ? enrichSKU(Object.assign({}, found)) : null;
  }

  function getSKUsByPositioning(pos) {
    if (!pos || pos === 'all') return getSKUs();
    return getSKUs().filter(function (s) { return s.positioning === pos; });
  }

  // 定位档位：爆品(0) > 销售(1) > 测品(2) > 撤退(3)；其余(99)
  function getSKUPositionTier(sku) {
    if (!sku) return 99;
    var f = D.skus.find(function (s) { return s.sku === sku; });
    var feishuPos = f ? f.positioning : '';
    var detail = getSKUDetail(sku);
    var humanPos = detail.positioning || '';
    var pos = feishuPos || humanPos;
    if (pos.indexOf('爆品') >= 0 || pos.indexOf('爆款') >= 0) return 0;
    if (pos.indexOf('销售') >= 0) return 1;
    if (pos.indexOf('测品') >= 0 || pos.indexOf('测试') >= 0) return 2;
    if (pos.indexOf('撤退') >= 0) return 3;
    // 无明确定位时回退到优先级
    var p = detail.priority;
    if (p === 'high') return 0;
    if (p === 'low') return 3;
    return 1;
  }

  // 按定位档位排序（爆品→销售→测品→撤退），同档按优先级，再按 SKU
  function sortByPositioning(list) {
    var priorityOrder = { high: 0, medium: 1, low: 2 };
    return list.slice().sort(function (a, b) {
      var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      var pa = priorityOrder[a.priority] != null ? priorityOrder[a.priority] : 1;
      var pb = priorityOrder[b.priority] != null ? priorityOrder[b.priority] : 1;
      if (pa !== pb) return pa - pb;
      return String(a.sku || '').localeCompare(String(b.sku || ''));
    });
  }

  /* ========== 寄样记录 ========== */

  function getSamples() {
    return D.samples.map(function (s) {
      return {
        creator: s.creator,
        official: s.official,
        stars: s.stars,
        creatorType: s.creatorType,
        orderCount: s.orderCount,
        reinvest: s.reinvest,
        approval: s.approval,
        bodyType: s.bodyType,
        age: s.age,
        fulfillment: s.fulfillment,
        category: s.category,
        note: s.note,
        color: s.color,
        sku: s.sku,
        sampleTime: s.sampleTime,
        updateTime: s.updateTime,
        fulfillMethod: s.fulfillMethod,
        videoCount: s.videos.length,
        videos: s.videos.slice(),
      };
    });
  }

  function getSamplesByCreator(name) {
    return getSamples().filter(function (s) { return s.creator === name; });
  }

  function getSamplesBySKU(sku) {
    return getSamples().filter(function (s) { return s.sku === sku; });
  }

  function getSamplesByFulfillMethod(method) {
    if (!method || method === 'all') return getSamples();
    return getSamples().filter(function (s) { return s.fulfillMethod === method; });
  }

  function getSampleStats() {
    var samples = D.samples;
    var byMethod = {};
    var bySKU = {};
    var byColor = {};
    var totalVideos = 0;
    samples.forEach(function (s) {
      if (s.fulfillMethod) byMethod[s.fulfillMethod] = (byMethod[s.fulfillMethod] || 0) + 1;
      if (s.sku) bySKU[s.sku] = (bySKU[s.sku] || 0) + 1;
      if (s.color) byColor[s.color] = (byColor[s.color] || 0) + 1;
      totalVideos += s.videos.length;
    });
    return {
      total: samples.length,
      byMethod: byMethod,
      bySKU: bySKU,
      byColor: byColor,
      totalVideos: totalVideos,
      withVideo: samples.filter(function (s) { return s.videos.length > 0; }).length,
      withoutVideo: samples.filter(function (s) { return s.videos.length === 0; }).length,
    };
  }

  /* ========== 邀约数据 ========== */

  function getInvites() {
    return D.invites.map(function (i) { return Object.assign({}, i); });
  }

  function getInvitesWithScripts() {
    return D.invites.filter(function (i) { return i.script && i.script.length > 20; }).map(function (i) { return Object.assign({}, i); });
  }

  function getInvitesBySKU(sku) {
    return D.invites.filter(function (i) { return i.sku === sku; }).map(function (i) { return Object.assign({}, i); });
  }

  function getInviteStats() {
    var invites = D.invites;
    var bySKU = {};
    var byCommission = {};
    var withScript = 0;
    var totalAchieved = 0;
    invites.forEach(function (i) {
      if (i.sku) bySKU[i.sku] = (bySKU[i.sku] || 0) + 1;
      if (i.commission) byCommission[i.commission] = (byCommission[i.commission] || 0) + 1;
      if (i.script && i.script.length > 20) withScript++;
      if (i.achieved) totalAchieved += i.achieved;
    });
    return {
      total: invites.length,
      withScript: withScript,
      bySKU: bySKU,
      byCommission: byCommission,
      totalAchieved: totalAchieved,
    };
  }

  // 邀约达成数量（achieved字段总和，支持日期+SKU筛选）
  function getInviteAchievedCount(startDate, endDate, sku) {
    var filtered = D.invites;
    if (sku) filtered = filtered.filter(function (i) { return i.sku === sku; });
    if (startDate) filtered = filtered.filter(function (i) { return i.date && i.date >= startDate; });
    if (endDate) filtered = filtered.filter(function (i) { return i.date && i.date <= endDate + ' 23:59'; });
    var total = 0;
    filtered.forEach(function (i) { if (i.achieved) total += i.achieved; });
    return total;
  }

  /* ========== 暂定寄样达人 ========== */

  function getPending() {
    return D.pending.map(function (p) { return Object.assign({}, p); });
  }

  function getPendingStats() {
    var pending = D.pending;
    var byReason = {};
    pending.forEach(function (p) {
      if (p.rejectReason) byReason[p.rejectReason] = (byReason[p.rejectReason] || 0) + 1;
    });
    return {
      total: pending.length,
      byReason: byReason,
    };
  }

  /* ========== 本月寄样任务 ========== */

  function getTasks() {
    return D.tasks.map(function (t) { return Object.assign({}, t); });
  }

  function getTasksByPriority(priority) {
    if (!priority || priority === 'all') return getTasks();
    return getTasks().filter(function (t) { return t.priority === priority; });
  }

  // 按月分组获取寄样任务，每月按 P0>P1>P2 排序
  function getTasksByMonth() {
    var byMonth = {};
    D.tasks.forEach(function (t) {
      if (!t.startTime) return;
      var monthKey = t.startTime.substring(0, 7); // "2026-08"
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(t);
    });
    // 按月降序排列，每月内按优先级排序
    var priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
    var months = Object.keys(byMonth).sort(function (a, b) { return b > a ? 1 : -1; });
    return months.map(function (month) {
      var tasks = byMonth[month].sort(function (a, b) {
        var pa = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
        var pb = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
        return pa - pb;
      }).map(function (t) {
        var detail = getSKUDetail(t.sku);
        return Object.assign({}, t, {
          productName: detail.productName || '',
          productType: detail.productType || '',
          positioningLabel: detail.positioning || t.positioning || '',
        });
      });
      return { month: month, tasks: tasks };
    });
  }

  // 获取当前月份的任务
  function getCurrentMonthTasks() {
    var d = new Date();
    var monthKey = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    var byMonth = getTasksByMonth();
    var found = byMonth.find(function (m) { return m.month === monthKey; });
    return found ? found.tasks : [];
  }

  // 获取某月任务的实际寄样完成量
  function getTaskActualSamples(sku, month) {
    var samples = D.samples.filter(function (s) { return s.sku === sku; });
    if (month) {
      samples = samples.filter(function (s) {
        return s.sampleTime && s.sampleTime.startsWith(month);
      });
    }
    return samples.length;
  }

  // 获取某 SKU 今日的实际寄样完成量（用于寄样任务表「今日已完成」列）
  // 与日报口径一致：寄样时间有 1 天误差，因此同时计入今天和前一天
  // 兼容"2026-08-09 09:09"这种带时分格式
  //
  // month（可选，"YYYY-MM"）：限定只统计落在该月的记录。
  // 寄样任务表按月分组，若不限定，7 月的表格也会显示今天的数字，造成误读；
  // 另外跨月边界（如 8/1 的前一天是 7/31）也靠这个参数正确归属到各自月份。
  function getTaskTodaySamples(sku, month) {
    var today = getTodayStr();
    var prevDayStr = shiftDate(today, -1);
    return D.samples.filter(function (s) {
      if (s.sku !== sku || !s.sampleTime) return false;
      var hit = s.sampleTime.startsWith(today) || s.sampleTime.startsWith(prevDayStr);
      if (!hit) return false;
      if (month && s.sampleTime.slice(0, 7) !== month) return false;
      return true;
    }).length;
  }

  // 本月剩余工作日天数（含今天，剔除周末），用于计算"剩余平均寄样量"
  // 例：本月还剩 16 个工作日，剩余 86 件 → 平均每天需寄 86/16 ≈ 5.4 件
  function getRemainingWorkdays(month) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var y = parseInt(month.substring(0, 4), 10);
    var m = parseInt(month.substring(5, 7), 10) - 1; // 0-based 月份
    var monthStart = new Date(y, m, 1);
    var monthEnd = new Date(y, m + 1, 0); // 当月最后一天
    if (monthEnd < today) return 0; // 已过月份无剩余工作日
    var start = monthStart > today ? monthStart : today; // 未来月份从 1 号算，本月从今天算
    var count = 0;
    for (var d = new Date(start); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) count++; // 0=周日 6=周六，剔除周末
    }
    return count;
  }

  function getTaskStats() {
    var tasks = D.tasks;
    var totalTarget = 0;
    var totalCompleted = 0;
    tasks.forEach(function (t) {
      if (t.target) totalTarget += t.target;
      if (t.completed) totalCompleted += t.completed;
    });
    return {
      total: tasks.length,
      totalTarget: totalTarget,
      totalCompleted: totalCompleted,
      completionRate: totalTarget > 0 ? Math.round(totalCompleted / totalTarget * 100) : 0,
    };
  }

  /* ========== 视频数据（从寄样记录提取） ========== */

  function getVideos() {
    var videos = [];
    D.samples.forEach(function (s) {
      s.videos.forEach(function (v, idx) {
        videos.push({
          creator: s.creator,
          official: s.official,
          stars: s.stars,
          sku: s.sku,
          color: s.color,
          url: v.url,
          postTime: v.time,
          sampleTime: s.sampleTime,
          fulfillMethod: s.fulfillMethod,
          category: s.category,
        });
      });
    });
    return videos;
  }

  function getVideosByCreator(name) {
    return getVideos().filter(function (v) { return v.creator === name; });
  }

  function getVideosBySKU(sku) {
    return getVideos().filter(function (v) { return v.sku === sku; });
  }

  function getVideoStats() {
    var videos = getVideos();
    var bySKU = {};
    var byCreator = {};
    videos.forEach(function (v) {
      if (v.sku) bySKU[v.sku] = (bySKU[v.sku] || 0) + 1;
      if (v.creator) byCreator[v.creator] = (byCreator[v.creator] || 0) + 1;
    });
    return {
      total: videos.length,
      bySKU: bySKU,
      byCreator: byCreator,
      uniqueCreatorsWithVideo: Object.keys(byCreator).length,
    };
  }

  /* ========== 复盘数据（支持筛选） ========== */

  function getReportData(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var filteredVideos = [];
    samples.forEach(function (s) {
      s.videos.forEach(function (v) {
        filteredVideos.push({ creator: s.creator, sku: s.sku, color: s.color, postTime: v.time, sampleTime: s.sampleTime, category: s.category });
      });
    });
    var taskStats = getTaskStats();
    var inviteStats = getInviteStats();

    // 从筛选样品重新计算统计
    var byMethod = {};
    var bySKU = {};
    var byColor = {};
    var totalVideos = 0;
    var creatorSet = {};
    var byOfficial = {};
    samples.forEach(function (s) {
      if (s.fulfillMethod) byMethod[s.fulfillMethod] = (byMethod[s.fulfillMethod] || 0) + 1;
      if (s.sku) bySKU[s.sku] = (bySKU[s.sku] || 0) + 1;
      if (s.color) byColor[s.color] = (byColor[s.color] || 0) + 1;
      totalVideos += s.videos.length;
      creatorSet[s.creator] = true;
      if (s.official) byOfficial[s.official] = (byOfficial[s.official] || 0) + 1;
    });
    var byCreator = {};
    filteredVideos.forEach(function (v) {
      if (v.creator) byCreator[v.creator] = (byCreator[v.creator] || 0) + 1;
    });

    var sampleStats = {
      total: samples.length,
      byMethod: byMethod,
      bySKU: bySKU,
      byColor: byColor,
      totalVideos: totalVideos,
      withVideo: samples.filter(function (s) { return s.videos.length > 0; }).length,
      withoutVideo: samples.filter(function (s) { return s.videos.length === 0; }).length,
    };
    var videoStats = {
      total: filteredVideos.length,
      bySKU: bySKU,
      byCreator: byCreator,
      uniqueCreatorsWithVideo: Object.keys(byCreator).length,
    };

    // SKU 排名（按寄样量）
    var skuRanking = Object.entries(sampleStats.bySKU)
      .map(function (entry) {
        var skuCode = entry[0];
        var count = entry[1];
        var skuInfo = getSKUByCode(skuCode);
        return {
          sku: skuCode,
          positioning: skuInfo ? skuInfo.positioning : '—',
          sampleCount: count,
          videoCount: videoStats.bySKU[skuCode] || 0,
        };
      })
      .sort(function (a, b) {
        // 先按产品定位档位（爆品→销售→测品→撤退），同档按寄样量降序
        var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
        if (ta !== tb) return ta - tb;
        return b.sampleCount - a.sampleCount;
      });

    // 达人排名（按视频数）
    var creatorRanking = Object.entries(videoStats.byCreator)
      .map(function (entry) {
        var name = entry[0];
        var videoCount = entry[1];
        var creator = getCreatorByName(name);
        return {
          name: name,
          official: creator ? creator.official : '—',
          stars: creator ? creator.stars : '—',
          creatorType: creator ? creator.creatorType : '—',
          category: creator ? creator.category : '—',
          videoCount: videoCount,
          sampleCount: creator ? creator.sampleCount : 0,
        };
      })
      .sort(function (a, b) { return b.videoCount - a.videoCount; })
      .slice(0, 20);

    var creatorStats = {
      total: Object.keys(creatorSet).length,
      byOfficial: byOfficial,
    };

    return {
      totalCreators: creatorStats.total,
      totalSamples: sampleStats.total,
      totalVideos: videoStats.total,
      totalInvites: getInviteAchievedCount(startDate, endDate, sku),
      totalTasks: taskStats.total,
      taskCompletionRate: taskStats.completionRate,
      skuRanking: skuRanking,
      creatorRanking: creatorRanking,
      sampleStats: sampleStats,
      videoStats: videoStats,
      inviteStats: inviteStats,
      creatorStats: creatorStats,
    };
  }

  /* ========== 日报数据（今日实际完成情况） ========== */

  function getTodayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  // 日报"今日"锚定：实时时钟偶尔会跑到数据前面（例如今天 8/11，但数据只同步到 8/10），
  // 此时若直接用实时今天，今日寄样/视频/邀约会全部为空，用户以为功能坏了。
  // 策略：实时今天在数据里有任何活动就用实时今天；否则回退到数据里最新的业务日
  // （= max(最新寄样日, 最新邀约日)），保证"今日"永远反映最近一次同步的快照。
  var _dataTodayCache = null;
  function getDataToday() {
    var live = getTodayStr();
    var hasLive = D.samples.some(function (s) { return s.sampleTime && s.sampleTime.indexOf(live) === 0; })
               || D.invites.some(function (i) { return i.date && i.date.indexOf(live) === 0; });
    if (hasLive) return live;
    if (_dataTodayCache) return _dataTodayCache;
    var maxDate = '';
    D.samples.forEach(function (s) { if (s.sampleTime && s.sampleTime > maxDate) maxDate = s.sampleTime; });
    D.invites.forEach(function (i) { if (i.date && i.date > maxDate) maxDate = i.date; });
    _dataTodayCache = maxDate ? maxDate.slice(0, 10) : live;
    return _dataTodayCache;
  }

  // 在 "YYYY-MM-DD" 上加减天数，返回同样格式
  function shiftDate(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // 视频时间滞后天数：美国时区比北京晚 1 天 + 系统抓取延迟 1 天 = 2 天。
  // 即"今天登记的视频"，其视频时间字段显示的是 2 天前的日期。
  var VIDEO_LAG_DAYS = 2;

  function getDailyReportData(dateStr) {
    // 未指定日期时（=打开日报默认视图），把"今日"锚定到数据里最新的业务日，
    // 避免实时时钟跑到数据前面导致今日寄样/视频/邀约全部为空。
    var anchored = !dateStr;
    var today = dateStr || getDataToday();
    var displayDate = new Date(today + 'T00:00:00').toLocaleDateString('zh-CN');
    var report = getReportData();

    // 当日寄样：飞书「寄样时间」是美国日期，比北京晚 1 天。
    // 所以日报日期 D 对应的寄样记录，其实是 sampleTime = D-1 的那批。
    // 例如 8/10 的日报，寄样日期是 8/9。
    var prevDayStr = shiftDate(today, -1);
    var todaySamples = D.samples.filter(function (s) {
      if (!s.sampleTime) return false;
      return s.sampleTime.startsWith(prevDayStr);
    });

    // 当日寄样明细（逐条列出，用于日报「按当天寄样量生成」）
    var todaySamplesList = todaySamples.map(function (s) {
      return {
        creator: s.creator,
        sku: s.sku,
        color: s.color,
        official: s.official,
        stars: s.stars,
        sampleTime: s.sampleTime,
        approval: s.approval,
        orderCount: s.orderCount,
      };
    });

    // 当日登记视频
    // 关键1：视频时间比"今天登记"早 VIDEO_LAG_DAYS 天 —— 美国时区比北京晚 1 天，
    // 达人发布后系统还要再过 1 天才抓取到，合计 2 天。
    // 所以 8/11 的日报，视频时间字段显示的是 8/9。
    // 关键2："登记"指的是飞书行的「更新时间」；看板/日报要与飞书「每日寄样」表
    // 中「更新时间 = 今天」且「视频时间 = 今天-2」的行保持一致。
    // 若今天没有登记视频，回退到数据里最新的视频日期，保证不空白。
    var expectedVideoDate = shiftDate(today, -VIDEO_LAG_DAYS);
    var videoStatDate = expectedVideoDate;
    var todayVideos = 0;
    var todayVideoCreators = {};
    var todayVideosList = [];

    function collectVideos(registrationDate, targetVideoDate) {
      var count = 0;
      var creators = {};
      var list = [];
      D.samples.forEach(function (s) {
        if (!s.videos) return;
        // 只看「更新时间」落在 registrationDate 的寄样行；空 updateTime 退到 sampleTime
        var regTime = s.updateTime || s.sampleTime || '';
        if (!regTime.startsWith(registrationDate)) return;
        s.videos.forEach(function (v) {
          if (v.time && v.time.startsWith(targetVideoDate)) {
            count++;
            creators[s.creator] = true;
            list.push({
              creator: s.creator,
              sku: s.sku,
              url: v.url || '',
              time: v.time,
            });
          }
        });
      });
      return { count: count, creators: creators, list: list };
    }

    // 先尝试 today 登记、videoStatDate 的视频
    var primary = collectVideos(today, videoStatDate);
    todayVideos = primary.count;
    todayVideoCreators = primary.creators;
    todayVideosList = primary.list;

    // 若预期日期没有视频，回退到数据里最新的视频日期（全库搜索，不限制 updateTime）
    var videoDateFallback = false;
    if (todayVideos === 0) {
      var maxVideoDate = '';
      D.samples.forEach(function (s) {
        if (!s.videos) return;
        s.videos.forEach(function (v) {
          if (v.time && v.time > maxVideoDate) maxVideoDate = v.time;
        });
      });
      if (maxVideoDate) {
        var fallbackDate = maxVideoDate.slice(0, 10);
        if (fallbackDate !== videoStatDate) {
          videoStatDate = fallbackDate;
          videoDateFallback = true;
          var fallbackRes = collectVideos(today, videoStatDate);
          todayVideos = fallbackRes.count;
          todayVideoCreators = fallbackRes.creators;
          todayVideosList = fallbackRes.list;
          // 若按 today 的 updateTime 仍为空，直接取该视频日期的全部视频
          if (todayVideos === 0) {
            D.samples.forEach(function (s) {
              if (!s.videos) return;
              s.videos.forEach(function (v) {
                if (v.time && v.time.startsWith(videoStatDate)) {
                  todayVideos++;
                  todayVideoCreators[s.creator] = true;
                  todayVideosList.push({
                    creator: s.creator,
                    sku: s.sku,
                    url: v.url || '',
                    time: v.time,
                  });
                }
              });
            });
          }
        }
      }
    }

    // 当日开发达人（当天首次出现在寄样记录中的达人）
    var previousCreatorSet = {};
    D.samples.forEach(function (s) {
      if (s.sampleTime && s.sampleTime < today) {
        previousCreatorSet[s.creator] = true;
      }
    });
    var todayNewCreators = todaySamples.filter(function (s) {
      return !previousCreatorSet[s.creator];
    }).map(function (s) { return s.creator; }).filter(function (v, i, a) { return a.indexOf(v) === i; });

    // 当日自动通过达人
    var todayAutoApproved = todaySamples.filter(function (s) {
      return s.approval === '自动';
    });

    // 当日出单
    var todayOrdered = todaySamples.filter(function (s) {
      return s.orderCount && s.orderCount > 0;
    });

    // 当日邀约。注意：invites 一行 = 一个邀约计划（SKU 维度），
    // achieved 字段是该计划的「累计触达人数」（对照 planTarget，动辄上千），不是当天新增条数。
    // 早期把 achieved 直接累加当作「今日邀约 N 条」，会得到 3 万+ 的荒谬值，这里拆成两个指标。
    // 邀约日期是人工填写，无系统时区滞后，故只取当天（不像寄样那样带 prevDay 容错）。
    var todayInvites = D.invites.filter(function (i) {
      return i.date && i.date.startsWith(today);
    });
    var todayInviteReach = 0;
    todayInvites.forEach(function (i) { if (i.achieved) todayInviteReach += i.achieved; });

    // 当日寄样的SKU分布
    var todayBySKU = {};
    todaySamples.forEach(function (s) {
      if (s.sku) todayBySKU[s.sku] = (todayBySKU[s.sku] || 0) + 1;
    });
    var todaySKURanking = Object.entries(todayBySKU)
      .map(function (e) { return { sku: e[0], count: e[1] }; })
      .sort(function (a, b) { return b.count - a.count; });

    return {
      date: displayDate,
      todayStr: today,
      // 当日实际数据
      todaySampleCount: todaySamples.length,
      todayVideoCount: todayVideos,
      todayVideoCreatorCount: Object.keys(todayVideoCreators).length,
      todayVideosList: todayVideosList,
      // 视频统计实际匹配的日期（= today - 2 天，或最新视频日期），用于界面标注，避免用户以为统计错了
      videoStatDate: videoStatDate,
      videoLagDays: VIDEO_LAG_DAYS,
      videoDateFallback: videoDateFallback,
      // 当日锚定标记：若"今日"被回退到数据最新业务日（实时时钟跑到数据前面），界面需提示
      todayAnchored: anchored && today !== getTodayStr(),
      todayNewCreatorCount: todayNewCreators.length,
      todayNewCreators: todayNewCreators,
      todayAutoCount: todayAutoApproved.length,
      todayOrderedCount: todayOrdered.length,
      todayInviteCount: todayInvites.length,   // 今日新建邀约计划数（条）
      todayInviteReach: todayInviteReach,      // 这些计划的累计触达人数（人）
      todayInvitesList: todayInvites.map(function (i) {
        return { sku: i.sku, commission: i.commission, planTarget: i.planTarget, achieved: i.achieved };
      }),
      todaySKURanking: todaySKURanking,
      todaySamplesList: todaySamplesList,
      // 整体数据（用于对比）
      totalCreators: report.totalCreators,
      totalSamples: report.totalSamples,
      totalVideos: report.totalVideos,
      totalInvites: report.totalInvites,
      taskCompletionRate: report.taskCompletionRate,
      // TOP排名
      skuRanking: report.skuRanking.slice(0, 5),
      creatorRanking: report.creatorRanking.slice(0, 5),
      topCreator: report.creatorRanking[0] ? report.creatorRanking[0].name : '—',
      topCreatorVideos: report.creatorRanking[0] ? report.creatorRanking[0].videoCount : 0,
      topSKU: report.skuRanking[0] ? report.skuRanking[0].sku : '—',
      topSKUSamples: report.skuRanking[0] ? report.skuRanking[0].sampleCount : 0,
    };
  }

  /* ========== AI评分辅助 ========== */
  // 评分维度仍由BD手动输入，但可以基于飞书数据给出建议值

  function getScoringSuggestion(creatorName) {
    var creator = getCreatorByName(creatorName);
    if (!creator) return null;

    // 基于品类推断女装垂度
    var womenVertical = 50;
    if (creator.category) {
      if (creator.category.includes('女装')) womenVertical = 85;
      else if (creator.category.includes('时尚') || creator.category.includes('箱包')) womenVertical = 60;
      else if (creator.category.includes('美妆')) womenVertical = 55;
      else womenVertical = 30;
    }

    // 基于星级推断口播推广感
    var promoSense = 3;
    if (creator.stars) {
      var starNum = parseInt(creator.stars);
      if (starNum >= 5) promoSense = 5;
      else if (starNum >= 4) promoSense = 4;
      else if (starNum >= 3) promoSense = 3;
      else promoSense = 2;
    }

    // 基于达人类型推断
    var isCore = creator.creatorType && creator.creatorType.includes('核心');
    var isPotential = creator.creatorType && creator.creatorType.includes('潜力');

    return {
      womenVertical: womenVertical,
      promoSense: promoSense,
      isCore: isCore,
      isPotential: isPotential,
      official: creator.official,
      stars: creator.stars,
      fulfillment: creator.fulfillment,
      category: creator.category,
      bodyType: creator.bodyType,
      age: creator.age,
      sampleCount: creator.sampleCount,
      videoCount: creator.videoCount,
      note: '基于飞书数据推断，BD请根据实际情况调整',
    };
  }

  /* ========== 深度数据分析（v3 新增） ========== */

  // 通用筛选：按 SKU + 时间范围过滤样品
  function filterSamples(samples, startDate, endDate, sku) {
    var result = samples;
    if (sku) result = result.filter(function (s) { return s.sku === sku; });
    if (startDate) result = result.filter(function (s) { return s.sampleTime && s.sampleTime >= startDate; });
    if (endDate) result = result.filter(function (s) { return s.sampleTime && s.sampleTime <= endDate + ' 23:59'; });
    return result;
  }

  // 获取所有可选SKU列表（用于筛选下拉）
  function getAvailableSKUs() {
    var skuSet = {};
    D.samples.forEach(function (s) { if (s.sku) skuSet[s.sku] = true; });
    D.skus.forEach(function (s) { if (s.sku) skuSet[s.sku] = true; });
    return Object.keys(skuSet).sort();
  }

  // 样品看板：按SKU + 时间范围筛选，返回合作情况统计
  function getSampleDashboard(sku, startDate, endDate) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);

    var total = samples.length;
    var fulfilled = 0;       // 履约（视频/直播）
    var unfulfilled = 0;     // 未履约
    var cancelled = 0;       // 已取消
    var pushed = 0;          // 已催
    var pending = 0;         // null/未确定
    var ordered = 0;         // 出单
    var withVideo = 0;       // 有视频
    var totalVideos = 0;
    var uniqueCreators = {};
    var reinvestCount = 0;

    // 单次遍历同时聚合「总体统计」与「每个达人」的统计，避免二次全量 filter（O(n²)→O(n)）
    var perCreator = {};
    samples.forEach(function (s) {
      var method = s.fulfillMethod;
      if (method === '视频') { fulfilled++; withVideo++; }
      else if (method && method.indexOf('直播') >= 0) { fulfilled++; }
      else if (method === '已取消') { cancelled++; }
      else if (method === '未履约') { unfulfilled++; }
      else if (method && method.indexOf('已催') >= 0) { pushed++; }
      else { pending++; }

      if (s.videos && s.videos.length > 0) { withVideo++; totalVideos += s.videos.length; }
      if (s.orderCount && s.orderCount > 0) ordered++;
      if (s.reinvest) reinvestCount++;
      uniqueCreators[s.creator] = (uniqueCreators[s.creator] || 0) + 1;

      if (!perCreator[s.creator]) perCreator[s.creator] = { sampleCount: 0, ordered: 0, fulfilled: 0, unfulfilled: 0 };
      var pc = perCreator[s.creator];
      pc.sampleCount++;
      if (s.orderCount && s.orderCount > 0) pc.ordered++;
      if (method === '视频' || (method && method.indexOf('直播') >= 0)) pc.fulfilled++;
      if (method === '未履约' || !method) pc.unfulfilled++;
    });

    // 达人列表（按合作次数排序）—— 直接读取已聚合的 perCreator，不再二次 filter
    var creatorList = Object.keys(perCreator).map(function (name) {
      var pc = perCreator[name];
      var creator = getCreatorByName(name);
      return {
        name: name,
        sampleCount: pc.sampleCount,
        ordered: pc.ordered,
        fulfilled: pc.fulfilled,
        unfulfilled: pc.unfulfilled,
        official: creator ? creator.official : null,
        stars: creator ? creator.stars : null,
        bodyType: creator ? creator.bodyType : null,
        category: creator ? creator.category : null,
        fulfillment: creator ? creator.fulfillment : null,
      };
    }).sort(function (a, b) { return b.sampleCount - a.sampleCount; });

    return {
      total: total,
      fulfilled: fulfilled,
      unfulfilled: unfulfilled,
      cancelled: cancelled,
      pushed: pushed,
      pending: pending,
      ordered: ordered,
      withVideo: withVideo,
      totalVideos: totalVideos,
      uniqueCreatorCount: Object.keys(uniqueCreators).length,
      reinvestCount: reinvestCount,
      creators: creatorList,
    };
  }

  // 视频深度分析（支持筛选）
  function getVideoAnalytics(startDate, endDate, sku) {
    var filteredSamples = filterSamples(D.samples, startDate, endDate, sku);
    var videos = [];
    filteredSamples.forEach(function (s) {
      s.videos.forEach(function (v, idx) {
        videos.push({
          creator: s.creator,
          official: s.official,
          stars: s.stars,
          sku: s.sku,
          color: s.color,
          url: v.url,
          postTime: v.time,
          sampleTime: s.sampleTime,
          fulfillMethod: s.fulfillMethod,
          category: s.category,
        });
      });
    });
    var bySKU = {};
    var byColor = {};
    var byCreator = {};
    var byCategory = {};
    var orderedVideos = 0;

    videos.forEach(function (v) {
      if (v.sku) {
        if (!bySKU[v.sku]) bySKU[v.sku] = { total: 0, ordered: 0 };
        bySKU[v.sku].total++;
      }
      if (v.color) {
        byColor[v.color] = (byColor[v.color] || 0) + 1;
      }
      if (v.creator) {
        byCreator[v.creator] = (byCreator[v.creator] || 0) + 1;
      }
      if (v.category) {
        byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      }
    });

    // 检查出单：关联样品的 orderCount > 0
    filteredSamples.forEach(function (s) {
      if (s.orderCount && s.orderCount > 0 && s.videos) {
        orderedVideos += s.videos.length;
        if (s.sku && bySKU[s.sku]) bySKU[s.sku].ordered += s.videos.length;
      }
    });

    // SKU排名（达人维度：出单率 = 出单达人数 / 履约达人数）
    var skuRanking = Object.entries(bySKU)
      .map(function (entry) {
        var d = getSKUDetail(entry[0]);
        // 该SKU的样品
        var skuSamples = filteredSamples.filter(function (s) { return s.sku === entry[0]; });
        var fulfilledCreators = {};  // 履约达人
        var orderedCreators = {};    // 出单达人
        skuSamples.forEach(function (s) {
          if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) {
            fulfilledCreators[s.creator] = true;
          }
          if (s.orderCount && s.orderCount > 0) {
            orderedCreators[s.creator] = true;
          }
        });
        var fCount = Object.keys(fulfilledCreators).length;
        var oCount = Object.keys(orderedCreators).length;
        return {
          sku: entry[0],
          productName: d.productName || '',
          positioning: d.positioning || '',
          videoCount: entry[1].total,
          orderedCount: entry[1].ordered,
          fulfilledCreators: fCount,
          orderedCreators: oCount,
          orderRate: fCount > 0 ? Math.round(oCount / fCount * 1000) / 10 : 0,
        };
      })
      .sort(function (a, b) {
        // 先按产品定位档位（爆品→销售→测品→撤退），同档按视频数降序
        var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
        if (ta !== tb) return ta - tb;
        return b.videoCount - a.videoCount;
      });

    // 颜色排名
    var colorRanking = Object.entries(byColor)
      .map(function (entry) { return { color: entry[0], count: entry[1] }; })
      .sort(function (a, b) { return b.count - a.count; });

    // 达人排名（按视频数）
    var creatorRanking = Object.entries(byCreator)
      .map(function (entry) {
        var creator = getCreatorByName(entry[0]);
        var creatorSamples = filteredSamples.filter(function (s) { return s.creator === entry[0]; });
        var ordered = creatorSamples.filter(function (s) { return s.orderCount && s.orderCount > 0; }).length;
        var skus = creatorSamples.map(function (s) { return s.sku; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
        return {
          name: entry[0],
          videoCount: entry[1],
          orderedCount: ordered,
          skus: skus,
          official: creator ? creator.official : null,
          stars: creator ? creator.stars : null,
          category: creator ? creator.category : null,
          bodyType: creator ? creator.bodyType : null,
          age: creator ? creator.age : null,
        };
      })
      .sort(function (a, b) { return b.videoCount - a.videoCount; });

    // 品类排名
    var categoryRanking = Object.entries(byCategory)
      .map(function (entry) { return { category: entry[0], count: entry[1] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 10);

    // 整体出单率（达人维度：出单达人数 / 履约达人数）
    var allFulfilledCreators = {};
    var allOrderedCreators = {};
    filteredSamples.forEach(function (s) {
      if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) {
        allFulfilledCreators[s.creator] = true;
      }
      if (s.orderCount && s.orderCount > 0) {
        allOrderedCreators[s.creator] = true;
      }
    });
    var totalFulfilledCreators = Object.keys(allFulfilledCreators).length;
    var totalOrderedCreators = Object.keys(allOrderedCreators).length;

    return {
      total: videos.length,
      orderedVideos: orderedVideos,
      orderRate: totalFulfilledCreators > 0 ? Math.round(totalOrderedCreators / totalFulfilledCreators * 1000) / 10 : 0,
      fulfilledCreators: totalFulfilledCreators,
      orderedCreators: totalOrderedCreators,
      uniqueCreators: Object.keys(byCreator).length,
      bySKU: bySKU,
      skuRanking: skuRanking,
      colorRanking: colorRanking,
      creatorRanking: creatorRanking,
      categoryRanking: categoryRanking,
      topSKU: sku ? null : (skuRanking[0] || null),
      topColor: colorRanking[0] || null,
      filteredSKU: sku || null,
    };
  }

  /* ========== 达人出单视频 TOP 20（含视频链接） ========== */
  // 口径：按"达人"聚合——该达人所有寄样记录里，出单(orderCount)之和最高的前 20 名，
  // 展示其代表视频链接（取该达人出单样品里的视频），便于 BD 直接点开看爆款视频。
  function getTopVideoCreators(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var byCreator = {};
    samples.forEach(function (s) {
      if (!s.videos || s.videos.length === 0) return;          // 只看有视频的
      if (!(s.orderCount && s.orderCount > 0)) return;          // 只看有出单的
      var name = s.creator;
      if (!byCreator[name]) {
        byCreator[name] = {
          creator: name,
          official: s.official,
          stars: s.stars,
          bodyType: s.bodyType,
          age: s.age,
          category: s.category,
          language: s.language,
          orderCount: 0,
          videoUrls: [],
          skuSet: {},
        };
      }
      var c = byCreator[name];
      c.orderCount += (Number(s.orderCount) || 0);
      s.videos.forEach(function (v) {
        if (v.url && v.url !== '[object Object]') {
          c.videoUrls.push({ url: v.url, sku: s.sku, time: v.time });
        }
      });
      if (s.sku) c.skuSet[s.sku] = (c.skuSet[s.sku] || 0) + 1;
    });
    var list = Object.keys(byCreator).map(function (k) { return byCreator[k]; });
    list.sort(function (a, b) { return b.orderCount - a.orderCount; });
    list = list.slice(0, 20);
    list.forEach(function (c) {
      c.skuList = Object.keys(c.skuSet);
      // 去重视频链接（同达人多条重复链接只留一条，最多取 3 条展示）
      var seen = {}, uniq = [];
      c.videoUrls.forEach(function (v) { if (!seen[v.url]) { seen[v.url] = 1; uniq.push(v); } });
      c.videoUrls = uniq.slice(0, 3);
    });
    return list;
  }

  /* ========== 视频拍摄质量画像（出单视频的达人特征分布） ========== */
  // 数据中没有直接的"视频质量评分"，用出单视频对应达人的「官方等级 / 星级 / 身材 / 品类 / 语言」
  // 作为拍摄质量的代理指标：高等级、高星级的达人，其视频拍摄质量通常更好。
  function getVideoQualityProfile(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var starsDist = {}, officialDist = {}, bodyDist = {}, categoryDist = {}, languageDist = {};
    var total = 0;
    samples.forEach(function (s) {
      if (!s.videos || s.videos.length === 0) return;
      if (!(s.orderCount && s.orderCount > 0)) return;          // 只看有出单的视频
      total++;
      if (s.stars) starsDist[s.stars] = (starsDist[s.stars] || 0) + 1;
      if (s.official) officialDist[s.official] = (officialDist[s.official] || 0) + 1;
      if (s.bodyType) bodyDist[s.bodyType] = (bodyDist[s.bodyType] || 0) + 1;
      if (s.category) {
        String(s.category).split(',').forEach(function (cat) {
          cat = cat.trim(); if (cat) categoryDist[cat] = (categoryDist[cat] || 0) + 1;
        });
      }
      if (s.language) languageDist[s.language] = (languageDist[s.language] || 0) + 1;
    });
    // 计算"高质量"占比：官方等级 L4 及以上 + 星级 4★/5★ 视为高质量拍摄
    var highOfficial = 0, highStars = 0;
    Object.keys(officialDist).forEach(function (k) {
      var lv = parseInt(String(k).replace(/[^0-9]/g, ''), 10) || 0;
      if (lv >= 4) highOfficial += officialDist[k];
    });
    Object.keys(starsDist).forEach(function (k) {
      var n = parseInt(String(k).replace(/[^0-9]/g, ''), 10) || 0;
      if (n >= 4) highStars += starsDist[k];
    });
    return {
      total: total,
      starsDist: starsDist,
      officialDist: officialDist,
      bodyDist: bodyDist,
      categoryDist: categoryDist,
      languageDist: languageDist,
      highOfficialRate: total > 0 ? Math.round(highOfficial / total * 1000) / 10 : 0,
      highStarsRate: total > 0 ? Math.round(highStars / total * 1000) / 10 : 0,
    };
  }

  // 达人画像分析（支持筛选）
  function getCreatorPersonaAnalysis(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var byAge = {};
    var byBodyType = {};
    var byCategory = {};
    var byOfficial = {};
    var byStars = {};
    var byFulfillment = {};

    samples.forEach(function (s) {
      if (s.age) {
        if (!byAge[s.age]) byAge[s.age] = { total: 0, fulfilled: 0, ordered: 0 };
        byAge[s.age].total++;
        if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byAge[s.age].fulfilled++;
        if (s.orderCount && s.orderCount > 0) byAge[s.age].ordered++;
      }
      if (s.bodyType) {
        if (!byBodyType[s.bodyType]) byBodyType[s.bodyType] = { total: 0, fulfilled: 0, ordered: 0 };
        byBodyType[s.bodyType].total++;
        if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byBodyType[s.bodyType].fulfilled++;
        if (s.orderCount && s.orderCount > 0) byBodyType[s.bodyType].ordered++;
      }
      if (s.category) {
        var cats = String(s.category).split(',');
        cats.forEach(function (cat) {
          cat = String(cat).trim();
          if (!cat) return;
          if (!byCategory[cat]) byCategory[cat] = { total: 0, fulfilled: 0, ordered: 0 };
          byCategory[cat].total++;
          if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byCategory[cat].fulfilled++;
          if (s.orderCount && s.orderCount > 0) byCategory[cat].ordered++;
        });
      }
      if (s.official) {
        if (!byOfficial[s.official]) byOfficial[s.official] = { total: 0, fulfilled: 0, ordered: 0 };
        byOfficial[s.official].total++;
        if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byOfficial[s.official].fulfilled++;
        if (s.orderCount && s.orderCount > 0) byOfficial[s.official].ordered++;
      }
      if (s.stars) {
        if (!byStars[s.stars]) byStars[s.stars] = { total: 0, fulfilled: 0, ordered: 0 };
        byStars[s.stars].total++;
        if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byStars[s.stars].fulfilled++;
        if (s.orderCount && s.orderCount > 0) byStars[s.stars].ordered++;
      }
      if (s.fulfillment) {
        if (!byFulfillment[s.fulfillment]) byFulfillment[s.fulfillment] = { total: 0, fulfilled: 0, ordered: 0 };
        byFulfillment[s.fulfillment].total++;
        if (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)) byFulfillment[s.fulfillment].fulfilled++;
        if (s.orderCount && s.orderCount > 0) byFulfillment[s.fulfillment].ordered++;
      }
    });

    function toRanking(obj) {
      return Object.entries(obj).map(function (entry) {
        var d = entry[1];
        return {
          label: entry[0],
          total: d.total,
          fulfilled: d.fulfilled,
          ordered: d.ordered,
          fulfillRate: d.total > 0 ? Math.round(d.fulfilled / d.total * 100) : 0,
          orderRate: d.fulfilled > 0 ? Math.round(d.ordered / d.fulfilled * 1000) / 10 : 0,
        };
      }).sort(function (a, b) { return b.total - a.total; });
    }

    return {
      byAge: toRanking(byAge),
      byBodyType: toRanking(byBodyType),
      byCategory: toRanking(byCategory).slice(0, 10),
      byOfficial: toRanking(byOfficial),
      byStars: toRanking(byStars),
      byFulfillment: toRanking(byFulfillment),
    };
  }

  // 开发效果分析（支持筛选）
  function getDevEffectAnalysis(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var autoApproved = samples.filter(function (s) { return s.approval === '自动'; }).length;
    var manualApproved = samples.filter(function (s) { return s.approval === '手动'; }).length;
    var autoFulfilled = samples.filter(function (s) { return s.approval === '自动' && (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)); }).length;
    var manualFulfilled = samples.filter(function (s) { return s.approval === '手动' && (s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0)); }).length;
    var autoOrdered = samples.filter(function (s) { return s.approval === '自动' && s.orderCount && s.orderCount > 0; }).length;
    var manualOrdered = samples.filter(function (s) { return s.approval === '手动' && s.orderCount && s.orderCount > 0; }).length;

    return {
      autoApproved: autoApproved,
      manualApproved: manualApproved,
      autoFulfilled: autoFulfilled,
      manualFulfilled: manualFulfilled,
      autoOrdered: autoOrdered,
      manualOrdered: manualOrdered,
      autoFulfillRate: autoApproved > 0 ? Math.round(autoFulfilled / autoApproved * 100) : 0,
      manualFulfillRate: manualApproved > 0 ? Math.round(manualFulfilled / manualApproved * 100) : 0,
      autoOrderRate: autoApproved > 0 ? Math.round(autoOrdered / autoApproved * 100) : 0,
      manualOrderRate: manualApproved > 0 ? Math.round(manualOrdered / manualApproved * 100) : 0,
      totalInvites: getInviteAchievedCount(startDate, endDate, sku),
      totalSamples: samples.length,
    };
  }

  // 产品分析：每个SKU的邀请/通过/履约/出单（支持筛选）
  function getProductAnalysis(startDate, endDate, skuFilter) {
    var samples = filterSamples(D.samples, startDate, endDate, skuFilter);
    var stats = {};
    samples.forEach(function (s) {
      if (!s.sku) return;
      if (!stats[s.sku]) stats[s.sku] = { invited: 0, approved: 0, fulfilled: 0, ordered: 0, videos: 0, reinvest: 0, fulfilledCreators: {}, orderedCreators: {} };
      stats[s.sku].approved++;
      var isFulfilled = s.fulfillMethod === '视频' || (s.fulfillMethod && s.fulfillMethod.indexOf('直播') >= 0);
      if (isFulfilled) {
        stats[s.sku].fulfilled++;
        stats[s.sku].fulfilledCreators[s.creator] = true;
      }
      if (s.orderCount && s.orderCount > 0) {
        stats[s.sku].ordered++;
        stats[s.sku].orderedCreators[s.creator] = true;
      }
      if (s.videos) stats[s.sku].videos += s.videos.length;
      if (s.reinvest) stats[s.sku].reinvest++;
    });
    var filteredInvites = D.invites;
    if (skuFilter) filteredInvites = filteredInvites.filter(function (i) { return i.sku === skuFilter; });
    if (startDate) filteredInvites = filteredInvites.filter(function (i) { return i.date && i.date >= startDate; });
    if (endDate) filteredInvites = filteredInvites.filter(function (i) { return i.date && i.date <= endDate + ' 23:59'; });
    filteredInvites.forEach(function (i) {
      if (!i.sku) return;
      if (!stats[i.sku]) stats[i.sku] = { invited: 0, approved: 0, fulfilled: 0, ordered: 0, videos: 0, reinvest: 0, fulfilledCreators: {}, orderedCreators: {} };
      stats[i.sku].invited += (i.achieved || 0);
    });

    return Object.entries(stats).map(function (entry) {
      var d = getSKUDetail(entry[0]);
      var fulfilledCreatorsCount = Object.keys(entry[1].fulfilledCreators || {}).length;
      var orderedCreatorsCount = Object.keys(entry[1].orderedCreators || {}).length;
      delete entry[1].fulfilledCreators;
      delete entry[1].orderedCreators;
      return Object.assign({
        sku: entry[0],
        productName: d.productName || '',
        positioning: d.positioning || '',
        commission: d.defaultCommission || '',
        approveRate: entry[1].invited > 0 ? Math.round(entry[1].approved / entry[1].invited * 100) : 0,
        fulfillRate: entry[1].approved > 0 ? Math.round(entry[1].fulfilled / entry[1].approved * 100) : 0,
        fulfilledCreators: fulfilledCreatorsCount,
        orderedCreators: orderedCreatorsCount,
        orderRate: fulfilledCreatorsCount > 0 ? Math.round(orderedCreatorsCount / fulfilledCreatorsCount * 1000) / 10 : 0,
      }, entry[1]);
    }).sort(function (a, b) {
      // 先按定位档位（爆品→销售→测品），同档按寄样量降序
      var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      return b.approved - a.approved;
    });
  }

  // 产品通过率（邀约页顶部用）
  //   通过率 = 时间范围内该产品的寄样量 ÷ 邀约条数（邀请了 N 个达人，多少转化成了寄样）
  //   说明：飞书 achieved 字段为曝光/销量类指标值（数千量级），并非「达成数量」，
  //        故分母采用该时间范围内该 SKU 的邀约记录条数，通过率才有业务意义。
  //   支持 start/end 日期筛选；无邀约时通过率为 null（显示 —）
  function getInvitePassRate(startDate, endDate) {
    // 寄样量：该时间范围内的样品（按 SKU 统计）
    var samples = filterSamples(D.samples, startDate, endDate, null);
    var sampleBySKU = {};
    samples.forEach(function (s) {
      if (s.sku) sampleBySKU[s.sku] = (sampleBySKU[s.sku] || 0) + 1;
    });

    // 邀约条数：该时间范围内的邀约记录（按 SKU 统计）
    var invites = D.invites;
    if (startDate) invites = invites.filter(function (i) { return i.date && i.date >= startDate; });
    if (endDate) invites = invites.filter(function (i) { return i.date && i.date <= endDate + ' 23:59'; });
    var inviteCountBySKU = {};
    invites.forEach(function (i) {
      if (i.sku) inviteCountBySKU[i.sku] = (inviteCountBySKU[i.sku] || 0) + 1;
    });

    // 合并所有出现过的 SKU
    var skuSet = {};
    Object.keys(sampleBySKU).forEach(function (k) { skuSet[k] = true; });
    Object.keys(inviteCountBySKU).forEach(function (k) { skuSet[k] = true; });

    return Object.keys(skuSet).map(function (sku) {
      var sampleCount = sampleBySKU[sku] || 0;
      var inviteCount = inviteCountBySKU[sku] || 0;
      var passRate = inviteCount > 0 ? Math.round(sampleCount / inviteCount * 100) : null;
      var detail = getSKUDetail(sku);
      return {
        sku: sku,
        productName: detail.productName || '',
        positioning: detail.positioning || '',
        sampleCount: sampleCount,
        inviteCount: inviteCount,
        passRate: passRate,
      };
    }).sort(function (a, b) {
      // 按定位档位排序，同档按寄样量降序
      var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      return b.sampleCount - a.sampleCount;
    });
  }

  // 是否"系统通过"（复投成功判定口径：只看通过，不看是否发视频）
  // 飞书「通过」字段取值：手动 / 自动 / 官方自动 / 空
  function isApproved(s) {
    var a = s && s.approval;
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) a = a.join('');
    a = String(a).trim();
    return a !== '';
  }

  // 解析飞书「是否复投」字段里的 前缀+SKU 标记
  // 该字段在不同数据管线下格式不一：
  //   - 飞书 API / regen：数组 ["已推2178","已推2190"]
  //   - Excel 上传：字符串 "已推2178,已推2190" 或 Python 字面量 "['已推2178', '已推2190']"
  // 统一拼成文本后用全局正则提取，天然跳过 "已推（颜色" 这类脏数据（（不是字母数字）
  function parseTaggedSKUs(value, prefix) {
    if (!value) return [];
    var text = Array.isArray(value) ? value.join(',') : String(value);
    if (!text) return [];
    var re = new RegExp(prefix + '\\s*([A-Za-z0-9]+)', 'g');
    var out = [];
    var m;
    while ((m = re.exec(text)) !== null) {
      var target = m[1];
      if (target && out.indexOf(target) < 0) out.push(target);
    }
    return out;
  }

  // 已复投（已推XXXX）→ 复投声明
  function parseReinvestTargets(s) {
    return parseTaggedSKUs(s && s.reinvest, '已推');
  }

  // 待合作XXXX（已计划但尚未推，仅作参考，不计入复投声明）
  function parsePendingTargets(s) {
    return parseTaggedSKUs(s && s.reinvest, '待合作');
  }

  // 复投分析（支持筛选）
  // 业务规则（用户确认）：
  //   1) 复投声明 = 飞书「是否复投」字段出现「已推XXXX」（如已推2190、已推2189）
  //   2) 复投成功 = 该达人在声明之后，又寄样了该目标SKU 且「通过」非空（手动/自动/官方自动）
  //      —— 只要系统通过即算成功，不要求发视频
  //   3) 时间必须晚于声明所在的那条寄样记录（按达人时间线顺序判定）
  // 同一达人对同一目标SKU多次声明时，按最早一次声明计（去重）
  function getReinvestAnalysis(startDate, endDate, sku) {
    // 后续"是否合作上"必须在全量时间线里找，否则会被时间窗截断而漏判
    var all = D.samples || [];

    // 数据最新日期作为"今天"的基准（比系统时间稳健）
    var dataMaxDate = '';
    all.forEach(function (s) {
      if (s.sampleTime && s.sampleTime > dataMaxDate) dataMaxDate = s.sampleTime;
    });
    dataMaxDate = dataMaxDate.slice(0, 10);
    var WATCH_DAYS = 30; // 声明后 30 天内还没动静 → 算"观察中"，超过则算未成功

    function daysBetween(d1, d2) {
      if (!d1 || !d2) return 0;
      var a = new Date(d1 + 'T00:00:00');
      var b = new Date(d2 + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    }

    // 按达人分组（规范化去掉前后空格/大小写差异，避免同一人被拆成两条时间线）
    var byCreator = {};
    var displayName = {};
    all.forEach(function (s) {
      if (!s.creator) return;
      var key = String(s.creator).trim().toLowerCase();
      if (!byCreator[key]) { byCreator[key] = []; displayName[key] = String(s.creator).trim(); }
      byCreator[key].push(s);
    });

    var reinvestTotal = 0;      // 复投声明数（去重后的 达人×目标SKU）
    var reinvestSuccess = 0;    // 复投成功数（声明后合作上了）
    var reinvestFailed = 0;     // 未成功（超过观察期仍没合作上）
    var reinvestWatching = 0;   // 观察中（声明还不满 30 天）
    var pendingTotal = 0;       // 「待合作」声明数（参考）
    var successDays = [];       // 成功案例的转化耗时（天），用于算中位数
    var bySKU = {};
    var details = [];

    Object.keys(byCreator).forEach(function (key) {
      var name = displayName[key];
      var line = byCreator[key].slice().sort(function (a, b) {
        return (a.sampleTime || '') > (b.sampleTime || '') ? 1 : -1;
      });

      // 收集该达人的复投声明：目标SKU -> 最早声明所在的索引
      var declared = {};
      var pendingSet = {};
      for (var i = 0; i < line.length; i++) {
        parseReinvestTargets(line[i]).forEach(function (t) {
          if (declared[t] === undefined) declared[t] = i;
        });
        parsePendingTargets(line[i]).forEach(function (t) { pendingSet[t] = true; });
      }
      pendingTotal += Object.keys(pendingSet).length;

      Object.keys(declared).forEach(function (target) {
        var declIdx = declared[target];
        var declSample = line[declIdx];
        var declTime = declSample.sampleTime || '';

        // 时间窗筛选作用于"声明时间"；SKU筛选作用于"复投的目标SKU"
        if (startDate && declTime && declTime.slice(0, 10) < startDate) return;
        if (endDate && declTime && declTime.slice(0, 10) > endDate) return;
        if (sku && target !== sku) return;

        // 在声明之后的记录里找：目标SKU 且 系统通过（只看通过，不要求发视频）
        var success = false;
        var successSample = null;
        for (var j = declIdx + 1; j < line.length; j++) {
          if (line[j].sku !== target) continue;
          if (!isApproved(line[j])) continue;
          success = true;
          successSample = line[j];
          break;
        }

        // 三态：成功 / 观察中（声明还不满30天）/ 未成功
        var status = 'success';
        if (!success) {
          var age = daysBetween(declTime.slice(0, 10), dataMaxDate);
          status = age <= WATCH_DAYS ? 'watching' : 'failed';
        }

        reinvestTotal++;
        if (status === 'success') reinvestSuccess++;
        else if (status === 'watching') reinvestWatching++;
        else reinvestFailed++;

        if (!bySKU[target]) bySKU[target] = { reinvest: 0, success: 0, failed: 0, watching: 0, total: 0 };
        bySKU[target].reinvest++;
        if (status === 'success') bySKU[target].success++;
        else if (status === 'watching') bySKU[target].watching++;
        else bySKU[target].failed++;

        // 成功案例记录转化耗时（声明 → 合作上，天）
        var costDays = null;
        if (status === 'success' && successSample && successSample.sampleTime) {
          var dd = daysBetween(declTime.slice(0, 10), successSample.sampleTime.slice(0, 10));
          if (dd >= 0) { costDays = dd; successDays.push(dd); }
        }

        details.push({
          creator: name,
          fromSKU: declSample.sku || '',
          targetSKU: target,
          declareTime: declTime,
          success: success,
          status: status,
          successTime: successSample ? (successSample.sampleTime || '') : '',
          approval: successSample ? successSample.approval : '',
          costDays: costDays,
        });
      });
    });

    // 统计每SKU总寄样数（受时间窗筛选，不受SKU筛选影响，用于展示分母参考）
    filterSamples(all, startDate, endDate, null).forEach(function (s) {
      if (!s.sku) return;
      if (!bySKU[s.sku]) bySKU[s.sku] = { reinvest: 0, success: 0, failed: 0, watching: 0, total: 0 };
      bySKU[s.sku].total++;
    });

    var skuReinvest = Object.entries(bySKU).map(function (entry) {
      var d = getSKUDetail(entry[0]);
      var v = entry[1];
      var settled = v.success + v.failed; // 已出结果的（排除观察中）
      return {
        sku: entry[0],
        productName: d.productName || '',
        reinvest: v.reinvest,
        success: v.success,
        failed: v.failed,
        watching: v.watching,
        // rate = 已出结果中的成功率（观察中的不计入分母，避免低估）
        rate: settled > 0 ? Math.round(v.success / settled * 100) : 0,
        rawRate: v.reinvest > 0 ? Math.round(v.success / v.reinvest * 100) : 0,
        total: v.total,
      };
    }).filter(function (r) { return r.reinvest > 0; }).sort(function (a, b) {
      // 先按产品定位档位（爆品→销售→测品→撤退），同档按复投数降序
      var ta = getSKUPositionTier(a.sku), tb = getSKUPositionTier(b.sku);
      if (ta !== tb) return ta - tb;
      return b.reinvest - a.reinvest;
    });

    details.sort(function (a, b) {
      return (a.declareTime || '') > (b.declareTime || '') ? -1 : 1;
    });

    var settledTotal = reinvestSuccess + reinvestFailed;

    // 成功案例转化耗时：中位数 + 观察期内完成占比（用于校验观察期是否合理）
    successDays.sort(function (a, b) { return a - b; });
    var medianDays = successDays.length ? successDays[Math.floor(successDays.length / 2)] : 0;
    var withinWatch = successDays.filter(function (n) { return n <= WATCH_DAYS; }).length;
    var withinWatchRate = successDays.length ? Math.round(withinWatch / successDays.length * 100) : 0;

    return {
      reinvestTotal: reinvestTotal,          // 复投声明总数
      reinvestSuccess: reinvestSuccess,      // 声明后合作上了
      reinvestFailed: reinvestFailed,        // 超过观察期仍未合作
      reinvestWatching: reinvestWatching,    // 观察中（声明不满30天）
      settledTotal: settledTotal,            // 已出结果数
      medianDays: medianDays,                // 成功复投的转化耗时中位数（天）
      withinWatchRate: withinWatchRate,      // 成功案例中在观察期内完成的占比(%)
      // 主口径：已出结果中的成功率（观察中不计入分母）
      overallRate: settledTotal > 0 ? Math.round(reinvestSuccess / settledTotal * 100) : 0,
      // 参考口径：占全部声明的比例
      rawRate: reinvestTotal > 0 ? Math.round(reinvestSuccess / reinvestTotal * 100) : 0,
      watchDays: WATCH_DAYS,
      dataMaxDate: dataMaxDate,
      pendingTotal: pendingTotal,
      bySKU: skuReinvest,
      details: details,
    };
  }

  // 出单达人排行 TOP N（支持筛选）
  function getOrderCreatorRanking(limit, startDate, endDate, sku) {
    limit = limit || 10;
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var byCreator = {};
    samples.forEach(function (s) {
      if (!s.creator) return;
      if (!byCreator[s.creator]) byCreator[s.creator] = { name: s.creator, ordered: 0, skus: {}, sampleCount: 0, videoCount: 0 };
      byCreator[s.creator].sampleCount++;
      if (s.videos) byCreator[s.creator].videoCount += s.videos.length;
      if (s.orderCount && s.orderCount > 0) {
        byCreator[s.creator].ordered++;
        if (s.sku) {
          if (!byCreator[s.creator].skus[s.sku]) byCreator[s.creator].skus[s.sku] = { ordered: true, count: 0 };
          byCreator[s.creator].skus[s.sku].count += s.orderCount;
        }
      } else if (s.sku) {
        if (!byCreator[s.creator].skus[s.sku]) byCreator[s.creator].skus[s.sku] = { ordered: false, count: 0 };
      }
    });

    var creator = null;
    return Object.values(byCreator)
      .filter(function (c) { return c.ordered > 0; })
      .map(function (c) {
        creator = getCreatorByName(c.name);
        return Object.assign({}, c, {
          skuList: Object.entries(c.skus).map(function (e) { return { sku: e[0], ordered: e[1].ordered, orderCount: e[1].count }; }),
          official: creator ? creator.official : null,
          stars: creator ? creator.stars : null,
          category: creator ? creator.category : null,
        });
      })
      .sort(function (a, b) { return b.ordered - a.ordered; })
      .slice(0, limit);
  }

  // 达人SKU明细：某达人带了哪些SKU，哪些出单了（支持筛选）
  function getCreatorSKUBreakdown(name, startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku).filter(function (s) { return s.creator === name; });
    var bySKU = {};
    samples.forEach(function (s) {
      if (!s.sku) return;
      if (!bySKU[s.sku]) bySKU[s.sku] = { sku: s.sku, sampleCount: 0, videoCount: 0, ordered: 0, orderCount: 0, colors: [] };
      bySKU[s.sku].sampleCount++;
      if (s.videos) bySKU[s.sku].videoCount += s.videos.length;
      if (s.orderCount && s.orderCount > 0) {
        bySKU[s.sku].ordered++;
        bySKU[s.sku].orderCount += s.orderCount;
      }
      if (s.color && bySKU[s.sku].colors.indexOf(s.color) < 0) bySKU[s.sku].colors.push(s.color);
    });
    return Object.values(bySKU).map(function (d) {
      var detail = getSKUDetail(d.sku);
      d.productName = detail.productName || '';
      d.positioning = detail.positioning || '';
      return d;
    }).sort(function (a, b) { return b.sampleCount - a.sampleCount; });
  }

  // 寄样任务差距分析：实际寄样量 vs 要求寄样量
  function getTaskGapAnalysis() {
    var tasks = D.tasks;
    return tasks.map(function (t) {
      var sku = t.sku;
      var actualSamples = D.samples.filter(function (s) { return s.sku === sku; }).length;
      var gap = (t.target || 0) - actualSamples;
      return {
        sku: sku,
        productName: t.productName || '',
        priority: t.priority,
        positioning: t.positioning || '',
        target: t.target || 0,
        completed: t.completed || 0,
        actualSamples: actualSamples,
        gap: gap,
        gapPct: t.target > 0 ? Math.round(actualSamples / t.target * 100) : 0,
        isUrgent: gap > 0 && (t.priority === 'P0' || t.priority === 'P1'),
      };
    }).sort(function (a, b) {
      // 紧急的排前面
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return b.gap - a.gap;
    });
  }

  // === 新增：趋势 / 履约方式 / 语言分布 分析 (v-enhance) ===
  function getTrendAnalysis(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var byDay = {};
    samples.forEach(function (s) {
      var d = (s.sampleTime || '').slice(0, 10);
      if (!d) return;
      if (!byDay[d]) byDay[d] = { date: d, sampleCount: 0, orderCount: 0, orderedCreators: 0 };
      byDay[d].sampleCount++;
      var oc = (Number(s.orderCount) > 0) ? Number(s.orderCount) : 0;
      byDay[d].orderCount += oc;
      if (oc > 0) byDay[d].orderedCreators++;
    });
    var days = Object.keys(byDay).sort();
    return days.map(function (d) {
      var o = byDay[d];
      o.passRate = o.sampleCount > 0 ? Math.round(o.orderedCreators / o.sampleCount * 100) : 0;
      o.roi = o.sampleCount > 0 ? Math.round(o.orderCount / o.sampleCount * 1000) / 10 : 0;
      return o;
    });
  }

  function getFulfillMethodDistribution(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var map = {};
    samples.forEach(function (s) {
      var m = s.fulfillMethod || '未填';
      map[m] = (map[m] || 0) + 1;
    });
    var order = ['视频', '直播', '已催', '已取消', '未履约', '未填'];
    return Object.keys(map).map(function (k) {
      return { method: k, count: map[k] };
    }).sort(function (a, b) {
      var ia = order.indexOf(a.method), ib = order.indexOf(b.method);
      if (ia === -1) ia = 99;
      if (ib === -1) ib = 99;
      if (ia !== ib) return ia - ib;
      return b.count - a.count;
    });
  }

  function getFulfillmentRate(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var fulfilledCreators = {};
    var byMethod = {};
    var total = samples.length;
    samples.forEach(function (s) {
      var m = s.fulfillMethod || '未填';
      byMethod[m] = (byMethod[m] || 0) + 1;
      if (m === '视频' || (m && m.indexOf('直播') >= 0)) {
        fulfilledCreators[s.creator] = true;
      }
    });
    var fulfilledCount = Object.keys(fulfilledCreators).length;
    var order = ['视频', '直播', '已催', '已取消', '未履约', '未填'];
    return {
      total: total,
      fulfilled: fulfilledCount,
      fulfillmentRate: total > 0 ? Math.round(fulfilledCount / total * 1000) / 10 : 0,
      byMethod: Object.keys(byMethod).map(function (k) {
        return { method: k, count: byMethod[k] };
      }).sort(function (a, b) {
        var ia = order.indexOf(a.method), ib = order.indexOf(b.method);
        if (ia === -1) ia = 99; if (ib === -1) ib = 99;
        if (ia !== ib) return ia - ib;
        return b.count - a.count;
      })
    };
  }

  function getLanguageDistribution(startDate, endDate, sku) {
    var samples = filterSamples(D.samples, startDate, endDate, sku);
    var total = {}, orderByLang = {}, bySku = {}, bySkuOrder = {};
    samples.forEach(function (s) {
      var lang = s.language || '其他';
      total[lang] = (total[lang] || 0) + 1;
      if (s.orderCount && s.orderCount > 0) orderByLang[lang] = (orderByLang[lang] || 0) + 1;
      if (s.sku) {
        if (!bySku[s.sku]) bySku[s.sku] = {};
        bySku[s.sku][lang] = (bySku[s.sku][lang] || 0) + 1;
        if (s.orderCount && s.orderCount > 0) {
          if (!bySkuOrder[s.sku]) bySkuOrder[s.sku] = {};
          bySkuOrder[s.sku][lang] = (bySkuOrder[s.sku][lang] || 0) + 1;
        }
      }
    });
    var langs = ['英语', '黑人', '西语', '其他'];
    function toArr(m) {
      return langs.map(function (l) { return { lang: l, count: m[l] || 0 }; });
    }
    var bySkuArr = Object.keys(bySku).map(function (sk) {
      var orderLangs = toArr(bySkuOrder[sk] || {});
      var orderTotal = orderLangs.reduce(function (s, x) { return s + x.count; }, 0);
      return { sku: sk, langs: toArr(bySku[sk]), orderLangs: orderLangs, orderTotal: orderTotal };
    });
    bySkuArr = sortByPositioning(bySkuArr);
    return { total: toArr(total), orderByLang: toArr(orderByLang), bySku: bySkuArr };
  }

  // SKU 出单率趋势：按月份统计每个SKU的出单率（用于复盘）
  function getSKUTrendAnalysis(skuFilter) {
    var samples = D.samples;
    if (skuFilter) samples = samples.filter(function (s) { return s.sku === skuFilter; });
    var byMonth = {};
    samples.forEach(function (s) {
      if (!s.sku || !s.sampleTime) return;
      var month = s.sampleTime.slice(0, 7);
      var key = month + '|' + s.sku;
      if (!byMonth[key]) byMonth[key] = { month: month, sku: s.sku, sampleCount: 0, fulfilledCreators: {}, orderedCreators: {} };
      byMonth[key].sampleCount++;
      var m = s.fulfillMethod || '';
      if (m === '视频' || m.indexOf('直播') >= 0) byMonth[key].fulfilledCreators[s.creator] = true;
      if (s.orderCount && s.orderCount > 0) byMonth[key].orderedCreators[s.creator] = true;
    });
    var rows = Object.values(byMonth).map(function (r) {
      var f = Object.keys(r.fulfilledCreators).length;
      var o = Object.keys(r.orderedCreators).length;
      return {
        month: r.month,
        sku: r.sku,
        sampleCount: r.sampleCount,
        fulfilledCreators: f,
        orderedCreators: o,
        orderRate: f > 0 ? Math.round(o / f * 1000) / 10 : 0,
      };
    }).sort(function (a, b) { return (a.month + a.sku).localeCompare(b.month + b.sku); });

    // 计算环比变化：每个SKU按月排序后，当前月 vs 上一月
    var bySku = {};
    rows.forEach(function (r) { if (!bySku[r.sku]) bySku[r.sku] = []; bySku[r.sku].push(r); });
    Object.keys(bySku).forEach(function (sk) {
      var list = bySku[sk].sort(function (a, b) { return a.month.localeCompare(b.month); });
      list.forEach(function (r, i) {
        if (i > 0) {
          r.prevOrderRate = list[i - 1].orderRate;
          r.orderRateDiff = Math.round((r.orderRate - list[i - 1].orderRate) * 10) / 10;
        } else {
          r.prevOrderRate = null;
          r.orderRateDiff = null;
        }
      });
    });
    return rows;
  }

  // SKU 升降归因详情：对比最近两个月各维度分布
  function getSKUAttributionDetail(sku) {
    if (!sku) return null;
    var samples = D.samples.filter(function (s) { return s.sku === sku && s.sampleTime; });
    var byMonth = {};
    samples.forEach(function (s) {
      var month = s.sampleTime.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(s);
    });
    var months = Object.keys(byMonth).sort();
    if (months.length < 2) return null;
    var prevMonth = months[months.length - 2];
    var currMonth = months[months.length - 1];

    function dim(samples) {
      var age = {}, body = {}, official = {}, category = {}, color = {}, lang = {}, approval = {};
      var fulfilledCreators = {}, orderedCreators = {};
      samples.forEach(function (s) {
        if (s.age) age[s.age] = (age[s.age] || 0) + 1;
        if (s.bodyType) body[s.bodyType] = (body[s.bodyType] || 0) + 1;
        if (s.official) official[s.official] = (official[s.official] || 0) + 1;
        if (s.category) {
          String(s.category).split(',').forEach(function (c) { c = c.trim(); if (c) category[c] = (category[c] || 0) + 1; });
        }
        if (s.color) color[s.color] = (color[s.color] || 0) + 1;
        var l = s.language || '其他';
        lang[l] = (lang[l] || 0) + 1;
        if (s.approval) approval[s.approval] = (approval[s.approval] || 0) + 1;
        var m = s.fulfillMethod || '';
        if (m === '视频' || m.indexOf('直播') >= 0) fulfilledCreators[s.creator] = true;
        if (s.orderCount && s.orderCount > 0) orderedCreators[s.creator] = true;
      });
      return { age: age, body: body, official: official, category: category, color: color, language: lang, approval: approval, sampleCount: samples.length, fulfilledCreators: Object.keys(fulfilledCreators).length, orderedCreators: Object.keys(orderedCreators).length };
    }

    function toArr(obj) {
      var total = Object.values(obj).reduce(function (s, v) { return s + v; }, 0) || 1;
      return Object.entries(obj).map(function (e) {
        return { key: e[0], count: e[1], pct: Math.round(e[1] / total * 1000) / 10 };
      }).sort(function (a, b) { return b.count - a.count; });
    }

    var prev = dim(byMonth[prevMonth]);
    var curr = dim(byMonth[currMonth]);
    return {
      sku: sku,
      prevMonth: prevMonth,
      currMonth: currMonth,
      prev: { sampleCount: prev.sampleCount, fulfilledCreators: prev.fulfilledCreators, orderedCreators: prev.orderedCreators, orderRate: prev.fulfilledCreators > 0 ? Math.round(prev.orderedCreators / prev.fulfilledCreators * 1000) / 10 : 0, age: toArr(prev.age), body: toArr(prev.body), official: toArr(prev.official), category: toArr(prev.category), color: toArr(prev.color), language: toArr(prev.language), approval: toArr(prev.approval) },
      curr: { sampleCount: curr.sampleCount, fulfilledCreators: curr.fulfilledCreators, orderedCreators: curr.orderedCreators, orderRate: curr.fulfilledCreators > 0 ? Math.round(curr.orderedCreators / curr.fulfilledCreators * 1000) / 10 : 0, age: toArr(curr.age), body: toArr(curr.body), official: toArr(curr.official), category: toArr(curr.category), color: toArr(curr.color), language: toArr(curr.language), approval: toArr(curr.approval) },
    };
  }

  // SKU 升降归因：对比最近两个月，输出变化维度
  function getSKUAttributionAnalysis(skuFilter) {
    var trend = getSKUTrendAnalysis(skuFilter);
    var bySku = {};
    trend.forEach(function (r) { if (!bySku[r.sku]) bySku[r.sku] = []; bySku[r.sku].push(r); });
    var result = [];
    Object.keys(bySku).forEach(function (sk) {
      var list = bySku[sk].sort(function (a, b) { return a.month.localeCompare(b.month); });
      if (list.length < 2) return;
      var curr = list[list.length - 1];
      var prev = list[list.length - 2];
      result.push({
        sku: sk,
        currMonth: curr.month,
        prevMonth: prev.month,
        currRate: curr.orderRate,
        prevRate: prev.orderRate,
        diff: curr.orderRateDiff,
        direction: (curr.orderRateDiff || 0) > 0 ? 'up' : ((curr.orderRateDiff || 0) < 0 ? 'down' : 'flat'),
      });
    });
    return result.sort(function (a, b) { return Math.abs(b.diff || 0) - Math.abs(a.diff || 0); });
  }

  // 综合数据看板
  function getDashboardData() {
    return {
      creatorPersona: getCreatorPersonaAnalysis(),
      devEffect: getDevEffectAnalysis(),
      productAnalysis: getProductAnalysis(),
      videoAnalytics: getVideoAnalytics(),
      reinvest: getReinvestAnalysis(),
      taskGap: getTaskGapAnalysis(),
    };
  }

  /* ========== 旧API兼容（部分页面仍在用） ========== */

  function getRecommendedSKUs(category, score) {
    var skus = getSKUs();
    var matched = skus.filter(function (s) {
      return s.positioning === '爆品' || s.positioning === '销售';
    });
    if (matched.length === 0) matched = skus.slice(0, 3);
    return matched.slice(0, 3);
  }

  // 写入型操作后统一清缓存（addCreator 会改动 D.creators）
  function addCreator(creator) {
    clearCache();
    // 飞书接入后替换为API写入
    var newCreator = Object.assign({
      name: '',
      official: null,
      stars: null,
      creatorType: null,
      bodyType: null,
      age: null,
      fulfillment: null,
      category: null,
      note: null,
      sampleCount: 0,
      videoCount: 0,
      skus: [],
      lastSampleTime: null,
    }, creator);
    D.creators.push(newCreator);
    return newCreator;
  }

  function saveAnalysis(creatorName, analysis) {
    // TODO: 飞书API写入
    return true;
  }

  /* ========== 结果缓存（性能） ==========
     REAL_DATA 在页面生命周期内不变，但页面常反复调用同一个分析函数
     （典型：daily.js 里 getDailyReportData 被调 10 次 × 74ms ≈ 740ms），
     这是"切换模块很卡"的主因。这里给纯计算函数加一层记忆化。

     注意：只包裹「仅读取 REAL_DATA」的纯函数。
     产品页编辑 SKU 会写 localStorage，保存后需调用 Data.clearCache() 让缓存失效。 */
  var _memoStore = {};

  function memo(name, fn) {
    return function () {
      var key = name;
      if (arguments.length) {
        // 参数少且都是标量/数组，JSON 化做 key 足够且开销可忽略
        try { key += ':' + JSON.stringify(Array.prototype.slice.call(arguments)); }
        catch (e) { return fn.apply(null, arguments); } // 有循环引用就不缓存
      }
      if (Object.prototype.hasOwnProperty.call(_memoStore, key)) return _memoStore[key];
      var val = fn.apply(null, arguments);
      _memoStore[key] = val;
      return val;
    };
  }

  function clearCache() {
    _memoStore = {};
  }

  // 重新绑定为记忆化版本。函数声明创建的是可重新赋值的绑定，
  // 因此 data.js 内部的相互调用（如 getDailyReportData 内部调 getReportData）也会命中缓存。
  getReportData = memo('getReportData', getReportData);
  getDailyReportData = memo('getDailyReportData', getDailyReportData);
  getCreators = memo('getCreators', getCreators);
  getVideos = memo('getVideos', getVideos);
  getSamples = memo('getSamples', getSamples);
  getInvites = memo('getInvites', getInvites);
  getReinvestAnalysis = memo('getReinvestAnalysis', getReinvestAnalysis);
  getInvitePassRate = memo('getInvitePassRate', getInvitePassRate);
  getTaskGapAnalysis = memo('getTaskGapAnalysis', getTaskGapAnalysis);
  getSampleDashboard = memo('getSampleDashboard', getSampleDashboard);
  getVideoAnalytics = memo('getVideoAnalytics', getVideoAnalytics);
  getTopVideoCreators = memo('getTopVideoCreators', getTopVideoCreators);
  getVideoQualityProfile = memo('getVideoQualityProfile', getVideoQualityProfile);
  getCreatorPersonaAnalysis = memo('getCreatorPersonaAnalysis', getCreatorPersonaAnalysis);
  getDevEffectAnalysis = memo('getDevEffectAnalysis', getDevEffectAnalysis);
  getProductAnalysis = memo('getProductAnalysis', getProductAnalysis);
  getTrendAnalysis = memo('getTrendAnalysis', getTrendAnalysis);
  getLanguageDistribution = memo('getLanguageDistribution', getLanguageDistribution);
  getFulfillmentRate = memo('getFulfillmentRate', getFulfillmentRate);
  getDashboardData = memo('getDashboardData', getDashboardData);
  getTasksByMonth = memo('getTasksByMonth', getTasksByMonth);
  getTaskActualSamples = memo('getTaskActualSamples', getTaskActualSamples);
  getTaskTodaySamples = memo('getTaskTodaySamples', getTaskTodaySamples);
  getAllSKUDetails = memo('getAllSKUDetails', getAllSKUDetails);

  /* ========== 导出 ========== */
  global.DloodaData = {
    clearCache: clearCache,
    // 达人
    getCreators: getCreators,
    getCreatorByName: getCreatorByName,
    getCreatorById: getCreatorByName,  // 兼容旧调用
    searchCreators: searchCreators,
    getCreatorsByFilter: getCreatorsByFilter,
    getCreatorStats: getCreatorStats,
    // SKU
    getSKUs: getSKUs,
    getSKUByCode: getSKUByCode,
    getSKUById: getSKUByCode,  // 兼容旧调用
    getSKUsByPositioning: getSKUsByPositioning,
    getSKUDetail: getSKUDetail,
    getAllSKUDetails: getAllSKUDetails,
    getSKUPositionTier: getSKUPositionTier,
    sortByPositioning: sortByPositioning,
    saveSKUOverride: saveSKUOverride,
    // 寄样
    getSamples: getSamples,
    getSamplesByCreator: getSamplesByCreator,
    getSamplesBySKU: getSamplesBySKU,
    getSamplesByFulfillMethod: getSamplesByFulfillMethod,
    getSampleStats: getSampleStats,
    // 邀约
    getInvites: getInvites,
    getInvitations: getInvites,  // 兼容旧调用
    getInvitationsByStatus: function () { return getInvites(); },  // 兼容
    getInvitesWithScripts: getInvitesWithScripts,
    getInvitesBySKU: getInvitesBySKU,
    getInviteStats: getInviteStats,
    getInviteAchievedCount: getInviteAchievedCount,
    // 暂定
    getPending: getPending,
    getPendingStats: getPendingStats,
    // 任务
    getTasks: getTasks,
    getTasksByPriority: getTasksByPriority,
    getTasksByMonth: getTasksByMonth,
    getCurrentMonthTasks: getCurrentMonthTasks,
    getTaskActualSamples: getTaskActualSamples,
    getTaskTodaySamples: getTaskTodaySamples,
    getRemainingWorkdays: getRemainingWorkdays,
    getTaskStats: getTaskStats,
    // 视频
    getVideos: getVideos,
    getVideosByStatus: function () { return getVideos(); },  // 兼容
    getVideosByCreator: getVideosByCreator,
    getVideosBySKU: getVideosBySKU,
    getVideoStats: getVideoStats,
    // 报表
    getReportData: getReportData,
    getDailyReportData: getDailyReportData,
    // 深度分析 (v3)
    getSampleDashboard: getSampleDashboard,
    getVideoAnalytics: getVideoAnalytics,
    getTopVideoCreators: getTopVideoCreators,
    getVideoQualityProfile: getVideoQualityProfile,
    getCreatorPersonaAnalysis: getCreatorPersonaAnalysis,
    getDevEffectAnalysis: getDevEffectAnalysis,
    getProductAnalysis: getProductAnalysis,
    getInvitePassRate: getInvitePassRate,
    getReinvestAnalysis: getReinvestAnalysis,
    getOrderCreatorRanking: getOrderCreatorRanking,
    getCreatorSKUBreakdown: getCreatorSKUBreakdown,
    getTaskGapAnalysis: getTaskGapAnalysis,
    getDashboardData: getDashboardData,
    getTrendAnalysis: getTrendAnalysis,
    getFulfillMethodDistribution: getFulfillMethodDistribution,
    getFulfillmentRate: getFulfillmentRate,
    getLanguageDistribution: getLanguageDistribution,
    getSKUTrendAnalysis: getSKUTrendAnalysis,
    getSKUAttributionAnalysis: getSKUAttributionAnalysis,
    getSKUAttributionDetail: getSKUAttributionDetail,
    getAvailableSKUs: getAvailableSKUs,
    getTodayStr: getTodayStr,
    // AI辅助
    getScoringSuggestion: getScoringSuggestion,
    getRecommendedSKUs: getRecommendedSKUs,
    // 写入
    addCreator: addCreator,
    saveAnalysis: saveAnalysis,
    // 兼容旧API
    getCreatorsBySampleStatus: function (status) {
      if (status === 'all') return getCreators();
      return getCreators();  // 真实数据用getCreatorsByFilter替代
    },
    getMessages: function () { return []; },
    getConversations: function () { return []; },
    getConversationByCreator: function () { return null; },
  };

})(window);
