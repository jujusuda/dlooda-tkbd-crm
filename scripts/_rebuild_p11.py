# -*- coding: utf-8 -*-
"""P11（2881 + 28102｜9 月测款页）整改：基于 v9_8，仅改第 11 页（slide idx 10）。
- 标题改中性「2881 + 28102｜9 月测款分析」；副标题「同为 9 月测款、寄样量相近：差在内容转化，不在寄样量」
- 寄样端 / 视频端 / 自然单占比 三组对比表，2881/28102 并列；悬殊指标加粗 + 玫红 #B06579
- 底部精简分析（量非原因 / 质差异 / 收尾），无独立落点策略块
产物 Desktop/余慧玲9月月度汇报_v9_9.pptx
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

INK   = RGBColor.from_string('1F1F1F')
BODY  = RGBColor.from_string('3D3D3D')
MUTE  = RGBColor.from_string('9A9A9A')
ACC   = RGBColor.from_string('B06579')   # 玫红强调
GRAY_D= RGBColor.from_string('6B6B6B')
FONT  = '微软雅黑'

WHITE = RGBColor.from_string('FFFFFF')
CARD  = RGBColor.from_string('F7F4F5')   # 浅粉灰卡
HDR   = RGBColor.from_string('EFE7EA')   # 表头浅玫灰
ZEB   = RGBColor.from_string('FAF7F8')   # 斑马浅行

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_8.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_9.pptx'

prs = Presentation(SRC)
s = prs.slides[10]

# ---------- 删除当前页所有 shape ----------
for sh in list(s.shapes):
    sh._element.getparent().remove(sh._element)

# ---------- 工具 ----------
def add_text(x, y, w, h, lines, anchor=MSO_ANCHOR.TOP, align=PP_ALIGN.LEFT, wrap=True):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    first = True
    for para in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.space_after = Pt(5); p.space_before = Pt(0)
        for (t, sz, b, col) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = b; r.font.name = FONT
            r.font.color.rgb = col
    return tb

def add_label(x, y, w, text, size=13, bold=True, color=ACC):
    return add_text(x, y, w, 0.3, [[(text, size, bold, color)]], anchor=MSO_ANCHOR.MIDDLE)

def style_cell(cell, text, size, bold, color, fill):
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    cell.margin_left = Inches(0.05); cell.margin_right = Inches(0.05)
    cell.margin_top = Inches(0.01); cell.margin_bottom = Inches(0.01)
    tf = cell.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = FONT
    r.font.color.rgb = color
    cell.fill.solid(); cell.fill.fore_color.rgb = fill

def add_table(x, y, col_w, data):
    """data: list of rows; row[0] = header. cell = (text, bold, color) or text."""
    nrows = len(data); ncols = len(col_w)
    gf = s.shapes.add_table(nrows, ncols, Inches(x), Inches(y),
                            Inches(sum(col_w)), Inches(0.34 + 0.29*(nrows-1)))
    tb = gf.table
    for i, w in enumerate(col_w):
        tb.columns[i].width = Inches(w)
    for ri, row in enumerate(data):
        tb.rows[ri].height = Inches(0.32 if ri == 0 else 0.29)
        for ci, cell in enumerate(row):
            if isinstance(cell, tuple):
                txt, b, col = cell
            else:
                txt, b, col = cell, False, BODY
            if ri == 0:
                fill = HDR; col = col if col is not BODY else INK
                style_cell(tb.cell(ri, ci), txt, 13, True, col, fill)
            else:
                fill = WHITE if ri % 2 == 1 else ZEB
                style_cell(tb.cell(ri, ci), txt, 13, b, col, fill)
    return tb

# ---------- 1. 顶部标题区 ----------
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(0.34), Inches(0.1), Inches(0.74)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.84, 0.28, 11.6, 0.66, [[('2881 + 28102｜9 月测款分析', 24, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.3, 0.42, 3.43, 0.5, [[('PART 02 · 各款 SKU 分析', 12, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)
# divider
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.5), Inches(12.13), Inches(0.012)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = RGBColor.from_string('E6E0E2'); s.shapes[-1].line.fill.background()
# subtitle（无具体数字）
add_text(0.84, 1.04, 11.89, 0.36, [[('同为 9 月测款、寄样量相近：差在内容转化，不在寄样量', 15, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 2. 三组对比表 ----------
# 2a. 寄样端（左列）
add_label(0.6, 1.62, 5.85, '寄样端')
ji = [
    ['指标', '2881', '28102'],
    ['寄样数量', '30', '55'],
    ['履约达人', '14', '38'],
    ['履约率', '46.67%', '69.09%'],
    ['出单达人', ('8', True, ACC), '1'],
    ['达人出单率', ('57.14%', True, ACC), '2.70%'],
]
add_table(0.6, 1.92, [2.0, 1.9, 1.9], ji)

# 2b. 自然单占比（左列，寄样端下方）
add_label(0.6, 3.78, 5.85, '自然单占比')
ns = [
    ['指标', '2881', '28102'],
    ['自然单占比', '47.22%', '100%'],
    ['月度达人总出单', ('38 单', True, ACC), '3 单'],
]
add_table(0.6, 4.08, [2.0, 1.9, 1.9], ns)

# 2c. 视频端（右列）
add_label(6.73, 1.62, 5.85, '视频端')
vi = [
    ['指标', '2881', '28102'],
    ['视频数量', '17', '36'],
    ['出单视频', ('11', True, ACC), '1'],
    ['视频出单率', ('64.71%', True, ACC), '2.78%'],
    ['总播放量', ('207,698', True, ACC), '7,734'],
    ['总点击次数', ('7,991', True, ACC), '228'],
    ['转化单数', ('72', True, ACC), '1'],
    ['点击率', ('3.85%', True, ACC), '2.95%'],
    ['转化率', ('0.90%', True, ACC), '0.44%'],
]
add_table(6.73, 1.92, [1.85, 2.0, 2.0], vi)

# ---------- 3. 底部分析（精简短句，图上字下） ----------
CARD_H = 2.05; CARD_Y = 5.12
def add_card(x, lines):
    s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(CARD_Y), Inches(5.85), Inches(CARD_H))
    sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD; sh.line.color.rgb = RGBColor.from_string('E6E0E2'); sh.line.width = Pt(0.75)
    s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(CARD_Y+0.12), Inches(0.08), Inches(CARD_H-0.24)).fill.solid()
    s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
    add_text(x+0.22, CARD_Y+0.12, 5.5, CARD_H-0.24, lines, anchor=MSO_ANCHOR.TOP)

add_card(0.6, [
    [('① 量：不是原因', 14, True, ACC), ('：28102 寄样更多（55 > 30）、履约率更高（69.09% > 46.67%）、视频更多（36 > 17），出单却更少（', 13, False, BODY), ('3 vs 38', 13, True, ACC), ('）。', 13, False, BODY)],
    [('差距在', 13, False, BODY), ('质、不在量', 13, True, ACC), ('—— 两款寄样量相近，出单悬殊源于内容转化能力。', 13, False, BODY)],
])
add_card(6.73, [
    [('② 质：内容转化', 14, True, ACC), ('：2881 视频出单率 ', 13, False, BODY), ('64.71%', 13, True, ACC), ('（一推就转化）、点击率 3.85%、转化率 0.90%；28102 视频出单率仅 ', 13, False, BODY), ('2.78%', 13, True, ACC), ('、播放 ', 13, False, BODY), ('7,734', 13, True, ACC), ('（远低于 207,698），素材未跑通、达人不愿带。', 13, False, BODY)],
    [('→ 2881', 13, False, BODY), (' 内容转化已验证、可加投放大', 13, True, ACC), ('；28102 素材 / 信号未跑通，需 ', 13, False, BODY), ('收紧寄样止损', 13, True, ACC), ('、资源腾给新测品。', 13, False, BODY)],
])

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
