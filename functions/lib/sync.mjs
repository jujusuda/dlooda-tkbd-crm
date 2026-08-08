// 把飞书多维表格 6 张表记录映射成前端用的 real-data.js（Cloudflare 版）
// 端口自 server/sync.js，但去掉 fs 写盘，改为返回字符串，由调用方存入 KV
import cfg from '../../server/config.json';
import { getTenantToken, listRecords } from './feishu.mjs';

function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    const date = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
    return hasTime ? (date + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())) : date;
  }
  return String(v).trim();
}

function getField(rec, fmap, key) {
  const name = (fmap && fmap[key]) || key;
  const val = rec.fields ? rec.fields[name] : undefined;
  return val === undefined ? null : val;
}

// 飞书「视频」字段是超链接类型，值为 {link, text} 对象；
// 也可能是附件数组 [{url}] 或纯字符串。统一提取出可用 URL。
function extractUrl(u) {
  if (!u) return '';
  if (typeof u === 'string') return u.trim();
  if (Array.isArray(u)) {
    const first = u[0];
    return first ? extractUrl(first) : '';
  }
  if (typeof u === 'object') {
    return (u.link || u.url || u.text || '').toString().trim();
  }
  return String(u).trim();
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function buildFromTables(tables, cfgObj) {
  const F = cfgObj.feishu.tables;
  const dailyF = F.daily.fields;
  const creatorsMap = {};
  const samples = (tables.daily || []).map((rec) => {
    const rid = rec.record_id;
    const name = getField(rec, dailyF, 'creator');
    if (!name) return null;
    const videos = [];
    const fnames = Object.keys(rec.fields || {});
    const idxs = [];
    fnames.forEach((fn) => {
      const m = /^视频(\d+)$/.exec(fn);
      if (m) idxs.push(parseInt(m[1], 10));
    });
    idxs.sort((a, b) => a - b).forEach((i) => {
      const url = extractUrl(rec.fields['视频' + i]);
      const time = rec.fields['视频' + i + '时间'];
      if (url) videos.push({ url: url, time: parseDate(time) });
    });
    const sample = {
      _rid: rid,
      creator: String(name).trim(),
      official: getField(rec, dailyF, 'official'),
      stars: getField(rec, dailyF, 'stars'),
      creatorType: getField(rec, dailyF, 'creatorType'),
      orderCount: getField(rec, dailyF, 'orderCount'),
      reinvest: getField(rec, dailyF, 'reinvest'),
      approval: getField(rec, dailyF, 'approval'),
      language: getField(rec, dailyF, 'language'),
      bodyType: getField(rec, dailyF, 'bodyType'),
      age: getField(rec, dailyF, 'age'),
      fulfillment: getField(rec, dailyF, 'fulfillment'),
      category: getField(rec, dailyF, 'category'),
      note: getField(rec, dailyF, 'note'),
      color: getField(rec, dailyF, 'color'),
      sku: getField(rec, dailyF, 'sku'),
      sampleTime: parseDate(getField(rec, dailyF, 'sampleTime')),
      updateTime: parseDate(getField(rec, dailyF, 'updateTime')),
      fulfillMethod: getField(rec, dailyF, 'fulfillMethod'),
      videos: videos,
    };
    if (!creatorsMap[sample.creator]) {
      creatorsMap[sample.creator] = {
        _rid: rid, name: sample.creator, official: sample.official, stars: sample.stars,
        creatorType: sample.creatorType, bodyType: sample.bodyType, age: sample.age,
        fulfillment: sample.fulfillment, category: sample.category, note: sample.note,
        sampleCount: 0, videoCount: 0, skus: [], lastSampleTime: null,
      };
    }
    const c = creatorsMap[sample.creator];
    c.sampleCount += 1;
    c.videoCount += videos.length;
    if (sample.sku && c.skus.indexOf(sample.sku) === -1) c.skus.push(sample.sku);
    if (sample.official && !c.official) c.official = sample.official;
    if (sample.stars && !c.stars) c.stars = sample.stars;
    if (sample.sampleTime && (!c.lastSampleTime || sample.sampleTime > c.lastSampleTime)) c.lastSampleTime = sample.sampleTime;
    return sample;
  }).filter(Boolean);
  const creators = Object.keys(creatorsMap).map((k) => creatorsMap[k]);

  const penF = F.pending.fields;
  const pending = (tables.pending || []).map((rec) => ({
    _rid: rec.record_id, name: getField(rec, penF, 'name'), official: getField(rec, penF, 'official'),
    stars: getField(rec, penF, 'stars'), bodyType: getField(rec, penF, 'bodyType'), age: getField(rec, penF, 'age'),
    fulfillment: getField(rec, penF, 'fulfillment'), category: getField(rec, penF, 'category'),
    note: getField(rec, penF, 'note'), color: getField(rec, penF, 'color'), sku: getField(rec, penF, 'sku'),
    rejectReason: getField(rec, penF, 'rejectReason'), reprocessTime: parseDate(getField(rec, penF, 'reprocessTime')),
    result: getField(rec, penF, 'result'),
  })).filter((p) => p.name);

  const invF = F.invites.fields;
  const invites = (tables.invites || []).map((rec) => ({
    _rid: rec.record_id, date: parseDate(getField(rec, invF, 'date')), sku: getField(rec, invF, 'sku'),
    creatorId: getField(rec, invF, 'creatorId'), category: getField(rec, invF, 'category'),
    commission: getField(rec, invF, 'commission'), validDays: getField(rec, invF, 'validDays'),
    planTarget: num(getField(rec, invF, 'planTarget')), achieved: num(getField(rec, invF, 'achieved')),
    note: getField(rec, invF, 'note'), script: getField(rec, invF, 'script'),
  })).filter((i) => i.date || i.sku);

  const taskF = F.tasks.fields;
  const tasks = (tables.tasks || []).map((rec) => ({
    _rid: rec.record_id, sku: getField(rec, taskF, 'sku'), priority: getField(rec, taskF, 'priority'),
    positioning: getField(rec, taskF, 'positioning'), startTime: parseDate(getField(rec, taskF, 'startTime')),
    target: num(getField(rec, taskF, 'target')), completed: num(getField(rec, taskF, 'completed')),
    uncompleted: num(getField(rec, taskF, 'uncompleted')), avgDaily: num(getField(rec, taskF, 'avgDaily')),
    todayCompleted: num(getField(rec, taskF, 'todayCompleted')), note: getField(rec, taskF, 'note'),
  })).filter((t) => t.sku);

  const skuF = F.products.fields;
  const skus = (tables.products || []).map((rec) => ({
    _rid: rec.record_id, sku: getField(rec, skuF, 'sku'),
    positioning: getField(rec, skuF, 'positioning'), productId: getField(rec, skuF, 'productId'),
  })).filter((s) => s.sku);

  const offF = F.offline && F.offline.fields;
  const offline = offF
    ? (tables.offline || []).map((rec) => ({
        _rid: rec.record_id, creator: getField(rec, offF, 'creator'), sku: getField(rec, offF, 'sku'),
        color: getField(rec, offF, 'color'), sampleTime: parseDate(getField(rec, offF, 'sampleTime')),
        note: getField(rec, offF, 'note'),
      })).filter((o) => o.creator || o.sku)
    : [];

  const data = { creators, samples, pending, invites, tasks, skus, offline };
  const stats = {
    creatorCount: creators.length, sampleCount: samples.length, pendingCount: pending.length,
    inviteCount: invites.length, taskCount: tasks.length, skuCount: skus.length,
    offlineCount: offline.length, videoCount: samples.reduce((s, x) => s + x.videos.length, 0),
  };
  return { data, stats };
}

function generateRealDataJs(data, stats) {
  return (
    '// Auto-generated from Feishu Bitable (OpenAPI, Cloudflare)\n' +
    '// Generated: ' + new Date().toISOString().slice(0, 10) + '\n' +
    '// DO NOT EDIT MANUALLY - regenerate via /api/sync\n\n' +
    'window.REAL_DATA = ' + JSON.stringify(data, null, 2) + ';\n' +
    '\nwindow.REAL_DATA_STATS = ' + JSON.stringify(stats, null, 2) + ';\n'
  );
}

// 从飞书拉取并生成 real-data.js 字符串（存入 env 提供的 KV）
export async function syncFromFeishu(env) {
  const f = {
    appId: env.FEISHU_APP_ID,
    appSecret: env.FEISHU_APP_SECRET,
    baseAppToken: env.FEISHU_BASE_TOKEN,
    tables: cfg.feishu.tables,
  };
  if (!f.appId || !f.appSecret || !f.baseAppToken) throw new Error('飞书凭据未配置（FEISHU_APP_ID/SECRET/BASE_TOKEN）');
  const token = await getTenantToken(f.appId, f.appSecret);
  const keys = ['daily', 'pending', 'invites', 'tasks', 'offline', 'products'];
  const tables = {};
  for (const k of keys) {
    const tid = f.tables[k] && f.tables[k].tableId;
    tables[k] = tid ? await listRecords(token, f.baseAppToken, tid) : [];
  }
  const built = buildFromTables(tables, { feishu: f });
  const js = generateRealDataJs(built.data, built.stats);
  const counts = {};
  keys.forEach((k) => { counts[k] = tables[k] ? tables[k].length : 0; });
  return { js, stats: built.stats, counts };
}
