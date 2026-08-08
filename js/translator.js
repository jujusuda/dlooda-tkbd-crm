/* ================================================================
   Dlooda TKBD CRM — AI 润色翻译引擎 (translator.js)
   用户输入中文草稿 → AI 润色 → 多语言翻译
   邀约：默认英文，可切换中文/西语/法语/葡语
   私信：默认英文+西语
   ================================================================
   实现原理：
   1. 意图检测：通过关键词识别消息类型（邀约/催视频/复投/重拍等）
   2. 实体提取：提取达人名、产品名、佣金等关键信息
   3. 短语字典：中文短语 → EN/ES/FR/PT 映射
   4. 模板组装：按意图+语言生成润色后的完整话术
   ================================================================ */

(function (global) {
  'use strict';

  /* ---------- 短语字典（中文 → 多语言） ---------- */
  var DICT = {
    // 问候语
    '你好':    { en: 'Hi', es: 'Hola', fr: 'Salut', pt: 'Oi' },
    '你好呀':  { en: 'Hi~', es: 'Hola~', fr: 'Salut~', pt: 'Oi~' },
    '哈喽':    { en: 'Hi', es: 'Hola', fr: 'Salut', pt: 'Oi' },
    '在吗':    { en: 'Are you around?', es: '¿Estás por ahí?', fr: 'Tu es là?', pt: 'Você está aí?' },
    '这里是':  { en: 'This is', es: 'Soy de', fr: 'C\'est', pt: 'Aqui é' },
    '我们是':  { en: 'We are', es: 'Somos de', fr: 'Nous sommes', pt: 'Nós somos' },

    // 品牌与产品
    '品牌':    { en: 'brand', es: 'marca', fr: 'marque', pt: 'marca' },
    '产品':    { en: 'product', es: 'producto', fr: 'produit', pt: 'produto' },
    '样品':    { en: 'sample', es: 'muestra', fr: 'échantillon', pt: 'amostra' },
    '样品申请': { en: 'sample request', es: 'solicitud de muestra', fr: 'demande d\'échantillon', pt: 'pedido de amostra' },
    '爆款':    { en: 'best-seller', es: 'más vendido', fr: 'best-seller', pt: 'mais vendido' },
    '新品':    { en: 'new arrival', es: 'novedad', fr: 'nouveau', pt: 'novidade' },
    '视频':    { en: 'video', es: 'video', fr: 'vidéo', pt: 'vídeo' },
    '拍视频':  { en: 'shoot a video', es: 'grabar un video', fr: 'filmer une vidéo', pt: 'gravar um vídeo' },
    '发布视频': { en: 'post the video', es: 'publicar el video', fr: 'publier la vidéo', pt: 'publicar o vídeo' },
    '上身展示': { en: 'try-on showcase', es: 'demostración de try-on', fr: 'démonstration d\'essayage', pt: 'demonstração de try-on' },
    '试穿':    { en: 'try on', es: 'probar', fr: 'essayer', pt: 'experimentar' },

    // 合作术语
    '合作':    { en: 'collaborate', es: 'colaborar', fr: 'collaborer', pt: 'colaborar' },
    '邀约':    { en: 'invite', es: 'invitar', fr: 'inviter', pt: 'convidar' },
    '邀请':    { en: 'invite', es: 'invitar', fr: 'inviter', pt: 'convidar' },
    '佣金':    { en: 'commission', es: 'comisión', fr: 'commission', pt: 'comissão' },
    '广告支持': { en: 'ad support', es: 'soporte de ads', fr: 'support publicitaire', pt: 'suporte de anúncios' },
    '自动通过': { en: 'auto-approved', es: 'aprobado automáticamente', fr: 'approuvé automatiquement', pt: 'aprovado automaticamente' },
    '寄样':    { en: 'send a sample', es: 'enviar muestra', fr: 'envoyer un échantillon', pt: 'enviar amostra' },
    '寄出':    { en: 'ship', es: 'enviar', fr: 'expédier', pt: 'enviar' },
    '收到':    { en: 'receive', es: 'recibir', fr: 'recevoir', pt: 'receber' },
    '复投':    { en: 'collab again', es: 'colaborar otra vez', fr: 'collaborer à nouveau', pt: 'colaborar novamente' },
    '再合作':  { en: 'collaborate again', es: 'colaborar otra vez', fr: 'collaborer à nouveau', pt: 'colaborar novamente' },
    '买样返款': { en: 'sample buyback promo', es: 'promo de reembolso', fr: 'promo de remboursement', pt: 'promo de reembolso' },
    '返款':    { en: 'refund', es: 'reembolso', fr: 'remboursement', pt: 'reembolso' },
    '下单':    { en: 'place the order', es: 'hacer el pedido', fr: 'passer la commande', pt: 'fazer o pedido' },
    '购买':    { en: 'purchase', es: 'comprar', fr: 'acheter', pt: 'comprar' },

    // 动作请求
    '申请':    { en: 'apply', es: 'solicitar', fr: 'postuler', pt: 'solicitar' },
    '有兴趣':  { en: 'interested', es: 'interesado/a', fr: 'intéressé(e)', pt: 'interessado(a)' },
    '有问题':  { en: 'any questions', es: 'alguna duda', fr: 'des questions', pt: 'alguma dúvida' },
    '随时':    { en: 'anytime', es: 'cuando quieras', fr: 'à tout moment', pt: 'a qualquer momento' },
    '期待':    { en: 'excited to see', es: 'emocionado/a por ver', fr: 'hâte de voir', pt: 'animado(a) para ver' },
    '感谢':    { en: 'thank you', es: 'gracias', fr: 'merci', pt: 'obrigado(a)' },

    // 状态描述
    '数据很好': { en: 'did sooo well', es: 'funcionó súper bien', fr: 'a super bien marché', pt: 'foi super bem' },
    '数据超好': { en: 'did sooo well', es: 'funcionó súper bien', fr: 'a super bien marché', pt: 'foi super bem' },
    '效果很好': { en: 'turned out great', es: 'quedó genial', fr: 'super bien', pt: 'ficou ótimo' },
    '特别适合': { en: 'perfect for', es: 'perfecto para', fr: 'parfait pour', pt: 'perfeito para' },
    '适合你':  { en: 'perfect for you', es: 'perfecto para ti', fr: 'parfait pour toi', pt: 'perfeito para você' },

    // 时间
    '今天':    { en: 'today', es: 'hoy', fr: 'aujourd\'hui', pt: 'hoje' },
    '收到样品': { en: 'received the sample', es: 'recibiste la muestra', fr: 'reçu l\'échantillon', pt: 'recebeu a amostra' },
    '有一段时间': { en: 'a while ago', es: 'hace un tiempo', fr: 'il y a un moment', pt: 'há um tempo' },
    '什么时候': { en: 'when', es: 'cuándo', fr: 'quand', pt: 'quando' },
    '大概':    { en: 'approximately', es: 'aproximadamente', fr: 'environ', pt: 'aproximadamente' },

    // 其他
    '重新拍':  { en: 'reshoot', es: 'grabar de nuevo', fr: 'refaire', pt: 'refazer' },
    '重拍':    { en: 'reshoot', es: 'grabar de nuevo', fr: 'refaire', pt: 'refazer' },
    '更好':    { en: 'even better', es: 'aún mejor', fr: 'encore mieux', pt: 'ainda melhor' },
    '细节':    { en: 'details', es: 'detalles', fr: 'détails', pt: 'detalhes' },
    '展示':    { en: 'showcase', es: 'mostrar', fr: 'montrer', pt: 'mostrar' },
    '效果':    { en: 'effect', es: 'efecto', fr: 'effet', pt: 'efeito' },
    '颜色':    { en: 'color', es: 'color', fr: 'couleur', pt: 'cor' },
    '尺码':    { en: 'size', es: 'talla', fr: 'taille', pt: 'tamanho' },
    '面料':    { en: 'fabric', es: 'tela', fr: 'tissu', pt: 'tecido' },
    '舒适':    { en: 'comfortable', es: 'cómodo', fr: 'confortable', pt: 'confortável' },
    '显瘦':    { en: 'flattering', es: 'favorecedor', fr: 'flattteur', pt: 'favorável' },
    '百搭':    { en: 'versatile', es: 'versátil', fr: 'polyvalent', pt: 'versátil' },
    '质感':    { en: 'quality', es: 'calidad', fr: 'qualité', pt: 'qualidade' },
  };

  /* ---------- 意图检测 ---------- */
  var INTENT_PATTERNS = [
    { id: 'auto_approve', keywords: ['自动通过', '已通过', '帮你通过', '已审批'], type: 'both' },
    { id: 'video_ask', keywords: ['拍视频', '会不会拍', '愿意拍', '是否会拍'], type: 'dm' },
    { id: 'tryon_ask', keywords: ['上身', '试穿', '上身展示', '穿上身'], type: 'dm' },
    { id: 'buyback', keywords: ['买样', '返款', '买样返款', '先下单'], type: 'dm' },
    { id: 'reinvest', keywords: ['复投', '再合作', '重新合作', '另一款', '新品'], type: 'dm' },
    { id: 'reshoot', keywords: ['重拍', '重新拍', '拍得不好', '敷衍'], type: 'dm' },
    { id: 'push_video', keywords: ['催', '什么时候', '还没发', '还没拍', '还没发布'], type: 'dm' },
    { id: 'invite', keywords: ['邀约', '邀请', '合作', '佣金', '申请'], type: 'invite' },
  ];

  function detectIntent(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < INTENT_PATTERNS.length; i++) {
      var pattern = INTENT_PATTERNS[i];
      for (var j = 0; j < pattern.keywords.length; j++) {
        if (lower.indexOf(pattern.keywords[j]) >= 0) {
          return pattern.id;
        }
      }
    }
    return 'general';
  }

  /* ---------- 实体提取 ---------- */
  function extractEntities(text, options) {
    var entities = {
      creator: (options && options.creator) || '',
      productName: '',
      commission: '',
      sku: (options && options.sku) || '',
    };

    // 从 SKU 详情获取产品名
    if (options && options.detail) {
      entities.productName = options.detail.productName || '';
      entities.commission = options.detail.defaultCommission || '';
    }

    // 从文本中提取佣金信息（如 "15%+8%" 或 "15% + 8%"）
    var commMatch = text.match(/(\d+%?\s*\+?\s*\d+%?)/);
    if (commMatch) entities.commission = commMatch[1];

    // 从文本中提取产品名（常见产品关键词）
    var productKeywords = ['work pants', 'skort', 'skirt', 'jeans', 'pants', 'leggings', '裙子', '裤子'];
    for (var i = 0; i < productKeywords.length; i++) {
      if (text.toLowerCase().indexOf(productKeywords[i]) >= 0) {
        if (!entities.productName) entities.productName = productKeywords[i];
        break;
      }
    }

    return entities;
  }

  /* ---------- 文本清理 ---------- */
  function cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* ---------- 逐句翻译（字典查找） ---------- */
  function translateSentence(sentence, lang) {
    if (!sentence.trim()) return '';
    var result = sentence;

    // 按字典替换中文短语
    Object.keys(DICT).forEach(function (zh) {
      var translation = DICT[zh][lang];
      if (translation) {
        // 全局替换，不区分大小写
        var regex = new RegExp(escapeRegex(zh), 'gi');
        result = result.replace(regex, translation);
      }
    });

    return result;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ---------- 按意图+语言生成话术 ---------- */
  var INTENT_TEMPLATES = {
    // 邀约模板
    invite: {
      en: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'our latest collection';
        var comm = e.commission || '15% + 8%';
        return 'Hi' + name + '~ This is Dlooda.\n\n'
          + 'We\'d love to invite you to collaborate on our ' + product + '! '
          + 'Featuring flattering fit, soft fabric, and easy styling — perfect for your content.\n\n'
          + comm + ' commission with ad support.\n\n'
          + 'Feel free to apply — we\'d love to have you!';
      },
      es: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'nuestra última colección';
        var comm = e.commission || '15% + 8%';
        return 'Hola' + name + '~ Soy de Dlooda.\n\n'
          + '¡Nos encantaría invitarte a colaborar con nuestro ' + product + '! '
          + 'Corte favorecedor, tela suave y fácil de combinar — perfecto para tu contenido.\n\n'
          + comm + ' de comisión con soporte de ads.\n\n'
          + '¡Solicítalo cuando quieras!';
      },
      fr: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'notre dernière collection';
        var comm = e.commission || '15% + 8%';
        return 'Salut' + name + '~ C\'est Dlooda.\n\n'
          + 'Nous aimerions t\'inviter à collaborer sur notre ' + product + '! '
          + 'Coupe flatteuse, tissu doux et facile à styliser — parfait pour ton contenu.\n\n'
          + comm + ' de commission avec support publicitaire.\n\n'
          + 'N\'hésite pas à postuler!';
      },
      pt: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'nossa última coleção';
        var comm = e.commission || '15% + 8%';
        return 'Oi' + name + '~ Aqui é a Dlooda.\n\n'
          + 'Adoraríamos te convidar para colaborar com nosso ' + product + '! '
          + 'Corte favorável, tecido macio e fácil de combinar — perfeito para seu conteúdo.\n\n'
          + comm + ' de comissão com suporte de anúncios.\n\n'
          + 'Sinta-se à vontade para se inscrever!';
      },
      zh: function (e, raw) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || '我们的新品';
        var comm = e.commission || '15% + 8%';
        return 'Hi ' + name + '~ 这里是 Dlooda 品牌。\n\n'
          + '想邀请你合作我们的 ' + product + '！'
          + '版型显瘦、面料舒适、百搭易搭配——非常适合你的风格。\n\n'
          + '佣金 ' + comm + '，含广告支持。\n\n'
          + '欢迎申请合作～';
      },
    },

    // 自动通过
    auto_approve: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ Your sample request is auto-approved! 🎀 Can\'t wait to see your video once you receive it. Let me know if you need anything~';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ ¡Tu solicitud de muestra está aprobada automáticamente! 🎀 No veo la hora de ver tu video. Avísame si necesitas algo~';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ Ta demande d\'échantillon est approuvée automatiquement! 🎀 J\'ai hâte de voir ta vidéo. Dis-moi si tu as besoin de quoi que ce soit~';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Seu pedido de amostra foi aprovado automaticamente! 🎀 Mal posso esperar para ver seu vídeo. Me avise se precisar de algo~';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 已经帮你自动通过样品申请啦🎀 收到样品后期待你的视频～ 有问题随时找我';
      },
    },

    // 催视频
    push_video: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ Just checking in! You received the sample a while ago — any idea when the video might go up? Super excited to see it! 🌸';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ Solo chequeando! Recibiste la muestra hace un tiempo — ¿tienes una fecha estimada para el video? ¡Estoy súper emocionado/a! 🌸';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ Je donne des nouvelles! Tu as reçu l\'échantillon il y a un moment — as-tu une date estimée pour la vidéo? J\'ai tellement hâte de la voir! 🌸';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Só checando! Você recebeu a amostra há um tempo — tem uma data estimada para o vídeo? Estou super animado/a! 🌸';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 想跟你确认一下～ 样品收到有一段时间啦，视频大概什么时候可以发呢？超期待的🌸';
      },
    },

    // 复投推荐
    reinvest: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'our new arrival';
        return 'Hi' + name + '~ Your last video did sooo well 😍 We just launched ' + product + ' and I immediately thought of you! Want to collab again? Already auto-approved for you~';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'nuestra novedad';
        return 'Hola' + name + '~ Tu último video funcionó súper bien 😍 Acabamos de lanzar ' + product + ' y pensé en ti inmediatamente. ¿Quieres colaborar otra vez? Ya aprobado~';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'notre nouveau produit';
        return 'Salut' + name + '~ Ta dernière vidéo a super bien marché 😍 On vient de lancer ' + product + ' et j\'ai tout de suite pensé à toi! Tu veux collaborer à nouveau? Déjà approuvé~';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || 'nossa novidade';
        return 'Oi' + name + '~ Seu último vídeo foi super bem 😍 Acabamos de lançar ' + product + ' e pensei em você imediatamente! Quer colaborar de novo? Já aprovado~';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        var product = e.productName || '新品';
        return 'Hi ' + name + '~ 你之前拍的视频数据超好😍 我们刚上了新品' + product + '，感觉特别适合你！要不要再合作一次？已经帮你自动通过啦～';
      },
    },

    // 重拍
    reshoot: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ Thank you so much for the video! The content is great, but we think the try-on showcase could be even better. Would you be open to reshooting? Maybe show more of the fit and details? We\'d really appreciate it 🙏';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ ¡Gracias por el video! El contenido es genial, pero creemos que la parte del try-on podría mejorar. ¿Estarías dispuesto/a a grabar de nuevo? Puedes mostrar más del ajuste y los detalles 🙏';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ Merci beaucoup pour la vidéo! Le contenu est super, mais on pense que la partie essayage pourrait être encore meilleure. Serais-tu d\'accord pour refaire? Montre plus de détails et de l\'ajustement 🙏';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Muito obrigado/a pelo vídeo! O conteúdo é ótimo, mas achamos que a parte do try-on poderia ficar ainda melhor. Você estaria disposto/a a refazer? Pode mostrar mais do ajuste e dos detalhes 🙏';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 感谢你拍了视频！内容很好，不过上身展示部分可能还可以更好一些，你愿意重新拍一条吗？可以多展示一下上身效果和细节～ 非常感谢🙏';
      },
    },

    // 问是否拍视频
    video_ask: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ We just approved your sample request! Quick question — will you be posting a video once you receive it? Just want to make sure we\'re on the same page 😊';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ ¡Acabamos de aprobar tu solicitud de muestra! Una pregunta — ¿publicarás un video cuando la recibas? Solo para asegurarnos 😊';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ On vient d\'approuver ta demande d\'échantillon! Une question — publieras-tu une vidéo en le recevant? Juste pour être sûr 😊';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Acabamos de aprovar seu pedido de amostra! Uma pergunta — você publicará um vídeo quando receber? Só para garantir 😊';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 我们刚通过你的样品申请啦！想问一下你收到样品后会拍视频发布吗？想提前确认一下😊';
      },
    },

    // 问是否上身展示
    tryon_ask: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ Will you be doing a try-on in your video? We\'d love to see how it looks on you! The fit is really flattering 😊';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ ¿Harás un try-on en tu video? ¡Nos encantaría ver cómo te queda! El corte es muy favorecedor 😊';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ Feras-tu un essayage dans ta vidéo? On adorerait voir comment ça te va! La coupe est vraiment flatteuse 😊';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Você fará um try-on no seu vídeo? Adoraríamos ver como fica em você! O corte é muito favorável 😊';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 你拍视频的时候会上身试穿展示吗？我们很期待看到你的上身效果！版型真的很显瘦😊';
      },
    },

    // 买样返款
    buyback: {
      en: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi' + name + '~ We have a sample buyback promo going on! You place the order first, and once your video is posted, we\'ll refund the sample cost + commission. Interested? ✨';
      },
      es: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Hola' + name + '~ ¡Tenemos una promo de reembolso de muestra! Haces el pedido primero, y cuando publiques el video, te devolvemos el costo + comisión. ¿Te interesa? ✨';
      },
      fr: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Salut' + name + '~ On a une promo de remboursement d\'échantillon! Tu commandes d\'abord, et quand ta vidéo est publiée, on te rembourse le coût + commission. Intéressé(e)? ✨';
      },
      pt: function (e) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        return 'Oi' + name + '~ Temos uma promo de reembolso de amostra! Você faz o pedido primeiro, e quando publicar o vídeo, devolvemos o custo + comissão. Interessado(a)? ✨';
      },
      zh: function (e) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        return 'Hi ' + name + '~ 我们现在有一个买样返款的活动！你先下单购买，视频发布后我们返还样品费用+佣金，有兴趣参加吗？✨';
      },
    },

    // 通用/兜底
    general: {
      en: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var translated = translateSentence(raw, 'en');
        return 'Hi' + name + '~ ' + translated;
      },
      es: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var translated = translateSentence(raw, 'es');
        return 'Hola' + name + '~ ' + translated;
      },
      fr: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var translated = translateSentence(raw, 'fr');
        return 'Salut' + name + '~ ' + translated;
      },
      pt: function (e, raw) {
        var name = e.creator ? ' ' + e.creator.split(/[\.\s]/)[0] : '';
        var translated = translateSentence(raw, 'pt');
        return 'Oi' + name + '~ ' + translated;
      },
      zh: function (e, raw) {
        var name = e.creator ? e.creator.split(/[\.\s]/)[0] : '';
        // 中文润色：加上 Hi~ 前缀，加 emoji
        var polished = raw.replace(/^(你好[~！]*|哈喽[~！]*|在吗[？?]*)/i, '');
        return 'Hi ' + name + '~ ' + polished.trim();
      },
    },
  };

  /* ---------- 主函数：润色 + 翻译 ---------- */
  // type: 'invite' | 'dm'
  // options: { creator, sku, detail }
  function polishAndTranslate(rawText, type, options) {
    options = options || {};
    var cleaned = cleanText(rawText);
    var intent = detectIntent(cleaned);
    var entities = extractEntities(cleaned, options);

    // 如果是邀约类型但检测到的意图是 DM 专属的，回退到 invite
    if (type === 'invite' && ['video_ask', 'tryon_ask', 'buyback'].indexOf(intent) >= 0) {
      intent = 'invite';
    }

    var templates = INTENT_TEMPLATES[intent] || INTENT_TEMPLATES.general;

    var result = {
      intent: intent,
      entities: entities,
      zh: '',
      en: '',
      es: '',
      fr: '',
      pt: '',
    };

    // 生成各语言
    ['en', 'es', 'fr', 'pt', 'zh'].forEach(function (lang) {
      if (templates[lang]) {
        result[lang] = templates[lang](entities, cleaned);
      } else {
        // 回退到英文
        result[lang] = templates.en(entities, cleaned);
      }
    });

    // 私信类型追加佣金信息（如果有）
    if (type === 'dm' && entities.commission && intent !== 'invite') {
      result.en += '\n\n(' + entities.commission + ' commission with ad support)';
      result.es += '\n\n(' + entities.commission + ' de comisión con soporte de ads)';
      result.fr += '\n\n(' + entities.commission + ' de commission avec support pub)';
      result.pt += '\n\n(' + entities.commission + ' de comissão com suporte de anúncios)';
      result.zh += '\n\n（佣金' + entities.commission + '，含广告支持）';
    }

    return result;
  }

  /* ---------- 导出 ---------- */
  global.DloodaTranslator = {
    polishAndTranslate: polishAndTranslate,
    detectIntent: detectIntent,
    DICT: DICT,
  };

})(window);
