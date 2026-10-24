# -*- coding: utf-8 -*-
"""2L06 测款页整改：基于 v9_9，仅改第 12 页（slide idx 11）。
- 标题改「2L06｜对标去年爆款 2722，明年春夏备大货」；副标题中性
- 上部 4 张亮点卡（月度出单 74 单 / 转化率 1.14% / 视频出单率 30.00% / 自然单占比 66%）
- 对标 2722 对比表（15 指标，2L06 占优项加粗 + 玫红 #B06579）
- 底部精简对比分析 + 策略 ①②③
产物 Desktop/余慧玲9月月度汇报_v9_10.pptx
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

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_9.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_10.pptx'

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
        p.space_after = Pt(4); p.space_before = Pt(0)
        for (t, sz, b, col) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = b; r.font.name = FONT
            r.font.color.rgb = col
    return tb

def style_cell(cell, text, size, bold, color, fill):
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    cell.margin_left = Inches(0.05); cell.margin_right = Inches(0.05)
    cell.margin_top = Inches(0.005); cell.margin_bottom = Inches(0.005)
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

# ---------- 2. 上部 4 张亮点卡 ----------
cards = [
    ('74 单', '月度出单（测品最多）'),
    ('1.14%', '转化率（测品最高）'),
    ('30.00%', '视频出单率（内容侧健康）'),
    ('66%', '自然单占比（自然承接稳）'),
]
cw = 2.9; gap = 0.18; cx0 = 0.6; cy = 1.62; ch = 0.96
for i, (big, lab) in enumerate(cards):
    x = cx0 + i*(cw+gap)
    s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(cy), Inches(cw), Inches(ch))
    sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
    sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
    s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(cy+0.12), Inches(0.08), Inches(ch-0.24)).fill.solid()
    s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
    add_text(x+0.18, cy+0.12, cw-0.3, 0.5, [[(big, 26, True, ACC)]], anchor=MSO_ANCHOR.MIDDLE)
    add_text(x+0.18, cy+0.6, cw-0.3, 0.3, [[(lab, 12.5, False, BODY)]], anchor=MSO_ANCHOR.MIDDLE)

# ---------- 3. 对标 2722 对比表 ----------
cmp_header = ['指标', '2L06（今年 9 月）', '2722（去年 9 月・爆款）']
# row: (name, v_2l06, v_2722) ; bold_2l06 = 2L06 占优
cmp_rows = [
    ('寄样数量', '50', '33', True),
    ('履约达人', '44', '27', True),
    ('履约率', '88.00%', '81.82%', True),
    ('出单达人', '14', '12', True),
    ('达人出单率', '31.82%', '44.44%', False),
    ('视频数量', '30', '37', False),
    ('出单视频', '9', '12', False),
    ('视频出单率', '30.00%', '32.43%', False),
    ('总播放量', '63,264', '116,929', False),
    ('总点击次数', '1,755', '2,297', False),
    ('转化单数', '20', '36', False),
    ('点击率', '2.77%', '1.96%', True),
    ('转化率', '1.14%', '1.57%', False),
    ('自然单占比', '66.00%', '62.80%', True),
    ('月度达人总出单', '74 单', '35 单', True),
]
all_rows = [cmp_header] + [[r[0], r[1], r[2]] for r in cmp_rows]
col_w = [3.0, 4.565, 4.565]
gf = s.shapes.add_table(len(all_rows), 3, Inches(0.6), Inches(2.72), Inches(12.13), Inches(0.3+0.228*len(cmp_rows)))
tb = gf.table
for i, w in enumerate(col_w):
    tb.columns[i].width = Inches(w)
for ri, row in enumerate(all_rows):
    tb.rows[ri].height = Inches(0.30 if ri == 0 else 0.228)
    for ci, cell in enumerate(row):
        if ri == 0:
            style_cell(tb.cell(ri, ci), cell, 13, True, INK, HDR)
        else:
            bold_2l06 = cmp_rows[ri-1][3]
            if ci == 1 and bold_2l06:
                style_cell(tb.cell(ri, ci), cell, 13, True, ACC, WHITE if ri % 2 == 1 else ZEB)
            else:
                col = ACC if (ci == 1 and bold_2l06) else BODY
                fill = WHITE if ri % 2 == 1 else ZEB
                style_cell(tb.cell(ri, ci), cell, 13, (ci == 1 and bold_2l06), col, fill)

# ---------- 4. 底部对比分析 + 策略 ----------
BY = 6.55; BH = 0.78
s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(BY), Inches(12.13), Inches(BH))
sh = s.shapes[-1]; sh.fill.solid(); sh.fill.fore_color.rgb = CARD
sh.line.color.rgb = LINE; sh.line.width = Pt(0.75)
s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(BY+0.1), Inches(0.08), Inches(BH-0.2)).fill.solid()
s.shapes[-1].fill.fore_color.rgb = ACC; s.shapes[-1].line.fill.background()
add_text(0.82, BY+0.08, 11.7, BH-0.16, [
    [('对比：', 13, True, ACC), ('月度出单 74 单是 2722（35 单）的两倍多；履约率（88% > 81.82%）、自然单占比（66% > 62.8%）、点击率（2.77% > 1.96%）均高于 2722；视频出单率相近（30% vs 32.4%，都健康）、转化率略低（1.14% vs 1.57%）但出单量更大。', 12.5, False, BODY)],
    [('收尾：', 13, True, ACC), ('2722 当年测款即春夏爆款 → 2L06 表现相当 / 更优，明年春夏可放心放大货。', 12.5, False, BODY), ('　策略 ① 本季养款、不冲量 ② 健康数据沉淀验证 ③ 明年春夏放大货（对标 2722 已验证）', 12.5, True, ACC)],
], anchor=MSO_ANCHOR.MIDDLE)

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
