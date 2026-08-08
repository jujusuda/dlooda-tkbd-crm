/* ================================================================
   Dlooda TKBD CRM — Shared App Logic
   导航注入 · Hello Kitty SVG · 工具函数
   ================================================================ */

(function (global) {
  'use strict';

  /* ---------- Hello Kitty SVG 组件 ---------- */

  // 猫脸 logo — 极简轮廓 + 蝴蝶结
  var CAT_LOGO_SVG = ''
    + '<svg viewBox="0 0 44 44" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '  <path d="M10 18 L13 8 L17 17 Z" fill="#F5D3DA" stroke="#D4808F" stroke-width="1" stroke-linejoin="round"/>'
    + '  <path d="M27 17 L31 8 L34 18 Z" fill="#F5D3DA" stroke="#D4808F" stroke-width="1" stroke-linejoin="round"/>'
    + '  <ellipse cx="22" cy="25" rx="15" ry="14" fill="#FDF3F5" stroke="#D4808F" stroke-width="1.5"/>'
    + '  <path d="M16 24 Q18 22 20 24" stroke="#5C4A4A" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    + '  <path d="M24 24 Q26 22 28 24" stroke="#5C4A4A" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    + '  <path d="M21 28 L23 28 L22 29.5 Z" fill="#D4808F"/>'
    + '  <path d="M22 29.5 Q20 31 18 30" stroke="#5C4A4A" stroke-width="1" fill="none" stroke-linecap="round"/>'
    + '  <path d="M22 29.5 Q24 31 26 30" stroke="#5C4A4A" stroke-width="1" fill="none" stroke-linecap="round"/>'
    + '  <!-- 蝴蝶结 -->'
    + '  <path d="M8 17 Q6 14 8 12 Q12 13 13 16 Q12 19 8 17 Z" fill="#D4808F"/>'
    + '  <path d="M8 17 Q6 20 8 22 Q12 21 13 18 Q12 15 8 17 Z" fill="#D4808F"/>'
    + '  <circle cx="10.5" cy="17" r="2" fill="#C06B7C"/>'
    + '</svg>';

  // 蝴蝶结小图标
  var BOW_SVG = ''
    + '<svg viewBox="0 0 24 16" width="20" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '  <path d="M2 8 Q1 2 8 5 Q11 8 8 11 Q1 14 2 8 Z" fill="#D4808F"/>'
    + '  <path d="M22 8 Q23 2 16 5 Q13 8 16 11 Q23 14 22 8 Z" fill="#D4808F"/>'
    + '  <circle cx="12" cy="8" r="3" fill="#C06B7C"/>'
    + '</svg>';

  // 猫爪印
  var PAW_SVG = ''
    + '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    + '  <ellipse cx="12" cy="16" rx="5" ry="4" />'
    + '  <circle cx="6" cy="10" r="2.5" />'
    + '  <circle cx="18" cy="10" r="2.5" />'
    + '  <circle cx="9" cy="5" r="2" />'
    + '  <circle cx="15" cy="5" r="2" />'
    + '</svg>';

  // 导航图标
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>',
    creator: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/></svg>',
    invite: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H4z"/><path d="M4 5l8 7 8-7"/></svg>',
    message: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12c0 4-4 7-9 7-1.5 0-3-.3-4-.8L3 20l1.5-4C3.5 15 3 13.5 3 12c0-4 4-7 9-7s9 3 9 7z"/></svg>',
    sample: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7L12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    report: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    daily: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    product: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7L12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 21V11"/></svg>',
    task: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    todo: '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13l2 2 4-4"/></svg>',
  };

  /* ---------- 导航配置 ---------- */

  var NAV_ITEMS = [
    { id: 'index',         label: '首页',     icon: ICONS.home,    href: 'index.html',         enabled: true },
    { id: 'task',          label: '寄样任务', icon: ICONS.task,    href: 'task.html',          enabled: true },
    { id: 'todo',          label: '任务清单', icon: ICONS.todo,    href: 'todo.html',          enabled: true },
    { id: 'creator',       label: '达人',     icon: ICONS.creator, href: 'creator.html',       enabled: true },
    { id: 'ai-assistant',  label: 'AI分析',   icon: ICONS.ai,      href: 'ai-assistant.html',  enabled: true },
    { id: 'product',       label: '产品',     icon: ICONS.product, href: 'product.html',       enabled: true },
    { id: 'invite',        label: '邀约',     icon: ICONS.invite,  href: 'invite.html',        enabled: true },
    { id: 'message',       label: '私信',     icon: ICONS.message, href: 'message.html',       enabled: true },
    { id: 'sample',        label: '样品',     icon: ICONS.sample,  href: 'sample.html',        enabled: true },
    { id: 'video',         label: '视频',     icon: ICONS.video,   href: 'video.html',         enabled: true },
    { id: 'dashboard',     label: '看板',     icon: ICONS.dashboard, href: 'dashboard.html',   enabled: true },
    { id: 'report',        label: '复盘',     icon: ICONS.report,  href: 'report.html',        enabled: true },
    { id: 'daily',         label: '日报',     icon: ICONS.daily,   href: 'daily.html',         enabled: true },
  ];

  // 移动端底部导航只显示 5 个
  var BOTTOM_NAV_IDS = ['index', 'creator', 'ai-assistant', 'sample', 'daily'];

  /* ---------- 导航注入 ---------- */

  function getCurrentPageId() {
    var path = global.location.pathname;
    var filename = path.split('/').pop() || 'index.html';
    var basename = filename.replace('.html', '');
    if (basename === '' || basename === 'index') return 'index';
    return basename;
  }

  function injectNavigation() {
    var currentPage = getCurrentPageId();

    // 桌面侧边栏
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.innerHTML = buildSidebar(currentPage);
    }

    // 移动端底部导航
    var bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.innerHTML = buildBottomNav(currentPage);
    }

    // 预加载其他页面 HTML（配合 Service Worker 缓存优先，切换页面瞬时完成）
    prefetchPages(currentPage);
  }

  function prefetchPages(currentPage) {
    if (!document.head) return;
    NAV_ITEMS.forEach(function (item) {
      if (!item.enabled || item.id === currentPage) return;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = item.href;
      link.setAttribute('data-prefetch', '1');
      document.head.appendChild(link);
    });
  }

  function buildSidebar(currentPage) {
    var items = NAV_ITEMS.map(function (item) {
      var classes = ['sidebar__nav-item'];
      if (item.id === currentPage) classes.push('active');
      if (!item.enabled) classes.push('disabled');

      var badge = '';
      if (!item.enabled) {
        badge = '<span class="nav-badge">待开发</span>';
      }

      var href = item.enabled ? item.href : 'javascript:void(0)';

      return ''
        + '<a href="' + href + '" class="' + classes.join(' ') + '">'
        + '  <span class="nav-icon">' + item.icon + '</span>'
        + '  <span>' + item.label + '</span>'
        +   badge
        + '</a>';
    }).join('');

    return ''
      + '<div class="sidebar__brand">'
      +   CAT_LOGO_SVG
      +   '<div class="sidebar__brand-text">Dlooda <span>TKBD</span></div>'
      + '</div>'
      + '<nav class="sidebar__nav">' + items + '</nav>'
      + '<div class="sidebar__footer">'
      +   'Dlooda TKBD CRM<br>'
      +   'v0.1 · 本地开发版<br>'
      +   BOW_SVG
      + '</div>';
  }

  function buildBottomNav(currentPage) {
    var items = BOTTOM_NAV_IDS.map(function (id) {
      var item = NAV_ITEMS.find(function (n) { return n.id === id; });
      if (!item) return '';
      var classes = ['bottom-nav__item'];
      if (item.id === currentPage) classes.push('active');

      var href = item.enabled ? item.href : 'javascript:void(0)';

      return ''
        + '<a href="' + href + '" class="' + classes.join(' ') + '">'
        + '  <span class="nav-icon">' + item.icon + '</span>'
        + '  <span>' + item.label + '</span>'
        + '</a>';
    }).join('');

    return items;
  }

  /* ---------- 工具函数 ---------- */

  // 格式化数字：1200 -> 1.2k
  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  // 格式化金额
  function formatMoney(n) {
    if (!n) return '$0';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  // 星级显示（不显示 S/A 级，只显示星星）
  function scoreToStars(score) {
    if (score == null) return '☆☆☆☆☆';
    if (score >= 90) return '★★★★★';
    if (score >= 80) return '★★★★☆';
    if (score >= 70) return '★★★★☆';
    if (score >= 60) return '★★★☆☆';
    if (score >= 45) return '★★☆☆☆';
    return '★☆☆☆☆';
  }

  // 评分等级文字（仅用于内部参考，不在 UI 显示 S/A 级）
  function scoreToLabel(score) {
    if (score == null) return '未评分';
    if (score >= 90) return '优质';
    if (score >= 80) return '高潜';
    if (score >= 70) return '良好';
    if (score >= 60) return '一般';
    return '待提升';
  }

  // 生成头像首字母
  function getInitials(name) {
    if (!name) return '?';
    var clean = name.replace(/[@_]/g, '').trim();
    return clean.substring(0, 2).toUpperCase();
  }

  // HTML 转义
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 截断文本
  function truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
  }

  // 获取 URL 参数
  function getQueryParam(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name);
  }

  // 显示 toast 提示
  function showToast(message, duration) {
    duration = duration || 2000;
    var toast = document.createElement('div');
    toast.style.cssText = ''
      + 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
      + 'background:rgba(92,74,74,.92);color:#fff;padding:10px 24px;'
      + 'border-radius:999px;font-size:13px;font-weight:500;z-index:9999;'
      + 'backdrop-filter:blur(8px);box-shadow:0 4px 16px rgba(0,0,0,.15);'
      + 'animation:fadeInUp .3s ease both;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, duration);
  }

  /* ---------- 页面初始化 ---------- */

  function init() {
    injectNavigation();
  }

  // DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- 共享筛选栏组件 ---------- */
  function createFilterBar(containerId, onChange, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    if (!container) return null;

    var Data = global.DloodaData;
    var skus = Data ? Data.getAvailableSKUs() : [];
    var showSku = opts.showSku !== false;

    var skuOptions = '<option value="">全部 SKU</option>' + skus.map(function (sku) {
      return '<option value="' + escapeHtml(sku) + '">SKU ' + escapeHtml(sku) + '</option>';
    }).join('');

    container.innerHTML = ''
      + '<div class="filter-bar">'
      +   (showSku ? '<select class="filter-select" id="' + containerId + '-sku">' + skuOptions + '</select>' : '')
      +   '<input type="date" class="filter-date" id="' + containerId + '-start" placeholder="开始日期">'
      +   '<span class="filter-sep">~</span>'
      +   '<input type="date" class="filter-date" id="' + containerId + '-end" placeholder="结束日期">'
      +   '<button class="filter-btn" data-action="month">本月</button>'
      +   (opts.show7Days !== false ? '<button class="filter-btn" data-action="week">近7天</button>' : '')
      +   '<button class="filter-btn filter-btn--clear" data-action="clear">清除</button>'
      + '</div>';

    var state = { sku: '', startDate: '', endDate: '' };

    function trigger() {
      if (onChange) onChange(state.sku, state.startDate, state.endDate);
    }

    var skuSel = showSku ? document.getElementById(containerId + '-sku') : null;
    var startEl = document.getElementById(containerId + '-start');
    var endEl = document.getElementById(containerId + '-end');

    if (skuSel) {
      skuSel.addEventListener('change', function () {
        state.sku = skuSel.value;
        trigger();
      });
    }
    if (startEl) {
      startEl.addEventListener('change', function () {
        state.startDate = startEl.value;
        trigger();
      });
    }
    if (endEl) {
      endEl.addEventListener('change', function () {
        state.endDate = endEl.value;
        trigger();
      });
    }

    container.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (action === 'clear') {
          state.sku = ''; state.startDate = ''; state.endDate = '';
          if (skuSel) skuSel.value = '';
          if (startEl) startEl.value = '';
          if (endEl) endEl.value = '';
          trigger();
        } else if (action === 'month') {
          var d = new Date();
          var y = d.getFullYear();
          var m = ('0' + (d.getMonth() + 1)).slice(-2);
          state.startDate = y + '-' + m + '-01';
          var lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
          state.endDate = y + '-' + m + '-' + ('0' + lastDay).slice(-2);
          if (startEl) startEl.value = state.startDate;
          if (endEl) endEl.value = state.endDate;
          trigger();
        } else if (action === 'week') {
          var now = new Date();
          var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          state.startDate = weekAgo.getFullYear() + '-' + ('0' + (weekAgo.getMonth() + 1)).slice(-2) + '-' + ('0' + weekAgo.getDate()).slice(-2);
          state.endDate = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
          if (startEl) startEl.value = state.startDate;
          if (endEl) endEl.value = state.endDate;
          trigger();
        }
      });
    });

    return {
      getState: function () { return state; },
      setSKU: function (s) { state.sku = s; if (skuSel) skuSel.value = s; trigger(); },
    };
  }

  /* ---------- 共享 UI 工具函数 ---------- */

  // 剪贴板复制（原 invite.js / message.js 中重复实现）
  function copyToClipboard(text, label) {
    if (global.navigator && global.navigator.clipboard) {
      global.navigator.clipboard.writeText(text).then(function () {
        showToast(label + '已复制 🎀');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
      showToast(label + '已复制 🎀');
    }
  }

  // 填充 SKU 下拉（原 invite.js / message.js / ai-assistant.js 中重复实现）
  // opts: { includeAuto: true/false, placeholder: '请选择 SKU' }
  function populateSkuSelect(selectEl, opts) {
    if (!selectEl) return;
    opts = opts || {};
    var Data = global.DloodaData;
    if (!Data) return;
    var details = Data.getAllSKUDetails();
    // 按定位排序：爆品 → 销售 → 测品 → 撤退
    details = Data.sortByPositioning ? Data.sortByPositioning(details) : details;
    var placeholder = opts.placeholder || '请选择 SKU';
    var html = opts.includeAuto ? '<option value="">自动推荐</option>' : '<option value="">' + placeholder + '</option>';
    html += details.map(function (d) {
      var label = d.sku + ' — ' + (d.productName || '');
      if (d.internalLabel) label += '（' + d.internalLabel + '）';
      return '<option value="' + escapeHtml(d.sku) + '">' + escapeHtml(label) + '</option>';
    }).join('');
    selectEl.innerHTML = html;
  }

  // 打开/关闭弹窗（统一入口）
  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  }
  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  // 绑定多语言 Tab 切换（原 message.js / ai-assistant.js 中重复实现）
  // container: 父容器元素, languages: ['en','zh','es'], defaultLang: 'en'
  function bindLanguageTabs(container, languages, defaultLang) {
    if (!container) return;
    var tabs = container.querySelectorAll('.dm-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var lang = tab.getAttribute('data-lang');
        tabs.forEach(function (t) { t.classList.remove('dm-tab--active'); });
        tab.classList.add('dm-tab--active');
        container.querySelectorAll('.dm-panel').forEach(function (p) {
          p.classList.toggle('dm-panel--active', p.getAttribute('data-lang') === lang);
        });
      });
    });
  }

  // localStorage 简化读写
  function loadStorage(key, defaultValue) {
    try {
      var v = global.localStorage.getItem(key);
      return v ? JSON.parse(v) : (defaultValue || []);
    } catch (e) { return defaultValue || []; }
  }
  function saveStorage(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // 写回飞书：POST /api/push -> 后端调飞书 updateRecord
  // table: 'invites'|'daily'|'pending'|'tasks'|'products'
  // recordId: 该记录在飞书中的 record_id（同步时已嵌入每条数据的 _rid）
  // fields: { 飞书列名: 值 }，列名须与 server/config.json 中该表 fields 配置一致（默认中文列名）
  function pushToFeishu(table, recordId, fields) {
    if (!table || !recordId || !fields) return Promise.resolve(false);
    return fetch('./api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: table, recordId: recordId, fields: fields })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) { showToast('已同步到飞书 ✅'); }
      else { showToast('飞书同步失败：' + ((j && j.error) || '未知错误')); }
      return !!(j && j.ok);
    }).catch(function () {
      showToast('飞书同步未连接（离线或后端未启动）');
      return false;
    });
  }

  /* ---------- 一键清缓存开关（?reset=1） ---------- */
  // 访问任意页面带 ?reset=1 即可强制注销 SW + 清空所有缓存，解决「改了但看不到」的顽固缓存问题
  (function () {
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('reset')) {
        var done = function () { location.replace(location.pathname + (location.search.indexOf('resetdone') > -1 ? '' : '?resetdone=1')); };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) { r.unregister(); });
          });
        }
        if ('caches' in window) {
          caches.keys().then(function (keys) {
            var pend = keys.map(function (k) { return caches.delete(k); });
            Promise.all(pend).then(done).catch(done);
          }).catch(done);
        } else { done(); }
      }
    } catch (e) {}
  })();

  /* ---------- PWA Service Worker 注册 ---------- */
  // 注册 sw.js 实现离线缓存 + 手机「添加到主屏幕」
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        // 部署新版本后主动检查更新（绕过浏览器 24h 更新限制），确保用户及时拿到新文件
        if (reg && reg.update) reg.update();
        // 每 60 秒再查一次更新，开发期迭代更顺
        setInterval(function () { if (reg && reg.update) reg.update(); }, 60000);
      }).catch(function () {
        // 注册失败不影响正常使用
      });
    });
    // 新 Service Worker 接管页面后自动刷新一次，确保用户看到最新内容（无需手动清缓存）
    var swRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (swRefreshing) return;
      swRefreshing = true;
      window.location.reload();
    });
  }

  /* ---------- 飞书数据同步（上传 Excel / 已配置时拉取 / 恢复原始）---------- */
  (function () {
    var XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    // 飞书表名 -> 内部 key（与 server/config.json 的 _tableName 对应）
    var SHEET_MAP = {
      '每日寄样': 'daily', '暂定寄样达人': 'pending', '邀约达人': 'invites',
      '本月寄样任务完成情况': 'tasks', '产品定位': 'products', '线下寄样': 'offline'
    };
    function loadScript(src) {
      return new Promise(function (res, rej) {
        if (document.querySelector('script[src="' + src + '"]')) return res();
        var s = document.createElement('script'); s.src = src;
        s.onload = res; s.onerror = function () { rej(new Error('SheetJS 加载失败（请检查网络）')); };
        document.head.appendChild(s);
      });
    }
    function parseExcelDate(v) {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number') {
        var d = new Date(Math.round((v - 25569) * 86400 * 1000));
        if (isNaN(d.getTime())) return String(v);
        var p = function (n) { return (n < 10 ? '0' + n : '' + n); };
        var date = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        return (d.getHours() || d.getMinutes() || d.getSeconds()) ? (date + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())) : date;
      }
      return String(v).trim();
    }
    function num(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
    function str(v) { if (v === null || v === undefined) return null; var s = String(v).trim(); return s === '' ? null : s; }
    // 稳健取单元格：精确匹配 -> 大小写不敏感匹配；names 列出同一语义的所有已知列名变体
    // （飞书导出列名常微调：SKU/sku、目标量/寄样量、日均/平均每天、出单量7.29、有效期|天…）
    function getCell(r, names) {
      if (!r) return undefined;
      var i, k;
      for (i = 0; i < names.length; i++) {
        k = names[i];
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
      }
      var lowerMap = {};
      Object.keys(r).forEach(function (key) { lowerMap[String(key).toLowerCase()] = key; });
      for (i = 0; i < names.length; i++) {
        var lk = String(names[i]).toLowerCase();
        if (lowerMap[lk] !== undefined) {
          var val = r[lowerMap[lk]];
          if (val !== undefined && val !== null && val !== '') return val;
        }
      }
      return undefined;
    }

    // 把各 sheet 的 Excel 行映射成前端 REAL_DATA 结构
    function buildFromSheets(sheets) {
      var raw = { daily: [], pending: [], invites: [], tasks: [], products: [], offline: [] };
      Object.keys(sheets).forEach(function (name) {
        var key = SHEET_MAP[name];
        if (key && sheets[name]) raw[key] = sheets[name];
      });
      var creatorsMap = {};
      var samples = raw.daily.map(function (r) {
        var name = str(getCell(r, ['达人名称'])); if (!name) return null;
        var videos = [];
        Object.keys(r).forEach(function (k) {
          var m = /^视频(\d+)$/.exec(k);
          if (m) {
            var i = parseInt(m[1], 10);
            // 飞书导出的超链接可能是 {link,text} 对象、附件数组或字符串
            var link = getCell(r, ['视频' + i]);
            if (link) {
              if (typeof link === 'object') {
                if (Array.isArray(link)) link = link[0];
                link = link && (link.link || link.url || link.text) ? (link.link || link.url || link.text) : '';
              }
              link = String(link).trim();
              if (link && link !== '[object Object]') videos.push({ url: link, time: parseExcelDate(getCell(r, ['视频' + i + '时间'])) });
            }
          }
        });
        var s = {
          creator: name, official: str(getCell(r, ['官方'])), stars: str(getCell(r, ['星级'])), creatorType: str(getCell(r, ['达人类型'])),
          orderCount: str(getCell(r, ['出单量', '出单量7.29', '出单数'])), reinvest: str(getCell(r, ['是否复投'])), approval: str(getCell(r, ['通过'])), language: str(getCell(r, ['语言'])),
          bodyType: str(getCell(r, ['身材'])), age: str(getCell(r, ['年龄'])), fulfillment: str(getCell(r, ['履约率'])), category: str(getCell(r, ['品类'])),
          note: str(getCell(r, ['备注'])), color: str(getCell(r, ['颜色'])), sku: str(getCell(r, ['SKU', 'sku'])),
          sampleTime: parseExcelDate(getCell(r, ['寄样时间'])), updateTime: parseExcelDate(getCell(r, ['更新时间'])), fulfillMethod: str(getCell(r, ['履约方式'])),
          videos: videos
        };
        if (!creatorsMap[name]) {
          creatorsMap[name] = { name: name, official: s.official, stars: s.stars, creatorType: s.creatorType, bodyType: s.bodyType, age: s.age, fulfillment: s.fulfillment, category: s.category, note: s.note, sampleCount: 0, videoCount: 0, skus: [], lastSampleTime: null };
        }
        var c = creatorsMap[name]; c.sampleCount++; c.videoCount += videos.length;
        if (s.sku && c.skus.indexOf(s.sku) === -1) c.skus.push(s.sku);
        if (s.official && !c.official) c.official = s.official;
        if (s.stars && !c.stars) c.stars = s.stars;
        if (s.sampleTime && (!c.lastSampleTime || s.sampleTime > c.lastSampleTime)) c.lastSampleTime = s.sampleTime;
        return s;
      }).filter(Boolean);
      var creators = Object.keys(creatorsMap).map(function (k) { return creatorsMap[k]; });
      var pending = raw.pending.map(function (r) {
        return { name: str(getCell(r, ['达人名称'])), official: str(getCell(r, ['官方'])), stars: str(getCell(r, ['星级'])), bodyType: str(getCell(r, ['身材'])), age: str(getCell(r, ['年龄'])), fulfillment: str(getCell(r, ['履约率'])), category: str(getCell(r, ['品类'])), note: str(getCell(r, ['备注'])), color: str(getCell(r, ['颜色'])), sku: str(getCell(r, ['SKU', 'sku'])), rejectReason: str(getCell(r, ['未通过原因'])), reprocessTime: parseExcelDate(getCell(r, ['复核时间'])), result: str(getCell(r, ['结果'])) };
      }).filter(function (p) { return p.name; });
      var invites = raw.invites.map(function (r) {
        return { date: parseExcelDate(getCell(r, ['日期'])), sku: str(getCell(r, ['SKU', 'sku'])), creatorId: str(getCell(r, ['达人名称', 'id', '达人'])), category: str(getCell(r, ['品类'])), commission: str(getCell(r, ['佣金'])), validDays: str(getCell(r, ['有效期', '有效期|天', '有效期(天)'])), planTarget: num(getCell(r, ['计划'])), achieved: num(getCell(r, ['达成'])), note: str(getCell(r, ['备注', 'note'])), script: str(getCell(r, ['话术'])) };
      }).filter(function (i) { return i.date || i.sku; });
      var tasks = raw.tasks.map(function (r) {
        return { sku: str(getCell(r, ['SKU', 'sku', '产品定位'])), priority: str(getCell(r, ['优先级'])), positioning: str(getCell(r, ['定位'])), startTime: parseExcelDate(getCell(r, ['开始时间'])), target: num(getCell(r, ['目标量', '寄样量'])), completed: num(getCell(r, ['已完成'])), uncompleted: num(getCell(r, ['未完成'])), avgDaily: num(getCell(r, ['日均', '平均每天'])), todayCompleted: num(getCell(r, ['今日完成', '今日寄样'])), note: str(getCell(r, ['备注'])) };
      }).filter(function (t) { return t.sku; });
      var skus = raw.products.map(function (r) {
        return { sku: str(getCell(r, ['SKU', 'sku', '产品定位'])), positioning: str(getCell(r, ['定位'])), productId: str(getCell(r, ['商品ID', '商品id'])) };
      }).filter(function (s) { return s.sku; });
      var offline = raw.offline.map(function (r) {
        return { creator: str(getCell(r, ['达人名称', '文本'])), sku: str(getCell(r, ['SKU', 'sku'])), color: str(getCell(r, ['颜色'])), sampleTime: parseExcelDate(getCell(r, ['寄样时间'])), note: str(getCell(r, ['备注', '文本'])) };
      }).filter(function (o) { return o.creator || o.sku; });
      return { creators: creators, samples: samples, pending: pending, invites: invites, tasks: tasks, skus: skus, offline: offline };
    }

    function handleFile(file) {
      return loadScript(XLSX_CDN).then(function () {
        return new Promise(function (res, rej) {
          var reader = new FileReader();
          reader.onload = function (e) { res(e.target.result); };
          reader.onerror = function () { rej(new Error('读取文件失败')); };
          reader.readAsArrayBuffer(file);
        });
      }).then(function (buf) {
        var wb = XLSX.read(buf, { type: 'array' });
        var sheets = {};
        wb.SheetNames.forEach(function (sn) { sheets[sn] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', raw: true }); });
        var data = buildFromSheets(sheets);
        var rawHasData = data.samples.length || data.pending.length || data.invites.length || data.tasks.length || data.skus.length || data.offline.length;
        if (!rawHasData) {
          throw new Error('未解析到数据，请确认 Excel 的工作表名与飞书一致（每日寄样/邀约达人/产品定位/本月寄样任务完成情况…）');
        }
        // 安全合并：本次上传若某张表为空，则不覆盖掉原有/历史数据，避免误清空
        var prev = null;
        try { prev = JSON.parse(global.localStorage.getItem('dlooda_uploaded_data')); } catch (e) {}
        var base = prev || (global.REAL_DATA) || {};
        ['creators', 'samples', 'pending', 'invites', 'tasks', 'skus', 'offline'].forEach(function (k) {
          if (!(data[k] && data[k].length) && base[k] && base[k].length) data[k] = base[k];
        });
        var stats = {
          creatorCount: data.creators.length, sampleCount: data.samples.length, pendingCount: data.pending.length,
          inviteCount: data.invites.length, taskCount: data.tasks.length, skuCount: data.skus.length,
          offlineCount: data.offline.length, videoCount: data.samples.reduce(function (s, x) { return s + x.videos.length; }, 0)
        };
        try {
          global.localStorage.setItem('dlooda_uploaded_data', JSON.stringify(data));
          global.localStorage.setItem('dlooda_uploaded_stats', JSON.stringify(stats));
        } catch (err) {
          throw new Error('数据过大无法存入本地(' + (err && err.name) + ')，建议用后端同步或拆分导出');
        }
        return stats;
      });
    }

    function ensurePanel() {
      if (document.getElementById('feishu-sync-panel')) return document.getElementById('feishu-sync-panel');
      var mask = document.createElement('div');
      mask.id = 'feishu-sync-panel';
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(80,60,70,.35);z-index:9998;display:none;align-items:center;justify-content:center;';
      mask.innerHTML =
        '<div style="background:#fff;border-radius:18px;max-width:420px;width:88%;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.18);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="margin:0;font-size:16px;color:#7a5a66;">📥 同步飞书数据</h3><button id="fs-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#bbb;">×</button></div>'
        + '<p style="font-size:13px;color:#9a8a90;line-height:1.6;margin:6px 0 14px;">在飞书多维表格「导出为 Excel」后，把文件拖到这里即可同步。无需账号、手机也能用。表名请保持：每日寄样 / 邀约达人 / 产品定位 等。</p>'
        + '<label style="display:block;border:2px dashed #ffc2dc;border-radius:14px;padding:22px;text-align:center;cursor:pointer;color:#d77fa1;font-size:14px;">点击选择 / 拖拽 Excel 文件<input id="fs-file" type="file" accept=".xlsx,.xls,.csv" style="display:none;"></label>'
        + '<div id="fs-msg" style="font-size:13px;color:#9a8a90;margin-top:12px;min-height:18px;"></div>'
        + '<button id="fs-pull-btn" style="margin-top:10px;width:100%;padding:10px;border:none;border-radius:12px;background:linear-gradient(135deg,#ff9ec4,#ffb6d5);color:#fff;font-weight:600;cursor:pointer;display:none;">🔄 从飞书拉取（已配置）</button>'
        + '<button id="fs-reset" style="margin-top:8px;width:100%;padding:8px;border:1px solid #ffd6e6;border-radius:10px;background:#fff;color:#d77fa1;cursor:pointer;display:none;">↩ 恢复原始数据</button>'
        + '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) { if (e.target === mask) mask.style.display = 'none'; });
      document.getElementById('fs-close').addEventListener('click', function () { mask.style.display = 'none'; });
      var fileInput = document.getElementById('fs-file');
      fileInput.addEventListener('change', function () { if (fileInput.files[0]) doUpload(fileInput.files[0]); });
      ['dragover', 'drop'].forEach(function (ev) { mask.addEventListener(ev, function (e) { e.preventDefault(); }); });
      mask.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files[0]) doUpload(e.dataTransfer.files[0]); });
      document.getElementById('fs-pull-btn').addEventListener('click', function () {
        var b = this; b.disabled = true; var old = b.innerHTML; b.innerHTML = '同步中…';
        fetch('./api/sync', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.ok) { mask.style.display = 'none'; showToast('飞书数据已同步 🎀'); setTimeout(function () { location.reload(); }, 800); }
          else showToast('同步失败：' + ((j && j.error) || '未配置'));
        }).catch(function () { showToast('同步未连接'); }).finally(function () { b.disabled = false; b.innerHTML = old; });
      });
      document.getElementById('fs-reset').addEventListener('click', function () {
        try { global.localStorage.removeItem('dlooda_uploaded_data'); global.localStorage.removeItem('dlooda_uploaded_stats'); } catch (e) {}
        mask.style.display = 'none'; showToast('已恢复原始数据'); setTimeout(function () { location.reload(); }, 600);
      });
      return mask;
    }

    function doUpload(file) {
      var msg = document.getElementById('fs-msg');
      msg.style.color = '#d77fa1'; msg.textContent = '解析中…';
      handleFile(file).then(function (stats) {
        msg.style.color = '#5bbf8a';
        msg.textContent = '✅ 已同步：' + stats.sampleCount + ' 条寄样 / ' + stats.creatorCount + ' 达人 / ' + stats.skuCount + ' SKU，即将刷新…';
        setTimeout(function () { location.reload(); }, 1000);
      }).catch(function (err) {
        msg.style.color = '#e07a7a'; msg.textContent = '❌ ' + (err && err.message ? err.message : '解析失败');
      });
    }

    function showPanel() {
      var mask = ensurePanel();
      mask.style.display = 'flex';
      var hasUp = false; try { hasUp = !!global.localStorage.getItem('dlooda_uploaded_data'); } catch (e) {}
      // 始终显示「恢复原始数据」，避免用户找不到恢复入口
      document.getElementById('fs-reset').style.display = 'block';
      if (!hasUp) document.getElementById('fs-reset').textContent = '↩ 恢复为原始数据（当前无上传覆盖）';
      fetch('./api/status').then(function (r) { return r.json(); }).then(function (s) {
        document.getElementById('fs-pull-btn').style.display = (s && s.configured) ? 'block' : 'none';
      }).catch(function () { document.getElementById('fs-pull-btn').style.display = 'none'; });
    }

    function injectBtn() {
      if (document.getElementById('feishu-sync-btn')) return;
      if (!document.body) return;
      var btn = document.createElement('button');
      btn.id = 'feishu-sync-btn';
      btn.innerHTML = '📥 同步飞书';
      btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 16px;border:none;border-radius:24px;background:linear-gradient(135deg,#ff9ec4,#ffb6d5);color:#fff;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(255,140,180,.45);cursor:pointer;';
      btn.addEventListener('click', showPanel);
      document.body.appendChild(btn);
    }
    // 首次访问自动从飞书拉取（后端已配置但 KV 还没数据时），避免用户手动点一次
    function autoSyncIfNeeded() {
      try {
        fetch('./api/status').then(function (r) { return r.json(); }).then(function (s) {
          if (s && s.configured && !s.synced) {
            fetch('./api/sync', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
              if (j && j.ok) setTimeout(function () { location.reload(); }, 600);
            }).catch(function () {});
          }
        }).catch(function () {});
      } catch (e) {}
    }
    if (document.body) injectBtn();
    else document.addEventListener('DOMContentLoaded', injectBtn);
    setTimeout(autoSyncIfNeeded, 1500);

    // 定时自动同步：每 5 分钟从飞书拉最新数据；数据有变化且当前未在编辑时，自动刷新页面
    (function startAutoSync() {
      var lastStatsStr = null;
      setInterval(function () {
        fetch('./api/status').then(function (r) { return r.json(); }).then(function (s) {
          if (!s || !s.configured) return;
          fetch('./api/sync', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
            if (j && j.ok) {
              var newStats = JSON.stringify(j.stats || {});
              if (lastStatsStr !== null && newStats !== lastStatsStr) {
                var ae = document.activeElement;
                var editing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
                if (!editing) { location.reload(); }
                else { showToast('飞书有更新，刷新页面查看最新 🎀'); }
              }
              lastStatsStr = newStats;
            }
          }).catch(function () {});
        }).catch(function () {});
      }, 5 * 60 * 1000);
    })();
  })();

  /* ---------- 导出 ---------- */
  global.DloodaApp = {
    icons: ICONS,
    svg: { catLogo: CAT_LOGO_SVG, bow: BOW_SVG, paw: PAW_SVG },
    nav: NAV_ITEMS,
    formatNumber: formatNumber,
    formatMoney: formatMoney,
    scoreToStars: scoreToStars,
    scoreToLabel: scoreToLabel,
    getInitials: getInitials,
    escapeHtml: escapeHtml,
    truncate: truncate,
    getQueryParam: getQueryParam,
    showToast: showToast,
    createFilterBar: createFilterBar,
    // 新增共享函数
    copyToClipboard: copyToClipboard,
    populateSkuSelect: populateSkuSelect,
    openModal: openModal,
    closeModal: closeModal,
    bindLanguageTabs: bindLanguageTabs,
    loadStorage: loadStorage,
    saveStorage: saveStorage,
    pushToFeishu: pushToFeishu,
  };

})(window);
