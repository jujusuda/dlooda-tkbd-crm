# -*- coding: utf-8 -*-
import zipfile, re
z = zipfile.ZipFile(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_2.pptx')
xml = z.read('ppt/charts/chart5.xml').decode('utf-8','ignore')
sers = re.findall(r'<c:ser>.*?</c:ser>', xml, re.S)
print("num series:", len(sers))
for ser in sers:
    nm = re.search(r'<c:tx>.*?<c:v>([^<]+)</c:v>', ser, re.S).group(1)
    m = re.search(r'<c:dLbls>.*?</c:dLbls>', ser, re.S)
    if m:
        print(f"--- series {nm} ---")
        print(m.group(0))
        print()
