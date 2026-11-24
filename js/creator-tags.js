/* ================================================================
   Dlooda TKBD CRM — 达人结果字段与人工标记（指令模块 C）
   C1 最近出单时间 / 累计 GMV（上传表口径，缺数据标「暂无数据」）/ 是否复投过
   C2 人工标记 重点维护 / 暂缓 / 不再合作，本机保存；达人列表与名单库都能筛选
   不改现有渲染函数：用 MutationObserver 在列表重渲染后补字段与控件。
   ================================================================ */
(function (global) {
  'use strict';

  var Data = global.DloodaData;
  var Results = global.DloodaResults;
  var KEY = 'dlooda_creator_tags_v1';
  var TAGS = ['重点维护', '暂缓', '不再合作'];

  var CSS = [
    '.ct-extra{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border-1);}',
    '.ct-field{font-size:10px;color:var(--text-2);}',
    '.ct-field b{color:var(--text-1);font-weight:600;margin-left:3px;}',
    '.ct-field--empty b{color:var(--text-3);font-weight:400;}',
    '.ct-tagrow{display:flex;align-items:center;gap:6px;margin-top:7px;}',
    '.ct-tagrow label{font-size:10px;color:var(--text-3);}',
    '.ct-tag-select{padding:3px 6px;border:1px solid var(--border-1);border-radius:6px;background:#fff;color:var(--text-1);font-size:10px;font-family:inherit;}',
    '.ct-filter{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px;font-size:11px;color:var(--text-2);}',
    '.ct-filter select{padding:5px 8px;border:1px solid var(--border-2);border-radius:var(--r-sm);background:#fff;color:var(--text-1);font-size:11px;font-family:inherit;}',
    '.ct-tagpill{display:inline-block;font-size:9px;font-weight:700;padding:1px 7px;border-radius:var(--r-full);background:var(--bg-pink-soft);color:var(--pink-700);}'
  ].join('');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function injectCss() {
    if (document.getElementById('ct-style')) return;
    var st = document.createElement('style');
    st.id = 'ct-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- 标记存储 ---------- */
  function allTags() {
    try { return JSON.parse(global.localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function norm(h) { return String(h == null ? '' : h).trim().replace(/^@/, '').toLowerCase(); }
  function get(handle) { return allTags()[norm(handle)] || ''; }
  function set(handle, tag) {
    var m = allTags(), k = norm(handle);
    if (!k) return;
    if (tag) m[k] = tag; else delete m[k];
    try { global.localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
  }

  /* ---------- C1 结果数据 ---------- */
  var _reinvest = null;
  function reinvestSet() {
    if (_reinvest) return _reinvest;
    _reinvest = {};
    try {
      var r = Data.getReinvestAnalysis();
      (r.details || []).forEach(function (d) { if (d.creator) _reinvest[norm(d.creator)] = true; });
    } catch (e) {}
    return _reinvest;
  }
  function creatorInfo(name) {
    var k = norm(name), out = { last: null, gmv: null, reinvest: !!reinvestSet()[k] };
    var s = Results ? Results.load() : null;
    var bc = s && s.byCreator ? s.byCreator : null;
    if (bc) {
      var hit = bc[name] || bc['@' + name] || null;
      if (!hit) {
        Object.keys(bc).forEach(function (n) { if (norm(n) === k) hit = bc[n]; });
      }
      if (hit) { out.last = hit.lastTime || null; out.gmv = hit.gmv; }
    }
    return out;
  }

  function field(label, value, kind, empty) {
    return '<span class="ct-field' + (empty ? ' ct-field--empty' : '') + '">' + esc(label)
      + '<b>' + esc(empty ? '暂无数据' : value) + '</b></span>';
  }

  /* ---------- 达人列表：补字段 + 标记控件 + 筛选 ---------- */
  var filterValue = '';
  function enhanceCards() {
    var list = document.getElementById('creator-list');
    if (!list) return;
    var cards = list.querySelectorAll('.creator-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute('data-ct-done') === '1') continue;
      var name = card.getAttribute('data-creator-name') || '';
      var body = card.querySelector('.creator-card__body');
      if (!body || !name) continue;
      var info = creatorInfo(name);
      var box = document.createElement('div');
      box.className = 'creator-card__meta ct-extra';
      box.innerHTML = field('最近出单', info.last, '', !info.last)
        + field('累计 GMV', info.gmv !== null ? '$' + Number(info.gmv).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '', '', info.gmv === null)
        + field('是否复投过', info.reinvest ? '是' : '否', '', false);
      body.appendChild(box);

      var row = document.createElement('div');
      row.className = 'ct-tagrow';
      var cur = get(name);
      row.innerHTML = '<label>人工标记</label><select class="ct-tag-select" data-ct-name="' + esc(name) + '">'
        + '<option value="">未标记</option>'
        + TAGS.map(function (t) { return '<option value="' + esc(t) + '"' + (cur === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('')
        + '</select>' + (cur ? '<span class="ct-tagpill">' + esc(cur) + '</span>' : '');
      body.appendChild(row);
      card.setAttribute('data-ct-done', '1');
    }
    applyFilter();
  }

  function applyFilter() {
    var list = document.getElementById('creator-list');
    if (!list) return;
    var cards = list.querySelectorAll('.creator-card');
    for (var i = 0; i < cards.length; i++) {
      var name = cards[i].getAttribute('data-creator-name') || '';
      var tag = get(name);
      var show = !filterValue || (filterValue === '__none__' ? !tag : tag === filterValue);
      cards[i].style.display = show ? '' : 'none';
    }
  }

  function initCreatorPage() {
    var list = document.getElementById('creator-list');
    if (!list) return;
    var anchor = document.getElementById('filter-tabs');
    if (anchor && !document.getElementById('ct-filter')) {
      var wrap = document.createElement('div');
      wrap.id = 'ct-filter'; wrap.className = 'ct-filter';
      wrap.innerHTML = '<label>人工标记筛选</label><select id="ct-filter-select">'
        + '<option value="">全部</option>'
        + TAGS.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('')
        + '<option value="__none__">未标记</option></select>';
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      wrap.querySelector('select').addEventListener('change', function (e) {
        filterValue = e.target.value; applyFilter();
      });
    }
    enhanceCards();
    var obs = new MutationObserver(function () { enhanceCards(); });
    obs.observe(list, { childList: true, subtree: false });
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('ct-tag-select')) {
        set(t.getAttribute('data-ct-name'), t.value);
        var pill = t.parentNode.querySelector('.ct-tagpill');
        if (t.value) {
          if (pill) pill.textContent = t.value;
          else { var sp = document.createElement('span'); sp.className = 'ct-tagpill'; sp.textContent = t.value; t.parentNode.appendChild(sp); }
        } else if (pill) pill.parentNode.removeChild(pill);
        applyFilter();
      }
    });
  }

  /* ---------- 名单库：按人工标记筛选（与达人列表共用同一份本机标记） ---------- */
  function initRosterPage() {
    var header = document.getElementById('roster-filter-status');
    if (!header || document.getElementById('roster-filter-tag')) return;
    var sel = document.createElement('select');
    sel.className = 'select'; sel.id = 'roster-filter-tag'; sel.style.minWidth = '120px';
    sel.innerHTML = '<option value="">全部人工标记</option>'
      + TAGS.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('')
      + '<option value="__none__">未标记</option>';
    header.parentNode.insertBefore(sel, header.nextSibling);
    sel.addEventListener('change', function () {
      // 主路径：触发名单库自身刷新；同时兜底按 DOM 里的 handle 过滤
      try {
        var sku = document.getElementById('roster-filter-sku');
        if (sku) sku.dispatchEvent(new Event('change', { bubbles: true }));
        if (global.DloodaRoster && global.DloodaRoster.refresh) global.DloodaRoster.refresh();
      } catch (e) {}
      applyRosterFilter();
    });
  }

  function applyRosterFilter() {
    var sel = document.getElementById('roster-filter-tag');
    var tbody = document.getElementById('roster-tbody');
    if (!sel || !tbody) return;
    var v = sel.value;
    var rows = tbody.querySelectorAll('tr[data-handle]');
    for (var i = 0; i < rows.length; i++) {
      var tag = get(rows[i].getAttribute('data-handle'));
      var show = !v || (v === '__none__' ? !tag : tag === v);
      rows[i].style.display = show ? '' : 'none';
    }
  }

  function init() {
    injectCss();
    if (document.getElementById('creator-list')) initCreatorPage();
    if (document.getElementById('roster-tbody')) initRosterPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  global.DloodaCreatorTags = {
    TAGS: TAGS, get: get, set: set, all: allTags,
    refresh: function () { enhanceCards(); applyRosterFilter(); }
  };
})(window);
