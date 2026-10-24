# -*- coding: utf-8 -*-
import zipfile, re
for F, label in [(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_1.pptx','v9_1'),
                 (r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_2.pptx','v9_2')]:
    z = zipfile.ZipFile(F)
    print(f"### {label}")
    for n in sorted(z.namelist()):
        if re.match(r'ppt/(slides/)?charts/chart\d+\.xml$', n):
            x = z.read(n).decode('utf-8','ignore')
            if '<c:lineChart>' in x:
                pos = re.findall(r'<c:dLblPos val="(\w+)"/>', x)
                print(f"  {n}: lineChart dLblPos = {pos}")
