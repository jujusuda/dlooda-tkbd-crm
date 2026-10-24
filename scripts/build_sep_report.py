# -*- coding: utf-8 -*-
"""
Dlooda 9 月月度汇报 PPT 生成器  —  v5
风格：简约小众 / 留白充足 / 专业 / 零排版错误
叙事逻辑：结论 -> 指标证明 -> 变化 -> 为什么变 -> 最大因素 -> 策略
v5 修订：主视觉数字缩到 36-44pt（每页 1-2 个）；正文 14-16pt；
        重点加粗 + 主强调色；打破每页同构（表格/对照卡/对比表/折线/动作清单错开）；
        达人端重构（素材页新数据、复投占位页→达人建联页）。
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION, XL_TICK_LABEL_POSITION, XL_MARKER_STYLE

# ---------- 配色（柔雾玫瑰 / 简约小众专业风） ----------
WHITE   = RGBColor.from_string('FFFFFF')
INK     = RGBColor.from_string('2A2A2A')   # 标题/主文字
BODY    = RGBColor.from_string('444444')   # 正文
MUTE    = RGBColor.from_string('9A9A9A')   # 注释/辅助
ACCENT  = RGBColor.from_string('C97F95')   # 柔雾玫瑰（图表/装饰）
ACCENT_D = RGBColor.from_string('B06579')  # 柔玫瑰深一档（重点强调/小字，保证对比度）
CARD    = RGBColor.from_string('F9F5F6')   # 极浅暖粉灰卡片底
LINE    = RGBColor.from_string('EAE2E5')   # 浅分隔线
GRAY_D  = RGBColor.from_string('5A5A5A')   # 图表深灰
GRAY_M  = RGBColor.from_string('9A9A9A')   # 图表中灰
GRAY_L  = RGBColor.from_string('D9D9D9')   # 图表浅灰/网格
GREEN   = RGBColor.from_string('5E8C6A')   # 正向
RED     = RGBColor.from_string('C06363')   # 负向
FONT    = '微软雅黑'

# 字号体系（v5 全局规范）
HERO_PT  = 38    # 主视觉数字 36-44
TITLE_PT = 28    # 标题 28-32
SUB_PT   = 16    # 副标题 16-18
BODY_PT  = 14    # 正文 14-16
SMALL_PT = 12    # 卡内小字

# 页面尺寸 16:9
SW, SH = Inches(13.333), Inches(7.5)
MX = 0.6  # 左右页边距（浮点！所有位置参数必须包 Inches()）

prs = Presentation()
prs.slide_width = SW
prs.slide_height = SH
BLANK = prs.slide_layouts[6]

# ---------- 通用 helper ----------
def new_slide():
    return prs.slides.add_slide(BLANK)

def _rect(slide, x, y, w, h, fill, line=None, line_w=None):
    sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line; sp.line.width = line_w or Pt(0.75)
    sp.shadow.inherit = False
    return sp

def _txt(slide, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
         wrap=True, space_after=2, line_spacing=1.08):
    """runs: list of (text, size, bold, color) 或 list of paragraphs(=list of runs)"""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0; tf.margin_right = 0
    tf.margin_top = 0; tf.margin_bottom = 0
    if runs and isinstance(runs[0], tuple):
        paras = [runs]
    else:
        paras = runs
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(space_after)
        p.space_before = Pt(0)
        p.line_spacing = line_spacing
        for (t, sz, b, c) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.bold = b
            r.font.color.rgb = c; r.font.name = FONT
    return tb

def title_bar(slide, title, part_label):
    _rect(slide, Inches(MX), Inches(0.5), Inches(0.09), Inches(0.56), ACCENT)
    _txt(slide, Inches(MX+0.22), Inches(0.45), Inches(9.0), Inches(0.66),
         [[(title, TITLE_PT, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
    if part_label:
        _txt(slide, Inches(9.7), Inches(0.52), Inches(3.03), Inches(0.5),
             [[(part_label, 11, False, MUTE)]], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
    _rect(slide, Inches(MX), Inches(1.18), Inches(12.13), Pt(1), LINE)

def conclusion(slide, text):
    y = Inches(1.34)
    _rect(slide, Inches(MX), y, Inches(12.13), Inches(0.72), CARD)
    _rect(slide, Inches(MX), y, Inches(0.09), Inches(0.72), ACCENT)
    _txt(slide, Inches(MX+0.28), y, Inches(11.65), Inches(0.72),
         [[('结论　', 14, True, ACCENT_D), (text, 14, False, BODY)]],
         anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.05)

def note(slide, text):
    _txt(slide, Inches(MX), Inches(6.12), Inches(12.13), Inches(0.28),
         [[(text, SMALL_PT, False, MUTE)]])

def strategy_bar(slide, lines):
    y = Inches(6.45)
    _rect(slide, Inches(MX), y, Inches(12.13), Inches(0.8), CARD)
    _rect(slide, Inches(MX), y, Inches(0.09), Inches(0.8), ACCENT)
    para = [[('策略　', 13, True, ACCENT_D)]]
    for ln in lines:
        para.append([('· ' + ln, 13, False, BODY)])
    _txt(slide, Inches(MX+0.28), y+Inches(0.05), Inches(11.65), Inches(0.72),
         para, anchor=MSO_ANCHOR.MIDDLE, space_after=1, line_spacing=1.0)

def hero(slide, x, y, w, num, label):
    """主视觉数字（≤44pt，每页 1-2 个）"""
    _txt(slide, x, y, w, Inches(0.62),
         [[(num, HERO_PT, True, ACCENT_D)]], anchor=MSO_ANCHOR.MIDDLE)
    _txt(slide, x, y+Inches(0.62), w, Inches(0.3),
         [[(label, SMALL_PT, False, MUTE)]])

def vcard(slide, x, y, w, h, title, sections):
    """对照卡：左竖线 + 标题 + 若干 (label, text) 小段"""
    _rect(slide, x, y, w, h, CARD)
    _rect(slide, x, y, Inches(0.08), h, ACCENT)
    _txt(slide, x+Inches(0.22), y+Inches(0.12), w-Inches(0.34), Inches(0.34),
         [[(title, SUB_PT, True, ACCENT_D)]])
    yy = y + Inches(0.56)
    for (lab, txt) in sections:
        _txt(slide, x+Inches(0.22), yy, w-Inches(0.34), Inches(0.24),
             [[(lab, 11.5, True, ACCENT_D)]], line_spacing=1.0)
        _txt(slide, x+Inches(0.22), yy+Inches(0.24), w-Inches(0.34), Inches(0.52),
             [[(txt, 12.5, False, BODY)]], line_spacing=1.04)
        yy += Inches(0.78)

def set_cell(cell, text, size=12, bold=False, color=BODY, align=PP_ALIGN.LEFT,
             fill=None, anchor=MSO_ANCHOR.MIDDLE):
    cell.margin_left = Inches(0.07); cell.margin_right = Inches(0.05)
    cell.margin_top = Inches(0.02); cell.margin_bottom = Inches(0.02)
    cell.vertical_anchor = anchor
    tf = cell.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = align
    p.text = ''
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold
    r.font.color.rgb = color; r.font.name = FONT
    if fill is not None:
        cell.fill.solid(); cell.fill.fore_color.rgb = fill
    else:
        cell.fill.solid(); cell.fill.fore_color.rgb = WHITE

def make_table(slide, x, y, w, h, col_w, rows, fsize=12, head_fill=ACCENT_D,
               head_color=WHITE, head_size=12, row_alt=CARD, align_first_left=True):
    nrows = len(rows); ncols = len(rows[0])
    gf = slide.shapes.add_table(nrows, ncols, x, y, w, h)
    tbl = gf.table
    tbl.first_row = False; tbl.horz_banding = False
    for i, cw in enumerate(col_w):
        tbl.columns[i].width = Inches(cw)
    rh = int(h / nrows)
    for ri, row in enumerate(rows):
        tbl.rows[ri].height = rh
        for ci, val in enumerate(row):
            cell = tbl.cell(ri, ci)
            if ri == 0:
                set_cell(cell, val, size=head_size, bold=True, color=head_color,
                         align=PP_ALIGN.CENTER, fill=head_fill)
            else:
                fill = WHITE if (ri % 2 == 1) else row_alt
                al = PP_ALIGN.LEFT if (ci == 0 and align_first_left) else PP_ALIGN.CENTER
                set_cell(cell, val, size=fsize, bold=False, color=BODY, align=al, fill=fill)
    return tbl

def _style_chart(chart, legend=True, legend_pos=XL_LEGEND_POSITION.BOTTOM, fsize=11):
    chart.has_title = False
    if legend:
        chart.has_legend = True
        chart.legend.position = legend_pos
        chart.legend.include_in_layout = False
        chart.legend.font.size = Pt(fsize)
        chart.legend.font.name = FONT
    else:
        chart.has_legend = False
    va = chart.value_axis
    va.has_major_gridlines = True
    va.major_gridlines.format.line.color.rgb = LINE
    va.major_gridlines.format.line.width = Pt(0.5)
    va.tick_labels.font.size = Pt(fsize)
    va.tick_labels.font.name = FONT
    va.tick_labels.font.color.rgb = GRAY_M
    ca = chart.category_axis
    ca.tick_labels.font.size = Pt(fsize)
    ca.tick_labels.font.name = FONT
    ca.tick_labels.font.color.rgb = GRAY_D
    ca.format.line.color.rgb = LINE
    ca.format.line.width = Pt(0.5)

def _series_color(plot, idx, color):
    try:
        plot.series[idx].format.fill.solid()
        plot.series[idx].format.fill.fore_color.rgb = color
        plot.series[idx].format.line.color.rgb = color
    except Exception:
        pass

def bar_chart(slide, x, y, w, h, cats, series, colors, gap=60, label_fmt=None, label_color=INK):
    cd = CategoryChartData()
    cd.categories = cats
    for (nm, vals) in series:
        cd.add_series(nm, vals)
    gf = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, w, h, cd)
    chart = gf.chart
    _style_chart(chart)
    chart.plots[0].gap_width = gap
    plot = chart.plots[0]
    for i, c in enumerate(colors):
        _series_color(plot, i, c)
    if label_fmt:
        plot.has_data_labels = True
        dl = plot.data_labels
        dl.number_format = label_fmt
        dl.number_format_is_linked = False
        dl.position = XL_LABEL_POSITION.OUTSIDE_END
        dl.font.size = Pt(11); dl.font.name = FONT; dl.font.color.rgb = label_color
        dl.font.bold = True
    return chart

def line_chart(slide, x, y, w, h, cats, series, colors, markers=True):
    cd = CategoryChartData()
    cd.categories = cats
    for (nm, vals) in series:
        cd.add_series(nm, vals)
    gf = slide.shapes.add_chart(XL_CHART_TYPE.LINE, x, y, w, h, cd)
    chart = gf.chart
    _style_chart(chart)
    plot = chart.plots[0]
    plot.has_data_labels = False
    for i, c in enumerate(colors):
        ser = plot.series[i]
        ser.format.line.color.rgb = c
        ser.format.line.width = Pt(2.0)
        if markers:
            ser.marker.style = XL_MARKER_STYLE.CIRCLE
            ser.marker.size = 6
            ser.marker.format.fill.solid(); ser.marker.format.fill.fore_color.rgb = c
            ser.marker.format.line.color.rgb = c
    return chart

def donut_chart(slide, x, y, w, h, cats, vals, colors):
    cd = CategoryChartData()
    cd.categories = cats
    cd.add_series('分布', vals)
    gf = slide.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, x, y, w, h, cd)
    chart = gf.chart
    chart.has_title = False
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    chart.legend.include_in_layout = False
    chart.legend.font.size = Pt(11); chart.legend.font.name = FONT
    plot = chart.plots[0]
    plot.has_data_labels = True
    dl = plot.data_labels
    dl.show_percentage = True; dl.show_value = False; dl.show_category_name = False
    dl.number_format = '0.0%'; dl.number_format_is_linked = False
    dl.position = XL_LABEL_POSITION.BEST_FIT if hasattr(XL_LABEL_POSITION, 'BEST_FIT') else XL_LABEL_POSITION.OUTSIDE_END
    dl.font.size = Pt(11); dl.font.name = FONT; dl.font.color.rgb = INK; dl.font.bold = True
    for i, c in enumerate(colors):
        plot.series[0].points[i].format.fill.solid()
        plot.series[0].points[i].format.fill.fore_color.rgb = c
    return chart

# ============================================================
# 封面 / 目录 / 章节页（v5 保留不动）
# ============================================================
def build_cover():
    s = new_slide()
    _rect(s, Inches(0), Inches(0), SW, SH, WHITE)
    _rect(s, Inches(0), Inches(0), Inches(0.35), SH, ACCENT)
    _rect(s, Inches(0.9), Inches(2.5), Inches(2.0), Inches(0.12), ACCENT)
    _txt(s, Inches(0.95), Inches(2.75), Inches(11.0), Inches(1.4),
         [[('Dlooda 9 月月度汇报', 46, True, INK)]], line_spacing=1.05)
    _txt(s, Inches(0.97), Inches(4.15), Inches(11.0), Inches(0.5),
         [[('月度复盘 ｜ TikTok Shop 美国女装 ｜ 汇报人：余慧玲', SUB_PT+2, False, MUTE)]])
    _txt(s, Inches(0.97), Inches(4.75), Inches(11.0), Inches(0.4),
         [[('统计周期：2026.09 ｜ 金额单位：USD', 13, False, MUTE)]])
    _txt(s, Inches(0.97), Inches(6.4), Inches(11.0), Inches(0.5),
         [[('DLOODA  ·  达人增长运营月报', 12, False, ACCENT_D)]])

def build_toc():
    s = new_slide()
    title_bar(s, '目录', None)
    items = [
        ('01', '店铺整体情况', '9 月大盘与季度趋势 ｜ 老品贡献结构'),
        ('02', '各款 SKU 分析', '八款概览 ｜ 老品两组对比 ｜ 测品对比与单品复盘 ｜ 小结'),
        ('03', '达人端', '素材供给 ｜ 达人建联'),
        ('04', '下月行动', '扩量 · 放量 · 测品分流 · 素材供给'),
    ]
    y = Inches(1.7)
    for (no, t, sub) in items:
        _rect(s, MX, y, Inches(12.13), Inches(1.1), CARD)
        _rect(s, MX, y, Inches(0.09), Inches(1.1), ACCENT)
        _txt(s, Inches(MX+0.3), y, Inches(1.2), Inches(1.1),
             [[(no, 40, True, ACCENT_D)]], anchor=MSO_ANCHOR.MIDDLE)
        _txt(s, Inches(MX+1.7), y+Inches(0.18), Inches(10.0), Inches(0.5),
             [[(t, 20, True, INK)]])
        _txt(s, Inches(MX+1.7), y+Inches(0.66), Inches(10.0), Inches(0.4),
             [[(sub, 13, False, MUTE)]])
        y += Inches(1.22)

def build_divider(no, title, subtitle):
    s = new_slide()
    _rect(s, Inches(0), Inches(0), SW, SH, WHITE)
    _rect(s, Inches(0), Inches(0), SW, Inches(2.2), CARD)
    _rect(s, Inches(0), Inches(0), Inches(0.35), SH, ACCENT)
    _txt(s, Inches(0.9), Inches(0.45), Inches(5), Inches(1.5),
         [[(no, 96, True, ACCENT)]], anchor=MSO_ANCHOR.MIDDLE)
    _txt(s, Inches(0.95), Inches(2.7), Inches(11.5), Inches(0.8),
         [[('PART ' + no + '　' + title, 34, True, INK)]])
    _txt(s, Inches(0.97), Inches(3.6), Inches(11.5), Inches(0.5),
         [[(subtitle, 15, False, MUTE)]])

# ============================================================
# P4 ・ 9 月大盘 + 季度趋势（双柱 + 客单价对比块；主视觉数字 ≤40pt）
# ============================================================
def build_p1():
    s = new_slide()
    title_bar(s, '9 月店铺整体表现：单月与季度双双创新高', 'PART 01 · 店铺整体情况')
    conclusion(s, '9 月单月 GMV / 订单创年内新高，且占 Q3 近 37%，是季度增长主引擎。')
    # 主视觉数字（两个，≤40pt）
    hero(s, Inches(MX), Inches(2.05), Inches(3.6), '$157,089.96', '9 月 GMV（环比 +3.35%）')
    hero(s, Inches(MX+3.9), Inches(2.05), Inches(3.6), '7,514 单', '9 月订单（环比 +3.66%）')
    # 双柱：GMV / 订单
    bar_chart(s, Inches(0.6), Inches(3.0), Inches(3.6), Inches(3.0),
              ['Q1', 'Q2', 'Q3'], [('GMV (USD)', [365219.53, 338092.51, 425760.02])],
              [GRAY_D], gap=60, label_fmt='#,##0')
    bar_chart(s, Inches(4.3), Inches(3.0), Inches(3.6), Inches(3.0),
              ['Q1', 'Q2', 'Q3'], [('订单 (单)', [17290, 18108, 20421])],
              [ACCENT], gap=60, label_fmt='0')
    # 客单价对比块 + 关键结论（右侧）
    _rect(s, Inches(8.2), Inches(3.0), Inches(4.53), Inches(3.0), CARD)
    _rect(s, Inches(8.2), Inches(3.0), Inches(0.08), Inches(3.0), ACCENT)
    _txt(s, Inches(8.45), Inches(3.12), Inches(4.1), Inches(0.32),
         [[('指标证明 · 发生了什么', SUB_PT, True, ACCENT_D)]])
    _txt(s, Inches(8.45), Inches(3.5), Inches(4.1), Inches(2.4),
         [[('· Q3 GMV $425,760.02（+25.9% QoQ）、订单 20,421 单（+12.8%）。', 13, False, BODY)],
          [('· Q2 出现「订单增、GMV 降」（订单 +4.7% 但 GMV -7.4%），客单价承压。', 13, False, BODY)],
          [('· ', 13, True, ACCENT_D), ('客单价回升是最大因素', 13, True, ACCENT_D),
           ('：Q2 $18.67 → Q3 $20.85，GMV 增速跑赢订单。', 13, False, BODY)]],
         space_after=6, line_spacing=1.1)
    _txt(s, Inches(8.45), Inches(5.55), Inches(4.1), Inches(0.4),
         [[('9 月单月占 Q3 约 36.9%（≈37%），为季度主引擎。', 12, False, MUTE)]])
    strategy_bar(s, ['9 月已验证「量价齐升」路径，10 月延续爆品扩量 + 控价策略，巩固 Q4 开局。'])
    note(s, '口径注：GMV = 支付金额总和；订单 = 下单件数总和；9 月按创建时间筛选。')

# ============================================================
# P5 ・ 老品贡献（折线 4 线 + 四款并列竖卡）
# ============================================================
def build_p2():
    s = new_slide()
    title_bar(s, '9 月老品贡献：2190 是增长主引擎', 'PART 01 · 店铺整体情况')
    conclusion(s, '四款老品贡献大盘主力，2190 一枝独秀（月度出单最多且连涨），其余靠存量支撑。')
    line_chart(s, Inches(0.6), Inches(2.15), Inches(12.13), Inches(2.55),
               ['7月', '8月', '9月'],
               [('2190', [1696, 1872, 2883]),
                ('2178', [1455, 1904, 1386]),
                ('2189', [176, 723, 999]),
                ('28173', [321, 846, 761])],
               [ACCENT, GRAY_D, GREEN, GRAY_M])
    # 四款并列竖卡
    cards = [
        ('2190', [('月度出单', '2,883（最多）'), ('自然单', '79.85%'), ('趋势', '连续三月走高 1696→2883')]),
        ('2189', [('月度出单', '999（+38%）'), ('视频出单率', '27.85%（老品最高）'), ('趋势', '持续上升')]),
        ('2178', [('月度出单', '1,386'), ('出单率', '回升至 17.95%'), ('趋势', '8 月冲高后 9 月回落')]),
        ('28173', [('月度出单', '761'), ('达人出单率', '31.58% 稳定'), ('趋势', '8 月峰值后回落')]),
    ]
    cw = Inches(2.95); gap = Inches(0.13); x = Inches(0.6); y = Inches(4.95)
    for (t, secs) in cards:
        vcard(s, x, y, cw, Inches(1.45), t, secs)
        x = Inches(x.inches + 2.95 + 0.13)
    _txt(s, Inches(0.6), Inches(6.5), Inches(12.13), Inches(0.3),
         [[('自然单占比（不依赖付费投放）：2190 79.85% ｜ 2178 78.00% ｜ 2189 71.35% ｜ 28173 76.85%',
            11.5, False, MUTE)]])
    strategy_bar(s, ['2190 保持精选扩量；2178 / 28173 回落款靠存量维稳；2189 上升款适度加供给。'])

# ============================================================
# P7 ・ 八款概览（表格 + 月度出单排行柱状；保持）
# ============================================================
def build_p3():
    s = new_slide()
    title_bar(s, '9 月各款概览：结构分化，测品两极', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '老品「少寄优寄」精选打法被验证有效；测品两极分化——2881 胜出，28102 / 2A08 出清。')
    rows = [
        ['SKU', '类型', '寄样', '履约', '达人出单率', '月度出单', '自然单', '结论'],
        ['2190', '老品', '33', '28', '35.71%', '2,883', '79.85%', '增长主引擎'],
        ['2178', '老品', '46', '39', '17.95%', '1,386', '78.00%', '出单率回升'],
        ['2189', '老品', '52', '46', '31.11%', '999', '71.35%', '上升补量'],
        ['28173', '老品', '95', '77', '31.58%', '761', '76.85%', '达人欢迎放量'],
        ['2881', '测品', '30', '14', '57.14%', '38', '47.22%', '加投盯履约'],
        ['2L06', '备货', '50', '44', '31.82%', '74', '66.00%', '明年春夏款'],
        ['28102', '测品', '55', '38', '2.70%', '3', '100%', '出清'],
        ['2A08', '测品', '57', '38', '0.00%', '0', '-', '止损'],
    ]
    col_w = [0.95, 0.78, 0.7, 0.7, 1.15, 1.05, 0.95, 1.55]
    make_table(s, Inches(0.6), Inches(2.25), Inches(7.85), Inches(3.6),
               col_w, rows, fsize=12, head_size=12, row_alt=CARD)
    bar_chart(s, Inches(8.65), Inches(2.4), Inches(4.08), Inches(3.3),
              ['2190', '2178', '2189', '28173', '2L06', '2881', '28102', '2A08'],
              [('月度出单', [2883, 1386, 999, 761, 74, 38, 3, 0])],
              [ACCENT], gap=40, label_fmt='0')
    _txt(s, Inches(8.65), Inches(5.75), Inches(4.08), Inches(0.4),
         [[('月度出单排行（老品包揽前四，测品普遍偏小）', 11.5, False, MUTE)]])
    strategy_bar(s, ['资源向高产出老品集中；测品按「2881 加投 / 28102·2A08 出清 / 2L06 备货」分流。'])

# ============================================================
# P8 ・ 2178 + 2190（左右对照卡 + 中间柱状图）
# ============================================================
def build_p4():
    s = new_slide()
    title_bar(s, '少寄优寄：精选打法验证有效', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '同为少寄优寄，9 月达人出单率双双向好；2190 用最少寄样做出最优出单率 + 最多订单。')
    vcard(s, Inches(0.6), Inches(2.2), Inches(3.75), Inches(3.95), '2190',
          [('数据', '寄样 33 / 履约 28 / 出单率 35.71% / 视频 23.36% / 月度 2,883（+54%）'),
           ('变化', '9 月达人出单率双向好，以最少寄样换最高出单率 + 最多订单'),
           ('原因', '少寄、精选、优寄打法验证有效'),
           ('最大因素', '达人出单意愿强，质量已修复'),
           ('策略', '保住出单率前提下适度扩达人数 / 寄样')])
    bar_chart(s, Inches(4.5), Inches(2.4), Inches(4.2), Inches(3.5),
              ['2190', '2178'],
              [('寄样量', [33, 46]),
               ('达人出单率(%)', [35.71, 17.95])],
              [GRAY_D, ACCENT], gap=90, label_fmt='0.0')
    vcard(s, Inches(8.85), Inches(2.2), Inches(3.88), Inches(3.95), '2178',
          [('数据', '寄样 46 / 出单率 17.95%（自 8 月 9.80% 回升）/ 视频 21.95% / 月度 1,386（-27%）'),
           ('变化', '出单率回升，但月度出单仍低于 8 月'),
           ('原因', '量未跟上出单率回升，并非质量缺口'),
           ('最大因素', '供给不足（寄样 / 视频）'),
           ('策略', '逐步加寄样 + 视频供给，把回升兑现成订单')])
    _txt(s, Inches(4.5), Inches(5.95), Inches(4.2), Inches(0.35),
         [[('2190 仅 33 寄样即达 35.71% 出单率；2178 出单率自 9.80% 回升至 17.95%。', 11, False, MUTE)]])
    strategy_bar(s, ['坚持少寄优寄；2190 保出单率 + 适度扩；2178 加寄样 + 视频供给，把回升兑成订单。'])

# ============================================================
# P9 ・ 2189 + 28173（左右对照卡 + 中间组合图）
# ============================================================
def build_p5():
    s = new_slide()
    title_bar(s, '达人认可度高：一款补量、一款放量', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '两款都是达人认可的款，但路径不同——2189 少寄优寄需补量，28173 达人欢迎可多寄放量。')
    vcard(s, Inches(0.6), Inches(2.2), Inches(3.75), Inches(3.95), '2189',
          [('数据', '寄样 52 / 出单率 31.11% / 视频 27.85%（老品最高）/ 月度 999（+38%）'),
           ('变化', '持续上升'),
           ('原因', '少寄优寄 + 视频出单率最高，但量还小'),
           ('最大因素', '供给不足，卡在「缺量」非「缺转化」'),
           ('策略', '补视频 / 达人供给，释放最高视频出单率')])
    # 中间组合图（上方 28173 寄样柱，下方 2189 月度柱）
    bar_chart(s, Inches(4.5), Inches(2.35), Inches(4.2), Inches(1.7),
              ['7月', '8月', '9月'], [('28173 寄样量', [67, 86, 95])],
              [GRAY_D], gap=60, label_fmt='0')
    _txt(s, Inches(4.5), Inches(4.05), Inches(4.2), Inches(0.22),
         [[('28173 寄样逐月加码（67→86→95，出单率稳定 30%-34%）', 10.5, False, MUTE)]])
    bar_chart(s, Inches(4.5), Inches(4.35), Inches(4.2), Inches(1.8),
              ['7月', '8月', '9月'], [('2189 月度出单', [176, 723, 999])],
              [ACCENT], gap=60, label_fmt='0')
    _txt(s, Inches(4.5), Inches(6.15), Inches(4.2), Inches(0.22),
         [[('2189 月度出单持续走高（176→723→999）', 10.5, False, MUTE)]])
    vcard(s, Inches(8.85), Inches(2.2), Inches(3.88), Inches(3.95), '28173',
          [('数据', '寄样 95 / 出单率 31.58%（7月 30.19→8月 33.78→9月 31.58）/ 视频 23.03% / 月度 761（-10%）'),
           ('变化', '寄样一路加码、出单稳定'),
           ('原因', '达人真心认可、受欢迎可多寄'),
           ('最大因素', '达人承接意愿强'),
           ('策略', '继续放大寄样（达人愿意带）')])
    strategy_bar(s, ['28173 继续放大寄样（达人愿意带）；2189 补视频 / 达人供给，释放最高视频出单率。'])

# ============================================================
# P10 ・ 2881 + 28102（对比表 + 归因链）
# ============================================================
def build_p6():
    s = new_slide()
    title_bar(s, '测品两极：一个起量、一个出清', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '2881 出单能力测品最强，短板在履约；28102 素材无内容力 + 达人不匹配，判失败出清。')
    rows = [
        ['指标', '2881', '28102'],
        ['达人出单率', '57.14%', '2.70%'],
        ['履约率', '46.67%', '69.09%'],
        ['视频出单率', '64.71%', '2.78%'],
        ['月度出单', '38 单', '3 单'],
        ['自然单占比', '47.22%', '100%'],
    ]
    make_table(s, Inches(0.6), Inches(2.3), Inches(6.3), Inches(3.45),
               [1.9, 2.2, 2.2], rows, fsize=13, head_size=13, row_alt=CARD)
    _rect(s, Inches(7.1), Inches(2.3), Inches(5.63), Inches(3.45), CARD)
    _rect(s, Inches(7.1), Inches(2.3), Inches(0.08), Inches(3.45), ACCENT)
    _txt(s, Inches(7.35), Inches(2.45), Inches(5.2), Inches(0.32),
         [[('归因链 · 为什么两极', SUB_PT, True, ACCENT_D)]])
    _txt(s, Inches(7.35), Inches(2.85), Inches(5.2), Inches(2.7),
         [[('2881（强款）', 13, True, ACCENT_D)],
          [('达人出单率 57.14% 测品最高、视频出单率 64.71%，达人愿意带；短板在履约率仅 46.67%——收到样未做内容。', 13, False, BODY)],
          [('→ 卡在「履约管控」，加投并强化跟进即可放量。', 13, True, BODY)],
          [('28102（弱款）', 13, True, RED)],
          [('两项出单率均 <3%，自然单却 100%（仅 3 单）；素材无内容力 + 达人不匹配，双弱。', 13, False, BODY)],
          [('→ 卡在「产品 / 素材与达人错配」，非投放量问题，判出清。', 13, True, BODY)]],
         space_after=5, line_spacing=1.1)
    strategy_bar(s, ['2881 加投并强化履约跟进（催内容、盯进度）；28102 出清止损，资源转回高效款。'])

# ============================================================
# P11 ・ 2A08（表格；保持，数字正常）
# ============================================================
def build_p7():
    s = new_slide()
    title_bar(s, '2A08：未起量，止损复盘', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '全 0 未起量，连流量都没起来，直接出清；沉淀为失败案例供后续测品避坑。')
    rows = [
        ['指标', '数值', '解读'],
        ['寄样 / 履约', '57 / 38', '履约率 66.67%，达人收了样'],
        ['达人出单率', '0%', '零转化'],
        ['视频出单率', '0%', '零内容转化'],
        ['月度出单', '0 单', '未起量'],
        ['播放量', '2,990', '流量都没起来'],
        ['转化率', '0%', '非转化问题，是分发问题'],
    ]
    make_table(s, Inches(0.6), Inches(2.3), Inches(7.2), Inches(3.5),
               [1.6, 1.5, 4.1], rows, fsize=13, head_size=13, row_alt=CARD)
    _rect(s, Inches(8.0), Inches(2.3), Inches(4.73), Inches(3.5), CARD)
    _rect(s, Inches(8.0), Inches(2.3), Inches(0.08), Inches(3.5), ACCENT)
    _txt(s, Inches(8.25), Inches(2.45), Inches(4.3), Inches(0.32),
         [[('为什么（主因）', SUB_PT, True, ACCENT_D)]])
    _txt(s, Inches(8.25), Inches(2.85), Inches(4.3), Inches(2.8),
         [[('产品 / 素材无市场信号，内容未被平台分发——问题在「前端曝光」，不在「后端转化」。', 13, False, BODY)],
          [('最大影响因素：内容分发失效，达人接了样却没产生有效播放，测品假设在第一步即被证伪。', 13, True, BODY)]],
         space_after=6, line_spacing=1.12)
    strategy_bar(s, ['停止 2A08；沉淀失败案例（假设 / 素材 / 达人匹配），形成测品避坑清单。'])

# ============================================================
# P12 ・ 2L06（表格+定位说明；框框缩小、字放大）
# ============================================================
def build_p8():
    s = new_slide()
    title_bar(s, '2L06：明年春夏款，本季备货验证', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '数据健康的备货款，明年做大货；本季不追求放量，仅做健康验证与积累。')
    rows = [
        ['指标', '数值', '测品定位'],
        ['寄样 / 履约', '50 / 44', '履约率 88.00%（最高）'],
        ['达人出单率', '31.82%', '健康'],
        ['视频出单率', '30.00%', '健康'],
        ['转化率', '1.14%', '测品最高'],
        ['月度出单', '74 单', '测品最多'],
        ['自然单占比', '66.00%', '自然承接稳'],
    ]
    make_table(s, Inches(0.6), Inches(2.3), Inches(6.4), Inches(3.4),
               [1.5, 1.3, 3.6], rows, fsize=13, head_size=13, row_alt=CARD)
    _rect(s, Inches(7.2), Inches(2.3), Inches(5.53), Inches(3.4), CARD)
    _rect(s, Inches(7.2), Inches(2.3), Inches(0.08), Inches(3.4), ACCENT)
    _txt(s, Inches(7.45), Inches(2.45), Inches(5.1), Inches(0.32),
         [[('定位 & 原因', SUB_PT, True, ACCENT_D)]])
    _txt(s, Inches(7.45), Inches(2.85), Inches(5.1), Inches(2.7),
         [[('明年春夏款、明年做大货；本季健康数据作为明年放量的验证与积累，不急于冲量。', 13, False, BODY)],
          [('最大影响因素：款型季节性——当前非销售季，数据已达标即说明潜力，本季以「养款」为主。', 13, True, BODY)]],
         space_after=6, line_spacing=1.12)
    strategy_bar(s, ['本季保持健康测款节奏，为明年春夏大货积累达人 / 素材 / 转化验证。'])

# ============================================================
# P13 ・ 小结（表格保留；出清措辞更新）
# ============================================================
def build_p9():
    s = new_slide()
    title_bar(s, '第二部分小结：八款按四类分流', 'PART 02 · 各款 SKU 分析')
    conclusion(s, '老品精选打法跑通、测品两极清晰、备货验证健康——资源去向已具象。')
    rows = [
        ['分类', 'SKU', '策略', '关键判断'],
        ['少寄优寄扩量', '2178 / 2190 / 2189', '保出单率 + 适度加量', '精选打法已验证有效'],
        ['达人欢迎放量', '28173', '多寄放大', '出单稳定、达人愿带'],
        ['测品两极', '2881 / 28102 / 2A08', '2881 加投盯履约 / 28102·2A08 出清（停止寄样、止损退出）', '强款补履约、弱款止损'],
        ['备货', '2L06', '本季养款、明年大货', '数据健康、季节性款'],
    ]
    make_table(s, Inches(0.6), Inches(2.3), Inches(12.13), Inches(3.2),
               [2.4, 3.0, 3.6, 3.13], rows, fsize=13, head_size=13, row_alt=CARD)
    _txt(s, Inches(0.6), Inches(5.75), Inches(12.13), Inches(0.5),
         [[('总-分-总收束：从「每款发生了什么」回到「全盘资源怎么分」，为第三部分达人端、第四部分行动提供落点。',
            12.5, False, MUTE)]])
    strategy_bar(s, ['资源向「扩量 + 放量 + 加投」三类高效款集中，止损款释放人力与预算。'])

# ============================================================
# P15 ・ 达人素材供给（重写，新数据）
# ============================================================
def build_p10():
    s = new_slide()
    title_bar(s, '达人素材供给：人均 1.92 条，靠人头铺量', 'PART 03 · 达人端')
    conclusion(s, '素材产出靠达人数量铺量，单达人多次产出明显不足——四款爆品里近七成（69.5%）达人单个只发 1 条。')
    hero(s, Inches(MX), Inches(2.05), Inches(3.6), '1.92 条 / 人', '全店人均素材（743 条 / 386 位达人）')
    # 四款人均素材柱状
    bar_chart(s, Inches(0.6), Inches(2.75), Inches(4.1), Inches(3.25),
              ['28173', '2190', '2178', '2189'],
              [('人均素材(条)', [1.79, 1.80, 1.53, 1.52])],
              [ACCENT], gap=70, label_fmt='0.00')
    _txt(s, Inches(0.6), Inches(6.0), Inches(4.1), Inches(0.3),
         [[('四款爆品人均素材（均 < 2 条）', 11, False, MUTE)]])
    # 产出分布环形图
    donut_chart(s, Inches(4.95), Inches(2.75), Inches(3.5), Inches(3.25),
                 ['3 条+ (13.7%)', '2 条 (16.8%)', '1 条 (69.5%)'],
                 [35, 43, 178], [ACCENT_D, GRAY_M, GRAY_L])
    _txt(s, Inches(4.95), Inches(6.0), Inches(3.5), Inches(0.3),
         [[('达人产出分布（单达人发视频条数）', 11, False, MUTE)]])
    # 四款爆品产能表
    rows = [
        ['SKU', '素材数', '达人', '人均'],
        ['28173', '161', '90', '1.79'],
        ['2190', '106', '59', '1.80'],
        ['2178', '84', '55', '1.53'],
        ['2189', '79', '52', '1.52'],
    ]
    make_table(s, Inches(8.7), Inches(2.4), Inches(4.03), Inches(2.5),
               [1.2, 1.0, 0.9, 0.93], rows, fsize=12, head_size=12, row_alt=CARD)
    _txt(s, Inches(8.7), Inches(5.0), Inches(4.03), Inches(1.25),
         [[('现象 / 结论：', 12.5, True, ACCENT_D),
           ('素材产出靠达人数量铺量，单达人的多次产出明显不足——近七成达人只发 1 条，发 3 条+ 仅 13.7%。', 12.5, False, BODY)]],
         line_spacing=1.12)
    strategy_bar(s, ['下月把人均素材目标提升到 3 条，重点激活「只发 1 条」的达人做二次产出（话术引导 + 模板 + 轻量激励）。'])

# ============================================================
# P16 ・ 达人建联（替代原复投占位页）
# ============================================================
def build_p11():
    s = new_slide()
    title_bar(s, '达人建联：私信触达，建联 → 出单漏斗', 'PART 03 · 达人端')
    conclusion(s, '建联→出单转化率 65%，WhatsApp 深绑 10 位；付费达人模式尚在开发，待落地。')
    hero(s, Inches(MX), Inches(2.05), Inches(5.0), '26 → 17 位', '成功建联 26 位 → 已出单 17 位（转化率 65%）')
    # 建联漏斗（柱状）
    bar_chart(s, Inches(0.6), Inches(2.75), Inches(4.3), Inches(3.3),
              ['成功建联', '已发视频', '已出单'],
              [('人数', [26, 20, 17])],
              [ACCENT_D, GRAY_M, ACCENT], gap=80, label_fmt='0')
    _txt(s, Inches(0.6), Inches(6.05), Inches(4.3), Inches(0.3),
         [[('建联漏斗：26 → 20 → 17（抖音号 / 官号 / 邮件私信）', 11, False, MUTE)]])
    # 各品明细表
    rows = [
        ['品', '建联', '已发视频', '已出单'],
        ['2178', '9', '7', '7'],
        ['2190', '12', '9', '6'],
        ['28173', '3', '2', '2'],
        ['2189', '2', '2', '2'],
    ]
    make_table(s, Inches(5.2), Inches(2.4), Inches(3.6), Inches(2.4),
               [1.1, 0.95, 1.1, 0.95], rows, fsize=12, head_size=12, row_alt=CARD)
    # WhatsApp / 付费 说明卡
    _rect(s, Inches(9.05), Inches(2.4), Inches(3.68), Inches(3.45), CARD)
    _rect(s, Inches(9.05), Inches(2.4), Inches(0.08), Inches(3.45), ACCENT)
    _txt(s, Inches(9.3), Inches(2.55), Inches(3.3), Inches(0.32),
         [[('触达渠道 & 进展', SUB_PT, True, ACCENT_D)]])
    _txt(s, Inches(9.3), Inches(2.95), Inches(3.3), Inches(2.8),
         [[('WhatsApp 触达：', 13, True, BODY), ('10 位（深绑达人）', 13, True, ACCENT_D)],
          [('付费达人合作：', 13, True, BODY), ('开发中，暂无成功结果', 13, True, RED)],
          [('（如实呈现，不编数字）', 11.5, False, MUTE)],
          [('四款爆品共成功建联 26 位，其中 17 位已出单。', 12.5, False, BODY)]],
         space_after=6, line_spacing=1.12)
    strategy_bar(s, ['扩大建联规模（继续私信触达）、WhatsApp 加深绑定，推进付费达人合作落地。'])

# ============================================================
# P18 ・ 下月行动（动作清单表 + 寄样目标独立区块）
# ============================================================
def build_p12():
    s = new_slide()
    title_bar(s, '下月行动：扩量、放量、提质、出清', 'PART 04 · 下月行动')
    conclusion(s, '把 9 月数据结论直接翻译成动作——四类并行，呼应领导「从数据推到动作」的要求。')
    rows = [
        ['方向', '动作', '对应依据'],
        ['扩量', '2190 保持 + 适度扩；2189 补量；2178 量跟上出单率回升', 'P8 / P9 出单率已修复或领先'],
        ['放量', '28173 多寄（达人欢迎、出单稳定）', 'P9 寄样加码出单不降'],
        ['测品', '2881 加投 + 盯履约；2L06 备货（明年春夏款）；28102 / 2A08 出清（停止寄样、止损退出）', 'P10 / P11 / P12 两极结论'],
        ['素材供给', '人均 1.92 → 目标 3 条，重点激活「只发 1 条」达人二次产出', 'P15 供给瓶颈'],
        ['达人建联', '私信扩规模 + WhatsApp 深绑 + 推进付费达人合作落地', 'P16 建联转化率 65%'],
    ]
    make_table(s, Inches(0.6), Inches(2.3), Inches(12.13), Inches(2.9),
               [1.8, 6.8, 3.53], rows, fsize=12, head_size=12, row_alt=CARD)
    # 寄样目标独立区块（下半）
    _rect(s, Inches(0.6), Inches(5.35), Inches(12.13), Inches(0.95), CARD)
    _rect(s, Inches(0.6), Inches(5.35), Inches(0.09), Inches(0.95), ACCENT)
    _txt(s, Inches(0.95), Inches(5.45), Inches(3.0), Inches(0.75),
         [[('寄样目标', 16, True, ACCENT_D)], [('本月对比：当前水平 → 目标', 11, False, MUTE)]],
         anchor=MSO_ANCHOR.MIDDLE, space_after=1)
    _txt(s, Inches(4.0), Inches(5.45), Inches(4.0), Inches(0.75),
         [[('540 件', 30, True, ACCENT_D)]], anchor=MSO_ANCHOR.MIDDLE)
    _txt(s, Inches(7.6), Inches(5.45), Inches(5.0), Inches(0.75),
         [[('拆分：爆品（2178 / 2190 / 2189 / 28173）保基本盘 + 测品（2881 / 2L06）加投；',
            12, False, BODY)],
           [('当前单月寄样量待补，作为本月对比基准。', 11.5, False, MUTE)]],
         anchor=MSO_ANCHOR.MIDDLE, line_spacing=1.05)
    strategy_bar(s, ['以「扩量 + 放量」稳住基本盘，「测品分流 + 素材提供 + 达人建联」打开增量，月度复盘闭环。'])

# ============================================================
# 组装：封面 -> 目录 -> 4 章节页 -> 内容页
# ============================================================
build_cover()
build_toc()
build_divider('01', '店铺整体情况', '9 月大盘与季度趋势 ｜ 老品贡献结构')
build_p1()
build_p2()
build_divider('02', '各款 SKU 分析', '八款概览 ｜ 老品两组对比 ｜ 测品对比与单品复盘 ｜ 小结')
build_p3()
build_p4()
build_p5()
build_p6()
build_p7()
build_p8()
build_p9()
build_divider('03', '达人端', '素材供给 ｜ 达人建联')
build_p10()
build_p11()
build_divider('04', '下月行动', '扩量 · 放量 · 测品分流 · 素材供给')
build_p12()

out = r'C:\Users\LENOVO\Desktop\Dlooda_9月月度汇报_v5.pptx'
prs.save(out)
print('SAVED:', out, 'slides:', len(prs.slides._sldIdLst))
print('done')
