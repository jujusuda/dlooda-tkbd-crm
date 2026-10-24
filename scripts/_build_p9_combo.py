# -*- coding: utf-8 -*-
"""Slide 9 (2189 + 28173) rebuild:
   - merge 达人出单率 + 出单达人数量 into one combo chart (line %, bar 人数 on secondary axis)
   - add 视频出单率 lines
   - 点击率/转化率 -> one decimal
   - rewrite 2189 / 28173 card copy
"""
import copy
from pptx import Presentation
from pptx.util import Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls, qn
from lxml import etree

SRC = r"E:\xwechat_files\wxid_od6e7r1klxs422_54c2\temp\RWTemp\2026-10\8be9710a0a0dd58ff4cb419316577cc7\余慧玲9月月度汇报_v9_1(7).pptx"
OUT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\余慧玲9月月度汇报_P9修改.pptx"

C  = qn('c:{}').split('}')[0][1:]          # not used; kept for clarity
INK = "1F1F1F"

def c(tag): return qn('c:' + tag)
def a(tag): return qn('a:' + tag)
def p(tag): return qn('p:' + tag)


# ---------------------------------------------------------------- xml helpers
def el(xml, **kw):
    return parse_xml(xml, **kw)


def _dlbls(fmt, pos, sz):
    """data-labels block: fmt=excel format code, pos=t/b/outEnd/ctr"""
    f = fmt.replace('"', '&quot;')
    return el(
        '<c:dLbls ' + nsdecls('c', 'a') + '>'
        f'<c:numFmt formatCode="{f}" sourceLinked="0"/>'
        '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln><a:effectLst/></c:spPr>'
        '<c:txPr>'
        '<a:bodyPr rot="0" spcFirstLastPara="0" vertOverflow="ellipsis" vert="horz" wrap="square" '
        'lIns="38100" tIns="19050" rIns="38100" bIns="19050" anchor="ctr" anchorCtr="1"/>'
        '<a:lstStyle/>'
        '<a:p><a:pPr><a:defRPr lang="zh-CN" sz="{s}" b="0" i="0" u="none" strike="noStrike" '
        'kern="1200" baseline="0">'
        f'<a:solidFill><a:srgbClr val="{INK}"/></a:solidFill>'
        '<a:latin typeface="微软雅黑" charset="-122"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/>'
        '</a:defRPr></a:pPr></a:p>'
        '</c:txPr>'
        f'<c:dLblPos val="{pos}"/>'
        '<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/>'
        '<c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>'
        '<c:showLeaderLines val="0"/>'
        '<c:extLst>'
        '<c:ext xmlns:c15="http://schemas.microsoft.com/office/drawing/2012/chart" '
        'uri="{CE6537A1-D6FC-4f65-9D91-7224C49458BB}">'
        '<c15:layout/><c15:showLeaderLines val="1"/><c15:leaderLines/>'
        '</c:ext></c:extLst>'
        '</c:dLbls>'.replace('{s}', str(sz))
    )


def _line_spPr(color):
    return el(
        '<c:spPr ' + nsdecls('c', 'a') + '>'
        '<a:ln w="28575" cap="rnd" cmpd="sng" algn="ctr">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        '<a:prstDash val="solid"/><a:round/>'
        '</a:ln></c:spPr>'
    )


def _marker(color, size=6):
    return el(
        '<c:marker ' + nsdecls('c', 'a') + '>'
        f'<c:symbol val="circle"/><c:size val="{size}"/>'
        '<c:spPr>'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        '<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>'
        '<a:prstDash val="solid"/><a:round/></a:ln>'
        '</c:spPr></c:marker>'
    )


def _bar_spPr(fill, stroke):
    return el(
        '<c:spPr ' + nsdecls('c', 'a') + '>'
        f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
        '<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr">'
        f'<a:solidFill><a:srgbClr val="{stroke}"/></a:solidFill>'
        '<a:prstDash val="solid"/><a:round/></a:ln>'
        '<a:effectLst/></c:spPr>'
    )


def _numfmt(code):
    safe = code.replace('"', '&quot;')
    return el(f'<c:numFmt {nsdecls("c")} formatCode="{safe}" sourceLinked="0"/>')


# ---------------------------------------------------------------- text helpers
def set_body_text(sp_el, lines):
    txBody = sp_el.find(p('txBody'))
    paras = txBody.findall(a('p'))
    for i, text in enumerate(lines):
        pi = paras[i]
        runs = pi.findall(a('r'))
        if runs:
            for r in runs[1:]:
                pi.remove(r)
            t = runs[0].find(a('t'))
            t.text = text
        else:
            raise RuntimeError('no run in paragraph %d' % i)
    for extra in paras[len(lines):]:
        txBody.remove(extra)


def clone_title(slide, tmpl_el, x, y, cx, cy, text, new_id):
    new = copy.deepcopy(tmpl_el)
    slide.shapes._spTree.append(new)
    cNvPr = new.find(p('nvSpPr')).find(p('cNvPr'))
    cNvPr.set('id', str(new_id))
    cNvPr.set('name', 'MergedTitle')
    spPr = new.find(p('spPr'))
    xfrm = spPr.find(a('xfrm'))
    off, ext = xfrm.find(a('off')), xfrm.find(a('ext'))
    off.set('x', str(x)); off.set('y', str(y))
    ext.set('cx', str(cx)); ext.set('cy', str(cy))
    txBody = new.find(p('txBody'))
    paras = txBody.findall(a('p'))
    for extra in paras[1:]:
        txBody.remove(extra)
    p0 = paras[0]
    runs = p0.findall(a('r'))
    for r in runs[1:]:
        p0.remove(r)
    runs[0].find(a('t')).text = text
    return new


def drop_shape(slide, shape_el):
    part = slide.part
    for sub in shape_el.iter():
        for attr in ('r:id', 'r:embed', 'r:link'):
            rid = sub.get(qn(attr))
            if rid:
                try:
                    part.drop_rel(rid)
                except Exception:
                    pass
    shape_el.getparent().remove(shape_el)


# ---------------------------------------------------------------- chart patches
def patch_one_decimal(chart, vals_a, vals_b):
    """round cached values to 1 decimal + force 0.0"%" labels"""
    plotArea = chart._chartSpace.plotArea
    lc = plotArea.find(c('lineChart'))
    sers = lc.findall(c('ser'))
    for ser, vals in zip(sers, (vals_a, vals_b)):
        numCache = ser.find(c('val')).find(c('numRef')).find(c('numCache'))
        for pt, v in zip(numCache.findall(c('pt')), vals):
            pt.find(c('v')).text = str(v)
        for holder in (lc, ser):
            for dlbls in holder.findall(c('dLbls')):
                nf = dlbls.find(c('numFmt'))
                if nf is not None:
                    nf.set('formatCode', '0.0"%"')
                    nf.set('sourceLinked', '0')


def build_combo(slide):
    cats = ['7月', '8月', '9月']
    plan = [
        ('2189 出单达人数量',  (14, 8, 14),            'bar'),
        ('28173 出单达人数量', (16, 25, 24),           'bar'),
        ('2189 达人出单率',    (56.00, 22.86, 31.11),  'line'),
        ('28173 达人出单率',   (30.19, 33.78, 31.58),  'line'),
        ('2189 视频出单率',    (33.33, 28.41, 27.85),  'line'),
        ('28173 视频出单率',   (18.58, 23.84, 23.03),  'line'),
    ]
    cd = CategoryChartData()
    cd.categories = cats
    for nm, v, k in plan:
        cd.add_series(nm, v)

    L, T, W, H = 548640, 1664208, 3835908, 2432304
    gf = slide.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS, L, T, W, H, cd)
    chart = gf.chart

    # legend (do this while python-pptx can still read the chart normally)
    chart.has_legend = True
    lg = chart.legend
    lg.position = XL_LEGEND_POSITION.BOTTOM
    lg.include_in_layout = False
    lg.font.size = Pt(7)

    plotArea = chart._chartSpace.plotArea
    lineChart = plotArea.find(c('lineChart'))
    catAx = plotArea.find(c('catAx'))
    valAx = plotArea.find(c('valAx'))
    catId = catAx.find(c('axId')).get('val')
    valId = valAx.find(c('axId')).get('val')
    secId = str(int(valId) + 17)

    sers = lineChart.findall(c('ser'))
    bar_sers, line_sers = sers[0:2], sers[2:6]

    # --- take the two bar series out of the line plot
    for s in bar_sers:
        lineChart.remove(s)
        sm = s.find(c('smooth'))
        if sm is not None:
            s.remove(sm)

    # --- build the bar plot (secondary / right axis)
    bc = el('<c:barChart ' + nsdecls('c') + '>'
            '<c:barDir val="col"/>'
            '<c:grouping val="clustered"/>'
            '<c:varyColors val="0"/>'
            f'<c:axId val="{catId}"/><c:axId val="{secId}"/>'
            '</c:barChart>')
    first_ax = bc.findall(c('axId'))[0]
    for s in bar_sers:
        first_ax.addprevious(s)
    first_ax.addprevious(el(f'<c:gapWidth {nsdecls("c")} val="70"/>'))
    lineChart.addprevious(bc)          # bars drawn behind the lines

    # --- secondary value axis (right, counts)
    sec = copy.deepcopy(valAx)
    sec.find(c('axId')).set('val', secId)
    sec.find(c('axPos')).set('val', 'r')
    mg = sec.find(c('majorGridlines'))
    if mg is not None:
        sec.remove(mg)
    mtm = sec.find(c('majorTickMark'))
    mtm.addprevious(_numfmt('0'))
    sec.find(c('crossAx')).set('val', catId)
    sec.find(c('delete')).set('val', '0')
    valAx.addnext(sec)

    # --- primary value axis (left, %) gets a % number format
    mtm = valAx.find(c('majorTickMark'))
    mtm.addprevious(_numfmt('0"%"'))

    # --- style the series
    for ser, (fill, stroke), pos in zip(
            bar_sers,
            [('E3B9C6', 'B06579'), ('D2D2D2', '5A5A5A')],
            ['outEnd', 'outEnd']):
        cat = ser.find(c('cat'))
        cat.addprevious(_bar_spPr(fill, stroke))
        cat.addprevious(_dlbls('0', pos, 800))

    for ser, color, pos, name in zip(
            line_sers,
            ['B06579', '5A5A5A', 'C97F95', '9A9A9A'],
            ['t', 'b', 't', 'b'],
            ['2189 达人出单率', '28173 达人出单率', '2189 视频出单率', '28173 视频出单率']):
        cat = ser.find(c('cat'))
        cat.addprevious(_line_spPr(color))
        cat.addprevious(_marker(color))
        cat.addprevious(_dlbls('0.00"%"', pos, 800))
    return gf


# ---------------------------------------------------------------- main
prs = Presentation(SRC)
slide = prs.slides[8]

OLD = [slide.shapes[i]._element for i in (5, 6, 7, 8)]   # 2 old titles + 2 old charts
CLICK = slide.shapes[10].chart
CONV = slide.shapes[12].chart
CARD_A = slide.shapes[18]._element
CARD_B = slide.shapes[22]._element
TITLE_TPL = slide.shapes[9]._element                     # "点击率" title box, reuse its font

# 1) one-decimal click / conversion rates
patch_one_decimal(CLICK, (3.5, 3.0, 5.2), (4.2, 3.3, 4.1))
patch_one_decimal(CONV, (2.4, 2.1, 1.1), (2.1, 1.7, 0.9))

# 2) merged combo chart + its title
build_combo(slide)
max_id = max(int(s.find(p('nvSpPr')).find(p('cNvPr')).get('id'))
             for s in slide.shapes._spTree.iterchildren() if s.find(p('nvSpPr')) is not None)
clone_title(slide, TITLE_TPL, 548640, 1426464, 3835908, 219456,
            '出单率与出单达人数量（7–9 月）', max_id + 1)

# 3) drop the four superseded shapes
for e in OLD:
    drop_shape(slide, e)

# 4) card copy
set_body_text(CARD_A, [
    '月度出单 176→723→999 三连升',
    '卡点：点击率升、转化率降，承接再观察',
    '策略：① 补视频、补达人　② 重点跟出单率高的',
])
set_body_text(CARD_B, [
    '寄样逐月加码、出单达人稳定',
    '卡点：9月小幅回落是视频少了 + 沉淀期，不是转化崩',
    '策略：① 稳定寄样　② 复投核心达人　③ 加大素材拉回订单',
])

prs.save(OUT)
print('saved ->', OUT)
