# -*- coding: utf-8 -*-
import zipfile, re
z = zipfile.ZipFile(r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_5.pptx')
for n in ['ppt/charts/chart6.xml','ppt/charts/chart7.xml']:
    x = z.read(n).decode('utf-8','ignore')
    fmts = re.findall(r'formatCode="([^"]*)"', x)
    print(n, "formatCodes:", fmts[:6])
    # confirm per-series showVal=1 and dLblPos present
    sers = re.findall(r'<c:ser>.*?</c:ser>', x, re.S)
    for se in sers:
        nm = re.search(r'<c:tx>.*?<c:v>([^<]+)</c:v>', se, re.S).group(1)
        dl = re.search(r'<c:dLbls>.*?</c:dLbls>', se, re.S)
        if dl:
            sv = re.search(r'<c:showVal val="(\d)"/>', dl.group(0)).group(1)
            pos = re.search(r'<c:dLblPos val="(\w+)"/>', dl.group(0)).group(1)
            print("   ser", nm, "showVal", sv, "pos", pos)
