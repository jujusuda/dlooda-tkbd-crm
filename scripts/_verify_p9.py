# -*- coding: utf-8 -*-
import zipfile, re, posixpath
from pptx import Presentation

F = r'C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_v9_5.pptx'

# --- 1. chart value + label position check ---
prs = Presentation(F)
s = prs.slides[8]
charts = [sh.chart for sh in s.shapes if sh.has_chart]
print("=== P9 charts: %d ===" % len(charts))
for k, ch in enumerate(charts):
    print("chart%d:" % (k+1), "type", ch.chart_type)
    for se in ch.plots[0].series:
        print("   ", se.name, "->", [round(v,2) for v in se.values])

# --- 2. dLblPos legal on line charts (must be t/b/ctr only) ---
z = zipfile.ZipFile(F)
print("\n=== dLblPos on every line chart in deck ===")
problems = []
for n in sorted(z.namelist()):
    if re.match(r'ppt/(slides/)?charts/chart\d+\.xml$', n):
        x = z.read(n).decode('utf-8','ignore')
        if '<c:lineChart>' in x:
            pos = re.findall(r'<c:dLblPos val="(\w+)"/>', x)
            bad = [p for p in pos if p not in ('t','b','ctr','l','r')]
            print("  %s lineChart dLblPos=%s %s" % (n, pos, "  <-- ILLEGAL!" if bad else "OK"))
            if bad: problems.append((n, bad))

# --- 3. full package validation ---
names = set(z.namelist())
ct = z.read('[Content_Types].xml').decode('utf-8','ignore')
overrides = set(re.findall(r'PartName="([^"]+)"', ct))
defaults = set(re.findall(r'Extension="([^"]+)"', ct))
pkg_probs = []
for o in overrides:
    if o.lstrip('/') not in names: pkg_probs.append('CT override missing: '+o)
for nm in names:
    if nm == '[Content_Types].xml': continue
    ext = nm.rsplit('.',1)[-1].lower()
    if ('/'+nm) not in overrides and ext not in defaults:
        pkg_probs.append('part not declared: '+nm)
    if nm.endswith('.rels'):
        base = posixpath.dirname(posixpath.dirname(nm))
        for rid, tgt in re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', z.read(nm).decode('utf-8','ignore')):
            if tgt.startswith('http'): continue
            full = tgt.lstrip('/') if tgt.startswith('/') else posixpath.normpath(posixpath.join(base, tgt))
            if full not in names: pkg_probs.append('%s: %s->%s MISSING %s' % (nm, rid, tgt, full))
print("\nPACKAGE PROBLEMS:", pkg_probs if pkg_probs else "none")
print("LABEL PROBLEMS:", problems if problems else "none")

# --- 4. text content spot check ---
print("\n=== P9 text shapes ===")
for sh in s.shapes:
    if sh.has_text_frame and sh.text_frame.text.strip():
        print("  ", repr(sh.text_frame.text[:70]))
