# -*- coding: utf-8 -*-
"""按 ECMA-376 允许的子元素顺序校验新增图表 XML，防 PowerPoint 报"文件需修复"。"""
import zipfile
from lxml import etree

OUT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\余慧玲9月月度汇报_v9_1(11)_达人素材供给修改v2.pptx"
C = "http://schemas.openxmlformats.org/drawingml/2006/chart"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"


def q(prefix, tag):
    return "{%s}%s" % ({"c": C, "a": A}[prefix], tag)


def local(e):
    return etree.QName(e).localname


SEQ = {
    # CT_BarChart
    "barChart": ["barDir", "grouping", "varyColors", "ser", "dLbls", "gapWidth", "overlap",
                 "serLines", "axId", "extLst"],
    # CT_BarSer
    "ser": ["idx", "order", "tx", "spPr", "invertIfNegative", "pictureOptions", "dPt", "dLbls",
            "trendline", "errBars", "cat", "val", "shape", "extLst"],
    # CT_DPt
    "dPt": ["idx", "invertIfNegative", "marker", "bubble3D", "explosion", "spPr",
            "pictureOptions", "extLst"],
    # CT_DLbls
    "dLbls": ["numFmt", "spPr", "txPr", "dLblPos", "showLegendKey", "showVal", "showCatName",
              "showSerName", "showPercent", "showBubbleSize", "separator", "showLeaderLines",
              "leaderLines", "extLst"],
    # CT_ValAx
    "valAx": ["axId", "scaling", "delete", "axPos", "majorGridlines", "minorGridlines", "title",
              "numFmt", "majorTickMark", "minorTickMark", "tickLblPos", "spPr", "txPr",
              "crossAx", "crosses", "crossesAt", "crossBetween", "majorUnit", "minorUnit",
              "dispUnits", "extLst"],
    # CT_CatAx
    "catAx": ["axId", "scaling", "delete", "axPos", "majorGridlines", "minorGridlines", "title",
              "numFmt", "majorTickMark", "minorTickMark", "tickLblPos", "spPr", "txPr",
              "crossAx", "crosses", "crossesAt", "auto", "lblAlgn", "lblOffset",
              "tickLblSkip", "tickMarkSkip", "noMultiLvlLbl", "extLst"],
    # CT_Scaling
    "scaling": ["logBase", "orientation", "max", "min", "extLst"],
    # CT_ChartSpace
    "chartSpace": ["date1904", "lang", "roundedCorners", "style", "clrMapOvr", "pivotSource",
                   "protection", "chart", "spPr", "txPr", "externalData", "printSettings",
                   "userShapes", "extLst"],
    # CT_Chart
    "chart": ["title", "autoTitleDeleted", "pivotFmts", "view3D", "floor", "sideWall",
              "backWall", "plotArea", "legend", "plotVisOnly", "dispBlanksAs",
              "showDLblsOverMax", "extLst"],
    # CT_PlotArea（轴元素属于同一 choice 组，顺序可任意）
    "plotArea": ["layout", "barChart", "lineChart", "AXIS", "dTable", "spPr", "extLst"],
    # CT_Legend
    "legend": ["legendPos", "legendEntry", "layout", "overlay", "spPr", "txPr", "extLst"],
    # CT_Title
    "title": ["tx", "layout", "overlay", "spPr", "txPr", "extLst"],
    # a: CT_TextBody for txPr
    "txPr": ["bodyPr", "lstStyle", "p"],
}


def check(el, path=""):
    name = local(el)
    seq = SEQ.get(name)
    problems = 0
    if seq is not None:
        seen = []
        for ch in el:
            ln = local(ch)
            if ln in ("valAx", "catAx", "dateAx", "serAx") and "AXIS" in seq:
                ln = "AXIS"
            if ln in seq:
                if seen and seq.index(ln) < seq.index(seen[-1]):
                    print(f"  FAIL {path}/{name}: {ln} 出现在 {seen[-1]} 之后（顺序非法）")
                    problems += 1
                seen.append(ln)
    for ch in el:
        problems += check(ch, path + "/" + name)
    return problems


z = zipfile.ZipFile(OUT)
total = 0
for n in ["ppt/charts/chart16.xml", "ppt/charts/chart17.xml", "ppt/charts/chart18.xml"]:
    root = etree.fromstring(z.read(n))
    p = check(root)
    total += p
    print(("  OK   " if p == 0 else "  BAD  ") + n)

# 顺带确认所有 XML 可解析
bad = 0
for n in z.namelist():
    if n.endswith(".xml") or n.endswith(".rels"):
        try:
            etree.fromstring(z.read(n))
        except Exception as e:
            print("  PARSE FAIL", n, e)
            bad += 1
print("XML 可解析:", "全部 OK" if bad == 0 else f"{bad} 个失败")
print("RESULT:", "ALL PASS" if total == 0 and bad == 0 else "HAS PROBLEMS")
