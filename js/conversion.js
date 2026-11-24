/* ================================================================
   Dlooda TKBD CRM — 出单转化：SKU 点击转化卡片
   ----------------------------------------------------------------
   数据来源：用户在页面内上传 Excel / CSV，浏览器前端用 SheetJS 解析并计算，
   不依赖后端、不读飞书同步表、不手工填、不造数。
   口径要点（与改造指令 3.5 对齐）：
     · 视频按「发布时间」筛区间；订单按「创建时间」筛区间（不用支付时间）
     · 视频归 SKU：商品长文本只认「第一个商品 ID」，首 ID 不在对照表不计入
     · 月度口径 VV<=50 全剔（含 50）；新品全量 VV<50 剔除、=50 保留
     · 转化单数：同时有「归因成交件数」「商品成交件数」时取两列合计更大的一列
     · 数字列先转数值再求和；缺列标「暂无数据」
     · 寄样数 / 达人出单率沿用现有库（getReportData / getProductAnalysis）
     · 环比 = 上一等长周期，需另行上传上月表；缺上月数据一律显示「较上月 -」
    · 主网格严格 2 行 × 5 列 = 10 指标；播放/点击/转化率 3 个过程量收进「展开详情」
   ================================================================ */
(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  var LS_MAP = 'dlooda_sku_product_map';

  /* ---------- 内置 SKU ↔ 商品 ID 对照表（可在本页增删改，存 localStorage） ---------- */
  var DEFAULT_PRODUCT_MAP = {
    '1729491139351582067': '28173',
    '1731643102010446195': '2190',
    '1731640825019273587': '2178',
    '1732356649258946931': '2189',
    '1732670195385799027': '2A16',
    '1732688802864468339': '2F08',
    '1732691769117544819': '2A51',
    '1732702578190487923': '2A50',
    '1732709226970976627': '2H43',
    '1732732656937898355': '2C33',
    '1732732633002447219': '2Q02',
    '1731533592559784307': '2722',
    '1732397747791171955': '2881',
    '1732394373848863091': '2L06',
    '1732572184768516467': '28102',
    '1732393808395604339': '2A08'
  };

  /* ---------- 字段定义（关键词按顺序优先，越具体越靠前） ---------- */
  var VIDEO_FIELDS = [
    { key: 'publishTime', label: '发布时间 / 投稿时间', kws: ['视频发布时间', '发布时间', '发布日期', '投稿时间', '投稿日期', '发布', 'publish', 'date'] },
    { key: 'product',     label: '商品（含商品 ID 长文本）', kws: ['商品id', '商品 id', '商品链接', '关联商品', '商品信息', '商品', 'product'] },
    { key: 'vv',          label: 'VV / 播放量', kws: ['播放量', '播放次数', '播放数', 'vv', '观看量', '播放', 'views', 'view'] },
    { key: 'clicks',      label: '商品点击次数', kws: ['商品点击次数', '商品点击数', '点击次数', '商品点击', '点击量', '点击', 'click'] },
    { key: 'attrOrders',  label: '视频归因成交件数', kws: ['视频归因成交件数', '归因成交件数', '归因成交', '归因'] },
    { key: 'prodOrders',  label: '视频商品成交件数（可选）', kws: ['视频商品成交件数', '商品成交件数', '商品成交'] }
  ];
  var ORDER_FIELDS = [
    { key: 'createdTime', label: '创建时间 / 下单时间', kws: ['订单创建时间', '创建时间', '下单时间', '下单日期', '订单时间', 'created', 'date'] },
    { key: 'product',     label: '商品 ID', kws: ['商品id', '商品 id', '商品编号', 'product id', '商品'] },
    { key: 'gmv',         label: '支付金额 / GMV', kws: ['支付金额', '支付总额', 'gmv', '订单金额', '实付金额', '成交金额'] },
    { key: 'units',       label: '下单件数 / 成交件数', kws: ['下单件数', '成交件数', '购买件数', '商品件数', '件数', '数量', 'qty'] },
    { key: 'status',      label: '订单状态', kws: ['订单状态', '状态', 'status'] },
    { key: 'adRate',      label: '店铺广告佣金率', kws: ['店铺广告佣金率', '广告佣金率', '佣金率', '广告佣金', '佣金'] },
    // 可选：上传表若带达人列，才能算「按达人累计 GMV」；没有该列一律显示「暂无数据」，不拿现有库凑
    { key: 'creator',     label: '达人昵称（可选）', kws: ['达人昵称', '达人名称', '达人账号', '达人', 'creator', 'handle', 'tiktok'] }
  ];

  var SLOTS = [
    { id: 'video',      title: '本期 · 视频登记表',  type: 'video', required: true },
    { id: 'order',      title: '本期 · 订单全量表',  type: 'order', required: true },
    { id: 'prevVideo',  title: '上月 · 视频登记表（环比用，可选）', type: 'video', required: false },
    { id: 'prevOrder',  title: '上月 · 订单全量表（环比用，可选）', type: 'order', required: false }
  ];

  var state = {
    map: null,
    slots: {},              // slotId -> { fileName, aoa, headerRow, headers, mapping }
    range: 'month',
    videoMode: 'monthly',
    statusWhite: '待确认,已结算',
    customStart: '',
    customEnd: '',
    sortBy: 'gmv',
    showMapEditor: false,
    expanded: {},           // sku -> 是否展开「过程量」详情
    result: null
  };

  /* ========== 工具函数 ========== */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    var n = Number(String(v).replace(/[,$%\s,，]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ''; }
  function toast(msg) { if (App && App.showToast) App.showToast(msg); }

  function toDateStr(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return fmtDate(v);
    var s = String(v).trim();
    // Excel 序列号
    if (/^\d{5}(\.\d+)?$/.test(s)) {
      var n = Number(s);
      if (n > 20000 && n < 90000) return fmtDate(new Date(Math.round((n - 25569) * 86400 * 1000)));
    }
    var m;
    // YYYY-MM-DD / YYYY/MM/DD（可带时间）
    m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (m) return m[1] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[3]));
    // DD/MM/YYYY（飞书订单导出常见）
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return m[3] + '-' + pad(Number(m[2])) + '-' + pad(Number(m[1]));
    var t = Date.parse(s);
    if (!isNaN(t)) return fmtDate(new Date(t));
    return '';
  }

  function firstProductId(v) {
    if (isBlank(v)) return '';
    var m = String(v).match(/\d{10,}/);
    return m ? m[0] : '';
  }

  function loadMap() {
    try {
      var raw = localStorage.getItem(LS_MAP);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_PRODUCT_MAP);
  }
  function saveMap(m) {
    try { localStorage.setItem(LS_MAP, JSON.stringify(m)); } catch (e) {}
  }

  /* ========== SheetJS 加载 ========== */
  function ensureXLSX() {
    if (global.XLSX) return Promise.resolve(global.XLSX);
    if (document.querySelector('script[src="' + XLSX_CDN + '"]')) {
      return new Promise(function (res, rej) {
        var n = 0;
        (function wait() {
          if (global.XLSX) return res(global.XLSX);
          if (++n > 60) return rej(new Error('SheetJS 加载超时'));
          setTimeout(wait, 250);
        })();
      });
    }
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = XLSX_CDN;
      s.onload = function () { res(global.XLSX); };
      s.onerror = function () { rej(new Error('SheetJS 加载失败，请检查网络')); };
      document.head.appendChild(s);
    });
  }

  /* ========== 表头自动探测 ========== */
  var ALL_KWS = VIDEO_FIELDS.concat(ORDER_FIELDS).reduce(function (a, f) {
    return a.concat(f.kws);
  }, []);

  function headerHit(cell, kw) {
    var s = String(cell == null ? '' : cell).toLowerCase().replace(/[\s_\-()（）]/g, '');
    var k = String(kw).toLowerCase().replace(/[\s_\-()（）]/g, '');
    return s.indexOf(k) !== -1;
  }

  function detectHeaderRow(aoa) {
    var best = 0, bestScore = -1;
    var limit = Math.min(10, aoa.length);
    for (var i = 0; i < limit; i++) {
      var row = aoa[i] || [];
      var hits = 0, textCells = 0;
      for (var c = 0; c < row.length; c++) {
        var v = row[c];
        if (isBlank(v)) continue;
        if (!/^\d+(\.\d+)?$/.test(String(v).trim())) textCells++;
        for (var k = 0; k < ALL_KWS.length; k++) {
          if (headerHit(v, ALL_KWS[k])) { hits++; break; }
        }
      }
      var score = hits * 10 + textCells * 0.2 - i * 0.3;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    // 没有任何关键词命中时，退回第一行（不猜）
    return { row: best, hits: bestScore >= 10 ? Math.round(bestScore / 10) : 0 };
  }

  function autoMapping(headers, fields) {
    var mapping = {}, used = {};
    fields.forEach(function (f) {
      mapping[f.key] = '';
      for (var ki = 0; ki < f.kws.length && !mapping[f.key]; ki++) {
        for (var ci = 0; ci < headers.length; ci++) {
          if (used[ci]) continue;
          if (headerHit(headers[ci], f.kws[ki])) {
            mapping[f.key] = ci;
            used[ci] = true;
            break;
          }
        }
      }
    });
    return mapping;
  }

  /* ========== CSV 文本编码识别（3.2：UTF-8 / UTF-8 BOM → 乱码时 GBK / GB18030） ========== */
  var CN_KWS = ['发布时间', '投稿时间', '创建时间', '下单时间', '商品', '播放', '点击', '成交', '归因',
                '支付金额', '下单件数', '订单状态', '佣金', '状态', '件数', '金额', '视频',
                '日期', '编号', '时间', '数量', '颜色', '达人', '名称'];

  function cnHitCount(text) {
    var n = 0, i;
    for (i = 0; i < CN_KWS.length; i++) if (text.indexOf(CN_KWS[i]) >= 0) n++;
    return n;
  }

  /* 典型乱码特征：替换符 / C1 控制字符（GBK 被当 UTF-8）、或 Latin-1 高位字母串（UTF-8 被当 Latin-1） */
  function looksMojibake(s) {
    var str = String(s || '');
    var bad = (str.match(/[\uFFFD\u0080-\u009F]/g) || []).length;
    var moji = (str.match(/[åæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g) || []).length;
    return bad >= 2 || moji >= 3;
  }

  function decodeCsvBuffer(buf) {
    var u8 = new Uint8Array(buf);
    var hasBom = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
    var body = hasBom ? u8.subarray(3) : u8;

    // ① 严格 UTF-8：非法字节序列会直接抛错
    var utf8 = null, utf8Valid = true;
    try { utf8 = new TextDecoder('utf-8', { fatal: true }).decode(body); }
    catch (e) { utf8Valid = false; }

    // ② 备选 GB18030（Chrome/Edge 的 Encoding API 中 gbk 会归一到 gb18030）
    var gbk = null;
    try { gbk = new TextDecoder('gb18030').decode(body); } catch (e2) { gbk = null; }

    if (hasBom) return { text: utf8Valid ? utf8 : (gbk || ''), encoding: 'UTF-8 (BOM)' };

    // ③ UTF-8 合法且不像乱码时优先；但若 GBK 解码命中的中文表头明显更多，说明原文件其实是 GBK
    if (utf8Valid && !looksMojibake(utf8)) {
      var a = cnHitCount(utf8), b = gbk ? cnHitCount(gbk) : 0;
      if (a >= b || b === 0) return { text: utf8, encoding: 'UTF-8' };
    }
    if (gbk) return { text: gbk, encoding: 'GBK / GB18030' };
    return { text: utf8 || '', encoding: 'UTF-8' };
  }

  /* ========== 文件上传解析 ========== */
  function handleFile(slotId, file) {
    if (!file) return;
    var isCsv = /\.csv$/i.test(file.name);
    ensureXLSX().then(function (XLSX) {
      var fr = new FileReader();
      fr.onload = function (e) {
        try {
          var wb, enc = '';
          if (isCsv) {
            var dec = decodeCsvBuffer(e.target.result);
            enc = dec.encoding;
            wb = XLSX.read(dec.text, { type: 'string', cellDates: false });
          } else {
            wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
          }
          var ws = wb.Sheets[wb.SheetNames[0]];
          var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          if (!aoa.length) { toast('文件内容为空'); return; }
          var det = detectHeaderRow(aoa);
          var headers = (aoa[det.row] || []).map(function (h, i) {
            return isBlank(h) ? '（第 ' + (i + 1) + ' 列）' : String(h).trim();
          });
          var slot = SLOTS.filter(function (s) { return s.id === slotId; })[0];
          state.slots[slotId] = {
            fileName: file.name,
            aoa: aoa,
            headerRow: det.row,
            headers: headers,
            mapping: autoMapping(headers, slot.type === 'video' ? VIDEO_FIELDS : ORDER_FIELDS),
            headerHits: det.hits,
            encoding: enc,
            type: slot.type
          };
          render();
          toast('已解析 ' + file.name + '（表头第 ' + (det.row + 1) + ' 行'
            + (enc ? ' · 编码 ' + enc : '') + '）');
        } catch (err) {
          toast('解析失败：' + (err && err.message ? err.message : '文件格式不支持'));
        }
      };
      fr.onerror = function () { toast('文件读取失败'); };
      fr.readAsArrayBuffer(file);
    }).catch(function (err) { toast(err.message || '表格组件加载失败'); });
  }

  /* ========== 区间计算 ========== */
  function getRanges() {
    var t = new Date();
    var y = t.getFullYear(), m = t.getMonth();
    var start, end, pStart, pEnd;
    if (state.range === 'month') {
      start = fmtDate(new Date(y, m, 1));
      end = fmtDate(new Date(y, m + 1, 0));
      pStart = fmtDate(new Date(y, m - 1, 1));
      pEnd = fmtDate(new Date(y, m, 0));
    } else if (state.range === '7d') {
      var s7 = new Date(t); s7.setDate(s7.getDate() - 6);
      var pe7 = new Date(s7); pe7.setDate(pe7.getDate() - 1);
      var ps7 = new Date(pe7); ps7.setDate(ps7.getDate() - 6);
      start = fmtDate(s7); end = fmtDate(t);
      pStart = fmtDate(ps7); pEnd = fmtDate(pe7);
    } else {
      start = state.customStart || fmtDate(new Date(y, m, 1));
      end = state.customEnd || fmtDate(t);
      var ds = new Date(start + 'T00:00:00'), de = new Date(end + 'T00:00:00');
      var days = Math.max(1, Math.round((de - ds) / 86400000) + 1);
      var pe = new Date(ds); pe.setDate(pe.getDate() - 1);
      var ps = new Date(pe); ps.setDate(ps.getDate() - days + 1);
      pStart = fmtDate(ps); pEnd = fmtDate(pe);
    }
    return { start: start, end: end, prevStart: pStart, prevEnd: pEnd };
  }

  function inRange(d, s, e) { return !!d && d >= s && d <= e; }

  /* ========== 核心计算 ========== */
  function computeVideo(slot, range, mode) {
    var out = {}, missing = { vv: false, clicks: false, orders: false, publish: false };
    // 未上传视频表：所有视频侧字段都视为「缺列」，一律显示「暂无数据」，绝不补 0
    if (!slot || slot.type !== 'video') {
      return { data: out, missing: { vv: true, clicks: true, orders: true, publish: true }, empty: true };
    }
    var mp = slot.mapping;
    missing.vv = mp.vv === '' || mp.vv === undefined;
    missing.clicks = mp.clicks === '' || mp.clicks === undefined;
    missing.publish = mp.publishTime === '' || mp.publishTime === undefined;
    missing.orders = (isBlank(mp.attrOrders) && isBlank(mp.prodOrders));

    var rows = slot.aoa.slice(slot.headerRow + 1).filter(function (r) {
      return r && r.some(function (c) { return !isBlank(c); });
    });

    // 转化单数列选择：两列都存在时取「整列合计更大」的那一列
    var orderKey = '';
    if (!isBlank(mp.attrOrders) && !isBlank(mp.prodOrders)) {
      var sumA = 0, sumB = 0;
      rows.forEach(function (r) { sumA += num(r[mp.attrOrders]); sumB += num(r[mp.prodOrders]); });
      orderKey = sumA >= sumB ? 'attrOrders' : 'prodOrders';
    } else if (!isBlank(mp.attrOrders)) orderKey = 'attrOrders';
    else if (!isBlank(mp.prodOrders)) orderKey = 'prodOrders';
    missing.orders = !orderKey;

    rows.forEach(function (r) {
      var d = missing.publish ? '' : toDateStr(r[mp.publishTime]);
      if (!missing.publish && !inRange(d, range.start, range.end)) return;
      var pid = firstProductId(isBlank(mp.product) ? '' : r[mp.product]);
      var sku = state.map[pid];
      if (!sku) return;

      var vv = missing.vv ? 0 : num(r[mp.vv]);
      if (!missing.vv) {
        // 月度口径：VV<=50 全剔（含 50）；新品全量：VV<50 剔除、=50 保留
        if (mode === 'full') { if (vv < 50) return; }
        else { if (vv <= 50) return; }
      }
      var clicks = missing.clicks ? 0 : num(r[mp.clicks]);
      var orders = orderKey ? num(r[mp[orderKey]]) : 0;

      var a = out[sku] || (out[sku] = { videos: 0, orderedVideos: 0, orderUnits: 0, vv: 0, clicks: 0, conversions: 0 });
      a.videos += 1;
      a.vv += vv;
      a.clicks += clicks;
      a.orderUnits += orders;
      a.conversions += orders;      // 转化单数（口径同成交件数，按列值计）
      if (orders > 0) a.orderedVideos += 1;
    });
    return { data: out, missing: missing, empty: false, orderKey: orderKey };
  }

  function computeOrder(slot, range) {
    var out = {}, missing = { gmv: false, units: false, natural: false, created: false, status: false };
    // 未上传订单表：所有订单侧字段都视为「缺列」，一律显示「暂无数据」，绝不补 0
    if (!slot || slot.type !== 'order') {
      return { data: out, missing: { gmv: true, units: true, natural: true, created: true, status: true },
               empty: true, totals: { rows: 0, naturalRows: 0 }, byCreator: {}, hasCreator: false };
    }
    var mp = slot.mapping;
    missing.gmv = isBlank(mp.gmv);
    missing.units = isBlank(mp.units);
    missing.created = isBlank(mp.createdTime);
    missing.status = isBlank(mp.status);
    missing.natural = isBlank(mp.adRate);
    var hasCreator = !isBlank(mp.creator);
    var totals = { rows: 0, naturalRows: 0 };
    var byCreator = {};

    var white = (state.statusWhite || '').split(/[,，、\s]+/).filter(Boolean);
    slot.aoa.slice(slot.headerRow + 1).forEach(function (r) {
      if (!r || !r.some(function (c) { return !isBlank(c); })) return;
      var d = missing.created ? '' : toDateStr(r[mp.createdTime]);
      if (!missing.created && !inRange(d, range.start, range.end)) return;
      if (!missing.status && white.length) {
        var st = String(r[mp.status] == null ? '' : r[mp.status]).trim();
        if (white.indexOf(st) === -1) return;
      }
      var pid = firstProductId(isBlank(mp.product) ? '' : r[mp.product]);
      var sku = state.map[pid];
      if (!sku) return;

      var a = out[sku] || (out[sku] = { gmv: 0, units: 0, rows: 0, naturalRows: 0 });
      a.rows += 1;
      totals.rows += 1;
      if (!missing.gmv) a.gmv += num(r[mp.gmv]);
      if (!missing.units) a.units += num(r[mp.units]);
      if (!missing.natural && isBlank(r[mp.adRate])) { a.naturalRows += 1; totals.naturalRows += 1; }
      if (hasCreator) {
        var cn = String(r[mp.creator] == null ? '' : r[mp.creator]).trim();
        if (cn) {
          var ca = byCreator[cn] || (byCreator[cn] = { gmv: 0, units: 0, orders: 0, lastTime: '' });
          ca.orders += 1;
          if (!missing.gmv) ca.gmv += num(r[mp.gmv]);
          if (!missing.units) ca.units += num(r[mp.units]);
          if (d && (!ca.lastTime || d > ca.lastTime)) ca.lastTime = d;
        }
      }
    });
    return { data: out, missing: missing, empty: false,
             totals: totals, byCreator: byCreator, hasCreator: hasCreator };
  }

  /* 现有库指标（寄样数、达人出单率）：沿用现有页面口径，不另算 */
  function existingMetrics() {
    var res = {};
    try {
      var rep = Data.getReportData();
      (rep.skuRanking || []).forEach(function (x) {
        var r = res[x.sku] || (res[x.sku] = {});
        r.samples = x.sampleCount;
      });
    } catch (e) {}
    try {
      var pa = Data.getProductAnalysis();
      // getProductAnalysis() 实际返回 SKU 明细数组（也兼容带 skuRanking 的对象形式）
      var list = Array.isArray(pa) ? pa : (pa && pa.skuRanking) || [];
      list.forEach(function (x) {
        var r = res[x.sku] || (res[x.sku] = {});
        r.orderRate = x.orderRate;
      });
    } catch (e) {}
    return res;
  }

  function buildResult() {
    var R = getRanges();
    var curV = computeVideo(state.slots.video, { start: R.start, end: R.end }, state.videoMode);
    var curO = computeOrder(state.slots.order, { start: R.start, end: R.end });
    var prevV = computeVideo(state.slots.prevVideo, { start: R.prevStart, end: R.prevEnd }, state.videoMode);
    var prevO = computeOrder(state.slots.prevOrder, { start: R.prevStart, end: R.prevEnd });
    var hasPrev = !!(state.slots.prevVideo || state.slots.prevOrder);
    var ex = existingMetrics();

    // 卡片只展示「上传表里真实出现过、且首商品 ID 命中对照表」的 SKU。
    // 现有库（寄样数 / 达人出单率）只作为补充指标填进这些卡片，不凭空生成空卡片。
    var skus = {};
    [curV.data, curO.data].forEach(function (o) {
      Object.keys(o).forEach(function (k) { skus[k] = true; });
    });

    var rows = Object.keys(skus).map(function (sku) {
      var v = curV.data[sku] || {}, o = curO.data[sku] || {}, e = ex[sku] || {};
      var pv = prevV.data[sku] || {}, po = prevO.data[sku] || {};
      function metric(val, prev, has) {
        return { value: val, prev: (hasPrev && has) ? prev : null };
      }
      var m = {
        gmv:        metric(curO.missing.gmv ? null : (o.gmv || 0), po.gmv || 0, !!state.slots.prevOrder && !prevO.missing.gmv),
        units:      metric(curO.missing.units ? null : (o.units || 0), po.units || 0, !!state.slots.prevOrder && !prevO.missing.units),
        natural:    metric(curO.missing.natural ? null : (o.rows ? o.naturalRows / o.rows : 0), po.rows ? po.naturalRows / po.rows : 0, !!state.slots.prevOrder && !prevO.missing.natural),
        samples:    { value: (e.samples == null ? null : e.samples), prev: null },   // 现有库全量，无环比
        orderRate:  { value: (e.orderRate == null ? null : e.orderRate), prev: null },
        videos:     metric(curV.empty ? null : (v.videos || 0), pv.videos || 0, !!state.slots.prevVideo),
        orderedVideos: metric(curV.missing.orders ? null : (v.orderedVideos || 0), pv.orderedVideos || 0, !!state.slots.prevVideo && !prevV.missing.orders),
        videoUnits: metric(curV.missing.orders ? null : (v.orderUnits || 0), pv.orderUnits || 0, !!state.slots.prevVideo && !prevV.missing.orders),
        videoRate:  metric((curV.empty || !(v.videos || 0)) ? null : (v.orderedVideos || 0) / v.videos,
                           pv.videos ? (pv.orderedVideos || 0) / pv.videos : 0, !!state.slots.prevVideo && !prevV.missing.orders),
        ctr:        metric((curV.missing.clicks || curV.missing.vv || !(v.vv || 0)) ? null : (v.clicks || 0) / v.vv,
                           pv.vv ? (pv.clicks || 0) / pv.vv : 0, !!state.slots.prevVideo && !prevV.missing.clicks && !prevV.missing.vv),
        vv:         metric(curV.missing.vv ? null : (v.vv || 0), pv.vv || 0, !!state.slots.prevVideo && !prevV.missing.vv),
        clicks:     metric(curV.missing.clicks ? null : (v.clicks || 0), pv.clicks || 0, !!state.slots.prevVideo && !prevV.missing.clicks),
        cvr:        metric((curV.missing.orders || curV.missing.clicks || !(v.clicks || 0)) ? null : (v.conversions || 0) / v.clicks,
                           pv.clicks ? (pv.conversions || 0) / pv.clicks : 0, !!state.slots.prevVideo && !prevV.missing.clicks && !prevV.missing.orders)
      };
      var detail = null;
      try { detail = Data.getSKUDetail(sku); } catch (e2) {}
      var tier = 3;
      try { tier = Data.getSKUPositionTier(sku); } catch (e3) {}
      return {
        sku: sku,
        name: (detail && detail.productName) ? detail.productName : '（未配置款式名）',
        tag: ['爆品', '主推', '测品', '撤退'][tier] || '—',
        tier: isNaN(tier) ? 3 : tier,
        m: m
      };
    });

    if (state.sortBy === 'units') {
      rows.sort(function (a, b) { return (b.m.units.value || 0) - (a.m.units.value || 0); });
    } else {
      rows.sort(function (a, b) { return (b.m.gmv.value || 0) - (a.m.gmv.value || 0); });
    }

    /* ---------- 跨页共享汇总：首页工作台 / 达人页 / 测款专区都读这一份（不另算口径） ---------- */
    function sumField(o, f) {
      var s = 0;
      Object.keys(o || {}).forEach(function (k) { s += (o[k][f] || 0); });
      return s;
    }
    function pair(cur, prev, okCur, okPrev) {
      return { value: okCur ? cur : null, prev: (hasPrev && okPrev && prev !== null) ? prev : null };
    }
    // 测款专区用「新品全量」口径单独再算一次视频侧（VV<50 剔除、=50 保留）
    var fullV = computeVideo(state.slots.video, { start: R.start, end: R.end }, 'full');
    var bySku = {}, bySkuFull = {};
    rows.forEach(function (row) {
      bySku[row.sku] = { name: row.name, tag: row.tag, tier: row.tier, m: row.m };
    });
    Object.keys(fullV.data || {}).forEach(function (sku) {
      var f = fullV.data[sku];
      bySkuFull[sku] = { videos: f.videos, orderedVideos: f.orderedVideos,
        orderUnits: f.orderUnits, vv: f.vv, clicks: f.clicks, conversions: f.conversions,
        orderRate: f.videos ? f.orderedVideos / f.videos : null };
    });
    var oT = curO.totals || { rows: 0, naturalRows: 0 };
    var pT = prevO.totals || { rows: 0, naturalRows: 0 };
    var summary = {
      updatedAt: new Date().toISOString(),
      period: { start: R.start, end: R.end, prevStart: R.prevStart, prevEnd: R.prevEnd },
      hasOrder: !curO.empty, hasVideo: !curV.empty, hasPrev: hasPrev,
      hasCreator: !!curO.hasCreator, videoMode: state.videoMode,
      totals: {
        gmv:    pair(sumField(curO.data, 'gmv'), sumField(prevO.data, 'gmv'), !curO.missing.gmv, !prevO.missing.gmv),
        units:  pair(sumField(curO.data, 'units'), sumField(prevO.data, 'units'), !curO.missing.units, !prevO.missing.units),
        natural: pair(oT.rows ? oT.naturalRows / oT.rows : null,
                      pT.rows ? pT.naturalRows / pT.rows : null,
                      !curO.missing.natural && oT.rows > 0, !prevO.missing.natural && pT.rows > 0),
        videos:        pair(sumField(curV.data, 'videos'), sumField(prevV.data, 'videos'), !curV.empty, !prevV.empty),
        orderedVideos: pair(sumField(curV.data, 'orderedVideos'), sumField(prevV.data, 'orderedVideos'),
                            !curV.empty && !curV.missing.orders, !prevV.empty && !prevV.missing.orders),
        videoUnits:    pair(sumField(curV.data, 'orderUnits'), sumField(prevV.data, 'orderUnits'),
                            !curV.empty && !curV.missing.orders, !prevV.empty && !prevV.missing.orders),
        vv:     pair(sumField(curV.data, 'vv'), sumField(prevV.data, 'vv'),
                     !curV.empty && !curV.missing.vv, !prevV.empty && !prevV.missing.vv),
        clicks: pair(sumField(curV.data, 'clicks'), sumField(prevV.data, 'clicks'),
                     !curV.empty && !curV.missing.clicks, !prevV.empty && !prevV.missing.clicks)
      },
      bySku: bySku, bySkuFull: bySkuFull, byCreator: curO.byCreator || {}
    };
    var t = summary.totals;
    t.ctr = { value: (t.clicks.value !== null && t.vv.value) ? t.clicks.value / t.vv.value : null,
              prev: (t.clicks.prev !== null && t.vv.prev) ? t.clicks.prev / t.vv.prev : null };
    t.videoRate = { value: (t.videos.value && t.orderedVideos.value !== null) ? t.orderedVideos.value / t.videos.value : null,
                    prev: (t.videos.prev && t.orderedVideos.prev !== null) ? t.orderedVideos.prev / t.videos.prev : null };

    return {
      rows: rows, ranges: R, hasPrev: hasPrev,
      warnings: buildWarnings(curV, curO, prevV, prevO),
      orderKey: curV.orderKey, summary: summary
    };
  }

  function buildWarnings(cv, co, pv, po) {
    var w = [];
    if (cv.empty) w.push('未上传本期视频登记表：视频侧指标均为「暂无数据」');
    if (co.empty) w.push('未上传本期订单全量表：订单侧指标均为「暂无数据」');
    if (!cv.empty && cv.missing.vv) w.push('视频表未指定 VV 列：未做低播放剔除，总播放量/点击率「暂无数据」');
    if (!cv.empty && cv.missing.publish) w.push('视频表未指定发布时间列：未做时间区间筛选');
    if (!cv.empty && cv.missing.orders) w.push('视频表未指定成交件数列：出单视频数/视频成交件数/转化率「暂无数据」');
    if (!co.empty && co.missing.status) w.push('订单表未指定订单状态列：状态白名单未生效，全部状态计入');
    if (!co.empty && co.missing.created) w.push('订单表未指定创建时间列：未做时间区间筛选');
    if (!state.slots.prevVideo || !state.slots.prevOrder) w.push('未上传完整的上月两张表：缺上月数据的指标显示「较上月 -」');
    return w;
  }

  /* ========== 渲染：参数栏 / 上传区 / 映射 / 对照表 ========== */
  /* 主网格严格 2 行 × 5 列 = 10 个指标（3.4），不自动换行、不多放格子 */
  var METRIC_DEFS_TOP = [
    { key: 'gmv',       label: 'GMV',        fmt: 'money' },
    { key: 'units',     label: '成交件数',    fmt: 'int' },
    { key: 'natural',   label: '自然单占比',  fmt: 'pct' },
    { key: 'samples',   label: '寄样数',      fmt: 'int', note: '现有库' },
    { key: 'orderRate', label: '达人出单率',  fmt: 'pct1', note: '现有库' }
  ];
  var METRIC_DEFS_BOTTOM = [
    { key: 'videos',        label: '新视频数',       fmt: 'int' },
    { key: 'orderedVideos', label: '新出单视频数',   fmt: 'int' },
    { key: 'videoUnits',    label: '新视频成交件数', fmt: 'int' },
    { key: 'videoRate',     label: '视频出单率',     fmt: 'pct' },
    { key: 'ctr',           label: '新视频点击率',   fmt: 'pct2' }
  ];
  /* 3 个过程量不进主网格，收进卡片「展开详情」（3.4） */
  var METRIC_DEFS_DETAIL = [
    { key: 'vv',     label: '总播放量（VV）', fmt: 'int' },
    { key: 'clicks', label: '总点击次数',     fmt: 'int' },
    { key: 'cvr',    label: '转化率',         fmt: 'pct2' }
  ];

  function fmtVal(v, f) {
    if (v === null || v === undefined) return '暂无数据';
    switch (f) {
      case 'money': return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
      case 'int':   return Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
      case 'pct':   return (v * 100).toFixed(1) + '%';
      case 'pct1':  return Number(v).toFixed(1) + '%';
      case 'pct2':  return (v * 100).toFixed(2) + '%';
      default:      return String(v);
    }
  }

  /* 环比格式固定为「较上月 ↑ 42.9%」/「较上月 ↓ 40.7%」/「较上月 -」（3.4 / 3.7） */
  function deltaHtml(m) {
    if (m.prev === null || m.prev === undefined || m.value === null || m.prev === 0) {
      return '<span class="cv-delta cv-delta--none">较上月 -</span>';
    }
    var d = (m.value - m.prev) / Math.abs(m.prev) * 100;
    if (Math.abs(d) < 0.05) return '<span class="cv-delta cv-delta--none">较上月 0.0%</span>';
    var cls = d > 0 ? 'cv-delta--up' : 'cv-delta--down';
    return '<span class="cv-delta ' + cls + '">较上月 ' + (d > 0 ? '↑' : '↓') + ' '
      + Math.abs(d).toFixed(1) + '%</span>';
  }

  function metricHtml(def, m) {
    var missing = m.value === null;
    return '<div class="cv-metric' + (missing ? ' cv-metric--empty' : '') + '">'
      + '<div class="cv-metric__label">' + esc(def.label)
      + (def.note ? '<span class="cv-metric__note">' + esc(def.note) + '</span>' : '') + '</div>'
      + '<div class="cv-metric__value">' + esc(fmtVal(m.value, def.fmt)) + '</div>'
      + deltaHtml(m)
      + '</div>';
  }

  function cardHtml(row) {
    var top = METRIC_DEFS_TOP.map(function (d) { return metricHtml(d, row.m[d.key]); }).join('');
    var bottom = METRIC_DEFS_BOTTOM.map(function (d) { return metricHtml(d, row.m[d.key]); }).join('');
    var detail = METRIC_DEFS_DETAIL.map(function (d) { return metricHtml(d, row.m[d.key]); }).join('');
    var open = !!state.expanded[row.sku];
    var tagCls = { '爆品': 'hot', '主推': 'main', '测品': 'test', '撤退': 'retire' }[row.tag] || 'retire';
    return '<div class="cv-card">'
      // 左侧：只放 SKU 编号 + 款式名 + 标签；不放商品图、不放环形占比图
      + '<div class="cv-card__left">'
      +   '<div class="cv-card__sku">' + esc(row.sku) + '</div>'
      +   '<div class="cv-card__name">' + esc(row.name) + '</div>'
      +   '<span class="cv-tag cv-tag--' + tagCls + '">' + esc(row.tag) + '</span>'
      + '</div>'
      // 右侧：固定 2 行 × 5 列 = 10 格；3 个过程量收进「展开详情」
      + '<div class="cv-card__right">'
      +   '<div class="cv-metric-row">' + top + '</div>'
      +   '<div class="cv-metric-row">' + bottom + '</div>'
      +   '<div class="cv-card__detailbar">'
      +     '<button type="button" class="cv-link" data-action="toggledetail" data-sku="' + esc(row.sku) + '">'
      +       (open ? '收起详情' : '展开详情 · 过程量（播放 / 点击 / 转化率）') + '</button>'
      +     '<span class="cv-card__detailhint">主网格 2 × 5 = 10 个指标</span>'
      +   '</div>'
      +   '<div class="cv-detail" data-detail="' + esc(row.sku) + '"' + (open ? '' : ' hidden') + '>'
      +     '<div class="cv-metric-row cv-metric-row--detail">' + detail + '</div>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }

  function mappingHtml(slotId, slot) {
    var fields = slot.type === 'video' ? VIDEO_FIELDS : ORDER_FIELDS;
    var rows = fields.map(function (f) {
      var cur = slot.mapping[f.key];
      var opts = ['<option value="">（未指定）</option>'].concat(slot.headers.map(function (h, i) {
        return '<option value="' + i + '"' + (String(cur) === String(i) ? ' selected' : '') + '>第 ' + (i + 1) + ' 列 · ' + esc(h) + '</option>';
      })).join('');
      return '<div class="cv-map-field">'
        + '<label>' + esc(f.label) + '</label>'
        + '<select data-slot="' + esc(slotId) + '" data-field="' + esc(f.key) + '">' + opts + '</select>'
        + '</div>';
    }).join('');
    return '<div class="cv-slot__map">'
      + '<div class="cv-slot__maptitle">字段映射（表头第 ' + (slot.headerRow + 1) + ' 行 · 自动识别 '
      + slot.headerHits + ' 列，可手动改选）</div>'
      + '<div class="cv-map-grid">' + rows + '</div>'
      + '</div>';
  }

  function slotHtml(s) {
    var slot = state.slots[s.id];
    var body = '';
    if (slot) {
      body = '<div class="cv-slot__file">已上传：<b>' + esc(slot.fileName) + '</b>'
        + (slot.encoding ? '<span class="cv-slot__enc">' + esc(slot.encoding) + '</span>' : '')
        + ' <button type="button" class="cv-link" data-action="clear" data-slot="' + s.id + '">移除</button></div>'
        + mappingHtml(s.id, slot);
    } else {
      body = '<div class="cv-slot__hint">支持 .xlsx / .xls / .csv；重复上传会覆盖上一次</div>';
    }
    return '<div class="cv-slot' + (slot ? ' cv-slot--ok' : '') + '">'
      + '<div class="cv-slot__title">' + esc(s.title) + (s.required ? '<span class="cv-req">必需</span>' : '<span class="cv-opt">可选</span>') + '</div>'
      + '<input type="file" accept=".xlsx,.xls,.csv" data-slot="' + s.id + '" class="cv-file">'
      + body
      + '</div>';
  }

  function mapEditorHtml() {
    if (!state.showMapEditor) return '';
    var keys = Object.keys(state.map).sort();
    var rows = keys.map(function (id) {
      return '<tr data-id="' + esc(id) + '">'
        + '<td><input type="text" class="cv-mapinput cv-mapinput--id" value="' + esc(id) + '" readonly></td>'
        + '<td><input type="text" class="cv-mapinput" data-role="sku" value="' + esc(state.map[id]) + '"></td>'
        + '<td><button type="button" class="cv-link cv-link--del" data-action="delmap" data-id="' + esc(id) + '">删除</button></td>'
        + '</tr>';
    }).join('');
    return '<div class="cv-map-editor">'
      + '<div class="cv-map-editor__head">SKU ↔ 商品 ID 对照表（本机保存；归 SKU 时只认商品列里第一个 ID）</div>'
      + '<table class="cv-map-table"><thead><tr><th>商品 ID</th><th>SKU</th><th></th></tr></thead><tbody>'
      + rows + '</tbody></table>'
      + '<div class="cv-map-editor__add">'
      + '<input type="text" id="cv-new-id" placeholder="新商品 ID（数字）">'
      + '<input type="text" id="cv-new-sku" placeholder="SKU 编号">'
      + '<button type="button" class="btn btn--sm" data-action="addmap">添加</button>'
      + '<button type="button" class="btn btn--ghost btn--sm" data-action="resetmap">恢复默认</button>'
      + '</div>'
      + '<div class="cv-map-editor__tip">修改后自动保存；保存即时重算。</div>'
      + '</div>';
  }

  function render() {
    var root = document.getElementById('conversion-root');
    if (!root) return;
    state.result = buildResult();
    // 汇总写本机，供首页工作台 / 看板测款专区 / 达人页读取（不存原始表）。
    // ⚠️ 只在确实上传了表时覆盖：否则本页初始化会把上次上传的结果冲成空汇总。
    var sm = state.result.summary;
    if (global.DloodaResults && global.DloodaResults.save && sm && (sm.hasOrder || sm.hasVideo)) {
      try { global.DloodaResults.save(sm); } catch (e) {}
    }
    var R = state.result.ranges;
    var warnHtml = state.result.warnings.length
      ? '<div class="cv-warn">' + state.result.warnings.map(function (w) { return '· ' + esc(w); }).join('<br>') + '</div>' : '';
    var cards = state.result.rows.length
      ? state.result.rows.map(cardHtml).join('')
      : '<div class="cv-empty">请先上传本期视频登记表与订单全量表；上传后自动计算。</div>';

    var customFields = '';
    if (state.range === 'custom') {
      customFields = '<label>起<input type="date" id="cv-start" value="' + esc(state.customStart) + '"></label>'
        + '<label>止<input type="date" id="cv-end" value="' + esc(state.customEnd) + '"></label>';
    }

    root.innerHTML = ''
      + '<div class="cv-panel">'
      +     '<div><h3 class="cv-panel__title">SKU 点击转化</h3>'
      +       '<div class="cv-panel__sub">当前区间 ' + esc(R.start) + ' ~ ' + esc(R.end)
      +       ' · 环比基准 ' + esc(R.prevStart) + ' ~ ' + esc(R.prevEnd) + '</div></div>'
      +     '<div class="cv-panel__actions">'
      +       '<button type="button" class="btn btn--ghost btn--sm" data-action="togglemap">SKU 对照表</button>'
      +       '<button type="button" class="btn btn--ghost btn--sm" data-action="export">导出 CSV</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="cv-params">'
      +     '<label>时间区间<select id="cv-range">'
      +       '<option value="month"' + (state.range === 'month' ? ' selected' : '') + '>本月</option>'
      +       '<option value="7d"' + (state.range === '7d' ? ' selected' : '') + '>近 7 天</option>'
      +       '<option value="custom"' + (state.range === 'custom' ? ' selected' : '') + '>自定义</option>'
      +     '</select></label>'
      +     customFields
      +     '<label>视频模式<select id="cv-mode">'
      +       '<option value="monthly"' + (state.videoMode === 'monthly' ? ' selected' : '') + '>月度口径（VV≤50 剔除）</option>'
      +       '<option value="full"' + (state.videoMode === 'full' ? ' selected' : '') + '>新品全量（VV&lt;50 剔除）</option>'
      +     '</select></label>'
      +     '<label>订单状态白名单<input type="text" id="cv-status" value="' + esc(state.statusWhite) + '" placeholder="待确认,已结算"></label>'
      +     '<label>卡片排序<select id="cv-sort">'
      +       '<option value="gmv"' + (state.sortBy === 'gmv' ? ' selected' : '') + '>按 GMV</option>'
      +       '<option value="units"' + (state.sortBy === 'units' ? ' selected' : '') + '>按成交件数</option>'
      +     '</select></label>'
      +   '</div>'
      +   mapEditorHtml()
      +   '<div class="cv-slots">' + SLOTS.map(slotHtml).join('') + '</div>'
      +   warnHtml
      + '</div>'
      + '<div class="cv-cards">' + cards + '</div>';

    bindEvents(root);
  }

  /* ========== 事件绑定 ========== */
  function bindEvents(root) {
    root.querySelectorAll('.cv-file').forEach(function (inp) {
      inp.addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) handleFile(inp.getAttribute('data-slot'), e.target.files[0]);
      });
    });
    root.querySelectorAll('select[data-field]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var sid = sel.getAttribute('data-slot'), f = sel.getAttribute('data-field');
        var slot = state.slots[sid];
        if (!slot) return;
        slot.mapping[f] = sel.value === '' ? '' : Number(sel.value);
        render();
      });
    });
    var r = document.getElementById('cv-range');
    if (r) r.addEventListener('change', function () { state.range = r.value; render(); });
    var st = document.getElementById('cv-start');
    if (st) st.addEventListener('change', function () { state.customStart = st.value; render(); });
    var en = document.getElementById('cv-end');
    if (en) en.addEventListener('change', function () { state.customEnd = en.value; render(); });
    var mo = document.getElementById('cv-mode');
    if (mo) mo.addEventListener('change', function () { state.videoMode = mo.value; render(); });
    var ws = document.getElementById('cv-status');
    if (ws) ws.addEventListener('change', function () { state.statusWhite = ws.value; render(); });
    var so = document.getElementById('cv-sort');
    if (so) so.addEventListener('change', function () { state.sortBy = so.value; render(); });

    root.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-action');
        if (act === 'clear') { delete state.slots[btn.getAttribute('data-slot')]; render(); }
        else if (act === 'togglemap') { state.showMapEditor = !state.showMapEditor; render(); }
        else if (act === 'export') exportCsv();
        else if (act === 'toggledetail') {
          var sku = btn.getAttribute('data-sku');
          state.expanded[sku] = !state.expanded[sku];
          var boxes = root.querySelectorAll('[data-detail]');
          for (var bi = 0; bi < boxes.length; bi++) {
            if (boxes[bi].getAttribute('data-detail') !== sku) continue;
            if (state.expanded[sku]) boxes[bi].removeAttribute('hidden');
            else boxes[bi].setAttribute('hidden', '');
          }
          btn.textContent = state.expanded[sku]
            ? '收起详情' : '展开详情 · 过程量（播放 / 点击 / 转化率）';
        }
        else if (act === 'addmap') {
          var id = (document.getElementById('cv-new-id') || {}).value || '';
          var sku = (document.getElementById('cv-new-sku') || {}).value || '';
          id = id.trim(); sku = sku.trim();
          if (!/^\d{6,}$/.test(id)) { toast('商品 ID 需为数字（至少 6 位）'); return; }
          if (!sku) { toast('请填写 SKU 编号'); return; }
          state.map[id] = sku; saveMap(state.map); render(); toast('已添加并保存');
        }
        else if (act === 'delmap') {
          delete state.map[btn.getAttribute('data-id')]; saveMap(state.map); render();
        }
        else if (act === 'resetmap') {
          state.map = Object.assign({}, DEFAULT_PRODUCT_MAP); saveMap(state.map); render(); toast('已恢复默认对照表');
        }
      });
    });
    root.querySelectorAll('input[data-role="sku"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.closest('tr').getAttribute('data-id');
        var v = inp.value.trim();
        if (!v) { toast('SKU 不能为空'); return; }
        state.map[id] = v; saveMap(state.map); render();
      });
    });
  }

  /* ========== CSV 导出 ========== */
  function exportCsv() {
    var res = state.result || buildResult();
    if (!res.rows.length) { toast('暂无结果可导出'); return; }
    var defs = METRIC_DEFS_TOP.concat(METRIC_DEFS_BOTTOM).concat(METRIC_DEFS_DETAIL);
    var head = ['SKU', '款式名', '标签'].concat(defs.map(function (d) { return d.label; }))
      .concat(defs.map(function (d) { return d.label + '（环比）'; }));
    var lines = [head];
    res.rows.forEach(function (row) {
      var base = [row.sku, row.name, row.tag];
      var vals = defs.map(function (d) {
        var m = row.m[d.key];
        return m.value === null ? '暂无数据' : fmtVal(m.value, d.fmt);
      });
      var dl = defs.map(function (d) {
        var m = row.m[d.key];
        if (m.prev === null || m.prev === undefined || m.value === null || m.prev === 0) return '-';
        var x = (m.value - m.prev) / Math.abs(m.prev) * 100;
        return (x > 0 ? '+' : '') + x.toFixed(1) + '%';
      });
      lines.push(base.concat(vals).concat(dl));
    });
    var csv = lines.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SKU点击转化_' + res.ranges.start + '_' + res.ranges.end + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('已导出当前结果 CSV');
  }

  /* ========== 初始化 ========== */
  function init() {
    state.map = loadMap();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  global.DloodaConversion = { render: render, exportCsv: exportCsv, state: state };
})(window);
