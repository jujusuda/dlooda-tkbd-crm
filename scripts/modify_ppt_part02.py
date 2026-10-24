# -*- coding: utf-8 -*-
"""在现有 PPT 上原地重做 Part 02 的 4 个 SKU 页（28173 / 2189 / 2789 / 2757）
- 数据 100% 以用户 PPT 为准，不增删改
- 保留原文件的粉色标题栏 / 蝴蝶结 / Part 标签 / 品牌字体
- 4 页 4 种版式：增长链路 / 问题诊断 / 三段论断 / 对标验证
"""
import shutil, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_SHAPE_TYPE
from pptx.oxml.ns import qn

SRC = r"E:/xwechat_files/wxid_od6e7r1klxs422_54c2/msg/file/2026-09/余慧玲8月月度汇报.pptx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Dlooda_8月月度汇报_终版.pptx")

# ---------------- palette（沿用原 PPT 品牌色）----------------
BG       = RGBColor(0xFF,0xF6,0xF9)
PINK     = RGBColor(0xFC,0xD5,0xE3)
PINK_MED = RGBColor(0xF5,0xA0,0xBC)
PINK_DK  = RGBColor(0xE8,0x79,0xA6)
PINK_DEEP= RGBColor(0xC9,0x4F,0x82)
PINK_PALE= RGBColor(0xFC,0xEA,0xF1)
WHITE    = RGBColor(0xFF,0xFF,0xFF)
INK      = RGBColor(0x4A,0x3D,0x42)
INK_SOFT = RGBColor(0x7A,0x6A,0x70)
GREEN    = RGBColor(0x4C,0xAF,0x50)
RED      = RGBColor(0xE5,0x4C,0x4C)
GRAY     = RGBColor(0xB8,0xAE,0xB2)
GOLD     = RGBColor(0xE0,0xA8,0x3C)
BLUE     = RGBColor(0x7C,0x9C,0xD8)
FONT = "Microsoft YaHei"

prs = Presentation(SRC)

def set_run(run, size=None, bold=None, color=None):
    run.font.name = FONT
    if size is not None: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if color is not None: run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    for tag in ('a:ea','a:cs'):
        e = rPr.find(qn(tag))
        if e is None:
            e = rPr.makeelement(qn(tag), {}); rPr.append(e)
        e.set('typeface', FONT)

def add_rect(s, x, y, w, h, fill=None, line=None, line_w=0.75, radius=0.08):
    sp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(line_w)
    sp.shadow.inherit = False
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
        if ln.get('space_before') is not None: p.space_before = Pt(ln['space_before'])
        r = p.add_run(); r.text = ln['text']
        set_run(r, ln.get('size',12), ln.get('bold',False), ln.get('color',INK))
    return tb

def add_arrow(s, x, y, w, h, color=PINK_MED):
    sp = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x), Inches(y), Inches(w), Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb = color
    sp.line.fill.background(); sp.shadow.inherit = False
    return sp

def page_no(s, n):
    tb = s.shapes.add_textbox(Inches(12.40), Inches(7.05), Inches(0.80), Inches(0.35))
    tf = tb.text_frame
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.RIGHT
    r = p.add_run(); r.text = str(n); set_run(r, 9, False, GRAY)

def clear_content(slide):
    """删除内容区 shapes（含原页码，页码由 page_no 重新添加），保留标题栏区域（top<=1.05）"""
    for shp in list(slide.shapes):
        try:
            top = shp.top / 914400.0
        except Exception:
            continue
        if top <= 1.05:
            continue   # 标题栏/蝴蝶结/标题/Part 标签保留
        shp._element.getparent().remove(shp._element)

def clear_shape_text(slide):
    """清空非文本框形状（如粉色标题栏矩形）里的文本，避免标题重复"""
    for shp in slide.shapes:
        if shp.shape_type == MSO_SHAPE_TYPE.TEXT_BOX: continue
        if not shp.has_text_frame: continue
        if not shp.text_frame.text.strip(): continue
        tf = shp.text_frame
        for p in list(tf.paragraphs):
            for r in list(p.runs):
                r._r.getparent().remove(r._r)

def retitle(slide, title, subtitle):
    """更新标题栏里的标题 TextBox（仅限真正的文本框，top<1.05 且最宽）"""
    target = None
    for shp in slide.shapes:
        if shp.shape_type != MSO_SHAPE_TYPE.TEXT_BOX: continue
        if not shp.has_text_frame: continue
        try:
            top = shp.top / 914400.0
            w = shp.width / 914400.0
        except Exception:
            continue
        if top < 1.05 and w > 5:
            target = shp; break
    if target is None:
        return
    tf = target.text_frame; tf.word_wrap = True
    ps = list(tf.paragraphs)
    if not ps:
        return
    # 保留首个段落，删除其余
    for p in ps[1:]:
        p._p.getparent().remove(p._p)
    p0 = tf.paragraphs[0]
    for r in list(p0.runs):
        r._r.getparent().remove(r._r)
    p0.alignment = PP_ALIGN.LEFT
    r = p0.add_run(); r.text = title; set_run(r, 22, True, WHITE)
    if subtitle:
        p2 = tf.add_paragraph(); r2 = p2.add_run(); r2.text = subtitle
        set_run(r2, 11, False, PINK_PALE)

slides = list(prs.slides)

# =========================================================
# Slide 9 (idx 8) —— 28173：增长链路型
# =========================================================
s = slides[8]
clear_content(s)
clear_shape_text(s)
retitle(s, "SKU 28173 · 内容驱动增长", "高级感塑造 + 内容驱动：自然流量成为核心增长引擎")

# 视觉中心：核心增长结果（3 个大数字）
add_text(s, 0.70, 1.18, 12.0, 0.35,
         [dict(text="核心增长结果", size=13, bold=True, color=PINK_DEEP)])
results = [
    ("视频出单率", "23.91%", "31.70%", "▲ 7.79pp", GREEN),
    ("出单视频数", "33", "84", "▲ 51 条", GREEN),
    ("自然单占比", "60.7%", "81.6%", "▲ 20.9pp", GREEN),
]
cw = 3.85; gap = 0.22; x0 = 0.70
for i, (label, v7, v8, diff, col) in enumerate(results):
    x = x0 + i*(cw+gap)
    add_rect(s, x, 1.55, cw, 1.30, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_text(s, x, 1.62, cw, 0.30, [dict(text=label, size=11, bold=True, color=INK_SOFT, align=PP_ALIGN.CENTER)])
    add_text(s, x, 1.95, cw, 0.45, [
        dict(text=v7, size=13, bold=False, color=INK_SOFT),
        dict(text="  →  ", size=13, bold=False, color=INK),
        dict(text=v8, size=22, bold=True, color=PINK_DEEP)
    ], align=PP_ALIGN.CENTER)
    add_text(s, x, 2.48, cw, 0.30, [dict(text=diff, size=11, bold=True, color=col, align=PP_ALIGN.CENTER)])

# 增长链路：达人供给 → 内容产出 → 自然成交
add_text(s, 0.70, 3.02, 12.0, 0.35,
         [dict(text="增长链路：达人供给 → 内容产出 → 自然成交", size=13, bold=True, color=PINK_DEEP)])
chain = [
    ("① 达人供给", PINK_MED, ["寄样量 67 → 86（+19）", "履约率 88.1% → 90.7%", "达人出单率 23.88% → 26.74%"]),
    ("② 内容产出", PINK_DK, ["出单视频数 33 → 84", "视频出单率 23.91% → 31.70%", "内容供给与转化同步提升"]),
    ("③ 自然成交", PINK_DEEP, ["自然单占比 60.7% → 81.6%", "增长由内容自然流量驱动", "对达人带货力依赖降低"]),
]
cw2 = 3.55; gap2 = 0.30
for i, (title, col, bullets) in enumerate(chain):
    x = 0.70 + i*(cw2+gap2+0.42)
    add_rect(s, x, 3.40, cw2, 1.75, fill=WHITE, line=PINK, line_w=1, radius=0.08)
    add_rect(s, x, 3.40, cw2, 0.38, fill=col, line=None, radius=0.02)
    add_text(s, x, 3.45, cw2, 0.30, [dict(text=title, size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    add_text(s, x+0.15, 3.88, cw2-0.30, 1.20,
             [dict(text="•  " + b, size=9.5, bold=False, color=INK, space_after=4) for b in bullets])
    if i < 2:
        add_arrow(s, x + cw2 + 0.06, 4.13, 0.36, 0.28, PINK_MED)

# 底部策略
add_rect(s, 0.70, 5.40, 12.0, 1.05, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.95, 5.50, 11.5, 0.85, [
    dict(text="下一步 BD 动作", size=12, bold=True, color=PINK_DEEP, space_after=4),
    dict(text="保持高质量寄样节奏；优先复投已验证达人；持续放大自然流量表现好的内容。", size=11.5, bold=False, color=INK),
])
page_no(s, 10)

# =========================================================
# Slide 10 (idx 9) —— 2189：问题诊断型（复投低效）
# =========================================================
s = slides[9]
clear_content(s)
clear_shape_text(s)
retitle(s, "SKU 2189 · 复投效率诊断", "达人池在增加，但历史达人二次激活效果差，有效成交不足")

# 左侧：指标变化对比
add_text(s, 0.70, 1.18, 6.0, 0.35, [dict(text="指标变化：履约改善，但成交转弱", size=12, bold=True, color=PINK_DEEP)])
metrics = [
    ("寄样量", "33 → 38", "▲ 5", GREEN),
    ("履约率", "87.9% → 92.1%", "▲ 4.2pp", GREEN),
    ("达人出单率", "42.4% → 21.1%", "▼ 21.4pp", RED),
    ("视频出单率", "37.7% → 35.8%", "▼ 1.9pp", RED),
]
for i, (label, val, diff, col) in enumerate(metrics):
    y = 1.58 + i*0.62
    add_rect(s, 0.70, y, 5.90, 0.55, fill=WHITE, line=PINK, line_w=1, radius=0.06)
    add_text(s, 0.88, y+0.10, 1.55, 0.35, [dict(text=label, size=11, bold=True, color=INK)])
    add_text(s, 2.45, y+0.10, 1.95, 0.35, [dict(text=val, size=11, bold=False, color=INK_SOFT)])
    add_text(s, 4.45, y+0.10, 1.95, 0.35, [dict(text=diff, size=11, bold=True, color=col, align=PP_ALIGN.RIGHT)])

# 右侧：复投漏斗（视觉重点）
add_rect(s, 6.95, 1.18, 5.75, 2.98, fill=WHITE, line=RED, line_w=1.5, radius=0.08)
add_text(s, 7.15, 1.30, 5.35, 0.35,
         [dict(text="核心问题：复投几乎无效", size=13, bold=True, color=RED)])
# 大数字 4%
add_text(s, 7.15, 1.72, 2.30, 1.20,
         [dict(text="4%", size=52, bold=True, color=RED, align=PP_ALIGN.CENTER)])
add_text(s, 7.15, 2.92, 2.30, 0.35,
         [dict(text="复投成功率", size=11, bold=True, color=INK_SOFT, align=PP_ALIGN.CENTER)])
# 漏斗：35 → 1
add_text(s, 9.60, 1.78, 2.95, 0.45,
         [dict(text="复投达人  35 人", size=15, bold=True, color=INK)])
add_arrow(s, 9.60, 2.30, 0.30, 0.24, GRAY)
add_text(s, 9.60, 2.60, 2.95, 0.45,
         [dict(text="成功  1 人", size=15, bold=True, color=RED)])
add_arrow(s, 9.60, 3.12, 0.30, 0.24, GRAY)
add_text(s, 9.60, 3.42, 2.95, 0.45,
         [dict(text="未成功 24 · 观察中 10", size=11, bold=False, color=INK_SOFT)])

# 中部：关键发现（横向 3 条）
add_text(s, 0.70, 4.32, 12.0, 0.35, [dict(text="关键发现", size=12, bold=True, color=PINK_DEEP)])
findings = [
    ("寄样与履约在改善", "寄样 33→38、履约率 87.9%→92.1%，但达人出单率由 42.4% 降至 21.1%。"),
    ("历史达人二次激活效果有限", "35 名复投达人仅 1 人成功，二次合作几乎不产生有效成交。"),
    ("问题不是没有达人，是有效成交达人不足", "达人池在扩大，但能真正带来成交的达人规模不足。"),
]
for i, (t, d) in enumerate(findings):
    x = 0.70 + i*3.98
    add_rect(s, x, 4.70, 3.78, 1.15, fill=PINK_PALE, line=PINK_MED, line_w=1, radius=0.08)
    add_text(s, x+0.18, 4.80, 3.42, 0.95, [
        dict(text=t, size=10.5, bold=True, color=PINK_DEEP, space_after=3),
        dict(text=d, size=9.5, bold=False, color=INK),
    ])

# 底部策略
add_rect(s, 0.70, 6.05, 12.0, 0.95, fill=WHITE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.95, 6.13, 11.5, 0.80, [
    dict(text="下一步 BD 动作", size=11.5, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="减少低效复投；优先筛选历史高产达人；对于表现一般的达人，可向 2178 / 2190 等成熟 Work Pants 进行产品迁移。", size=10.5, bold=False, color=INK),
])
page_no(s, 11)

# =========================================================
# Slide 11 (idx 10) —— 2789：问题 → 判断 → 策略（供给收缩）
# =========================================================
s = slides[10]
clear_content(s)
clear_shape_text(s)
retitle(s, "SKU 2789 · 为什么需要控制寄样规模？", "样品承接偏弱 + 达人质量承压，当前不适合大规模铺量")

# 三栏：问题 / 判断 / 策略
# 左：问题（数据信号）
add_rect(s, 0.70, 1.30, 3.75, 3.55, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_rect(s, 0.70, 1.30, 3.75, 0.42, fill=PINK_MED, line=None, radius=0.02)
add_text(s, 0.70, 1.36, 3.75, 0.32, [dict(text="问题 · 数据信号", size=12.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
signals = [
    ("寄样量", "53 → 32", "▼ 21", RED),
    ("履约达人", "45 → 23", "▼ 22", RED),
    ("履约率", "84.9% → 71.9%", "▼ 13pp", RED),
    ("月度达人总出单", "100 → 37", "▼ 63", RED),
    ("达人出单率", "30% → 33.3%", "▲ 3.8pp", GREEN),
    ("4★ 达人占比", "9.1% → 21.9%", "▲ 12.8pp", GREEN),
]
for i, (label, val, diff, col) in enumerate(signals):
    y = 1.88 + i*0.48
    add_text(s, 0.90, y, 1.55, 0.30, [dict(text=label, size=9.5, bold=False, color=INK_SOFT)])
    add_text(s, 2.40, y, 1.35, 0.30, [dict(text=val, size=9.5, bold=True, color=INK)])
    add_text(s, 3.75, y, 0.60, 0.30, [dict(text=diff, size=9.5, bold=True, color=col, align=PP_ALIGN.RIGHT)])

# 中：判断（3 条）
add_rect(s, 4.68, 1.30, 3.75, 3.55, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_rect(s, 4.68, 1.30, 3.75, 0.42, fill=PINK_DK, line=None, radius=0.02)
add_text(s, 4.68, 1.36, 3.75, 0.32, [dict(text="判断", size=12.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
add_text(s, 4.88, 1.88, 3.35, 2.85, [
    dict(text="① 样品承接偏弱", size=11, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="寄样量与履约达人明显下降，履约率由 84.9% 降至 71.9%。", size=9.5, bold=False, color=INK, space_after=9),
    dict(text="② 达人质量整体承压", size=11, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="达人池整体质量不足，低质量达人占比较高，高质量达人规模仍有限。", size=9.5, bold=False, color=INK, space_after=9),
    dict(text="③ 当前不适合大规模扩量", size=11, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="继续扩大寄样可能带来更多低效样品投入，现阶段以小幅、精准寄样为主。", size=9.5, bold=False, color=INK),
])

# 右：结论（特别注意：不否定这个品）
add_rect(s, 8.66, 1.30, 4.05, 3.55, fill=PINK_PALE, line=PINK_MED, line_w=1.25, radius=0.08)
add_text(s, 8.66, 1.42, 4.05, 0.32, [dict(text="结论", size=12.5, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER)])
add_text(s, 8.88, 1.85, 3.60, 2.85, [
    dict(text="品类 / 样品承接偏弱", size=11, bold=True, color=INK, align=PP_ALIGN.CENTER, space_after=6),
    dict(text="＋", size=14, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER, space_after=6),
    dict(text="达人质量不足", size=11, bold=True, color=INK, align=PP_ALIGN.CENTER, space_after=10),
    dict(text="↓", size=14, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER, space_after=6),
    dict(text="控制寄样规模", size=13, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER, space_after=6),
    dict(text="↓", size=14, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER, space_after=6),
    dict(text="精准筛选高匹配达人", size=13, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER, space_after=10),
    dict(text="※ 达人出单率由 30% 提升至 33.3%，品本身带货效率未下降。", size=9, bold=False, color=INK_SOFT),
])

# 底部策略
add_rect(s, 0.70, 5.12, 12.01, 0.95, fill=WHITE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.95, 5.20, 11.5, 0.80, [
    dict(text="下一步 BD 动作", size=11.5, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="控制寄样规模，提高达人筛选门槛；优先高匹配、高潜力达人；重点挽回历史出单达人，降低低效样品投入。", size=10.5, bold=False, color=INK),
])
page_no(s, 12)

# =========================================================
# Slide 12 (idx 11) —— 2757：新品测款 / 对标 2722
# =========================================================
s = slides[11]
clear_content(s)
clear_shape_text(s)
retitle(s, "SKU 2757 · 秋季新品测款", "对标成熟款 2722，验证秋季新品潜力（有潜力 · 继续验证 · 小幅测试）")

# 左：测款结果
add_rect(s, 0.70, 1.28, 3.30, 3.30, fill=WHITE, line=PINK, line_w=1, radius=0.08)
add_rect(s, 0.70, 1.28, 3.30, 0.40, fill=PINK_MED, line=None, radius=0.02)
add_text(s, 0.70, 1.33, 3.30, 0.30, [dict(text="测款结果", size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
add_text(s, 0.90, 1.82, 2.90, 2.60, [
    dict(text="寄样量", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="35", size=18, bold=True, color=PINK_DEEP, space_after=10),
    dict(text="履约率", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="82.9%", size=18, bold=True, color=PINK_DEEP, space_after=10),
    dict(text="达人出单率", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="22.9%", size=18, bold=True, color=PINK_DEEP, space_after=10),
    dict(text="视频出单率", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="25.6%", size=18, bold=True, color=PINK_DEEP),
])

# 中：2757 vs 2722 对标（页面视觉中心）
add_rect(s, 4.20, 1.28, 4.70, 3.30, fill=WHITE, line=PINK_DEEP, line_w=1.5, radius=0.08)
add_rect(s, 4.20, 1.28, 4.70, 0.40, fill=PINK_DEEP, line=None, radius=0.02)
add_text(s, 4.20, 1.33, 4.70, 0.30, [dict(text="2757 vs 2722 核心指标对标", size=12.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
benchmarks = [
    ("履约率", "82.2%", "82.9%", "已接近成熟款", GREEN),
    ("达人出单率", "26.7%", "22.9%", "暂时略低于成熟款", GOLD),
    ("视频出单率", "32.9%", "25.6%", "仍需继续验证", GOLD),
]
add_text(s, 4.40, 1.78, 4.30, 0.28, [
    dict(text="指标", size=9.5, bold=True, color=INK_SOFT),
    dict(text="2722", size=9.5, bold=True, color=INK_SOFT, align=PP_ALIGN.CENTER),
    dict(text="2757", size=9.5, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER),
])
for i, (label, v2722, v2757, note, col) in enumerate(benchmarks):
    y = 2.12 + i*0.80
    add_rect(s, 4.35, y, 4.40, 0.70, fill=PINK_PALE if i == 0 else WHITE, line=PINK, line_w=0.75, radius=0.06)
    add_text(s, 4.50, y+0.07, 1.30, 0.28, [dict(text=label, size=10.5, bold=True, color=INK)])
    add_text(s, 5.85, y+0.07, 0.90, 0.28, [dict(text=v2722, size=10.5, bold=False, color=INK_SOFT, align=PP_ALIGN.CENTER)])
    add_arrow(s, 6.82, y+0.22, 0.32, 0.24, PINK_MED)
    add_text(s, 7.20, y+0.07, 0.95, 0.28, [dict(text=v2757, size=11.5, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER)])
    add_text(s, 4.50, y+0.38, 3.90, 0.26, [dict(text=note, size=9, bold=True, color=col)])

# 右：当前判断
add_rect(s, 9.12, 1.28, 3.60, 3.30, fill=PINK_PALE, line=PINK_MED, line_w=1.25, radius=0.08)
add_text(s, 9.12, 1.40, 3.60, 0.30, [dict(text="当前判断", size=12.5, bold=True, color=PINK_DEEP, align=PP_ALIGN.CENTER)])
add_text(s, 9.34, 1.85, 3.16, 2.60, [
    dict(text="履约能力", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="✅ 已接近成熟款", size=12, bold=True, color=GREEN, space_after=10),
    dict(text="达人带货能力", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="🟡 暂时略低于成熟款", size=12, bold=True, color=GOLD, space_after=10),
    dict(text="视频转化", size=10, bold=False, color=INK_SOFT, space_after=2),
    dict(text="🟡 仍需继续验证", size=12, bold=True, color=GOLD, space_after=10),
    dict(text="结论：有潜力、继续验证、小幅测试", size=10.5, bold=True, color=PINK_DEEP),
])

# 底部：下一步验证路径（5 步流程）
add_text(s, 0.70, 4.72, 12.0, 0.32, [dict(text="下一步验证路径", size=12, bold=True, color=PINK_DEEP)])
steps = ["到货", "2722 高质量达人\n优先测试", "观察出单率 /\n视频转化", "接近 2722 表现", "扩大寄样"]
sw = 2.28; sg = 0.16
for i, st in enumerate(steps):
    x = 0.70 + i*(sw+sg)
    col = PINK_DEEP if i == len(steps)-1 else PINK_MED
    add_rect(s, x, 5.08, sw, 0.72, fill=col, line=None, radius=0.06)
    add_text(s, x, 5.16, sw, 0.60, [dict(text=st, size=9.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)])
    if i < len(steps)-1:
        add_arrow(s, x + sw + 0.01, 5.32, 0.14, 0.22, PINK)

# 最终策略
add_rect(s, 0.70, 5.98, 12.01, 0.85, fill=WHITE, line=PINK_MED, line_w=1, radius=0.08)
add_text(s, 0.95, 6.06, 11.5, 0.70, [
    dict(text="下一步 BD 动作", size=11.5, bold=True, color=PINK_DEEP, space_after=3),
    dict(text="到货后继续测款，优先邀请 2722 已验证的优质达人；若 2757 核心指标逐步接近 2722，再进入扩大寄样阶段。", size=10.5, bold=False, color=INK),
])
page_no(s, 13)

# =========================================================
# 顺手修复 Part 03 矩阵页（slide 16）：象限标签压住 SKU 名
# 原布局「机会/瘦狗」标签 y=5.59 与 SKU「2789」(y=5.50)、「2178」(y=5.60) 重叠
# =========================================================
s16 = slides[15]
for shp in s16.shapes:
    if not shp.has_text_frame:
        continue
    t = shp.text_frame.text.strip()
    try:
        l, tp = shp.left / 914400.0, shp.top / 914400.0
    except Exception:
        continue
    if t == '2789' and abs(l - 1.05) < 0.1 and abs(tp - 5.50) < 0.1:
        shp.top = Inches(4.75)      # 上移，避开「机会」标签
    if t == '2178' and abs(l - 6.09) < 0.1 and abs(tp - 5.60) < 0.1:
        shp.top = Inches(5.12)      # 上移，避开「瘦狗」标签

prs.save(OUT)
print("SAVED:", OUT, "slides:", len(prs.slides._sldIdLst))
