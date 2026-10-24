# -*- coding: utf-8 -*-
"""Dlooda 8月月度汇报 PPT v6 —— 在 v3/v5 版式基础上：
- 修复顶部卡片与图表遮挡
- 每 SKU 差异化分析角度，不再模板化
- 基于用户确认数据 _correct_sku_data.json / _creator_quality_data.json
"""
import os, json, math
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from pptx.oxml.ns import qn

# ---------------- palette ----------------
BG      = RGBColor(0xFF,0xF6,0xF9)
PINK    = RGBColor(0xFC,0xD5,0xE3)
PINK_MED= RGBColor(0xF5,0xA0,0xBC)
PINK_DK = RGBColor(0xE8,0x79,0xA6)
PINK_DEEP = RGBColor(0xC9,0x4F,0x82)
PINK_PALE = RGBColor(0xFC,0xEA,0xF1)
WHITE   = RGBColor(0xFF,0xFF,0xFF)
INK     = RGBColor(0x4A,0x3D,0x42)
INK_SOFT= RGBColor(0x7A,0x6A,0x70)
GREEN   = RGBColor(0x4C,0xAF,0x50)
RED     = RGBColor(0xE5,0x4C,0x4C)
GRAY    = RGBColor(0xB8,0xAE,0xB2)
GOLD    = RGBColor(0xE0,0xA8,0x3C)
BLUE    = RGBColor(0x7C,0x9C,0xD8)
FONT = "Microsoft YaHei"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = 13.333, 7.5
BLANK = prs.slide_layouts[6]

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, '_correct_sku_data.json'), encoding='utf-8') as f:
    D = json.load(f)
with open(os.path.join(ROOT, '_creator_quality_data.json'), encoding='utf-8') as f:
    Q = json.load(f)

if 'data' in D and isinstance(D['data'], dict):
    DATA = D['data']
else:
    DATA = D

# ---------------- helpers ----------------
def set_run(run, size=None, bold=None, color=None, italic=False):
    run.font.name = FONT
    if size is not None: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if color is not None: run.font.color.rgb = color
    run.font.italic = italic
    rPr = run._r.get_or_add_rPr()
    for tag in ('a:ea','a:cs'):
        e = rPr.find(qn(tag))
        if e is None:
            e = rPr.makeelement(qn(tag), {})
            rPr.append(e)
        e.set('typeface', FONT)

def slide_base(title, subtitle=None, part=None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    band = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0), Inches(0), Inches(SW), Inches(1.0))
    band.fill.solid(); band.fill.fore_color.rgb = PINK_DEEP
    band.line.fill.background()
    band.shadow.inherit = False
    try: band.adjustments[0] = 0.0
    except Exception: pass
    draw_bow(s, 0.32, 0.20, 0.9)
    tb = s.shapes.add_textbox(Inches(1.5), Inches(0.08), Inches(9.0), Inches(0.62))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    r = p.add_run(); r.text = title; set_run(r, 22, True, WHITE)
    if subtitle:
        p2 = tf.add_paragraph(); r2 = p2.add_run(); r2.text = subtitle
        set_run(r2, 11, False, PINK_PALE)
    if part:
        ptb = s.shapes.add_textbox(Inches(10.6), Inches(0.10), Inches(2.6), Inches(0.5))
        ptf = ptb.text_frame
        pp = ptf.paragraphs[0]; pp.alignment = PP_ALIGN.RIGHT
        rr = pp.add_run(); rr.text = part; set_run(rr, 11, True, PINK_PALE)
    return s

def draw_bow(s, x, y, scale):
    c = PINK_PALE
    o1 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(0.30*scale*0.35), Inches(0.22*scale*0.35))
    o1.fill.solid(); o1.fill.fore_color.rgb = c; o1.line.fill.background(); o1.shadow.inherit=False
    o2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x+0.22*scale*0.35), Inches(y), Inches(0.30*scale*0.35), Inches(0.22*scale*0.35))
    o2.fill.solid(); o2.fill.fore_color.rgb = c; o2.line.fill.background(); o2.shadow.inherit=False
    k = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x+0.22*scale*0.35), Inches(y+0.03*scale*0.35), Inches(0.13*scale*0.35), Inches(0.16*scale*0.35))
    k.fill.solid(); k.fill.fore_color.rgb = PINK_MED; k.line.fill.background(); k.shadow.inherit=False

def add_rect(s, x, y, w, h, fill=None, line=None, line_w=0.75, radius=0.10, shadow=False):
    sp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line; sp.line.width = Pt(line_w)
    sp.shadow.inherit = shadow
    try: sp.adjustments[0] = radius
    except Exception: pass
    return sp

def add_text(s, x, y, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    first = True
    for ln in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = ln.get('align', align)
        if ln.get('space_after') is not None: p.space_after = Pt(ln['space_after'])
        if ln.get('space_before') is not None: p.space_before = Pt(ln['space_before'])
        prefix = "•  " if ln.get('bullet') else ""
        r = p.add_run(); r.text = prefix + ln['text']
        set_run(r, ln.get('size',12), ln.get('bold',False), ln.get('color',INK))
    return tb

def style_chart(chart, pct=False, show_labels=True, legend=False, colors=None, lbl_size=9):
    chart.has_title = True
    chart.chart_title.text_frame.text = chart.chart_title.text_frame.text
    for r in chart.chart_title.text_frame.paragraphs[0].runs:
        set_run(r, 12, True, INK)
    chart.has_legend = legend
    if legend:
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        try:
            chart.legend.font.size = Pt(9)
            chart.legend.font.name = FONT
            chart.legend.font.color.rgb = INK
        except Exception:
            pass
    chart.font.name = FONT; chart.font.size = Pt(lbl_size); chart.font.color.rgb = INK
    try:
        chart.category_axis.tick_labels.font.size = Pt(lbl_size)
        chart.category_axis.tick_labels.font.name = FONT
        chart.category_axis.tick_labels.font.color.rgb = INK_SOFT
    except Exception: pass
    try:
        chart.value_axis.tick_labels.font.size = Pt(lbl_size)
        chart.value_axis.tick_labels.font.name = FONT
        chart.value_axis.tick_labels.font.color.rgb = INK_SOFT
        chart.value_axis.has_major_gridlines = True
        chart.value_axis.major_gridlines.format.line.color.rgb = PINK
        chart.value_axis.major_gridlines.format.line.width = Pt(0.5)
    except Exception: pass
    nf = '0.0"%"' if pct else '#,##0'
    try:
        plot = chart.plots[0]
        plot.has_data_labels = show_labels
        if show_labels:
            dl = plot.data_labels
            dl.number_format = nf
            dl.number_format_is_linked = False
            dl.position = XL_LABEL_POSITION.OUTSIDE_END
            dl.font.size = Pt(lbl_size); dl.font.name = FONT; dl.font.color.rgb = INK
    except Exception: pass
    if colors:
        for i, col in enumerate(colors):
            try:
                ser = chart.series[i]
                ser.format.fill.solid(); ser.format.fill.fore_color.rgb = col
                ser.format.line.fill.background()
            except Exception: pass

def add_chart(s, x, y, w, h, ctype, cats, series, title, pct=False, show_labels=True,
              legend=False, colors=None, lbl_size=9):
    cd = CategoryChartData()
    cd.categories = cats
    for name, vals in series.items():
        cd.add_series(name, vals)
    gf = s.shapes.add_chart(ctype, Inches(x), Inches(y), Inches(w), Inches(h), cd)
    chart = gf.chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title
    style_chart(chart, pct=pct, show_labels=show_labels, legend=legend, colors=colors, lbl_size=lbl_size)
    return chart

def add_pie_chart(s, x, y, w, h, cats, vals, title, colors=None, lbl_size=9):
    cd = CategoryChartData()
    cd.categories = cats
    cd.add_series('', vals)
    gf = s.shapes.add_chart(XL_CHART_TYPE.PIE, Inches(x), Inches(y), Inches(w), Inches(h), cd)
    chart = gf.chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title
    for r in chart.chart_title.text_frame.paragraphs[0].runs:
        set_run(r, 11, True, INK)
    try:
        plot = chart.plots[0]
        plot.has_data_labels = True
        dl = plot.data_labels
        dl.number_format = '0"%"'
        dl.number_format_is_linked = False
        dl.position = XL_LABEL_POSITION.OUTSIDE_END
        dl.font.size = Pt(lbl_size); dl.font.name = FONT; dl.font.color.rgb = INK
    except Exception: pass
    if colors:
        for i, col in enumerate(colors):
            try:
                ser = chart.series[i]
                ser.format.fill.solid(); ser.format.fill.fore_color.rgb = col
                ser.format.line.fill.background()
            except Exception: pass
    return chart

def set_cell(cell, text, size=10, bold=False, color=INK, fill=None, align=PP_ALIGN.CENTER):
    cell.margin_left = Inches(0.04); cell.margin_right = Inches(0.04)
    cell.margin_top = Inches(0.02); cell.margin_bottom = Inches(0.02)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf = cell.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = text
    set_run(r, size, bold, color)
    if fill is not None:
        cell.fill.solid(); cell.fill.fore_color.rgb = fill
    else:
        cell.fill.solid(); cell.fill.fore_color.rgb = WHITE

def add_table(s, x, y, w, headers, rows, col_widths=None, row_fill=None, font_size=10, hdr_fill=PINK_DEEP):
    nrows = len(rows)+1; ncols = len(headers)
    gt = s.shapes.add_table(nrows, ncols, Inches(x), Inches(y), Inches(w), Inches(0.3*nrows))
    tbl = gt.table
    try:
        tbl.first_row = True; tbl.horz_banding = False
    except Exception: pass
    if col_widths:
        tot = sum(col_widths)
        for i, cw in enumerate(col_widths):
            tbl.columns[i].width = Inches(w * cw / tot)
    for j, h in enumerate(headers):
        set_cell(tbl.cell(0,j), h, font_size, True, WHITE, hdr_fill)
    for i, row in enumerate(rows, start=1):
        rf = row_fill(i-1, row) if row_fill else None
        for j, val in enumerate(row):
            set_cell(tbl.cell(i,j), str(val), font_size, False, INK, rf)
    return tbl

def page_no(s, n):
    tb = s.shapes.add_textbox(Inches(12.4), Inches(7.05), Inches(0.8), Inches(0.35))
    tf = tb.text_frame
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.RIGHT
    r = p.add_run(); r.text = str(n); set_run(r, 9, False, GRAY)

def fmt_pct(v): return f"{v:.1f}%"
def fmt_int(v): return f"{int(v)}"

def change_color(diff):
    if diff > 0: return GREEN
    if diff < 0: return RED
    return INK_SOFT

def change_symbol(diff):
    if diff > 0: return "▲ "
    if diff < 0: return "▼ "
    return "— "

def metric_card(s, x, y, w, h, label, v7, v8, unit='', diff=None):
    CH = 1.55
    add_rect(s, x, y, w, CH, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, y, w, 0.42, fill=PINK_MED, line=None, radius=0.02)
    add_text(s, x, y+0.04, w, 0.34, [dict(text=label, size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    val7 = fmt_pct(v7) if unit=='%' else fmt_int(v7)
    val8 = fmt_pct(v8) if unit=='%' else fmt_int(v8)
    add_text(s, x, y+0.45, w, 0.65, [
        dict(text=val7, size=11, bold=False, color=INK_SOFT),
        dict(text=" → ", size=11, bold=False, color=INK),
        dict(text=val8, size=16, bold=True, color=PINK_DEEP)
    ], align=PP_ALIGN.CENTER)
    if diff is not None:
        col = change_color(diff)
        sym = change_symbol(diff)
        suffix = "pp" if unit=='%' else "件"
        dval = f"{sym}{abs(diff):.1f}{suffix}"
        add_text(s, x, y+1.20, w, 0.30, [dict(text=dval, size=10.5, bold=True, color=col, align=PP_ALIGN.CENTER)])

PN = 0

# =========================================================
# 通用 SKU 页：左文字 + 中图表 + 右图表
# =========================================================
def sku_layout(s, sku_name, period_key, compare_period, labels, vals7, vals8, diffs, units,
               findings, strategy_lines,
               mid_chart_builder, right_chart_builder):
    """通用两图版式：顶部4卡 + 左侧关键发现 + 中部图表 + 右侧图表 + 底部策略"""
    # 顶部 4 卡
    cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
    for i in range(4):
        metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

    # 左侧关键发现
    add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
    for f in findings:
        lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
    add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

    # 中部图表区（默认尺寸）
    mid_chart_builder(s, 4.15, 3.05, 4.25, 2.35)

    # 右侧图表区
    right_chart_builder(s, 8.55, 3.05, 4.1, 2.35)

    # 底部策略
    add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
    strat = [dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4)]
    for st in strategy_lines:
        strat.append(dict(text=st, size=10.5, bold=False, color=INK, space_after=3))
    add_text(s, 0.85, 5.57, 11.5, 0.78, strat)
    page_no(s, PN)

# 顶部 4 卡数据工具
def four_card_data(sku, period_key, compare_period):
    m7 = DATA[compare_period][sku]
    m8 = DATA[period_key][sku]
    labels = ['寄样量','履约率','达人出单率','视频出单率']
    vals7 = [m7['samples'], m7['fulfillRate']*100, m7['creatorOrderRate']*100, m7['videoOrderRate']*100]
    vals8 = [m8['samples'], m8['fulfillRate']*100, m8['creatorOrderRate']*100, m8['videoOrderRate']*100]
    diffs = [m8['samples']-m7['samples'], (m8['fulfillRate']-m7['fulfillRate'])*100,
             (m8['creatorOrderRate']-m7['creatorOrderRate'])*100, (m8['videoOrderRate']-m7['videoOrderRate'])*100]
    units = ['','%','%','%']
    return labels, vals7, vals8, diffs, units, m7, m8

# =========================================================
# cover / toc / divider
# =========================================================
def cover():
    global PN; PN += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    add_rect(s, 0.9, 1.7, 11.5, 4.1, fill=PINK_PALE, line=PINK_MED, line_w=1.25, radius=0.06)
    draw_bow(s, 1.25, 1.0, 3.2)
    add_text(s, 1.4, 2.15, 10.5, 0.45, [dict(text="Dlooda · TikTok Shop 美国站", size=18, bold=True, color=PINK_DEEP, space_after=4)])
    add_text(s, 1.4, 2.95, 10.5, 1.4,
             [dict(text="8 月月度经营汇报", size=40, bold=True, color=INK, space_after=6),
              dict(text="2026.07.15 — 2026.08.15  ·  汇报人：余慧玲", size=15, bold=False, color=INK_SOFT)])
    add_text(s, 1.4, 5.05, 10.5, 0.6,
             [dict(text="淡粉治愈 · Work Pants 双爆款势能延续，内容自然成交走强", size=12, bold=False, color=PINK_DK)])

cover()

PN += 1
s = slide_base("目录 · Contents", part="Overview")
add_text(s, 0.6, 1.4, 12.1, 0.5, [dict(text="四大模块，从整体到单品再到达人结构与复投策略", size=13, bold=False, color=INK_SOFT)])
toc = [
    ("Part 01", "店铺数据总览", "核心 4 项 · 12 SKU 汇总 · 一页结论 + 增长拆解", PINK_DEEP),
    ("Part 02", "各款 SKU 分析", "2178+2190 合并 · 2722 · 28173 · 2189 · 2789 · 2757", PINK_DK),
    ("Part 03", "达人维度洞察", "亮点与流失 · 效率榜（Z-score）· 接力与机会矩阵", PINK_MED),
    ("Part 04", "复投与下月行动", "复投分析（两种口径合一）· 下月 7 项行动", PINK_DEEP),
]
yy = 2.15
for tag, name, desc, col in toc:
    add_rect(s, 0.6, yy, 12.1, 1.05, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, 0.6, yy, 1.7, 1.05, fill=col, line=None, radius=0.08)
    add_text(s, 0.6, yy+0.30, 1.7, 0.5, [dict(text=tag, size=15, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, 2.5, yy+0.16, 10.0, 0.35, [dict(text=name, size=17, bold=True, color=INK)])
    add_text(s, 2.5, yy+0.58, 10.0, 0.4, [dict(text=desc, size=11, bold=False, color=INK_SOFT)])
    yy += 1.18
page_no(s, PN)

def part_divider(tag, title, desc):
    global PN; PN += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = PINK_DEEP
    add_rect(s, 0, 0, SW, SH, fill=PINK_DEEP)
    draw_bow(s, 0.5, 0.5, 2.4)
    add_text(s, 1.2, 2.5, 11, 1.2, [dict(text=tag, size=30, bold=True, color=PINK_PALE)])
    add_text(s, 1.2, 3.4, 11, 1.4, [dict(text=title, size=44, bold=True, color=WHITE)])
    add_text(s, 1.2, 5.0, 11, 1.0, [dict(text=desc, size=15, bold=False, color=PINK_PALE)])

part_divider("Part 01", "店铺数据总览", "先看大盘：寄样、转化、订单、有效达人，以及 12 个 SKU 的全景表现")

# ---- core 4 ----
PN += 1
s = slide_base("核心 4 项 · 整体数据变化", part="Part 01")
cards = [
    ("整体寄样", "329 件", "7月 323 件 → 8月 329 件", PINK_MED, None),
    ("转化效率", "22.8%", "▼ 6.3pp（7月 29.1%）出单/履约达人", RED, "down"),
    ("月度订单", "6,670 件", "▲ 1,960 件（6 常卖款合计）", GREEN, "up"),
    ("有效达人", "66 人", "本期实际出单达人", PINK_DK, None),
]
cx = 0.6; cw = 2.95; gap = 0.18
for i,(t,big,sub,col,arrow) in enumerate(cards):
    x = cx + i*(cw+gap)
    add_rect(s, x, 1.5, cw, 2.1, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, 1.5, cw, 0.55, fill=col, line=None, radius=0.02)
    add_text(s, x, 1.56, cw, 0.45, [dict(text=t, size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, x, 2.15, cw, 0.8, [dict(text=big, size=30, bold=True, color=INK, align=PP_ALIGN.CENTER)])
    add_text(s, x, 2.95, cw, 0.55, [dict(text=sub, size=10.5, bold=False, color=INK_SOFT, align=PP_ALIGN.CENTER)])
add_rect(s, 0.6, 3.95, 12.1, 2.55, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 0.9, 4.1, 11.5, 2.3, [
    dict(text="一句话结论", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="大盘稳中有升：订单 +1,960 件，但转化率 ▼6.3pp —— 增长主要靠「单达人产出提升 + 内容自然成交」，而非达人覆盖扩大。", size=12.5, bold=False, color=INK, space_after=7),
    dict(text="Work Pants 双爆款（2178+2190）持续放量，28173 / 2189 爆发式增长；2789 因头部达人流失小幅下滑，需重点挽回。", size=12.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 12 SKU summary table ----
PN += 1
s = slide_base("12 个 SKU 全景汇总", "定位分色：爆品 / 销售 / 测品 / 未标记", part="Part 01")
headers = ["SKU","定位","寄样","达人","履约率","出单率","月度出单","环比变化"]
rows = []
for sku in ['2178','2190','2722','28173','2189','2789','2A19','2757','28193','28102','2881','2A08']:
    if sku in DATA.get('8月常卖',{}):
        d8 = DATA['8月常卖'][sku]
        d7 = DATA.get('7月常卖',{}).get(sku, DATA.get('7月测款',{}).get(sku, {}))
        pos = D['skuMeta'].get(sku,{}).get('position','未标记')
        mo7 = d7.get('monthlyOrders',0) if d7 else 0
        mo8 = d8.get('monthlyOrders',0)
        ch = mo8 - mo7
        chs = f"{'▲' if ch>=0 else '▼'} {abs(ch)}" if mo7 else str(ch)
        rows.append([sku, pos, int(d8['samples']), int(d8['samples']), fmt_pct(d8['fulfillRate']*100), fmt_pct(d8['creatorOrderRate']*100), f"{int(mo8):,}", chs])
    elif sku in DATA.get('8月测款',{}):
        d8 = DATA['8月测款'][sku]
        pos = D['skuMeta'].get(sku,{}).get('position','测品')
        rows.append([sku, pos, int(d8['samples']), int(d8['samples']), fmt_pct(d8['fulfillRate']*100), fmt_pct(d8['creatorOrderRate']*100), f"{int(d8['monthlyOrders']):,}","新测"])

def row_fill_12(i, row):
    pos = row[1]
    if pos == "爆品": return PINK_PALE
    if pos == "销售": return RGBColor(0xFD,0xF1,0xF5)
    if pos == "测品": return RGBColor(0xF3,0xEF,0xF0)
    return WHITE
add_table(s, 0.6, 1.45, 12.1, headers, rows,
          col_widths=[1.3,1.3,1.0,1.0,1.4,1.4,1.7,1.7], row_fill=row_fill_12, font_size=10.5)
add_text(s, 0.6, 6.75, 12.1, 0.4,
         [dict(text="注：出单率 = 出单达人 / 寄样达人；月度出单为达人端月度总出单件数。", size=9.5, bold=False, color=GRAY)])
page_no(s, PN)

# ---- one-page conclusion + waterfall ----
PN += 1
s = slide_base("一页结论 · 增长从哪里来？", part="Part 01")
orders7 = [DATA['7月常卖'][k]['monthlyOrders'] for k in ['2178','2190','2722','2189','28173','2789']]
orders8 = [DATA['8月常卖'][k]['monthlyOrders'] for k in ['2178','2190','2722','2189','28173','2789']]
add_text(s, 0.6, 1.25, 6.0, 0.4, [dict(text="6 常卖款：月度订单 7月 → 8月", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.65, 6.1, 3.0, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"7月":orders7, "8月":orders8},
          "月度订单（件）", colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
covers7 = [DATA['7月常卖'][k]['orderCreators'] for k in ['2178','2190','2722','2189','28173','2789']]
covers8 = [DATA['8月常卖'][k]['orderCreators'] for k in ['2178','2190','2722','2189','28173','2789']]
spp7 = [o/c if c else 0 for o,c in zip(orders7, covers7)]
spp8 = [o/c if c else 0 for o,c in zip(orders8, covers8)]
cover_effect = [c2-c1 for c1,c2 in zip(covers7, covers8)]
spp_effect = [(s2-s1)*(c2) for s1,s2,c2 in zip(spp7, spp8, covers8)]
add_text(s, 6.9, 1.25, 6.0, 0.4, [dict(text="增长拆解：覆盖效应 vs 单产效应", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 6.8, 1.65, 6.0, 3.0, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"覆盖效应":cover_effect, "单产效应":spp_effect},
          "对订单变化的贡献（件）", colors=[GRAY, PINK_DK], legend=True, lbl_size=8)
add_rect(s, 0.6, 4.95, 12.1, 1.5, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 0.9, 5.05, 11.5, 1.35, [
    dict(text="结论", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="6 常卖款合计 ▲1,960 件，其中「单达人产出效应」是主因（尤其是 2190/2189/28173），「达人覆盖效应」有正有负。", size=12, bold=False, color=INK, space_after=4),
    dict(text="即：订单增长不是因为触达了更多达人，而是已合作达人卖得更多 —— 内容自然成交 + 老达人复投见效。下阶段应把预算从「广撒网拉新」转向「优寄少寄 + 复投已验证达人」。", size=12, bold=False, color=INK),
])
page_no(s, PN)

# =========================================================
# PART 02
# =========================================================
part_divider("Part 02", "各款 SKU 分析", "每款一个视角：双爆款合并、老粉复购、内容爆发、新客稀释、头部流失、测款潜力")

# ---- 2178 + 2190 合并：达人质量稀释 ----
PN += 1
s = slide_base("2178 + 2190 · Work Pants 双爆款合并", "达人出单率低但视频出单率尚可 → 出单集中老达人，新达人质量稀释", part="Part 02")
# 顶部 4 卡（合计）
m7_2178 = DATA['7月常卖']['2178']; m8_2178 = DATA['8月常卖']['2178']
m7_2190 = DATA['7月常卖']['2190']; m8_2190 = DATA['8月常卖']['2190']
samples7 = m7_2178['samples']+m7_2190['samples']; samples8 = m8_2178['samples']+m8_2190['samples']
ful7 = (m7_2178['fulfilled']+m7_2190['fulfilled'])/samples7*100; ful8 = (m8_2178['fulfilled']+m8_2190['fulfilled'])/samples8*100
ocr7 = (m7_2178['orderCreators']+m7_2190['orderCreators'])/samples7*100; ocr8 = (m8_2178['orderCreators']+m8_2190['orderCreators'])/samples8*100
ovr7 = (m7_2178['orderVideos']+m7_2190['orderVideos'])/(m7_2178['videos']+m7_2190['videos'])*100
ovr8 = (m8_2178['orderVideos']+m8_2190['orderVideos'])/(m8_2178['videos']+m8_2190['videos'])*100
labels = ['寄样量','履约率','达人出单率','视频出单率']
vals7 = [samples7, ful7, ocr7, ovr7]
vals8 = [samples8, ful8, ocr8, ovr8]
diffs = [samples8-samples7, ful8-ful7, ocr8-ocr7, ovr8-ovr7]
units = ['','%','%','%']
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

# 左侧关键发现
findings = [
    "两款达人出单率大幅下滑（2178 -5.3pp / 2190 -12.9pp），但视频出单率仍维持 27% 左右，说明出单集中在少数老达人。",
    "2178 寄样量 +40 但视频素材反而 -12，履约率 -8.4pp，新达人履约意愿下降。",
    "达人质量未提升：8月 L0-1/L2 占比高、3★及以下占比高、核心达人占比极低。",
    "合计月度订单 3,544 件（▲749），增量来自老达人高产出，而非新达人放量。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：达人出单率 vs 视频出单率 对比（说明人率低但视频率高）
add_chart(s, 4.15, 3.05, 4.25, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['2178','2190'],
          {'达人出单率（8月）':[m8_2178['creatorOrderRate']*100, m8_2190['creatorOrderRate']*100],
           '视频出单率（8月）':[m8_2178['videoOrderRate']*100, m8_2190['videoOrderRate']*100]},
          '达人出单率 vs 视频出单率（8月）', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

# 右侧：达人质量结构柱图（7月 vs 8月 的 L3+ / 4★+ / 核心达人）
q7_2178 = Q['7月常卖']['2178']; q8_2178 = Q['8月常卖']['2178']
q7_2190 = Q['7月常卖']['2190']; q8_2190 = Q['8月常卖']['2190']
def quality_counts(q):
    L3p = sum(q['officialDist'].get(k,0) for k in ['L3','L4','L5','L6'])
    s4p = sum(q['starsDist'].get(k,0) for k in ['4★','5★'])
    core = q['typeDist'].get('核心达人',0)
    return [L3p, s4p, core]
q7 = [quality_counts(q7_2178)[i] + quality_counts(q7_2190)[i] for i in range(3)]
q8 = [quality_counts(q8_2178)[i] + quality_counts(q8_2190)[i] for i in range(3)]
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['L3+','4★+','核心达人'],
          {'7月':q7, '8月':q8},
          '达人质量结构（人）', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

# 底部策略
add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="优寄少寄：暂停大规模新达人铺量，优先 L3+/4★+/核心达人及历史已出单老达人复投；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="严控履约：第 7/14 天两次跟进，未发视频立即停止二次寄样；组合款统一招募，提升单达人产出。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 2722 : 减量增效 ----
PN += 1
s = slide_base("SKU 2722 Crossover Skort", "夏季爆款 · 减量收尾", part="Part 02")
labels, vals7, vals8, diffs, units, m7, m8 = four_card_data('2722','8月常卖','7月常卖')
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

findings = [
    "达人出单率 20.95%→26.67%↑，视频出单率 25.36%→32.91%↑，双率同步提升；",
    "说明上月「缩小寄样量、提高达人质量」策略有效；",
    "但 2722 是夏季短裙，季节窗口收窄，8月后应逐步停寄。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：达人出单率 + 视频出单率 双指标对比（7月 vs 8月）
add_chart(s, 4.15, 3.05, 4.25, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'达人出单率':[m7['creatorOrderRate']*100, m8['creatorOrderRate']*100],
           '视频出单率':[m7['videoOrderRate']*100, m8['videoOrderRate']*100]},
          '达人/视频出单率变化', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

# 右侧：7月 vs 8月达人结构饼图
q7 = Q['7月常卖']['2722']; q8 = Q['8月常卖']['2722']
old7 = q7.get('oldCreators',{}).get('count',0); new7 = q7.get('newCreators',{}).get('count',0)
old8 = q8.get('oldCreators',{}).get('count',0); new8 = q8.get('newCreators',{}).get('count',0)
if old7+new7 == 0: old7, new7 = 1, 0
if old8+new8 == 0: old8, new8 = 1, 0
# 改为两个饼图上下但尺寸合适
add_pie_chart(s, 8.55, 3.05, 2.0, 1.2, ['老达人','新达人'], [old7, new7], '7月结构', colors=[PINK_DEEP, PINK_MED], lbl_size=8)
add_pie_chart(s, 10.6, 3.05, 2.0, 1.2, ['老达人','新达人'], [old8, new8], '8月结构', colors=[PINK_DEEP, PINK_MED], lbl_size=8)

add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="暂停寄样：资源转向秋冬长裤（2178/2190/28173 等），2722 仅维护已出单达人复投；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="保留高产出老达人素材，用于秋季引流参考。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 28173 : 内容自然流量爆发 ----
PN += 1
s = slide_base("SKU 28173 Wide Leg Work Pants", "高级感阔腿 · 内容驱动爆发", part="Part 02")
labels, vals7, vals8, diffs, units, m7, m8 = four_card_data('28173','8月常卖','7月常卖')
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

findings = [
    "寄样 67→86（+19），履约率 88.1%→90.7%，达人出单率 23.88%→26.74%；",
    "视频出单率 23.91%→31.70%↑，出单视频数 33→84↑，内容自然流量爆发；",
    "自然单占比 60.7%→81.6%↑，是增长核心驱动。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：自然单占比饼图（7月 vs 8月）+ 视频数/出单视频数
org7 = m7.get('organicRate',0)*100; org8 = m8.get('organicRate',0)*100
# 用两个饼图
add_pie_chart(s, 4.15, 3.05, 2.0, 1.2, ['自然单','付费单'], [org7, 100-org7], '7月自然单占比', colors=[PINK_DEEP, PINK_MED], lbl_size=8)
add_pie_chart(s, 6.2, 3.05, 2.0, 1.2, ['自然单','付费单'], [org8, 100-org8], '8月自然单占比', colors=[PINK_DEEP, PINK_MED], lbl_size=8)

# 右侧：视频数量 vs 出单视频数 + 达人质量变化
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.BAR_CLUSTERED,
          ['7月','8月'],
          {'视频数量':[m7['videos'], m8['videos']], '出单视频数':[m7['orderVideos'], m8['orderVideos']]},
          '视频数量 vs 出单视频数', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="保持放量节奏：预算加码至已验证达人复投；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="对高自然单视频做二次剪辑/加热，放大内容自带成交。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 2189 : 老达人流失 ----
PN += 1
s = slide_base("SKU 2189 Work Pants 经典款", "老达人流失 · 需补达人池", part="Part 02")
labels, vals7, vals8, diffs, units, m7, m8 = four_card_data('2189','8月常卖','7月常卖')
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

q7_2189 = Q['7月常卖']['2189']; q8_2189 = Q['8月常卖']['2189']
proven7 = q7_2189.get('provenOldCreators',{}).get('count',0)
proven8 = q8_2189.get('provenOldCreators',{}).get('count',0)
old7 = q7_2189.get('oldCreators',{}).get('count',0); new7 = q7_2189.get('newCreators',{}).get('count',0)
old8 = q8_2189.get('oldCreators',{}).get('count',0); new8 = q8_2189.get('newCreators',{}).get('count',0)
if old7+new7==0: old7,new7=1,0
if old8+new8==0: old8,new8=1,0

findings = [
    "达人出单率 42.42%→21.05%↓，视频出单率稳定在 35.80%；",
    f"有带货能力老达人（已出单复投）减少：7月 {proven7} 人 → 8月 {proven8} 人；",
    "老达人对 2189 兴趣下降，复投数据也显示同款复投效果弱。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：有带货能力老达人数量变化 + 新老达人结构
add_chart(s, 4.15, 3.05, 4.25, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'已出单老达人':[proven7, proven8], '新达人':[new7, new8]},
          '已出单老达人 vs 新达人（人）', colors=[PINK_DEEP, PINK_MED], legend=True, lbl_size=9)

# 右侧：复投成功率（按 SKU 拆分）
reinvest_nums = {
    '2178':(67,6,46,15,12),'2190':(50,3,33,14,8),'2722':(15,0,12,3,0),
    '2189':(35,1,24,10,4),'28173':(12,0,9,3,0),'2789':(18,0,14,4,0),
}
# 改用 2189 复投结果小表
add_rect(s, 8.55, 3.05, 4.1, 2.35, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_text(s, 8.7, 3.05, 3.8, 0.35, [dict(text="2189 复投表现", size=12, bold=True, color=PINK_DEEP)])
a,b,c,d,e = reinvest_nums['2189']
add_text(s, 8.7, 3.47, 3.8, 1.75, [
    dict(text=f"复投声明 {a} 条", size=11, bold=False, color=INK, space_after=6),
    dict(text=f"成功 {b} / 未成功 {c} / 观察中 {d}", size=11, bold=False, color=INK, space_after=6),
    dict(text=f"成功率 {e}%", size=14, bold=True, color=RED, space_after=6),
    dict(text="复投效果弱进一步印证老达人兴趣下降。", size=10, bold=False, color=INK_SOFT),
])

add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="扩大达人池：补充新达人测品，用低门槛首单验证带货力；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="激活历史带货老达人：定向 bonus + 组合款（2178/2190）联动复投。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 2789 : 下滑预警 ----
PN += 1
s = slide_base("SKU 2789 Four-Pocket Skort", "头部流失 · 下滑预警", part="Part 02")
labels, vals7, vals8, diffs, units, m7, m8 = four_card_data('2789','8月常卖','7月常卖')
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

# 头部达人出单：需要数据，用月度订单近似拆分或 video 数据
head7 = m7.get('topCreatorOrders',33)  # 用户提到 33→2
head8 = m8.get('topCreatorOrders',2)
# 通过率变化（从 _correct_sku_data 里的 passRate）
p7 = m7.get('passRate',0)*100; p8 = m8.get('passRate',0)*100

findings = [
    "月度订单 88→37↓，达人出单率 22.64%→21.88% 基本稳定；",
    "视频出单率 28.81%→21.31%↓，头部达人出单从 33 件跌至 2 件；",
    "履约率 84.9%→71.9%↓，通过率下滑说明新达人筛选或跟进有问题。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：头部达人出单变化 + 月度订单变化
add_chart(s, 4.15, 3.05, 4.25, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'头部达人出单':[head7, head8], '其他达人出单':[m7['monthlyOrders']-head7, m8['monthlyOrders']-head8]},
          '月度订单结构变化（件）', colors=[PINK_DEEP, PINK_MED], legend=True, lbl_size=9)

# 右侧：履约率 + 通过率变化
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'履约率':[m7['fulfillRate']*100, m8['fulfillRate']*100], '通过率':[p7, p8]},
          '履约率 vs 通过率（%）', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="缩小寄样量、提高达人质量：暂停向低等级/低星级达人寄样；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="重点挽回上期出单头部达人，补素材 + 优化口播卖点。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 2757 : 测款 ----
PN += 1
s = slide_base("SKU 2757 Lace Skort", "秋季测款 · 潜力可追", part="Part 02")
# 顶部 4 卡：2757 8月测款 vs 2722 8月常卖
m_2722 = DATA['8月常卖']['2722']; m_2757 = DATA['8月测款']['2757']
labels = ['寄样量（对比）','履约率','达人出单率','视频出单率']
vals7 = [m_2722['samples'], m_2722['fulfillRate']*100, m_2722['creatorOrderRate']*100, m_2722['videoOrderRate']*100]
vals8 = [m_2757['samples'], m_2757['fulfillRate']*100, m_2757['creatorOrderRate']*100, m_2757['videoOrderRate']*100]
diffs = [m_2757['samples']-m_2722['samples'], (m_2757['fulfillRate']-m_2722['fulfillRate'])*100,
         (m_2757['creatorOrderRate']-m_2722['creatorOrderRate'])*100, (m_2757['videoOrderRate']-m_2722['videoOrderRate'])*100]
units = ['','%','%','%']
for i in range(4):
    metric_card(s, x0+i*(cw+gap), y0, cw, 1.55, labels[i], vals7[i], vals8[i], units[i], diffs[i])

findings = [
    "2757 测款 35 寄样，达人出单率 22.86%，视频出单率 25.64%；",
    "与 2722 爆款（26.67% / 32.91%）差距不大，具备承接短裙流量的潜力；",
    "但目前库存未到，限制了放量。"
]
add_rect(s, 0.7, 3.05, 3.2, 2.45, fill=WHITE, line=PINK, line_w=1, radius=0.08)
lines = [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP, space_after=5)]
for f in findings:
    lines.append(dict(text=f, size=10, bold=False, color=INK, space_after=4))
add_text(s, 0.85, 3.15, 2.9, 2.25, lines)

# 中部：2757 vs 2722 各项指标对比
add_chart(s, 4.15, 3.05, 4.25, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['履约率','达人出单率','视频出单率'],
          {'2722（8月）':[m_2722['fulfillRate']*100, m_2722['creatorOrderRate']*100, m_2722['videoOrderRate']*100],
           '2757（测款）':[m_2757['fulfillRate']*100, m_2757['creatorOrderRate']*100, m_2757['videoOrderRate']*100]},
          '2757 vs 2722 核心指标（%）', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=9)

# 右侧：2757 达人结构
q_2757 = Q['8月测款']['2757']
L2 = q_2757['officialDist'].get('L2',0)
L3p = sum(q_2757['officialDist'].get(k,0) for k in ['L3','L4','L5','L6'])
star_low = sum(q_2757['starsDist'].get(k,0) for k in ['1★','2★','3★'])
star_high = sum(q_2757['starsDist'].get(k,0) for k in ['4★','5★'])
# 官方等级 + 星级两个并排的饼图
add_pie_chart(s, 8.55, 3.05, 2.0, 1.2, ['L2','L3+'], [L2, L3p], '官方等级', colors=[PINK_MED, PINK_DEEP], lbl_size=8)
add_pie_chart(s, 10.6, 3.05, 2.0, 1.2, ['3★及以下','4★+'], [star_low, star_high], '星级结构', colors=[PINK_MED, PINK_DEEP], lbl_size=8)

add_rect(s, 0.7, 5.50, 12.0, 1.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.85, 5.57, 11.5, 0.78, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="到货后继续寄样，优先邀请 2722 已验证老达人测款；", size=10.5, bold=False, color=INK, space_after=3),
    dict(text="若 2757 复购率接近 2722，则作为秋季短裙主力承接夏季爆款流量。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# =========================================================
# PART 03
# =========================================================
part_divider("Part 03", "达人维度洞察", "谁在卖货、谁流失了、哪款最容易被卖起来、新品能否接力")

# ---- 达人亮点与流失预警 ----
PN += 1
s = slide_base("达人亮点与流失预警", "哪些达人效率高、卖什么款容易出单", part="Part 03")
add_text(s, 0.6, 1.25, 6.0, 0.4, [dict(text="8月 Top5 出单达人", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.65, 6.1, 3.4, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["heyitsamber44","danakkt","jerlenimarte","gabriepearl","madijo"],
          {"出单件":[214,84,64,46,28]},
          "8月出单 Top5（件）", colors=[PINK_DEEP], legend=False, lbl_size=9)
add_rect(s, 6.9, 1.45, 5.8, 3.6, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 7.1, 1.55, 5.4, 3.4, [
    dict(text="🌟 高效达人画像", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="Top5 中 4 位出单 Work Pants 系列，1 位出单 2722；", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="老达人复投产出显著高于新达人首单；", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="核心/高曝光达人占比仍低，筛选画像需向高等级/高星级倾斜。", size=11.5, bold=False, color=INK, space_after=8),
    dict(text="⚠️ 流失预警", size=13, bold=True, color=RED, space_after=5),
    dict(text="7月头部 imaniiibrooks(379)/ljac888(113)/yetsika(105)/nairireyes(88) 8月未出单，需定向挽回。", size=11.5, bold=False, color=INK, space_after=6),
    dict(text="💡 落点：因地制宜，什么款达人容易出单就优先寄什么款。", size=11, bold=True, color=PINK_DK),
])
page_no(s, PN)

# ---- 效率榜 ----
PN += 1
s = slide_base("全 SKU 达人效率榜", "Z-score = 出单率 Z + 单达人产出 Z", part="Part 03")
skus_eff = ['2722','2789','28173','2189','2178','2190']
ocr = [DATA['8月常卖'][k]['creatorOrderRate']*100 for k in skus_eff]
spp = [DATA['8月常卖'][k]['monthlyOrders']/max(DATA['8月常卖'][k]['orderCreators'],1) for k in skus_eff]
def zscore(vals):
    m = sum(vals)/len(vals)
    sd = math.sqrt(sum((v-m)**2 for v in vals)/len(vals)) or 1
    return [(v-m)/sd for v in vals]
zocr = zscore(ocr); zspp = zscore(spp)
score = [a+b for a,b in zip(zocr, zspp)]
rows = []
for i,sku in enumerate(skus_eff):
    rows.append([sku, fmt_pct(ocr[i]), f"{spp[i]:.1f}", f"{score[i]:.2f}"])
rows.sort(key=lambda r: float(r[3]), reverse=True)
headers = ["SKU","出单率","单达人产出","综合效率分"]
add_table(s, 0.6, 1.45, 5.5, headers, rows,
          col_widths=[1.3,1.5,1.8,1.8], font_size=11)
add_text(s, 0.6, 4.55, 5.5, 0.4, [dict(text="Z-score 说明：综合效率分 =（出单率Z）+（单达人产出Z），分数越高越易被卖起来", size=9.5, bold=False, color=GRAY)])
add_text(s, 6.5, 1.25, 6.3, 0.4, [dict(text="综合效率分排名", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 6.4, 1.65, 6.3, 3.2, XL_CHART_TYPE.BAR_CLUSTERED,
          [r[0] for r in rows],
          {"综合效率分":[float(r[3]) for r in rows]},
          "综合效率分（Z-score）", colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_rect(s, 6.4, 5.0, 6.3, 1.2, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 6.6, 5.1, 5.9, 1.0, [
    dict(text="落点：效率榜 Top SKU 优先精准寄样；低效率 SKU 减少广撒网，改老达人复投。", size=11, bold=True, color=INK),
])
page_no(s, PN)

# ---- SKU 接力 & 机会矩阵 ----
PN += 1
s = slide_base("SKU 接力 & 机会矩阵", "新品能否承接老款波动？预算往哪投？", part="Part 03")
matrix_skus = ['2178','2190','2722','28173','2189','2789','2757']
total_sales = sum(DATA['8月常卖'].get(k,{}).get('monthlyOrders',0) for k in matrix_skus if k in DATA.get('8月常卖',{}))
total_sales += DATA['8月测款'].get('2757',{}).get('monthlyOrders',0)
sales_share = {}
for k in matrix_skus:
    sales_share[k] = (DATA['8月常卖'].get(k,{}).get('monthlyOrders', DATA['8月测款'].get(k,{}).get('monthlyOrders',0)) / total_sales * 100)
ocr_m = [DATA['8月常卖'].get(k,{}).get('creatorOrderRate',0)*100 if k in DATA.get('8月常卖',{}) else DATA['8月测款'].get(k,{}).get('creatorOrderRate',0)*100 for k in matrix_skus]
spp_m = [(DATA['8月常卖'].get(k,{}).get('monthlyOrders', DATA['8月测款'].get(k,{}).get('monthlyOrders',0)) / max(DATA['8月常卖'].get(k,{}).get('orderCreators', DATA['8月测款'].get(k,{}).get('orderCreators',1)),1)) for k in matrix_skus]
zocr_m = zscore(ocr_m); zspp_m = zscore(spp_m)
score_m = [a+b for a,b in zip(zocr_m, zspp_m)]
mx, my = 0.7, 1.45
mw, mh = 6.0, 4.5
qx = [mx, mx+mw/2]; qy = [my, my+mh/2]
quad_cols = [PINK_PALE, RGBColor(0xFD,0xF1,0xF5), RGBColor(0xFD,0xF1,0xF5), WHITE]
quad_names = ['明星\n高销售+高效率','现金牛\n高销售+低效率','机会\n低销售+高效率','瘦狗\n低销售+低效率']
for i in range(4):
    r = i//2; c = i%2
    add_rect(s, qx[c], qy[r], mw/2, mh/2, fill=quad_cols[i], line=PINK, line_w=0.5, radius=0.03)
    add_text(s, qx[c]+0.05, qy[r]+mh/2-0.36, mw/2-0.1, 0.32, [dict(text=quad_names[i], size=8, bold=False, color=INK_SOFT, align=PP_ALIGN.LEFT)])
add_rect(s, mx+mw/2-0.01, my, 0.02, mh, fill=INK_SOFT, line=None, radius=0)
add_rect(s, mx, my+mh/2-0.01, mw, 0.02, fill=INK_SOFT, line=None, radius=0)
add_text(s, mx, my-0.45, mw, 0.3, [dict(text="销售贡献（月度订单占比）→", size=9, bold=False, color=INK_SOFT, align=PP_ALIGN.CENTER)])
add_text(s, mx-0.45, my, 0.4, mh, [dict(text="← 综合效率分", size=9, bold=False, color=INK_SOFT)])
xmax = max(sales_share.values())*1.15 or 100
ymax = max(abs(v) for v in score_m)*1.2 or 1
for sku in matrix_skus:
    ss = sales_share[sku]
    sc = score_m[matrix_skus.index(sku)]
    px = mx + (ss/xmax)*mw
    py = my + mh - ((sc - min(score_m))/(max(score_m)-min(score_m)+0.001))*mh
    px = max(mx+0.15, min(px, mx+mw-0.3))
    py = max(my+0.15, min(py, my+mh-0.3))
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(px), Inches(py), Inches(0.18), Inches(0.18))
    dot.fill.solid(); dot.fill.fore_color.rgb = PINK_DEEP; dot.line.fill.background()
    add_text(s, px+0.2, py-0.05, 0.8, 0.25, [dict(text=sku, size=9, bold=True, color=INK)])
add_rect(s, 7.0, 1.45, 5.7, 4.5, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 7.2, 1.6, 5.3, 4.2, [
    dict(text="矩阵解读", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="· 明星：28173 销售贡献高且效率向上，内容自然单爆发，是秋季主推基本盘；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="· 现金牛：2178/2190 订单体量大但效率大幅下滑，需「保量提质」，不能继续放量稀释；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="· 机会：2189 达人效率仍高但销售占比小，扩大精准寄样可成新增长极；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="· 瘦狗：2789 销售贡献低且效率一般，减少投入、清库存为主；2722 是夏季爆款，季节窗口收窄，不属秋季主推。", size=10.5, bold=False, color=INK, space_after=6),
    dict(text="落点：", size=11, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="新品 2757 到货后，用 2722/28173 已验证达人承接流量；2189 扩大精准测款；2789 控制寄样。", size=10.5, bold=False, color=INK),
])
page_no(s, PN)

# =========================================================
# PART 04
# =========================================================
part_divider("Part 04", "复投与下月行动", "复投两种口径合一 · 行动逐条落地")

# ---- 复投分析（合一页） ----
PN += 1
s = slide_base("复投分析 · 两种口径", "按 SKU 拆分，声明后成功时间不限于报告期内", part="Part 04")
headers = ["SKU","复投声明","成功","未成功","观察中","成功率"]
reinvest_nums = {
    '2178':(67,6,46,15,12),'2190':(50,3,33,14,8),'2722':(15,0,12,3,0),
    '2189':(35,1,24,10,4),'28173':(12,0,9,3,0),'2789':(18,0,14,4,0),
}
rows = []
for sku in ['2178','2190','2722','2189','28173','2789']:
    a,b,c,d,e = reinvest_nums[sku]
    rows.append([sku, a, b, c, d, f"{e}%"])
add_text(s, 0.6, 1.2, 6.2, 0.3, [dict(text="① 不同 SKU 复投", size=12, bold=True, color=PINK_DEEP)])
add_table(s, 0.6, 1.5, 6.2, headers, rows, col_widths=[1.0,1.2,0.9,1.1,1.1,1.1], font_size=10)
add_text(s, 0.6, 4.0, 6.2, 0.6, [dict(text="注：普通复投成功率普遍偏低（0%-12%），核心问题是「复投了但没跟到位」。", size=9.5, bold=False, color=GRAY)])
add_text(s, 6.9, 1.2, 5.8, 0.3, [dict(text="② 同一 SKU 复投（2178+2190 同款跟进）", size=12, bold=True, color=PINK_DEEP)])
add_rect(s, 6.9, 1.5, 5.8, 2.1, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 7.05, 1.62, 5.5, 1.9, [
    dict(text="合计联系 206 人：成功 18 / 失败 19 / 未回复 169", size=10.5, bold=True, color=INK, space_after=6),
    dict(text="流程：后台私信达人 → 跟踪是否申请/是否看消息 → 已读不回再次发送；", size=10, bold=False, color=INK, space_after=4),
    dict(text="爆单达人若后台私信无响应，再用抖音号私信触达。", size=10, bold=False, color=INK),
])
add_table(s, 6.9, 3.75, 5.8, ["结果","人数","占比"],
          [["成功",18,"8.7%"],["失败",19,"9.2%"],["未回复",169,"82.0%"]],
          col_widths=[1.3,1.2,1.2], font_size=10)
add_rect(s, 0.6, 5.0, 12.1, 1.2, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.8, 5.12, 11.7, 1.0, [
    dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="定期维护复投池，建立复投达人跟进 SOP；加强复投策略并优化话术，对爆单/高潜达人提高跟进频次。", size=11, bold=False, color=INK),
])
page_no(s, PN)

# ---- 下月行动 ----
PN += 1
s = slide_base("下月行动 · 7 项落地清单", part="Part 04")
acts = [
    ("1","复投从「广撒网」改「定向复投」","只复投上期已出单达人并配专属 bonus；2178+2190 同款复投对未回复者二次跟进。", PINK_DEEP),
    ("2","2178 / 2190 优寄少寄","暂停大规模新达人铺量，优先 L3+/4★+/核心达人及老达人复投；严控履约。", PINK_DK),
    ("3","头部达人挽回","imaniiibrooks / ljac888 / yetsika / nairireyes 等逐一挽回，建立「上期出单 100% 复投」清单。", PINK_MED),
    ("4","新达人 SOP","首轮只寄 1 件测品验证带货力，出单后再开放主推；第 7/14 天两次跟进。", PINK_DEEP),
    ("5","扩大 2189 达人池","老达人兴趣下降，补充新达人并强化复投激活历史带货达人。", PINK_DK),
    ("6","视频端乘势加投","自然单占比高、内容自带成交；对高自然单视频二次剪辑/加热。", PINK_MED),
    ("7","机会矩阵指导预算","60% 给 28173/2189 等高增长款，30% 给 2757 测品，10% 用于头部挽回。", PINK_DEEP),
]
col_w = 6.0; x0 = 0.6; x1 = 6.85; y0 = 1.35; rh = 1.25; rg = 0.10
for i,(n,t,d,col) in enumerate(acts):
    if i < 6:
        colx = x0 if i % 2 == 0 else x1
        rowy = y0 + (i // 2) * (rh + rg)
        add_rect(s, colx, rowy, col_w, rh, fill=WHITE, line=PINK, line_w=1, radius=0.07)
        add_rect(s, colx, rowy, 0.7, rh, fill=col, line=None, radius=0.02)
        add_text(s, colx, rowy+0.42, 0.7, 0.5, [dict(text=n, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
        add_text(s, colx+0.85, rowy+0.1, col_w-1.0, 0.45, [dict(text=t, size=12.5, bold=True, color=INK)])
        add_text(s, colx+0.85, rowy+0.52, col_w-1.0, 0.68, [dict(text=d, size=10, bold=False, color=INK_SOFT)])
    else:
        rowy = y0 + 3 * (rh + rg)
        add_rect(s, x0, rowy, 11.6, rh, fill=PINK_PALE, line=PINK_DEEP, line_w=1.25, radius=0.07)
        add_rect(s, x0, rowy, 0.7, rh, fill=PINK_DEEP, line=None, radius=0.02)
        add_text(s, x0, rowy+0.42, 0.7, 0.5, [dict(text=n, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
        add_text(s, x0+0.85, rowy+0.1, 10.5, 0.38, [dict(text=t, size=12.5, bold=True, color=PINK_DEEP)])
        add_text(s, x0+0.85, rowy+0.52, 10.5, 0.68, [dict(text=d, size=10.5, bold=False, color=INK)])
page_no(s, PN)

# =========================================================
# save
# =========================================================
OUT = os.path.join(ROOT, "..", "Dlooda_8月月度汇报_v6.pptx")
OUT = os.path.abspath(OUT)
prs.save(OUT)
print("SAVED:", OUT, "slides:", len(prs.slides._sldIdLst))
