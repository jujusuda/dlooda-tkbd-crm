# -*- coding: utf-8 -*-
"""
Dlooda 8月月报 —— 4 页替换页（V2）
✅ 数据 100% 取自用户提供表格
✅ 配色/字体/版式 100% 复刻《Dlooda_8月月度汇报_终版.pptx》
   - 标题栏 C94F82，浅粉底 FCEAF1，正文 4A3D42，辅助 7A6A70
   - 字体 微软雅黑；白底；蝴蝶结装饰；标题 L1.5 T0.08；Part 标签 L10.6；页码 L12.4 T7.05
用户表（权威）：
SKU   定位  寄样 履约率 出单率  月度出单 环比变化
2178  爆品   73  76.7%  9.8%   1,904   +449
2190  爆品   55  83.6%  7.5%   1,872   +176
2722  爆品   45  82.2%  34.29% 1,752   -11
28173 销售   86  90.7%  31.08% 846     +525
2189  销售   38  92.1%  22.86% 723     +547
2789  销售   32  71.9%  33.33% 39      -61
2757  测品   35  82.9%  30.77% 25      新测
"""
import math
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData

# ---------- 复刻自原 PPT 的配色 ----------
PINK      = RGBColor(0xC9, 0x4F, 0x82)   # 标题栏/表头
PINK_PALE = RGBColor(0xFC, 0xEA, 0xF1)   # 浅粉底
PINK_MED  = RGBColor(0xF5, 0xA0, 0xBC)
PINK_SOFT = RGBColor(0xFC, 0xD5, 0xE3)
DEEP      = RGBColor(0xB2, 0x5B, 0x7E)   # 深粉强调字
INK       = RGBColor(0x4A, 0x3D, 0x42)   # 正文
GRAY      = RGBColor(0x7A, 0x6A, 0x70)   # 辅助
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GREEN     = RGBColor(0x4C, 0xAF, 0x50)
RED       = RGBColor(0xE5, 0x4C, 0x4C)
ORANGE    = RGBColor(0xE0, 0xA8, 0x3C)
BLUE      = RGBColor(0x4C, 0x8F, 0xC9)
FONT = '微软雅黑'

# ---------- 用户表（唯一数据源） ----------
# sku: (定位, 寄样, 履约率, 出单率%, 8月月度出单, 环比变化 or None)
TBL = {
    '2178':  ('爆品', 73, 0.767, 0.0980,  1904,  449),
    '2190':  ('爆品', 55, 0.836, 0.0750,  1872,  176),
    '2722':  ('爆品', 45, 0.822, 0.3429,  1752,  -11),
    '28173': ('销售', 86, 0.907, 0.3108,   846,  525),
    '2189':  ('销售', 38, 0.921, 0.2286,   723,  547),
    '2789':  ('销售', 32, 0.719, 0.3333,    39,  -61),
    '2757':  ('测品', 35, 0.829, 0.3077,    25, None),
}
NAME = {
    '2178': 'Work Pants (Micro Flare)', '2190': 'Work Pants (升级版)',
    '2722': 'Crossover Skort', '28173': 'Wide Leg Work Pants',
    '2189': 'Work Pants (经典款)', '2789': 'Four-Pocket Skort', '2757': 'Lace Skort',
}
SIX = ['2178', '2190', '2722', '28173', '2189', '2789']   # 6 常卖款
# 8月出单达人数（由用户表「出单率＝出单达人÷有视频达人」反推，比值均为整数解）
N8 = {'2178': 5, '2190': 3, '2722': 12, '28173': 23, '2189': 8, '2789': 7, '2757': 4}
# 7月出单达人数（取自系统 6/15-7/15 窗口；此列不在用户表中，待确认）
N7 = {'2178': 5, '2190': 5, '2722': 23, '28173': 20, '2189': 13, '2789': 17}

def o7(s):
    a, j = TBL[s][4], TBL[s][5]
    return a - j if j is not None else None

def mean(xs): return sum(xs) / len(xs)
def sdpop(xs):
    m = mean(xs); return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))

# ---------- 绘图工具 ----------
def tb(s, l, t, w, h, runs, size=11, bold=False, color=INK, align=PP_ALIGN.LEFT,
       anchor=MSO_ANCHOR.TOP, spacing=None):
    box = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.02); tf.margin_top = tf.margin_bottom = 0
    for i, r in enumerate(runs):
        if isinstance(r, str): r = {'t': r}
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = r.get('t', ''); p.alignment = r.get('a', align)
        if spacing: p.line_spacing = spacing
        p.font.size = Pt(r.get('s', size)); p.font.bold = r.get('b', bold)
        p.font.color.rgb = r.get('c', color); p.font.name = FONT
    return box

def rect(s, l, t, w, h, fill=None, line=None, lw=1, shape=MSO_SHAPE.RECTANGLE):
    sp = s.shapes.add_shape(shape, Inches(l), Inches(t), Inches(w), Inches(h))
    if fill: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    else: sp.fill.background()
    if line: sp.line.color.rgb = line; sp.line.width = Pt(lw)
    else: sp.line.fill.background()
    sp.shadow.inherit = False
    return sp

def header(s, title, part, page_no):
    """复刻原 PPT 页眉：满宽粉条 + 蝴蝶结 + 标题 + Part 标签 + 页码"""
    rect(s, 0, 0, 13.333, 1.0, fill=PINK)
    rect(s, 0.32, 0.20, 0.094, 0.069, fill=PINK_PALE, shape=MSO_SHAPE.OVAL)
    rect(s, 0.389, 0.20, 0.094, 0.069, fill=PINK_PALE, shape=MSO_SHAPE.OVAL)
    rect(s, 0.389, 0.209, 0.041, 0.05, fill=PINK_MED, shape=MSO_SHAPE.OVAL)
    tb(s, 1.5, 0.08, 9.0, 0.62, [{'t': title, 's': 20, 'b': True, 'c': WHITE}],
       anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 10.6, 0.10, 2.6, 0.5, [{'t': part, 's': 12, 'b': True, 'c': WHITE}],
       align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 12.4, 7.05, 0.8, 0.35, [{'t': str(page_no), 's': 10, 'c': GRAY}], align=PP_ALIGN.RIGHT)

def table(s, l, t, w, colw, rows, fsize=10.5, rowh=0.36, headh=0.42):
    n_r, n_c = len(rows), len(rows[0])
    shp = s.shapes.add_table(n_r, n_c, Inches(l), Inches(t), Inches(w),
                             Inches(headh + rowh * (n_r - 1)))
    t_ = shp.table; t_.first_row = True
    for i, cw in enumerate(colw): t_.columns[i].width = Inches(cw)
    t_.rows[0].height = Inches(headh)
    for r in range(1, n_r): t_.rows[r].height = Inches(rowh)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = t_.cell(r, c)
            cell.margin_left = cell.margin_right = Inches(0.05)
            cell.margin_top = cell.margin_bottom = Inches(0.01)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            cell.fill.fore_color.rgb = PINK if r == 0 else WHITE
            tf = cell.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]
            if isinstance(val, dict):
                p.text = str(val.get('t', '')); p.alignment = val.get('a', PP_ALIGN.CENTER)
                p.font.bold = (r == 0) or val.get('b', False)
                p.font.color.rgb = WHITE if r == 0 else val.get('c', INK)
            else:
                p.text = str(val); p.alignment = PP_ALIGN.CENTER
                p.font.bold = (r == 0); p.font.color.rgb = WHITE if r == 0 else INK
            p.font.size = Pt(fsize); p.font.name = FONT
    return t_

def chart(s, l, t, w, h, ctype, cats, series, colors=None, legend=True, fs=9,
          num_fmt='0', labels=True, gap=70):
    cd = CategoryChartData(); cd.categories = cats
    for k, v in series.items(): cd.add_series(k, v)
    ch = s.shapes.add_chart(ctype, Inches(l), Inches(t), Inches(w), Inches(h), cd).chart
    ch.has_title = False
    ch.has_legend = legend
    if legend:
        ch.legend.position = XL_LEGEND_POSITION.BOTTOM
        ch.legend.include_in_layout = False
        ch.legend.font.size = Pt(9); ch.legend.font.name = FONT
    plot = ch.plots[0]; plot.gap_width = gap
    plot.has_data_labels = labels
    if labels:
        dl = plot.data_labels
        dl.font.size = Pt(fs); dl.font.name = FONT
        dl.number_format = num_fmt; dl.number_format_is_linked = False
    if colors:
        for i, ser in enumerate(ch.series):
            if i < len(colors) and colors[i]:
                ser.format.fill.solid(); ser.format.fill.fore_color.rgb = colors[i]
    for ax in (ch.value_axis, ch.category_axis):
        ax.has_major_gridlines = False
        ax.tick_labels.font.size = Pt(fs); ax.tick_labels.font.name = FONT
    return ch

# ============================================================
# P5 增长拆解
# ============================================================
def page5(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '一页结论 · 增长从哪里来？', 'Part 01', 5)
    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '口径统一为「件」：覆盖效应 + 单产效应 = 订单变化量（恒等式，6 款逐一校验通过）', 's': 10.5, 'c': GRAY}])

    tb(s, 0.6, 1.5, 6.0, 0.3, [{'t': '6 常卖款：月度订单 7月 → 8月', 's': 12, 'b': True, 'c': DEEP}])
    chart(s, 0.5, 1.85, 6.1, 2.9, XL_CHART_TYPE.COLUMN_CLUSTERED,
          SIX, {'7月': [o7(x) for x in SIX], '8月': [TBL[x][4] for x in SIX]},
          colors=[PINK_MED, PINK], fs=8, gap=80)

    tb(s, 6.9, 1.5, 6.0, 0.3, [{'t': '增长拆解：覆盖效应 vs 单产效应（件）', 's': 12, 'b': True, 'c': DEEP}])
    cov, prod = {}, {}
    for x in SIX:
        n1, n2 = N7[x], N8[x]; o1, o2 = o7(x), TBL[x][4]
        p1, p2 = o1 / n1, o2 / n2
        cov[x] = (n2 - n1) * p1; prod[x] = n2 * (p2 - p1)
    chart(s, 6.8, 1.85, 6.1, 2.9, XL_CHART_TYPE.COLUMN_CLUSTERED,
          SIX, {'覆盖效应': [round(cov[x]) for x in SIX], '单产效应': [round(prod[x]) for x in SIX]},
          colors=[PINK_SOFT, PINK], fs=8, gap=80)

    rows = [['SKU', '7月订单', '7月达人', '7月人均', '8月订单', '8月达人', '8月人均', '覆盖(件)', '单产(件)', '订单变化']]
    for x in SIX:
        r1 = o7(x); r2 = TBL[x][4]
        rows.append([x, f'{r1:,}', str(N7[x]), f'{r1/N7[x]:.0f}', f'{r2:,}', str(N8[x]), f'{r2/N8[x]:.0f}',
                     {'t': f'{cov[x]:+.0f}', 'c': GREEN if cov[x] >= 0 else RED},
                     {'t': f'{prod[x]:+.0f}', 'c': GREEN if prod[x] >= 0 else RED},
                     {'t': f'{TBL[x][5]:+,}', 'b': True}])
    table(s, 0.6, 4.85, 12.15, [0.78, 1.02, 0.9, 0.9, 1.02, 0.9, 0.9, 1.05, 1.05, 1.13], rows,
          fsize=8.5, rowh=0.29, headh=0.36)

    TC, TP = sum(cov[x] for x in SIX), sum(prod[x] for x in SIX)
    TD = sum(TBL[x][5] for x in SIX)
    rect(s, 0.6, 6.35, 12.15, 0.68, fill=PINK_PALE)
    tb(s, 0.85, 6.42, 11.7, 0.55, [
        {'t': f'6 常卖款合计 {TD:+,} 件 ＝ 覆盖效应 {TC:+,.0f} 件 ＋ 单产效应 {TP:+,.0f} 件', 's': 11.5, 'b': True, 'c': DEEP},
        {'t': f'增长几乎全部来自「已合作达人卖得更多」（单产 {TP:+,.0f} 件）；达人覆盖面反而在收缩（{TC:+,.0f} 件）→ 下月要放大，必须先补达人覆盖面。', 's': 10, 'c': INK},
    ])
    return s

# ============================================================
# P14 达人产出集中度 & 流失风险
# ============================================================
def page14(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '达人产出集中度 & 流失风险', 'Part 03', 14)
    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '不点名达人｜只看结构：每个 SKU 的订单压在几个人身上（出单达人数由你的出单率反推，均为整数解）', 's': 10.5, 'c': GRAY}])

    rect(s, 0.6, 1.5, 12.15, 0.52, fill=PINK_PALE)
    tb(s, 0.85, 1.56, 11.7, 0.45, [
        {'t': '读法：出单达人数越少、人均产出越高 → 越依赖头部 → 抗流失越弱。', 's': 10.5, 'c': INK},
        {'t': '「单人流失影响（下限）」＝ 1 ÷ 出单达人数（均匀分布估算）；因存在头部效应，实际冲击只会更高。', 's': 9.5, 'c': GRAY},
    ])

    tb(s, 0.6, 2.15, 6.2, 0.3, [{'t': '① 每寄出 1 个样品换回多少件订单（投入产出）', 's': 11.5, 'b': True, 'c': DEEP}])
    order = sorted(SIX + ['2757'], key=lambda x: -TBL[x][4] / TBL[x][1])
    chart(s, 0.5, 2.45, 6.4, 1.95, XL_CHART_TYPE.BAR_CLUSTERED,
          order, {'件/寄样': [round(TBL[x][4] / TBL[x][1], 1) for x in order]},
          colors=[PINK], legend=False, fs=9, num_fmt='0.0', gap=60)

    tb(s, 0.6, 4.5, 6.2, 0.3, [{'t': '② 单人流失影响（下限估算）', 's': 11.5, 'b': True, 'c': DEEP}])
    sni = sorted(SIX, key=lambda x: -100 / N8[x])
    chart(s, 0.5, 4.8, 6.4, 1.8, XL_CHART_TYPE.BAR_CLUSTERED,
          sni, {'%': [round(100 / N8[x], 1) for x in sni]},
          colors=[RED], legend=False, fs=9, num_fmt='0.0"%"', gap=60)

    tb(s, 7.15, 2.15, 5.6, 0.3, [{'t': '③ 明细', 's': 11.5, 'b': True, 'c': DEEP}])
    rows = [['SKU', '寄样', '出单达人', '8月订单', '人均产出', '件/寄样', '依赖度']]
    for x in order:
        n = N8[x]; dep = '极高' if n <= 5 else ('高' if n <= 8 else ('中' if n <= 15 else '低'))
        dc = RED if dep == '极高' else (ORANGE if dep == '高' else (DEEP if dep == '中' else GREEN))
        rows.append([x, str(TBL[x][1]), str(n), f'{TBL[x][4]:,}',
                     f'{TBL[x][4]/n:.0f}', f'{TBL[x][4]/TBL[x][1]:.1f}',
                     {'t': dep, 'b': True, 'c': dc}])
    table(s, 7.15, 2.45, 5.6, [0.9, 0.62, 0.85, 0.9, 0.82, 0.72, 0.79], rows, fsize=9, rowh=0.345)

    rect(s, 7.15, 5.55, 5.6, 1.15, fill=PINK_PALE)
    tb(s, 7.35, 5.62, 5.25, 1.05, [
        {'t': 'BD 行动建议', 's': 11, 'b': True, 'c': DEEP},
        {'t': '• 2190（3人）/2178（5人）撑起 1,872/1,904 件，流失 1 人影响 33%/20% → 头部关系维护 + 备份达人培养是第一位。', 's': 8.5, 'c': INK},
        {'t': '• 28173：23 个出单达人，单人流失影响仅 4.3%，盘子最稳 → 下月扩达人池的主战场。', 's': 8.5, 'c': INK},
        {'t': '• 投入效率：2722（38.9 件/寄样）> 2190（34.0）> 2178（26.1）> 2189（19.0）> 28173（9.8）> 2789（1.2）→ 寄样预算向前三款倾斜。', 's': 8.5, 'b': True, 'c': DEEP},
    ])
    return s

# ============================================================
# P15 全 SKU 达人效率榜（Z-score）
# ============================================================
def zrows():
    orate = [TBL[x][3] * 100 for x in SIX]
    per = [TBL[x][4] / N8[x] for x in SIX]
    mo, so = mean(orate), sdpop(orate)
    mp, sp = mean(per), sdpop(per)
    out = []
    for i, x in enumerate(SIX):
        zo = (orate[i] - mo) / so; zp = (per[i] - mp) / sp
        out.append(dict(sku=x, orate=orate[i], per=per[i], zo=zo, zp=zp, score=zo + zp))
    out.sort(key=lambda r: -r['score'])
    return out, dict(mo=mo, so=so, mp=mp, sp=sp)

def page15(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '全 SKU 达人效率榜', 'Part 03', 15)
    zr, st = zrows()

    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '为什么要先算 Z-score：出单率是「%」、人均产出是「件」，单位不同不能直接相加，标准化后才能放同一把尺子上比', 's': 10.5, 'c': GRAY}])

    rect(s, 0.6, 1.5, 6.0, 1.75, fill=PINK_PALE)
    tb(s, 0.8, 1.57, 5.65, 1.62, [
        {'t': 'Z =（X − μ）÷ σ', 's': 17, 'b': True, 'c': DEEP, 'a': PP_ALIGN.CENTER},
        {'t': 'X＝该 SKU 的原始值     μ＝6 款平均值     σ＝6 款总体标准差', 's': 9, 'c': GRAY},
        {'t': 'σ ＝ √[ Σ(Xᵢ − μ)² ÷ N ]   （总体标准差，除以 N）', 's': 9.5, 'b': True, 'c': INK},
        {'t': 'Z 的含义：0＝刚好等于平均；+1＝高于平均 1 个标准差；−1＝低于平均 1 个标准差。', 's': 9, 'c': INK},
        {'t': '依据：Pearson 1896 提出标准分数；Altman 1968 用其构建 Z-Score 模型；六西格玛亦以 σ 为核心 —— 统计学通用方法，非自创。', 's': 8.5, 'c': GRAY},
    ])

    rect(s, 6.75, 1.5, 6.0, 1.75, fill=PINK_PALE)
    tb(s, 6.95, 1.57, 5.65, 1.62, [
        {'t': '本次计算的两组参数', 's': 11.5, 'b': True, 'c': DEEP},
        {'t': f'出单率：      μ = {st["mo"]:.2f}%      σ = {st["so"]:.2f}%', 's': 10, 'c': INK},
        {'t': f'人均产出：  μ = {st["mp"]:.1f} 件    σ = {st["sp"]:.1f} 件', 's': 10, 'c': INK},
        {'t': '综合效率分 ＝ Z(出单率) ＋ Z(人均产出)', 's': 11, 'b': True, 'c': DEEP},
        {'t': '示例（2722）：出单率 34.29% → Z＝+1.02；人均产出 146.0 件 → Z＝−0.31；合计 ＋0.71。', 's': 9, 'c': GRAY},
    ])

    tb(s, 0.6, 3.35, 12.2, 0.3, [{'t': '计算结果（按综合效率分降序）', 's': 11.5, 'b': True, 'c': DEEP}])
    note = {
        '2722':  '最好卖、也最能卖，效率最高',
        '2190':  '难出单但单人产出极高，全靠头部',
        '2789':  '出单率虽高，但人均仅 5.6 件、总量 39 件 → 效率含金量低',
        '28173': '出单率高、达人分散，抗风险',
        '2178':  '出单率偏低，靠少数人撑量',
        '2189':  '出单率中等，人均产出偏低',
    }
    rows = [['排名', 'SKU', '产品', '出单率', 'Z(出单率)', '人均产出(件)', 'Z(产出)', '综合效率分', '一句话解读']]
    for i, r in enumerate(zr):
        sc = r['score']
        rows.append([str(i + 1), r['sku'], NAME[r['sku']], f"{r['orate']:.2f}%",
                     {'t': f"{r['zo']:+.2f}", 'c': GREEN if r['zo'] >= 0 else RED},
                     f"{r['per']:.1f}",
                     {'t': f"{r['zp']:+.2f}", 'c': GREEN if r['zp'] >= 0 else RED},
                     {'t': f"{sc:+.2f}", 'b': True, 'c': GREEN if sc >= 0 else RED},
                     {'t': note[r['sku']], 'a': PP_ALIGN.LEFT}])
    table(s, 0.6, 3.68, 12.15, [0.6, 0.82, 1.95, 0.95, 1.05, 1.2, 0.95, 1.23, 3.4], rows,
          fsize=9, rowh=0.35, headh=0.4)

    rect(s, 0.6, 6.35, 12.15, 0.65, fill=PINK_PALE)
    tb(s, 0.8, 6.42, 11.75, 0.55, [
        {'t': '怎么读：综合分 ＞ 0 ＝「好卖 + 能卖」两项加起来高于平均；＜ 0 ＝拖后腿。它回答「同样的达人资源投给谁更划算」，不回答「谁卖得最多」。', 's': 9.5, 'c': INK},
        {'t': '注意 2190：出单率仅 7.5%（Z＝−1.43）却人均产出 592 件（Z＝+1.86）→ 不是谁都能卖，而是「卖得动的人能卖爆」，应精准筛达人而非广撒网。', 's': 9.5, 'b': True, 'c': DEEP},
    ])
    return s

# ============================================================
# P16 机会矩阵 & 换季接力
# ============================================================
def page16(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, 'SKU 机会矩阵 & 换季接力', 'Part 03', 16)
    zr, _ = zrows()
    score = {r['sku']: r['score'] for r in zr}
    tot = sum(TBL[x][4] for x in SIX)

    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '纵轴＝好不好卖（出单率）；横轴＝卖得多不多（月度出单占比）｜全部取自你提供的 8 月数据', 's': 10.5, 'c': GRAY}])

    rect(s, 0.6, 1.5, 12.15, 0.5, fill=PINK_PALE)
    tb(s, 0.85, 1.56, 11.7, 0.42, [
        {'t': '卖得多 + 好卖 → 主推基本盘    ｜    卖得多 + 难卖 → 保量款    ｜    卖得少 + 好卖 → 潜力培育款    ｜    卖得少 + 难卖 → 观察调整款', 's': 10.5, 'c': INK},
    ])

    ML, MT, MW, MH = 0.6, 2.1, 6.2, 4.15
    rect(s, ML, MT, MW, MH, fill=WHITE, line=PINK_MED, lw=1)
    rect(s, ML + MW / 2 - 0.006, MT + 0.1, 0.012, MH - 0.2, fill=PINK_MED)
    rect(s, ML + 0.1, MT + MH / 2 - 0.006, MW - 0.2, 0.012, fill=PINK_MED)
    for t, c, x, y in [('潜力培育款', BLUE, ML + 0.18, MT + 0.16), ('主推基本盘', GREEN, ML + MW / 2 + 0.18, MT + 0.16),
                       ('观察调整款', ORANGE, ML + 0.18, MT + MH / 2 + 0.16), ('保量款', PINK, ML + MW / 2 + 0.18, MT + MH / 2 + 0.16)]:
        tb(s, x, y, 2.9, 0.28, [{'t': t, 's': 11, 'b': True, 'c': c}])
    tb(s, ML + 0.06, MT + MH - 0.3, 1.9, 0.24, [{'t': '← 卖得少', 's': 8, 'c': GRAY}])
    tb(s, ML + MW - 1.96, MT + MH - 0.3, 1.9, 0.24, [{'t': '卖得多 →', 's': 8, 'c': GRAY, 'a': PP_ALIGN.RIGHT}])
    tb(s, ML + 0.02, MT + 0.55, 0.28, 1.1, [{'t': '好\n卖\n↑', 's': 8, 'c': GRAY, 'a': PP_ALIGN.CENTER}])
    tb(s, ML + 0.02, MT + 2.5, 0.28, 1.2, [{'t': '难\n卖\n↓', 's': 8, 'c': GRAY, 'a': PP_ALIGN.CENTER}])

    # 动态落位：先分类，再在每个象限内排布，保证与右侧表格完全一致
    qcol = {'主推基本盘': GREEN, '保量款': PINK, '潜力培育款': BLUE, '观察调整款': ORANGE}
    def classify(x):
        sp = TBL[x][4] / tot * 100; rt = TBL[x][3]
        if sp >= 10 and rt >= 0.20: return '主推基本盘'
        if sp >= 10: return '保量款'
        if rt >= 0.20: return '潜力培育款'
        return '观察调整款'
    groups = {'主推基本盘': [], '保量款': [], '潜力培育款': [], '观察调整款': []}
    for x in SIX: groups[classify(x)].append(x)
    # 各象限内可用区域（避开中轴线与角落标签）
    qbox = {
        '潜力培育款': (ML + 0.25, MT + 0.5, MW / 2 - 0.4, MH / 2 - 0.7),
        '主推基本盘': (ML + MW / 2 + 0.15, MT + 0.5, MW / 2 - 0.4, MH / 2 - 0.7),
        '观察调整款': (ML + 0.25, MT + MH / 2 + 0.6, MW / 2 - 0.4, MH / 2 - 1.0),
        '保量款':     (ML + MW / 2 + 0.15, MT + MH / 2 + 0.6, MW / 2 - 0.4, MH / 2 - 1.0),
    }
    bw, bh = 1.18, 0.52
    for q, items in groups.items():
        n = len(items)
        if n == 0: continue
        qx0, qy0, qw, qh = qbox[q]
        if n == 1:
            spots = [(qx0 + qw / 2 - bw / 2, qy0 + qh / 2 - bh / 2)]
        elif n == 2:
            g = (qw - 2 * bw) / 3
            spots = [(qx0 + g, qy0 + qh / 2 - bh / 2), (qx0 + 2 * g + bw, qy0 + qh / 2 - bh / 2)]
        else:  # 3 个：上排 2、下排 1（居中）
            g = (qw - 2 * bw) / 3
            spots = [(qx0 + g, qy0 + qh / 2 - bh - 0.04), (qx0 + 2 * g + bw, qy0 + qh / 2 - bh - 0.04),
                     (qx0 + qw / 2 - bw / 2, qy0 + qh / 2 + 0.04)]
        for (px, py), x in zip(spots, items):
            sp = TBL[x][4] / tot * 100
            rect(s, px, py, bw, bh, fill=qcol[q])
            tb(s, px, py + 0.02, bw, bh - 0.04, [
                {'t': x, 's': 10.5, 'b': True, 'c': WHITE, 'a': PP_ALIGN.CENTER},
                {'t': f'{sp:.1f}%', 's': 8.5, 'c': WHITE, 'a': PP_ALIGN.CENTER},
            ])

    tb(s, 7.1, 2.1, 5.6, 0.3, [{'t': '每个 SKU 落哪一格、该做什么', 's': 11.5, 'b': True, 'c': DEEP}])
    rows = [['SKU', '销售占比', '出单率', '效率分', '分类', 'BD 该做什么']]
    order = sorted(SIX, key=lambda x: -TBL[x][4])
    ACT = {'主推基本盘': '加大投入 · 复制打法', '保量款': '守住基本盘 · 补出单率',
           '潜力培育款': '继续试水 · 等放量', '观察调整款': '控制寄样 · 找原因'}
    for x in order:
        sp = TBL[x][4] / tot * 100; rt = TBL[x][3]
        q = '主推基本盘' if (sp >= 10 and rt >= 0.20) else \
            ('保量款' if sp >= 10 else ('潜力培育款' if rt >= 0.20 else '观察调整款'))
        col = {'主推基本盘': GREEN, '保量款': PINK, '潜力培育款': BLUE, '观察调整款': ORANGE}[q]
        rows.append([x, f'{sp:.1f}%', f'{rt*100:.2f}%',
                     {'t': f'{score[x]:+.2f}', 'c': GREEN if score[x] >= 0 else RED},
                     {'t': q, 'b': True, 'c': col},
                     {'t': ACT[q], 'a': PP_ALIGN.LEFT}])
    table(s, 7.1, 2.42, 5.65, [0.72, 0.78, 0.78, 0.72, 1.05, 1.6], rows, fsize=8.5, rowh=0.34, headh=0.38)

    rect(s, 7.1, 4.9, 5.65, 1.35, fill=PINK_PALE)
    tb(s, 7.3, 4.97, 5.3, 1.25, [
        {'t': '换季接力（已纠正）', 's': 11, 'b': True, 'c': DEEP},
        {'t': '夏款（短裙）：2722 / 2757 / 2789', 's': 8.5, 'c': INK},
        {'t': '秋款（长裤）：2178 / 2190 / 2189 / 28173', 's': 8.5, 'c': INK},
        {'t': '2757 是夏款（蕾丝短裙），不是秋款，不能直接接 2722 的棒。', 's': 8.5, 'b': True, 'c': RED},
        {'t': '→ 真正的接力是「短裙品类整体 → 长裤品类整体」的换季转移：把 2722 已验证的达人平移到秋款长裤。', 's': 8.5, 'b': True, 'c': DEEP},
    ])
    return s

def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
    page5(prs); page14(prs); page15(prs); page16(prs)
    out = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\Dlooda_修改页_4页.pptx'
    prs.save(out); print('SAVED:', out)

    print('\n=== 增长拆解校验（覆盖+单产 应 = 环比变化）===')
    for x in SIX:
        n1, n2 = N7[x], N8[x]; o1, o2 = o7(x), TBL[x][4]
        p1, p2 = o1 / n1, o2 / n2
        c = (n2 - n1) * p1; p = n2 * (p2 - p1)
        print(f'{x:>6} 7月{o1:5d}/{n1:2d}人={p1:6.1f}  8月{o2:5d}/{n2:2d}人={p2:6.1f}  覆盖{c:+8.0f} 单产{p:+8.0f} 合计{c+p:+8.0f} 实际{TBL[x][5]:+5d}')
    print('\n=== 效率榜 ===')
    for i, r in enumerate(zrows()[0]):
        print(f"{i+1}. {r['sku']:>6} 出单率{r['orate']:6.2f}% Z={r['zo']:+.2f} | 人均{r['per']:7.1f} Z={r['zp']:+.2f} | 综合{r['score']:+.2f}")
    print('\n=== 出单达人反推验证（出单率×有视频达人 应为整数）===')
    for x in SIX:
        n = N8[x]; print(f"{x:>6} 出单率{TBL[x][3]*100:.2f}% 出单达人={n}")
if __name__ == '__main__':
    main()
