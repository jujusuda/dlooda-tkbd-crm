#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a pink-healing / Hello-Kitty-themed PPT from the Dlooda monthly report HTML."""
import os, re
from bs4 import BeautifulSoup
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

ROOT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32"
HTML = os.path.join(ROOT, "monthly-report-2026-07-15_08-15.html")
OUT  = os.path.join(ROOT, "Dlooda_8月月度汇报.pptx")

# ---------------- theme ----------------
BG        = RGBColor(0xFF, 0xF6, 0xF9)   # very light pink
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
PINK      = RGBColor(0xE8, 0x79, 0xA6)   # primary pink (site badge)
PINK_DK   = RGBColor(0xC9, 0x4F, 0x82)
PINK_SOFT = RGBColor(0xF4, 0xA6, 0xC0)
PALE      = RGBColor(0xFB, 0xD3, 0xE0)
BORDER    = RGBColor(0xF3, 0xC9, 0xD8)
INK       = RGBColor(0x5C, 0x4A, 0x52)   # warm dark text
INK_SOFT  = RGBColor(0x9A, 0x86, 0x8C)
ROW_ALT   = RGBColor(0xFF, 0xF0, 0xF5)
UP        = RGBColor(0x4F, 0xAE, 0x7E)   # green up
DOWN      = RGBColor(0xE2, 0x6D, 0x8A)   # pink-red down
FONT      = "Microsoft YaHei"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]

# ---------------- helpers ----------------
def set_font(run, size=None, bold=None, color=None, name=FONT):
    if name: run.font.name = name
    if size is not None: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if color is not None: run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {}); rPr.append(el)
        el.set("typeface", name)

def bg(slide, color=BG):
    f = slide.background.fill
    f.solid(); f.fore_color.rgb = color

def rect(slide, x, y, w, h, fill=None, line=None, line_w=None, shape=MSO_SHAPE.RECTANGLE, round_=None):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    if round_ is not None:
        try: sp.adjustments[0] = round_
        except Exception: pass
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line; sp.line.width = line_w or Pt(1)
    sp.shadow.inherit = False
    return sp

def txt(slide, x, y, w, h, text, size=12, color=INK, bold=False, align=PP_ALIGN.LEFT,
        anchor=MSO_ANCHOR.TOP, wrap=True, font=FONT):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = Pt(2); tf.margin_right = Pt(2); tf.margin_top = Pt(1); tf.margin_bottom = Pt(1)
    lines = text.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run(); r.text = ln
        set_font(r, size=size, bold=bold, color=color, name=font)
    return tb

def bow(slide, x, y, s=0.32):
    """Minimal Hello-Kitty bow: two lobes + center knot."""
    s = Inches(s)
    c = PINK
    rect(slide, x, y+s*0.35, s*0.22, s*0.3, fill=c, shape=MSO_SHAPE.OVAL)               # left lobe
    rect(slide, x+s*0.78, y+s*0.35, s*0.22, s*0.3, fill=c, shape=MSO_SHAPE.OVAL)        # right lobe
    rect(slide, x+s*0.4, y+s*0.42, s*0.2, s*0.16, fill=PINK_DK, shape=MSO_SHAPE.OVAL)   # knot

def title_band(slide, title, sub=None, kicker=None):
    rect(slide, 0, 0, SW, Inches(1.0), fill=PINK)
    rect(slide, 0, Inches(1.0), SW, Pt(3), fill=PALE)
    bow(slide, Inches(0.35), Inches(0.28), 0.42)
    txt(slide, Inches(0.95), Inches(0.12), Inches(11.5), Inches(0.55), title,
        size=26, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    if kicker:
        txt(slide, Inches(0.97), Inches(0.62), Inches(11.5), Inches(0.32), kicker,
            size=12, color=PALE, anchor=MSO_ANCHOR.MIDDLE)
    if sub:
        txt(slide, Inches(9.4), Inches(0.12), Inches(3.7), Inches(0.8), sub,
            size=12, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.RIGHT)

def new_slide():
    s = prs.slides.add_slide(BLANK)
    bg(s); return s

# ---- table rendering ----
def color_of(cell_text):
    t = cell_text.strip()
    if t.startswith("▲") or t.startswith("+"): return UP
    if t.startswith("▼") or t.startswith("-"): return DOWN
    return None

def add_table(slide, x, y, w, rows, fontsize=9, header_fill=PINK, col_widths=None,
              first_col_bold=True, row_h=None, align=None):
    nrows = len(rows); ncols = max(len(r) for r in rows)
    # normalize
    rows = [r + [""]*(ncols-len(r)) for r in rows]
    gt = slide.shapes.add_table(nrows, ncols, x, y, w, Inches(0.3*nrows)).table
    if col_widths and len(col_widths) == ncols:
        for i, cw in enumerate(col_widths):
            gt.columns[i].width = int(cw)
    else:
        ew = int(w // ncols)
        for i in range(ncols):
            gt.columns[i].width = ew
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = gt.cell(ri, ci)
            cell.margin_left = Pt(3); cell.margin_right = Pt(3)
            cell.margin_top = Pt(1); cell.margin_bottom = Pt(1)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            if ri == 0:
                cell.fill.solid(); cell.fill.fore_color.rgb = header_fill
            else:
                cell.fill.solid()
                cell.fill.fore_color.rgb = WHITE if ri % 2 else ROW_ALT
            tf = cell.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]
            p.alignment = (align[ci] if align and ci < len(align) else
                           (PP_ALIGN.LEFT if ci == 0 else PP_ALIGN.CENTER))
            r = p.add_run(); r.text = str(val)
            c = color_of(val) if ri > 0 else WHITE
            set_font(r, size=fontsize, bold=(ri == 0 or (first_col_bold and ci == 0)),
                     color=(c if c else (WHITE if ri == 0 else INK)))
            if row_h: gt.rows[ri].height = row_h
    return gt

def bullets(slide, x, y, w, h, items, size=13, color=INK, gap=6, marker="•", mcolor=PINK):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        rm = p.add_run(); rm.text = marker + " "
        set_font(rm, size=size, bold=True, color=mcolor)
        rt = p.add_run(); rt.text = it
        set_font(rt, size=size, color=color)
    return tb

def card(slide, x, y, w, h, big, label, delta=None, dcolor=None, sub=None):
    rect(slide, x, y, w, h, fill=WHITE, line=BORDER, line_w=Pt(1.25),
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.10)
    rect(slide, x, y, Inches(0.10), h, fill=PINK)
    txt(slide, x+Inches(0.22), y+Inches(0.14), w-Inches(0.35), Inches(0.4), label,
        size=12, color=INK_SOFT, bold=True)
    txt(slide, x+Inches(0.22), y+Inches(0.46), w-Inches(0.35), Inches(0.6), big,
        size=30, color=PINK_DK, bold=True)
    if delta:
        txt(slide, x+Inches(0.22), y+h-Inches(0.42), w-Inches(0.35), Inches(0.36), delta,
            size=12, color=(dcolor or INK_SOFT), bold=True)
    if sub:
        txt(slide, x+Inches(0.22), y+h-Inches(0.74), w-Inches(0.35), Inches(0.3), sub,
            size=9, color=INK_SOFT)

# ---------------- parse HTML into tree ----------------
soup = BeautifulSoup(open(HTML, encoding="utf-8").read(), "html.parser")
sections = []   # top-level {title, level, subs:[{title,level,tables,leads,notes}]}
cur = None; sub = None
for el in soup.find_all(["h2", "h3", "h4", "h5", "h6", "table", "p"]):
    tag = el.name
    if tag in ("h2","h3","h4","h5","h6"):
        title = el.get_text(" ", strip=True)
        lvl = int(tag[1])
        if lvl <= 3:
            cur = {"title": title, "level": lvl, "subs": []}
            sections.append(cur); sub = None
        else:
            if cur is None:
                cur = {"title": "(root)", "level": 2, "subs": []}; sections.append(cur)
            sub = {"title": title, "level": lvl, "tables": [], "leads": [], "notes": []}
            cur["subs"].append(sub)
    elif tag == "table" and cur is not None:
        rows = []
        for tr in el.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th","td"])]
            if cells: rows.append(cells)
        if rows:
            if sub is not None: sub["tables"].append(rows)
            else: cur.setdefault("tables", []).append(rows)
    elif tag == "p" and cur is not None:
        cls = el.get("class"); c = cls[0] if cls else ""
        t = el.get_text(" ", strip=True)
        if not t: continue
        if sub is not None:
            if c == "lead": sub["leads"].append(t)
            elif c in ("note","sub"): sub["notes"].append(t)
            else: sub["leads"].append(t)
        else:
            cur.setdefault("leads", []).append(t)

def find_section(kw):
    for s in sections:
        if kw in s["title"]: return s
    return None

def find_sub(section, kw):
    if not section: return None
    for s in section["subs"]:
        if kw in s["title"]: return s
    return None

def t0(sub):  # first table of a sub
    return sub["tables"][0] if sub and sub["tables"] else None

# ================= RENDER =================
# Slide 1 — Cover
s = new_slide()
rect(s, 0, 0, SW, SH, fill=PINK)
rect(s, 0, Inches(5.6), SW, Inches(1.9), fill=WHITE)
bow(s, Inches(5.95), Inches(1.5), 1.0)
txt(s, Inches(0), Inches(2.5), SW, Inches(0.8), "🎀  Dlooda TKBD", size=30, color=WHITE,
    bold=True, align=PP_ALIGN.CENTER)
txt(s, Inches(0), Inches(3.3), SW, Inches(1.1), "8 月月度汇报", size=46, color=WHITE,
    bold=True, align=PP_ALIGN.CENTER)
txt(s, Inches(0), Inches(5.75), SW, Inches(0.5), "汇报人：余慧玲", size=18, color=PINK_DK,
    bold=True, align=PP_ALIGN.CENTER)
txt(s, Inches(0), Inches(6.25), SW, Inches(0.5), "统计区间：2026-07-15 ~ 2026-08-15", size=15,
    color=INK_SOFT, align=PP_ALIGN.CENTER)

# Slide 2 — TOC
s = new_slide(); title_band(s, "目录", kicker="CONTENTS")
toc = [
    "整体数据变化 · 核心 4 项 & 一页结论",
    "报告期 12 个寄样 SKU 汇总",
    "订单变化瀑布图（谁在涨 / 谁在跌）",
    "六大爆款深度分析：2178 / 2190 / 2722 / 28173 / 2189 / 2789",
    "2178 + 2190 合并分析（Work Pants 双爆款）",
    "达人亮点与流失预警",
    "全 SKU 达人效率榜 & 订单拆解",
    "SKU 接力关系 · 机会矩阵 · 复投关系汇总",
    "下月行动",
]
y = Inches(1.5)
for i, t in enumerate(toc):
    rect(s, Inches(0.9), y, Inches(0.42), Inches(0.42), fill=PINK, shape=MSO_SHAPE.OVAL)
    txt(s, Inches(0.9), y, Inches(0.42), Inches(0.42), str(i+1), size=14, color=WHITE,
        bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    txt(s, Inches(1.5), y-Inches(0.02), Inches(10.5), Inches(0.46), t, size=16, color=INK,
        bold=True, anchor=MSO_ANCHOR.MIDDLE)
    y += Inches(0.58)

# Slide 3 — Core 4 + 一页结论
s = new_slide(); title_band(s, "整体数据变化 · 核心 4 项", sub="2026-07-15 ~ 08-15")
core = [
    ("394", "寄样（12 SKU，剔撤退）", "▼ 40  (▼ 9%)", DOWN, "全部 12 个 SKU 8月寄样"),
    ("22.8%", "转化（达人出单率）", "▼ 6.3pp", DOWN, "出单达人 / 履约达人"),
    ("6,673", "订单（月度达人总出单）", "▲ 1,881  (▲ 39%)", UP, "6 个常卖 SKU 合计"),
    ("66 人", "有效达人（出单达人）", "▼ 20  (▼ 23%)", DOWN, "全部 12 个 SKU"),
]
x = Inches(0.6); cw = Inches(2.95); gap = Inches(0.18)
for c in core:
    card(s, x, Inches(1.35), cw, Inches(1.7), c[0], c[1], c[2], c[3], c[4])
    x += cw + gap
one = find_sub(find_section("整体数据"), "一页结论")
items = [
    "整体寄样 394 件（环比 ▼9%）；达人出单率 29.1%→22.8%（▼6.3pp）。",
    "6 个常卖 SKU 月度总出单 ▲1,881（▲39%）；有效达人 ▼15。",
    "增长主力：2189(+533)、28173(+519)、2178(+479)、2190(+270)、2722(+131)；下滑：2789(-51)。",
    "新达人占比高稀释整体出单率；老达人出单率明显高于新达人，头部维护与定向复投是效率关键。",
    "不同 SKU 复投成功率仅 9%；同产品复投（2178+2190）联系 206 位已出单达人，成功 18 / 失败 19 / 未回复 169。",
    "下月重点：① 复投只投已出单达人 ② 2178/2190 合并策略 ③ 新达人先测品再放量 ④ 第 10–15 天催更。",
]
rect(s, Inches(0.6), Inches(3.4), Inches(12.1), Inches(3.5), fill=WHITE, line=BORDER,
     line_w=Pt(1.25), shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.04)
txt(s, Inches(0.85), Inches(3.55), Inches(11.6), Inches(0.4), "📌 一页结论（可直接放进汇报开头）",
    size=15, color=PINK_DK, bold=True)
bullets(s, Inches(0.95), Inches(4.05), Inches(11.5), Inches(2.8), items, size=13, gap=7)

# Slide 4 — 12 SKU summary
s = new_slide(); title_band(s, "报告期 12 个寄样 SKU 汇总", sub="已剔除撤退款")
t = t0(find_sub(find_section("整体数据"), "报告期 12"))
if t:
    add_table(s, Inches(0.5), Inches(1.3), Inches(12.3), t, fontsize=11,
              col_widths=[Inches(1.3),Inches(1.1),Inches(1.2),Inches(1.2),Inches(1.3),
                          Inches(1.4),Inches(2.0),Inches(1.8)],
              align=[PP_ALIGN.LEFT]+[PP_ALIGN.CENTER]*7)

# Slide 5 — Waterfall
s = new_slide(); title_band(s, "订单变化瀑布图", sub="谁在涨 / 谁在跌")
labels = ["2178","2190","2722","2189","28173","2789"]
vals   = [479, 270, 131, 533, 519, -51]
total  = 1881
x0 = Inches(1.2); top = Inches(1.7); chart_w = Inches(10.9); chart_h = Inches(4.6)
base_y = top + chart_h
maxv = 1881
def y_of(v): return base_y - Emu(int((v/maxv) * chart_h))
bw = Emu(int(chart_w / (len(vals)+1.5)))
cum = 0
prev_top = top
for i, v in enumerate(vals):
    x = x0 + Emu(int(i * (chart_w/(len(vals)+0.5))))
    if v >= 0:
        y_top = y_of(cum+v); y_bot = y_of(cum)
    else:
        y_top = y_of(cum); y_bot = y_of(cum+v)
    rect(s, x, y_top, bw, y_bot - y_top, fill=(UP if v>=0 else DOWN))
    txt(s, x, y_top - Inches(0.32), bw, Inches(0.3), ("+" if v>=0 else "")+str(v),
        size=11, color=(UP if v>=0 else DOWN), bold=True, align=PP_ALIGN.CENTER)
    txt(s, x, base_y + Inches(0.05), bw, Inches(0.3), labels[i], size=11, color=INK,
        bold=True, align=PP_ALIGN.CENTER)
    # connector
    if i > 0:
        rect(s, x - Emu(int(chart_w/(len(vals)+0.5))) + bw, prev_top, Emu(int(chart_w/(len(vals)+0.5))) - bw, Pt(1.5), fill=INK_SOFT)
    prev_top = y_top if v>=0 else y_bot
    cum += v
# total bar
xt = x0 + Emu(int(len(vals) * (chart_w/(len(vals)+0.5))))
rect(s, xt, y_of(total), bw, base_y - y_of(total), fill=PINK_DK)
txt(s, xt, y_of(total) - Inches(0.32), bw, Inches(0.3), "+"+str(total), size=11, color=PINK_DK,
    bold=True, align=PP_ALIGN.CENTER)
txt(s, xt, base_y + Inches(0.05), bw, Inches(0.3), "合计", size=11, color=INK, bold=True,
    align=PP_ALIGN.CENTER)
txt(s, Inches(1.2), Inches(6.5), Inches(11), Inches(0.5),
    "结论：8月 6 个常卖款月度订单合计 ▲1,881 件。增长主力 2189(+533)、28173(+519)、2178(+479)、2190(+270)、2722(+131)；仅 2789(-51) 下滑，需重点复盘头部达人流失或新达人占比过高。",
    size=12, color=INK)

def render_sku(slide, name, part, sec):
    """part='compare' or 'profile'. Title band is drawn by caller."""
    if part == "compare":
        chg = find_sub(sec, "变化原因")
        lead = chg["leads"][0] if chg and chg["leads"] else ""
        rect(slide, Inches(0.6), Inches(1.25), Inches(12.1), Inches(0.95), fill=WHITE, line=BORDER,
             line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.05)
        txt(slide, Inches(0.8), Inches(1.33), Inches(11.7), Inches(0.8),
            "📊 变化原因：" + lead, size=12, color=INK, anchor=MSO_ANCHOR.MIDDLE)
        # 4 tables grid
        subs = [("环比上月明细", find_sub(sec,"环比")), ("同品类对标", find_sub(sec,"同品类")),
                ("语言结构变化", find_sub(sec,"语言")), ("通过率变化", find_sub(sec,"通过率")),
                ("新老达人占比", find_sub(sec,"新老"))]
        pos = [(Inches(0.6),Inches(2.45),Inches(6.0)), (Inches(6.75),Inches(2.45),Inches(6.0)),
               (Inches(0.6),Inches(4.45),Inches(6.0)), (Inches(6.75),Inches(4.45),Inches(6.0)),
               (Inches(0.6),Inches(6.15),Inches(6.0))]
        for (lbl, sub), (px,py,pw) in zip(subs, pos[:len(subs)]):
            if sub and sub["tables"]:
                t = sub["tables"][0]
                txt(slide, px, py-Inches(0.28), pw, Inches(0.26), lbl, size=12, color=PINK_DK, bold=True)
                add_table(slide, px, py, pw, t, fontsize=8.5,
                          col_widths=[int(pw*0.30), int(pw*0.24), int(pw*0.24), int(pw*0.22)] if len(t[0])==4 else None)
    else:
        prof = find_sub(sec, "画像")
        if prof and prof["tables"]:
            txt(slide, Inches(0.6), Inches(1.25), Inches(6), Inches(0.26), "达人画像（8月 vs 7月）",
                size=12, color=PINK_DK, bold=True)
            grids = [(Inches(0.6),Inches(1.55)), (Inches(3.35),Inches(1.55)),
                    (Inches(6.1),Inches(1.55)), (Inches(8.85),Inches(1.55))]
            for t, (gx,gy) in zip(prof["tables"][:4], grids):
                add_table(slide, gx, gy, Inches(2.45), t, fontsize=7.5,
                          col_widths=[Inches(0.95),Inches(0.5),Inches(0.5),Inches(0.5)])
        vid = find_sub(sec, "视频端")
        if vid and vid["tables"]:
            txt(slide, Inches(0.6), Inches(4.1), Inches(6), Inches(0.26), "视频端转化分析（逐 SKU）",
                size=12, color=PINK_DK, bold=True)
            add_table(slide, Inches(0.6), Inches(4.38), Inches(8.6), vid["tables"][0], fontsize=8,
                      col_widths=[Inches(2.5),Inches(2.0),Inches(2.0),Inches(2.1)])
        reinv = find_sub(sec, "复投")
        note = ""
        if reinv:
            note = "；".join(reinv["notes"]) if reinv["notes"] else "同产品复投数据整理中（留白）。"
        rect(slide, Inches(9.35), Inches(4.38), Inches(3.75), Inches(2.7), fill=WHITE, line=BORDER,
             line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.05)
        txt(slide, Inches(9.55), Inches(4.5), Inches(3.4), Inches(2.5),
            "🔁 同产品复投：\n" + note, size=11, color=INK_SOFT, anchor=MSO_ANCHOR.TOP)

# Slides 6..17 — 6 SKUs x 2
order = ["2178","2190","2722","28173","2189","2789"]
sku_secs = [sec for sec in sections if sec["title"].startswith("SKU ") and sec["title"].split()[1] in order]
sku_secs.sort(key=lambda s: order.index(s["title"].split()[1]))
for sec in sku_secs:
    name = sec["title"].split()[1]
    for part in ("compare","profile"):
        s = new_slide(); title_band(s, "SKU "+name+" 深度分析",
                                    sub=("对比类指标" if part=="compare" else "画像 / 视频 / 复投"))
        render_sku(s, name, part, sec)

# ---------- Synthesis sections ----------
# 2178 + 2190 合并分析
sec = find_section("2178 + 2190")
if sec:
    s = new_slide(); title_band(s, "2178 + 2190 合并分析", sub="Work Pants 双爆款")
    chg = find_sub(sec, "共同变化原因")
    lead = chg["leads"][0] if chg and chg["leads"] else ""
    rect(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(1.5), fill=WHITE, line=BORDER, line_w=Pt(1.25),
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.04)
    txt(s, Inches(0.85), Inches(1.45), Inches(11.6), Inches(1.25), "📊 共同变化原因："+lead,
        size=13, color=INK, anchor=MSO_ANCHOR.MIDDLE)
    # combined metrics cards
    comb = [("合计寄样", "128 件", "▲ 68"), ("月度达人总出单", "3,544 件", "▲ 749"),
            ("2178 自然单占比", "79%", "内容自带成交"), ("2190 自然单占比", "82%", "内容自带成交")]
    x = Inches(0.6)
    for c in comb:
        card(s, x, Inches(3.05), Inches(2.95), Inches(1.5), c[1], c[0], c[2], PINK_DK)
        x += Inches(3.13)
    strat = find_sub(sec, "合并下月策略")
    items = strat["leads"] if strat else []
    if not items:
        items = ["把 2178/2190 作为 Work Pants 组合款统一招募：同一批达人可两版都推，提升单达人产出。",
                 "优先复投两款均已出单的达人，用专属 bonus 锁定头部。",
                 "新达人首单建议 2178（经典）+ 2190（升级）二选一测品，出单后开放另一款。"]
    rect(s, Inches(0.6), Inches(4.8), Inches(12.1), Inches(2.1), fill=WHITE, line=BORDER, line_w=Pt(1.25),
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.04)
    txt(s, Inches(0.85), Inches(4.9), Inches(11.6), Inches(0.4), "🎯 合并下月策略", size=15, color=PINK_DK, bold=True)
    bullets(s, Inches(0.95), Inches(5.35), Inches(11.5), Inches(1.5), items, size=13, gap=7)
    txt(s, Inches(0.6), Inches(6.95), Inches(12.1), Inches(0.4),
        "🔁 同一产品复投（2178+2190）：联系 206 位已出单达人，成功 18 / 失败 19 / 未回复 169，待持续跟进。",
        size=11, color=INK_SOFT)

# 达人亮点与流失预警
sec = find_section("达人亮点")
if sec:
    s = new_slide(); title_band(s, "达人亮点与流失预警", sub="Top 5 & 流失预警")
    subs = [("🌟 8月出单 Top 5", find_sub(sec,"8月出单 Top")),
            ("⚠️ 7月出单 Top 5（对比是否流失）", find_sub(sec,"7月出单 Top")),
            ("📉 重点流失达人", find_sub(sec,"重点流失"))]
    xs = [Inches(0.5), Inches(4.95), Inches(9.4)]
    for (lbl, sub), x in zip(subs, xs):
        if sub and sub["tables"]:
            txt(s, x, Inches(1.25), Inches(3.9), Inches(0.3), lbl, size=12, color=PINK_DK, bold=True)
            add_table(s, x, Inches(1.6), Inches(3.9), sub["tables"][0], fontsize=9,
                      col_widths=[Inches(2.4),Inches(1.0),Inches(0.5)])
    txt(s, Inches(0.5), Inches(4.5), Inches(12.3), Inches(2.4),
        "说明：imaniiibrooks（7月 379 件）等头部达人 8 月未出单，属重点流失，需逐一挽回；"
        "头部达人的复投维护与定向激活是整体效率的关键杠杆。", size=13, color=INK)

# 全 SKU 达人效率榜 & 订单拆解
sec = find_section("全 SKU")
if sec:
    s = new_slide(); title_band(s, "全 SKU 达人效率榜 & 订单拆解", sub="6 个常卖款")
    eff = find_sub(sec, "全 SKU 达人效率榜")
    if eff and eff["tables"]:
        txt(s, Inches(0.5), Inches(1.25), Inches(6), Inches(0.3), "全 SKU 达人效率榜", size=12, color=PINK_DK, bold=True)
        add_table(s, Inches(0.5), Inches(1.6), Inches(6.0), eff["tables"][0], fontsize=10,
                  col_widths=[Inches(1.0),Inches(1.0),Inches(1.6),Inches(1.4),Inches(1.0)])
    dec = find_sub(sec, "6 个常卖款")
    if dec and dec["tables"]:
        txt(s, Inches(6.85), Inches(1.25), Inches(6), Inches(0.3), "6 个常卖款订单贡献拆解", size=12, color=PINK_DK, bold=True)
        add_table(s, Inches(6.85), Inches(1.6), Inches(5.95), dec["tables"][0], fontsize=8,
                  col_widths=[Inches(0.95),Inches(0.95),Inches(0.85),Inches(0.95),Inches(0.85),Inches(0.7),Inches(0.7)])

# SKU 接力关系
sec = find_section("SKU 接力")
if sec:
    s = new_slide(); title_band(s, "SKU 接力关系", sub="老爆款 ↓ → 新 SKU 补上？")
    rel = find_sub(sec, "接力")
    tbl = None
    if rel and rel["tables"]: tbl = rel["tables"][0]
    elif sec["tables"]: tbl = sec["tables"][0]
    if tbl:
        add_table(s, Inches(0.8), Inches(1.6), Inches(9.0), tbl, fontsize=11,
                  col_widths=[Inches(2.5),Inches(2.0),Inches(2.0),Inches(1.0),Inches(1.5)])
    txt(s, Inches(0.8), Inches(4.0), Inches(11.7), Inches(2.5),
        "说明：老 SKU（爆品+销售）8月合计 560 件，仍占 94% 总盘；新 SKU（测品）仅 35 件。"
        "老爆款势能延续，但需加快测品款向主推款的接力转化，避免增长过度依赖存量爆款。",
        size=13, color=INK)

# SKU 机会矩阵
sec = find_section("SKU 机会矩阵")
if sec:
    s = new_slide(); title_band(s, "SKU 机会矩阵", sub="四象限：GMV × 增长率")
    # quadrant background
    qx, qy, qw, qh = Inches(1.2), Inches(1.7), Inches(10.9), Inches(4.7)
    rect(s, qx, qy, qw, qh, fill=WHITE, line=BORDER, line_w=Pt(1.5))
    rect(s, qx+qw//2, qy, Pt(1.5), qh, fill=BORDER)
    rect(s, qx, qy+qh//2, qw, Pt(1.5), fill=BORDER)
    txt(s, qx+Inches(0.1), qy+Inches(0.05), Inches(5), Inches(0.3), "◤ 高 GMV · 高增长（明星）", size=11, color=PINK_DK, bold=True)
    txt(s, qx+qw//2+Inches(0.1), qy+Inches(0.05), Inches(5), Inches(0.3), "◤ 低 GMV · 高增长（潜力）", size=11, color=UP, bold=True)
    txt(s, qx+Inches(0.1), qy+qh-Inches(0.35), Inches(5), Inches(0.3), "◢ 高 GMV · 低增长（现金牛）", size=11, color=INK_SOFT, bold=True)
    txt(s, qx+qw//2+Inches(0.1), qy+qh-Inches(0.35), Inches(5), Inches(0.3), "◢ 低 GMV · 低增长（问题/撤退）", size=11, color=DOWN, bold=True)
    # place SKUs (computed)
    place = {  # (col,row) 0=left,1=right ; 0=top,1=bottom
        "2178":(0,0), "2190":(0,1), "2722":(0,1),
        "2189":(1,0), "28173":(1,0), "2789":(1,1)}
    for name,(c,r) in place.items():
        cx = qx + (Inches(0) if c==0 else qw//2) + Inches(1.6 if c==0 else 1.9)
        cy = qy + (Inches(0.6) if r==0 else qh//2 + Inches(0.9))
        rect(s, cx, cy, Inches(1.5), Inches(0.6), fill=PALE, line=PINK, line_w=Pt(1),
             shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.3)
        txt(s, cx, cy, Inches(1.5), Inches(0.6), name, size=14, color=PINK_DK, bold=True,
            align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

# SKU 复投关系汇总
sec = find_section("SKU 复投关系")
if sec:
    s = new_slide(); title_band(s, "SKU 复投关系汇总", sub="不同产品复投 + 同一产品复投")
    diff = find_sub(sec, "不同产品复投")
    if diff and diff["tables"]:
        txt(s, Inches(0.5), Inches(1.25), Inches(12), Inches(0.3), "① 不同产品复投（合作过 A 再推 B）", size=12, color=PINK_DK, bold=True)
        add_table(s, Inches(0.5), Inches(1.6), Inches(12.3), diff["tables"][0], fontsize=9,
                  col_widths=[Inches(1.4)]+[Inches(1.9)]*4+[Inches(1.5)])
    txt(s, Inches(0.5), Inches(4.6), Inches(12.3), Inches(1.0),
        "② 同一产品复投（目前仅 2178+2190）：联系 206 位已出单达人，成功 18 / 失败 19 / 未回复 169，"
        "成功率仅约 9%，未回复占比 82%，跟进节奏与触达方式仍有优化空间。", size=12, color=INK)

# 下月行动
sec = find_section("下月行动")
if sec:
    s = new_slide(); title_band(s, "下月行动", sub="Next-month Action Plan")
    items = sec.get("leads", [])
    if not items:
        items = ["复投从「广撒网」改为「定向复投」：只复投上期已出单达人并配专属 bonus。",
                 "2178/2190 合并放量：Work Pants 双爆款统一招募、组合推荐。",
                 "头部达人维护：对 imaniiibrooks 等流失大客逐一挽回，建立 100% 复投清单。",
                 "新达人 SOP：首轮只寄 1 件测品验证，出单后开放主推款；第 10 天跟进、第 15 天催更。",
                 "寄样名单按画像筛人：优先核心达人、星级≥3★、非大码。",
                 "视频端乘势加投：预算从广撒网转向复投高自然单达人。",
                 "机会矩阵指导预算：60% 给高GMV·高增长，30% 给低GMV·高增长测品，10% 头部挽回。"]
    rect(s, Inches(0.6), Inches(1.3), Inches(12.1), Inches(5.6), fill=WHITE, line=BORDER, line_w=Pt(1.25),
         shape=MSO_SHAPE.ROUNDED_RECTANGLE, round_=0.04)
    bullets(s, Inches(0.95), Inches(1.55), Inches(11.5), Inches(5.2), items, size=14, gap=12, marker="➤")

prs.save(OUT)
print("SAVED", OUT, "slides=", len(prs.slides._sldIdLst))
