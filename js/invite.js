/* ================================================================
   Dlooda TKBD CRM — 邀约管理 (v4)
   顶部产品通过率表（时间筛选）· 邀约话术按产品分组
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Translator = global.DloodaTranslator;

  var currentKeyword = '';
  var passRateState = { startDate: '', endDate: '' };

  /* ---------- 定位档位徽章 ---------- */
  function tierBadge(sku) {
    var tier = Data.getSKUPositionTier(sku);
    if (tier === 0) return '<span class="badge badge--pink">爆品</span>';
    if (tier === 1) return '<span class="badge badge--green">销售</span>';
    if (tier === 2) return '<span class="badge badge--blue">测品</span>';
    if (tier === 3) return '<span class="badge badge--gray">撤退</span>';
    return '';
  }

  /* ---------- 产品通过率表 ---------- */
  function renderPassRate() {
    var container = document.getElementById('passrate-table');
    if (!container) return;

    var rows = Data.getInvitePassRate(passRateState.startDate, passRateState.endDate);

    if (rows.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px;">该时间范围内暂无寄样 / 邀约数据</div>';
      return;
    }

    var body = rows.map(function (r) {
      var rateColor = r.passRate == null ? 'var(--text-3)' :
                      r.passRate >= 100 ? 'var(--c-success)' :
                      r.passRate >= 50 ? 'var(--c-info)' : 'var(--c-warning)';
      var rateText = r.passRate == null ? '—' : r.passRate + '%';
      return ''
        + '<tr>'
        +   '<td><span class="sku-tag">' + App.escapeHtml(r.sku) + '</span></td>'
        +   '<td style="text-align:left;color:var(--text-2);">' + App.escapeHtml(r.productName || '—') + '</td>'
        +   '<td>' + r.sampleCount + '</td>'
        +   '<td>' + r.inviteCount + '</td>'
        +   '<td style="color:' + rateColor + ';font-weight:700;">' + rateText + '</td>'
        + '</tr>';
    }).join('');

    container.innerHTML = ''
      + '<table class="data-table" style="margin:0;">'
      +   '<thead><tr>'
      +     '<th>SKU</th><th style="text-align:left;">产品</th><th>寄样量</th><th>邀约数</th><th>通过率</th>'
      +   '</tr></thead>'
      +   '<tbody>' + body + '</tbody>'
      + '</table>';
  }

  /* ---------- 邀约话术按产品分组 ---------- */
  function getGroupedInvites() {
    // 仅取有话术的邀约，按 SKU 分组
    var groups = {};
    Data.getInvites().forEach(function (i) {
      if (!i.script || i.script.length <= 20) return;
      if (!groups[i.sku]) groups[i.sku] = [];
      groups[i.sku].push(i);
    });

    // 按定位档位排序分组
    var list = Object.keys(groups).map(function (sku) {
      // 组内按日期倒序
      var items = groups[sku].slice().sort(function (a, b) {
        return (b.date || '') > (a.date || '') ? 1 : -1;
      });
      return { sku: sku, items: items };
    });

    return Data.sortByPositioning(list);
  }

  function renderGroupedList() {
    var container = document.getElementById('invite-list');
    if (!container) return;

    var groups = getGroupedInvites();

    if (groups.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">还没有匹配的邀约话术记录</div></div>';
      return;
    }

    var kw = currentKeyword ? currentKeyword.toLowerCase() : '';

    var html = groups.map(function (group, gi) {
      var sku = group.sku;
      var detail = Data.getSKUDetail(sku);
      var matchedItems = group.items.filter(function (inv) {
        if (!kw) return true;
        return (inv.sku && inv.sku.toLowerCase().includes(kw)) ||
               (inv.commission && inv.commission.toLowerCase().includes(kw)) ||
               (inv.category && inv.category.toLowerCase().includes(kw)) ||
               (inv.script && inv.script.toLowerCase().includes(kw));
      });
      if (matchedItems.length === 0) return '';

      var recordsHtml = matchedItems.map(function (inv, idx) {
        var expandId = 'inv-script-' + gi + '-' + idx;
        var dateText = inv.date || '无日期';
        var commText = inv.commission ? '<span class="badge badge--green">' + App.escapeHtml(inv.commission) + '% 佣金</span>' : '';
        var catText = inv.category ? '<span class="badge badge--sand">' + App.escapeHtml(inv.category) + '</span>' : '';
        var validText = inv.validDays ? '<span class="badge badge--gray">有效期' + inv.validDays + '天</span>' : '';

        return ''
          + '<div style="padding:10px 0;border-top:1px solid var(--border-1);">'
          +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
          +     '<span style="font-size:12px;color:var(--text-3);">' + App.escapeHtml(dateText) + '</span>'
          +     '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + commText + catText + validText + '</div>'
          +   '</div>'
          +   '<div id="' + expandId + '" style="display:none;padding:12px;background:var(--bg-pink-soft);border-radius:8px;font-size:13px;line-height:1.7;color:var(--text-1);white-space:pre-wrap;border:1px solid var(--c-border);">' + App.escapeHtml(inv.script) + '</div>'
          +   '<button class="link-btn" data-expand="' + expandId + '">展开话术 →</button>'
          + '</div>';
      }).join('');

      var groupId = 'inv-group-' + gi;
      return ''
        + '<div class="card dm-category-item" style="margin-bottom:10px;">'
        +   '<div class="dm-category-header" data-toggle="' + groupId + '" style="cursor:pointer;">'
        +     '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
        +       '<span class="badge badge--pink">SKU ' + App.escapeHtml(sku) + '</span>'
        +       '<span style="font-size:14px;font-weight:600;color:var(--text-1);">' + App.escapeHtml(detail.productName || '') + '</span>'
        +       tierBadge(sku)
        +     '</div>'
        +     '<span class="dm-chevron">▾</span>'
        +   '</div>'
        +   '<div id="' + groupId + '" class="dm-category-body" style="display:none;">' + recordsHtml + '</div>'
        + '</div>';
    }).join('');

    if (!html) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">没有匹配的邀约话术记录</div></div>';
      return;
    }

    container.innerHTML = html;

    // 绑定分组展开 / 收起
    container.querySelectorAll('[data-toggle]').forEach(function (header) {
      header.addEventListener('click', function () {
        var body = document.getElementById(header.getAttribute('data-toggle'));
        var chevron = header.querySelector('.dm-chevron');
        if (!body) return;
        var isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    });

    // 绑定单条话术展开
    container.querySelectorAll('[data-expand]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var target = document.getElementById(btn.getAttribute('data-expand'));
        if (!target) return;
        var isOpen = target.style.display !== 'none';
        target.style.display = isOpen ? 'none' : 'block';
        btn.textContent = isOpen ? '展开话术 →' : '收起话术 ↑';
      });
    });
  }

  function bindSearch() {
    var input = document.getElementById('invite-search');
    if (!input) return;
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        currentKeyword = input.value;
        renderGroupedList();
      }, 300);
    });
  }

  /* ---------- 新建邀约弹窗 ---------- */
  function openNewInviteModal() {
    App.populateSkuSelect(document.getElementById('new-invite-sku'));
    App.openModal('new-invite-modal');
  }

  function handleManualInvite() {
    var sku = document.getElementById('new-invite-sku').value;
    if (!sku) { App.showToast('请先选择 SKU'); return; }
    var detail = Data.getSKUDetail(sku);
    var creator = document.getElementById('new-invite-creator').value || '达人';
    var comm = detail.defaultCommission || '15% + 8%';
    var template = '';
    if (detail.productName) {
      var hook = detail.positioning ? '【' + detail.positioning + '】\n\n' : '';
      template = hook + 'Hi ' + creator + '~ This is Dlooda.\n\nOur ' + detail.productName + ' — ' + (detail.productDescEn || '') + '\n\n' + comm + ' commission with ad support — Feel free to apply!';
    }
    App.closeModal('new-invite-modal');
    var ta = document.getElementById('manual-invite-text');
    if (ta) ta.value = template;
    var skuHidden = document.getElementById('manual-invite-sku');
    if (skuHidden) skuHidden.value = sku;
    var creatorHidden = document.getElementById('manual-invite-creator-name');
    if (creatorHidden) creatorHidden.value = creator;
    App.openModal('manual-invite-modal');
  }

  /* ---------- AI 润色翻译 ---------- */
  function handleAiTranslate() {
    var text = (document.getElementById('manual-invite-text') || {}).value || '';
    if (!text.trim()) { App.showToast('请先输入中文内容'); return; }
    var sku = (document.getElementById('manual-invite-sku') || {}).value || '';
    var creator = (document.getElementById('manual-invite-creator-name') || {}).value || '';
    var detail = sku ? Data.getSKUDetail(sku) : null;

    var result = Translator.polishAndTranslate(text, 'invite', {
      creator: creator,
      sku: sku,
      detail: detail,
    });

    renderTranslateResult(result, 'invite');
  }

  function renderTranslateResult(result, type) {
    var area = document.getElementById('translate-result-area');
    if (!area) return;

    var title = type === 'invite' ? 'AI 润色翻译结果' : 'AI 私信翻译结果';
    var languages = type === 'invite'
      ? [{ code: 'en', label: 'English', default: true }, { code: 'zh', label: '中文' }, { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' }, { code: 'pt', label: 'Português' }]
      : [{ code: 'en', label: 'English', default: true }, { code: 'es', label: 'Español', default: true }, { code: 'zh', label: '中文' }, { code: 'fr', label: 'Français' }, { code: 'pt', label: 'Português' }];

    var tabsHtml = languages.map(function (lang, i) {
      return '<button class="dm-tab' + (i === 0 ? ' dm-tab--active' : '') + '" data-lang="' + lang.code + '" type="button">' + lang.label + '</button>';
    }).join('');

    var panelsHtml = languages.map(function (lang, i) {
      var text = result[lang.code] || result.en || '';
      return '<div class="dm-panel' + (i === 0 ? ' dm-panel--active' : '') + '" data-lang="' + lang.code + '">'
        +   '<div class="ai-message-box">' + App.escapeHtml(text) + '</div>'
        +   '<button class="btn btn--secondary btn--sm" style="margin-top:10px;" data-copy-lang="' + lang.code + '">复制</button>'
        + '</div>';
    }).join('');

    area.innerHTML = ''
      + '<div class="card" style="margin-top:12px;">'
      +   '<div class="card__header"><h3 class="card__title">' + title + '</h3></div>'
      +   '<div class="dm-tabs">' + tabsHtml + '</div>'
      +   '<div class="dm-panels">' + panelsHtml + '</div>'
      +   '<div style="display:flex;gap:8px;margin-top:12px;">'
      +     '<button class="btn btn--ghost btn--sm" id="btn-regen-translate">重新润色</button>'
      +     '<button class="btn btn--primary btn--sm" id="btn-apply-translate">使用此话术</button>'
      +   '</div>'
      + '</div>';

    App.bindLanguageTabs(area, languages, languages[0].code);

    area.querySelectorAll('button[data-copy-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-copy-lang');
        var text = result[lang] || result.en || '';
        var label = languages.find(function (l) { return l.code === lang; });
        App.copyToClipboard(text, (label ? label.label : '话术') + ' ');
      });
    });

    var regenBtn = document.getElementById('btn-regen-translate');
    if (regenBtn) regenBtn.addEventListener('click', handleAiTranslate);

    var applyBtn = document.getElementById('btn-apply-translate');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      var defaultText = result.en || result.zh || '';
      var ta = document.getElementById('manual-invite-text');
      if (ta) ta.value = defaultText;
      area.innerHTML = '';
      App.showToast('已应用翻译结果 ✨');
    });
  }

  function saveManualInvite() {
    var text = (document.getElementById('manual-invite-text') || {}).value || '';
    if (!text.trim()) { App.showToast('内容不能为空'); return; }
    var sku = (document.getElementById('manual-invite-sku') || {}).value || '';
    var creator = (document.getElementById('manual-invite-creator-name') || {}).value || '';
    var saved = App.loadStorage('dlooda_manual_invites', []);
    saved.push({ text: text, sku: sku, creator: creator, time: new Date().toISOString() });
    App.saveStorage('dlooda_manual_invites', saved);
    App.closeModal('manual-invite-modal');
    App.showToast('邀约话术已保存 🎀');

    // 双向写回：若该邀约在飞书已有记录（带 _rid），则把话术同步回飞书
    try {
      var invites = (global.DloodaData && global.DloodaData.invites) || [];
      var match = invites.filter(function (it) { return it._rid && it.sku === sku; })
                         .find(function (it) { return (it.creatorId || '').toLowerCase() === (creator || '').toLowerCase(); });
      if (match) {
        App.pushToFeishu('invites', match._rid, { '话术': text });
      }
    } catch (e) {}
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 通过率时间筛选（只需时间范围，不需要 SKU 下拉）
    App.createFilterBar('passrate-filter', function (sku, start, end) {
      passRateState.startDate = start || '';
      passRateState.endDate = end || '';
      renderPassRate();
    }, { showSku: false, show7Days: false });

    renderPassRate();
    renderGroupedList();
    bindSearch();

    var newBtn = document.getElementById('btn-new-invite');
    if (newBtn) newBtn.addEventListener('click', openNewInviteModal);
    var closeBtn = document.getElementById('btn-close-new-invite');
    if (closeBtn) closeBtn.addEventListener('click', function () { App.closeModal('new-invite-modal'); });
    var cancelBtn = document.getElementById('btn-cancel-new-invite');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { App.closeModal('new-invite-modal'); });
    var manualBtn = document.getElementById('btn-manual-invite');
    if (manualBtn) manualBtn.addEventListener('click', handleManualInvite);

    var modal = document.getElementById('new-invite-modal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) App.closeModal('new-invite-modal');
    });

    var saveManualBtn = document.getElementById('btn-save-manual-invite');
    if (saveManualBtn) saveManualBtn.addEventListener('click', saveManualInvite);
    var closeManualBtn = document.getElementById('btn-close-manual-invite');
    if (closeManualBtn) closeManualBtn.addEventListener('click', function () { App.closeModal('manual-invite-modal'); });
    var cancelManualBtn = document.getElementById('btn-cancel-manual-invite');
    if (cancelManualBtn) cancelManualBtn.addEventListener('click', function () { App.closeModal('manual-invite-modal'); });

    var translateBtn = document.getElementById('btn-ai-translate-invite');
    if (translateBtn) translateBtn.addEventListener('click', handleAiTranslate);

    var manualModal = document.getElementById('manual-invite-modal');
    if (manualModal) manualModal.addEventListener('click', function (e) {
      if (e.target === manualModal) App.closeModal('manual-invite-modal');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
