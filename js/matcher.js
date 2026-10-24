/* ================================================================
   Dlooda TKBD CRM — 达人匹配引擎 (matcher.js)
   把外部名单（handle）与飞书已有数据比对，输出准入判定
   三道规则：黑名单/低效拦截 → 累计 3 款锁定 → 已合作该款去重
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;

  /* 黑名单 / 低效 的关键词（对应飞书「达人类型」字段取值） */
  var BLACKLIST_KEY = '黑名单达人';
  var LOW_EFF_KEY = '低效达人';

  /* 累计合作 SKU 上限：达到后不再发第 4 款自动邀约 */
  var SKU_LIMIT = 3;

  /* ---------- 字段归一化 ----------
   * 飞书的 category / creatorType 可能是数组，也可能是「A,B」字符串
   */
  function normField(v) {
    if (v == null) return [];
    if (Array.isArray(v)) {
      return v.map(function (x) { return String(x).trim(); }).filter(Boolean);
    }
    return String(v).split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------- handle 清洗 ----------
   * 目标：@Sarah.Kramer / sarah kramer / Sarah_Kramer 都能对上 sarahkramer
   * 做法：去首尾空格 → 去 @ 前缀 → 转小写 → 去掉所有非字母数字的符号
   */
  function normalize(raw) {
    if (raw == null) return '';
    return String(raw)
      .trim()
      .replace(/^@+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
      .replace(/\.+$/, '');
  }

  /* ---------- 索引 ---------- */

  var index = null;        // handle -> { rid, name, creatorType[], skus[], sampleCount, videoCount, lastSampleTime, ... }
  var rawIndex = null;     // 原始 name（小写）-> handle，用于模糊兜底

  function getData() {
    // 优先用上传覆盖的数据，其次用同步来的 real-data
    var uploaded = null;
    try { uploaded = JSON.parse(global.localStorage.getItem('dlooda_uploaded_data')); } catch (e) {}
    var d = (uploaded && uploaded.creators && uploaded.creators.length)
      ? uploaded
      : (global.REAL_DATA || null);
    return d;
  }

  function buildIndex(force) {
    if (index && !force) return index;
    index = {};
    rawIndex = {};

    var d = getData();
    if (!d) return index;

    // 1) 先从 creators 汇总表建基础档案
    (d.creators || []).forEach(function (c) {
      var h = normalize(c.name);
      if (!h) return;
      index[h] = {
        rid: c._rid || null,
        name: c.name,
        creatorType: normField(c.creatorType),
        skus: (c.skus || []).slice(),
        sampleCount: c.sampleCount || 0,
        videoCount: c.videoCount || 0,
        official: c.official || '',
        stars: c.stars || '',
        bodyType: c.bodyType || '',
        age: c.age || '',
        fulfillment: c.fulfillment || '',
        category: normField(c.category),
        note: c.note || '',
        lastSampleTime: c.lastSampleTime || null,
      };
    });

    // 2) 用 samples 寄样明细补全（更权威：寄样记录 + 达人类型 + 履约状态）
    (d.samples || []).forEach(function (s) {
      var h = normalize(s.creator);
      if (!h) return;
      if (!index[h]) {
        index[h] = {
          rid: s._rid || null,
          name: s.creator,
          creatorType: [],
          skus: [],
          sampleCount: 0,
          videoCount: 0,
          official: s.official || '',
          stars: s.stars || '',
          bodyType: s.bodyType || '',
          age: s.age || '',
          fulfillment: s.fulfillment || '',
          category: normField(s.category),
          note: s.note || '',
          lastSampleTime: null,
        };
      }
      var c = index[h];
      normField(s.creatorType).forEach(function (t) {
        if (c.creatorType.indexOf(t) === -1) c.creatorType.push(t);
      });
      if (s.sku && c.skus.indexOf(s.sku) === -1) c.skus.push(s.sku);
      if (s.sampleTime && (!c.lastSampleTime || s.sampleTime > c.lastSampleTime)) {
        c.lastSampleTime = s.sampleTime;
      }
      c.sampleCount += 1;
      c.videoCount += (s.videos || []).length;
    });

    // 3) 原始名小写索引（兜底：去掉下划线等符号后仍可对上）
    (d.creators || []).forEach(function (c) {
      if (c && c.name) rawIndex[String(c.name).trim().toLowerCase()] = normalize(c.name);
    });

    return index;
  }

  /* ---------- 查档案 ---------- */

  function lookup(rawHandle) {
    buildIndex();
    var h = normalize(rawHandle);
    if (!h) return null;
    if (index[h]) return index[h];
    var alt = rawIndex[String(rawHandle).trim().toLowerCase()];
    if (alt && index[alt]) return index[alt];
    return null;
  }

  /* ---------- 准入判定 ----------
   * 返回 { status, label, reason, creator, cooperatedSkus, skuCount }
   * status: 'blacklist' | 'inefficient' | 'skuLimit' | 'cooperated' | 'ok'
   */
  function check(rawHandle, targetSku) {
    var h = normalize(rawHandle);
    var c = lookup(rawHandle);
    var out = {
      handle: h,
      raw: String(rawHandle || '').trim(),
      creator: c,
      cooperatedSkus: c ? (c.skus || []) : [],
      skuCount: c ? (c.skus || []).length : 0,
      targetSku: targetSku || '',
      status: 'ok',
      label: '可发送',
      reason: '',
    };

    if (!h) {
      out.status = 'invalid';
      out.label = '无效 handle';
      out.reason = '清洗后为空，无法匹配';
      return out;
    }

    if (c) {
      var types = c.creatorType || [];
      var isBlack = types.some(function (t) { return t.indexOf('黑名单') !== -1; });
      var isLow = types.some(function (t) { return t.indexOf('低效') !== -1; });

      if (isBlack) {
        out.status = 'blacklist';
        out.label = '黑名单达人';
        out.reason = '飞书标记「黑名单达人」，拒绝录入';
        return out;
      }
      if (isLow) {
        out.status = 'inefficient';
        out.label = '低效达人';
        out.reason = '飞书标记「低效达人」，拒绝录入';
        return out;
      }
      if (out.skuCount >= SKU_LIMIT) {
        out.status = 'skuLimit';
        out.label = '已达 ' + SKU_LIMIT + ' 款上限';
        out.reason = '历史累计合作 ' + out.skuCount + ' 款（' + out.cooperatedSkus.join('、') + '），不再发新 SKU 自动邀约';
        return out;
      }
      if (targetSku && out.cooperatedSkus.indexOf(targetSku) !== -1) {
        out.status = 'cooperated';
        out.label = '已合作该款';
        out.reason = '已合作过 SKU ' + targetSku + '，本次不再发送（可手动放行）';
        return out;
      }
      out.reason = '飞书无黑名单/低效标记，累计 ' + out.skuCount + ' 款';
      return out;
    }

    // 飞书里查不到 → 新达人
    out.status = 'ok';
    out.label = '新达人';
    out.reason = '飞书表格中无该达人记录，可纳入自动邀约';
    return out;
  }

  /* ---------- 批量判定 ---------- */

  function checkBatch(rawHandles, targetSku) {
    return rawHandles.map(function (h) { return check(h, targetSku); });
  }

  /* ---------- 解析粘贴的名单 ----------
   * 支持：换行 / 逗号 / 空格 / 分号 / 制表符 分隔
   * 自动去掉空行、URL 前缀（https://www.tiktok.com/@xxx → xxx）
   */
  function parseHandles(text) {
    if (!text) return [];
    // 分隔符：换行 / 逗号 / 分号 / 制表符 / 空格
    // （TikTok handle 本身不含空格，所以按空格切分是安全的）
    var parts = String(text)
      .split(/[\n\r,，;；\t\s]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    return parts.map(function (p) {
      // 去掉 URL，只留 handle
      var m = /@([A-Za-z0-9._-]+)/.exec(p);
      if (m) return m[1];
      return p.replace(/^https?:\/\/\S*\//i, '').trim();
    });
  }

  /* ---------- 摘要统计 ---------- */

  function summarize(results) {
    var s = { total: results.length, ok: 0, blacklist: 0, inefficient: 0, skuLimit: 0, cooperated: 0, invalid: 0, duplicated: 0 };
    var seen = {};
    results.forEach(function (r) {
      s[r.status] = (s[r.status] || 0) + 1;
      if (seen[r.handle]) s.duplicated++;
      seen[r.handle] = true;
    });
    return s;
  }

  /* ---------- 去重（名单内部重复） ---------- */

  function dedupe(rawHandles) {
    var seen = {}, out = [];
    rawHandles.forEach(function (h) {
      var n = normalize(h);
      if (!n || seen[n]) return;
      seen[n] = true;
      out.push(h);
    });
    return out;
  }

  global.DloodaMatcher = {
    SKU_LIMIT: SKU_LIMIT,
    BLACKLIST_KEY: BLACKLIST_KEY,
    LOW_EFF_KEY: LOW_EFF_KEY,
    normalize: normalize,
    normField: normField,
    lookup: lookup,
    check: check,
    checkBatch: checkBatch,
    parseHandles: parseHandles,
    dedupe: dedupe,
    summarize: summarize,
    rebuild: function () { buildIndex(true); },
  };

})(window);
