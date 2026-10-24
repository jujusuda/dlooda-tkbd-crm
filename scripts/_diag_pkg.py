# -*- coding: utf-8 -*-
import zipfile, re, collections
def diag(F, label):
    z = zipfile.ZipFile(F)
    names = z.namelist()
    dup = [n for n, c in collections.Counter(names).items() if c > 1]
    print(f"########## {label} ##########")
    print("duplicate zip entries:", dup if dup else "none")
    # slide5 rels
    rels = z.read('ppt/slides/_rels/slide5.xml.rels').decode('utf-8','ignore')
    relmap = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))
    print("slide5 rels:", relmap)
    # r:id refs in slide5.xml
    sl = z.read('ppt/slides/slide5.xml').decode('utf-8','ignore')
    refs = re.findall(r'r:(?:id|embed)="([^"]+)"', sl)
    print("slide5 r:id refs:", refs)
    # resolve targets, check existence
    for rid in set(refs):
        tgt = relmap.get(rid, "!! MISSING REL !!")
        if tgt.startswith('../'): full = 'ppt/' + tgt[3:]
        elif tgt.startswith('charts/'): full = 'ppt/slides/' + tgt
        else: full = 'ppt/' + tgt
        exists = full in names
        print(f"  ref {rid} -> {tgt} -> {full} exists={exists}")
    # content types overrides for chart parts
    ct = z.read('[Content_Types].xml').decode('utf-8','ignore')
    for n in names:
        if re.match(r'ppt/(slides/)?charts/chart\d+\.xml$', n):
            print(f"  CT has {n}:", f'PartName="/{n}"' in ct)
    # dangling rels (target missing)
    for rid, tgt in relmap.items():
        if 'chart' in tgt:
            if tgt.startswith('../'): full = 'ppt/' + tgt[3:]
            else: full = 'ppt/slides/' + tgt
            print(f"  rel {rid} -> {tgt} exists={full in names}")
    print()
diag(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_1.pptx', 'v9_1 (OK)')
diag(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_2.pptx', 'v9_2 (CORRUPT)')
