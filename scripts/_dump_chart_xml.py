# -*- coding: utf-8 -*-
import zipfile, re
F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_2.pptx'
z = zipfile.ZipFile(F)
# find charts
charts = [n for n in z.namelist() if re.match(r'ppt/charts/chart\d+\.xml', n)]
print("charts:", charts)
# slide5 -> which chart? check slide5 xml relationships
sl = z.read('ppt/slides/slide5.xml').decode('utf-8', 'ignore')
rels = z.read('ppt/slides/_rels/slide5.xml.rels').decode('utf-8', 'ignore')
print("--- slide5 rels ---")
print(rels)
