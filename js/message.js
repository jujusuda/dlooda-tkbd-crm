/* ================================================================
   Dlooda TKBD CRM — 私信管理 (v6)
   分类模板 CRUD · 中英西三语 · AI 润色翻译 · 写私信保存到场景
   ================================================================
   功能：
   1. 私信分类模板增删查改（localStorage 持久化）
   2. 点击分类展开三语话术（EN / 中文 / Español）
   3. 写私信：选SKU+场景+达人 → 润色翻译 → 保存到场景
   4. 点击已保存私信展开三语 Tab
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var Data = global.DloodaData;
  var Translator = global.DloodaTranslator;

  var STORAGE_CATEGORIES = 'dlooda_dm_categories';
  var STORAGE_SAVED_DMS  = 'dlooda_saved_dms';

  /* ---------- 默认分类模板（三语） ---------- */
  var DEFAULT_CATEGORIES = [
    {
      id: 'pre_video_ask',
      phase: '合作前',
      label: '问是否拍视频',
      desc: '寄样前确认达人是否愿意拍视频',
      templateEn: 'Hi {name}~ We just approved your sample request! Quick question — will you be posting a video once you receive it? Just want to make sure we\'re on the same page \u{1F60A}',
      templateZh: 'Hi {name}~ 我们刚通过你的样品申请啦！想问一下你收到样品后会拍视频发布吗？想提前确认一下\u{1F60A}',
      templateEs: 'Hi {name}~ \u00A1Acabamos de aprobar tu solicitud de muestra! Una pregunta \u2014 \u00BFpublicar\u00E1s un video cuando la recibas? Solo para asegurarnos \u{1F60A}',
    },
    {
      id: 'pre_tryon_ask',
      phase: '合作前',
      label: '是否上身展示',
      desc: '确认达人是否愿意上身试穿展示',
      templateEn: 'Hi {name}~ Will you be doing a try-on in your video? We\'d love to see how it looks on you! The fit is really flattering \u{1F60A}',
      templateZh: 'Hi {name}~ 你拍视频的时候会上身试穿展示吗？我们很期待看到你的上身效果！版型真的很显瘦\u{1F60A}',
      templateEs: 'Hi {name}~ \u00BFHar\u00E1s un try-on en tu video? \u00A1Nos encantar\u00EDa ver c\u00F3mo te queda! El corte es muy favorecedor \u{1F60A}',
    },
    {
      id: 'pre_buyback',
      phase: '合作前',
      label: '推荐买样返款',
      desc: '推荐达人买样返款合作模式',
      templateEn: 'Hi {name}~ We have a sample buyback promo going on! You place the order first, and once your video is posted, we\'ll refund the sample cost + commission. Interested? \u2728',
      templateZh: 'Hi {name}~ 我们现在有一个买样返款的活动！你先下单购买，视频发布后我们返还样品费用+佣金，有兴趣参加吗？\u2728',
      templateEs: 'Hi {name}~ \u00A1Tenemos una promo de reembolso de muestra! Haces el pedido primero, y cuando publiques el video, te devolvemos el costo + comisi\u00F3n. \u00BFTe interesa? \u2728',
    },
    {
      id: 'pre_auto_approve',
      phase: '合作前',
      label: '自动通过邀约',
      desc: '通知达人已自动通过样品申请',
      templateEn: 'Hi {name}~ Your sample request is auto-approved! \u{1F390} Can\'t wait to see your video once you receive it. Let me know if you need anything~',
      templateZh: 'Hi {name}~ 已经帮你自动通过样品申请啦\u{1F390} 收到样品后期待你的视频～ 有问题随时找我',
      templateEs: 'Hi {name}~ \u00A1Tu solicitud de muestra est\u00E1 aprobada autom\u00E1ticamente! \u{1F390} No veo la hora de ver tu video. Av\u00EDsame si necesitas algo~',
    },
    {
      id: 'post_reinvest',
      phase: '合作后',
      label: '复投推荐',
      desc: '给老达人推荐其他款合作',
      templateEn: 'Hi {name}~ Your video did sooo well \u{1F60D} We just launched a new piece and I immediately thought of you! Want to collab again? Already auto-approved for you~',
      templateZh: 'Hi {name}~ 你之前拍的视频数据超好\u{1F60D} 我们刚上了新品，感觉特别适合你！要不要再合作一次？已经帮你自动通过啦～',
      templateEs: 'Hola {name}~ Tu video funcion\u00F3 s\u00FAper bien \u{1F60D} Acabamos de lanzar una novedad y pens\u00E9 en ti inmediatamente. \u00BFQuieres colaborar otra vez? Ya aprobado~',
    },
    {
      id: 'post_reshoot',
      phase: '合作后',
      label: '视频敷衍重拍',
      desc: '达人视频拍摄敷衍，沟通重拍',
      templateEn: 'Hi {name}~ Thank you so much for the video! The content is great, but we think the try-on showcase could be even better. Would you be open to reshooting? Maybe show more of the fit and details? We\'d really appreciate it \u{1F64F}',
      templateZh: 'Hi {name}~ 感谢你拍了视频！内容很好，不过上身展示部分可能还可以更好一些，你愿意重新拍一条吗？可以多展示一下上身效果和细节～ 非常感谢\u{1F64F}',
      templateEs: 'Hi {name}~ \u00A1Gracias por el video! El contenido es genial, pero creemos que la parte del try-on podr\u00EDa mejorar. \u00BFEstar\u00EDas dispuesto/a a grabar de nuevo? Puedes mostrar m\u00E1s del ajuste y los detalles \u{1F64F}',
    },
    {
      id: 'post_push_video',
      phase: '合作后',
      label: '催更新视频',
      desc: '私信催达人发视频',
      templateEn: 'Hi {name}~ Just checking in! You received the sample a while ago — any idea when the video might go up? Super excited to see it! \u{1F338}',
      templateZh: 'Hi {name}~ 想跟你确认一下～ 样品收到有一段时间啦，视频大概什么时候可以发呢？超期待的\u{1F338}',
      templateEs: 'Hi {name}~ Solo chequeando! Recibiste la muestra hace un tiempo — \u00BFTienes una fecha estimada para el video? \u00A1Estoy s\u00FAper emocionado/a! \u{1F338}',
    },
    {
      id: 'post_email_push',
      phase: '合作后',
      label: '邮件催视频',
      desc: '邮件催达人更新视频',
      templateEn: 'Hi {name},\n\nThis is Dlooda. We noticed you received the sample a while ago but haven\'t posted the video yet. Could you let us know your estimated posting date? We\'re happy to support with any questions!\n\nBest,\nDlooda Team',
      templateZh: 'Hi {name}\uFF0C\n\n\u8FD9\u91CC\u662F Dlooda\u3002\u6211\u4EEC\u6CE8\u610F\u5230\u4F60\u6536\u5230\u6837\u54C1\u5DF2\u6709\u4E00\u6BB5\u65F6\u95F4\uFF0C\u4F46\u8FD8\u6CA1\u6709\u53D1\u5E03\u89C6\u9891\u3002\u80FD\u544A\u8BC9\u6211\u4EEC\u5927\u6982\u7684\u53D1\u5E03\u65F6\u95F4\u5417\uFF1F\u6709\u4EFB\u4F55\u95EE\u9898\u6211\u4EEC\u968F\u65F6\u652F\u6301\uFF01\n\nDlooda Team',
      templateEs: 'Hola {name},\n\nSoy de Dlooda. Notamos que recibiste la muestra hace un tiempo pero a\u00FAn no has publicado el video. \u00BFPodr\u00EDas decirnos tu fecha estimada de publicaci\u00F3n? \u00A1Estamos felices de ayudar con cualquier duda!\n\nSaludos,\nEquipo Dlooda',
    },
  ];

  /* ---------- 获取/保存分类（localStorage） ---------- */
  function getCategories() {
    var stored = App.loadStorage(STORAGE_CATEGORIES, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    App.saveStorage(STORAGE_CATEGORIES, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }

  function saveCategories(cats) {
    App.saveStorage(STORAGE_CATEGORIES, cats);
  }

  function findCategory(id) {
    return getCategories().find(function (c) { return c.id === id; });
  }

  function replaceName(text, name) {
    if (!text) return '';
    return text.replace(/\{name\}/g, name || 'there');
  }

  /* ================================================================
     渲染分类列表（点击展开三语 · 编辑 · 删除）
     ================================================================ */
  function renderCategoryList() {
    var container = document.getElementById('dm-category-list');
    if (!container) return;
    var cats = getCategories();
    var html = '';
    var currentPhase = '';

    cats.forEach(function (cat) {
      if (cat.phase !== currentPhase) {
        if (currentPhase) html += '</div>';
        html += '<div style="margin-bottom:12px;">'
          + '<div style="font-size:13px;font-weight:700;color:var(--pink-600);margin-bottom:8px;padding-left:4px;">'
          + App.escapeHtml(cat.phase) + '</div>';
        currentPhase = cat.phase;
      }

      html += '<div class="dm-cat-card" data-cat-id="' + App.escapeHtml(cat.id) + '">'
        + '<div class="dm-cat-card__header">'
        +   '<div class="dm-cat-card__info">'
        +     '<span class="dm-cat-card__label">' + App.escapeHtml(cat.label) + '</span>'
        +     '<span class="dm-cat-card__desc">' + App.escapeHtml(cat.desc || '') + '</span>'
        +   '</div>'
        +   '<div class="dm-cat-card__actions">'
        +     '<button class="btn-icon" data-action="edit" data-cat-id="' + App.escapeHtml(cat.id) + '" title="\u7F16\u8F91">\u270F\uFE0F</button>'
        +     '<button class="btn-icon" data-action="delete" data-cat-id="' + App.escapeHtml(cat.id) + '" title="\u5220\u9664">\u{1F5D1}\uFE0F</button>'
        +   '</div>'
        + '</div>'
        + '<div class="dm-cat-card__body" style="display:none;">'
        +   '<div class="dm-tabs">'
        +     '<button class="dm-tab dm-tab--active" data-lang="en" type="button">EN</button>'
        +     '<button class="dm-tab" data-lang="zh" type="button">\u4E2D\u6587</button>'
        +     '<button class="dm-tab" data-lang="es" type="button">Espa\u00F1ol</button>'
        +   '</div>'
        +   '<div class="dm-panels">'
        +     '<div class="dm-panel dm-panel--active" data-lang="en">'
        +       '<div class="ai-message-box">' + App.escapeHtml(cat.templateEn || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-cat="' + App.escapeHtml(cat.id) + '" data-copy-lang="en">\u590D\u5236</button>'
        +     '</div>'
        +     '<div class="dm-panel" data-lang="zh">'
        +       '<div class="ai-message-box">' + App.escapeHtml(cat.templateZh || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-cat="' + App.escapeHtml(cat.id) + '" data-copy-lang="zh">\u590D\u5236</button>'
        +     '</div>'
        +     '<div class="dm-panel" data-lang="es">'
        +       '<div class="ai-message-box">' + App.escapeHtml(cat.templateEs || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-cat="' + App.escapeHtml(cat.id) + '" data-copy-lang="es">\u590D\u5236</button>'
        +     '</div>'
        +   '</div>'
        + '</div>'
        + '</div>';
    });
    if (currentPhase) html += '</div>';

    container.innerHTML = html;

    // 点击分类信息区展开/折叠三语
    container.querySelectorAll('.dm-cat-card').forEach(function (card) {
      var infoEl = card.querySelector('.dm-cat-card__info');
      if (infoEl) {
        infoEl.addEventListener('click', function () {
          var body = card.querySelector('.dm-cat-card__body');
          if (body) {
            var isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
          }
        });
      }
      // 绑定语言 Tab
      App.bindLanguageTabs(card, ['en', 'zh', 'es'], 'en');
    });

    // 编辑按钮
    container.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openCategoryEdit(btn.getAttribute('data-cat-id'));
      });
    });

    // 删除按钮
    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteCategory(btn.getAttribute('data-cat-id'));
      });
    });

    // 复制按钮
    container.querySelectorAll('[data-copy-cat]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var catId   = btn.getAttribute('data-copy-cat');
        var lang    = btn.getAttribute('data-copy-lang');
        var cat     = findCategory(catId);
        if (!cat) return;
        var text = lang === 'en' ? cat.templateEn : lang === 'zh' ? cat.templateZh : cat.templateEs;
        App.copyToClipboard(text || '', '\u8BDD\u672F');
      });
    });
  }

  /* ================================================================
     填充分类下拉（写私信弹窗用）
     ================================================================ */
  function populateCategorySelect() {
    var sel = document.getElementById('dm-category');
    if (!sel) return;
    var cats = getCategories();
    var html = '<option value="">\u8BF7\u9009\u62E9\u79C1\u4FE1\u573A\u666F</option>';
    var currentPhase = '';
    cats.forEach(function (cat) {
      if (cat.phase !== currentPhase) {
        if (currentPhase) html += '</optgroup>';
        html += '<optgroup label="' + App.escapeHtml(cat.phase) + '">';
        currentPhase = cat.phase;
      }
      html += '<option value="' + App.escapeHtml(cat.id) + '">'
        + App.escapeHtml(cat.label) + ' \u2014 ' + App.escapeHtml(cat.desc || '')
        + '</option>';
    });
    if (currentPhase) html += '</optgroup>';
    sel.innerHTML = html;
  }

  /* ================================================================
     分类 CRUD：新建 / 编辑 / 删除
     ================================================================ */
  function openCategoryEdit(catId) {
    var cat = catId ? findCategory(catId) : null;
    document.getElementById('cat-edit-id').value     = catId || '';
    document.getElementById('cat-edit-label').value  = cat ? (cat.label || '')  : '';
    document.getElementById('cat-edit-desc').value   = cat ? (cat.desc || '')   : '';
    document.getElementById('cat-edit-phase').value  = cat ? (cat.phase || '\u5408\u4F5C\u524D') : '\u5408\u4F5C\u524D';
    document.getElementById('cat-edit-en').value     = cat ? (cat.templateEn || '') : '';
    document.getElementById('cat-edit-zh').value     = cat ? (cat.templateZh || '') : '';
    document.getElementById('cat-edit-es').value     = cat ? (cat.templateEs || '') : '';
    document.getElementById('category-edit-title').textContent = cat ? '\u7F16\u8F91\u5206\u7C7B' : '\u65B0\u5EFA\u5206\u7C7B';
    App.openModal('category-edit-modal');
  }

  function saveCategoryEdit() {
    var label = document.getElementById('cat-edit-label').value.trim();
    if (!label) { App.showToast('\u8BF7\u8F93\u5165\u5206\u7C7B\u540D\u79F0'); return; }

    var id = document.getElementById('cat-edit-id').value;
    var cats = getCategories();
    var data = {
      id:         id || ('cat_' + Date.now()),
      phase:      document.getElementById('cat-edit-phase').value,
      label:      label,
      desc:       document.getElementById('cat-edit-desc').value.trim(),
      templateEn: document.getElementById('cat-edit-en').value,
      templateZh: document.getElementById('cat-edit-zh').value,
      templateEs: document.getElementById('cat-edit-es').value,
    };

    var idx = cats.findIndex(function (c) { return c.id === data.id; });
    if (idx >= 0) {
      cats[idx] = data;
    } else {
      cats.push(data);
    }

    saveCategories(cats);
    App.closeModal('category-edit-modal');
    App.showToast('\u5206\u7C7B\u5DF2\u4FDD\u5B58 \u{1F390}');
    renderCategoryList();
    populateCategorySelect();
  }

  function deleteCategory(catId) {
    var cat = findCategory(catId);
    if (!cat) return;
    if (!confirm('\u786E\u5B9A\u5220\u9664\u5206\u7C7B\u300C' + cat.label + '\u300D\u5417\uFF1F')) return;
    var cats = getCategories().filter(function (c) { return c.id !== catId; });
    saveCategories(cats);
    App.showToast('\u5206\u7C7B\u5DF2\u5220\u9664');
    renderCategoryList();
    populateCategorySelect();
  }

  /* ================================================================
     写私信流程：选 SKU + 场景 + 达人 → 润色翻译 → 保存到场景
     ================================================================ */
  function openNewDMModal() {
    App.populateSkuSelect(document.getElementById('dm-sku'));
    populateCategorySelect();
    document.getElementById('dm-creator').value = '';
    App.openModal('new-dm-modal');
  }

  function handleManualDM() {
    var sku        = document.getElementById('dm-sku').value;
    var creator    = (document.getElementById('dm-creator').value || '').trim() || 'there';
    var categoryId = document.getElementById('dm-category').value;

    if (!categoryId) { App.showToast('\u8BF7\u9009\u62E9\u79C1\u4FE1\u573A\u666F'); return; }

    var cat = findCategory(categoryId);
    if (!cat) { App.showToast('\u627E\u4E0D\u5230\u5206\u7C7B'); return; }

    // 用分类的中文模板预填，替换 {name}
    var template = replaceName(cat.templateZh || '', creator);

    // 如果选了 SKU，附加产品信息
    var detail = sku ? Data.getSKUDetail(sku) : null;
    if (detail && detail.productName) {
      template = template + '\n\n\uFF08\u4EA7\u54C1\uFF1A' + detail.productName + '\uFF09';
    }

    // 存储上下文
    document.getElementById('manual-dm-sku').value          = sku;
    document.getElementById('manual-dm-creator-name').value = creator;
    document.getElementById('manual-dm-category-id').value  = categoryId;
    document.getElementById('manual-dm-text').value         = template;
    document.getElementById('dm-translate-result-area').innerHTML = '';

    App.closeModal('new-dm-modal');
    App.openModal('manual-dm-modal');
  }

  /* ================================================================
     AI 润色翻译
     ================================================================ */
  function handleAiTranslateDM() {
    var text = (document.getElementById('manual-dm-text') || {}).value || '';
    if (!text.trim()) { App.showToast('\u8BF7\u5148\u8F93\u5165\u4E2D\u6587\u5185\u5BB9'); return; }

    var sku     = (document.getElementById('manual-dm-sku') || {}).value || '';
    var creator = (document.getElementById('manual-dm-creator-name') || {}).value || '';
    var detail  = sku ? Data.getSKUDetail(sku) : null;

    var result = Translator.polishAndTranslate(text, 'dm', {
      creator: creator,
      sku: sku,
      detail: detail,
    });

    renderTranslateResult(result);
  }

  function renderTranslateResult(result) {
    var area = document.getElementById('dm-translate-result-area');
    if (!area) return;

    var languages = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Espa\u00F1ol' },
      { code: 'zh', label: '\u4E2D\u6587' },
    ];

    var tabsHtml = languages.map(function (lang, i) {
      return '<button class="dm-tab' + (i === 0 ? ' dm-tab--active' : '') + '" data-lang="' + lang.code + '" type="button">' + lang.label + '</button>';
    }).join('');

    var panelsHtml = languages.map(function (lang, i) {
      var text = result[lang.code] || result.en || '';
      return '<div class="dm-panel' + (i === 0 ? ' dm-panel--active' : '') + '" data-lang="' + lang.code + '">'
        + '<div class="ai-message-box">' + App.escapeHtml(text) + '</div>'
        + '<button class="btn btn--secondary btn--sm" style="margin-top:10px;" data-copy-lang="' + lang.code + '">\u590D\u5236</button>'
        + '</div>';
    }).join('');

    area.innerHTML = ''
      + '<div style="margin-top:12px;">'
      +   '<div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:8px;">AI \u6DA6\u8272\u7FFB\u8BD1\u7ED3\u679C</div>'
      +   '<div class="dm-tabs">' + tabsHtml + '</div>'
      +   '<div class="dm-panels">' + panelsHtml + '</div>'
      + '</div>';

    App.bindLanguageTabs(area, languages, 'en');

    area.querySelectorAll('button[data-copy-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-copy-lang');
        var text = result[lang] || result.en || '';
        App.copyToClipboard(text, '\u79C1\u4FE1');
      });
    });
  }

  /* ================================================================
     保存私信到场景
     ================================================================ */
  function saveManualDM() {
    var text = (document.getElementById('manual-dm-text') || {}).value || '';
    if (!text.trim()) { App.showToast('\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A'); return; }

    var sku        = (document.getElementById('manual-dm-sku') || {}).value || '';
    var creator    = (document.getElementById('manual-dm-creator-name') || {}).value || '';
    var categoryId = (document.getElementById('manual-dm-category-id') || {}).value || '';

    // 从翻译结果区提取各语言文本
    var translations = { en: '', zh: '', es: '' };
    var area = document.getElementById('dm-translate-result-area');
    if (area) {
      ['en', 'es', 'zh'].forEach(function (lang) {
        var panel = area.querySelector('.dm-panel[data-lang="' + lang + '"]');
        if (panel) {
          var box = panel.querySelector('.ai-message-box');
          if (box) translations[lang] = box.textContent;
        }
      });
    }

    // 没有翻译结果时，用草稿作为中文
    if (!translations.en && !translations.es) {
      translations.zh = text;
    }

    var cat = findCategory(categoryId);

    var saved = App.loadStorage(STORAGE_SAVED_DMS, []);
    saved.push({
      id:            'dm_' + Date.now(),
      sku:           sku,
      categoryId:    categoryId,
      categoryLabel: cat ? cat.label : '',
      creator:       creator,
      draft:         text,
      en:            translations.en,
      zh:            translations.zh,
      es:            translations.es,
      time:          new Date().toISOString(),
    });
    App.saveStorage(STORAGE_SAVED_DMS, saved);

    App.closeModal('manual-dm-modal');
    App.showToast('\u79C1\u4FE1\u5DF2\u4FDD\u5B58\u5230\u300C' + (cat ? cat.label : '\u573A\u666F') + '\u300D\u{1F390}');
    renderSavedList();
  }

  /* ================================================================
     渲染已保存的私信（点击展开三语 Tab）
     ================================================================ */
  function renderSavedList() {
    var container = document.getElementById('dm-saved-list');
    if (!container) return;
    var saved = App.loadStorage(STORAGE_SAVED_DMS, []);

    if (saved.length === 0) {
      container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px;">\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u79C1\u4FE1\uFF0C\u70B9\u51FB\u300C\u5199\u79C1\u4FE1\u300D\u521B\u5EFA\u5427~</div>';
      return;
    }

    container.innerHTML = saved.slice().reverse().map(function (item, idx) {
      var time = new Date(item.time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      var previewText = (item.en || item.zh || item.draft || '');
      var preview = previewText.substring(0, 120) + (previewText.length > 120 ? '...' : '');

      var badges = '';
      if (item.sku)           badges += '<span class="badge badge--pink">SKU ' + App.escapeHtml(item.sku) + '</span> ';
      if (item.categoryLabel) badges += '<span class="badge badge--sand">' + App.escapeHtml(item.categoryLabel) + '</span> ';
      if (item.creator)       badges += '<span class="badge badge--gray">@' + App.escapeHtml(item.creator) + '</span> ';

      return '<div class="dm-saved-item" data-dm-idx="' + idx + '">'
        + '<div class="dm-saved-item__header">' + badges
        +   '<span style="font-size:11px;color:var(--text-3);margin-left:auto;">' + time + '</span>'
        + '</div>'
        + '<div class="dm-saved-item__preview">' + App.escapeHtml(preview) + '</div>'
        + '<div class="dm-saved-item__body">'
        +   '<div class="dm-tabs">'
        +     '<button class="dm-tab dm-tab--active" data-lang="en" type="button">English</button>'
        +     '<button class="dm-tab" data-lang="zh" type="button">\u4E2D\u6587</button>'
        +     '<button class="dm-tab" data-lang="es" type="button">Espa\u00F1ol</button>'
        +   '</div>'
        +   '<div class="dm-panels">'
        +     '<div class="dm-panel dm-panel--active" data-lang="en">'
        +       '<div class="ai-message-box">' + App.escapeHtml(item.en || item.zh || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-dm="' + idx + '" data-copy-lang="en">\u590D\u5236</button>'
        +     '</div>'
        +     '<div class="dm-panel" data-lang="zh">'
        +       '<div class="ai-message-box">' + App.escapeHtml(item.zh || item.draft || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-dm="' + idx + '" data-copy-lang="zh">\u590D\u5236</button>'
        +     '</div>'
        +     '<div class="dm-panel" data-lang="es">'
        +       '<div class="ai-message-box">' + App.escapeHtml(item.es || '') + '</div>'
        +       '<button class="btn btn--secondary btn--sm" style="margin-top:8px;" data-copy-dm="' + idx + '" data-copy-lang="es">\u590D\u5236</button>'
        +     '</div>'
        +   '</div>'
        +   '<div style="display:flex;gap:6px;margin-top:10px;">'
        +     '<button class="btn btn--ghost btn--sm" data-delete-dm="' + idx + '">\u5220\u9664</button>'
        +   '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    // 点击展开/折叠
    container.querySelectorAll('.dm-saved-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        el.classList.toggle('dm-saved-item--expanded');
      });
      App.bindLanguageTabs(el, ['en', 'zh', 'es'], 'en');
    });

    // 复制按钮
    container.querySelectorAll('[data-copy-dm]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx  = parseInt(btn.getAttribute('data-copy-dm'));
        var lang = btn.getAttribute('data-copy-lang');
        var reversed = saved.slice().reverse();
        var item = reversed[idx];
        if (item) {
          var text = lang === 'en' ? (item.en || item.zh || '')
                   : lang === 'zh' ? (item.zh || item.draft || '')
                   : (item.es || '');
          App.copyToClipboard(text, '\u79C1\u4FE1');
        }
      });
    });

    // 删除按钮
    container.querySelectorAll('[data-delete-dm]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-delete-dm'));
        if (!confirm('\u786E\u5B9A\u5220\u9664\u8FD9\u6761\u79C1\u4FE1\u5417\uFF1F')) return;
        var reversed = saved.slice().reverse();
        var item = reversed[idx];
        if (!item) return;
        var realIdx = saved.findIndex(function (s) { return s.id === item.id; });
        if (realIdx >= 0) {
          saved.splice(realIdx, 1);
          App.saveStorage(STORAGE_SAVED_DMS, saved);
          App.showToast('\u5DF2\u5220\u9664');
          renderSavedList();
        }
      });
    });
  }

  /* ================================================================
     初始化
     ================================================================ */
  function init() {
    // 初始化分类（首次加载时将默认分类写入 localStorage）
    getCategories();

    renderCategoryList();
    renderSavedList();

    /* --- 写私信弹窗 --- */
    var newBtn = document.getElementById('btn-new-dm');
    if (newBtn) newBtn.addEventListener('click', openNewDMModal);

    var closeNewBtn = document.getElementById('btn-close-new-dm');
    if (closeNewBtn) closeNewBtn.addEventListener('click', function () { App.closeModal('new-dm-modal'); });
    var cancelNewBtn = document.getElementById('btn-cancel-new-dm');
    if (cancelNewBtn) cancelNewBtn.addEventListener('click', function () { App.closeModal('new-dm-modal'); });
    var manualBtn = document.getElementById('btn-manual-dm');
    if (manualBtn) manualBtn.addEventListener('click', handleManualDM);

    var newModal = document.getElementById('new-dm-modal');
    if (newModal) newModal.addEventListener('click', function (e) {
      if (e.target === newModal) App.closeModal('new-dm-modal');
    });

    /* --- 手动编辑弹窗 --- */
    var saveBtn = document.getElementById('btn-save-manual-dm');
    if (saveBtn) saveBtn.addEventListener('click', saveManualDM);
    var closeManualBtn = document.getElementById('btn-close-manual-dm');
    if (closeManualBtn) closeManualBtn.addEventListener('click', function () { App.closeModal('manual-dm-modal'); });
    var cancelManualBtn = document.getElementById('btn-cancel-manual-dm');
    if (cancelManualBtn) cancelManualBtn.addEventListener('click', function () { App.closeModal('manual-dm-modal'); });
    var translateBtn = document.getElementById('btn-ai-translate-dm');
    if (translateBtn) translateBtn.addEventListener('click', handleAiTranslateDM);

    var manualModal = document.getElementById('manual-dm-modal');
    if (manualModal) manualModal.addEventListener('click', function (e) {
      if (e.target === manualModal) App.closeModal('manual-dm-modal');
    });

    /* --- 分类编辑弹窗 --- */
    var addCatBtn = document.getElementById('btn-add-category');
    if (addCatBtn) addCatBtn.addEventListener('click', function () { openCategoryEdit(null); });
    var closeCatBtn = document.getElementById('btn-close-cat-edit');
    if (closeCatBtn) closeCatBtn.addEventListener('click', function () { App.closeModal('category-edit-modal'); });
    var cancelCatBtn = document.getElementById('btn-cancel-cat-edit');
    if (cancelCatBtn) cancelCatBtn.addEventListener('click', function () { App.closeModal('category-edit-modal'); });
    var saveCatBtn = document.getElementById('btn-save-cat-edit');
    if (saveCatBtn) saveCatBtn.addEventListener('click', saveCategoryEdit);

    var catModal = document.getElementById('category-edit-modal');
    if (catModal) catModal.addEventListener('click', function (e) {
      if (e.target === catModal) App.closeModal('category-edit-modal');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
