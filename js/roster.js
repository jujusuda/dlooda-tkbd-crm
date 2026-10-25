/* ================================================================
   Dlooda TKBD CRM — 达人名单库 (roster.js)
   粘贴 handle → 清洗 → 匹配飞书每日寄样表 → 三道规则判定 → 按 SKU 分组 → 一键复制
   名单仅存本机浏览器，不回写飞书
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Store = global.DloodaStore;
  var Matcher = global.DloodaMatcher;

  var previewResults = [];   // 当前预览结果（未导入）
  var copyFormat = 'line';   // line | comma | at
  var modalState = { sku: '' };

  /* ---------- 状态样式 ---------- */

  var STATUS_STYLE = {
    ok:          { cls: 'badge--green', label: '可发送' },
    cooperated:  { cls: 'badge--sand',  label: '已合作该款' },
    skuLimit:    { cls: 'badge--gray',  label: '已达3款上限' },
    blacklist:   { cls: 'badge--red',   label: '黑名单' },
    inefficient: { cls: 'badge--red',   label: '低效达人' },
    invalid:     { cls: 'badge--gray',  label: '无效' },
  };

  function statusBadge(status) {
    var s = STATUS_STYLE[status] || STATUS_STYLE.ok;
    return '<span class="badge ' + s.cls + '">' + s.label + '</span>';
  }

  /* ---------- SKU 下拉 ---------- */

  function initSkuSelects() {
    var sel = document.getElementById('roster-sku');
    if (sel) App.populateSkuSelect(sel, { placeholder: '请选择 SKU' });

    var osel = document.getElementById('ob-sku');
    if (osel) App.populateSkuSelect(osel, { placeholder: '未指定' });

    var fsel = document.getElementById('roster-filter-sku');
    if (fsel) {
      var skus = Data ? Data.getAvailableSKUs() : [];
      fsel.innerHTML = '<option value="">全部 SKU 组</option>'
        + skus.map(function (s) {
            return '<option value="' + App.escapeHtml(s) + '">' + App.escapeHtml(s) + '</option>';
          }).join('');
    }
  }

  /* ---------- 输入统计 ---------- */

  function updateCount() {
    var ta = document.getElementById('roster-input');
    var el = document.getElementById('roster-count');
    if (!ta || !el) return;
    var handles = Matcher.parseHandles(ta.value);
    var uniq = Matcher.dedupe(handles);
    el.textContent = '已识别 ' + handles.length + ' 个'
      + (handles.length !== uniq.length ? '（去重后 ' + uniq.length + ' 个）' : '');
  }

  /* ---------- 校验预览 ---------- */

  function checkPreview() {
    var ta = document.getElementById('roster-input');
    var skuSel = document.getElementById('roster-sku');
    if (!ta) return;
    var targetSku = skuSel ? skuSel.value : '';
    var handles = Matcher.dedupe(Matcher.parseHandles(ta.value));

    if (!handles.length) {
      App.showToast('请先粘贴达人 handle');
      return;
    }

    Matcher.rebuild();
    previewResults = Matcher.checkBatch(handles, targetSku);
    var sum = Matcher.summarize(previewResults);

    renderSummary(sum);
    renderTable(previewResults, true);

    var blocked = sum.blacklist + sum.inefficient;
    if (blocked) {
      App.showToast('拦截 ' + blocked + ' 位黑名单/低效达人，未纳入导入');
    } else {
      App.showToast('校验完成，可点击「确认导入」');
    }
  }

  /* ---------- 确认导入 ----------
   * 已存在的达人 → 追加到新 SKU 组（不重复录）
   * 新达人 → 直接入库并进组
   */

  function importRoster() {
    if (!previewResults.length) {
      App.showToast('请先点击「校验并预览」');
      return;
    }
    var skuSel = document.getElementById('roster-sku');
    var dateEl = document.getElementById('roster-send-date');
    var targetSku = skuSel ? skuSel.value : '';
    var sendDate = dateEl ? dateEl.value : '';

    if (!targetSku) {
      App.showToast('请先选择目标 SKU');
      return;
    }

    // 只导入允许通过的：ok（含新达人）；cooperated / skuLimit 需手动放行后才导入
    var allowed = previewResults.filter(function (r) { return r.status === 'ok'; });

    if (!allowed.length) {
      App.showToast('没有可导入的达人');
      return;
    }

    var roster = Store.getRoster();
    var newItems = [], added = 0, merged = 0;

    allowed.forEach(function (r) {
      var hit = roster.filter(function (x) { return x.handle === r.handle; })[0];
      if (hit) {
        // 已在名单库 → 追加分组
        var g = hit.groups || [];
        if (g.indexOf(targetSku) === -1) {
          Store.updateRosterItem(hit.id, { groups: g.concat([targetSku]) });
          merged++;
        }
      } else {
        newItems.push({
          handle: r.handle,
          raw: r.raw,
          groups: [targetSku],
          status: 'ok',
          reason: r.reason,
          feishu: r.creator,
        });
        added++;
      }
    });

    if (newItems.length) Store.addRosterItems(newItems);

    // 记录分组排期
    var existing = Store.getGroups().filter(function (g) { return g.sku === targetSku; })[0];
    Store.upsertGroup({
      sku: targetSku,
      name: (existing && existing.name) || (targetSku + ' 组'),
      scheduledDate: sendDate || (existing && existing.scheduledDate) || '',
      note: (existing && existing.note) || '',
    });

    previewResults = [];
    var ta = document.getElementById('roster-input');
    if (ta) ta.value = '';
    updateCount();
    renderAll();

    var msg = '已导入 ' + added + ' 位新达人' + (merged ? '，' + merged + ' 位已有达人加入该组' : '');
    App.showToast(msg);
  }

  /* ---------- 渲染摘要 ---------- */

  function renderSummary(sum) {
    var box = document.getElementById('roster-summary');
    if (!box) return;
    if (!sum) {
      var roster = Store.getRoster();
      var s = { total: roster.length, ok: 0, blacklist: 0, inefficient: 0, skuLimit: 0, cooperated: 0, invalid: 0 };
      roster.forEach(function (r) { s[r.status] = (s[r.status] || 0) + 1; });
      sum = s;
    }
    box.innerHTML = ''
      + statCard(sum.ok, '可发送', 'var(--c-success)')
      + statCard(sum.cooperated || 0, '已合作该款', 'var(--c-warning)')
      + statCard(sum.skuLimit || 0, '已达3款上限', 'var(--text-3)')
      + statCard((sum.blacklist || 0) + (sum.inefficient || 0), '拦截（黑名单/低效）', 'var(--c-danger)');
  }

  function statCard(value, label, color) {
    return ''
      + '<div class="stat-card">'
      +   '<div class="stat-card__value" style="color:' + color + ';">' + value + '</div>'
      +   '<div class="stat-card__label">' + label + '</div>'
      + '</div>';
  }

  /* ---------- 渲染表格 ---------- */

  function renderTable(rows, isPreview) {
    var tbody = document.getElementById('roster-tbody');
    if (!tbody) return;

    var skuFilterEl = document.getElementById('roster-filter-sku');
    var statusFilterEl = document.getElementById('roster-filter-status');
    var skuFilter = skuFilterEl ? skuFilterEl.value : '';
    var statusFilter = statusFilterEl ? statusFilterEl.value : '';

    var shown = rows.filter(function (r) {
      if (skuFilter && (r.groups || []).indexOf(skuFilter) === -1) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });

    var hint = document.getElementById('roster-shown');
    if (hint) hint.textContent = '显示 ' + shown.length + ' / ' + rows.length + ' 位';

    if (!shown.length) {
      tbody.innerHTML = ''
        + '<tr><td colspan="7">'
        +   '<div class="empty-state" style="padding:32px 16px;">'
        +     '<div class="empty-state__icon">(´･ω･`)</div>'
        +     '<div class="empty-state__text">'
        +       (isPreview ? '先在上方粘贴 handle 并点击「校验并预览」' : '名单库还是空的，先导入一批达人')
        +     '</div>'
        +   '</div>'
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = shown.map(function (r) {
      var c = r.creator;
      var profile = c
        ? [c.official, c.stars, (c.creatorType || []).join('·'), c.bodyType, c.age]
            .filter(function (x) { return x && String(x).trim(); })
            .join(' · ')
        : '—';
      var skuList = (r.cooperatedSkus && r.cooperatedSkus.length)
        ? r.cooperatedSkus.map(function (s) {
            return '<span class="sku-tag">' + App.escapeHtml(s) + '</span>';
          }).join(' ')
        : '<span style="color:var(--text-3);">—</span>';
      var groupList = (r.groups && r.groups.length)
        ? r.groups.map(function (g) {
            var sd = (r.sent || {})[g];
            return '<span class="tag"' + (sd ? ' style="opacity:.6;" title="已于 '
              + App.escapeHtml(sd) + ' 发送"' : '') + '>'
              + App.escapeHtml(g) + (sd ? ' ✓' : '') + '</span>';
          }).join(' ')
        : '<span style="color:var(--text-3);">未分组</span>';

      var actions = isPreview
        ? ((r.status === 'cooperated' || r.status === 'skuLimit')
            ? '<button class="link-btn" data-release="' + App.escapeHtml(r.handle) + '">放行</button>'
            : '<span style="color:var(--text-3);">—</span>')
        : '<button class="link-btn" data-del="' + App.escapeHtml(r.id) + '" '
            + 'style="color:var(--c-danger);">删除</button>';

      return ''
        + '<tr>'
        +   '<td><span style="font-weight:600;color:var(--text-1);">'
        +     App.escapeHtml(r.raw || r.handle) + '</span>'
        +     (c ? '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">'
        +       '寄样 ' + (c.sampleCount || 0) + ' 次 · 视频 ' + (c.videoCount || 0) + ' 条</div>' : '')
        +   '</td>'
        +   '<td>' + statusBadge(r.status)
        +     (r.reason ? '<div style="font-size:11px;color:var(--text-3);margin-top:4px;'
        +       'max-width:190px;">' + App.escapeHtml(r.reason) + '</div>' : '')
        +   '</td>'
        +   '<td><span style="font-size:12px;color:var(--text-2);">'
        +     App.escapeHtml(profile) + '</span></td>'
        +   '<td>' + skuList + '</td>'
        +   '<td>' + groupList + '</td>'
        +   '<td><span style="font-size:12px;color:var(--text-2);">'
        +     App.escapeHtml(r.sampleTime || '—') + '</span></td>'
        +   '<td style="text-align:center;">' + actions + '</td>'
        + '</tr>';
    }).join('');

    bindTableActions(isPreview);
  }

  function bindTableActions(isPreview) {
    var tbody = document.getElementById('roster-tbody');
    if (!tbody) return;

    if (isPreview) {
      tbody.querySelectorAll('[data-release]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var h = btn.getAttribute('data-release');
          previewResults.forEach(function (r) {
            if (r.handle === h) {
              r.status = 'ok';
              r.reason = '已手动放行';
            }
          });
          renderSummary(Matcher.summarize(previewResults));
          renderTable(previewResults, true);
          App.showToast('已放行，可导入');
        });
      });
      return;
    }

    tbody.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-del');
        if (Store.deleteRosterItem(id)) {
          renderAll();
          App.showToast('已从名单中移除');
        }
      });
    });
  }

  /* ---------- 复制格式 ---------- */

  function formatHandles(handles) {
    var list = (handles || []).filter(Boolean);
    if (copyFormat === 'comma') return list.join(',');
    if (copyFormat === 'at') return list.map(function (h) { return '@' + h; }).join('\n');
    return list.join('\n');
  }

  function copyHandles(handles, label) {
    if (!handles || !handles.length) { App.showToast('没有可复制的 handle'); return; }
    App.copyToClipboard(formatHandles(handles), label);
  }

  function syncFormatButtons() {
    var box = document.getElementById('copy-format-group');
    if (!box) return;
    box.querySelectorAll('[data-format]').forEach(function (btn) {
      var on = btn.getAttribute('data-format') === copyFormat;
      btn.className = 'btn btn--sm ' + (on ? 'btn--secondary' : 'btn--ghost');
    });
  }

  /* ---------- 按 SKU 分组（主视图） ---------- */

  /* 组内成员按「可发送 / 已发送 / 需复核」三分
   * 已发送：item.sent[sku] 有值（记录发送日期）
   * 需复核：针对该 SKU 重新判定后不再通过（飞书数据更新导致）
   */
  function groupMembers(roster, sku) {
    var ok = [], sent = [], review = [];
    roster.forEach(function (r) {
      if ((r.groups || []).indexOf(sku) === -1) return;
      // 针对这个 SKU 单独再判一次（可能飞书数据更新后失效）
      var res = Matcher.check(r.raw, sku);
      if (res.status !== 'ok') { review.push({ item: r, res: res }); return; }
      var d = (r.sent || {})[sku];
      if (d) sent.push({ item: r, date: d });
      else ok.push(r);
    });
    return { ok: ok, sent: sent, review: review };
  }

  function renderGroups() {
    var box = document.getElementById('roster-groups');
    if (!box) return;

    var groups = Store.getGroups();
    var roster = Store.getRoster();

    if (!groups.length) {
      box.innerHTML = '<div class="card card--padding-lg">'
        + '<div class="empty-state" style="padding:16px;">'
        +   '<div class="empty-state__icon">🎀</div>'
        +   '<div class="empty-state__text">还没有分组。在上面选一个 SKU，粘一批 handle 导入，就会自动建组</div>'
        + '</div></div>';
      return;
    }

    // 按 SKU 定位排序（爆品 → 销售 → 测品 → 撤退）
    var order = (Data && Data.getAvailableSKUs) ? Data.getAvailableSKUs() : [];
    groups = groups.slice().sort(function (a, b) {
      var ia = order.indexOf(a.sku), ib = order.indexOf(b.sku);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));'
      + 'gap:12px;padding:2px 0;">'
      + groups.map(function (g) {
          var m = groupMembers(roster, g.sku);
          var chips = m.ok.map(function (r) {
            return ''
              + '<span style="display:inline-flex;align-items:center;gap:2px;padding:3px 4px 3px 9px;'
              +   'border-radius:999px;background:var(--c-success-bg);border:1px solid var(--border-1);'
              +   'max-width:100%;">'
              +   '<button class="link-btn" data-copy="' + App.escapeHtml(r.handle) + '" '
              +     'style="font-size:12px;color:var(--text-1);font-weight:500;" '
              +     'title="点击复制这个 handle">'
              +     App.escapeHtml(r.raw || r.handle) + '</button>'
              +   '<button data-mark="' + App.escapeHtml(r.id) + '" data-sku="'
              +     App.escapeHtml(g.sku) + '" title="标记已发送" '
              +     'style="border:0;background:transparent;color:var(--c-success);cursor:pointer;'
              +     'font-size:13px;line-height:1;padding:0 3px;">✓</button>'
              +   '<button data-remove="' + App.escapeHtml(r.id) + '" data-sku="'
              +     App.escapeHtml(g.sku) + '" title="移出该组" '
              +     'style="border:0;background:transparent;color:var(--text-3);cursor:pointer;'
              +     'font-size:14px;line-height:1;padding:0 3px;">×</button>'
              + '</span>';
          }).join('');

          var sentChips = m.sent.map(function (x) {
            return ''
              + '<span title="已于 ' + App.escapeHtml(x.date) + ' 发送" '
              +   'style="display:inline-flex;align-items:center;gap:2px;padding:3px 4px 3px 9px;'
              +   'border-radius:999px;background:var(--bg-hover);border:1px solid var(--border-1);'
              +   'opacity:.72;max-width:100%;">'
              +   '<span style="font-size:12px;color:var(--text-3);text-decoration:line-through;">'
              +     App.escapeHtml(x.item.raw || x.item.handle) + '</span>'
              +   '<button data-unmark="' + App.escapeHtml(x.item.id) + '" data-sku="'
              +     App.escapeHtml(g.sku) + '" title="取消已发送标记" '
              +     'style="border:0;background:transparent;color:var(--text-3);cursor:pointer;'
              +     'font-size:13px;line-height:1;padding:0 3px;">↩</button>'
              + '</span>';
          }).join('');

          var reviewHtml = m.review.length
            ? '<div style="margin-top:10px;padding-top:9px;border-top:1px dashed var(--border-1);">'
              + '<div style="font-size:11px;color:var(--c-warning);margin-bottom:6px;">'
              +   '需复核 ' + m.review.length + ' 位（飞书数据更新后已不符合条件）</div>'
              + '<div style="display:flex;flex-wrap:wrap;gap:5px;">'
              + m.review.map(function (x) {
                  return '<span title="' + App.escapeHtml(x.res.reason) + '" '
                    + 'style="display:inline-flex;align-items:center;gap:4px;padding:3px 4px 3px 9px;'
                    + 'border-radius:999px;background:var(--bg-hover);border:1px solid var(--border-1);'
                    + 'opacity:.75;">'
                    + '<span style="font-size:12px;color:var(--text-2);text-decoration:line-through;">'
                    +   App.escapeHtml(x.item.raw || x.item.handle) + '</span>'
                    + '<button data-remove="' + App.escapeHtml(x.item.id) + '" data-sku="'
                    +   App.escapeHtml(g.sku) + '" title="移出该组" '
                    +   'style="border:0;background:transparent;color:var(--text-3);cursor:pointer;'
                    +   'font-size:14px;line-height:1;padding:0 4px;">×</button>'
                    + '</span>';
                }).join('')
              + '</div></div>'
            : '';

          return ''
            + '<div style="border:1px solid var(--border-1);border-radius:var(--r-lg);'
            +   'padding:13px 15px;background:var(--bg-pink-soft);">'
            +   '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">'
            +     '<div>'
            +       '<div style="font-size:16px;font-weight:700;color:var(--pink-600);">'
            +         App.escapeHtml(g.sku) + '</div>'
            +       '<div style="font-size:12px;color:var(--text-2);margin-top:3px;">'
            +         '待发 <strong style="color:var(--c-success);">' + m.ok.length + '</strong> 位'
            +         (m.sent.length ? ' · 已发 <strong style="color:var(--text-3);">'
            +           m.sent.length + '</strong> 位' : '')
            +         (m.review.length ? ' · 需复核 <strong style="color:var(--c-warning);">'
            +           m.review.length + '</strong> 位' : '')
            +       '</div>'
            +     '<input type="date" class="input" data-date-sku="' + App.escapeHtml(g.sku) + '" '
            +       'value="' + App.escapeHtml(g.scheduledDate || '') + '" '
            +       'title="计划发送日" style="width:132px;padding:4px 8px;font-size:12px;">'
            +   '</div>'
            +   '<div style="display:flex;gap:6px;margin:10px 0 6px;flex-wrap:wrap;">'
            +     '<button class="btn btn--primary btn--sm" data-copy-sku="' + App.escapeHtml(g.sku) + '"'
            +       (m.ok.length ? '' : ' disabled style="opacity:.5;cursor:not-allowed;"') + '>'
            +       (m.ok.length ? '复制待发 ' + m.ok.length + ' 个' : '全部已发送') + '</button>'
            +     '<button class="btn btn--secondary btn--sm" data-mark-sku="' + App.escapeHtml(g.sku) + '"'
            +       (m.ok.length ? '' : ' disabled style="opacity:.5;cursor:not-allowed;"') + '>'
            +       '✓ 标记已发</button>'
            +     (m.sent.length
                  ? '<button class="btn btn--ghost btn--sm" data-reset-sku="' + App.escapeHtml(g.sku) + '">'
                    + '↩ 重置 ' + m.sent.length + ' 条</button>'
                  : '')
            +   '</div>'
            +   '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">'
            +     '<button class="btn btn--ghost btn--sm" data-add-sku="' + App.escapeHtml(g.sku) + '">'
            +       '＋ 加达人</button>'
            +     '<button class="btn btn--ghost btn--sm" data-del-sku="' + App.escapeHtml(g.sku) + '" '
            +       'style="color:var(--c-danger);">删组</button>'
            +   '</div>'
            +   (m.ok.length
                ? '<div style="display:flex;flex-wrap:wrap;gap:5px;">' + chips + '</div>'
                : '<div style="font-size:12px;color:var(--text-3);padding:6px 0;">'
                  + (m.sent.length ? '这一组已经全部发过了 🎀'
                    : '这组还没有可发送的达人，点「＋ 加达人」从名单库里挑') + '</div>')
            +   (m.sent.length
                ? '<div style="margin-top:9px;padding-top:8px;border-top:1px dashed var(--border-1);">'
                  + '<div style="font-size:11px;color:var(--text-3);margin-bottom:5px;">'
                  +   '已发送 ' + m.sent.length + ' 位（不再进入复制）</div>'
                  + '<div style="display:flex;flex-wrap:wrap;gap:5px;">' + sentChips + '</div>'
                  + '</div>'
                : '')
            +   reviewHtml
            + '</div>';
        }).join('')
      + '</div>';
  }

  /* ---------- 分组区事件（事件委托，绑一次） ---------- */

  function bindGroupActions() {
    var box = document.getElementById('roster-groups');
    if (!box) return;

    box.addEventListener('click', function (e) {
      var t = (e.target && e.target.closest)
        ? e.target.closest('[data-copy-sku],[data-add-sku],[data-del-sku],[data-copy],[data-remove],'
          + '[data-mark-sku],[data-reset-sku],[data-mark],[data-unmark]')
        : null;
      if (!t) return;

      // 复制整组（只复制还没标记的）
      if (t.hasAttribute('data-copy-sku')) {
        var sku = t.getAttribute('data-copy-sku');
        var m = groupMembers(Store.getRoster(), sku);
        copyHandles(m.ok.map(function (r) { return r.handle; }),
          'SKU ' + sku + ' 的 ' + m.ok.length + ' 个 handle');
        return;
      }

      // 整组标记为已发送
      if (t.hasAttribute('data-mark-sku')) {
        var msku = t.getAttribute('data-mark-sku');
        var mv = groupMembers(Store.getRoster(), msku);
        if (!mv.ok.length) { App.showToast('没有待发送的达人'); return; }
        var today = Store.todayStr();
        mv.ok.forEach(function (r) { Store.markSent(r.id, msku, today); });
        renderAll();
        App.showToast('已标记 ' + mv.ok.length + ' 位：' + msku + ' 已发送');
        return;
      }

      // 重置整组的已发送标记
      if (t.hasAttribute('data-reset-sku')) {
        var rsku = t.getAttribute('data-reset-sku');
        var rv = groupMembers(Store.getRoster(), rsku);
        if (!rv.sent.length) { App.showToast('没有已发送记录'); return; }
        rv.sent.forEach(function (x) { Store.unmarkSent(x.item.id, rsku); });
        renderAll();
        App.showToast('已重置 ' + rv.sent.length + ' 位，回到待发列表');
        return;
      }

      // 单个标记已发送
      if (t.hasAttribute('data-mark')) {
        var mid = t.getAttribute('data-mark');
        var mi = Store.getRosterItem(mid);
        if (mi) {
          Store.markSent(mid, t.getAttribute('data-sku'), Store.todayStr());
          renderAll();
          App.showToast('已标记 ' + (mi.raw || mi.handle) + ' 为已发送');
        }
        return;
      }

      // 取消单个标记
      if (t.hasAttribute('data-unmark')) {
        var uid = t.getAttribute('data-unmark');
        var ui = Store.getRosterItem(uid);
        if (ui) {
          Store.unmarkSent(uid, t.getAttribute('data-sku'));
          renderAll();
          App.showToast('已取消标记，回到待发列表');
        }
        return;
      }

      // 复制单个
      if (t.hasAttribute('data-copy')) {
        var h = t.getAttribute('data-copy');
        App.copyToClipboard(formatHandles([h]), 'handle');
        return;
      }

      // 移出分组
      if (t.hasAttribute('data-remove')) {
        var id = t.getAttribute('data-remove');
        var gsku = t.getAttribute('data-sku');
        var item = Store.getRosterItem(id);
        if (item) {
          var left = (item.groups || []).filter(function (g) { return g !== gsku; });
          Store.updateRosterItem(id, { groups: left });
          renderAll();
          App.showToast('已移出 ' + gsku + ' 组');
        }
        return;
      }

      // 加达人
      if (t.hasAttribute('data-add-sku')) {
        openAddModal(t.getAttribute('data-add-sku'));
        return;
      }

      // 删组
      if (t.hasAttribute('data-del-sku')) {
        var dsku = t.getAttribute('data-del-sku');
        if (global.confirm('删除「' + dsku + '」这个分组？\n（只是删分组，达人还会留在名单库里）')) {
          Store.deleteGroup(dsku);
          renderAll();
          App.showToast('已删除分组 ' + dsku);
        }
        return;
      }
    });

    // 计划发送日改动即存
    box.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.hasAttribute || !t.hasAttribute('data-date-sku')) return;
      var sku = t.getAttribute('data-date-sku');
      var g = Store.getGroups().filter(function (x) { return x.sku === sku; })[0];
      Store.upsertGroup({
        sku: sku,
        name: (g && g.name) || (sku + ' 组'),
        scheduledDate: t.value,
        note: (g && g.note) || '',
      });
      App.showToast('已更新 ' + sku + ' 的计划发送日');
    });
  }

  /* ---------- 「加达人」弹窗 ---------- */

  function openAddModal(sku) {
    closeAddModal();
    modalState.sku = sku;

    var roster = Store.getRoster();
    var candidates = roster.filter(function (r) {
      return (r.groups || []).indexOf(sku) === -1;
    });

    var mask = document.createElement('div');
    mask.id = 'roster-add-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(60,45,50,.35);z-index:9999;'
      + 'display:flex;align-items:center;justify-content:center;padding:16px;';

    var listHtml = candidates.length
      ? candidates.map(function (r) {
          var c = r.feishu || {};
          var his = (c.skus && c.skus.length) ? c.skus.join('、') : '无';
          return ''
            + '<label style="display:flex;align-items:center;gap:8px;padding:7px 9px;'
            +   'border-radius:var(--r-md);cursor:pointer;">'
            +   '<input type="checkbox" class="roster-add-cb" value="' + App.escapeHtml(r.handle) + '">'
            +   '<span style="flex:1;min-width:0;">'
            +     '<span style="font-size:13px;font-weight:600;color:var(--text-1);">'
            +       App.escapeHtml(r.raw || r.handle) + '</span>'
            +     '<span style="display:block;font-size:11px;color:var(--text-3);margin-top:1px;">'
            +       '已合作 ' + his + ' · 寄样 ' + (c.sampleCount || 0) + ' 次</span>'
            +   '</span>'
            + '</label>';
        }).join('')
      : '<div style="padding:14px;font-size:13px;color:var(--text-3);text-align:center;">'
        + '名单库里的达人已经全部在这一组了</div>';

    mask.innerHTML = ''
      + '<div style="background:#fff;border-radius:var(--r-lg);width:100%;max-width:420px;'
      +   'max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">'
      +   '<div style="padding:14px 16px;border-bottom:1px solid var(--border-1);">'
      +     '<div style="font-size:15px;font-weight:700;color:var(--text-1);">'
      +       '加达人到 ' + App.escapeHtml(sku) + ' 组</div>'
      +     '<div style="font-size:11.5px;color:var(--text-3);margin-top:3px;">'
      +       '勾选后加入，同一达人可以同时进多个 SKU 组</div>'
      +   '</div>'
      +   '<div style="flex:1;overflow-y:auto;padding:8px;">' + listHtml + '</div>'
      +   '<div style="padding:11px 14px;border-top:1px solid var(--border-1);'
      +     'display:flex;gap:8px;justify-content:flex-end;">'
      +     '<button class="btn btn--ghost btn--sm" id="roster-add-cancel">取消</button>'
      +     '<button class="btn btn--primary btn--sm" id="roster-add-confirm">加入</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(mask);

    var cancel = document.getElementById('roster-add-cancel');
    var confirm = document.getElementById('roster-add-confirm');
    if (cancel) cancel.addEventListener('click', closeAddModal);
    if (confirm) confirm.addEventListener('click', function () {
      var picked = [].slice.call(mask.querySelectorAll('.roster-add-cb:checked'))
        .map(function (cb) { return cb.value; });
      if (!picked.length) { App.showToast('还没勾选达人'); return; }
      var n = 0;
      picked.forEach(function (h) {
        var item = Store.getRoster().filter(function (x) { return x.handle === h; })[0];
        if (item) {
          var g = item.groups || [];
          if (g.indexOf(sku) === -1) {
            Store.updateRosterItem(item.id, { groups: g.concat([sku]) });
            n++;
          }
        }
      });
      closeAddModal();
      renderAll();
      App.showToast('已加入 ' + n + ' 位达人');
    });

    mask.addEventListener('click', function (e) {
      if (e.target === mask) closeAddModal();
    });
  }

  function closeAddModal() {
    var m = document.getElementById('roster-add-mask');
    if (m) m.remove();
    modalState.sku = '';
  }

  /* ---------- 导出 ---------- */

  function exportRoster() {
    var roster = Store.getRoster();
    if (!roster.length) { App.showToast('名单库是空的'); return; }

    var head = ['handle', '判定', '分组', '已发送SKU', '历史合作SKU', '寄样次数', '视频数', '官方', '星级', '最近寄样'];
    var lines = [head.join(',')];

    roster.forEach(function (r) {
      var c = r.feishu || {};
      var label = (STATUS_STYLE[r.status] || STATUS_STYLE.ok).label;
      var sentKeys = r.sent ? Object.keys(r.sent) : [];
      var row = [
        r.handle,
        label,
        (r.groups || []).join('/'),
        sentKeys.join('/'),
        (c.skus || []).join('/'),
        c.sampleCount || 0,
        c.videoCount || 0,
        c.official || '',
        c.stars || '',
        c.lastSampleTime || '',
      ];
      lines.push(row.map(function (v) {
        var s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });

    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Dlooda_达人名单库_' + Store.todayStr() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    App.showToast('名单已导出');
  }

  /* ================================================================
     模块二：建联名单（老达人出单 / 爆单 / 竞品达人）
     渠道：TK 私信 / 邮件 / 官号 / 抖音私信 / WhatsApp
     ================================================================ */

  var TYPES = {
    old:        { label: '老达人出单', cls: 'badge--green' },
    hot:        { label: '爆单达人',   cls: 'badge--pink' },
    competitor: { label: '竞品达人',   cls: 'badge--blue' },
    other:      { label: '其他',       cls: 'badge--gray' },
  };
  var OB_STATUS = {
    pending:   { label: '待联系',    cls: 'badge--gray' },
    contacted: { label: '已联系',    cls: 'badge--sand' },
    replied:   { label: '已回复',    cls: 'badge--blue' },
    success:   { label: '成功',      cls: 'badge--green' },
    fail:      { label: '未成功',    cls: 'badge--red' },
    invalid:   { label: '无效/注销', cls: 'badge--gray' },
  };
  var CHANNELS = ['TK私信', '邮件', '官号', '抖音私信', 'WhatsApp', '其他'];

  var obState = { open: '', filterType: '', filterStatus: '', preview: [], drill: { id: '', tab: 'all', open: '' } };

  function typeLabel(t) { return (TYPES[t] || TYPES.other).label; }
  function typeBadge(t) {
    var d = TYPES[t] || TYPES.other;
    return '<span class="badge ' + d.cls + '">' + d.label + '</span>';
  }
  function statusBadge2(s) {
    var d = OB_STATUS[s] || OB_STATUS.pending;
    return '<span class="badge ' + d.cls + '">' + d.label + '</span>';
  }

  /* ---------- 解析粘贴的名单 ---------- */
  // 每行：handle、邮箱、SKU、等级L、备注（Tab / 逗号 / 多个空格分隔，顺序不限）
  function obParse(text) {
    var lines = String(text || '').split(/[\n\r]+/);
    var out = [];
    lines.forEach(function (line) {
      var raw = line.trim();
      if (!raw) return;
      var cells = raw.split(/[\t,，;；]+|\s{2,}/).map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
      if (!cells.length) return;
      var handle = '', email = '', sku = '', level = '', notes = [];
      cells.forEach(function (c) {
        if (!handle && /@/.test(c) && /\.[a-z]{2,}$/i.test(c) && /^[\w.+-]+@/.test(c)) { email = c; return; }
        if (!email && /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(c)) { email = c; return; }
        if (!sku && /^[0-9]{4,6}$/.test(c)) { sku = c; return; }
        if (!level && /^L?[0-6]$/i.test(c)) { level = c.toUpperCase(); return; }
        if (!handle) {
          var h = Matcher.normalize(c);
          if (h) { handle = h; return; }
        }
        notes.push(c);
      });
      if (!handle) return;
      out.push({
        handle: handle, raw: cells[0], email: email, sku: sku,
        level: level, note: notes.join(' '),
      });
    });
    return out;
  }

  function obUpdateCount() {
    var ta = document.getElementById('ob-input');
    var el = document.getElementById('ob-count');
    if (!ta || !el) return;
    var list = obParse(ta.value);
    el.textContent = '已识别 ' + list.length + ' 个达人'
      + (list.filter(function (x) { return x.email; }).length
          ? '，其中 ' + list.filter(function (x) { return x.email; }).length + ' 个带邮箱' : '');
  }

  function obCheck() {
    var ta = document.getElementById('ob-input');
    var box = document.getElementById('ob-preview');
    if (!ta || !box) return;
    var list = obParse(ta.value);
    if (!list.length) { box.innerHTML = '<div style="font-size:13px;color:var(--text-3);padding:8px 0;">没识别到达人，检查一下格式</div>'; return; }
    obState.preview = list;
    box.innerHTML = ''
      + '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:6px;">'
      +   '共解析 <strong>' + list.length + '</strong> 条，确认后将加入所选批次</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:5px;">'
      +   list.slice(0, 40).map(function (x) {
            return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;'
              + 'border-radius:999px;background:var(--bg-pink-soft);border:1px solid var(--border-1);font-size:12px;">'
              + App.escapeHtml(x.raw || x.handle)
              + (x.email ? ' <span style="color:var(--text-3);font-size:10.5px;">✉</span>' : '')
              + '</span>';
          }).join('')
      + (list.length > 40 ? '<span style="font-size:12px;color:var(--text-3);align-self:center;">…等 ' + list.length + ' 个</span>' : '')
      + '</div>';
  }

  function obImport() {
    var sel = document.getElementById('ob-batch');
    var ta = document.getElementById('ob-input');
    if (!sel || !ta) return;
    var batchId = sel.value;
    if (!batchId) { App.showToast('先选一个批次（没有就先新建）'); return; }
    var list = obParse(ta.value);
    if (!list.length) { App.showToast('没识别到达人'); return; }
    var b = Store.getBatch(batchId);
    var n = Store.addMembers(batchId, list.map(function (x) {
      return {
        handle: x.handle, raw: x.raw, email: x.email,
        sku: x.sku || (b && b.sku) || '', level: x.level, note: x.note,
        type: (b && b.type) || 'other', status: 'pending', touches: [],
      };
    }));
    ta.value = '';
    obState.preview = [];
    var box = document.getElementById('ob-preview');
    if (box) box.innerHTML = '';
    obUpdateCount();
    App.showToast('已导入 ' + n + ' 位' + (list.length - n ? '（' + (list.length - n) + ' 位已在批次中）' : ''));
    renderObAll();
  }

  function obAddBatch() {
    var date = (document.getElementById('ob-date') || {}).value || Store.todayStr();
    var type = (document.getElementById('ob-type') || {}).value || 'other';
    var source = ((document.getElementById('ob-source') || {}).value || '').trim();
    var sku = (document.getElementById('ob-sku') || {}).value || '';
    var note = ((document.getElementById('ob-note') || {}).value || '').trim();
    var b = Store.addBatch({ date: date, type: type, source: source, sku: sku, note: note });
    var noteEl = document.getElementById('ob-note');
    var srcEl = document.getElementById('ob-source');
    if (noteEl) noteEl.value = '';
    if (srcEl) srcEl.value = '';
    obState.open = b.id;
    App.showToast('批次已创建');
    renderObAll();
  }

  /* ---------- 统计 ---------- */
  function obStats() {
    var ms = Store.getMembers();
    var byType = {};
    var st = { pending: 0, contacted: 0, replied: 0, success: 0, fail: 0, invalid: 0 };
    var withEmail = 0;
    ms.forEach(function (m) {
      byType[m.type || 'other'] = (byType[m.type || 'other'] || 0) + 1;
      st[m.status || 'pending'] = (st[m.status || 'pending'] || 0) + 1;
      if (m.email) withEmail++;
    });
    var done = st.success + st.fail + st.invalid;
    var rate = done ? Math.round(st.success / done * 100) : 0;
    var touched = ms.length - st.pending;
    return { total: ms.length, byType: byType, st: st, withEmail: withEmail, rate: rate, touched: touched };
  }

  function renderObStats() {
    var box = document.getElementById('ob-stats');
    if (!box) return;
    var s = obStats();
    box.innerHTML = ''
      + statCard(s.total, '建联达人总数', 'var(--text-1)')
      + statCard(s.touched, '已联系', 'var(--c-info)')
      + statCard(s.st.success, '成功', 'var(--c-success)')
      + statCard(s.rate + '%', '成功率', 'var(--pink-600)')
      + statCard(s.withEmail, '有邮箱', 'var(--c-warning)');
  }

  /* ---------- 建联分组卡片（图片 + 下钻） ---------- */
  function obBatchName(b) {
    return b.source || (b.note ? String(b.note).slice(0, 14) : typeLabel(b.type) + ' ' + (b.date || ''));
  }

  function renderObBatches() {
    var box = document.getElementById('ob-batches');
    if (!box) return;
    var batches = Store.getBatches();
    if (obState.filterType) batches = batches.filter(function (b) { return b.type === obState.filterType; });
    if (!batches.length) {
      box.innerHTML = '<div class="card card--padding-lg" style="text-align:center;color:var(--text-3);font-size:13px;">'
        + '还没有分组，先在上面「＋ 新建批次」，再把名单导进来</div>';
      return;
    }
    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">'
      + batches.map(obCardHtml).join('') + '</div>';
  }

  function obCardHtml(b) {
    var all = Store.getMembers(b.id);
    var touched = all.filter(function (m) { return (m.status || 'pending') !== 'pending'; }).length;
    var pending = all.length - touched;
    var img = b.img
      ? '<img src="' + App.escapeHtml(b.img) + '" alt="" style="width:100%;height:110px;object-fit:cover;display:block;">'
      : '<div style="width:100%;height:110px;display:flex;align-items:center;justify-content:center;background:var(--bg-pink-soft);color:var(--pink-600);font-size:26px;font-weight:700;">' + App.escapeHtml(obBatchName(b).slice(0, 2)) + '</div>';
    return ''
      + '<div class="ob-card" data-ob-open="' + App.escapeHtml(b.id) + '" style="border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;background:var(--bg-surface);">'
      + img
      + '<div style="padding:8px 10px;">'
      + '<div style="font-size:13px;font-weight:700;color:var(--text-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + App.escapeHtml(obBatchName(b)) + '</div>'
      + '<div style="font-size:11px;color:var(--text-3);margin-top:2px;">' + typeLabel(b.type) + (b.sku ? ' · SKU ' + App.escapeHtml(b.sku) : '') + '</div>'
      + '<div style="font-size:11.5px;color:var(--text-2);margin-top:4px;">共 ' + all.length + ' · 已建联 ' + touched + ' · 未建联 ' + pending + '</div>'
      + '</div>'
      + '<div style="display:flex;border-top:1px solid var(--border-1);">'
      + '<button class="link-btn" data-ob-edit-b="' + App.escapeHtml(b.id) + '" style="flex:1;padding:6px 0;text-align:center;font-size:11.5px;border-right:1px solid var(--border-1);">编辑</button>'
      + '<button class="link-btn" data-ob-del-batch="' + App.escapeHtml(b.id) + '" style="flex:1;padding:6px 0;text-align:center;font-size:11.5px;color:var(--c-danger);">删除</button>'
      + '</div></div>';
  }

  /* ---------- 分组下钻弹窗：已建联 / 未建联 → 达人 + 记录 ---------- */
  function obDrillRow(m) {
    var open = obState.drill.open === m.id;
    var recs = (m.touches || []).map(function (t, i) {
      return '<div style="padding:6px 0;border-bottom:1px dashed var(--border-1);font-size:12px;">'
        + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
        + '<span class="badge" style="font-size:10.5px;">' + App.escapeHtml(t.date || '') + '</span>'
        + '<span class="badge badge--blue" style="font-size:10.5px;">' + App.escapeHtml(t.channel || '') + '</span>'
        + (t.result ? '<span style="color:var(--text-2);">' + App.escapeHtml(t.result) + '</span>' : '')
        + '<button class="link-btn" data-ob-rec-del="' + App.escapeHtml(m.id) + '" data-idx="' + i + '" style="margin-left:auto;color:var(--c-danger);font-size:11px;">删除记录</button>'
        + '</div>'
        + (t.script ? '<div style="color:var(--text-3);white-space:pre-wrap;margin-top:3px;">' + App.escapeHtml(t.script) + '</div>' : '')
        + '</div>';
    }).join('') || '<div style="font-size:12px;color:var(--text-3);padding:4px 0;">还没有联系记录</div>';
    var idAttr = App.escapeHtml(m.id);
    var form = ''
      + '<div style="margin-top:8px;border-top:1px solid var(--border-1);padding-top:8px;">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">'
      + '<input type="date" class="input" id="ob-rec-date-' + idAttr + '" value="' + Store.todayStr() + '" style="width:132px;padding:4px 6px;font-size:12px;">'
      + '<select class="select" id="ob-rec-ch-' + idAttr + '" style="width:112px;padding:4px 6px;font-size:12px;">'
      +   CHANNELS.map(function (c) { return '<option>' + App.escapeHtml(c) + '</option>'; }).join('')
      + '</select>'
      + '<input type="text" class="input" id="ob-rec-result-' + idAttr + '" placeholder="结果（如已发送 / 已回复 / 拒绝）" style="flex:1;min-width:150px;padding:4px 6px;font-size:12px;">'
      + '</div>'
      + '<textarea class="textarea" id="ob-rec-script-' + idAttr + '" rows="2" placeholder="话术（粘贴这次用的邀约话术）" style="font-size:12px;"></textarea>'
      + '<button class="btn btn--primary btn--sm" data-ob-rec-save="' + idAttr + '" style="margin-top:6px;">保存这条记录</button>'
      + '</div>';
    return ''
      + '<div style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;">'
      + '<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;flex-wrap:wrap;">'
      + '<button class="link-btn" data-ob-copy-one="' + App.escapeHtml(m.handle) + '" style="font-weight:600;font-size:13px;">' + App.escapeHtml(m.raw || m.handle) + '</button>'
      + (m.email
        ? '<button class="link-btn" data-ob-copy-mail="' + App.escapeHtml(m.email) + '" style="font-size:11.5px;">✉ ' + App.escapeHtml(m.email) + '</button>'
        : '<span style="font-size:11.5px;color:var(--text-3);">✉ 无</span>')
      + statusBadge2(m.status || 'pending')
      + '<div style="margin-left:auto;display:flex;gap:6px;">'
      + '<select class="select" data-ob-status="' + idAttr + '" style="min-width:92px;padding:3px 6px;font-size:11.5px;">'
      +   Object.keys(OB_STATUS).map(function (k) {
          return '<option value="' + k + '"' + ((m.status || 'pending') === k ? ' selected' : '') + '>' + OB_STATUS[k].label + '</option>';
        }).join('')
      + '</select>'
      + '<button class="btn btn--ghost btn--sm" data-ob-toggle-m="' + idAttr + '" style="padding:2px 8px;font-size:11px;">记录(' + ((m.touches || []).length) + ')</button>'
      + '<button class="btn btn--ghost btn--sm" data-ob-del="' + idAttr + '" style="padding:2px 8px;font-size:11px;color:var(--c-danger);">×</button>'
      + '</div></div>'
      + (open ? '<div style="padding:0 10px 10px;">' + recs + form + '</div>' : '')
      + '</div>';
  }

  function openObDrill(batchId, keepState) {
    var b = Store.getBatch(batchId);
    if (!b) return;
    if (!keepState) obState.drill = { id: batchId, tab: 'all', open: '', add: '' };
    var d = obState.drill;
    var all = Store.getMembers(batchId);
    var touched = all.filter(function (m) { return (m.status || 'pending') !== 'pending'; });
    var pending = all.filter(function (m) { return (m.status || 'pending') === 'pending'; });
    var list = d.tab === 'touched' ? touched : (d.tab === 'pending' ? pending : all);

    var tabBtn = function (key, label, n) {
      var on = d.tab === key;
      return '<button class="btn btn--sm ' + (on ? 'btn--primary' : 'btn--ghost') + '" data-ob-tab="' + key + '">'
        + label + ' ' + n + '</button>';
    };
    var rows = list.map(obDrillRow).join('')
      || '<div style="font-size:12.5px;color:var(--text-3);padding:10px 0;">这一类还没有达人</div>';
    var addBox = ''
      + '<div style="margin-top:12px;border-top:1px solid var(--border-1);padding-top:10px;">'
      + '<textarea class="textarea" id="ob-drill-input" rows="2" placeholder="追加达人到这个分组（每行一个，或 handle,邮箱）" style="font-size:12px;"></textarea>'
      + '<button class="btn btn--secondary btn--sm" data-ob-drill-add="' + App.escapeHtml(batchId) + '" style="margin-top:6px;">追加达人</button>'
      + '</div>';

    var old = document.getElementById('ob-drill-mask');
    if (old) old.remove();
    var mask = document.createElement('div');
    mask.id = 'ob-drill-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(92,74,74,.34);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    mask.innerHTML = ''
      + '<div style="background:var(--bg-surface);border-radius:var(--r-xl);max-width:640px;width:100%;padding:20px;box-shadow:0 12px 40px rgba(120,90,100,.22);max-height:86vh;display:flex;flex-direction:column;">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
      + (b.img ? '<img src="' + App.escapeHtml(b.img) + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">' : '')
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:15px;font-weight:700;color:var(--text-1);">' + App.escapeHtml(obBatchName(b)) + '</div>'
      + '<div style="font-size:11.5px;color:var(--text-3);">' + typeLabel(b.type) + (b.sku ? ' · SKU ' + App.escapeHtml(b.sku) : '') + (b.date ? ' · ' + App.escapeHtml(b.date) : '') + '</div>'
      + '</div>'
      + '<button class="btn btn--ghost btn--sm" data-ob-copy-h="' + App.escapeHtml(b.id) + '">复制handle</button>'
      + '<button class="btn btn--ghost btn--sm" data-ob-export="' + App.escapeHtml(b.id) + '">导出</button>'
      + '<button id="ob-drill-close" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--text-3);">&times;</button>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">'
      + tabBtn('all', '全部', all.length)
      + tabBtn('touched', '已建联', touched.length)
      + tabBtn('pending', '未建联', pending.length)
      + '</div>'
      + '<div style="overflow-y:auto;flex:1;min-height:0;">' + rows + addBox + '</div>'
      + '</div>';
    document.body.appendChild(mask);

    mask.querySelector('#ob-drill-close').addEventListener('click', function () { mask.remove(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
  }

  /* ---------- 分组编辑弹窗（含图片） ---------- */
  function openObEdit(batchId) {
    var b = Store.getBatch(batchId);
    if (!b) return;
    var old = document.getElementById('ob-edit-mask');
    if (old) old.remove();
    var mask = document.createElement('div');
    mask.id = 'ob-edit-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(92,74,74,.34);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    mask.innerHTML = ''
      + '<div style="background:var(--bg-surface);border-radius:var(--r-xl);max-width:440px;width:100%;padding:22px;box-shadow:0 12px 40px rgba(120,90,100,.22);max-height:86vh;overflow-y:auto;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
      + '<h3 style="margin:0;font-size:16px;font-weight:600;color:var(--text-1);">编辑分组</h3>'
      + '<button id="ob-edit-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:var(--text-3);">&times;</button>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">分组名称（竞品店铺 / 来源）</label>'
      + '<input type="text" class="input" id="ob-edit-source" value="' + App.escapeHtml(b.source || '') + '" style="width:100%;"></div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label class="form-label">类型</label>'
      + '<select class="select" id="ob-edit-type" style="width:100%;">'
      + Object.keys(TYPES).map(function (k) {
          return '<option value="' + k + '"' + ((b.type || 'other') === k ? ' selected' : '') + '>' + TYPES[k].label + '</option>';
        }).join('')
      + '</select></div>'
      + '<div class="form-group"><label class="form-label">日期</label>'
      + '<input type="date" class="input" id="ob-edit-date" value="' + App.escapeHtml(b.date || '') + '" style="width:100%;"></div>'
      + '</div>'
      + '<div class="form-group"><label class="form-label">目标 SKU</label>'
      + '<input type="text" class="input" id="ob-edit-sku" value="' + App.escapeHtml(b.sku || '') + '" style="width:100%;"></div>'
      + '<div class="form-group"><label class="form-label">说明</label>'
      + '<input type="text" class="input" id="ob-edit-note" value="' + App.escapeHtml(b.note || '') + '" style="width:100%;"></div>'
      + '<div class="form-group"><label class="form-label">分组图片</label>'
      + '<div style="display:flex;align-items:center;gap:10px;">'
      + '<img id="ob-edit-img-preview" src="' + App.escapeHtml(b.img || '') + '" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px;' + (b.img ? '' : 'display:none;') + '">'
      + '<input type="file" id="ob-edit-img" accept="image/*" style="font-size:12px;">'
      + '</div></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;">'
      + '<button class="btn btn--ghost btn--sm" id="ob-edit-cancel" style="flex:1;justify-content:center;">取消</button>'
      + '<button class="btn btn--primary btn--sm" id="ob-edit-save" style="flex:2;justify-content:center;">保存</button>'
      + '</div></div>';
    document.body.appendChild(mask);
    var newImg = b.img || '';

    var close = function () { mask.remove(); };
    mask.querySelector('#ob-edit-close').addEventListener('click', close);
    mask.querySelector('#ob-edit-cancel').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    mask.querySelector('#ob-edit-img').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      desFileToDataURL(f, function (dataUrl) {
        newImg = dataUrl;
        var pv = mask.querySelector('#ob-edit-img-preview');
        pv.src = dataUrl;
        pv.style.display = '';
      });
    });
    mask.querySelector('#ob-edit-save').addEventListener('click', function () {
      Store.updateBatch(batchId, {
        source: mask.querySelector('#ob-edit-source').value.trim(),
        type: mask.querySelector('#ob-edit-type').value,
        date: mask.querySelector('#ob-edit-date').value,
        sku: mask.querySelector('#ob-edit-sku').value.trim(),
        note: mask.querySelector('#ob-edit-note').value.trim(),
        img: newImg,
      });
      close();
      renderObAll();
      App.showToast('分组已保存');
    });
  }

  function obMembersHtml(batchId, ms) {
    if (!ms.length) {
      return '<div style="font-size:12.5px;color:var(--text-3);padding:8px 0;">'
        + '这个批次还没有达人，在上面粘贴名单导入</div>';
    }
    var rows = ms.map(function (m) {
      var last = (m.touches && m.touches.length) ? m.touches[m.touches.length - 1] : null;
      return ''
        + '<tr>'
        +   '<td style="text-align:left;">'
        +     '<button class="link-btn" data-ob-copy-one="' + App.escapeHtml(m.handle) + '" '
        +       'title="点击复制 handle" style="font-weight:600;">' + App.escapeHtml(m.raw || m.handle) + '</button>'
        +     (m.note ? '<div style="font-size:11px;color:var(--text-3);">' + App.escapeHtml(m.note) + '</div>' : '')
        +   '</td>'
        +   '<td style="text-align:left;">'
        +     (m.email
        ? '<button class="link-btn" data-ob-copy-mail="' + App.escapeHtml(m.email) + '" style="font-size:12px;">' + App.escapeHtml(m.email) + '</button>'
        : '<span style="color:var(--text-3);font-size:12px;">—</span>')
        +   '</td>'
        +   '<td style="text-align:left;">' + App.escapeHtml(m.sku || '') + '</td>'
        +   '<td style="text-align:left;">' + App.escapeHtml(m.level || '') + '</td>'
        +   '<td style="text-align:left;">'
        +     '<select class="select" data-ob-status="' + App.escapeHtml(m.id) + '" style="min-width:96px;padding:3px 6px;font-size:12px;">'
        +       Object.keys(OB_STATUS).map(function (k) {
          return '<option value="' + k + '"' + ((m.status || 'pending') === k ? ' selected' : '') + '>'
            + OB_STATUS[k].label + '</option>';
        }).join('')
        +     '</select>'
        +   '</td>'
        +   '<td style="text-align:left;font-size:12px;color:var(--text-2);">'
        +     (last ? App.escapeHtml(last.date + ' · ' + last.channel) : '<span style="color:var(--text-3);">未跟进</span>')
        +     (m.touches && m.touches.length > 1 ? ' <span style="color:var(--text-3);">×' + m.touches.length + '</span>' : '')
        +   '</td>'
        +   '<td style="text-align:right;white-space:nowrap;">'
        +     '<button class="btn btn--ghost btn--sm" data-ob-touch="' + App.escapeHtml(m.id) + '" data-ch="TK私信" style="padding:2px 6px;font-size:11px;">TK</button> '
        +     '<button class="btn btn--ghost btn--sm" data-ob-touch="' + App.escapeHtml(m.id) + '" data-ch="邮件" style="padding:2px 6px;font-size:11px;">邮</button> '
        +     '<button class="btn btn--ghost btn--sm" data-ob-touch="' + App.escapeHtml(m.id) + '" data-ch="官号" style="padding:2px 6px;font-size:11px;">官</button> '
        +     '<button class="btn btn--ghost btn--sm" data-ob-del="' + App.escapeHtml(m.id) + '" '
        +       'style="padding:2px 6px;font-size:11px;color:var(--c-danger);">×</button>'
        +   '</td>'
        + '</tr>';
    }).join('');
    return ''
      + '<div style="overflow-x:auto;border-top:1px solid var(--border-1);padding-top:8px;">'
      +   '<table class="data-table">'
      +     '<thead><tr>'
      +       '<th style="text-align:left;">达人</th>'
      +       '<th style="text-align:left;">邮箱</th>'
      +       '<th style="text-align:left;">SKU</th>'
      +       '<th style="text-align:left;">等级</th>'
      +       '<th style="text-align:left;">状态</th>'
      +       '<th style="text-align:left;">最近跟进</th>'
      +       '<th style="text-align:right;">操作</th>'
      +     '</tr></thead>'
      +     '<tbody>' + rows + '</tbody>'
      +   '</table>'
      + '</div>';
  }

  function renderObAll() {
    renderObStats();
    renderObBatches();
    var sel = document.getElementById('ob-batch');
    if (sel) {
      var cur = sel.value;
      sel.innerHTML = Store.getBatches().map(function (b) {
        return '<option value="' + App.escapeHtml(b.id) + '">'
          + App.escapeHtml(b.date + ' · ' + typeLabel(b.type) + (b.note ? ' · ' + b.note : '')) + '</option>';
      }).join('') || '<option value="">（请先新建批次）</option>';
      if (cur) sel.value = cur;
    }
  }

  function obExport(batchId) {
    var b = Store.getBatch(batchId);
    if (!b) return;
    var ms = Store.getMembers(batchId);
    var head = ['handle', '邮箱', 'SKU', '等级', '类型', '状态', '未成功原因', '跟进次数', '最近跟进', '备注'];
    var lines = [head.join(',')];
    ms.forEach(function (m) {
      var last = (m.touches && m.touches.length) ? m.touches[m.touches.length - 1] : null;
      lines.push([
        m.handle, m.email || '', m.sku || '', m.level || '', typeLabel(m.type),
        (OB_STATUS[m.status || 'pending'] || {}).label || '', m.failReason || '',
        (m.touches || []).length, last ? (last.date + ' ' + last.channel) : '', m.note || '',
      ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '建联名单_' + b.date + '_' + typeLabel(b.type) + '.csv';
    a.click();
    App.showToast('已导出 ' + ms.length + ' 条');
  }

  /* ---------- 事件绑定 ---------- */
  function bindObEvents() {
    var btnAdd = document.getElementById('btn-add-batch');
    if (btnAdd) btnAdd.addEventListener('click', obAddBatch);

    var ta = document.getElementById('ob-input');
    if (ta) ta.addEventListener('input', obUpdateCount);

    var btnCheck = document.getElementById('btn-check-ob');
    if (btnCheck) btnCheck.addEventListener('click', obCheck);

    var btnImport = document.getElementById('btn-import-ob');
    if (btnImport) btnImport.addEventListener('click', obImport);

    var btnClear = document.getElementById('btn-clear-ob');
    if (btnClear) btnClear.addEventListener('click', function () {
      if (ta) ta.value = '';
      var box = document.getElementById('ob-preview');
      if (box) box.innerHTML = '';
      obUpdateCount();
    });

    var ft = document.getElementById('ob-filter-type');
    if (ft) ft.addEventListener('change', function () {
      obState.filterType = ft.value;
      renderObBatches();
    });

    var fs = document.getElementById('ob-filter-status');
    if (fs) fs.addEventListener('change', function () {
      obState.filterStatus = fs.value;
      renderObBatches();
    });

    var box = document.getElementById('ob-batches');
    if (!box) return;

    // 弹窗（下钻 / 编辑）挂在 body 上，统一用 document 级事件代理
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ob-open],[data-ob-edit-b],[data-ob-del-batch],[data-ob-export],'
        + '[data-ob-copy-h],[data-ob-copy-e],[data-ob-copy-one],[data-ob-copy-mail],'
        + '[data-ob-touch],[data-ob-del],[data-ob-tab],[data-ob-toggle-m],'
        + '[data-ob-rec-del],[data-ob-rec-save],[data-ob-drill-add]');
      if (!t) return;

      if (t.hasAttribute('data-ob-open')) {
        openObDrill(t.getAttribute('data-ob-open'));
        return;
      }
      if (t.hasAttribute('data-ob-edit-b')) {
        openObEdit(t.getAttribute('data-ob-edit-b'));
        return;
      }
      if (t.hasAttribute('data-ob-tab')) {
        obState.drill.tab = t.getAttribute('data-ob-tab');
        obState.drill.open = '';
        openObDrill(obState.drill.id, true);
        return;
      }
      if (t.hasAttribute('data-ob-toggle-m')) {
        var midT = t.getAttribute('data-ob-toggle-m');
        obState.drill.open = (obState.drill.open === midT) ? '' : midT;
        openObDrill(obState.drill.id, true);
        return;
      }
      if (t.hasAttribute('data-ob-rec-del')) {
        var midD = t.getAttribute('data-ob-rec-del');
        var idx = parseInt(t.getAttribute('data-idx'), 10);
        if (confirm('删除这条联系记录？')) {
          Store.deleteMemberRecord(midD, idx);
          openObDrill(obState.drill.id, true);
        }
        return;
      }
      if (t.hasAttribute('data-ob-rec-save')) {
        var midS = t.getAttribute('data-ob-rec-save');
        var g = function (suffix) { var el = document.getElementById(suffix + '-' + midS); return el ? el.value : ''; };
        Store.addMemberRecord(midS, {
          date: g('ob-rec-date'),
          channel: g('ob-rec-ch'),
          result: g('ob-rec-result'),
          script: g('ob-rec-script'),
        });
        obState.drill.open = midS;
        openObDrill(obState.drill.id, true);
        App.showToast('已保存记录');
        return;
      }
      if (t.hasAttribute('data-ob-drill-add')) {
        var bidA = t.getAttribute('data-ob-drill-add');
        var ta2 = document.getElementById('ob-drill-input');
        if (!ta2 || !ta2.value.trim()) { App.showToast('先粘贴 handle'); return; }
        var list2 = obParse(ta2.value);
        if (!list2.length) { App.showToast('没识别到达人'); return; }
        var n2 = Store.addMembers(bidA, list2.map(function (x) {
          var b2 = Store.getBatch(bidA);
          return { handle: x.handle, raw: x.raw, email: x.email, sku: x.sku || (b2 && b2.sku) || '', level: x.level, note: x.note, type: (b2 && b2.type) || 'other', status: 'pending', touches: [] };
        }));
        ta2.value = '';
        App.showToast('已追加 ' + n2 + ' 位');
        renderObAll();
        openObDrill(bidA, true);
        return;
      }
      if (t.hasAttribute('data-ob-del-batch')) {
        var dbid = t.getAttribute('data-ob-del-batch');
        if (global.confirm('删除这个分组？分组下的达人记录也会一起删除')) {
          Store.deleteBatch(dbid);
          renderObAll();
          App.showToast('分组已删除');
        }
        return;
      }
      if (t.hasAttribute('data-ob-export')) {
        obExport(t.getAttribute('data-ob-export'));
        return;
      }
      if (t.hasAttribute('data-ob-copy-h')) {
        var hid = t.getAttribute('data-ob-copy-h');
        var hs = Store.getMembers(hid).map(function (m) { return m.handle; });
        App.copyToClipboard(formatHandles(hs), 'handle');
        return;
      }
      if (t.hasAttribute('data-ob-copy-one')) {
        App.copyToClipboard(t.getAttribute('data-ob-copy-one'), 'handle');
        return;
      }
      if (t.hasAttribute('data-ob-copy-mail')) {
        App.copyToClipboard(t.getAttribute('data-ob-copy-mail'), '邮箱');
        return;
      }
      if (t.hasAttribute('data-ob-touch')) {
        var mid = t.getAttribute('data-ob-touch');
        var ch = t.getAttribute('data-ch');
        Store.addTouch(mid, ch, '');
        renderObAll();
        App.showToast('已记录：' + ch);
        return;
      }
      if (t.hasAttribute('data-ob-del')) {
        var did = t.getAttribute('data-ob-del');
        Store.deleteMember(did);
        renderObAll();
        if (obState.drill.id) openObDrill(obState.drill.id, true);
        App.showToast('已移除');
        return;
      }
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.hasAttribute || !t.hasAttribute('data-ob-status')) return;
      var id = t.getAttribute('data-ob-status');
      var val = t.value;
      if (val === 'fail') {
        var why = global.prompt('未成功原因？（可留空）', '') || '';
        Store.setMemberStatus(id, val, why);
      } else {
        Store.setMemberStatus(id, val, '');
      }
      renderObAll();
      if (obState.drill.id) openObDrill(obState.drill.id, true);
      App.showToast('状态已更新');
    });
  }

  /* ================================================================
     模块三：指定达人名单（按店铺/图片分组的定向名单）
     静态数据：js/designated-data.js（DloodaDesignated）
     本机只存：已发标记 / 卡片修改 / 删除 / 新增 / 达人增删
     ================================================================ */

  var desState = { cat: '', q: '', openCard: '', editCard: '' };

  // 合并静态数据 + 本机改动 → 当前生效的卡片列表
  function desAllCards() {
    var D = global.DloodaDesignated;
    var st = Store.getDesignated();
    var cards = [];
    if (D && D.cats) {
      D.cats.forEach(function (cat) {
        (cat.items || []).forEach(function (it) {
          if (st.deleted.indexOf(it.id) !== -1) return;
          var o = st.overrides[it.id] || {};
          var adds = st.handleAdds[it.id] || [];
          var rems = st.handleRems[it.id] || [];
          var handles = (it.handles || []).filter(function (h) { return rems.indexOf(h) === -1; });
          cards.push({
            id: it.id,
            cat: cat.id,
            catName: cat.name,
            store: o.store != null ? o.store : it.store,
            title: o.title != null ? o.title : it.title,
            product: o.product != null ? o.product : it.product,
            note: o.note != null ? o.note : it.note,
            img: o.img != null ? o.img : (it.img || ''),
            handles: handles.concat(adds),
          });
        });
      });
    }
    (st.added || []).forEach(function (c) {
      if (st.deleted.indexOf(c.id) !== -1) return;
      var o = st.overrides[c.id] || {};
      var adds = st.handleAdds[c.id] || [];
      var rems = st.handleRems[c.id] || [];
      cards.push({
        id: c.id,
        cat: c.cat || 'custom',
        catName: c.catName || (c.cat === 'pants' ? '裤子' : c.cat === 'dress' ? '裙子' : '自建'),
        store: o.store != null ? o.store : c.store,
        title: o.title != null ? o.title : c.title,
        product: o.product != null ? o.product : c.product,
        note: o.note != null ? o.note : c.note,
        img: o.img != null ? o.img : (c.img || ''),
        handles: (c.handles || []).filter(function (h) { return rems.indexOf(h) === -1; }).concat(adds),
      });
    });
    return cards;
  }

  function desFiltered() {
    var q = desState.q.trim().toLowerCase();
    return desAllCards().filter(function (c) {
      if (desState.cat && c.cat !== desState.cat) return false;
      if (!q) return true;
      if ((c.store || '').toLowerCase().indexOf(q) !== -1) return true;
      if ((c.product || '').toLowerCase().indexOf(q) !== -1) return true;
      if ((c.title || '').toLowerCase().indexOf(q) !== -1) return true;
      return (c.handles || []).some(function (h) { return h.indexOf(q) !== -1; });
    });
  }

  function renderDesCats() {
    var box = document.getElementById('des-cats');
    if (!box) return;
    var cards = desAllCards();
    var cats = [{ key: '', name: '全部' }];
    var seen = {};
    cards.forEach(function (c) {
      if (!seen[c.cat]) { seen[c.cat] = { key: c.cat, name: c.catName || c.cat }; cats.push(seen[c.cat]); }
    });
    box.innerHTML = cats.map(function (cat) {
      var n = cat.key ? cards.filter(function (c) { return c.cat === cat.key; }).length : cards.length;
      var on = desState.cat === cat.key;
      return '<button class="btn btn--sm ' + (on ? 'btn--secondary' : 'btn--ghost')
        + '" data-des-cat="' + App.escapeHtml(cat.key) + '">'
        + App.escapeHtml(cat.name) + ' ' + n + '</button>';
    }).join('');
  }

  function desMarkSummary(cardId) {
    var marks = Store.desMarks(cardId);
    if (!marks.length) return '';
    var last = marks[marks.length - 1];
    return '<div style="margin-top:6px;font-size:11.5px;color:var(--c-success);line-height:1.5;">'
      + '📋 已发 ' + marks.length + ' 次 · 最近：' + App.escapeHtml(last.date)
      + (last.product ? ' 发 ' + App.escapeHtml(last.product) : '')
      + '</div>';
  }

  function renderDesGrid() {
    var box = document.getElementById('des-grid');
    if (!box) return;
    var cards = desFiltered();

    if (!cards.length) {
      box.innerHTML = '<div class="card card--padding-lg"><div class="empty-state" style="padding:16px;">'
        + '<div class="empty-state__icon">🎀</div>'
        + '<div class="empty-state__text">'
        + (desState.q ? '没找到匹配的店铺 / 达人，换个关键词试试'
          : '指定达人名单是空的（静态数据没加载？检查 js/designated-data.js）')
        + '</div></div></div>';
      return;
    }

    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));'
      + 'gap:12px;padding:2px 0;">'
      + cards.map(function (c) {
          var marks = Store.desMarks(c.id);
          var imgHtml = c.img
            ? '<img src="' + App.escapeHtml(c.img) + '" alt="' + App.escapeHtml(c.store) + '" '
              + 'style="width:100%;height:130px;object-fit:cover;display:block;" loading="lazy">'
            : '<div style="width:100%;height:130px;display:flex;align-items:center;justify-content:center;'
              + 'background:var(--bg-hover);color:var(--text-3);font-size:26px;">🛍️</div>';
          return ''
            + '<div style="border:1px solid var(--border-1);border-radius:var(--r-lg);overflow:hidden;'
            +   'background:#fff;cursor:pointer;display:flex;flex-direction:column;" '
            +   'data-des-open="' + App.escapeHtml(c.id) + '" title="点击查看达人名单">'
            +   '<div style="position:relative;">'
            +     imgHtml
            +     '<span style="position:absolute;top:6px;left:6px;" class="badge badge--gray">'
            +       App.escapeHtml(c.catName) + '</span>'
            +     (marks.length
            ?       '<span style="position:absolute;top:6px;right:6px;" class="badge badge--green">已发 '
            +       marks.length + '</span>' : '')
            +   '</div>'
            +   '<div style="padding:9px 11px 11px;flex:1;display:flex;flex-direction:column;">'
            +     '<div style="font-size:13.5px;font-weight:700;color:var(--text-1);'
            +       'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
            +       App.escapeHtml(c.store || '（未标注店铺）') + '</div>'
            +     (c.product
            ?       '<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">'
            +         c.product.split(/[、,，\/\s]+/).filter(Boolean).slice(0, 4).map(function (p) {
                      return '<span class="sku-tag" style="font-size:10.5px;">'
                        + App.escapeHtml(p) + '</span>';
                    }).join('') + '</div>'
            :       '')
            +     '<div style="margin-top:5px;font-size:11.5px;color:var(--text-3);">'
            +       '达人 <strong style="color:var(--text-2);">' + c.handles.length + '</strong> 个</div>'
            +     desMarkSummary(c.id)
            +   '</div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function renderDesAll() {
    renderDesCats();
    renderDesGrid();
  }

  /* ---------- 卡片详情弹窗 ---------- */

  function desFindCard(cardId) {
    return desAllCards().filter(function (c) { return c.id === cardId; })[0] || null;
  }

  function openDesCard(cardId) {
    closeDesCard();
    var c = desFindCard(cardId);
    if (!c) { App.showToast('卡片不存在'); return; }
    desState.openCard = cardId;
    var marks = Store.desMarks(cardId);

    var handleChips = c.handles.slice(0, 200).map(function (h) {
      return ''
        + '<span style="display:inline-flex;align-items:center;gap:2px;padding:3px 4px 3px 9px;'
        +   'border-radius:999px;background:var(--bg-pink-soft);border:1px solid var(--border-1);max-width:100%;">'
        +   '<button class="link-btn" data-des-copy-h="' + App.escapeHtml(h) + '" '
        +     'style="font-size:12px;color:var(--text-1);font-weight:500;" title="点击复制">'
        +     App.escapeHtml(h) + '</button>'
        +   '<button data-des-rem-h="' + App.escapeHtml(h) + '" title="移除这个达人" '
        +     'style="border:0;background:transparent;color:var(--text-3);cursor:pointer;'
        +     'font-size:14px;line-height:1;padding:0 3px;">×</button>'
        + '</span>';
    }).join('');

    var mask = document.createElement('div');
    mask.id = 'des-card-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(60,45,50,.35);z-index:9999;'
      + 'display:flex;align-items:center;justify-content:center;padding:16px;';

    mask.innerHTML = ''
      + '<div style="background:#fff;border-radius:var(--r-lg);width:100%;max-width:560px;'
      +   'max-height:86vh;display:flex;flex-direction:column;overflow:hidden;">'
      +   '<div style="padding:13px 16px;border-bottom:1px solid var(--border-1);display:flex;gap:10px;align-items:flex-start;">'
      +     (c.img ? '<img src="' + App.escapeHtml(c.img) + '" style="width:52px;height:52px;object-fit:cover;border-radius:var(--r-md);flex:none;">' : '')
      +     '<div style="flex:1;min-width:0;">'
      +       '<div style="font-size:15.5px;font-weight:700;color:var(--text-1);">'
      +         App.escapeHtml(c.store || '（未标注店铺）') + '</div>'
      +       '<div style="font-size:11.5px;color:var(--text-3);margin-top:3px;line-height:1.5;">'
      +         (c.product ? '产品：' + App.escapeHtml(c.product) + ' · ' : '')
      +         (c.title ? App.escapeHtml(c.title) + ' · ' : '')
      +         c.handles.length + ' 个达人</div>'
      +     '</div>'
      +     '<button class="btn btn--ghost btn--sm" id="des-edit-info">编辑</button>'
      +     '<button class="btn btn--ghost btn--sm" id="des-del-card" style="color:var(--c-danger);">删除</button>'
      +   '</div>'
      +   '<div style="flex:1;overflow-y:auto;padding:12px 16px;">'
      +     '<div style="font-size:12.5px;font-weight:700;color:var(--pink-600);margin-bottom:6px;">'
      +       '已发记录（什么时间已发什么产品）</div>'
      +     '<div id="des-marks-list">'
      +       (marks.length
      ?         marks.map(function (m) {
                  return ''
                    + '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12.5px;">'
                    +   '<span class="badge badge--green">' + App.escapeHtml(m.date) + '</span>'
                    +   '<span style="flex:1;color:var(--text-2);">'
                    +     (m.product ? '已发 ' + App.escapeHtml(m.product) : '已发送')
                    +     (m.note ? ' <span style="color:var(--text-3);">' + App.escapeHtml(m.note) + '</span>' : '')
                    +   '</span>'
                    +   '<button class="link-btn" data-des-del-mark="' + App.escapeHtml(m.id) + '" '
                    +     'style="color:var(--c-danger);font-size:11.5px;">删除</button>'
                    + '</div>';
                }).join('')
      :         '<div style="font-size:12px;color:var(--text-3);padding:2px 0 6px;">还没发过，发了就记一笔 ↓</div>')
      +     '</div>'
      +     '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">'
      +       '<input type="date" class="input" id="des-mark-date" value="' + Store.todayStr() + '" style="width:130px;padding:5px 8px;font-size:12px;">'
      +       '<input type="text" class="input" id="des-mark-product" placeholder="发的产品，如 2722、2789" style="flex:1;min-width:150px;padding:5px 8px;font-size:12px;">'
      +       '<button class="btn btn--primary btn--sm" id="des-mark-add">＋ 记一笔已发</button>'
      +     '</div>'
      +     '<div style="font-size:12.5px;font-weight:700;color:var(--pink-600);margin-bottom:6px;">'
      +       '达人 ID 名单（' + c.handles.length + ' 个，同店铺已去重）</div>'
      +     (c.handles.length
      ?       '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">' + handleChips + '</div>'
      +       (c.handles.length > 200
      ?         '<div style="font-size:11.5px;color:var(--text-3);margin-bottom:8px;">'
      +           '只展示前 200 个，点下面「一键复制全部」会复制所有 ' + c.handles.length + ' 个</div>' : '')
      :       '<div style="font-size:12px;color:var(--text-3);padding:2px 0 6px;">这个卡片还没有达人</div>')
      +     '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      +       '<textarea class="textarea" id="des-add-handles" rows="2" '
      +         'placeholder="往这个店铺加达人：粘贴 handle，每行一个或逗号分隔" style="flex:1;min-width:200px;font-size:12px;"></textarea>'
      +       '<button class="btn btn--secondary btn--sm" id="des-add-handles-btn" style="align-self:flex-start;">＋ 加入</button>'
      +     '</div>'
      +   '</div>'
      +   '<div style="padding:11px 16px;border-top:1px solid var(--border-1);display:flex;gap:8px;justify-content:flex-end;">'
      +     '<button class="btn btn--ghost btn--sm" id="des-close">关闭</button>'
      +     '<button class="btn btn--primary btn--sm" id="des-copy-all"'
      +       (c.handles.length ? '' : ' disabled style="opacity:.5;cursor:not-allowed;"') + '>'
      +       '一键复制全部 ' + c.handles.length + ' 个</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(mask);

    mask.addEventListener('click', function (e) {
      if (e.target === mask) { closeDesCard(); return; }
      var t = e.target.closest('[data-des-copy-h],[data-des-rem-h],[data-des-del-mark],'
        + '#des-close,#des-copy-all,#des-mark-add,#des-add-handles-btn,#des-edit-info,#des-del-card');
      if (!t) return;

      if (t.hasAttribute('data-des-copy-h')) {
        App.copyToClipboard(t.getAttribute('data-des-copy-h'), 'handle');
        return;
      }
      if (t.hasAttribute('data-des-rem-h')) {
        var h = t.getAttribute('data-des-rem-h');
        if (global.confirm('把 ' + h + ' 从这个店铺移除？（只影响本机显示，可重新加回）')) {
          Store.desRemoveHandle(cardId, h);
          openDesCard(cardId); renderDesAll();
          App.showToast('已移除 ' + h);
        }
        return;
      }
      if (t.hasAttribute('data-des-del-mark')) {
        Store.desDeleteMark(cardId, t.getAttribute('data-des-del-mark'));
        openDesCard(cardId); renderDesAll();
        App.showToast('已删除这条记录');
        return;
      }
      if (t.id === 'des-close') { closeDesCard(); return; }
      if (t.id === 'des-copy-all') {
        var cur = desFindCard(cardId);
        if (cur) copyHandles(cur.handles, cur.store + ' 的 ' + cur.handles.length + ' 个 handle');
        return;
      }
      if (t.id === 'des-mark-add') {
        var d = document.getElementById('des-mark-date');
        var p = document.getElementById('des-mark-product');
        Store.desAddMark(cardId, d ? d.value : Store.todayStr(), p ? p.value.trim() : '', '');
        openDesCard(cardId); renderDesAll();
        App.showToast('已记录：' + (d ? d.value : '') + ' 已发 ' + (p ? p.value : ''));
        return;
      }
      if (t.id === 'des-add-handles-btn') {
        var ta = document.getElementById('des-add-handles');
        var list = ta ? Matcher.dedupe(Matcher.parseHandles(ta.value)) : [];
        if (!list.length) { App.showToast('没识别到 handle'); return; }
        var existing = desFindCard(cardId);
        var fresh = list.filter(function (x) {
          return !existing || existing.handles.indexOf(x) === -1;
        });
        if (!fresh.length) { App.showToast('这些达人已经在这个店铺里了'); return; }
        Store.desAddHandles(cardId, fresh);
        openDesCard(cardId); renderDesAll();
        App.showToast('已加入 ' + fresh.length + ' 个达人');
        return;
      }
      if (t.id === 'des-edit-info') { openDesEdit(cardId); return; }
      if (t.id === 'des-del-card') {
        var card = desFindCard(cardId);
        if (card && global.confirm('删除店铺「' + (card.store || card.id) + '」整张卡片？\n（本机操作，删除后刷新页面不恢复）')) {
          Store.desDeleteCard(cardId);
          closeDesCard(); renderDesAll();
          App.showToast('卡片已删除');
        }
        return;
      }
    });
  }

  function closeDesCard() {
    var m = document.getElementById('des-card-mask');
    if (m) m.remove();
    desState.openCard = '';
  }

  /* ---------- 卡片编辑 / 新增弹窗 ---------- */

  function desFileToDataURL(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 360 / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s);
        cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = function () { cb(''); };
      img.src = fr.result;
    };
    fr.onerror = function () { cb(''); };
    fr.readAsDataURL(file);
  }

  function openDesEdit(cardId) {
    var c = cardId ? desFindCard(cardId) : null;
    var isEdit = !!c;

    var oldMask = document.getElementById('des-edit-mask');
    if (oldMask) oldMask.remove();

    var mask = document.createElement('div');
    mask.id = 'des-edit-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(60,45,50,.45);z-index:10001;'
      + 'display:flex;align-items:center;justify-content:center;padding:16px;';

    mask.innerHTML = ''
      + '<div style="background:#fff;border-radius:var(--r-lg);width:100%;max-width:420px;'
      +   'max-height:86vh;display:flex;flex-direction:column;overflow:hidden;">'
      +   '<div style="padding:13px 16px;border-bottom:1px solid var(--border-1);font-size:15px;font-weight:700;color:var(--text-1);">'
      +     (isEdit ? '编辑店铺卡片' : '新增店铺卡片') + '</div>'
      +   '<div style="flex:1;overflow-y:auto;padding:12px 16px;">'
      +     '<div class="form-group">'
      +       '<label class="form-label">分类</label>'
      +       '<select class="select" id="des-f-cat">'
      +         '<option value="dress"' + (isEdit && c.cat === 'dress' ? ' selected' : '') + '>裙子</option>'
      +         '<option value="pants"' + (isEdit && c.cat === 'pants' ? ' selected' : '') + '>裤子</option>'
      +       '</select>'
      +     '</div>'
      +     '<div class="form-group">'
      +       '<label class="form-label">店铺名</label>'
      +       '<input type="text" class="input" id="des-f-store" value="' + App.escapeHtml(isEdit ? c.store : '') + '">'
      +     '</div>'
      +     '<div class="form-group">'
      +       '<label class="form-label">产品（SKU，多个用 、 或逗号分隔）</label>'
      +       '<input type="text" class="input" id="des-f-product" value="' + App.escapeHtml(isEdit ? (c.product || '') : '') + '">'
      +     '</div>'
      +     '<div class="form-group">'
      +       '<label class="form-label">标题 / 备注</label>'
      +       '<input type="text" class="input" id="des-f-title" value="' + App.escapeHtml(isEdit ? (c.title || '') : '') + '">'
      +     '</div>'
      +     '<div class="form-group">'
      +       '<label class="form-label">产品图片（可换可不换）</label>'
      +       '<input type="file" class="input" id="des-f-img" accept="image/*" style="padding:6px;">'
      +       '<div id="des-f-img-preview" style="margin-top:6px;">'
      +         (isEdit && c.img ? '<img src="' + App.escapeHtml(c.img) + '" style="width:80px;height:80px;object-fit:cover;border-radius:var(--r-md);">' : '')
      +       '</div>'
      +     '</div>'
      +     (!isEdit
      ?       '<div class="form-group">'
      +         '<label class="form-label">达人 handle（每行一个或逗号分隔，可留空以后加）</label>'
      +         '<textarea class="textarea" id="des-f-handles" rows="4"></textarea>'
      +       '</div>'
      :       '')
      +   '</div>'
      +   '<div style="padding:11px 16px;border-top:1px solid var(--border-1);display:flex;gap:8px;justify-content:flex-end;">'
      +     '<button class="btn btn--ghost btn--sm" id="des-f-cancel">取消</button>'
      +     '<button class="btn btn--primary btn--sm" id="des-f-save">' + (isEdit ? '保存' : '创建') + '</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(mask);

    var imgData = '';
    var imgInput = mask.querySelector('#des-f-img');
    if (imgInput) imgInput.addEventListener('change', function () {
      var f = imgInput.files && imgInput.files[0];
      if (!f) return;
      desFileToDataURL(f, function (dataUrl) {
        imgData = dataUrl;
        var pv = document.getElementById('des-f-img-preview');
        if (pv) pv.innerHTML = dataUrl
          ? '<img src="' + dataUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:var(--r-md);">'
          : '<span style="font-size:12px;color:var(--c-danger);">图片读取失败</span>';
      });
    });

    mask.querySelector('#des-f-cancel').addEventListener('click', function () { mask.remove(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    mask.querySelector('#des-f-save').addEventListener('click', function () {
      var cat = mask.querySelector('#des-f-cat').value;
      var store = mask.querySelector('#des-f-store').value.trim();
      var product = mask.querySelector('#des-f-product').value.trim();
      var title = mask.querySelector('#des-f-title').value.trim();
      if (!store) { App.showToast('店铺名总要有一个吧'); return; }

      if (isEdit) {
        var patch = { store: store, product: product, title: title };
        if (imgData) patch.img = imgData;
        if (cat !== c.cat) patch.cat = cat;
        Store.desUpdateCard(cardId, patch);
        mask.remove();
        renderDesAll();
        if (desState.openCard) openDesCard(cardId);
        App.showToast('已保存');
      } else {
        var handles = Matcher.dedupe(Matcher.parseHandles(mask.querySelector('#des-f-handles').value));
        Store.desAddCard({
          cat: cat,
          catName: cat === 'pants' ? '裤子' : '裙子',
          store: store, product: product, title: title,
          img: imgData, handles: handles,
        });
        mask.remove();
        renderDesAll();
        App.showToast('已创建「' + store + '」' + (handles.length ? '，含 ' + handles.length + ' 个达人' : ''));
      }
    });
  }

  /* ---------- 模块三事件绑定 ---------- */

  function bindDesEvents() {
    var box = document.getElementById('des-grid');
    if (box) {
      box.addEventListener('click', function (e) {
        var t = e.target.closest('[data-des-open]');
        if (!t) return;
        openDesCard(t.getAttribute('data-des-open'));
      });
    }

    var cats = document.getElementById('des-cats');
    if (cats) {
      cats.addEventListener('click', function (e) {
        var b = e.target.closest('[data-des-cat]');
        if (!b) return;
        desState.cat = b.getAttribute('data-des-cat');
        renderDesAll();
      });
    }

    var search = document.getElementById('des-search');
    if (search) search.addEventListener('input', function () {
      desState.q = search.value;
      renderDesGrid();
    });

    var btnAdd = document.getElementById('btn-des-add');
    if (btnAdd) btnAdd.addEventListener('click', function () { openDesEdit(''); });
  }

  /* ---------- 模块切换 ---------- */
  /* ================= 模块一：自动达人名单（Excel 导入） ================= */
  var autoOpen = {};
  var reinvestPage = 1;
  var reinvestStep = 120;

  function autoAllGroups() {
    var groups = [];
    var auto = Store.getAuto();
    if (global.DloodaAuto && DloodaAuto.groups) {
      DloodaAuto.groups.forEach(function (g) {
        if ((auto.groupDeleted || []).indexOf(g.id) !== -1) return;
        groups.push({ id: g.id, name: (auto.groupNames || {})[g.id] || g.name, handles: g.handles.slice(), custom: false });
      });
    }
    (auto.custom || []).forEach(function (g) {
      groups.push({ id: g.id, name: g.name, handles: g.handles.slice(), custom: true });
    });
    return groups;
  }

  function autoFinalHandles(g) {
    var auto = Store.getAuto();
    var set = {};
    g.handles.forEach(function (h) { set[h] = true; });
    (auto.removed[g.id] || []).forEach(function (h) { delete set[h]; });
    (auto.added[g.id] || []).forEach(function (h) { set[h] = true; });
    return Object.keys(set);
  }

  function renderAutoAll() {
    var grid = document.getElementById('auto-grid');
    if (!grid) return;
    var groups = autoAllGroups();
    var auto = Store.getAuto();
    var marksAll = auto.marks || {};
    var totalEl = document.getElementById('auto-total');
    var totalHandles = 0;
    groups.forEach(function (g) { totalHandles += autoFinalHandles(g).length; });
    if (totalEl) totalEl.textContent = groups.length + ' 组 / ' + totalHandles + ' 达人';

    var q = ((document.getElementById('auto-search') || {}).value || '').toLowerCase();

    var html = [];
    groups.forEach(function (g) {
      var hs = autoFinalHandles(g);
      if (q) {
        var hit = g.name.toLowerCase().indexOf(q) !== -1 ||
          hs.some(function (h) { return h.indexOf(q) !== -1; });
        if (!hit) return;
      }
      var marks = marksAll[g.id] || {};
      var markedCount = hs.filter(function (h) { return marks[h]; }).length;
      var open = autoOpen[g.id];
      html.push('<div class="auto-group" data-gid="' + App.escapeHtml(g.id) + '" style="border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden;">');
      html.push('  <div class="auto-group__head" data-gid="' + App.escapeHtml(g.id) + '" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;cursor:pointer;background:var(--bg-2);">');
      html.push('    <div style="display:flex;align-items:center;gap:8px;"><strong style="font-size:13.5px;">' + App.escapeHtml(g.name) + '</strong>');
      html.push('      <span class="badge" style="font-size:11px;">' + hs.length + ' 人</span>');
      if (markedCount) html.push('<span class="badge badge--green" style="font-size:11px;">已发 ' + markedCount + '</span>');
      if (g.custom) html.push('<span class="badge badge--pink" style="font-size:11px;">自建</span>');
      html.push('    </div>');
      html.push('    <div style="display:flex;align-items:center;gap:6px;">');
      html.push('      <button class="btn btn--ghost btn--sm" data-auto-copy="' + App.escapeHtml(g.id) + '">复制</button>');
      html.push('      <button class="btn btn--ghost btn--sm" data-auto-pool="' + App.escapeHtml(g.id) + '">入池</button>');
      html.push('      <button class="btn btn--ghost btn--sm" data-auto-ren="' + App.escapeHtml(g.id) + '">改名</button>');
      html.push('      <button class="btn btn--ghost btn--sm" data-auto-del-group="' + App.escapeHtml(g.id) + '" style="color:var(--c-danger);">删组</button>');
      html.push('      <span style="font-size:12px;color:var(--text-3);">' + (open ? '▴' : '▾') + '</span>');
      html.push('    </div>');
      html.push('  </div>');
      if (open) {
        html.push('  <div class="auto-group__body" style="padding:10px 12px;">');
        html.push('    <div class="auto-chips" style="display:flex;flex-wrap:wrap;gap:6px;">');
        hs.forEach(function (h) {
          var mk = marks[h];
          html.push('<span class="chip" data-handle="' + App.escapeHtml(h) + '" title="点击复制" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;background:var(--bg-2);font-size:12px;cursor:pointer;">');
          html.push(App.escapeHtml(h));
          if (mk) html.push('<span style="color:var(--c-success);font-size:10px;">✓' + App.escapeHtml(mk.date.slice(5)) + '</span>');
          html.push('<button class="link-btn" data-auto-mark="' + App.escapeHtml(g.id) + '" data-handle="' + App.escapeHtml(h) + '" style="color:var(--c-danger);font-size:11px;margin-left:2px;">' + (mk ? '改' : '标') + '</button>');
          html.push('<button class="link-btn" data-auto-remove="' + App.escapeHtml(g.id) + '" data-handle="' + App.escapeHtml(h) + '" style="color:var(--text-3);font-size:11px;">×</button>');
          html.push('</span>');
        });
        html.push('    </div>');
        html.push('    <div style="margin-top:8px;display:flex;gap:6px;">');
        html.push('      <input class="input" id="auto-add-' + App.escapeHtml(g.id) + '" placeholder="追加 handle，逗号分隔" style="flex:1;padding:5px 8px;font-size:12px;">');
        html.push('      <button class="btn btn--secondary btn--sm" data-auto-add="' + App.escapeHtml(g.id) + '">追加</button>');
        html.push('    </div>');
        html.push('  </div>');
      }
      html.push('</div>');
    });
    grid.innerHTML = html.join('') || '<p style="color:var(--text-3);font-size:12.5px;">无匹配分组</p>';
  }

  function bindAutoEvents() {
    var grid = document.getElementById('auto-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var t = e.target;
        var head = t.closest('.auto-group__head');
        if (head && !t.hasAttribute('data-auto-copy') && !t.hasAttribute('data-auto-del-group')
          && !t.hasAttribute('data-auto-ren') && !t.hasAttribute('data-auto-pool')) {
          var gid = head.getAttribute('data-gid');
          autoOpen[gid] = !autoOpen[gid];
          renderAutoAll();
          return;
        }
        var gid2 = t.getAttribute('data-auto-copy') || t.getAttribute('data-auto-del-group') ||
          t.getAttribute('data-auto-add') || t.getAttribute('data-auto-mark') || t.getAttribute('data-auto-remove') ||
          t.getAttribute('data-auto-ren') || t.getAttribute('data-auto-pool');
        if (!gid2) return;
        if (t.hasAttribute('data-auto-copy')) {
          var g = autoAllGroups().filter(function (x) { return x.id === gid2; })[0];
          if (g) App.copyToClipboard(autoFinalHandles(g).join('\n'), g.name + ' 的 ' + autoFinalHandles(g).length + ' 个');
          return;
        }
        if (t.hasAttribute('data-auto-ren')) {
          var g3 = autoAllGroups().filter(function (x) { return x.id === gid2; })[0];
          var nm = prompt('分组名称', g3 ? g3.name : '');
          if (nm === null || !nm.trim()) return;
          Store.autoRenameGroup(gid2, nm.trim());
          renderAutoAll();
          return;
        }
        if (t.hasAttribute('data-auto-pool')) {
          var g4 = autoAllGroups().filter(function (x) { return x.id === gid2; })[0];
          if (!g4) return;
          var hs4 = autoFinalHandles(g4);
          var n4 = Store.poolAdd(hs4);
          App.showToast('已把「' + g4.name + '」的 ' + n4 + ' 个新达人加入达人池');
          renderPool();
          return;
        }
        if (t.hasAttribute('data-auto-del-group')) {
          var g5 = autoAllGroups().filter(function (x) { return x.id === gid2; })[0];
          if (confirm('确认删除分组「' + (g5 ? g5.name : '') + '」？组内标记也会删除')) {
            Store.autoDeleteGroupAny(gid2);
            renderAutoAll();
          }
          return;
        }
        if (t.hasAttribute('data-auto-remove')) {
          Store.autoRemoveHandle(gid2, t.getAttribute('data-handle')); renderAutoAll(); return;
        }
        if (t.hasAttribute('data-auto-mark')) {
          var h2 = t.getAttribute('data-handle');
          var d = prompt('标记已发日期（默认今天）', Store.todayStr());
          if (d === null) return;
          var note = prompt('备注（可选，如已发 SKU）', '');
          if (note === null) return;
          Store.autoMark(gid2, h2, d, note); renderAutoAll(); return;
        }
        if (t.hasAttribute('data-auto-add')) {
          var inp = document.getElementById('auto-add-' + gid2);
          if (inp && inp.value.trim()) {
            var parts = (global.DloodaMatcher && DloodaMatcher.parseHandles)
              ? DloodaMatcher.parseHandles(inp.value)
              : inp.value.split(/[,\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
            parts.forEach(function (h) { Store.autoAddHandle(gid2, h); });
            renderAutoAll();
          }
          return;
        }
      });
      grid.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (chip && !e.target.hasAttribute('data-auto-mark') && !e.target.hasAttribute('data-auto-remove')) {
          var h = chip.getAttribute('data-handle');
          App.copyToClipboard(h, '已复制 ' + h);
        }
      });
    }
    var search = document.getElementById('auto-search');
    if (search) search.addEventListener('input', renderAutoAll);
    var addBtn = document.getElementById('btn-auto-add-group');
    if (addBtn) addBtn.addEventListener('click', function () {
      var name = prompt('分组名称', '新分组');
      if (!name) return;
      var handles = prompt('达人 handle（逗号或换行分隔）', '');
      if (handles === null) return;
      var parts = (global.DloodaMatcher && DloodaMatcher.parseHandles)
        ? DloodaMatcher.parseHandles(handles)
        : handles.split(/[,\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      Store.autoAddGroup(name, parts);
      renderAutoAll();
    });
  }

  /* ================================================================
     模块一：达人池 + 按 SKU 视图
     达人池不按 SKU 存；选中 SKU 时动态计算 可发送 / 已发送 / 被剔除
     剔除规则：黑名单 → 低效 → 已合作该款（进「已发送」区） → 合作3款以上未出单
     ================================================================ */
  var poolState = { sku: '', q: '', page: { can: 1, sent: 1, ex: 1 } };
  var POOL_PAGE = 80;

  function poolSkuList() {
    var skus = [];
    try { skus = (Data && Data.getAvailableSKUs()) || []; } catch (e) { skus = []; }
    return skus;
  }

  function poolCompute() {
    var sku = poolState.sku;
    var q = poolState.q;
    var auto = Store.getAuto();
    var pool = auto.pool || [];
    var sentMap = auto.sent || {};
    var res = { sent: [], can: [], ex: [] };
    pool.forEach(function (h) {
      if (q && h.indexOf(q) === -1) return;
      var m = sentMap[h] && sentMap[h][sku];
      var c = sku ? Matcher.check(h, sku) : null;
      if (m) { res.sent.push({ h: h, m: m, c: c }); return; }
      if (c && c.status === 'cooperated') { res.sent.push({ h: h, c: c, feishu: true }); return; }
      if (c && (c.status === 'blacklist' || c.status === 'inefficient' || c.status === 'skuLimit')) {
        res.ex.push({ h: h, c: c }); return;
      }
      res.can.push({ h: h, c: c });
    });
    return res;
  }

  function poolChipCan(x) {
    return ''
      + '<span class="chip" data-handle="' + App.escapeHtml(x.h) + '" title="点击复制" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;background:var(--bg-2);font-size:12px;cursor:pointer;">'
      + App.escapeHtml(x.h)
      + '<button class="link-btn" data-pool-mark="' + App.escapeHtml(x.h) + '" style="color:var(--pink-600);font-size:11px;">已发✓</button>'
      + '<button class="link-btn" data-pool-remove="' + App.escapeHtml(x.h) + '" style="color:var(--text-3);font-size:11px;">×</button>'
      + '</span>';
  }

  function poolChipSent(x) {
    var tag = x.feishu
      ? '<span style="color:var(--c-info);font-size:10px;">飞书已寄样</span>'
      : '<span style="color:var(--c-success);font-size:10px;">✓' + App.escapeHtml(((x.m && x.m.date) || '').slice(5)) + '</span>';
    var unmark = x.feishu ? '' : '<button class="link-btn" data-pool-unmark="' + App.escapeHtml(x.h) + '" style="color:var(--text-3);font-size:11px;">取消</button>';
    return ''
      + '<span class="chip" data-handle="' + App.escapeHtml(x.h) + '" title="点击复制" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;background:var(--bg-pink-soft);font-size:12px;cursor:pointer;">'
      + App.escapeHtml(x.h) + tag + unmark
      + '</span>';
  }

  function renderPool() {
    var top = document.getElementById('pool-top');
    if (!top) return;
    var skus = poolSkuList();
    if (!poolState.sku && skus.length) poolState.sku = skus[0];
    var tabs = document.getElementById('pool-sku-tabs');
    if (tabs) {
      tabs.innerHTML = skus.map(function (s) {
        var on = s === poolState.sku;
        return '<button class="btn btn--sm ' + (on ? 'btn--primary' : 'btn--ghost') + '" data-pool-sku="' + App.escapeHtml(s) + '">' + App.escapeHtml(s) + '</button>';
      }).join('');
    }

    var res = poolCompute();
    var total = (Store.getAuto().pool || []).length;
    var totalEl = document.getElementById('pool-total');
    if (totalEl) totalEl.textContent = '池内 ' + total + ' 人';
    var manEl = document.getElementById('pool-manage-count');
    if (manEl) manEl.textContent = '池内共 ' + total + ' 个达人（不按 SKU 存，发哪个 SKU 时自动算）';

    // 可发送
    var canCount = document.getElementById('pool-can-count');
    if (canCount) canCount.textContent = res.can.length;
    var canShow = res.can.slice(0, poolState.page.can * POOL_PAGE);
    var canBox = document.getElementById('pool-can');
    if (canBox) {
      canBox.innerHTML = canShow.map(poolChipCan).join('')
        || '<span style="font-size:12.5px;color:var(--text-3);">（空）达人池还没有人，或都被剔除了</span>';
    }
    var canMore = document.getElementById('pool-can-more');
    if (canMore) {
      canMore.innerHTML = res.can.length > canShow.length
        ? '<button class="btn btn--ghost btn--sm" data-pool-more="can">显示更多（剩 ' + (res.can.length - canShow.length) + '）</button>' : '';
    }

    // 已发送
    var sentCount = document.getElementById('pool-sent-count');
    if (sentCount) sentCount.textContent = res.sent.length;
    var sentShow = res.sent.slice(0, poolState.page.sent * POOL_PAGE);
    var sentBox = document.getElementById('pool-sent');
    if (sentBox) {
      sentBox.innerHTML = sentShow.map(poolChipSent).join('')
        || '<span style="font-size:12.5px;color:var(--text-3);">（空）还没标记过发送，飞书已寄样的达人会自动出现在这里</span>';
    }
    var sentMore = document.getElementById('pool-sent-more');
    if (sentMore) {
      sentMore.innerHTML = res.sent.length > sentShow.length
        ? '<button class="btn btn--ghost btn--sm" data-pool-more="sent">显示更多（剩 ' + (res.sent.length - sentShow.length) + '）</button>' : '';
    }

    // 被剔除
    var exCount = document.getElementById('pool-ex-count');
    if (exCount) exCount.textContent = res.ex.length;
    var exShow = res.ex.slice(0, poolState.page.ex * POOL_PAGE);
    var exBox = document.getElementById('pool-ex');
    if (exBox) {
      exBox.innerHTML = exShow.map(function (x) {
        return '<div style="display:flex;gap:8px;padding:4px 0;font-size:12px;border-bottom:1px dashed var(--border-1);align-items:flex-start;">'
          + '<strong style="min-width:120px;">' + App.escapeHtml(x.h) + '</strong>'
          + '<span class="badge badge--gray" style="font-size:10.5px;">' + App.escapeHtml(x.c.label || x.c.status) + '</span>'
          + '<span style="color:var(--text-3);flex:1;">' + App.escapeHtml(x.c.reason || '') + '</span>'
          + '</div>';
      }).join('') || '<div style="font-size:12.5px;color:var(--text-3);">没有人被剔除</div>';
      if (res.ex.length > exShow.length) {
        exBox.innerHTML += '<div style="text-align:center;padding:8px;"><button class="btn btn--ghost btn--sm" data-pool-more="ex">显示更多（剩 ' + (res.ex.length - exShow.length) + '）</button></div>';
      }
    }
  }

  // 导入达人池：校验 → 弹窗列出剔除原因 → 确认导入
  function poolImportFlow() {
    var ta = document.getElementById('pool-input');
    if (!ta) return;
    var raw = Matcher.parseHandles(ta.value);
    if (!raw.length) { App.showToast('没识别到达人'); return; }
    var poolSet = {};
    Store.poolList().forEach(function (h) { poolSet[h] = true; });
    var seen = {};
    var acc = [], dups = [], invalids = [], blocked = [];
    raw.forEach(function (r) {
      var h = Matcher.normalize(r);
      if (!h) { invalids.push(r); return; }
      if (seen[h] || poolSet[h]) { dups.push(h); return; }
      seen[h] = true;
      var c = Matcher.check(h, '');
      if (c.status === 'blacklist' || c.status === 'inefficient' || c.status === 'skuLimit') {
        blocked.push({ raw: r, c: c }); return;
      }
      acc.push(h);
    });
    poolState.preview = acc;

    var mask = document.createElement('div');
    mask.id = 'pool-preview-mask';
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(92,74,74,.34);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    var rows = blocked.map(function (b) {
      return '<div style="display:flex;gap:8px;padding:5px 0;font-size:12px;border-bottom:1px dashed var(--border-1);align-items:flex-start;">'
        + '<strong style="min-width:110px;">' + App.escapeHtml(String(b.raw)) + '</strong>'
        + '<span class="badge badge--gray" style="font-size:10.5px;">' + App.escapeHtml(b.c.label) + '</span>'
        + '<span style="color:var(--text-3);flex:1;">' + App.escapeHtml(b.c.reason) + '</span>'
        + '</div>';
    }).join('');
    mask.innerHTML = ''
      + '<div style="background:var(--bg-surface);border-radius:var(--r-xl);max-width:520px;width:100%;padding:22px;box-shadow:0 12px 40px rgba(120,90,100,.22);max-height:82vh;display:flex;flex-direction:column;">'
      + '<h3 style="margin:0 0 6px;font-size:16px;color:var(--text-1);font-weight:600;">导入预览</h3>'
      + '<div style="font-size:12.5px;color:var(--text-2);line-height:1.8;margin-bottom:8px;">'
      + '共识别 <strong>' + raw.length + '</strong> 个 · 可导入 <strong style="color:var(--c-success);">' + acc.length + '</strong> 个'
      + ' · 重复（池内/本批）' + dups.length + ' 个 · 无效 ' + invalids.length + ' 个 · 剔除 ' + blocked.length + ' 个'
      + '</div>'
      + '<div style="overflow-y:auto;flex:1;min-height:0;border-top:1px solid var(--border-1);padding-top:6px;">'
      + (rows || '<div style="font-size:12.5px;color:var(--text-3);padding:6px 0;">没有需要剔除的达人，全部符合条件 ✓</div>')
      + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:14px;">'
      + '<button class="btn btn--ghost btn--sm" id="pool-preview-cancel" style="flex:1;justify-content:center;">取消</button>'
      + '<button class="btn btn--primary btn--sm" id="pool-preview-ok" style="flex:2;justify-content:center;"' + (acc.length ? '' : ' disabled style="opacity:.5;"') + '>确认导入 ' + acc.length + ' 个达人</button>'
      + '</div></div>';
    document.body.appendChild(mask);
    mask.querySelector('#pool-preview-cancel').addEventListener('click', function () { mask.remove(); });
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    mask.querySelector('#pool-preview-ok').addEventListener('click', function () {
      if (!poolState.preview || !poolState.preview.length) return;
      var n = Store.poolAdd(poolState.preview);
      poolState.preview = null;
      ta.value = '';
      mask.remove();
      poolState.page = { can: 1, sent: 1, ex: 1 };
      renderPool();
      App.showToast('已导入 ' + n + ' 个达人进池');
    });
  }

  function bindPoolEvents() {
    var top = document.getElementById('pool-top');
    if (!top) return;
    top.addEventListener('click', function (e) {
      var t = e.target;
      var skuBtn = t.closest('[data-pool-sku]');
      if (skuBtn) {
        poolState.sku = skuBtn.getAttribute('data-pool-sku');
        poolState.page = { can: 1, sent: 1, ex: 1 };
        renderPool();
        return;
      }
      if (t.hasAttribute('data-pool-more')) {
        var bk = t.getAttribute('data-pool-more');
        poolState.page[bk] = (poolState.page[bk] || 1) + 1;
        renderPool();
        return;
      }
      if (t.hasAttribute('data-pool-copy')) {
        var which = t.getAttribute('data-pool-copy');
        var res = poolCompute();
        var list = which === 'can' ? res.can.map(function (x) { return x.h; }) : res.sent.map(function (x) { return x.h; });
        if (!list.length) { App.showToast('没有可复制的达人'); return; }
        copyHandles(list, (which === 'can' ? '可发送' : '已发送') + ' ' + list.length + ' 个');
        return;
      }
      if (t.hasAttribute('data-pool-mark')) {
        var h1 = t.getAttribute('data-pool-mark');
        var d = prompt('标记「SKU ' + poolState.sku + '」已发日期（默认今天）', Store.todayStr());
        if (d === null) return;
        Store.poolSentMark(h1, poolState.sku, d, '');
        renderPool();
        return;
      }
      if (t.hasAttribute('data-pool-unmark')) {
        var h2 = t.getAttribute('data-pool-unmark');
        Store.poolSentUnmark(h2, poolState.sku);
        renderPool();
        return;
      }
      if (t.hasAttribute('data-pool-remove')) {
        var h3 = t.getAttribute('data-pool-remove');
        if (confirm('把 ' + h3 + ' 移出达人池？')) { Store.poolRemove(h3); renderPool(); }
        return;
      }
      if (t.hasAttribute('data-pool-clear')) {
        if (confirm('确认清空整个达人池（' + Store.poolList().length + ' 人）？不可恢复')) {
          Store.poolClear();
          renderPool();
        }
        return;
      }
      var chip = t.closest('.chip');
      if (chip && !t.hasAttribute('data-pool-mark') && !t.hasAttribute('data-pool-remove') && !t.hasAttribute('data-pool-unmark')) {
        var h4 = chip.getAttribute('data-handle');
        if (h4) App.copyToClipboard(h4, '已复制 ' + h4);
      }
    });
    var search = document.getElementById('pool-search');
    if (search) search.addEventListener('input', function () {
      poolState.q = search.value.trim().toLowerCase();
      poolState.page = { can: 1, sent: 1, ex: 1 };
      renderPool();
    });
    var btn = document.getElementById('btn-pool-import');
    if (btn) btn.addEventListener('click', poolImportFlow);
  }

  function switchTab(name) {
    var t1 = document.getElementById('tab-sample');
    var t2 = document.getElementById('tab-outreach');
    var t3 = document.getElementById('tab-designated');
    if (t1) t1.style.display = (name === 'sample') ? '' : 'none';
    if (t2) t2.style.display = (name === 'outreach') ? '' : 'none';
    if (t3) t3.style.display = (name === 'designated') ? '' : 'none';
    var btns = document.querySelectorAll('#roster-tabs [data-roster-tab]');
    [].forEach.call(btns, function (b) {
      var on = b.getAttribute('data-roster-tab') === name;
      b.className = 'btn btn--sm ' + (on ? 'btn--primary' : 'btn--ghost');
    });
    if (name === 'outreach') { renderReinvestAll(); }
    if (name === 'designated') renderDesAll();
    if (name === 'sample') { renderPool(); renderAutoAll(); }
  }

  /* ================= 模块二：复投名单（Excel 导入） ================= */
  function renderReinvestAll() {
    var list = document.getElementById('reinvest-list');
    if (!list) return;
    var data = global.DloodaReinvest;
    if (!data || !data.records) { list.innerHTML = '<p style="color:var(--text-3);">未加载复投数据</p>'; return; }
    var recs = data.records;
    var marks = (Store.getReinvest().marks) || {};
    var totalEl = document.getElementById('reinvest-total');
    var q = ((document.getElementById('reinvest-search') || {}).value || '').toLowerCase();
    var f = ((document.getElementById('reinvest-filter') || {}).value || '');

    // 先过滤
    var filtered = [];
    recs.forEach(function (r) {
      var hay = (r.handle + ' ' + (r.sku || '') + ' ' + (r.method || '') + ' ' + (r.type || '') + ' ' + (r.note || '')).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      var succ = (r.success || '');
      if (f === 'success' && succ.indexOf('✅') === -1) return;
      if (f === 'fail' && succ.indexOf('❌') === -1) return;
      if (f === 'marked' && !marks[r.id]) return;
      if (f === 'pending' && marks[r.id]) return;
      filtered.push(r);
    });
    if (totalEl) totalEl.textContent = (q || f ? filtered.length + ' 条匹配 / ' : '') + recs.length + ' 条总';

    // 分页
    var shown = filtered.slice(0, reinvestPage * reinvestStep);

    var html = [];
    shown.forEach(function (r) {
      var m = marks[r.id];
      var succ = (r.success || '');
      var succCls = succ.indexOf('✅') !== -1 ? 'badge--green' : (succ.indexOf('❌') !== -1 ? 'badge--danger' : '');
      html.push('<div class="reinvest-card" data-rid="' + App.escapeHtml(r.id) + '" style="border:1px solid var(--border);border-radius:12px;margin-bottom:10px;padding:10px 12px;">');
      html.push('  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">');
      html.push('    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">');
      html.push('      <strong style="font-size:13.5px;cursor:pointer;" data-re-copy="' + App.escapeHtml(r.id) + '" title="点击复制 ID">' + App.escapeHtml(r.handle) + '</strong>');
      if (r.sku) html.push('<span class="badge" style="font-size:11px;">SKU ' + App.escapeHtml(r.sku) + '</span>');
      if (r.type) html.push('<span class="badge" style="font-size:11px;">' + App.escapeHtml(r.type) + '</span>');
      if (succ) html.push('<span class="badge ' + succCls + '" style="font-size:11px;">' + App.escapeHtml(succ) + '</span>');
      if (r.level) html.push('<span class="badge" style="font-size:11px;">L' + App.escapeHtml(r.level) + '</span>');
      html.push('    </div>');
      html.push('    <div style="display:flex;gap:6px;align-items:center;">');
      if (r.script) html.push('<button class="btn btn--ghost btn--sm" data-re-script="' + App.escapeHtml(r.id) + '">话术</button>');
      html.push('<button class="btn btn--ghost btn--sm" data-re-mark="' + App.escapeHtml(r.id) + '">' + (m ? '改标记' : '标记') + '</button>');
      html.push('    </div>');
      html.push('  </div>');
      if (r.method) html.push('<div style="font-size:12px;color:var(--text-2);margin-top:4px;">复投方式：' + App.escapeHtml(r.method) + '</div>');
      if (r.note) html.push('<div style="font-size:12px;color:var(--text-2);margin-top:2px;">备注：' + App.escapeHtml(r.note) + '</div>');
      if (m) html.push('<div style="font-size:12px;color:var(--c-success);margin-top:2px;">本机标记：' + App.escapeHtml((m.status || '') + (m.date ? (' · ' + m.date) : '') + (m.note ? (' · ' + m.note) : '')) + '</div>');
      html.push('</div>');
    });
    if (filtered.length > shown.length) {
      html.push('<div style="text-align:center;padding:12px;"><button class="btn btn--ghost btn--sm" data-re-more>显示更多（剩 ' + (filtered.length - shown.length) + ' 条）</button></div>');
    }
    list.innerHTML = html.join('') || '<p style="color:var(--text-3);font-size:12.5px;">无匹配记录</p>';
  }

  function bindReinvestEvents() {
    var list = document.getElementById('reinvest-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var t = e.target;
        var rid = t.getAttribute('data-re-copy') || t.getAttribute('data-re-mark') ||
          t.getAttribute('data-re-script') || t.getAttribute('data-re-copy-script');
        if (!rid) return;
        if (t.hasAttribute('data-re-copy')) { App.copyToClipboard(rid, '已复制 ' + rid); return; }
        if (t.hasAttribute('data-re-copy-script')) {
          var rec0 = (DloodaReinvest.records || []).filter(function (r) { return r.id === rid; })[0];
          if (rec0 && rec0.script) App.copyToClipboard(rec0.script, '已复制话术');
          return;
        }
        if (t.hasAttribute('data-re-script')) {
          var card = t.closest('.reinvest-card');
          if (!card) return;
          var box = card.querySelector('.re-script-box');
          if (box) { box.parentNode.removeChild(box); return; }
          var rec = (DloodaReinvest.records || []).filter(function (r) { return r.id === rid; })[0];
          if (rec && rec.script) {
            var d = document.createElement('div');
            d.className = 're-script-box';
            d.style.cssText = 'margin-top:6px;font-size:12px;color:var(--text-2);white-space:pre-wrap;max-height:180px;overflow:auto;';
            d.textContent = rec.script;
            var b = document.createElement('button');
            b.className = 'btn btn--ghost btn--sm';
            b.textContent = '复制话术';
            b.setAttribute('data-re-copy-script', rid);
            d.appendChild(b);
            card.appendChild(d);
          }
          return;
        }
        if (t.hasAttribute('data-re-mark')) {
          var status = prompt('跟进状态（contacted 已联系 / sent 已寄样 / success 成功 / fail 未成功）', 'contacted');
          if (!status) return;
          var note = prompt('备注（可选）', '');
          if (note === null) return;
          Store.reinvestMark(rid, status, note, Store.todayStr());
          renderReinvestAll();
          return;
        }
        if (t.hasAttribute('data-re-more')) {
          reinvestPage += 1;
          renderReinvestAll();
          return;
        }
      });
    }
    var search = document.getElementById('reinvest-search');
    if (search) search.addEventListener('input', function () { reinvestPage = 1; renderReinvestAll(); });
    var filter = document.getElementById('reinvest-filter');
    if (filter) filter.addEventListener('change', function () { reinvestPage = 1; renderReinvestAll(); });
  }

  function bindTabs() {
    var tabs = document.getElementById('roster-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('[data-roster-tab]');
      if (!b) return;
      switchTab(b.getAttribute('data-roster-tab'));
    });
  }

  /* ---------- 初始化 ---------- */

  function renderAll() {
    Matcher.rebuild();
    var roster = Store.getRoster();
    // 用最新飞书数据刷新每条名单的基础档案判定（与 SKU 无关的部分）
    roster.forEach(function (r) {
      var res = Matcher.check(r.raw, '');
      r.cooperatedSkus = res.cooperatedSkus;
      r.feishu = res.creator;
      r.status = res.status;
      r.reason = res.reason;
    });
    Store.persist();
    renderSummary(null);
    renderTable(roster, false);
    renderGroups();
  }

  function init() {
    var settings = Store.getSettings();
    if (settings && settings.rosterCopyFormat) copyFormat = settings.rosterCopyFormat;

    initSkuSelects();
    updateCount();
    renderAll();
    syncFormatButtons();
    bindGroupActions();

    // 模块二：建联名单
    var obDate = document.getElementById('ob-date');
    if (obDate) obDate.value = Store.todayStr();
    bindTabs();
    bindObEvents();
    obUpdateCount();
    renderObAll();

    // 模块三：指定达人名单
    bindDesEvents();

    // 模块一：达人池 + 按 SKU 视图
    bindPoolEvents();
    renderPool();

    // 模块一 / 二：Excel 导入名单
    bindAutoEvents();
    renderAutoAll();
    bindReinvestEvents();

    // 云端同步：拉取后如有更新则重渲染本页
    if (Store.cloudPull) {
      Store.cloudPull(function (res) {
        if (res === 'applied') {
          renderAll();
          renderPool();
          renderAutoAll();
          renderObAll();
          renderReinvestAll();
          renderDesAll();
        }
      });
    }

    var ta = document.getElementById('roster-input');
    if (ta) ta.addEventListener('input', updateCount);

    var btnCheck = document.getElementById('btn-check-roster');
    if (btnCheck) btnCheck.addEventListener('click', checkPreview);

    var btnImport = document.getElementById('btn-import-roster');
    if (btnImport) btnImport.addEventListener('click', importRoster);

    var btnClear = document.getElementById('btn-clear-input');
    if (btnClear) btnClear.addEventListener('click', function () {
      if (ta) ta.value = '';
      previewResults = [];
      updateCount();
    });

    var btnExport = document.getElementById('btn-export-roster');
    if (btnExport) btnExport.addEventListener('click', exportRoster);

    // 复制格式切换
    var fmtBox = document.getElementById('copy-format-group');
    if (fmtBox) {
      fmtBox.addEventListener('click', function (e) {
        var b = e.target.closest('[data-format]');
        if (!b) return;
        copyFormat = b.getAttribute('data-format');
        Store.updateSettings({ rosterCopyFormat: copyFormat });
        syncFormatButtons();
        App.showToast('复制格式：' + b.textContent.trim());
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- 对外接口（供其他页面联动） ---------- */

  global.DloodaRoster = {
    refresh: renderAll,
    renderGroups: renderGroups,
    groupMembers: groupMembers,
    formatHandles: formatHandles,
    copyHandles: copyHandles,
    copyGroup: function (sku) {
      var m = groupMembers(Store.getRoster(), sku);
      copyHandles(m.ok.map(function (r) { return r.handle; }),
        'SKU ' + sku + ' 的 ' + m.ok.length + ' 个 handle');
      return m.ok.length;
    },
    setFormat: function (f) {
      copyFormat = f;
      Store.updateSettings({ rosterCopyFormat: f });
      syncFormatButtons();
    },
    getFormat: function () { return copyFormat; },
    // 模块二：建联名单
    renderOutreach: function () { renderObAll(); },
    openBatch: function (id) { obState.open = id; renderObBatches(); },
    // 模块一 / 二：Excel 导入名单
    renderAuto: function () { renderAutoAll(); },
    renderReinvest: function () { renderReinvestAll(); },
    // 模块三：指定达人名单
    renderDesignated: function () { renderDesAll(); },
    openDesignatedCard: function (id) { openDesCard(id); },
    switchTab: switchTab,
    parseOutreach: obParse,
    // 批量标记某组已发送 / 重置；返回影响条数
    markGroupSent: function (sku) {
      var m = groupMembers(Store.getRoster(), sku);
      var today = Store.todayStr();
      m.ok.forEach(function (r) { Store.markSent(r.id, sku, today); });
      renderAll();
      return m.ok.length;
    },
    resetGroupSent: function (sku) {
      var m = groupMembers(Store.getRoster(), sku);
      m.sent.forEach(function (x) { Store.unmarkSent(x.item.id, sku); });
      renderAll();
      return m.sent.length;
    },
  };

})(window);
