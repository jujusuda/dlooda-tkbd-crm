# -*- coding: utf-8 -*-
"""Dlooda 8月月度汇报 PPT v4 —— 按用户提供的正确数据重做：
- 数据全部来自用户确认表（_correct_sku_data.json）
- 删除重复月度订单强调，改用视频端/达人质量/履约率等解释性指标
- 2178+2190 / 2722 / 28173 / 2189 / 2789 / 2757 各 SKU 差异化分析
- 达人效率榜用 Z-score 综合评分（出单率 + 单达人产出）
- 复投两页合一（不同产品复投 + 同一产品复投），口径与 dashboard 一致
"""
import os, json, math
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION
from pptx.oxml.ns import qn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- palette ----------------
BG        = RGBColor(0xFF, 0xF6, 0xF9)
PINK      = RGBColor(0xFC, 0xD5, 0xE3)
PINK_MED  = RGBColor(0xF5, 0xA0, 0xBC)
PINK_DK   = RGBColor(0xE8, 0x79, 0xA6)
PINK_DEEP = RGBColor(0xC9, 0x4F, 0x82)
PINK_PALE = RGBColor(0xFC, 0xEA, 0xF1)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
INK       = RGBColor(0x4A, 0x3D, 0x42)
INK_SOFT  = RGBColor(0x7A, 0x6A, 0x70)
GREEN     = RGBColor(0x4C, 0xAF, 0x50)
RED       = RGBColor(0xE5, 0x4C, 0x4C)
GRAY      = RGBColor(0xB8, 0xAE, 0xB2)
GOLD      = RGBColor(0xE0, 0xA8, 0x3C)
BLUE      = RGBColor(0x7C, 0x9C, 0xD8)
ORANGE    = RGBColor(0xF2, 0x9B, 0x4C)
FONT = "Microsoft YaHei"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = 13.333, 7.5
BLANK = prs.slide_layouts[6]

# load data
correct = json.load(open(os.path.join(ROOT, 'scripts', '_correct_sku_data.json'), encoding='utf-8'))
quality = json.load(open(os.path.join(ROOT, 'scripts', '_creator_quality_data.json'), encoding='utf-8'))

# helper shorthand
D = correct['data']
META = correct['skuMeta']
MONTHLY = correct['monthlyOrders']

def sku_label(sku):
    return 'SKU ' + sku

# ---------------- helpers ----------------
def set_run(run, size=None, bold=None, color=None, italic=False):
    run.font.name = FONT
    if size is not None: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if color is not None: run.font.color.rgb = color
    run.font.italic = italic
    rPr = run._r.get_or_add_rPr()
    for tag in ('a:ea','a:cs'):
        e = rPr.find(qn(tag))
        if e is None:
            e = rPr.makeelement(qn(tag), {})
            rPr.append(e)
        e.set('typeface', FONT)

def draw_bow(s, x, y, scale):
    c = PINK_PALE
    o1 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(0.30*scale*0.35), Inches(0.22*scale*0.35))
    o1.fill.solid(); o1.fill.fore_color.rgb = c; o1.line.fill.background(); o1.shadow.inherit=False
    o2 = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x+0.22*scale*0.35), Inches(y), Inches(0.30*scale*0.35), Inches(0.22*scale*0.35))
    o2.fill.solid(); o2.fill.fore_color.rgb = c; o2.line.fill.background(); o2.shadow.inherit=False
    k = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x+0.22*scale*0.35), Inches(y+0.03*scale*0.35), Inches(0.13*scale*0.35), Inches(0.16*scale*0.35))
    k.fill.solid(); k.fill.fore_color.rgb = PINK_MED; k.line.fill.background(); k.shadow.inherit=False

def slide_base(title, subtitle=None, part=None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    band = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0), Inches(0), Inches(SW), Inches(1.0))
    band.fill.solid(); band.fill.fore_color.rgb = PINK_DEEP
    band.line.fill.background()
    try: band.adjustments[0] = 0.0
    except Exception: pass
    draw_bow(s, 0.32, 0.20, 0.9)
    tb = s.shapes.add_textbox(Inches(1.5), Inches(0.08), Inches(11.2), Inches(0.62))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    r = p.add_run(); r.text = title; set_run(r, 22, True, WHITE)
    if subtitle:
        p2 = tf.add_paragraph(); r2 = p2.add_run(); r2.text = subtitle
        set_run(r2, 11, False, PINK_PALE)
    if part:
        ptb = s.shapes.add_textbox(Inches(10.6), Inches(0.10), Inches(2.6), Inches(0.5))
        ptf = ptb.text_frame
        pp = ptf.paragraphs[0]; pp.alignment = PP_ALIGN.RIGHT
        rr = pp.add_run(); rr.text = part; set_run(rr, 11, True, PINK_PALE)
    return s

def add_rect(s, x, y, w, h, fill=None, line=None, line_w=0.75, radius=0.10):
    sp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(line_w)
    try: sp.adjustments[0] = radius
    except Exception: pass
    return sp

def add_text(s, x, y, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    first = True
    for ln in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = ln.get('align', align)
        if ln.get('space_after') is not None: p.space_after = Pt(ln['space_after'])
        r = p.add_run(); r.text = ln['text']; set_run(r, ln.get('size',12), ln.get('bold',False), ln.get('color',INK))
    return tb

def add_page_num(s, n):
    add_text(s, SW-0.85, SH-0.42, 0.6, 0.3, [{'text': str(n), 'size': 10, 'color': INK_SOFT, 'align': PP_ALIGN.RIGHT}], align=PP_ALIGN.RIGHT)

def add_simple_table(s, x, y, w, h, data, col_widths=None, font_size=10, header_fill=PINK, header_color=INK, row_fill=WHITE):
    rows, cols = len(data), len(data[0])
    table = s.shapes.add_table(rows, cols, Inches(x), Inches(y), Inches(w), Inches(h)).table
    if col_widths:
        for i, cw in enumerate(col_widths[:cols]):
            table.columns[i].width = Inches(cw)
    for r_idx, row in enumerate(data):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.text = str(val)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if r_idx == 0 else PP_ALIGN.LEFT if c_idx == 0 else PP_ALIGN.CENTER
            for run in p.runs:
                set_run(run, font_size, r_idx == 0, header_color if r_idx == 0 else INK)
            if r_idx == 0:
                cell.fill.solid(); cell.fill.fore_color.rgb = header_fill
            else:
                cell.fill.solid(); cell.fill.fore_color.rgb = row_fill if r_idx % 2 == 1 else PINK_PALE
    return table

def chart_title(s, x, y, text, size=11, color=INK):
    add_text(s, x, y, 3.0, 0.25, [{'text': text, 'size': size, 'bold': True, 'color': color}])

def add_column_chart(s, x, y, w, h, categories, series, title_text, show_legend=True, legend_bottom=True):
    chart_data = CategoryChartData()
    chart_data.categories = categories
    for name, vals in series:
        chart_data.add_series(name, vals)
    chart = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(x), Inches(y), Inches(w), Inches(h), chart_data).chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title_text
    set_run(chart.chart_title.text_frame.paragraphs[0].runs[0], 10, True, INK)
    if show_legend:
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM if legend_bottom else XL_LEGEND_POSITION.RIGHT
        chart.legend.include_in_layout = False
    return chart

def add_bar_chart(s, x, y, w, h, categories, series, title_text, show_legend=True):
    chart_data = CategoryChartData()
    chart_data.categories = categories
    for name, vals in series:
        chart_data.add_series(name, vals)
    chart = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(x), Inches(y), Inches(w), Inches(h), chart_data).chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title_text
    set_run(chart.chart_title.text_frame.paragraphs[0].runs[0], 10, True, INK)
    if show_legend:
        chart.has_legend = True
        chart.legend.position = XL_LEGEND_POSITION.BOTTOM
        chart.legend.include_in_layout = False
    return chart

def add_pie_chart(s, x, y, w, h, categories, values, title_text):
    chart_data = CategoryChartData()
    chart_data.categories = categories
    chart_data.add_series('占比', values)
    chart = s.shapes.add_chart(XL_CHART_TYPE.PIE, Inches(x), Inches(y), Inches(w), Inches(h), chart_data).chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title_text
    set_run(chart.chart_title.text_frame.paragraphs[0].runs[0], 10, True, INK)
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    chart.legend.include_in_layout = False
    return chart

def add_line_chart(s, x, y, w, h, categories, series, title_text):
    chart_data = CategoryChartData()
    chart_data.categories = categories
    for name, vals in series:
        chart_data.add_series(name, vals)
    chart = s.shapes.add_chart(XL_CHART_TYPE.LINE, Inches(x), Inches(y), Inches(w), Inches(h), chart_data).chart
    chart.has_title = True
    chart.chart_title.text_frame.text = title_text
    set_run(chart.chart_title.text_frame.paragraphs[0].runs[0], 10, True, INK)
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    chart.legend.include_in_layout = False
    return chart

# ---------------- page builders ----------------
def title_page():
    s = slide_base('Dlooda 8月月度汇报', '汇报周期：2026.07.15 — 2026.08.15  |  汇报人：余慧玲')
    add_rect(s, 0.8, 1.35, 11.7, 5.7, fill=WHITE, line=PINK_MED, line_w=1.5, radius=0.2)
    add_text(s, 1.2, 2.0, 10.9, 1.0, [
        {'text': '核心结论', 'size': 18, 'bold': True, 'color': PINK_DEEP, 'space_after': 10},
    ])
    cards = [
        ('寄样量', '329', '↑ 6 vs 7月'),
        ('履约率', '82.5%', '▼ 4.0pp vs 7月'),
        ('月度总订单', '6,670', '↑ 1,960 vs 7月'),
        ('有效达人', '66人', '— 6常卖SKU合计'),
    ]
    for i, (label, val, delta) in enumerate(cards):
        x = 1.2 + i * 3.0
        add_rect(s, x, 3.0, 2.7, 1.5, fill=PINK_PALE, line=PINK_MED, radius=0.12)
        add_text(s, x+0.15, 3.1, 2.4, 0.4, [{'text': label, 'size': 12, 'color': INK_SOFT}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.15, 3.45, 2.4, 0.55, [{'text': val, 'size': 24, 'bold': True, 'color': PINK_DEEP}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.15, 3.95, 2.4, 0.35, [{'text': delta, 'size': 10, 'color': GREEN if '↑' in delta else RED if '▼' in delta else INK_SOFT}], align=PP_ALIGN.CENTER)
    add_text(s, 1.2, 4.9, 10.9, 1.5, [
        {'text': '增长主要来自 2178/2190/2722/28173/2189 五款，6 常卖 SKU 合计贡献 +1,960 件；但达人出单率普遍下滑，说明寄样量扩大伴随质量稀释，8 月核心课题是“优寄少寄、提质减量”。', 'size': 12, 'color': INK},
    ])
    add_page_num(s, 1)

def part_divider(part, title, subtitle):
    s = slide_base(title, subtitle, part=part)
    # big part number
    add_text(s, 0.8, 2.3, 12.0, 1.6, [{'text': part.split(' ')[1], 'size': 110, 'bold': True, 'color': PINK_MED, 'align': PP_ALIGN.CENTER}], align=PP_ALIGN.CENTER)
    add_text(s, 0.8, 4.2, 12.0, 0.8, [{'text': title, 'size': 28, 'bold': True, 'color': PINK_DEEP, 'align': PP_ALIGN.CENTER}], align=PP_ALIGN.CENTER)
    add_page_num(s, len(prs.slides))

def overview_page():
    s = slide_base('店铺数据总览 · 核心 4 项', '剔除撤退款，6 个常卖 SKU 口径统一为 15 日-15 日')
    # cards
    cards = [
        ('寄样量（7月→8月）', '323 → 329', '↑ 6'),
        ('履约率', '86.5% → 82.5%', '▼ 4.0pp'),
        ('月度总订单', '4,710 → 6,670', '↑ 1,960'),
        ('有效达人', '66人', '—'),
    ]
    for i, (label, val, delta) in enumerate(cards):
        x = 0.7 + i * 3.15
        add_rect(s, x, 1.2, 2.9, 1.15, fill=WHITE, line=PINK_MED, radius=0.1)
        add_text(s, x+0.1, 1.25, 2.7, 0.3, [{'text': label, 'size': 10, 'color': INK_SOFT}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.1, 1.5, 2.7, 0.45, [{'text': val, 'size': 14, 'bold': True, 'color': PINK_DEEP}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.1, 1.9, 2.7, 0.3, [{'text': delta, 'size': 10, 'color': GREEN if '↑' in delta else RED if '▼' in delta else INK_SOFT}], align=PP_ALIGN.CENTER)
    # 12 SKU summary table
    headers = ['SKU', '定位', '7月订单', '8月订单', '变化', '7月出单率', '8月出单率', '变化']
    rows = [headers]
    for sku in ['2178','2190','2722','2189','28173','2789']:
        m7 = MONTHLY['7月'].get(sku, 0); m8 = MONTHLY['8月'].get(sku, 0)
        r7 = D['7月常卖'][sku]['creatorOrderRate'] * 100
        r8 = D['8月常卖'][sku]['creatorOrderRate'] * 100
        rows.append([sku, META[sku]['position'], m7, m8, m8-m7, f"{r7:.1f}%", f"{r8:.1f}%", f"{r8-r7:+.1f}pp"])
    add_simple_table(s, 0.7, 2.55, 12.0, 2.4, rows, col_widths=[0.9,1.0,1.2,1.2,1.0,1.4,1.4,1.4], font_size=9)
    # conclusion box
    add_rect(s, 0.7, 5.15, 12.0, 1.4, fill=PINK_PALE, line=PINK_DEEP, radius=0.12)
    add_text(s, 0.85, 5.25, 11.7, 1.2, [
        {'text': '一页结论', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '· 增长来源：2178(+479)、2190(+270)、2722(+131)、28173(+519)、2189(+533) 五款共同拉动，合计 +1,932；', 'size': 10, 'color': INK},
        {'text': '· 关键问题：8 月寄样量扩大的同时，达人出单率普遍下滑（2178 -5.4pp、2190 -13.3pp、2189 -25.4pp），说明新达人质量被稀释；', 'size': 10, 'color': INK},
        {'text': '· 8月主题：从“放量寄样”转向“优寄少寄”，优先已验证有带货能力的达人。', 'size': 10, 'color': INK},
    ])
    add_page_num(s, len(prs.slides))

def sku_single_page(sku, period_key='8月常卖', compare_period='7月常卖', title_suffix='', strategy_lines=None, extra_notes=None):
    s = slide_base(f'SKU {sku} {title_suffix}', '淡粉=7月，深粉=8月')
    m7 = D[compare_period][sku]; m8 = D[period_key][sku]
    # 4 mini cards
    metrics = [
        ('寄样量', m7['samples'], m8['samples'], m8['samples']-m7['samples']),
        ('履约率', m7['fulfillRate']*100, m8['fulfillRate']*100, (m8['fulfillRate']-m7['fulfillRate'])*100),
        ('达人出单率', m7['creatorOrderRate']*100, m8['creatorOrderRate']*100, (m8['creatorOrderRate']-m7['creatorOrderRate'])*100),
        ('视频出单率', m7['videoOrderRate']*100, m8['videoOrderRate']*100, (m8['videoOrderRate']-m7['videoOrderRate'])*100),
    ]
    for i, (label, v7, v8, diff) in enumerate(metrics):
        x = 0.7 + i * 3.15
        add_rect(s, x, 1.15, 2.9, 1.0, fill=WHITE, line=PINK_MED, radius=0.1)
        add_text(s, x+0.05, 1.2, 2.8, 0.25, [{'text': label, 'size': 10, 'color': INK_SOFT}], align=PP_ALIGN.CENTER)
        unit = '' if label == '寄样量' else '%'
        add_text(s, x+0.05, 1.45, 2.8, 0.4, [{'text': f'{v7:.1f}{unit}' if label!='寄样量' else str(int(v7)), 'size': 10, 'color': INK_SOFT}, {'text': ' → ', 'size': 10, 'color': INK}, {'text': f'{v8:.1f}{unit}' if label!='寄样量' else str(int(v8)), 'size': 13, 'bold': True, 'color': PINK_DEEP}], align=PP_ALIGN.CENTER)
        color = GREEN if diff > 0 else RED
        sym = '+' if diff > 0 else ''
        add_text(s, x+0.05, 1.8, 2.8, 0.25, [{'text': sym + (f'{diff:.1f}pp' if label!='寄样量' else str(int(diff))), 'size': 9, 'color': color}], align=PP_ALIGN.CENTER)
    # left text
    add_rect(s, 0.7, 2.35, 5.0, 3.2, fill=WHITE, line=PINK_MED, radius=0.12)
    lines = [{'text': '关键发现', 'size': 12, 'bold': True, 'color': PINK_DEEP}]
    if extra_notes:
        for txt in extra_notes:
            lines.append({'text': txt, 'size': 10, 'color': INK})
    else:
        lines.append({'text': f'达人出单率 {m7["creatorOrderRate"]*100:.1f}% → {m8["creatorOrderRate"]*100:.1f}%，视频出单率 {m7["videoOrderRate"]*100:.1f}% → {m8["videoOrderRate"]*100:.1f}%。', 'size': 10, 'color': INK})
    add_text(s, 0.85, 2.5, 4.7, 2.9, lines)
    # chart: videos/order videos/video order rate
    add_bar_chart(s, 6.0, 2.35, 3.0, 3.2, ['视频数量', '出单视频数'], [('7月', [m7['videos'], m7['orderVideos']]), ('8月', [m8['videos'], m8['orderVideos']])], '视频端数量与出单视频')
    # right pie old/new
    q7 = quality[compare_period][sku]; q8 = quality[period_key][sku]
    if q7 and q8:
        add_pie_chart(s, 9.3, 2.35, 3.4, 1.5, ['7月老达人', '7月新达人'], [q7['oldCreators']['count'], q7['newCreators']['count']], '7月达人结构')
        add_pie_chart(s, 9.3, 4.05, 3.4, 1.5, ['8月老达人', '8月新达人'], [q8['oldCreators']['count'], q8['newCreators']['count']], '8月达人结构')
    # strategy
    add_rect(s, 0.7, 5.75, 12.0, 1.1, fill=PINK_PALE, line=PINK_DEEP, radius=0.12)
    strat = ' | '.join(strategy_lines) if strategy_lines else '保持节奏，继续观察'
    add_text(s, 0.85, 5.85, 11.7, 0.9, [{'text': '落点策略', 'size': 12, 'bold': True, 'color': PINK_DEEP}, {'text': strat, 'size': 10, 'color': INK}])
    add_page_num(s, len(prs.slides))

def sku_page_2178_2190():
    s = slide_base('SKU 2178 + 2190 合并分析', '爆款 Work Pants：新达人稀释，需优寄少寄')
    m7_2178 = D['7月常卖']['2178']; m8_2178 = D['8月常卖']['2178']
    m7_2190 = D['7月常卖']['2190']; m8_2190 = D['8月常卖']['2190']
    def card(x, label, v7, v8, unit='%'):
        add_rect(s, x, 1.15, 3.05, 1.0, fill=WHITE, line=PINK_MED, radius=0.1)
        add_text(s, x+0.05, 1.2, 2.95, 0.25, [{'text': label, 'size': 10, 'color': INK_SOFT}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.05, 1.45, 2.95, 0.4, [{'text': f'{v7:.1f}{unit} → {v8:.1f}{unit}', 'size': 11, 'bold': True, 'color': PINK_DEEP}], align=PP_ALIGN.CENTER)
        diff = v8-v7
        add_text(s, x+0.05, 1.8, 2.95, 0.25, [{'text': f'{diff:+.1f}pp', 'size': 9, 'color': GREEN if diff>0 else RED}], align=PP_ALIGN.CENTER)
    card(0.7, '2178 达人出单率', m7_2178['creatorOrderRate']*100, m8_2178['creatorOrderRate']*100)
    card(3.85, '2190 达人出单率', m7_2190['creatorOrderRate']*100, m8_2190['creatorOrderRate']*100)
    card(7.0, '2178 视频出单率', m7_2178['videoOrderRate']*100, m8_2178['videoOrderRate']*100)
    card(10.15, '2190 视频出单率', m7_2190['videoOrderRate']*100, m8_2190['videoOrderRate']*100)
    add_rect(s, 0.7, 2.35, 5.0, 3.2, fill=WHITE, line=PINK_MED, radius=0.12)
    q78_8 = quality['8月常卖']['2178']; q90_8 = quality['8月常卖']['2190']
    q78_7 = quality['7月常卖']['2178']; q90_7 = quality['7月常卖']['2190']
    add_text(s, 0.85, 2.5, 4.7, 2.9, [
        {'text': '关键发现', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '· 达人出单率大幅下滑，视频出单率尚可 → 出单集中在老达人，新达人转化极差；', 'size': 10, 'color': INK},
        {'text': f'· 2178 寄样 {m7_2178["samples"]}→{m8_2178["samples"]}(+{m8_2178["samples"]-m7_2178["samples"]}), 视频 {m7_2178["videos"]}→{m8_2178["videos"]}({m8_2178["videos"]-m7_2178["videos"]})，履约率 {m7_2178["fulfillRate"]*100:.1f}%→{m8_2178["fulfillRate"]*100:.1f}%；', 'size': 10, 'color': INK},
        {'text': f'· 2178 老/新达人：7月 {q78_7["oldCreators"]["count"]}/{q78_7["newCreators"]["count"]}，8月 {q78_8["oldCreators"]["count"]}/{q78_8["newCreators"]["count"]}；2190：7月 {q90_7["oldCreators"]["count"]}/{q90_7["newCreators"]["count"]}，8月 {q90_8["oldCreators"]["count"]}/{q90_8["newCreators"]["count"]}；', 'size': 10, 'color': INK},
        {'text': '· 8月 L0-1/L2 占比上升，核心/高星达人占比下降，结构降级。', 'size': 10, 'color': INK},
    ])
    add_bar_chart(s, 6.0, 2.35, 3.0, 3.2, ['视频数', '出单视频'], [
        ('7月2178', [m7_2178['videos'], m7_2178['orderVideos']]),
        ('8月2178', [m8_2178['videos'], m8_2178['orderVideos']]),
        ('7月2190', [m7_2190['videos'], m7_2190['orderVideos']]),
        ('8月2190', [m8_2190['videos'], m8_2190['orderVideos']]),
    ], '视频端：数量 vs 出单视频')
    add_pie_chart(s, 9.3, 2.35, 3.4, 1.5, ['2178老', '2178新'], [q78_8['oldCreators']['count'], q78_8['newCreators']['count']], '8月2178达人结构')
    add_pie_chart(s, 9.3, 4.05, 3.4, 1.5, ['2190老', '2190新'], [q90_8['oldCreators']['count'], q90_8['newCreators']['count']], '8月2190达人结构')
    add_rect(s, 0.7, 5.75, 12.0, 1.1, fill=PINK_PALE, line=PINK_DEEP, radius=0.12)
    add_text(s, 0.85, 5.85, 11.7, 0.9, [
        {'text': '落点策略', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '优寄少寄：暂停大规模新达人铺量，优先 L3+/4★+/核心达人及历史已出单老达人复投；严控履约，确保寄样必出视频。', 'size': 10, 'color': INK},
    ])
    add_page_num(s, len(prs.slides))

def efficiency_ranking_page():
    s = slide_base('全 SKU 达人效率榜', 'Z-score 综合评分 = 出单率Z + 单达人产出Z')
    # compute z-scores
    skus = ['2178','2190','2722','2189','28173','2789']
    records = []
    for sku in skus:
        m = D['8月常卖'][sku]
        rate = m['creatorOrderRate']
        avg = m['monthlyOrders'] / max(m['orderCreators'], 1)
        records.append({'sku': sku, 'rate': rate, 'avg': avg})
    mean_rate = sum(r['rate'] for r in records) / len(records)
    std_rate = math.sqrt(sum((r['rate']-mean_rate)**2 for r in records) / len(records)) or 1
    mean_avg = sum(r['avg'] for r in records) / len(records)
    std_avg = math.sqrt(sum((r['avg']-mean_avg)**2 for r in records) / len(records)) or 1
    for r in records:
        r['z_rate'] = (r['rate'] - mean_rate) / std_rate
        r['z_avg'] = (r['avg'] - mean_avg) / std_avg
        r['score'] = r['z_rate'] + r['z_avg']
    records.sort(key=lambda x: -x['score'])
    # table
    headers = ['排名', 'SKU', '出单率', '单达人产出', 'Z出单率', 'Z单产', '综合分', '象限']
    rows = [headers]
    for i, r in enumerate(records, 1):
        quad = '明星' if r['z_rate'] > 0 and r['z_avg'] > 0 else '机会' if r['z_avg'] > 0 else '现金牛' if r['z_rate'] > 0 else '瘦狗'
        rows.append([str(i), r['sku'], f"{r['rate']*100:.1f}%", f"{r['avg']:.0f}", f"{r['z_rate']:.2f}", f"{r['z_avg']:.2f}", f"{r['score']:.2f}", quad])
    add_simple_table(s, 0.7, 1.2, 9.0, 4.8, rows, col_widths=[0.6,0.8,1.1,1.2,1.1,1.1,1.0,1.1], font_size=10)
    # bar chart of score
    add_bar_chart(s, 10.0, 1.2, 2.7, 4.8, [r['sku'] for r in records], [('综合效率分', [round(r['score']*100) for r in records])], '综合效率分排名')
    # insight
    add_rect(s, 0.7, 6.15, 12.0, 0.9, fill=PINK_PALE, line=PINK_DEEP, radius=0.12)
    top = records[0]['sku']; top2 = records[1]['sku']
    add_text(s, 0.85, 6.25, 11.7, 0.7, [
        {'text': '落点', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': f'效率最高的是 SKU {top}、{top2}，说明这两款“更容易被卖起来”；预算和精准寄样应优先向头部效率 SKU 倾斜，尾部 SKU 谨慎放量。', 'size': 10, 'color': INK},
    ])
    add_page_num(s, len(prs.slides))

def opportunity_matrix_page():
    s = slide_base('SKU 接力 & 机会矩阵', '销售贡献 vs 综合效率增长潜力')
    skus = ['2178','2190','2722','2189','28173','2789']
    records = []
    total_orders = sum(D['8月常卖'][sku]['monthlyOrders'] for sku in skus)
    for sku in skus:
        m8 = D['8月常卖'][sku]; m7 = D['7月常卖'][sku]
        sales_contrib = m8['monthlyOrders'] / total_orders
        rate = m8['creatorOrderRate']
        avg = m8['monthlyOrders'] / max(m8['orderCreators'], 1)
        records.append({'sku': sku, 'x': sales_contrib, 'y': rate * avg, 'orders': m8['monthlyOrders'], 'growth': (m8['monthlyOrders']-m7['monthlyOrders'])/max(m7['monthlyOrders'],1)})
    mid_x = sum(r['x'] for r in records) / len(records)
    mid_y = sum(r['y'] for r in records) / len(records)
    # draw quadrants
    cx = 0.7 + 6.0 * mid_x  # map x to inches 0.7-6.7
    cy = 4.0
    add_rect(s, 0.7, 1.2, 6.0, 5.6, fill=WHITE, line=PINK_MED, radius=0.1)
    # quadrant dividing lines
    from pptx.util import Pt as _Pt
    # add quadrants text
    add_text(s, 1.0, 1.5, 2.5, 0.3, [{'text': '明星：高销售+高效率', 'size': 9, 'bold': True, 'color': GREEN}], align=PP_ALIGN.LEFT)
    add_text(s, 4.0, 1.5, 2.5, 0.3, [{'text': '现金牛：高销售+低效率', 'size': 9, 'bold': True, 'color': BLUE}], align=PP_ALIGN.LEFT)
    add_text(s, 1.0, 5.5, 2.5, 0.3, [{'text': '机会：低销售+高效率', 'size': 9, 'bold': True, 'color': ORANGE}], align=PP_ALIGN.LEFT)
    add_text(s, 4.0, 5.5, 2.5, 0.3, [{'text': '瘦狗：低销售+低效率', 'size': 9, 'bold': True, 'color': RED}], align=PP_ALIGN.LEFT)
    # bubbles
    for r in records:
        bx = 0.7 + 5.5 * r['x']
        by = 6.5 - 4.5 * (r['y'] / max([x['y'] for x in records]))
        size = 0.2 + 0.35 * (r['orders'] / max([x['orders'] for x in records]))
        color = GREEN if r['x']>mid_x and r['y']>mid_y else BLUE if r['x']>mid_x else ORANGE if r['y']>mid_y else RED
        sp = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(bx-size/2), Inches(by-size/2), Inches(size), Inches(size))
        sp.fill.solid(); sp.fill.fore_color.rgb = color; sp.line.fill.background()
        add_text(s, bx, by, 1.0, 0.3, [{'text': r['sku'], 'size': 9, 'bold': True, 'color': WHITE}], align=PP_ALIGN.LEFT)
    # right side strategy
    add_rect(s, 7.0, 1.2, 5.7, 5.6, fill=WHITE, line=PINK_MED, radius=0.1)
    add_text(s, 7.15, 1.35, 5.4, 5.3, [
        {'text': '矩阵解读', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '· 明星：2722、28173 销售贡献高且达人效率向上，是秋季主推基本盘；', 'size': 10, 'color': INK},
        {'text': '· 现金牛：2178/2190 订单体量大但效率大幅下滑，需要“保量提质”，不能继续放量稀释；', 'size': 10, 'color': INK},
        {'text': '· 机会：2189 达人效率仍高但销售占比小，扩大精准寄样可成新增长极；', 'size': 10, 'color': INK},
        {'text': '· 瘦狗：2789 销售贡献低且效率一般，减少投入、清库存为主。', 'size': 10, 'color': INK},
        {'text': '', 'size': 10, 'color': INK},
        {'text': '落点', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '新品 2757 到货后，用 2722/28173 已验证达人承接流量；2189 扩大精准测款；2789 控制寄样。', 'size': 10, 'color': INK},
    ])
    add_page_num(s, len(prs.slides))

def reinvest_page():
    s = slide_base('复投分析 · 两种口径', '按 SKU 拆分，声明后成功时间不限于报告期内')
    # correct numbers from data.js computation
    reinvest = {
        '2178': {'decl': 67, 'succ': 6, 'fail': 46, 'watch': 15, 'rate': 12},
        '2190': {'decl': 50, 'succ': 3, 'fail': 33, 'watch': 14, 'rate': 8},
        '2722': {'decl': 15, 'succ': 0, 'fail': 12, 'watch': 3, 'rate': 0},
        '2189': {'decl': 35, 'succ': 1, 'fail': 24, 'watch': 10, 'rate': 4},
        '2789': {'decl': 18, 'succ': 0, 'fail': 14, 'watch': 4, 'rate': 0},
        '28173': {'decl': 12, 'succ': 0, 'fail': 9, 'watch': 3, 'rate': 0},
    }
    # 不同产品复投 table
    headers = ['SKU', '复投声明', '成功', '未成功', '观察中', '成功率']
    rows = [headers]
    for sku in ['2178','2190','2722','2189','28173','2789']:
        r = reinvest[sku]
        rows.append([sku, r['decl'], r['succ'], r['fail'], r['watch'], f"{r['rate']}%"])
    add_simple_table(s, 0.7, 1.2, 6.5, 3.6, rows, col_widths=[1.0,1.2,0.9,1.1,1.1,1.2], font_size=10)
    # bar chart success rate
    add_bar_chart(s, 7.5, 1.2, 5.2, 3.6, [sku for sku in ['2178','2190','2722','2189','28173','2789']], [('成功率', [reinvest[sku]['rate'] for sku in ['2178','2190','2722','2189','28173','2789']])], '各 SKU 复投成功率')
    # 同一产品复投 (2178+2190 only historically)
    same_sku = {'decl': 206, 'succ': 18, 'fail': 19, 'watch': 169}
    add_rect(s, 0.7, 5.1, 12.0, 1.9, fill=WHITE, line=PINK_MED, radius=0.12)
    add_text(s, 0.85, 5.2, 11.7, 1.7, [
        {'text': '同一 SKU 复投（2178+2190 同款复投跟进）', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': f'· 合计联系 {same_sku["decl"]} 人：成功 {same_sku["succ"]} / 失败 {same_sku["fail"]} / 未回复 {same_sku["watch"]}；', 'size': 10, 'color': INK},
        {'text': '· 流程：后台私信达人 → 跟踪是否申请/是否看消息 → 已读不回则再次发送；爆单达人若后台私信无响应，再用抖音号私信；', 'size': 10, 'color': INK},
        {'text': '· 落点：定期维护复投池，加强复投策略并优化话术，对爆单/高潜达人提高跟进频次。', 'size': 10, 'color': INK},
    ])
    add_page_num(s, len(prs.slides))

def action_page():
    s = slide_base('下月行动', '8.16-9.15 重点：提质减量、新品承接、老达人复投')
    actions = [
        ('01', '2178/2190 优寄少寄', '暂停放量新达人，优先 L3+/4★+/历史出单老达人，确保寄样→视频→出单闭环。'),
        ('02', '2722 暂停寄样', '短裙夏季款进入尾声，资源转向秋冬长裤/2757等新季节性主推。'),
        ('03', '28173 保持节奏', '效率持续上升，继续用已验证达人放大，复制 8 月精准寄样模型。'),
        ('04', '2189 扩大精准测款', '老达人兴趣下降，需补充新达人池，同时用复投激活历史带货达人。'),
        ('05', '2789 控量清库存', '缩小寄样量，仅保留高星/核心达人，减少低效投入。'),
        ('06', '2757 到货后加推', '测款数据与 2722 转化率接近，到货后继续寄样验证。'),
        ('07', '强化复投跟进', '统一后台+抖音号双通道触达，建立复投达人跟进 SOP。'),
    ]
    for i, (n, t, d) in enumerate(actions):
        y = 1.2 + i * 0.82
        add_rect(s, 0.7, y, 12.0, 0.72, fill=WHITE, line=PINK_MED, radius=0.08)
        add_rect(s, 0.7, y, 0.6, 0.72, fill=PINK_DEEP, line=None, radius=0.02)
        add_text(s, 0.75, y+0.18, 0.5, 0.35, [{'text': n, 'size': 14, 'bold': True, 'color': WHITE}], align=PP_ALIGN.CENTER)
        add_text(s, 1.45, y+0.08, 2.5, 0.35, [{'text': t, 'size': 11, 'bold': True, 'color': PINK_DEEP}])
        add_text(s, 4.0, y+0.08, 8.5, 0.5, [{'text': d, 'size': 10, 'color': INK}])
    add_page_num(s, len(prs.slides))

# ---------------- main ----------------
title_page()
part_divider('Part 01', '店铺数据总览', '核心 4 项 + 一页结论')
overview_page()
part_divider('Part 02', '各款 SKU 分析', '从视频端、达人质量、履约率找原因')
sku_page_2178_2190()
sku_single_page('2722', title_suffix='夏季爆款 · 减量收尾', strategy_lines=['暂停寄样，资源转向秋冬长裤'], extra_notes=['· 达人出单率 20.95%→26.67%↑，视频出单率 25.36%→32.91%↑，双率同步提升；', '· 说明上月“缩小寄样、提高达人质量”策略有效；', '· 但 2722 是夏季短裙，季节窗口收窄，8月后应逐步停寄。'])
sku_single_page('28173', title_suffix='销售款黑马 · 效率跃升', strategy_lines=['保持节奏，继续放大'], extra_notes=['· 寄样 67→86(+19)，履约率、达人出单率、视频出单率三升；', '· 出单视频 33→84(+51)，说明内容自然承接能力增强；', '· 老达人占比和等级结构稳定，质量未稀释。'])
sku_single_page('2189', title_suffix='销售款潜力 · 老达人流失', strategy_lines=['扩大达人池，激活历史带货老达人'], extra_notes=['· 达人出单率 42.42%→21.05%↓，视频出单率稳定在 35.80%；', '· 老达人（已出单复投）数量减少，新达人未补位；', '· 复投数据显示老达人对 2189 兴趣下降，需补充新达人并强化复投。'])
sku_single_page('2789', title_suffix='销售款下滑 · 需控量', strategy_lines=['缩小寄样量、提高达人质量'], extra_notes=['· 达人出单率 22.64%→21.88% 基本稳定，但月度订单 88→37 腰斩；', '· 视频出单率 28.81%→21.31%↓，头部出单达人减少；', '· 通过率下降、自然单占比低，需严控寄样质量。'])
def sku_page_2757():
    s = slide_base('SKU 2757 测款分析', '秋季 Lace Skort：潜力可追，到货后加推')
    m = D['8月测款']['2757']
    # 5 mini cards
    metrics = [('寄样量', m['samples'], ''), ('履约率', m['fulfillRate']*100, '%'), ('达人出单率', m['creatorOrderRate']*100, '%'), ('视频出单率', m['videoOrderRate']*100, '%'), ('月度订单', m['monthlyOrders'], '')]
    for i, (label, val, unit) in enumerate(metrics):
        x = 0.7 + i * 2.45
        add_rect(s, x, 1.15, 2.3, 0.9, fill=WHITE, line=PINK_MED, radius=0.1)
        add_text(s, x+0.05, 1.2, 2.2, 0.25, [{'text': label, 'size': 10, 'color': INK_SOFT}], align=PP_ALIGN.CENTER)
        add_text(s, x+0.05, 1.5, 2.2, 0.35, [{'text': f'{val:.1f}{unit}' if unit=='%' else str(int(val)), 'size': 14, 'bold': True, 'color': PINK_DEEP}], align=PP_ALIGN.CENTER)
    # left insight
    add_rect(s, 0.7, 2.25, 5.0, 3.3, fill=WHITE, line=PINK_MED, radius=0.12)
    add_text(s, 0.85, 2.4, 4.7, 3.0, [
        {'text': '关键发现', 'size': 12, 'bold': True, 'color': PINK_DEEP},
        {'text': '· 8月测款 35 寄样，履约率 82.9%，达人出单率 22.86%，视频出单率 25.64%；', 'size': 10, 'color': INK},
        {'text': '· 与 2722 爆款同期转化率接近，具备承接秋季流量的潜力；', 'size': 10, 'color': INK},
        {'text': '· 自然单占比 40.5%，流量结构仍需短视频素材进一步验证；', 'size': 10, 'color': INK},
        {'text': '· 新达人 19 人，老达人经验不足，到货后应优先用已出单老达人测款。', 'size': 10, 'color': INK},
    ])
    # compare bar with 2722
    m2722 = D['8月常卖']['2722']
    add_bar_chart(s, 6.0, 2.25, 3.0, 3.3, ['达人出单率', '视频出单率', '履约率'], [
        ('2757', [m['creatorOrderRate']*100, m['videoOrderRate']*100, m['fulfillRate']*100]),
        ('2722', [m2722['creatorOrderRate']*100, m2722['videoOrderRate']*100, m2722['fulfillRate']*100]),
    ], '2757 vs 2722 爆款对比')
    # pie
    q = quality['8月测款']['2757']
    add_pie_chart(s, 9.3, 2.25, 3.4, 1.5, ['老达人', '新达人'], [q['oldCreators']['count'], q['newCreators']['count']], '2757达人结构')
    add_pie_chart(s, 9.3, 4.0, 3.4, 1.55, ['自然单', '非自然单'], [int(m['monthlyOrders']*m['naturalRate']), int(m['monthlyOrders']*(1-m['naturalRate']))], '订单来源')
    # strategy
    add_rect(s, 0.7, 5.75, 12.0, 1.1, fill=PINK_PALE, line=PINK_DEEP, radius=0.12)
    add_text(s, 0.85, 5.85, 11.7, 0.9, [{'text': '落点策略', 'size': 12, 'bold': True, 'color': PINK_DEEP}, {'text': '到货后继续寄样，优先邀请 2722/28173 已出单老达人带货，验证秋季 Lace Skort 潜力。', 'size': 10, 'color': INK}])
    add_page_num(s, len(prs.slides))

sku_page_2757()
part_divider('Part 03', '达人维度洞察', '效率榜 + 矩阵 + 复投')
efficiency_ranking_page()
opportunity_matrix_page()
reinvest_page()
part_divider('Part 04', '下月行动', '提质减量 + 新品承接')
action_page()

out = os.path.join(ROOT, 'Dlooda_8月月度汇报_v4.pptx')
prs.save(out)
print('saved', out)



