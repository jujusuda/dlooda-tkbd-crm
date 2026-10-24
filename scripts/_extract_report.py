#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract structured content from the monthly report HTML for PPT generation."""
import re, json
from bs4 import BeautifulSoup

HTML = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\monthly-report-2026-07-15_08-15.html"

with open(HTML, encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

# Collect headings hierarchy and their following content
sections = []
cur = None
for el in soup.find_all(["h1","h2","h3","h4","h5","h6"]):
    txt = el.get_text(" ", strip=True)
    if not txt:
        continue
    level = int(el.name[1])
    sections.append({"level": level, "title": txt, "tag": el.name})

# Print top-level structure
print("=== HEADING STRUCTURE ===")
for s in sections:
    print("  " * (s["level"]-1) + f"[{s['level']}] {s['title']}")

# Extract all tables as lists of rows
print("\n=== TABLES ===")
tables = soup.find_all("table")
for i, t in enumerate(tables):
    rows = []
    for tr in t.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th","td"])]
        if cells:
            rows.append(cells)
    if rows:
        print(f"\n--- TABLE {i} ({len(rows)} rows) ---")
        for r in rows[:30]:
            print(" | ".join(r))

print(f"\nTotal tables: {len(tables)}")
