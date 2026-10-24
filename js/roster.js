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
