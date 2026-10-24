# -*- coding: utf-8 -*-
"""
生成 4 页替换页（供用户粘贴回原 PPT）
数据来源：scripts/_correct_sku_data.json（已核对的权威数据）
P5  增长拆解（修正公式：覆盖/单产统一为"件"，解决量级差导致的遮挡）
P14 达人产出集中度 & 流失风险（真实数据，不点名达人）
P15 全 SKU 效率榜（Z-score 完整计算过程）
P16 SKU 机会矩阵（大白话命名 + 季节纠正）
"""
import json, math, os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData

# ---------- 色彩 ----------
PINK_DEEP = RGBColor(0xE1, 0x89, 0x9F)
PINK_MED  = RGBColor(0xF4, 0xC0, 0xD1)
PINK_PALE = RGBColor(0xFB, 0xEA, 0xF0)
PINK_DK   = RGBColor(0xC4, 0x45, 0x69)
INK       = RGBColor(0x33, 0x33, 0x33)
GRAY      = RGBColor(0x88, 0x88, 0x88)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
BG        = RGBColor(0xFD, 0xF6, 0xF9)
GREEN     = RGBColor(0x2E, 0x9E, 0x5B)
RED       = RGBColor(0xD9, 0x3A, 0x3A)
ORANGE    = RGBColor(0xE8, 0x8A, 0x1A)
BLUE      = RGBColor(0x3B, 0x7E, 0xD6)
FONT = 'Microsoft YaHei'

SKUS = ['2178', '2190', '2722', '28173', '2189', '2789']

DATA = json.load(open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\scripts\_correct_sku_data.json', encoding='utf-8'))
J = DATA['data']['7月常卖']
A = DATA['data']['8月常卖']
NAME = {k: v['name'] for k, v in DATA['skuMeta'].items()}

def mean(xs): return sum(xs) / len(xs)
def sd_pop(xs):
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))

# ---------- 计算 ----------
def decomposition():
    """覆盖效应(件)=(n2-n1)*p1 ; 单产效应(件)=n2*(p2-p1) ; 两者相加=订单变化"""
    out = {}
    for s in SKUS:
        n1, o1 = J[s]['orderCreators'], DATA['monthlyOrders']['7月'][s]
        n2, o2 = A[s]['orderCreators'], DATA['monthlyOrders']['8月'][s]
        p1, p2 = o1 / n1, o2 / n2
        cover = (n2 - n1) * p1
        prod = n2 * (p2 - p1)
        out[s] = dict(n1=n1, n2=n2, o1=o1, o2=o2, p1=p1, p2=p2,
                      cover=cover, prod=prod, delta=o2 - o1)
    return out

def zscores():
    orate = [A[s]['creatorOrderRate'] * 100 for s in SKUS]
    per   = [DATA['monthlyOrders']['8月'][s] / A[s]['orderCreators'] for s in SKUS]
    mu_o, sd_o = mean(orate), sd_pop(orate)
    mu_p, sd_p = mean(per), sd_pop(per)
    rows = []
    for i, s in enumerate(SKUS):
        zo = (orate[i] - mu_o) / sd_o
        zp = (per[i] - mu_p) / sd_p
        rows.append(dict(sku=s, name=NAME[s], orate=orate[i], per=per[i],
                         zo=zo, zp=zp, score=zo + zp))
    rows.sort(key=lambda r: -r['score'])
    return rows, dict(mu_o=mu_o, sd_o=sd_o, mu_p=mu_p, sd_p=sd_p)

def concentration():
    """达人集中度 / 流失风险（真实数据）"""
    rows = []
    for s in SKUS:
        a = A[s]
        orders = DATA['monthlyOrders']['8月'][s]
        n = a['orderCreators']
        rows.append(dict(
            sku=s, name=NAME[s], samples=a['samples'], n=n, orders=orders,
            per=orders / n, roi=orders / a['samples'],
            orate=a['creatorOrderRate'] * 100,
            risk_share=100.0 / n,               # 均匀分布下"流失1人"的订单影响（下限）
        ))
    # 依赖度：人少 + 单产高 => 越依赖头部
    for r in rows:
        r['dep'] = '极高' if r['n'] <= 5 else ('高' if r['n'] <= 8 else ('中' if r['n'] <= 15 else '低'))
    rows.sort(key=lambda r: -r['roi'])
    return rows

def matrix(zrows):
    score = {r['sku']: r['score'] for r in zrows}
    tot = sum(DATA['monthlyOrders']['8月'][s] for s in SKUS)
    out = []
    for s in SKUS:
        sp = DATA['monthlyOrders']['8月'][s] / tot * 100
        sc = score[s]
        if sp >= 15 and sc >= 0:   q, act, c = '主推基本盘', '加大投入·复制打法', GREEN
        elif sp >= 15:             q, act, c = '保量款',     '守住基本盘·补效率', PINK_DEEP
        elif sc >= 0:              q, act, c = '潜力培育款', '继续试水·等放量',   BLUE
        else:                      q, act, c = '观察调整款', '控制投入·找原因',   ORANGE
        out.append(dict(sku=s, name=NAME[s], sp=sp, score=sc, q=q, act=act, color=c))
    return out

# ---------- 绘图工具 ----------
def tb(slide, l, t, w, h, runs, size=11, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.03)
    tf.margin_top = tf.margin_bottom = 0
    for i, r in enumerate(runs):
        txt = r.get('t', '') if isinstance(r, dict) else r
        sz = r.get('s', size) if isinstance(r, dict) else size
        bd = r.get('b', bold) if isinstance(r, dict) else bold
        cl = r.get('c', color) if isinstance(r, dict) else color
        al = r.get('a', align) if isinstance(r, dict) else align
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = txt
        p.alignment = al
        p.font.size = Pt(sz); p.font.bold = bd; p.font.color.rgb = cl; p.font.name = FONT
    return box

def rect(slide, l, t, w, h, fill=None, line=None, lw=1, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, Inches(l), Inches(t), Inches(w), Inches(h))
    if fill: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    else: sp.fill.background()
    if line: sp.line.color.rgb = line; sp.line.width = Pt(lw)
    else: sp.line.fill.background()
    sp.shadow.inherit = False
    return sp

def header(slide, title, sub=''):
    rect(slide, 0, 0, 13.333, 7.5, fill=BG)
    rect(slide, 0, 0, 13.333, 0.95, fill=PINK_DEEP)
    tb(slide, 0.5, 0.12, 12.3, 0.5, [{'t': title, 's': 21, 'b': True, 'c': WHITE}], align=PP_ALIGN.LEFT)
    if sub:
        tb(slide, 0.5, 0.6, 12.3, 0.3, [{'t': sub, 's': 10.5, 'c': WHITE}], align=PP_ALIGN.LEFT)
    # Hello Kitty 蝴蝶结点缀
    for x in (12.35, 12.75):
        rect(slide, x, 0.28, 0.16, 0.16, fill=WHITE, shape=MSO_SHAPE.OVAL)
    rect(slide, 12.52, 0.33, 0.12, 0.06, fill=WHITE)

def table(slide, l, t, w, colw, rows, fsize=10, rowh=0.36, headh=0.42):
    """rows[0] 为表头"""
    n_r, n_c = len(rows), len(rows[0])
    shp = slide.shapes.add_table(n_r, n_c, Inches(l), Inches(t), Inches(w), Inches(headh + rowh * (n_r - 1)))
    tbl = shp.table
    tbl.first_row = True
    for i, cw in enumerate(colw):
        tbl.columns[i].width = Inches(cw)
    tbl.rows[0].height = Inches(headh)
    for r in range(1, n_r):
        tbl.rows[r].height = Inches(rowh)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c)
            cell.margin_left = Inches(0.06); cell.margin_right = Inches(0.06)
            cell.margin_top = Inches(0.02); cell.margin_bottom = Inches(0.02)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            if r == 0:
                cell.fill.fore_color.rgb = PINK_DEEP
            else:
                cell.fill.fore_color.rgb = PINK_PALE if r % 2 else WHITE
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            txt = val.get('t', '') if isinstance(val, dict) else val
            p.text = str(txt)
            p.alignment = val.get('a', PP_ALIGN.CENTER) if isinstance(val, dict) else PP_ALIGN.CENTER
            p.font.size = Pt(fsize)
            p.font.name = FONT
            p.font.bold = True if r == 0 else val.get('b', False) if isinstance(val, dict) else False
            p.font.color.rgb = WHITE if r == 0 else (val.get('c', INK) if isinstance(val, dict) else INK)
    return tbl

def chart(slide, l, t, w, h, ctype, cats, series, colors=None, legend=True, fs=9, num_fmt='0'):
    cd = CategoryChartData()
    cd.categories = cats
    for k, v in series.items():
        cd.add_series(k, v)
    gf = slide.shapes.add_chart(ctype, Inches(l), Inches(t), Inches(w), Inches(h), cd)
    ch = gf.chart
    ch.has_legend = legend
    if legend:
        ch.legend.position = XL_LEGEND_POSITION.BOTTOM
        ch.legend.include_in_layout = False
        ch.legend.font.size = Pt(9); ch.legend.font.name = FONT
    plot = ch.plots[0]
    plot.has_data_labels = True
    plot.data_labels.font.size = Pt(fs)
    plot.data_labels.font.name = FONT
    plot.data_labels.number_format = num_fmt
    plot.data_labels.number_format_is_linked = False
    if colors:
        for i, s in enumerate(ch.series):
            if i < len(colors) and colors[i]:
                s.format.fill.solid(); s.format.fill.fore_color.rgb = colors[i]
    for ax in (ch.value_axis, ch.category_axis):
        ax.has_major_gridlines = False
        ax.tick_labels.font.size = Pt(fs); ax.tick_labels.font.name = FONT
    plot.gap_width = 60
    return ch

def footnote(slide, text):
    tb(slide, 0.5, 7.02, 12.3, 0.32, [{'t': text, 's': 8.5, 'c': GRAY}])

# ============================================================
def page5(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '增长拆解：订单增量从哪来？', '口径统一为「件」｜覆盖效应 + 单产效应 = 订单变化量（恒等式，已逐 SKU 校验）')
    d = decomposition()

    tb(s, 0.5, 1.05, 12.3, 0.3, [{'t': '① 公式（两项单位统一为「件」，因此可同图对比，不再互相遮挡）', 's': 12, 'b': True, 'c': PINK_DK}])
    rect(s, 0.5, 1.38, 12.3, 0.85, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.7, 1.46, 11.9, 0.75, [
        {'t': '覆盖效应（件）=（8月出单达人 − 7月出单达人）× 7月人均产出     ← 人多了/少了，按原来的效率折算成多少件', 's': 10.5, 'c': INK},
        {'t': '单产效应（件）= 8月出单达人 ×（8月人均产出 − 7月人均产出）     ← 人没变，但每人卖得多了/少了多少件', 's': 10.5, 'c': INK},
        {'t': '校验：覆盖效应 + 单产效应 = 8月订单 − 7月订单 ✔（6 款逐一验证通过）', 's': 10.5, 'b': True, 'c': PINK_DK},
    ])

    tb(s, 0.5, 2.35, 6.2, 0.3, [{'t': '② 分 SKU 拆解结果（件）', 's': 12, 'b': True, 'c': PINK_DK}])
    chart(s, 0.35, 2.68, 6.5, 3.05, XL_CHART_TYPE.COLUMN_CLUSTERED,
          SKUS, {'覆盖效应': [round(d[x]['cover']) for x in SKUS],
                 '单产效应': [round(d[x]['prod']) for x in SKUS]},
          colors=[GRAY, PINK_DK], fs=8)

    tb(s, 7.0, 2.35, 5.9, 0.3, [{'t': '③ 明细数据', 's': 12, 'b': True, 'c': PINK_DK}])
    rows = [['SKU', '7月\n订单', '7月\n达人', '7月\n人均', '8月\n订单', '8月\n达人', '8月\n人均', '覆盖\n(件)', '单产\n(件)', '订单\n变化']]
    for x in SKUS:
        r = d[x]
        rows.append([x, f"{r['o1']:,}", str(r['n1']), f"{r['p1']:.0f}", f"{r['o2']:,}", str(r['n2']), f"{r['p2']:.0f}",
                     {'t': f"{r['cover']:+.0f}", 'c': GREEN if r['cover'] >= 0 else RED},
                     {'t': f"{r['prod']:+.0f}", 'c': GREEN if r['prod'] >= 0 else RED},
                     {'t': f"{r['delta']:+,}", 'b': True}])
    table(s, 7.0, 2.68, 5.85, [0.72, 0.55, 0.5, 0.5, 0.55, 0.5, 0.5, 0.62, 0.62, 0.62], rows, fsize=8.5, rowh=0.33)

    tc = sum(d[x]['cover'] for x in SKUS); tp = sum(d[x]['prod'] for x in SKUS)
    td = sum(d[x]['delta'] for x in SKUS)
    rect(s, 0.5, 5.95, 12.3, 1.0, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.75, 6.03, 11.9, 0.9, [
        {'t': f'结论：6 款常卖合计 {td:+,} 件 ＝ 覆盖效应 {tc:+,.0f} 件 ＋ 单产效应 {tp:+,.0f} 件', 's': 12, 'b': True, 'c': PINK_DK},
        {'t': f'增长几乎全部来自「已合作达人卖得更多」（单产效应 {tp:+,.0f} 件）；达人覆盖面实际是收缩的（{tc:+,.0f} 件）。', 's': 10.5, 'c': INK},
        {'t': '→ 这说明 8 月增长是「存量达人深耕」的结果，不是「新达人扩张」；下月若想继续放大，必须先补足达人覆盖面。', 's': 10.5, 'b': True, 'c': PINK_DK},
    ])
    footnote(s, '注：7月＝6/15-7/15，8月＝7/15-8/15（30 天滚动窗口，非自然月）；人均产出＝月度订单÷出单达人数。')
    return s

def page14(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '达人产出集中度 & 流失风险', '不点名达人｜只看结构：每个 SKU 的订单压在几个人身上？')
    c = concentration()

    tb(s, 0.5, 1.05, 12.3, 0.3, [{'t': '① 为什么看这个：订单越集中在少数人身上，一个人流失对盘子的冲击越大', 's': 12, 'b': True, 'c': PINK_DK}])
    rect(s, 0.5, 1.38, 12.3, 0.6, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.7, 1.45, 11.9, 0.5, [
        {'t': '读法：出单达人数越少、人均产出越高 → 越依赖头部 → 抗流失能力越弱。', 's': 10.5, 'c': INK},
        {'t': '「单人流失影响（下限）」＝ 1 ÷ 出单达人数（按均匀分布估算）；因真实存在头部效应，实际冲击只会更高。', 's': 10.5, 'c': GRAY},
    ])

    tb(s, 0.5, 2.1, 6.4, 0.3, [{'t': '② 每寄出 1 个样品换回多少件订单（投入产出）', 's': 12, 'b': True, 'c': PINK_DK}])
    chart(s, 0.35, 2.42, 6.6, 2.2, XL_CHART_TYPE.BAR_CLUSTERED,
          [x['sku'] for x in c], {'件/寄样': [round(x['roi'], 1) for x in c]},
          colors=[PINK_DEEP], legend=False, fs=9, num_fmt='0.0')

    tb(s, 0.5, 4.70, 6.4, 0.3, [{'t': '③ 单人流失影响（下限估算）', 's': 12, 'b': True, 'c': PINK_DK}])
    chart(s, 0.35, 4.95, 6.6, 1.95, XL_CHART_TYPE.BAR_CLUSTERED,
          [x['sku'] for x in sorted(c, key=lambda r: r['n'])],
          {'%': [round(x['risk_share'], 1) for x in sorted(c, key=lambda r: r['n'])]},
          colors=[RED], legend=False, fs=9, num_fmt='0.0"%"')

    rows = [['SKU', '寄样', '出单\n达人', '订单', '人均\n产出', '件/\n寄样', '依赖度']]
    for x in sorted(c, key=lambda r: -r['roi']):
        dc = RED if x['dep'] == '极高' else (ORANGE if x['dep'] == '高' else (PINK_DK if x['dep'] == '中' else GREEN))
        rows.append([x['sku'], str(x['samples']), str(x['n']), f"{x['orders']:,}",
                     f"{x['per']:.0f}", f"{x['roi']:.1f}", {'t': x['dep'], 'b': True, 'c': dc}])
    tb(s, 7.15, 2.1, 5.7, 0.3, [{'t': '④ 明细', 's': 12, 'b': True, 'c': PINK_DK}])
    table(s, 7.15, 2.42, 5.7, [0.95, 0.7, 0.75, 0.95, 0.8, 0.7, 0.85], rows, fsize=9, rowh=0.375)

    rect(s, 7.15, 5.25, 5.7, 1.75, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 7.35, 5.34, 5.3, 1.6, [
        {'t': 'BD 行动建议', 's': 12, 'b': True, 'c': PINK_DK},
        {'t': '• 2190 / 2178：出单达人仅 3–5 人，却撑起 1,776 / 1,768 件，属于「以少胜多」型，风险最高 → 必须做头部关系维护 + 备份达人培养。', 's': 9.5, 'c': INK},
        {'t': '• 28173：25 个出单达人，单人流失影响仅 4%，盘子最稳 → 可继续扩量，是下月扩达人池的主战场。', 's': 9.5, 'c': INK},
        {'t': '• 2722：12 人 / 人均 137 件，结构均衡，但夏款进入尾声 → 把已验证达人平移到秋款长裤。', 's': 9.5, 'c': INK},
        {'t': '• 投入效率上，2722（36 件/寄样）> 2190（32）> 2178（24）> 2189（18）> 28173（9）> 2789（1）→ 寄样预算应向前三款倾斜。', 's': 9.5, 'b': True, 'c': PINK_DK},
    ])
    footnote(s, '注：依赖度＝按出单达人数量分级（≤5 极高 / ≤8 高 / ≤15 中 / >15 低）；本页不使用任何达人姓名或账号信息。')
    return s

def page15(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '全 SKU 达人效率榜', '方法：Z-score 标准分｜把单位不同的两个指标放在同一把尺子上比')
    zr, st = zscores()

    tb(s, 0.5, 1.05, 12.3, 0.3, [{'t': '① 为什么要先算 Z-score：出单率是「%」，人均产出是「件」，单位不同不能直接相加', 's': 12, 'b': True, 'c': PINK_DK}])
    rect(s, 0.5, 1.38, 6.1, 1.85, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.7, 1.46, 5.7, 1.7, [
        {'t': 'Z =（X − μ）÷ σ', 's': 19, 'b': True, 'c': PINK_DK, 'a': PP_ALIGN.CENTER},
        {'t': 'X＝该 SKU 的原始值    μ＝6 款 SKU 的平均值    σ＝6 款 SKU 的总体标准差', 's': 9.5, 'c': GRAY},
        {'t': 'σ ＝ √[ Σ(Xᵢ − μ)² ÷ N ]   （总体标准差，除以 N）', 's': 10, 'b': True, 'c': INK},
        {'t': 'Z 的含义：0＝刚好在平均水平；+1＝高于平均 1 个标准差；−1＝低于平均 1 个标准差。', 's': 9.5, 'c': INK},
        {'t': '依据：Karl Pearson 1896 提出标准分数；Altman 1968 用其构建 Z-Score 模型；六西格玛同样以 σ 为核心。属统计学通用方法，非自创。', 's': 9, 'c': GRAY},
    ])

    rect(s, 6.75, 1.38, 6.1, 1.85, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 6.95, 1.46, 5.7, 1.7, [
        {'t': '本次计算的两组参数', 's': 12, 'b': True, 'c': PINK_DK},
        {'t': f'出单率：      μ = {st["mu_o"]:.2f}%     σ = {st["sd_o"]:.2f}%', 's': 10.5, 'c': INK},
        {'t': f'人均产出：  μ = {st["mu_p"]:.1f} 件   σ = {st["sd_p"]:.1f} 件', 's': 10.5, 'c': INK},
        {'t': '综合效率分 ＝ Z(出单率) ＋ Z(人均产出)', 's': 11.5, 'b': True, 'c': PINK_DK},
        {'t': 'Z 分数消掉了单位差异，两项可以直接相加：得分越高＝「既好卖、又能卖」，两项都强。', 's': 9.5, 'c': INK},
        {'t': '示例（2722）：出单率 34.29% → Z＝+0.94；人均产出 136.7 件 → Z＝−0.31；合计 ＋0.63。', 's': 9.5, 'c': GRAY},
    ])

    tb(s, 0.5, 3.4, 12.3, 0.3, [{'t': '② 计算结果（按综合效率分降序）', 's': 12, 'b': True, 'c': PINK_DK}])
    rows = [['排名', 'SKU', '产品', '出单率', 'Z(出单率)', '人均产出(件)', 'Z(产出)', '综合效率分', '一句话解读']]
    note = {
        '2722': '最好卖、也最能卖，性价比最高',
        '2190': '难出单但单人产出极高，全靠头部',
        '28173': '出单率高、盘子分散，抗风险',
        '2789': '出单率不低，但盘子太小',
        '2178': '出单率偏低，靠少数人撑量',
        '2189': '出单率中等，人均产出偏低',
    }
    for i, r in enumerate(zr):
        sc = r['score']
        rows.append([
            str(i + 1), r['sku'], r['name'][:18], f"{r['orate']:.2f}%",
            f"{r['zo']:+.2f}", f"{r['per']:.1f}", f"{r['zp']:+.2f}",
            {'t': f"{sc:+.2f}", 'b': True, 'c': GREEN if sc >= 0 else RED},
            {'t': note.get(r['sku'], ''), 'a': PP_ALIGN.LEFT},
        ])
    table(s, 0.5, 3.72, 12.35, [0.6, 0.85, 2.15, 0.95, 1.05, 1.25, 0.95, 1.25, 3.3], rows, fsize=9, rowh=0.34)

    rect(s, 0.5, 6.28, 12.35, 0.68, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.7, 6.35, 11.9, 0.6, [
        {'t': '怎么读这张榜：综合分 ＞ 0 代表「两件事加起来高于平均」，＜ 0 代表拖后腿。它回答的是「同样的达人资源投给谁更划算」，不回答「谁卖得最多」（那是销售占比）。', 's': 10, 'c': INK},
        {'t': '注意：2190 出单率只有 7.5%（Z＝−1.44），但人均产出 592 件（Z＝＋1.88），说明它「不是谁都能卖，但卖得动的人能卖爆」→ 应该精准筛选达人，而不是广撒网。', 's': 10, 'b': True, 'c': PINK_DK},
    ])
    footnote(s, '注：出单率＝出单达人÷有视频链接达人；人均产出＝8月月度订单÷8月出单达人数；样本为 8 月 6 款常卖款。')
    return s

def page16(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, 'SKU 机会矩阵 & 换季接力', '大白话版｜横轴＝卖得多不多，纵轴＝卖得顺不顺')
    zr, _ = zscores()
    mx = matrix(zr)

    tb(s, 0.5, 1.05, 12.3, 0.3, [{'t': '① 四象限怎么读（一句话版）', 's': 12, 'b': True, 'c': PINK_DK}])
    rect(s, 0.5, 1.38, 12.3, 0.52, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.7, 1.44, 11.9, 0.45, [
        {'t': '卖得多 + 卖得顺 → 主推基本盘   ｜   卖得多 + 卖得费劲 → 保量款   ｜   卖得少 + 卖得顺 → 潜力培育款   ｜   卖得少 + 卖得费劲 → 观察调整款', 's': 10.5, 'c': INK},
    ])

    # 矩阵区
    ML, MT, MW, MH = 0.5, 2.05, 6.6, 4.15
    rect(s, ML, MT, MW, MH, fill=WHITE, line=PINK_MED, lw=1)
    rect(s, ML + MW / 2 - 0.006, MT + 0.12, 0.012, MH - 0.24, fill=GRAY)
    rect(s, ML + 0.12, MT + MH / 2 - 0.006, MW - 0.24, 0.012, fill=GRAY)
    ql = [('潜力培育款', BLUE, ML + 0.15, MT + 0.15), ('主推基本盘', GREEN, ML + MW / 2 + 0.15, MT + 0.15),
          ('观察调整款', ORANGE, ML + 0.15, MT + MH / 2 + 0.15), ('保量款', PINK_DK, ML + MW / 2 + 0.15, MT + MH / 2 + 0.15)]
    for t, c, x, y in ql:
        tb(s, x, y, 3.0, 0.3, [{'t': t, 's': 11.5, 'b': True, 'c': c}])
    tb(s, ML + 0.1, MT + MH - 0.3, 2.0, 0.25, [{'t': '← 卖得少', 's': 8.5, 'c': GRAY}])
    tb(s, ML + MW - 2.1, MT + MH - 0.3, 2.0, 0.25, [{'t': '卖得多 →', 's': 8.5, 'c': GRAY, 'a': PP_ALIGN.RIGHT}])
    tb(s, ML + 0.03, MT + 0.55, 0.3, 1.2, [{'t': '卖\n得\n顺\n↑', 's': 8, 'c': GRAY, 'a': PP_ALIGN.CENTER}])
    tb(s, ML + 0.03, MT + 2.5, 0.3, 1.3, [{'t': '卖\n得\n费\n劲\n↓', 's': 8, 'c': GRAY, 'a': PP_ALIGN.CENTER}])

    # 象限内放置（手排避免重叠）
    pos = {'2722': (ML + MW / 2 + 0.45, MT + 0.62), '2190': (ML + MW / 2 + 1.85, MT + 0.62),
           '2178': (ML + MW / 2 + 0.45, MT + MH / 2 + 0.62),
           '28173': (ML + 0.45, MT + 0.62), '2789': (ML + 0.45, MT + MH / 2 + 1.15),
           '2189': (ML + 1.85, MT + MH / 2 + 0.62)}
    for m in mx:
        x, y = pos.get(m['sku'])
        rect(s, x, y, 1.35, 0.62, fill=m['color'])
        tb(s, x, y + 0.04, 1.35, 0.55, [
            {'t': m['sku'], 's': 11, 'b': True, 'c': WHITE, 'a': PP_ALIGN.CENTER},
            {'t': f"{m['sp']:.1f}%", 's': 9, 'c': WHITE, 'a': PP_ALIGN.CENTER},
        ])

    # 右侧表
    tb(s, 7.35, 2.05, 5.6, 0.3, [{'t': '② 每个 SKU 落哪一格、该做什么', 's': 12, 'b': True, 'c': PINK_DK}])
    rows = [['SKU', '销售\n占比', '效率分', '分类', 'BD 该做什么']]
    for m in sorted(mx, key=lambda r: -r['sp']):
        rows.append([m['sku'], f"{m['sp']:.1f}%",
                     {'t': f"{m['score']:+.2f}", 'c': GREEN if m['score'] >= 0 else RED},
                     {'t': m['q'], 'b': True, 'c': m['color']},
                     {'t': m['act'], 'a': PP_ALIGN.LEFT}])
    table(s, 7.35, 2.38, 5.5, [0.85, 0.8, 0.75, 1.15, 1.95], rows, fsize=8.5, rowh=0.36)

    rect(s, 7.35, 4.85, 5.5, 1.35, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 7.5, 4.92, 5.2, 1.25, [
        {'t': '③ 换季接力（已纠正）', 's': 11, 'b': True, 'c': PINK_DK},
        {'t': '夏款（短裙）：2722 / 2757 / 2789', 's': 9, 'c': INK},
        {'t': '秋款（长裤）：2178 / 2190 / 2189 / 28173', 's': 9, 'c': INK},
        {'t': '2757 是夏款（蕾丝短裙），不是秋款，不能直接接 2722 的棒。', 's': 9, 'b': True, 'c': RED},
        {'t': '→ 真正的接力是「短裙品类整体 → 长裤品类整体」的换季转移：把 2722 已验证的达人平移到秋款长裤。', 's': 9, 'b': True, 'c': PINK_DK},
    ])
    footnote(s, '注：横轴＝该 SKU 订单占 6 款常卖总额比重（分界 15%）；纵轴＝上一页的综合效率分（分界 0）。')
    return s

def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
    page5(prs); page14(prs); page15(prs); page16(prs)
    out = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\Dlooda_修改页_4页.pptx'
    prs.save(out)
    print('SAVED:', out)

    # 控制台校验
    d = decomposition()
    print('\n=== 增长拆解校验（覆盖+单产 应 = 订单变化）===')
    ok = True
    for x in SKUS:
        r = d[x]; s = r['cover'] + r['prod']
        flag = 'OK' if abs(s - r['delta']) < 0.5 else 'X'
        if flag == 'X': ok = False
        print(f"{x:>6} 覆盖{r['cover']:+8.0f} 单产{r['prod']:+8.0f} 合计{s:+8.0f} 实际{r['delta']:+6d} {flag}")
    print('合计 覆盖%.0f 单产%.0f 变化%.0f' % (sum(d[x]['cover'] for x in SKUS), sum(d[x]['prod'] for x in SKUS), sum(d[x]['delta'] for x in SKUS)))
    print('校验通过' if ok else '校验失败')
    print('\n=== 效率榜 ===')
    zr, st = zscores()
    for i, r in enumerate(zr):
        print(f"{i+1}. {r['sku']:>6} 出单率{r['orate']:6.2f}% Z={r['zo']:+.3f} | 人均{r['per']:7.1f} Z={r['zp']:+.3f} | 综合{r['score']:+.3f}")
    print('\n=== 集中度 ===')
    for r in concentration():
        print(f"{r['sku']:>6} 寄样{r['samples']:3d} 达人{r['n']:3d} 订单{r['orders']:5d} 人均{r['per']:7.1f} 件/寄样{r['roi']:5.1f} 依赖{r['dep']}")

if __name__ == '__main__':
    main()
