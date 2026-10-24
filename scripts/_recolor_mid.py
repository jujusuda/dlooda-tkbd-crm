import zipfile, shutil
from xml.etree import ElementTree as ET
from pptx import Presentation
from pptx.dml.color import RGBColor

src = r'C:\Users\LENOVO\Desktop\余慧玲8月月度汇报.pptx'
out = r'C:\Users\LENOVO\Desktop\淡粉样稿_中间档_清晰可爱.pptx'
shutil.copy2(src, out)

# ====== Step 1: 改主题 dk1（边框色）-> 中灰粉（解决黑线但不雾）======
src_zip = zipfile.ZipFile(src, 'r')
theme_xml = src_zip.read('ppt/theme/theme1.xml')
src_zip.close()

root = ET.fromstring(theme_xml)
ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
clr = root.find('.//a:clrScheme', ns)

def set_srgb(tag_name, hex_color):
    el = clr.find('a:%s' % tag_name, ns)
    if el is None: return False
    for sub in list(el): el.remove(sub)
    srgb = ET.SubElement(el, '{%s}srgbClr' % ns['a'])
    srgb.set('val', hex_color)
    return True

# dk1 用稍深的灰粉（比v2的BFA5B0深，保证边框可见但不黑）
set_srgb('dk1', 'A08090')   # 边框 -> 中灰玫瑰（不是黑，也不是太浅）

new_xml = ET.tostring(root, encoding='unicode')
new_xml = new_xml.replace('ns0:', 'a:').replace(':ns0', ':a')

src_zip2 = zipfile.ZipFile(src, 'r')
out_zip = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
for item in src_zip2.infolist():
    if item.filename == 'ppt/theme/theme1.xml':
        out_zip.writestr(item, new_xml.encode('utf-8'))
    else:
        out_zip.writestr(item, src_zip2.read(item.filename))
out_zip.close()
src_zip2.close()

# ====== Step 2: 填充改色（中间档：比原版柔，比v2深，保持清晰）======
p = Presentation(out)

# 关键：这是"稍微淡一点点"的版本，不是"很淡"
FILL_MAP = {
    '#C94F82': '#D47A9E',  # 标题栏：原版深玫 -> 柔玫（降一档艳度，保持清晰）
    '#F5A0BC': '#F2A8BC',  # 卡片/图表柱：原亮粉 -> 柔粉（仍够深，图表看得清）
    '#E879A6': '#EB92A8',  # 粉色辅助
    '#FCEAF1': '#FCEEF3',  # 浅粉底：微调，几乎不变
    '#FBE4EE': '#FCECF1',
    '#FCD5E3': '#FDE4EA',
}
TITLE_TEXT = '#8E3E5C'  # 标题字：深玫瑰（配稍浅的标题栏底）

fc = wcc = 0
for s in p.slides:
    for sh in s.shapes:
        top = sh.top / 914400 if sh.top is not None else 99
        try:
            if sh.fill.type == 1:
                h = '#' + str(sh.fill.fore_color.rgb)
                if h in FILL_MAP:
                    sh.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                    fc += 1
        except: pass
        if sh.has_table:
            for row in sh.table.rows:
                for cell in row.cells:
                    try:
                        if cell.fill.type == 1:
                            h = '#' + str(cell.fill.fore_color.rgb)
                            if h in FILL_MAP:
                                cell.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                                fc += 1
                    except: pass
        if sh.has_chart:
            for ser in sh.chart.series:
                try:
                    if ser.format.fill.type == 1:
                        h = '#' + str(ser.format.fill.fore_color.rgb)
                        if h in FILL_MAP:
                            ser.format.fill.fore_color.rgb = RGBColor.from_string(FILL_MAP[h][1:])
                            fc += 1
                except: pass
        if sh.has_text_frame and top < 1.2:
            for para in sh.text_frame.paragraphs:
                for run in para.runs:
                    try:
                        if run.font.color and run.font.color.type is not None and str(run.font.color.rgb) == 'FFFFFF':
                            run.font.color.rgb = RGBColor.from_string(TITLE_TEXT[1:])
                            wcc += 1
                    except: pass

p.save(out)
print('SAVED:', out)
print('fill=%d | title_text=%d' % (fc, wcc))
print()
print('=== 配色对照 ===')
print('  原版标题栏  C94F82 -> 中间档 D47A9E (柔玫，清晰)')
print('  原版卡片    F5A0BC -> 中间档 F2A8BC (柔粉，图表可见)')
print('  原版(雾)    EBB8CD -> 中间档 D47A9E (不再雾)')
print('  主题边框    黑     -> A08090  (中灰玫瑰，不黑不雾)')
