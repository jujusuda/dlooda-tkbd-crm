# -*- coding: utf-8 -*-
"""
Build Dlooda 8月月度汇报 PPT (v2)
- Narrative-first: 数据 + 原因 + 对策
- 4-5 module structure with Part X divider slides
- 2178 + 2190 merged analysis
- Charts: bar, pie, line where appropriate
- Light-pink healing theme + Hello Kitty bow accents
"""
import os, re, json
from bs4 import BeautifulSoup
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.chart.data import CategoryChartData, ChartData
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml

# ------------------------------------------------------------------
# Theme
# ------------------------------------------------------------------
BG        = RGBColor(0xFF, 0xF6, 0xF9)
PINK      = RGBColor(0xFC, 0xD5, 0xE3)
PINK_MED  = RGBColor(0xF5, 0xA0, 0xBC)
PINK_DK   = RGBColor(0xE8, 0x79, 0xA6)
PINK_DEEP = RGBColor(0xC9, 0x4F, 0x82)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
INK       = RGBColor(0x4A, 0x3D, 0x42)
INK_SOFT  = RGBColor(0x6B, 0x5C, 0x61)
GREEN     = RGBColor(0x4C, 0xAF, 0x50)   # up / good
RED       = RGBColor(0xE5, 0x4C, 0x4C)   # down / warn
GRAY      = RGBColor(0xB0, 0xA4, 0xA8)

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Dlooda_8月月度汇报_v2.pptx')
HTML = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'monthly-report-2026-07-15_08-15.html')

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
EMU_PER_INCH = 914400

def set_font(run, name='Microsoft YaHei', size=12, color=INK, bold=False):
    run.font.name = name
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.language_id = 0x0804
    # east asian / complex script font
    rPr = run._r.get_or_add_rPr()
    for ns, tag in [('a:ea', 'a:ea'), ('a:cs', 'a:cs')]:
        try:
            from pptx.oxml import parse_xml
            e = parse_xml(f'<{tag[3:]} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{name}"/>')
            rPr.append(e)
        except Exception: pass

def set_shape_fill(shape, color):
    shape.fill.solid(); shape.fill.fore_color.rgb = color

def set_shape_line(shape, color=None, width=Pt(1)):
    if color is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = color; shape.line.width = width

def add_textbox(slide, x, y, w, h, text, size=12, color=INK, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font_name='Microsoft YaHei'):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_font(run, name=font_name, size=size, color=color, bold=bold)
    return box

def add_rounded_rect(slide, x, y, w, h, fill, line=None, radius=0.08):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    set_shape_fill(sh, fill)
    set_shape_line(sh, line)
    # adjust corner radius
    try:
        sh.adjustments[0] = radius
    except Exception: pass
    return sh

def add_bow(slide, cx, cy, size=0.45):
    """Hello Kitty style bow outline."""
    s = size
    r = s*0.55
    # left loop
    sh1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx-s*0.55), Inches(cy-r/2), Inches(r), Inches(r))
    set_shape_fill(sh1, PINK_MED); set_shape_line(sh1, PINK_DK)
    # right loop
    sh2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx+s*0.05), Inches(cy-r/2), Inches(r), Inches(r))
    set_shape_fill(sh2, PINK_MED); set_shape_line(sh2, PINK_DK)
    # center knot
    sh3 = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx-s*0.15), Inches(cy-s*0.14), Inches(s*0.3), Inches(s*0.28))
    set_shape_fill(sh3, PINK_DK); set_shape_line(sh3, PINK_DEEP)
    return sh1, sh2, sh3

def title_band(slide, title, subtitle=None):
    rect = add_rounded_rect(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.05), PINK_DK, None, 0)
    add_bow(slide, 0.65, 0.52, 0.42)
    add_textbox(slide, Inches(1.15), Inches(0.15), Inches(11.5), Inches(0.85), title,
                size=24, color=WHITE, bold=True, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle:
        add_textbox(slide, Inches(10.5), Inches(0.35), Inches(2.5), Inches(0.5), subtitle,
                    size=11, color=PINK, bold=False, align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)

def divider_slide(prs, part_no, part_title, part_sub=''):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_fill(bg, BG); set_shape_line(bg, None)
    # decorative bow (large)
    add_bow(slide, 6.67, 2.2, 1.6)
    # part number
    add_textbox(slide, Inches(0), Inches(2.9), Inches(13.333), Inches(0.9),
                f"PART 0{part_no}" if part_no < 10 else f"PART {part_no}",
                size=40, color=PINK_DK, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    # title
    add_textbox(slide, Inches(0), Inches(3.85), Inches(13.333), Inches(0.9), part_title,
                size=32, color=INK, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    if part_sub:
        add_textbox(slide, Inches(2), Inches(4.8), Inches(9.333), Inches(0.7), part_sub,
                    size=16, color=INK_SOFT, align=PP_ALIGN.CENTER)
    return slide

def metric_card(slide, x, y, w, h, label, value, delta, unit=''):
    card = add_rounded_rect(slide, x, y, w, h, WHITE, PINK_MED, 0.08)
    add_textbox(slide, x, y+h*0.12, w, h*0.25, label, size=12, color=INK_SOFT, align=PP_ALIGN.CENTER)
    add_textbox(slide, x, y+h*0.35, w, h*0.38, value, size=28, color=PINK_DEEP, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    is_up = delta.startswith('▲') or delta.startswith('+')
    col = GREEN if is_up else RED
    add_textbox(slide, x, y+h*0.73, w, h*0.20, delta, size=12, color=col, align=PP_ALIGN.CENTER)

# ------------------------------------------------------------------
# Data extraction
# ------------------------------------------------------------------
soup = BeautifulSoup(open(HTML, encoding='utf-8').read(), 'html.parser')

def table_after(title_kw):
    """Find first table after heading containing title_kw."""
    for h in soup.find_all(['h2','h3','h4']):
        if title_kw in h.get_text(strip=True):
            for sib in h.find_next_siblings():
                if sib.name in ('h2','h3','h4'): break
                if sib.name == 'table':
                    return [[c.get_text(' ', strip=True) for c in tr.find_all(['th','td'])] for tr in sib.find_all('tr')]
    return None

def text_after(title_kw):
    """Find first non-empty paragraph after heading."""
    for h in soup.find_all(['h2','h3','h4']):
        if title_kw in h.get_text(strip=True):
            for sib in h.find_next_siblings():
                if sib.name in ('h2','h3','h4'): break
                if sib.name == 'p':
                    t = sib.get_text(' ', strip=True)
                    if t: return t
    return ''

def list_after(title_kw):
    for h in soup.find_all(['h2','h3','h4']):
        if title_kw in h.get_text(strip=True):
            items=[]
            for sib in h.find_next_siblings():
                if sib.name in ('h2','h3','h4'): break
                if sib.name in ('ul','ol'):
                    items.extend([li.get_text(' ', strip=True) for li in sib.find_all('li') if li.get_text(strip=True)])
            return items
    return []

# 12 SKU summary
summary12 = table_after('报告期 12 个寄样 SKU 汇总')
# Waterfall: find the breakdown table under 订单变化进一步拆解 or 6 个常卖款
waterfall = table_after('订单变化进一步拆解')
if not waterfall: waterfall = table_after('6 个常卖款')
# Core 4 metrics from 一页结论 bullet
one_page = list_after('一页结论')
action_items = list_after('下月行动')

# Per-SKU reason texts: all h4 "📊 变化原因" in document order match order 2178..2789
reason_texts = []
for h in soup.find_all(['h4']):
    if '变化原因' in h.get_text(strip=True) and '共同' not in h.get_text(strip=True):
        for sib in h.find_next_siblings():
            if sib.name in ('h2','h3','h4'): break
            if sib.name == 'p':
                t = sib.get_text(' ', strip=True)
                if t: reason_texts.append(t); break

# Per-SKU summary span after h3 "SKU XXX"
def parse_summary_span(sku):
    for h in soup.find_all(['h3']):
        if h.get_text(strip=True) == f'SKU {sku}':
            for sib in h.find_next_siblings():
                if sib.name in ('h2','h3'): break
                if sib.name == 'span' or sib.name == 'p':
                    t = sib.get_text(' ', strip=True)
                    if '寄样' in t: return t
    return ''

def parse_numbers(text):
    """Parse pairs like 33→73 or 33→73 (寄样), 1289→1768 etc."""
    nums = {}
    # sample pair: 寄样 105→45
    m = re.search(r'寄样\s*([0-9]+)\s*[→~]\s*([0-9]+)', text)
    if m: nums['samples'] = (int(m.group(1)), int(m.group(2)))
    # order pair: 月度达人总出单 1509→1640
    m = re.search(r'月度达人总出单\s*([0-9]+)\s*[→~]\s*([0-9]+)', text)
    if m: nums['orders'] = (int(m.group(1)), int(m.group(2)))
    # rate pair: 达人出单率 26.2%→32.4%
    m = re.search(r'达人出单率\s*([0-9.]+)%?\s*[→~]\s*([0-9.]+)%', text)
    if m: nums['rate'] = (float(m.group(1)), float(m.group(2)))
    # new达人占比
    m = re.search(r'新达人占\s*([0-9]+)%?', text)
    if m: nums['new_pct'] = int(m.group(1))
    return nums

order = ['2178','2190','2722','28173','2189','2789']
sku_info = {}
for i, sku in enumerate(order):
    info = {'sku': sku, 'reason': reason_texts[i] if i < len(reason_texts) else ''}
    # try reason text numbers first, else summary span
    nums = parse_numbers(info['reason'])
    if not nums.get('samples'):
        span = parse_summary_span(sku)
        nums.update(parse_numbers(span))
    info.update(nums)
    # default new达人占比 if missing
    if 'new_pct' not in info:
        m = re.search(r'新达人占\s*([0-9]+)%', info['reason'])
        if m: info['new_pct'] = int(m.group(1))
    sku_info[sku] = info

# merged 2178+2190 section texts
merged_reason = text_after('共同变化原因')
merged_strategy = list_after('合并下月策略')

# efficiency / relay / matrix / reinvest / action
efficiency = table_after('全 SKU 达人效率榜') or table_after('达人效率')
relay = table_after('SKU 接力关系') or table_after('SKU 接力')
matrix = table_after('SKU 机会矩阵') or table_after('机会矩阵')
reinvest_all = table_after('SKU 复投关系汇总') or table_after('复投关系汇总')

# top / loss creators from 达人亮点 section
top_creators = None; loss_creators = None
for h in soup.find_all(['h2','h3']):
    if '达人亮点与流失预警' in h.get_text(strip=True):
        for sib in h.find_next_siblings():
            if sib.name in ('h2','h3'): break
            if sib.name in ('h4','h5'):
                if '亮点' in sib.get_text():
                    for ss in sib.find_next_siblings():
                        if ss.name in ('h2','h3','h4','h5'): break
                        if ss.name == 'table':
                            top_creators = [[c.get_text(' ', strip=True) for c in tr.find_all(['th','td'])] for tr in ss.find_all('tr')]; break
                if '流失' in sib.get_text():
                    for ss in sib.find_next_siblings():
                        if ss.name in ('h2','h3','h4','h5'): break
                        if ss.name == 'table':
                            loss_creators = [[c.get_text(' ', strip=True) for c in tr.find_all(['th','td'])] for tr in ss.find_all('tr')]; break
        break

# ------------------------------------------------------------------
# Build presentation
# ------------------------------------------------------------------
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# ---- Slide 1: Cover ----
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
add_bow(s, 6.67, 2.0, 1.4)
add_textbox(s, Inches(0), Inches(3.0), Inches(13.333), Inches(1.0), 'Dlooda 8月月度汇报',
            size=44, color=PINK_DEEP, bold=True, align=PP_ALIGN.CENTER)
add_textbox(s, Inches(0), Inches(4.1), Inches(13.333), Inches(0.6), '2026.07.15 ~ 2026.08.15',
            size=20, color=INK_SOFT, align=PP_ALIGN.CENTER)
add_textbox(s, Inches(0), Inches(5.0), Inches(13.333), Inches(0.5), '汇报人：余慧玲',
            size=16, color=INK_SOFT, align=PP_ALIGN.CENTER)

# ---- Slide 2: 目录 ----
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '汇报目录')
modules = [
    ('PART 01', '店铺数据总览', '核心指标 · 12 SKU 汇总 · 订单变化'),
    ('PART 02', '各款 SKU 分析', '2178/2190 合并 + 其他爆款深度拆解'),
    ('PART 03', '达人维度洞察', '效率榜 · 画像变化 · 亮点与流失预警'),
    ('PART 04', '复投与下月行动', '复投结果 · 行动清单'),
]
for idx, (part, title, sub) in enumerate(modules):
    y = Inches(1.7 + idx*1.25)
    add_rounded_rect(s, Inches(1.4), y, Inches(10.5), Inches(0.95), WHITE, PINK_MED, 0.08)
    add_textbox(s, Inches(1.7), y+Inches(0.08), Inches(2.0), Inches(0.35), part,
                size=14, color=PINK_DK, bold=True)
    add_textbox(s, Inches(3.6), y+Inches(0.08), Inches(7.0), Inches(0.35), title,
                size=18, color=INK, bold=True)
    add_textbox(s, Inches(3.6), y+Inches(0.45), Inches(7.5), Inches(0.35), sub,
                size=12, color=INK_SOFT)

# ==========================================================
# PART 1 店铺数据总览
# ==========================================================
divider_slide(prs, 1, '店铺数据总览', '核心指标 · 12 SKU 汇总 · 订单变化')

# Slide: 一页结论
def add_conclusion_slide(prs, title, bullets, part_sub=''):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_fill(bg, BG); set_shape_line(bg, None)
    title_band(s, title, part_sub)
    # card background
    add_rounded_rect(s, Inches(0.55), Inches(1.35), Inches(12.2), Inches(5.75), WHITE, PINK_MED, 0.08)
    y = Inches(1.55)
    for b in bullets:
        # strip leading emoji/spaces
        b = re.sub(r'^[\s\u2000-\u206f]+', '', b)
        # colorize arrows
        col = INK
        if '▲' in b or '增长' in b or '上升' in b or '提升' in b:
            col = INK
        box = add_textbox(s, Inches(0.85), y, Inches(11.6), Inches(0.85), b,
                          size=15, color=col, align=PP_ALIGN.LEFT)
        y += Inches(0.82)
    return s

s = add_conclusion_slide(prs, '一页结论：8月发生了什么？', one_page, 'PART 01')

# Slide: 核心 4 指标
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '核心 4 项指标', 'PART 01')
# parse core numbers from one_page bullets
import re
core = {}
for b in one_page:
    m = re.search(r'全部 12 个 SKU 8月寄样 ([0-9]+) 件.*环比 [▼▲]?\s*([0-9]+)', b)
    if m: core['samples']=(m.group(1), '▼ '+m.group(2)+' 件')
    m = re.search(r'达人出单率 ([0-9.]+)%→([0-9.]+)%', b)
    if m: core['rate']=(m.group(2)+'%', '▼ '+str(round(float(m.group(1))-float(m.group(2)),1))+'pp')
    m = re.search(r'月度达人总出单 [▲▼]?\s*([0-9]+).*?件.*', b)
    if m: core['orders']=(m.group(1), '+1881 件')
metric_card(s, Inches(0.6), Inches(1.5), Inches(2.9), Inches(1.7), '寄样量（件）', core.get('samples',('394','▼ 40'))[0], core.get('samples',('394','▼ 40'))[1])
metric_card(s, Inches(3.7), Inches(1.5), Inches(2.9), Inches(1.7), '达人出单率', core.get('rate',('22.8%','▼ 6.3pp'))[0], core.get('rate',('22.8%','▼ 6.3pp'))[1])
metric_card(s, Inches(6.8), Inches(1.5), Inches(2.9), Inches(1.7), '6 SKU 订单', core.get('orders',('6673','+1881'))[0], '+1881 件')
metric_card(s, Inches(9.9), Inches(1.5), Inches(2.5), Inches(1.7), '有效达人', '66 人', '▼ 15 人')
# mini insight
add_rounded_rect(s, Inches(0.6), Inches(3.45), Inches(11.8), Inches(1.35), PINK, None, 0.06)
add_textbox(s, Inches(0.9), Inches(3.6), Inches(11.2), Inches(1.1),
            '关键发现：订单增长 +39% 主要来自 2189/28173/2178 三款；但出单率被新达人稀释（29.1%→22.8%），说明“量”在放大，“质”待提升。',
            size=15, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE)

# bar chart: 6 SKU order m7 vs m8
chart_data = CategoryChartData()
chart_data.categories = ['2178','2190','2722','28173','2189','2789']
m7 = [1289,1506,1509,252,148,88]
m8 = [1768,1776,1640,771,681,37]
chart_data.add_series('7月', m7)
chart_data.add_series('8月', m8)
x, y, cx, cy = Inches(0.6), Inches(5.1), Inches(12.0), Inches(1.9)
chart = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data).chart
chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.BOTTOM
add_textbox(s, Inches(0.6), Inches(4.95), Inches(6), Inches(0.25), '6 个常卖款月度订单对比', size=11, color=INK_SOFT)

# Slide: 12 SKU 汇总 + 瀑布图
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '谁在涨 / 谁在跌？', 'PART 01')
# 12 SKU summary table (top half)
if summary12:
    add_textbox(s, Inches(0.55), Inches(1.25), Inches(6), Inches(0.3), '报告期 12 SKU 核心表现', size=12, color=PINK_DK, bold=True)
    rows = summary12[:9]  # take first 9 to fit
    tbl = s.shapes.add_table(len(rows), len(rows[0]), Inches(0.55), Inches(1.6), Inches(6.0), Inches(0.34*len(rows))).table
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c)
            cell.text = val
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER
                set_font(p.runs[0] if p.runs else p.add_run(), size=8.5, color=INK, bold=(r==0))
            if r==0:
                cell.fill.solid(); cell.fill.fore_color.rgb = PINK_DK
                for p in cell.text_frame.paragraphs: set_font(p.runs[0] if p.runs else p.add_run(), size=9, color=WHITE, bold=True)
# waterfall chart
if waterfall:
    # find SKU/delta columns
    skus_w = [r[0] for r in waterfall[1:]]
    deltas = []
    for r in waterfall[1:]:
        try:
            d = int(r[-1].replace('+','').replace('▲','').replace('▼','-'))
            deltas.append(d)
        except: deltas.append(0)
    chart_data = CategoryChartData()
    chart_data.categories = skus_w
    chart_data.add_series('订单变化', deltas)
    chart = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(7.0), Inches(1.6), Inches(5.8), Inches(4.5), chart_data).chart
    chart.has_legend = False
    add_textbox(s, Inches(7.0), Inches(1.25), Inches(5), Inches(0.3), '6 款订单环比变化瀑布图', size=12, color=PINK_DK, bold=True)

# insight below
add_rounded_rect(s, Inches(0.55), Inches(6.25), Inches(12.2), Inches(0.85), PINK, None, 0.06)
add_textbox(s, Inches(0.85), Inches(6.35), Inches(11.6), Inches(0.65),
            '结论：增长主力 2189(+533)、28173(+519)、2178(+479)；2789 下滑 51 件主因头部达人 frantastic714 流失。',
            size=14, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE)

# ==========================================================
# PART 2 各款 SKU 分析
# ==========================================================
divider_slide(prs, 2, '各款 SKU 分析', '2178/2190 合并 + 其他爆款深度拆解')

# ---- Merged 2178 + 2190 analysis ----
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '2178 + 2190 合并分析（Work Pants 双爆款）', 'PART 02')
# key numbers from parsed info
i2178 = sku_info['2178']; i2190 = sku_info['2190']
add_rounded_rect(s, Inches(0.6), Inches(1.35), Inches(12.0), Inches(0.9), WHITE, PINK_MED, 0.06)
add_textbox(s, Inches(0.85), Inches(1.45), Inches(11.5), Inches(0.7),
            merged_reason or '同属 Work Pants 品类，8月寄样合计 128 件（▲68），月度达人总出单 3544 件（▲749）。两款需求旺盛，但达人出单率被新达人稀释。',
            size=13, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE)

# Two pie charts side by side
from pptx.chart.data import ChartData
def pie_chart(slide, x, y, title, labels, values, colors):
    cd = ChartData()
    cd.categories = labels
    cd.add_series(title, values)
    chart = slide.shapes.add_chart(XL_CHART_TYPE.PIE, x, y, Inches(3.0), Inches(2.3), cd).chart
    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.RIGHT
    add_textbox(slide, x, y-Inches(0.25), Inches(3.0), Inches(0.25), title, size=10, color=INK_SOFT, align=PP_ALIGN.CENTER)

n2178_new = i2178.get('new_pct', 75); n2178_old = 100 - n2178_new
n2190_new = i2190.get('new_pct', 80); n2190_old = 100 - n2190_new
pie_chart(s, Inches(0.8), Inches(2.45), '2178 新老达人占比', ['新达人','老达人'], [n2178_new, n2178_old], [PINK_MED, PINK_DK])
pie_chart(s, Inches(4.3), Inches(2.45), '2190 新老达人占比', ['新达人','老达人'], [n2190_new, n2190_old], [PINK_MED, PINK_DK])

# Combined bar: samples vs orders per month
samp2178 = i2178.get('samples', (33,73)); samp2190 = i2190.get('samples', (27,55))
ord2178 = i2178.get('orders', (1289,1768)); ord2190 = i2190.get('orders', (1506,1776))
chart_data = CategoryChartData()
chart_data.categories = ['7月','8月']
chart_data.add_series('2178 寄样', list(samp2178))
chart_data.add_series('2190 寄样', list(samp2190))
chart_data.add_series('2178 订单', list(ord2178))
chart_data.add_series('2190 订单', list(ord2190))
chart = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(8.0), Inches(2.4), Inches(4.8), Inches(2.4), chart_data).chart
chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.BOTTOM
add_textbox(s, Inches(8.0), Inches(2.15), Inches(4.8), Inches(0.25), '寄样量 vs 月度订单', size=10, color=INK_SOFT, align=PP_ALIGN.CENTER)

# conclusion & action
add_rounded_rect(s, Inches(0.6), Inches(5.0), Inches(12.0), Inches(2.0), WHITE, PINK_MED, 0.08)
add_textbox(s, Inches(0.85), Inches(5.1), Inches(11.5), Inches(0.6),
            '🎯 共同原因：新达人占比高（2178 {}%、2190 {}%）稀释了出单率；老达人转化更稳定但复投不足。'.format(n2178_new, n2190_new),
            size=14, color=INK, bold=True)
strategy = merged_strategy if merged_strategy else list_after('合并下月策略')
for i, item in enumerate(strategy[:3]):
    add_textbox(s, Inches(0.95), Inches(5.75 + i*0.35), Inches(11.4), Inches(0.35),
                f'• {item}', size=12, color=INK_SOFT, align=PP_ALIGN.LEFT)

# ---- Per-SKU slides: only meaningful analysis ----
# Select global actions that match each SKU
sku_actions = {
    '2722': ['复投只投已出单达人并配专属 bonus','新达人首轮只寄 1 件测品验证','第 10 天未发跟进、第 15 天升级催更'],
    '28173': ['对高转化老达人优先复投','新达人先测品再放量','预算向高 GMV·高增长款倾斜'],
    '2189': ['保持当前放量节奏，复制到同类测品','老达人复投锁定头部','第 10–15 天完成催更'],
    '2789': ['减少新达人投放，挽回头部','建立「上期出单达人 100% 复投」清单','对流失大客逐一挽回']
}
meaningful_order = ['2722','28173','2189','2789']
for sku in meaningful_order:
    info = sku_info[sku]
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_fill(bg, BG); set_shape_line(bg, None)
    title_band(s, f'SKU {sku} 深度分析', 'PART 02')
    reason = info.get('reason') or '数据整理中'
    # render reason at top
    add_rounded_rect(s, Inches(0.6), Inches(1.35), Inches(12.0), Inches(0.9), WHITE, PINK_MED, 0.06)
    add_textbox(s, Inches(0.85), Inches(1.45), Inches(11.5), Inches(0.7), reason,
                size=13, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE)
    # bar chart: 7月 vs 8月 寄样 & 订单
    s7, s8 = info.get('samples', (0,0))
    o7, o8 = info.get('orders', (0,0))
    chart_data = CategoryChartData()
    chart_data.categories = ['7月', '8月']
    chart_data.add_series('寄样量', [s7, s8])
    chart_data.add_series('月度订单', [o7, o8])
    chart = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.6), Inches(2.45), Inches(6.0), Inches(3.0), chart_data).chart
    chart.has_legend = True; chart.legend.position = XL_LEGEND_POSITION.BOTTOM
    add_textbox(s, Inches(0.6), Inches(2.2), Inches(5.0), Inches(0.25), '寄样量 vs 月度订单', size=11, color=INK_SOFT)
    # new/old pie
    new_pct = info.get('new_pct', 50)
    pie_chart(s, Inches(7.0), Inches(2.45), '新达人占比', ['新达人','老达人'], [new_pct, 100-new_pct], [PINK_MED, PINK_DK])
    # strategy
    add_rounded_rect(s, Inches(0.6), Inches(5.7), Inches(12.0), Inches(1.3), PINK, None, 0.06)
    add_textbox(s, Inches(0.85), Inches(5.8), Inches(11.5), Inches(0.35), '下月策略', size=13, color=PINK_DEEP, bold=True)
    for i, st in enumerate(sku_actions.get(sku, action_items[:3])[:3]):
        add_textbox(s, Inches(0.95), Inches(6.15 + i*0.32), Inches(11.4), Inches(0.35), f'• {st}',
                    size=12, color=INK, align=PP_ALIGN.LEFT)

# ==========================================================
# PART 3 达人维度洞察
# ==========================================================
divider_slide(prs, 3, '达人维度洞察', '效率榜 · 画像变化 · 亮点与流失预警')

# Slide: 达人效率榜 + 画像关键变化
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '达人效率榜 & 画像关键变化', 'PART 03')
if efficiency:
    rows = efficiency[:8]
    add_textbox(s, Inches(0.55), Inches(1.25), Inches(5.0), Inches(0.3), '全 SKU 达人效率榜 TOP', size=11, color=PINK_DK, bold=True)
    tbl = s.shapes.add_table(len(rows), len(rows[0]), Inches(0.55), Inches(1.55), Inches(6.2), Inches(0.32*len(rows))).table
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c); cell.text = val
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER
                set_font(p.runs[0] if p.runs else p.add_run(), size=8, color=INK, bold=(r==0))
            if r==0:
                cell.fill.solid(); cell.fill.fore_color.rgb = PINK_DK
                for p in cell.text_frame.paragraphs: set_font(p.runs[0] if p.runs else p.add_run(), size=8.5, color=WHITE, bold=True)
# key creator profile insight
add_rounded_rect(s, Inches(7.0), Inches(1.55), Inches(5.8), Inches(3.0), WHITE, PINK_MED, 0.08)
add_textbox(s, Inches(7.2), Inches(1.7), Inches(5.4), Inches(0.4), '画像关键发现', size=14, color=PINK_DEEP, bold=True)
insights = [
    '新达人占比高：整体出单率被稀释。',
    '老达人出单率明显高于新达人。',
    '头部维护与定向复投是效率关键。',
    '核心达人、星级≥3★、非大码身材转化更好。'
]
for i, ins in enumerate(insights):
    add_textbox(s, Inches(7.2), Inches(2.15 + i*0.45), Inches(5.4), Inches(0.4), f'• {ins}',
                size=12, color=INK, align=PP_ALIGN.LEFT)

# Top creators and loss creators (side by side)
if top_creators:
    rows = top_creators[:6]
    add_textbox(s, Inches(0.55), Inches(4.9), Inches(2.5), Inches(0.3), '本月达人亮点', size=11, color=PINK_DK, bold=True)
    tbl = s.shapes.add_table(len(rows), len(rows[0]), Inches(0.55), Inches(5.15), Inches(5.8), Inches(0.32*len(rows))).table
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c); cell.text = val
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER
                set_font(p.runs[0] if p.runs else p.add_run(), size=8, color=INK, bold=(r==0))
            if r==0:
                cell.fill.solid(); cell.fill.fore_color.rgb = PINK_MED
                for p in cell.text_frame.paragraphs: set_font(p.runs[0] if p.runs else p.add_run(), size=8.5, color=INK, bold=True)
if loss_creators:
    rows = loss_creators[:6]
    add_textbox(s, Inches(6.8), Inches(4.9), Inches(3.0), Inches(0.3), '达人流失预警', size=11, color=RED, bold=True)
    tbl = s.shapes.add_table(len(rows), len(rows[0]), Inches(6.8), Inches(5.15), Inches(6.0), Inches(0.32*len(rows))).table
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c); cell.text = val
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER
                set_font(p.runs[0] if p.runs else p.add_run(), size=8, color=INK, bold=(r==0))
            if r==0:
                cell.fill.solid(); cell.fill.fore_color.rgb = RED
                for p in cell.text_frame.paragraphs: set_font(p.runs[0] if p.runs else p.add_run(), size=8.5, color=WHITE, bold=True)

# ==========================================================
# PART 4 复投与下月行动
# ==========================================================
divider_slide(prs, 4, '复投与下月行动', '复投结果 · 行动清单')

# Slide: 复投汇总 + 机会矩阵
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
title_band(s, '复投结果 & 机会矩阵', 'PART 04')
# reinvest summary metrics
metric_card(s, Inches(0.6), Inches(1.45), Inches(2.8), Inches(1.5), '不同 SKU 复投成功率', '9%', '▼ 91% 未成功')
metric_card(s, Inches(3.7), Inches(1.45), Inches(2.8), Inches(1.5), '2178+2190 同款复投联系', '206 人', '成功 18')
metric_card(s, Inches(6.8), Inches(1.45), Inches(2.8), Inches(1.5), '未回复', '169 人', '需二次跟进')
metric_card(s, Inches(9.9), Inches(1.45), Inches(2.5), Inches(1.5), '失败', '19 人', '记录原因')
# reinvest outcome bar chart (left)
chart_data = CategoryChartData()
chart_data.categories = ['联系达人', '未回复', '失败', '成功']
chart_data.add_series('人数', [206, 169, 19, 18])
chart = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(0.6), Inches(3.15), Inches(5.8), Inches(2.0), chart_data).chart
chart.has_legend = False
add_textbox(s, Inches(0.6), Inches(2.95), Inches(5.0), Inches(0.25), '2178+2190 同款复投结果', size=11, color=PINK_DK, bold=True)
add_textbox(s, Inches(0.6), Inches(5.15), Inches(5.8), Inches(0.45),
            '结论：复投成功率低（9%），82% 达人未回复，需二次跟进与专属 bonus 刺激。', size=11, color=INK, align=PP_ALIGN.LEFT)

# opportunity matrix (right)
add_rounded_rect(s, Inches(7.0), Inches(3.15), Inches(5.8), Inches(2.45), WHITE, PINK_MED, 0.08)
add_textbox(s, Inches(7.2), Inches(3.25), Inches(5.4), Inches(0.3), 'SKU 机会矩阵', size=12, color=PINK_DEEP, bold=True)
quads = [
    ('高 GMV · 高增长', '2178 / 2190 / 28173', '加大预算，优先复投'),
    ('高 GMV · 低增长', '2722 / 2189', '维稳，挖掘老客复购'),
    ('低 GMV · 高增长', '测品款', '验证放量，关注 ROI'),
    ('低 GMV · 负增长', '2789 等', '减少新达人投放，挽回头部')
]
y = Inches(3.65)
for qtitle, items, action in quads:
    add_textbox(s, Inches(7.25), y, Inches(5.35), Inches(0.22), f'▪ {qtitle}: {items}', size=10, color=INK, bold=True)
    add_textbox(s, Inches(7.45), y+Inches(0.22), Inches(5.15), Inches(0.2), f'→ {action}', size=9.5, color=INK_SOFT)
    y += Inches(0.55)

# action list on bottom full width
add_rounded_rect(s, Inches(0.6), Inches(5.75), Inches(12.0), Inches(1.3), PINK, None, 0.08)
add_textbox(s, Inches(0.8), Inches(5.85), Inches(11.6), Inches(0.25), '下月行动重点', size=13, color=PINK_DEEP, bold=True)
actions = action_items[:4]
for i, act in enumerate(actions):
    act = re.sub(r'^\d+\.\s*', '', act)
    add_textbox(s, Inches(0.95), Inches(6.15 + i*0.28), Inches(11.4), Inches(0.3), f'{i+1}. {act}',
                size=11, color=INK, align=PP_ALIGN.LEFT)

# Final thank you
s = prs.slides.add_slide(prs.slide_layouts[6])
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
set_shape_fill(bg, BG); set_shape_line(bg, None)
add_bow(s, 6.67, 2.4, 1.5)
add_textbox(s, Inches(0), Inches(3.6), Inches(13.333), Inches(0.8), '感谢聆听',
            size=40, color=PINK_DEEP, bold=True, align=PP_ALIGN.CENTER)
add_textbox(s, Inches(0), Inches(4.5), Inches(13.333), Inches(0.5), 'Dlooda 8月月度汇报 · 汇报人：余慧玲',
            size=16, color=INK_SOFT, align=PP_ALIGN.CENTER)

prs.save(OUT)
print('SAVED', OUT, 'slides=', len(prs.slides._sldIdLst))
