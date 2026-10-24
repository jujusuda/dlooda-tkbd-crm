# -*- coding: utf-8 -*-
"""Restructure 复投分析 page (slide 17 / idx16 in 付费合作开拓_v1.pptx) per user spec.
Style unified with P14/P15 艳粉 theme."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

SRC = r'C:\Users\LENOVO\Desktop\8月余慧玲8月月度汇报_付费合作开拓_v1.pptx'
OUT = r'C:\Users\LENOVO\Desktop\8月余慧玲8月月度汇报_复投改_v1.pptx'

p = Presentation(SRC)

MAIN      = RGBColor.from_string('C94F82')
CARD_BG   = RGBColor.from_string('FCEAF1')
BODY      = RGBColor.from_string('4A3D42')
WHITE     = RGBColor.from_string('FFFFFF')
GRAY      = RGBColor.from_string('7A6A70')
RED       = RGBColor.from_string('E54C4C')
YELLOW    = RGBColor.from_string('E0A83C')
GREEN     = RGBColor.from_string('4CAF50')
LINE_SOFT = RGBColor.from_string('F5A0BC')

s = p.slides[16]  # 复投分析

# ---- clear ----
for sh in list(s.shapes):
    sh._element.getparent().remove(sh._element)

# ---- helpers ----
def rect(slide, l, t, w, h, fill=None, line=None, lw=0, rounded=False):
    st = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    sh = slide.shapes.add_shape(st, Inches(l), Inches(t), Inches(w), Inches(h))
    if fill:
        sh.fill.solid(); sh.fill.fore_color.rgb = fill
    else:
        sh.fill.background()
    if line:
        sh.line.color.rgb = line; sh.line.width = Pt(lw)
    else:
        sh.line.fill.background()
    return sh

def tb(slide, l, t, w, h, runs, bold=False, color=BODY, size=10, align=PP_ALIGN.LEFT,
       anchor=MSO_ANCHOR.TOP, fontname='微软雅黑'):
    sh = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = sh.text_frame; tf.word_wrap = True
    tf.paragraphs[0].alignment = align
    for i, r in enumerate(runs):
        pa = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        pa.alignment = align
        if isinstance(r, dict):
            txt = r.get('t', ''); sz = r.get('s', size); c = r.get('c', color)
            b = r.get('b', bold); al = r.get('a', align)
            pa.alignment = al
        else:
            txt = r; sz = size; c = color; b = bold
        run = pa.add_run(); run.text = txt
        run.font.size = Pt(sz); run.font.bold = b
        run.font.color.rgb = c if isinstance(c, RGBColor) else RGBColor.from_string(c)
        run.font.name = fontname
    try: tf.anchor = anchor
    except: pass
    return sh

def table(slide, l, t, w, col_widths, rows, fsize=8.5, rowh=0.36, headh=0.32,
          head_fill=MAIN, head_text=WHITE, alt_fill=CARD_BG, aligns=None):
    nrows = len(rows); ncols = len(col_widths)
    tbl_sh = slide.shapes.add_table(nrows, ncols, Inches(l), Inches(t),
                                    Inches(w), Inches(rowh*nrows + headh))
    tbl = tbl_sh.table
    for ci, cw in enumerate(col_widths):
        tbl.columns[ci].width = Inches(cw)
    for ri, row_data in enumerate(rows):
        for ci, cell_val in enumerate(row_data):
            cell = tbl.cell(ri, ci)
            if isinstance(cell_val, dict):
                txt = cell_val.get('t', ''); c = cell_val.get('c', BODY); b = cell_val.get('b', False)
            else:
                txt = str(cell_val); c = BODY; b = False
            cell.text = txt
            for pa in cell.text_frame.paragraphs:
                pa.font.size = Pt(fsize); pa.font.name = '微软雅黑'
                pa.font.color.rgb = c if isinstance(c, RGBColor) else RGBColor.from_string(c)
                pa.font.bold = b
                pa.alignment = (aligns[ci] if aligns else PP_ALIGN.CENTER)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            if ri == 0:
                cell.fill.solid(); cell.fill.fore_color.rgb = head_fill
            elif ri % 2 == 0 and alt_fill:
                cell.fill.solid(); cell.fill.fore_color.rgb = alt_fill
            else:
                cell.fill.background()
    return tbl_sh

# ============================================================
PAGE_W = 13.333
TITLE_H = 0.95
ML = 0.45
USABLE = PAGE_W - 2*ML   # 12.43

# 1) Title bar
rect(s, 0, 0, PAGE_W, TITLE_H, fill=MAIN)
tb(s, 0.35, 0.12, 11, 0.45, [{'t': '复投分析', 's': 22, 'b': True, 'c': WHITE}], size=22)
rect(s, 12.0, 0.27, 1.0, 0.42, fill=CARD_BG)
tb(s, 12.0, 0.29, 1.0, 0.38, [{'t': 'Part 04', 's': 10, 'b': True, 'c': MAIN}], size=10, align=PP_ALIGN.CENTER)

# 2) 核心总览 banner
ban_y = 1.05; ban_h = 0.62
rect(s, ML, ban_y, USABLE, ban_h, fill=CARD_BG, line=LINE_SOFT, lw=1.0, rounded=True)
tb(s, ML+0.18, ban_y+0.04, USABLE-0.36, ban_h-0.08,
   [{'t': '核心总览：', 's': 9.5, 'b': True, 'c': MAIN},
    {'t': '整体复投转化效率偏低，经典款复投成功率显著优于新款；核心痛点为复投后跟进链路缺失，超 8 成达人无响应，复投价值未充分释放。',
     's': 9.5, 'c': BODY}],
   size=9.5, anchor=MSO_ANCHOR.MIDDLE)

# 3) Middle row: 3 columns
ROW_T = 1.85
ROW_H = 3.15
GAP = 0.25
LW = 5.20                       # left (6-col table)
MW = 3.15                       # middle (diagnosis)
RW = USABLE - LW - MW - 2*GAP   # right
LX = ML
MX = LX + LW + GAP
RX = MX + MW + GAP

# ---- 3a 左：不同 SKU 复投效果 ----
tb(s, LX, ROW_T-0.07, LW, 0.26, [{'t': '① 不同 SKU 复投效果', 's': 11, 'b': True, 'c': MAIN}], size=11, bold=True)
left_rows = [
    ['SKU', '复投达人', '成功', '未成功', '观察中', '成功率'],
    ['2178', '67', '6', '46', '15', {'t': '12%', 'c': GREEN, 'b': True}],
    ['2190', '50', '3', '33', '14', {'t': '8%', 'c': GREEN, 'b': True}],
    ['2189', '35', '1', '24', '10', {'t': '4%', 'c': YELLOW, 'b': True}],
    ['2722', '15', '0', '12', '3', {'t': '0%', 'c': RED, 'b': True}],
    ['28173','12', '0', '9', '3', {'t': '0%', 'c': RED, 'b': True}],
    ['2789', '18', '0', '14', '4', {'t': '0%', 'c': RED, 'b': True}],
]
table(s, LX, ROW_T+0.22, LW,
      [0.82, 0.95, 0.73, 0.90, 0.70, 1.10],
      left_rows, fsize=8, rowh=0.28, headh=0.30)
tb(s, LX, 4.45, LW, 0.45,
   [{'t': '▷ 经典款 2178、2190 复投模型已跑通，成功率 8%-12%；新款及尾部 SKU 暂未产出复投订单。',
     's': 8, 'c': GRAY}], size=8)

# ---- 3b 中：核心问题诊断 ----
rect(s, MX, ROW_T, MW, ROW_H, fill=CARD_BG, line=LINE_SOFT, lw=1.0, rounded=True)
rect(s, MX, ROW_T, MW, 0.36, fill=MAIN, rounded=True)  # header strip
tb(s, MX+0.12, ROW_T+0.03, MW-0.2, 0.30, [{'t': '核心问题诊断', 's': 11, 'b': True, 'c': WHITE}], size=11, bold=True)
tb(s, MX+0.15, ROW_T+0.50, MW-0.30, ROW_H-0.60,
   [{'t': '行业普通复投成功率普遍在 0%-12% 区间，并非复投模式无效，核心问题是', 's': 9, 'c': BODY},
    {'t': '「复投了但没跟到位」', 's': 9, 'b': True, 'c': MAIN},
    {'t': '：复投发出后缺乏持续、分层的跟进动作，导致达人触达率低、转化链路断裂。', 's': 9, 'c': BODY}],
   size=9, anchor=MSO_ANCHOR.TOP)

# ---- 3c 右：同款追加复投效果 ----
tb(s, RX, ROW_T-0.07, RW, 0.26, [{'t': '② 同款追加复投效果', 's': 11, 'b': True, 'c': MAIN}], size=11, bold=True)
right_rows = [
    ['跟进结果', '人数', '占比'],
    [{'t': '成功', 'c': GREEN, 'b': True}, '18', '8.7%'],
    [{'t': '失败', 'c': YELLOW, 'b': True}, '19', '9.2%'],
    [{'t': '未回复', 'c': RED, 'b': True}, '169', '82.0%'],
]
table(s, RX, ROW_T+0.22, RW, [1.45, 1.06, 1.06],
      right_rows, fsize=9, rowh=0.42, headh=0.34)
tb(s, RX, 4.15, RW, 0.70,
   [{'t': '▷ 同款复投整体有效响应率仅 17.9%，超 8 成达人无反馈，跟进转化仍有提升空间。',
     's': 8, 'c': GRAY}], size=8)

# 4) Bottom: 落点策略 (light pink rounded box, full width)
strat_y = 5.15; strat_h = 1.80
rect(s, ML, strat_y, USABLE, strat_h, fill=CARD_BG, line=LINE_SOFT, lw=1.0, rounded=True)
tb(s, ML+0.2, strat_y+0.08, USABLE-0.4, 0.32, [{'t': '落点策略', 's': 12, 'b': True, 'c': MAIN}], size=12, bold=True)
STRAT = [
    ('① 建立分层跟进 SOP：', '按 SKU 价值、达人历史出单潜力分级跟进，爆款高潜达人提高触达频次，尾部 SKU 控制复投投入节奏'),
    ('② 优化复投沟通话术：', '针对不同复投场景定制话术，突出追加合作的权益与增量价值，提升达人回复意愿'),
    ('③ 聚焦核心 SKU 放量：', '优先在 2178、2190 等已验证成功的 SKU 放大复投规模，新款暂缓批量复投'),
]
for i, (lead, desc) in enumerate(STRAT):
    y = strat_y + 0.46 + i*0.42
    tb(s, ML+0.25, y, USABLE-0.5, 0.40,
       [{'t': lead, 's': 9.5, 'b': True, 'c': MAIN}, {'t': desc, 's': 9, 'c': BODY}],
       size=9)

# 5) footer (preserve original page number)
tb(s, 12.6, 7.05, 0.5, 0.3, [{'t': '18', 's': 9, 'c': GRAY}], size=9, color=GRAY, align=PP_ALIGN.RIGHT)

p.save(OUT)
print('SAVED:', OUT)
print('Slide 17 (idx16) rebuilt: 复投分析')
