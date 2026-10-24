# -*- coding: utf-8 -*-
import zipfile, re
F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_2.pptx'
z = zipfile.ZipFile(F)
print("=== ALL chart-ish entries ===")
for n in z.namelist():
    if 'chart' in n.lower():
        print(n, z.getinfo(n).file_size)
# Find which chart has LINE_MARKERS (line chart type)
print("\n=== detect line charts by xml content ===")
for n in z.namelist():
    if re.match(r'ppt/charts/chart\d+\.xml', n):
        xml = z.read(n).decode('utf-8','ignore')
        if 'lineChart' in xml:
            print(n, "-> lineChart")
            # show dLbls
            for m in re.finditer(r'<c:dLbls>.*?</c:dLbls>', xml, re.S):
                print("  dLbls:", m.group(0)[:400])
            print("  showVal count:", xml.count('showVal'))
