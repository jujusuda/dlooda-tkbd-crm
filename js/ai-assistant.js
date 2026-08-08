/* ================================================================
   Dlooda TKBD CRM — AI BD Assistant Engine
   五维评分 · 推荐SKU · 推荐佣金 · AI邀约 · AI跟进策略
   ================================================================
   评分体系（总分 100，严格遵守）：
     月销售件数   40
     女装垂度     20
     均播         15
     口播推广感   15
     女粉占比     10
   ✗ 不使用：粉丝数、国家、账号规模
   ✗ 不显示：S级/A级
   ✓ 显示：★★★★★ + 95/100
   ================================================================ */

(function (global) {
  'use strict';

  /* ---------- 评分权重配置 ---------- */
  var WEIGHTS = {
    monthlySales:  { name: '月销售件数', max: 40, unit: '件' },
    womenVertical: { name: '女装垂度',   max: 20, unit: '%' },
    avgViews:      { name: '均播',       max: 15, unit: '次' },
    promoSense:    { name: '口播推广感', max: 15, unit: '/5' },
    femaleRatio:   { name: '女粉占比',   max: 10, unit: '%' },
  };

  /* ---------- 分段评分函数 ---------- */
  // 通用：在分段内做线性插值
  function interpolate(value, tiers) {
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (value >= t.min && value < t.max) {
        var range = t.max - t.min;
        if (range === 0) return t.score[1];
        var ratio = (value - t.min) / range;
        return Math.round((t.score[0] + ratio * (t.score[1] - t.score[0])) * 10) / 10;
      }
    }
    // 超出最高段，取最高分
    return tiers[tiers.length - 1].score[1];
  }

  /* ---------- 五维评分分段定义 ---------- */
  // 每个维度按业务实际分布分段，可在后期根据真实数据调整

  var SALES_TIERS = [
    { min: 0,    max: 50,    score: [3, 8] },
    { min: 50,   max: 200,   score: [8, 18] },
    { min: 200,  max: 500,   score: [18, 28] },
    { min: 500,  max: 1000,  score: [28, 35] },
    { min: 1000, max: 2000,  score: [35, 39] },
    { min: 2000, max: Infinity, score: [39, 40] },
  ];

  var VERTICAL_TIERS = [
    { min: 0,  max: 30,  score: [2, 6] },
    { min: 30, max: 50,  score: [6, 10] },
    { min: 50, max: 70,  score: [10, 14] },
    { min: 70, max: 85,  score: [14, 17] },
    { min: 85, max: 100, score: [17, 20] },
  ];

  var VIEWS_TIERS = [
    { min: 0,     max: 5000,   score: [1, 4] },
    { min: 5000,  max: 20000,  score: [4, 7] },
    { min: 20000, max: 50000,  score: [7, 10] },
    { min: 50000, max: 100000, score: [10, 13] },
    { min: 100000, max: Infinity, score: [13, 15] },
  ];

  // 口播推广感 1-5 评分
  var PROMO_TIERS = [
    { min: 0, max: 1.5, score: [2, 4] },
    { min: 1.5, max: 2.5, score: [4, 7] },
    { min: 2.5, max: 3.5, score: [7, 10] },
    { min: 3.5, max: 4.5, score: [10, 13] },
    { min: 4.5, max: 5.1, score: [13, 15] },
  ];

  var FEMALE_TIERS = [
    { min: 0,  max: 20,  score: [1, 2] },
    { min: 20, max: 40,  score: [2, 4] },
    { min: 40, max: 60,  score: [4, 6] },
    { min: 60, max: 80,  score: [6, 8] },
    { min: 80, max: 100, score: [8, 10] },
  ];

  /* ---------- 核心评分函数 ---------- */

  function calculateScore(input) {
    // input: { monthlySales, womenVertical, avgViews, promoSense, femaleRatio }

    var salesScore    = interpolate(input.monthlySales,    SALES_TIERS);
    var verticalScore = interpolate(input.womenVertical,   VERTICAL_TIERS);
    var viewsScore    = interpolate(input.avgViews,        VIEWS_TIERS);
    var promoScore    = interpolate(input.promoSense,      PROMO_TIERS);
    var femaleScore   = interpolate(input.femaleRatio,     FEMALE_TIERS);

    var total = Math.round(salesScore + verticalScore + viewsScore + promoScore + femaleScore);

    return {
      total: total,
      breakdown: [
        { key: 'monthlySales',  name: WEIGHTS.monthlySales.name,  weight: WEIGHTS.monthlySales.max,  score: salesScore,    raw: input.monthlySales,    unit: WEIGHTS.monthlySales.unit },
        { key: 'womenVertical', name: WEIGHTS.womenVertical.name, weight: WEIGHTS.womenVertical.max, score: verticalScore, raw: input.womenVertical,   unit: WEIGHTS.womenVertical.unit },
        { key: 'avgViews',      name: WEIGHTS.avgViews.name,      weight: WEIGHTS.avgViews.max,      score: viewsScore,    raw: input.avgViews,        unit: WEIGHTS.avgViews.unit },
        { key: 'promoSense',    name: WEIGHTS.promoSense.name,    weight: WEIGHTS.promoSense.max,    score: promoScore,    raw: input.promoSense,      unit: WEIGHTS.promoSense.unit },
        { key: 'femaleRatio',   name: WEIGHTS.femaleRatio.name,   weight: WEIGHTS.femaleRatio.max,   score: femaleScore,   raw: input.femaleRatio,     unit: WEIGHTS.femaleRatio.unit },
      ],
    };
  }

  /* ---------- 推荐佣金 ---------- */

  function recommendCommission(score, sku) {
    // 优先使用 SKU 的默认佣金（来自真实飞书邀约数据）
    if (sku && sku.defaultCommission) {
      return sku.defaultCommission;
    }
    // 历史兜底
    return '15% + 8%';
  }

  /* ---------- AI 邀约话术 & 私信生成 ---------- */
  // 风格：
  //   1) 邀约邮件 = Hook（第一句/主题） + 品牌与产品介绍 + 佣金 + CTA
  //   2) 私信 = 简短、热情、像真人，中英西三语

  var INVITE_HOOKS = [
    { subject: '【Fall Favorite Returns — Limited-Time Bonus Event】', useHook: true },
    { subject: 'Fall Upgrade Is Here — Limited-Time Bonus Commission', useHook: true },
    { subject: 'Our Best-Selling {product} Are Back', useHook: true },
    { subject: 'A Fall Staple for Everyday Styling', useHook: true },
    { subject: 'New Collab — {product} for Your Page', useHook: true },
    { subject: '', useHook: false }, // 有时没有 hook，直接打招呼
  ];

  function pick(arr, idx) {
    return arr[idx % arr.length];
  }

  function generateInvitation(input, score, skus, variantIndex) {
    variantIndex = variantIndex || 0;
    var name = input.name || 'there';
    var topSku = skus && skus.length > 0 ? skus[0] : null;
    var productName = topSku ? topSku.productName : 'this piece';
    var productDesc = topSku ? topSku.productDesc : 'flattering fit, soft fabric, easy to style';
    var commission = topSku ? recommendCommission(score, topSku) : '15% + 8%';

    var hook = pick(INVITE_HOOKS, variantIndex);
    var subjectLine = hook.subject ? hook.subject.replace(/\{product\}/g, productName) + '\n' : '';

    var greeting = 'Hi~ This is Dlooda.';
    if (name && name !== 'there') {
      greeting = 'Hi ' + name + '~ This is Dlooda.';
    }

    // 产品主体：根据评分调整语气
    var body;
    if (score >= 85) {
      body = 'Our ' + productName + ' are back for the season! Featuring ' + productDesc + ', they create an effortless look while staying soft, comfortable, and easy to style. We think they\'d be a great match for your page and can\'t wait to see how you style them.';
    } else if (score >= 65) {
      body = 'We\'d love to introduce our ' + productName + '. Featuring ' + productDesc + ', they\'re perfect for everyday outfits, casual looks, and seasonal content. We think they\'d be a great match for your style!';
    } else {
      body = 'We came across your content and thought our ' + productName + ' would be a great fit for your style. With ' + productDesc + ', they\'re easy to wear and perfect for everyday content.';
    }

    var closing = commission + ' commission with ad support — Feel free to apply!';

    var email = subjectLine + greeting + '\n' + body + '\n' + closing;

    // 私信版本（中英西三语）
    var dm = generateDirectMessages(name, productName, productDesc, commission, variantIndex, score);

    return {
      email: email,
      dm: dm,
      variantIndex: variantIndex,
    };
  }

  function generateDirectMessages(name, productName, productDesc, commission, variantIndex, score) {
    var shortName = (name || 'there').split(/[\.\s]/)[0];
    var productShort = productName.replace(/^Best-Selling /, '').replace(/^High-Waisted /, '').replace(/^Upgraded /, '').replace(/^Layered /, '').replace(/^Clean /, '');
    var pastProduct = productShort.toLowerCase().includes('skort') ? 'skort' :
                      productShort.toLowerCase().includes('pants') ? 'work pants' :
                      productShort.toLowerCase().includes('jeans') ? 'jeans' :
                      productShort.toLowerCase().includes('skirt') ? 'skirt' : 'piece';
    var newProduct = productShort;

    var en, zh, es;

    if (variantIndex % 3 === 0) {
      en = 'Hi ' + shortName + '~ Your ' + pastProduct + ' video did sooo well before 😍 And honestly, you looked amazing in them! The moment I saw this ' + newProduct + ', I immediately thought of you — I feel like the try-on effect would be even crazier on your page 👀 Already auto-approved for you~';
      zh = 'Hi ' + shortName + '~ 你之前拍的' + pastProduct + '视频数据超好😍 而且你穿起来真的很好看！我一看到这个' + newProduct + '就想到你了，感觉在你的页面试穿效果会更炸👀 已经帮你自动通过啦～';
      es = 'Hola ' + shortName + '~ Tu video del ' + pastProduct + ' funcionó súper bien antes 😍 Y honestamente te veías increíble. En cuanto vi este ' + newProduct + ' pensé en ti, creo que se vería aún mejor en tu página 👀 Ya te lo aprobé automáticamente~';
    } else if (variantIndex % 3 === 1) {
      en = 'Hey ' + shortName + '! Just saw your latest post and I’m obsessed 🙌 This ' + newProduct + ' is totally your vibe — soft, flattering, and super camera-friendly. Want me to send one over? Auto-approved ✨';
      zh = 'Hey ' + shortName + '! 刚刷到你最新帖子，太喜欢了🙌 这个' + newProduct + '完全就是为你准备的——舒服、显瘦、上镜。要我给你寄一件吗？已经自动通过啦✨';
      es = 'Hey ' + shortName + '! Acabo de ver tu último post y me encantó 🙌 Este ' + newProduct + ' es totalmente tu estilo — suave, favorecedor y queda genial en cámara. ¿Te mando uno? Ya aprobado ✨';
    } else {
      en = shortName + ' ~ I have a feeling this ' + newProduct + ' is going to look SO good on you 🌸 The fit is giving exactly the energy your page loves. Auto-approved, just say the word!';
      zh = shortName + ' ~ 我预感这个' + newProduct + '穿在你身上会超好看🌸 版型就是你账号会爱的那种。已经自动通过，你说一声就寄！';
      es = shortName + ' ~ Tengo la corazonada de que este ' + newProduct + ' te va a quedar INCREÍBLE 🌸 El corte tiene justo la onda que le encanta a tu página. Ya aprobado, ¡solo dime!';
    }

    // 佣金提示（仅在分数较高时追加，保持私信简短）
    if (score >= 75) {
      var commissionNoteEn = '\n\n(' + commission + ' commission with ad support)';
      en += commissionNoteEn;
      zh += '\n\n（佣金' + commission + '，含广告支持）';
      es += '\n\n(' + commission + ' de comisión con soporte de ads)';
    }

    return { en: en, zh: zh, es: es };
  }

  /* ---------- AI 跟进策略生成 ---------- */

  function generateFollowUpStrategy(input, score, skus) {
    var strategies = [];
    var name = input.name || '达人';

    if (score >= 85) {
      strategies.push({
        phase: '第一步 · 24h内',
        action: '直接发邀约 + 产品图 + 佣金方案',
        detail: name + ' 数据优质，抢时间窗口。发完邀约后 24h 没回就私信跟进一次，话术轻松「在吗～上面那条消息看到了吗」',
      });
      strategies.push({
        phase: '第二步 · 寄样后',
        action: '48h 内确认收货 + 软性催视频',
        detail: '确认收到样品后，不要催太紧。隔 2 天问「款式还喜欢吗～ 有什么需要随时说」，再隔 3 天可以聊拍摄计划',
      });
      strategies.push({
        phase: '第三步 · 视频发布后',
        action: '盯数据 + 提复投',
        detail: '视频发布 48h 内盯播放量和转化。如果 ROI > 2 直接聊复投 + 加量。同时准备第二款 SKU 做接力',
      });
      strategies.push({
        phase: '长期维护',
        action: '固定节奏互动 + 独家佣金',
        detail: '每月至少互动 2 次（点赞/评论/私信）。给出专属佣金码或独家款，建立粘性。考虑月框合作',
      });
    } else if (score >= 65) {
      strategies.push({
        phase: '第一步 · 48h内',
        action: '发邀约 + 产品图，留出思考空间',
        detail: name + ' 有潜力但不紧急。发完邀约后给 48h 思考时间，没回就换一个角度再发：「这个款我手上只有少量名额，优先给你留了」',
      });
      strategies.push({
        phase: '第二步 · 寄样后',
        action: '确认收货 + 引导拍摄方向',
        detail: '收到样品后主动给拍摄建议：「这个款搭 XX 风格效果比较好，你可以试试」。降低她的创作门槛',
      });
      strategies.push({
        phase: '第三步 · 视频发布后',
        action: '看效果决定复投',
        detail: '如果首条效果 OK（ROI > 1.5），趁热打铁聊第二款。如果效果一般，不急着复投，保持互动等下一波',
      });
      strategies.push({
        phase: '长期维护',
        action: '定期触达 + 观察数据变化',
        detail: '每 2 周互动一次，关注她的数据增长。如果某个月数据明显提升，立刻重新评估评分和合作策略',
      });
    } else {
      strategies.push({
        phase: '第一步 · 本周内',
        action: '先建联，低压力接触',
        detail: name + ' 数据还在成长期，不要急于谈合作。先点赞几条视频 + 评论互动，混个脸熟再私信',
      });
      strategies.push({
        phase: '第二步 · 2 周后',
        action: '自然地推荐产品',
        detail: '互动 2-3 次后再发邀约：「最近上新了几个款觉得你会喜欢～」如果她回应积极再聊寄样',
      });
      strategies.push({
        phase: '第三步 · 持续观察',
        action: '放入观察池，定期评分',
        detail: '即使暂时不合作，也持续关注数据。如果月销售或均播有明显增长，重新跑评分，随时升级合作策略',
      });
    }

    return strategies;
  }

  /* ---------- AI 合作建议 ---------- */

  function generateCooperationAdvice(input, score) {
    var advice = [];

    if (score >= 85) {
      advice.push('✅ 强烈推荐合作。数据表现优异，女装垂度高，转化能力突出。');
      advice.push('✅ 建议直接谈长期合作框架，首批寄样 2-3 款同时推进。');
      advice.push('⚠️ 注意：头部达人排期可能紧张，需提前 1-2 周沟通档期。');
    } else if (score >= 65) {
      advice.push('✅ 推荐合作，有明确潜力。建议先单款试水，跑出数据再扩大。');
      advice.push('✅ 重点引导拍摄方向，降低达人创作成本有助于提高出片率。');
      if (input.promoSense >= 4) {
        advice.push('✅ 口播推广感强，适合做带讲解的种草视频，转化效果会更好。');
      }
    } else {
      advice.push('⚠️ 暂缓合作，建议放入观察池持续跟踪。');
      advice.push('⚠️ 当前数据偏弱，可先做互动建联，等数据提升后再谈合作。');
      if (input.womenVertical >= 80) {
        advice.push('✅ 但女装垂度较高，风格匹配度不错，值得长期观察。');
      }
    }

    // 根据女粉占比补充建议
    if (input.femaleRatio >= 80) {
      advice.push('✅ 女粉占比 ' + input.femaleRatio + '%，受众精准，适合直接推女装主款。');
    } else if (input.femaleRatio < 50) {
      advice.push('⚠️ 女粉占比偏低（' + input.femaleRatio + '%），女装转化可能受限，需评估。');
    }

    return advice.join('\n');
  }

  /* ---------- 完整分析函数 ---------- */

  function analyze(input, variantIndex) {
    variantIndex = variantIndex || 0;
    var scoreResult = calculateScore(input);

    // 如果用户指定了 SKU，用该 SKU 生成话术；否则自动推荐
    var skus;
    if (input.selectedSku) {
      var specific = global.DloodaData.getSKUByCode(input.selectedSku);
      skus = specific ? [specific] : global.DloodaData.getRecommendedSKUs(input.contentType, scoreResult.total);
    } else {
      skus = global.DloodaData.getRecommendedSKUs(input.contentType, scoreResult.total);
    }

    var invitation = generateInvitation(input, scoreResult.total, skus, variantIndex);
    var followUp = generateFollowUpStrategy(input, scoreResult.total, skus);
    var advice = generateCooperationAdvice(input, scoreResult.total);

    return {
      score: scoreResult.total,
      breakdown: scoreResult.breakdown,
      stars: global.DloodaApp.scoreToStars(scoreResult.total),
      recommendedSKUs: skus.map(function (sku) {
        return {
          sku: sku.sku,
          positioning: sku.positioning,
          productId: sku.productId,
          productName: sku.productName,
          commission: recommendCommission(scoreResult.total, sku),
        };
      }),
      invitation: invitation.email,
      directMessages: invitation.dm,
      variantIndex: invitation.variantIndex,
      followUpStrategy: followUp,
      advice: advice,
    };
  }

  /* ---------- 导出 ---------- */
  global.DloodaAI = {
    WEIGHTS: WEIGHTS,
    calculateScore: calculateScore,
    recommendCommission: recommendCommission,
    generateInvitation: generateInvitation,
    generateDirectMessages: generateDirectMessages,
    generateFollowUpStrategy: generateFollowUpStrategy,
    generateCooperationAdvice: generateCooperationAdvice,
    analyze: analyze,
  };

})(window);

/* ================================================================
   AI Assistant Page Controller
   表单提交 · 结果渲染 · 达人预填 · 保存CRM
   ================================================================ */

(function (global) {
  'use strict';

  var App = global.DloodaApp;
  var AI = global.DloodaAI;
  var Data = global.DloodaData;

  var lastAnalysis = null;

  /* ---------- 从表单收集输入 ---------- */
  function collectInput() {
    return {
      name:           val('input-name'),
      tiktokUrl:      val('input-tiktok'),
      contentType:    val('input-content-type'),
      remark:         val('input-remark'),
      selectedSku:    val('input-sku'),
      monthlySales:   parseFloat(val('input-sales')) || 0,
      womenVertical:  parseFloat(val('input-vertical')) || 0,
      avgViews:       parseFloat(val('input-views')) || 0,
      promoSense:     parseFloat(val('input-promo')) || 0,
      femaleRatio:    parseFloat(val('input-female')) || 0,
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value != null ? value : '';
  }

  /* ---------- 渲染分析结果 ---------- */
  function renderResult(result, input) {
    var panel = document.getElementById('ai-result');
    if (!panel) return;

    // 评分展示
    var scoreHtml = ''
      + '<div class="ai-section fade-in-up">'
      +   '<div class="score-display" style="margin-bottom:24px;">'
      +     '<div class="score-display__stars">' + result.stars + '</div>'
      +     '<div class="score-display__value">' + result.score + '<span>/100</span></div>'
      +     '<div class="score-display__label">Creator Score</div>'
      +   '</div>'
      + '</div>';

    // 评分拆解
    var breakdownHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-1">'
      +   '<div class="ai-section__title">五维评分拆解</div>'
      +   '<div class="score-breakdown">'
      +     result.breakdown.map(function (b) {
          var pct = (b.score / b.weight) * 100;
          return ''
            + '<div class="score-breakdown__item">'
            +   '<div class="score-breakdown__header">'
            +     '<span class="score-breakdown__name">' + b.name + '<span class="weight-tag">' + b.weight + '分</span></span>'
            +     '<span class="score-breakdown__score">' + b.score + '<span>/' + b.weight + '</span></span>'
            +   '</div>'
            +   '<div class="score-bar"><div class="score-bar__fill" style="width:' + pct + '%"></div></div>'
            + '</div>';
        }).join('')
      +   '</div>'
      + '</div>';

    // 推荐 SKU
    var skuHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-2">'
      +   '<div class="ai-section__title">推荐产品 & 佣金</div>'
      +   result.recommendedSKUs.map(function (sku) {
          var posColor = sku.positioning === '爆品' ? 'var(--pink-500)' :
                         sku.positioning === '销售' ? 'var(--c-success)' :
                         sku.positioning === '测品' ? 'var(--c-info)' : 'var(--text-3)';
          return ''
            + '<div class="ai-sku-card" style="margin-bottom:8px;">'
            +   '<div class="ai-sku-card__info">'
            +     '<div class="ai-sku-card__name">' + App.escapeHtml(sku.productName || ('SKU ' + sku.sku)) + '</div>'
            +     '<div class="ai-sku-card__id"><span class="tag" style="background:' + posColor + ';color:#fff;font-size:10px;">' + App.escapeHtml(sku.positioning || '') + '</span> SKU ' + App.escapeHtml(sku.sku) + '</div>'
            +   '</div>'
            +   '<div class="ai-sku-card__commission">' + sku.commission + '</div>'
            + '</div>';
        }).join('')
      + '</div>';

    // AI 合作建议
    var adviceHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-2">'
      +   '<div class="ai-section__title">AI 合作建议</div>'
      +   '<div class="ai-suggestion-box" style="white-space:pre-wrap;">' + App.escapeHtml(result.advice) + '</div>'
      + '</div>';

    // AI 邀约话术（邮件/站内信版本）
    var inviteHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-3">'
      +   '<div class="ai-section__title">AI 邀约话术</div>'
      +   '<div class="ai-message-box" id="ai-invite-box">' + App.escapeHtml(result.invitation) + '</div>'
      +   '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">'
      +     '<button class="btn btn--secondary btn--sm" id="btn-copy-invite">复制话术</button>'
      +     '<button class="btn btn--ghost btn--sm" id="btn-regen-invite">换一个</button>'
      +   '</div>'
      + '</div>';

    // AI 私信版本（中英西三语）
    var dm = result.directMessages || { en: '', zh: '', es: '' };
    var dmHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-3">'
      +   '<div class="ai-section__title">AI 私信版本 <span style="font-size:11px;font-weight:400;color:var(--text-3);">简短热情 · 中英西</span></div>'
      +   '<div class="dm-tabs">'
      +     '<button class="dm-tab dm-tab--active" data-lang="en" type="button">EN</button>'
      +     '<button class="dm-tab" data-lang="zh" type="button">中文</button>'
      +     '<button class="dm-tab" data-lang="es" type="button">Español</button>'
      +   '</div>'
      +   '<div class="dm-panels">'
      +     '<div class="dm-panel dm-panel--active" data-lang="en">'
      +       '<div class="ai-message-box">' + App.escapeHtml(dm.en) + '</div>'
      +       '<button class="btn btn--secondary btn--sm" style="margin-top:10px;" data-copy="dm-en">复制英文</button>'
      +     '</div>'
      +     '<div class="dm-panel" data-lang="zh">'
      +       '<div class="ai-message-box">' + App.escapeHtml(dm.zh) + '</div>'
      +       '<button class="btn btn--secondary btn--sm" style="margin-top:10px;" data-copy="dm-zh">复制中文</button>'
      +     '</div>'
      +     '<div class="dm-panel" data-lang="es">'
      +       '<div class="ai-message-box">' + App.escapeHtml(dm.es) + '</div>'
      +       '<button class="btn btn--secondary btn--sm" style="margin-top:10px;" data-copy="dm-es">复制西语</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';

    // AI 跟进策略
    var followUpHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-3">'
      +   '<div class="ai-section__title">AI 跟进策略</div>'
      +   result.followUpStrategy.map(function (s) {
          return ''
            + '<div style="margin-bottom:12px;padding:12px;background:var(--bg-pink-soft);border-radius:8px;border:1px solid var(--pink-100);">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--pink-600);margin-bottom:4px;">' + App.escapeHtml(s.phase) + '</div>'
            +   '<div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:4px;">' + App.escapeHtml(s.action) + '</div>'
            +   '<div style="font-size:12px;color:var(--text-2);line-height:1.7;">' + App.escapeHtml(s.detail) + '</div>'
            + '</div>';
        }).join('')
      + '</div>';

    // 保存按钮
    var saveHtml = ''
      + '<div class="ai-section fade-in-up fade-in-up-delay-3">'
      +   '<button class="btn btn--primary btn--block" id="btn-save-crm">保存到 CRM</button>'
      + '</div>';

    panel.innerHTML = scoreHtml + breakdownHtml + skuHtml + adviceHtml + inviteHtml + dmHtml + followUpHtml + saveHtml;

    // 绑定按钮
    bindResultButtons(input, result);
  }

  /* ---------- 绑定结果区按钮 ---------- */
  function bindResultButtons(input, result) {
    var panel = document.getElementById('ai-result');

    function copyText(text, label) {
      if (global.navigator.clipboard) {
        global.navigator.clipboard.writeText(text).then(function () {
          App.showToast(label + ' 已复制 🎀');
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        App.showToast(label + ' 已复制 🎀');
      }
    }

    // 复制邀约话术
    var copyBtn = document.getElementById('btn-copy-invite');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(result.invitation, '邀约话术');
      });
    }

    // 重新生成话术（循环变体）
    var regenBtn = document.getElementById('btn-regen-invite');
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        var nextVariant = (result.variantIndex || 0) + 1;
        var newResult = AI.analyze(input, nextVariant);
        // 只更新话术相关字段
        result.invitation = newResult.invitation;
        result.directMessages = newResult.directMessages;
        result.variantIndex = newResult.variantIndex;

        var inviteBox = document.getElementById('ai-invite-box');
        if (inviteBox) inviteBox.textContent = result.invitation;

        var dm = result.directMessages || { en: '', zh: '', es: '' };
        updateDmPanel('en', dm.en);
        updateDmPanel('zh', dm.zh);
        updateDmPanel('es', dm.es);

        App.showToast('已生成第 ' + (nextVariant + 1) + ' 版话术 ✨');
      });
    }

    function updateDmPanel(lang, text) {
      var p = panel.querySelector('.dm-panel[data-lang="' + lang + '"] .ai-message-box');
      if (p) p.textContent = text;
    }

    // 私信多语言 tab 切换
    var tabs = panel.querySelectorAll('.dm-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var lang = tab.getAttribute('data-lang');
        tabs.forEach(function (t) { t.classList.remove('dm-tab--active'); });
        tab.classList.add('dm-tab--active');
        panel.querySelectorAll('.dm-panel').forEach(function (p) {
          p.classList.toggle('dm-panel--active', p.getAttribute('data-lang') === lang);
        });
      });
    });

    // 复制各语言私信
    panel.querySelectorAll('button[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-copy');
        var text = '';
        var label = '';
        if (key === 'dm-en') { text = result.directMessages.en; label = '英文私信'; }
        else if (key === 'dm-zh') { text = result.directMessages.zh; label = '中文私信'; }
        else if (key === 'dm-es') { text = result.directMessages.es; label = '西语私信'; }
        copyText(text, label);
      });
    });

    // 保存到 CRM
    var saveBtn = document.getElementById('btn-save-crm');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var existing = Data.getCreatorByName(input.name);
        if (existing) {
          Data.saveAnalysis(input.name, {
            score: result.score,
            recommendedSku: result.recommendedSKUs[0] ? result.recommendedSKUs[0].sku : null,
          });
          App.showToast('已更新 ' + input.name + ' 的分析结果');
        } else {
          App.showToast('达人 ' + input.name + ' 不在飞书数据库中，评分已记录');
        }
      });
    }
  }

  /* ---------- 从达人列表预填表单 ---------- */
  function loadFromCreator() {
    var creatorName = App.getQueryParam('creator');
    if (!creatorName) return;
    creatorName = decodeURIComponent(creatorName);

    var creator = Data.getCreatorByName(creatorName);
    if (!creator) return;

    // 填入基本信息
    setVal('input-name', creator.name);
    setVal('input-content-type', creator.category || '');
    setVal('input-remark', creator.note || '');

    // 基于飞书数据推断评分维度建议值
    var suggestion = Data.getScoringSuggestion(creatorName);
    if (suggestion) {
      setVal('input-vertical', suggestion.womenVertical);
      setVal('input-promo', suggestion.promoSense);
    }

    // 显示飞书达人资料卡
    showCreatorProfile(creator);

    // 自动触发分析
    setTimeout(function () {
      var analyzeBtn = document.getElementById('btn-analyze');
      if (analyzeBtn) analyzeBtn.click();
    }, 100);
  }

  /* ---------- 显示飞书达人资料 ---------- */
  function showCreatorProfile(creator) {
    var container = document.getElementById('creator-profile');
    if (!container) return;

    var badges = '';
    if (creator.official) {
      var cls = 'badge--gray';
      if (creator.official === 'L5' || creator.official === 'L6') cls = 'badge--pink';
      else if (creator.official === 'L4') cls = 'badge--blue';
      else if (creator.official === 'L3') cls = 'badge--green';
      badges += '<span class="badge ' + cls + '">' + App.escapeHtml(creator.official) + '</span>';
    }
    if (creator.stars) badges += '<span class="badge badge--sand">' + App.escapeHtml(creator.stars) + '</span>';
    if (creator.creatorType) {
      var tcls = creator.creatorType.indexOf('核心') >= 0 ? 'badge--pink' :
                 creator.creatorType.indexOf('潜力') >= 0 ? 'badge--blue' : 'badge--gray';
      badges += '<span class="badge ' + tcls + '">' + App.escapeHtml(creator.creatorType.split(',')[0]) + '</span>';
    }
    if (creator.fulfillment) {
      var fcls = creator.fulfillment === '诚信' ? 'badge--green' : 'badge--sand';
      badges += '<span class="badge ' + fcls + '">' + App.escapeHtml(creator.fulfillment) + '</span>';
    }

    var info = '';
    if (creator.bodyType) info += '<span class="creator-card__meta-item">身材: ' + App.escapeHtml(creator.bodyType) + '</span>';
    if (creator.age) info += '<span class="creator-card__meta-item">年龄: ' + App.escapeHtml(creator.age) + '</span>';
    if (creator.category) info += '<span class="creator-card__meta-item">品类: ' + App.escapeHtml(creator.category) + '</span>';
    if (creator.sampleCount) info += '<span class="creator-card__meta-item">寄样: ' + creator.sampleCount + '次</span>';
    if (creator.videoCount) info += '<span class="creator-card__meta-item">视频: ' + creator.videoCount + '个</span>';
    if (creator.skus && creator.skus.length > 0) info += '<span class="creator-card__meta-item">SKU: ' + creator.skus.slice(0, 3).join(', ') + '</span>';

    var noteHtml = creator.note ? '<div style="margin-top:6px;font-size:12px;color:var(--text-tertiary);">备注: ' + App.escapeHtml(creator.note) + '</div>' : '';

    container.innerHTML = ''
      + '<div class="card" style="margin-bottom:16px;background:var(--bg-pink-soft);">'
      +   '<div style="font-size:12px;color:var(--pink-600);font-weight:600;margin-bottom:8px;">飞书达人资料</div>'
      +   '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
      +     '<div class="creator-card__avatar">' + App.getInitials(creator.name) + '</div>'
      +     '<div>'
      +       '<div style="font-weight:700;font-size:15px;color:var(--text-1);">@' + App.escapeHtml(creator.name) + '</div>'
      +       '<div class="creator-card__meta">' + badges + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="creator-card__meta">' + info + '</div>'
      +   noteHtml
      + '</div>';
    container.style.display = 'block';
  }

  /* ---------- 填充 SKU 下拉框 ---------- */
  function populateSkuSelect() {
    var sel = document.getElementById('input-sku');
    if (!sel) return;

    var details = Data.getAllSKUDetails();
    // 按优先级排序：high > medium > low
    var priorityOrder = { high: 0, medium: 1, low: 2 };
    details.sort(function (a, b) {
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    var html = '<option value="">自动推荐</option>';
    details.forEach(function (d) {
      var label = d.sku + ' — ' + (d.productName || d.positioningLabel || '');
      if (d.internalLabel) label += '（' + d.internalLabel + '）';
      html += '<option value="' + App.escapeHtml(d.sku) + '">' + App.escapeHtml(label) + '</option>';
    });
    sel.innerHTML = html;

    // 如果 URL 带了 sku 参数，预选
    var urlSku = App.getQueryParam('sku');
    if (urlSku) {
      sel.value = decodeURIComponent(urlSku);
    }
  }

  /* ---------- 页面初始化 ---------- */
  function init() {
    // 填充 SKU 下拉框
    populateSkuSelect();

    var form = document.getElementById('ai-form');
    var analyzeBtn = document.getElementById('btn-analyze');

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', function () {
        var input = collectInput();

        // 基本验证
        if (!input.name) {
          App.showToast('请输入达人昵称 🐱');
          return;
        }

        // 显示 loading
        var panel = document.getElementById('ai-result');
        if (panel) {
          panel.innerHTML = ''
            + '<div class="ai-result-empty">'
            +   '<div class="loading-dots"><span></span><span></span><span></span></div>'
            +   '<div class="ai-result-empty__text">正在分析达人数据...</div>'
            + '</div>';
        }

        // 模拟分析延迟（实际计算是同步的，加延迟是为了 UX）
        setTimeout(function () {
          var result = AI.analyze(input);
          lastAnalysis = { result: result, input: input };
          renderResult(result, input);
        }, 600);
      });
    }

    // 重置按钮
    var resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var form = document.getElementById('ai-form');
        if (form) form.reset();
        var panel = document.getElementById('ai-result');
        if (panel) {
          panel.innerHTML = ''
            + '<div class="ai-result-empty">'
            +   '<div class="ai-result-empty__icon">' + App.svg.paw + '</div>'
            +   '<div class="ai-result-empty__text">填写达人信息后点击「开始分析」<br>AI 会自动生成评分、推荐和邀约话术 🌸</div>'
            + '</div>';
        }
      });
    }

    // 从 URL 参数加载达人
    loadFromCreator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
