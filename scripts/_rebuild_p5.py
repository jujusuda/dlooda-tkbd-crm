# -*- coding: utf-8 -*-
"""P5 重建：常卖款整体月度出单
基于 v9_1（已含 s4 修复），仅重建第 5 页：
- 顶部：双单品大卡 -> 一个整体大卡 6,029
- 折线图：四款 7-9 月，逐点核对数据标签（修复 2189 9月 761->999 串行）
- 右侧：四款并排、整体视角措辞
- 标题 / 副标题 / 结论 / 落点策略：整体视角
配色与字号沿用 v9 规范。
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION, XL_MARKER_STYLE

INK   = RGBColor.from_string('1F1F1F')   # 标题/主文字（近黑）
BODY  = RGBColor.from_string('3D3D3D')   # 正文
MUTE  = RGBColor.from_string('9A9A9A')   # 注释/辅助
ACC   = RGBColor.from_string('B06579')   # 玫红（大数字/强调）
ACC_L = RGBColor.from_string('C97F95')   # 柔雾玫瑰（装饰/副线）
CARD  = RGBColor.from_string('F9F5F6')   # 极浅暖粉灰卡片底
LINE  = RGBColor.from_string('EAE2E5')   # 浅分隔线
GRAY_D= RGBColor.from_string('5A5A5A')   # 图表深灰
WHITE = RGBColor.from_string('FFFFFF')
FONT  = '微软雅黑'

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_1.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_3.pptx'

prs = Presentation(SRC)
s = prs.slides[4]  # P5

# ---------- 保留：标题竖 accent[0] 与 PART 徽标[2] ----------
shapes = list(s.shapes)
keep = [shapes[0], shapes[2]]
for sh in shapes:
    if sh not in keep:
        sh._element.getparent().remove(sh._element)

def rect(x, y, w, h, fill, line=None):
    sp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line; sp.line.width = Pt(0.75)
    sp.shadow.inherit = False
    return sp

def add_text(x, y, w, h, paras, anchor=None, align=None, wrap=True):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = wrap
    if anchor is not None: tf.vertical_anchor = anchor
    first = True
    for para in paras:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        if align is not None: p.alignment = align
        for (t, sz, bold, color) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = bold
            r.font.color.rgb = color; r.font.name = FONT
    return tb

# ---------- 1. 主标题 + 副标题 ----------
add_text(0.84, 0.30, 8.45, 0.66,
         [[('常卖款整体月度出单：9 月 6,029 单、环比 +12.8%', 24, True, INK)]],
         anchor=MSO_ANCHOR.MIDDLE)

add_text(0.84, 1.06, 11.8, 0.34,
         [[('四款常卖款整体盘子逐月走高，2190 领跑、2189 补量、2178 / 28173 高位企稳', 15, False, BODY)]])

# 分隔线
rect(0.6, 1.46, 12.13, Pt(1)/914400, LINE)

# ---------- 2. 顶部整体大卡（6,029） ----------
CW, CX, CY, CH = 12.13, 0.6, 1.58, 0.92
rect(CX, CY, CW, CH, CARD)
rect(CX, CY, 0.09, CH, ACC)            # 左 accent
add_text(0.95, CY+0.13, 3.1, 0.66,
         [[('6,029', 34, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(4.2, CY+0.16, 8.3, 0.34,
         [[('四款常卖款 9 月合计月度出单', 15, False, BODY)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(4.2, CY+0.52, 8.3, 0.30,
         [[('环比 8 月 +12.8%（5,345 → 6,029）｜ Q3 合计 15,022', 13, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 3. 折线图（左）：四款 7-9 月，逐点标签 ----------
def add_line_chart(x, y, w, h, cats, series, colors):
    cd = CategoryChartData(); cd.categories = cats
    for (nm, vals) in series: cd.add_series(nm, vals)
    gf = s.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS, Inches(x), Inches(y), Inches(w), Inches(h), cd)
    ch = gf.chart
    ch.has_title = False
    ch.has_legend = True; ch.legend.position = XL_LEGEND_POSITION.BOTTOM
    ch.legend.include_in_layout = False
    ch.legend.font.size = Pt(10); ch.legend.font.name = FONT
    pl = ch.plots[0]
    pl.has_data_labels = True
    dl = pl.data_labels
    dl.show_value = True; dl.number_format = '#,##0'; dl.number_format_is_linked = False
    # ⚠️ 折线图的 dLblPos 只允许 t/b/ctr/l/r；outEnd/inEnd 是柱图/饼图专用，
    # 写进折线图会导致 PowerPoint 报「文件损坏需修复」。必须用 ABOVE(t)/BELOW(b)。
    dl.position = XL_LABEL_POSITION.ABOVE
    dl.font.size = Pt(9); dl.font.bold = False; dl.font.name = FONT; dl.font.color.rgb = INK
    for i, c in enumerate(colors):
        se = pl.series[i]
        se.format.line.color.rgb = c
        se.format.line.width = Pt(2.25)
        se.marker.style = XL_MARKER_STYLE.CIRCLE
        se.marker.size = 6
        se.marker.format.fill.solid(); se.marker.format.fill.fore_color.rgb = c
        se.marker.format.line.color.rgb = WHITE; se.marker.format.line.width = Pt(1)
        # 逐系列显式开启数据标签（plot 级 show_value 不会继承到 per-series dLbls）
        sd = se.data_labels
        sd.show_value = True
        sd.number_format = '#,##0'; sd.number_format_is_linked = False
        # 8月 2190(1872) 与 2178(1904) 仅差 32，标签若都置于上方必然互相遮挡；
        # 故将 2178 系列标签置于点下方（BELOW='b'），其余置于上方（ABOVE='t'）。
        sd.position = XL_LABEL_POSITION.BELOW if i == 1 else XL_LABEL_POSITION.ABOVE
        sd.font.size = Pt(8.5 if i == 1 else 9)
        sd.font.bold = False; sd.font.name = FONT; sd.font.color.rgb = INK
    va = ch.value_axis
    va.minimum_scale = 0; va.maximum_scale = 3200
    va.has_major_gridlines = True
    va.major_gridlines.format.line.color.rgb = LINE
    va.major_gridlines.format.line.width = Pt(0.5)
    va.tick_labels.font.size = Pt(10); va.tick_labels.font.name = FONT; va.tick_labels.font.color.rgb = MUTE
    ca = ch.category_axis
    ca.tick_labels.font.size = Pt(11); ca.tick_labels.font.name = FONT; ca.tick_labels.font.color.rgb = GRAY_D
    ca.format.line.color.rgb = LINE
    return ch

add_line_chart(0.6, 2.62, 6.30, 3.43,
               ['7月', '8月', '9月'],
               [('2190', [1696, 1872, 2883]),
                ('2178', [1455, 1904, 1386]),
                ('2189', [176, 723, 999]),
                ('28173', [321, 846, 761])],
               [ACC, GRAY_D, ACC_L, MUTE])

# ---------- 4. 右侧四款拆解（整体视角） ----------
cards = [
    ('2190', '2,883', '｜ 1696→1872→2883 连续走高，领跑'),
    ('2189', '999',   '｜ 176→723→999 三连升、环比 +38%'),
    ('2178', '1,386', '｜ 1904→1386 冲高后回落'),
    ('28173','761',   '｜ 846→761 高点回落，寄样最多'),
]
RX, RW, RH, GAP = 7.10, 5.63, 0.82, 0.05
RY0 = 2.62
for i, (sku, num, desc) in enumerate(cards):
    y = RY0 + i*(RH+GAP)
    rect(RX, y, RW, RH, CARD)
    rect(RX, y, 0.07, RH, ACC)
    add_text(RX+0.20, y+0.08, 1.4, 0.30,
             [[(sku, 14, True, INK)]])
    add_text(RX+0.20, y+0.42, RW-0.4, 0.34,
             [[(num, 14, True, ACC), (desc, 13, False, BODY)]])

# ---------- 5. 结论（整体视角） ----------
CYB, CHB = 6.18, 0.62
rect(0.6, CYB, 12.13, CHB, CARD)
rect(0.6, CYB, 0.09, CHB, ACC)
add_text(0.95, CYB, 11.65, CHB,
         [[('结论　', 14, True, ACC),
           ('四款常卖款 9 月合计出单 6,029、环比 +12.8%，整体盘子逐月走高、增长由头部拉动；其中 2190 一枝独秀、2189 补量成功，2178 / 28173 高位企稳、基本盘稳。', 14, False, BODY)]],
         anchor=MSO_ANCHOR.MIDDLE)

# ---------- 6. 落点策略（整体视角） ----------
SYB, SHB = 6.90, 0.58
rect(0.6, SYB, 12.13, SHB, CARD)
rect(0.6, SYB, 0.09, SHB, ACC)
add_text(0.95, SYB, 11.65, SHB,
         [[('落点策略　', 13, True, ACC),
           ('① ', 13, True, INK), ('2190 扩量', 13, False, BODY),
           ('　② ', 13, True, INK), ('2189 补量', 13, False, BODY),
           ('　③ ', 13, True, INK), ('2178 / 28173 存量维稳、不追量', 13, False, BODY)]],
         anchor=MSO_ANCHOR.MIDDLE)

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
