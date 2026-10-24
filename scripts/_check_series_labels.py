# -*- coding: utf-8 -*-
import zipfile, re
F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_2.pptx'
z = zipfile.ZipFile(F)
xml = z.read('ppt/charts/chart5.xml').decode('utf-8','ignore')
# split into <c:ser>...</c:ser>
sers = re.findall(r'<c:ser>.*?</c:ser>', xml, re.S)
for s in sers:
    name = re.search(r'<c:tx>.*?<c:v>([^<]+)</c:v>', s, re.S)
    nm = name.group(1) if name else '?'
    dl = re.search(r'<c:dLbls>.*?</c:dLbls>', s, re.S)
    if dl:
        sv = re.search(r'<c:showVal val="(\d)"/>', dl.group(0))
        pos = re.search(r'<c:dLblPos val="(\w+)"/>', dl.group(0))
        print(f"series {nm:>6} showVal={sv.group(1) if sv else '?'} pos={pos.group(1) if pos else '?'}")
    else:
        print(f"series {nm:>6} -> NO per-series dLbls")
# plot-level
plot = re.search(r'(<c:plotArea>.*?<c:dLbls>.*?</c:dLbls>)', xml, re.S)
print("plot-level inEnd/outEnd check done")
