# -*- coding: utf-8 -*-
import zipfile
from lxml import etree
from pptx import Presentation
from pptx.oxml.ns import qn

OUT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\余慧玲9月月度汇报_P9修改.pptx"

# 1) every xml part well-formed
z = zipfile.ZipFile(OUT)
bad = []
for n in z.namelist():
    if n.endswith('.xml') or n.endswith('.rels'):
        try:
            etree.fromstring(z.read(n))
        except Exception as e:
            bad.append((n, str(e)[:80]))
print("well-formed all parts:", "OK" if not bad else bad)

# 2) plot element order
prs = Presentation(OUT)
ch = prs.slides[8].shapes[19].chart
pa = ch._chartSpace.plotArea

def kids(e): return [x.tag.split('}')[1] for x in e]
print("\nplotArea:", kids(pa))
for nm in ('barChart', 'lineChart'):
    p = pa.find(qn('c:' + nm))
    print(f"{nm}:", kids(p))
for va in pa.findall(qn('c:valAx')):
    aid = va.find(qn('c:axId')).get('val')
    print(f"valAx {aid}:", kids(va))
print("catAx:", kids(pa.find(qn('c:catAx'))))

# expected sequences per ECMA-376
BAR = ['barDir','grouping','varyColors','ser','dLbls','gapWidth','overlap','serLines','axId','extLst']
LINE = ['grouping','varyColors','ser','dLbls','dropLines','hiLowLines','upDownBars','marker','smooth','axId','extLst']
VAX = ['axId','scaling','delete','axPos','majorGridlines','minorGridlines','title','numFmt',
       'majorTickMark','minorTickMark','tickLblPos','spPr','txPr','crossAx','crosses','crossesAt',
       'auto','labelAlign','labelOffset','tickLblSkip','tickMarkSkip','noMultiLvlLbl','extLst']

def seq_ok(seq, allowed):
    idx = [allowed.index(x) for x in seq]
    return idx == sorted(idx)

for nm, allowed in (('barChart', BAR), ('lineChart', LINE)):
    p = pa.find(qn('c:' + nm))
    s = kids(p)
    print(f"{nm} sequence valid:", seq_ok(s, allowed), s)
for va in pa.findall(qn('c:valAx')):
    s = kids(va)
    print("valAx sequence valid:", seq_ok(s, VAX), s)

# 3) series child sequence
BARSER = ['idx','order','tx','spPr','invertIfNegative','pictureOptions','dPt','dLbls','trendline','errBars','cat','val','shape','extLst']
LINESER = ['idx','order','tx','spPr','marker','dPt','dLbls','trendline','errBars','cat','val','smooth','extLst']
for nm, allowed in (('barChart', BARSER), ('lineChart', LINESER)):
    p = pa.find(qn('c:' + nm))
    for s in p.findall(qn('c:ser')):
        k = kids(s)
        print(f"{nm} ser sequence valid:", seq_ok(k, allowed), k)
