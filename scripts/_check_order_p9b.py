# -*- coding: utf-8 -*-
"""Strict ECMA-376 child-sequence check for every chart on slide 9."""
from lxml import etree
from pptx import Presentation
from pptx.oxml.ns import qn

OUT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\余慧玲9月月度汇报_v9_1(9)_P9修改.pptx"
def c(t): return qn('c:' + t)
def kids(e): return [x.tag.split('}')[1] for x in e]

SEQ = {
 'barChart': ['barDir','grouping','varyColors','ser','dLbls','gapWidth','overlap','serLines','axId','extLst'],
 'lineChart': ['grouping','varyColors','ser','dLbls','dropLines','hiLowLines','upDownBars','marker','smooth','axId','extLst'],
 'valAx': ['axId','scaling','delete','axPos','majorGridlines','minorGridlines','title','numFmt',
           'majorTickMark','minorTickMark','tickLblPos','spPr','txPr','crossAx','crosses','crossesAt',
           'crossBetween','majorUnit','minorUnit','dispUnits','auto','labelAlign','labelOffset','tickLblSkip','tickMarkSkip','noMultiLvlLbl','extLst'],
 'catAx': ['axId','scaling','delete','axPos','majorGridlines','minorGridlines','title','numFmt',
           'majorTickMark','minorTickMark','tickLblPos','spPr','txPr','crossAx','crosses','crossesAt',
           'crossBetween','auto','lblAlgn','lblOffset','tickLblSkip','tickMarkSkip','noMultiLvlLbl','extLst'],
 'barSer': ['idx','order','tx','spPr','invertIfNegative','pictureOptions','dPt','dLbls','trendline','errBars','cat','val','shape','extLst'],
 'lineSer': ['idx','order','tx','spPr','marker','dPt','dLbls','trendline','errBars','cat','val','smooth','extLst'],
 'title': ['tx','layout','overlay','spPr','txPr','extLst'],
 'plotArea': ['layout','barChart','lineChart','catAx','valAx','valAx','dTable','spPr','extLst'],
}

def good(seq, allowed):
    idx = [allowed.index(x) for x in seq]
    return idx == sorted(idx)

prs = Presentation(OUT)
sl = prs.slides[8]
fails = []
for sh in sl.shapes:
    if not sh.has_chart:
        continue
    pa = sh.chart._chartSpace.plotArea
    s = kids(pa)
    if not good(s, SEQ['plotArea']):
        fails.append((sh.name, 'plotArea', s))
    for nm in ('barChart', 'lineChart'):
        p = pa.find(c(nm))
        if p is None:
            continue
        if not good(kids(p), SEQ[nm]):
            fails.append((sh.name, nm, kids(p)))
        serkey = 'barSer' if nm == 'barChart' else 'lineSer'
        for sr in p.findall(c('ser')):
            if not good(kids(sr), SEQ[serkey]):
                fails.append((sh.name, nm + '/ser', kids(sr)))
    for ax in pa.findall(c('valAx')) + pa.findall(c('catAx')):
        key = 'valAx' if ax.tag == c('valAx') else 'catAx'
        if not good(kids(ax), SEQ[key]):
            fails.append((sh.name, key, kids(ax)))
        ttl = ax.find(c('title'))
        if ttl is not None and not good(kids(ttl), SEQ['title']):
            fails.append((sh.name, 'title', kids(ttl)))

print("all sequence checks:", "PASS" if not fails else "FAIL")
for f in fails:
    print("  ", f)
