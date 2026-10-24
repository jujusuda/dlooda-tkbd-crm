# -*- coding: utf-8 -*-
import zipfile, re
F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_2.pptx'
z = zipfile.ZipFile(F)
xml = z.read('ppt/charts/chart9.xml').decode('utf-8', 'ignore')
# pretty-ish: show dLbls blocks and showVal
for m in re.finditer(r'<c:dLbls>.*?</c:dLbls>', xml, re.S):
    print("=== dLbls ===")
    print(m.group(0))
print("\n=== showVal occurrences ===", len(re.findall(r'showVal', xml)))
print("=== any <c:showVal val=\"1\"/> ===", '<c:showVal val="1"/>' in xml)
print("=== numFmt ===", re.findall(r'numFmt="[^"]*"', xml)[:5])
# markers
print("=== marker lines ===", len(re.findall(r'<c:marker>', xml)))
