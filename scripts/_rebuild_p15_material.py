# -*- coding: utf-8 -*-
"""达人素材端页（PART 03·素材供给页，slide idx 14）整改：短板汇报 → 正向盘点。
基于 v9_11，仅改第 15 页。输出 v9_12。所有数据为用户已核对真实值，不改动、不编造。
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION

INK   = RGBColor.from_string('1F1F1F')
BODY  = RGBColor.from_string('3D3D3D')
MUTE  = RGBColor.from_string('9A9A9A')
ACC   = RGBColor.from_string('B06579')   # 玫红强调
GRAY_D= RGBColor.from_string('6B6B6B')
FONT  = '微软雅黑'

WHITE = RGBColor.from_string('FFFFFF')
CARD  = RGBColor.from_string('F7F4F5')
HDR   = RGBColor.from_string('EFE7EA')
ZEB   = RGBColor.from_string('FAF7F8')
LINE  = RGBColor.from_string('E6E0E2')

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_11.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_12.pptx'

prs = Presentation(SRC)
s = prs.slides[14]

# 删除当前页所有 shape
for sh in list(s.shapes):
    sh._element.getparent().remove(sh._element)

def add_text(x, y, w, h, lines, anchor=MSO_ANCHOR.TOP, align=PP_ALIGN.LEFT, wrap=True):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    first = True
    for para in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.space_after = Pt(3); p.space_before = Pt(0)
        for (t, sz, b, col) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = b; r.font.name = FONT
            r.font.color.rgb = col
    return tb

def style_cell(cell, text, size, bold, color, fill):
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    cell.margin_left = Inches(0.04); cell.margin_right = Inches(0.04)
    cell.margin_top = Inches(0.004); cell.margin_bottom = Inches(0.004)
    tf = cell.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = FONT
    r.font.color.rgb = color
    cell.fill.solid(); cell.fill.fore_color.rgb = fill

# ---------- 1. 顶部标题区 ----------
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(0.34), Inches(0.1), Inches(0.74)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.84, 0.26, 11.9, 0.66, [[('达人素材端：供给稳定，四款爆品人均近 2 条', 24, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.3, 0.40, 3.43, 0.5, [[('PART 03 · 达人端', 12, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)
add_text(0.84, 1.0, 11.89, 0.36, [[('达人投稿活跃、素材持续积累，为内容侧健康提供支撑', 15, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.5), Inches(12.13), Inches(0.012)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = LINE; s.shapes[-1].line.fill.background()

# ---------- 2. 上部 4 张指标卡（一行，重点 玫红） ----------
cards = [
    ('1.92 条/人', '全店人均素材（供给稳定）', ACC),
    ('743 条',     '素材总量（持续积累）',     INK),
    ('386 位',     '投稿达人（覆盖广）',       INK),
    ('1.5–1.8 条', '四款爆品人均（供给稳定）', ACC),
]
cw = 2.88; gap = 0.17; cx0 = 0.6; cy = 1.62; ch = 0.72
for i, (big, lab, col) in enumerate(cards):
    x = cx0 + i*(cw+gap)
    s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(cy), Inches(cw), Inches(ch))
    sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
    sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
    s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(cy+0.13), Inches(0.08), Inches(ch-0.26)).fill.solid()
    s.shapes[-1].fill.fore_color.rgb = col; s.shapes[-1].line.fill.background()
    add_text(x+0.2, cy+0.1, cw-0.32, 0.42, [[(big, 22, True, col)]], anchor=MSO_ANCHOR.MIDDLE)
    add_text(x+0.2, cy+0.48, cw-0.32, 0.2, [[(lab, 11, False, BODY)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 3. 图表区（图上字下）：柱状图 + 明细表 + 环形图 ----------
# 3a. 四款爆品人均素材 柱状图
cd = CategoryChartData()
cd.categories = ['28173', '2190', '2178', '2189']
cd.add_series('人均素材', (1.79, 1.80, 1.53, 1.52))
gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.6), Inches(2.5), Inches(5.4), Inches(2.5), cd)
chart = gf.chart
chart.has_title = True
chart.chart_title.text_frame.text = '四款爆品人均素材（条/人）'
tr = chart.chart_title.text_frame.paragraphs[0].runs[0]
tr.font.size = Pt(13); tr.font.bold = True; tr.font.name = FONT; tr.font.color.rgb = INK
chart.has_legend = False
plot = chart.plots[0]
plot.gap_width = 70
plot.has_data_labels = True
plot.data_labels.number_format = '0.00'
plot.data_labels.number_format_is_linked = False
plot.data_labels.position = XL_LABEL_POSITION.OUTSIDE_END
plot.data_labels.font.size = Pt(11); plot.data_labels.font.bold = True
plot.data_labels.font.name = FONT; plot.data_labels.font.color.rgb = ACC
chart.value_axis.minimum_scale = 0
chart.value_axis.maximum_scale = 2.2
chart.value_axis.tick_labels.number_format = '0.0'
chart.value_axis.tick_labels.number_format_is_linked = False
chart.value_axis.has_major_gridlines = True

# 3b. 四款爆品素材明细 表（置于柱状图右侧）
add_text(6.35, 2.46, 3.0, 0.26, [[('四款爆品素材明细', 12.5, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
rows4 = [
    ('28173', '161', '90', '1.79'),
    ('2190',  '106', '59', '1.80'),
    ('2178',  '84',  '55', '1.53'),
    ('2189',  '79',  '52', '1.52'),
]
gf2 = s.shapes.add_table(5, 4, Inches(6.35), Inches(2.82), Inches(3.0), Inches(1.7))
tb = gf2.table
for i, cw_i in enumerate([1.0, 0.82, 0.7, 0.7]):
    tb.columns[i].width = Inches(cw_i)
hdr = ['SKU', '素材数', '达人', '人均']
for ci, htxt in enumerate(hdr):
    style_cell(tb.cell(0, ci), htxt, 11, True, INK, HDR)
for ri, row in enumerate(rows4, start=1):
    tb.rows[ri].height = Inches(0.32)
    for ci, val in enumerate(row):
        fill = WHITE if ri % 2 == 1 else ZEB
        bold = (ci == 3)  # 人均列加粗强调
        col = ACC if ci == 3 else BODY
        style_cell(tb.cell(ri, ci), val, 11, bold, col, fill)

# 3c. 达人投稿分布 环形图
cd2 = CategoryChartData()
cd2.categories = ['3 条+（35 组）', '2 条（43 组）', '1 条（178 组）']
cd2.add_series('投稿分布', (13.7, 16.8, 69.5))
gf3 = s.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, Inches(9.45), Inches(2.5), Inches(3.4), Inches(2.5), cd2)
chart2 = gf3.chart
chart2.has_title = True
chart2.chart_title.text_frame.text = '达人投稿分布'
tr2 = chart2.chart_title.text_frame.paragraphs[0].runs[0]
tr2.font.size = Pt(13); tr2.font.bold = True; tr2.font.name = FONT; tr2.font.color.rgb = INK
chart2.has_legend = True
chart2.legend.position = XL_LEGEND_POSITION.RIGHT
chart2.legend.include_in_layout = False
chart2.legend.font.size = Pt(10); chart2.legend.font.name = FONT
plot2 = chart2.plots[0]
plot2.has_data_labels = True
plot2.data_labels.show_percentage = True
plot2.data_labels.show_value = False
plot2.data_labels.number_format = '0.0%'
plot2.data_labels.number_format_is_linked = False
plot2.data_labels.position = XL_LABEL_POSITION.CENTER
plot2.data_labels.font.size = Pt(10); plot2.data_labels.font.bold = True
plot2.data_labels.font.name = FONT; plot2.data_labels.font.color.rgb = INK

# ---------- 4. 底部：现象/结论 + 落点策略（正向、删付费素材） ----------
TBY = 5.2; TBH = 2.0
s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(TBY), Inches(12.13), Inches(TBH))
sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(TBY+0.14), Inches(0.08), Inches(TBH-0.28)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.84, TBY+0.12, 11.7, TBH-0.24, [
    [('现象 / 结论：', 12.5, True, ACC),
     ('四款爆品人均素材 1.5–1.8 条、供给稳定；达人投稿活跃，素材总量 743 条持续积累，为内容侧健康提供支撑。达人已普遍完成首条投稿，部分达人持续多次产出、素材量稳步积累——素材越多、内容侧越稳。', 12.5, False, BODY)],
    [('落点策略：', 12.5, True, ACC),
     ('① 鼓励核心达人多次产出、人均素材持续提升　② 稳定达人投稿节奏、保障素材供给　③ 素材积累为内容侧健康与备货打基础', 12.5, True, ACC)],
], anchor=MSO_ANCHOR.MIDDLE)

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
