# -*- coding: utf-8 -*-
"""2L06 测款页整改 v3：基于 v9_10，仅改第 12 页（slide idx 11）。
本次：恢复寄样端+视频端全数据，分三块紧凑呈现（表格 10-12pt）；
指标卡缩小一行；底部文字压缩。输出 v9_11。
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
CARD  = RGBColor.from_string('F7F4F5')
HDR   = RGBColor.from_string('EFE7EA')
ZEB   = RGBColor.from_string('FAF7F8')
LINE  = RGBColor.from_string('E6E0E2')

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_10.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_11.pptx'

prs = Presentation(SRC)
s = prs.slides[11]

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
add_text(0.84, 0.28, 11.9, 0.66, [[('2L06｜对标去年爆款 2722，明年春夏备大货', 24, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
add_text(9.3, 0.42, 3.43, 0.5, [[('PART 02 · 各款 SKU 分析', 12, False, MUTE)]], anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.5), Inches(12.13), Inches(0.012)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = LINE; s.shapes[-1].line.fill.background()
add_text(0.84, 1.04, 11.89, 0.36, [[('同为 9 月测款：表现与去年春夏爆款 2722 相当 / 更优，可放大货', 15, False, GRAY_D)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 2. 上部 4 张亮点卡（缩小一行） ----------
cards = [
    ('74 单', '月度出单（测品最多）'),
    ('1.14%', '转化率（测品最高）'),
    ('30.00%', '视频出单率（内容侧健康）'),
    ('66%', '自然单占比（自然承接稳）'),
]
cw = 2.88; gap = 0.17; cx0 = 0.6; cy = 1.62; ch = 0.68
for i, (big, lab) in enumerate(cards):
    x = cx0 + i*(cw+gap)
    s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(cy), Inches(cw), Inches(ch))
    sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
    sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
    s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(cy+0.12), Inches(0.08), Inches(ch-0.24)).fill.solid()
    s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
    add_text(x+0.18, cy+0.10, cw-0.3, 0.4, [[(big, 22, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
    add_text(x+0.18, cy+0.46, cw-0.3, 0.2, [[(lab, 11.5, False, BODY)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 3. 对标 2722 对比表（分三块，全数据，紧凑） ----------
def build_block(x, y, w, col_w, label, rows):
    # label
    add_text(x, y-0.30, w, 0.26, [[(label, 12.5, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
    all_rows = [['指标', '2L06', '2722']] + [[r[0], r[1], r[2]] for r in rows]
    n = len(all_rows)
    gf = s.shapes.add_table(n, 3, Inches(x), Inches(y), Inches(w), Inches(0.28 + 0.255*(n-1)))
    tb = gf.table
    for i, cw_i in enumerate(col_w):
        tb.columns[i].width = Inches(cw_i)
    for ri, row in enumerate(all_rows):
        tb.rows[ri].height = Inches(0.28 if ri == 0 else 0.255)
        for ci, cell in enumerate(row):
            if ri == 0:
                style_cell(tb.cell(ri, ci), cell, 11, True, INK, HDR)
            else:
                bold1 = rows[ri-1][3]
                if ci == 1 and bold1:
                    style_cell(tb.cell(ri, ci), cell, 11, True, ACC, WHITE if ri % 2 == 1 else ZEB)
                else:
                    col = ACC if (ci == 1 and bold1) else BODY
                    fill = WHITE if ri % 2 == 1 else ZEB
                    style_cell(tb.cell(ri, ci), cell, 11, (ci == 1 and bold1), col, fill)

BY = 2.70
# 寄样端（5 行）
build_block(0.6, BY, 3.7, [1.4, 1.15, 1.15],
    '寄样端　2L06（今年9月）vs 2722（去年9月・爆款）', [
    ('寄样数量', '50', '33', True),
    ('履约达人', '44', '27', True),
    ('履约率', '88.00%', '81.82%', True),
    ('出单达人', '14', '12', True),
    ('达人出单率', '31.82%', '44.44%', False),
])
# 视频端（8 行）
build_block(4.45, BY, 4.85, [1.9, 1.475, 1.475],
    '视频端', [
    ('视频数量', '30', '37', False),
    ('出单视频', '9', '12', False),
    ('视频出单率', '30.00%', '32.43%', False),
    ('总播放量', '63,264', '116,929', False),
    ('总点击次数', '1,755', '2,297', False),
    ('转化单数', '20', '36', False),
    ('点击率', '2.77%', '1.96%', True),
    ('转化率', '1.14%', '1.57%', False),
])
# 自然单 / 出单（2 行）
build_block(9.45, BY, 3.28, [1.28, 1.0, 1.0],
    '自然单 / 出单', [
    ('自然单占比', '66.00%', '62.80%', True),
    ('月度达人总出单', '74 单', '35 单', True),
])

# ---------- 4. 底部对比分析 + 收尾策略（压缩、不溢出） ----------
TBY = 5.20; TBH = 1.85
s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(TBY), Inches(12.13), Inches(TBH))
sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(TBY+0.12), Inches(0.08), Inches(TBH-0.24)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.82, TBY+0.10, 11.7, TBH-0.2, [
    [('对比分析：', 12.5, True, ACC),
     ('月度出单 74 单是 2722（35 单）的两倍多；履约率（88% > 81.82%）、自然单占比（66% > 62.8%）、点击率（2.77% > 1.96%）均更高；视频出单率相近（30% vs 32.4%、都健康）、转化率略低（1.14% vs 1.57%）但出单量更大。', 12.5, False, BODY)],
    [('收尾 / 策略：', 12.5, True, ACC),
     ('2722 当年测款即春夏爆款 → 2L06 表现相当 / 更优，明年春夏可放心放大货。', 12.5, False, BODY),
     ('　① 本季养款不冲量　② 沉淀验证　③ 明年春夏放大货（对标 2722 已验证）', 12.5, True, ACC)],
], anchor=MSO_ANCHOR.MIDDLE)

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
