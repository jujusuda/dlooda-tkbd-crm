# -*- coding: utf-8 -*-
"""Dlooda 8月月度汇报 PPT v7 —— 用户修改版数据 + 六 SKU 差异化分析视角
数据来源：用户最终确认版（余慧玲8月月度汇报.pptx），全部数字原样保留不动。
差异化：每个 SKU 一个独立的电商分析框架，不再"出单率涨跌"千篇一律。
"""
import os
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
AMBER   = RGBColor(0xF0,0xA5,0x3A)
FONT = "Microsoft YaHei"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = 13.333, 7.5
BLANK = prs.slide_layouts[6]

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
    band.line.fill.background(); band.shadow.inherit = False
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
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(line_w)
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
    for r in chart.chart_title.text_frame.paragraphs[0].runs:
        set_run(r, 11, True, INK)
    chart.has_legend = legend
    if legend:
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
        try:
            chart.legend.font.size = Pt(9); chart.legend.font.name = FONT; chart.legend.font.color.rgb = INK
        except Exception: pass
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

def add_pie_chart(s, x, y, w, h, cats, vals, title, colors=None, lbl_size=8):
    cd = CategoryChartData()
    cd.categories = cats
    cd.add_series('', vals)
    gf = s.shapes.add_chart(XL_CHART_TYPE.PIE, Inches(x), Inches(y), Inches(w), Inches(h), cd)
    chart = gf.chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title
    for r in chart.chart_title.text_frame.paragraphs[0].runs:
        set_run(r, 10, True, INK)
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
    cell.margin_left = Inches(0.05); cell.margin_right = Inches(0.05)
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
    gt = s.shapes.add_table(nrows, ncols, Inches(x), Inches(y), Inches(w), Inches(0.32*nrows))
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

def metric_card(s, x, y, w, label, v7, v8, unit='', diff=None):
    """v7 版：可选无对比（v7=None 时只显示单值）"""
    CH = 1.5
    add_rect(s, x, y, w, CH, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, y, w, 0.40, fill=PINK_MED, line=None, radius=0.02)
    add_text(s, x, y+0.03, w, 0.32, [dict(text=label, size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    if v7 is None:
        val8 = fmt_pct(v8) if unit=='%' else fmt_int(v8)
        add_text(s, x, y+0.46, w, 0.55, [dict(text=val8, size=20, bold=True, color=PINK_DEEP)], align=PP_ALIGN.CENTER)
    else:
        val7 = fmt_pct(v7) if unit=='%' else fmt_int(v7)
        val8 = fmt_pct(v8) if unit=='%' else fmt_int(v8)
        add_text(s, x, y+0.45, w, 0.60, [
            dict(text=val7, size=11, bold=False, color=INK_SOFT),
            dict(text=" → ", size=11, bold=False, color=INK),
            dict(text=val8, size=15, bold=True, color=PINK_DEEP)
        ], align=PP_ALIGN.CENTER)
    if diff is not None:
        col = change_color(diff)
        sym = change_symbol(diff)
        suffix = "pp" if unit=='%' else "件"
        dval = f"{sym}{abs(diff):.1f}{suffix}"
        add_text(s, x, y+1.14, w, 0.28, [dict(text=dval, size=10, bold=True, color=col, align=PP_ALIGN.CENTER)])

def finding_box(s, title, findings, x=0.7, y=3.02, w=3.3, h=2.42):
    add_rect(s, x, y, w, h, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    lines = [dict(text=title, size=12, bold=True, color=PINK_DEEP, space_after=5)]
    for f in findings:
        lines.append(dict(text=f, size=9.5, bold=False, color=INK, space_after=4))
    add_text(s, x+0.18, y+0.12, w-0.36, h-0.24, lines)

def strategy_box(s, lines, x=0.7, y=5.52, w=12.0, h=1.0):
    add_rect(s, x, y, w, h, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
    strat = [dict(text="落点策略", size=12, bold=True, color=PINK_DEEP, space_after=4)]
    for st in lines:
        strat.append(dict(text=st, size=10, bold=False, color=INK, space_after=3))
    add_text(s, x+0.18, y+0.08, w-0.36, h-0.16, strat)

PN = 0

# =========================================================
# 封面
# =========================================================
PN += 1
s = prs.slides.add_slide(BLANK)
s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
add_rect(s, 0.9, 1.7, 11.5, 4.1, fill=PINK_PALE, line=PINK_MED, line_w=1.25, radius=0.06)
draw_bow(s, 1.25, 1.0, 3.2)
add_text(s, 1.4, 2.15, 10.5, 0.45, [dict(text="Dlooda · TikTok Shop 美国站", size=18, bold=True, color=PINK_DEEP, space_after=4)])
add_text(s, 1.4, 2.95, 10.5, 1.4,
         [dict(text="8 月月度经营汇报", size=40, bold=True, color=INK, space_after=6),
          dict(text="2026.07.15 — 2026.08.15  ·  汇报人：余慧玲", size=15, bold=False, color=INK_SOFT)])
add_text(s, 1.4, 5.05, 10.5, 0.6,
         [dict(text="增长的结构性转变：从「广撒网拉新」转向「少而精 · 内容驱动 · 老达人复投」", size=12.5, bold=False, color=PINK_DK)])

# =========================================================
# 目录
# =========================================================
PN += 1
s = slide_base("目录 · Contents", part="Overview")
add_text(s, 0.6, 1.35, 12.1, 0.5, [dict(text="四大模块，从整体到单品再到达人结构与复投策略", size=13, bold=False, color=INK_SOFT)])
toc = [
    ("Part 01", "店铺数据总览", "核心 4 项 · 12 SKU 汇总 · 一页结论 + 增长拆解", PINK_DEEP),
    ("Part 02", "各款 SKU 分析", "六款六个视角：增长质量 · 生命周期 · 内容驱动 · 达人流失 · 风险止损 · 测款接力", PINK_DK),
    ("Part 03", "达人维度洞察", "亮点与流失 · 效率榜（Z-score）· 接力与机会矩阵", PINK_MED),
    ("Part 04", "复投与下月行动", "复投分析（两种口径合一）· 下月 7 项行动", PINK_DEEP),
]
yy = 2.1
for tag, name, desc, col in toc:
    add_rect(s, 0.6, yy, 12.1, 1.0, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, 0.6, yy, 1.7, 1.0, fill=col, line=None, radius=0.08)
    add_text(s, 0.6, yy+0.28, 1.7, 0.5, [dict(text=tag, size=15, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, 2.5, yy+0.14, 10.0, 0.35, [dict(text=name, size=16, bold=True, color=INK)])
    add_text(s, 2.5, yy+0.55, 10.0, 0.4, [dict(text=desc, size=10, bold=False, color=INK_SOFT)])
    yy += 1.13
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

# =========================================================
# 核心 4 项 + 12 SKU 汇总表
# =========================================================
PN += 1
s = slide_base("核心 4 项 · 整体数据变化", part="Part 01")
cards = [
    ("整体寄样", "395 件", "7月 470 件 → 8月 395 件", PINK_MED, None),
    ("转化效率", "23.5%", "▼ 1.2%（7月 24.7%）", PINK_DK, "down"),
    ("月度订单", "7,249 件", "▲ 1,591 件", GREEN, "up"),
    ("有效达人", "71 人", "本期实际出单达人", PINK_DEEP, None),
]
cx = 0.6; cw = 2.95; gap = 0.18
for i,(t,big,sub,col,arrow) in enumerate(cards):
    x = cx + i*(cw+gap)
    add_rect(s, x, 1.35, cw, 1.95, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, 1.35, cw, 0.5, fill=col, line=None, radius=0.02)
    add_text(s, x, 1.40, cw, 0.4, [dict(text=t, size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, x, 1.95, cw, 0.75, [dict(text=big, size=28, bold=True, color=INK, align=PP_ALIGN.CENTER)])
    add_text(s, x, 2.70, cw, 0.5, [dict(text=sub, size=10, bold=False, color=INK_SOFT, align=PP_ALIGN.CENTER)])
add_text(s, 0.6, 3.5, 12.1, 0.4, [dict(text="12 个 SKU 全景汇总（定位分色：爆品 / 销售 / 测品）", size=13, bold=True, color=PINK_DEEP)])
headers = ["SKU","定位","寄样","履约率","出单率","月度出单","环比变化"]
rows = [
    ["2178","爆品","73","76.7%","9.8%","1,904","▲ 449"],
    ["2190","爆品","55","83.6%","7.5%","1,872","▲ 176"],
    ["2722","爆品","45","82.2%","34.29%","1,752","▼ 11"],
    ["28173","销售","86","90.7%","31.08%","846","▲ 525"],
    ["2189","销售","38","92.1%","22.86%","723","▲ 547"],
    ["2789","销售","32","71.9%","33.33%","39","▼ 61"],
    ["2757","测品","35","82.9%","30.77%","25","新测"],
]
def row_fill_12(i, row):
    pos = row[1]
    if pos == "爆品": return PINK_PALE
    if pos == "销售": return RGBColor(0xFD,0xF1,0xF5)
    if pos == "测品": return RGBColor(0xF3,0xEF,0xF0)
    return WHITE
add_table(s, 0.6, 3.95, 12.1, headers, rows,
          col_widths=[1.4,1.3,1.2,1.6,1.6,2.0,2.0], row_fill=row_fill_12, font_size=11)
add_text(s, 0.6, 6.75, 12.1, 0.4,
         [dict(text="注：出单率 = 出单达人 / 寄样达人；月度出单为达人端月度总出单件数。", size=9, bold=False, color=GRAY)])
page_no(s, PN)

# =========================================================
# 一页结论 + 增长拆解
# =========================================================
PN += 1
s = slide_base("一页结论 · 增长从哪里来？", part="Part 01")
add_text(s, 0.6, 1.2, 6.0, 0.4, [dict(text="6 常卖款：月度订单 7月 → 8月", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.6, 6.1, 2.9, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"7月":[1289,1506,1509,148,252,88], "8月":[1768,1776,1640,681,771,37]},
          "月度订单（件）", colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_text(s, 6.9, 1.2, 6.0, 0.4, [dict(text="增长拆解：覆盖效应 vs 单产效应", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 6.8, 1.6, 6.0, 2.9, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"覆盖效应":[1,-2,-10,-6,7,-5], "单产效应":[156.75,872.4,816.9,596.4,408.75,-14.33]},
          "对订单变化的贡献（件）", colors=[GRAY, PINK_DK], legend=True, lbl_size=8)
add_rect(s, 0.6, 4.85, 12.1, 1.65, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 0.9, 4.95, 11.5, 1.5, [
    dict(text="结论", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="6 常卖款合计 ▲1,960 件，其中「单达人产出效应」是主因（尤其 2190/2189/28173），「达人覆盖效应」有正有负。", size=12, bold=False, color=INK, space_after=4),
    dict(text="即：订单增长不是因为触达了更多达人，而是已合作达人卖得更多 —— 内容自然成交 + 老达人复投见效。下阶段应把预算从「广撒网拉新」转向「优寄少寄 + 复投已验证达人」。", size=12, bold=False, color=INK),
])
page_no(s, PN)

# =========================================================
# PART 02
# =========================================================
part_divider("Part 02", "各款 SKU 分析", "六款六个视角：增长质量诊断 / 产品生命周期 / 内容驱动增长 / 达人资产流失 / 风险预警止损 / 新品测款接力")

# ---- 2178 + 2190：增长质量诊断 ----
PN += 1
s = slide_base("2178 + 2190 · Work Pants 双爆款", "增长质量诊断：订单在涨、出单率在跌——是不是越来越依赖少数老达人？", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "2178 达人出单率", 16.0, 9.8, '%', -6.2)
metric_card(s, x0+1*(cw+gap), y0, cw, "2190 达人出单率", 20.83, 7.5, '%', -13.3)
metric_card(s, x0+2*(cw+gap), y0, cw, "2178 视频出单率", 35.21, 27.45, '%', -7.76)
metric_card(s, x0+3*(cw+gap), y0, cw, "2190 视频出单率", 28.91, 27.65, '%', -1.26)

finding_box(s, "关键发现 · 头部依赖的信号", [
    "订单在涨（+449 / +176），但达人出单率「双杀」——这不是越好卖，是越依赖少数老达人。",
    "证据：老视频出单占比高达 97% / 98%，新视频几乎不产生订单，说明新寄样基本失效。",
    "达人质量没提升：星级原地踏步（2178 3.0→2.8，2190 2.8→2.7），新达人不比旧的更优质。",
    "一句话：从「人人能卖的普惠爆款」退化成「少数头部专属的存量生意」。",
])
add_chart(s, 4.25, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['2178','2190'],
          {'达人出单率':[9.8,7.5], '视频出单率':[27.45,27.65]},
          '达人出单率 vs 视频出单率（8月）', pct=True, colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_pie_chart(s, 8.55, 3.05, 2.0, 1.25, ['老视频','新视频'], [97,3], '2178 出单来源', colors=[PINK_DEEP, GRAY], lbl_size=8)
add_pie_chart(s, 10.6, 3.05, 2.0, 1.25, ['老视频','新视频'], [98,2], '2190 出单来源', colors=[PINK_DEEP, GRAY], lbl_size=8)
add_text(s, 8.55, 4.35, 4.0, 0.9, [
    dict(text="新视频几乎不出单 → 新达人寄样基本无效", size=9.5, bold=False, color=INK_SOFT),
])
strategy_box(s, [
    "优寄少寄：暂停大规模新达人铺量，样品留给 L3+/4★/核心达人 + 已出单老达人复投。",
    "严控履约：履约率下滑说明样品浪费在低质达人，先管住「寄了不播」，第 7/14 天两次跟进。",
])
page_no(s, PN)

# ---- 2722：产品生命周期 ----
PN += 1
s = slide_base("SKU 2722 · Crossover Skort", "产品生命周期：寄样减半、双率反升——这不是衰退，是「收缩聚焦」奏效", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "寄样量", 105, 45, '', -60)
metric_card(s, x0+1*(cw+gap), y0, cw, "履约率", 80.0, 82.2, '%', 2.2)
metric_card(s, x0+2*(cw+gap), y0, cw, "达人出单率", 27.5, 34.29, '%', 6.79)
metric_card(s, x0+3*(cw+gap), y0, cw, "视频出单率", 25.36, 32.91, '%', 7.55)

finding_box(s, "关键发现 · 衰退期的收割策略", [
    "逆势信号：寄样 105→45（-57%），但双率反升，缩量后剩下都是「能卖的人」——精准收缩的教科书案例。",
    "人群洞察：黑人群体出单率 45.5%（11 样本），远高于英语 16.7%、西语 30%，是这款的「爆点人群」。",
    "季节窗口收窄：夏季短裙进入 8 月末自然需求下滑，不适合继续放量。",
    "一句话：2722 完成「夏季爆款」使命，该体面收尾、把达人资产交给秋季款。",
])
add_chart(s, 4.25, 3.05, 4.1, 2.35, XL_CHART_TYPE.BAR_CLUSTERED,
          ['英语','黑人','西语'],
          {'8月出单率':[16.7,45.5,30.0]},
          '8月分语言出单率（%）', pct=True, colors=[PINK_MED], legend=False, lbl_size=8)
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['老达人','新达人'],
          {'样本':[34,11], '出单率':[26.5,27.3]},
          '老达人 vs 新达人', colors=[PINK_DEEP, PINK_MED], legend=True, lbl_size=8)
strategy_box(s, [
    "暂停新寄样：资源转向秋冬长裤，2722 仅维护已出单达人复投。",
    "资产转移：把已验证的黑人高产出达人，优先导入 2757（同品类秋季款）测款。",
])
page_no(s, PN)

# ---- 28173：内容驱动增长 ----
PN += 1
s = slide_base("SKU 28173 · Wide Leg Work Pants", "内容驱动增长：自然单占比 60.7%→81.6%，这是最健康的增长方式", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "自然单占比", 60.7, 81.6, '%', 20.9)
metric_card(s, x0+1*(cw+gap), y0, cw, "出单视频数", 33, 84, '', 51)
metric_card(s, x0+2*(cw+gap), y0, cw, "视频出单率", 23.91, 31.70, '%', 7.79)
metric_card(s, x0+3*(cw+gap), y0, cw, "月度订单", 252, 771, '', 519)

finding_box(s, "关键发现 · 内容自带成交力", [
    "增长引擎识别：订单 252→771（+525）不是靠「更多达人」，而是靠「内容自然成交」。",
    "自然单占比 60.7%→81.6%，出单视频 33→84 —— 达人只要发视频就能自然转化。",
    "这意味着对「达人带货力」依赖低、对「内容质量」依赖高：ROI 最优、可复制性最强。",
    "一句话：28173 是本月最该「乘势加投」的款，增长边际成本最低。",
])
add_chart(s, 4.25, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'自然单占比':[60.7,81.6], '视频出单率':[23.91,31.70]},
          '自然单占比 & 视频出单率', pct=True, colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['7月','8月'],
          {'出单视频数':[33,84]},
          '出单视频数（条）', colors=[PINK_DEEP], legend=False, lbl_size=8)
strategy_box(s, [
    "放大已验证达人：优先复投已有出单达人，鼓励多视频产出，提升单达人内容贡献。",
    "内容端加投：对高自然单视频二次剪辑 / 加热，把「内容红利」吃到尽。",
])
page_no(s, PN)

# ---- 2189：达人资产流失 ----
PN += 1
s = slide_base("SKU 2189 · 达人资产流失", "出单率 42.4%→21.1% 腰斩，但老达人仍有 45.5%——流失的是「兴趣」，不是「价值」", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "寄样量", 33, 38, '', 5)
metric_card(s, x0+1*(cw+gap), y0, cw, "履约率", 87.9, 92.1, '%', 4.2)
metric_card(s, x0+2*(cw+gap), y0, cw, "达人出单率", 42.4, 21.1, '%', -21.4)
metric_card(s, x0+3*(cw+gap), y0, cw, "视频出单率", 37.7, 35.8, '%', -1.9)

finding_box(s, "关键发现 · 流失的双重代价", [
    "流失信号：达人出单率 42.4%→21.1% 腰斩，是本月跌幅最大的款。",
    "复投成功率仅 4%（35 条声明只成 1 单），印证「老达人兴趣下降」。",
    "但价值仍在：老达人出单率 45.5% vs 新达人 11.1%（4 倍）——带货力没消失，只是「不来寄了」。",
    "一句话：2189 不是「品不行」，是「达人池在缩水」，要召回 + 补充双管齐下。",
])
add_chart(s, 4.25, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['新达人','老达人'],
          {'样本':[27,11], '出单率':[11.1,45.5]},
          '新老达人出单率对比', colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_pie_chart(s, 8.55, 3.05, 2.0, 1.25, ['成功','未成功','观察中'], [1,24,10], '复投 35 条结果', colors=[GREEN, RED, GRAY], lbl_size=8)
add_text(s, 8.55, 4.35, 4.0, 0.9, [
    dict(text="复投成功率仅 4% → 老达人兴趣明显下降", size=9.5, bold=False, color=INK_SOFT),
])
strategy_box(s, [
    "召回：定向激活历史带货老达人（bonus + 2178/2190 组合款联动复投）。",
    "补充：低门槛首单测新达人，扩大达人池，用新血对冲老达人流失。",
])
page_no(s, PN)

# ---- 2789：风险预警止损 ----
PN += 1
s = slide_base("SKU 2789 · 头部流失预警", "「出单率升了」是陷阱：分母缩得比分子快，实为规模崩塌，需及时止损", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "寄样量", 53, 32, '', -21)
metric_card(s, x0+1*(cw+gap), y0, cw, "履约率", 84.9, 71.9, '%', -13)
metric_card(s, x0+2*(cw+gap), y0, cw, "月度总出单", 100, 37, '', -63)
metric_card(s, x0+3*(cw+gap), y0, cw, "出单达人", 12, 7, '', -5)

finding_box(s, "关键发现 · 五项红灯预警", [
    "五项核心指标全线萎缩：寄样▼21、履约达人▼22、履约率▼13pp、出单达人▼5、月度出单▼63。",
    "「出单率升」的陷阱：30%→33.3% 看似升，实际是分母（达人）缩得比分子（出单）更快。",
    "达人质量下滑：2★/3★ 仍占 75%，优质 4★ 虽升到 21.9% 但绝对量太小，撑不起盘子。",
    "一句话：2789 已进入「瘦狗」区间，继续投入是浪费预算，应止损收缩、清库存。",
])
# 五项指标仪表盘（表格）
hdr = ["指标","7月","8月","变化","信号"]
rows = [
    ["寄样量","53","32","▼ 21","🔴"],
    ["履约达人","45","23","▼ 22","🔴"],
    ["履约率","84.9%","71.9%","▼ 13pp","🔴"],
    ["出单达人","12","7","▼ 5","🔴"],
    ["月度总出单","100","37","▼ 63","🔴"],
]
add_table(s, 4.25, 3.05, 4.1, hdr, rows, col_widths=[1.6,1.0,1.0,1.2,0.8], font_size=10)
add_chart(s, 8.55, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['1★','2★','3★','4★'],
          {'8月出单率':[100,25,8.3,28.6]},
          '各星级出单率（%）', pct=True, colors=[PINK_MED], legend=False, lbl_size=8)
strategy_box(s, [
    "停止扩量：暂停向低等级 / 低星级达人寄样，只给高星级 / 历史出单达人小幅精准寄样。",
    "止损转移：重点挽回上期头部达人补素材，同时把预算切到 28173 / 2189 高增长款。",
])
page_no(s, PN)

# ---- 2757：新品测款接力 ----
PN += 1
s = slide_base("SKU 2757 · 秋季测款", "能否接力 2722？三率接近爆款基线，具备潜力，但库存未到先小幅测试", part="Part 02")
cw = 2.9; gap = 0.18; x0 = 0.7; y0 = 1.30
metric_card(s, x0+0*(cw+gap), y0, cw, "寄样量", None, 35, '', None)
metric_card(s, x0+1*(cw+gap), y0, cw, "履约率", None, 82.86, '%', None)
metric_card(s, x0+2*(cw+gap), y0, cw, "达人出单率", None, 30.77, '%', None)
metric_card(s, x0+3*(cw+gap), y0, cw, "视频出单率", None, 26.32, '%', None)

finding_box(s, "关键发现 · 接力棒的接力逻辑", [
    "接力逻辑：2757 是 2722（夏季短裙）的同品类秋季款，目标是承接 2722 的达人流量。",
    "基线对比：履约率 82.86% vs 2722 的 82.22%（持平），达人 / 视频出单率接近但略低。",
    "判断：样品承接✅稳定、达人出单🟡有潜力、视频转化🟡仍需验证、放量🟡小幅测试。",
    "一句话：2757 是 9 月的「接力棒」，到货后先让 2722 已验证老达人测款，用数据决定是否放量。",
])
add_chart(s, 4.25, 3.05, 4.1, 2.35, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['履约率','达人出单率','视频出单率'],
          {'2722（8月）':[82.22,34.29,32.91], '2757（测款）':[82.86,30.77,26.32]},
          '2757 vs 2722 三率对比（%）', pct=True, colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
hdr = ["维度","判断"]
rows = [
    ["样品承接","✅ 稳定"],
    ["达人出单","🟡 有潜力"],
    ["视频转化","🟡 仍需验证"],
    ["放量建议","🟡 小幅测试"],
]
add_table(s, 8.55, 3.05, 4.1, hdr, rows, col_widths=[2.0,2.0], font_size=11)
strategy_box(s, [
    "到货后优先邀请 2722 / 28173 已验证达人测款，降低冷启动风险。",
    "若 2757 复购率接近 2722，则作为秋季短裙主力承接夏季爆款流量。",
])
page_no(s, PN)

# =========================================================
# PART 03
# =========================================================
part_divider("Part 03", "达人维度洞察", "谁在卖货、谁流失了、哪款最容易被卖起来、新品能否接力")

# ---- 达人亮点与流失预警 ----
PN += 1
s = slide_base("达人亮点与流失预警", "哪些达人效率高、卖什么款容易出单", part="Part 03")
add_text(s, 0.7, 1.25, 6.0, 0.4, [dict(text="8月 Top5 出单达人", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.6, 1.65, 5.9, 3.0, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ['heyitsamber44','danakkt','jerlenimarte','gabriepearl','madijo'],
          {'出单件':[214,84,64,46,28]},
          'Top5 出单件数', colors=[PINK_MED], legend=False, lbl_size=8)
add_rect(s, 6.75, 1.45, 5.9, 3.2, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_text(s, 7.0, 1.55, 5.5, 3.0, [
    dict(text="🌟 高效达人画像", size=12, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="Top5 中 4 位出单 Work Pants 系列，1 位出单 2722；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="老达人复投产出显著高于新达人首单；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="核心 / 高曝光达人占比仍低，筛选画像需向高等级 / 高星级倾斜。", size=10.5, bold=False, color=INK, space_after=10),
    dict(text="⚠️ 流失预警", size=12, bold=True, color=RED, space_after=5),
    dict(text="7月头部 imaniiibrooks(379) / ljac888(113) / yetsika(105) / nairireyes(88) 8月未出单，需定向挽回。", size=10.5, bold=False, color=INK, space_after=6),
    dict(text="💡 落点：因地制宜，什么款达人容易出单就优先寄什么款。", size=10.5, bold=True, color=PINK_DK),
])
page_no(s, PN)

# ---- 全 SKU 达人效率榜 ----
PN += 1
s = slide_base("全 SKU 达人效率榜", "Z-score = 出单率 Z + 单达人产出 Z", part="Part 03")
add_text(s, 0.7, 1.15, 5.6, 0.45,
         [dict(text="Z-score 说明：综合效率分 =（出单率 Z）+（单达人产出 Z），分数越高越容易被卖起来", size=9.5, bold=False, color=INK_SOFT)])
hdr = ["SKU","出单率","单达人产出","综合效率分"]
rows = [
    ["2722","26.7%","136.7","0.67"],
    ["2190","5.5%","592.0","0.43"],
    ["28173","26.7%","33.5","0.18"],
    ["2189","21.1%","85.1","-0.22"],
    ["2789","21.9%","5.3","-0.51"],
    ["2178","6.9%","353.6","-0.56"],
]
def rank_fill(i, row):
    if i == 0: return PINK_PALE
    if i <= 2: return RGBColor(0xFD,0xF1,0xF5)
    return WHITE
add_table(s, 0.7, 1.65, 5.6, hdr, rows, col_widths=[1.4,1.4,1.6,1.6], row_fill=rank_fill, font_size=11)
add_text(s, 0.7, 4.35, 5.6, 0.5,
         [dict(text="落点：效率榜 Top SKU 优先精准寄样；低效率 SKU 减少广撒网，改老达人复投。", size=10, bold=True, color=PINK_DEEP)])
add_text(s, 6.75, 1.2, 6.0, 0.4, [dict(text="综合效率分排名", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 6.7, 1.65, 6.0, 3.2, XL_CHART_TYPE.BAR_CLUSTERED,
          ['2722','2190','28173','2189','2789','2178'],
          {'综合效率分':[0.67,0.43,0.18,-0.22,-0.51,-0.56]},
          '综合效率分', colors=[PINK_DEEP], legend=False, lbl_size=9)
page_no(s, PN)

# ---- SKU 接力 & 机会矩阵 ----
PN += 1
s = slide_base("SKU 接力 & 机会矩阵", "新品能否承接老款波动？预算往哪投？", part="Part 03")
# 四象限
quad_w, quad_h = 5.6, 2.35
qx, qy = 0.7, 1.7
# 横轴：销售贡献（左低右高），纵轴：综合效率（上高下低）
add_rect(s, qx, qy, quad_w, quad_h, fill=RGBColor(0xE8,0xF5,0xE9), line=PINK_MED, line_w=1, radius=0.04)      # 左上 明星(高销售高)? 用布局：上=高效率
# 用文字标签占位四象限（实际绘制象限语义标签）
quad_info = [
    (qx, qy, "明星 · 高销售+高效率", GREEN, "28173"),
    (qx + quad_w/2, qy, "现金牛 · 高销售+低效率", GOLD, "2178 / 2190"),
    (qx, qy + quad_h/2, "机会 · 低销售+高效率", BLUE, "2189"),
    (qx + quad_w/2, qy + quad_h/2, "瘦狗 · 低销售+低效率", GRAY, "2789"),
]
for x, y, label, col, sku in quad_info:
    add_rect(s, x+0.05, y+0.05, quad_w/2-0.1, quad_h/2-0.1, fill=WHITE, line=col, line_w=1.5, radius=0.05)
    add_text(s, x+0.15, y+0.12, quad_w/2-0.3, 0.4, [dict(text=label, size=10.5, bold=True, color=col)])
    add_text(s, x+0.15, y+0.55, quad_w/2-0.3, 0.5, [dict(text=sku, size=15, bold=True, color=INK)])
add_text(s, qx, qy+quad_h+0.06, quad_w, 0.3, [dict(text="← 综合效率分（纵）· 销售贡献（月度订单占比，横）→", size=9, bold=False, color=INK_SOFT, align=PP_ALIGN.CENTER)])
# 右侧矩阵解读
add_rect(s, 6.55, 1.7, 6.1, 3.9, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_text(s, 6.8, 1.8, 5.7, 3.7, [
    dict(text="矩阵解读", size=12, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="明星 28173：销售贡献高且效率向上，内容自然单爆发，是秋季主推基本盘；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="现金牛 2178/2190：订单体量大但效率大幅下滑，需「保量提质」，不能继续放量稀释；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="机会 2189：达人效率仍高但销售占比小，扩大精准寄样可成新增长极；", size=10.5, bold=False, color=INK, space_after=4),
    dict(text="瘦狗 2789：销售贡献低且效率一般，减少投入、清库存为主；2722 夏季爆款季节窗口收窄，不属秋季主推。", size=10.5, bold=False, color=INK, space_after=6),
    dict(text="落点：新品 2757 到货后用 2722/28173 已验证达人承接流量；2189 扩大精准测款；2789 控制寄样。", size=10.5, bold=True, color=PINK_DEEP),
])
page_no(s, PN)

# =========================================================
# PART 04
# =========================================================
part_divider("Part 04", "复投与下月行动", "复投两种口径合一 · 行动逐条落地")

# ---- 复投分析 ----
PN += 1
s = slide_base("复投分析 · 两种口径", "按 SKU 拆分，声明后成功时间不限于报告期内", part="Part 04")
add_text(s, 0.7, 1.2, 7.0, 0.4, [dict(text="① 不同 SKU 复投", size=12, bold=True, color=PINK_DEEP)])
hdr = ["SKU","复投声明","成功","未成功","观察中","成功率"]
rows = [
    ["2178","67","6","46","15","12%"],
    ["2190","50","3","33","14","8%"],
    ["2722","15","0","12","3","0%"],
    ["2189","35","1","24","10","4%"],
    ["28173","12","0","9","3","0%"],
    ["2789","18","0","14","4","0%"],
]
add_table(s, 0.7, 1.65, 7.0, hdr, rows, col_widths=[1.2,1.4,1.1,1.3,1.3,1.2], font_size=10)
add_text(s, 0.7, 4.1, 7.0, 0.5,
         [dict(text="注：普通复投成功率普遍偏低（0%-12%），核心问题是「复投了但没跟到位」。", size=9.5, bold=False, color=GRAY)])
add_text(s, 8.0, 1.2, 4.7, 0.4, [dict(text="② 同一 SKU 复投（2178+2190）", size=12, bold=True, color=PINK_DEEP)])
add_pie_chart(s, 8.0, 1.65, 2.3, 1.4, ['成功','失败','未回复'], [18,19,169], '结果分布', colors=[GREEN, GOLD, GRAY], lbl_size=8)
add_text(s, 10.4, 1.65, 2.3, 1.6, [
    dict(text="成功 18 · 8.7%", size=11, bold=True, color=GREEN, space_after=3),
    dict(text="失败 19 · 9.2%", size=11, bold=True, color=GOLD, space_after=3),
    dict(text="未回复 169 · 82.0%", size=11, bold=True, color=INK_SOFT),
])
add_text(s, 8.0, 3.15, 4.7, 1.3, [
    dict(text="流程：后台私信达人 → 跟踪是否申请 / 是否看消息 → 已读不回再次发送；", size=10, bold=False, color=INK, space_after=3),
    dict(text="爆单达人若后台私信无响应，再用抖音号私信触达。", size=10, bold=False, color=INK),
])
strategy_box(s, [
    "定期维护复投池，建立复投达人跟进 SOP；加强复投策略并优化话术，对爆单 / 高潜达人提高跟进频次。",
])
page_no(s, PN)

# ---- 下月行动 ----
PN += 1
s = slide_base("下月行动 · 7 项落地清单", part="Part 04")
actions = [
    ("1", "复投从「广撒网」改「定向复投」", "只复投上期已出单达人并配专属 bonus；2178+2190 同款复投对未回复者二次跟进。"),
    ("2", "2178 / 2190 优寄少寄", "暂停大规模新达人铺量，优先 L3+/4★+/核心达人及老达人复投；严控履约。"),
    ("3", "头部达人挽回", "imaniiibrooks / ljac888 / yetsika / nairireyes 等逐一挽回，建立「上期出单 100% 复投」清单。"),
    ("4", "新达人 SOP", "首轮只寄 1 件测品验证带货力，出单后再开放主推；第 7/14 天两次跟进。"),
    ("5", "扩大 2189 达人池", "老达人兴趣下降，补充新达人并强化复投激活历史带货达人。"),
    ("6", "视频端乘势加投", "自然单占比高、内容自带成交；对高自然单视频二次剪辑 / 加热。"),
    ("7", "机会矩阵指导预算", "60% 给 28173/2189 等高增长款，30% 给 2757 测品，10% 用于头部挽回。"),
]
cols = 2
cw2 = 5.95; ch = 1.28; gap_x = 0.2; gap_y = 0.12
for i, (num, title, desc) in enumerate(actions):
    row = i // cols; col = i % cols
    x = 0.7 + col*(cw2+gap_x)
    y = 1.35 + row*(ch+gap_y)
    add_rect(s, x, y, cw2, ch, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, y, 0.55, ch, fill=PINK_DEEP, line=None, radius=0.02)
    add_text(s, x, y+0.32, 0.55, 0.5, [dict(text=num, size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, x+0.7, y+0.10, cw2-0.85, 0.35, [dict(text=title, size=12.5, bold=True, color=PINK_DEEP)])
    add_text(s, x+0.7, y+0.48, cw2-0.85, 0.75, [dict(text=desc, size=9.5, bold=False, color=INK)])
page_no(s, PN)

# =========================================================
# save
# =========================================================
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Dlooda_8月月度汇报_v7.pptx')
prs.save(out)
print("SAVED:", os.path.abspath(out), "slides:", len(prs.slides.__iter__.__self__._sldIdLst))
