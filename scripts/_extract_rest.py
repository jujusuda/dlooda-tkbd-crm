#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
from bs4 import BeautifulSoup

HTML = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\monthly-report-2026-07-15_08-15.html"
with open(HTML, encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

tables = soup.find_all("table")
print(f"TOTAL TABLES = {len(tables)}")
# Print tables index 42..end
for i in range(42, len(tables)):
    rows = []
    for tr in tables[i].find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th","td"])]
        if cells:
            rows.append(cells)
    if rows:
        print(f"\n--- TABLE {i} ({len(rows)} rows) ---")
        for r in rows:
            print(" | ".join(r))

# Extract specific section texts by heading
def section_text(hdr_substr):
    for el in soup.find_all(["h2","h3","h4"]):
        if hdr_substr in el.get_text():
            # collect following siblings until next h2/h3/h4
            txts = []
            for sib in el.find_next_siblings():
                if sib.name in ("h2","h3","h4"):
                    break
                if sib.name == "p":
                    txts.append(sib.get_text(" ", strip=True))
                elif sib.name == "table":
                    break
            return txts
    return []

print("\n\n=== 一页结论 ===")
for t in section_text("一页结论"):
    print(" -", t)
print("\n=== 下月行动 ===")
for t in section_text("下月行动"):
    print(" -", t)
print("\n=== 2178 + 2190 合并分析 共同变化原因 ===")
for t in section_text("共同变化原因"):
    print(" -", t)
print("\n=== 合并下月策略 ===")
for t in section_text("合并下月策略"):
    print(" -", t)
