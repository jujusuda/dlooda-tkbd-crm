# -*- coding: utf-8 -*-
import zipfile, re
from lxml import etree
def dump(F, label):
    z = zipfile.ZipFile(F)
    xml = z.read('ppt/charts/chart5.xml')
    print(f"########## {label} chart5.xml ##########")
    try:
        root = etree.fromstring(xml)
        print("well-formed: OK, size:", len(xml))
    except Exception as e:
        print("XML PARSE ERROR:", e); return
    s = xml.decode('utf-8','ignore')
    # first series dLbls full
    sers = re.findall(r'<c:ser>.*?</c:ser>', s, re.S)
    for ser in sers[:2]:
        nm = re.search(r'<c:tx>.*?<c:v>([^<]+)</c:v>', ser, re.S).group(1)
        m = re.search(r'<c:dLbls>.*?</c:dLbls>', ser, re.S)
        if m:
            print(f"--- series {nm} dLbls ---")
            print(m.group(0))
    print()
dump(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_1.pptx', 'v9_1')
dump(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_2.pptx', 'v9_2')
