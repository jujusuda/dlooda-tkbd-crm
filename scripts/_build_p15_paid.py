# -*- coding: utf-8 -*-
"""Build 第15页【付费达人合作开拓进展】, 版式与 P14「达人结构集中度风险分析」完全统一。
插入到重建后的风险页（标题含「达人结构集中度风险分析」）之后。"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.chart import XL_CHART_TYPE
from pptx.chart.data import CategoryChartData

SRC = r'C:\Users\LENOVO\Desktop\8月余慧玲8月月度汇报_第14页达人结构风险_v2.pptx'
OUT = r'C:\Users\LENOVO\Desktop\8月余慧玲8月月度汇报_付费合作开拓_v1.pptx'

p = Presentation(SRC)

# ===== 配色（与 P14 完全一致，原文件艳粉主题）=====
MAIN      = RGBColor.from_string('C94F82')   # 深玫 标题栏/表头/图表强调
CARD_BG   = RGBColor.from_string('FCEAF1')   # 浅粉底 卡片/隔行
BODY      = RGBColor.from_string('4A3D42')   # 正文深色
WHITE     = RGBColor.from_string('FFFFFF')
GRAY      = RGBColor.from_string('7A6A70')   # 辅助灰
RED       = RGBColor.from_string('E54C4C')   # 拒绝
YELLOW    = RGBColor.from_string('E0A83C')   # 已读不回
GREEN     = RGBColor.from_string('4CAF50')   # 有意向 / 正向
CHART_BAR = RGBColor.from_string('C94F82')   # 图表主色
LINE_SOFT = RGBColor.from_string('F5A0BC')   # 边框=亮粉

# ===== 找到重建后的风险页位置 =====
risk_idx = None
for i, s in enumerate(p.slides):
    for sh in s.shapes:
        if sh.has_text_frame and '达人结构集中度风险分析' in sh.text_frame.text:
            risk_idx = i
            break
    if risk_idx is not None:
        break
assert risk_idx is not None, '未找到风险页'

# ===== 新增空白页并插到风险页之后 =====
new_slide = p.slides.add_slide(p.slide_layouts[6])
for sh in list(new_slide.shapes):
    sh._element.getparent().remove(sh._element)
sldIds = p.slides._sldIdLst
last = sldIds[-1]
sldIds.remove(last)
sldIds.insert(risk_idx + 1, last)
s = p.slides[risk_idx + 1]

# ============================================================
# 辅助函数（与 P14 一致）
# ============================================================
def rect(slide, l, t, w, h, fill=None, line=None, lw=0):
    sh = slide.shapes.add_shape(1, Inches(l), Inches(t), Inches(w), Inches(h))
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
    tf = sh.text_frame; tf.word_wrap = True; tf.auto_size = None
    tf.paragraphs[0].alignment = align
    for i, r in enumerate(runs):
        p0 = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p0.alignment = align
        if isinstance(r, dict):
            txt = r.get('t', ''); sz = r.get('s', size); c = r.get('c', color)
            b = r.get('b', bold); al = r.get('a', align)
            p0.alignment = al
        else:
            txt = r; sz = size; c = color; b = bold
        run = p0.add_run(); run.text = txt
        run.font.size = Pt(sz); run.font.bold = b
        run.font.color.rgb = c if isinstance(c, RGBColor) else RGBColor.from_string(c)
        run.font.name = fontname
    try: tf.anchor = anchor
    except: pass
    return sh

def table(slide, l, t, w, col_widths, rows, fsize=9, rowh=0.30, headh=0.34,
          head_fill=MAIN, head_text=WHITE, alt_fill=CARD_BG):
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
                pa.alignment = PP_ALIGN.CENTER
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            if ri == 0:
                cell.fill.solid(); cell.fill.fore_color.rgb = head_fill
            elif ri % 2 == 0 and alt_fill:
                cell.fill.solid(); cell.fill.fore_color.rgb = alt_fill
            else:
                cell.fill.background()
    return tbl_sh

# ============================================================
# 布局参数（与 P14 完全一致）
# ============================================================
PAGE_W = 13.333
PAGE_H = 7.5
TITLE_H = 0.95
LEFT_W = 5.8
RIGHT_W = 7.2
GAP = 0.35
LEFT_L = 0.45
RIGHT_L = LEFT_L + LEFT_W + GAP      # 6.60
RIGHT_TOP_H = 2.6
RIGHT_GAP = 0.2
RIGHT_BOT_H = 2.5
CHART_T = TITLE_H + 0.15             # 1.10
CHART_H = RIGHT_TOP_H + RIGHT_GAP + RIGHT_BOT_H - 0.1  # 5.20

# ============================================================
# 1) 顶部标题栏
# ============================================================
rect(s, 0, 0, PAGE_W, TITLE_H, fill=MAIN)
tb(s, 0.35, 0.12, 11, 0.45,
   [{'t': '付费达人合作开拓进展', 's': 22, 'b': True, 'c': WHITE}],
   size=22, align=PP_ALIGN.LEFT)
# Part 03 标签（右上角，与 P14 一致）
rect(s, 12.0, 0.25, 1.0, 0.42, fill=CARD_BG)
tb(s, 12.0, 0.27, 1.0, 0.38,
   [{'t': 'Part 03', 's': 10, 'b': True, 'c': MAIN}],
   size=10, align=PP_ALIGN.CENTER)
# 导语（仅左侧，避免与右侧内容标题重叠）
tb(s, 0.45, 0.63, 5.6, 0.30,
   [{'t': '核心判断：累计向 45 位达人发送合作邀约，账号触达受限导致消息大量未读、有效响应率偏低；付费合作是破解「达人断层风险」的关键解法。',
     's': 9, 'c': GRAY}],
   size=9, color=GRAY)

# ============================================================
# 2) 左侧：横向条形图 —— 触达分布
# ============================================================
chart_l = LEFT_L
chart_t = CHART_T + 0.35
chart_w = LEFT_W - 0.1
chart_h = CHART_H - 0.55

cats = ['未读消息', '已读不回', '拒绝合作', '有意向可沟通']
vals = [39, 3, 2, 1]
bar_colors = [GRAY, YELLOW, RED, GREEN]   # 未读=灰 / 已读=黄 / 拒绝=红 / 意向=绿

chart_data = CategoryChartData()
chart_data.categories = cats
chart_data.add_series('触达分布', vals)

ch = s.shapes.add_chart(
    XL_CHART_TYPE.BAR_CLUSTERED, Inches(chart_l), Inches(chart_t),
    Inches(chart_w), Inches(chart_h), chart_data
).chart

ch.has_legend = False
ch.has_title = False
try:
    plot = ch.plot_area
    if plot.has_fill: plot.has_fill = False
except Exception:
    pass

series = ch.series[0]
series.format.fill.solid()
series.format.fill.fore_color.rgb = CHART_BAR
# 逐点配色
for i, col in enumerate(bar_colors):
    try:
        pt = series.points[i]
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = col
    except Exception:
        pass

# 数据标签
try:
    plot = ch.plots[0]
    plot.has_data_labels = True
    plot.data_labels.number_format = '0" 人"'
    plot.data_labels.number_format_is_linked = False
    plot.data_labels.font.size = Pt(9)
    plot.data_labels.font.bold = True
    plot.data_labels.font.color.rgb = BODY
    plot.data_labels.position = None
except Exception:
    pass

# 坐标轴
ax = ch.value_axis
ax.has_major_gridlines = True
ax.major_gridlines.format.line.color.rgb = RGBColor.from_string('E0D0D5')
ax.major_gridlines.format.line.width = Pt(0.5)
ax.maximum_scale = 45
ax.minimum_scale = 0
cat_ax = ch.category_axis
cat_ax.tick_labels.font.size = Pt(9)
cat_ax.tick_labels.font.color.rgb = BODY
ax.tick_labels.font.size = Pt(8.5)
ax.tick_labels.font.color.rgb = GRAY

# 图表标题
tb(s, chart_l, CHART_T + 0.02, chart_w, 0.30,
   [{'t': '付费合作邀约 · 触达分布（累计 45 位达人）', 's': 12, 'b': True, 'c': MAIN}],
   size=12, bold=True, color=MAIN)

# 图表解读
tb(s, chart_l, chart_t + chart_h + 0.05, chart_w, 0.45,
   [{'t': '▸ 未读占 86.7%（39/45）是核心卡点，账号触达权重不足；仅 1 位有意向 → 付费合作尚未破零，首单待落地。',
     's': 8.5, 'c': GRAY}],
   size=8.5, color=GRAY)

# ============================================================
# 3) 右上：核心问题（卡片 + 内部表头）
# ============================================================
card_t = CHART_T + 0.02               # 1.12
card_h = RIGHT_TOP_H                  # 2.60
rect(s, RIGHT_L, card_t, RIGHT_W, card_h, fill=CARD_BG, line=LINE_SOFT, lw=1.0)
# 内部表头
rect(s, RIGHT_L, card_t, RIGHT_W, 0.34, fill=MAIN)
tb(s, RIGHT_L + 0.12, card_t + 0.02, RIGHT_W - 0.2, 0.30,
   [{'t': '核心问题（3 项）', 's': 11, 'b': True, 'c': WHITE}],
   size=11, bold=True, color=WHITE)

PROBLEMS = [
    ('① 有效响应率低：', '累计触达 45 位达人，明确回复仅 3 人（占比 6.7%），整体沟通转化效率偏低。'),
    ('② 消息触达受限：', '超 85% 的消息处于未读状态，账号触达权重不足是主要制约因素。'),
    ('③ 合作尚未破零：', '仅 1 位达人表达合作意向，暂未达成正式付费合作，首单落地待推进。'),
]
prob_top = card_t + 0.34 + 0.10
for i, (lead, desc) in enumerate(PROBLEMS):
    y = prob_top + i * 0.70
    tb(s, RIGHT_L + 0.15, y, RIGHT_W - 0.30, 0.66,
       [{'t': lead, 's': 9.5, 'b': True, 'c': MAIN},
        {'t': desc, 's': 8.5, 'c': BODY}],
       size=8.5)

# ============================================================
# 4) 右下：下一步推进动作表格
# ============================================================
strat_t = card_t + RIGHT_TOP_H + RIGHT_GAP - 0.05   # 3.87
strat_rows = [
    ['动作分类', '具体安排'],
    ['发信节奏管控', '每日发信量控制在 5 封左右；持续优化开场话术，突出合作权益，引导达人主动回复'],
    ['存量二次触达', '对已读不回的达人，间隔 3-5 天更换话术轻触达，避免频繁骚扰'],
    ['意向重点突破', '跟进 1 位意向达人，敲定合作细节，推动付费合作首单落地'],
]
table(s, RIGHT_L, strat_t, RIGHT_W,
      [1.55, 5.65],
      strat_rows, fsize=9, rowh=0.38, headh=0.34)
# 表标题（与 P14 一致，放在表格上方间隙）
tb(s, RIGHT_L, strat_t - 0.28, RIGHT_W, 0.26,
   [{'t': '下一步推进动作', 's': 11, 'b': True, 'c': MAIN}],
   size=11, bold=True, color=MAIN)

# ============================================================
# 5) 右下角口径说明框（悬浮，与 P14 一致）
# ============================================================
note_l = RIGHT_L + RIGHT_W - 3.3
note_t = strat_t + 4 * 0.38 + 0.30 + 0.05   # 表头0.34+3行*0.38=1.48 → 3.87+1.48+0.30
note_w = 3.4
note_h = 1.55
rect(s, note_l, note_t, note_w, note_h, fill=CARD_BG, line=LINE_SOFT, lw=1.0)
tb(s, note_l + 0.1, note_t + 0.06, note_w - 0.2, note_h - 0.1,
   [
       {'t': '📋 口径说明', 's': 9, 'b': True, 'c': MAIN},
       {'t': '', 's': 4},
       {'t': '• 触达统计：2026.8 月累计发送付费合作邀约邮件 45 封', 's': 7.5, 'c': BODY},
       {'t': '• 未读：消息未被达人打开；已读不回：已读但无回复', 's': 7.5, 'c': BODY},
       {'t': '• 有意向：表达合作意愿、可沟通，尚未达成正式付费', 's': 7.5, 'c': BODY},
       {'t': '', 's': 3},
       {'t': '⚠️ 不点名达人 ID，只看触达与响应结构', 's': 7.5, 'c': GRAY},
   ],
   size=9)

# ============================================================
# 6) 页码（右下角）
# ============================================================
tb(s, 12.6, 7.15, 0.5, 0.3,
   [{'t': '15', 's': 9, 'c': GRAY}],
   size=9, color=GRAY, align=PP_ALIGN.RIGHT)

p.save(OUT)
print('SAVED:', OUT)
print('Inserted after risk page (slide idx %d -> new slide idx %d)' % (risk_idx, risk_idx + 1))
print('Bar chart:', dict(zip(cats, vals)))
