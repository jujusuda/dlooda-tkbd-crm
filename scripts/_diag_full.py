# -*- coding: utf-8 -*-
import zipfile, re, posixpath
def diag(F, label):
    print(f"########## {label} ##########")
    z = zipfile.ZipFile(F)
    names = set(z.namelist())
    ct = z.read('[Content_Types].xml').decode('utf-8','ignore')
    overrides = set(re.findall(r'PartName="([^"]+)"', ct))
    defaults = set(re.findall(r'Extension="([^"]+)"', ct))
    problems = []
    # 1. every part declared (override or default ext)
    for n in names:
        if n == '[Content_Types].xml': continue
        ext = n.rsplit('.', 1)[-1].lower()
        if ('/' + n) not in overrides and ext not in defaults:
            problems.append(f"part NOT declared in CT: {n}")
    # 2. every override exists
    for o in overrides:
        if o.lstrip('/') not in names:
            problems.append(f"CT override MISSING part: {o}")
    # 3. every rels target resolves
    for n in list(names):
        if not n.endswith('.rels'): continue
        base = posixpath.dirname(posixpath.dirname(n))  # e.g. ppt/slides
        rels = z.read(n).decode('utf-8','ignore')
        if 'Chart' in rels or 'chart' in rels or True:
            for rid, tgt in re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels):
                if tgt.startswith('http'): continue
                if tgt.startswith('/'):
                    full = tgt.lstrip('/')
                else:
                    full = posixpath.normpath(posixpath.join(base, tgt))
                if full not in names:
                    problems.append(f"{n}: rel {rid} -> {tgt} resolves to MISSING {full}")
    # 4. chart parts: externalData + embedded workbook
    for n in sorted(names):
        if re.match(r'ppt/(slides/)?charts/chart\d+\.xml$', n):
            x = z.read(n).decode('utf-8','ignore')
            ext = re.search(r'<c:externalData[^>]*r:id="([^"]+)"', x)
            has_rels = (n.replace('charts/','charts/_rels/').replace('.xml','.xml.rels')) in names
            print(f"  {n}: externalData={ext.group(1) if ext else 'none'} relsfile={has_rels}")
    print("PROBLEMS:" if problems else "no structural problems found")
    for p in problems: print("  -", p)
    print()
diag(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_1.pptx', 'v9_1 (OK)')
diag(r'C:/Users/LENOVO/Desktop/余慧玲9月月度汇报_v9_2.pptx', 'v9_2 (CORRUPT)')
