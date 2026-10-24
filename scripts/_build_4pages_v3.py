# -*- coding: utf-8 -*-
"""
Dlooda 8月月报 —— 4 页替换页（V3，最终数据版）
数据源：scripts/_authoritative_data.json（用户 2026-09-13 文字提供的权威明细表）
配色/字体 100% 复刻《Dlooda_8月月度汇报_终版.pptx》
  标题栏 C94F82 / 浅粉底 FCEAF1 / 正文 4A3D42 / 辅助 7A6A70 / 字体 微软雅黑
页码：5 / 14 / 15 / 16
"""
import json, math
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData

D = json.load(open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\scripts\_authoritative_data.json', encoding='utf-8'))
J, A = D['jul'], D['aug']
MAIN = ['2178', '2190', '2722', '28173', '2189', '2789']   # 6 常卖（有7月）
ALL7 = MAIN + ['2757']

# ---------- 配色 ----------
PINK      = RGBColor(0xC9, 0x4F, 0x82)
PINK_PALE = RGBColor(0xFC, 0xEA, 0xF1)
PINK_MED  = RGBColor(0xF5, 0xA0, 0xBC)
PINK_SOFT = RGBColor(0xFC, 0xD5, 0xE3)
DEEP      = RGBColor(0xB2, 0x5B, 0x7E)
INK       = RGBColor(0x4A, 0x3D, 0x42)
GRAY      = RGBColor(0x7A, 0x6A, 0x70)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
GREEN     = RGBColor(0x4C, 0xAF, 0x50)
RED       = RGBColor(0xE5, 0x4C, 0x4C)
ORANGE    = RGBColor(0xE0, 0xA8, 0x3C)
BLUE      = RGBColor(0x4C, 0x8F, 0xC9)
FONT = '微软雅黑'

# ---------- 派生指标 ----------
def per(k, m):  # 人均产出
    return m[k]['orders'] / m[k]['order_creators']
def cov_prod(k):
    j, a = J[k], A[k]
    p1, p2 = j['orders']/j['order_creators'], a['orders']/a['order_creators']
    cover = (a['order_creators'] - j['order_creators']) * p1
    prod  = a['order_creators'] * (p2 - p1)
    return cover, prod

# Z-score 综合效率（7 SKU，仅用于第16页落位，不在第15页展示公式）
def eff_scores():
    rate = [A[k]['creator_rate'] for k in ALL7]
    out  = [per(k, A) for k in ALL7]
    mr, sr = sum(rate)/len(rate), math.sqrt(sum((x-sum(rate)/len(rate))**2 for x in rate)/len(rate))
    mp, sp = sum(out)/len(out),  math.sqrt(sum((x-sum(out)/len(out))**2 for x in out)/len(out))
    return {k: (A[k]['creator_rate']-mr)/sr + (per(k,A)-mp)/sp for k in ALL7}

# ---------- 绘图工具 ----------
def tb(s, l, t, w, h, runs, size=11, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.02); tf.margin_top = tf.margin_bottom = 0
    for i, r in enumerate(runs):
        if isinstance(r, str): r = {'t': r}
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = r.get('t', ''); p.alignment = r.get('a', align)
        p.line_spacing = r.get('ls', 1.0)
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
    rect(s, 0, 0, 13.333, 1.0, fill=PINK)
    rect(s, 0.32, 0.20, 0.094, 0.069, fill=PINK_PALE, shape=MSO_SHAPE.OVAL)
    rect(s, 0.389, 0.20, 0.094, 0.069, fill=PINK_PALE, shape=MSO_SHAPE.OVAL)
    rect(s, 0.389, 0.209, 0.041, 0.05, fill=PINK_MED, shape=MSO_SHAPE.OVAL)
    tb(s, 1.5, 0.08, 9.0, 0.62, [{'t': title, 's': 20, 'b': True, 'c': WHITE}], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 10.6, 0.10, 2.6, 0.5, [{'t': part, 's': 12, 'b': True, 'c': WHITE}], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 12.4, 7.05, 0.8, 0.35, [{'t': str(page_no), 's': 10, 'c': GRAY}], align=PP_ALIGN.RIGHT)

def table(s, l, t, w, colw, rows, fsize=10.5, rowh=0.36, headh=0.42):
    n_r = len(rows)
    shp = s.shapes.add_table(n_r, len(rows[0]), Inches(l), Inches(t), Inches(w), Inches(headh + rowh * (n_r - 1)))
    t_ = shp.table; t_.first_row = True
    for i, cw in enumerate(colw): t_.columns[i].width = Inches(cw)
    t_.rows[0].height = Inches(headh)
    for r in range(1, n_r): t_.rows[r].height = Inches(rowh)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = t_.cell(r, c); cell.margin_left = cell.margin_right = Inches(0.05)
            cell.margin_top = cell.margin_bottom = Inches(0.01); cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid(); cell.fill.fore_color.rgb = PINK if r == 0 else WHITE
            tf = cell.text_frame; tf.word_wrap = True; p = tf.paragraphs[0]
            if isinstance(val, dict):
                p.text = str(val.get('t', '')); p.alignment = val.get('a', PP_ALIGN.CENTER)
                p.font.bold = (r == 0) or val.get('b', False)
                p.font.color.rgb = WHITE if r == 0 else val.get('c', INK)
            else:
                p.text = str(val); p.alignment = PP_ALIGN.CENTER
                p.font.bold = (r == 0); p.font.color.rgb = WHITE if r == 0 else INK
            p.font.size = Pt(fsize); p.font.name = FONT
    return t_

def chart(s, l, t, w, h, ctype, cats, series, colors=None, legend=True, fs=9, num_fmt='0', gap=80):
    cd = CategoryChartData(); cd.categories = cats
    for k, v in series.items(): cd.add_series(k, v)
    ch = s.shapes.add_chart(ctype, Inches(l), Inches(t), Inches(w), Inches(h), cd).chart
    ch.has_title = False; ch.has_legend = legend
    if legend:
        ch.legend.position = XL_LEGEND_POSITION.BOTTOM; ch.legend.include_in_layout = False
        ch.legend.font.size = Pt(fs); ch.legend.font.name = FONT
    plot = ch.plots[0]; plot.gap_width = gap; plot.has_data_labels = True
    if plot.has_data_labels:
        dl = plot.data_labels; dl.font.size = Pt(fs); dl.font.name = FONT
        dl.number_format = num_fmt; dl.number_format_is_linked = False
    if colors:
        for i, ser in enumerate(ch.series):
            if i < len(colors) and colors[i]:
                ser.format.fill.solid(); ser.format.fill.fore_color.rgb = colors[i]
    for ax in (ch.value_axis, ch.category_axis):
        ax.has_major_gridlines = False; ax.tick_labels.font.size = Pt(fs); ax.tick_labels.font.name = FONT
    return ch

# ============================================================
# P5 增长拆解（覆盖+单产，单位统一为「件」，恒等式校验）
# ============================================================
def page5(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '一页结论 · 增长从哪里来？', 'Part 01', 5)
    tb(s, 0.6, 1.10, 12.2, 0.32,
       [{'t': '口径统一为「件」：覆盖效应 + 单产效应 = 订单变化量（恒等式，6 款逐一校验通过）', 's': 10.5, 'c': GRAY}])
    tb(s, 0.6, 1.46, 6.0, 0.3, [{'t': '6 常卖款：月度订单 7月 → 8月', 's': 12, 'b': True, 'c': DEEP}])
    chart(s, 0.5, 1.8, 6.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          MAIN, {'7月': [J[x]['orders'] for x in MAIN], '8月': [A[x]['orders'] for x in MAIN]},
          colors=[PINK_MED, PINK], fs=8, gap=80)
    tb(s, 6.9, 1.46, 6.0, 0.3, [{'t': '增长拆解：覆盖效应 vs 单产效应（件）', 's': 12, 'b': True, 'c': DEEP}])
    cov = {x: cov_prod(x)[0] for x in MAIN}; prod = {x: cov_prod(x)[1] for x in MAIN}
    chart(s, 6.8, 1.8, 6.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          MAIN, {'覆盖效应': [round(cov[x]) for x in MAIN], '单产效应': [round(prod[x]) for x in MAIN]},
          colors=[PINK_SOFT, PINK], fs=8, gap=80)
    rows = [['SKU', '7月订单', '7月达人', '7月人均', '8月订单', '8月达人', '8月人均', '覆盖(件)', '单产(件)', '订单变化']]
    for x in MAIN:
        r1, r2 = J[x]['orders'], A[x]['orders']
        rows.append([x, f'{r1:,}', str(J[x]['order_creators']), f'{r1/J[x]["order_creators"]:.0f}',
                     f'{r2:,}', str(A[x]['order_creators']), f'{r2/A[x]["order_creators"]:.0f}',
                     {'t': f'{cov[x]:+.0f}', 'c': GREEN if cov[x] >= 0 else RED},
                     {'t': f'{prod[x]:+.0f}', 'c': GREEN if prod[x] >= 0 else RED},
                     {'t': f'{r2-r1:+,}', 'b': True}])
    table(s, 0.6, 4.3, 12.15, [0.78, 1.02, 0.9, 0.9, 1.02, 0.9, 0.9, 1.05, 1.05, 1.13], rows, fsize=8.5, rowh=0.27, headh=0.32)
    TC = sum(cov[x] for x in MAIN); TP = sum(prod[x] for x in MAIN); TD = sum(A[x]['orders']-J[x]['orders'] for x in MAIN)
    rect(s, 0.6, 6.3, 12.15, 0.48, fill=PINK_PALE)
    tb(s, 0.85, 6.32, 11.7, 0.44, [
        {'t': f'6 常卖款合计 {TD:+,} 件 ＝ 覆盖效应 {TC:+,.0f} 件 ＋ 单产效应 {TP:+,.0f} 件', 's': 11, 'b': True, 'c': DEEP},
        {'t': '订单增长主要由「人均带动订单上升」驱动（单产为正）；其中既含本月新达人贡献，也含历史达人老视频/新视频在本月持续出单（自然长尾）。出单达人数（覆盖面）多数 SKU 在收缩 → 下月要放大，须先补达人覆盖面。', 's': 9, 'c': INK}])
    # 大白话公式 + 口径 注释框（底部，给看不懂的人）
    rect(s, 0.6, 6.82, 11.55, 0.72, fill=WHITE, line=PINK_MED, lw=1.0)
    tb(s, 0.78, 6.85, 11.3, 0.66, [
        {'t': '📐 一句话看懂（不用记公式）：', 's': 8.5, 'b': True, 'c': DEEP},
        {'t': '• 覆盖效应（正=多赚  /  少=少赚）：出单的达人比上月多了还是少了？多了就多赚，少了就少赚。', 's': 8.2, 'c': INK},
        {'t': '• 单产效应（正=多赚  /  负=少赚）：每个出单达人平均卖得比上月多还是少？多了就多赚，少了就少赚。', 's': 8.2, 'c': INK},
        {'t': '• 两者加起来 = 本月比上月总共多卖/少卖了多少件（恒等式，逐款校验通过）。', 's': 8.2, 'c': INK},
        {'t': '口径：月度总订单含历史达人老视频/新视频回单（自然长尾），不限于本月新推达人。', 's': 8, 'c': GRAY}])
    return s

# ============================================================
# P14 达人集中度风险榜（不点名 / 围绕 SKU×达人 / 可执行）
# ============================================================
def page14(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '达人集中度风险 & 下月策略', 'Part 03', 14)
    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '不点名达人｜只看结构：每个 SKU 的订单压在几个人身上。出单达人数越少 → 越依赖头部 → 抗流失越弱。', 's': 10.5, 'c': GRAY}])
    # 单人流失影响 = 1 / 出单达人数
    loss = {k: 100.0 / A[k]['order_creators'] for k in ALL7}
    order = sorted(ALL7, key=lambda x: -loss[x])
    tb(s, 0.6, 1.55, 6.3, 0.3, [{'t': '① 单人流失影响（下限估算＝1÷出单达人数）', 's': 11.5, 'b': True, 'c': DEEP}])
    chart(s, 0.5, 1.9, 6.3, 2.7, XL_CHART_TYPE.BAR_CLUSTERED,
          order, {'%': [round(loss[x], 1) for x in order]}, colors=[RED], legend=False, fs=9, num_fmt='0.0"%"', gap=55)
    # 明细表
    tb(s, 7.05, 1.55, 5.8, 0.3, [{'t': '② 明细（按风险降序）', 's': 11.5, 'b': True, 'c': DEEP}])
    rows = [['SKU', '出单达人', '8月订单', '流失影响', '风险']]
    for x in order:
        n = A[x]['order_creators']; lz = loss[x]
        dep = '极高' if lz >= 25 else ('高' if lz >= 15 else ('中' if lz >= 10 else '低'))
        dc = RED if dep == '极高' else (ORANGE if dep == '高' else (DEEP if dep == '中' else GREEN))
        rows.append([x, str(n), f'{A[x]["orders"]:,}', f'{lz:.1f}%', {'t': dep, 'b': True, 'c': dc}])
    table(s, 7.05, 1.9, 5.8, [0.85, 0.95, 1.0, 0.95, 0.85], rows, fsize=9, rowh=0.35, headh=0.34)
    # 下月策略表
    tb(s, 0.6, 4.75, 12.2, 0.3, [{'t': '③ 下月策略（按风险定动作）', 's': 11.5, 'b': True, 'c': DEEP}])
    advice = {
        '2190': ('极高', '仅 3 人撑 1,872 件，流失 1 人≈损失 624 件 → 头部关系维护 + 备份达人培养第一优先级'),
        '2178': ('高',  '5 人撑 1,904 件，单产 381 但人数少 → 拓新达人分散风险'),
        '2789': ('中',  '7 人但人均仅 5.6 件、总单 39 → 评估是否续做，避免无效寄样'),
        '2189': ('中',  '8 人人均 90，较健康 → 维持并微调'),
        '2757': ('中',  '新测 8 人，观察期 → 跑通后再加寄样'),
        '2722': ('低',  '12 人人均 146，稳健 → 维持'),
        '28173':('低',  '25 人、单人流失仅 4% → 最稳，下月扩达人池主战场'),
    }
    r2 = [['SKU', '风险', '下月动作']]
    for x in order:
        dep, act = advice[x]
        dc = RED if dep == '极高' else (ORANGE if dep == '高' else (DEEP if dep == '中' else GREEN))
        r2.append([x, {'t': dep, 'b': True, 'c': dc}, {'t': act, 'a': PP_ALIGN.LEFT}])
    table(s, 0.6, 5.1, 12.15, [0.85, 0.9, 10.4], r2, fsize=9, rowh=0.27, headh=0.34)
    # 口径说明
    rect(s, 0.6, 6.42, 11.55, 0.62, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.78, 6.45, 11.3, 0.56, [
        {'t': '口径说明：月度总订单含历史合作达人老视频/新视频在本月回单，不限于本月新推达人。', 's': 9, 'b': True, 'c': DEEP},
        {'t': '「单人流失影响 = 1 ÷ 出单达人数」为「本月新推侧」的保守下限估算：仅看新推达人集中度，未计入历史老达人回单，实际抗风险比该值更稳。', 's': 8.3, 'c': INK}])
    return s

# ============================================================
# P15 全 SKU 达人效率榜（双榜排序 + 人话，无 Z 公式）
# ============================================================
def page15(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, '全 SKU 达人效率榜', 'Part 03', 15)
    tb(s, 0.6, 1.12, 12.2, 0.32,
       [{'t': '不绕公式，直接看两件事：① 达人接了样品容不容易出单（出单率）② 出单后每人卖多少（人均产出）。两张榜一对照，谁健康一目了然。', 's': 10.5, 'c': GRAY}])
    rate_sorted = sorted(ALL7, key=lambda x: -A[x]['creator_rate'])
    per_sorted  = sorted(ALL7, key=lambda x: -per(x, A))
    tb(s, 0.6, 1.55, 6.1, 0.3, [{'t': '榜① 达人出单率（接样后出单的占比，越高越容易命中）', 's': 11, 'b': True, 'c': DEEP}])
    chart(s, 0.5, 1.9, 6.2, 2.55, XL_CHART_TYPE.COLUMN_CLUSTERED,
          rate_sorted, {'出单率': [round(A[x]['creator_rate']*100, 1) for x in rate_sorted]},
          colors=[PINK], legend=False, fs=8.5, num_fmt='0.0"%"', gap=55)
    tb(s, 6.9, 1.55, 6.1, 0.3, [{'t': '榜② 人均产出（每个出单达人平均卖多少件）', 's': 11, 'b': True, 'c': DEEP}])
    chart(s, 6.8, 1.9, 6.2, 2.55, XL_CHART_TYPE.COLUMN_CLUSTERED,
          per_sorted, {'人均产出': [round(per(x, A), 1) for x in per_sorted]},
          colors=[DEEP], legend=False, fs=8.5, num_fmt='0.0', gap=55)
    # 一句话结论表
    verdict = {
        '2722':  '出单率最高(34%)但人均中等 → 达人最容易接单的「普惠款」',
        '28173': '出单率34%、人均仅34 → 靠 25 个达人铺量，每人卖得少但盘子最稳',
        '2789':  '出单率不低(33%)但人均仅5.6 → 达人愿意接、卖不动，产品力弱',
        '2757':  '新测款，出单率31%、人均3.1 → 观察期',
        '2189':  '出单率23%、人均90 → 中规中矩、健康',
        '2178':  '出单率仅9.8%但人均381 → 少数头部硬扛，靠人',
        '2190':  '出单率最低(7.5%)但人均最高(624) → 最靠头部，3人撑1872件',
    }
    rows = [['SKU', '出单率', '人均产出', '一句话结论']]
    for x in ALL7:
        rows.append([x, f'{A[x]["creator_rate"]*100:.1f}%', f'{per(x,A):.0f}',
                     {'t': verdict[x], 'a': PP_ALIGN.LEFT}])
    table(s, 0.6, 4.65, 12.15, [0.85, 0.95, 1.05, 9.3], rows, fsize=9, rowh=0.3, headh=0.34)
    # 口径说明
    rect(s, 0.6, 6.65, 11.55, 0.78, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 0.78, 6.69, 11.3, 0.72, [
        {'t': '口径说明：月度总订单含历史合作达人老视频/新视频在本月回单，不限于本月新推达人。', 's': 9, 'b': True, 'c': DEEP},
        {'t': '「人均产出」= 月度总订单 ÷ 本月新推出单达人数，为混合口径（含自然长尾）：反映每位新推出单达人平均带动的件数，不宜直接读作「每位新达人自己卖了多少」。出单率口径不受影响（只看本月新推达人接样后出单占比）。', 's': 8.3, 'c': INK, 'ls': 1.04}])
    return s

# ============================================================
# P16 SKU 机会矩阵 & 换季接力（卖得多 vs 出单率高，去 Z-score）
# ============================================================
def page16(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    header(s, 'SKU 机会矩阵 & 换季接力', 'Part 03', 16)
    tot = sum(A[k]['orders'] for k in ALL7)
    share = {k: A[k]['orders']/tot for k in ALL7}
    # 纵轴 = 达人出单率（纯本月口径，不受混合影响）
    rate = {k: A[k]['creator_rate'] for k in ALL7}
    def quad(k):
        hs = share[k] >= 0.15          # 卖得多（销售占比≥15%）
        hr = rate[k] >= 0.25            # 出单率高（≥25%）
        if hs and hr: return '主推基本盘'
        if hs and not hr: return '保量款'
        if (not hs) and hr: return '潜力培育款'
        return '观察调整款'
    qcol = {'主推基本盘': GREEN, '保量款': PINK, '潜力培育款': BLUE, '观察调整款': ORANGE}
    # 矩阵区
    ML, MT, MW, MH = 0.6, 1.75, 6.7, 4.35
    rect(s, ML, MT, MW, MH, fill=PINK_PALE, line=PINK_MED, lw=1.5)
    # 中轴线
    rect(s, ML+MW/2-0.008, MT, 0.016, MH, fill=PINK_MED)
    rect(s, ML, MT+MH/2-0.008, MW, 0.016, fill=PINK_MED)
    # 象限标签
    tb(s, ML+0.1, MT+0.05, 2.2, 0.3, [{'t': '潜力培育款', 's': 9, 'b': True, 'c': BLUE}])
    tb(s, ML+MW/2+0.1, MT+0.05, 2.4, 0.3, [{'t': '主推基本盘', 's': 9, 'b': True, 'c': GREEN}])
    tb(s, ML+0.1, MT+MH/2+0.06, 2.2, 0.3, [{'t': '观察调整款', 's': 9, 'b': True, 'c': ORANGE}])
    tb(s, ML+MW/2+0.1, MT+MH/2+0.06, 2.4, 0.3, [{'t': '保量款', 's': 9, 'b': True, 'c': PINK}])
    tb(s, ML+MW/2-1.0, MT+MH+0.04, 2.0, 0.25, [{'t': '卖得多 → 少', 's': 8.5, 'c': GRAY}], align=PP_ALIGN.CENTER)
    tb(s, ML-0.05, MT+MH/2-0.55, 0.65, 1.1, [{'t': '出\n单\n率\n高\n↓', 's': 7.5, 'c': GRAY}], align=PP_ALIGN.CENTER)
    tb(s, ML-0.05, MT+MH/2+0.05, 0.65, 1.1, [{'t': '出\n单\n率\n低\n↓', 's': 7.5, 'c': GRAY}], align=PP_ALIGN.CENTER)
    # 方块落位（按象限，多SKU错开避免重叠）
    pos = {
        '2722': (ML+MW-1.55, MT+0.45), '2190': (ML+MW-1.55, MT+1.1),
        '2178': (ML+MW-1.55, MT+MH-0.62),
        '28173':(ML+0.12, MT+0.45),
        '2189': (ML+0.12, MT+MH-0.62), '2789': (ML+0.12, MT+MH-1.28), '2757': (ML+1.45, MT+MH-0.62),
    }
    for k in ALL7:
        px, py = pos[k]
        q = quad(k); col = qcol[q]
        rect(s, px, py, 1.32, 0.5, fill=col)
        tb(s, px, py+0.02, 1.32, 0.46, [
            {'t': k, 's': 11, 'b': True, 'c': WHITE, 'a': PP_ALIGN.CENTER},
            {'t': f'{share[k]*100:.1f}%', 's': 8.5, 'c': WHITE, 'a': PP_ALIGN.CENTER}], anchor=MSO_ANCHOR.MIDDLE)
    # 右侧分类表（用 出单率 替代 综合效率）
    tb(s, 7.5, 1.6, 5.2, 0.3, [{'t': '分类依据（卖得多 vs 出单率高）', 's': 11.5, 'b': True, 'c': DEEP}])
    rows = [['SKU', '销售占比', '出单率', '分类']]
    for k in sorted(ALL7, key=lambda x: -share[x]):
        q = quad(k)
        rows.append([k, f'{share[k]*100:.1f}%', f'{rate[k]*100:.1f}%',
                     {'t': q, 'b': True, 'c': qcol[q]}])
    table(s, 7.5, 1.95, 5.25, [0.85, 1.0, 0.95, 2.15], rows, fsize=9, rowh=0.3, headh=0.34)
    # 换季接力说明
    rect(s, 7.5, 5.0, 5.25, 1.55, fill=PINK_PALE, line=PINK_MED, lw=1)
    tb(s, 7.68, 5.07, 4.95, 1.45, [
        {'t': '换季接力（夏→秋）', 's': 10.5, 'b': True, 'c': DEEP},
        {'t': '• 夏款短裙：2722 / 2789 / 2757（出单率均>30%，但 2789、2757 人均极低）', 's': 8.5, 'c': INK},
        {'t': '• 秋款长裤：2178 / 2190 / 2189 / 28173（2178、2190 靠头部硬扛）', 's': 8.5, 'c': INK},
        {'t': '• 接力逻辑：夏款已验证的达人，秋款长裤优先复用；28173 达人池最稳，是扩池主战场', 's': 8.5, 'b': True, 'c': DEEP}])
    return s

# ---------- 生成 ----------
prs = Presentation()
prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
page5(prs); page14(prs); page15(prs); page16(prs)
out = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\Dlooda_修改页_4页.pptx'
prs.save(out)
print('SAVED', out)
print('--- 校验 ---')
TC = sum(cov_prod(x)[0] for x in MAIN); TP = sum(cov_prod(x)[1] for x in MAIN)
print('P5 覆盖合计 %.0f + 单产合计 %.0f = %.0f ; 真实环比合计 %d' % (TC, TP, TC+TP, sum(A[x]['orders']-J[x]['orders'] for x in MAIN)))
for k in MAIN:
    c, p = cov_prod(k); assert abs(c+p-(A[k]['orders']-J[k]['orders'])) <= 2, k
print('P5 逐款恒等式 OK')
# P16 落位校验（卖得多 vs 出单率高）
rate = {k: A[k]['creator_rate'] for k in ALL7}; tot2 = sum(A[k]['orders'] for k in ALL7)
for k in ALL7:
    hs = (A[k]['orders']/tot2) >= 0.15; hr = rate[k] >= 0.25
    q = '主推基本盘' if hs and hr else ('保量款' if hs and not hr else ('潜力培育款' if (not hs) and hr else '观察调整款'))
    print('  ', k, '销售%.1f%%' % (A[k]['orders']/tot2*100), '出单率%.1f%%' % (rate[k]*100), '->', q)
