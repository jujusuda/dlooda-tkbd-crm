# -*- coding: utf-8 -*-
"""达人素材页（PART 03·素材供给页，slide idx 14）v3：图表为主视觉（环形图 hero）。
基于 v9_15，仅改第 15 页。输出 v9_16。所有数据为用户已核对真实值，不改动、不编造。
布局：标题区 / 左窄条(SKU表降权+全店辅助) / 中部主视觉(发布次数分布环形图+核心数字) / 底部核心发现+后续观察方向。
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
ACC   = RGBColor.from_string('B06579')   # 玫红强调（多次）
ACC_L = RGBColor.from_string('E3B9C6')   # 浅玫红（单次）
GRAY_D= RGBColor.from_string('6B6B6B')
FONT  = '微软雅黑'

WHITE = RGBColor.from_string('FFFFFF')
CARD  = RGBColor.from_string('F7F4F5')
HDR   = RGBColor.from_string('EFE7EA')
ZEB   = RGBColor.from_string('FAF7F8')
LINE  = RGBColor.from_string('E6E0E2')

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_15.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_16.pptx'

prs = Presentation(SRC)
s = prs.slides[14]
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
    cell.margin_left = Inches(0.02); cell.margin_right = Inches(0.02)
    cell.margin_top = Inches(0.002); cell.margin_bottom = Inches(0.002)
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
add_text(0.84, 0.26, 11.9, 0.66, [[('达人合作结构：单次发布占比较高', 24, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.3, 0.40, 3.43, 0.5, [[('PART 03 · 达人端', 12, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)
add_text(0.84, 1.0, 11.89, 0.36, [[('9 月达人 - SKU 合作以单次发布为主，多次发布组合占比 30.5%', 15, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.5), Inches(12.13), Inches(0.012)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = LINE; s.shapes[-1].line.fill.background()

# ---------- 2. 左窄条：四款 SKU 数据表（降视觉权重）+ 全店辅助指标 ----------
add_text(0.6, 1.6, 2.5, 0.28, [[('四款爆品素材概况', 11, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
rows4 = [
    ('28173', '161', '90', '1.79'),
    ('2190',  '106', '59', '1.80'),
    ('2178',  '84',  '55', '1.53'),
    ('2189',  '79',  '52', '1.52'),
]
gf_t = s.shapes.add_table(5, 4, Inches(0.6), Inches(1.94), Inches(2.5), Inches(1.7))
tb = gf_t.table
for i, cw_i in enumerate([0.72, 0.56, 0.5, 0.52]):
    tb.columns[i].width = Inches(cw_i)
hdr = ['SKU', '素材', '达人', '人均']
for ci, htxt in enumerate(hdr):
    style_cell(tb.cell(0, ci), htxt, 9, True, INK, HDR)
for ri, row in enumerate(rows4, start=1):
    tb.rows[ri].height = Inches(0.32)
    for ci, val in enumerate(row):
        fill = WHITE if ri % 2 == 1 else ZEB
        bold = (ci == 3); col = ACC if ci == 3 else BODY
        style_cell(tb.cell(ri, ci), val, 9, bold, col, fill)
add_text(0.6, 3.72, 2.5, 0.9, [
    [('全店', 9, False, MUTE), (' 743 条 / 386 位', 9, False, MUTE)],
    [('= 1.92 条 / 人', 9, True, MUTE)],
    [('（辅助指标）', 8, False, MUTE)],
], anchor=MSO_ANCHOR.TOP)

# ---------- 3. 中部主视觉：发布次数分布 环形图（单次/多次分色） ----------
cd = CategoryChartData()
cd.categories = ['单次发布（178 组）', '多次发布（78 组）']
cd.add_series('发布次数', (178, 78))
gf = s.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, Inches(3.2), Inches(1.58), Inches(6.0), Inches(3.46), cd)
chart = gf.chart
chart.has_title = True
chart.chart_title.text_frame.text = '达人 - SKU 组合发布次数分布'
tr = chart.chart_title.text_frame.paragraphs[0].runs[0]
tr.font.size = Pt(13); tr.font.bold = True; tr.font.name = FONT; tr.font.color.rgb = INK
chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.RIGHT
chart.legend.include_in_layout = False
chart.legend.font.size = Pt(11); chart.legend.font.name = FONT
ser = chart.plots[0].series[0]
pts = ser.points
pts[0].format.fill.solid(); pts[0].format.fill.fore_color.rgb = ACC_L   # 单次 浅玫红
pts[1].format.fill.solid(); pts[1].format.fill.fore_color.rgb = ACC     # 多次 深玫红
plot = chart.plots[0]
plot.has_data_labels = True
dl = plot.data_labels
dl.show_percentage = True
dl.show_value = False
dl.number_format = '0.0%'
dl.number_format_is_linked = False
dl.position = XL_LABEL_POSITION.CENTER
dl.font.size = Pt(15); dl.font.bold = True; dl.font.name = FONT; dl.font.color.rgb = INK

# 右侧：核心数字 callout + 三品类明细
add_text(9.55, 1.66, 3.18, 0.3, [[('单次发布', 12, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 1.92, 3.18, 0.6, [[('69.5%', 30, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 2.56, 3.18, 0.3, [[('178 组 · 仅 1 条发布', 10, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 3.18, 3.18, 0.3, [[('多次发布', 12, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 3.44, 3.18, 0.6, [[('30.5%', 30, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 4.08, 3.18, 0.3, [[('78 组 · 2 条及以上', 10, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.55, 4.52, 3.18, 0.9, [
    [('三品类明细：', 9.5, True, BODY)],
    [('1 条 178 组 / 69.5%', 9.5, False, MUTE)],
    [('2 条 43 组 / 16.8%', 9.5, False, MUTE)],
    [('3 条+ 35 组 / 13.7%', 9.5, False, MUTE)],
], anchor=MSO_ANCHOR.TOP)

# ---------- 4. 核心发现（中性） ----------
CBY = 5.2; CBH = 1.0
s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(CBY), Inches(12.13), Inches(CBH))
sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(CBY+0.13), Inches(0.08), Inches(CBH-0.26)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.84, CBY+0.08, 11.7, CBH-0.16, [
    [('核心发现：', 12.5, True, ACC),
     ('9 月达人 - SKU 合作以单次发布为主，占比 69.5%；多次发布组合占 30.5%。当前数据反映重复发布占比较低，但尚不能判断其是否影响出单表现，需结合达人出单情况进一步验证。', 12.5, False, BODY)],
], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 5. 后续观察方向 ----------
OBY = 6.35; OBH = 0.82
s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(OBY), Inches(12.13), Inches(OBH))
sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(OBY+0.13), Inches(0.08), Inches(OBH-0.26)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.84, OBY+0.08, 11.7, OBH-0.16, [
    [('后续观察方向：', 12.5, True, ACC),
     ('① 结合出单情况识别值得持续合作的达人　② 观察多次发布组合的出单表现　③ 区分有效复投与单纯增加素材数量', 12.5, True, ACC)],
], anchor=MSO_ANCHOR.MIDDLE)

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
