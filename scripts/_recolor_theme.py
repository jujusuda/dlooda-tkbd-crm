import zipfile, shutil
from xml.etree import ElementTree as ET

src = r'C:\Users\LENOVO\Desktop\余慧玲8月月度汇报.pptx'
out = r'C:\Users\LENOVO\Desktop\淡粉样稿_更浅可爱_改主题.pptx'
shutil.copy2(src, out)

# Read theme XML from source (clean)
src_zip = zipfile.ZipFile(src, 'r')
theme_xml = src_zip.read('ppt/theme/theme1.xml')
src_zip.close()

root = ET.fromstring(theme_xml)
ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
clr = root.find('.//a:clrScheme', ns)

def set_srgb(tag_name, hex_color):
    el = clr.find('a:%s' % tag_name, ns)
    if el is None:
        print('  WARNING: %s not found' % tag_name)
        return False
    for sub in list(el):
        el.remove(sub)
    srgb = ET.SubElement(el, '{%s}srgbClr' % ns['a'])
    srgb.set('val', hex_color)
    return True

# Change theme colors
print('Modifying theme color scheme:')
set_srgb('dk1', 'BFA5B0')   # dark1 = default line/border -> soft pink-gray
set_srgb('lt1', 'FEF7FB')   # light1 = background -> very pale pink

# Serialize with proper namespace
new_xml = ET.tostring(root, encoding='unicode')
new_xml = new_xml.replace('ns0:', 'a:').replace(':ns0', ':a')

# Rebuild PPTX with modified theme
src_zip2 = zipfile.ZipFile(src, 'r')
out_zip = zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED)
for item in src_zip2.infolist():
    if item.filename == 'ppt/theme/theme1.xml':
        out_zip.writestr(item, new_xml.encode('utf-8'))
    else:
        out_zip.writestr(item, src_zip2.read(item.filename))
out_zip.close()
src_zip2.close()

print('SAVED:', out)
print('  dk1 (default border/line) -> #BFA5B0')
print('  lt1 (background)          -> #FEF7FB')
