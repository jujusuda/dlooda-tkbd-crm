# -*- coding: utf-8 -*-
"""Dlooda 8月月度汇报 PPT v3 —— 按用户反馈重做：
- 4 大模块 + Part X 分隔页
- 每 SKU 不同图表 / 不同角度（视频端、同品类、新老、头部）
- 2178+2190 合并且带策略
- 复投拆两页（不同产品 / 同一产品）
- 下月行动单独页
- 严格防元素重叠
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
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
    # background
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    # title band
    band = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0), Inches(0), Inches(SW), Inches(1.0))
    band.fill.solid(); band.fill.fore_color.rgb = PINK_DEEP
    band.line.fill.background()
    band.shadow.inherit = False
    try: band.adjustments[0] = 0.0
    except Exception: pass
    # bow (brand mark) top-left
    draw_bow(s, 0.32, 0.20, 0.9)
    # title text
    tb = s.shapes.add_textbox(Inches(1.5), Inches(0.08), Inches(11.2), Inches(0.62))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    r = p.add_run(); r.text = title; set_run(r, 22, True, WHITE)
    if subtitle:
        p2 = tf.add_paragraph(); r2 = p2.add_run(); r2.text = subtitle
        set_run(r2, 11, False, PINK_PALE)
    # part tag (top-right)
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
    """lines: list of dict(text,size,bold,color,bullet,space_after,align)"""
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
    # axes fonts
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
    try:
        chart.value_axis.visible = True
    except Exception: pass
    nf = '0.0"%"' if pct else '#,##0'
    try:
        plot = chart.plots[0]
        plot.has_data_labels = show_labels
        if show_labels:
            dl = plot.data_labels
            dl.number_format = nf
            dl.number_format_is_linked = False
            dl.position = XL_LABEL_POSITION.OUTSIDE_END if chart.chart_type in (XL_CHART_TYPE.COLUMN_CLUSTERED, XL_CHART_TYPE.BAR_CLUSTERED) else XL_LABEL_POSITION.OUTSIDE_END
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
    # disable default styling banding
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

# =========================================================
# COVER
# =========================================================
PN = 0
def cover():
    global PN; PN += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    # big soft panel
    add_rect(s, 0.9, 1.7, 11.5, 4.1, fill=PINK_PALE, line=PINK_MED, line_w=1.25, radius=0.06)
    draw_bow(s, 1.25, 1.0, 3.2)
    add_text(s, 1.4, 2.15, 10.5, 1.0,
             [dict(text="Dlooda · TikTok Shop 美国站", size=18, bold=True, color=PINK_DEEP, space_after=4)])
    add_text(s, 1.4, 2.95, 10.5, 1.4,
             [dict(text="8 月月度经营汇报", size=40, bold=True, color=INK, space_after=6),
              dict(text="2026.07.15 — 2026.08.15  ·  汇报人：余慧玲", size=15, bold=False, color=INK_SOFT)])
    add_text(s, 1.4, 5.05, 10.5, 0.6,
             [dict(text="淡粉治愈 · Work Pants 双爆款势能延续，内容自然成交走强", size=12, bold=False, color=PINK_DK)])
    return s

cover()

# =========================================================
# TOC
# =========================================================
PN += 1
s = slide_base("目录 · Contents", part="Overview")
add_text(s, 0.6, 1.4, 12.1, 0.5, [dict(text="四大模块，从整体到单品再到达人结构与复投策略", size=13, bold=False, color=INK_SOFT)])
toc = [
    ("Part 01", "店铺数据总览", "核心 4 项 · 12 SKU 汇总 · 一页结论 + 瀑布拆解", PINK_DEEP),
    ("Part 02", "各款 SKU 分析", "2178+2190 合并 · 2722 · 28173 · 2189 · 2789（每款差异化视角）", PINK_DK),
    ("Part 03", "达人维度洞察", "亮点与流失 · 效率榜 · 新老结构 · 接力与机会矩阵", PINK_MED),
    ("Part 04", "复投与下月行动", "不同产品复投 · 同款复投 · 下月 7 项行动", PINK_DEEP),
]
yy = 2.15
for tag, name, desc, col in toc:
    add_rect(s, 0.6, yy, 12.1, 1.05, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, 0.6, yy, 1.7, 1.05, fill=col, line=None, radius=0.08)
    add_text(s, 0.6, yy+0.30, 1.7, 0.5, [dict(text=tag, size=15, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, 2.5, yy+0.16, 10.0, 0.5, [dict(text=name, size=17, bold=True, color=INK)])
    add_text(s, 2.5, yy+0.58, 10.0, 0.4, [dict(text=desc, size=11, bold=False, color=INK_SOFT)])
    yy += 1.18
page_no(s, PN)

# =========================================================
# PART 01 divider
# =========================================================
def part_divider(tag, title, desc):
    global PN; PN += 1
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = PINK_DEEP
    add_rect(s, 0, 0, SW, SH, fill=PINK_DEEP)
    draw_bow(s, 0.5, 0.5, 2.4)
    add_text(s, 1.2, 2.5, 11, 1.2, [dict(text=tag, size=30, bold=True, color=PINK_PALE)])
    add_text(s, 1.2, 3.4, 11, 1.4, [dict(text=title, size=44, bold=True, color=WHITE)])
    add_text(s, 1.2, 5.0, 11, 1.0, [dict(text=desc, size=15, bold=False, color=PINK_PALE)])
    return s

part_divider("Part 01", "店铺数据总览", "先看大盘：寄样、转化、订单、有效达人，以及 12 个 SKU 的全景表现")

# ---- core 4 ----
PN += 1
s = slide_base("核心 4 项 · 整体数据变化", part="Part 01")
cards = [
    ("整体寄样", "394 件", "剔除撤退款 · 含撤退 395 件", PINK_MED, None),
    ("转化效率", "22.8%", "▼ 6.3pp（7月 29.1%）出单/履约达人", RED, "down"),
    ("月度订单", "6,673 件", "▲ 1,881 件（6 常卖款合计）", GREEN, "up"),
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
    dict(text="大盘稳中有升：订单 +1,881 件，但转化率 ▼6.3pp —— 增长主要靠「单达人产出提升 + 内容自然成交」，而非达人覆盖扩大（出单达人反而 ▼15 人）。", size=12.5, bold=False, color=INK, space_after=7),
    dict(text="Work Pants 双爆款（2178+2190）持续放量，28173 / 2189 爆发式增长；2789 因头部达人流失小幅下滑，需重点挽回。", size=12.5, bold=False, color=INK),
])
page_no(s, PN)

# ---- 12 SKU summary table ----
PN += 1
s = slide_base("12 个 SKU 全景汇总", "定位分色：爆品 / 销售 / 测品 / 未标记", part="Part 01")
headers = ["SKU","定位","寄样","达人","履约率","出单率","月度出单","环比变化"]
rows = [
    ["2178","爆品","73","73","76.7%","6.8%","1,768","▲ 479"],
    ["2190","爆品","55","54","85.5%","5.6%","1,776","▲ 270"],
    ["2722","爆品","45","45","82.2%","26.7%","1,640","▲ 131"],
    ["28173","销售","86","86","90.7%","26.7%","771","▲ 519"],
    ["2189","销售","38","37","92.1%","21.6%","681","▲ 533"],
    ["2789","销售","32","32","71.9%","21.9%","37","▼ 51"],
    ["2A19","测品","32","32","81.3%","12.5%","10","▼ 19"],
    ["2757","测品","22","22","81.8%","27.3%","24","▲ 21"],
    ["28193","测品","6","6","16.7%","16.7%","1","▼ 3"],
    ["28102","未标记","3","3","100%","0%","0","— 0"],
    ["2881","未标记","1","1","100%","0%","0","— 0"],
    ["2A08","未标记","1","1","100%","0%","0","— 0"],
]
def row_fill_12(i, row):
    pos = row[1]
    if pos == "爆品": return PINK_PALE
    if pos == "销售": return RGBColor(0xFD,0xF1,0xF5)
    if pos == "测品": return RGBColor(0xF3,0xEF,0xF0)
    return WHITE
add_table(s, 0.6, 1.45, 12.1, headers, rows,
          col_widths=[1.3,1.3,1.0,1.0,1.4,1.4,1.7,1.7], row_fill=row_fill_12, font_size=10.5)
add_text(s, 0.6, 6.75, 12.1, 0.4,
         [dict(text="注：出单率 = 出单达人 / 履约达人；月度出单为达人端月度总出单件数。爆品（2178/2190/2722）贡献了大盘绝大多数订单。", size=9.5, bold=False, color=GRAY)])
page_no(s, PN)

# ---- one-page conclusion + waterfall (covered/single-effect) ----
PN += 1
s = slide_base("一页结论 · 增长从哪里来？", part="Part 01")
add_text(s, 0.6, 1.25, 6.0, 0.4, [dict(text="6 常卖款：月度订单 7月 → 8月", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.65, 6.1, 3.0, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"7月":[1289,1506,1509,148,252,88], "8月":[1768,1776,1640,681,771,37]},
          "月度订单（件）", colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_text(s, 6.9, 1.25, 6.0, 0.4, [dict(text="增长拆解：覆盖效应 vs 单产效应", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 6.8, 1.65, 6.0, 3.0, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789"],
          {"覆盖效应":[322,-602,-686,-64,111,-36], "单产效应":[157,872,817,596,407,-14]},
          "对订单变化的贡献（件）", colors=[GRAY, PINK_DK], legend=True, lbl_size=8)
add_rect(s, 0.6, 4.95, 12.1, 1.5, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 0.9, 5.05, 11.5, 1.35, [
    dict(text="结论", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="6 常卖款合计 ▲1,881 件，其中「单达人产出效应」+2,835 件、「达人覆盖效应」-955 件。", size=12, bold=False, color=INK, space_after=4),
    dict(text="即：订单增长不是因为触达了更多达人，而是每个已合作达人卖得更多了 —— 内容自然成交 + 头部达人维护见效。下阶段应把预算从「广撒网拉新」转向「复投已验证达人」。", size=12, bold=False, color=INK),
])
page_no(s, PN)

# =========================================================
# PART 02 divider
# =========================================================
part_divider("Part 02", "各款 SKU 分析", "每款一个视角：双爆款合并、老粉复购、内容爆发、新客稀释、头部流失")

# ---- 2178 + 2190 merged ----
PN += 1
s = slide_base("2178 + 2190 · Work Pants 双爆款合并", "同品类 · 同爆品定位 · 合计订单 3,544 件（▲749）", part="Part 02")
# left: reason + strategy
add_rect(s, 0.6, 1.4, 4.5, 2.05, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 0.8, 1.5, 4.1, 1.9, [
    dict(text="📊 共同变化原因", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="8月寄样合计 128 件（▲68），月度订单 3,544 件（▲749）。两款出单率均处高位（2178 8.9% / 2190 6.5%），说明 Work Pants 需求旺盛、达人带货意愿强。", size=11.5, bold=False, color=INK, space_after=4),
    dict(text="增长来自：① 爆款势能延续 ② 视频端自然单占比高（79% / 82%）③ 复投与头部维护见效。", size=11.5, bold=False, color=INK),
])
add_rect(s, 0.6, 3.6, 4.5, 3.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 0.8, 3.7, 4.1, 2.9, [
    dict(text="🎯 合并下月策略", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="组合款统一招募：同一批达人两版都推，提升单达人产出。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="优先复投两款均出单的达人，配专属 bonus 锁定头部。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="新达人首单二选一测品（2178经典 / 2190升级），出单后开放另一款。", size=11.5, bold=False, color=INK, bullet=True),
])
# right: charts
add_text(s, 5.4, 1.3, 7.3, 0.4, [dict(text="达人结构：新达人占 75%（放量靠拉新）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 1.7, 3.5, 2.6, XL_CHART_TYPE.PIE,
          ["新达人 75%","老达人 25%"], {"":[75,25]}, "新/老达人占比", colors=[PINK_DK, PINK_MED], show_labels=True, lbl_size=9)
add_text(s, 9.0, 1.3, 3.7, 0.4, [dict(text="合计月度订单 7→8（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 8.9, 1.7, 3.7, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"合计订单":[2795,3544]}, "合计月度订单", colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_text(s, 5.4, 4.55, 7.3, 0.4, [dict(text="同品类对标：Work Pants 内部，本款 vs 对标均值", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 4.95, 7.4, 1.9, XL_CHART_TYPE.BAR_CLUSTERED,
          ["达人出单率","履约率"],
          {"本款(2178)":[6.8,76.7], "对标均值":[18.0,89.4]},
          "本款 vs 同类均值（%）", pct=True, colors=[PINK_DK, GRAY], legend=True, lbl_size=8)
page_no(s, PN)

# ---- 2722 : 减量增效 / 老达人复购 ----
PN += 1
s = slide_base("2722 · Crossover Skort", "视角：减量但增效 —— 老达人复购稳定，值得继续投入", part="Part 02")
add_rect(s, 0.6, 1.4, 4.5, 2.0, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 0.8, 1.5, 4.1, 1.9, [
    dict(text="📊 变化原因", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="寄样 ▼60 件（105→45），但月度订单 ▲131（1509→1640），达人出单率 ▲6.2pp 至 32.4%。", size=11.5, bold=False, color=INK, space_after=4),
    dict(text="减量不减量效：老达人（27.3%）与新达人（26.5%）出单率接近，转化效率稳。", size=11.5, bold=False, color=INK),
])
add_rect(s, 0.6, 3.55, 4.5, 3.05, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 0.8, 3.65, 4.1, 2.9, [
    dict(text="🎯 下月措施", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="保持当前节奏，重点维护已出单达人并扩大复投。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="同品类对标强（出单率 26.7% vs 均值 21.9%），可加大放量。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="建立老达人优先复投池；新达人首单仅限测品，出单后再开放主推。", size=11.5, bold=False, color=INK, bullet=True),
])
add_text(s, 5.4, 1.3, 7.3, 0.4, [dict(text="月度订单 7→8（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 1.7, 3.6, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"月度订单":[1509,1640]}, "月度订单", colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_text(s, 9.1, 1.3, 3.6, 0.4, [dict(text="视频端：转化单数 7→8", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 9.0, 1.7, 3.7, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"转化单数":[1805,2005]}, "视频端转化单", colors=[PINK_DK], show_labels=True, lbl_size=9)
add_text(s, 5.4, 4.55, 7.3, 0.4, [dict(text="同品类对标：本款 vs 同类均值（%）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 4.95, 7.4, 1.9, XL_CHART_TYPE.BAR_CLUSTERED,
          ["达人出单率","履约率"],
          {"本款":[26.7,82.2], "对标均值":[21.9,71.9]},
          "本款 vs 同类均值（%）", pct=True, colors=[PINK_DK, GRAY], legend=True, lbl_size=8)
page_no(s, PN)

# ---- 28173 : 内容自然流量爆发 ----
PN += 1
s = slide_base("28173 · Wide Leg Work Pants", "视角：内容驱动爆发 —— 自然单占比 +20.9pp，值得加大放量", part="Part 02")
add_rect(s, 0.6, 1.4, 4.5, 2.0, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 0.8, 1.5, 4.1, 1.9, [
    dict(text="📊 变化原因", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="寄样基本持平（67→66），但月度订单 ▲519（252→771），出单达人 ▲7（16→23）。", size=11.5, bold=False, color=INK, space_after=4),
    dict(text="增长来自内容：自然单占比 60.7%→81.6%（+20.9pp），视频数 ▲127、转化单 ▲545。", size=11.5, bold=False, color=INK),
])
add_rect(s, 0.6, 3.55, 4.5, 3.05, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 0.8, 3.65, 4.1, 2.9, [
    dict(text="🎯 下月措施", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="保持放量节奏，预算加码至已验证达人复投。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="同品类对标极强（出单率 26.7% vs 均值 11.3%），是潜力核心款。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="对高自然单视频做二次剪辑/加热，放大内容自带成交。", size=11.5, bold=False, color=INK, bullet=True),
])
add_text(s, 5.4, 1.3, 7.3, 0.4, [dict(text="视频端三指标 7→8（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 1.7, 3.6, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"视频数量":[138,265], "出单视频":[33,84], "转化单数":[298,843]},
          "视频端（件）", colors=[PINK_MED, PINK_DK, PINK_DEEP], legend=True, lbl_size=8)
add_text(s, 9.1, 1.3, 3.6, 0.4, [dict(text="8月订单构成：自然单 vs 其他", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 9.0, 1.7, 3.7, 2.6, XL_CHART_TYPE.PIE,
          ["自然单 81.6%","其他 18.4%"], {"":[81.6,18.4]}, "8月自然单占比", colors=[PINK_DEEP, PINK_MED], show_labels=True, lbl_size=9)
add_text(s, 5.4, 4.55, 7.3, 0.4, [dict(text="同品类对标：本款 vs 同类均值（%）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 4.95, 7.4, 1.9, XL_CHART_TYPE.BAR_CLUSTERED,
          ["达人出单率","履约率"],
          {"本款":[26.7,90.7], "对标均值":[11.3,84.8]},
          "本款 vs 同类均值（%）", pct=True, colors=[PINK_DK, GRAY], legend=True, lbl_size=8)
page_no(s, PN)

# ---- 2189 : 爆发但新客稀释 / 老达人高效 ----
PN += 1
s = slide_base("2189 · Work Pants 经典款", "视角：拉新爆发但出单率被稀释 —— 老达人 45.5% 远高于新客", part="Part 02")
add_rect(s, 0.6, 1.4, 4.5, 2.0, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 0.8, 1.5, 4.1, 1.9, [
    dict(text="📊 变化原因", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="月度订单 ▲533（148→681），但达人出单率 ▼25.4pp（48.3%→22.9%）—— 大量新达人进入拉低均值。", size=11.5, bold=False, color=INK, space_after=4),
    dict(text="老达人出单率 45.5% vs 新达人 11.1%，差距显著：增长靠量，质量靠老客。", size=11.5, bold=False, color=INK),
])
add_rect(s, 0.6, 3.55, 4.5, 3.05, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 0.8, 3.65, 4.1, 2.9, [
    dict(text="🎯 下月措施", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="新达人首轮只寄 1 件测品款验证带货力，出单后再开放主推款。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="建立老达人优先复投池，把 45.5% 的高效画像批量拓量。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="同品类对标强（21.6% vs 13.0%），可继续放量。", size=11.5, bold=False, color=INK, bullet=True),
])
add_text(s, 5.4, 1.3, 7.3, 0.4, [dict(text="老 vs 新 达人出单率（%）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 1.7, 3.6, 2.6, XL_CHART_TYPE.BAR_CLUSTERED,
          ["老达人","新达人"], {"8月出单率":[45.5,11.1]}, "老/新达人出单率", pct=True, colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_text(s, 9.1, 1.3, 3.6, 0.4, [dict(text="月度订单 7→8（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 9.0, 1.7, 3.7, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"月度订单":[148,681]}, "月度订单", colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_text(s, 5.4, 4.55, 7.3, 0.4, [dict(text="同品类对标：本款 vs 同类均值（%）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 4.95, 7.4, 1.9, XL_CHART_TYPE.BAR_CLUSTERED,
          ["达人出单率","履约率"],
          {"本款":[21.6,92.1], "对标均值":[13.0,84.3]},
          "本款 vs 同类均值（%）", pct=True, colors=[PINK_DK, GRAY], legend=True, lbl_size=8)
page_no(s, PN)

# ---- 2789 : 头部流失下滑 ----
PN += 1
s = slide_base("2789 · Four-Pocket Skort", "视角：下滑预警 —— 头部达人流失是主因，需补素材 + 头部挽回", part="Part 02")
add_rect(s, 0.6, 1.4, 4.5, 2.0, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 0.8, 1.5, 4.1, 1.9, [
    dict(text="📊 变化原因", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="月度订单 ▼51（88→37）。7月头部 frantastic714 贡献 33 件，8月头部 orfelinda78 仅 2 件 —— 头部流失是主因。", size=11.5, bold=False, color=INK, space_after=4),
    dict(text="同品类对标偏弱（21.9% vs 26.7%），履约率 ▼13pp，需补达人素材。", size=11.5, bold=False, color=INK),
])
add_rect(s, 0.6, 3.55, 4.5, 3.05, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 0.8, 3.65, 4.1, 2.9, [
    dict(text="🎯 下月措施", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="建立「上期出单达人 100% 复投」清单，orfelinda78 等优先挽回。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="针对未履约达人，第 10 天跟进、第 15 天升级催更。", size=11.5, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="优化口播脚本 / 佣金 / 卖点，对标高转化同款补素材。", size=11.5, bold=False, color=INK, bullet=True),
])
add_text(s, 5.4, 1.3, 7.3, 0.4, [dict(text="月度订单 7→8（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 1.7, 3.6, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月","8月"], {"月度订单":[88,37]}, "月度订单", colors=[RED], show_labels=True, lbl_size=9)
add_text(s, 9.1, 1.3, 3.6, 0.4, [dict(text="头部达人出单：7月 vs 8月（件）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 9.0, 1.7, 3.7, 2.6, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["7月头部","8月头部"], {"头部出单":[33,2]}, "头部达人出单", colors=[PINK_DEEP, GRAY], show_labels=True, lbl_size=9)
add_text(s, 5.4, 4.55, 7.3, 0.4, [dict(text="同品类对标：本款 vs 同类均值（%）", size=11.5, bold=True, color=PINK_DEEP)])
add_chart(s, 5.3, 4.95, 7.4, 1.9, XL_CHART_TYPE.BAR_CLUSTERED,
          ["达人出单率","履约率"],
          {"本款":[21.9,71.9], "对标均值":[26.7,82.2]},
          "本款 vs 同类均值（%）", pct=True, colors=[PINK_DK, GRAY], legend=True, lbl_size=8)
page_no(s, PN)

# =========================================================
# PART 03 divider
# =========================================================
part_divider("Part 03", "达人维度洞察", "谁在卖货、谁流失了、结构是否变化、新品能否接力")

# ---- 达人亮点与流失预警 ----
PN += 1
s = slide_base("达人亮点与流失预警", "8月 Top5 出单 vs 7月头部（对比是否流失）", part="Part 03")
add_text(s, 0.6, 1.25, 6.0, 0.4, [dict(text="7月头部达人：8月出单（件）", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.65, 6.1, 3.4, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["imanii\n379","heyits\n281","ljac888\n113","yetsika\n105","nairi\n88"],
          {"7月":[379,281,113,105,88], "8月":[0,214,0,0,0]},
          "7月头部 → 8月出单", colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_rect(s, 6.9, 1.45, 5.8, 3.6, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 7.1, 1.55, 5.4, 3.4, [
    dict(text="🌟 8月出单 Top 5", size=13, bold=True, color=PINK_DEEP, space_after=5),
    dict(text="heyitsamber44 · 214 件（寄样 2 次）", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="danakkt · 84 件　jerlenimarte · 64 件", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="gabriepearl · 46 件　madirjo · 28 件", size=11.5, bold=False, color=INK, space_after=8),
    dict(text="⚠️ 重点流失（7月头部，8月未出单）", size=13, bold=True, color=RED, space_after=5),
    dict(text="imaniiibrooks 379 → 流失", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="ljac888 113 → 流失　yetsika 105 → 流失", size=11.5, bold=False, color=INK, space_after=3),
    dict(text="nairireyes 88 → 流失", size=11.5, bold=False, color=INK, space_after=6),
    dict(text="💡 下月：建立「上期出单 100% 复投」清单，流失头部定向 bonus 挽回。", size=11, bold=True, color=PINK_DK),
])
page_no(s, PN)

# ---- 效率榜 ----
PN += 1
s = slide_base("全 SKU 达人效率榜", "「更容易被卖起来」= 出单率高且单达人产出高", part="Part 03")
headers = ["SKU","定位","达人出单率","单达人产出(件)","月度出单"]
rows = [
    ["2722","爆品","32.4%","136.7","1,640"],
    ["2789","销售","30.4%","5.3","37"],
    ["28173","销售","29.5%","33.5","771"],
    ["2189","销售","22.9%","85.1","681"],
    ["2178","爆品","8.9%","353.6","1,768"],
    ["2190","爆品","6.5%","592","1,776"],
]
add_table(s, 0.6, 1.45, 6.2, headers, rows,
          col_widths=[1.2,1.2,1.7,2.0,1.6], font_size=11)
add_text(s, 0.6, 4.55, 6.2, 0.4, [dict(text="2722 / 2789 / 28173 居前，可作资源倾斜参考", size=10.5, bold=False, color=GRAY)])
add_text(s, 7.1, 1.3, 5.6, 0.4, [dict(text="达人出单率 by SKU（%）", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 7.0, 1.7, 5.7, 3.6, XL_CHART_TYPE.BAR_CLUSTERED,
          ["2722","2789","28173","2189","2178","2190"],
          {"出单率":[32.4,30.4,29.5,22.9,8.9,6.5]},
          "达人出单率（%）", pct=True, colors=[PINK_DEEP], show_labels=True, lbl_size=9)
add_rect(s, 7.0, 5.45, 5.7, 1.1, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 7.2, 5.52, 5.3, 1.0, [
    dict(text="策略：BD 精力向效率榜 Top3 倾斜；效率低 SKU 减少广撒网，改老达人复投。", size=11, bold=False, color=INK),
])
page_no(s, PN)

# ---- 新老达人结构变化 ----
PN += 1
s = slide_base("达人结构是否变化？· 新老出单率", "真人思考：拉新质量如何，老客是否仍是基本盘", part="Part 03")
add_text(s, 0.6, 1.25, 12, 0.4, [dict(text="各 SKU 老 / 新达人出单率对比（%）", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.7, 7.6, 3.7, XL_CHART_TYPE.BAR_CLUSTERED,
          ["2178","2722","28173","2189","2789"],
          {"新达人":[7.3,26.5,25.9,11.1,15.8], "老达人":[5.6,27.3,28.6,45.5,30.8]},
          "老 vs 新 达人出单率（%）", pct=True, colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_rect(s, 8.4, 1.55, 4.4, 3.8, fill=WHITE, line=PINK, line_w=1, radius=0.07)
add_text(s, 8.6, 1.65, 4.0, 3.6, [
    dict(text="🧭 结构解读", size=13, bold=True, color=PINK_DEEP, space_after=6),
    dict(text="2189 / 2789：老达人出单率远高于新达人（最高 45.5% vs 11.1%）—— 老客仍是质量基本盘。", size=11, bold=False, color=INK, space_after=7),
    dict(text="2178：新老接近（7.3% vs 5.6%），本轮拉新质量较好，但老客复投不足。", size=11, bold=False, color=INK, space_after=7),
    dict(text="2722 / 28173：新老差距小，拉新可继续放量。", size=11, bold=False, color=INK, space_after=7),
    dict(text="💡 结构未明显恶化，重点是「老客复投 + 新客测品」。", size=11, bold=True, color=PINK_DK),
])
page_no(s, PN)

# ---- 接力 + 机会矩阵 ----
PN += 1
s = slide_base("SKU 接力 & 机会矩阵", "新品能否承接老款波动？预算往哪投？", part="Part 03")
add_text(s, 0.6, 1.25, 6.0, 0.4, [dict(text="接力关系：老 SKU vs 新 SKU（件）", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.7, 6.1, 3.2, XL_CHART_TYPE.COLUMN_CLUSTERED,
          ["老SKU","新SKU"], {"7月":[1534,36], "8月":[560,35]},
          "老/新 SKU 月度出单", colors=[PINK_MED, PINK_DEEP], legend=True, lbl_size=8)
add_text(s, 0.6, 5.0, 6.1, 1.0, [
    dict(text="老 SKU ▼974 件，新 SKU 仅 +35（占 6%）—— 接力仍有缺口，需加快测品转爆品。", size=11, bold=False, color=INK, space_after=4),
    dict(text="策略：出单率>15% 测品提高寄样优先级；持续低产测品及时撤退。", size=11, bold=True, color=PINK_DK),
])
# opportunity matrix 4 cards
mx, my = 7.0, 1.5
mw, mh = 2.85, 1.65
quad = [
    ("高GMV·高增长", "—", "核心放量款", PINK_DEEP, WHITE),
    ("高GMV·低增长", "2178/2190/2722", "防头部流失", PINK_DK, WHITE),
    ("低GMV·高增长", "2189/2757", "潜力测品加寄样", PINK_MED, INK),
    ("低GMV·低增长", "28173/2789/2A19…", "撤退或仅测品", GRAY, WHITE),
]
for i,(t,sk,desc,col,tc) in enumerate(quad):
    r, c = divmod(i,2)
    x = mx + c*(mw+0.15); y = my + r*(mh+0.2)
    add_rect(s, x, y, mw, mh, fill=col, line=None, radius=0.06)
    add_text(s, x+0.12, y+0.1, mw-0.24, 0.5, [dict(text=t, size=12.5, bold=True, color=tc)])
    add_text(s, x+0.12, y+0.62, mw-0.24, 0.5, [dict(text=sk, size=10.5, bold=True, color=tc)])
    add_text(s, x+0.12, y+1.08, mw-0.24, 0.5, [dict(text=desc, size=10.5, bold=False, color=tc)])
add_rect(s, 7.0, 5.25, 5.9, 1.25, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 7.2, 5.33, 5.5, 1.1, [
    dict(text="预算分配：60% 高GMV·高增长 ｜ 30% 低GMV·高增长测品 ｜ 10% 头部挽回", size=11, bold=True, color=PINK_DEEP),
])
page_no(s, PN)

# =========================================================
# PART 04 divider
# =========================================================
part_divider("Part 04", "复投与下月行动", "复投分两种看 · 行动逐条落地")

# ---- 复投① 不同产品 ----
PN += 1
s = slide_base("复投 ① · 不同产品复投（A→B）", "普通广撒网复投成功率仅 9%，是最大效率黑洞", part="Part 04")
headers = ["SKU","复投声明","成功","未成功","观察中","成功率"]
rows = [
    ["2178","312","21","258","33","8%"],
    ["2190","243","13","206","24","6%"],
    ["2722","135","12","118","5","9%"],
    ["2189","203","14","174","15","7%"],
    ["28173","162","17","140","5","11%"],
    ["2789","141","10","124","7","7%"],
    ["2A19","157","10","139","8","7%"],
    ["2757","17","0","16","1","0%"],
    ["28193","7","1","6","0","14%"],
    ["2L06","3","2","1","0","67%"],
]
add_table(s, 0.6, 1.45, 6.4, headers, rows,
          col_widths=[1.2,1.5,1.1,1.4,1.3,1.1], font_size=10)
add_text(s, 0.6, 6.5, 6.4, 0.4, [dict(text="注：除 2L06(样本极小)外，各 SKU 普通复投成功率普遍 6%~11%。", size=9.5, bold=False, color=GRAY)])
add_text(s, 7.3, 1.3, 5.4, 0.4, [dict(text="各 SKU 普通复投成功率（%）", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 7.2, 1.7, 5.5, 3.4, XL_CHART_TYPE.BAR_CLUSTERED,
          ["2178","2190","2722","2189","28173","2789","2A19","2757","28193","2L06"],
          {"成功率":[8,6,9,7,11,7,7,0,14,67]},
          "普通复投成功率（%）", pct=True, colors=[PINK_DEEP], show_labels=True, lbl_size=8)
add_rect(s, 7.2, 5.25, 5.5, 1.3, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.06)
add_text(s, 7.4, 5.33, 5.1, 1.15, [
    dict(text="💡 结论：普通复投成功率仅 9%。下月改为「只对上期出单达人定向复投」，并配专属佣金 / bonus。", size=11, bold=True, color=PINK_DK),
])
page_no(s, PN)

# ---- 复投② 同一产品（2178+2190）----
PN += 1
s = slide_base("复投 ② · 同一产品复投（2178+2190）", "合作过本款再复投本款，目前仅 2178+2190 跑通", part="Part 04")
add_text(s, 0.6, 1.3, 6.0, 0.4, [dict(text="206 位已出单达人 · 跟进结果", size=12, bold=True, color=PINK_DEEP)])
add_chart(s, 0.5, 1.7, 6.1, 3.5, XL_CHART_TYPE.PIE,
          ["成功 18","失败 19","未回复 169"], {"":[18,19,169]},
          "同款复投跟进结果", colors=[GREEN, RED, GRAY], show_labels=True, lbl_size=9)
add_rect(s, 0.6, 5.35, 6.1, 1.2, fill=WHITE, line=PINK, line_w=1, radius=0.06)
add_text(s, 0.8, 5.45, 5.7, 1.05, [
    dict(text="未回复占比 82%（169 / 206）—— 跟进节奏与触达方式仍有巨大优化空间。", size=11, bold=False, color=INK, space_after=4),
    dict(text="成功 18 · 失败 19 · 未回复 169", size=11, bold=True, color=PINK_DK),
])
add_rect(s, 7.0, 1.55, 5.8, 5.0, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.07)
add_text(s, 7.2, 1.7, 5.4, 4.7, [
    dict(text="📌 结论", size=14, bold=True, color=PINK_DEEP, space_after=7),
    dict(text="2178+2190 同款复投已联系 206 位已出单达人，当前成功 18、失败 19、未回复 169。", size=12, bold=False, color=INK, space_after=8),
    dict(text="未回复占 82%，说明「复投了但没跟到位」是核心问题，而非达人意愿。", size=12, bold=False, color=INK, space_after=10),
    dict(text="🎯 下月策略", size=14, bold=True, color=PINK_DEEP, space_after=7),
    dict(text="对未回复达人做第二轮 1v1 触达（换话术 / 换 BD / 加 bonus）。", size=12, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="把成功经验沉淀为「同款复投 SOP」：首触 → 7 天跟进 → 15 天升级。", size=12, bold=False, color=INK, bullet=True, space_after=6),
    dict(text="与 Part 02 组合策略联动：两款均出单达人优先双推。", size=12, bold=False, color=INK, bullet=True),
])
page_no(s, PN)

# ---- 下月行动 ----
PN += 1
s = slide_base("下月行动 · 7 项落地清单", part="Part 04")
acts = [
    ("1","复投从「广撒网」改「定向复投」","普通复投成功率仅 9%；只复投上期已出单达人并配专属 bonus；2178+2190 同款复投二次跟进未回复。", PINK_DEEP),
    ("2","2178 / 2190 合并放量","Work Pants 双爆款统一招募、组合推荐，提升单达人产出；优先复投两款均出单的头部达人。", PINK_DK),
    ("3","头部达人挽回","imaniiibrooks / ljac888 / yetsika / nairireyes 等逐一挽回，建立「上期出单 100% 复投」清单。", PINK_MED),
    ("4","新达人 SOP","首轮只寄 1 件测品验证带货力，出单后再开放主推；第 10 天跟进、第 15 天升级催更。", PINK_DEEP),
    ("5","寄样按画像筛人","优先核心达人、星级 ≥3★、非大码身材；低转化画像减少寄样或改测品验证。", PINK_DK),
    ("6","视频端乘势加投","自然单占比高、内容自带成交；预算从广撒网新拉转向复投已验证高自然单达人，ROI 更高。", PINK_MED),
    ("7","机会矩阵指导预算","60% 给高GMV·高增长款，30% 给低GMV·高增长测品，10% 用于头部挽回。", PINK_DEEP),
]
# 2 columns x 4 rows (last spans)
col_w = 6.0; x0 = 0.6; x1 = 6.85; y0 = 1.45; rh = 1.35; rg = 0.12
for i,(n,t,d,col) in enumerate(acts):
    if i < 6:
        colx = x0 if i % 2 == 0 else x1
        rowy = y0 + (i // 2) * (rh + rg)
        add_rect(s, colx, rowy, col_w, rh, fill=WHITE, line=PINK, line_w=1, radius=0.07)
        add_rect(s, colx, rowy, 0.7, rh, fill=col, line=None, radius=0.02)
        add_text(s, colx, rowy+0.42, 0.7, 0.5, [dict(text=n, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
        add_text(s, colx+0.85, rowy+0.1, col_w-1.0, 0.45, [dict(text=t, size=12.5, bold=True, color=INK)])
        add_text(s, colx+0.85, rowy+0.52, col_w-1.0, 0.78, [dict(text=d, size=10, bold=False, color=INK_SOFT)])
    else:
        rowy = y0 + 3 * (rh + rg)
        add_rect(s, x0, rowy, 11.6, rh, fill=PINK_PALE, line=PINK_DEEP, line_w=1.25, radius=0.07)
        add_rect(s, x0, rowy, 0.7, rh, fill=PINK_DEEP, line=None, radius=0.02)
        add_text(s, x0, rowy+0.42, 0.7, 0.5, [dict(text=n, size=22, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
        add_text(s, x0+0.85, rowy+0.1, 10.5, 0.45, [dict(text=t, size=12.5, bold=True, color=PINK_DEEP)])
        add_text(s, x0+0.85, rowy+0.52, 10.5, 0.78, [dict(text=d, size=10.5, bold=False, color=INK)])
page_no(s, PN)

# =========================================================
# save
# =========================================================
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Dlooda_8月月度汇报_v3.pptx")
OUT = os.path.abspath(OUT)
prs.save(OUT)
print("SAVED:", OUT, "slides:", len(prs.slides._sldIdLst))
