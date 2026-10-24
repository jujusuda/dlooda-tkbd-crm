from pptx import Presentation
from pptx.dml.color import RGBColor

src = r'C:\Users\LENOVO\Desktop\余慧玲8月月度汇报.pptx'
out = r'C:\Users\LENOVO\Desktop\淡粉样稿_第16页_更浅可爱_v2.pptx'
p = Presentation(src)

FILL_MAP = {
    '#C94F82': '#EBB8CD',
    '#F5A0BC': '#FCDCE6',
    '#E879A6': '#F8C6D8',
    '#FCEAF1': '#FEF7FB',
    '#FBE4EE': '#FDF3F8',
    '#FCD5E3': '#FEEAF1',
}
SOFT_LINE = RGBColor.from_string('EBD2DA')
TITLE_TEXT = '#9E4E6C'

fc = lc = wcc = 0

for s in p.slides:
    for sh in s.shapes:
        top = sh.top / 914400 if sh.top is not None else 99

        # 1) shape fill
        try:
            if sh.fill.type == 1:
                h = '#' + str(sh.fill.fore_color.rgb)
                if h in FILL_MAP:
                    sh.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                    fc += 1
        except Exception:
            pass

        # 2) shape line -- fix default black borders
        try:
            ln = sh.line
            if ln is not None:
                has_explicit = False
                try:
                    if ln.color and ln.color.type is not None and ln.color.type == 1:
                        has_explicit = True
                except Exception:
                    pass
                if has_explicit:
                    try:
                        rs = str(ln.color.rgb)
                        r, g, b = int(rs[0:2], 16), int(rs[2:4], 16), int(rs[4:6], 16)
                        if r < 200 or g < 200 or b < 200:
                            ln.color.rgb = SOFT_LINE
                            lc += 1
                    except Exception:
                        pass
                else:
                    # default black border -> soft pink-gray
                    ln.color.rgb = SOFT_LINE
                    lc += 1
        except Exception:
            pass

        # 3) table
        if sh.has_table:
            tbl = sh.table
            for row in tbl.rows:
                for cell in row.cells:
                    try:
                        if cell.fill.type == 1:
                            h = '#' + str(cell.fill.fore_color.rgb)
                            if h in FILL_MAP:
                                cell.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                                fc += 1
                    except Exception:
                        pass
                    for edge_name in ['top', 'left', 'bottom', 'right']:
                        try:
                            b = getattr(cell.borders, edge_name)
                            if b is not None:
                                has_c = False
                                try:
                                    if b.color and b.color.type == 1:
                                        has_c = True
                                except Exception:
                                    pass
                                if has_c:
                                    try:
                                        rs = str(b.color.rgb)
                                        rv, gv, bv = int(rs[0:2], 16), int(rs[2:4], 16), int(rs[4:6], 16)
                                        if rv < 200 or gv < 200 or bv < 200:
                                            b.color.rgb = SOFT_LINE
                                            lc += 1
                                    except Exception:
                                        pass
                                else:
                                    b.color.rgb = SOFT_LINE
                                    lc += 1
                        except Exception:
                            pass

        # 4) chart
        if sh.has_chart:
            chart = sh.chart
            for ser in chart.series:
                try:
                    if ser.format.fill.type == 1:
                        h = '#' + str(ser.format.fill.fore_color.rgb)
                        if h in FILL_MAP:
                            ser.format.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                            fc += 1
                except Exception:
                    pass
            # chart border (access via _chartPart if needed)
            try:
                cfmt = chart._chartPart.chartSpace
                # try to set plot area border
                try:
                    pa = cfmt.plotArea
                    if hasattr(pa, 'spPr') and pa.spPr and hasattr(pa.spPr, 'ln') and pa.spPr.ln:
                        ln2 = pa.spPr.ln
                        if ln2 and hasattr(ln2, 'solidFill'):
                            sf = ln2.solidFill
                            if sf and hasattr(sf, 'srgbClr'):
                                # has explicit color, check if dark
                                cl = sf.srgbClr
                                if hasattr(cl, 'val'):
                                    rv = int(str(cl.val)[0:2], 16)
                                    gv = int(str(cl.val)[2:4], 16)
                                    bv = int(str(cl.val)[4:6], 16)
                                    if rv < 200 or gv < 200 or bv < 200:
                                        cl.val = 'EBD2DA'
                                        lc += 1
                except Exception:
                    pass
            except Exception:
                pass

        # 5) title white text -> deep rose
        if sh.has_text_frame and top < 1.2:
            for para in sh.text_frame.paragraphs:
                for run in para.runs:
                    try:
                        if run.font.color and run.font.color.type is not None and str(run.font.color.rgb) == 'FFFFFF':
                            run.font.color.rgb = RGBColor.from_string(TITLE_TEXT[1:])
                            wcc += 1
                    except Exception:
                        pass

p.save(out)
print('SAVED:', out)
print('fill=%d | line=%d | title_text=%d' % (fc, lc, wcc))
