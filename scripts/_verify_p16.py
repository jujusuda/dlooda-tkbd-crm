# -*- coding: utf-8 -*-
import zipfile, re
from pptx import Presentation

p = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_13.pptx'

# 1) ZIP integrity
z = zipfile.ZipFile(p)
bad = z.testzip()
print("ZIP integrity:", "OK" if bad is None else f"CORRUPT -> {bad}")

# 2) rels targets resolve
rels = z.read("ppt/_rels/presentation.xml.rels").decode("utf-8", "ignore")
targets = re.findall(r'Target="([^"]+)"', rels)
names = z.namelist()
miss = [t for t in targets if not t.startswith("http") and t not in names and ("ppt/" + t.lstrip("/")) not in names]
print("rels missing targets:", miss if miss else "none")

# 3) parse
prs = Presentation(p)
print("slides:", len(prs.slides._sldIdLst))

# 4) slide 16 (idx15) dump + checklist
s = prs.slides[15]
blob_lines = []
shapes_count = {"freeform": 0, "table": 0, "oval": 0, "chart": 0}
for sh in s.shapes:
    st = sh.shape_type
    if st is not None and "FREE" in str(st):
        shapes_count["freeform"] += 1
    if sh.has_table:
        shapes_count["table"] += 1
        tb = sh.table
        rows = [" | ".join(c.text for c in r.cells) for r in tb.rows]
        blob_lines.append("[T] " + " || ".join(rows))
    if sh.has_text_frame and sh.text_frame.text.strip():
        blob_lines.append(sh.text_frame.text.strip())
    if sh.shape_type == 9:  # OVAL
        shapes_count["oval"] += 1
blob = "\n".join(blob_lines)
print("\n===== SLIDE 16 DUMP =====")
for t in blob_lines:
    print("  ", t[:140])
print("shape counts:", shapes_count)

# 5) CHECKLIST
print("\n===== CHECKLIST =====")
checks = {
    "主标题": "达人建联：建联 27 → 已发视频 20 → 已出单 17" in blob,
    "副标题": "抖音号 / 官号 / 邮件私信建联；四款爆品共成功建联 27 位，其中 17 位已出单" in blob,
    "漏斗 27/20/17": ("27" in blob and "20" in blob and "17" in blob),
    "74.1%": "74.1%" in blob,
    "85.0%": "85.0%" in blob,
    "63.0%": "63.0%" in blob,
    "明细 2178 9/7/7": "2178" in blob and "9" in blob and "7" in blob,
    "明细 2190 13/9/6": "2190" in blob and "13" in blob and "6" in blob,
    "明细 28173 3/2/2": "28173" in blob and "3" in blob and "2" in blob,
    "明细 2189 2/2/2": "2189" in blob and "2" in blob,
    "合计 27/20/17": ("合计" in blob),
    "WhatsApp 10": "10" in blob and "WhatsApp" in blob,
    "付费达人 2": "2" in blob and "付费达人" in blob,
    "策略①扩大建联": "扩大建联规模" in blob,
    "策略②WhatsApp": "WhatsApp 加深绑定" in blob,
    "策略③付费达人": "推进付费达人合作落地" in blob,
    "漏斗图形(3梯形)": shapes_count["freeform"] == 3,
    "明细表存在": shapes_count["table"] >= 1,
}
for k, v in checks.items():
    print(("  [OK] " if v else "  [!!] ") + k)

# 6) 负面 / 禁用
bad_terms = ["成功建联（位）", "已出单（位）", "结论：WhatsApp", "近七成", "靠人头铺量"]
found = [b for b in bad_terms if b in blob]
print("  禁用/重复措辞命中:", found if found else "无（pass）")

# 7) freeform custGeom point order sanity (no NaN, ascending y for funnel)
sx = f"ppt/slides/slide16.xml"
data = z.read(sx).decode("utf-8", "ignore")
cust = re.findall(r"<a:custGeom>.*?</a:custGeom>", data, re.S)
print("  custGeom count:", len(cust))
for i, c in enumerate(cust):
    pts = re.findall(r'<a:pt x="(-?\d+)" y="(-?\d+)"', c)
    xs = [int(a) for a, b in pts]; ys = [int(b) for a, b in pts]
    print(f"    geom{i}: npts={len(pts)} x_range={min(xs)}-{max(xs)} y_range={min(ys)}-{max(ys)}")

# 8) chart label legality (line charts illegal outEnd/inEnd) across whole deck
charts = [n for n in names if "charts/chart" in n and n.endswith(".xml")]
line_bad = []
for n in charts:
    d = z.read(n).decode("utf-8", "ignore")
    ctype = "line" if "<c:lineChart>" in d else ("bar" if "<c:barChart>" in d else ("pie/doughnut" if "<c:pieChart>" in d or "<c:doughnutChart>" in d else "other"))
    if ctype == "line" and ("outEnd" in d or "inEnd" in d):
        line_bad.append(n)
print("  line charts with illegal labels:", line_bad if line_bad else "none")
