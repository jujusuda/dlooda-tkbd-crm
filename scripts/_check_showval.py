# -*- coding: utf-8 -*-
import zipfile, re
F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_2.pptx'
z = zipfile.ZipFile(F)
xml = z.read('ppt/charts/chart5.xml').decode('utf-8','ignore')
blocks = re.findall(r'<c:dLbls>.*?</c:dLbls>', xml, re.S)
for idx, b in enumerate(blocks):
    sv = re.search(r'<c:showVal val="(\d)"/>', b)
    pos = re.search(r'<c:dLblPos val="(\w+)"/>', b)
    nf = re.search(r'formatCode="([^"]*)"', b)
    print(f"block[{idx}] showVal={sv.group(1) if sv else '?'} pos={pos.group(1) if pos else '?'} numFmt={nf.group(1) if nf else '-'}")
print("TOTAL dLbls blocks:", len(blocks))
