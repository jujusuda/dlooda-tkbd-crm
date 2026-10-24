#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, json
from bs4 import BeautifulSoup

HTML = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\monthly-report-2026-07-15_08-15.html"
with open(HTML, encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

# Map heading -> following paragraphs until next heading
out = []
cur = None
for el in soup.find_all(["h1","h2","h3","h4","h5","h6","p","table"]):
    if el.name in ("h1","h2","h3","h4","h5","h6"):
        cur = {"h": el.get_text(" ", strip=True), "level": int(el.name[1]), "paras": [], "tables": 0}
        out.append(cur)
    elif el.name == "p" and cur is not None:
        cls = el.get("class")
        txt = el.get_text(" ", strip=True)
        if txt:
            out[-1]["paras"].append((cls[0] if cls else "", txt))
    elif el.name == "table" and cur is not None:
        out[-1]["tables"] += 1

# Print only entries that have narrative paragraphs
for e in out:
    if e["paras"]:
        print(f"\n##### [{e['level']}] {e['h']}  (tables={e['tables']})")
        for c, t in e["paras"]:
            if c in ("lead","note","sub"):
                print(f"  <{c}> {t}")
