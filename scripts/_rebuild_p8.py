# -*- coding: utf-8 -*-
"""P8（9 月各款全景）整改：基于 v9_3（已含 P5 修复），仅改第 8 页（slide idx 7）。
- 顶部水话 -> 整体结论（总）
- 表格：老品 达人出单率/月度出单 两列补环比（绿正红负）；测品履约率补真实值；表头加注
- 口径说明删「测品不统计履约率」句
产物 Desktop/余慧玲9月月度汇报_v9_4.pptx
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

INK   = RGBColor.from_string('1F1F1F')
BODY  = RGBColor.from_string('3D3D3D')
MUTE  = RGBColor.from_string('9A9A9A')
ACC   = RGBColor.from_string('B06579')   # 玫红强调
GREEN = RGBColor.from_string('3FA86A')   # 浅绿（正）
RED   = RGBColor.from_string('D9534F')   # 浅红（负）
FONT  = '微软雅黑'

SRC = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_3.pptx'
OUT = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_4.pptx'

prs = Presentation(SRC)
s = prs.slides[7]

# ---------- 1. 顶部水话 -> 整体结论（总） ----------
for sh in s.shapes:
    if sh.has_text_frame and sh.text_frame.text.startswith('每个 SKU'):
        tf = sh.text_frame
        tf.word_wrap = True
        sh.top = Inches(1.16); sh.height = Inches(0.44); sh.width = Inches(11.89); sh.left = Inches(0.84)
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT
        # 清除原有 runs
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        parts = [
            ('老品贡献订单基本盘（四款合计 ', 14, False, BODY),
            ('6,029', 14, True, ACC),
            ('），测品待验证；本月新增寄样 ', 14, False, BODY),
            ('441', 14, True, ACC),
            (' 件向爆品集中（爆品 232｜测品 104｜撤退 46）', 14, False, BODY),
        ]
        for (t, sz, b, col) in parts:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = b; r.font.color.rgb = col; r.font.name = FONT
        print('replaced water-talk -> conclusion')
        break

# ---------- 2. 表格修改 ----------
tb = None
for sh in s.shapes:
    if sh.has_table:
        tb = sh.table; break

def center_all(cell):
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    for p in cell.text_frame.paragraphs:
        p.alignment = PP_ALIGN.CENTER

def set_run(cell, text, size=13, bold=True, color=None):
    tf = cell.text_frame
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = FONT
    if color is not None:
        r.font.color.rgb = color
    return r

def add_delta(cell, text, color):
    tf = cell.text_frame
    p = tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.size = Pt(11); r.font.bold = False; r.font.color.rgb = color; r.font.name = FONT

# 2a. 表头加注（用 \n 保持原主题色样式）
hdr5 = tb.cell(0,5); hdr5.text_frame.paragraphs[0].runs[0].text = '达人出单率\n（环比 pp）'
hdr6 = tb.cell(0,6); hdr6.text_frame.paragraphs[0].runs[0].text = '月度出单\n（环比 %）'
# 增大表头行高以容纳两行
tb.rows[0].height = Inches(0.44)
for ri in range(1, len(tb.rows)):
    tb.rows[ri].height = Inches(0.337)

# 2b. 老品四款（R1-R4）补环比
old = {
    1: ('+28.2pp', GREEN, '+54.0%', GREEN),
    2: ('+8.2pp',  GREEN, '-27.2%', RED),
    3: ('+8.3pp',  GREEN, '+38.2%', GREEN),
    4: ('-2.2pp',  RED,   '-10.1%', RED),
}
for ri, (d5, c5, d6, c6) in old.items():
    center_all(tb.cell(ri,5)); add_delta(tb.cell(ri,5), d5, c5)
    center_all(tb.cell(ri,6)); add_delta(tb.cell(ri,6), d6, c6)

# 2c. 测品三款（R5-R7）履约率补真实值；环比列标「—」
test_fill = {5: '46.67%', 6: '88.00%', 7: '69.09%'}
for ri in (5,6,7):
    cell = tb.cell(ri,4)
    set_run(cell, test_fill[ri], size=13, bold=True, color=INK)
    center_all(tb.cell(ri,5)); add_delta(tb.cell(ri,5), '—', MUTE)
    center_all(tb.cell(ri,6)); add_delta(tb.cell(ri,6), '—', MUTE)

# ---------- 3. 口径说明删「测品不统计履约率」句 ----------
for sh in s.shapes:
    if sh.has_text_frame and sh.text_frame.text.startswith('口径说明'):
        tf = sh.text_frame
        new = ('口径说明：表格「寄样」列 = 寄样端口径（与该 SKU 履约 / 出单率配套）；'
               '上方 441 件 = 9 月新增寄样记录口径。两者统计方式不同，不可互比或相加。')
        for p in tf.paragraphs:
            for r in list(p.runs):
                r._r.getparent().remove(r._r)
        r = tf.paragraphs[0].add_run(); r.text = new
        r.font.size = Pt(12); r.font.bold = False; r.font.color.rgb = MUTE; r.font.name = FONT
        print('trimmed 口径说明')
        break

prs.save(OUT)
print('SAVED:', OUT, 'slides:', len(prs.slides._sldIdLst))
