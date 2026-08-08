/* ================================================================
   Dlooda TKBD CRM — Product Page Controller
   产品定位管理 · 编辑保存 · 新建 SKU
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var currentFilter = 'all';

  /* ---------- 渲染筛选 tabs ---------- */
  function renderFilterTabs() {
    var container = document.getElementById('product-filter-tabs');
    if (!container) return;

    var details = Data.getAllSKUDetails();
    var types = ['all'];
    details.forEach(function (d) {
      if (d.productType && types.indexOf(d.productType) < 0) types.push(d.productType);
    });

    container.innerHTML = types.map(function (t) {
      var label = t === 'all' ? '全部' : t;
      var count = t === 'all' ? details.length : details.filter(function (d) { return d.productType === t; }).length;
      var cls = currentFilter === t ? 'filter-tab filter-tab--active' : 'filter-tab';
      return '<button class="' + cls + '" data-type="' + App.escapeHtml(t) + '" type="button">' + App.escapeHtml(label) + ' <span class="filter-tab__count">' + count + '</span></button>';
    }).join('');

    container.querySelectorAll('.filter-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        currentFilter = tab.getAttribute('data-type');
        renderFilterTabs();
        renderList();
      });
    });
  }

  /* ---------- 渲染产品列表 ---------- */
  function renderList() {
    var container = document.getElementById('product-list');
    if (!container) return;

    var details = Data.getAllSKUDetails();
    if (currentFilter !== 'all') {
      details = details.filter(function (d) { return d.productType === currentFilter; });
    }
    // 按定位排序：爆品 → 销售 → 测品 → 撤退
    details = Data.sortByPositioning(details);

    if (details.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">' + App.svg.paw + '</div><div class="empty-state__text">还没有产品数据<br>点击右上角「新建 SKU」添加</div></div>';
      return;
    }

    container.innerHTML = details.map(function (d) {
      var tier = Data.getSKUPositionTier(d.sku);
      var tierBadge = tier === 0 ? '<span class="badge badge--pink">爆品</span>' :
                      tier === 1 ? '<span class="badge badge--green">销售</span>' :
                      tier === 2 ? '<span class="badge badge--blue">测品</span>' :
                      tier === 3 ? '<span class="badge badge--gray">撤退</span>' : '';
      var priorityBadge = d.priority === 'high' ? '<span class="badge badge--pink">主推</span>' :
                          d.priority === 'medium' ? '<span class="badge badge--blue">中</span>' :
                          '<span class="badge badge--gray">辅助</span>';
      var typeBadge = d.productType ? '<span class="badge badge--sand">' + App.escapeHtml(d.productType) + '</span>' : '';
      var commissionBadge = d.defaultCommission ? '<span class="badge badge--green">' + App.escapeHtml(d.defaultCommission) + '</span>' : '';

      var html = ''
        + '<div class="card" style="margin-bottom:12px;">'
        +   '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">'
        +     '<div style="flex:1;min-width:0;">'
        +       '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">'
        +         '<span style="font-size:16px;font-weight:700;color:var(--text-1);">' + App.escapeHtml(d.sku) + '</span>'
        +         '<span style="font-size:14px;font-weight:600;color:var(--text-2);">' + App.escapeHtml(d.productName || '—') + '</span>'
        +       '</div>'
        +       '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">'
        +         tierBadge + priorityBadge + typeBadge + commissionBadge
        +       '</div>';

      if (d.positioningLabel) {
        html += '<div style="font-size:12px;color:var(--pink-600);font-weight:600;margin-bottom:4px;">定位：' + App.escapeHtml(d.positioningLabel) + '</div>';
      }
      if (d.internalLabel) {
        html += '<div style="font-size:11px;color:var(--text-3);margin-bottom:6px;">内部标签：' + App.escapeHtml(d.internalLabel) + '</div>';
      }
      if (d.productDescCn) {
        html += '<div style="font-size:13px;color:var(--text-2);line-height:1.6;margin-bottom:6px;">' + App.escapeHtml(d.productDescCn) + '</div>';
      }
      if (d.sellingPoints) {
        html += '<div style="font-size:12px;color:var(--c-success);margin-bottom:4px;">✓ 卖点：' + App.escapeHtml(d.sellingPoints) + '</div>';
      }
      if (d.painPoints) {
        html += '<div style="font-size:12px;color:var(--c-warning);margin-bottom:4px;">⚠ 注意：' + App.escapeHtml(d.painPoints) + '</div>';
      }
      if (d.targetCreators) {
        html += '<div style="font-size:12px;color:var(--text-3);">适合达人：' + App.escapeHtml(d.targetCreators) + '</div>';
      }

      html += '</div>'
        +     '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">'
        +       '<button class="btn btn--secondary btn--sm" data-edit="' + App.escapeHtml(d.sku) + '" type="button">编辑</button>'
        +       '<a class="btn btn--ghost btn--sm" href="ai-assistant.html?sku=' + encodeURIComponent(d.sku) + '" style="text-decoration:none;text-align:center;">写话术</a>'
        +     '</div>'
        +   '</div>'
        + '</div>';

      return html;
    }).join('');

    // 绑定编辑按钮
    container.querySelectorAll('button[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openEditModal(btn.getAttribute('data-edit'));
      });
    });
  }

  /* ---------- 打开编辑弹窗 ---------- */
  function openEditModal(skuCode) {
    var modal = document.getElementById('edit-modal');
    var title = document.getElementById('modal-title');
    var skuInput = document.getElementById('edit-sku');

    if (skuCode) {
      // 编辑已有
      title.textContent = '编辑 SKU ' + skuCode;
      skuInput.value = skuCode;
      skuInput.disabled = true;

      var detail = Data.getSKUDetail(skuCode);
      setVal('edit-name', detail.productName);
      setVal('edit-type', detail.productType || '长裤');
      setVal('edit-positioning', detail.positioning);
      setVal('edit-internal', detail.internalLabel);
      setVal('edit-desc-cn', detail.productDesc);
      setVal('edit-desc-en', detail.productDescEn);
      setVal('edit-creators', detail.targetCreators);
      setVal('edit-selling', detail.sellingPoints);
      setVal('edit-pain', detail.painPoints);
      setVal('edit-commission', detail.defaultCommission);
      setVal('edit-priority', detail.priority || 'medium');
    } else {
      // 新建
      title.textContent = '新建 SKU';
      skuInput.value = '';
      skuInput.disabled = false;
      ['edit-name','edit-positioning','edit-internal','edit-desc-cn','edit-desc-en','edit-creators','edit-selling','edit-pain','edit-commission'].forEach(function (id) {
        setVal(id, '');
      });
      setVal('edit-type', '长裤');
      setVal('edit-priority', 'medium');
    }

    modal.style.display = 'flex';
  }

  function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
  }

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value != null ? value : '';
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ---------- 保存 SKU ---------- */
  function saveSKU() {
    var skuCode = val('edit-sku');
    if (!skuCode) {
      App.showToast('请输入 SKU 编号');
      return;
    }
    var name = val('edit-name');
    if (!name) {
      App.showToast('请输入产品名称');
      return;
    }

    var detail = {
      productName: name,
      productType: val('edit-type'),
      positioning: val('edit-positioning'),
      internalLabel: val('edit-internal'),
      productDesc: val('edit-desc-cn'),
      productDescEn: val('edit-desc-en'),
      targetCreators: val('edit-creators'),
      sellingPoints: val('edit-selling'),
      painPoints: val('edit-pain'),
      defaultCommission: val('edit-commission'),
      priority: val('edit-priority'),
    };

    Data.saveSKUOverride(skuCode, detail);
    closeEditModal();
    renderFilterTabs();
    renderList();
    App.showToast('SKU ' + skuCode + ' 已保存');
  }

  /* ---------- 初始化 ---------- */
  function init() {
    renderFilterTabs();
    renderList();

    var addBtn = document.getElementById('btn-add-sku');
    if (addBtn) addBtn.addEventListener('click', function () { openEditModal(null); });

    var saveBtn = document.getElementById('btn-save-sku');
    if (saveBtn) saveBtn.addEventListener('click', saveSKU);

    var closeBtn = document.getElementById('btn-close-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeEditModal);

    var cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);

    // 点击遮罩关闭
    var modal = document.getElementById('edit-modal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) closeEditModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
