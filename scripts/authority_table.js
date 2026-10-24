// 权威数据源：用户从飞书后台整理的手算表（图片 2026-09-07）
// 时间口径：寄样端按半月（7月常卖=2026-06-15~2026-07-15；8月常卖=2026-07-15~2026-08-15）
// 视频端、自然单占比、月度达人总出单与该半月口径对齐。
var AUTHORITY = {
  // periodKey: '2026-07' 表示 7月常卖；'2026-08' 表示 8月常卖
  periods: {
    '2026-07': {
      label: '7月常卖',
      note: '2026-06-15 ~ 2026-07-15',
      rows: {
        '2722': { samples: 105, fulfillCreators: 84, fulfillRate: 0.8000, orderCreators: 22, creatorOrderRate: 0.2750, videos: 556, orderVideos: 141, videoOrderRate: 0.2536, views: 3818554, clicks: 125190, conversions: 1805, ctr: 0.0346, cr: 0.0144, naturalRate: 0.780, monthlyOrders: 1509 },
        '2178': { samples: 33, fulfillCreators: 28, fulfillRate: 0.8485, orderCreators: 4, creatorOrderRate: 0.1600, videos: 267, orderVideos: 94, videoOrderRate: 0.3521, views: 3658449, clicks: 131488, conversions: 1587, ctr: 0.0359, cr: 0.0121, naturalRate: 0.790, monthlyOrders: 1289 },
        '2190': { samples: 27, fulfillCreators: 27, fulfillRate: 1.0000, orderCreators: 5, creatorOrderRate: 0.2083, videos: 211, orderVideos: 61, videoOrderRate: 0.2891, views: 2540712, clicks: 64592, conversions: 1730, ctr: 0.0254, cr: 0.0268, naturalRate: 0.690, monthlyOrders: 1506 },
        '2189': { samples: 33, fulfillCreators: 29, fulfillRate: 0.8788, orderCreators: 14, creatorOrderRate: 0.5600, videos: 106, orderVideos: 40, videoOrderRate: 0.3774, views: 160240, clicks: 7645, conversions: 186, ctr: 0.0477, cr: 0.0243, naturalRate: 0.698, monthlyOrders: 148 },
        '2789': { samples: 53, fulfillCreators: 45, fulfillRate: 0.8491, orderCreators: 12, creatorOrderRate: 0.3000, videos: 59, orderVideos: 17, videoOrderRate: 0.2881, views: 79817, clicks: 3922, conversions: 107, ctr: 0.0491, cr: 0.0273, naturalRate: 0.301, monthlyOrders: 88 },
        '28173': { samples: 67, fulfillCreators: 59, fulfillRate: 0.8806, orderCreators: 16, creatorOrderRate: 0.3019, videos: 138, orderVideos: 33, videoOrderRate: 0.2391, views: 251397, clicks: 11936, conversions: 298, ctr: 0.0475, cr: 0.0250, naturalRate: 0.607, monthlyOrders: 252 }
      }
    },
    '2026-08': {
      label: '8月常卖',
      note: '2026-07-15 ~ 2026-08-15',
      rows: {
        '2178': { samples: 73, fulfillCreators: 56, fulfillRate: 0.7671, orderCreators: 5, creatorOrderRate: 0.0980, videos: 255, orderVideos: 70, videoOrderRate: 0.2745, views: 2847143, clicks: 103934, conversions: 1616, ctr: 0.0365, cr: 0.0155, naturalRate: 0.791, monthlyOrders: 1768 },
        '2190': { samples: 55, fulfillCreators: 46, fulfillRate: 0.8364, orderCreators: 3, creatorOrderRate: 0.0750, videos: 217, orderVideos: 60, videoOrderRate: 0.2765, views: 2203093, clicks: 60298, conversions: 1841, ctr: 0.0274, cr: 0.0316, naturalRate: 0.820, monthlyOrders: 1776 },
        '2722': { samples: 45, fulfillCreators: 37, fulfillRate: 0.8222, orderCreators: 12, creatorOrderRate: 0.3429, videos: 471, orderVideos: 155, videoOrderRate: 0.3291, views: 3148354, clicks: 101610, conversions: 2005, ctr: 0.0323, cr: 0.0197, naturalRate: 0.803, monthlyOrders: 1640 },
        '2189': { samples: 38, fulfillCreators: 35, fulfillRate: 0.9211, orderCreators: 8, creatorOrderRate: 0.2286, videos: 162, orderVideos: 58, videoOrderRate: 0.3580, views: 731262, clicks: 26306, conversions: 932, ctr: 0.0360, cr: 0.0354, naturalRate: 0.615, monthlyOrders: 681 },
        '28173': { samples: 66, fulfillCreators: 78, fulfillRate: 0.9070, orderCreators: 23, creatorOrderRate: 0.3108, videos: 265, orderVideos: 84, videoOrderRate: 0.3170, views: 650131, clicks: 36194, conversions: 843, ctr: 0.0557, cr: 0.0233, naturalRate: 0.816, monthlyOrders: 771 },
        '2789': { samples: 32, fulfillCreators: 23, fulfillRate: 0.7188, orderCreators: 7, creatorOrderRate: 0.3333, videos: 61, orderVideos: 13, videoOrderRate: 0.2131, views: 53003, clicks: 2129, conversions: 38, ctr: 0.0402, cr: 0.0178, naturalRate: 0.459, monthlyOrders: 37 }
      }
    }
  },
  // 测款数据（用户图片中仅有 7月/8月 部分测款，作为参考）
  testRows: {
    '2026-07': {
      '28193': { samples: 32, fulfillCreators: 20, fulfillRate: 0.6250, orderCreators: 3, creatorOrderRate: 0.1500, videos: 24, orderVideos: 3, videoOrderRate: 0.1250, views: 15421, clicks: 208, conversions: 4, ctr: 0.0135, cr: 0.0152, naturalRate: 1.000, monthlyOrders: 5 },
      '2A19': { samples: 76, fulfillCreators: 48, fulfillRate: 0.6316, orderCreators: 11, creatorOrderRate: 0.2245, videos: 42, orderVideos: 6, videoOrderRate: 0.1429, views: 27013, clicks: 1169, conversions: 11, ctr: 0.0433, cr: 0.0094, naturalRate: 0.769, monthlyOrders: 13 }
    },
    '2026-08': {
      '2757': { samples: 35, fulfillCreators: 29, fulfillRate: 0.8286, orderCreators: 8, creatorOrderRate: 0.3077, videos: 38, orderVideos: 10, videoOrderRate: 0.2632, views: 110685, clicks: 3323, conversions: 35, ctr: 0.0300, cr: 0.0105, naturalRate: 0.405, monthlyOrders: 37 }
    }
  },
  // 同产品复投（2178+2190 合计，未拆分 SKU）
  // 来源：用户 2026-09-08 反馈；只联系了之前合作且已出单的达人
  sameSkuReinvest: {
    contacted: 206,   // 联系达人数
    success: 18,      // 成功复投
    failed: 19,       // 失败
    noReply: 169      // 未回复
  },
  // 核心焦点 SKU 列表（与图片一致）
  focus: ['2178', '2190', '2722', '2189', '28173', '2789'],
  // 辅助函数
  get: function(period, sku) {
    var p = this.periods[period];
    if (!p) return null;
    return p.rows[sku] || (this.testRows[period] ? this.testRows[period][sku] : null);
  },
  has: function(period, sku) {
    return !!this.get(period, sku);
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = AUTHORITY;
